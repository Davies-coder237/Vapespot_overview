# Cahier des charges SEO VapeSpot — Septembre 2026

> Base : audit GSC 90j (19 275 impressions / 812 clics) + étude marché vape AU + lecture du code.
> Objectif : transformer les **pages villes qui ramènent seules les clients** en machine à vendre
> (désktop = intention d'achat), rendre **les 3 000 produits trouvables**, et **garder + augmenter les guides**.

---

## Constats (chiffrés, GSC 90 jours)

| Device | Clics | Impressions | CTR | Pos. moyenne |
|---|---|---|---|---|
| **Mobile** | 704 | 15 202 | 4,6 % | **7,5** |
| **Desktop** | 87 | 7 057 | 1,2 % | **32,5** (page 3-4 !) |
| **Tablet** | 8 | 123 | 6,5 % | 7,6 |

Pour la MÊME requête, l'écart mobile vs desktop est de 20 à 75 positions :
`vape` → 4,6 mobile vs 31,2 desk │ `vape shop` → 8,3 vs 43,9 │ `vape australia` → 5,8 vs 32,5.

Répartition des impressions : **HOME 35 % (6 830) · Villes 40 % (7 795) · Guides 13,9 % (2 678) · Produits 7,2 % (1 382) · Catégories 2,1 %**.
→ 83 % du trafic = home + villes. Sur 3 052 produits, **391** ont eu la moindre impression en 90j (pos 23), 16 ont été cliqués sur mobile, 3 sur desktop.

Sitemap : **3 171 soumises, compteur indexed = 0** côté GSC (à resoumettre).
Tendance 28j : home 21,1 → **35,1** ; desktop 32,5 → **37,4** ; mobile 7,5 → **8,7**. **Tout se dégrade.**

---

## TÂCHE 0 — Sync repo (préalable, 5 min)

- **Quoi** : le remote contient 3 commits Replit absents en local (`a4d6115` min A$150, `2c99cd8`, `946f702`). `git pull` pour resynchroniser avant toute modif.
- **Impact SEO** : aucun directement. Indispensable pour ne pas écraser le travail Replit.

---

## TÂCHE 1 — 🔴 Réparer le nommage produit (marque dans le nom) — PRIORITÉ MAX

**Ce que tu as vu (juste) :** beaucoup de noms produits = « Strawberry Kiwi », « Bar 3500 Banana Ice » SANS la marque. La marque existe dans le champ `brand` (IGET, Alibarbar…) mais pas dans le `name` affiché. Or les Australiens cherchent « iget strawberry kiwi », « alibarbar ingot ».

**Ce qui se passe aujourd'hui dans le code :**
- Le **titre SEO** (`buildProductTitle` dans prerender.mjs) ajoute déjà la marque → Snippet Google = « IGET Bar 3500 Banana Ice » ✅
- Mais le **nom visible** (H1 produit, nom de la carte, résultats de recherche interne, panier) = `product.name` brut → « Bar 3500 Banana Ice » ❌
- Le **JSON-LD Product** (`name: p.name`) = nom sans marque ❌
- L'**URL** contient la marque (`/product/iget-bar-3500-banana-ice-2047/`) ✅ → **stable, on n'y touche pas**

**Quoi faire :** script idempotent `scripts/rewrite-product-names.mjs` qui enrichit le champ `name` pour chaque produit : si la marque n'est pas déjà dans le nom (insensible à la casse), on la préfixe → « Bar 3500 Banana Ice » devient « **IGET** Bar 3500 Banana Ice ». Appliqué à `public/data/search.json` (source maîtresse) + vérification de `trending.json` et des fichiers leaf catégorie.
⚠️ **NE TOUCHE PAS** `id`/slug/URL → **aucun 404, aucune canonical cassée, indexations existantes intactes.**

**Répercussions SEO :**
- Les pages produit matchent les requêtes **marque + produit** (« iget strawberry kiwi », « alibarbar ingot 9000 ») — le genre de requêtes déjà dans tes données sans clic (12 imp sur « blackberry ice alibarbar ingot » à pos 48).
- JSON-LD `name` porteur de marque → Google associe mieux l'entité produit à la marque.
- Des milliers de requêtes long-tail marque+saveur deviennent adressées (les pages sont déjà indexées, il manque la correspondance texte).
- Pas de changement d'URL → pas de perte des 391 pages déjà en données.

**Répercussions visuelles (à décider ensemble) :**
- La carte affichera « **IGET** Bar 3500 Banana Ice » en gras → le **petit badge violet « IGET »** au-dessus du nom devient **redondant**.
- 2 options : (a) **retirer le badge marque** sur les produits enrichis (nom propre le porte), (b) le garder pour les rares produits sans marque. → je préconise (a) + garder le badge `series` (« BAR 3500 ») qui lui apporte une info supplémentaire.
- Le H1 produit et les résultats de recherche interne gagnent en lisibilité « on vend quoi ».
- Risque : titres plus longs → troncature 58 chars du `<title>` (déjà gérée), et certaines lignes de carte passent sur 2 lignes (line-clamp-2 déjà en place).

**Vérif :** diff avant/après (compte de noms modifiés), build `npm run build`, contrôle prod d'un échantillon (titre, H1, carte, JSON-LD).

---

## TÂCHE 2 — Pages marques / comparatifs (`/brands/<slug>/`)

**Pourquoi :** les Australiens ne tapent pas « alibarbar ingot 9000 » à froid, ils tapent **« iget bar price », « iget vs alibarbar », « how many puffs », « best iget australia »**. Les concurrents desktop (AussieVapes, JustVapes, Ozivape, IGET Express…) gagnent ces requêtes avec des pages marques à milliers d'avis. Toi tu as des **pages catégorie** mais aucune page dédiée aux marques que tu vends le plus : IGET (201 produits), Alibarbar (118), HQD, Vaporesso…

**Quoi faire :** nouvelle famille de pages statiques `/brands/<brand>/` générées par un script (pattern identique aux villes/guides : prerender + seo-block + sitemap + _redirects + geo AU + JSON-LD BreadcrumbList/ItemList). Contenu :
- H1 « IGET Australia » + intro (position de la marque sur le marché AU, données issues de ton catalogue réel).
- **Tableau comparatif** des modèles clés : puffs, prix, prix par bouffée, rechargeable, saveurs dispo.
- **FAQ** orientée achat (PAA) : « How many puffs is an IGET Bar 3500 ? », « Is IGET better than Alibarbar ? ».
- **Grille des produits de la marque** (liens internes vers tes `/product/`).
- Maillage vers les villes (les marques sont livrées partout).

**Répercussions SEO :** attaque frontale des requêtes commerciales desktop (30-40 % de tes impressions desktop actuelles sont des requêtes sans clic à pos 30-70 → « buy vape online » 13 imp pos 69, « buy vapes australia » pos 70). Chaque page marque = un hub qui distribue de l'autorité vers des centaines de produits. Nouveau maillage interne produits→marque.

**Répercussions visuelles :** nouvelles pages, nouveau template (héros marque + tableau comparatif + grille produits). Cohérent avec l'identité actuelle (violets, cartes bedeg). Aucune page existante modifiée.

**Périmètre :** démarrer sur les 6-8 marques à plus fort volume du catalogue (IGET, Alibarbar, HQD, Vaporesso, Geek Bar/UMIN, Oxva, Gunnpod, Relx) + 1 page « comparatif » transversale.

---

## TÂCHE 3 — Maillage villes → marques & produits stars (`src/components/CityProducts.tsx` / `ListingPage.tsx`)

**Pourquoi :** les **82 pages ville à pos 6,7 détiennent 40 % des impressions** — c'est TA porte d'entrée n°1. Aujourd'hui elles maillent vers des produits, mais pas vers les pages marques, et la sélection de produits n'est pas pilotée par la demande réelle.

**Quoi faire :**
- Ajouter un bloc **« Popular brands in <ville> »** sur les pages ville → liens vers `/brands/<slug>/` (maillage villes → marques).
- Piloter le bloc produits de la page ville par **top marques/requêtes GSC** (au lieu de la seule rotation déterministe actuelle) : les produits qui ont déjà des impressions/clics passent en tête.
- Vérifier que chaque page ville maillent au moins 3-4 produits stars + la marque correspondante.

**Répercussions SEO :** l'autorité des villes (pos 1-8 mobile) **descend vers les marques et les produits** → Google découvre et re-crawl les produits via des pages déjà bien classées (maillage interne = le levier le plus rapide pour sortir les 3 000 produits). Desktop renforcé indirectement.

**Répercussions visuelles :** un nouveau bloc de liens marques sur les pages ville (léger), ordre des produits de la page ville potentiellement réarrangé — rien de cassant.

---

## TÂCHE 4 — Guides : GARDER les 6 + en ajouter + les faire vendre

**Décision actée : on ne retire AUCUN guide.** Les 6 articles existants sont une force (2 678 impressions / 13,9 % du trafic). On les optimise, on en ajoute d'autres par-dessus.

**Quoi faire, en 3 temps :**
1. **Retitrage SERP des 6 actuels** (SANS changer l'URL → aucun risque, aucune perte d'indexation) pour passer d'un CTR de 0,6-0,7 % vers 5 %+ : ex. « Why does my vape blink when I hit it? » → capable de mieux vendre le clic (« Fix your blinking vape in 30 seconds — + best AU disposables with prices »).
2. **Injecter prix + produits dans le corps** : chaque guide existant reçoit un tableau de prix AU et 3-4 liens produits/marques contextuels (maillage vers les nouvelles pages `/brands/`). Les guides deviennent des **pages d'entonnoir**, pas des wikis.
3. **Ajouter les nouveaux articles du calendrier** (toujours long-tail à faible concurrence, validés par ton critère) :
   - « How many puffs is a Geek Bar Pulse X 25000? » (marque que tu vends peu mais qui fait des impressions — voir Tâche 5 assortiment)
   - « IGET Bar vs Alibarbar Ingot — which is better value in Australia? » (comparatif demandé)
   - « Best vape shop in Sydney » / guide par ville (sérialisation)
   - « How to tell if a vape is counterfeit in Australia » (suite fake dispo)
   - Sérialisation puff-count par marque (iget moon, geek bar pulse, oxva…)

**Répercussions SEO :** les 2 678 impressions déjà obtenues passent de « vues » à « clics » ; chaque article devient un hub de maillage vers marques/produits ; chaque nouvel article = une nouvelle requête long-tail indexable avec 1-2 liens produits internes (règle article).

**Répercussions visuelles :** titres SERP changés (le texte des articles change légèrement), tableaux de prix + liens produits ajoutés dans le corps, nouvelles cartes sur /guides/. Aucun design cassé.

---

## TÂCHE 5 — Assortiment : couvrir les marques que les Australiens CHERCHENT

**Constat :** ton catalogue est fort sur IGET (201) et Alibarbar (118) mais **Geek Bar/UMIN = 8 produits seulement** alors que « geek bar meloso mini » te fait déjà des impressions, et **Kuz (~18 % du marché) est absent**. Le marché 2026 = IGET 41 %, Alibarbar ~27 %, Kuz ~18 %, puis HQD, WAKA, BIMO, UMIN.

**Quoi faire (si tu as accès aux fournisseurs) :** ajouter une sélection Geek Bar (Pulse X 25000, Meloso mini, Pulse), Kuz, UMIN. Réduire le trou entre l'assortiment et ce que les gens tapent.

**Répercussions SEO :** les requêtes produits de ces marques cessent d'être « à la concurrence » et deviennent les tiennes. Sinon, les pages `/brands/` de ces marques seraient vides/faibles — il vaut mieux ne créer une page marque que si l'offre suit (ou créer une page « Geek Bar vs » alimentée même avec 8 produits, à voir).

**Impact site :** ajout de fiches produits (rien de structurel — le pipeline sitemap/prerender prend tout produit automatiquement).

---

## TÂCHE 6 — Signaux de confiance (E-E-A-T) pour le desktop

**Pourquoi :** le desktop = YMYL (santé/achat 18+), Google exige confiance et expertise. Tes concurrents affichent des **milliers d'avis** et des pages institutionnelles. Les requêtes desktop où tu es à pos 30 +, c'est eux qui te battent sur la confiance + l'autorité.

**Quoi faire :**
- Pages **À propos / Livraison / Retours / Contact( )** identifiables + linked dans le footer + mentionnées dans les articles (co-signaux E-E-A-T).
- **Avis clients visibles** : collecter les vrais retours (Telegram/WhatsApp) et les afficher sur les fiches produit (même sans schema étoiles — interdit pour le vape — le texte d'avis renforce la crédibilité humaine ET la longueur de page).
- Mentions « ID/age-verification » claires (déjà OK avec le bypass ?age=18 côté façade, à solidifier en texte).
- **Backlinks niveau 2 planifié** (guest posts « Write for Us », forums AU) — les articles de la Tâche 4 réécrits pour backlinks, jamais le même texte.

**Répercussions SEO :** monter en E-E-A-T → condition pour gagner les positions desktop (page 3 si autorité + confiance). Sans ça, les pages marques/comparatifs plafonneront contre des sites à 10k avis.
**Répercussions visuelles :** nouvelles pages footer + bloc d'avis sur fiches produit + signature articles. Cohérent.

---

## TÂCHE 7 — Indexation GSC pilotée (~20/jour)

- **Resoumettre le sitemap** (compteur indexed=0 est anormal → confirmer + pousser).
- **« Demander l'indexation »** journalier sur : les nouvelles pages marques, les nouveaux guides, puis les produits stratégiques (ceux des requêtes déjà identifiées : alibarbar ingot, iget, geek bar). Le quota ~20 URLs/jour → on priorise dans l'ordre : marques/guides nvx → produits à requêtes prouvées.
- Re-vérifier les URL Inspection des villes (il restait Perth, tabac, guide dry hit à crawler).

**Répercussions SEO :** la découverte des nouvelles pages (6-10) + produits à demande réelle passe de « soumission complète du sitemap » (lent) à « injection ciblée » (rapide).

---

## Ordre d'exécution proposé

1. **Tâche 0** — sync repo (5 min)
2. **Tâche 1** — nommage produit (impact immédiat sur des dizaines de requêtes marque+saveur)
3. **Tâche 3** — maillage villes→marques/produits (rapide, distribue l'autorité)
4. **Tâche 4** — guides : retitrage + injections prix + nouveaux articles (par vagues)
5. **Tâche 2** — pages marques / comparatifs (une fois la Tâche 1 en prod, les pages marques pointent vers des noms propres)
6. **Tâche 5** — assortiment Geek Bar/Kuz (selon fournisseur)
7. **Tâche 6** — E-E-A-T (pages institutionnelles + avis + backlinks)
8. **Tâche 7** — indexation GSC continue

Chaque tâche = un commit + push (après ton accord) → build Cloudflare → vérif prod → vérif GSC à J+3.

---

## Règles rappelées
- **Jamais de push sans accord explicite.**
- Ne JAMAIS éditer `public/_redirects` à la main (régénéré par generate-sitemap.mjs).
- Tout changement de nom produit : **ne pas toucher `id`/slug/URL**.
- Répertoire de travail : `Desktop\vapespot dossiers\vapespot_work` ; build = `npm run build`.
- Modèle sans vision : pas d'image dans le chat.