import { createFileRoute } from "@tanstack/react-router";
import { StoreLocator } from "@/components/StoreLocator";
import { StoreLocations } from "@/components/StoreLocations";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover a VapeSpot store — Vape Spot Australia" },
      {
        name: "description",
        content:
          "Check where VapeSpot delivers across Australia — search your city to find fast delivery to your area.",
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
          Delivery areas
        </p>
        <h1 className="text-[28px] md:text-[32px] font-bold text-[#0A0A0A] leading-tight">
          Where we deliver across Australia
        </h1>
        <p className="text-[15px] text-[#6E6E73] max-w-xl">
          Search your city or filter by state to check VapeSpot delivery coverage in
          your area.
        </p>
      </header>

      {/* Carrousel identité — les 8 CBD majeures */}
      <StoreLocations title="Most popular delivery areas" />

      <div className="border-t border-[#F0F0F0]" />

      <StoreLocator />
    </div>
  );
}