import { test } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";
import { assertValid } from "./helpers/validate.js";

const post = (path: string, body: unknown) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("POST /catalog/product by product id returns a get_product_response that validates with all variants", async () => {
  const res = await post("/catalog/product", { id: "gid://aaronbatchelder/Product/black-jeans" });
  assert.equal(res.status, 200);
  const body = await res.json();
  assertValid("https://ucp.dev/schemas/shopping/catalog_lookup.json#/$defs/get_product_response", body);
  assert.equal(body.product.handle, "black-jeans");
  assert.equal(body.product.variants.length, 4);
});
