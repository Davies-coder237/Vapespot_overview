// ÉTAPE 5 — sert les images du chat maison depuis KV CHAT_IMAGES.
// URL : /chatimg/<clé> (relative, chargée par le widget via <img>).
// Clé opaque aléatoire → pas d'énumération possible. TTL 7 j côté KV.
const KEY_RE = /^i_[A-Za-z0-9]{12,40}$/;

function guessContentType(buf: ArrayBuffer): string {
  const u = new Uint8Array(buf, 0, Math.min(buf.byteLength, 16));
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return "image/jpeg";
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return "image/png";
  if (u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46) return "image/gif";
  if (
    u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 &&
    u[8] === 0x57 && u[9] === 0x45 && u[10] === 0x42 && u[11] === 0x50
  ) return "image/webp";
  if (u[0] === 0x42 && u[1] === 0x4d) return "image/bmp";
  return "application/octet-stream";
}

export async function onRequest(context: any): Promise<Response> {
  const key: string = String(context.params?.key ?? "");
  if (!KEY_RE.test(key)) return new Response("nf", { status: 404 });
  const data = await (context.env.CHAT_IMAGES as any).get(key, "arrayBuffer");
  if (!data) return new Response("nf", { status: 404 });
  const type = guessContentType(data as ArrayBuffer);
  return new Response(data as BodyInit, {
    headers: {
      "content-type": type,
      "cache-control": "private, max-age=86400",
    },
  });
}