// Messages client ②③④⑤⑥ en version RICHE pour Telegram (parse_mode=HTML).
// L'admin les lit sur le bot INTERNE (@vapespot_orders_bot) puis les transmet à
// son client dans la conversation @vapespot_store → on REPREND le DESIGN du
// preview email (émoticônes, titres en gras, valeurs en code monospace, blocs
// de paiement séparés) dans la limite du format Telegram : pas de tableaux/CSS,
// mais gras + italique + code + emojis + séparateurs.
// ⚠️ PAS de mention "@vapespot_store" ici : le client est DÉJÀ dans cette
// conversation avec le shop (règle utilisatrice 22/11) — se référer à soi-même
// serait absurde quand l'admin transmet le message à la main.
// Toujours en ANGLAIS : marché australien (règle 22/11).
import { escapeHtml, fmtAud } from "./html";
import type { Order } from "./types";
import { INSURANCE_AUD } from "./types";
import type { PaymentOptions } from "./emails";

const DIV = "─────────────────────────";

/** Bloc ① PayID — valeurs en code monospace + note Osko. */
function tgPayId(pay: PaymentOptions): string {
  if (!pay.payid || (!pay.payid.name && !pay.payid.payid)) return "";
  const lines: string[] = [];
  if (pay.payid.name) lines.push(`<b>Name:</b> ${escapeHtml(pay.payid.name)}`);
  if (pay.payid.payid) lines.push(`<b>PayID:</b> <code>${escapeHtml(pay.payid.payid)}</code>`);
  return (
    `① <b>PAYID</b>\n` +
    lines.join("\n") +
    `\n<i>Osko payments</i>\n<i>Description: Osko · Reference: OSKO</i>`
  );
}

/** Bloc ② Bank Transfer — mêmes conventions que ①. */
function tgBank(pay: PaymentOptions): string {
  if (!pay.bank || (!pay.bank.bsb && !pay.bank.account && !pay.bank.name)) return "";
  const lines: string[] = [];
  if (pay.bank.bsb) lines.push(`<b>BSB:</b> <code>${escapeHtml(pay.bank.bsb)}</code>`);
  if (pay.bank.account) lines.push(`<b>Account:</b> <code>${escapeHtml(pay.bank.account)}</code>`);
  if (pay.bank.name) lines.push(`<b>Account name:</b> ${escapeHtml(pay.bank.name)}`);
  return (
    `② <b>BANK TRANSFER</b>\n` +
    lines.join("\n") +
    `\n<i>Osko payments</i>\n<i>Description: Osko · Reference: OSKO</i>`
  );
}

/** Bloc ③ Crypto — save 15% sur le montant passé, adresses en code monospace. */
function tgCrypto(amountAud: number, pay: PaymentOptions): string {
  if (!pay.btc && !pay.usdt) return "";
  const coin = (label: string, c: { address?: string; network?: string } | undefined): string => {
    if (!c) return "";
    const lines: string[] = [];
    if (c.address) lines.push(`Address: <code>${escapeHtml(c.address)}</code>`);
    if (c.network) lines.push(`Network: <code>${escapeHtml(c.network)}</code>`);
    if (lines.length === 0) return "";
    return `🧾 <b>${label}</b>\n${lines.join("\n")}`;
  };
  const b = coin("Bitcoin (BTC)", pay.btc);
  const u = coin("USDT (TRC-20)", pay.usdt);
  if (!b && !u) return "";
  const disc = Math.ceil(amountAud * 0.85);
  return (
    `③ <b>CRYPTO — SAVE 15% 🪙</b>\n` +
    `Pay <b>${fmtAud(disc)}</b> instead of ${fmtAud(amountAud)} — you save ${fmtAud(amountAud - disc)}.\n` +
    `\n${b}\n\n${u}\n` +
    `⚠️ Crypto payments are handled in two separate networks. Send on the <b>correct network only</b> — funds sent on the wrong network can be lost.`
  );
}

/** Blocs de paiement communs (② commande / ④ caution) séparés par le DIV. */
function tgPaymentBlocks(pay: PaymentOptions, amountAud: number): string {
  const blocks = [tgPayId(pay), tgBank(pay), tgCrypto(amountAud, pay)].filter((x) => x.length > 0);
  return blocks.join(`\n${DIV}\n`);
}

