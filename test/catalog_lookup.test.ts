import { test } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";
import { assertValid } from "./helpers/validate.js";

const post = (path: string, body: unknown) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("POST /catalog/lookup by variant id returns a lookup_response that validates and correlates each variant to its request id", async () => {
  const id = "gid://aaronbatchelder/Variant/jeans-plain";
  const res = await post("/catalog/lookup", { ids: [id] });
  assert.equal(res.status, 200);
  const body = await res.json();
  assertValid("https://ucp.dev/schemas/shopping/catalog_lookup.json#/$defs/lookup_response", body);
  const variants = body.products.flatMap((p: any) => p.variants);
  assert.equal(variants.length, 1, "lookup should return only the requested variant");
  assert.deepEqual(variants[0].inputs, [{ id, match: "exact" }]);
});
