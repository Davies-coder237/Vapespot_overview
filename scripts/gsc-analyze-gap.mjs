/**
 * gsc-analyze-gap.mjs — Analyse le dump gsc-audit-90j.json
 * Compare pos/clicks/impressions de MEMES requêtes entre MOBILE et DESKTOP
 * pour confirmer où Google traite différemment les deux devices.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const box = JSON.parse(readFileSync(join(__dirname, "..", "gsc-audit-90j.json"), "utf8"));
const qd = box.queriesByDevice;

const byQuery = {};
for (const r of qd) {
  const q = r.keys[0];
  const d = r.keys[1];
  if (!byQuery[q]) byQuery[q] = {};
  byQuery[q][d] = r;
}

console.log("=== REQUÊTES PRÉSENTES SUR MOBILE ET DESKTOP : comparaison position ===\n");
const rows = [];
for (const q of Object.keys(byQuery)) {
  const mob = byQuery[q].MOBILE, desk = byQuery[q].DESKTOP;
  if (mob && desk && mob.impressions + desk.impressions >= 5) {
    rows.push({ q, mob, desk, gap: (mob.position || 0) - (desk.position || 0) });
  }
}

// Tri par |gap| décroissant (requêtes où les devices se comportent le plus différemment)
rows.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

console.log("Requêtes partagées (>=5 impressions/mob+desk) triées par écart de position:\n");
for (const { q, mob, desk, gap } of rows.slice(0, 35)) {
  console.log(
    `  ${gap > 0 ? "DESKTOP mieux" : gap < 0 ? "MOBILE mieux" : "ÉGAL".padEnd(0)}  ` +
    `${`${gap >= 0 ? "+" : ""}${gap.toFixed(1)}`.padEnd(7)} | ` +
    `M:${String(mob.clicks).padStart(3)}cl/${String(mob.impressions).padStart(4)}imp@${mob.position.toFixed(1).padStart(4)} ` +
    `D:${String(desk.clicks).padStart(3)}cl/${String(desk.impressions).padStart(4)}imp@${desk.position.toFixed(1).padStart(4)}  "${q}"`
  );
}

// Vue d'ensemble : où ELLE (vapespot) est absente desktop
console.log("\n=== REQUÊTES MOBILE AVEC CLICS ABSENTES DU DESKTOP (ou quasi) ===\n");
const mobClicks = qd.filter((r) => r.keys[1] === "MOBILE" && r.clicks > 0);
const deskSet = new Set(qd.filter((r) => r.keys[1] === "DESKTOP").map((r) => r.keys[0]));
const absent = mobClicks.filter((r) => !deskSet.has(r.keys[0]));
console.log(`${absent.length} requêtes mobiles cliquées n'apparaissent pas du tout sur desktop :`);
absent.sort((a, b) => b.clicks - a.clicks).slice(0, 25).forEach((r) =>
  console.log(`   ${String(r.clicks).padStart(3)} cl mobile / ${String(r.impressions).padStart(4)} imp @${r.position.toFixed(1)}  "${r.keys[0]}"`));

// Agrégat par device pour chaque requête brand
console.log("\n=== AGRÉGAT device sur les requêtes BRAND / TOP ===\n");
for (const [, m] of Object.entries(byQuery).filter(([q]) => /vapespot|vape spot|ozvapes|vape shop|tobacconist|near me/.test(q.toLowerCase())).sort((a, b) => {
  const ta = Object.values(a[1]).reduce((s, r) => s + r.impressions, 0);
  const tb = Object.values(b[1]).reduce((s, r) => s + r.impressions, 0);
  return tb - ta;
}).slice(0, 20)) {
  const cl = (d) => m[d] ? `${m[d].clicks}cl/${m[d].impressions}imp@${m[d].position.toFixed(1)}` : "—";
  console.log(`   [${Object.keys(m)[0]}]  M:${cl("MOBILE")}  D:${cl("DESKTOP")}  T:${cl("TABLET")}`);
}