Je veux ajouter une fonctionnalité au site Vape Spot existant (React/Vite/TypeScript) : des pages "listing" individuelles, une par fiche Google Business Profile, pour du SEO local. Le site est en anglais australien (AU spelling: colour, organise, etc.).

## IMPORTANT — Consigne prioritaire

Le site existant ne doit **absolument pas être modifié**. N'y touche pas : pas de changement dans le Header, le Footer, la Sidebar, la homepage, les pages produits, le panier, ou tout autre composant déjà en place. Cette fonctionnalité doit être **purement additive** : tu ajoutes uniquement de nouveaux fichiers (le fichier de données, le composant de page, la nouvelle route). Si tu dois toucher un fichier existant, ce doit être uniquement pour enregistrer la nouvelle route (ex: dans le fichier de routing principal), rien d'autre. Ne renomme, ne restructure et ne "nettoie" aucun code existant, même si tu penses que ça l'améliorerait.

## Architecture à créer

1. **Fichier de données** : `src/data/listings.json`
   Chaque entrée est un objet avec ces champs :
   - `slug` (string, utilisé dans l'URL, ex: "bedeg-vape-perth")
   - `businessName` (string)
   - `category` (string, ex: "Vape shop")
   - `cityTag` (string, ex: "Perth")
   - `serviceArea` (string, ex: "Perth and surrounding areas")
   - `phone` (string, optionnel — omettre le champ ou le laisser vide si pas de téléphone sur la fiche)
   - `hours` (string, ex: "Mon - Sat, 9am - 6pm")
   - `description` (string, texte identique à la description de la fiche Google)

2. **Route dynamique** : `/:slug` (React Router / Tanstack Router selon ce qui est déjà utilisé dans le projet)
   - Cette route n'apparaît nulle part dans la navigation (Header, Footer, Sidebar) — accessible uniquement via lien direct
   - Si le slug n'existe pas dans listings.json, afficher une 404 standard du site

3. **Composant** : `src/components/ListingPage.tsx`
   Reprend le design existant du site (mêmes couleurs, polices, boutons noirs à angles droits `rounded-none`, texte catégorie en violet `#7C3AED` uppercase tracking large, texte secondaire gris `#9E9E9E`).

   Structure visuelle de haut en bas :
   - Logo Vape Spot centré en haut (lien vers `/`)
   - `cityTag` en petit texte gris uppercase au-dessus du nom
   - `businessName` en gros titre bold
   - `category` juste en dessous, en violet uppercase
   - Séparateur (border-top léger)
   - `serviceArea`, `phone` (si présent), `hours` — chacun sur sa propre ligne, sans labels visibles (pas de "Phone:", juste la valeur)
   - Séparateur
   - `description` en texte gris, taille normale
   - Un seul bouton pleine largeur, noir, texte blanc, `rounded-none`, libellé "Discover the shop", qui pointe vers `/` (l'accueil du site, pas un produit spécifique)

4. **SEO par page** :
   - `<title>` = `{businessName} | Vape Spot`
   - meta description = `{description}`

## Comportement attendu pour les ajouts futurs

Chaque fois que je te donne les informations d'une nouvelle fiche (nom du business, catégorie, ville, zone desservie, téléphone si présent, horaires, description), tu dois :
1. Générer un slug à partir du nom du business (minuscules, tirets, sans caractères spéciaux)
2. Ajouter une nouvelle entrée dans `src/data/listings.json` avec ces infos
3. Me confirmer l'URL finale sous la forme : `vapespot.store/[slug]`

Je n'aurai pas besoin de te réexpliquer le système à chaque fois — base-toi sur cette structure telle qu'elle est déjà en place dans le projet.

**Rappel valable aussi pour ces ajouts futurs** : tu ne touches que le fichier `listings.json` (ajout d'entrée). Tu ne modifies rien d'autre dans le site — ni le composant `ListingPage.tsx`, ni le design, ni aucune autre page. Le reste du site doit rester strictement identique à chaque fois.
