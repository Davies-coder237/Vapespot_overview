import { createFileRoute, notFound } from "@tanstack/react-router";
import { ListingPage } from "@/components/ListingPage";
import listings from "@/data/listings.json";

export const Route = createFileRoute("/$slug")({
  component: SlugPage,
  head: ({ params }) => {
    const listing = listings.find((l) => l.slug === params.slug);
    if (!listing) return {};
    return {
      meta: [
        { title: `${listing.businessName} | Vape Spot` },
        { name: "description", content: listing.description },
      ],
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
