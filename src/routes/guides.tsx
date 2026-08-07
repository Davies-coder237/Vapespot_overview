import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout de la section /guides. IMPORTANT (pattern TanStack file-based) :
 * `guides.$slug.tsx` est un ROUTE ENFANT de `guides.tsx`. Pour que l'article
 * s'affiche, ce parent DOIT rendre un <Outlet/>. Sans ça, naviguer vers
 * /guides/<slug> rendait le composant parent (l'index) au lieu de l'article.
 *
 * La page d'accueil de la section vit dans `guides.index.tsx` (route /guides).
 */
export const Route = createFileRoute("/guides")({
  component: GuidesLayout,
});

function GuidesLayout() {
  return <Outlet />;
}