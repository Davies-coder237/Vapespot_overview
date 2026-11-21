// Générateurs de templates email (HTML table-based, compatible clients mail).
// Séquences validées 20/11 :
//   ① confirmation auto (checkout)           — SUPPRIMÉE le 20/11 : le client
//      ne reçoit RIEN au checkout. Son premier message = l'email ②, envoyé
//      UNIQUEMENT par l'admin depuis la page admin (moyens de paiement saisis).
//   ② instructions de paiement (manuelle)    — jamais de $300 · note "Osko
//      payments" (Description: Osko / Reference: OSKO) sous les blocs PayID et
//      Bank · bloc crypto structuré : adresse et réseau sur lignes séparées,
//      BTC et USDT chacun de son côté dans le même bloc.
//   ③ félicitations + lien de suivi (payée)  — jamais de $300
//   ④ départ entrepôt + caution $300 (en route) — LE SEUL email avec le $300
//   ⑤ livré
// Règles strictes : le $300 n'apparaît dans AUCUN autre email/page/chat.
import { escapeHtml, fmtAud } from "./html";
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
    `<td style="padding:10px;text-align:right;color:#2d1f8f;font-weight:700">${fmtAud(o.totalAud)}</td></tr>` +
    `</tbody></table>`
  );
}

/** Coiffe commune : full HTML document (doctype + charset=utf-8 explicite) + footer contact humain. */
function shell(o: Order, body: string): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="x-apple-disable-message-reformatting">` +
    `<style>body{margin:0;padding:0;background:#eef1f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}a{color:#2d1f8f}</style></head>` +
    `<body style="margin:0;padding:0">` +
    `<div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb">` +
    `<div style="background:#141a2e;padding:24px 30px;text-align:center">` +
    `<img src="https://vapespot.store/favicon-192.png" alt="VapeSpot" width="64" height="64" style="display:inline-block;width:64px;height:64px;border:0;border-radius:14px">` +
    `<div style="color:#ffffff;font-size:20px;font-weight:800;margin-top:10px">VapeSpot</div>` +
    `<div style="color:#7d8db1;font-size:13px;display:block;margin-top:4px">Vape Spot Australia</div>` +
    `</div>` +
    `<div style="padding:26px 30px">${body}</div>` +
    `<div style="padding:20px 30px;background:#f6f7f9;border-top:1px solid #e5e7eb">` +
    `<p style="color:#555;font-size:13px;margin:0">Questions? Reply to this email — a real person at VapeSpot will get back to you, or message ${tg(SHOP_TG)}.</p>` +
    `</div></div>` +
    `</body></html>`
  );
}

/**
 * Carte récap — `tone` ambre/vert pour les notes que le client ne doit PAS rater
 * (⏰ 30 min · ✅ après-paiement) : bordure d'accent épaisse + fond teinté.
 */
const card = (title: string, lines: string[], tone?: "warn" | "ok", foot?: string) =>
  `<div style="background:${tone === "warn" ? "#fff7e6" : tone === "ok" ? "#f0faf2" : "#f8f9fc"};` +
  `border:1px solid ${tone === "warn" ? "#f0c14b" : tone === "ok" ? "#7fc98d" : "#e2e6ee"};` +
  `border-left:4px solid ${tone === "warn" ? "#e8a13c" : tone === "ok" ? "#3a7d44" : "transparent"};padding:16px 18px;margin:14px 0">` +
  `<p style="color:#333;font-weight:700;font-size:14px;margin:0 0 6px">${title}</p>` +
  lines.map((l) => `<p style="color:#555;font-size:13px;margin:2px 0">${l}</p>`).join("") +
  (foot ?? "") +
  `</div>`;

/**
 * Note "Osko payments" affichée en bas des blocs ① PayID et ② Bank Transfer —
 * lignes fixes validées (Description: Osko · Reference: OSKO) : le client doit
 * indiquer cette référence pour que l'administration puisse rattacher son virement.
 */
