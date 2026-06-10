import { useRef, useState, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { brandImage, onImageError } from "@/lib/data";

export function BrandCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [brands, setBrands] = useState<{ slug: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/data/brands.json")
      .then((r) => r.json())
      .then((data) => setBrands(data))
      .catch(() => setBrands([]));
  }, []);

  if (brands.length === 0) return null;
  const scrollBy = (amount: number) =>
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-4 md:px-6">
        <h2 className="text-xl md:text-2xl font-bold text-black">Top Brands</h2>
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-300)}
            aria-label="Scroll left"
            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-[#F5F5F7]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(300)}
            aria-label="Scroll right"
            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-[#F5F5F7]"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex overflow-x-auto px-4 md:px-6 pb-2"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {brands.map((b) => (
          <div
            key={b.slug}
            aria-label={b.label}
            className="shrink-0 basis-1/2 md:basis-1/3 h-44 md:h-48 px-3 flex items-center justify-center"
            style={{ scrollSnapAlign: "start" }}
          >
            <img
              src={brandImage(b.slug)}
              alt={b.label}
              loading="lazy"
              onError={onImageError}
              className="h-32 md:h-36 max-w-full object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
