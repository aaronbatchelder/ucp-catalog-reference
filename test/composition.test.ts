// Fixture tests for the extension schema itself (proposal Test Plan). These
// characterize schemas/price_substantiation.json rather than server logic.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";
import { ajv, assertValid, validator } from "./helpers/validate.js";

const ORIGIN = "https://ucp.aaronbatchelder.com";
const SCHEMA_URL = `${ORIGIN}/schemas/price_substantiation.json`;
const post = (path: string, body: unknown) =>
  app.request(`${ORIGIN}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

before(async () => {
  if (!ajv.getSchema(SCHEMA_URL)) ajv.addSchema(await (await app.request(SCHEMA_URL)).json());
});

test("the composed catalog.search definition accepts this server's search response", async () => {
  assertValid(`${SCHEMA_URL}#/$defs/dev.ucp.shopping.catalog.search`, await (await post("/catalog/search", { query: "jeans" })).json());
});

test("the composed catalog.lookup definition accepts both lookup and get_product responses", async () => {
  assertValid(`${SCHEMA_URL}#/$defs/dev.ucp.shopping.catalog.lookup`, await (await post("/catalog/lookup", { ids: ["gid://aaronbatchelder/Variant/jeans-eu-30day"] })).json());
  assertValid(`${SCHEMA_URL}#/$defs/dev.ucp.shopping.catalog.lookup`, await (await post("/catalog/product", { id: "gid://aaronbatchelder/Product/black-jeans" })).json());
});

test("a list_price_basis whose period lacks `end` is rejected", () => {
  const v = validator(`${SCHEMA_URL}#/$defs/list_price_basis`);
  assert.equal(v({ basis: "prior_price", reference_price: { amount: 8900, currency: "EUR" }, period: { start: "2026-08-20" } }), false);
});