const oskoNote = () =>
  `<p style="color:#8893a8;font-size:12px;margin:10px 0 0;padding-top:8px;border-top:1px dashed #d5dae5">` +
  `<b style="color:#5f6a80">Osko payments</b><br>` +
  `Description: Osko<br>` +
  `Reference: OSKO</p>`;

/** Lien cliquable vers le chat Telegram du shop — utilisé dans TOUS les emails. */
const tg = (label: string) =>
  `<a href="https://t.me/vapespot_store" target="_blank" rel="noopener" style="color:#2d1f8f;text-decoration:underline">${label}</a>`;

/**
 * ② Instructions de paiement — envoyée MANUELLEMENT par l'admin (comptes rotatifs).
 * Libellé VALIDÉ (20/11) : sections SÉPARÉES ① PayID · ② Bank Transfer ·
 * ③ Crypto (bloc à part "save 15%", ⚠️ réseaux BTC/USDT), ⏰ délai 30 min
 * justifié par la disponibilité du stock, ✅ capture d'écran + nom du compte
 * émetteur, contact t.me/vapespot_store, "paiement confirmé = dispatch immédiat".
 * JAMAIS de $300. C'est LE PREMIER message reçu par le client (l'email auto ①
 * a été supprimé) : seule l'admin peut déclencher cet envoi depuis sa page.
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

/**
 * ③ Crypto — bloc sombre unique, BTC et USDT EMPILÉS l'un sous l'autre
 * (Bitcoin en HAUT, USDT en dessous) : Address et Network sur des LIGNES
 * SÉPARÉES (l'adresse peut se couper proprement, jamais collée au réseau).
 * Un seul coin rempli → pleine largeur.
 */
function cryptoBlock(amountAud: number, btc?: CryptoOptions, usdt?: CryptoOptions): string {
  const coin = (label: string, c: CryptoOptions | undefined): string => {
    if (!c) return "";
    const addr = c.address
      ? `<p style="color:#e2f3e5;font-size:13px;margin:5px 0 0"><b style="color:#9be3ab">Address:</b><br><span style="word-break:break-all">${escapeHtml(c.address)}</span></p>`
      : "";
    const net = c.network
      ? `<p style="color:#e2f3e5;font-size:13px;margin:5px 0 0"><b style="color:#9be3ab">Network:</b> ${escapeHtml(c.network)}</p>`
      : "";
    if (!addr && !net) return "";
    return (
      `<div style="background:#12291a;border:1px solid #2d5c39;border-radius:8px;padding:12px 14px">` +
      `<p style="color:#7ddc8f;font-weight:800;font-size:13px;margin:0">${label}</p>` +
      addr + net +
      `</div>`
    );
  };
  const b = coin("Bitcoin (BTC)", btc);
  const u = coin("USDT (TRC-20)", usdt);
  if (!b && !u) return "";
  // Empilés de haut en bas + espacement de 10px : BTC puis USDT, chacun pleine largeur.
  const boxes =
    (b && u ? b + `<div style="height:10px"></div>` + u : b || u);
  const discounted = fmtAud(Math.ceil(amountAud * 0.85));
  const saved = fmtAud(amountAud - Math.ceil(amountAud * 0.85));
  return (
    `<div style="background:#1a2b1a;border:2px solid #3a7d44;padding:14px 16px;margin:14px 0">` +
    `<p style="color:#7ddc8f;font-weight:800;font-size:15px;margin:0 0 4px">③ Crypto — save 15% 🪙</p>` +
    `<p style="color:#cde9d2;font-size:13px;margin:0 0 10px">Pay <b>${discounted}</b> instead of ${fmtAud(amountAud)} — you save ${saved}.</p>` +
    boxes +
    `<p style="color:#f2c94c;font-size:12px;margin:12px 0 0">⚠️ Crypto payments are handled in two separate networks. Send on the <b>correct network only</b> — funds sent on the wrong network can be lost.</p>` +
    `</div>`
  );
}

/**
 * Sections de paiement communes ② (commande) et ④ (dépôt $300) : les DEUX
 * utilisent les mêmes comptes rotatifs saisis par l'admin. PayID + Bank en
 * cartes ①/②, Crypto en bloc ③ "save 15%" calculé sur le montant passé.
 */
