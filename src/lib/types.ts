// New catalogue v2 schema.
export interface ProductImage {
  thumb: string;
  card: string;
}

export interface Product {
  id: string;
  source_id?: string;
  name: string;
  brand: string;
  series: string; // "" when no series
  price_aud: number | null;
  currency: string;
  specs: Record<string, string>;
  image: ProductImage;
  // Derived by the loader from the leaf path.
  category?: string;
  subcategory?: string;
  subsubcategory?: string;
}

export interface BrandEntry {
  name: string;
  slug: string;
  product_count: number;
}

export interface LeafFile {
  path: string[];
  file: string;
  brands: BrandEntry[];
  series_index: Record<string, string[]>;
  products: Product[];
}

export interface SubSubCategoryMeta {
  slug: string;
  label: string;
  count: number;
  file: string;
  brands?: string[];
}

export interface SubCategoryMeta {
  slug: string;
  label: string;
  count: number;
  file?: string;
  sub_subcategories: SubSubCategoryMeta[];
  brands?: string[];
}

export interface CategoryMeta {
  slug: string;
  label: string;
  count?: number;
  file?: string;
  subcategories: SubCategoryMeta[];
  brands?: string[];
}

export interface CatalogueMeta {
  version?: string;
  total_products?: number;
  categories: CategoryMeta[];
}

// search.json entry shape
export interface SearchEntry {
  id: string;
  name: string;
  brand: string;
  series: string;
  price_aud: number | null;
  path: string[];
  file: string;
  thumb: string;
}

export interface ListItem {
  productId: string;
  quantity: number;
}
