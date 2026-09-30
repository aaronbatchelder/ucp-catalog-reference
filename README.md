# UCP Catalog Reference

A minimal, read-only [Universal Commerce Protocol](https://github.com/Universal-Commerce-Protocol/ucp) Business that implements the **Catalog** capabilities (`dev.ucp.shopping.catalog.search`, `dev.ucp.shopping.catalog.lookup`) over REST, plus a vendor-namespaced extension, **`com.aaronbatchelder.price_substantiation`**, that carries the reference price and period behind a variant's `list_price` comparison claim.

It exists to be the Working Draft for the [Price Substantiation enhancement proposal](docs/PROPOSAL.md).

Live: **https://ucp.aaronbatchelder.com** — [discovery profile](https://ucp.aaronbatchelder.com/.well-known/ucp) · [extension schema](https://ucp.aaronbatchelder.com/schemas/price_substantiation.json) · [extension spec](https://ucp.aaronbatchelder.com/spec/price-substantiation)

## Why

`Variant.list_price` is "list price before discounts (for strikethrough display)" — a bare anchor. EU Price Indication Directive Art. 6a requires reductions to reference the lowest price of the prior 30 days; Google Merchant Center requires a base price valid 30 days in the past 200. Merchants already hold that data. UCP has no field for it. This extension adds one, optional and response-only.

## Endpoints

| Method | Path | Body |
|---|---|---|
| GET | `/.well-known/ucp` | — |
| POST | `/catalog/search` | `{"query":"black jeans"}` |
| POST | `/catalog/lookup` | `{"ids":["gid://aaronbatchelder/Variant/jeans-eu-30day"]}` |
| POST | `/catalog/product` | `{"id":"gid://aaronbatchelder/Product/black-jeans"}` |
| GET | `/schemas/price_substantiation.json` | — |
| GET | `/spec/price-substantiation` | — |

The catalog holds four otherwise-identical black-jeans variants that differ only in how `list_price` is backed: an EU 30-day `prior_price` basis, an `msrp` basis, a bare anchor with no basis (control), and no list price at all (control).

## Run

```bash
npm install
npm test        # validates every response against the official UCP schemas (test/schemas/ucp, pinned commit in PINNED_COMMIT)
npm run dev     # http://localhost:3000
```

Catalog operations are read-only, so no request signing is involved; the hard parts of UCP (signatures, AP2, webhooks) are checkout-side and out of scope here.

## Layout

- `src/app.ts` — Hono app: discovery, catalog routes, schema, pages. Runtime-agnostic.
- `src/catalog.ts` — static catalog + search/lookup logic.
- `schemas/price_substantiation.json` — the extension schema (served at `/schemas/…`).
- `docs/PROPOSAL.md` — the enhancement proposal text.
- `test/` — `node:test` + Ajv 2020-12 against the vendored official schemas.

Apache-2.0, matching the UCP ecosystem.