function paymentSections(o: Order, pay: PaymentOptions, amountAud: number): string[] {
  const sections: string[] = [];
  if (pay.payid) {
    const lines: string[] = [];
    if (pay.payid.name) lines.push(`<b>Name:</b> ${escapeHtml(pay.payid.name)}`);
    if (pay.payid.payid) lines.push(`<b>PayID:</b> ${escapeHtml(pay.payid.payid)}`);
    if (lines.length) sections.push(card("① PayID", lines, undefined, oskoNote()));
  }
  if (pay.bank) {
    const lines: string[] = [];
    if (pay.bank.bsb) lines.push(`<b>BSB:</b> ${escapeHtml(pay.bank.bsb)}`);
    if (pay.bank.account) lines.push(`<b>Account:</b> ${escapeHtml(pay.bank.account)}`);
    if (pay.bank.name) lines.push(`<b>Account name:</b> ${escapeHtml(pay.bank.name)}`);
    if (lines.length) sections.push(card("② Bank Transfer", lines, undefined, oskoNote()));
  }
  const cryptoHtml = cryptoBlock(amountAud, pay.btc, pay.usdt);
  if (cryptoHtml) sections.push(cryptoHtml);
  return sections;
}

/**
 * Version TEXTE BRUT de l'email ② — certains clients mail n'affichent que le
 * texte (Brevo génère parfois une partie texte vide depuis le HTML table).
 * Lignes identiques au HTML : ordre, ⏰ 30 min, ✅ capture, méthodes, note Osko.
 */
function plainPayment(o: Order, pay: PaymentOptions): string {
  const L: string[] = [];
  L.push(`Pay for your order ${o.id}`);
  L.push("");
  L.push(`Hi${o.customerName ? " " + o.customerName.split(" ")[0] : ""} — your order is reserved. Send ${fmtAud(o.totalAud)} with any of the options below — whichever suits you best.`);
  L.push("Status: payment pending");
  L.push("");
  o.items.forEach((it) => L.push(`${it.name} ×${it.quantity} — A$${(it.priceAud * it.quantity).toFixed(2)}`));
  L.push(`TOTAL: ${fmtAud(o.totalAud)}`);
  L.push("");
  L.push("⏰ YOUR ITEMS ARE RESERVED FOR 30 MINUTES");
  L.push("Stock is limited and these products are held for you for 30 minutes.");
  L.push("If payment doesn't arrive in this window, the items go back to stock and another customer who pays first can take them.");
  L.push("Need more time? Just reply to this email and we'll hold your order.");
  L.push("");
  L.push("✅ AFTER YOU PAY");
  L.push("Reply to this email (or message @vapespot_store on Telegram: https://t.me/vapespot_store) with a screenshot of the payment and the name of the account it came from. We match it to your order and dispatch immediately.");
  L.push("");
  if (pay.payid && (pay.payid.name || pay.payid.payid)) {
    L.push("① PayID");
    if (pay.payid.name) L.push(`Name: ${pay.payid.name}`);
    if (pay.payid.payid) L.push(`PayID: ${pay.payid.payid}`);
    L.push("Osko payments");
    L.push("Description: Osko");
    L.push("Reference: OSKO");
    L.push("");
  }
  if (pay.bank && (pay.bank.bsb || pay.bank.account || pay.bank.name)) {
    L.push("② Bank Transfer");
    if (pay.bank.bsb) L.push(`BSB: ${pay.bank.bsb}`);
    if (pay.bank.account) L.push(`Account: ${pay.bank.account}`);
    if (pay.bank.name) L.push(`Account name: ${pay.bank.name}`);
    L.push("Osko payments");
    L.push("Description: Osko");
    L.push("Reference: OSKO");
    L.push("");
  }
  if (pay.btc || pay.usdt) {
    L.push("③ Crypto — save 15%");
    L.push(`Pay ${fmtAud(Math.ceil(o.totalAud * 0.85))} instead of ${fmtAud(o.totalAud)} — you save ${fmtAud(o.totalAud - Math.ceil(o.totalAud * 0.85))}.`);
    if (pay.btc) {
      L.push("Bitcoin (BTC)");
      if (pay.btc.address) L.push(`Address: ${pay.btc.address}`);
      if (pay.btc.network) L.push(`Network: ${pay.btc.network}`);
    }
    if (pay.usdt) {
      L.push("USDT (TRC-20)");
      if (pay.usdt.address) L.push(`Address: ${pay.usdt.address}`);
      if (pay.usdt.network) L.push(`Network: ${pay.usdt.network}`);
    }
    L.push("");
    L.push("⚠️ Crypto payments are handled in two separate networks. Send on the correct network only — funds sent on the wrong network can be lost.");
    L.push("");
  }
  L.push("Questions? Reply to this email — a real person at VapeSpot will get back to you, or message @vapespot_store: https://t.me/vapespot_store");
  return L.join("\n");
}

