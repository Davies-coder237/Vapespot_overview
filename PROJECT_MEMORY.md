# VapeSpot — Mémoire Projet

Fichier de référence. Mis à jour à chaque modification importante.

---

## Stack technique

- **Framework** : React + Vite
- **Router** : TanStack Router v1.170.15 (file-based routing)
- **Style** : Tailwind CSS
- **Notifications** : Sonner (toast)
- **Déploiement** : vapespot.store

---

## Structure des fichiers importants

| Fichier | Rôle |
|---|---|
| `src/routes/__root.tsx` | Layout racine — Header/Footer/AgeGate/Toaster. Les pages listing (`isListing`) sont standalone (sans header/footer) |
| `src/routes/$slug.tsx` | Route dynamique pour les 101 pages de listing |
| `src/components/ListingPage.tsx` | Composant d'affichage des pages listing |
| `src/components/OrderSummary.tsx` | Résumé commande + choix livraison + copie Telegram |
| `src/components/MyList.tsx` | Panier — bouton "Place Order" |
| `src/data/listings.json` | 101 entrées : 1 externe (vape-shop-aus) + 100 VapeSpot |
| `src/data/schema-data.json` | 100 blocs Schema.org JSON-LD (un par slug VapeSpot) |
| `public/sitemap.xml` | Sitemap des 100 pages VapeSpot |
| `public/googleaf5cbff8590fdb08.html` | Fichier de vérification Google Search Console |

---

## Pages de listing — format `listings.json`

```json
{
  "slug": "vape-shop-aus",
  "businessName": "Vape Shop AUS",
  "category": "Vaporizer store",
  "cityTag": "Newtown NSW",
  "address": "567 A36, Newtown NSW 2042, Australia",
  "phone": "optionnel — omettre si vide",
  "hours": "optionnel — omettre si vide",
  "description": "..."
}
```

Pour ajouter une nouvelle fiche : **ajouter une entrée dans `listings.json` uniquement**.  
L'URL sera automatiquement `vapespot.store/{slug}`.

---

## Erreurs connues à ne pas répéter

### ❌ TanStack Router — `scripts:` dans `head()` ne fonctionne pas
**Tentative :** Injecter le JSON-LD Schema.org via `scripts: [{ type: "application/ld+json", children: ... }]` dans la fonction `head()` de `$slug.tsx`.  
**Résultat :** Le script n'apparaît pas dans le HTML — TanStack Router v1.170.x ne supporte pas cette propriété.  
**Solution correcte :** Utiliser `useEffect` dans le composant (`ListingPage.tsx`) pour créer le `<script>` et l'ajouter à `document.head` manuellement, avec cleanup au démontage.

### ❌ Ne pas modifier le slug — utiliser le nom exact du shop
L'URL doit être `vapespot.store/{nom-exact-du-shop-en-kebab-case}`. Ne pas ajouter la ville ou d'autres infos au slug.

### ❌ Les champs vides ne doivent pas apparaître
Si `phone`, `hours` sont vides/absents dans les données, ne pas les afficher dans `ListingPage.tsx`. La condition `{listing.phone && <p>...</p>}` est déjà en place.

---

## SEO en place

- **Meta tags** : `<title>` et `<meta description>` injectés via `head()` dans `$slug.tsx`
- **Schema.org JSON-LD** : injecté via `useEffect` dans `ListingPage.tsx` depuis `schema-data.json`
- **Sitemap** : `public/sitemap.xml` — 100 URLs, soumis à Google Search Console
- **Google Search Console** : vérifié via `public/googleaf5cbff8590fdb08.html`

---

## Livraison

- **Coursier local** : 30 min–2hrs
- **Australia Post** : 1–3 jours
- La sélection du mode de livraison est incluse dans le message Telegram

## Telegram

- Le message est copié dans le presse-papiers au clic + toast de confirmation
- Le lien Telegram s'ouvre en parallèle
