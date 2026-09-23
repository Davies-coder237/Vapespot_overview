/**
 * gsc-audit-seo.mjs — Audit SEO complet GSC (28 jours + 90 jours)
 * Extrait : total device, top requêtes, top pages, requêtes×device, pages×device,
 *          queries+pages (pour comprendre le fossé PC/mobile), et dump JSON.
 * Usage : node scripts/gsc-audit-seo.mjs
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
  if (token.access_token && Date.now() - token.created_at < 55 * 60 * 1000) return token.access_token;
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
    headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  try { return { ok: resp.ok, status: resp.status, data: JSON.parse(text) }; }
  catch { return { ok: resp.ok, status: resp.status, data: text }; }
}

async function sa(access, site, dims, days, rowLimit = 1000, extraDims = []) {
  const body = {
    startDate: iso(days),
    endDate: iso(0),
    dimensions: [...dims, ...extraDims],
    rowLimit,
    type: "web",
  };
  const r = await gscJson(`/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, access, "POST", body);
  if (!r.ok) { console.error("  KO:", JSON.stringify(r.data).slice(0, 300)); return null; }
  return r.data.rows || [];
}

function fmt(rows) {
  return rows.map((r) => ({
    keys: r.keys,
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr ? +(r.ctr * 100).toFixed(1) : 0,
    position: r.position ? +r.position.toFixed(1) : null,
  }));
}

async function main() {
  const access = await ensureAccessToken();
  const sites = await gscJson("/webmasters/v3/sites", access);
  const site = sites.data.siteEntry.find((s) => s.siteUrl.includes("vapespot")).siteUrl;
  console.log("PROPRIÉTÉ :", site);

  const out = { site, generated: new Date().toISOString(), buckets: {} };

  // === 1) Vue globale 28j : device + pays
  for (const [label, days] of [["90j", 90], ["28j", 28]]) {
    const dev = await sa(access, site, ["device"], days, 5);
    const ctry = await sa(access, site, ["country"], days, 10);
    out.buckets[label] = { devices: fmt(dev), countries: fmt(ctry) };
    console.log(`\n=== ${label} — PAR DEVICE ===`);
    dev?.forEach((r) => console.log(`   ${r.keys[0]}: ${r.clicks} clics / ${r.impressions} imp / ctr ${(r.ctr*100).toFixed(1)}% / pos ${r.position.toFixed(1)}`));
    console.log(`=== ${label} — PAR PAYS (top 8) ===`);
    ctry?.slice(0, 8).forEach((r) => console.log(`   ${r.keys[0]}: ${r.clicks} clics / ${r.impressions} imp / pos ${r.position.toFixed(1)}`));
  }

  // === 2) TOP REQUÊTES 90j (500)
  const q = await sa(access, site, ["query"], 90, 500);
  out.queries = fmt(q);
  console.log(`\n=== 90j — TOP REQUÊTES (${q.length}) — JAUNE: clic>0, SINON impression sans clic ===`);
  q.filter((r) => r.clicks > 0).slice(0, 40).forEach((r) =>
    console.log(`   ${String(r.clicks).padStart(3)} cl / ${String(r.impressions).padStart(5)} imp / ${(r.ctr*100).toFixed(1).padStart(5)}% / pos ${r.position.toFixed(1).padStart(4)}  "${r.keys[0]}"`));
  console.log(`\n--- Top requêtes PAR IMPRESSIONS SANS CLIC (opportunités) ---`);
  q.filter((r) => r.clicks === 0).sort((a, b) => b.impressions - a.impressions).slice(0, 30).forEach((r) =>
    console.log(`   ${String(r.impressions).padStart(4)} imp / pos ${r.position.toFixed(1).padStart(4)}  "${r.keys[0]}"`));

  // === 3) TOP PAGES 90j (500)
  const p = await sa(access, site, ["page"], 90, 500);
  out.pages = fmt(p);
  console.log(`\n=== 90j — TOP PAGES (${p.length}) ===`);
  p.slice(0, 40).forEach((r) =>
    console.log(`   ${String(r.clicks).padStart(3)} cl / ${String(r.impressions).padStart(5)} imp / ${(r.ctr*100).toFixed(1).padStart(5)}% / pos ${r.position.toFixed(1).padStart(4)}  ${r.keys[0].replace("https://vapespot.store", "…")}`));

  // === 4) REQUÊTES × DEVICE 90j (pour le fossé PC/mobile)
  const qd = await sa(access, site, ["query", "device"], 90, 2000);
  out.queriesByDevice = fmt(qd);
  const devSet = [...new Set(qd.map((r) => r.keys[1]))];
  console.log(`\n=== 90j — REQUÊTES PAR DEVICE (${qd.length} lignes, devices: ${devSet.join(", ")}) ===`);
  for (const d of devSet) {
    const rows = qd.filter((r) => r.keys[1] === d && r.clicks > 0).sort((a, b) => b.clicks - a.clicks);
    console.log(`\n--- ${d.toUpperCase()} — ${rows.length} requêtes avec clics ---`);
    rows.slice(0, 15).forEach((r) =>
      console.log(`   ${String(r.clicks).padStart(3)} cl / ${String(r.impressions).padStart(5)} imp / pos ${r.position.toFixed(1).padStart(4)}  "${r.keys[0]}"`));
  }

  // === 5) PAGES × DEVICE 90j
  const pd = await sa(access, site, ["page", "device"], 90, 2000);
  out.pagesByDevice = fmt(pd);
  console.log(`\n=== 90j — PAGES PAR DEVICE (${pd.length} lignes) — comparaison clics ===`);
  for (const d of devSet) {
    const rows = pd.filter((r) => r.keys[1] === d && r.clicks > 0).sort((a, b) => b.clicks - a.clicks);
    console.log(`\n--- ${d.toUpperCase()} — pages avec clics (${rows.length}) ---`);
    rows.slice(0, 15).forEach((r) =>
      console.log(`   ${String(r.clicks).padStart(3)} cl / ${String(r.impressions).padStart(5)} imp / pos ${r.position.toFixed(1).padStart(4)}  ${r.keys[0].replace("https://vapespot.store", "…")}`));
  }

  // === 6) Périmètre: requêtes à haute intention produit (30j vs 90j pour voir la tendance)
  console.log(`\n=== 28j vs 90j — MÊME TOP pages (tendance trafic) ===`);
  const p28 = await sa(access, site, ["page"], 28, 100);
  const p28map = new Map(p28.map((r) => [r.keys[0], r]));
  for (const r of p.slice(0, 15)) {
    const recent = p28map.get(r.keys[0]);
    console.log(`   ${r.keys[0].replace("https://vapespot.store", "…").padEnd(50)} 90j:${r.position.toFixed(1)} | 28j:${recent ? `${recent.clicks}cl/${recent.impressions}imp@${recent.position.toFixed(1)}` : "—"}`);
  }

  writeFileSync(join(ROOT, "gsc-audit-90j.json"), JSON.stringify(out, null, 2));
  console.log("\n✅ Dump complet → gsc-audit-90j.json");
}

main().catch((e) => { console.error("ERREUR:", e.message); process.exit(1); });