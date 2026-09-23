/**
 * Générateur des avis clients VapeSpot (src/data/reviews.json).
 *
 * Style : avis RÉELS de clients australiens (calqués sur Google Maps /
 * Trustpilot de vape shops AU et NZ livrant en Australie). Ce que ces avis
 * font : phrases courtes et juxtaposées, ponctuation inégale (virgules
 * manquantes, "!!" occasionnels), slang australien (defo, gonna, coz, chea),
 * ZÉRO tiret cadratin (—), adjectifs sobres (« fast, easy, good »), pas de
 * rédactions parfaites. Le résultat doit SONNER comme un texte tapé vite.
 *
 * Données : ~200 avis au total, 10 de base humanisés + ~190 sur les produits
 * les plus sollicités (trending.json). Villes réelles du site, photos de
 * profil distinctes (randomuser.me).
 *
 * ⚠️ Google : le seo-block du prerender reste TEXTE SEUL (aucun schema
 * Review/aggregateRating — interdit pour le vape).
 *
 * Usage : node scripts/generate-reviews.mjs  (idempotent)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf-8"));
const write = (p, data) => writeFileSync(join(ROOT, p), JSON.stringify(data, null, 2) + "\n", "utf-8");

// ─── PRNG déterministe (reproductible) ────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260923);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pickMany = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
};

// ─── Sources données ───────────────────────────────────────────────────────
const trending = read("public/data/trending.json").products; // 127 produits triés par popularité
const searchEntries = read("public/data/search.json");
const searchById = new Map(searchEntries.map((x) => [x.id, x]));
const cities = read("src/data/listings.json").map((l) => l.cityTag); // zones réelles

// ─── Les 10 avis de base (humanisés, même identité/produit/note) ───────────
// En dur ici → idempotent. Textes réécrits dans le style "client réel" :
// court, pas de tiret, ponctuation naturelle.
const EXISTING = [
  { "id": "r-1", "author": "Sarah M.", "city": "Sydney NSW", "date": "Sep 2026", "productId": "kuz-9000-miami-mint-70011", "productName": "Kuz 9000 Miami Mint", "rating": 5, "text": "Ordered at lunch, it was here in under an hour. Miami mint is real sweet but not heavy, lasted me the whole week. Packaged sealed and authentic.", "verified": true },
  { "id": "r-2", "author": "Jake T.", "city": "Melbourne VIC", "date": "Sep 2026", "productId": "umin-10000-watermelon-ice-72021", "productName": "UMIN 10000 Watermelon Ice", "rating": 5, "text": "10k puffs for the price is unreal. Watermelon ice is my go to now, smooth hit and the battery display is actually accurate. Courier got it to me in under 2 hours.", "verified": true },
  { "id": "r-3", "author": "Emma L.", "city": "Brisbane QLD", "date": "Sep 2026", "productId": "geek-bar-pulse-x-25000-blue-razz-ice-76001", "productName": "Geek Bar Pulse X 25000 Blue Razz Ice", "rating": 5, "text": "25k puffs lasts forever honestly. Blue razz ice tastes exactly like the packet says. Checked the scratch code against geek bars site and it's legit.", "verified": true },
  { "id": "r-4", "author": "Liam W.", "city": "Perth WA", "date": "Sep 2026", "productId": "iget-bar-12750", "productName": "IGET Bar", "rating": 4, "text": "4th time buying the iget bar from here and it's always the same good quality. Delivered to perth same day which was a nice surprise. Only knock is they sell out of some flavours quick.", "verified": true },
  { "id": "r-5", "author": "Mia R.", "city": "Gold Coast QLD", "date": "Aug 2026", "productId": "alibarbar-ingot-15000-mango-91003", "productName": "Alibarbar Ingot 15000 Mango", "rating": 5, "text": "Ingot mango is my fav, flavour doesn't drop off even at the end of the device. Messaged them on telegram to check my order before it shipped and they replied fast.", "verified": true },
  { "id": "r-6", "author": "Oliver B.", "city": "Adelaide SA", "date": "Sep 2026", "productId": "geek-bar-meloso-mini-blueberry-ice-74001", "productName": "Geek Bar Meloso Mini Blueberry Ice", "rating": 5, "text": "Small enough to chuck in the glovebox which is what I wanted. Blueberry ice is clean and fresh. Gave it one usb-c charge and it topped straight up.", "verified": true },
  { "id": "r-7", "author": "Chloe H.", "city": "Sydney NSW", "date": "Sep 2026", "productId": "umin-10000-mango-magic-72011", "productName": "UMIN 10000 Mango Magic", "rating": 5, "text": "Courier dropped it at my place in parramatta within the 2hr window. Mango magic is super smooth and the tank legit lasted the full 10k puffs.", "verified": true },
  { "id": "r-8", "author": "Ethan K.", "city": "Melbourne VIC", "date": "Aug 2026", "productId": "iget-bar-mango-ice-12758", "productName": "IGET Bar Mango Ice", "rating": 4, "text": "Great flavour and can't beat the price. Usb-c charging is handy. Only thing is some flavours sell out quick, but they restocked within the week.", "verified": true },
  { "id": "r-9", "author": "Isla F.", "city": "Canberra ACT", "date": "Sep 2026", "productId": "kuz-9000-blue-razz-lemonade-70003", "productName": "Kuz 9000 Blue Razz Lemonade", "rating": 5, "text": "First order with these guys and I'm impressed. Lemonade has a bit of a sour kick which keeps it interesting. Genuine stock with the sticker intact and all.", "verified": true },
  { "id": "r-10", "author": "Noah D.", "city": "Sydney NSW", "date": "Sep 2026", "productId": "geek-bar-pulse-x-25000-cool-mint-76006", "productName": "Geek Bar Pulse X 25000 Cool Mint", "rating": 5, "text": "Got 2 pulse x cool mints for the month and saved on shipping. Asked them about ID on telegram and they answered in minutes. Legit store.", "verified": true },
];

// ─── Photographies de profil (randomuser.me — 100 hommes + 100 femmes) ─────
const MEN_PORTRAITS = [...Array(100).keys()].map((i) => `https://randomuser.me/api/portraits/men/${i}.jpg`);
const WOMEN_PORTRAITS = [...Array(100).keys()].map((i) => `https://randomuser.me/api/portraits/women/${i}.jpg`);
const EXISTING_GENDER = {
  "Sarah M.": "w", "Jake T.": "m", "Emma L.": "w", "Liam W.": "m", "Mia R.": "w",
  "Oliver B.": "m", "Chloe H.": "w", "Ethan K.": "m", "Isla F.": "w", "Noah D.": "m",
};

// ─── Noms AU ───────────────────────────────────────────────────────────────
const MEN_NAMES = [
  "Jake", "Liam", "Ethan", "Noah", "Oliver", "Jack", "Lucas", "Thomas",
  "Declan", "Cooper", "Harrison", "Archie", "Toby", "Max", "Ryan", "Blake",
  "Callum", "Xavier", "Mason", "Aiden", "Dylan", "Lachlan", "Brayden", "Hunter",
  "Kai", "Jasper", "Flynn", "Oscar", "Henry", "Charlie", "Leo", "Eli", "Hugo",
  "Sam", "Ben", "Josh", "Adam", "Marcus", "Daniel", "Rhys",
];
const WOMEN_NAMES = [
  "Sarah", "Emma", "Mia", "Chloe", "Isla", "Olivia", "Sophie", "Ruby",
  "Grace", "Charlotte", "Zoe", "Jade", "Emily", "Lucy", "Matilda", "Ella",
  "Amelia", "Ava", "Harper", "Mila", "Georgia", "Sienna", "Layla", "Ivy",
  "Poppy", "Alice", "Taylah", "Indie", "Willow", "Freya", "Aria", "Maya",
  "Hannah", "Rebecca", "Lauren", "Caitlin", "Brooke", "Piper", "Erin", "Alexis",
];
const LAST_LETTERS = ["T.", "C.", "H.", "B.", "R.", "W.", "M.", "K.", "S.", "D.", "L."];

// ─── Saveurs connues ───────────────────────────────────────────────────────
const FLAVOR_WORDS = [
  "mint", "ice", "watermelon", "mango", "berry", "blueberry", "strawberry",
  "grape", "pineapple", "coconut", "cola", "lemon", "lime", "soda", "peach",
  "banana", "coffee", "tobacco", "menthol", "melon", "kiwi", "cherry",
  "apple", "orange", "raspberry", "blackcurrant", "rainbow", "fanta", "tropical",
  "juice", "cactus", "candy", "pear", "plum", "blue", "razz",
  "lemonade", "frost", "double", "gummy", "sour",
];
// Renvoie la saveur-cap mobile : la 1re occurrence d'un mot-goût, + les 2 mots
// qui suivent (ex. "Blue Razz Ice"), sans la série/chiffres de capacité.
function flavorOf(name) {
  let best = null;
  for (const w of FLAVOR_WORDS) {
    const m = name.match(new RegExp(`(^|[-\\s])${w}(?![a-z])`, "i"));
    if (m && (best === null || m.index < best.index)) best = m;
  }
  if (!best) return null;
  const slice = name.slice(best.index).replace(/^[-–—\s]+/, "");
  // Mots de TYPE de produit (kit, e-liquide, sachet...) à exclure : ce n'est
  // pas une saveur, donc remettre le générique "the flavour".
  const INVALID = ["salt", "juice", "nicotine", "nic", "pouch", "pouches", "kit",
    "tank", "device", "disposable", "e-liquid", "e-cigarette", "vape", "puff", "puffs"];
  const words = slice.split(/\s+/).filter((w) => !/\d/.test(w)).slice(0, 4);
  const fp = words.filter(
    (w) => !/^[-–—]+$/.test(w) && !INVALID.includes(w.toLowerCase()) && !/^e[-–—]/i.test(w)
  );
  // Exclut une MARQUE en MAJUSCULES (ex. "SOPRO") tant qu'il reste une
  // saveur entièrement en casse mixte ou minuscule.
  const allCaps = (s) => /^[A-Z][A-Z']*$/.test(s);
  const clean = fp.length > 1 ? fp.filter((w, i) => i === 0 || !allCaps(w)) : fp;
  if (!clean.length) return null;
  return clean.filter((w) => w).slice(0, 3).join(" ");
}

// ─── Pools "client réel" (style Google Maps AU) ────────────────────────────
// Segments courts, juxtaposés. Certains sans point, d'autres avec "!!".
const DELIVERY = [
  "ordered thursday, came monday",
  "got it in 2 days",
  "delivered the same day which was mint",
  "came next day to my area",
  "was here within hours",
  "tracked the whole way and showed up early",
  "no dramas with delivery at all",
  "courier was quick and packed it well",
  "arrived in sealed packaging, quick as",
  "shipped fast, no stuffing around",
  "took a couple days but that was fine",
  "came in discreet packaging, good as",
  "delivery was quick and easy to track",
  "got to me in under 2 hours which i did not expect",
  "posted in the arvo and it landed next morn",
  "fast shipping and reliable, will use again",
  "arrived within 2 days and was exactly what i ordered",
  "shipped within a couple hours of ordering",
  "order came today in the post, packed well",
];
const JUDGE = [ // "topic" : le produit / la saveur — souvent sans majuscule (ton SMS)
  "{flavor} is spot on",
  "{flavor} is unreal, my new fav",
  "{flavor} hits hard and keeps it going till the end",
  "{flavor} tastes exactly like it should, no weird aftertaste",
  "{flavor} is real nice and smooth",
  "{flavor} is go good honestly",
  "{flavor} is my go to now",
  "{flavor} is the one, can't fault it",
  "{flavor} is top shelf",
  "{flavor} is awesome, flavour holds the whole way",
  "battery lasts heaps which is good",
  "hits smooth and it's comfy in the hand",
  "bought 2 of these and both are good as",
  "packaging looked legit, scratch code checked out",
  "feels like the real deal, stoked with it",
  "does the job and does it well",
  "genuine stock, can't complain",
  "flavour held up right to the very end",
  "works perfect and looks the part",
  "exactly what i ordered, no surprises",
];
const CLOSERS = [
  "will defo order again",
  "10/10 would recommend",
  "definitely be back",
  "highly recommend these guys",
  "can't recommend enough",
  "will use them again for sure",
  "new go to store now",
  "already told my mates about it",
  "cheers lads, thanks",
  "happy customer here",
  "100% ordering again",
  "solid store, do yourself a favour",
  "recommend 10/10, easy buy",
  "would highly recommend this store",
  "defs my go to from now on",
  "can't fault the whole experience",
  "chea, keep doing what you do",
  "will be buying again",
];
const FLAW5 = [
  "only issue was my flavour was out of stock, had to wait a week",
  "knocked a star coz flavour faded a bit quick",
  "only downside is they sold out of the colour i wanted",
  "would been 5 stars if delivery was a day earlier",
  "took a little longer to get here than expected so minus one star",
];
const FLAW3 = [
  "it's alright, nothing special",
  "was ok, battery could be better",
  "decent but the flavour didn't last long",
  "it's fine, had better from other stores",
  "meh, doesn't hit as good as i hoped",
];

// ─── Répartition 190 nouveaux sur les produits trending ────────────────────
function countsFor(products) {
  const n = products.length;
  const counts = new Array(n).fill(1);
  let budget = 190 - n;
  for (let i = 0; i < n && budget > 0; i++) {
    const add = i < 20 ? 2 : 1;
    const extra = Math.min(add, budget);
    counts[i] += extra;
    budget -= extra;
  }
  return counts;
}

// ─── Construction ───────────────────────────────────────────────────────────
// Vrai si un triplet de mots apparaît >1x dans le texte (chevauchement
// maladroit entre deux segments, ex. "i ordered ... i ordered") → on régénère.
function hasRepeatedTrigram(text) {
  const t = text.toLowerCase().split(/\s+/);
  const seen = new Set();
  for (let i = 0; i <= t.length - 3; i++) {
    const key = t.slice(i, i + 3).join(" ");
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

const all = [];
let idSeq = EXISTING.length + 1;
const usedTexts = new Set(EXISTING.map((r) => r.text));
const usedNames = new Set(EXISTING.map((r) => r.author));

// 10 de base → avatars (5 femmes, 5 hommes = sockets 0..4)
let menIdx = 0;
let womenIdx = 0;
const takeAvatar = (gender) => {
  const pool = gender === "m" ? MEN_PORTRAITS : WOMEN_PORTRAITS;
  const idx = gender === "m" ? menIdx++ : womenIdx++;
  return pool[idx];
};
for (const r of EXISTING) {
  all.push({ ...r, avatar: takeAvatar(EXISTING_GENDER[r.author]) });
}

// 190 nouveaux
let womenBudget = 95;
let menBudget = 95;
const products = trending;
const counts = countsFor(products);

// ─── Paquet de notes EXACT (les 10 existants apportent déjà 8×5★ + 2×4★) ──
// Objectif global : 120×5★, 60×4★, 20×3★ → les nouveaux = 112×5★, 58×4★, 20×3★
// Mélange Fisher–Yates déterministe (même seed → même résultat à chaque run).
const ratingPool = [
  ...Array(112).fill(5),
  ...Array(58).fill(4),
  ...Array(20).fill(3),
];
for (let i = ratingPool.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [ratingPool[i], ratingPool[j]] = [ratingPool[j], ratingPool[i]];
}
let deckIdx = 0;

products.forEach((p, i) => {
  const flavors = flavorOf(p.name);
  for (let k = 0; k < counts[i]; k++) {
    const gender =
      womenBudget <= 0 ? "m"
        : menBudget <= 0 ? "w"
          : rnd() < 0.5 ? "w" : "m";
    if (gender === "w") womenBudget--;
    else menBudget--;

    const firstName = gender === "w" ? pick(WOMEN_NAMES) : pick(MEN_NAMES);
    let author = `${firstName} ${pick(LAST_LETTERS)}`;
    let guard = 0;
    while (usedNames.has(author) && guard++ < 60) {
      author = `${gender === "w" ? pick(WOMEN_NAMES) : pick(MEN_NAMES)} ${pick(LAST_LETTERS)}`;
    }
    usedNames.add(author);

    // Note cible tirée du paquet exact (120/60/20 global)
    const rating = ratingPool[deckIdx++];

    // Texte : segments courts juxtaPposés à la Google Maps AU. Pas de tiret
    // cadratin, ponctuation lâche, souvent PAS de point dans le corps (run-on).
    // Le ton suit la NOTE cible (3★ réservé, 4★ bémol, 5★ enthousiaste).
    let text = "";
    for (let g = 0; g < 60 && (text === "" || usedTexts.has(text) || hasRepeatedTrigram(text)); g++) {
      const delivery = pick(DELIVERY);
      const judgeBase = flavors ? pick(JUDGE).replace("{flavor}", flavors) : pick(JUDGE).replace("{flavor}", "the flavour");
      // Saveur en minuscules (ton SMS) : "blue razz ice is spot on"
      const judge = flavors ? judgeBase.replace(flavors, flavors.toLowerCase()) : judgeBase;

      if (rating === 3) {
        // 3/5 — jugement réservé seulement, pas de clôture enthousiaste
        const first = delivery[0].toUpperCase() + delivery.slice(1);
        text = `${first}, ${pick(FLAW3)}`;
      } else if (rating === 4) {
        // 4/5 — positif, un bémol, pas de "!!" enthousiaste
        const closer = pick(CLOSERS);
        const flaw = pick(FLAW5);
        if (rnd() < 0.5) {
          // run-on sans point dans le corps
          text = `${delivery}, ${judge} but ${flaw}, ${closer}`;
        } else {
          text = `${delivery[0].toUpperCase()}${delivery.slice(1)}. ${judge[0].toUpperCase()}${judge.slice(1)}. ${flaw} but ${closer}.`;
        }
      } else {
        // 5/5
        const closer = pick(CLOSERS);
        const exclaim = rnd() < 0.35 ? "!!" : "";
        const runon = rnd();
        if (runon < 0.45) {
          // run-on : tout débouche, pas de point dans le corps (parfois rien).
          // 50% : première lettre en minuscule (ton SMS pur) ; 50% : majuscule.
          text = rnd() < 0.5
            ? `${delivery}, ${judge} and ${closer}${exclaim}`
            : `${delivery} ${judge} ${closer}${exclaim}`;
          if (rnd() < 0.5) text = text[0].toUpperCase() + text.slice(1);
        } else {
          text = `${delivery[0].toUpperCase()}${delivery.slice(1)}. ${judge[0].toUpperCase()}${judge.slice(1)}${exclaim} ${closer}.`;
        }
      }
    }
    usedTexts.add(text);

    const date = pick(["Sep 2026", "Aug 2026", "Jul 2026", "Jun 2026", "May 2026", "Apr 2026"]);

    all.push({
      id: `r-${idSeq++}`,
      author,
      city: pick(cities),
      date,
      productId: p.id,
      productName: (searchById.get(p.id) || {}).name || p.name,
      rating,
      text,
      verified: rnd() < 0.9,
      avatar: takeAvatar(gender),
    });
  }
});

write("src/data/reviews.json", all);
console.log(`✅ ${all.length} avis écrits dans src/data/reviews.json`);
console.log(`   produits couverts : ${new Set(all.map((r) => r.productId)).size}`);
console.log(`   textes uniques    : ${new Set(all.map((r) => r.text)).size}/${all.length}`);
console.log(`   avatars uniques   : ${new Set(all.map((r) => r.avatar)).size}/${all.length}`);
console.log(`   tirets cadratins  : ${all.filter((r) => r.text.includes("—")).length} (doit être 0)`);
const byRating = {};
for (const r of all) byRating[r.rating] = (byRating[r.rating] || 0) + 1;
console.log("   répartition notes :", JSON.stringify(byRating));