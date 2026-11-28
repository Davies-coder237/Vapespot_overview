// ÉTAPE 3 du chat maison — endpoint du webhook Telegram (admin → client).
// URL : https://vapespot.store/telegram-webhook (setWebhook posé à l'ÉTAPE 6).
//
// Flot : le ChatRoom (Workers) relaye chaque message client au bot du shop avec un
// bouton « ↩️ Reply » (reply_markup) dont le callback_data = clientId de la conversation.
//   - l'admin appuie sur le bouton → Telegram envoie un `callback_query` ici :
//       on mémorise la CIBLE (clientId) pour ce chat admin dans KV (chat-pending:<chatId>).
//   - l'admin tape sa réponse → Telegram envoie un `message` ici :
//       on lit la cible mémorisée → on route le texte vers le bon ChatRoom (DO),
//       qui le pousse dans la WebSocket du client. On efface la cible.
// L'admin ne tape donc JAMAIS le numéro : juste bouton puis réponse.
//
// Sécurité : n'accepte que les updates signés par Telegram (header
// X-Telegram-Bot-Api-Secret-Token, posé au setWebhook — ÉTAPE 6). Actif seulement
// quand la var env TELEGRAM_WEBHOOK_SECRET existe (sinon assertion ignorée/dev).

const SECRET_HEADER = "x-telegram-bot-api-secret-token";
const PENDING_TTL = 15 * 60; // fenêtre de réponse admin (s)

function ok(): Response {
  return new Response("ok", { status: 200 });
}

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  // ── sécurité : signature Telegram ──
  const secret = env.TELEGRAM_WEBHOOK_SECRET as string | undefined;
  if (secret && request.headers.get(SECRET_HEADER) !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  let update: any;
  try {
    update = await request.json();
  } catch {
    return new Response("bad_json", { status: 400 });
  }
  if (!update) return ok();

  // ── 1) clic sur « ↩️ Reply » : on retient la conversation cible ──
  const cq = update.callback_query;
  if (cq) {
    const clientId = String(cq.data ?? "").trim();
    const chatId = cq.message?.chat?.id;
    if (clientId && chatId != null) {
      await env.VAPESPOT_ORDERS.put(
        `chat-pending:${chatId}`,
        clientId,
        { expirationTtl: PENDING_TTL }
      );
    }
    // ferme le spinner du bouton + rappelle le geste
    await callBot(env, "answerCallbackQuery", {
      callback_query_id: cq.id,
      text: "Tapez votre réponse — elle part immédiatement au client.",
    }).catch(() => {});
    return ok();
  }

  // ── 2) message de l'admin dans le chat du shop (texte et/ou photo) ──
  const msg = update.message;
  if (!msg) return ok();
  const chatId = msg.chat?.id;
  // on ne traite que les messages du chat admin du shop (pas les autres chats)
  if (chatId == null || String(chatId) !== String(env.TELEGRAM_CHAT_ID)) return ok();

  const pendingKey = `chat-pending:${chatId}`;
  const clientId = await env.VAPESPOT_ORDERS.get(pendingKey);
  if (!clientId) return ok(); // réponse sans bouton cible → ignorée

  await env.VAPESPOT_ORDERS.delete(pendingKey);

  let text = "";
  if (typeof msg.text === "string" && msg.text.length > 0) {
    text = msg.text;
  } else if (typeof msg.caption === "string" && msg.caption.length > 0) {
    text = msg.caption;
  }
  const photoSizes = Array.isArray(msg.photo) ? msg.photo : [];
  const photo = photoSizes[photoSizes.length - 1]; // la plus grande résolution
  if (!text && !photo) return ok();

  try {
    // MÊME clé que l'endpoint /chat/[id] ("chat:" + clientId) — sans quoi le push
    // part dans une instance DO distincte et vide, jamais la conversation client.
    const id = env.CHAT_ROOM.idFromName("chat:" + clientId);
    const stub = env.CHAT_ROOM.get(id);
    if (photo) {
      // ÉTAPE 5 : télécharge la photo Telegram → KV → pousse {image} au client.
      const key = await storeAdminPhoto(env, photo.file_id);
      if (key) {
        await stub.fetch("https://x/push", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image: "/chatimg/" + key, text: text || undefined }),
        });
      }
    } else {
      await stub.fetch("https://x/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
    }
  } catch (e) {
    // la conversation a pu être effacée/supprimée → réponse perdue, sans suite
    console.error("[telegram-webhook] push vers DO échoué", String(e));
  }
  return ok();
}

/**
 * ÉTAPE 5 — télécharge une photo Telegram (getFile → file endpoint), la stocke
 * dans KV CHAT_IMAGES et renvoie la clé (sinon null). Le DO pousse ensuite
 * {image:"/chatimg/<clé>"} au client.
 */
async function storeAdminPhoto(env: any, fileId: string): Promise<string | null> {
  const token = env.TELEGRAM_BOT_TOKEN as string;
  try {
    const g = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    const gj = (await g.json()) as { result?: { file_path?: string } };
    const path = gj?.result?.file_path;
    if (!path) return null;
    const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${path}`);
    if (!fileRes.ok) return null;
    const bytes = await fileRes.arrayBuffer();
    const key = "i_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    await (env.CHAT_IMAGES as any).put(key, bytes, { expirationTtl: 7 * 24 * 3600 });
    return key;
  } catch {
    return null;
  }
}

/** Appel api.telegram.org/bot<token>/<method> — read-only helper (parse_mode HTML). */
async function callBot(env: any, method: string, body: Record<string, unknown>): Promise<Response> {
  const token = env.TELEGRAM_BOT_TOKEN as string;
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}