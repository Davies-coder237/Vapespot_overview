// Telegram — notifications INTERNES au shop uniquement (@vapespot_orders_bot).
// Le bot ne remplace AUCUN contact humain : les clients utilisent l'email en
// réponse + @vapespot_store. Ici on envoie vers le chat interne du shop.
// chat_id (secret de la boutique) : posé en secret Cloudflare TELEGRAM_CHAT_ID.
// `parseMode` (ex. "HTML") : rendu RICHE du message côté Telegram (gras, code,
// liens). Utilisé pour les messages client retransmis (②③④⑤⑥) — le texte brut
// reste utilisé pour les pings internes du shop. Le contenu riche doit déjà
// être échappé pour le parseur HTML de Telegram (escapeHtml côté appelant).
export async function sendTelegram(env: any, text: string, parseMode?: string, markup?: unknown): Promise<{ ok: boolean; status: number }> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token) {
    console.error("[telegram] TELEGRAM_BOT_TOKEN manquant — notif shop non envoyée");
    return { ok: false, status: 0 };
  }
  if (!chatId) {
    console.error("[telegram] TELEGRAM_CHAT_ID manquant — notif shop non envoyée");
    return { ok: false, status: 0 };
  }
  const payload: Record<string, unknown> = { chat_id: chatId, text, disable_notification: false };
  if (parseMode) payload.parse_mode = parseMode;
  if (markup) payload.reply_markup = JSON.stringify(markup);
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status !== 200) {
    const body = await res.text().catch(() => "");
    console.error(`[telegram] sendMessage KO status=${res.status} réponse=${body.slice(0, 200)}`);
  }
  return { ok: res.status === 200, status: res.status };
}

// Bouton inline « ↩️ Reply » posé sur les notifications de commande → l'admin
// répond depuis Telegram et ça revient dans le CHAT du client (même DO que le 💬).
// Le callback_data = clientId (clé du ChatRoom). null si pas de chat rattachable.
export function replyButtonMarkup(clientId: unknown): unknown | null {
  if (!clientId || typeof clientId !== "string" || clientId.length < 6) return null;
  return { inline_keyboard: [[{ text: "↩️ Reply", callback_data: clientId }]] };
}

// Libellé admin humain d'une commande : « Visitor 3568 · VS-0001 · email » —
// la mention Visitor (quand le client a commencé à écrire avant) montre à
// l'admin que c'est la MÊME personne depuis le début.
export function orderLabel(order: {
  id: string;
  email: string;
  visitorLabel?: string | null;
}): string {
  const visitor = order.visitorLabel && order.visitorLabel.length > 0
    ? `${order.visitorLabel} · `
    : "";
  return `${visitor}${order.id} · ${order.email}`;
}