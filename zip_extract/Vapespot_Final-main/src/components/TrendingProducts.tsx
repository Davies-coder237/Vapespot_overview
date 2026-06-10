import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { loadTrendingProducts } from "@/lib/data";
import { ProductCard } from "./ProductCard";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TrendingProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [activeDot, setActiveDot] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTrendingProducts()
      .then((list) => setItems(shuffle(list)))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || items.length === 0) return;

    const handleScroll = () => {
      const half = el.scrollWidth / 2;
      // Normalise position BEFORE the reset so progress is always 0→1
      const normalised = el.scrollLeft >= half ? el.scrollLeft - half : el.scrollLeft;
      const progress = half > 0 ? normalised / half : 0;
      setActiveDot(Math.min(2, Math.floor(progress * 3)));
      if (el.scrollLeft >= half) {
        el.scrollLeft -= half;
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [items]);

  const scrollBy = (amount: number) =>
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <section className="space-y-4">
      {/* Mobile header */}
      <h2 className="lg:hidden text-xl md:text-2xl font-bold text-black px-4 md:px-6">
        Trending Products
      </h2>

      {/* Desktop header with arrows */}
      <div className="hidden lg:flex items-center justify-between px-4 md:px-6">
        <h2 className="text-2xl font-bold text-black">Trending Products</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-400)}
            aria-label="Scroll left"
            className="h-9 w-9 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-black" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(400)}
            aria-label="Scroll right"
            className="h-9 w-9 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
          >
            <ArrowRight className="h-4 w-4 text-black" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Mobile: full-width cards — Desktop: padded with gap */}
      <div
        ref={scrollerRef}
        className="flex gap-0 md:gap-4 lg:gap-4 overflow-x-auto lg:px-6 pb-2 scrollbar-none"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {doubled.map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            className="shrink-0 w-screen md:w-[85vw] md:max-w-[420px] md:min-h-[280px] lg:w-auto lg:max-w-[420px] lg:h-[280px]"
            style={{ scrollSnapAlign: "start" }}
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Animated dots — mobile only */}
      <div className="flex lg:hidden justify-center items-center gap-2 pb-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-[3px] rounded-full transition-all duration-200"
            style={{
              width: activeDot === i ? "20px" : "10px",
              backgroundColor: activeDot === i ? "#0A0A0A" : "#D1D5DB",
            }}
          />
        ))}
      </div>
    </section>
  );
}
