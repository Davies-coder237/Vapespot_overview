/**
 * rewrite-city-descriptions.mjs
 * Réécrit les `description` de src/data/listings.json en ton « livraison » :
 * retire les heures (Open 24/7) et l'angle boutique (local vape shop, Pop into,
 * grab here…), garde les marques propres à chaque ville, et mentionne la
 * livraison vers le suburb + « and nearby ».
 *
 * Usage : node scripts/rewrite-city-descriptions.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "src", "data", "listings.json");

const raw = readFileSync(DATA, "utf8");
const listings = JSON.parse(raw);

// Marques connues (dans un ordre de priorité d'extraction pour ne pas casser
// « IGET Mega » / « Alibarbar Ingot » avant « IGET » / « Alibarbar »).
const BRANDS = [
  "IGET Mega",
  "Alibarbar Ingot",
  "IGET",
  "Alibarbar",
  "HQD",
  "Relx",
  "Vaporesso",
  "GeekVape",
  "Vape Shot",
  "HiiQ",
  "IVG",
  "Lost Mary",
  "Elf Bar",
];

/** Extrait les marques présentes dans une description, dans l'ordre, sans doublons. */
function extractBrands(desc) {
  const found = [];
  // On retire physiquement les marques multi-mots du texte au fur et à mesure
  // pour ne pas retomber sur leurs fragments (« IGET » dans « IGET Mega »).
  let work = desc;
  for (const b of BRANDS) {
    if (work.includes(b)) {
      found.push(b);
      work = work.split(b).join("");
    }
  }
  // Dé-duplication hiérarchique : si « IGET Mega » est déjà là, on ne garde pas
  // « IGET » ; idem « Alibarbar Ingot » vs « Alibarbar ».
  return found.filter((b) => {
    // b est un sous-ensemble d'une marque multi-mots déjà présente → on l'écarte
    return !BRANDS.some((other) => other !== b && other.includes(b) && found.includes(other));
  });
}

/** Déduit proprement le nom de ville (« Sydney CBD NSW » -> « Sydney CBD »). */
function cityName(listing) {
  const m = listing.cityTag.match(/^(.+?)\s+(?:NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\b/i);
  return m ? m[1].trim() : listing.cityTag;
}

let count = 0;
for (const l of listings) {
  if (l.slug === "vape-shop-aus") {
    // Description longue unique (vaisseau amiral) — on garde le ton conseil
    // mais on vire l'ancrage local « Located in Newtown » et le ton bout.
    l.description =
      "Vape Shop AUS delivers a curated range of vaporisers, mods, pods and e-liquids across Australia — every style and every budget. Order online and get honest, no-pressure advice from people who actually vape.";
    count++;
    continue;
  }

  const brands = extractBrands(l.description);
  const brandsText =
    brands.length > 0 ? brands.join(", ") : "IGET, Alibarbar, HQD, Relx and Vaporesso";
  const cn = cityName(l);

  l.description = `Looking for a vape in ${cn}? VapeSpot delivers ${brandsText} to ${l.cityTag} and nearby suburbs, with fast courier delivery and 24/7 ordering.`;

  count++;
}

writeFileSync(DATA, JSON.stringify(listings, null, 2) + "\n", "utf8");
console.log(`✅ Réécrites : ${count} descriptions (sur ${listings.length} listings)`);
