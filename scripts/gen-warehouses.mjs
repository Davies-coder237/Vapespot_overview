// Génère src/data/warehouses.json = 108 entrepôts VapeSpot (format validé 20/11 :
// { id, city, state, address, lat, lng, active }).
// - Les 100 entrées viennent de C:\lead\vapespot_100_complete.json (fiches Google Maps réelles).
// - Les 8 nouveaux viennent du scrap Google du 20/11 (villes isolées ; pour Broome &
//   Kalgoorlie : adresses réelles de fiches FERMÉES, validées par l'utilisatrice).
// Ne JAMAIS remplacer la source par des adresses inventées.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "C:\\lead\\vapespot_100_complete.json";

const base = JSON.parse(readFileSync(SRC, "utf8"));

function norm(s) {
  return (s ?? "").trim();
}

const warehouses = base.map((e) => ({
  id: norm(e.slug) || "",
  city: norm(e.city),
  state: norm(e.state),
  address: norm(e.address),
  lat: e.lat,
  lng: e.lng,
  active: true,
}));

// Les 8 nouveaux (tous OUVERT sauf Broome/Kalgoorlie, saisis par l'utilisatrice).
// id = slug créé à la main, adresses exactes des fiches scrapées Google (20/11).
const NEW = [
  {
    id: "vapespot-cairns-north",
    city: "Cairns",
    state: "QLD",
    address: "411 Sheridan St, Cairns North QLD 4870, Australia",
    lat: -16.911088,
    lng: 145.762888,
    active: true,
  },
  {
    id: "vapespot-townsville-strand",
    city: "Townsville",
    state: "QLD",
    address: "58 The Strand, North Ward QLD 4810, Australia",
    lat: -19.252159,
    lng: 146.817511,
    active: true,
  },
  {
    id: "vapespot-rockhampton-bolsover",
    city: "Rockhampton",
    state: "QLD",
    address: "5/160 Bolsover St, Rockhampton City QLD 4700, Australia",
    lat: -23.381803,
    lng: 150.514432,
    active: true,
  },
  {
    id: "vapespot-mount-isa-simpson",
    city: "Mount Isa",
    state: "QLD",
    address: "23 Simpson St, Mount Isa City QLD 4825, Australia",
    lat: -20.72767,
    lng: 139.49423,
    active: true,
  },
  {
    id: "vapespot-alice-springs-todd",
    city: "Alice Springs",
    state: "NT",
    address: "11 Todd Mall, Alice Springs NT 0870, Australia",
    lat: -23.697979,
    lng: 133.884041,
    active: true,
  },
  {
    id: "vapespot-south-hedland-throssell",
    city: "Port Hedland",
    state: "WA",
    address: "Shop 4/9-31 Throssell Rd, South Hedland WA 6722, Australia",
    lat: -20.409326,
    lng: 118.599259,
    active: true,
  },
  {
    id: "vapespot-broome-djugun",
    city: "Broome",
    state: "WA",
    address: "106 Frederick St, Djugun WA 6725, Australia",
    lat: -17.952603,
    lng: 122.228412,
    active: false,
  },
  {
    id: "vapespot-kalgoorlie-hannan",
    city: "Kalgoorlie",
    state: "WA",
    address: "246 Hannan St, Kalgoorlie WA 6430, Australia",
    lat: -30.760595,
    lng: 121.458041,
    active: false,
  },
];

warehouses.push(...NEW);

// Ids garantis uniques.
const seen = new Set();
for (const w of warehouses) {
  if (!w.id || seen.has(w.id)) throw new Error("id manquant/dupliqué: " + (w.id || "?"));
  seen.add(w.id);
}

// Le site lit src/data/warehouses.json ; les Pages Functions (dossier functions/)
// sont bundleées séparément → copie autonome dans functions/_lib/ (dossier non-routé,
// préfixe _ = code partagé, jamais servi comme URL). Même source, jamais éditée à la main.
for (const out of ["src/data/warehouses.json", "functions/_lib/warehouses.json"]) {
  writeFileSync(out, JSON.stringify({ version: "2026-11-20", warehouses }, null, 2), "utf8");
}
console.log("OK — warehouses.json écrit (site + functions) :", warehouses.length, "entrées");