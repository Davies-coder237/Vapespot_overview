/**
 * gsc-queries-all.mjs — TOUTES les requêtes (rowLimit 500, tri par clics)
 * Pour répondre à : quels clics viennent SANS la fiche Maps ?
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CRED = JSON.parse(readFileSync(join(ROOT, "gsc-client.json"), "utf8")).installed;
const TOKEN_F = join(ROOT, "gsc-token.json");
let token = JSON.parse(readFileSync(TOKEN_F, "utf8"));

async function ensureAccessToken() {
  if (token.access_token && Date.now() - token.created_at < 55 * 60 * 1000) {
    return token.access_token;
  }
  const resp = await fetch(CRED.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: token.refresh_token,
      client_id: CRED.client_id,
      client_secret: CRED.client_secret,
      grant_type: "refresh_token",
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error("Refresh token KO: " + JSON.stringify(data));
  token = { ...token, ...data, created_at: Date.now() };
  writeFileSync(TOKEN_F, JSON.stringify(token, null, 2));
  return data.access_token;
}

function iso(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function gscJson(path, access, method = "GET", body) {
  const resp = await fetch("https://www.googleapis.com" + path, {
    method,
    headers: {
      Authorization: "Bearer " + access,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  try {
    return { ok: resp.ok, status: resp.status, data: JSON.parse(text) };
  } catch {
    return { ok: resp.ok, status: resp.status, data: text };
  }
}

async function main() {
  const access = await ensureAccessToken();
  const sites = await gscJson("/webmasters/v3/sites", access);
  const site = sites.data.siteEntry.find((s) => s.siteUrl.includes("vapespot")).siteUrl;

  console.log("=== TOUTES LES REQUÊTES (90j, tri clics) ===");
  const sq = await gscJson(`/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, access, "POST", {
    startDate: iso(90),
    endDate: iso(0),
    dimensions: ["query"],
    rowLimit: 500,
    type: "web",
  });
  if (!sq.ok) { console.error("KO:", JSON.stringify(sq.data)); return; }
  const rows = sq.data.rows || [];
  const withClicks = rows.filter((r) => r.clicks > 0);
  console.log(`Total requêtes distinctes : ${rows.length}`);
  console.log(`Requêtes avec ≥1 clic : ${withClicks.length}`);
  let totalClicks = 0, totalImp = 0;
  withClicks.forEach((r) => {
    totalClicks += r.clicks;
    totalImp += r.impressions;
    console.log(
      `   ${String(r.clicks).padStart(2)} clic(s)  ${String(r.impressions).padStart(4)} imp  pos ${(r.position||0).toFixed(1).padStart(5)}  "${r.keys[0]}"`
    );
  });
  console.log(`\nTOTAL clics (requêtes listées) : ${totalClicks}`);
  console.log(`TOTAL impressions (requêtes listées) : ${totalImp}`);
}

main().catch((e) => { console.error("ERREUR:", e.message); process.exit(1); });
