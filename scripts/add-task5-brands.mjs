/**
 * Tâche 5 (assortiment) — AJOUTE les marques recherchées par les Australiens mais
 * absentes/faibles du catalogue :
 *   - KUZ (≈18 % du marché 2026, 0 produit ici)      → Kuz 9000, 24 saveurs
 *   - UMIN (cité au cahier, 0 produit)               → UMIN 10000, 21 saveurs
 *   - Geek Bar Meloso Mini (requête déjà impressionnée au GSC, jamais en stock)
 *                                                      → 4 saveurs, image device partagée
 *   - Geek Bar Pulse X 25000 (existe en 3 doublons génériques SANS saveurs)
 *                                                      → 8 saveurs top avec photos
 *
 * Sources AU vérifiées le 23/09 :
 *   - shopalibarbarvape.com/brand/kuz  (pages produit kuz-9000)   — images par saveur
 *   - vapeprimeau.com (UMIN 10000)                                — images par saveur
 *   - motivapeaustralia.com (Meloso Mini)                         — image device
 *   - vapicoau.com (Pulse X 25000)                                — images par saveur
 * Images auto-hébergées en /images/products/ (pas de hotlink).
 *
 * Prix : échelle catalogue existante (IGET 9000 = $54.99, UMIN calibré $49.99,
 * Meloso Mini fixé par la cliente à $49.99, Pulse X 25K existant = $69.99).
 *
 * IDEMPOTENT : ignore tout id déjà présent, re-télécharge proprement les images
 * (skip si le fichier existe déjà). Format de sortie JSON.stringify(2) + CRLF.
 *
 * Propagations automatiques : pages produits /product/<id>/, pages /brands/,
 * blocs « Popular brands in <ville> », sitemap + _redirects.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf-8"));
const writeJson = (p, obj) => {
  const out = JSON.stringify(obj, null, 2).replace(/\n/g, "\r\n") + "\r\n";
  writeFileSync(join(ROOT, p), out, "utf-8");
};

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ---------------------------------------------------------------------------
// 1) Téléchargement robuste d'une image (UA navigateur, redirects, magic bytes)
// ---------------------------------------------------------------------------
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const SIZES_MB = 3;
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, dest, expectedExt) {
  if (existsSync(dest)) return { ok: true, cached: true };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (!res.ok) return { ok: false, status: res.status, dest };
      const ctype = res.headers.get("content-type") || "";
      const buf = new Uint8Array(await res.arrayBuffer());
      // valide magic bytes
      const magicOk =
        (expectedExt === "jpg" && buf[0] === 0xff && buf[1] === 0xd8) ||
        (expectedExt === "png" && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e) ||
        (expectedExt === "webp" && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46);
      if (!magicOk) return { ok: false, status: res.status, type: ctype, dest, badMagic: true };
      if (buf.length > SIZES_MB * 1024 * 1024) return { ok: false, status: res.status, dest, tooBig: true };
      writeFileSync(dest, buf);
      return { ok: true, cached: false, bytes: buf.length, type: ctype };
    } catch (e) {
      if (attempt === 3) return { ok: false, error: String(e), dest };
      await sleepMs(1500 * attempt); // backoff avant retry
    }
  }
  return { ok: false, dest };
}

// ---------------------------------------------------------------------------
// 2) Définition des modèles (saveur → slug image source)
// ---------------------------------------------------------------------------
const MODELS = [
  {
    // KUZ 9000 — specs officielles KUZ (650mAh, 19mL, 1.0Ω mesh, USB-C rechargeable)
    brand: "Kuz",
    series: "KUZ 9000",
    prefix: "kuz-9000",
    puffs: "9000",
    price: 54.99,
    idOffset: 70000,
    srcBase: "https://shopalibarbarvape.com/wp-content/uploads/2026/07/",
    ext: "png",
    specs: {
      battery_capacity: "650mAh",
      puff_count: "9000",
      nicotine_strength: "5% (50mg/mL)",
      "e-liquid_capacity": "19mL",
      charging_port: "USB-C",
      coil_type: "Mesh Coil 1.0Ω",
      display: "Battery & E-liquid",
      battery_indicator: "Yes",
      adjust_airflow: "No",
    },
    // saveur → fichier image source (relevé du data-product_variations)
    flavors: {
      "american-tobacco": "shopalibarbarvape-19-5.png",
      "blue-dream": "shopalibarbarvape-11-5.png",
      "blue-razz-lemonade": "shopalibarbarvape-20-5.png",
      "cali-clear": "shopalibarbarvape-24-5.png",
      "cali-mint": "shopalibarbarvape-10-5.png",
      "cola-ice": "shopalibarbarvape-3-5.png",
      "crystal-clear": "shopalibarbarvape-17-6.png",
      "double-apple": "shopalibarbarvape-2-5.png",
      "lemon-mint": "shopalibarbarvape-5-5.png",
      "mango-peach": "shopalibarbarvape-9-5.png",
      "miami-mint": "shopalibarbarvape-4-5.png",
      "mighty-mint": "shopalibarbarvape-8-5.png",
      "mimosa": "shopalibarbarvape-18-5.png",
      "my-oh-my": "shopalibarbarvape-78.png",
      "naked": "shopalibarbarvape-14-5.png",
      "passion-grapefruit": "shopalibarbarvape-7-5.png",
      "pineapple-coco": "shopalibarbarvape-13-5.png",
      "rainbow-drop": "shopalibarbarvape-21-5.png",
      "strawberry-banana": "shopalibarbarvape-22-5.png",
      "strawberry-mango": "shopalibarbarvape-15-7.png",
      "strawberry-watermelon": "shopalibarbarvape-23-5.png",
      "super-berry": "shopalibarbarvape-6-5.png",
      "tobacco": "shopalibarbarvape-12-5.png",
      "watermelon-ice": "shopalibarbarvape-16-6.png",
    },
  },
  {
    // UMIN 10000 — 2700mAh / 22mL / 1.3Ω mesh / MTL, vrai jetable (listing AU)
    brand: "UMIN",
    series: "UMIN 10000",
    prefix: "umin-10000",
    puffs: "10000",
    price: 49.99,
    idOffset: 72000,
    srcBase: "https://vapeprimeau.com/wp-content/uploads/sites/2/2025/11/",
    ext: "jpg",
    specs: {
      battery_capacity: "2700mAh",
      puff_count: "10000",
      nicotine_strength: "5% (50mg/mL)",
      "e-liquid_capacity": "22mL",
      charging_port: null, // jetable non rechargeable
      coil_type: "Mesh Coil 1.3Ω",
      display: "Battery Level",
      battery_indicator: "Yes",
      mtl: "Yes",
    },
    flavors: {
      "banna-buzz": "umin-10000-banna-buzz.jpg",
      "black-ice": "umin-10000-black-ice.jpg",
      "blueberry-blast": "umin-10000-blueberry-blast.jpg",
      "cherry-cola": "umin-10000-cherry-cola.jpg",
      "cherry-pomegranate": "umin-10000-cherry-pomegranate.jpg",
      "coffee-tobacco": "umin-10000-coffee-tobacco.jpg",
      "cola": "umin-10000-cola.jpg",
      "grape-ice": "umin-10000-grape-ice.jpg",
      "grapefruit-soda": "umin-10000-grapefruit-soda.jpg",
      "ice-mint": "umin-10000-ice-mint.jpg",
      "mango-magic": "umin-10000-mango-magic.jpg",
      "mixed-berries": "umin-10000-mixed-berries.jpg",
      "passionfruit-mango-lime": "umin-10000-passionfruit-mango-lime.jpg",
      "pink-lemon": "umin-10000-pink-lemon.jpg",
      "root-beer": "umin-10000-root-beer.jpg",
      "strawberry": "umin-10000-strawberry.jpg",
      "strawberry-coconut": "umin-10000-strawberry-coconut.jpg",
      "strawberry-lychee": "umin-10000-strawberry-lychee.jpg",
      "tobacco": "umin-10000-tobacco.jpg",
      "watermelon-bubblegum": "umin-10000-watermelon-bubblegum.jpg",
      "watermelon-ice": "umin-10000-watermelon-ice.jpg",
    },
  },
  {
    // Geek Bar Meloso Mini — 1500 puffs, 550mAh, 5mL, dual mesh, rechargeable
    brand: "Geek Bar",
    series: "Meloso Mini",
    prefix: "geek-bar-meloso-mini",
    puffs: "1500",
    price: 49.99, // fixé par la cliente (29.99 → 49.99)
    idOffset: 74000,
    srcBase: "https://motivapeaustralia.com/wp-content/uploads/2026/08/",
    ext: "webp",
    imageShared: true, // même photo device pour les 4 saveurs
    specs: {
      battery_capacity: "550mAh",
      puff_count: "1500",
      nicotine_strength: "5% (50mg/mL)",
      "e-liquid_capacity": "5mL",
      charging_port: "USB-C",
      coil_type: "Dual Mesh Coil",
      display: "No",
      battery_indicator: "No",
    },
    flavors: {
      "blueberry-ice": "AkooeDDA_P37004-800x800.webp",
      "grape-jelly": "AkooeDDA_P37004-800x800.webp",
      "sour-apple-ice": "AkooeDDA_P37004-800x800.webp",
      "white-gummy-ice": "AkooeDDA_P37004-800x800.webp",
    },
  },
  {
    // Geek Bar Pulse X 25000 — même specs que le « Pulse X 25K » déjà au catalogue
    brand: "Geek Bar",
    series: "Pulse X 25000",
    prefix: "geek-bar-pulse-x-25000",
    puffs: "25000",
    price: 69.99,
    idOffset: 76000,
    srcBase: "https://vapicoaus.com/wp-content/uploads/2025/12/",
    ext: "webp",
    specs: {
      puff_count: "25000",
      nicotine_strength: "5% (50mg/mL)",
      "e-liquid_capacity": "18mL",
      battery_capacity: "820mAh",
      charging_port: "USB-C",
      display_screen: "Yes",
      adjustable_airflow: "Yes",
      coil_type: "Dual Mesh",
      vaping_mode: "Pulse/Regular",
      battery_indicator: "Yes",
      "e-liquid_indicator": "Yes",
    },
    flavors: {
      "blue-razz-ice": "geek-bar-pulse-x-25000-blue-razz-ice.webp",
      "watermelon-ice": "geek-bar-pulse-x-25000-watermelon-ice.webp",
      "miami-mint": "geek-bar-pulse-x-25000-miami-mint.webp",
      "sour-apple-ice": "geek-bar-pulse-x-25000-sour-apple-ice.webp",
      "banana-taffy-freeze": "geek-bar-pulse-x-25000-banana-taffy-freeze.webp",
      "cool-mint": "geek-bar-pulse-x-25000-cool-mint.webp",
      "blue-rancher": "geek-bar-pulse-x-25000-blue-rancher.webp",
      "orange-fcuking-fab": "geek-bar-pulse-x-25000-orange-fcuking-fab.webp",
    },
  },
];

// ---------------------------------------------------------------------------
// 3) Lecture des 3 fichiers maîtres + index idempotence
// ---------------------------------------------------------------------------
const leaf = readJson("public/data/e-cigarettes/disposables.json");
const search = readJson("public/data/search.json");
const trending = readJson("public/data/trending.json");

const existingLeaf = new Set(leaf.products.map((p) => p.id));
const existingSearch = new Set(search.map((s) => s.id));
const existingTrend = new Set(trending.products.map((p) => p.id));

const IMG_DIR = join(ROOT, "public/images/products");
if (!existsSync(IMG_DIR)) mkdirSync(IMG_DIR, { recursive: true });

const newProducts = [];
const newSearchRows = [];
const newTrendObjects = [];
const brandDelta = new Map(); // brand → +n

// --- téléchargement + construction des produits --------------------------
const flavorName = (s) =>
  s
    .split("-")
    .map((w) => (w === "b" ? "B" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
const SPECIAL = {
  "and": " and ", "fcuking": "Fcuking", "y": "", "coco": "Coco",
};

for (const m of MODELS) {
  let i = 0;
  for (const [flavSlug, srcFile] of Object.entries(m.flavors)) {
    i++;
    const sourceId = String(m.idOffset + i);
    const id = `${m.prefix}-${flavSlug}-${sourceId}`;
    if (existingLeaf.has(id)) {
      console.log(`⏭  déjà présent, ignoré : ${id}`);
      continue;
    }
    const destFile = m.imageShared
      ? `${m.prefix}.${m.ext}`
      : `${m.prefix}-${flavSlug}.${m.ext}`;
    const dest = join(IMG_DIR, destFile);
    const imgPath = `/images/products/${destFile}`;

    const dl = await download(m.srcBase + srcFile, dest, m.ext);
    if (!dl.ok) {
      console.log(`✗ IMAGE KO ${id} : ${JSON.stringify(dl)}`);
      // on continue sans injecter le produit (pas de fiche cassée)
      continue;
    }
    if (!dl.cached) {
      console.log(`✓ ${destFile} (${dl.type}, ${Math.round(dl.bytes / 1024)} Ko)`);
      await sleepMs(400); // espace les requêtes vers un même hôte
    }

    // nom propre de la saveur
    const name = `${m.brand} ${m.series} ${flavorName(flavSlug)}`;

    const product = {
      id,
      source_id: sourceId,
      name,
      price_aud: m.price,
      currency: "AUD",
      specs: { ...m.specs },
      image: { thumb: imgPath, card: imgPath },
      brand: m.brand,
      series: m.series,
    };

    newProducts.push(product);
    if (!existingSearch.has(id)) {
      newSearchRows.push({
        id,
        name,
        brand: m.brand,
        series: m.series,
        price_aud: m.price,
        path: ["e-cigarettes", "disposables"],
        file: "e-cigarettes/disposables.json",
        thumb: imgPath,
      });
    }
    if (!existingTrend.has(id)) {
      newTrendObjects.push({ rank: 0, ...product });
    }
    brandDelta.set(m.brand, (brandDelta.get(m.brand) || 0) + 1);
  }
}

// ---------------------------------------------------------------------------
// 4) Injection
// ---------------------------------------------------------------------------
// 4a) leaf : produits + counts marques
for (const p of newProducts) leaf.products.push(p);
for (const [brand, n] of brandDelta) {
  let b = leaf.brands.find((x) => x.name === brand);
  if (b) {
    console.log(`ℹ️  brand ${brand} product_count : ${b.product_count} → ${b.product_count + n}`);
    b.product_count += n;
  } else {
    leaf.brands.push({ name: brand, slug: slug(brand), product_count: n });
    console.log(`＋ brand ${brand} créée (${n})`);
  }
}

// 4b) search.json
for (const r of newSearchRows) search.push(r);

// 4c) trending.json (appendix, ranks à la suite)
const startRank = trending.products.length;
newTrendObjects.forEach((obj, i) => {
  obj.rank = startRank + i + 1;
  trending.products.push(obj);
});
trending.count = trending.products.length;

if (newProducts.length > 0) {
  writeJson("public/data/e-cigarettes/disposables.json", leaf);
  writeJson("public/data/search.json", search);
  writeJson("public/data/trending.json", trending);
}

console.log(`\n✅ ${newProducts.length} produits ajoutés :
   - Kuz 9000        : ${MODELS[0] ? Object.keys(MODELS[0].flavors).length : 0} saveurs × A$${MODELS[0]?.price}
   - UMIN 10000      : ${MODELS[1] ? Object.keys(MODELS[1].flavors).length : 0} saveurs × A$${MODELS[1]?.price}
   - Meloso Mini     : ${MODELS[2] ? Object.keys(MODELS[2].flavors).length : 0} saveurs × A$${MODELS[2]?.price}
   - Pulse X 25000   : ${MODELS[3] ? Object.keys(MODELS[3].flavors).length : 0} saveurs × A$${MODELS[3]?.price}
   → search.json +${newSearchRows.length}, trending.json count=${trending.count}, marques ${[...brandDelta.keys()].join(", ")}`);

// --- sanity checks longueurs (relus depuis le disque, format CRLF) ----------
const leaf2 = JSON.parse(readFileSync(join(ROOT, "public/data/e-cigarettes/disposables.json"), "utf-8"));
if (leaf2.products.length !== leaf.products.length) {
  throw new Error(`Incohérence leaf : ${leaf2.products.length} vs ${leaf.products.length}`);
}
const search2 = JSON.parse(readFileSync(join(ROOT, "public/data/search.json"), "utf-8"));
if (search2.length !== search.length) throw new Error("Incohérence search après écriture");
console.log("✅ Vérifications longueurs OK.");