// Étape 3 — page publique /track : suivi de commande (noindex).
// Flux validé 20/11, CLARIFIÉ 21/11 (retours utilisatrice) :
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
      return `<div class="step ${kind}"><span class="dot"></span><span>${s}</span></div>`;
    })
    .join("");
  let note = "";
  if (idx === 0) note = `<p class="mut">Payment pending — your items are reserved for you.</p>`;
  if (o.status === "delivery_failed") note = `<p class="err">We couldn't deliver — a courier will retry shortly, or we'll be in touch.</p>`;
  if (o.status === "expired") note = `<p class="err">This order expired before payment. Contact us to re-open it.</p>`;
  return `<div class="timeline">${cells}</div>${note}`;
}

/** Estimation du trajet (km + durée) ou null si hors zone coursier. */
function routeInfo(o: Order): { km: number; duration: string } | null {
  if (!o.lat || !o.lng) return null;
  const w = warehouseById(o.warehouseId);
  if (!w) return null;
  const km = haversineKm(o.lat, o.lng, w.lat, w.lng);
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
  };

  let banner: string;
  if (route) {
    banner =
      `<div class="route-info"><b>${escapeHtml(hub)}</b> → your address</div>` +
      `<div class="route-info mut">≈ ${route.km} km · ~${route.duration} by courier</div>`;
  } else if (w) {
    banner =
      `<div class="route-info">Closest hub: ${escapeHtml(hub)}</div>` +
      `<div class="route-info mut">Standard delivery: 1–3 business days via Australia Post</div>`;
  } else {
    banner = `<div class="route-info mut">Standard delivery: 1–3 business days via Australia Post</div>`;
  }

  return (
    `<div class="map-wrap">${banner}` +
    `<div id="map"></div>` +
    `<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>` +
    `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">` +
    `<script>window.__mapData=${JSON.stringify(data)};</script></div>`
  );
}

/** Rendu complet de la page de suivi (formulaire vide / message générique / résultat). */
function trackPage(
  body: string,
  prefill: { n?: string; e?: string },
  genericError = false
): string {
  const n = escapeHtml(prefill.n || "");
  const e = escapeHtml(prefill.e || "");
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex">` +
    `<title>${PAGE_TITLE}</title>` +
    `<style>` +
    `body{margin:0;background:#f4f6fa;color:#222;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}` +
    `.wrap{max-width:680px;margin:0 auto;padding:28px 18px}` +
    `.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:22px 24px;margin-bottom:18px}` +
    `h1{font-size:22px;margin:0 0 6px}.sub{color:#667085;font-size:14px;margin:0}` +
    `label{font-size:13px;color:#555;margin:10px 0 2px;display:block}` +
    `input{width:100%;padding:10px 12px;border:1px solid #cfd6e4;border-radius:8px;font-size:15px}` +
    `button{width:100%;margin-top:14px;padding:12px;background:#5b3df5;color:#fff;border:0;border-radius:8px;font-size:15px;cursor:pointer}` +
    `table{width:100%;border-collapse:collapse;margin:12px 0}` +
    `th,td{padding:8px 10px;border-bottom:1px solid #eee;font-size:14px;text-align:left}` +
    `th:nth-child(2),th:nth-child(3),td:nth-child(2),td:nth-child(3){text-align:right}` +
    `.err{color:#b42318;font-weight:700}.mut{color:#667085;font-size:14px}` +
    `.timeline{display:flex;flex-direction:column;gap:0;margin:14px 0}` +
    `.step{display:flex;align-items:center;gap:10px;padding:7px 0;font-size:14px;border-bottom:1px dashed #eee}` +
    `.dot{width:12px;height:12px;border-radius:50%;background:#cfd6e4}` +
    `.step.done .dot{background:#2e7d32}.step.current .dot{background:#5b3df5;box-shadow:0 0 0 4px #e4e0fb}` +
    `.step.current{color:#2d1f8f;font-weight:700}` +
    `.map-wrap{margin-top:16px}.route-info{font-size:14px;margin:6px 0}` +
    `#map{height:340px;border-radius:10px;border:1px solid #e5e7eb;background:#eaf0ee}` +
    `a{color:#5b3df5;text-decoration:underline}` +
    `</style></head><body><div class="wrap">` +
    `<div class="card"><h1>Track your order</h1><p class="sub">VapeSpot — live delivery status</p></div>` +
    body +
    `<p class="mut" style="text-align:center;margin-top:24px">Questions? Message <a href="https://t.me/vapespot_store">@vapespot_store</a> or <a href="mailto:info@vapespot.store">info@vapespot.store</a>.</p>` +
    `</div></body></html>`
  );
}

/** Bloc formulaire (avec message générique si échec). */
function formHTML(prefill: { n?: string; e?: string }, genericError: boolean): string {
  return (
    `<div class="card">` +
    `<form method="post" action="/track">` +
    `<label>Order number</label>` +
    `<input name="n" value="${escapeHtml(prefill.n || "")}" placeholder="VS-0001" required>` +
    `<label>Email used at checkout</label>` +
    `<input name="e" type="email" value="${escapeHtml(prefill.e || "")}" placeholder="you@email.com" required>` +
    (genericError ? `<p class="err" style="margin-top:12px">No order matches this order number and email address.</p>` : "") +
    `<button type="submit">Track my order</button>` +
    `</form></div>`
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
    `<div style="display:flex;justify-content:space-between;align-items:center">` +
    `<div><b style="font-size:18px">${escapeHtml(o.id)}</b> · ${fmtAud(o.totalAud)}</div>` +
    `<div class="mut" style="text-align:right">${escapeHtml(date)}</div></div>` +
    `<p class="mut" style="margin:8px 0">Deliver to: ${escapeHtml(o.deliveryAddress)}</p>` +
    `<table><thead><tr><th>Product</th><th>Qty</th><th>Total</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `<p class="mut" style="margin:10px 0 0">Payment method: <b>${method}</b></p>` +
    statusTimeline(o) +
    `<hr style="border:none;border-top:1px solid #eee;margin:16px 0">` +
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
    `L.polyline([[D.hub.lat,D.hub.lng],[D.delivery.lat,D.delivery.lng]],{color:'#5b3df5',weight:3,dashArray:'6 6'}).addTo(map);` +
    `map.fitBounds([[D.hub.lat,D.hub.lng],[D.delivery.lat,D.delivery.lng]],{padding:[30,30]});` +
    `}else{map.fitBounds([[D.hub.lat,D.hub.lng],[D.delivery.lat,D.delivery.lng]],{padding:[30,30]});}` +
    `}}}` +
    `catch(e){document.getElementById('map').innerHTML='<p class="mut">Map unavailable — try again later.</p>';}` +
    `</script>`
  );
}

// ─────────────────────────── GET ───────────────────────────
// GET /track : TOUJOURS le formulaire. Le lien de l'email ③ est générique
// (https://vapespot.store/track) — le client saisit n° + email lui-même.
export async function onRequestGet(_context: any): Promise<Response> {
  return htmlResponse(formHTML({}, false));
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
  if (!n || !e) return htmlResponse(formHTML({}, true));

  const [ok, order, blocked] = await lookupOrder(env, request, n, e);
  if (blocked) return htmlResponse(formHTML({ n, e }, true));
  if (ok && order) return htmlResponse(resultHTML(order));
  return htmlResponse(formHTML({ n, e }, true));
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