import { test } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";
import { assertValid } from "./helpers/validate.js";

const post = (path: string, body: unknown) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("POST /catalog/search returns a search_response that validates against the official schema and contains black jeans", async () => {
  const res = await post("/catalog/search", { query: "black jeans" });
  assert.equal(res.status, 200);
  const body = await res.json();
  assertValid("https://ucp.dev/schemas/shopping/catalog_search.json#/$defs/search_response", body);
  assert.ok(body.products.length > 0, "expected at least one product");
  assert.ok(body.products.every((p: any) => /jeans/i.test(p.title)), "every result should be jeans");
});
