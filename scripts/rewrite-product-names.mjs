/**
 * rewrite-product-names.mjs — Préfixe la marque dans le `name` des produits
 * quand elle n'y est pas déjà (insensible à la casse).
 *
 * Pourquoi : le nom visible et le JSON-LD étaient « Bar 3500 Banana Ice »
 * alors que la marque vit dans le champ `brand` = « IGET ». Les Australiens
 * cherchent « iget strawberry kiwi », « alibarbar ingot 9000 » → la page
 * ne matche pas son propre mot-clé.
 *
 * ⚠️ NE TOUCHE PAS `id`/slug/URL → aucune URL cassée, aucune canonical
 *     détruite, indexations existantes intactes.
 * ⚠️ Idempotent : relançable, ne double pas une marque déjà présente.
 *
 * Fichiers couverts (toutes les sources de noms produit) :
 *   - public/data/search.json        (SEO prerender + recherche interne)
 *   - public/data/<cat>/*.json       (leafs → cartes/fiches SPA)
 *   - public/data/trending.json      (homepage)
 * Usage : node scripts/rewrite-product-names.mjs [--dry]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "public", "data");
const DRY = process.argv.includes("--dry");

// ---------- helpers ----------
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".json") && name !== "meta.json" && name !== "brands.json") out.push(p);
  }
  return out;
}

/**
 * Retourne le name enrichi, ou inchangé si la marque y est déjà représentée.
 * 1) Dédoublonnage d'ABORD : « Supreme CBD CBD Strawberries » (résultat d'un run
 *    précédent) → « Supreme CBD Strawberries ». On cherche « Marque + token de la
 *    marque répété » en tête et on retire le token dupliqué.
 * 2) Marque complète déjà dans le nom (case-insensitive) → inchangé.
 * 3) Sinon on préfixe SEULEMENT les tokens de marque absents du nom, dans l'ordre :
 *      « Supreme CBD » + « CBD Strawberries » → « Supreme CBD Strawberries »
 *      « Geek Bar »   + « Pulse X 25K »      → « Geek Bar Pulse X 25K »
 * → idempotent, relançable sans boucle ni doublon.
 */
function enrichName(name, brand) {
  const n = (name || "").trim();
  const b = (brand || "").trim();
  if (!n || !b) return name;
  // NB : certaines marques contiennent un double espace (« Twist  Salts ») →
  // on compare sur des chaînes normalisées (espaces écrasés).
  const nl = n.toLowerCase().replace(/\s+/g, " ");
  const bl = b.toLowerCase().replace(/\s+/g, " ");

  // (1) dédoublonnage : « marque + token de la marque répété » OU « marque marque »
  //     en tête de nom (résultats des runs précédents) → on retire le doublon.
  const words = n.split(/\s+/);
  if (words.length >= 3) {
    // cas « Marque Token Token » : « Supreme CBD CBD Strawberries »
    for (let len = words.length - 2; len >= 1; len--) {
      const head = words.slice(0, len).join(" ").toLowerCase();
      if (head === bl && words[len].toLowerCase() === words[len - 1].toLowerCase()) {
        words.splice(len, 1);
        return words.join(" ").replace(/\s{2,}/g, " ").trim();
      }
    }
    // cas « Marque Marque » : « Ultimate E-liquid Ultimate E-liquid … »
    const bw = bl.split(/\s+/).filter((t) => t);
    if (bw.length && words.slice(0, bw.length).join(" ").toLowerCase() === bl &&
        words.slice(bw.length, bw.length * 2).join(" ").toLowerCase() === bl) {
      return words.slice(bw.length).join(" ").replace(/\s{2,}/g, " ").trim();
    }
  }

  // (2) marque complète déjà présente
  if (nl.includes(bl)) return name;

  // (3) préfixe des tokens manquants uniquement
  const tokens = bl.split(/\s+/).filter((t) => t.length >= 2);
  const missing = [];
  for (const t of tokens) {
    if (nl.includes(t)) break;
    missing.push(t);
  }
  if (missing.length === 0) return name; // marque déjà représentée (token en tête)
  return `${missing.join(" ")} ${n}`.replace(/\s{2,}/g, " ").trim();
}

// ---------- traitement ----------
const files = walk(DATA);
let totalChanged = 0, totalEntries = 0;
const samples = [];

function processArray(arr, label) {
  for (const p of arr) {
    if (!p || typeof p !== "object" || !("name" in p)) continue;
    totalEntries++;
    const original = p.name;
    const enriched = enrichName(p.name, p.brand);
    if (enriched !== original) {
      totalChanged++;
      if (samples.length < 8) samples.push(`${label} : "${original}" → "${enriched}"`);
      if (!DRY) p.name = enriched;
    }
  }
}

for (const f of files) {
  const rel = f.replace(ROOT, "").replace(/\\/g, "/");
  const data = JSON.parse(readFileSync(f, "utf8"));
  let touched = false;
  const before = JSON.stringify(data);

  if (rel.endsWith("/search.json")) {
    if (Array.isArray(data)) processArray(data, f);
  } else if (rel.endsWith("/trending.json")) {
    if (Array.isArray(data?.products)) processArray(data.products, f);
  } else if (Array.isArray(data?.products)) {
    // leaf : /data/<cat>/<sub>.json avec .products[]
    processArray(data.products, f);
  }

  touched = JSON.stringify(data) !== before;
  if (touched) {
    if (!DRY) writeFileSync(f, JSON.stringify(data, null, 2).replace(/\n/g, "\r\n"));
  }
}

console.log(`\n=== NOMS PRODUITS — ${DRY ? "SIMULATION (--dry)" : "APPLICATION"} ===`);
console.log(`Fichiers parcourus : ${files.length}`);
console.log(`Entrées produit : ${totalEntries}`);
console.log(`Noms modifiés : ${totalChanged}`);
console.log("\nÉchantillon :");
for (const s of samples) console.log(`  ${s}`);
console.log(DRY ? "\n✅ Dry-run OK — relancer SANS --dry pour appliquer." : "\n✅ Écrit (2-space, CRLF conservé).");