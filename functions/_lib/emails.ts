// Générateurs de templates email (HTML table-based, compatible clients mail).
// Séquences validées 20/11 :
//   ① confirmation auto (checkout)           — jamais de $300
//   ② instructions de paiement (manuelle)    — jamais de $300
//   ③ félicitations + lien de suivi (payée)  — jamais de $300
//   ④ départ entrepôt + caution $300 (en route) — LE SEUL email avec le $300
//   ⑤ livré
// Règles strictes : le $300 n'apparaît dans AUCUN autre email/page/chat.
import { escapeHtml } from "./html";
import type { Order } from "./types";
import { INSURANCE_AUD } from "./types";

export const TRACK_URL = "https://vapespot.store/track";
export const SHOP_TG = "@vapespot_store";

/** Bloc récapitulatif des produits + totaux (base commune aux 5 emails). */
function orderRecapTable(o: Order): string {
  const rows = o.items
    .map(
      (it) =>
        `<tr>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #eee;color:#222">${escapeHtml(it.name)}</td>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;color:#666">×${it.quantity}</td>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;color:#222;font-weight:600">A$${(it.priceAud * it.quantity).toFixed(2)}</td>` +
        `</tr>`
    )
    .join("");
  return (
    `<table role="presentation" style="width:100%;border-collapse:collapse;margin:18px 0">` +
    `<thead><tr><th style="padding:8px 10px;background:#f3f6fb;color:#333;font-size:12px;text-align:left">Product</th>` +
    `<th style="padding:8px 10px;background:#f3f6fb;color:#333;font-size:12px;text-align:right">Qty</th>` +
    `<th style="padding:8px 10px;background:#f3f6fb;color:#333;font-size:12px;text-align:right">Total</th></tr></thead>` +
    `<tbody>${rows}` +
    `<tr><td style="padding:10px;color:#222;font-weight:700">Total</td>` +
    `<td></td>` +
    `<td style="padding:10px;text-align:right;color:#2d1f8f;font-weight:700">A$${o.totalAud.toFixed(2)}</td></tr>` +
    `</tbody></table>`
  );
}

/** Coiffe commune : header sombre + footer contact humain. */
function shell(o: Order, body: string): string {
  return (
    `<div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb">` +
    `<div style="background:#141a2e;padding:26px 30px;text-align:center">` +
    `<span style="color:#ffffff;font-size:20px;font-weight:800">VapeSpot</span>` +
    `<span style="color:#7d8db1;font-size:13px;display:block;margin-top:4px">Vape Spot Australia</span>` +
    `</div>` +
    `<div style="padding:26px 30px">${body}</div>` +
    `<div style="padding:20px 30px;background:#f6f7f9;border-top:1px solid #e5e7eb">` +
    `<p style="color:#555;font-size:13px;margin:0">Questions? Reply to this email — a real person at VapeSpot will get back to you, or message <b>${SHOP_TG}</b>.</p>` +
    `</div></div>`
  );
}

const card = (title: string, lines: string[]) =>
  `<div style="background:#f8f9fc;border:1px solid #e2e6ee;padding:16px 18px;margin:14px 0">` +
  `<p style="color:#333;font-weight:700;font-size:14px;margin:0 0 6px">${title}</p>` +
  lines.map((l) => `<p style="color:#555;font-size:13px;margin:2px 0">${l}</p>`).join("") +
  `</div>`;

/** ① Confirmation automatique. */
export function emailConfirmed(o: Order): { subject: string; html: string } {
  const body =
    `<p style="color:#222;font-size:16px;font-weight:700;margin:0 0 4px">Thanks for your order — ${o.id} ✅</p>` +
    `<p style="color:#666;font-size:14px;margin:0 0 18px">Your order has been received and is now being prepared. Below is a summary:</p>` +
    orderRecapTable(o) +
    card("Delivery address", [escapeHtml(o.deliveryAddress)]) +
    card("What happens next?", [
      "1. You will receive a second email with payment instructions (PayID, bank transfer, crypto or gift card).",
      `2. Once payment is confirmed, we ship from our ${escapeHtml(o.warehouseCity || "nearest")} hub.`,
    ]) +
    `<p style="color:#999;font-size:12px;margin:0">If you didn't place this order, just reply to this email and we'll cancel it right away.</p>`;
  return {
    subject: `Order confirmed ${o.id} — VapeSpot`,
    html: shell(o, body),
  };
}

