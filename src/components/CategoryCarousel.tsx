import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import {
  buildNavTree,
  categoryImage,
  loadMeta,
  onImageError,
  subcategoryImage,
  subSubImage,
} from "@/lib/data";
import type { NavNode } from "@/lib/data";


export function CategoryCarousel() {
  const [tree, setTree] = useState<NavNode[]>([]);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMeta().then((m) => setTree(buildNavTree(m))).catch(() => setTree([]));
  }, []);

  if (tree.length === 0) return null;

  const scrollBy = (amount: number) =>
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });

  const activeCat = tree.find((c) => c.slug === openCat);
  const showPanel = activeCat && activeCat.action === "expand";
  const activeSub = activeCat?.children.find((s) => s.slug === openSub);
  const subShowing = activeSub && activeSub.action === "expand";

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between px-4 md:px-6">
        <h2 className="text-xl md:text-2xl font-bold text-black">Browse Categories</h2>
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-400)}
            aria-label="Scroll left"
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(400)}
            aria-label="Scroll right"
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-6 md:gap-8 overflow-x-auto px-4 md:px-6 pb-2"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {tree.map((cat) => {
          const isActive = openCat === cat.slug;
          const isLeaf = cat.action === "load";
          const isWide = ["accessories", "cannabinoids", "edibles"].includes(cat.slug);

          const inner = (
            <>
              <div className="h-32 flex items-center justify-center">
                <img
                  src={categoryImage(cat.slug)}
                  alt=""
                  className={`object-contain ${isWide ? "h-32 w-32" : "h-28 w-28"}`}
                  onError={onImageError}
                />
              </div>
              <span
                className={`text-[13px] text-center mt-2 capitalize ${
                  isActive ? "text-[#7C3AED] font-semibold" : "text-black"
                }`}
              >
                {cat.label}
              </span>
              {isActive && (
                <span className="mt-1 block h-[2px] w-6 rounded-full bg-[#7C3AED]" />
              )}
            </>
          );

          const handleClick = () => {
            if (isLeaf) return;
            setOpenCat(isActive ? null : cat.slug);
            setOpenSub(null);
          };

          const cardW = isWide ? "w-[128px]" : "w-[88px]";

          return isLeaf ? (
            <Link
              key={cat.slug}
              to="/products/$category"
              params={{ category: cat.slug }}
              search={{}}
              className={`shrink-0 flex flex-col items-center ${cardW}`}
              style={{ scrollSnapAlign: "start" }}
            >
              {inner}
            </Link>
          ) : (
            <button
              key={cat.slug}
              type="button"
              onClick={handleClick}
              className={`shrink-0 flex flex-col items-center ${cardW}`}
              style={{ scrollSnapAlign: "start" }}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {showPanel && activeCat && (
        <div className="mx-4 md:mx-6 px-1 transition-all duration-200">

          {!subShowing ? (
            <ul>
              {activeCat.children.map((sub) => {
                const isLeafSub = sub.action === "load";
                const row = (
                  <>
                    <img
                      src={subcategoryImage(sub.slug)}
                      alt=""
                      className="h-9 w-9 object-contain shrink-0"
                      onError={onImageError}
                    />
                    <span className="text-[15px] text-black flex-1 text-left capitalize">
                      {sub.label}
                    </span>
                    <span className="text-xs font-semibold text-[#7C3AED]">{sub.count}</span>
                  </>
                );
                const rowClass = "flex items-center gap-3 py-4";
                return (
                  <li key={sub.slug}>
                    {isLeafSub ? (
                      <Link
                        to="/products/$category"
                        params={{ category: activeCat.slug }}
                        search={{ sub: sub.slug }}
                        className={rowClass}
                      >
                        {row}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenSub(sub.slug)}
                        className={`w-full ${rowClass}`}
                      >
                        {row}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-2">
              <button
                type="button"
                onClick={() => setOpenSub(null)}
                className="flex items-center gap-1 text-xs font-medium text-[#7C3AED] py-3 hover:opacity-70"
              >
                <ChevronRight className="h-3 w-3 rotate-180" /> Back to {activeCat.label}
              </button>
              <ul>
                {activeSub!.children.map((ss) => (
                  <li key={ss.slug}>
                    <Link
                      to="/products/$category"
                      params={{ category: activeCat.slug }}
                      search={{ sub: activeSub!.slug, subsub: ss.slug }}
                      className="flex items-center gap-3 py-4"
                    >
                      <img
                        src={subSubImage(activeSub!.slug, ss.slug)}
                        alt=""
                        className="h-9 w-9 object-contain shrink-0"
                        onError={onImageError}
                      />
                      <span className="text-[15px] text-black flex-1 capitalize">
                        {ss.label}
                      </span>
                      <span className="text-xs font-semibold text-[#7C3AED]">{ss.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
