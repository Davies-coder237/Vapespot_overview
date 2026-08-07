import { createFileRoute } from "@tanstack/react-router";
import { StoreLocator } from "@/components/StoreLocator";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover a VapeSpot store — Vape Spot Australia" },
      {
        name: "description",
        content:
          "Browse all 100+ VapeSpot stores across Australia and find the nearest one, city by city.",
      },
    ],
  }),
  component: Discover,
});

function Discover() {
  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-12 space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7C3AED]">
          Store locator
        </p>
        <h1 className="text-[28px] md:text-[32px] font-bold text-[#0A0A0A] leading-tight">
          Our stores across Australia
        </h1>
        <p className="text-[15px] text-[#6E6E73] max-w-xl">
          100+ VapeSpot stores — search your city or filter by state to find the
          nearest one.
        </p>
      </header>
      <StoreLocator />
    </div>
  );
}