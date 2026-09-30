import { test, before } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";
import { ajv, assertValid } from "./helpers/validate.js";

const ORIGIN = "https://ucp.aaronbatchelder.com";
const SCHEMA_URL = `${ORIGIN}/schemas/price_substantiation.json`;
const post = (path: string, body: unknown) =>
  app.request(`${ORIGIN}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const variantsOf = async (res: Response) => (await res.json()).products.flatMap((p: any) => p.variants);

before(async () => {
  const res = await app.request(SCHEMA_URL);
  assert.equal(res.status, 200, "extension schema must be served from this origin");
  const schema = await res.json();
  assert.equal(schema.$id, SCHEMA_URL);
  if (!ajv.getSchema(SCHEMA_URL)) ajv.addSchema(schema);
});

test("the EU variant carries a prior_price basis whose 30-day reference is lower than its list_price", async () => {
  const [v] = await variantsOf(await post("/catalog/lookup", { ids: ["gid://aaronbatchelder/Variant/jeans-eu-30day"] }));
  assertValid(`${SCHEMA_URL}#/$defs/list_price_basis`, v.list_price_basis);
  assert.equal(v.list_price_basis.basis, "prior_price");
  assert.ok(v.list_price_basis.reference_price.amount < v.list_price.amount);
});

test("the MSRP variant carries an msrp basis naming its source", async () => {
  const [v] = await variantsOf(await post("/catalog/lookup", { ids: ["gid://aaronbatchelder/Variant/jeans-msrp"] }));
  assertValid(`${SCHEMA_URL}#/$defs/list_price_basis`, v.list_price_basis);
  assert.equal(v.list_price_basis.basis, "msrp");
  assert.ok(v.list_price_basis.source);
});

test("control variants carry no list_price_basis", async () => {
  const vs = await variantsOf(await post("/catalog/lookup", { ids: ["gid://aaronbatchelder/Variant/jeans-anchor-only", "gid://aaronbatchelder/Variant/jeans-plain"] }));
  assert.equal(vs.length, 2);
  for (const v of vs) assert.equal(v.list_price_basis, undefined);
});

test("responses carrying list_price_basis still validate against the official (unextended) schemas", async () => {
  const s = await post("/catalog/search", { query: "jeans" });
  assertValid("https://ucp.dev/schemas/shopping/catalog_search.json#/$defs/search_response", await s.json());
  const p = await post("/catalog/product", { id: "gid://aaronbatchelder/Product/black-jeans" });
  assertValid("https://ucp.dev/schemas/shopping/catalog_lookup.json#/$defs/get_product_response", await p.json());
});
