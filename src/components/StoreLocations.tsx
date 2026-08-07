import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CityCard } from "./CityCard";
import { STATE_NAMES } from "./CityCard";

// Les 8 stores principaux (mêmes que ceux du bloc statique SEO en prod).
const STORES: { slug: string; name: string; state: string }[] = [
  { slug: "vapespot-sydney-cbd", name: "Sydney CBD", state: STATE_NAMES.NSW },
  { slug: "vapespot-melbourne-cbd", name: "Melbourne CBD", state: STATE_NAMES.VIC },
  { slug: "vapespot-brisbane-cbd", name: "Brisbane CBD", state: STATE_NAMES.QLD },
  { slug: "vapespot-perth-cbd", name: "Perth CBD", state: STATE_NAMES.WA },
  { slug: "vapespot-adelaide-cbd", name: "Adelaide CBD", state: STATE_NAMES.SA },
  { slug: "vapespot-hobart-cbd", name: "Hobart CBD", state: STATE_NAMES.TAS },
  { slug: "vapespot-canberra-cbd", name: "Canberra CBD", state: STATE_NAMES.ACT },
  { slug: "vapespot-darwin-city", name: "Darwin", state: STATE_NAMES.NT },
];

export function StoreLocations({ title = "Available in our stores" }: { title?: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Scroll horizontal « infini » : liste dupliquée, reset silencieux à mi-parcours.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft -= el.scrollWidth / 2;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollBy = (amount: number) =>
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });

  if (STORES.length === 0) return null;
  const doubled = [...STORES, ...STORES];

  return (
    <section className="mt-6 space-y-3">
      <h2 className="lg:hidden px-4 md:px-6 text-[20px] font-bold text-black">
        {title}
      </h2>

      <div className="hidden lg:flex items-center justify-between px-4 md:px-6">
        <h2 className="text-xl font-bold text-black">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-320)}
            aria-label="Scroll left"
            className="h-9 w-9 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-black" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(320)}
            aria-label="Scroll right"
            className="h-9 w-9 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
          >
            <ArrowRight className="h-4 w-4 text-black" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto scrollbar-none px-4 md:px-6 pb-2"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {doubled.map((s, i) => (
          <div
            key={`${s.slug}-${i}`}
            className="shrink-0 w-[210px] lg:w-[220px]"
          >
            <CityCard slug={s.slug} city={s.name} state={s.state} />
          </div>
        ))}
      </div>
    </section>
  );
}