import { createFileRoute, notFound } from "@tanstack/react-router";
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
  return <ListingPage listing={listing} />;
}
