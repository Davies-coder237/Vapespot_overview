import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { ListingPage } from "@/components/ListingPage";
import listings from "@/data/listings.json";
import schemas from "@/data/schema-data.json";

export const Route = createFileRoute("/$slug")({
  component: SlugPage,
  head: ({ params }) => {
    const listing = listings.find((l) => l.slug === params.slug);
    const schema = schemas.find((s) => s.slug === params.slug);
    if (!listing) return {};
    return {
      meta: [
        { title: `${listing.businessName} | Vape Spot` },
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
  loader: ({ params }) => {
    const listing = listings.find((l) => l.slug === params.slug);
    if (!listing) throw notFound();
    return { listing };
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
