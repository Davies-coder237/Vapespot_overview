/**
 * Tâche 5 (assortiment) — AJOUTE les classes Alibarbar Ingot 15000 & 30000 absentes
 * du catalogue (demandées sur le site mais jamais vendues → perte de clients).
 *
 * Source specs : alibarbarofficials.au + listings Vapers Australia / AVO (retails AU).
 * Prix : échelle cohérente catalogue — 9000 = $54.99 → 15000 = $59.99 → 30000 = $69.99.
 * Images : téléchargées des sites sources, auto-hébergées en /images/products/
 *          (pas de hotlink — l'hébergeur source peut casser l'URL).
 *
 * IDEMPOTENT : ignore tout id déjà présent. Ne touche pas aux autres produits.
 * Format de sortie : JSON.stringify(2) + CRLF (= format byte-exact du repo → diff minimal).
 *
 * Propagations automatiques (le reste du pipeline lit ces 3 fichiers) :
 *   - pages produits /product/<id>/ (prerender.mjs lit disposables.json via DATASET)
 *   - pages marques (Tâche 2) : /brands/alibarbar/ re-dérive les counts de search.json
 *   - blocs « Popular brands in <ville> » (Tâche 3) : trending.json
 *   - sitemap + _redirects (generate-sitemap.mjs lit search.json)
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf-8"));
const writeJson = (p, obj) => {
  // byte-exact : JSON.stringify(2) avec \n→\r\n (format actuel des 3 fichiers)
  const out = JSON.stringify(obj, null, 2).replace(/\n/g, "\r\n") + "\r\n";
  writeFileSync(join(ROOT, p), out, "utf-8");
};

const MODELS = [
  {
    series: "Ingot 15000",
    puffs: "15000",
    eLiquid: "18mL",
    battery: "850mAh",
    chargingPort: "USB-C",
    coil: "Dual Mesh Coil",
    price: 59.99,
    idOffset: 91000,
    thumb: "/images/products/alibarbar-ingot-15000.webp",
    card: "/images/products/alibarbar-ingot-15000.webp",
    flavors: [
      "Pineapple Kiwifruit",
      "Grape Peach",
      "Mango",
      "Cherry Pomegranate",
      "Pineapple Banana",
      "Tropical",
      "Blueberry Raspberry",
      "Strawberry Watermelon",
      "Passionfruit Mango",
      "Blackberry",
      "Banana",
      "Grape",
      "Strawberry Kiwifruit",
      "Lychee Watermelon",
    ],
  },
  {
    series: "Ingot 30000",
    puffs: "30000",
    eLiquid: "22mL",
    battery: "2350mAh",
    chargingPort: null, // non-rechargeable (single-use) selon listings AU
    coil: "Mesh Coil",
    price: 69.99,
    idOffset: 92000,
    thumb: "/images/products/alibarbar-ingot-30000.png",
    card: "/images/products/alibarbar-ingot-30000.png",
    flavors: [
      "Grape Fruit Guava Lemon",
      "California Sunset",
      "Grapefruit",
      "Banana Ice",
      "Strawberry Kiwi",
      "Cool Mint",
      "Blueberry Blast",
      "Hubba Grape",
    ],
  },
];

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// --- Lecture des 3 fichiers maîtres ---
const leaf = readJson("public/data/e-cigarettes/disposables.json");
const search = readJson("public/data/search.json");
const trending = readJson("public/data/trending.json");

// index des ids existants pour l'idempotence
const existingLeaf = new Set(leaf.products.map((p) => p.id));
const existingSearch = new Set(search.map((s) => s.id));
const existingTrend = new Set(trending.products.map((p) => p.id));

const newProducts = [];
const newSearchRows = [];
const newTrendObjects = [];

for (const m of MODELS) {
  m.flavors.forEach((flavor, i) => {
    const sourceId = String(m.idOffset + i + 1);
    const id = `alibarbar-${slug(m.series)}-${slug(flavor)}-${sourceId}`;
    if (existingLeaf.has(id)) {
      console.log(`⏭  déjà présent, ignoré : ${id}`);
      return;
    }

    const specs = {
      battery_capacity: m.battery,
      puff_count: m.puffs,
      nicotine_strength: "5% (50mg/mL)",
      "e-liquid_capacity": m.eLiquid,
      coil_type: m.coil,
      battery_indicator: "Yes",
    };
    if (m.chargingPort) {
      // insère charging_port après nicotine (ordre du catalogue)
      const reorder = {};
      for (const [k, v] of Object.entries(specs)) {
        if (k === "coil_type") reorder.charging_port = m.chargingPort;
        reorder[k] = v;
      }
      Object.keys(specs).forEach((k) => delete specs[k]);
      Object.assign(specs, reorder);
    }

    const product = {
      id,
      source_id: sourceId,
      name: `Alibarbar Ingot ${m.puffs} ${flavor}`,
      price_aud: m.price,
      currency: "AUD",
      specs,
      image: { thumb: m.thumb, card: m.card },
      brand: "Alibarbar",
      series: m.series,
    };

    const searchRow = {
      id,
      name: product.name,
      brand: "Alibarbar",
      series: m.series,
      price_aud: m.price,
      path: ["e-cigarettes", "disposables"],
      file: "e-cigarettes/disposables.json",
      thumb: m.thumb,
    };

    newProducts.push(product);
    newSearchRows.push(searchRow);
    if (!existingTrend.has(id)) {
      newTrendObjects.push({
        rank: 0, // rank affecté après (49..) par l'ordre d'insertion
        ...product,
      });
    }
  });
}

if (newProducts.length === 0) {
  console.log("✅ Rien à ajouter (22 produits Ingot 15000/30000 déjà présents).");
  process.exit(0);
}

// --- Injection ---
// 1) leaf disposables.json : produits + count marque Alibarbar (181 → 203)
for (const p of newProducts) leaf.products.push(p);
const alib = leaf.brands.find((b) => b.name === "Alibarbar");
if (alib) {
  alib.product_count += newProducts.length;
  console.log(`ℹ️  brand Alibarbar product_count : ${alib.product_count - newProducts.length} → ${alib.product_count}`);
}

// 2) search.json : lignes dénormalisées (ordre de recherche)
for (const r of newSearchRows) search.push(r);

// 3) trending.json : ajout en fin de liste avec ranks à la suite
const startRank = trending.products.length;
newTrendObjects.forEach((obj, i) => {
  obj.rank = startRank + i + 1;
  trending.products.push(obj);
});
trending.count = trending.products.length;

// --- Écriture (format byte-exact conservé) ---
writeJson("public/data/e-cigarettes/disposables.json", leaf);
writeJson("public/data/search.json", search);
writeJson("public/data/trending.json", trending);

console.log(`✅ ${newProducts.length} produits Alibarbar ajoutés :
   - Ingot 15000 : ${MODELS[0].flavors.length} saveurs × A$${MODELS[0].price}
   - Ingot 30000 : ${MODELS[1].flavors.length} saveurs × A$${MODELS[1].price}
   → search.json +${newSearchRows.length} lignes, trending.json count=${trending.count}`);

// --- Sanity checks ---
if (leaf.products.length !== JSON.parse(readFileSync(join(ROOT, "public/data/e-cigarettes/disposables.json"), "utf-8")).products.length) {
  throw new Error("Incohérence leaf après écriture");
}
const searchCheck = JSON.parse(readFileSync(join(ROOT, "public/data/search.json"), "utf-8"));
if (searchCheck.length !== search.length) throw new Error("Incohérence search après écriture");
console.log("✅ Vérifications longueurs OK.");