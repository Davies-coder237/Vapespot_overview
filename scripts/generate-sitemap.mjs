/**
 * Generate sitemap — régénère public/sitemap.xml avec un lastmod frais
 *
 * Lue par les moteurs + Google Search Console. On met à jour lastmod à
 * chaque build pour signaler que le contenu a bougé (Google re-crawl).
 * La homepage est incluse avec une priorité plus haute que les villes.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "sitemap.xml");
const REDIRECTS = join(ROOT, "public", "_redirects");

const DOMAIN = "https://vapespot.store";
const listings = JSON.parse(
  readFileSync(join(ROOT, "src", "data", "listings.json"), "utf-8")
);

// Index produit : toutes les pages produits (id uniques depuis search.json)
const searchIndex = JSON.parse(
  readFileSync(join(ROOT, "public", "data", "search.json"), "utf-8")
);
const productIds = [...new Set(searchIndex.map((s) => s.id))];

// Guides (blog Soro) : /guides/ + un slug par article, URL slash final servie
// en 200 par le dossier physique dist/guides/<slug>/index.html (comme produits).
let guidesData = { guides: [] };
try {
  guidesData = JSON.parse(
    readFileSync(join(ROOT, "src", "data", "guides.json"), "utf-8")
  );
} catch {}

// Date ISO du jour : lastmod frais, signal de re-crawl.
const today = new Date().toISOString().slice(0, 10);

const url = (loc, lastmod, changefreq, priority) =>
  `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

const urls = [
  url(`${DOMAIN}/`, today, "daily", "1.0"),
  ...listings.map((l) =>
    url(`${DOMAIN}/${l.slug}`, today, "weekly", "0.8")
  ),
  // URLs produit AVEC slash final → servies directement en 200 par le dossier
  // dist/product/<id>/index.html (fini le 308). Les rewrites _redirects étant
  // limitées (~2000 règles Cloudflare), on NE met PAS de ligne rewrite par produit.
  ...productIds.map((id) =>
    url(`${DOMAIN}/product/${id}/`, today, "weekly", "0.6")
  ),
  // Section guides : index + un URL par article (priorité plus haute que produits)
  url(`${DOMAIN}/guides/`, today, "weekly", "0.8"),
  ...guidesData.guides.map((g) =>
    url(`${DOMAIN}/guides/${g.slug}/`, today, "weekly", "0.7")
  ),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

writeFileSync(OUT, xml, "utf-8");
console.log(`✅ sitemap.xml régénéré : ${urls.length} URLs (lastmod ${today})`);

// --- _redirects (Cloudflare Pages) ---
// Idée : Googlebot crawle "/v2slug" (sans slash). Cloudflare répond normalement
// un 308 vers "/v2slug/" et Google le logue en "Redirect error" → pages non indexées.
// Ici on force un REWRITE (code 200) : "/v2slug" sert la sortie du dossier "/v2slug/"
// directement en HTTP 200, SANS redirect. Google crawle donc l'URL telle quelle → indexée.
// ⚠️ LIMITE : Cloudflare Pages n'honore que ~2000 règles dans _redirects.
// 3052 produits dépassent → on ne met QUE les villes (101, sous la limite).
// Les produits sont désormais en URL AVEC slash final (sitemap + canonical)
// servies direct en 200 par le dossier physique → pas besoin de rewrite.
const redirects = listings.map(
  (l) => `/${l.slug}  /${l.slug}/  200`
);
writeFileSync(REDIRECTS, redirects.join("\n") + "\n", "utf-8");
console.log(`✅ _redirects régénéré : ${redirects.length} rewrites ville (code 200), sous la limite Cloudflare (~2000). Produits : URL slash direct (pas de rewrite).`);