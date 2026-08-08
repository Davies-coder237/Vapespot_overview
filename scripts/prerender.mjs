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
// Purge les blocs <section class="seo-block ..."> éventuellement injectés
// par un run précédent dans dist/index.html → on repart toujours du shell
// vite propre, même si prerender est relancé sans rebuild (idempotent).
const template = readFileSync(templatePath, "utf-8")
  .replace(/<section class="seo-block[\s\S]*?<\/section>/g, "");

// ════ MAILLAGE INTERNE — blocs de liens produits dans le HTML statique ════
// But : plus aucun produit orphelin. Google découvre les produits en suivant
// les liens depuis des pages INDEXÉES (home + villes), qui relient vers des
// produits, eux-mêmes reliés entre eux (« related ») → tout le catalogue est
// atteignable sans lier les 3052 produits depuis la home.
// Les blocs .seo-dupe sont masqués quand le JS tourne (html.js .seo-dupe
// {display:none}) car les composants live (TrendingProducts / YouMayAlsoLike)
// rendent déjà le même maillage côté interactif. Les autres blocs restent.

const HOME_N = 16, CITY_N = 14, RELATED_N = 12, STORE_N = 8;

// ── Mapping état (abbr -> nom complet Trends) ─────────────────────
const STATE_ABBR = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
  WA: "Western Australia", SA: "South Australia", TAS: "Tasmania",
  ACT: "Australian Capital Territory", NT: "Northern Territory",
};
function stateYears(cityTag) {
  const m = String(cityTag || "").match(/ (NSW|VIC|QLD|WA|SA|TAS|ACT|NT)$/);
  return m ? m[1] : null;
}

// ── Pool « best sellers » (public/data/trending.json, 48 produits) ──
let trendPool = [];
try {
  const tj = JSON.parse(readFileSync(join(ROOT, "public", "data", "trending.json"), "utf-8"));
  trendPool = (tj.products || []).filter((p) => p && p.id);
} catch {}

