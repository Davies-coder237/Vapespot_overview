---
name: VapeSpot listing system
description: Architecture of the 101 dynamic listing pages and rules for adding new ones
---

## Rule
To add a new listing page, add ONE entry to `src/data/listings.json` only. No new route files needed.

**Why:** `src/routes/$slug.tsx` dynamically matches any slug and looks it up in `listings.json`. The route, component, meta tags, and Schema.org injection are all already wired up.

**How to apply:**

Entry format:
```json
{
  "slug": "exact-shop-name-in-kebab-case",
  "businessName": "Exact Shop Name",
  "category": "Vaporizer Store",
  "cityTag": "Suburb STATE",
  "address": "Full address",
  "phone": "omit if empty",
  "hours": "omit if empty",
  "description": "..."
}
```

Slug rule: use the exact shop name in kebab-case, nothing more (no city suffix).

URL result: `vapespot.store/{slug}`

Schema.org JSON-LD: if a matching entry exists in `src/data/schema-data.json`, it is auto-injected via `useEffect` in `ListingPage.tsx`.

The `__root.tsx` layout detects listing pages via `useRouterState` and strips the Header/Footer/AgeGate — listing pages are standalone.
