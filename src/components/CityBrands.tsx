import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import brands from "@/data/brands.json";

// Marques choisies par ville (écrites par scripts/prerender.mjs dans
// dist/data/city-brands.json). La liste live = EXACTEMENT les liens /brands/
// statiques que Google lit (parité, même pattern que CityProducts). À défaut
// de fichier, aucune section.
let cityBrandsPromise: Promise<Record<string, string[]>> | null = null;
function loadCityBrands(): Promise<Record<string, string[]>> {
  if (!cityBrandsPromise) {
    cityBrandsPromise = fetch("/data/city-brands.json")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return cityBrandsPromise;
}

const BRANDS_BY_SLUG = new Map(brands.brands.map((b) => [b.slug, b]));

/** Bloc « Popular brands in <ville> » — maillage villes → pages /brands/. */
export function CityBrands({ slug, city }: { slug: string; city: string }) {
  const [brandSlugs, setBrandSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCityBrands().then((map) => {
      if (!cancelled) setBrandSlugs((map && map[slug]) || null);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!brandSlugs || brandSlugs.length === 0) return null;

  const items = brandSlugs
    .map((s) => BRANDS_BY_SLUG.get(s))
    .filter((b): b is (typeof brands.brands)[number] => Boolean(b));
  if (items.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2 className="text-[16px] font-bold text-[#0A0A0A]">
          Popular brands in {city}
        </h2>
      </div>
      <p className="text-[13px] text-[#616161] mt-1">
        The vape brands Australians search for most — VapeSpot delivers them
        to {city}.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((b) => (
          <Link
            key={b.slug}
            to="/brands/$slug"
            params={{ slug: b.slug }}
            className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] px-4 py-2 text-[13px] font-medium text-[#0A0A0A] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors"
          >
            {b.name}
            <span aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}