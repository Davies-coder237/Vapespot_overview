// Étape 2 — Route admin secrète /op-<8chars> (noindex).
// Seul accès à l'URL+password ; cookie HMAC signé (COOKIE_SECRET).
// L'admin voit les commandes, saisit les comptes de paiement ROTATIFS
// (PayID / Bank / Crypto) et déclenche MANUELLEMENT l'email ② d'instructions.
// Règle validée (20/11) : TOUS les moyens remplis partent ENSEMBLE dans un
// seul email, le client choisit. Champ vide = moyen sauté.
// ⚠️ Jamais de $300 ici : l'email ② n'en parle pas (règle validée, seul ④).
import { escapeHtml } from "./_lib/html";
import {
  loginAllowed, loginBump, loginReset,
  signCookie, verifyCookie, readCookie,
  adminCookieHeader, adminCookieSet,
  csrfToken, csrfValid, adminError,
} from "./_lib/auth";
import { getOrder, listOrders, putOrder, isExpiredOrder } from "./_lib/orders";
import { emailPaymentInstructions, type PaymentOptions, type PayIdOptions, type BankOptions, type CryptoOptions } from "./_lib/emails";
import { sendEmail } from "./_lib/brevo";
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
    `.btn.green{background:var(--ok);color:#06230f}.btn:disabled{opacity:.45;cursor:not-allowed}` +
    `.card{background:var(--card);border:1px solid var(--edge);border-radius:12px;padding:16px 18px;margin-bottom:14px}` +
    `.row{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center}` +
    `.mut{color:var(--mut);font-size:13px}.pill{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700}` +
    `.pill.pending{background:#3a2f14;color:var(--warn)}.pill.paid{background:#12301c;color:var(--ok)}` +
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
    `<div><b style="font-size:16px">${escapeHtml(o.id)}</b> · A$${o.totalAud.toFixed(2)} ${statusPill}</div>` +
    `<div class="mut">${escapeHtml(o.email)}<br>${escapeHtml(o.warehouseCity || "")} hub · ${timeAgo(o.createdAt)}</div>` +
    `</div>` +
    `<div class="mut" style="margin-top:6px">${escapeHtml(o.customerName)} — ${escapeHtml(o.deliveryAddress)}` +
    `${o.paymentInstructionsSentAt
              ? (expired
                  ? ` <b style="color:var(--err)">· client window CLOSED (${o.expireAt ? fmtDate(o.expireAt) : ""})</b>`
                  : ` · client window until ${o.expireAt ? fmtDate(o.expireAt) : ""}`)
              : ` · no window yet — email ② not sent`}</div>` +
    itemsTbl +
    (o.notes ? `<div class="mut" style="margin-top:8px;font-size:12px;white-space:pre-wrap">📝 ${escapeHtml(o.notes)}</div>` : "") +
    `<details class="pre"><summary>${canSend ? "Send payment instructions (email ②)" : "Payment instructions unavailable"}</summary>` +
    (canSend
      ? `<div class="pay-form">` +
        `<input type="hidden" name="_csrf" value="${escapeHtml(csrf)}">` +
        `<p class="mut" style="margin:12px 0 0"><b>Fill every method you offer — all filled ones go together</b> in one email, the customer picks. Leave a method empty to skip it.</p>` +
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
        `<button class="btn green" type="button" onclick="sendPay(this)">Send email ②</button>` +
        `</div>` +
        `</div>`
      : ``) +
    `</details>` +
    `</div>`
  );
}

