import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, ChevronRight, Search, Tag, X, SlidersHorizontal } from "lucide-react";
import {
  formatPrice,
  loadLeafFile,
  loadMeta,
  onImageError,
  resolveLeaf,
  subcategoryImage,
  subSubImage,
} from "@/lib/data";
import type { CategoryMeta, LeafFile, SubCategoryMeta } from "@/lib/types";
import { ProductGrid } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

const PRODUCTS_PER_PAGE = 50;

const SORT_OPTIONS = [
  { key: "price_asc",  label: "Price: Low–High", short: "Price ↑" },
  { key: "price_desc", label: "Price: High–Low",  short: "Price ↓" },
  { key: "name_asc",  label: "Name: A–Z",        short: "A–Z" },
];

const PRICE_RANGES = [
  { key: "under20", label: "Under A$20", test: (p: number) => p < 20 },
  { key: "20to50", label: "A$20 – A$50", test: (p: number) => p >= 20 && p < 50 },
  { key: "50to100", label: "A$50 – A$100", test: (p: number) => p >= 50 && p < 100 },
  { key: "100to200", label: "A$100 – A$200", test: (p: number) => p >= 100 && p < 200 },
  { key: "over200", label: "A$200+", test: (p: number) => p >= 200 },
];

type Search = {
  sub?: string;
  subsub?: string;
  brand?: string;
  series?: string;
  price?: string;
  sort?: string;
};

export const Route = createFileRoute("/products/$category")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    sub: typeof s.sub === "string" ? s.sub : undefined,
    subsub: typeof s.subsub === "string" ? s.subsub : undefined,
    brand: typeof s.brand === "string" ? s.brand : undefined,
    series: typeof s.series === "string" ? s.series : undefined,
    price: typeof s.price === "string" ? s.price : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
  }),
  component: CategoryPage,
});

const scrollKey = (p: string) => `scrollPos:${p}`;
const pageKey = (p: string) => `page:${p}`;

