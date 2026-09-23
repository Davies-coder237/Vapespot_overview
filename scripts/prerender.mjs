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

// ── Marques du site (src/data/brands.json) — chargées AVANT la boucle villes
// pour le bloc « Popular brands in <ville> » (Tâche 3). La section 4c réutilise
// ce même objet pour générer les pages /brands/ statiques.
let brandsData = { brands: [] };
try {
  brandsData = JSON.parse(readFileSync(join(ROOT, "src", "data", "brands.json"), "utf-8"));
} catch {}

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
// ── Pool GSC 90 jours (gsc-audit-90j.json, export Search Console) ──
// Tâche 3 : la sélection produits des pages ville doit être pilotée par la
// demande RÉELLE (produits déjà vus/cliqués par Google), pas seulement par la
// rotation déterministe. On charge l'audit s'il existe ; sinon on retombe sur
// l'ancien comportement (gscAvailable = false → aucun changement).
const GSC_CLICK_W = 25, GSC_IMP_W = 0.5;   // échelle ~ brandStateScore (0-100)
const GSC_STAR_MIN = 6;                    // seuil d'entrée du « top GSC »
const STAR_HEAD_N = 8;                     // stars GSC figées en tête (toutes villes)
const gscProduct = new Map();              // id produit -> score
const gscBrand = new Map();                // slug marque -> score (requêtes GSC)
let gscAvailable = false;
try {
  const GSC_AUDIT = JSON.parse(readFileSync(join(ROOT, "gsc-audit-90j.json"), "utf-8"));
  // Pages produit : le produit exact qui a reçu des impressions/clics.
  for (const p of (GSC_AUDIT.pages || [])) {
    const m = String(p.keys[0] || "").match(/\/product\/([^/]+?)\/?$/);
    if (!m) continue;
    gscProduct.set(m[1], (p.clicks || 0) * GSC_CLICK_W + Math.min(60, p.impressions || 0) * GSC_IMP_W);
  }
  // Requêtes : la marque elle-même cherchée/affichée (maillage villes→marques).
  const Q2BRAND_SLUG = [
    [/iget/i, "iget"], [/geek ?vape|geekvape/i, "geekvape"], [/alibarbar/i, "alibarbar"],
    [/gunnpod/i, "gunnpod"], [/voopoo|voo ?poo/i, "voopoo"], [/vaporesso/i, "vaporesso"],
    [/\bhqd\b/i, "hqd"], [/\brelx\b/i, "relx"],
  ];
  for (const r of (GSC_AUDIT.queries || [])) {
    const q = String(r.keys[0] || "");
    for (const [re, slug] of Q2BRAND_SLUG) {
      if (re.test(q)) {
        gscBrand.set(slug, (gscBrand.get(slug) || 0) + (r.clicks || 0) * 10 + (r.impressions || 0) * 0.3);
      }
    }
  }
  gscAvailable = true;
} catch {
  gscAvailable = false;
}
function gscProductScore(id) {
  const g = gscProduct.get(id);
  return g ? Math.min(80, g) : 0;
}

