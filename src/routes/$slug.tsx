import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { ListingPage } from "@/components/ListingPage";

export const Route = createFileRoute("/$slug")({
  component: SlugPage,
  head: async ({ params }) => {
    // SEO sur navigation SPA : mêmes imports différés que le loader,
    // le navigateur met en cache les chunks JSON entre les deux.
    const [{ default: listings }, { default: schemas }] = await Promise.all([
      import("@/data/listings.json"),
      import("@/data/schema-data.json"),
    ]);
    const listing = listings.find((l) => l.slug === params.slug);
    if (!listing) return {};
    const schema = schemas.find((s) => s.slug === params.slug);
    return {
      meta: [
        { title: `${listing.businessName} | Vape Spot Australia` },
        { name: "description", content: listing.description },
      ],
      scripts: schema
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify(schema.schema),
            },
          ]
        : [],
    };
  },
  loader: async ({ params }) => {
    // Chargement différé : les JSON (166 KB) ne pèsent que sur les pages
    // ville, pas sur le bundle principal chargé à l'accueil.
    const [{ default: listings }, { default: schemas }] = await Promise.all([
      import("@/data/listings.json"),
      import("@/data/schema-data.json"),
    ]);
    const listing = listings.find((l) => l.slug === params.slug);
    if (!listing) throw notFound();
    const schema = schemas.find((s) => s.slug === params.slug);
    return { listing, schema };
  },
});

function SlugPage() {
  const { listing } = Route.useLoaderData();

  useEffect(() => {
    const title = `${listing.businessName} | Vape Spot Australia`;
    const desc = listing.description;

    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", desc);
    } else {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      metaDesc.setAttribute("content", desc);
      document.head.appendChild(metaDesc);
    }

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", title);
    }

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute("content", desc);
    }
  }, [listing]);

  return <ListingPage listing={listing} />;
}
