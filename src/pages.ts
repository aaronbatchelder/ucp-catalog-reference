// Human-readable pages: a landing page and the extension spec the discovery
// profile advertises. Plain HTML strings so this runs unchanged on any runtime.
const page = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:16px/1.55 system-ui,sans-serif;max-width:52rem;margin:3rem auto;padding:0 1rem;color:#1a1a1a}code,pre{font:13px/1.5 ui-monospace,Menlo,monospace;background:#f4f4f4}pre{padding:1rem;overflow-x:auto}code{padding:.1em .3em}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:.4em .6em;text-align:left;vertical-align:top}h1{font-size:1.6rem}h2{font-size:1.2rem;margin-top:2rem}</style></head><body>${body}</body></html>`;

export const indexHtml = (origin: string) => page("UCP Catalog Reference", `
<h1>UCP Catalog Reference</h1>
<p>A minimal, read-only <a href="https://github.com/Universal-Commerce-Protocol/ucp">Universal Commerce Protocol</a> Business implementing
<code>dev.ucp.shopping.catalog.search</code> and <code>dev.ucp.shopping.catalog.lookup</code>, plus the vendor-namespaced
<a href="/spec/price-substantiation"><code>com.aaronbatchelder.price_substantiation</code></a> extension.</p>
<h2>Endpoints</h2>
<table><tr><th>Method</th><th>Path</th><th>What</th></tr>
<tr><td>GET</td><td><a href="/.well-known/ucp">/.well-known/ucp</a></td><td>Discovery profile</td></tr>
<tr><td>POST</td><td>/catalog/search</td><td><code>{"query":"black jeans"}</code></td></tr>
<tr><td>POST</td><td>/catalog/lookup</td><td><code>{"ids":["gid://aaronbatchelder/Variant/jeans-eu-30day"]}</code></td></tr>
<tr><td>POST</td><td>/catalog/product</td><td><code>{"id":"gid://aaronbatchelder/Product/black-jeans"}</code></td></tr>
<tr><td>GET</td><td><a href="/schemas/price_substantiation.json">/schemas/price_substantiation.json</a></td><td>Extension JSON Schema</td></tr>
<tr><td>GET</td><td><a href="/spec/price-substantiation">/spec/price-substantiation</a></td><td>Extension spec</td></tr></table>
<h2>Try it</h2>
<pre>curl -s ${origin}/catalog/lookup -H 'content-type: application/json' \\
  -d '{"ids":["gid://aaronbatchelder/Variant/jeans-eu-30day","gid://aaronbatchelder/Variant/jeans-anchor-only"]}'</pre>
<p>The catalog holds four otherwise-identical black-jeans variants that differ only in how their <code>list_price</code> is backed:
an EU 30-day prior-price basis, an MSRP basis, a bare anchor with no basis, and a variant with no list price at all.</p>
<p>Source and tests: <a href="https://github.com/aaronbatchelder/ucp-catalog-reference">github.com/aaronbatchelder/ucp-catalog-reference</a>.</p>`);

export const specHtml = (origin: string) => page("Price Substantiation Extension", `
<h1>Price Substantiation Extension</h1>
<p><strong>Capability:</strong> <code>com.aaronbatchelder.price_substantiation</code> (vendor-namespaced Working Draft of a proposed <code>dev.ucp.shopping.price_substantiation</code>)<br>
<strong>Extends:</strong> <code>dev.ucp.shopping.catalog.search</code>, <code>dev.ucp.shopping.catalog.lookup</code><br>
<strong>Schema:</strong> <a href="${origin}/schemas/price_substantiation.json">${origin}/schemas/price_substantiation.json</a></p>
<h2>Overview</h2>
<p>UCP Catalog defines <code>Variant.list_price</code> as "list price before discounts (for strikethrough display)" — a comparison claim with no way to state what it refers to.
This extension lets a Business attach a <code>list_price_basis</code> object to a catalog Variant carrying the reference price the reduction is measured against, the period over which that reference applied, and the basis type.
It is optional, response-only, and purely additive: it changes no request shapes and defines no Platform behavior.</p>
<h2>Scope</h2>
<p>The extension makes comparison claims <em>checkable</em>; it does not make them true. Verification, ranking, and display remain Platform and jurisdictional concerns.
Rating provenance, competitor comparisons, product-level <code>list_price_range</code>, and the shared Cart/Checkout/Order <code>Item</code> are out of scope.</p>
<h2>Discovery</h2>
<pre>{
  "ucp": {
    "capabilities": {
      "com.aaronbatchelder.price_substantiation": [{
        "version": "2026-08-25",
        "extends": ["dev.ucp.shopping.catalog.search", "dev.ucp.shopping.catalog.lookup"],
        "spec": "${origin}/spec/price-substantiation",
        "schema": "${origin}/schemas/price_substantiation.json"
      }]
    }
  }
}</pre>
<h2>Schema: <code>list_price_basis</code></h2>
<table><tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td><code>basis</code></td><td>string</td><td>Well-known values: <code>prior_price</code> (a price this Business actually charged for this variant), <code>msrp</code> (manufacturer's or supplier's suggested price). Businesses MAY use additional values.</td></tr>
<tr><td><code>reference_price</code></td><td>price</td><td>The price the reduction is measured against. For <code>prior_price</code> in jurisdictions with a lowest-prior-price rule (e.g. EU Price Indication Directive Art. 6a), the lowest price applied during <code>period</code>, which MAY differ from <code>list_price</code>.</td></tr>
<tr><td><code>period</code></td><td>{start, end}</td><td>ISO 8601 dates bounding the reference period. Both required when <code>period</code> is present.</td></tr>
<tr><td><code>source</code></td><td>string</td><td>Attesting party when the basis is not the Business itself (e.g. manufacturer name for <code>msrp</code>).</td></tr></table>
<p>All members are <code>ucp_request: "omit"</code>. Absence of the object carries no meaning.</p>
<h2>Example</h2>
<pre>{
  "id": "gid://aaronbatchelder/Variant/jeans-eu-30day",
  "price":      { "amount": 7900, "currency": "EUR" },
  "list_price": { "amount": 9900, "currency": "EUR" },
  "list_price_basis": {
    "basis": "prior_price",
    "reference_price": { "amount": 8900, "currency": "EUR" },
    "period": { "start": "2026-08-20", "end": "2026-09-19" }
  }
}</pre>
<p>A Platform can render the Art. 6a-compliant reference (€89 → €79, 11%) rather than the marketing anchor (€99 → €79, 20%), and treat the claim as falsifiable. Neither behavior is mandated.</p>
<h2>Motivation, in brief</h2>
<ul><li>EU PID Art. 6a (Omnibus) requires price reductions to reference the lowest price of the prior 30 days (CJEU C‑330/23). Google Merchant Center requires a base price valid 30 days in the past 200 before showing a strikethrough. Merchants already hold this data; UCP has no field for it.</li>
<li>In agent-mediated flows the anchor arrives as a structured field the agent reasons over directly, and LLM agents are measurably susceptible to it. A protocol that transmits the anchor but not its basis leaves Platforms no structured input for the judgement they will increasingly make.</li>
<li>UCP already holds this standard on the buyer side: <code>signals.json</code> values "MUST NOT be buyer-asserted claims".</li></ul>
<p>Full proposal: <a href="https://github.com/aaronbatchelder/ucp-catalog-reference/blob/main/docs/PROPOSAL.md">docs/PROPOSAL.md</a>.</p>`);
