// Brevo (ex-Sendinblue) — envoi d'emails transactionnels depuis info@vapespot.store.
// Domaine vapespot.store vérifié (SPF/DKIM/DMARC OK 20/11). Plan gratuit : 300/j.
// Ne jamais coller l'API key dans le chat — elle vit dans les secrets Cloudflare.
export interface SendMailInput {
  to: string;               // adresse du client
  subject: string;
  html: string;             // corps HTML complet (template inline)
  tag?: string;             // ex. "vapespot-order-confirmed"
}

export async function sendEmail(env: any, input: SendMailInput): Promise<{ ok: boolean; status: number; messageId?: string; error?: string }> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "VapeSpot", email: "info@vapespot.store" },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      tags: input.tag ? [input.tag] : undefined,
    }),
  });
  const body = (await res.json()) as { messageId?: string; code?: string; message?: string };
  return {
    ok: res.status === 200 || res.status === 201,
    status: res.status,
    messageId: body.messageId,
    ...(body.message ? { error: body.message } : {}),
  };
}