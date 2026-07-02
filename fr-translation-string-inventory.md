# FR translation — consumer-facing string inventory

> Audited July 2026, before publishing the FR locale. Goal: know exactly what
> Translate & Adapt covers out of the box, and what needs code work first.
> Strategy context: FR becomes the store's default language (root URLs), EN
> moves to `/en` — see the FR-locale discussion in `seo-strategy.md` §admin.
>
> **STATUS (July 2026): the refactor is DONE.** Sections B, C and D below are
> resolved — custom strings live in `locales/en.default.json` + `locales/fr.json`
> under the `fms` namespace, the cart drawer reads `window.FMS.strings` (emitted
> by `snippets/fox-meyer-store-config.liquid`), both headers have a native
> localization-form FR/EN toggle, and the missing settings were saved into the
> template JSONs. The English theme state is preserved on the `english-baseline`
> branch; admin-side EN content is in `backup-english-content-2026-07.md`.
> Section E (admin checklist) remains to do when publishing FR.

## A. Covered by Translate & Adapt already — no code work

Nearly all page copy lives in **saved section settings** inside the template
JSONs, which Translate & Adapt exposes per page:

- `templates/index.json` — 80 saved settings (hero, freshness, origin, both
  recipes, Grenouille, CTA/price card, about teaser, footer copyright).
- `templates/page.shop.json` — 53 saved settings (builder copy, box labels,
  musette perk, coffee notes/chips, Why, reviews, all 6 FAQs, copyright).
  The FAQPage JSON-LD reads the same settings, so it localizes for free.
- `templates/page.about.json` — 35 saved settings (hero, people, mission,
  passion, CTA, copyright).
- `templates/product.json` — 23 saved settings (eyebrow, unit label, chips,
  fallback description, recipes, trust-row bodies, footer legal + copyright).

Also translatable via Translate & Adapt with zero code: product titles &
descriptions, page titles, policies, notification emails, checkout strings,
SEO meta title/description fields, image alt text.

## B. Settings currently falling back to schema defaults — invisible to Translate & Adapt

A setting that was never saved has no stored value to translate; the English
schema `default` renders on every locale. Fix by saving a value once
(customizer or direct template-JSON edit):

| Template | Missing setting | Renders from |
|---|---|---|
| `templates/index.json` | `footer_legal` | schema default in `sections/fox-meyer-homepage.liquid` |
| `templates/page.shop.json` | `footer_legal` | schema default in `sections/fox-meyer-shop.liquid` |
| `templates/page.about.json` | `footer_legal` | schema default in `sections/fox-meyer-about.liquid` |
| `templates/product.json` | `buy_cta` ("Add to a box"), `buy_note` | Liquid `\| default:` + schema default in `sections/fox-meyer-product.liquid` |

## C. Hardcoded in Liquid — needs `{{ 'key' | t }}` (locale files) or new settings

### snippets/fox-meyer-header.liquid
- "Shop" nav button (l.12); "Cart" (l.19)
- aria: "Primary" (l.10), "Open cart" (l.14)
- **No language switcher** — needs a `{% form 'localization' %}` FR/EN toggle.

### snippets/fox-meyer-footer.liquid
- Links: "Home", "Freshness", "The blend", "Shop all", "Help & FAQ" (l.16–20)
- Fallback "© Fox Meyer®. All rights reserved." (l.23); aria "Footer" (l.15)
- Side-flag: "Shop all" → `/collections/all` and "Help & FAQ" → search both
  hit routes that redirect to `/pages/shop` — fix targets while in here.

### sections/fox-meyer-shop.liquid
- "/ can" price suffix (l.71, l.94)
- "**N** of **M** cans" counter (l.121); "Box total" (l.124)
- "Pick your cans" initial button label (l.128)
- aria: "Box size" (l.49), "Remove one …"/"Add one …"/"… cans" (l.80–82, 103–105)
- (Merchant-only, optional: unconfigured-builder note l.133–135.)

