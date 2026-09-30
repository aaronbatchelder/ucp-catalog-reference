import { test } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";
import { assertValid } from "./helpers/validate.js";

test("GET /.well-known/ucp returns a profile that validates against the official UCP profile schema", async () => {
  const res = await app.request("/.well-known/ucp");
  assert.equal(res.status, 200);
  assertValid("https://ucp.dev/schemas/profile.json", await res.json());
});

test("profile declares com.aaronbatchelder.price_substantiation extending catalog search and lookup, hosted on this origin", async () => {
  const res = await app.request("https://ucp.aaronbatchelder.com/.well-known/ucp");
  const { ucp } = await res.json();
  const [ext] = ucp.capabilities["com.aaronbatchelder.price_substantiation"] ?? [];
  assert.ok(ext, "extension capability missing from profile");
  assert.deepEqual(ext.extends, ["dev.ucp.shopping.catalog.search", "dev.ucp.shopping.catalog.lookup"]);
  assert.equal(ext.schema, "https://ucp.aaronbatchelder.com/schemas/price_substantiation.json");
  assert.equal(ext.spec, "https://ucp.aaronbatchelder.com/spec/price-substantiation");
  assertValid("https://ucp.dev/schemas/profile.json", { ucp });
});
