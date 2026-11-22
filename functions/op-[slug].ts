// Étape 2 — Route admin secrète /op-<8chars> (noindex).
// Seul accès à l'URL+password ; cookie HMAC signé (COOKIE_SECRET).
// L'admin voit les commandes, saisit les comptes de paiement ROTATIFS
// (PayID / Bank / Crypto) et déclenche MANUELLEMENT le message ② d'instructions.
// Brevo suspendu depuis le 21/11 : AUCUN email client ne part plus — chaque
// action (②③④⑤⑥) envoie la version TEXTE BRUT complète du message au bot
// Telegram INTERNE du shop (@vapespot_orders_bot) ; l'admin la transmet à son
// client à la main. sendEmail reste codé dans _lib/brevo.ts (rien supprimé).
// Règle validée (20/11) : TOUS les moyens remplis partent ENSEMBLE dans un
// seul message, le client choisit. Champ vide = moyen sauté.
// ⚠️ Jamais de $300 ici : le message ② n'en parle pas (règle validée, seul ④).
import { escapeHtml, fmtAud } from "./_lib/html";
import {
  loginAllowed, loginBump, loginReset,
  signCookie, verifyCookie, readCookie,
  adminCookieHeader, adminCookieSet,
  csrfToken, csrfValid, adminError,
} from "./_lib/auth";
import { getOrder, listOrders, putOrder, isExpiredOrder, deleteOrder } from "./_lib/orders";
import { emailPaymentInstructions, emailCongrats, emailDeparture, emailDelivered, emailCancelled, type PaymentOptions, type PayIdOptions, type BankOptions, type CryptoOptions } from "./_lib/emails";
import { sendTelegram } from "./_lib/telegram";
import type { Order } from "./_lib/types";
import { PAYMENT_WINDOW_MIN } from "./_lib/types";

/** Slug admin (8 chars) — partie de l'URL secrète. */
const ADMIN_SLUG = "kx9vq7wd";

function ctEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const json = (o: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });

// ─────────────────────────── HTML ───────────────────────────
function pageShell(title: string, body: string, csrf: string): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeHtml(title)}</title><style>` +
    `:root{--bg:#0e1320;--card:#171e30;--edge:#2a3550;--txt:#e8ecf5;--mut:#93a0bc;--acc:#7c9bff;--ok:#33c47d;--warn:#f2a33c;--err:#ff6b6b}` +
    `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--txt);min-height:100vh}` +
    `.wrap{max-width:1020px;margin:0 auto;padding:22px 18px 60px}` +
    `header{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}` +
    `header h1{font-size:19px;margin:0;font-weight:800;letter-spacing:.3px}` +
    `header .sub{color:var(--mut);font-size:12px;margin-top:3px}` +
    `.btn{background:var(--acc);color:#0b1020;border:0;border-radius:8px;padding:9px 15px;font-size:13px;font-weight:700;cursor:pointer}` +
    `.btn.ghost{background:transparent;color:var(--mut);border:1px solid var(--edge)}` +
    `.btn.green{background:var(--ok);color:#06230f}.btn.danger{background:#3b1414;color:#ffb3b3;border:1px solid #6e2a2a}` +
    `.btn.kill{background:#2a0a0a;color:#ff6b6b;border:1px solid #8a2f2f}.btn.kill:hover{background:#4a1010}.btn:disabled{opacity:.45;cursor:not-allowed}` +
    `.card{background:var(--card);border:1px solid var(--edge);border-radius:12px;padding:16px 18px;margin-bottom:14px}` +
    `.row{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center}` +
    `.mut{color:var(--mut);font-size:13px}.pill{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700}` +
    `.pill.pending{background:#3a2f14;color:var(--warn)}.pill.paid{background:#12301c;color:var(--ok)}` +
    `.pill.cancelled{background:#3b1414;color:#ffb3b3}` +
    `.pill.other{background:#232c3f;color:var(--mut)}` +
    `label{display:block;font-size:12px;font-weight:700;color:var(--mut);margin:12px 0 5px;text-transform:uppercase;letter-spacing:.4px}` +
    `input,select,textarea{width:100%;background:#0e1424;border:1px solid var(--edge);border-radius:8px;color:var(--txt);padding:10px 12px;font-size:14px}` +
    `textarea{min-height:84px;resize:vertical;font-family:ui-monospace,Consolas,monospace;font-size:12px}` +
    `.grid{display:grid;grid-template-columns:1fr;gap:14px}.login-card{max-width:380px;margin:9vh auto 0}` +
    `details.pre{background:#0a0f1c;border:1px solid var(--edge);border-radius:10px;margin-top:12px;padding:10px 12px}` +
    `details.pre summary{cursor:pointer;color:var(--acc);font-size:13px;font-weight:700}` +
    `iframe.mail{width:100%;height:460px;border:1px solid var(--edge);border-radius:8px;background:#fff;margin-top:10px}` +
    `.banner{padding:11px 15px;border-radius:9px;margin:0 0 14px;font-size:14px;display:none}` +
    `.banner.ok{background:#12301c;color:#8fe6b4;display:block}.banner.err{background:#3b1414;color:#ffb3b3;display:block}` +
    `.empty{color:var(--mut);text-align:center;padding:40px 0;font-size:14px}` +
    `table.mini{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}` +
    `table.mini th{text-align:left;color:var(--mut);font-size:11px;text-transform:uppercase;padding:4px 6px}` +
    `table.mini td{padding:5px 6px;border-top:1px solid #1f2940}` +
    `.mgroup{background:#111a2e;border:1px solid var(--edge);border-radius:8px;padding:12px 14px}` +
    `.mgroup+.mgroup{margin-top:10px}` +
    `.mhead{font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.4px;color:var(--acc);margin-bottom:2px}` +
    `.f2{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}` +
    `.filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;align-items:center}` +
    `.filters .fbtn{background:#171e30;border:1px solid var(--edge);color:var(--mut);border-radius:99px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer}` +
    `.filters .fbtn.on{background:var(--acc);color:#0b1020;border-color:var(--acc)}` +
    `.pager{display:flex;gap:10px;align-items:center;justify-content:center;margin-top:18px;color:var(--mut);font-size:13px}` +
    `@media(max-width:480px){.f2{grid-template-columns:1fr}}` +
    `@media(min-width:760px){.grid{grid-template-columns:1fr 1fr}}` +
    `</style></head><body><div class="wrap">${body}</div>` +
    `<script>window.__csrf=${JSON.stringify(csrf)};</script></body></html>`
  );
}