export function emailPaymentInstructions(
  o: Order,
  pay: PaymentOptions
): { subject: string; html: string; text: string } {
  const sections = paymentSections(o, pay, o.totalAud);

  const body =
    `<p style="color:#222;font-size:16px;font-weight:700;margin:0 0 4px">Pay for your order ${o.id}</p>` +
    `<p style="color:#666;font-size:14px;margin:0 0 6px">Hi${o.customerName ? " " + escapeHtml(o.customerName.split(" ")[0]) : ""} — your order is reserved. Send <b>${fmtAud(o.totalAud)}</b> with any of the options below — whichever suits you best.</p>` +
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
    text: plainPayment(o, pay),
  };
}

/** ③ Félicitations + lien de suivi (statut → paid). JAMAIS de $300.
 *  Le lien est PRÉ-REMPLI avec le n° de commande ET l'email (le client n'a rien
 *  à taper) — anti-enumération conservée côté page /track (le couple doit
 *  correspondre, sinon message générique). Version TEXTE BRUT incluse (leçon
 *  du fix 20/11 : certains clients n'affichent que le texte). */
export function emailCongrats(o: Order): { subject: string; html: string; text: string } {
  // ⚠️ Lien GÉNÉRIQUE (retour utilisatrice 21/11) : PAS de ?n=…&e=… dans l'URL.
  // Tous les clients reçoivent le même lien ; ils saisissent n° + email sur la
  // page de suivi (anti-enumération : le couple doit correspondre).
  const trackLink = `${TRACK_URL}`;
  const body =
    `<p style="color:#2d1f8f;font-size:16px;font-weight:800;margin:0 0 4px">Payment received — thank you! 🎉</p>` +
    `<p style="color:#666;font-size:14px;margin:0 0 18px">Your payment for <b>${o.id}</b> is confirmed. Your order is being packed at our ${escapeHtml(o.warehouseCity || "nearest")} hub.</p>` +
    card("Track your delivery", [
      `Open: <a href="${escapeHtml(trackLink)}" style="color:#2d1f8f">${escapeHtml(trackLink)}</a>`,
      `Enter your order number (<b>${escapeHtml(o.id)}</b>) and the email used at checkout, then press "Track my order" to see your live status.`,
    ]) +
    `<p style="color:#666;font-size:14px;margin:0">We'll email you as soon as your order leaves the warehouse.</p>`;
  const text =
    `Payment received — thank you!\n\n` +
    `Your payment for ${o.id} is confirmed. Your order is being packed at our ${o.warehouseCity || "nearest"} hub.\n\n` +
    `Track your delivery: ${trackLink}\n` +
    `Enter your order number (${o.id}) and the email used at checkout, then press "Track my order" to see your live status.\n\n` +
    `We'll email you as soon as your order leaves the warehouse.`;
  return {
    subject: `Payment received — your order ${o.id} — VapeSpot`,
    html: shell(o, body),
    text,
  };
}

/**
 * ④ Départ entrepôt + caution coursier — LE SEUL message qui mentionne le $300.
 * Envoyé au passage at_warehouse → in_transit. Les comptes de paiement sont les
 * MÊMES comptes ROTATIFS que l'email ② (l'admin les re-saisit : PayID · Bank ·
 * Crypto save 15%, séparés) — le client règle la caution vers l'un d'eux.
 * La somme est remboursée EN CASH par le coursier à l'arrivée (monnaie en
 * caisse, procédure validée). Optionnel : lien de suivi du coursier.
 */
