# English content backup — July 2, 2026

> Snapshot of the **admin-side** English content that lives in Shopify, not in
> this repo — taken before the FR-default migration so the English wording can
> be restored or compared side by side. The theme itself (sections, settings,
> locale files) is backed up by the `english-baseline` git branch; this file
> covers what git doesn't see.

## Shop

- **Name:** Fox Meyer
- **Description (Settings → General):** *(empty — the theme falls back to the
  `fms.meta.default_description` locale string)*

## Products

### Fox Meyer (`fox-meyer`) — ACTIVE, $12.00
**SEO title:** Fox Meyer — Nitrogen-Sealed Specialty Espresso Blend
**SEO description:** SCA 86+ espresso blend from Brazil & Colombia, roasted in Dorval, Québec and nitrogen-sealed in a can for roast-day freshness. Caramel, dark cocoa, toasted almond.

**Description (HTML):**
```html
<p>Fox Meyer is our flagship espresso blend — competition-grade beans from Brazil and Colombia, scoring SCA 86+, small-batch roasted in Dorval, Québec and nitrogen-sealed in aluminium within hours of roasting.</p><p>The result is roast-day freshness in every cup: a medium-dark roast with <strong>velvety caramel, dark cocoa and toasted almond</strong>, a round body and a clean, lingering finish. Pulls a beautiful espresso and holds its own through milk.</p><p>150 g whole bean — about 18–20 espressos per can.</p>
```

### Petite Grenouille (`petite-grenouille`) — ACTIVE, $14.00
**SEO title:** Petite Grenouille — Specialty Coffee in a Can | Fox Meyer
**SEO description:** Rich, full-bodied SCA 86+ blend from Brazil, India & Guatemala — roasted in Dorval, Québec, nitrogen-sealed for freshness. Molasses, dark cocoa, walnut finish.

**Description (HTML):**
```html
<p>Petite Grenouille is the second expression in the Fox Meyer line — the same nitrogen-sealed freshness and competition-grade sourcing (SCA 86+), with beans from Brazil, India and Guatemala for a deeper, rounder cup.</p><p>A medium-dark roast with notes of <strong>molasses, dark cocoa, toasted almond and walnut</strong>: richer and more full-bodied than the flagship, with a smooth, syrupy finish. Roasted to order in Dorval, Québec.</p><p>150 g whole bean — about 18–20 espressos per can.</p>
```

### Founder's Edition Musette (`founders-edition-musette`) — ACTIVE, $28.00
No description, no SEO fields. (Bundled via the BxGy discount; not published to
the Online Store channel — keep it that way.)

## Pages

- **Shop** (`/pages/shop`) body: `<p>Fox Meyer cans — nitrogen-sealed specialty coffee, roasted to order.</p>`
- **About** (`/pages/about`) body: `<p>Who is Fox Meyer? Our story.</p>`

*(All real page copy lives in section settings → backed up by the git branch.)*

## Policies

Only the **Privacy policy** exists, and it is Shopify's stock generated
template (Liquid placeholders, untouched) — nothing bespoke to preserve;
regenerate it any time from Settings → Policies. Terms of service, refund and
shipping policies are **not written yet**. Note for the FR migration: Bill 96 /
Law 25 require all policies in French, presented at least as prominently as
English.

## How to use this backup

- **Theme/EN wording:** `git checkout english-baseline` (or connect that branch
  to a duplicate/draft theme in Shopify for a live side-by-side preview).
- **Admin content:** copy the text above back into the product/page/SEO fields,
  or into the EN translation slots of Translate & Adapt after the store default
  flips to French.
