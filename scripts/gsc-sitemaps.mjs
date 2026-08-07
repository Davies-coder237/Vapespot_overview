import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CRED = JSON.parse(readFileSync(join(ROOT, "gsc-client.json"), "utf8")).installed;
const TOKEN_F = join(ROOT, "gsc-token.json");
let token = JSON.parse(readFileSync(TOKEN_F, "utf8"));
async function ensureAccessToken() {
  if (token.access_token && Date.now() - token.created_at < 55 * 60 * 1000) return token.access_token;
  const resp = await fetch(CRED.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: token.refresh_token, client_id: CRED.client_id, client_secret: CRED.client_secret, grant_type: "refresh_token" }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error("Refresh KO " + JSON.stringify(data));
  token = { ...token, ...data, created_at: Date.now() };
  writeFileSync(TOKEN_F, JSON.stringify(token, null, 2));
  return data.access_token;
}
const access = await ensureAccessToken();

// 1) Résoudre la vraie forme de la propriété
const sites = await fetch("https://www.googleapis.com/webmasters/v3/sites", { headers: { Authorization: "Bearer " + access } });
const siteEntry = (await sites.json()).siteEntry || [];
const site = (siteEntry.find((s) => s.siteUrl.includes("vapespot")) || siteEntry[0]).siteUrl;
console.log("Propriété utilisée :", site);

// 2) Sitemaps + contenu (submitted / indexed)
const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps`, { headers: { Authorization: "Bearer " + access } });
const txt = await r.text();
console.log("HTTP", r.status);
if (!r.ok) { console.log(txt); process.exit(0); }
const d = JSON.parse(txt);
if (!d.sitemap || d.sitemap.length === 0) {
  console.log("Aucun sitemap déclaré dans cette propriété. (Cherche la list index peut-être.)");
  // La sitemap peut être sous /sitemap.xml ; liste globale vide → essayer la sitemap "/"
  const r2 = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps/sitemap.xml`, { headers: { Authorization: "Bearer " + access } });
  const t2 = await r2.text();
  console.log("GET /sitemap.xml HTTP", r2.status, t2.slice(0, 1200));
  process.exit(0);
}
for (const s of d.sitemap) {
  console.log(`\n- ${s.path}  (isPending=${s.isPending} errors=${s.errors})`);
  for (const c of s.contents || []) {
    console.log(`    ${c.type.toUpperCase()}: submitted=${c.submitted}  indexed=${c.indexed}`);
  }
}