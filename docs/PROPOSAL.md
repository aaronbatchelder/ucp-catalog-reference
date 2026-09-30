# [Proposal]: Price Substantiation extension — carry the prior-price reference behind `list_price` comparison claims

> Filed against [Universal-Commerce-Protocol/ucp](https://github.com/Universal-Commerce-Protocol/ucp) via the Enhancement Proposal template. This file is the canonical text; the reference implementation in this repository is the Working Draft.

## Summary

UCP Catalog defines `Variant.list_price` and `Product.list_price_range` as "list price before discounts (for strikethrough display)". Both are bare comparison claims: the protocol gives a Business no way to state *what the list price is a reference to* — a price it actually charged, for what period, or a manufacturer's suggested price — and gives a Platform no structured way to evaluate the claim.

This proposal introduces an optional, response-only **Price Substantiation** extension that lets a Business attach a `list_price_basis` object to a catalog `Variant`. The object carries the reference price the reduction is measured against, the period over which that reference applied, and the basis type (`prior_price`, `msrp`, or a business-defined value). It is purely additive, changes no request shapes, and defines no Platform behavior. Its purpose is to give Businesses a standard place to carry data that pricing regulation and major shopping surfaces already require them to hold, and to make comparison claims checkable rather than merely asserted.

A vendor-namespaced Working Draft (`com.aaronbatchelder.price_substantiation`) is live at **https://ucp.aaronbatchelder.com** — discovery profile, catalog search/lookup/product over REST, the extension schema, and this spec — with tests validating every response against the official schemas at a pinned spec commit.

## Motivation

**1. Businesses already have to carry this data, and UCP has no field for it.**

- The EU Price Indication Directive, as amended by Directive (EU) 2019/2161 ("Omnibus"), Article 6a, requires that any announcement of a price reduction indicate the prior price, defined as the **lowest price applied during a period of at least 30 days before the reduction**. The CJEU confirmed in Case C‑330/23 (26 September 2024) that percentage reductions must be calculated against that 30‑day-lowest price, not a more recent higher price. Exceptions exist for perishables, goods on the market under 30 days, and progressive reductions.
- Google Merchant Center's sale-price annotation policy requires the base price to have been valid for **30 days within the past 200 days** before a strikethrough is shown, with the reduction between 5% and 90%.
- Shopify, a UCP co-developer, already publishes merchant guidance for PID compliance.

Under Art. 6a the required reference price is frequently *not* the marketing list price — if an item moved between €99 and €89 in the prior month, the legal reference is €89 even if `list_price` is €99. A Business selling into the EU through UCP has no standard way to transmit that reference or its period. Today the only option is a vendor-specific key in `metadata`, which no Platform can rely on.

**2. The surface is widening.** #751 proposes carrying `list_price` from Catalog into Cart, Checkout, and Order item responses so that "each item snapshot is self-contained for price comparison." That is a reasonable goal, and it makes the absence of substantiation more visible: the comparison claim would be propagated through the entire transaction lifecycle with no accompanying basis.

**3. Agent-mediated purchasing raises the stakes of unsubstantiated comparison claims.** In human-facing UIs, a strikethrough is one visual cue among many. In agent-mediated flows the same value arrives as a structured field the agent reasons over directly. Peer-reviewed work on LLM web agents finds they act on manipulative interface signals at high rates — 41% single-pattern susceptibility in one benchmark, over 70% in another, with larger and more reasoning-heavy models *more* susceptible, and agents frequently recognizing the pattern yet proceeding anyway (SusBench, arXiv:2510.11035; "Investigating the Impact of Dark Patterns on LLM-Based Web Agents", arXiv:2510.18113; CHI 2026 "Dark Patterns Meet GUI Agents"). Price anchoring is among the most reliable of these signals. A protocol that transmits the anchor but cannot transmit its basis leaves Platforms with no structured input for the judgement they will increasingly be expected to make.

**4. UCP already holds this principle on the buyer side.** `signals.json` states that values "MUST NOT be buyer-asserted claims" and must rest on "direct observation or independently verifiable third-party attestations." #835 applied the same reasoning to agent behavior and resolved it as *recorded evidence with an author attached* — "checkable later instead of trusted now." This proposal applies the same standard to the Business-asserted claim that most directly shapes purchase decisions. It does not ask the protocol to adjudicate truth; it asks it to carry the facts that make a claim falsifiable.

**Beneficiaries:** Businesses that need a standard home for regulatory prior-price data; Platforms that want to distinguish substantiated reductions from bare anchors; buyers, whose agents currently receive comparison claims with no provenance.

## Goals

* Provide a standard, optional, response-only structure for the reference price and period behind a `list_price` comparison claim.
* Make Art. 6a / Merchant-Center-style prior-price data expressible in UCP without vendor-specific `metadata` keys.
* Keep the change purely additive: no request-shape changes, no new endpoints, no required fields, no defined Platform behavior.
* Follow existing catalog-extension composition patterns (`loyalty.json`, `fulfillment.json`) exactly.

## Non-Goals

* **Adjudicating truth.** The extension makes claims checkable; it does not make them true. Verification, policy, and enforcement remain Platform and jurisdictional concerns.
* **Defining ranking or display behavior.** No SHOULD/MUST on how a Platform weights or renders substantiated vs. unsubstantiated claims.
* **Review and rating provenance.** `rating.count` has a similar gap; it is a distinct and larger problem and is explicitly out of scope.
* **Competitor-price comparisons.** No `basis` value for "competitor's price" is proposed.
* **Product-level `list_price_range`.** Substantiation attaches to the purchasable `Variant`; the product-level range is derived.
* **Cart/Checkout/Order `Item`.** If #751 lands, extending the shared `Item` is a natural follow-on, handled separately.

## Detailed Design

### Extension identity

| | |
|---|---|
| Proposed capability | `dev.ucp.shopping.price_substantiation` |
| Working Draft (live) | `com.aaronbatchelder.price_substantiation` |
| Extends | `dev.ucp.shopping.catalog.search`, `dev.ucp.shopping.catalog.lookup` |
| Schema (proposed) | `source/schemas/shopping/price_substantiation.json` |
| Schema (live) | https://ucp.aaronbatchelder.com/schemas/price_substantiation.json |
| Spec page (live) | https://ucp.aaronbatchelder.com/spec/price-substantiation |
| Request impact | None. All members are `ucp_request: "omit"` (response-only). |

Per CONTRIBUTING.md and the Governance Model, the Working Draft ships under a vendor namespace with the identical schema; this proposal requests TC guidance on the path to `dev.ucp.*` (see *Path question* below).

### Discovery

Businesses advertise support in their profile, mirroring `loyalty` and `discount`:

```json
{
  "ucp": {
    "version": "{{ ucp_version }}",
    "capabilities": {
      "dev.ucp.shopping.price_substantiation": [
        {
          "version": "{{ ucp_version }}",
          "extends": [
            "dev.ucp.shopping.catalog.search",
            "dev.ucp.shopping.catalog.lookup"
          ],
          "spec": "https://ucp.dev/{{ ucp_version }}/specification/shopping/extensions/price-substantiation",
          "schema": "https://ucp.dev/{{ ucp_version }}/schemas/shopping/price_substantiation.json"
        }
      ]
    }
  }
}
```

### Data structures

One new object, `list_price_basis`, attached to `Variant`. All properties optional; the object itself optional. The live schema is the normative text; summarized:

| Field | Type | Meaning |
|---|---|---|
| `basis` | string | Well-known values: `prior_price` (a price this Business actually charged for this variant), `msrp` (manufacturer's/supplier's suggested price). Businesses MAY use additional values. |
| `reference_price` | `price.json` | The price the reduction is measured against. For `prior_price` under a lowest-prior-price rule (EU Art. 6a) this is the lowest price applied during `period`, which MAY differ from `list_price`. |
| `period` | `{start, end}` ISO dates | Period over which `reference_price` was determined. Both required when `period` is present. |
| `source` | string | Attesting party when the basis is not the Business itself (e.g. manufacturer name for `msrp`). |

Composition: `variant_with_basis` = `allOf [variant.json, {list_price_basis}]`, then `$defs["dev.ucp.shopping.catalog.search"]` and `$defs["dev.ucp.shopping.catalog.lookup"]` compose over the base `search_response`, `lookup_response`, and `get_product_response` exactly as `loyalty.json` does. Maintainers may prefer the `fulfillment.json` style `search_request`/`search_response` `$defs` indirection; either is acceptable and the choice is deferred to review.

### Example

Live: `POST https://ucp.aaronbatchelder.com/catalog/lookup` with `{"ids": ["gid://aaronbatchelder/Variant/jeans-eu-30day"]}`.

```json
{
  "id": "gid://aaronbatchelder/Variant/jeans-eu-30day",
  "title": "32 x 32",
  "price":      { "amount": 7900, "currency": "EUR" },
  "list_price": { "amount": 9900, "currency": "EUR" },
  "list_price_basis": {
    "basis": "prior_price",
    "reference_price": { "amount": 8900, "currency": "EUR" },
    "period": { "start": "2026-08-20", "end": "2026-09-19" }
  }
}
```

A Platform can now (a) render the Art. 6a-compliant reference (€89 → €79, 11%) rather than the marketing anchor (€99 → €79, 20%), and (b) treat the claim as falsifiable. Neither behavior is mandated. The same catalog serves an `msrp` variant and two controls — a bare anchor with no basis, and a variant with no `list_price` at all — so the four cases can be compared side by side.

### API and behavioral changes

* **API changes:** none. No new endpoints or operations.
* **Request schemas:** unchanged. Every new member is `ucp_request: "omit"`.
* **Behavioral changes:** none defined. Businesses MAY include the object; Platforms MAY consume it. A Business that omits the object is fully conformant and indistinguishable from today.

### Path question for the TC

CONTRIBUTING.md directs new extensions to a vendor namespace first, graduating on adoption. Following #751's approach, this proposal asks the Shopping TC to indicate whether it prefers:

1. acceptance as a `dev.ucp.*` Working Draft now, given that the data is externally mandated rather than vendor-invented; or
2. continued vendor-namespace incubation (`com.aaronbatchelder.price_substantiation`, identical schema) with a return to this proposal once adoption evidence exists.

Either path is acceptable to the proposer. The Working Draft is already live.

## Risks and Mitigations

* **Security.** No new attack surface: response-only, no credentials, no PII, no new transport. A Business can assert a false `list_price_basis` — but a bare `list_price` can already be false and is *unfalsifiable*, whereas `reference_price` + `period` are concrete, checkable claims. The extension strictly reduces the space of undetectable misstatement; it does not claim to eliminate misstatement. Verification remains a Platform concern (Non-Goals).
* **Performance.** Negligible: one small optional object per variant, response-only, no additional round trips.
* **Backward compatibility.** Purely additive and optional. Platforms that do not recognize the capability ignore the member; Businesses that do not advertise it are unchanged. No migration. The reference implementation's responses validate against the *unextended* official schemas as a test.
* **Complexity.** One schema file, one spec page, no new flows or operations. Comparable in weight to the `discount` extension and smaller than `loyalty`.
* **Regulatory misfit.** Jurisdictions differ (30-day lowest in the EU; 30-in-200 for Merchant Center; other rules elsewhere). Mitigation: the design carries *facts* (`reference_price`, `period`) rather than encoding any one jurisdiction's rule, and `basis` is an open string with well-known values, following the `fulfillment.type` pattern.
* **Adoption risk.** The extension is only useful if Businesses populate it. Mitigation: the data already exists in merchant systems because regulation and Merchant Center require it; the extension adds a wire format, not a data-collection burden. Graduation is gated on adoption evidence (below).

## Test Plan

Implemented and passing in the reference repository (`npm test`), validating with Ajv (draft 2020-12) against the official schemas vendored at a pinned spec commit:

* **Discovery.** The profile validates against `profile.json` and declares the extension with `extends` on both catalog capabilities and `spec`/`schema` on the serving origin.
* **Catalog operations.** `search`, `lookup`, and `get_product` responses validate against `catalog_search.json#/$defs/search_response`, `catalog_lookup.json#/$defs/lookup_response`, and `#/$defs/get_product_response`; lookup correlates each variant to its request id via `inputs`.
* **Extension data.** The `prior_price` variant's `reference_price` is lower than its `list_price`; the `msrp` variant names a `source`; both validate against `#/$defs/list_price_basis`; the two control variants carry no basis.
* **Additivity.** Responses carrying `list_price_basis` still validate against the unextended official schemas.
* **Composition.** The composed `dev.ucp.shopping.catalog.search` and `.lookup` definitions accept the server's own responses (both lookup and get_product for the `oneOf`).
* **Negative fixture.** A `list_price_basis` whose `period` lacks `end` is rejected.
* **Spec toolchain (on the upstream PR).** `ucp-schema lint source/`, `bash sdk/python/generate_models.sh`, `pre-commit run --all-files`, MkDocs `--strict` build, `check_links.py`.

## Graduation Criteria

**Working Draft → Candidate:**
* [ ] Schema merged and documented (with Working Draft disclaimer).
* [ ] Unit and integration tests are passing.
* [ ] Initial documentation is written.
* [x] Reference implementation publicly reachable.
* [ ] TC majority vote to advance.

**Candidate → Stable:**
* [ ] Adoption feedback has been collected and addressed.
* [ ] At least two independent Business implementations and at least one Platform consumer.
* [ ] Full documentation and migration guides are published.
* [ ] TC majority vote to advance.

## Implementation History

* 2026-09-30: Working Draft live at ucp.aaronbatchelder.com; proposal submitted.
* [YYYY-MM-DD]: TC approved "Provisional"; capability enters "Working Draft".
* [YYYY-MM-DD]: TC approved advancement to "Candidate".
* [YYYY-MM-DD]: TC approved "Implemented"; capability enters "Stable".

## Related

* #751 — Return `list_price` in Cart, Checkout, and Order item responses (companion; this proposal supplies the basis that #751 would propagate)
* #835 — well-known signals describing agent behavior (provenance-as-recorded-evidence precedent)
* #630 — RFC: Expanding Well-Known Signals for Agent-Originated Commerce
* `signals.json` — "Values MUST NOT be buyer-asserted claims"
* Directive (EU) 2019/2161, Art. 6a PID; CJEU C‑330/23
* Google Merchant Center, "About sale price annotations" (support.google.com/merchants/answer/9017019)