export function emailDeparture(
  o: Order,
  pay: PaymentOptions,
  driverLink?: string | null
): { subject: string; html: string; text: string } {
  const sections = paymentSections(o, pay, INSURANCE_AUD);
  const body =
    `<p style="color:#222;font-size:16px;font-weight:700;margin:0 0 4px">Your order has left our warehouse 🚚</p>` +
    `<p style="color:#666;font-size:14px;margin:0 0 8px">Order <b>${o.id}</b> is on its way to ${escapeHtml(o.deliveryAddress)}.</p>` +
    (driverLink
      ? card("Track the courier live", [
          `<a href="${escapeHtml(driverLink)}" style="color:#2d1f8f">Open the courier tracking link</a>`,
        ])
      : "") +
    card(`Courier deposit — A$${INSURANCE_AUD.toFixed(2)} (refundable)`, [
      `To cover the value of the parcel during delivery, we ask for a refundable deposit of <b>A$${INSURANCE_AUD.toFixed(2)}</b>.`,
      "This amount will be refunded to you in cash by the courier when your order arrives.",
      "We carry compact devices of high value and lithium batteries, which Australian couriers classify as dangerous goods — this covers those costs and guarantees your protection.",
      `Transfer the deposit to any account below, then reply to this email with your payment screenshot.`,
    ], "warn") +
    sections.join("") +
    `<p style="color:#666;font-size:14px;margin:0">The courier carries the A$${INSURANCE_AUD.toFixed(2)} refund with them at delivery.</p>`;
  const text =
    `Your order has left our warehouse 🚚\n\n` +
    `Order ${o.id} is on its way to ${o.deliveryAddress}.\n` +
    (driverLink ? `Track the courier live: ${driverLink}\n\n` : `\n`) +
    `Courier deposit — A$${INSURANCE_AUD.toFixed(2)} (refundable)\n` +
    `To cover the value of the parcel during delivery, we ask for a refundable deposit of A$${INSURANCE_AUD.toFixed(2)}. ` +
    `This amount will be refunded to you in cash by the courier when your order arrives.\n` +
    `We carry compact devices of high value and lithium batteries, which Australian couriers classify as dangerous goods — this covers those costs and guarantees your protection.\n\n` +
    `Transfer the deposit to any account below, then reply to this email with your payment screenshot.\n\n` +
    (pay.payid && (pay.payid.name || pay.payid.payid)
      ? `① PayID\n${pay.payid.name ? `Name: ${pay.payid.name}\n` : ""}${pay.payid.payid ? `PayID: ${pay.payid.payid}\n` : ""}Osko payments\nDescription: Osko\nReference: OSKO\n\n`
      : "") +
    (pay.bank && (pay.bank.bsb || pay.bank.account || pay.bank.name)
      ? `② Bank Transfer\n${pay.bank.bsb ? `BSB: ${pay.bank.bsb}\n` : ""}${pay.bank.account ? `Account: ${pay.bank.account}\n` : ""}${pay.bank.name ? `Account name: ${pay.bank.name}\n` : ""}Osko payments\nDescription: Osko\nReference: OSKO\n\n`
      : "") +
    (pay.btc || pay.usdt
      ? `③ Crypto — save 15%\nPay ${fmtAud(Math.ceil(INSURANCE_AUD * 0.85))} instead of ${fmtAud(INSURANCE_AUD)} — you save ${fmtAud(INSURANCE_AUD - Math.ceil(INSURANCE_AUD * 0.85))}.\n` +
        (pay.btc ? `Bitcoin (BTC)\n${pay.btc.address ? `Address: ${pay.btc.address}\n` : ""}${pay.btc.network ? `Network: ${pay.btc.network}\n` : ""}` : "") +
        (pay.usdt ? `USDT (TRC-20)\n${pay.usdt.address ? `Address: ${pay.usdt.address}\n` : ""}${pay.usdt.network ? `Network: ${pay.usdt.network}\n` : ""}` : "") +
        `Crypto payments are handled in two separate networks. Send on the correct network only — funds sent on the wrong network can be lost.\n\n`
      : "") +
    `The courier carries the A$${INSURANCE_AUD.toFixed(2)} refund with them at delivery.\n\n` +
    `Questions? Reply to this email — a real person at VapeSpot will get back to you, or message ${SHOP_TG}: https://t.me/vapespot_store`;
  return {
    subject: `${o.id} is out for delivery — courier deposit A$${INSURANCE_AUD}`,
    html: shell(o, body),
    text,
  };
}

