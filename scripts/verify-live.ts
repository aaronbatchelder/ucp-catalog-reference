// End-to-end check against a deployed origin: the same schema assertions the
// unit tests make, but over the network. Usage: npx tsx scripts/verify-live.ts https://ucp.aaronbatchelder.com
import { ajv, assertValid, validator } from "../test/helpers/validate.js";

const origin = process.argv[2]?.replace(/\/$/, "");
if (!origin) throw new Error("usage: verify-live <origin>");
const json = async (path: string, body?: unknown) => {
  const res = await fetch(origin + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) throw new Error(`${path} -> HTTP ${res.status} ${res.headers.get("content-type")}`);
  return res.json();
};
const check = (name: string, ok: boolean) => { console.log(`${ok ? "ok" : "FAIL"} - ${name}`); if (!ok) process.exitCode = 1; };

const profile = await json("/.well-known/ucp");
assertValid("https://ucp.dev/schemas/profile.json", profile);
check("profile validates", true);
const ext = profile.ucp.capabilities["com.aaronbatchelder.price_substantiation"]?.[0];
check("profile advertises extension on this origin", ext?.schema === `${origin}/schemas/price_substantiation.json`);

const schema = await json("/schemas/price_substantiation.json");
if (!ajv.getSchema(schema.$id)) ajv.addSchema(schema);
check("extension schema $id matches advertised URL", schema.$id === ext?.schema);

const search = await json("/catalog/search", { query: "black jeans" });
assertValid("https://ucp.dev/schemas/shopping/catalog_search.json#/$defs/search_response", search);
assertValid(`${schema.$id}#/$defs/dev.ucp.shopping.catalog.search`, search);
check("search validates (official + composed)", search.products.length > 0);

const lookup = await json("/catalog/lookup", { ids: ["gid://aaronbatchelder/Variant/jeans-eu-30day", "gid://aaronbatchelder/Variant/jeans-anchor-only"] });
assertValid("https://ucp.dev/schemas/shopping/catalog_lookup.json#/$defs/lookup_response", lookup);
const vs = lookup.products.flatMap((p: any) => p.variants);
const eu = vs.find((v: any) => v.id.endsWith("jeans-eu-30day")), anchor = vs.find((v: any) => v.id.endsWith("jeans-anchor-only"));
check("EU variant carries a valid prior_price basis", !!eu && validator(`${schema.$id}#/$defs/list_price_basis`)(eu.list_price_basis) === true && eu.list_price_basis.basis === "prior_price");
check("bare-anchor control carries no basis", !!anchor && anchor.list_price_basis === undefined);

const product = await json("/catalog/product", { id: "gid://aaronbatchelder/Product/black-jeans" });
assertValid("https://ucp.dev/schemas/shopping/catalog_lookup.json#/$defs/get_product_response", product);
check("get_product validates with 4 variants", product.product.variants.length === 4);