/** ② Instructions de paiement — MÊME contenu que l'email, design Telegram. */
export function tgPaymentInstructions(o: Order, pay: PaymentOptions): string {
  const name = o.customerName ? " " + escapeHtml(o.customerName.split(" ")[0]) : "";
  const items = o.items.map(
    (it, i) => `${i + 1}. ${escapeHtml(it.name)} ×${it.quantity} — ${fmtAud(it.priceAud * it.quantity)}`
  ).join("\n");
  return (
    `💳 <b>Pay for your order ${o.id}</b>\n` +
    `Hi${name} — your order is reserved. Send <b>${fmtAud(o.totalAud)}</b> with any of the options below — whichever suits you best.\n` +
    `<i>Status: payment pending</i>\n` +
    `\n${DIV}\n` +
    `<b>📦 ORDER</b>\n${items}\n<b>TOTAL: ${fmtAud(o.totalAud)}</b>\n` +
    `\n${DIV}\n` +
    `⏰ <b>YOUR ITEMS ARE RESERVED FOR 30 MINUTES</b>\n` +
    `Stock is limited and these products are held for you for 30 minutes.\n` +
    `If payment doesn't arrive in this window, the items go back to stock and another customer who pays first can take them.\n` +
    `Need more time? Just reply to this message and we'll hold your order.\n` +
    `\n${DIV}\n` +
    `✅ <b>AFTER YOU PAY</b>\n` +
    `Reply to this message with a <b>screenshot of the payment</b> and the <b>name of the account it came from</b>. We match it to your order and dispatch immediately.\n` +
    (tgPaymentBlocks(pay, o.totalAud) ? `\n${DIV}\n${tgPaymentBlocks(pay, o.totalAud)}\n` : "") +
    `\nQuestions? Reply to this message — a real person at VapeSpot will get back to you.`
  );
}

/** ③ Félicitations + lien de suivi — jamais de $300. */
export function tgCongrats(o: Order): string {
  return (
    `✅ <b>Payment received — thank you! 🎉</b>\n` +
    `\nYour payment for <b>${o.id}</b> is confirmed. Your order is being packed at our <b>${escapeHtml(o.warehouseCity || "nearest")}</b> hub.\n` +
    `\n🗺️ <b>Track your delivery</b>\n` +
    `Open: <a href="https://vapespot.store/track">https://vapespot.store/track</a>\n` +
    `Enter your order number (<b>${o.id}</b>) and the email used at checkout, then press "Track my order" to see your live status and delivery time.\n` +
    `\nWe'll message you as soon as your order leaves the warehouse.`
  );
}

/** ④ Départ entrepôt + caution A$300 — LE SEUL message qui mentionne le $300. */
export function tgDeparture(o: Order, pay: PaymentOptions, driverLink?: string | null): string {
  const blocks = tgPaymentBlocks(pay, INSURANCE_AUD);
  return (
    `🚚 <b>Your order has left our warehouse</b>\n` +
    `\nOrder <b>${o.id}</b> is on its way to ${escapeHtml(o.deliveryAddress)}.\n` +
    (driverLink
      ? `\n📍 <b>Track the courier live</b>\nOpen: <a href="${escapeHtml(driverLink)}">courier tracking link</a>\n`
      : "") +
    `\n${DIV}\n` +
    `🧾 <b>Courier deposit — ${fmtAud(INSURANCE_AUD)} (refundable)</b>\n` +
    `To cover the value of the parcel during delivery, we ask for a refundable deposit of <b>${fmtAud(INSURANCE_AUD)}</b>.\n` +
    `This amount will be refunded to you in cash by the courier when your order arrives.\n` +
    `We carry compact devices of high value and lithium batteries, which Australian couriers classify as dangerous goods — this covers those costs and guarantees your protection.\n` +
    `Transfer the deposit to any account below, then reply to this message with your payment screenshot.\n` +
    (blocks ? `\n${DIV}\n${blocks}\n` : "") +
    `\nThe courier carries the ${fmtAud(INSURANCE_AUD)} refund with them at delivery.\n` +
    `\nQuestions? Reply to this message — a real person at VapeSpot will get back to you.`
  );
}

/** ⑤ Livré. */
export function tgDelivered(o: Order): string {
  return (
    `🛍️ <b>Delivered — enjoy!</b>\n` +
    `\nOrder <b>${o.id}</b> has been delivered to ${escapeHtml(o.deliveryAddress)}. If anything is missing or damaged, reply to this message and we'll sort it out.`
  );
}

/** ⑥ Annulation — même logique que l'email (remboursement si déjà payé). */
export function tgCancelled(o: Order): string {
  const paid = o.status === "paid" || o.status === "at_warehouse" || o.status === "in_transit" || o.status === "delivery_failed";
  const name = o.customerName ? " " + escapeHtml(o.customerName.split(" ")[0]) : "";
  return (
    `Your order <b>${o.id}</b> was cancelled\n` +
    `\nHi${name}, your order <b>${o.id}</b> has been cancelled.\n` +
    (o.paymentInstructionsSentAt
      ? `No payment is needed — if you already sent one, it will be returned.\n`
      : `No payment was made, so there's nothing to refund.\n`) +
    (paid
      ? `\n💳 <b>Your payment</b>\nWe'll arrange a refund of <b>${fmtAud(o.totalAud)}</b> back to the account you paid from. If anything is unclear, just reply to this message and we'll confirm it's on its way.\n`
      : "") +
    `\nIf anything looks wrong, reply to this message — a real person will sort it out.`
  );
}