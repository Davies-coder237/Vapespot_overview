// Étape 3+4 — page publique /track : suivi de commande (noindex).
// Flux validé 20/11, CLARIFIÉ + RÉTABLI 21/11 (retours utilisatrice) :
//   1. L'email ③ félicitations envoie un lien de suivi GÉNÉRIQUE : `/track`,
//      identique pour tous les clients. Aucun pré-remplissage n°/email dans
//      l'URL (pas de ?n=…&e=…).
//   2. Sur /track, le client SAISIT son n° de commande + son email → lookup POST.
//   3. Anti-enumération STRICTE : le couple (n°, email) doit correspondre à la
//      MÊME commande, sinon message GÉNÉRIQUE « No order matches this order
//      number and email address. » (jamais de distinction n° invalide / email
//      invalide). RATE LIMIT : 5 lookups ratés / 15 min / IP (KV).
//   4. En cas de correspondance : n° · date · produits · quantités · total ·
//      mode de paiement · adresse · frise de statut (Order received → Payment
//      confirmed → In our warehouse → On the way → Delivered) · CARTE LEALET
//      (entrepôt VapeSpot Hub + adresse de livraison + trajet + km/temps ; hors
//      zone coursier → libellé Australia Post 1-3 j, DÉCLENCHÉ 21/11 utilisatrice).
//   5. AUCUNE donnée sensible exposée : pas d'email, pas de notes, pas de $300.
// ❗ FIX 21/11 SOIR : les handlers renvoyaient le fragment sans le wrapper
// `trackPage` (CSS + <title> + header perdus → page blanche). Refonte design
// aux couleurs de la marque (violet #7C3AED / fond lavande / header VapeSpot).
import { getOrder } from "./_lib/orders";
import { warehouseById, haversineKm, ALL_WAREHOUSES, hubLabel } from "./_lib/geo";
import { escapeHtml, fmtAud } from "./_lib/html";
import { orderStatusIndex } from "./_lib/trackStatus";
import type { Order } from "./_lib/types";

const PAGE_TITLE = "Track your order — VapeSpot";

// Au-delà de ~5 h (≈ 380-400 km) pas de coursier : libellé Australia Post.
const COURIER_MAX_KM = 400;
const EST_KMH = 60; // vitesse estimée coursier pour le libellé trajet

const TRACK_RATE_LIMIT = 5;        // lookups ratés autorisés
const TRACK_RATE_WINDOW = 15 * 60; // avant blocage temporaire (s)

// ── Charte graphique VapeSpot (relevée sur vapespot.store) ──
const BRAND = "#7C3AED";        // violet principal (marque)
const BRAND_DARK = "#5B3DF5";   // violet accent (boutons/liens)
const BRAND_SOFT = "#F0EEFF";   // lavande (badges, fonds)
const INK = "#0A0A0A";
const MUT = "#667085";
const BG = "#F6F4FB";           // fond lavande très clair
const LINE = "#E5E7EB";

function json(o: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}

/** Rendu de la frise de statut — étapes fixes du plan validé. */
function statusTimeline(o: Order): string {
  const idx = orderStatusIndex(o.status);           // 0..4, -1 si statut hors frise
  const steps = [
    "Order received",
    "Payment confirmed",
    "In our warehouse",
    "On the way",
    "Delivered",
  ];
  const cells = steps
    .map((s, i) => {
      let kind = "future";
      if (i < idx) kind = "done";
      if (i === idx) kind = "current";
      if (i === idx && o.status === "delivered") kind = "done";
      const mark = kind === "done" ? "✓" : kind === "current" ? "●" : "";
      return `<div class="tl-step ${kind}">` +
        `<div class="tl-dot">${mark}</div><div class="tl-label">${s}</div></div>`;
    })
    .join("");
  let note = "";
  if (idx === 0) note = `<p class="tl-note">Payment pending — your items are reserved for you.</p>`;
  if (o.status === "delivery_failed") note = `<p class="tl-note err">We couldn't deliver — a courier will retry shortly, or we'll be in touch.</p>`;
  if (o.status === "expired") note = `<p class="tl-note err">This order expired before payment. Contact us to re-open it.</p>`;
  if (o.status === "cancelled") note = `<p class="tl-note err">This order was cancelled. If you already paid, we're refunding you — contact us if you have any question.</p>`;
  return `<div class="timeline">${cells}</div>${note}`;
}