function loginPage(): string {
  return pageShell(
    "VapeSpot Admin",
    `<header><h1>VapeSpot Admin</h1><div class="sub">Restricted access</div></header>` +
      `<div class="banner" id="banner"></div>` +
      `<div class="card login-card"><form id="login">` +
      `<label>Password</label><input type="password" id="pw" autofocus autocomplete="current-password">` +
      `<div style="margin-top:14px"><button class="btn" type="submit" style="width:100%">Sign in</button></div>` +
      `</form></div><script>` +
      `document.getElementById('login').onsubmit=async ev=>{ev.preventDefault();` +
      `const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',password:document.getElementById('pw').value})});` +
      `const j=await r.json();const b=document.getElementById('banner');` +
      `if(j.ok){location.reload()}else{b.className='banner err';b.textContent=j.error||'Invalid password'}};` +
      `</script>`,
    ""
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function orderCard(o: Order, csrf: string): string {
  const expired = isExpiredOrder(o);
  const statusPill =
    o.status === "pending_payment" ? `<span class="pill pending">${expired ? "EXPIRED" : "PENDING PAYMENT"}</span>`
    : o.status === "paid" ? `<span class="pill paid">PAID</span>`
    : o.status === "cancelled" ? `<span class="pill cancelled">CANCELLED</span>`
    : `<span class="pill other">${escapeHtml(o.status.replace(/_/g, " ").toUpperCase())}</span>`;
  const itemsTbl =
    `<table class="mini"><tr><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Total</th></tr>` +
    o.items
      .map(
        (it) =>
          `<tr><td>${escapeHtml(it.name)}</td><td style="text-align:right">×${it.quantity}</td>` +
          `<td style="text-align:right">A$${(it.priceAud * it.quantity).toFixed(2)}</td></tr>`
      )
      .join("") +
    `</table>`;

  const canSend = o.status === "pending_payment"; // fenêtre client dépassée ≠ bloquant : on peut renvoyer

  return (
    `<div class="card" data-id="${escapeHtml(o.id)}">` +
    `<div class="row" style="justify-content:space-between">` +
    `<div><b style="font-size:16px">${escapeHtml(o.id)}</b> · ${fmtAud(o.totalAud)} ${statusPill}</div>` +
    `<div class="mut">${escapeHtml(o.email)}<br>${escapeHtml(o.warehouseCity || "")} hub · ${timeAgo(o.createdAt)}</div>` +
    `</div>` +
    `<div class="mut" style="margin-top:6px">${escapeHtml(o.customerName)} — ${escapeHtml(o.deliveryAddress)}` +
    `${o.paymentInstructionsSentAt
              ? (expired
                  ? ` <b style="color:var(--err)">· client window CLOSED (${o.expireAt ? fmtDate(o.expireAt) : ""})</b>`
                  : ` · client window until ${o.expireAt ? fmtDate(o.expireAt) : ""}`)
              : ` · no window yet — payment instructions (②) not sent`}</div>` +
    itemsTbl +
    (o.driverLink ? `<div class="mut" style="margin-top:8px">🚚 Driver link: <a href="${escapeHtml(o.driverLink)}" target="_blank" rel="noopener" style="color:var(--acc)">${escapeHtml(o.driverLink)}</a></div>` : "") +
    (o.notes ? `<div class="mut" style="margin-top:8px;font-size:12px;white-space:pre-wrap">📝 ${escapeHtml(o.notes)}</div>` : "") +
    `<details class="pre"><summary>${canSend ? "Send payment instructions (Telegram ②)" : "Payment instructions unavailable"}</summary>` +
    (canSend
      ? `<div class="pay-form">` +
        `<input type="hidden" name="_csrf" value="${escapeHtml(csrf)}">` +
        `<p class="mut" style="margin:12px 0 0"><b>Fill every method you offer — all filled ones go together</b> in one message, the customer picks. Leave a method empty to skip it. Since Brevo is suspended, the message is sent to the <b>shop Telegram bot</b> — forward it to the customer.</p>` +
        `<div class="mgroup"><div class="mhead">① PayID</div>` +
        `<label>Account name</label><input name="payid_name" placeholder="e.g. EMILY" autocomplete="off">` +
        `<label>PayID</label><input name="payid" placeholder="e.g. emily@gmail.com / 04xx xxx xxx" autocomplete="off">` +
        `</div>` +
        `<div class="mgroup"><div class="mhead">② Bank Transfer</div>` +
        `<div class="f2">` +
        `<div><label>BSB</label><input name="bank_bsb" placeholder="000-000" autocomplete="off"></div>` +
        `<div><label>Account</label><input name="bank_account" placeholder="1234 5678" autocomplete="off"></div>` +
        `</div>` +
        `<label>Account name</label><input name="bank_name" placeholder="e.g. EMILY SMITH" autocomplete="off">` +
        `</div>` +
        `<div class="mgroup"><div class="mhead">③ Crypto — Bitcoin (BTC)</div>` +
        `<div class="f2">` +
        `<div><label>Address</label><input name="btc_address" placeholder="bc1q…" autocomplete="off"></div>` +
        `<div><label>Network</label><input name="btc_network" placeholder="SegWit / BTC" autocomplete="off"></div>` +
        `</div></div>` +
        `<div class="mgroup"><div class="mhead">③ Crypto — USDT</div>` +
        `<div class="f2">` +
        `<div><label>Address</label><input name="usdt_address" placeholder="TX…" autocomplete="off"></div>` +
        `<div><label>Network</label><input name="usdt_network" placeholder="TRC-20" autocomplete="off"></div>` +
        `</div></div>` +
        `<div class="row" style="margin-top:12px">` +
        `<button class="btn ghost" type="button" onclick="previewPay(this)">Preview</button>` +
        `<button class="btn green" type="button" onclick="sendPay(this)">Send payment instructions (Telegram)</button>` +
        `</div>` +
        `</div>`
      : ``) +
    `</details>` +
    statusActionsHTML(o, csrf, canSend) +
    `</div>`
  );
}

/**
 * Chaîne de boutons Étape 4 (validée 20/11) : chaque changement de statut
 * déclenche l'email correspondant. La barre d'actions suit le statut courant :
 *   pending_payment → "Payment confirmed" (③) [canSend]
 *   paid           → "In our warehouse" (aucun email : le statut passe à
 *                    at_warehouse, la frise cliente avance)
 *   at_warehouse   → formulaire email ④ (départ + caution A$300, MÊMES comptes
 *                    rotatifs que ② + lien coursier optionnel) → in_transit
 *   in_transit     → "Delivered" (⑤) · "Delivery failed"
 *   delivery_failed→ "Retry (back in transit)"
 *   expired        → rien (bloqué)
 * Tous les statuts actifs (sauf delivered/expired/cancelled) proposent un
 * bouton discret "✕ Cancel order" (email ⑥) — dernière ligne de secours si la
 * commande ne doit plus partir. cancelled = bouton de réouverture (retour au
 * statut pending_payment, sans email — anti-fausse-manipulation).
 */
function statusActionsHTML(o: Order, csrf: string, canSend: boolean): string {
  const cancelRow =
    `<div class="row" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--edge)"><button class="btn danger" type="button" onclick="cancelOrder(this)">✕ Cancel order</button>` +
    `<span class="mut">Stops the order and notifies the customer (⑥).</span></div>`;
  // Suppression DÉFINITIVE et manuelle — l'admin décide seule quand une commande
  // ne sert plus (tests, junk). Aucun compte à rebours, aucun TTL : que son clic.
  const deleteRow =
    `<div class="row" style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--edge)"><button class="btn kill" type="button" onclick="deleteOrder(this)">🗑 Delete permanently</button>` +
    `<span class="mut">Removes the order from the store NOW — no message sent, cannot be undone. For test/junk orders only.</span></div>`;

  if (o.status === "pending_payment") {
    if (!o.paymentInstructionsSentAt) {
      // ② pas encore envoyé → le bouton ③ ne doit PAS exister : l'admin doit
      // d'abord envoyer les instructions de paiement (sinon le clic avorte en 400).
      return (
        `<div class="row" style="margin-top:12px;background:#FEF0E4;border:1px solid #F5D9A8;border-radius:10px;padding:10px 12px">` +
        `<b style="color:var(--err)">⛔ Not payable yet — send payment instructions (②) first.</b>` +
        `<div class="mut">Fill the form above and click <b>Send payment instructions</b>. The "Payment confirmed" button only appears once the customer has a payment window.</div>` +
        `</div>` + cancelRow + deleteRow
      );
    }
    return (
      `<div class="row" style="margin-top:12px">` +
      `<button class="btn green" type="button" onclick="confirmPay(this)">✓ Payment confirmed — send message ③</button>` +
      `<span class="mut">Set order to PAID and send the tracking link (message ③).</span>` +
      `</div>` + cancelRow + deleteRow
    );
  }
  if (o.status === "paid") {
    return (
      `<div class="row" style="margin-top:12px">` +
      `<button class="btn" type="button" onclick="markInWarehouse(this)">📦 In our warehouse</button>` +
      `<span class="mut">Move the order to "In our warehouse" — no message goes out (client sees the timeline move).</span>` +
      `</div>` + cancelRow + deleteRow
    );
  }
  if (o.status === "at_warehouse") {
    return (
      `<details class="pre"><summary>🚚 Send departure message (④) + move to "On the way"</summary>` +
      `<div class="pay-form">` +
      `<input type="hidden" name="_csrf" value="${escapeHtml(csrf)}">` +
      `<p class="mut" style="margin:12px 0 0"><b>Message ④ = departure + A$300 courier deposit.</b>` +
      ` Fill the <b>same rotating accounts as ②</b> (this is generated manually each time) and an optional courier tracking link.</p>` +
      `<label>Courier tracking link (optional)</label>` +
      `<input name="driver_link" placeholder="https://…" autocomplete="off">` +
      `<div class="mgroup"><div class="mhead">① PayID</div>` +
      `<label>Account name</label><input name="dep_payid_name" placeholder="e.g. EMILY" autocomplete="off">` +
      `<label>PayID</label><input name="dep_payid" placeholder="e.g. emily@gmail.com / 04xx xxx xxx" autocomplete="off">` +
      `</div>` +
      `<div class="mgroup"><div class="mhead">② Bank Transfer</div>` +
      `<div class="f2">` +
      `<div><label>BSB</label><input name="dep_bank_bsb" placeholder="000-000" autocomplete="off"></div>` +
      `<div><label>Account</label><input name="dep_bank_account" placeholder="1234 5678" autocomplete="off"></div>` +
      `</div>` +
      `<label>Account name</label><input name="dep_bank_name" placeholder="e.g. EMILY SMITH" autocomplete="off">` +
      `</div>` +
      `<div class="mgroup"><div class="mhead">③ Crypto — Bitcoin (BTC)</div>` +
      `<div class="f2">` +
      `<div><label>Address</label><input name="dep_btc_address" placeholder="bc1q…" autocomplete="off"></div>` +
      `<div><label>Network</label><input name="dep_btc_network" placeholder="SegWit / BTC" autocomplete="off"></div>` +
      `</div></div>` +
      `<div class="mgroup"><div class="mhead">③ Crypto — USDT</div>` +
      `<div class="f2">` +
      `<div><label>Address</label><input name="dep_usdt_address" placeholder="TX…" autocomplete="off"></div>` +
      `<div><label>Network</label><input name="dep_usdt_network" placeholder="TRC-20" autocomplete="off"></div>` +
      `</div></div>` +
      `<div class="row" style="margin-top:12px">` +
      `<button class="btn ghost" type="button" onclick="previewDeparture(this)">Preview</button>` +
      `<button class="btn green" type="button" onclick="sendDeparture(this)">Send departure message (④) + mark "On the way"</button>` +
      `</div>` +
      `</div></details>` + cancelRow + deleteRow
    );
  }
  if (o.status === "in_transit") {
    return (
      `<div class="row" style="margin-top:12px">` +
      `<button class="btn green" type="button" onclick="markDelivered(this)">✅ Delivered — send message ⑤</button>` +
      `<button class="btn ghost" type="button" onclick="markFailed(this)">⚠️ Delivery failed</button>` +
      `</div>` + cancelRow + deleteRow
    );
  }
  if (o.status === "delivery_failed") {
    return (
      `<div class="row" style="margin-top:12px">` +
      `<button class="btn" type="button" onclick="retryDelivery(this)">↩️ Retry — back in transit</button>` +
      `<span class="mut">The customer keeps their timeline; a retry sends them back to "On the way".</span>` +
      `</div>` + cancelRow + deleteRow
    );
  }
  if (o.status === "cancelled") {
    return (
      `<div class="row" style="margin-top:12px">` +
      `<button class="btn ghost" type="button" onclick="reopenOrder(this)">↩️ Re-open (back to pending)</button>` +
      `<span class="mut">Restore the order to "Payment pending" — no message goes out (in case of a mistaken cancel).</span>` +
      `</div>` + deleteRow
    );
  }
  if (o.status === "delivered") {
    return (
      `<div class="row" style="margin-top:12px">` +
      `<span class="mut">🎉 Delivered — message ⑤ sent. Nothing to do.</span>` +
      `</div>` + deleteRow
    );
  }
  return ``; // expired / autres
}

/** Filtres de statut (barre en haut de l'admin) — labels lisibles pour l'admin. */
const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "paid", label: "Paid" },
  { value: "at_warehouse", label: "In warehouse" },
  { value: "in_transit", label: "On the way" },
  { value: "delivery_failed", label: "Delivery failed" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 20;

function filterBar(active: string): string {
  const chip = (f: { value: string; label: string }) =>
    `<a class="fbtn${f.value === active ? " on" : ""}" href="?status=${encodeURIComponent(f.value)}">${escapeHtml(f.label)}</a>`;
  return `<div class="filters">${STATUS_FILTERS.map(chip).join("")}</div>`;
}

function pager(page: number, pages: number, status: string): string {
  if (pages <= 1) return "";
  const link = (n: number, label: string, disabled: boolean) =>
    disabled
      ? `<span style="opacity:.4">${label}</span>`
      : `<a class="fbtn" href="?status=${encodeURIComponent(status)}&page=${n}" style="text-decoration:none">${label}</a>`;
  return (
    `<div class="pager">` +
    link(page - 1, "‹ Prev", page <= 1) +
    `<span>Page ${page} / ${pages}</span>` +
    link(page + 1, "Next ›", page >= pages) +
    `</div>`
  );
}

function adminPage(orders: Order[], csrf: string, status: string, page: number): string {
  const filtered =
    status === "" ? orders : orders.filter((o) => o.status === status);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cur = Math.min(Math.max(1, page), pages);
  const slice = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const cards = slice.length
    ? slice.map((o) => orderCard(o, csrf)).join("")
    : `<div class="empty">No orders in this view yet.</div>`;
  const sub = status ? `${total} × ${status.replace(/_/g, " ")}` : `${orders.length} orders`;
  return (
    pageShell(
      "VapeSpot Admin",
      `<header><div><h1>VapeSpot Admin</h1><div class="sub">${sub} · secret URL · noindex · ${PAGE_SIZE} per page</div></div>` +
        `<button class="btn ghost" onclick="logout()">Log out</button></header>` +
        `<div class="banner" id="banner"></div>` +
        filterBar(status) +
        `<div id="cards">${cards}</div>` +
        pager(cur, pages, status) +
        `<script>` +
        `const bell=(ok,txt)=>{const n=document.getElementById('banner');n.className='banner '+(ok?'ok':'err');n.textContent=(txt!==undefined)?txt:''};` +
        `const orderId=el=>{for(let n=el;n;n=n.parentElement)if(n.dataset&&n.dataset.id)return n.dataset.id};` +
        `const readCsrf=el=>{const h=el.closest('.pay-form')&&el.closest('.pay-form').querySelector('input[name=_csrf]');return h?h.value:window.__csrf};` +
        `async function logout(){await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'logout'})});location.reload()}` +
        `const gv=(f,n)=>{const el=f.querySelector('input[name="'+n+'"]');return el?(el.value||'').trim():''};` +
        `const payFields=f=>{const o={};` +
        `const pn=gv(f,'payid_name'),pid=gv(f,'payid');if(pn||pid){const p={};if(pn)p.name=pn;if(pid)p.payid=pid;o.payid=p}` +
        `const bb=gv(f,'bank_bsb'),ba=gv(f,'bank_account'),bn=gv(f,'bank_name');if(bb||ba||bn){const b={};if(bb)b.bsb=bb;if(ba)b.account=ba;if(bn)b.name=bn;o.bank=b}` +
        `const btca=gv(f,'btc_address'),btcn=gv(f,'btc_network');if(btca||btcn){const c={};if(btca)c.address=btca;if(btcn)c.network=btcn;o.btc=c}` +
        `const udta=gv(f,'usdt_address'),udtn=gv(f,'usdt_network');if(udta||udtn){const c={};if(udta)c.address=udta;if(udtn)c.network=udtn;o.usdt=c}` +
        `return o};` +
        `async function serve(btn,preview){` +
        `if(!preview&&!confirm('Send the payment instructions to your shop Telegram now (to forward to the customer)?'))return;` +
        `const f=btn.closest('.pay-form');const det=btn.closest('details.pre');` +
        `const pf=payFields(f);` +
        `if(!Object.keys(pf).length){alert('Fill at least one payment method before sending.');return}` +
        `const body={action:preview?'preview':'send-payment',orderId:orderId(btn),_csrf:readCsrf(btn),...pf};` +
        `const old=btn.textContent;btn.textContent=preview?'Loading…':'Sending…';btn.disabled=true;` +
        `try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();` +
        `if(preview){let ifr=f.querySelector('iframe.mail');if(!ifr){ifr=document.createElement('iframe');ifr.className='mail';det.appendChild(ifr)}ifr.srcdoc=typeof j.html==='string'?j.html:'⚠️ Preview error: '+(j.error||'no HTML returned');` +
        `const sum=det.querySelector('summary');sum.textContent='✉️ Preview — '+body.orderId;bell(true,'Preview ready — check the message below');btn.textContent=old;btn.disabled=false}` +
        `else if(j.ok){bell(true,'✓ Done');setTimeout(()=>location.reload(),1400)}` +
        `else{bell(false,(j&&j.error)||'Request failed');btn.textContent=old;btn.disabled=false}}` +
        `catch(e){bell(false,'Network error — request failed');btn.textContent=old;btn.disabled=false}}` +
        `function previewPay(btn){serve(btn,true)}` +
        `function sendPay(btn){serve(btn,false)}` +
        `async function confirmPay(btn){` +
        `if(!confirm('Confirm the payment for this order and send the tracking message (③) to your shop Telegram now?'))return;` +
        `const body={action:'mark-paid',orderId:orderId(btn),_csrf:readCsrf(btn)};` +
        `const old=btn.textContent;btn.textContent='Sending…';btn.disabled=true;` +
        `try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();` +
        `if(j.ok){bell(true,'✓ Done');setTimeout(()=>location.reload(),1400)}` +
        `else{bell(false,(j&&j.error)||'Request failed');btn.textContent=old;btn.disabled=false}}` +
        `catch(e){bell(false,'Network error — request failed');btn.textContent=old;btn.disabled=false}}` +
        `async function markInWarehouse(btn){` +
        `if(!confirm('Move this order to "In our warehouse"? No message goes out.'))return;` +
        `const body={action:'mark-in-warehouse',orderId:orderId(btn),_csrf:readCsrf(btn)};` +
        `const old=btn.textContent;btn.textContent='Updating…';btn.disabled=true;` +
        `try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();` +
        `if(j.ok){bell(true,'✓ Done');setTimeout(()=>location.reload(),1400)}` +
        `else{bell(false,(j&&j.error)||'Request failed');btn.textContent=old;btn.disabled=false}}` +
        `catch(e){bell(false,'Network error — request failed');btn.textContent=old;btn.disabled=false}}` +
        `const depFields=f=>{const o={};` +
        `const pn=gv(f,'dep_payid_name'),pid=gv(f,'dep_payid');if(pn||pid){const p={};if(pn)p.name=pn;if(pid)p.payid=pid;o.payid=p}` +
        `const bb=gv(f,'dep_bank_bsb'),ba=gv(f,'dep_bank_account'),bn=gv(f,'dep_bank_name');if(bb||ba||bn){const b={};if(bb)b.bsb=bb;if(ba)b.account=ba;if(bn)b.name=bn;o.bank=b}` +
        `const btca=gv(f,'dep_btc_address'),btcn=gv(f,'dep_btc_network');if(btca||btcn){const c={};if(btca)c.address=btca;if(btcn)c.network=btcn;o.btc=c}` +
        `const udta=gv(f,'dep_usdt_address'),udtn=gv(f,'dep_usdt_network');if(udta||udtn){const c={};if(udta)c.address=udta;if(udtn)c.network=udtn;o.usdt=c}` +
        `return o};` +
        `async function serveDeparture(btn,preview){` +
        `if(!preview&&!confirm('Send the departure message (④) with the A$300 deposit details to your shop Telegram and move this order to "On the way"?'))return;` +
        `const f=btn.closest('.pay-form');const det=btn.closest('details.pre');` +
        `const pf=depFields(f);` +
        `if(!Object.keys(pf).length){alert('Fill at least one payment account for the deposit before sending.');return}` +
        `const driverLink=(gv(f,'driver_link')||'').trim();` +
        `const body={action:preview?'preview-departure':'send-departure',orderId:orderId(btn),_csrf:readCsrf(btn),driverLink,...pf};` +
        `const old=btn.textContent;btn.textContent=preview?'Loading…':'Sending…';btn.disabled=true;` +
        `try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();` +
        `if(preview){let ifr=f.querySelector('iframe.mail');if(!ifr){ifr=document.createElement('iframe');ifr.className='mail';det.appendChild(ifr)}ifr.srcdoc=typeof j.html==='string'?j.html:'⚠️ Preview error: '+(j.error||'no HTML returned');` +
        `const sum=det.querySelector('summary');sum.textContent='✉️ Preview — '+body.orderId;bell(true,'Preview ready — check the message below');btn.textContent=old;btn.disabled=false}` +
        `else if(j.ok){bell(true,'✓ Done');setTimeout(()=>location.reload(),1400)}` +
        `else{bell(false,(j&&j.error)||'Request failed');btn.textContent=old;btn.disabled=false}}` +
        `catch(e){bell(false,'Network error — request failed');btn.textContent=old;btn.disabled=false}}` +
        `function previewDeparture(btn){serveDeparture(btn,true)}` +
        `function sendDeparture(btn){serveDeparture(btn,false)}` +
        `async function markDelivered(btn){` +
        `if(!confirm('Mark this order as DELIVERED and send the delivery message (⑤) to your shop Telegram now?'))return;` +
        `const body={action:'mark-delivered',orderId:orderId(btn),_csrf:readCsrf(btn)};` +
        `const old=btn.textContent;btn.textContent='Sending…';btn.disabled=true;` +
        `try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();` +
        `if(j.ok){bell(true,'✓ Done');setTimeout(()=>location.reload(),1400)}` +
        `else{bell(false,(j&&j.error)||'Request failed');btn.textContent=old;btn.disabled=false}}` +
        `catch(e){bell(false,'Network error — request failed');btn.textContent=old;btn.disabled=false}}` +
        `async function markFailed(btn){` +
        `if(!confirm('Mark this delivery as FAILED? The courier will retry shortly (no message to client).'))return;` +
        `const body={action:'mark-failed',orderId:orderId(btn),_csrf:readCsrf(btn)};` +
        `const old=btn.textContent;btn.textContent='Updating…';btn.disabled=true;` +
        `try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();` +
        `if(j.ok){bell(true,'✓ Done');setTimeout(()=>location.reload(),1400)}` +
        `else{bell(false,(j&&j.error)||'Request failed');btn.textContent=old;btn.disabled=false}}` +
        `catch(e){bell(false,'Network error — request failed');btn.textContent=old;btn.disabled=false}}` +
        `async function retryDelivery(btn){` +
        `if(!confirm('Send this failed delivery back to "On the way" for a courier retry?'))return;` +
        `const body={action:'retry-delivery',orderId:orderId(btn),_csrf:readCsrf(btn)};` +
        `const old=btn.textContent;btn.textContent='Updating…';btn.disabled=true;` +
        `try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();` +
        `if(j.ok){bell(true,'✓ Done');setTimeout(()=>location.reload(),1400)}` +
        `else{bell(false,(j&&j.error)||'Request failed');btn.textContent=old;btn.disabled=false}}` +
        `catch(e){bell(false,'Network error — request failed');btn.textContent=old;btn.disabled=false}}` +
        `async function cancelOrder(btn){` +
        `if(!confirm('Cancel this order and send the cancellation message (⑥) to your shop Telegram (to forward to the customer)? This cannot be undone from the client side.'))return;` +
        `const body={action:'cancel-order',orderId:orderId(btn),_csrf:readCsrf(btn)};` +
        `const old=btn.textContent;btn.textContent='Cancelling…';btn.disabled=true;` +
        `try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();` +
        `if(j.ok){bell(true,'✓ Done');setTimeout(()=>location.reload(),1400)}` +
        `else{bell(false,(j&&j.error)||'Request failed');btn.textContent=old;btn.disabled=false}}` +
        `catch(e){bell(false,'Network error — request failed');btn.textContent=old;btn.disabled=false}}` +
        `async function reopenOrder(btn){` +
        `if(!confirm('Re-open this cancelled order (back to "Payment pending")? No message goes out.'))return;` +
        `const body={action:'reopen-order',orderId:orderId(btn),_csrf:readCsrf(btn)};` +
        `const old=btn.textContent;btn.textContent='Re-opening…';btn.disabled=true;` +
        `try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();` +
        `if(j.ok){bell(true,'✓ Done');setTimeout(()=>location.reload(),1400)}` +
        `else{bell(false,(j&&j.error)||'Request failed');btn.textContent=old;btn.disabled=false}}` +
        `catch(e){bell(false,'Network error — request failed');btn.textContent=old;btn.disabled=false}}` +
        `async function deleteOrder(btn){` +
        `if(!confirm('Permanently DELETE this order from the store? There is NO undo and NO message is sent to the customer. Only for test/junk orders that must disappear. Continue?'))return;` +
        `const body={action:'delete-order',orderId:orderId(btn),_csrf:readCsrf(btn)};` +
        `const old=btn.textContent;btn.textContent='Deleting…';btn.disabled=true;` +
        `try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();` +
        `if(j.ok){bell(true,'✓ '+body.orderId+' permanently deleted');setTimeout(()=>location.reload(),1400)}` +
        `else{bell(false,(j&&j.error)||'Request failed');btn.textContent=old;btn.disabled=false}}` +
        `catch(e){bell(false,'Network error — request failed');btn.textContent=old;btn.disabled=false}}` +
        `</script>`,
      csrf
    ) + ``
  );
}

// ─────────────────────────── GET ───────────────────────────
export async function onRequestGet(context: any): Promise<Response> {
  const { params, env } = context;
  if (params.slug !== ADMIN_SLUG) {
    return new Response("Not Found", { status: 404 });
  }
  const cookie = readCookie(context.request);
  const authed = cookie ? await verifyCookie(env.COOKIE_SECRET, cookie) : false;
  if (!authed) return new Response(loginPage(), { headers: { "content-type": "text/html; charset=utf-8" } });

  const csrf = cookie ? await csrfToken(env.COOKIE_SECRET, cookie) : "";
  const orders = (await listOrders(env)).filter((o) => o.status !== "expired");
  const url = new URL(context.request.url);
  const status = String(url.searchParams.get("status") ?? "");
  const statusOk = STATUS_FILTERS.some((f) => f.value === status);
  const page = Math.max(1, parseInt(String(url.searchParams.get("page") ?? "1"), 10) || 1);
  return new Response(adminPage(orders, csrf, statusOk ? status : "", page), {
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
  });
}

// ─────────────────────────── POST ───────────────────────────
export async function onRequestPost(context: any): Promise<Response> {
  const { params, env } = context;
  if (params.slug !== ADMIN_SLUG) return new Response("Not Found", { status: 404 });

  let body: any;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const action = String(body.action ?? "");
  const cookie = readCookie(context.request);
  const ip = context.request.headers.get("CF-Connecting-IP") ?? "unknown";

  if (action === "login") {
    if (!(await loginAllowed(env, ip))) {
      return json({ ok: false, error: "Too many attempts — try again later." }, 429);
    }
    const given = String(body.password ?? "");
    if (!ctEq(given, env.ADMIN_PASSWORD)) {
      await loginBump(env, ip);
      return json({ ok: false, error: "Invalid password." }, 401);
    }
    await loginReset(env, ip);
    const value = await signCookie(env.COOKIE_SECRET);
    return json({ ok: true }, 200, { "set-cookie": adminCookieHeader(value) });
  }

  if (action === "logout") {
    return json({ ok: true }, 200, { "set-cookie": adminCookieSet });
  }

  // Toutes les autres actions exigent l'auth + CSRF
  if (!cookie || !(await verifyCookie(env.COOKIE_SECRET, cookie))) {
    return json({ ok: false, error: "auth_required" }, 401);
  }
  if (!(await csrfValid(env.COOKIE_SECRET, cookie, String(body._csrf ?? "")))) {
    return json({ ok: false, error: "bad_csrf" }, 403);
  }
  const orderId = String(body.orderId ?? "");
  const order = orderId ? await getOrder(env, orderId) : null;
  if (!order) return json({ ok: false, error: "order_not_found" }, 404);

  const s = (v: unknown) => String(v ?? "").trim();

  // ── Convertisseur de champs admin → PaymentOptions (structure {payid:{…}, bank:{…}, btc:{…}, usdt:{…}}) ──
  const toCrypto = (v: unknown): CryptoOptions | undefined => {
    const obj = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    const address = s(obj.address), network = s(obj.network);
    if (!address && !network) return undefined;
    const c: CryptoOptions = {};
    if (address) c.address = address;
    if (network) c.network = network;
    return c;
  };

  // ── Étape 3 : confirmation de paiement par l'admin → email ③ + statut PAID ──
  // Envoyé AVANT le parse des moyens de paiement : cette action n'en a pas besoin.
  if (action === "mark-paid") {
    if (order.status !== "pending_payment") {
      return json({ ok: false, error: "Order is not awaiting payment anymore." }, 400);
    }
    // Garde logique : on ne confirme un paiement que si le client a reçu les
    // instructions (②). Une commande fraîche ne peut pas avoir été payée.
    if (!order.paymentInstructionsSentAt) {
      return json({ ok: false, error: "Send payment instructions (②) first — this order has no payment window yet." }, 400);
    }
    const mail = emailCongrats(order);
    // Brevo suspendu (22/11) : le message-client COMPLET (mail.text) part sur le
    // bot Telegram INTERNE du shop → l'admin le transmet à son client à la main.
    const sent = await sendTelegram(env, mail.text);
    if (!sent.ok) {
      return json({ ok: false, error: `Message ③ failed (${sent.status}) — check the shop Telegram bot` }, 502);
    }
    const nowIso = new Date().toISOString();
    order.status = "paid";
    order.updatedAt = nowIso;
    order.notes = `${order.notes ? order.notes + "\n" : ""}[${fmtDate(nowIso)}] payment confirmed by admin — message ③ (tracking link) sent to shop Telegram`;
    await putOrder(env, order);
    return json({ ok: true, msg: `Message ③ (tracking link) sent to the shop Telegram (${order.id}) — order marked as PAID. Forward it to the customer.` });
  }

  // ── Étape 4a : paid → at_warehouse (aucun message : la frise cliente avance) ──
  if (action === "mark-in-warehouse") {
    if (order.status !== "paid") {
      return json({ ok: false, error: "Order must be PAID (message ③ sent) before moving to the warehouse." }, 400);
    }
    const nowIso = new Date().toISOString();
    order.status = "at_warehouse";
    order.updatedAt = nowIso;
    order.notes = `${order.notes ? order.notes + "\n" : ""}[${fmtDate(nowIso)}] moved to "In our warehouse" (no message — client sees the timeline move)`;
    await putOrder(env, order);
    await sendTelegram(env, `📦 ${order.id} AT THE WAREHOUSE (${fmtAud(order.totalAud)})`);
    return json({ ok: true, msg: `${order.id} moved to "In our warehouse".` });
  }

  // ── Étape 4b : at_warehouse → in_transit (message ④ départ + caution A$300) ──
  if (action === "preview-departure" || action === "send-departure") {
    if (order.status !== "at_warehouse") {
      return json({ ok: false, error: 'Order must be "In our warehouse" before the departure message (④).' }, 400);
    }
    const payidObj = body.payid && typeof body.payid === "object" ? (body.payid as Record<string, unknown>) : {};
    const bankObj = body.bank && typeof body.bank === "object" ? (body.bank as Record<string, unknown>) : {};
    const payOptions: PaymentOptions = {};
    const payidName = s(payidObj.name), payid = s(payidObj.payid);
    if (payidName || payid) {
      const p: PayIdOptions = {};
      if (payidName) p.name = payidName;
      if (payid) p.payid = payid;
      payOptions.payid = p;
    }
    const bsb = s(bankObj.bsb), account = s(bankObj.account), bankName = s(bankObj.name);
    if (bsb || account || bankName) {
      const b: BankOptions = {};
      if (bsb) b.bsb = bsb;
      if (account) b.account = account;
      if (bankName) b.name = bankName;
      payOptions.bank = b;
    }
    const btc = toCrypto(body.btc), usdt = toCrypto(body.usdt);
    if (btc) payOptions.btc = btc;
    if (usdt) payOptions.usdt = usdt;
    if (!payOptions.payid && !payOptions.bank && !payOptions.btc && !payOptions.usdt) {
      return json({ ok: false, error: "Fill at least one payment account for the A$300 deposit (PayID, bank, BTC or USDT)." }, 400);
    }
    const driverLink = s(body.driverLink) || null;
    const mail = emailDeparture(order, payOptions, driverLink);

    if (action === "preview-departure") {
      return json({ ok: true, html: mail.html });
    }
    const sent = await sendTelegram(env, mail.text);
    if (!sent.ok) {
      return json({ ok: false, error: `Message ④ failed (${sent.status}) — check the shop Telegram bot` }, 502);
    }
    const nowIso = new Date().toISOString();
    order.status = "in_transit";
    order.driverLink = driverLink;
    order.updatedAt = nowIso;
    order.notes = `${order.notes ? order.notes + "\n" : ""}[${fmtDate(nowIso)}] departure message (④) sent to shop Telegram — order ON ITS WAY${driverLink ? ` — driver link ${driverLink}` : ""}`;
    await putOrder(env, order);
    return json({ ok: true, msg: `Message ④ (departure + A$300 deposit) sent to the shop Telegram (${order.id}) — order marked as "On the way". Forward it to the customer.` });
  }

  // ── Étape 4c : in_transit → delivered (message ⑤) ──
  if (action === "mark-delivered") {
    if (order.status !== "in_transit") {
      return json({ ok: false, error: 'Order must be "On the way" before marking it delivered.' }, 400);
    }
    const mail = emailDelivered(order);
    const sent = await sendTelegram(env, mail.text);
    if (!sent.ok) {
      return json({ ok: false, error: `Message ⑤ failed (${sent.status}) — check the shop Telegram bot` }, 502);
    }
    const nowIso = new Date().toISOString();
    order.status = "delivered";
    order.updatedAt = nowIso;
    order.notes = `${order.notes ? order.notes + "\n" : ""}[${fmtDate(nowIso)}] delivered — message ⑤ sent to shop Telegram (courier refunded A$300 cash at the door)`;
    await putOrder(env, order);
    return json({ ok: true, msg: `Message ⑤ (delivered) sent to the shop Telegram (${order.id}) — order marked as DELIVERED. Forward it to the customer.` });
  }

  // ── Étape 4d : in_transit → delivery_failed (aucun message : le coursier re-essaye) ──
  if (action === "mark-failed") {
    if (order.status !== "in_transit") {
      return json({ ok: false, error: 'Only an order "On the way" can be marked as delivery failed.' }, 400);
    }
    const nowIso = new Date().toISOString();
    order.status = "delivery_failed";
    order.updatedAt = nowIso;
    order.notes = `${order.notes ? order.notes + "\n" : ""}[${fmtDate(nowIso)}] delivery failed — courier will retry shortly (no message sent)`;
    await putOrder(env, order);
    await sendTelegram(env, `⚠️ ${order.id} DELIVERY FAILED — another attempt is planned\n${order.id} → ${fmtAud(order.totalAud)}`);
    return json({ ok: true, msg: `${order.id} marked as delivery failed — a courier will retry shortly.` });
  }

  // ── Étape 4e : delivery_failed → in_transit (retry, aucun message) ──
  if (action === "retry-delivery") {
    if (order.status !== "delivery_failed") {
      return json({ ok: false, error: "Only a failed delivery can be sent back in transit." }, 400);
    }
    const nowIso = new Date().toISOString();
    order.status = "in_transit";
    order.updatedAt = nowIso;
    order.notes = `${order.notes ? order.notes + "\n" : ""}[${fmtDate(nowIso)}] retry — back in transit (no message sent)`;
    await putOrder(env, order);
    await sendTelegram(env, `↩️ ${order.id} RETRY — back ON THE WAY (${fmtAud(order.totalAud)})`);
    return json({ ok: true, msg: `${order.id} sent back to "On the way" for a courier retry.` });
  }

  // ── Étape 4f : ANNULATION (message ⑥) — tous les statuts actifs sauf delivered/expired ──
  if (action === "cancel-order") {
    if (order.status === "delivered" || order.status === "expired" || order.status === "cancelled") {
      return json({ ok: false, error: "This order cannot be cancelled (already delivered, expired or cancelled)." }, 400);
    }
    const mail = emailCancelled(order);
    const sent = await sendTelegram(env, mail.text);
    if (!sent.ok) {
      return json({ ok: false, error: `Message ⑥ failed (${sent.status}) — check the shop Telegram bot` }, 502);
    }
    const nowIso = new Date().toISOString();
    order.status = "cancelled";
    order.updatedAt = nowIso;
    order.notes = `${order.notes ? order.notes + "\n" : ""}[${fmtDate(nowIso)}] CANCELLED by admin — message ⑥ sent to shop Telegram`;
    await putOrder(env, order);
    return json({ ok: true, msg: `Message ⑥ (cancellation) sent to the shop Telegram (${order.id}) — order CANCELLED. Forward it to the customer.` });
  }

  // ── Étape 4g : réouverture (cancelled → pending_payment) — anti-fausse-manipulation, sans message ──
  if (action === "reopen-order") {
    if (order.status !== "cancelled") {
      return json({ ok: false, error: "Only a cancelled order can be re-opened." }, 400);
    }
    const nowIso = new Date().toISOString();
    order.status = "pending_payment";
    order.updatedAt = nowIso;
    order.notes = `${order.notes ? order.notes + "\n" : ""}[${fmtDate(nowIso)}] re-opened by admin — back to payment pending (no message sent)`;
    await putOrder(env, order);
    await sendTelegram(env, `↩️ ${order.id} RE-OPENED (back to payment pending)`);
    return json({ ok: true, msg: `${order.id} re-opened — back to "Payment pending".` });
  }

  // ── Suppression DÉFINITIVE (bouton "Delete permanently" de l'admin) ──
  // Irréversible, AUCUN email : l'admin supprime MANUELLEMENT quand une commande
  // ne sert plus (test, junk). Pas de TTL, pas de compte à rebours — que son clic.
  // Aucune restriction de statut : l'admin peut nettoyer n'importe quelle commande.
  if (action === "delete-order") {
    const id = order.id;
    await deleteOrder(env, id);
    await sendTelegram(env, `🗑️ ${id} DELETED PERMANENTLY (manual admin action)`);
    return json({ ok: true, msg: `${id} permanently deleted from the store.` });
  }

  // ── Étape 2 : instructions de paiement (email ②) — uniquement pending_payment ──
  {
    if (order.status !== "pending_payment") {
      return json({ ok: false, error: "Order is not awaiting payment anymore." }, 400);
    }
    const payOptions: PaymentOptions = {};
    // ⚠️ Le JS admin envoie des OBJETS STRUCTURÉS via `...payFields(f)` :
    //   payid: {name, payid} · bank: {bsb, account, name} · btc/usdt: {address, network}
    // Le parse lit CE format exact — sinon String(Objet) = "[object Object]" brouillé.
    const o = (v: unknown): Record<string, unknown> =>
      v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    const payidObj = o(body.payid);
    const payidName = s(payidObj.name), payid = s(payidObj.payid);
    if (payidName || payid) {
      const p: PayIdOptions = {};
      if (payidName) p.name = payidName;
      if (payid) p.payid = payid;
      payOptions.payid = p;
    }
    const bankObj = o(body.bank);
    const bsb = s(bankObj.bsb), account = s(bankObj.account), bankName = s(bankObj.name);
    if (bsb || account || bankName) {
      const b: BankOptions = {};
      if (bsb) b.bsb = bsb;
      if (account) b.account = account;
      if (bankName) b.name = bankName;
      payOptions.bank = b;
    }
    const btc = toCrypto(body.btc), usdt = toCrypto(body.usdt);
    if (btc) payOptions.btc = btc;
    if (usdt) payOptions.usdt = usdt;
    if (!payOptions.payid && !payOptions.bank && !payOptions.btc && !payOptions.usdt) {
      return json({ ok: false, error: "Fill at least one payment method (PayID, bank, BTC or USDT)." }, 400);
    }

    const mail = emailPaymentInstructions(order, payOptions);

    if (action === "preview") {
      return json({ ok: true, html: mail.html });
    }

    if (action === "send-payment") {
      // Brevo suspendu (22/11) : la version TEXTE BRUT complète du message ②
      // part sur le bot Telegram INTERNE du shop → l'admin la transmet au client.
      const sent = await sendTelegram(env, mail.text);
      if (!sent.ok) {
        return json({ ok: false, error: `Message ② failed (${sent.status}) — check the shop Telegram bot` }, 502);
      }
      const nowIso = new Date().toISOString();
      const given = [payOptions.payid && "PayID", payOptions.bank && "Bank", payOptions.btc && "BTC", payOptions.usdt && "USDT"].filter(Boolean).join(" + ");
      order.paymentMethod = given.toLowerCase();
      // ⚠️ La fenêtre de paiement 30 min ne démarre QUE maintenant : le client a
      // reçu ses instructions, la réservation court pendant 30 min à partir de là.
      order.paymentInstructionsSentAt = nowIso;
      order.expireAt = new Date(new Date(nowIso).getTime() + PAYMENT_WINDOW_MIN * 60_000).toISOString();
      order.notes = `${order.notes ? order.notes + "\n" : ""}[${fmtDate(nowIso)}] payment instructions (②) sent to shop Telegram — ${given} (client window 30 min starts now)`;
      order.updatedAt = nowIso;
      await putOrder(env, order);
      return json({ ok: true, msg: `Message ② (payment instructions) sent to the shop Telegram (${order.id}) — ${given}. Forward it to the customer.` });
    }
  }

  return json({ ok: false, error: "unknown_action" }, 400);
}