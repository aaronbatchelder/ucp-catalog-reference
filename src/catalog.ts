// Static catalog. Deliberately small: one product family (black jeans) whose
// variants differ only in how their list_price comparison claim is backed, so
// a platform can see substantiated vs. unsubstantiated anchors side by side.
export type Price = { amount: number; currency: string };
export type Variant = {
  id: string;
  sku: string;
  title: string;
  description: { plain: string };
  price: Price;
  list_price?: Price;
  /** com.aaronbatchelder.price_substantiation — see schemas/price_substantiation.json */
  list_price_basis?: {
    basis: "prior_price" | "msrp" | string;
    reference_price: Price;
    period?: { start: string; end: string };
    source?: string;
  };
  availability: { available: boolean; status: string };
  options: { name: string; label: string }[];
  tags: string[];
};
export type Product = {
  id: string;
  handle: string;
  title: string;
  description: { plain: string };
  url: string;
  categories: { value: string; taxonomy: string }[];
  price_range: { min: Price; max: Price };
  media: { type: "image"; url: string; alt_text: string }[];
  options: { name: string; values: { label: string }[] }[];
  variants: Variant[];
  rating: { value: number; scale_max: number; count: number };
  tags: string[];
};

const SITE = "https://ucp.aaronbatchelder.com";
const jeans = (id: string, currency: string, price: number, extra: Partial<Variant> = {}): Variant => ({
  id: `gid://aaronbatchelder/Variant/${id}`,
  sku: id.toUpperCase(),
  title: "32 x 32",
  description: { plain: "Black slim-fit jeans, 98% cotton / 2% elastane, waist 32 length 32." },
  price: { amount: price, currency },
  availability: { available: true, status: "in_stock" },
  options: [{ name: "Size", label: "32 x 32" }],
  tags: ["jeans", "black", "denim"],
  ...extra,
});

export const products: Product[] = [
  {
    id: "gid://aaronbatchelder/Product/black-jeans",
    handle: "black-jeans",
    title: "Black Slim Jeans",
    description: { plain: "Black slim-fit jeans in 98% cotton / 2% elastane. Four otherwise identical listings that differ only in how their list price is substantiated." },
    url: `${SITE}/products/black-jeans`,
    categories: [{ value: "204", taxonomy: "google_product_category" }, { value: "Apparel > Jeans", taxonomy: "merchant" }],
    price_range: { min: { amount: 6500, currency: "USD" }, max: { amount: 7900, currency: "EUR" } },
    media: [{ type: "image", url: `${SITE}/media/black-jeans.jpg`, alt_text: "Black slim-fit jeans, front view" }],
    options: [{ name: "Size", values: [{ label: "32 x 32" }] }],
    variants: [
      // EU listing: reduced from a €99 list, but the lowest price in the prior 30 days was €89.
      jeans("jeans-eu-30day", "EUR", 7900, {
        list_price: { amount: 9900, currency: "EUR" },
        list_price_basis: { basis: "prior_price", reference_price: { amount: 8900, currency: "EUR" }, period: { start: "2026-08-20", end: "2026-09-19" } },
      }),
      // US listing against a manufacturer's suggested price.
      jeans("jeans-msrp", "USD", 6500, {
        list_price: { amount: 9000, currency: "USD" },
        list_price_basis: { basis: "msrp", reference_price: { amount: 9000, currency: "USD" }, source: "Denim Co." },
      }),
      // Control: the bare anchor. Same numbers, nothing behind them.
      jeans("jeans-anchor-only", "USD", 6500, { list_price: { amount: 9000, currency: "USD" } }),
      // Control: no comparison claim at all.
      jeans("jeans-plain", "USD", 6500),
    ],
    rating: { value: 4.5, scale_max: 5, count: 128 },
    tags: ["jeans", "black", "denim"],
  },
  {
    id: "gid://aaronbatchelder/Product/black-tee",
    handle: "black-tee",
    title: "Black Crew T-Shirt",
    description: { plain: "Heavyweight black cotton crew-neck t-shirt." },
    url: `${SITE}/products/black-tee`,
    categories: [{ value: "212", taxonomy: "google_product_category" }, { value: "Apparel > Tops", taxonomy: "merchant" }],
    price_range: { min: { amount: 2500, currency: "USD" }, max: { amount: 2500, currency: "USD" } },
    media: [{ type: "image", url: `${SITE}/media/black-tee.jpg`, alt_text: "Black crew-neck t-shirt" }],
    options: [{ name: "Size", values: [{ label: "M" }] }],
    variants: [{
      id: "gid://aaronbatchelder/Variant/tee-black-m", sku: "TEE-BLACK-M", title: "M",
      description: { plain: "Black crew-neck t-shirt, size M." },
      price: { amount: 2500, currency: "USD" },
      availability: { available: true, status: "in_stock" },
      options: [{ name: "Size", label: "M" }], tags: ["tee", "black", "cotton"],
    }],
    rating: { value: 4.2, scale_max: 5, count: 41 },
    tags: ["tee", "black", "cotton"],
  },
];

/** Every query term must appear in the product's title, tags, or description. */
export function search(query: string | undefined): Product[] {
  const terms = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return products;
  return products.filter((p) => {
    const hay = [p.title, p.description.plain, ...p.tags].join(" ").toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export type Correlation = { id: string; match: "exact" | "featured" };
/**
 * Resolve lookup identifiers (lookup.md, Client Correlation). A variant id or
 * SKU resolves `exact`; a product id resolves to its first variant as
 * `featured`. Returns products trimmed to only the variants that resolved,
 * each carrying the `inputs` that led to it.
 */
export function lookup(ids: string[]) {
  const out: (Product & { variants: (Variant & { inputs: Correlation[] })[] })[] = [];
  for (const p of products) {
    const hits = new Map<string, Correlation[]>();
    for (const id of ids) {
      const exact = p.variants.find((v) => v.id === id || v.sku === id);
      const v = exact ?? (p.id === id ? p.variants[0] : undefined);
      if (!v) continue;
      const list = hits.get(v.id) ?? [];
      list.push({ id, match: exact ? "exact" : "featured" });
      hits.set(v.id, list);
    }
    if (hits.size === 0) continue;
    out.push({ ...p, variants: p.variants.filter((v) => hits.has(v.id)).map((v) => ({ ...v, inputs: hits.get(v.id)! })) });
  }
  return out;
}

export const getProduct = (id: string) => products.find((p) => p.id === id || p.handle === id);
