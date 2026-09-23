/**
 * Tâche 5 (correctif) — Les images Ingot 30000 étaient un PNG noir/semi-transparent
 * illisible. Ce script :
 *   1) pointe chaque saveur 30000 vers SA vraie photo (JPG 510×510, sources AU :
 *      vapersaustralia.com), auto-hébergée en /images/products/ ;
 *   2) corrige la saveur fantaisiste « Grapefruit » → « FTP » (id + name),
 *      présente dans aucun listing réel de la gamme 30000.
 *
 * Uniquement les produits préfixés alibarbar-ingot-30000-* sont touchés.
 * Les autres produits et les fichiers sont intacts.
 *
 * IDEMPOTENT : ré-exécutable sans effet (chemins déjà corrects → skip).
 * Format de sortie : JSON.stringify(2) + CRLF (= format byte-exact du repo).
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf-8"));
const writeJson = (p, obj) => {
  const out = JSON.stringify(obj, null, 2).replace(/\n/g, "\r\n") + "\r\n";
  writeFileSync(join(ROOT, p), out, "utf-8");
};

// id actuel → { saveurSlug, newId?, newName? }.
// La seule saveur inexistante de la gamme 30000 est « Grapefruit » → FTP.
const FIXES = [
  { id: "alibarbar-ingot-30000-grape-fruit-guava-lemon-92001", saveur: "grape-fruit-guava-lemon" },
  { id: "alibarbar-ingot-30000-california-sunset-92002", saveur: "california-sunset" },
  {
    id: "alibarbar-ingot-30000-grapefruit-92003",
    saveur: "ftp",
    newId: "alibarbar-ingot-30000-ftp-92003",
    newName: "Alibarbar Ingot 30000 FTP",
  },
  { id: "alibarbar-ingot-30000-banana-ice-92004", saveur: "banana-ice" },
  { id: "alibarbar-ingot-30000-strawberry-kiwi-92005", saveur: "strawberry-kiwi" },
  { id: "alibarbar-ingot-30000-cool-mint-92006", saveur: "cool-mint" },
  { id: "alibarbar-ingot-30000-blueberry-blast-92007", saveur: "blueberry-blast" },
  { id: "alibarbar-ingot-30000-hubba-grape-92008", saveur: "hubba-grape" },
];

const newThumb = (saveur) => `/images/products/alibarbar-ingot-30000-${saveur}.jpg`;

let leafChanged = 0, searchChanged = 0, trendChanged = 0;

// ── 1) leaf disposables.json ──
const leaf = readJson("public/data/e-cigarettes/disposables.json");
for (const f of FIXES) {
  const p = leaf.products.find((x) => x.id === f.id);
  if (!p) {
    console.log(`⚠  introuvable dans disposables.json : ${f.id}`);
    continue;
  }
  const target = newThumb(f.saveur);
  const imgOk = p.image?.thumb === target && p.image?.card === target;
  const nameOk = !f.newName || p.name === f.newName;
  if (imgOk && nameOk) {
    console.log(`⏭  déjà à jour : ${f.newId ?? f.id}`);
  } else {
    if (p.image?.thumb !== target) p.image.thumb = target;
    if (p.image?.card !== target) p.image.card = target;
    if (f.newName && p.name !== f.newName) p.name = f.newName;
    if (f.newId) p.id = f.newId; // l'id porte le slug saveur → cohérent avec le nom
    leafChanged++;
    console.log(`✍️  ${f.id} → ${f.newId ?? f.id} (${f.saveur})`);
  }
}

// ── 2) search.json (lignes dénormalisées) ──
const search = readJson("public/data/search.json");
for (const f of FIXES) {
  const row = search.find((r) => r.id === f.id);
  if (!row) continue;
  let dirty = false;
  if (row.thumb !== newThumb(f.saveur)) { row.thumb = newThumb(f.saveur); dirty = true; }
  if (f.newName && row.name !== f.newName) { row.name = f.newName; dirty = true; }
  if (f.newId) { row.id = f.newId; dirty = true; }
  if (dirty) searchChanged++;
}

// ── 3) trending.json (objets produit complets) ──
const trending = readJson("public/data/trending.json");
for (const f of FIXES) {
  const t = trending.products.find((x) => x.id === f.id);
  if (!t) continue;
  let dirty = false;
  if (t.image?.thumb !== newThumb(f.saveur)) { t.image.thumb = newThumb(f.saveur); dirty = true; }
  if (t.image?.card !== newThumb(f.saveur)) { t.image.card = newThumb(f.saveur); dirty = true; }
  if (f.newName && t.name !== f.newName) { t.name = f.newName; dirty = true; }
  if (f.newId) { t.id = f.newId; dirty = true; }
  if (dirty) trendChanged++;
}

// ── Écritures (uniquement si modifs) ──
if (leafChanged || searchChanged || trendChanged) {
  writeJson("public/data/e-cigarettes/disposables.json", leaf);
  writeJson("public/data/search.json", search);
  writeJson("public/data/trending.json", trending);
  console.log(`\n✅ Corrigé : leaf=${leafChanged} search=${searchChanged} trending=${trendChanged}`);
} else {
  console.log("\n✅ Rien à corriger (déjà en place).");
}

// ── Sanity check : aucune référence résiduelle à l'ancien PNG ni à grapefruit ──
const check = (p) =>
  readFileSync(join(ROOT, p), "utf-8");
for (const p of ["public/data/e-cigarettes/disposables.json", "public/data/search.json", "public/data/trending.json"]) {
  const txt = check(p);
  const pngLeft = (txt.match(/alibarbar-ingot-30000\.png/g) || []).length;
  const grapeLeft = (txt.match(/ingot-30000-grapefruit/g) || []).length;
  if (pngLeft) console.log(`⚠ ${p} : encore ${pngLeft} référence(s) à l'ancien PNG`);
  if (grapeLeft) console.log(`⚠ ${p} : encore ${grapeLeft} référence(s) grapefruit`);
}
console.log("✅ Vérifications finales OK.");