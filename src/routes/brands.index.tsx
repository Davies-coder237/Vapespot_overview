import { createFileRoute, Link } from "@tanstack/react-router";
import brands from "@/data/brands.json";

export const Route = createFileRoute("/brands/")({
  component: BrandsHome,
  head: () => ({
    meta: [
      { title: "Vape Brands Australia — Vape Spot" },
      {
        name: "description",
        content:
          "All the vape brands Vape Spot stocks in Australia: IGET, Alibarbar, GeekVape, Gunnpod, VooPoo, Vaporesso, HQD and RELX — with model comparisons, prices and fast courier delivery.",
      },
    ],
  }),
});

function BrandsHome() {
  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-4xl px-4 md:px-6 py-12 space-y-10">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7C3AED]">
            Vape Spot Brands
          </p>
          <h1 className="text-[28px] md:text-[34px] font-bold text-[#0A0A0A] leading-tight">
            Vape Brands Australia
          </h1>
          <p className="text-[15px] text-[#6E6E73] max-w-xl">
            The brands Australian vapers actually search for — with model
            comparisons, puffs, prices and same-day courier delivery.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {brands.brands.map((b) => (
            <Link
              key={b.slug}
              to="/brands/$slug"
              params={{ slug: b.slug }}
              className="block border border-[#E5E7EB] p-6 min-h-[150px] hover:border-[#7C3AED]/50 transition-colors"
            >
              <h2 className="text-lg font-bold text-[#0A0A0A] leading-snug">
                {b.name} Australia
              </h2>
              <p className="mt-2 text-sm text-[#6E6E73] line-clamp-3">
                {b.intro[0]}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#7C3AED]">
                View brand →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}