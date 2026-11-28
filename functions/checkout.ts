// Étape 1 — POST /checkout : création de commande côté serveur.
// Flux validé 20/11, AMÉLIORÉ 22/11 :
//   1. Email OBLIGATOIRE (nécessaire au suivi + à l'admin). L'ADRESSE de
//      livraison n'est PLUS jamais un blocage : peu importe ce que le client
//      tape (ou laisse vide), la commande AVANCE (règle utilisatrice 22/11).
//      Sans adresse exploitable → entrepôt de repli + pas de géolocalisation
//      (l'admin clarifie par Telegram, le suivi montre les hubs sans tracé).
//   2. Géocodage BEST-EFFORT (Nominatim, cache KV) : si l'adresse n'est pas
//      trouvée ou le service KO → repli, JAMAIS un rejet de commande.
//   3. Entrepôt actif le plus proche (ou repli si pas de géocodage).
//   4. Numéro VS-XXXX via Durable Object (atomique).
//   5. Stockage KV PERMANENT (aucun TTL : une commande ne disparaît JAMAIS,
//      l'admin doit pouvoir agir même le lendemain). La fenêtre de paiement
//      30 min est posée seulement par l'admin à l'envoi de l'email ②.
//   6. AUCUN email au client au checkout — il ne reçoit RIEN tant que
//      l'admin n'a pas saisi les moyens de paiement et validé l'email ②
//      depuis la page admin. Seul le bot Telegram PRIVÉ du shop est notifié.
//   7. Réponse : { orderNumber } → la page affiche la confirmation.
// Anti-spam minimal : limite par IP (KV), sans casser l'usage normal.
import { geocodeAddress, nearestActiveWarehouse, fetchRoute, ACTIVE_WAREHOUSES } from "./_lib/geo";
import { orderNumber } from "./_lib/counter";
import { newPendingOrder, putOrder } from "./_lib/orders";
import { sendTelegram, replyButtonMarkup } from "./_lib/telegram";
import { fmtAud } from "./_lib/html";
import type { Order } from "./_lib/types";
import { MIN_ORDER_AUD } from "./_lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface CheckoutBody {
  email?: unknown;
  customerName?: unknown;
  deliveryAddress?: unknown;
  deliveryMethod?: unknown;
  items?: unknown;
  clientId?: unknown;      // clé du chat (getClientId) — bouton Reply + rattachement
  visitorLabel?: unknown;  // « Visitor 3568 » — même personne qu'au début du chat
}

