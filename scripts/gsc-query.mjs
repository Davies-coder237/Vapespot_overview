/**
 * gsc-query.mjs — interroge Search Console via l'API (token gsc-token.json)
 *
 * 1. Rafraîchit le access_token si nécessaire (refresh_token)
 * 2. Liste les propriétés accessibles
 * 3. Search Analytics : pages avec impressions/clics sur 90 jours
 * 4. URL Inspection sur quelques pages ville (état d'indexation Google)
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
  console.log("=== 1) PROPRIÉTÉS ACCESSIBLES ===");
  const sites = await gscJson("/webmasters/v3/sites", access);
  if (!sites.ok) { console.error("Liste sites KO:", JSON.stringify(sites.data)); return; }
  const entries = (sites.data.siteEntry || []).filter((s) =>
    s.siteUrl.includes("vapespot")
  );
  if (entries.length === 0) {
    console.log("Aucune propriété vapespot trouvée. Toutes :");
    (sites.data.siteEntry || []).forEach((s) => console.log(" - " + s.siteUrl));
    return;
  }
  for (const s of entries) console.log(" - " + s.siteUrl + "  [" + s.permissionLevel + "]");
  const site = entries[0].siteUrl;

  console.log("\n=== 2) SEARCH ANALYTICS — 90 derniers jours (pages avec données) ===");
  const sa = await gscJson(`/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, access, "POST", {
    startDate: iso(90),
    endDate: iso(0),
    dimensions: ["page"],
    rowLimit: 100,
    type: "web",
  });
  if (!sa.ok) { console.error("SearchAnalytics KO:", JSON.stringify(sa.data)); }
  else {
    const rows = sa.data.rows || [];
    console.log(`${rows.length} pages ont des données d'impressions/clics :`);
    rows.forEach((r) =>
      console.log(`   ${r.keys[0]}  — ${r.clicks} clics / ${r.impressions} impressions`)
    );
  }

  console.log("\n=== 3) URL INSPECTION — quelques pages ville ===");
  const urls = [
    "https://vapespot.store/",
    "https://vapespot.store/vapespot-sydney-cbd",
    "https://vapespot.store/vapespot-parramatta",
    "https://vapespot.store/vapespot-melbourne-cbd",
    "https://vapespot.store/vapespot-brisbane-cbd",
    "https://vapespot.store/vapespot-perth-cbd",
  ];
  for (const u of urls) {
    const ins = await gscJson("/v1/urlInspection/index:inspect", access, "POST", {
      inspectionUrl: u,
      siteUrl: site,
    });
    if (!ins.ok) {
      console.log(`   ${u}  — INSPECTION KO: ${ins.status}`);
      continue;
    }
    const r = ins.data.inspectionResult || {};
    const idx = r.indexStatusResult || {};
    console.log(
      `   ${u}\n      → ${idx.verdict || "?"} | ${idx.coverageState || "?"} | dernière inspection: ${idx.lastCrawlTime || "?"}`
    );
  }
  console.log("\nFait.");
}

main().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});