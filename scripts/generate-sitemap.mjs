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

const DOMAIN = "https://vapespot.store";
const listings = JSON.parse(
  readFileSync(join(ROOT, "src", "data", "listings.json"), "utf-8")
);

// Date ISO du jour : lastmod frais, signal de re-crawl.
const today = new Date().toISOString().slice(0, 10);

const url = (loc, lastmod, changefreq, priority) =>
  `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

const urls = [
  url(`${DOMAIN}/`, today, "daily", "1.0"),
  ...listings.map((l) =>
    url(`${DOMAIN}/${l.slug}`, today, "weekly", "0.8")
  ),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

writeFileSync(OUT, xml, "utf-8");
console.log(`✅ sitemap.xml régénéré : ${urls.length} URLs (lastmod ${today})`);