/** Estimation du trajet (km + durée) ou null si hors zone coursier.
 *  Utilise la ROUTE RÉELLE calculée au checkout (OSRM) : vrais km + durée de
 *  conduite réaliste. Repli acceptable sur haversine seulement si pas de route. */
function routeInfo(o: Order): { km: number; duration: string } | null {
  if (!o.lat || !o.lng) return null;
  const w = warehouseById(o.warehouseId);
  if (!w) return null;
  if (o.route && o.route.km > 0) {
    const km = o.route.km;
    if (km > COURIER_MAX_KM) return null;
    const mins = Math.round(o.route.durationSec / 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const dur = h > 0 ? `${h} h${m ? " " + m + " min" : ""}` : `${m || 1} min`;
    return { km: Math.round(km), duration: dur };
  }
  // Repli (anciens ordres sans route) : à vol d'oiseau × 1.3 ≈ distance route
  const km = haversineKm(o.lat, o.lng, w.lat, w.lng) * 1.3;
  if (km > COURIER_MAX_KM) return null;
  const mins = Math.round((km / EST_KMH) * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const dur = h > 0 ? `${h} h${m ? " " + m + " min" : ""}` : `${m || 1} min`;
  return { km: Math.round(km), duration: dur };
}

/** HTML de la carte — Leaflet 1.9.4 (cdnjs) + tuiles OSM gratuites, sans clé API. */
function mapHTML(o: Order): string {
  const w = warehouseById(o.warehouseId);
  const route = routeInfo(o);
  const okCoords = !!(o.lat && o.lng && w);
  const points = ALL_WAREHOUSES.filter((x) => x.active).map((x) => ({ lat: x.lat, lng: x.lng, label: hubLabel(x) }));
  const hub = w ? hubLabel(w) : "VapeSpot Hub";
  const data = {
    delivery: okCoords ? { lat: o.lat, lng: o.lng, label: "Your delivery address" } : null,
    hub: okCoords ? { lat: w!.lat, lng: w!.lng, label: hub } : null,
    points,
    hasRoute: !!route,
    routeLine: o.route && okCoords ? o.route.geometry : null, // [[lng,lat],…] vraies routes
  };

  let banner: string;
  if (route) {
    banner =
      `<div class="route-banner"><span class="route-line">${escapeHtml(hub)}</span>` +
      `<span class="route-arrow">→</span><span class="route-line">Your address</span>` +
      `<span class="route-meta">≈ ${route.km} km · ~${route.duration}</span></div>`;
  } else if (w) {
    banner =
      `<div class="route-banner"><span class="route-line">Closest hub: ${escapeHtml(hub)}</span>` +
      `<span class="route-meta">Standard delivery · 1–3 business days via Australia Post</span></div>`;
  } else {
    banner =
      `<div class="route-banner"><span class="route-meta">Standard delivery · 1–3 business days via Australia Post</span></div>`;
  }

  return (
    `<div class="map-card">${banner}` +
    `<div id="map"></div>` +
    `<div class="map-legend"><span class="lg"><span class="lg-dot"></span>VapeSpot Hub</span>` +
    `<span class="lg"><span class="lg-pin"></span>Your address</span>` +
    `<span class="lg"><span class="lg-hub"></span>All hubs</span></div>` +
    `<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>` +
    `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">` +
    `<script>window.__mapData=${JSON.stringify(data)};</script></div>`
  );
}

/** Header de marque + footer, communs à toute la page. */
function siteHeader(): string {
  return (
    `<header class="site-head"><div class="head-inner">` +
    `<a class="brand" href="https://vapespot.store/"><span class="brand-mark">V</span>` +
    `<span class="brand-name">Vape<span class="brand-accent">Spot</span></span></a>` +
    `<span class="head-tag">Order tracking</span>` +
    `<a class="head-cta" href="https://vapespot.store/"><span>Back to shop</span><span class="arr">→</span></a>` +
    `</div></header>`
  );
}

function siteFooter(): string {
  return (
    `<footer class="site-foot"><div class="foot-inner">` +
    `<p class="mut">Questions about an order? <a href="https://t.me/vapespot_store" rel="noopener">@vapespot_store</a> on Telegram or ` +
    `<a href="mailto:info@vapespot.store">info@vapespot.store</a></p>` +
    `<p class="mut small">VapeSpot — premium vapes &amp; disposables, delivered Australia-wide.</p>` +
    `</div></footer>`
  );
}

/**
 * Coquille complète (doctype + <title> + CSS + header + body + footer).
 * ⚠️ C'est CE wrapper qui était oublié dans les handlers → page blanche.
 */
function trackPage(body: string): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex">` +
    `<title>${PAGE_TITLE}</title>` +
    `<style>` +
    `:root{--brand:${BRAND};--brand-dark:${BRAND_DARK};--brand-soft:${BRAND_SOFT};--ink:${INK};--mut:${MUT};--bg:${BG};--line:${LINE}}` +
    `*{box-sizing:border-box}` +
    `body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}` +
    `a{color:var(--brand-dark);text-decoration:none}a:hover{text-decoration:underline}` +
    // ── Header ──
    `.site-head{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:50}` +
    `.head-inner{max-width:820px;margin:0 auto;padding:14px 18px;display:flex;align-items:center;gap:14px}` +
    `.brand{display:flex;align-items:center;gap:9px;text-decoration:none}` +
    `.brand-mark{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;font-weight:800;font-size:19px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(124,58,237,.35)}` +
    `.brand-name{font-size:19px;font-weight:800;letter-spacing:-.2px;color:var(--ink)}` +
    `.brand-accent{color:var(--brand)}` +
    `.head-tag{margin-left:4px;font-size:12px;font-weight:700;color:var(--brand-dark);background:var(--brand-soft);padding:4px 10px;border-radius:999px;border:1px solid #DDD6FF}` +
    `.head-cta{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--ink);text-decoration:none;padding:7px 12px;border:1px solid var(--line);border-radius:8px;background:#fff}` +
    `.head-cta:hover{border-color:var(--brand);color:var(--brand-dark);text-decoration:none}` +
    `.head-cta .arr{color:var(--brand);font-weight:800}` +
    // ── Layout ──
    `.wrap{max-width:820px;margin:0 auto;padding:26px 18px 10px}` +
    `.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(16,24,40,.05)}` +
    `.page-title{font-size:24px;font-weight:800;letter-spacing:-.3px;margin:0 0 4px}` +
    `.page-sub{color:var(--mut);font-size:14px;margin:0 0 18px}` +
    // ── Formulaire ──
    `.track-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px}` +
    `@media(max-width:700px){.track-grid{grid-template-columns:1fr}}` +
    `label{font-size:12px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;display:block}` +
    `input{width:100%;padding:12px 14px;border:1.5px solid var(--line);border-radius:10px;font-size:15px;background:#fff;color:var(--ink);transition:border-color .15s, box-shadow .15s}` +
    `input:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(124,58,237,.15)}` +
    `input::placeholder{color:#A0A8B8}` +
    `.btn{width:100%;margin-top:18px;padding:13px 16px;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;border:0;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,.35);transition:transform .1s, box-shadow .15s}` +
    `.btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(124,58,237,.45)}` +
    `.btn:active{transform:translateY(0)}` +
    `.err{color:#B42318;font-weight:700;font-size:14px;margin:12px 0 0;background:#FEF3F2;border:1px solid #FECDCA;border-radius:8px;padding:10px 12px}` +
    `.trust{margin-top:14px;display:flex;flex-direction:column;gap:7px}` +
    `.trust-row{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--mut)}` +
    `.trust-ic{width:22px;height:22px;border-radius:6px;background:var(--brand-soft);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--brand-dark);flex:none}` +
    // ── Aperçu carte (côté droit du formulaire) ──
    `.map-preview{background:linear-gradient(160deg,#FBF9FF,#F0EEFF 55%,#E6E0FF);border:1px solid #DDD6FF;border-radius:12px;padding:16px;display:flex;flex-direction:column;justify-content:center;gap:10px;min-height:100%}` +
    `.mp-title{font-size:13px;font-weight:800;color:var(--brand-dark)}` +
    `.mp-svg{width:100%;border-radius:8px;background:#fff;border:1px solid var(--line)}` +
    `.mp-note{font-size:12px;color:var(--mut);line-height:1.5}` +
    // ── Résultat : résumé + table + paiement ──
    `.sum-row{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}` +
    `.sum-id{font-size:19px;font-weight:800;letter-spacing:-.2px}` +
    `.sum-total{font-size:19px;font-weight:800;color:var(--brand-dark);background:var(--brand-soft);padding:3px 10px;border-radius:8px}` +
    `.sum-date{font-size:13px;color:var(--mut);margin-top:4px}` +
    `.deliver-to{margin:10px 0 0;font-size:14px;color:var(--ink)}` +
    `.deliver-to b{color:var(--brand-dark)}` +
    `table{width:100%;border-collapse:collapse;margin:14px 0 4px}` +
    `th,td{padding:10px 10px;border-bottom:1px solid #F1F2F6;font-size:14px;text-align:left}` +
    `tr:last-child td{border-bottom:0}` +
    `th{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--mut);background:#FAFAFC;border-radius:8px}` +
    `td:last-child,th:last-child{text-align:right;font-weight:600}` +
    `.pay-method{display:inline-flex;align-items:center;gap:8px;margin:10px 0 2px;font-size:13px;color:var(--mut);background:#FAFAFC;border:1px solid var(--line);padding:8px 12px;border-radius:999px}` +
    `.pay-method b{color:var(--ink)}` +
    `.pm-ic{width:20px;height:20px;border-radius:50%;background:#EAF6EE;color:#1F7A3D;display:flex;align-items:center;justify-content:center;font-size:11px}` +
    // ── Frise ──
    `.timeline{display:flex;margin:18px 0 4px}` +
    `.tl-step{flex:1;position:relative;text-align:center;padding:0 4px}` +
    `.tl-step:not(:last-child)::after{content:"";position:absolute;top:12px;left:calc(50% + 12px);right:calc(-50% + 12px);height:2px;background:var(--line)}` +
    `.tl-step.done:not(:last-child)::after,.tl-step.current:not(:last-child)::after{background:${BRAND}}` +
    `.tl-dot{width:24px;height:24px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;background:#D9DEE8;position:relative;z-index:1}` +
    `.tl-step.done .tl-dot{background:${BRAND}; }` +
    `.tl-step.current .tl-dot{background:${BRAND_DARK};box-shadow:0 0 0 5px rgba(124,58,237,.18);animation:pulse 2s infinite}` +
    `@keyframes pulse{0%,100%{box-shadow:0 0 0 5px rgba(124,58,237,.18)}50%{box-shadow:0 0 0 8px rgba(124,58,237,.10)}}` +
    `.tl-label{font-size:11.5px;font-weight:600;color:var(--mut);margin-top:8px;line-height:1.25}` +
    `.tl-step.done .tl-label,.tl-step.current .tl-label{color:var(--ink);font-weight:700}` +
    `.tl-note{margin:14px 0 0;font-size:13px;color:var(--mut);background:var(--brand-soft);border-radius:8px;padding:10px 12px}` +
    `.tl-note.err{background:#FEF3F2;color:#B42318;border:1px solid #FECDCA}` +
    `@media(max-width:520px){.tl-label{font-size:9.5px}.tl-dot{width:20px;height:20px;font-size:10px}.tl-step:not(:last-child)::after{top:10px}}` +
    // ── Carte ──
    `.map-card{margin-top:14px}` +
    `.route-banner{display:flex;align-items:center;flex-wrap:wrap;gap:8px;background:var(--brand-soft);border:1px solid #DDD6FF;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:13px}` +
    `.route-line{font-weight:700;color:var(--brand-dark)}` +
    `.route-arrow{color:${BRAND};font-weight:800}` +
    `.route-meta{color:var(--mut);font-size:12.5px;margin-left:auto;white-space:nowrap}` +
    `#map{height:360px;border-radius:12px;border:1px solid var(--line);background:#EAEEF4;z-index:0}` +
    `.map-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;font-size:12px;color:var(--mut)}` +
    `.lg{display:flex;align-items:center;gap:6px}` +
    `.lg-dot{width:10px;height:10px;border-radius:50%;background:${BRAND};display:inline-block}` +
    `.lg-pin{width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid #1F7A3D;display:inline-block}` +
    `.lg-hub{width:9px;height:9px;border-radius:50%;background:#A7B0C7;display:inline-block}` +
    // ── Footer ──
    `.site-foot{margin-top:22px;border-top:1px solid var(--line);background:#fff}` +
    `.foot-inner{max-width:820px;margin:0 auto;padding:16px 18px 26px;text-align:center}` +
    `.small{font-size:12px}` +
    `</style></head><body>` +
    siteHeader() +
    `<div class="wrap">${body}</div>` +
    siteFooter() +
    `</body></html>`
  );
}

