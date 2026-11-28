// ÉTAPE 2 du chat maison (Option A) — endpoint WebSocket public.
// URL : wss://vapespot.store/chat/<clientId>[?o=<VS-XXXX>&e=<email>]
//
// 🎯 DESIGN (conséquence des décisions 27/11 « un seul chat par client » + « Cas A ») :
//   L'ID de chat dans l'URL N'EST PAS le n° de commande VS-XXXX. Un client qui écrit
//   AVANT commande n'a pas encore de n° → le chat « conseil » doit vivre avant le checkout.
//   On utilise donc un **ID de session opaque** (`clientId`) généré par le navigateur et
//   stable en localStorage : LA MÊME conversation sert du conseil → à la commande, puis
//   on l'épingclage sur email + VS-XXXX (le DO la « réclame », l'admin voit VS-XXXX · email).
//   Sécurité = même règle que /track (anti-enum) : si un chat est lié à une commande,
//   il ne s'ouvre QUE si (n° + email) correspondent à la MÊME commande.
//
// Rôles :
//   1. Sécurité      — valider clientId + (n°+email si présent), anti-enum, rate-limit IP.
//   2. Upgrade       — HTTP → WebSocket (101) : forwarde la requête BRUTE au ChatRoom,
//                      qui crée son propre WebSocketPair + acceptWebSocket + rend 101.
import { getOrder } from "../_lib/orders";

// ID de session : opaque, borne (évite path-traversal / abus). Généré par le widget.
const ID_RE = /^[A-Za-z0-9_-]{6,128}$/;

const RATE_LIMIT = 5;        // échecs autorisés par IP
const RATE_WINDOW = 15 * 60; // avant blocage temporaire (s)

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestGet(context: any): Promise<Response> {
  const { request, env } = context;
  const clientId: string = String(context.params?.id ?? "");

  if (!ID_RE.test(clientId)) {
    return json({ ok: false, error: "invalid_chat" }, 400);
  }

  const url = new URL(request.url);
  const orderNo = url.searchParams.get("o")?.trim().toUpperCase() ?? "";
  const email = url.searchParams.get("e")?.trim().toLowerCase() ?? "";

  // ── 1. Sécurité : un chat lié à une commande ne s'ouvre que n°+email correspondent ──
  if (orderNo) {
    const [allowed, blocked] = await authorizeOrder(env, request, orderNo, email);
    if (blocked) return json({ ok: false, error: "not_authorized" }, 429);
    if (!allowed) return json({ ok: false, error: "not_authorized" }, 403);
    // message strictement identique quel que soit le cas → anti-enumération
  }

  // ── 2+3. Upgrade + branchement sur le ChatRoom (Worker dédié vapespot-orders-do) ──
  // Le Worker/DO crée LUI-MÊME le WebSocketPair (pattern hibernation officiel) :
  // on lui forwarde la requête d'upgrade BRUTE, il accepte la socket, rend le 101.
  // (Le vieux pattern `stub.fetch(req, { webSocket: server })` ne livre PAS la
  // socket au DO dans ce runtime → les messages clients étaient perdus en silence.)
  const doId = env.CHAT_ROOM.idFromName("chat:" + clientId);
  const stub = env.CHAT_ROOM.get(doId);

  // Passe les infos validées au DO (épingclage meta ; le DO fait confiance à l'endpoint).
  // ref (clientId) TOUJOURS → clé du DO, sert de callback_data au bouton ↩️ Reply (étape 3).
  // username (optionnel, ?u=) = libellé convivial "Visitor 8327" choisi par le widget.
  const innerUrl = new URL(url.toString());
  innerUrl.searchParams.set("ref", clientId);
  const username = url.searchParams.get("u")?.trim() ?? "";
  if (username) innerUrl.searchParams.set("username", username);
  if (orderNo) {
    innerUrl.searchParams.set("email", email);
    innerUrl.searchParams.set("order", orderNo);
    innerUrl.searchParams.delete("o");
    innerUrl.searchParams.delete("e");
  }

  // Forwarde la requête d'upgrade (headers Upgrade: websocket inclus) → 101 du DO.
  const innerReq = new Request(innerUrl.toString(), { headers: request.headers });
  return stub.fetch(innerReq);
}

/**
 * Vérifie que (n° commande + email) correspondent à la MÊME commande (anti-enum,
 * règle /track). Compteur d'échecs par IP dans KV pour limiter les tentatives.
 * Ne JAMAIS différencier la cause (n° inconnu / email faux) côté réponse.
 */
async function authorizeOrder(
  env: any,
  request: Request,
  orderNo: string,
  email: string
): Promise<[boolean, boolean]> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const key = "chat-fail:" + ip;

  const order = await getOrder(env, orderNo);
  const matched = !!order && order.email.toLowerCase() === email;

  if (matched) {
    // succès → reset du compteur d'échecs de cette IP
    await env.VAPESPOT_ORDERS.delete(key);
    return [true, false];
  }

  const failedNow = Number((await env.VAPESPOT_ORDERS.get(key)) ?? 0) + 1;
  const blocked = failedNow > RATE_LIMIT;
  await env.VAPESPOT_ORDERS.put(key, String(failedNow), { expirationTtl: RATE_WINDOW });
  return [false, blocked];
}