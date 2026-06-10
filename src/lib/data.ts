import type {
  BrandEntry,
  CatalogueMeta,
  CategoryMeta,
  LeafFile,
  Product,
  SearchEntry,
  SubCategoryMeta,
  SubSubCategoryMeta,
} from "./types";

const BASE = "/data";

const FALLBACK_IMAGE = "/placeholder.svg";

// ----- Caching -----
let metaPromise: Promise<CatalogueMeta> | null = null;
const leafPromises = new Map<string, Promise<LeafFile | null>>();
let searchPromise: Promise<SearchEntry[]> | null = null;

async function safeFetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function loadMeta(): Promise<CatalogueMeta> {
  if (!metaPromise) {
    metaPromise = safeFetchJson<CatalogueMeta>(`${BASE}/meta.json`, { categories: [] });
  }
  return metaPromise;
}

/** Load a leaf file by its meta `file` value (e.g. "e-cigarettes/disposables.json"). */
export async function loadLeafFile(file: string): Promise<LeafFile | null> {
  if (!file) return null;
  if (!leafPromises.has(file)) {
    leafPromises.set(
      file,
      safeFetchJson<LeafFile | null>(`${BASE}/${file}`, null).then((raw) => {
        if (!raw) return null;
        const [cat, sub, subsub] = raw.path;
        const products = (raw.products ?? []).map((p) => ({
          ...p,
          category: cat,
          subcategory: sub,
          subsubcategory: subsub,
        }));
        return { ...raw, products };
      }),
    );
  }
  return leafPromises.get(file)!;
}

export async function loadSearchIndex(): Promise<SearchEntry[]> {
  if (!searchPromise) {
    searchPromise = safeFetchJson<SearchEntry[]>(`${BASE}/search.json`, []);
  }
  return searchPromise;
}

