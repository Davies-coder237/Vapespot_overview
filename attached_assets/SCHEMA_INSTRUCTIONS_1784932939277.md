# VapeSpot — Schema.org JSON-LD Integration

## Fichier inclus
- `schema-data.json` → 100 entrées Schema.org LocalBusiness prêtes à l'emploi

## Problème
Les 100 pages VapeSpot sur vapespot.store **n'ont pas de données structurées Schema.org**. Google ne peut pas extraire automatiquement les infos (nom, adresse, coordonnées GPS, horaires) depuis les pages. Actuellement les pages n'ont que des meta tags basiques.

## Objectif
Ajouter un bloc JSON-LD `<script type="application/ld+json">` dans le `<head>` de chaque page de listing.

---

## Option 1 : Injection via TanStack Router (recommandé)

Le site utilise TanStack Router avec les fichiers :
- `src/routes/$slug.tsx` → route dynamique, charge les données
- `src/components/ListingPage.tsx` → composant d'affichage

### Prompt pour Replit

```
Mon site React avec TanStack Router a 100 pages de listing VapeSpot.

J'ai un fichier schema-data.json qui contient 100 entrées Schema.org,
une pour chaque slug. Chaque entrée ressemble à ceci :
{
  "slug": "vapespot-sydney-cbd",
  "schema": {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "VapeSpot Sydney CBD",
    "description": "Looking for a vape in Sydney CBD?...",
    "url": "https://vapespot.store/vapespot-sydney-cbd",
    "address": { ... },
    "geo": { ... },
    "openingHoursSpecification": [ ... ]
  }
}

Dans le fichier src/routes/$slug.tsx, j'ai déjà une fonction `head`
qui gère les meta tags. Ajoute un bloc JSON-LD dans le head pour
chaque page. Le schema doit être chargé depuis schema-data.json
et injecté comme ceci :

<script type="application/ld+json"> { ... } </script>

Utilise la fonction head() existante du routeur pour injecter
le script dans le head de la page.
```

### Structure de code attendue (dans $slug.tsx)
```typescript
import schemas from "@/data/schema-data.json";

// Dans la fonction head :
head: ({ params }) => {
  const listing = listings.find((l) => l.slug === params.slug);
  const schema = schemas.find((s) => s.slug === params.slug);
  if (!listing) return {};
  return {
    meta: [
      { title: `${listing.businessName} | Vape Spot` },
      { name: "description", content: listing.description },
    ],
    scripts: schema ? [
      {
        type: "application/ld+json",
        children: JSON.stringify(schema.schema),
      },
    ] : [],
  };
},
```

---

## Option 2 : Injection directe dans ListingPage.tsx

Si TanStack Router ne supporte pas `scripts:` dans la fonction head,
on peut injecter le JSON-LD directement dans le JSX du composant
ListingPage en utilisant `dangerouslySetInnerHTML` ou en créant
un effet qui l'ajoute au document head.

### Prompt Replit alternative

```
Dans mon composant React ListingPage.tsx, ajoute un bloc 
Schema.org JSON-LD dans le <head> de la page.

J'ai un fichier schema-data.json avec 100 entrées.
Chaque entrée a un slug et un objet schema.

Dans ListingPage.tsx, ajoute un useEffect qui :
1. Prend le slug depuis les props du listing
2. Trouve l'entrée correspondante dans schema-data.json
3. Crée un élément <script type="application/ld+json">
   dans le document.head avec le contenu JSON
4. Nettoie l'élément au démontage (cleanup)
```

---

## Option 3 : Script Playwright pour ajouter après build

Si les modifications React sont trop compliquées, on peut aussi
patcher le HTML generé après le build avec un script Playwright
qui injecte le JSON-LD dans chaque page HTML.

---

## Vérification

Après integration, vérifier avec :
1. https://search.google.com/test/rich-results → coller une URL vapespot.store/[slug]
2. https://validator.schema.org/ → tester le JSON-LD
3. Google Search Console → tester l'URL
