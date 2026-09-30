import { test } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";

test("GET /spec/price-substantiation serves the human-readable extension spec the profile advertises", async () => {
  const res = await app.request("/spec/price-substantiation");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/html/);
  const html = await res.text();
  assert.match(html, /com\.aaronbatchelder\.price_substantiation/);
  assert.match(html, /list_price_basis/);
});