export async function searchProducts(query: string, limit = 20): Promise<SearchEntry[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const index = await loadSearchIndex();
  const out: SearchEntry[] = [];
  for (const item of index) {
    const hay =
      item.name.toLowerCase() +
      " " +
      (item.brand ?? "").toLowerCase() +
      " " +
      (item.series ?? "").toLowerCase();
    if (hay.includes(q)) {
      out.push(item);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Find a product by id — uses search.json to locate the owning leaf file. */
export async function findProduct(id: string): Promise<Product | null> {
  const index = await loadSearchIndex();
  const hit = index.find((s) => s.id === id);
  if (!hit) return null;
  const leaf = await loadLeafFile(hit.file);
  return leaf?.products.find((p) => p.id === id) ?? null;
}

// ----- Navigation helpers -----

export type NavAction = "load" | "expand";

export interface NavNode {
  slug: string;
  label: string;
  count: number;
  file?: string;
  action: NavAction;
  children: NavNode[];
}

export function buildNavTree(meta: CatalogueMeta): NavNode[] {
  return meta.categories.map((cat) => categoryToNav(cat));
}

function categoryToNav(cat: CategoryMeta): NavNode {
  if ((!cat.subcategories || cat.subcategories.length === 0) && cat.file) {
    return {
      slug: cat.slug,
      label: cat.label,
      count: cat.count ?? 0,
      file: cat.file,
      action: "load",
      children: [],
    };
  }
  return {
    slug: cat.slug,
    label: cat.label,
    count: cat.count ?? 0,
    action: "expand",
    children: (cat.subcategories ?? []).map((s) => subToNav(s)),
  };
}

function subToNav(sub: SubCategoryMeta): NavNode {
  if ((!sub.sub_subcategories || sub.sub_subcategories.length === 0) && sub.file) {
    return {
      slug: sub.slug,
      label: sub.label,
      count: sub.count,
      file: sub.file,
      action: "load",
      children: [],
    };
  }
  return {
    slug: sub.slug,
    label: sub.label,
    count: sub.count,
    action: "expand",
    children: (sub.sub_subcategories ?? []).map((ss) => subSubToNav(ss)),
  };
}

function subSubToNav(ss: SubSubCategoryMeta): NavNode {
  return {
    slug: ss.slug,
    label: ss.label,
    count: ss.count,
    file: ss.file,
    action: "load",
    children: [],
  };
}

/** Resolve a leaf within a category from `sub` / `subsub` slugs. */
export function resolveLeaf(
  cat: CategoryMeta | undefined,
  sub?: string,
  subsub?: string,
): { file: string; label: string } | null {
  if (!cat) return null;
  if (!sub) {
    if (cat.file) return { file: cat.file, label: cat.label };
    return null;
  }
  const s = cat.subcategories.find((x) => x.slug === sub);
  if (!s) return null;
  if (!subsub) {
    if (s.file) return { file: s.file, label: s.label };
    return null;
  }
  const ss = s.sub_subcategories.find((x) => x.slug === subsub);
  if (ss?.file) return { file: ss.file, label: ss.label };
  return null;
}

// ----- Image helpers -----

const CATEGORY_IMAGE_ALIASES: Record<string, string> = { tabac: "tobacco" };

const _NI = "/images/newcat";

const SUB_IMAGE_MAP: Record<string, string> = {
  "coils-&-atomizers": `${_NI}/coils-atomizers.webp`,
  "tanks-&-glass": `${_NI}/tanks-glass.webp`,
  "batteries-&-chargers": `${_NI}/batteries-chargers.webp`,
  "tools-&-diy": `${_NI}/tools-diy.webp`,
  "gummies": `${_NI}/edibles-gummies.webp`,
  "concentrate-wax": `${_NI}/concentrate-wax.webp`,
};

const SUBSUB_IMAGE_MAP: Record<string, string> = {
  "coils-&-atomizers/coils": `${_NI}/coils-atomizers-coils.webp`,
  "coils-&-atomizers/atomizers": `${_NI}/coils-atomizers-atomizers.webp`,
  "tanks-&-glass/tanks": `${_NI}/tanks-glass-tanks.webp`,
  "tanks-&-glass/glass": `${_NI}/tanks-glass-glass.webp`,
  "tools-&-diy/tools": `${_NI}/tools-diy-tools.webp`,
  "tools-&-diy/drip-tips": `${_NI}/tools-diy-drip-tips.webp`,
  "tools-&-diy/diy-supplies": `${_NI}/tools-diy-diy-supplies.webp`,
  "tools-&-diy/other": `${_NI}/tools-diy-other.webp`,
  "dry-herb/portable": `${_NI}/dry-herb-portable.webp`,
  "dry-herb/desktop": `${_NI}/dry-herb-desktop.webp`,
  "concentrate-wax/portable": `${_NI}/concentrate-wax-portable.webp`,
  "concentrate-wax/desktop": `${_NI}/concentrate-wax-desktop.webp`,
  "mushroom/gummies": `${_NI}/mushroom-gummies.webp`,
  "mushroom/vapes": `${_NI}/mushroom-vapes.webp`,
  "mushroom/tea": `${_NI}/mushroom-tea.webp`,
  "gummies/delta-gummies": `${_NI}/gummies-delta-gummies.webp`,
  "gummies/cbd-gummies": `${_NI}/gummies-cbd-gummies.webp`,
  "gummies/thc-gummies": `${_NI}/gummies-thc-gummies.webp`,
  "chocolate/delta-chocolate": `${_NI}/chocolate-delta-chocolate.webp`,
  "cannabinoids-vapes/thc-vapes": `${_NI}/vapes-thc-vapes.webp`,
  "cannabinoids-vapes/cbd-vapes": `${_NI}/vapes-cbd-vapes.webp`,
  "cannabinoids-vapes/delta-vapes": `${_NI}/vapes-delta-vapes.webp`,
  "cannabinoids-e-liquids/cbd-e-liquids": `${_NI}/e-liquids-cbd-e-liquids.webp`,
};

export function categoryImage(slug: string): string {
  const name = CATEGORY_IMAGE_ALIASES[slug] ?? slug;
  return `/images/cat/cat-${name}.webp`;
}

export function subcategoryImage(slug: string): string {
  return SUB_IMAGE_MAP[slug] ?? `/images/cat/sub-${slug}.webp`;
}

export function subSubImage(subSlug: string, subsubSlug: string): string {
  return SUBSUB_IMAGE_MAP[`${subSlug}/${subsubSlug}`] ?? subcategoryImage(subsubSlug);
}

export function brandImage(slug: string): string {
  return `/images/brand/brand-${slug}.webp`;
}

export function productThumb(product: Pick<Product, "image"> | undefined): string {
  return product?.image?.thumb || FALLBACK_IMAGE;
}

export function productCard(product: Pick<Product, "image"> | undefined): string {
  return product?.image?.card || product?.image?.thumb || FALLBACK_IMAGE;
}

export function onImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.src.endsWith(FALLBACK_IMAGE)) return;
  img.src = FALLBACK_IMAGE;
}

// Trending — best-effort, optional file. New schema embeds full products.
interface TrendingFile {
  generated_at?: string;
  count?: number;
  products?: Product[];
  trending?: string[]; // legacy
}
let trendingPromise: Promise<Product[]> | null = null;
export async function loadTrendingProducts(): Promise<Product[]> {
  if (!trendingPromise) {
    trendingPromise = safeFetchJson<TrendingFile>(`${BASE}/trending.json`, {}).then(
      (d) => (Array.isArray(d?.products) ? d.products! : []),
    );
  }
  return trendingPromise;
}
export async function loadTrendingIds(): Promise<string[]> {
  const list = await loadTrendingProducts();
  return list.map((p) => p.id);
}

export function formatPrice(price: number | null | undefined): string {
  if (price == null || Number.isNaN(price)) return "Price on request";
  return `A$ ${price.toFixed(2)}`;
}

// Re-export brand type
export type { BrandEntry };
