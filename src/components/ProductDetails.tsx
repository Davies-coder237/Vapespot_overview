import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { QuantitySelector } from "./QuantitySelector";
import { SpecificationsTable } from "./SpecificationsTable";
import { ProductCard } from "./ProductCard";
import { useMyList } from "@/lib/storage";
import { toast } from "sonner";
import {
  formatPrice,
  loadLeafFile,
  loadSearchIndex,
  onImageError,
  productCard,
} from "@/lib/data";

export function ProductDetails({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const { add } = useMyList();
  const [related, setRelated] = useState<Product[]>([]);
  const [crumbs, setCrumbs] = useState<{ label: string; href?: string }[]>([]);
  const [activeDot, setActiveDot] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const idx = await loadSearchIndex();
      const hit = idx.find((s) => s.id === product.id);
      if (!hit) return;
      const leaf = await loadLeafFile(hit.file);
      if (cancelled || !leaf) return;
      const all = leaf.products;
      const curIdx = all.findIndex((p) => p.id === product.id);
      const total = all.length;
      const seen = new Set<string>();
      const pool: Product[] = [];
      for (let i = 1; i <= 5; i++) {
        const b = all[((curIdx - i) + total) % total];
        const a = all[(curIdx + i) % total];
        if (b.id !== product.id && !seen.has(b.id)) { seen.add(b.id); pool.push(b); }
        if (a.id !== product.id && !seen.has(a.id)) { seen.add(a.id); pool.push(a); }
      }
      const shuffled = pool.sort(() => Math.random() - 0.5);
      setRelated(shuffled);
      setCrumbs(hit.path.map((p) => ({ label: p })));
    })();
    return () => { cancelled = true; };
  }, [product.id]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || related.length === 0) return;
    const handleScroll = () => {
      const half = el.scrollWidth / 2;
      const normalised = el.scrollLeft >= half ? el.scrollLeft - half : el.scrollLeft;
      const progress = half > 0 ? normalised / half : 0;
      setActiveDot(Math.min(2, Math.floor(progress * 3)));
      if (el.scrollLeft >= half) {
        el.scrollLeft -= half;
      }
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [related]);

  const relatedScrollBy = (amount: number) =>
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });

  const doubledRelated = [...related, ...related];

  return (
    <article className="pb-8">
      {/* 2-column layout on desktop */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:max-w-6xl lg:mx-auto lg:px-8 lg:pt-8">
        {/* Left column: product image */}
        <div
          className="w-full bg-white flex items-center justify-center lg:sticky lg:top-24 lg:self-start"
          style={{ height: "min(60vw, 500px)", minHeight: 280 }}
        >
          <img
            src={productCard(product)}
            alt={product.name}
            onError={onImageError}
            className="max-h-full max-w-full object-contain p-6"
          />
        </div>

        {/* Right column: breadcrumb, header, qty+button, specs */}
        <div className="px-4 md:px-6 lg:px-0 space-y-6 pt-4">
          <nav className="flex items-center gap-1.5 text-xs text-[#6E6E73] capitalize flex-wrap">
            <Link to="/" className="text-[#7C3AED] hover:underline">Home</Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-[#9E9E9E]" />
                {i === crumbs.length - 1 ? (
                  <span className="text-[#6E6E73]">{c.label}</span>
                ) : (
                  <Link
                    to="/products/$category"
                    params={{ category: c.label.toLowerCase().replace(/\s+/g, "-") }}
                    search={{}}
                    className="text-[#7C3AED] hover:underline capitalize"
                  >
                    {c.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          <header className="space-y-2">
            {product.brand && (
              <p className="text-[13px] font-bold uppercase tracking-[0.05em] text-[#7C3AED]">
                {product.brand}
                {product.series ? ` · ${product.series}` : ""}
              </p>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-black leading-tight">
              {product.name}
            </h1>
            <p className="text-[26px] font-bold text-black">
              {formatPrice(product.price_aud)}
            </p>
            <p className="text-[13px] md:text-[14px] text-[#7C3AED] font-semibold">
              🛵 Local courier delivery — usually 30 min to 2 hrs, or via Australia Post.
            </p>
          </header>

          <div className="flex items-center gap-3">
            <QuantitySelector value={qty} onChange={(v) => setQty(Math.max(1, v))} min={1} />
            <button
              type="button"
              onClick={() => {
                add(product.id, qty);
                toast.success(`Added ${qty} × ${product.name} to your list`);
              }}
              className="flex-1 lg:flex-none lg:min-w-[260px] lg:px-10 h-11 inline-flex items-center justify-center gap-2 bg-black text-white text-[15px] font-semibold rounded-none hover:opacity-90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add to My List
            </button>
          </div>

          <section className="space-y-4">
            <div>
              <h2 className="text-3xl font-bold text-black tracking-tight">Specifications</h2>
              <p className="text-[15px] text-[#9E9E9E] mt-1">Technical details</p>
            </div>
            <SpecificationsTable specs={product.specs} />
          </section>
        </div>
      </div>

      {/* You May Also Like — full width below the 2-col grid */}
      {related.length > 0 && (
        <div className="mt-6 px-4 md:px-6 space-y-3">
          {/* Mobile title */}
          <h2 className="lg:hidden text-lg font-bold text-black">You May Also Like</h2>

          {/* Desktop title + arrows */}
          <div className="hidden lg:flex items-center justify-between">
            <h2 className="text-xl font-bold text-black">You May Also Like</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => relatedScrollBy(-400)}
                aria-label="Scroll left"
                className="h-9 w-9 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-black" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => relatedScrollBy(400)}
                aria-label="Scroll right"
                className="h-9 w-9 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
              >
                <ArrowRight className="h-4 w-4 text-black" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div
            ref={scrollerRef}
            className="flex gap-0 md:gap-4 lg:gap-4 overflow-x-auto scrollbar-none -mx-4 md:-mx-6 lg:mx-0 lg:px-0 pb-2"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
          >
            {doubledRelated.map((p, i) => (
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
          <div className="flex lg:hidden justify-center items-center gap-2 pt-1">
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
        </div>
      )}
    </article>
  );
}
