import { Hono } from "hono";
import { UCP_VERSION, ucpUrl } from "./config.js";
import { getProduct, lookup, search } from "./catalog.js";
import { indexHtml, specHtml } from "./pages.js";
import priceSubstantiationSchema from "../schemas/price_substantiation.json" with { type: "json" };

export const app = new Hono();

// Discovery profile (overview.md): public, cacheable, the one document a
// platform reads before anything else.
app.get("/.well-known/ucp", (c) => {
  const origin = new URL(c.req.url).origin;
  c.header("Cache-Control", "public, max-age=3600");
  return c.json({
    ucp: {
      version: UCP_VERSION,
      services: {
        "dev.ucp.shopping": [
          {
            version: UCP_VERSION,
            spec: ucpUrl("specification/overview"),
            transport: "rest",
            schema: ucpUrl("services/shopping/rest.openapi.json"),
            endpoint: origin,
          },
        ],
      },
      capabilities: {
        "dev.ucp.shopping.catalog.search": [
          { version: UCP_VERSION, spec: ucpUrl("specification/shopping/catalog/search"), schema: ucpUrl("schemas/shopping/catalog_search.json") },
        ],
        "dev.ucp.shopping.catalog.lookup": [
          { version: UCP_VERSION, spec: ucpUrl("specification/shopping/catalog/lookup"), schema: ucpUrl("schemas/shopping/catalog_lookup.json") },
        ],
        // Vendor-namespaced extension (Governance Model: com.{vendor}.* for
        // custom capabilities). Adds list_price_basis to catalog variants.
        "com.aaronbatchelder.price_substantiation": [
          {
            version: UCP_VERSION,
            extends: ["dev.ucp.shopping.catalog.search", "dev.ucp.shopping.catalog.lookup"],
            spec: `${origin}/spec/price-substantiation`,
            schema: `${origin}/schemas/price_substantiation.json`,
          },
        ],
      },
      payment_handlers: {},
    },
  });
});

const envelope = (capability: string) => ({
  version: UCP_VERSION,
  capabilities: { [capability]: [{ version: UCP_VERSION }] },
});

// Catalog Search (catalog/search.md). Read-only; no signature verification is
// required for catalog operations.
app.post("/catalog/search", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const products = search(typeof body.query === "string" ? body.query : undefined);
  return c.json({
    ucp: envelope("dev.ucp.shopping.catalog.search"),
    products,
    pagination: { has_next_page: false, total_count: products.length },
  });
});

// Catalog Lookup (catalog/lookup.md): resolve ids to variants with correlation.
app.post("/catalog/lookup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
  return c.json({ ucp: envelope("dev.ucp.shopping.catalog.lookup"), products: lookup(ids) });
});

// Get Product (catalog/lookup.md#get-product): full detail for one product.
app.post("/catalog/product", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const product = typeof body.id === "string" ? getProduct(body.id) : undefined;
  if (!product) {
    return c.json({ ucp: { version: UCP_VERSION, status: "error" }, messages: [{ type: "error", code: "not_found", content: "No product matches the requested id." }] }, 404);
  }
  return c.json({ ucp: envelope("dev.ucp.shopping.catalog.lookup"), product });
});

// The vendor extension's JSON Schema, at the URL the discovery profile
// advertises so platforms can fetch and compose it during negotiation.
app.get("/schemas/price_substantiation.json", (c) => {
  c.header("Cache-Control", "public, max-age=3600");
  return c.json(priceSubstantiationSchema);
});

app.get("/", (c) => c.html(indexHtml(new URL(c.req.url).origin)));
app.get("/spec/price-substantiation", (c) => c.html(specHtml(new URL(c.req.url).origin)));
