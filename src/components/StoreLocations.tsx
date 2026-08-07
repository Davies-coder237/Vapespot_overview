import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";

// Les 8 stores principaux (mêmes que ceux du bloc statique SEO en prod).
const STORES = [
  { slug: "vapespot-sydney-cbd", name: "Sydney CBD", meta: "New South Wales" },
  { slug: "vapespot-melbourne-cbd", name: "Melbourne CBD", meta: "Victoria" },
  { slug: "vapespot-brisbane-cbd", name: "Brisbane CBD", meta: "Queensland" },
  { slug: "vapespot-perth-cbd", name: "Perth CBD", meta: "Western Australia" },
  { slug: "vapespot-adelaide-cbd", name: "Adelaide CBD", meta: "South Australia" },
  { slug: "vapespot-hobart-cbd", name: "Hobart CBD", meta: "Tasmania" },
  { slug: "vapespot-canberra-cbd", name: "Canberra CBD", meta: "ACT" },
  { slug: "vapespot-darwin-city", name: "Darwin", meta: "Northern Territory" },
];

export function StoreLocations() {
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
        Available in our stores
      </h2>

      <div className="hidden lg:flex items-center justify-between px-4 md:px-6">
        <h2 className="text-xl font-bold text-black">Available in our stores</h2>
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
          <Link
            key={`${s.slug}-${i}`}
            to={`/${s.slug}`}
            className="shrink-0 w-[210px] lg:w-[220px] flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-4 hover:border-[#7C3AED]/40 hover:shadow-sm transition-colors"
          >
            <div className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#7C3AED]">
                Vape Spot
              </span>
              <span className="block text-[17px] font-bold text-black leading-snug">
                {s.name}
              </span>
              <span className="block text-[12px] text-[#9E9E9E]">{s.meta}</span>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#7C3AED]">
              Visit store <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}