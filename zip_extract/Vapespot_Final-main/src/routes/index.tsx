import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/Hero";
import { CategoryCarousel } from "@/components/CategoryCarousel";
import { TrendingProducts } from "@/components/TrendingProducts";
import { BrandCarousel } from "@/components/BrandCarousel";
import { Reassurance } from "@/components/Reassurance";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vape Spot — Premium Vape Catalogue" },
      { name: "description", content: "Browse our curated catalogue and order via Telegram." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="space-y-10">
      <Hero />
      <div className="max-w-7xl mx-auto w-full space-y-10">
        <CategoryCarousel />
        <TrendingProducts />
        <BrandCarousel />
      </div>
      <Reassurance />
    </div>
  );
}