function CategoryPage() {
  const { category } = Route.useParams();
  const { sub, subsub, brand, series, price, sort } = Route.useSearch();
  const navigate = useNavigate();
  const [cat, setCat] = useState<CategoryMeta | null>(null);
  const [leaf, setLeaf] = useState<LeafFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const navTo = (s: Partial<Search>) =>
    navigate({
      to: "/products/$category",
      params: { category },
      search: { sub, subsub, brand, series, price, sort, ...s },
      replace: true,
    });

  useEffect(() => {
    if (!sortDropdownOpen) return;
    const handler = () => setSortDropdownOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [sortDropdownOpen]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLeaf(null);
    loadMeta().then((meta) => {
      const c = meta.categories.find((x) => x.slug === category) ?? null;
      if (cancelled) return;
      setCat(c);
      const resolved = resolveLeaf(c ?? undefined, sub, subsub);
      if (!resolved) { setLoading(false); return; }
      loadLeafFile(resolved.file).then((lf) => {
        if (cancelled) return;
        setLeaf(lf);
        setLoading(false);
      });
    });
    return () => { cancelled = true; };
  }, [category, sub, subsub]);

  useEffect(() => { setCurrentPage(1); }, [brand, series, sub, subsub, category, price, sort]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname + window.location.search;
    const savedPage = sessionStorage.getItem(pageKey(path));
    if (savedPage) setCurrentPage(Number(savedPage) || 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !leaf) return;
    const path = window.location.pathname + window.location.search;
    const savedScroll = sessionStorage.getItem(scrollKey(path));
    if (savedScroll) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: Number(savedScroll), behavior: "auto" });
        sessionStorage.removeItem(scrollKey(path));
      });
    }
  }, [leaf, currentPage]);

  const products = leaf?.products ?? [];

  const brandSeriesFiltered = useMemo(
    () =>
      products
        .filter((p) => !brand || p.brand === brand)
        .filter((p) => !series || p.series === series),
    [products, brand, series],
  );

  const filtered = useMemo(
    () =>
      brandSeriesFiltered.filter((p) => {
        if (!price) return true;
        const range = PRICE_RANGES.find((r) => r.key === price);
        if (!range) return true;
        if (p.price_aud == null) return false;
        return range.test(p.price_aud);
      }),
    [brandSeriesFiltered, price],
  );

  const sortedFiltered = useMemo(() => {
    if (!sort) return filtered;
    const copy = [...filtered];
    if (sort === "price_asc") return copy.sort((a, b) => (a.price_aud ?? Infinity) - (b.price_aud ?? Infinity));
    if (sort === "price_desc") return copy.sort((a, b) => (b.price_aud ?? -Infinity) - (a.price_aud ?? -Infinity));
    if (sort === "name_asc") return copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PRODUCTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleProducts = useMemo(() => {
    const start = (safePage - 1) * PRODUCTS_PER_PAGE;
    return sortedFiltered.slice(start, start + PRODUCTS_PER_PAGE);
  }, [sortedFiltered, safePage]);

  const handleProductClick = () => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname + window.location.search;
    sessionStorage.setItem(scrollKey(path), String(window.scrollY));
    sessionStorage.setItem(pageKey(path), String(safePage));
  };

  const goToPage = (n: number) => {
    setCurrentPage(n);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const currentSub = sub ? cat?.subcategories.find((s) => s.slug === sub) : undefined;
  const title = subsub
    ? currentSub?.sub_subcategories.find((x) => x.slug === subsub)?.label
    : sub ? currentSub?.label : cat?.label ?? category;

  return (
    <div className="py-6 space-y-5 max-w-7xl mx-auto">
      <div className="px-4 md:px-6 space-y-2">
        <Breadcrumb category={cat} sub={sub} subsub={subsub} />
        <h1 className="text-[28px] md:text-4xl font-extrabold capitalize text-black">{title}</h1>
        {leaf && (
          <p className="text-sm text-[#6E6E73]">
            Showing {(safePage - 1) * PRODUCTS_PER_PAGE + 1}–
            {Math.min(safePage * PRODUCTS_PER_PAGE, sortedFiltered.length)} of {sortedFiltered.length} products
          </p>
        )}
      </div>

      {!loading && !leaf && cat && <CategoryPicker category={cat} sub={sub} />}

      {/* Mobile filter bar — shown only when a leaf is loaded */}
      {leaf && (
        <MobileFilters
          leaf={leaf}
          category={category}
          sub={sub}
          subsub={subsub}
          brand={brand}
          series={series}
          sort={sort}
        />
      )}

      <div className="md:flex md:gap-6 md:px-6">
        {leaf && (
          <aside className="hidden md:block w-64 shrink-0">
            <BrandSeriesPanel
              leaf={leaf}
              category={category}
              sub={sub}
              subsub={subsub}
              brand={brand}
              series={series}
            />
          </aside>
        )}

        <div className="flex-1 min-w-0 space-y-4">
          {leaf && (
            <div className="hidden md:flex items-center justify-end px-4 py-3 border-b border-[#F0F0F0]">
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSortDropdownOpen((v) => !v); }}
                  className="flex items-center gap-2 text-[14px] font-medium text-black border border-[#E5E7EB] px-4 py-2 hover:bg-[#FAFAFA]"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  Sort by: {SORT_OPTIONS.find((o) => o.key === sort)?.short ?? "Default"}
                  <ChevronDown className="h-4 w-4 text-[#6E6E73]" />
                </button>
                {sortDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-[#E5E7EB] shadow-lg z-50 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => { setSortDropdownOpen(false); navTo({ brand, series, sort: undefined }); }}
                      className="w-full flex items-center justify-between px-5 py-3 border-b border-[#F5F5F5] hover:bg-[#FAFAFA]"
                    >
                      <span className={`text-[14px] ${!sort ? "font-bold text-black" : "text-[#6E6E73]"}`}>Default</span>
                      {!sort && <span className="text-[#7C3AED] text-[13px] font-semibold">✓</span>}
                    </button>
                    {SORT_OPTIONS.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => { setSortDropdownOpen(false); navTo({ brand, series, sort: o.key }); }}
                        className="w-full flex items-center justify-between px-5 py-3 border-b border-[#F5F5F5] hover:bg-[#FAFAFA]"
                      >
                        <span className={`text-[14px] ${sort === o.key ? "font-bold text-black" : "text-[#6E6E73]"}`}>
                          {o.label}
                        </span>
                        {sort === o.key && <span className="text-[#7C3AED] text-[13px] font-semibold">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {loading ? (
            <p className="px-4 text-[#6E6E73] text-sm">Loading…</p>
          ) : !leaf ? null : sortedFiltered.length === 0 ? (
            <p className="px-4 text-[#6E6E73] text-sm">No products match.</p>
          ) : (
            <>
              <ProductGrid products={visibleProducts} onProductClick={handleProductClick} />
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onChange={goToPage}
                totalItems={sortedFiltered.length}
                itemsPerPage={PRODUCTS_PER_PAGE}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Filter Bar ────────────────────────────────────────────────────────

function MobileFilters({
  leaf,
  category,
  sub,
  subsub,
  brand,
  series,
  sort,
}: {
  leaf: LeafFile;
  category: string;
  sub?: string;
  subsub?: string;
  brand?: string;
  series?: string;
  sort?: string;
}) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const navigate = useNavigate();

  const activeBrandEntry = brand ? leaf.brands.find((b) => b.name === brand) : null;
  const seriesList = activeBrandEntry ? (leaf.series_index[activeBrandEntry.name] ?? []) : [];
  const hasFilters = !!(brand);
  const activeSortLabel = sort ? SORT_OPTIONS.find((o) => o.key === sort)?.short : null;

  const filteredBrands = brandSearch.trim()
    ? leaf.brands.filter((b) => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
    : leaf.brands;

  const navTo = (s: Search) =>
    navigate({
      to: "/products/$category",
      params: { category },
      search: { sub, subsub, sort, ...s },
      replace: true,
    });

  return (
    <div className="md:hidden px-4 space-y-2">
      {/* Filters label */}
      <div className="flex items-center gap-1.5">
        <SlidersHorizontal className="h-3 w-3 text-[#9E9E9E]" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9E9E9E]">
          Filters
        </span>
      </div>

      {/* Pill row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {/* Brand pill / tag */}
        {brand ? (
          <Link
            to="/products/$category"
            params={{ category }}
            search={{ sub, subsub, sort }}
            replace
            className="shrink-0 inline-flex items-center gap-1.5 bg-[#F0EEFF] text-[#5B3DF5] border border-[#DDD6FF] px-3 py-2 text-[13px] font-semibold"
          >
            {brand}
            <X className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => { setBrandSearch(""); setBrandOpen(true); }}
            className="shrink-0 flex-1 inline-flex items-center justify-center gap-2 bg-white border border-[#E0E0E0] px-4 py-2.5 text-[13px] font-medium text-black"
          >
            <Tag className="h-3.5 w-3.5 text-[#6E6E73]" />
            Brand
            <ChevronDown className="h-3.5 w-3.5 text-[#6E6E73] ml-auto" />
          </button>
        )}

        {/* Series pill — only when brand selected and has series */}
        {brand && seriesList.length > 0 && (
          series ? (
            <Link
              to="/products/$category"
              params={{ category }}
              search={{ sub, subsub, brand, sort }}
              replace
              className="shrink-0 inline-flex items-center gap-1.5 bg-[#F0EEFF] text-[#5B3DF5] border border-[#DDD6FF] px-3 py-2 text-[13px] font-semibold"
            >
              {series}
              <X className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setSeriesOpen(true)}
              className="shrink-0 inline-flex items-center gap-2 bg-white border border-[#E0E0E0] px-4 py-2.5 text-[13px] font-medium text-black"
            >
              Series
              <ChevronDown className="h-3.5 w-3.5 text-[#6E6E73]" />
            </button>
          )
        )}

        {/* Sort pill / tag */}
        {sort ? (
          <Link
            to="/products/$category"
            params={{ category }}
            search={{ sub, subsub, brand, series }}
            replace
            className="shrink-0 inline-flex items-center gap-1.5 bg-[#F0EEFF] text-[#5B3DF5] border border-[#DDD6FF] px-3 py-2 text-[13px] font-semibold"
          >
            {activeSortLabel}
            <X className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            className="shrink-0 flex-1 inline-flex items-center justify-center gap-2 bg-white border border-[#E0E0E0] px-4 py-2.5 text-[13px] font-medium text-black"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-[#6E6E73]" />
            Sort by
            <ChevronDown className="h-3.5 w-3.5 text-[#6E6E73] ml-auto" />
          </button>
        )}
      </div>

      {/* Clear all */}
      {hasFilters && (
        <Link
          to="/products/$category"
          params={{ category }}
          search={{ sub, subsub }}
          replace
          className="inline-flex items-center gap-1 text-[12px] text-[#9E9E9E] underline underline-offset-2"
        >
          Clear all filters
        </Link>
      )}

      {/* ── Brand bottom sheet ── */}
      <Sheet open={brandOpen} onOpenChange={setBrandOpen}>
        <SheetContent
          side="bottom"
          className="h-[78vh] bg-white border-0 p-0 [&>button]:hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#F0F0F0] shrink-0">
            <h2 className="text-[18px] font-bold text-black">Brands</h2>
            <button type="button" onClick={() => setBrandOpen(false)} className="p-1">
              <X className="h-5 w-5 text-[#6E6E73]" />
            </button>
          </div>
          <div className="px-4 py-3 border-b border-[#F0F0F0] shrink-0">
            <div className="flex items-center gap-2 border border-[#E0E0E0] px-3 py-2.5">
              <Search className="h-4 w-4 text-[#9E9E9E] shrink-0" />
              <input
                type="text"
                placeholder="Search brand..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="flex-1 text-[14px] outline-none bg-transparent placeholder:text-[#C0C0C0]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredBrands.map((b) => (
              <button
                key={b.slug}
                type="button"
                onClick={() => { setBrandOpen(false); navTo({ brand: b.name, series: undefined }); }}
                className="w-full flex items-center px-5 py-4 border-b border-[#F5F5F5] hover:bg-[#FAFAFA] active:bg-[#F5F5F5]"
              >
                <span className="flex-1 text-[15px] text-black text-left">{b.name}</span>
                <span className="text-[14px] font-semibold text-[#5B3DF5]">{b.product_count}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Series bottom sheet ── */}
      <Sheet open={seriesOpen} onOpenChange={setSeriesOpen}>
        <SheetContent
          side="bottom"
          className="h-[65vh] bg-white border-0 p-0 [&>button]:hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#F0F0F0] shrink-0">
            <h2 className="text-[18px] font-bold text-black">Series — {brand}</h2>
            <button type="button" onClick={() => setSeriesOpen(false)} className="p-1">
              <X className="h-5 w-5 text-[#6E6E73]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {seriesList.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setSeriesOpen(false); navTo({ brand, series: s }); }}
                className="w-full flex items-center px-5 py-4 border-b border-[#F5F5F5] hover:bg-[#FAFAFA] active:bg-[#F5F5F5]"
              >
                <span className="flex-1 text-[15px] text-black text-left uppercase tracking-wide">{s}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sort bottom sheet ── */}
      <Sheet open={sortOpen} onOpenChange={setSortOpen}>
        <SheetContent
          side="bottom"
          className="h-[45vh] bg-white border-0 p-0 [&>button]:hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#F0F0F0] shrink-0">
            <h2 className="text-[18px] font-bold text-black">Sort by</h2>
            <button type="button" onClick={() => setSortOpen(false)} className="p-1">
              <X className="h-5 w-5 text-[#6E6E73]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => { setSortOpen(false); navTo({ brand, series, sort: undefined }); }}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-[#F5F5F5] hover:bg-[#FAFAFA] active:bg-[#F5F5F5]"
            >
              <span className={`text-[15px] ${!sort ? "font-bold text-black" : "text-[#6E6E73]"}`}>Default</span>
              {!sort && <span className="text-[#7C3AED] text-[13px] font-semibold">✓</span>}
            </button>
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => { setSortOpen(false); navTo({ brand, series, sort: o.key }); }}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-[#F5F5F5] hover:bg-[#FAFAFA] active:bg-[#F5F5F5]"
              >
                <span className={`text-[15px] ${sort === o.key ? "font-bold text-black" : "text-[#6E6E73]"}`}>
                  {o.label}
                </span>
                {sort === o.key && <span className="text-[#7C3AED] text-[13px] font-semibold">✓</span>}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({
  category,
  sub,
  subsub,
}: {
  category: CategoryMeta | null;
  sub?: string;
  subsub?: string;
}) {
  if (!category) return null;
  const subMeta = sub ? category.subcategories.find((s) => s.slug === sub) : undefined;
  const subsubMeta = subsub ? subMeta?.sub_subcategories.find((x) => x.slug === subsub) : undefined;
  return (
    <nav className="text-xs text-[#6E6E73] flex items-center gap-1.5 capitalize flex-wrap">
      <Link to="/" className="text-[#7C3AED] hover:underline">Home</Link>
      <ChevronRight className="h-3 w-3 text-[#9E9E9E]" />
      <Link
        to="/products/$category"
        params={{ category: category.slug }}
        search={{}}
        className="text-[#7C3AED] hover:underline"
      >
        {category.label}
      </Link>
      {subMeta && (
        <>
          <ChevronRight className="h-3 w-3 text-[#9E9E9E]" />
          <Link
            to="/products/$category"
            params={{ category: category.slug }}
            search={{ sub: subMeta.slug }}
            className={subsubMeta ? "text-[#7C3AED] hover:underline" : "text-[#6E6E73]"}
          >
            {subMeta.label}
          </Link>
        </>
      )}
      {subsubMeta && (
        <>
          <ChevronRight className="h-3 w-3 text-[#9E9E9E]" />
          <span>{subsubMeta.label}</span>
        </>
      )}
    </nav>
  );
}

// ─── Desktop Brand/Series Panel ───────────────────────────────────────────────

function BrandSeriesPanel({
  leaf,
  category,
  sub,
  subsub,
  brand,
  series,
}: {
  leaf: LeafFile;
  category: string;
  sub?: string;
  subsub?: string;
  brand?: string;
  series?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(brand ?? null);

  return (
    <div className="p-2 text-sm">
      <Link
        to="/products/$category"
        params={{ category }}
        search={{ sub, subsub }}
        replace
        className={`block px-4 py-3.5 rounded-[10px] text-[15px] font-semibold text-center ${
          !brand ? "bg-black text-white" : "bg-[#F5F5F7] text-black"
        }`}
      >
        All products ({leaf.products.length})
      </Link>

      <ul className="mt-2 space-y-1 max-h-[60vh] overflow-y-auto">
        {leaf.brands.map((b) => {
          const seriesList = leaf.series_index[b.name] ?? [];
          const hasSeries = seriesList.length > 0;
          const isExpanded = expanded === b.name;
          const isActive = brand === b.name && !series;
          return (
            <li key={b.slug}>
              <div className="flex items-center">
                <Link
                  to="/products/$category"
                  params={{ category }}
                  search={{ sub, subsub, brand: b.name }}
                  onClick={() => setExpanded(b.name)}
                  className={`flex-1 px-3 py-2.5 rounded-[10px] flex items-center gap-2 ${
                    isActive ? "bg-[#F5F5F7] text-black font-semibold" : "hover:bg-[#F5F5F7]"
                  }`}
                >
                  <span className="flex-1 truncate text-[15px] text-black">{b.name}</span>
                  <span className="text-xs text-[#9E9E9E]">{b.product_count}</span>
                </Link>
              </div>
              {hasSeries && isExpanded && (
                <ul className="ml-4 pl-2 space-y-0.5 py-1">
                  {seriesList.map((s) => (
                    <li key={s}>
                      <Link
                        to="/products/$category"
                        params={{ category }}
                        search={{ sub, subsub, brand: b.name, series: s }}
                        className={`block px-3 py-1.5 text-[14px] rounded-md ${
                          brand === b.name && series === s
                            ? "text-black font-semibold"
                            : "text-[#6E6E73] hover:bg-[#F5F5F7]"
                        }`}
                      >
                        {s}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Category Picker (no leaf loaded yet) ────────────────────────────────────

function CategoryPicker({
  category,
  sub,
}: {
  category: CategoryMeta;
  sub?: string;
}) {
  const currentSub = sub ? category.subcategories.find((s) => s.slug === sub) : undefined;

  type Entry = {
    slug: string;
    label: string;
    count: number;
    search: { sub?: string; subsub?: string };
    parentSlug?: string;
  };

  let entries: Entry[] = [];
  if (currentSub) {
    entries = currentSub.sub_subcategories.map((ss) => ({
      slug: ss.slug,
      label: ss.label,
      count: ss.count,
      search: { sub: currentSub.slug, subsub: ss.slug },
      parentSlug: currentSub.slug,
    }));
  } else {
    entries = category.subcategories.map((s: SubCategoryMeta) => ({
      slug: s.slug,
      label: s.label,
      count: s.count,
      search: { sub: s.slug },
    }));
  }

  if (entries.length === 0) return null;

  return (
    <div className="mx-4 md:mx-6 rounded-2xl bg-[#F5F5F7] p-4">
      <ul className="space-y-1">
        {entries.map((e) => (
          <li key={e.slug}>
            <Link
              to="/products/$category"
              params={{ category: category.slug }}
              search={e.search}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors"
            >
              <img
                src={e.parentSlug ? subSubImage(e.parentSlug, e.slug) : subcategoryImage(e.slug)}
                alt=""
                className="h-9 w-9 object-contain shrink-0"
                onError={onImageError}
              />
              <span className="text-[15px] text-black capitalize flex-1">{e.label}</span>
              <span className="text-xs text-[#9E9E9E]">{e.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
