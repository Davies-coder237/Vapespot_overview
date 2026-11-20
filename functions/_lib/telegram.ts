// Telegram — notifications INTERNES au shop uniquement (@vapespot_orders_bot).
// Le bot ne remplace AUCUN contact humain : les clients utilisent l'email en
// réponse + @vapespot_store. Ici on envoie vers le chat interne du shop.
// chat_id (secret de la boutique) : posé en secret Cloudflare TELEGRAM_CHAT_ID.
export async function sendTelegram(env: any, text: string): Promise<{ ok: boolean; status: number }> {
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
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_notification: false }),
  });
  if (res.status !== 200) {
    const body = await res.text().catch(() => "");
    console.error(`[telegram] sendMessage KO status=${res.status} réponse=${body.slice(0, 200)}`);
  }
  return { ok: res.status === 200, status: res.status };
}