/** Bloc formulaire (avec message générique si échec). */
function formHTML(prefill: { n?: string; e?: string }, genericError: boolean): string {
  const n = escapeHtml(prefill.n || "");
  const e = escapeHtml(prefill.e || "");
  const preview =
    `<div class="map-preview"><div class="mp-title">Live delivery map</div>` +
    `<svg class="mp-svg" viewBox="0 0 300 150" role="img" aria-label="Route preview"><rect width="300" height="150" fill="#fff"/>` +
    `<g stroke="#EDE7FF" stroke-width="1.5"><path d="M0 30H300M0 70H300M0 110H300M0 150H300"/>` +
    `<path d="M60 0V150M140 0V150M220 0V150M300 0V150M0 0H300"/></g>` +
    `<path d="M66 105 C90 95 120 60 150 45 S210 25 236 32" fill="none" stroke="#7C3AED" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round"/>` +
    `<g transform="translate(52,105)"><path d="M14 0 C5 9 0 16 0 21a14 14 0 0 0 28 0C28 16 23 9 14 0z" fill="#7C3AED"/><circle cx="14" cy="21" r="5" fill="#fff"/></g>` +
    `<g transform="translate(230,28)"><path d="M12 0 C4 7 0 13 0 17a12 12 0 0 0 24 0C24 13 20 7 12 0z" fill="#1F7A3D"/><circle cx="12" cy="17" r="4" fill="#fff"/></g>` +
    `<text x="300" y="146" text-anchor="end" font-family="inherit" font-size="9" fill="#A0A8B8">vapespot.store</text></svg>` +
    `<div class="mp-note">Track your parcel in real time — from our closest hub to your door, with live route and estimated time.</div></div>`;

  return (
    `<div class="card">` +
    `<h1 class="page-title">Track your order</h1>` +
    `<p class="page-sub">Enter your order number and the email you used at checkout to see live status.</p>` +
    `<div class="track-grid">` +
    `<form method="post" action="/track">` +
    `<label for="tf-n">Order number</label>` +
    `<input id="tf-n" name="n" value="${n}" placeholder="VS-0001" required autocomplete="off">` +
    `<label for="tf-e">Email used at checkout</label>` +
    `<input id="tf-e" name="e" type="email" value="${e}" placeholder="you@email.com" required autocomplete="email">` +
    (genericError ? `<p class="err">No order matches this order number and email address.</p>` : "") +
    `<button class="btn" type="submit">Track my order →</button>` +
    `</form>` +
    preview +
    `</div>` +
    `<div class="trust">` +
    `<div class="trust-row"><span class="trust-ic">🚚</span>Fast courier delivery to your address</div>` +
    `<div class="trust-row"><span class="trust-ic">🗺️</span>Live map with hub-to-door route</div>` +
    `<div class="trust-row"><span class="trust-ic">🔒</span>Your details stay private — shown only to you</div>` +
    `</div>` +
    `</div>`
  );
}