// Petit stable hash (slug -> index) pour la rotation déterministe quand un
// état n'est pas identifiable (aucune donnée Trends).
function stableIdx(s) {
  let h = 0;
  for (const c of String(s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Sélection de produits pour une page : re-scorée par marque/état + demande
// GSC réelle (produits déjà vus/cliqués par Google), puis rotation
// déterministe PAR VILLE (rotationKey = slug) pour que Sydney, Parramatta,
// Blacktown… affichent des sous-ensembles différents, même au sein d'un même
// état. La variété de marques est garantie (1 par marque d'abord, max 2
// ensuite). Sans état (ou sans Trends) : rotation pure.
function pickProducts(abbr, pool, count, rotationKey) {
  const list = pool.map((x, i) => ({ x, i, s: (abbr ? brandStateScore(x.brand, abbr) : 0) + gscProductScore(x.id) }));

  let ordered = list.slice().sort((a, b) => (b.s - a.s) || (a.i - b.i));
  // Tâche 3 : les produits qui ont déjà des impressions/clics sur Google
  // restent EN TÊTE — la rotation par ville ne porte que sur les autres, donc
  // chaque ville garde ses produits stars tout en variant le reste. Le head est
  // PLAFONNÉ (STAR_HEAD_N) : les ~8 stars les plus fortes sont figées partout,
  // les suivantes reculent dans la rotation (elles restent favorisées par leur
  // score à l'intérieur du pool restant). Sans données GSC, `head` est vide →
  // comportement exactement identique à avant.
  if (gscAvailable) {
    const head = ordered.filter((it) => gscProductScore(it.x.id) >= GSC_STAR_MIN).slice(0, STAR_HEAD_N);
    const headIds = new Set(head.map((it) => it.x.id));
    const rest = ordered.filter((it) => !headIds.has(it.x.id));
    const off = stableIdx(rotationKey || "") % Math.max(1, rest.length);
    ordered = head.concat(rest.slice(off), rest.slice(0, off));
  }

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

// ── Bloc « Popular brands in <ville> » (Tâche 3) ───────────────────
// Les 8 marques ayant une page /brands/ statique sont candidates. Le choix est
// piloté par (1) la demande GSC réelle (requêtes marque + impressions produit
// 90 jours), (2) l'intérêt Google Trends de l'État quand l'équivalence marque↔
// requête est EXACTE (GeekVape ≠ Geek Bar — pas de faux mapping), (3) un petit
// bruit déterministe par ville pour varier le bloc entre villes d'un même État.
const BRAND_STORE_N = 6;
const BRAND_TREND_KEY = { iget: "iget vape", voopoo: "voopoo", vaporesso: "vaporesso" };

function cityBrandsFor(slug, cityTag) {
  const abbr = stateYears(cityTag);
  const all = (brandsData.brands || []).map((b) => {
    let s = gscBrand.get(b.slug) || 0;
    const tk = BRAND_TREND_KEY[b.slug];
    if (abbr && tk && stateIndex) {
      s += Number(stateIndex[tk]?.[STATE_ABBR[abbr]] || 0) * 2;
    }
    s += stableIdx(slug + ":" + b.slug) % 24;
    return { brand: b, s };
  });
  return all.sort((a, c) => c.s - a.s).slice(0, BRAND_STORE_N).map((x) => x.brand);
}

/** Même titre que le composant live CityBrands (parité) + liens /brands/. */
function cityBrandLinks(brands, cn) {
  const anchors = brands
    .map((b) => `<a class="seo-store" href="/brands/${b.slug}/">${escapeHtml(b.name)}</a>`)
    .join(" ");
  return seoBlock(`Popular brands ${cn ? "in " + cn : "near you"}`, "seo-brand", anchors);
}

// ── Index de recherche + résolution leaf — remontés AVANT la boucle villes
// pour la sélection produits pilotée GSC (Tâche 3) : les « stars » (produits
// déjà vus/cliqués par Google) rejoignent le feed des pages ville.
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

// Produits « stars » GSC (score ≥ GSC_STAR_MIN) résolus en objets produit
// COMPLETS (feuille leaf → image.card dispo pour les cartes live). Ceux qui
// ne sont plus au catalogue (supprimés) sont écartés.
function buildGscStars() {
  if (!gscAvailable) return [];
  const out = [];
  for (const e of searchIndex) {
    if (gscProductScore(e.id) < GSC_STAR_MIN) continue;
    let p = null;
    try {
      const leaf = loadLeaf(e.file);
      p = (leaf.products || []).find((x) => x.id === e.id) || null;
    } catch {}
    if (p) out.push(p);
  }
  return out;
}
const gscStarProducts = buildGscStars();
if (gscAvailable) {
  console.log(`  ✓ ${gscStarProducts.length} produits stars GSC ajoutés au feed des pages ville`);
} else {
  console.log("  - pas de données GSC (gsc-audit-90j.json) : feed des pages ville inchangé");
}

// Feed des pages ville = best-sellers (trending.json) + stars GSC du
// catalogue (dédoublonnés). Les stars sont poussées en tête par pickProducts
// (seuil GSC_STAR_MIN) → les produits déjà plaçés par Google passent devant.
const feedTrendHas = new Set(trendPool.map((p) => p.id));
const gscStarFeed = gscStarProducts.filter((p) => !feedTrendHas.has(p.id));
const cityFeed = trendPool.concat(gscStarFeed);

// ── 3. Générer une page par slug ───────────────────────────────────
let count = 0;
// Map slug -> [ids produits] : écrite dans dist/data/city-products.json pour
// que le composant live CityProducts affiche EXACTEMENT la même liste que
// les liens statiques vus par Google (parité humain/crawler).
const cityProductsMap = {};
// Map slug -> [slugs marques] : écrite dans dist/data/city-brands.json pour
// le composant live CityBrands (même parité, bloc « Popular brands in <ville> »).
const cityBrandsMap = {};

for (const listing of listings) {
  const { slug, businessName, description, address, cityTag } = listing;
  const schema = schemaBySlug[slug];

  // Construire le title
  const title = `${businessName} | Vape Spot Australia`;

  // Construire l'URL canonique — AVEC slash final (11/08) : uniforme avec le
  // sitemap + produits/catégories/guides. La forme sans slash reste servie en
  // 200 par le rewrite _redirects (les 22 villes déjà indexées sans slash ne
  // cassent pas) mais le canonical impose la forme slash à Google.
  const canonicalUrl = `https://vapespot.store/${slug}/`;

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
  const cityPool = st ? pickProducts(st, cityFeed, CITY_N, slug)
                      : pickProducts(null, cityFeed, CITY_N, slug);
  const cityCards = cityPool.map(cardHTML).join("\n        ");
  cityProductsMap[slug] = cityPool.map((p) => p.id);
  const cityTitle = `Popular vape products ${cityName(listing) ? "in " + cityName(listing) : "near you"}`;
  if (cityCards) {
    html = html.replace("</body>", seoBlock(cityTitle, "seo-city", cityCards) + "\n  </body>");
  }

  // ── Tâche 3 : bloc « Popular brands in <ville> » → pages /brands/ ──
  // L'autorité des villes (pos 1-8 mobile) descend vers les 8 pages marques.
  // Même choix réécrit dans dist/data/city-brands.json pour la parité live.
  const cnBrand = cityName(listing);
  const cityBrands = cityBrandsFor(slug, cityTag);
  cityBrandsMap[slug] = cityBrands.map((b) => b.slug);
  const brandLinks = cityBrandLinks(cityBrands, cnBrand);
  if (brandLinks) {
    html = html.replace("</body>", brandLinks + "\n  </body>");
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
// Map ville -> [slugs marques] pour le composant live CityBrands (Tâche 3)
writeFileSync(join(cityDataDir, "city-brands.json"), JSON.stringify(cityBrandsMap), "utf-8");
// Stars GSC en objets produit COMPLETS : le composant live CityProducts les
// fusionne avec trending.json pour résoudre les ids du bloc ville (parité).
writeFileSync(join(cityDataDir, "city-star-products.json"), JSON.stringify(gscStarProducts), "utf-8");

// ── Avis clients (Tâche 6) : mini-base locale, TEXTE uniquement (jamais de
// schema étoiles pour le vape). Injectée dans le seo-block du produit si ce
// produit a des avis → Google voit du contenu « social proof » statique.
let reviewsData = [];
try {
  reviewsData = JSON.parse(
    readFileSync(join(ROOT, "src", "data", "reviews.json"), "utf-8")
  );
} catch {}
const reviewsByProduct = new Map();
for (const r of reviewsData) {
  if (!reviewsByProduct.has(r.productId)) reviewsByProduct.set(r.productId, []);
  reviewsByProduct.get(r.productId).push(r);
}
function reviewsBlockHTML(productId) {
  const mine = reviewsByProduct.get(productId) || [];
  if (!mine.length) return "";
  const cards = mine.map((r) => {
    const full = String(r.rating || 0) + "/5";
    return `<blockquote class="seo-review"><p>“${escapeHtml(r.text)}”</p>` +
      `<footer>${escapeHtml(r.author)}, ${escapeHtml(r.city)} · ${escapeHtml(r.date)} · ${full}` +
      (r.verified ? ` · <span class="seo-review-badge">Verified order</span>` : "") +
      `</footer></blockquote>`;
  }).join("");
  return `\n<section class="seo-block seo-reviews"><h2>What our customers say</h2>` +
    `<div class="seo-grid">${cards}</div></section>`;
}

// ════ 4. Pages produit statiques (une par produit de search.json) ════
// Même logique que les villes : un index.html unique par produit, avec
// title/description/JSON-LD Product → Google voit du contenu direct.
// (searchIndex + loadLeaf sont définis avant la boucle villes — Tâche 3.)

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
  // Avis clients (Tâche 6) — texte seul, même rendu que le bloc SPA
  bodySeo += reviewsBlockHTML(String(entry.id));
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

  // Table de prix (Tâche 4, injection prix) — affichée juste après l'intro,
  // exactement comme dans le composant SPA guides.$slug (parité). La 1ère
  // colonne porte le lien produit absolu (maillage interne vers /product/).
  const pt = g.priceTable;
  const headEsc = (h) => `<th>${esc(h)}</th>`;
  const priceTable = pt && pt.rows && pt.rows.length
    ? `<h2>${esc(pt.title || "Prices at Vape Spot")}</h2>` +
      `<table class="seo-table"><thead><tr>${pt.header.map(headEsc).join("")}</tr></thead><tbody>` +
      pt.rows.map((r) => {
        const first = r.to
          ? `<td><a href="${esc(`https://vapespot.store${r.to}`)}">${esc(r.label)}</a></td>`
          : `<td>${esc(r.label)}</td>`;
        return `<tr>${first}${r.cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`;
      }).join("") + `</tbody></table>` +
      (pt.note ? `<p>${esc(pt.note)}</p>` : "")
    : "";

  // Co-signaux E-E-A-T (Tâche 6) : chaque article pointe vers les pages
  // institutionnelles (About/Delivery/Returns/Contact) → Google voit que
  // l'entreprise est « réelle » (À propos + politique livraison/retours).
  const instNav =
    `<p><strong>Vape Spot policies:</strong> <a href="https://vapespot.store/about/">About Vape Spot</a> · ` +
    `<a href="https://vapespot.store/delivery/">Delivery &amp; Shipping</a> · ` +
    `<a href="https://vapespot.store/returns/">Returns &amp; Refunds</a> · ` +
    `<a href="https://vapespot.store/contact/">Contact us</a></p>`;

  return `<p>${esc(g.date)} · ${esc(g.readTime)}</p>` +
    `<p><img src="${esc(g.hero.image)}" alt="${esc(g.hero.alt)}"></p>` +
    `<p>${esc(g.intro)}</p>${priceTable}${sections}` +
    (related ? `<p><strong>Related products:</strong></p>${related}` : "") +
    faq +
    instNav +
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

// ════ 4c. Pages marques /brands/ — Tâche 2 du cahier des charges ═══
// Les marques top-volume du catalogue réel (comptées dans search.json) ont
// une page statique chacune : H1 "<Brand> Australia", intro éditoriale,
// tableau comparatif des principaux modèles (puffs / prix / prix-per-puff /
// rechargeable), FAQ (People Also Ask), grille produits (liens internes →
// /product/) et liens vers les villes. Même pattern que villes/guides.
// Le même contenu est écrit dans dist/data/brand-products.json → le
// composant SPA brands.$slug fait exactement le même rendu (parité).
// (brandsData est chargé en tête de fichier, avant la boucle villes — utilisé
// aussi par le bloc « Popular brands in <ville> » de la Tâche 3.)
const BRAND_BASE = "https://vapespot.store/brands/";
const SHOW_MODELS = 8;   // lignes du tableau comparatif
const SHOW_CARDS = 12;   // cartes produit de la grille (liens internes)
const esc = escapeHtml;

// Nombre d'APPAREILS d'une marque dans le catalogue réel (search index).
// Uniquement les produits sous e-cigarettes/ : les consommables (coils,
// pods de remplacement, drip tips, adaptateurs, pouches, e-liquids…) ne
// doivent jamais apparaître sur une page marque.
function isDevice(e) {
  return (e.path && e.path[0]) === "e-cigarettes";
}
function productsCountFor(name) {
  const n = String(name || "").trim().toLowerCase();
  return searchIndex.filter(
    (e) => String(e.brand || "").trim().toLowerCase() === n && isDevice(e)
  ).length;
}

/**
 * Regroupe les produits d'une marque PAR SÉRIE → 1 « modèle » par série
 * (le moins cher) : un appareil IGET Bar 3500 = 1 ligne au tableau, pas ses
 * 25 variantes de goût. Specs (puffs / rechargeable) lues dans le fichier
 * leaf du produit (le search index ne contient pas specs).
 */
// Listings « bulk » / « pod only » : ne doivent pas représenter un appareil
// au tableau ni polluer la grille (« Ingot 9000 10 Pack », « Pandora 7K 10
// Pcs », « 25k WTF Pod Only », « one chupa 10 pack »…). On préfère l'unité
// simple ; repli sur le bulk seulement s'il n'y a rien d'autre.
const BULKY = /(\b(10|3|5|2)\b\s*(pcs|pack)s?\b|pack of|multi.?pack|bulk|pod only|replacement|refill|carton)/i;
const isBulkyName = (n) => BULKY.test(n || "");
// tri : unité simple d'abord, puis prix croissant
const rankModel = (a, b) => (Number(isBulkyName(a.name)) - Number(isBulkyName(b.name))) || (a.price_aud - b.price_aud) || (a.id < b.id ? -1 : 1);

function brandModels(products) {
  const bySeries = new Map();
  for (const e of products) {
    const leaf = loadLeaf(e.file);
    const full = leaf?.products?.find((x) => x.id === e.id);
    const specs = full?.specs || {};
    const puffs = Number(String(specs.puff_count || specs.puffs || "").replace(/[^0-9.]/g, "")) || 0;
    const re = !/none|not recharge/i.test(String(specs.charging_port || ""));
    const row = {
      id: e.id,
      name: e.name,
      series: e.series || e.name,
      price_aud: e.price_aud,
      puffs,
      rechargeable: re,
      img: full?.image?.card || e.thumb || "",
    };
    const key = String(row.series).toLowerCase().trim();
    if (!bySeries.has(key) || rankModel(row, bySeries.get(key)) < 0) bySeries.set(key, row);
  }
  return [...bySeries.values()].sort((a, b) => a.price_aud - b.price_aud);
}

// Tableau comparatif : les <n> principaux modèles de la marque.
function brandTableHTML(models) {
  if (!models.length) return "";
  const rows = models.slice(0, SHOW_MODELS).map((m) => {
    const per1k = m.puffs > 0 ? (m.price_aud / m.puffs * 1000).toFixed(2) : "—";
    return `<tr>` +
      `<td><a href="https://vapespot.store/product/${esc(m.id)}/">${esc(m.series)}</a></td>` +
      `<td>${m.puffs ? m.puffs.toLocaleString("en-AU") : "—"}</td>` +
      `<td>A$${m.price_aud}</td>` +
      `<td>${m.puffs > 0 ? `A$${per1k}` : "—"}</td>` +
      `<td>${m.rechargeable ? "Yes" : "No"}</td></tr>`;
  }).join("");
  return `<table class="seo-table"><thead><tr>` +
    `<th>Device</th><th>Puffs</th><th>Price (AUD)</th><th>A$ per 1,000 puffs</th><th>Rechargeable</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`;
}

// Grille produits : jusqu'à SHOW_CARDS cartes = un produit par série d'abord
// (familles diverses), puis des variantes de goût des mêmes séries (quand une
// marque n'a que 3 familles — HQD/RELX — on pioche 4 variantes par série pour
// garder un vrai maillage interne). Retourne les objets bruts : le HTML
// statique et le JSON de parité SPA sont construits depuis la même liste.
function brandGridCards(products) {
  // unités simples en tête (les listings multi-pack ne sont pris qu'en repli)
  const single = products.filter((e) => !isBulkyName(e.name));
  const bulk = products.filter((e) => isBulkyName(e.name));
  const sorted = [...(single.length ? single : bulk)].slice().sort((a, b) => a.price_aud - b.price_aud);
  const picked = [];
  const seriesCount = new Map();
  const seenId = new Set();

  // passe 1 : un produit par série
  const perSeries = new Map();
  for (const e of sorted) {
    const key = String(e.series || e.name).toLowerCase().trim();
    if (!perSeries.has(key)) perSeries.set(key, e);
  }
  for (const e of perSeries.values()) {
    if (picked.length >= SHOW_CARDS) break;
    picked.push(e); seenId.add(e.id);
    const key = String(e.series || e.name).toLowerCase().trim();
    seriesCount.set(key, (seriesCount.get(key) || 0) + 1);
  }
  // passe 2 : variantes de goût (max 2 par série) — unités simples d'abord
  const rest = [...sorted.filter((e) => !seenId.has(e.id)), ...bulk.filter((e) => !seenId.has(e.id))];
  for (const e of rest) {
    if (picked.length >= SHOW_CARDS) break;
    if (seenId.has(e.id)) continue;
    const key = String(e.series || e.name).toLowerCase().trim();
    if ((seriesCount.get(key) || 0) >= 2) continue;
    picked.push(e); seenId.add(e.id);
    seriesCount.set(key, (seriesCount.get(key) || 0) + 1);
  }

  // objets minimalistes pour carte + JSON de parité
  return picked.map((e) => {
    const leaf = loadLeaf(e.file);
    const full = leaf?.products?.find((x) => x.id === e.id);
    return {
      id: e.id,
      name: e.name,
      price_aud: e.price_aud,
      img: full?.image?.card || e.thumb || "",
    };
  });
}

// ── pages marques ──
const brandProductsJson = {};
let brandCount = 0;
for (const b of (brandsData.brands || [])) {
  const allProducts = searchIndex.filter(
    (e) => String(e.brand || "").trim().toLowerCase() === String(b.name).trim().toLowerCase()
  );
  // Uniquement les APPAREILS (sous e-cigarettes/) : les pouches Alibarbar,
  // coils/drip-tips GeekVape, e-liquids Vaporesso etc. n'ont rien à faire
  // sur une page marque (remontés car moins chers que les devices).
  const products = allProducts.filter(isDevice);
  if (!products.length) continue;
  const models = brandModels(products);
  const canonical = `${BRAND_BASE}${b.slug}/`;
  const intro = (b.intro || []).map((p) => `<p>${esc(p)}</p>`).join("");
  const faq = (b.faq || []).length
    ? `<h2>Frequently asked questions about ${esc(b.name)}</h2>` +
      b.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("") : "";
  const table = brandTableHTML(models);
  const gridObjs = brandGridCards(products);
  const cards = gridObjs.map((o) => cardHTML({ id: o.id, name: o.name, image: { card: o.img }, price_aud: o.price_aud })).join("\n        ");
  const storeAnchors = storeLinksHTML(storeSlugs);

  const head = [
    `<title>${esc(b.title)} | Vape Spot Australia</title>`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<meta name="description" content="${esc(b.metaDescription)}" />`,
    `<meta property="og:title" content="${esc(b.title)}" />`,
    `<meta property="og:description" content="${esc(b.metaDescription)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:type" content="website" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<link rel="alternate" hreflang="en-AU" href="${canonical}" />`,
    `<meta name="geo.country" content="AU" />`,
    `<meta name="geo.placename" content="Australia" />`,
    `<link rel="icon" href="/favicon.ico" sizes="48x48" />`,
    `<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<script>document.documentElement.classList.add("js")</script>`,
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: gridObjs.map((m, i) => ({
        "@type": "ListItem", position: i + 1,
        url: `https://vapespot.store/product/${m.id}/`, name: m.name,
      })),
    })}</script>`,
    `<script type="application/ld+json">${JSON.stringify(
      buildBreadcrumbLd([
        { name: "Home", url: "https://vapespot.store/" },
        { name: "Vape Brands", url: BRAND_BASE },
        { name: `${b.name} Australia`, url: canonical },
      ])
    )}</script>`,
  ];
  if ((b.faq || []).length) {
    head.push(`<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: b.faq.map((f) => ({
        "@type": "Question", name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    })}</script>`);
  }

  let html = template.replace(
    /<head>[\s\S]*?<\/head>/,
    `<head>\n    ${head.join("\n    ")}\n    ${guideScriptTag}\n    ${guideCssTag}\n  </head>`
  );
  const content =
    `<section class="seo-block seo-brand"><h1>${esc(b.name)} Australia</h1>` +
    `${intro}` +
    `<h2>Compare ${esc(b.name)} models</h2>${table}` +
    `<h2>Shop popular ${esc(b.name)} products</h2>` +
    `<div class="seo-grid">${cards}</div>${faq}` +
    seoBlock("Available in our stores", "seo-stores", storeAnchors) +
    `</section>`;
  html = html.replace("</body>", `\n${content}\n  </body>`);

  const outDir = join(DIST, "brands", b.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf-8");
  brandProductsJson[b.slug] = { name: b.name, models, grid: gridObjs };
  brandCount++;
  console.log(`  ✓ page marque ${b.name} (${allProducts.length} produits, dont ${products.length} appareils → ${models.length} modèles)`);
}

// ── index /brands/ : hub + tableau comparatif transversal ──
if (brandsData.brands && brandsData.brands.length) {
  const B_BASE = BRAND_BASE;
  const brandRows = [];
  for (const b of brandsData.brands) {
    const n = (brandProductsJson[b.slug]?.models || []).length;
    brandRows.push(`<tr><td><a href="${B_BASE}${b.slug}/">${esc(b.name)}</a></td>` +
      `<td>${productsCountFor(b.name)}</td>` +
      `<td>${n}</td></tr>`);
  }
  const bIdxCards = (brandsData.brands || []).map((b) =>
    `<article class="seo-card"><a href="${B_BASE}${b.slug}/">` +
    `<span class="seo-name">${esc(b.name)} Australia</span>` +
    `<span class="seo-price">${productsCountFor(b.name)} products</span></a></article>`
  ).join("");
  const bIdxHead = [
    `<title>Vape Brands Australia — IGET, Kuz, UMIN, Alibarbar, Geek Bar & More | Vape Spot Australia</title>`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<meta name="description" content="All the vape brands Vape Spot stocks in Australia: IGET, Alibarbar, Kuz, UMIN, Geek Bar, GeekVape, Gunnpod, VooPoo, Vaporesso, HQD and RELX — with model comparisons, prices and fast courier delivery." />`,
    `<meta property="og:title" content="Vape Brands Australia — Vape Spot" />`,
    `<meta property="og:url" content="${B_BASE}" />`,
    `<meta property="og:type" content="website" />`,
    `<link rel="canonical" href="${B_BASE}" />`,
    `<link rel="alternate" hreflang="en-AU" href="${B_BASE}" />`,
    `<meta name="geo.country" content="AU" />`,
    `<meta name="geo.placename" content="Australia" />`,
    `<link rel="icon" href="/favicon.ico" sizes="48x48" />`,
    `<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<script>document.documentElement.classList.add("js")</script>`,
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: (brandsData.brands || []).map((b, i) => ({
        "@type": "ListItem", position: i + 1,
        url: `${B_BASE}${b.slug}/`, name: `${b.name} Australia`,
      })),
    })}</script>`,
    `<script type="application/ld+json">${JSON.stringify(
      buildBreadcrumbLd([
        { name: "Home", url: "https://vapespot.store/" },
        { name: "Vape Brands", url: B_BASE },
      ])
    )}</script>`,
  ].join("\n    ");

  const bIdxPage = template.replace(
    /<head>[\s\S]*?<\/head>/,
    `<head>\n    ${bIdxHead}\n    ${guideScriptTag}\n    ${guideCssTag}\n  </head>`
  ).replace("</body>",
    `\n<section class="seo-block seo-brand">` +
    `<h1>Vape Brands Australia</h1>` +
    `<p>Vape Spot stocks the brands Australian vapers actually search for. Compare models, puffs and prices across each range, then order for fast courier delivery in Sydney, Melbourne, Brisbane, Perth, Adelaide, Hobart, Darwin and Canberra.</p>` +
    `<h2>Our brands at a glance</h2>` +
    `<table class="seo-table"><thead><tr><th>Brand</th><th>Products</th><th>Model families</th></tr></thead><tbody>${brandRows.join("")}</tbody></table>` +
    `<h2>Shop by brand</h2><div class="seo-grid">${bIdxCards}</div>` +
    `</section>\n  </body>`
  );
  mkdirSync(join(DIST, "brands"), { recursive: true });
  writeFileSync(join(DIST, "brands", "index.html"), bIdxPage, "utf-8");
}

// Parité SPA : mêmes listes de modèles que le HTML statique.
if (Object.keys(brandProductsJson).length) {
  const outDir = join(DIST, "data");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "brand-products.json"), JSON.stringify(brandProductsJson, null, 2), "utf-8");
  console.log(`  ✓ ${Object.keys(brandProductsJson).length} marques → dist/data/brand-products.json (parité SPA)`);
}

// ════ 4e. Pages institutionnelles — Tâche 6 (E-E-A-T) ══════════════
// /about/ /delivery/ /returns/ /contact/ : prérendues pour Google avec head
// SEO complet (title/description/canonical/geo AU/hreflang en-AU/JSON-LD) ET
// un seo-block de contenu (masqué quand JS actif → l'humain voit le composant
// SPA InstitutionalPage qui rend la même chose : parité). Liées entre elles
// (crossLinks) + à la home (breadcrumb) = maillage institutionnel.
let institutionalData = { contact: {}, pages: [] };
try {
  institutionalData = JSON.parse(
    readFileSync(join(ROOT, "src", "data", "institutional.json"), "utf-8")
  );
} catch {}

const INST_BASE = "https://vapespot.store/";

function institutionalContentHTML(pg) {
  const esc = escapeHtml;
  const isContact = pg.slug === "contact";
  let out = `<p>${esc(pg.intro)}</p>`;

  // Bloc contact (page /contact uniquement — miroir du composant SPA)
  if (isContact) {
    out += `<h2>Contact details</h2><p>Telegram: <strong>@${esc(institutionalData.contact.telegram)}</strong></p>` +
      `<p>Email: <strong>${esc(institutionalData.contact.email)}</strong></p>` +
      `<p><a href="${esc(institutionalData.contact.telegramUrl)}">Open a chat on Telegram →</a></p>`;
  }

  for (const s of pg.sections) {
    out += `<h2>${esc(s.heading)}</h2>` +
      (s.body || []).map((p) => `<p>${esc(p)}</p>`).join("") +
      (s.list && s.list.length
        ? `<ul>${s.list.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>`
        : "");
  }

  if (pg.faq.length) {
    out += `<h2>Frequently asked questions</h2>` + pg.faq.map((f) =>
      `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("");
  }

  if (pg.crossLinks.length) {
    out += `<h2>Useful information</h2>` + pg.crossLinks.map((l) =>
      `<p><a href="${esc(`https://vapespot.store${l.to}`)}">${esc(l.label)}</a></p>`).join("");
  }

  out += `<p><a href="${isContact ? esc(institutionalData.contact.telegramUrl) : esc(`https://vapespot.store${pg.cta.to}`)}">${isContact ? "Open a chat on Telegram →" : esc(pg.cta.title)}</a></p>`;
  out += `<p>${esc(institutionalData.contact.ageNote)}</p>`;
  return out;
}

