import { createFileRoute } from "@tanstack/react-router";
import { CityList } from "@/components/CityList";

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
    <div className="max-w-7xl mx-auto w-full px-4 py-12 space-y-6">
      <header>
        <h1 className="text-[28px] font-bold text-[#0A0A0A]">
          Our stores across Australia
        </h1>
        <p className="text-[15px] text-[#6B7280] mt-1">
          Select a city to see the nearest VapeSpot store.
        </p>
      </header>
      <CityList />
    </div>
  );
}