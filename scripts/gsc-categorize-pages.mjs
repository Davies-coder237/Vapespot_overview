import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const box = JSON.parse(readFileSync(join(__dirname, "..", "gsc-audit-90j.json"), "utf8"));

const pages = box.pages;
const cat = (u) => {
  const p = u.replace("https://vapespot.store", "");
  if (p === "/" || p === "") return "HOME";
  if (p.startsWith("/product/")) return "PRODUIT";
  if (p.startsWith("/guides/")) return "GUIDE";
  if (p.startsWith("/products/")) return "CATEGORIE";
  if (p.startsWith("/vapespot-") || p.startsWith("/vape-shop")) return "VILLE";
  if (["/discover", "/my-list", "/order-summary"].includes(p)) return "UTILITAIRE";
  return "AUTRE";
};

const buckets = {};
let totalImp = 0, totalCl = 0;
for (const r of pages) {
  const c = cat(r.keys[0]);
  if (!buckets[c]) buckets[c] = { pages: 0, cl: 0, imp: 0, minPos: 999, posSum: 0, posN: 0 };
  const b = buckets[c];
  b.pages++; b.cl += r.clicks; b.imp += r.impressions;
  if (r.position) { b.posSum += r.position; b.posN++; }
  totalImp += r.impressions; totalCl += r.clicks;
}
console.log("=== RÉPARTITION DES 500 PAGES AVEC DATA (90j) ===\n");
for (const c of Object.keys(buckets)) {
  const b = buckets[c];
  console.log(
    `${c.padEnd(10)} ${String(b.pages).padStart(4)} pages  ${String(b.cl).padStart(5)} cl / ${String(b.imp).padStart(6)} imp  posMoy ${(b.posSum/b.posN).toFixed(1)}  (${(100*b.imp/totalImp).toFixed(1)}% des impressions)`
  );
}

console.log(`\nTOTAL: ${totalImp} impressions / ${totalCl} clics`);

// Combien de pages produit ONT des impressions (meme 1)
const prodPages = pages.filter((r) => cat(r.keys[0]) === "PRODUIT");
console.log(`\n=== PAGES PRODUIT avec data (90j): ${prodPages.length} ===`);
prodPages.sort((a, b) => b.impressions - a.impressions).slice(0, 15).forEach((r) =>
  console.log(`   ${String(r.clicks).padStart(3)} cl / ${String(r.impressions).padStart(5)} imp @${r.position?.toFixed(1) ?? "-"}  ${r.keys[0].replace("https://vapespot.store/product/", "…/")}`));

// Requêtes qui mènent sur des produits (90j)
const qd = box.queriesByDevice;
const prodQueries = new Set();
for (const r of qd) {
  const prodPagesSet = new Set(pages.filter((x) => cat(x.keys[0]) === "PRODUIT").map((x) => x.keys[0]));
  // on ne peut pas joindre query->page directement avec cette extraction; approximer: requetes avec "vape" specifique
}
console.log(`\n=== Requêtes qui ont cliqué sur des pages produit (depuis pages.device) ===`);
for (const d of ["MOBILE", "DESKTOP"]) {
  const rows = (box.pagesByDevice || []).filter((r) => cat(r.keys[0]) === "PRODUIT" && r.keys[1] === d && r.clicks > 0);
  console.log(`  ${d}: ${rows.length} pages produit avec clics`);
  rows.sort((a, b) => b.clicks - a.clicks).slice(0, 8).forEach((r) =>
    console.log(`     ${r.clicks}cl/${r.impressions}imp@${r.position?.toFixed(1)}  ${r.keys[0].replace("https://vapespot.store", "")}`));
}