for (const pg of institutionalData.pages) {
  const canonical = `${INST_BASE}${pg.slug}/`;
  const isContact = pg.slug === "contact";
  const isDelivery = pg.slug === "delivery";
  const isReturns = pg.slug === "returns";

  const head = [
    `<title>${escapeHtml(pg.title)} — Vape Spot</title>`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<meta name="description" content="${escapeHtml(pg.metaDescription)}" />`,
    `<meta property="og:title" content="${escapeHtml(pg.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(pg.metaDescription)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:type" content="website" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<link rel="alternate" hreflang="en-AU" href="${canonical}" />`,
    `<meta name="geo.country" content="AU" />`,
    `<meta name="geo.placename" content="Australia" />`,
    `<link rel="icon" href="/favicon.ico" sizes="48x48" />`,
    `<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<script>document.documentElement.classList.add("js")</script>`,
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": isContact ? "ContactPage" : "AboutPage",
      name: pg.title,
      description: pg.metaDescription,
      url: canonical,
      mainEntity: isContact ? {
        "@type": "Organization",
        name: institutionalData.contact.name,
        url: "https://vapespot.store/",
        email: `mailto:${institutionalData.contact.email}`,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: `mailto:${institutionalData.contact.email}`,
          url: institutionalData.contact.telegramUrl,
          availableLanguage: "en-AU",
        },
      } : undefined,
    })}</script>`,
    `<script type="application/ld+json">${JSON.stringify(
      buildBreadcrumbLd([
        { name: "Home", url: "https://vapespot.store/" },
        { name: pg.title, url: canonical },
      ])
    )}</script>`,
  ];

  // FAQPage JSON-LD pour Delivery & Returns (questions People Also Ask)
  if ((isDelivery || isReturns) && pg.faq.length) {
    head.push(`<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: pg.faq.map((f) => ({
        "@type": "Question", name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    })}</script>`);
  }

  let html = template.replace(
    /<head>[\s\S]*?<\/head>/,
    `<head>\n    ${head.filter(Boolean).join("\n    ")}\n    ${guideScriptTag}\n    ${guideCssTag}\n  </head>`
  ).replace("</body>",
    `\n<section class="seo-block seo-institutional">${institutionalContentHTML(pg)}</section>\n  </body>`);

  const outDir = join(DIST, pg.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf-8");
  console.log(`  ✓ /${pg.slug}/ prérendu (contenu institutionnel + JSON-LD)`);
}
console.log(`  ✓ ${institutionalData.pages.length} pages institutionnelles (E-E-A-T)`);

// ════ 4d. Pages utilitaires client-only (shell SPA) ─────────────────
// Routes sans contenu SEO statique (discover / my-list / order-summary)
// + /products/ (index = <Navigate> client vers la home). Pré-rendues en
// shell vite pur (assets SPA + <div id="root">) → Cloudflare sert un vrai
// fichier 200, et la 404.html racine (ajoutée pour couper le soft-404 du
// fallback SPA) ne les transforme pas en 404. noindex : aucun contenu à
// indexer. Placé après les guides, avant la home : ordre d'écriture sans
// dépendance — chaque page est autonome (template vite pur réutilisé).
const UTILITY_PAGES = [
  { slug: "products",       title: "Vape Spot Australia — Vape Products",        canonical: "products/" },
  { slug: "discover",       title: "Discover Vape Stores | Vape Spot Australia",  canonical: "discover/" },
  { slug: "my-list",        title: "My List | Vape Spot Australia",              canonical: "my-list/" },
  { slug: "order-summary",  title: "Order Summary | Vape Spot Australia",        canonical: "order-summary/" },
];
{
  const baseline = [
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<meta name="robots" content="noindex, nofollow" />`,
    `<meta name="geo.country" content="AU" />`,
    `<link rel="icon" href="/favicon.ico" sizes="48x48" />`,
    `<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<script>document.documentElement.classList.add("js")</script>`,
  ];
  for (const pg of UTILITY_PAGES) {
    const canonical = `https://vapespot.store/${pg.canonical}`;
    const head = [
      `<title>${escapeHtml(pg.title)}</title>`,
      ...baseline,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
      `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    ].join("\n    ");
    let html = template.replace(
      /<head>[\s\S]*?<\/head>/,
      `<head>\n    ${head}\n    ${guideScriptTag}\n    ${guideCssTag}\n  </head>`
    );
    const outDir = join(DIST, pg.slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), html, "utf-8");
  }
  console.log(`  ✓ ${UTILITY_PAGES.length} pages utilitaires (shell SPA) générées`);
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
  const name = p.name || "this vape";
  // NB depuis rewrite-product-names : name porte déjà la marque → on ne la
  // re-préfixe que si absente (même garde-fou que buildProductTitle), sinon « IGET IGET ».
  const brandMissing = p.brand && !name.toLowerCase().includes(p.brand.toLowerCase());
  const brand = brandMissing ? `${p.brand} ` : "";
  let lead = `Shop the ${brand}${name}`;
  // Marques commençant par « The » (The One, The Finest…) : « Shop the The One … » → « Shop the One … »
  lead = lead.replace(/\bthe The\b/gi, "the");
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