// ── Intérêt par marque × état (scripts/state-top.json, produit par trends-state-map.py) ──
// Query Trends -> regex marque, pour scorer chaque produit par état.
const Q2BRAND = [
  [/voopoo/i, "voopoo"], [/geek\s*bar/i, "geek bar"], [/iget/i, "iget vape"],
  [/elf\s*bar/i, "elf bar"], [/airbar/i, "airbar"], [/hayati/i, "hayati"],
  [/lost\s*vape/i, "lost vape"], [/smok/i, "smok vape"], [/pod/i, "pod vape"],
];
let stateIndex = null;
try {
  stateIndex = JSON.parse(readFileSync(join(ROOT, "scripts", "state-top.json"), "utf-8"));
} catch {}
function brandStateScore(brand, abbr) {
  if (!stateIndex || !abbr) return 0;
  const st = STATE_ABBR[abbr];
  if (!st) return 0;
  let s = 0;
  for (const [re, q] of Q2BRAND) {
    if (re.test(brand || "")) s += Number(stateIndex[q]?.[st] || 0);
  }
  return Math.round(s * 100);
}
// Petit stable hash (slug -> index) pour la rotation déterministe quand un
// état n'est pas identifiable (aucune donnée Trends).
function stableIdx(s) {
  let h = 0;
  for (const c of String(s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Sélection de produits pour une page : re-scorée par marque/état, puis
// rotation déterministe PAR VILLE (rotationKey = slug) pour que Sydney,
// Parramatta, Blacktown… affichent des sous-ensembles différents, même au
// sein d'un même état. La variété de marques est garantie (1 par marque
// d'abord, max 2 ensuite). Sans état (ou sans Trends) : rotation pure.
function pickProducts(abbr, pool, count, rotationKey) {
  const list = pool.map((x, i) => ({ x, i, s: abbr ? brandStateScore(x.brand, abbr) : 0 }));
  let ordered = list.slice().sort((a, b) => (b.s - a.s) || (a.i - b.i));
  // rotation par ville (même état => villes différentes)
  const off = stableIdx(rotationKey || "") % Math.max(1, ordered.length);
  ordered = ordered.slice(off).concat(ordered.slice(0, off));

  const out = [], used = new Set();
  // phase 1 : un produit par marque (ordre de `ordered` = état pondéré + rotation)
  const perBrand = new Map();
  for (const it of ordered) {
    const b = it.x.brand || "";
    if (!perBrand.has(b)) perBrand.set(b, it);
  }
  for (const it of perBrand.values()) {
    if (out.length >= count) break;
    out.push(it.x); used.add(it.x.id);
  }
  // phase 2 : remplir (max 2 par marque) en suivant `ordered`
  for (const it of ordered) {
    if (out.length >= count) break;
    if (used.has(it.x.id)) continue;
    const b = it.x.brand || "";
    if ([...out].filter((o) => (o.brand || "") === b).length >= 2) continue;
    out.push(it.x); used.add(it.x.id);
  }
  return out;
}

// HTML d'une carte produit (image + nom + prix + lien slash final = 200).
function cardHTML(p) {
  const url = `https://vapespot.store/product/${p.id}/`;
  const img = p.image?.card || p.image?.thumb || p.thumb || "";
  let name = String(p.name || p.series || p.brand || "Vape product").trim();
  if (name.length > 60) name = name.slice(0, 57).trim() + "…";
  const price = typeof p.price_aud === "number" && !Number.isNaN(p.price_aud)
    ? `A$${p.price_aud}` : "";
  return `<a class="seo-card" href="${escapeHtml(url)}">` +
    `<img loading="lazy" src="${escapeHtml(img)}" alt="${escapeHtml(p.name || name)}" width="100" height="100">` +
    `<span class="seo-name">${escapeHtml(name)}</span>` +
    (price ? `<span class="seo-price">${escapeHtml(price)}</span>` : "") +
    `</a>`;
}

// Bloc <section> de liens produits injecté dans le HTML statique.
function seoBlock(title, klass, anchors) {
  if (!anchors || anchors.length === 0) return "";
  return `\n<section class="seo-block ${klass}">` +
    `<h2>${escapeHtml(title)}</h2>` +
    `<div class="seo-grid">${anchors}</div></section>`;
}

// Liens « Available in stores » : un produit -> les principales villes.
const CITY_LINK_CANDIDATES = [
  "vapespot-sydney-cbd", "vapespot-melbourne-cbd", "vapespot-brisbane-cbd",
  "vapespot-perth-cbd", "vapespot-adelaide-cbd", "vapespot-hobart-cbd",
  "vapespot-darwin-city", "vapespot-canberra-cbd",
];
function storeLinksHTML(storeSlugs) {
  const links = storeSlugs.slice(0, STORE_N).map(
    (slug) => `<a class="seo-store" href="/${slug}">${escapeHtml(humanSlug(slug))}</a>`
  );
  return links.join("");
}
function humanSlug(slug) {
  return slug.replace(/^vapespot-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── 3. Générer une page par slug ───────────────────────────────────
let count = 0;
// Map slug -> [ids produits] : écrite dans dist/data/city-products.json pour
// que le composant live CityProducts affiche EXACTEMENT la même liste que
// les liens statiques vus par Google (parité humain/crawler).
const cityProductsMap = {};

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
    // Indispensable : SANS ce meta, mobile rend à ~980px puis zoom-out
    // ("mode ordi" au refresh). La home l'a par défaut via index.html.
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
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
    // Pose la classe .js avant le premier rendu : masque les blocs SEO
    // statiques (html.js .seo-block{display:none}) → aucun flash au F5.
    `<script>document.documentElement.classList.add("js")</script>`,
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

  // ── Maillage interne : blocs de produits locaux (HTML statique) ──
  const st = stateYears(cityTag);
  const cityPool = st ? pickProducts(st, trendPool, CITY_N, slug)
                      : pickProducts(null, trendPool, CITY_N, slug);
  const cityCards = cityPool.map(cardHTML).join("\n        ");
  cityProductsMap[slug] = cityPool.map((p) => p.id);
  const cityTitle = `Popular vape products ${cityName(listing) ? "in " + cityName(listing) : "near you"}`;
  if (cityCards) {
    html = html.replace("</body>", seoBlock(cityTitle, "seo-city", cityCards) + "\n  </body>");
  }

  // ── Écrire le fichier ─────────────────────────────────────────
  const outDir = join(DIST, slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf-8");

  count++;
  if (count % 20 === 0) {
    console.log(`  ✓ ${count}/${listings.length} pages générées`);
  }
}

// Map ville -> [ids produits] pour le composant live CityProducts
const cityDataDir = join(DIST, "data");
mkdirSync(cityDataDir, { recursive: true });
writeFileSync(join(cityDataDir, "city-products.json"), JSON.stringify(cityProductsMap), "utf-8");

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

// Slugs de villes réels (pour le bloc « Available in stores » d'un produit)
const allCitySlugs = new Set(listings.map((l) => l.slug));
const storeSlugs = CITY_LINK_CANDIDATES.filter((s) => allCitySlugs.has(s));

for (const entry of searchIndex) {
  if (!entry.id || seenIds.has(String(entry.id))) continue;
  seenIds.add(String(entry.id));

  const leaf = loadLeaf(entry.file);
  const p = leaf.products.find((x) => x.id === entry.id);
  if (!p) continue;

  const idSafe = String(entry.id).replace(/[\\/]/g, "-");
  // URL AVEC slash final ➡ dossier dist/product/<id>/ servi en 200 direct (fini le 308)
  const canonicalUrl = `https://vapespot.store/product/${entry.id}/`;
  const title = buildProductTitle(p);
  const desc = buildProductDescription(p);
  const img = p.image?.card || p.image?.thumb || "";

  const headTags = [
    `<title>${escapeHtml(title)}</title>`,
    // Indispensable : SANS ce meta, mobile rend à ~980px puis zoom-out
    // ("mode ordi" au refresh).
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:type" content="product" />`,
    img ? `<meta property="og:image" content="${escapeHtml(img)}" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    // Ciblage australien (même signal que villes/guides) : geo + hreflang en-AU
    `<meta name="geo.country" content="AU" />`,
    `<meta name="geo.placename" content="Australia" />`,
    `<link rel="alternate" hreflang="en-AU" href="${canonicalUrl}" />`,
    `<link rel="icon" href="/favicon.ico" sizes="48x48" />`,
    `<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    // Classe .js avant le premier rendu → blocs SEO statiques masqués (no-flash)
    `<script>document.documentElement.classList.add("js")</script>`,
    `<script type="application/ld+json">${JSON.stringify(
      buildProductLd(p, canonicalUrl, desc, img)
    )}</script>`,
    `<script type="application/ld+json">${JSON.stringify(
      buildBreadcrumbLd([
        { name: "Home", url: "https://vapespot.store/" },
        { name: title, url: canonicalUrl },
      ])
    )}</script>`,
  ].filter(Boolean);

  const headContent = headTags.join("\n    ");
  const newHead = `${headContent}\n    ${prodScriptTag}\n    ${prodCssTag}\n  </head>`;
  let html = template.replace(
    /<head>[\s\S]*?<\/head>/,
    `<head>\n    ${newHead}`
  );

  // ── Maillage interne : related (même marque, sinon même catégorie) ──
  const related = [];
  const relPool = (leaf?.products || []).filter((x) => x && x.id && x.id !== p.id);
  const sameBrand = relPool.filter(
    (x) => p.brand && x.brand && String(x.brand).toLowerCase() === String(p.brand).toLowerCase()
  );
  const seenRel = new Set();
  for (const el of [...sameBrand, ...relPool].slice(0, RELATED_N)) {
    if (seenRel.has(el.id)) continue;
    seenRel.add(el.id);
    related.push(el);
  }
  const relatedCards = related.slice(0, RELATED_N).map(cardHTML).join("\n        ");
  // ── Available in stores : le produit -> les principales villes ──
  const storeAnchors = storeLinksHTML(storeSlugs);

  let bodySeo = "";
  if (relatedCards) bodySeo += seoBlock("You may also like", "seo-dupe", relatedCards);
  if (storeAnchors) {
    bodySeo += `\n<section class="seo-block seo-stores"><h2>Available in our stores</h2>` +
      `<div class="seo-grid">${storeAnchors}</div></section>`;
  }
  if (bodySeo) html = html.replace("</body>", bodySeo + "\n  </body>");

  const outDir = join(DIST, "product", idSafe);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf-8");
  prodCount++;
}

// ════ 4b. Catégories (e-commerce) — /products/<slug>/ ═══════════════
// Pages « portes d'entrée » du catalogue : prérendues pour Google,
// miroir exact de la SPA (resolveLeaf côté client). 2 cas :
//  - catégorie avec leaf (file) → liste de produits (ItemList + cartes),
//  - catégorie sans leaf → « CategoryPicker » : liens vers chaque
//    sous-catégorie (avec ?sub= et ?subsub= si besoin).
const catalogueMeta = JSON.parse(
  readFileSync(join(ROOT, "public", "data", "meta.json"), "utf-8")
);
const CAT_BASE = "https://vapespot.store/products/";
let catCount = 0;

/** Produits d'une catégorie si elle a un fichier leaf direct, sinon null. */
function catProducts(cat) {
  if (!cat.file) return null;
  try {
    const leaf = loadLeaf(cat.file);
    return Array.isArray(leaf?.products) ? leaf.products.filter((p) => p && p.id) : null;
  } catch {
    return null;
  }
}

for (const cat of catalogueMeta.categories) {
  if (!cat || !cat.slug) continue;
  const label = cat.label || cat.slug;
  const canonicalUrl = `${CAT_BASE}${cat.slug}/`;

  const products = catProducts(cat);
  let desc, blockTitle, blockContent, listItems;
  if (products) {
    listItems = products.slice(0, 100).map((p) => ({
      name: String(p.name || p.series || p.brand || label).trim(),
      url: `https://vapespot.store/product/${p.id}/`,
    }));
    desc = `Shop ${label} at Vape Spot Australia — ${products.length} products from genuine brands. Fast courier delivery across Australia.`;
    blockTitle = `Shop ${label} (${products.length} products)`;
    blockContent = products.slice(0, 60).map(cardHTML).join("\n        ");
  } else {
    // Picker : chaque sous-catégorie (ou sous-sous) qui mène à un fichier.
    const entries = [];
    for (const sub of cat.subcategories || []) {
      if (sub.file) {
        entries.push({ label: sub.label, url: `${CAT_BASE}${cat.slug}/?sub=${sub.slug}`, count: sub.count });
      } else {
        for (const ss of sub.sub_subcategories || []) {
          if (ss.file) {
            entries.push({ label: ss.label, url: `${CAT_BASE}${cat.slug}/?sub=${sub.slug}&subsub=${ss.slug}`, count: ss.count });
          }
        }
      }
    }
    listItems = entries.map((e) => ({ name: e.label, url: e.url }));
    desc = `Browse ${label} at Vape Spot Australia — ${entries.length} categories. Genuine brands, fast AU delivery.`;
    blockTitle = `Browse ${label}`;
    blockContent = entries.map(
      (e) => `<a class="seo-link" href="${escapeHtml(e.url)}"><span class="seo-name">${escapeHtml(e.label)}${e.count ? ` (${e.count})` : ""}</span></a>`
    ).join("\n        ");
  }

  if (!listItems || listItems.length === 0) continue;

  const headTags = [
    `<title>${escapeHtml(label)} | Vape Spot Australia</title>`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:title" content="${escapeHtml(label)} | Vape Spot Australia" />`,
    `<meta property="og:description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<meta name="geo.country" content="AU" />`,
    `<meta name="geo.placename" content="Australia" />`,
    `<link rel="alternate" hreflang="en-AU" href="${canonicalUrl}" />`,
    `<link rel="icon" href="/favicon.ico" sizes="48x48" />`,
    `<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<script>document.documentElement.classList.add("js")</script>`,
    `<script type="application/ld+json">${JSON.stringify(
      buildBreadcrumbLd([
        { name: "Home", url: "https://vapespot.store/" },
        // Pas de niveau « Products » : il n'existe pas de page /products/ à
        // laquelle pointer un `item`, or Google exige `item` sur chaque
        // ListItem sauf le dernier → breadcrumb Home > <Label> où chaque
        // item a une URL valide (corrige l'« invalid item » GSC 08/08).
        { name: label, url: canonicalUrl },
      ])
    )}</script>`,
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: listItems.slice(0, 100).map((it, i) => ({
        "@type": "ListItem", position: i + 1, name: it.name, url: it.url,
      })),
    })}</script>`,
  ];

  const headContent = headTags.join("\n    ");
  const newHead = `${headContent}\n    ${prodScriptTag}\n    ${prodCssTag}\n  </head>`;
  let html = template.replace(/<head>[\s\S]*?<\/head>/, `<head>\n    ${newHead}`);
  html = html.replace("</body>", seoBlock(blockTitle, "seo-cat", blockContent) + "\n  </body>");

  const outDir = join(DIST, "products", cat.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf-8");
  catCount++;
}

// ════ 4c. Guides (blog) — /guides/ + /guides/<slug>/ ══════════════
// Articles Soro : pages statiques double couche (head SEO + JSON-LD Article/
// FAQPage + bloog contenu en .seo-block masqué au JS). Google lit le HTML
// direct ; l'humain reçoit la SPA React qui rend la même idée (§ parité).
let guides = { guides: [] };
try {
  guides = JSON.parse(readFileSync(join(ROOT, "src", "data", "guides.json"), "utf-8"));
} catch {}

const GUIDE_BASE = "https://vapespot.store/guides/";
const guideScriptTag = prodScriptTag;
const guideCssTag = prodCssTag;

function guideContentHTML(g) {
  const esc = escapeHtml;
  const sections = (g.sections || []).map((s) => {
    const body = (s.body || []).map((p) => `<p>${esc(p)}</p>`).join("");
    const list = s.list && s.list.length
      ? `<ul>${s.list.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>` : "";
    return `<h2>${esc(s.heading)}</h2>${body}${list}`;
  }).join("");
  const faq = (g.faq || []).length
    ? `<h2>Frequently asked questions</h2>` +
      g.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("") : "";
  const related = (g.links || []).map((l) =>
    `<p><a href="${esc(`https://vapespot.store${l.to}`)}">${esc(l.label)}</a></p>`).join("");
  return `<p>${esc(g.date)} · ${esc(g.readTime)}</p>` +
    `<p><img src="${esc(g.hero.image)}" alt="${esc(g.hero.alt)}"></p>` +
    `<p>${esc(g.intro)}</p>${sections}` +
    (related ? `<p><strong>Related products:</strong></p>${related}` : "") +
    faq +
    `<p><a href="${esc(`https://vapespot.store${g.cta.to}`)}">${esc(g.cta.title)}</a></p>`;
}

function guideArticleLd(g) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.metaDescription,
    image: g.hero.image,
    datePublished: g.date,
    author: { "@type": "Organization", name: "Vape Spot", url: "https://vapespot.store/" },
    publisher: { "@type": "Organization", name: "Vape Spot" },
    mainEntityOfPage: `${GUIDE_BASE}${g.slug}/`,
  };
}

/**
 * JSON-LD BreadcrumbList générique : [Home, ...pages] — le dernier item porte
 * l'URL de la page courante. Google affiche le fil d'Ariane dans les SERPs.
 */
function buildBreadcrumbLd(path) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: path.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.name,
      ...(p.url ? { item: p.url } : {}),
    })),
  };
}

// Page index /guides/ : liste des guides + JSON-LD ItemList.
const gBaseHead = [
  `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
  `<link rel="icon" href="/favicon.ico" sizes="48x48" />`,
  `<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />`,
  `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
  `<script>document.documentElement.classList.add("js")</script>`,
];
const gIdxCards = guides.guides.map((g) =>
  `\n  <article><h2>${escapeHtml(g.title)}</h2>` +
  `<p>${escapeHtml(g.category)} · ${escapeHtml(g.readTime)}</p>` +
  `<p>${escapeHtml(g.intro)}</p>` +
  `<p><a href="${GUIDE_BASE}${g.slug}/">Read guide</a></p></article>`
).join("");
const gIdxHead = [
  `<title>Vape Guides Australia — Vape Spot</title>`,
  `<meta name="description" content="Practical vape guides for Australia: how to fix a dry hit, does vaping smell, vape laws, puff counts and more." />`,
  `<meta property="og:title" content="Vape Guides Australia — Vape Spot" />`,
  `<meta property="og:type" content="website" />`,
  `<meta property="og:url" content="${GUIDE_BASE}" />`,
  `<link rel="canonical" href="${GUIDE_BASE}" />`,
  // Ciblage australien : hreflang en-AU + geo → signale clairement à Google
  // que la page est destinée au public d'Australie (pas de signal US).
  `<link rel="alternate" hreflang="en-AU" href="${GUIDE_BASE}" />`,
  `<meta name="geo.country" content="AU" />`,
  `<meta name="geo.placename" content="Australia" />`,
  ...gBaseHead,
  `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: guides.guides.map((g, i) => ({
      "@type": "ListItem", position: i + 1,
      url: `${GUIDE_BASE}${g.slug}/`, name: g.title,
    })),
  })}</script>`,
  `<script type="application/ld+json">${JSON.stringify(
    buildBreadcrumbLd([
      { name: "Home", url: "https://vapespot.store/" },
      { name: "Vape Guides", url: GUIDE_BASE },
    ])
  )}</script>`,
].join("\n    ");
const gIdxPage = template.replace(
  /<head>[\s\S]*?<\/head>/,
  `<head>\n    ${gIdxHead}\n    ${guideScriptTag}\n    ${guideCssTag}\n  </head>`
).replace("</body>",
  `<section class="seo-block seo-guides"></section>`.replace("</section>", `${gIdxCards}\n  </section>`).replace("</body>", "</body>")
);
// NOTE: le bloc ci-dessus doit rester masqué quand JS actif → le composant
// GuidesHome rend déjà la même liste. On injecte les cartes.
mkdirSync(join(DIST, "guides"), { recursive: true });
writeFileSync(join(DIST, "guides", "index.html"), gIdxPage, "utf-8");

// Page par article.
for (const g of guides.guides) {
  const canonical = `${GUIDE_BASE}${g.slug}/`;
  const head = [
    `<title>${escapeHtml(g.title)} — Vape Spot</title>`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<meta name="description" content="${escapeHtml(g.metaDescription)}" />`,
    `<meta property="og:title" content="${escapeHtml(g.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(g.metaDescription)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:image" content="${escapeHtml(g.hero.image)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    // Ciblage australien : hreflang en-AU + geo (même signal que les villes,
    // requis pour dire à Google que l'article vise le public AU).
    `<link rel="alternate" hreflang="en-AU" href="${canonical}" />`,
    `<meta name="geo.country" content="AU" />`,
    `<meta name="geo.placename" content="Australia" />`,
    ...gBaseHead,
    `<script type="application/ld+json">${JSON.stringify(guideArticleLd(g))}</script>`,
    `<script type="application/ld+json">${JSON.stringify(
      buildBreadcrumbLd([
        { name: "Home", url: "https://vapespot.store/" },
        { name: "Vape Guides", url: GUIDE_BASE },
        { name: g.title, url: canonical },
      ])
    )}</script>`,
  ];
  if (g.faq && g.faq.length) {
    head.push(`<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: g.faq.map((f) => ({
        "@type": "Question", name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    })}</script>`);
  }
  let html = template.replace(
    /<head>[\s\S]*?<\/head>/,
    `<head>\n    ${head.join("\n    ")}\n    ${guideScriptTag}\n    ${guideCssTag}\n  </head>`
  ).replace("</body>",
    `\n<section class="seo-block seo-guide">${guideContentHTML(g)}</section>\n  </body>`);

  const outDir = join(DIST, "guides", g.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf-8");
}

// ════ 3c. Homepage : bloc « Popular Products » statique ──────────
// (masqué quand JS actif : le composant live TrendingProducts rend déjà
//  la même section interactive → class seo-dupe.)
const homePool = pickProducts(null, trendPool, HOME_N, "vapespot-home");
const homeCards = homePool.map(cardHTML).join("\n        ");
if (homeCards) {
  // Schema.org homepage : Organization + WebSite (@graph) → dit à Google
  // qui est le site. Pas de SearchAction : le site n'a pas de page de
  // recherche par URL (dialog uniquement) et Google pénalise les
  // searchboxes factices qui n'affichent pas de résultats.
  const homeLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://vapespot.store/#org",
        name: "Vape Spot",
        url: "https://vapespot.store/",
        logo: { "@type": "ImageObject", url: "https://vapespot.store/favicon-192.png" },
        areaServed: "AU",
      },
      {
        "@type": "WebSite",
        "@id": "https://vapespot.store/#website",
        name: "Vape Spot",
        url: "https://vapespot.store/",
        publisher: { "@id": "https://vapespot.store/#org" },
        inLanguage: "en-AU",
      },
    ],
  });
  const homeHtml = template
    .replace(
      "</head>",
      `\n    <script type="application/ld+json">${homeLd}</script>\n  </head>`
    )
    .replace(
      "</body>",
      seoBlock("Popular Products", "seo-dupe", homeCards) + "\n  </body>"
    );
  writeFileSync(join(DIST, "index.html"), homeHtml, "utf-8");
}

console.log(`\n✅ ${count} pages ville + ${prodCount} pages produit + ${catCount} pages catégorie statiques générées dans dist/`);

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