### sections/fox-meyer-product.liquid
- Trust-row headings, hardcoded `<h3>`s: "Nitrogen-sealed",
  "Competition-grade", "Ships in 1–2 days", "100-day guarantee" (l.122–125)
  — the bodies are settings but the titles are not (the Shop section got this
  right; mirror it).
- "reviews" after rating count (l.59); "/ can" in sticky bar (l.134)
- aria: "View image N" (l.43)

### sections/fox-meyer-redirect.liquid
- "Taking you to the shop…" (l.19); "Build your box →" (l.21)

### layout/fox-meyer.liquid
- Meta-description fallback, English hardcoded (l.31).

### snippets/fox-meyer-structured-data.liquid
- Organization description fallback (l.52)
- BreadcrumbList names "Home", "Shop" (l.83–84, l.95)

### sections/fox-meyer-homepage.liquid
- Fully settings-driven — nothing hardcoded. But it has a **legacy manual
  language toggle** (`lang_link`/`lang_label`/`lang_code`, l.34–38): replace
  with the native localization form so it can't drift from published locales.

## D. Hardcoded in JavaScript — Translate & Adapt cannot reach these at all

`assets/fox-meyer-homepage.js`: clean, no user-facing strings.

`assets/fox-meyer-store.js` — every cart-drawer / builder string. Fix: emit a
`strings` object into `window.FMS` from the sections (values via `| t` from
`locales/en.default.json` + `locales/fr.json`) and have the JS read
`CFG.strings.*`. Watch pluralization ("can/cans" → "boîte/boîtes" pattern
differs) and the interpolated counts.

| Line | String |
|---|---|
| 22 | `can` / `cans` pluralizer |
| 57, 59, 60 | aria "Cart", "Your cart", aria "Close cart" |
| 93 | "Your cart is empty. Build a box — shipping's on us." |
| 105 | "each" |
| 108–110 | aria "Decrease" / "Quantity" / "Increase" |
| 114 | "Remove" |
| 120 | "Free shipping included" |
| 122–124 | "Almost a box" + "Boxes come in 4 or 8 cans. Add N more — or remove M — to check out." |
| 130–131 | "Checkout" / disabled "Add N more cans" |
| 134, 136 | "Subtotal"; "Taxes & shipping calculated at checkout · Secure payment" |
| 177, 182 | "Could not add to cart" / "Added to cart" toasts |
| 246–248 | builder "Add N more cans" / "Add box — $X" |
| 290 | "N-can box added" toast |

## E. Outside the theme — admin checklist when publishing FR

- Product titles/descriptions ×2, page titles (shop, about), policies
  (privacy/terms/refund/shipping — Bill 96 + Law 25 require FR versions),
  notification emails, meta fields, alt text: all via Translate & Adapt.
- `shop.description` (used as homepage meta fallback) — set FR.
- **Musette BxGy discount title** "Founder's Edition Musette" shows at
  checkout; discount names aren't reliably translatable — consider an
  FR-first name.
- Shipping rate names: "Standard" / "Express" already read fine in both
  languages — keep those exact words.
- "Fox Meyer ᴹᴰ" on FR surfaces, "Fox Meyer®" on EN (brand rule) — the ®
  currently sits in footer_legal/copyright settings, so the FR translation of
  those settings is where ᴹᴰ goes.

## F. Plumbing already correct

- `layout/fox-meyer.liquid` sets `lang="{{ request.locale.iso_code }}"`.
- `content_for_header` is present, so Shopify emits hreflang automatically
  once a second locale is published.
- Product JSON-LD uses `product | structured_data` → localizes per locale.
- `locales/fr.json` (Dawn's) exists for stock strings; custom keys get added
  under a `fms` namespace in `en.default.json` + `fr.json`.

## Effort estimate

~40 hardcoded strings across C + D, all mechanical: one locale-file namespace,
a `window.FMS.strings` bridge, a localization-form switcher in the two
headers, and 5 template-JSON saves (section B). No structural changes.
