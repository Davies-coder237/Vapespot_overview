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
    `<p style="color:#555;font-size:13px;margin:0">Questions? Reply to this email — a real person at VapeSpot will get back to you, or message ${tg(SHOP_TG)}.</p>` +
    `</div></div>`
  );
}

/**
 * Carte récap — `tone` ambre/vert pour les notes que le client ne doit PAS rater
 * (⏰ 30 min · ✅ après-paiement) : bordure d'accent épaisse + fond teinté.
 */
const card = (title: string, lines: string[], tone?: "warn" | "ok") =>
  `<div style="background:${tone === "warn" ? "#fff7e6" : tone === "ok" ? "#f0faf2" : "#f8f9fc"};` +
  `border:1px solid ${tone === "warn" ? "#f0c14b" : tone === "ok" ? "#7fc98d" : "#e2e6ee"};` +
  `border-left:4px solid ${tone === "warn" ? "#e8a13c" : tone === "ok" ? "#3a7d44" : "transparent"};padding:16px 18px;margin:14px 0">` +
  `<p style="color:#333;font-weight:700;font-size:14px;margin:0 0 6px">${title}</p>` +
  lines.map((l) => `<p style="color:#555;font-size:13px;margin:2px 0">${l}</p>`).join("") +
  `</div>`;

/** Lien cliquable vers le chat Telegram du shop — utilisé dans TOUS les emails. */
const tg = (label: string) =>
  `<a href="https://t.me/vapespot_store" target="_blank" rel="noopener" style="color:#2d1f8f;text-decoration:underline">${label}</a>`;

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

/**
 * ② Instructions de paiement — envoyée MANUELLEMENT par l'admin (comptes rotatifs).
 * Libellé VALIDÉ (20/11) : sections SÉPARÉES ① PayID · ② Bank Transfer ·
 * ③ Crypto (bloc à part "save 15%", ⚠️ réseaux BTC/USDT), ⏰ délai 30 min
 * justifié par la disponibilité du stock, ✅ capture d'écran + nom du compte
 * émetteur, contact t.me/vapespot_store, "paiement confirmé = dispatch immédiat".
 * JAMAIS de $300. Base PAY_PENDING_SUBJECT utilisée aussi par l'email auto ①.
 */
/** Champs STRUCTURÉS par moyen de paiement — l'email rend chaque `label: valeur`. */
export interface PayIdOptions {
  name?: string;      // nom du compte PayID (ex. "EMILY")
  payid?: string;     // la PayID elle-même (ex. "emily@gmail.com" / "04xx xxx xxx")
}
export interface BankOptions {
  bsb?: string;       // BSB 000-000
  account?: string;   // n° de compte
  name?: string;      // nom du titulaire du compte
}
export interface CryptoOptions {
  address?: string;   // adresse sur le réseau
  network?: string;   // réseau (ex. SegWit, BTC, TRC-20)
}
export interface PaymentOptions {
  payid?: Partial<PayIdOptions>;
  bank?: Partial<BankOptions>;
  btc?: Partial<CryptoOptions>;
  usdt?: Partial<CryptoOptions>;
}

export const PAY_PENDING_SUBJECT = "Payment instructions for your order — VapeSpot";

function cryptoBlock(o: Order, lines: string[]): string {
  const discounted = (o.totalAud * 0.85).toFixed(2);
  const saved = (o.totalAud * 0.15).toFixed(2);
  return (
    `<div style="background:#1a2b1a;border:2px solid #3a7d44;padding:16px 18px;margin:14px 0">` +
    `<p style="color:#7ddc8f;font-weight:800;font-size:15px;margin:0 0 4px">③ Crypto — save 15% 🪙</p>` +
    `<p style="color:#cde9d2;font-size:13px;margin:0 0 8px">Pay <b>A$${discounted}</b> instead of A$${o.totalAud.toFixed(2)} — you save A$${saved}.</p>` +
    lines.map((l) => `<p style="color:#e2f3e5;font-size:13px;margin:2px 0">${l}</p>`).join("") +
    `<p style="color:#f2c94c;font-size:12px;margin:8px 0 0">⚠️ Crypto payments are handled in two separate networks. Send on the <b>correct network only</b> — funds sent on the wrong network can be lost.</p>` +
    `</div>`
  );
}

export function emailPaymentInstructions(
  o: Order,
  pay: PaymentOptions
): { subject: string; html: string } {
  const sections: string[] = [];
  if (pay.payid) {
    const lines: string[] = [];
    if (pay.payid.name) lines.push(`<b>Name:</b> ${escapeHtml(pay.payid.name)}`);
    if (pay.payid.payid) lines.push(`<b>PayID:</b> ${escapeHtml(pay.payid.payid)}`);
    if (lines.length) sections.push(card("① PayID", lines));
  }
  if (pay.bank) {
    const lines: string[] = [];
    if (pay.bank.bsb) lines.push(`<b>BSB:</b> ${escapeHtml(pay.bank.bsb)}`);
    if (pay.bank.account) lines.push(`<b>Account:</b> ${escapeHtml(pay.bank.account)}`);
    if (pay.bank.name) lines.push(`<b>Account name:</b> ${escapeHtml(pay.bank.name)}`);
    if (lines.length) sections.push(card("② Bank Transfer", lines));
  }
  const cryptoLines: string[] = [];
  const coin = (label: string, c: CryptoOptions | undefined) => {
    if (!c) return;
    const parts: string[] = [];
    if (c.address) parts.push(`Address: <b>${escapeHtml(c.address)}</b>`);
    if (c.network) parts.push(`Network: <b>${escapeHtml(c.network)}</b>`);
    if (parts.length) cryptoLines.push(`${label}: ${parts.join(" · ")}`);
  };
  coin("Bitcoin (BTC)", pay.btc);
  coin("USDT (TRC-20)", pay.usdt);
  if (cryptoLines.length) sections.push(cryptoBlock(o, cryptoLines));

  const body =
    `<p style="color:#222;font-size:16px;font-weight:700;margin:0 0 4px">Pay for your order ${o.id}</p>` +
    `<p style="color:#666;font-size:14px;margin:0 0 6px">Hi${o.customerName ? " " + escapeHtml(o.customerName.split(" ")[0]) : ""} — your order is reserved. Send <b>A$${o.totalAud.toFixed(2)}</b> with any of the options below — whichever suits you best.</p>` +
    `<p style="color:#666;font-size:13px;margin:0 0 10px">Status: <b>payment pending</b></p>` +
    orderRecapTable(o) +
    // ⚠️ Notes CRITIQUES placées JUSTE AVANT les méthodes : le client doit les voir.
    card("⏰ Your items are reserved for 30 minutes", [
      "Stock is limited and these products are held for you for 30 minutes.",
      "If payment doesn't arrive in this window, the items go back to stock and another customer who pays first can take them.",
      "Need more time? Just reply to this email and we'll hold your order.",
    ], "warn") +
    card("✅ After you pay", [
      `Reply to this email (or message ${tg("t.me/vapespot_store")}) with a <b>screenshot of the payment</b> and the <b>name of the account it came from</b>.`,
      "We match it to your order and dispatch immediately.",
    ], "ok") +
    sections.join("") +
    `<p style="color:#666;font-size:14px;margin:10px 0 0">Questions? Reply to this email — a real person at VapeSpot will get back to you, or message ${tg("t.me/vapespot_store")}.</p>`;
  return {
    subject: PAY_PENDING_SUBJECT,
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