/** ② Instructions de paiement — envoyée MANUELLEMENT par l'admin (comptes rotatifs). */
export function emailPaymentInstructions(
  o: Order,
  account: { label: string; details: string }
): { subject: string; html: string } {
  const body =
    `<p style="color:#222;font-size:16px;font-weight:700;margin:0 0 4px">Pay for your order ${o.id}</p>` +
    `<p style="color:#666;font-size:14px;margin:0 0 8px">Please transfer <b>A$${o.totalAud.toFixed(2)}</b> to the details below, then reply to this email with your payment screenshot.</p>` +
    card(escapeHtml(account.label), [escapeHtml(account.details)]) +
    `<p style="color:#666;font-size:14px;margin:0">We also need the <b>account name</b> your payment comes from — so we can match it to your order.</p>` +
    `<p style="color:#999;font-size:12px;margin:8px 0 0">Your order is reserved for a limited time. If a payment doesn't arrive shortly, we may release the items.</p>`;
  return {
    subject: `Payment instructions for ${o.id} — VapeSpot`,
    html: shell(o, body),
  };
}

/** ③ Félicitations + lien de suivi (statut → paid). JAMAIS de $300. */
export function emailCongrats(o: Order): { subject: string; html: string } {
  const body =
    `<p style="color:#2d1f8f;font-size:16px;font-weight:800;margin:0 0 4px">Payment received — thank you! 🎉</p>` +
    `<p style="color:#666;font-size:14px;margin:0 0 18px">Your payment for <b>${o.id}</b> is confirmed. Your order is being packed at our ${escapeHtml(o.warehouseCity || "nearest")} hub.</p>` +
    card("Track your delivery", [
      `Open: <a href="${TRACK_URL}" style="color:#2d1f8f">${TRACK_URL}</a>`,
      `Enter your order number (${o.id}) and the email you used to order.`,
    ]) +
    `<p style="color:#666;font-size:14px;margin:0">We'll email you as soon as your order leaves the warehouse.</p>`;
  return {
    subject: `Your order ${o.id} is on its way to you — VapeSpot`,
    html: shell(o, body),
  };
}

/**
 * ④ Départ entrepôt + caution coursier — LE SEUL message qui mentionne le $300.
 * Envoyé au passage at_warehouse → in_transit. La somme est remboursée en
 * main propre par le coursier à l'arrivée (optionnel : lien suivi du coursier).
 */
export function emailDeparture(
  o: Order,
  insuranceAccount: { label: string; details: string },
  driverLink?: string | null
): { subject: string; html: string } {
  const body =
    `<p style="color:#222;font-size:16px;font-weight:700;margin:0 0 4px">Your order has left our warehouse 🚚</p>` +
    `<p style="color:#666;font-size:14px;margin:0 0 8px">Order <b>${o.id}</b> is on its way to ${escapeHtml(o.deliveryAddress)}.</p>` +
    (driverLink
      ? card("Track the courier live", [
          `<a href="${escapeHtml(driverLink)}" style="color:#2d1f8f">Open the courier tracking link</a>`,
        ])
      : "") +
    card(`Courier deposit — A$${INSURANCE_AUD} (refundable)`, [
      `To cover the value of the parcel during delivery, we ask for a refundable deposit of <b>A$${INSURANCE_AUD.toFixed(2)}</b>.`,
      "This amount will be refunded to you in cash by the courier when your order arrives.",
      `Transfer to: <b>${escapeHtml(insuranceAccount.label)}</b> — ${escapeHtml(insuranceAccount.details)}`,
      "Then reply to this email with your payment screenshot so we can track it.",
    ]) +
    `<p style="color:#666;font-size:14px;margin:0">The courier carries the A$${INSURANCE_AUD.toFixed(2)} refund with them at delivery.</p>`;
  return {
    subject: `${o.id} is out for delivery — courier deposit A$${INSURANCE_AUD}`,
    html: shell(o, body),
  };
}

/** ⑤ Livré. */
export function emailDelivered(o: Order): { subject: string; html: string } {
  const body =
    `<p style="color:#2d1f8f;font-size:16px;font-weight:800;margin:0 0 4px">Delivered — enjoy! 🛍️</p>` +
    `<p style="color:#666;font-size:14px;margin:0">Order <b>${o.id}</b> has been delivered to ${escapeHtml(o.deliveryAddress)}. If anything is missing or damaged, reply to this email and we'll sort it out.</p>`;
  return {
    subject: `Your order ${o.id} has been delivered — VapeSpot`,
    html: shell(o, body),
  };
}