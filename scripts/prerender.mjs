/**
 * Pre-render script — génère un fichier HTML statique pour chaque ville
 *
 * Après `vite build`, ce script lit le template `dist/index.html`,
 * injecte les balises meta propres à chaque ville (title, description,
 * OG, schema.org, geo), et écrit `dist/<slug>/index.html`.
 *
 * Google voit le contenu direct dans le HTML → indexation immédiate.
 * Les visiteurs humains reçoivent la SPA normale (le JS charge le reste).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

// ── 1. Lire le template HTML du build ──────────────────────────────
const templatePath = join(DIST, "index.html");
if (!existsSync(templatePath)) {
  console.error("❌ dist/index.html introuvable. Exécute 'npm run build' d'abord.");
  process.exit(1);
}

// Charger les données
const listings = JSON.parse(readFileSync(join(ROOT, "src", "data", "listings.json"), "utf-8"));
const schemas = JSON.parse(readFileSync(join(ROOT, "src", "data", "schema-data.json"), "utf-8"));
const schemaBySlug = {};
for (const s of schemas) {
  schemaBySlug[s.slug] = s.schema;
}

// ── 2. Lire le template ────────────────────────────────────────────
const template = readFileSync(templatePath, "utf-8");

// ── 3. Générer une page par slug ───────────────────────────────────
let count = 0;

for (const listing of listings) {
  const { slug, businessName, description, address, cityTag } = listing;
  const schema = schemaBySlug[slug];

  // Construire le title
  const title = `${businessName} | Vape Spot Australia`;

  // Construire l'URL canonique
  const canonicalUrl = `https://vapespot.store/${slug}`;

  // ── Balises head ──────────────────────────────────────────────
  const headTags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    // Geo tags spécifiques à la ville
    `<meta name="geo.country" content="AU" />`,
    `<meta name="geo.placename" content="${escapeHtml(cityTag || "Australia")}" />`,
    `<link rel="alternate" hreflang="en-AU" href="https://vapespot.store" />`,
    // Favicons (photo shop, circulaire) — présents sur toutes les pages
    `<link rel="icon" href="/favicon.ico" sizes="48x48" />`,
    `<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
  ];

  // ── Schema.org JSON-LD ─────────────────────────────────────────
  if (schema) {
    headTags.push(
      `<script type="application/ld+json">${JSON.stringify({
        ...schema,
        url: canonicalUrl,
      })}</script>`
    );
  }

  // ── FAQPage JSON-LD unique à la ville (miroir du composant client) ──
  const faq = buildCityFaq(listing);
  if (faq.length > 0) {
    headTags.push(
      `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      })}</script>`
    );
  }

  // ── Conserver les balises <script> et <link> du build ───────────
  // Les noms de fichiers changent à chaque build (hash)
  const scriptMatch = template.match(/<script type="module"[^>]+src="([^"]+)"[^>]*><\/script>/);
  const cssMatch = template.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*\/?>/);
  const scriptTag = scriptMatch ? scriptMatch[0] : '';
  const cssTag = cssMatch ? cssMatch[0] : '';

  // ── Assembler le HTML ──────────────────────────────────────────
  // Remplacer tout le <head> par nos balises + les assets du build
  const headContent = headTags.join("\n    ");
  const newHead = `${headContent}\n    ${scriptTag}\n    ${cssTag}\n  </head>`;

  let html = template.replace(
    /<head>[\s\S]*?<\/head>/,
    `<head>\n    ${newHead}`
  );

  // ── Écrire le fichier ─────────────────────────────────────────
  const outDir = join(DIST, slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf-8");

  count++;
  if (count % 20 === 0) {
    console.log(`  ✓ ${count}/${listings.length} pages générées`);
  }
}

// ════ 4. Pages produit statiques (une par produit de search.json) ════
// Même logique que les villes : un index.html unique par produit, avec
// title/description/JSON-LD Product → Google voit du contenu direct.
const searchIndex = JSON.parse(
  readFileSync(join(ROOT, "public", "data", "search.json"), "utf-8")
);

const leafCache = new Map();
function loadLeaf(file) {
  if (!leafCache.has(file)) {
    leafCache.set(
      file,
      JSON.parse(readFileSync(join(ROOT, "public", "data", file), "utf-8"))
    );
  }
  return leafCache.get(file);
}

// Assets du build réutilisés (une seule fois, produits partagent le template)
const prodScriptM = template.match(
  /<script type="module"[^>]+src="([^"]+)"[^>]*><\/script>/
);
const prodCssM = template.match(
  /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*\/?>/
);
const prodScriptTag = prodScriptM ? prodScriptM[0] : "";
const prodCssTag = prodCssM ? prodCssM[0] : "";

// Ordre de préférence des specs pour construire une description unique.
const PRODUCT_SPEC_ORDER = [
  "puff_count",
  "puffs",
  "flavor",
  "nicotine_concentration",
  "nicotine_strength",
  "e-liquid_capacity",
  "e-liquid_capacity_ml",
  "battery_capacity",
  "battery_capacity_mah",
  "volume",
  "strength",
];

let prodCount = 0;
const seenIds = new Set();
for (const entry of searchIndex) {
  if (!entry.id || seenIds.has(String(entry.id))) continue;
  seenIds.add(String(entry.id));

  const leaf = loadLeaf(entry.file);
  const p = leaf.products.find((x) => x.id === entry.id);
  if (!p) continue;

  const idSafe = String(entry.id).replace(/[\\/]/g, "-");
  const canonicalUrl = `https://vapespot.store/product/${entry.id}`;
  const title = buildProductTitle(p);
  const desc = buildProductDescription(p);
  const img = p.image?.card || p.image?.thumb || "";

  const headTags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:type" content="product" />`,
    img ? `<meta property="og:image" content="${escapeHtml(img)}" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<link rel="icon" href="/favicon.ico" sizes="48x48" />`,
    `<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<script type="application/ld+json">${JSON.stringify(
      buildProductLd(p, canonicalUrl, desc, img)
    )}</script>`,
  ].filter(Boolean);

  const headContent = headTags.join("\n    ");
  const newHead = `${headContent}\n    ${prodScriptTag}\n    ${prodCssTag}\n  </head>`;
  let html = template.replace(
    /<head>[\s\S]*?<\/head>/,
    `<head>\n    ${newHead}`
  );

  const outDir = join(DIST, "product", idSafe);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf-8");
  prodCount++;
}

console.log(`\n✅ ${count} pages ville + ${prodCount} pages produit statiques générées dans dist/`);

// ── Helper ──────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Extrait un nom de ville propre : "Sydney CBD NSW" -> "Sydney CBD". */
function cityName(listing) {
  const m = listing.cityTag.match(/^(.+?)\s+(?:NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\b/i);
  return m ? m[1].trim() : listing.cityTag;
}

/**
 * 4 questions propres à la ville — miroir de cityFaq() côté client
 * (src/lib/city-content.ts) pour que le HTML statique et la SPA
 * produisent exactement le même JSON-LD.
 */
function buildCityFaq(listing) {
  const cn = cityName(listing);
  const business = listing.businessName;
  const hours = listing.hours ?? "open 24/7";
  const at = listing.address ? `, at ${listing.address}` : "";
  return [
    {
      q: `Is there a vape shop in ${cn}?`,
      a: `Yes — ${business} is a vaporiser store in ${listing.cityTag}${at}.`,
    },
    {
      q: `What brands does ${business} stock?`,
      a: `${business} carries a curated range of vaporisers, pods, mods and e-liquids, including the brands featured on vapespot.store.`,
    },
    {
      q: `Does VapeSpot deliver to ${cn}?`,
      a: `Yes. VapeSpot offers fast courier delivery to ${cn} and nearby suburbs — usually within 30 minutes to 2 hours — or via Australia Post for longer distances.`,
    },
    {
      q: `What are the opening hours in ${cn}?`,
      a: `${business} is ${hours}.`,
    },
  ];
}

// ── Helpers produits ────────────────────────────────────────────────

/**
 * Titre produit : "Brand Name" — sans dupliquer la marque déjà dans le nom
 * (ex. name "RANDM Tornado 15000", brand "RandM" → "RANDM Tornado 15000").
 * ≤ 58 caractères pour un bon rendu SERP.
 */
function buildProductTitle(p) {
  const name = (p.name || "").trim();
  const brand = (p.brand || "").trim();
  let t = "";
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) t = brand + " ";
  t += name;
  if (!t.trim()) t = "Vape Product";
  if (t.length > 58) t = t.slice(0, 55).trim() + "…";
  return `${t} | Vape Spot Australia`;
}