/** Page de résultat — commande complète + frise + CARTE du trajet. */
function resultHTML(o: Order): string {
  const date = new Date(o.createdAt).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const method = o.paymentMethod ? escapeHtml(o.paymentMethod.toUpperCase()) : "—";
  const rows = o.items
    .map(
      (it) =>
        `<tr><td>${escapeHtml(it.name)}</td><td>×${it.quantity}</td>` +
        `<td>${fmtAud(it.priceAud * it.quantity)}</td></tr>`
    )
    .join("");
  const mapHtml = mapHTML(o);
  return (
    `<div class="card">` +
    `<div class="sum-row"><div><div class="sum-id">${escapeHtml(o.id)}</div>` +
    `<div class="sum-date">Placed ${escapeHtml(date)}</div></div>` +
    `<div class="sum-total">${fmtAud(o.totalAud)}</div></div>` +
    `<p class="deliver-to">Deliver to: <b>${escapeHtml(o.deliveryAddress)}</b></p>` +
    `<table><thead><tr><th>Product</th><th>Qty</th><th>Total</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `<span class="pay-method"><span class="pm-ic">✓</span>Payment method: <b>${method}</b></span>` +
    `<hr style="border:none;border-top:1px solid #F1F2F6;margin:16px 0">` +
    `<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--mut)">Order status</div>` +
    statusTimeline(o) +
    `<hr style="border:none;border-top:1px solid #F1F2F6;margin:16px 0">` +
    `<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--mut)">Delivery</div>` +
    mapHtml +
    `</div>` +
    `<script>` +
    `try{if(window.__mapData){` +
    `const D=window.__mapData;` +
    `const map=L.map('map').setView([-26.5,134.5],4);` +
    `L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);` +
    `for(const p of D.points){L.circleMarker([p.lat,p.lng],{radius:3,color:'#a7b0c7',fillOpacity:0.5}).addTo(map);}` +
    `if(D.delivery&&D.hub){` +
    `const hub=L.marker([D.hub.lat,D.hub.lng]).addTo(map).bindPopup(D.hub.label);` +
    `const del=L.marker([D.delivery.lat,D.delivery.lng]).addTo(map).bindPopup(D.delivery.label);` +
    `if(D.hasRoute){` +
    `const line=D.routeLine&&D.routeLine.length>1?D.routeLine.map(c=>[c[1],c[0]]):[[D.hub.lat,D.hub.lng],[D.delivery.lat,D.delivery.lng]];` +
    `L.polyline(line,{color:'#5b3df5',weight:3,dashArray:'6 6'}).addTo(map);` +
    `}` +
    `map.fitBounds([[D.hub.lat,D.hub.lng],[D.delivery.lat,D.delivery.lng]],{padding:[30,30]});` +
    `}}}` +
    `catch(e){document.getElementById('map').innerHTML='<p class="mut" style="padding:16px;text-align:center">Map unavailable — try again later.</p>';}` +
    `</script>`
  );
}

