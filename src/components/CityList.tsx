import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cityName, type Listing } from "@/lib/city-content";

/**
 * Liste de toutes les villes (maillage interne). Utilisée sur la page /discover.
 * Import différé du JSON pour ne pas alourdir le bundle initial.
 */
export function CityList() {
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
              className="text-[14px] font-medium text-[#7C3AED] hover:underline"
            >
              {cityName(c)}
            </Link>
          ))}
    </div>
  );
}