function adminPage(orders: Order[], csrf: string): string {
  const cards = orders.length
    ? orders.map((o) => orderCard(o, csrf)).join("")
    : `<div class="empty">No orders yet — they appear here as customers place them.</div>`;
  return (
    pageShell(
      "VapeSpot Admin",
      `<header><div><h1>VapeSpot Admin</h1><div class="sub">${orders.length} order${orders.length === 1 ? "" : "s"} · secret URL · noindex</div></div>` +
        `<button class="btn ghost" onclick="logout()">Log out</button></header>` +
        `<div class="banner" id="banner"></div>` +
        `<div id="cards">${cards}</div>` +
        `<script>` +
        `const bell=ok=>{const n=document.getElementById('banner');n.className='banner '+(ok?'ok':'err');setTimeout(()=>n.className='banner',6000)};` +
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
        `if(!preview&&!confirm('Send the payment instructions by email to this customer now?'))return;` +
        `const f=btn.closest('.pay-form');const det=btn.closest('details.pre');` +
        `const pf=payFields(f);` +
        `if(!Object.keys(pf).length){alert('Fill at least one payment method before sending.');return}` +
        `const body={action:preview?'preview':'send-payment',orderId:orderId(btn),_csrf:readCsrf(btn),...pf};` +
        `const old=btn.textContent;btn.textContent=preview?'Loading…':'Sending…';btn.disabled=true;` +
        `try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();` +
        `if(preview){let ifr=f.querySelector('iframe.mail');if(!ifr){ifr=document.createElement('iframe');ifr.className='mail';det.appendChild(ifr)}ifr.srcdoc=typeof j.html==='string'?j.html:'⚠️ Preview error: '+(j.error||'no HTML returned');` +
        `const sum=det.querySelector('summary');sum.textContent='✉️ Preview — '+body.orderId;bell(true)}` +
        `else if(j.ok){bell(true);setTimeout(()=>location.reload(),1400)}` +
        `else{bell(false);btn.textContent=old;btn.disabled=false}}` +
        `catch(e){bell(false);btn.textContent=old;btn.disabled=false}}` +
        `function previewPay(btn){serve(btn,true)}` +
        `function sendPay(btn){serve(btn,false)}` +
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
  return new Response(adminPage(orders, csrf), {
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
  // Une fenêtre de paiement dépassée n'empêche PAS l'admin d'envoyer/renvoyer :
  // le statut doit être pending_payment (le client peut toujours payer).
  if (order.status !== "pending_payment") {
    return json({ ok: false, error: "Order is not awaiting payment anymore." }, 400);
  }
  const s = (v: unknown) => String(v ?? "").trim();
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
  const btcObj = o(body.btc);
  const btcAddr = s(btcObj.address), btcNet = s(btcObj.network);
  if (btcAddr || btcNet) {
    const c: CryptoOptions = {};
    if (btcAddr) c.address = btcAddr;
    if (btcNet) c.network = btcNet;
    payOptions.btc = c;
  }
  const usdtObj = o(body.usdt);
  const usdtAddr = s(usdtObj.address), usdtNet = s(usdtObj.network);
  if (usdtAddr || usdtNet) {
    const c: CryptoOptions = {};
    if (usdtAddr) c.address = usdtAddr;
    if (usdtNet) c.network = usdtNet;
    payOptions.usdt = c;
  }
  if (!payOptions.payid && !payOptions.bank && !payOptions.btc && !payOptions.usdt) {
    return json({ ok: false, error: "Fill at least one payment method (PayID, bank, BTC or USDT)." }, 400);
  }

  const mail = emailPaymentInstructions(order, payOptions);

  if (action === "preview") {
    return json({ ok: true, html: mail.html });
  }

  if (action === "send-payment") {
    const sent = await sendEmail(env, { to: order.email, subject: mail.subject, html: mail.html, text: mail.text, tag: "payment-instructions" });
    if (!sent.ok) {
      return json({ ok: false, error: `Email failed (${sent.status}) — check Brevo`, ...(sent.error ? { detail: sent.error } : {}) }, 502);
    }
    const nowIso = new Date().toISOString();
    const given = [payOptions.payid && "PayID", payOptions.bank && "Bank", payOptions.btc && "BTC", payOptions.usdt && "USDT"].filter(Boolean).join(" + ");
    order.paymentMethod = given.toLowerCase();
    // ⚠️ La fenêtre de paiement 30 min ne démarre QUE maintenant : le client a
    // reçu ses instructions, la réservation court pendant 30 min à partir de là.
    order.paymentInstructionsSentAt = nowIso;
    order.expireAt = new Date(new Date(nowIso).getTime() + PAYMENT_WINDOW_MIN * 60_000).toISOString();
    order.notes = `${order.notes ? order.notes + "\n" : ""}[${fmtDate(nowIso)}] payment instructions (②) sent — ${given} (client window 30 min starts now)`;
    order.updatedAt = nowIso;
    await putOrder(env, order);
    return json({ ok: true, msg: `Email ② sent to ${order.email} (${order.id}) — ${given}` });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
}