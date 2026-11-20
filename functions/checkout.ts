// Étape 1 — POST /checkout : création de commande côté serveur.
// Flux validé 20/11 :
//   1. Email + adresse de livraison OBLIGATOIRES (validés côté serveur).
//   2. Géocodage adresse (Nominatim, cache KV) → entrepôt actif le plus proche.
//   3. Numéro VS-XXXX via Durable Object (atomique).
//   4. Stockage KV (TTL 30 min tant que pending_payment).
//   5. Email ① de confirmation auto (Brevo) + notification Telegram shop.
//   6. Réponse : { orderNumber } → la page affiche la confirmation.
// Anti-spam minimal : limite par IP (KV), sans casser l'usage normal.
import { geocodeAddress, nearestActiveWarehouse } from "./_lib/geo";
import { OrderCounter, orderNumber } from "./_lib/counter";
import { newPendingOrder, putOrder } from "./_lib/orders";
import { emailConfirmed } from "./_lib/emails";
import { sendEmail } from "./_lib/brevo";
import { sendTelegram } from "./_lib/telegram";
import type { Order } from "./_lib/types";
import { MIN_ORDER_AUD } from "./_lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface CheckoutBody {
  email?: unknown;
  customerName?: unknown;
  deliveryAddress?: unknown;
  deliveryMethod?: unknown;
  items?: unknown;
}

function fail(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost({ request, env }: any): Promise<Response> {
  // ── 1. Validation stricte des champs obligatoires ────────────────
  let body: CheckoutBody;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return fail("invalid_json");
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const customerName = String(body.customerName ?? "").trim().slice(0, 120);
  const deliveryAddress = String(body.deliveryAddress ?? "").trim().slice(0, 300);
  const deliveryMethod = String(body.deliveryMethod ?? "");
  const items = Array.isArray(body.items) ? body.items : [];

  if (!EMAIL_RE.test(email)) return fail("email_required");
  if (deliveryAddress.length < 10) return fail("delivery_address_required");

  // Items : structure minimale (productId, quantity) — les infos catalogue
  // restent côté client ; le montant est recalculé serveur depuis les items.
  const cleanItems: Order["items"] = [];
  let totalAud = 0;
  for (const it of items) {
    const productId = String(it?.productId ?? "").trim();
    const name = String(it?.name ?? "").trim().slice(0, 160);
    const quantity = Number(it?.quantity ?? 0);
    const priceAud = Number(it?.priceAud ?? 0);
    if (!productId) return fail("item_missing_product_id");
    if (!(quantity >= 1 && quantity <= 99 && Number.isInteger(quantity))) return fail("bad_quantity");
    if (!(priceAud > 0)) return fail("bad_price");
    cleanItems.push({ productId, quantity, name, priceAud });
    totalAud += priceAud * quantity;
  }
  if (cleanItems.length === 0) return fail("cart_empty");
  totalAud = Math.round(totalAud * 100) / 100;
  if (totalAud < MIN_ORDER_AUD) return fail(`min_order_${MIN_ORDER_AUD}`);

  // ── 2. Anti-spam : 10 commandes / 15 min / IP ────────────────────
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const rateKey = "checkout-ratelimit:" + ip;
  const hitRaw = await env.VAPESPOT_ORDERS.get(rateKey);
  const hit = Number(hitRaw ?? 0) + 1;
  if (hit > 10) return fail("too_many_orders", 429);
  await env.VAPESPOT_ORDERS.put(rateKey, String(hit), { expirationTtl: 15 * 60 });

  // ── 3. Géocodage + entrepôt actif le plus proche ─────────────────
  let geo;
  try {
    geo = await geocodeAddress(env, deliveryAddress);
  } catch {
    return fail("delivery_address_not_found");
  }
  const { warehouse } = nearestActiveWarehouse(geo.lat, geo.lng);
  if (!warehouse) return fail("no_warehouse_available", 503);

  // ── 4. Numéro atomique VS-XXXX ───────────────────────────────────
  const counterId = env.ORDER_COUNTER.idFromName("orders");
  const counter = env.ORDER_COUNTER.get(counterId) as OrderCounter;
  const n = await counter.next();
  const id = orderNumber(n);

  // ── 5. Stockage (TTL 30 min) ─────────────────────────────────────
  const order = newPendingOrder({
    id,
    email,
    customerName,
    deliveryAddress,
    deliveryMethod: deliveryMethod === "australia_post" ? "australia_post" : "courier",
    items: cleanItems,
    totalAud,
    warehouseId: warehouse.id,
    warehouseCity: warehouse.city,
    lat: geo.lat,
    lng: geo.lng,
  });
  await putOrder(env, order);

  // ── 6. Email ① de confirmation (auto, sans $300) + bot shop ─────
  const mail = emailConfirmed(order);
  await sendEmail(env, { to: order.email, subject: mail.subject, html: mail.html, tag: "order-confirmed" });
  await sendTelegram(
    env,
    `🛒 Nouvelle commande ${order.id}\n💰 A$${order.totalAud.toFixed(2)}\n📍 ${order.warehouseCity} → ${order.deliveryAddress}\n📧 ${order.email}`
  );

  // ── Réponse : numéro + infos pour la confirmation client ─────────
  return new Response(
    JSON.stringify({
      orderNumber: order.id,
      totalAud: order.totalAud,
      warehouseCity: warehouse.city,
      message: "order_created",
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    }
  );
}