function fail(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
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
  // Identité du chat : clé opaque du navigateur (bouton Reply) + label Visitor.
  // OPTIONNELS mais fortement recommandés → rattachement de la commande au chat.
  const clientId = String(body.clientId ?? "").trim().slice(0, 64);
  const visitorLabel = String(body.visitorLabel ?? "").trim().slice(0, 64);

  if (!EMAIL_RE.test(email)) return fail("email_required");

  // L'adresse n'est JAMAIS un blocage (règle 22/11) : on la prend telle quelle,
  // même courte ou vide. Le géocodage ci-dessous est best-effort : si elle ne
  // résout pas, la commande avance avec un entrepôt de repli.

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
  // Le client paie TOUJOURS un total SANS centimes : arrondi en excès (décision
  // utilisatrice 21/11). Les prix du catalogue restent inchangés (A$49.99…), seul
  // le MONTANT DEMANDÉ devient un entier (A$195 au lieu de A$194.96). Le MIN
  // reste vérifié sur le montant exact AVANT l'arrondi (une commande à 149.60 n'a
  // pas droit à l'arrondi 150 même si ceil la ferait passer à 150).
  totalAud = Math.ceil(totalAud);

  // ── 2. Anti-spam : 10 commandes / 15 min / IP ────────────────────
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const rateKey = "checkout-ratelimit:" + ip;
  const hitRaw = await env.VAPESPOT_ORDERS.get(rateKey);
  const hit = Number(hitRaw ?? 0) + 1;
  if (hit > 10) return fail("too_many_orders", 429);
  await env.VAPESPOT_ORDERS.put(rateKey, String(hit), { expirationTtl: 15 * 60 });

  // ── 3. Géocodage BEST-EFFORT + entrepôt actif le plus proche ──────────
  // Règle 22/11 : l'adresse ne bloque JAMAIS. Si le géocodage échoue (adresse
  // introuvable, Nominatim KO, ou champ vide) → entrepôt de repli (1er actif),
  // lat/lng null, route null : la commande AVANCE, l'admin clarifie via
  // Telegram et /track montre les hubs sans tracé ni adresse.
  let geo: { lat: number; lng: number } | null = null;
  try {
    geo = deliveryAddress.trim().length > 2
      ? await geocodeAddress(env, deliveryAddress)
      : null;
  } catch {
    geo = null; // jamais un rejet de commande pour une adresse
  }
  const nearest = geo ? nearestActiveWarehouse(geo.lat, geo.lng).warehouse : null;
  const warehouse = nearest ?? ACTIVE_WAREHOUSES[0];
  if (!warehouse) return fail("no_warehouse_available", 503);

  // ── 3b. Route routière RÉELLE entrepôt → adresse (OSRM, cache KV) ──
  // Stockée sur la commande → /track affiche le VRAI tracé (rues) + temps de
  // conduite réaliste. Jamais de calcul sur /track (anti-enum + latence).
  // Si OSRM est indisponible OU PAS d'adresse géocodée → route null : /track
  // affiche les marqueurs sans ligne (règle 22/11 : jamais de ligne droite).
  let route = null;
  if (geo) {
    try {
      route = await fetchRoute(env, warehouse.lat, warehouse.lng, geo.lat, geo.lng);
    } catch {
      route = null; // OSRM down/timeout : on n'empêche JAMAIS la commande
    }
    if (route && route.km > 400) route = null; // hors zone coursier → Australia Post
  }

  // ── 4. Numéro atomique VS-XXXX ───────────────────────────────────
  // La classe OrderCounter vit dans le Worker dédié vapespot-orders-do
  // (do-worker/) ; ici on appelle simplement son `next()` via le binding.
  const counterId = env.ORDER_COUNTER.idFromName("orders");
  const counter: { next(): Promise<number> } = env.ORDER_COUNTER.get(counterId) as any;
  const n = await counter.next();
  const id = orderNumber(n);

  // ── 5. Stockage (TTL 30 min) ─────────────────────────────────────
  const order = newPendingOrder({
    id,
    email,
    clientId: clientId || null,
    visitorLabel: visitorLabel || null,
    customerName,
    deliveryAddress,
    deliveryMethod: deliveryMethod === "australia_post" ? "australia_post" : "courier",
    items: cleanItems,
    totalAud,
    warehouseId: warehouse.id,
    warehouseCity: warehouse.city,
    lat: geo ? geo.lat : null,
    lng: geo ? geo.lng : null,
    route,
  });
  await putOrder(env, order);

  // ── 6. AUCUN email client ici (supprimé 20/11) ────────────────────
  // Le client ne reçoit RIEN tant que l'admin n'a pas saisi les moyens
  // de paiement et validé les instructions (②) depuis la page admin.
  // Seule la notification Telegram s'envoie (bot PRIVÉ du shop, jamais le
  // client) — toujours en ANGLAIS : marché australien (règle 22/11).
  await sendTelegram(
    env,
    `🛒 New order ${order.id}\n${order.visitorLabel ? `👤 Visitor ${order.visitorLabel}\n` : ""}💰 ${fmtAud(order.totalAud)}\n📍 ${order.warehouseCity} → ${order.deliveryAddress}\n📧 ${order.email}`,
    undefined,
    replyButtonMarkup(clientId || null)
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
      headers: { "content-type": "application/json; charset=utf-8" },
    }
  );
}