// Auth admin — cookie HMAC signé avec COOKIE_SECRET.
// Cookie : vsp_admin = <payload>.<sig>  (sig = HMAC-SHA256(COOKIE_SECRET, payload)).
// Protection CSRF : token = HMAC(COOKIE_SECRET, "csrf:" + cookie) comparé en temps constant.
// Rate-limit login : 5 essais / 15 min / IP (clé KV admin-login:<ip>).
import { escapeHtml } from "./html";

const COOKIE_NAME = "vsp_admin";
const TTL_SECONDS = 7 * 24 * 3600; // cookie max-age 7 jours

function b64url(b: Uint8Array): string {
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(s: string): Uint8Array {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}
async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}
/** Comparaison temps constant (pas de early-exit). */
function ctEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signCookie(secret: string): Promise<string> {
  const payload = "v1:" + Math.floor(Date.now() / 1000);
  const sig = b64url(await hmac(secret, payload));
  return `${payload}.${sig}`;
}
export async function verifyCookie(secret: string, value: string): Promise<boolean> {
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const re = b64url(await hmac(secret, payload));
  return ctEqual(sig, re);
}
/** Token anti-CSRF lié au cookie : le serveur le recalcule à chaque POST. */
export async function csrfToken(secret: string, cookieValue: string): Promise<string> {
  return b64url(await hmac(secret, "csrf:" + cookieValue));
}
export async function csrfValid(secret: string, cookieValue: string, token: string): Promise<boolean> {
  const expected = await csrfToken(secret, cookieValue);
  return ctEqual(token, expected);
}

export function readCookie(request: Request): string | null {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === COOKIE_NAME) return part.slice(i + 1).trim();
  }
  return null;
}
export const adminCookieSet = `vsp_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
export function adminCookieHeader(value: string): string {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_SECONDS}`;
}

/** Rate-limit des tentatives de login (5 / 15 min / IP). */
export async function loginAllowed(env: any, ip: string): Promise<boolean> {
  const key = "admin-login:" + ip;
  const n = Number((await env.VAPESPOT_ORDERS.get(key)) ?? 0);
  return n < 5;
}
export async function loginBump(env: any, ip: string): Promise<void> {
  const key = "admin-login:" + ip;
  const n = Number((await env.VAPESPOT_ORDERS.get(key)) ?? 0) + 1;
  await env.VAPESPOT_ORDERS.put(key, String(n), { expirationTtl: 15 * 60 });
}
export async function loginReset(env: any, ip: string): Promise<void> {
  await env.VAPESPOT_ORDERS.delete("admin-login:" + ip);
}

/** Petite page d'erreur (HTML propre) pour l'admin. */
export function adminError(title: string, msg: string): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeHtml(title)}</title><style>` +
    `body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f1420;color:#e6e9f2;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}` +
    `.box{background:#1b2334;border:1px solid #2c3852;border-radius:12px;padding:28px 34px;max-width:460px;width:90%;text-align:center}` +
    `.box h1{font-size:18px;margin:0 0 8px;color:#fff} .box p{color:#9aa8c4;font-size:14px;margin:0}` +
    `a{color:#7c9cff;text-decoration:none} a:hover{text-decoration:underline}</style></head><body>` +
    `<div class="box"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(msg)}</p></div></body></html>`
  );
}