/** Description méta unique : nom + marque + prix + specs clés + livraison. */
function buildProductDescription(p) {
  const specs = p.specs || {};
  const brand = p.brand ? `${p.brand} ` : "";
  const name = p.name || "this vape";
  let lead = `Shop the ${brand}${name}`;
  if (typeof p.price_aud === "number" && !Number.isNaN(p.price_aud)) {
    lead += ` from A$${p.price_aud}`;
  }
  lead += " at Vape Spot Australia.";
  const feats = [];
  for (const k of PRODUCT_SPEC_ORDER) {
    const v = specs[k];
    if (v != null && String(v).trim()) feats.push(String(v).trim());
  }
  // Termine toujours par la phrase de livraison entière ; on n'ajoute des
  // specs que si ça tient (aucune coupure en plein mot).
  const delivery = " Order online with fast courier delivery across Australia.";
  let sentence = lead;
  for (const f of feats) {
    if (`${sentence} ${f}.${delivery}`.length <= 158) {
      sentence += ` ${f}.`;
    } else {
      break;
    }
  }
  return sentence + delivery;
}

/** JSON-LD Product : nom, image, marque, offre AUD (si prix connu). */
function buildProductLd(p, url, desc, img) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: desc,
    image: img || undefined,
    url,
  };
  if (p.brand) ld.brand = { "@type": "Brand", name: p.brand };
  if (p["category"]) ld.category = p.category;
  if (
    typeof p.price_aud === "number" &&
    !Number.isNaN(p.price_aud)
  ) {
    const offers = {
      "@type": "Offer",
      priceCurrency: "AUD",
      price: p.price_aud,
      availability: "https://schema.org/InStock",
      url,
    };
    if (p.source_id) offers.sku = p.source_id;
    ld.offers = offers;
  }
  return ld;
}