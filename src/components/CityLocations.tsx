import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cityName, type Listing } from "@/lib/city-content";

/**
 * Liste les ~100 pages ville depuis l'accueil (maillage interne).
 * Import différé du JSON listings pour ne pas alourdir le bundle d'accueil :
 * le chunk n'est chargé que lorsque cette section entre en viewport-adjacent.
 */
export function CityLocations() {
  const [cities, setCities] = useState<Listing[] | null>(null);

  useEffect(() => {
    let alive = true;
    import("@/data/listings.json").then(({ default: listings }) => {
      if (alive) setCities(listings);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="w-full border-t border-[#F0F0F0] pt-10">
      <div className="max-w-7xl mx-auto w-full px-4">
        <h2 className="text-[22px] font-bold text-[#0A0A0A]">
          Vape shops near you
        </h2>
        <p className="text-[14px] text-[#9E9E9E] mt-1 mb-6">
          VapeSpot has stores across Australia — find the closest one.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2.5">
          {cities === null
            ? Array.from({ length: 20 }).map((_, i) => (
                <span
                  key={i}
                  className="h-4 w-24 bg-[#F0F0F0] animate-pulse rounded"
                />
              ))
            : cities.map((c) => (
                <Link
                  key={c.slug}
                  to={`/${c.slug}`}
                  className="text-[13px] font-medium text-[#7C3AED] hover:underline"
                >
                  {cityName(c)}
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}