/** ⑤ Livré. */
export function emailDelivered(o: Order): { subject: string; html: string; text: string } {
  const body =
    `<p style="color:#2d1f8f;font-size:16px;font-weight:800;margin:0 0 4px">Delivered — enjoy! 🛍️</p>` +
    `<p style="color:#666;font-size:14px;margin:0">Order <b>${o.id}</b> has been delivered to ${escapeHtml(o.deliveryAddress)}. If anything is missing or damaged, reply to this email and we'll sort it out.</p>`;
  const text =
    `Delivered — enjoy! 🛍️\n\n` +
    `Order ${o.id} has been delivered to ${o.deliveryAddress}. If anything is missing or damaged, reply to this email and we'll sort it out.`;
  return {
    subject: `Your order ${o.id} has been delivered — VapeSpot`,
    html: shell(o, body),
    text,
  };
}

/** ⑥ Annulation — le client n'était PAS partie en livraison. Filtrée par
 *  l'admin (bouton Cancel). Si la commande avait été PAYÉE (statut ≥ paid), on
 *  le rappelle dans le corps (remboursement à organiser — l'admin décide du
 *  canal). Jamais de $300 ici non plus : la caution se gère sur le terrain. */
export function emailCancelled(o: Order): { subject: string; html: string; text: string } {
  const paid = o.status === "paid" || o.status === "at_warehouse" || o.status === "in_transit" || o.status === "delivery_failed";
  const refundLine = paid
    ? card("💳 Your payment", [
        `We'll arrange a <b>refund of ${fmtAud(o.totalAud)}</b> back to the account you paid from. If anything is unclear, just reply to this email and we'll confirm it's on its way.`,
      ])
    : "";
  const body =
    `<p style="color:#8a2be2;font-size:16px;font-weight:800;margin:0 0 4px">Your order ${o.id} was cancelled</p>` +
    `<p style="color:#666;font-size:14px;margin:0 0 8px">Hi${o.customerName ? " " + escapeHtml(o.customerName.split(" ")[0]) : ""}, your order <b>${o.id}</b> has been cancelled.</p>` +
    (o.paymentInstructionsSentAt
      ? `<p style="color:#666;font-size:14px;margin:0 0 8px">No payment is needed — if you already sent one, it will be returned.</p>`
      : `<p style="color:#666;font-size:14px;margin:0 0 8px">No payment was made, so there's nothing to refund.</p>`) +
    refundLine +
    `<p style="color:#666;font-size:14px;margin:0">If anything looks wrong, reply to this email or message ${tg("t.me/vapespot_store")} — a real person will sort it out.</p>`;
  const text =
    `Your order ${o.id} was cancelled\n\n` +
    `Hi${o.customerName ? " " + o.customerName.split(" ")[0] : ""}, your order ${o.id} has been cancelled.\n` +
    (o.paymentInstructionsSentAt
      ? `No payment is needed — if you already sent one, it will be returned.\n`
      : `No payment was made, so there's nothing to refund.\n`) +
    (paid ? `We'll arrange a refund of ${fmtAud(o.totalAud)} back to the account you paid from.\n\n` : `\n`) +
    `If anything looks wrong, reply to this email or message ${SHOP_TG} at https://t.me/vapespot_store — a real person will sort it out.`;
  return {
    subject: `Your order ${o.id} was cancelled — VapeSpot`,
    html: shell(o, body),
    text,
  };
}