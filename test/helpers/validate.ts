// Loads every vendored UCP JSON Schema (test/schemas/ucp, pinned commit in
// PINNED_COMMIT) into one Ajv instance keyed by $id, so tests can validate
// server responses against the official spec rather than hand-written shapes.
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../schemas/ucp/", import.meta.url).pathname;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith(".json") ? [join(dir, e.name)] : []
  );
}

export const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
for (const file of walk(ROOT)) {
  const schema = JSON.parse(readFileSync(file, "utf8"));
  if (schema.$id) ajv.addSchema(schema);
}

const cache = new Map<string, ValidateFunction>();
export function validator(ref: string): ValidateFunction {
  const v = cache.get(ref) ?? ajv.getSchema(ref) ?? ajv.compile({ $ref: ref });
  cache.set(ref, v);
  return v;
}

export function assertValid(ref: string, data: unknown): void {
  const v = validator(ref);
  if (!v(data)) throw new Error(`${ref} rejected data:\n${ajv.errorsText(v.errors, { separator: "\n", dataVar: "response" })}`);
}