// ─────────────────────────── GET ───────────────────────────
// GET /track : TOUJOURS le formulaire. Le lien de l'email ③ est générique
// (https://vapespot.store/track) — le client saisit n° + email lui-même.
export async function onRequestGet(_context: any): Promise<Response> {
  return htmlResponse(trackPage(formHTML({}, false)));
}

// ─────────────────────────── POST ───────────────────────────
export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;
  let body: any;
  try {
    body = await request.formData();
  } catch {
    return json({ ok: false, error: "invalid_form" }, 400);
  }
  const n = String(body.get("n") ?? "").trim().toUpperCase();
  const e = String(body.get("e") ?? "").trim().toLowerCase();
  if (!n || !e) return htmlResponse(trackPage(formHTML({}, true)));

  const [ok, order, blocked] = await lookupOrder(env, request, n, e);
  if (blocked) return htmlResponse(trackPage(formHTML({ n, e }, true)));
  if (ok && order) return htmlResponse(trackPage(resultHTML(order)));
  return htmlResponse(trackPage(formHTML({ n, e }, true)));
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
  });
}

/**
 * Lookup anti-enum : le couple (n°, email) doit correspondre à la même commande.
 *   → succès : renvoie la commande (rate limit reset).
 *   → échec : incrémente le compteur IP ; si > 5 / 15 min → blocked (429 soft :
 *     on renvoie le MÊME message générique, jamais de distinction).
 */
async function lookupOrder(
  env: any,
  request: any,
  orderId: string,
  email: string
): Promise<[boolean, Order | null, boolean]> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const key = "track:" + ip;

  const order = await getOrder(env, orderId);
  const matched = !!order && order.email.toLowerCase() === email;

  const counterRaw = await env.VAPESPOT_ORDERS.get(key);
  const failed = Number(counterRaw ?? 0);

  if (matched) {
    // Succès → reset du compteur d'échecs de cette IP.
    await env.VAPESPOT_ORDERS.delete(key);
    return [true, order, false];
  }

  const next = failed + 1;
  const blocked = next > TRACK_RATE_LIMIT;
  await env.VAPESPOT_ORDERS.put(key, String(next), { expirationTtl: TRACK_RATE_WINDOW });
  return [false, null, blocked];
}