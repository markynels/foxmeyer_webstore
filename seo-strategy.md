# Fox Meyer — SEO audit, implementation & organic-growth playbook

> July 2026. Companion to the go-to-market plan: slow ramp on organic + social.
> Theme-side fixes are DONE (commit `8c0ae5e`). Admin-side actions and the
> content playbook below are the ongoing work. The store is password-protected,
> so nothing is crawlable until launch — everything here is pre-positioning.

## 1. What the audit found

The custom `fox-meyer` layout (homepage, Shop, PDP, About — the whole
customer-facing site) shipped with only title/description/canonical. Missing:
Open Graph & Twitter cards, all structured data, meta-description fallback
(homepage had none — shop description is empty in admin), robots hints.
The unused Dawn routes (`/cart`, `/collections`, `/search`) rendered a thin
"redirecting…" stub with no noindex. Admin side: no product SEO titles or
descriptions, no product images, no tags/type, primary domain still
`fox-meyer.myshopify.com`, FR locale unpublished.

## 2. Implemented (theme, June–July 2026)

- `layout/fox-meyer.liquid` — renders `meta-tags` (OG/Twitter), escaped title,
  meta-description fallback, `max-image-preview:large`, font + cdnjs preconnects,
  and the new `snippets/fox-meyer-structured-data.liquid`.
- `snippets/fox-meyer-structured-data.liquid` — JSON-LD: **Organization**
  (Dorval QC address, sameAs from theme social settings — auto-appears once the
  social links are filled in the customizer), **WebSite** (home), **Product**
  (PDP, via Shopify's `structured_data`), **BreadcrumbList** (PDP + pages).
- `sections/fox-meyer-shop.liquid` — **FAQPage** JSON-LD generated from the FAQ
  section settings (edits in the customizer flow through automatically).
- `layout/theme.liquid` — `noindex` on the redirect-stub routes
  (cart / collection / list-collections / search).
- Admin (via API): SEO title + meta description on both products; page SEO
  title/description on Shop and About; productType "Whole Bean Coffee" + tags.

**Deliberately NOT done:** `AggregateRating`/`Review` markup — the on-page
reviews are placeholder copy. Adding schema for them violates Google's
guidelines and risks a manual action. Add only when real reviews exist
(see §4, reviews app).

## 3. Admin checklist (Marc — can't be done from the repo)

Ordered by impact:

1. **Connect the real domain** (foxmeyer.co) and set it as primary. Everything
   currently canonicalizes to `fox-meyer.myshopify.com`. Do this before launch —
   domain age/history starts accruing only once it's live.
2. **Product photography** — both products have *no images*. This blocks
   OG share images, Google image results, Product rich results, and Merchant
   Center. Minimum: can on neutral ground, can in hand, brewed cup, box contents.
3. **Homepage title & meta description** — Online Store → Preferences.
   Suggested title: `Fox Meyer — Specialty Coffee in Nitrogen-Sealed Cans |
   Roasted in Montréal` · description: reuse the fallback now hardcoded in the
   layout (then the fallback never fires).
4. **Social sharing image** (same Preferences screen) — 1200×630 brand card;
   it's the OG image for every non-product page.
5. **Publish the FR locale** (Translate & Adapt) — Bill 96 obligation *and* the
   single biggest SEO lever: FR Québec queries ("café de spécialité montréal",
   "torréfacteur montréal", "café en grain québec") are far less contested than
   EN equivalents, and local FR roundups (La Presse, Silo 57, Tourisme Montréal)
   are the natural backlink sources. Once published, Shopify emits hreflang
   automatically.
6. **Google Search Console + Bing Webmaster** at launch day (password removal):
   verify domain, submit `sitemap.xml`, request indexing of /, /pages/shop,
   both PDPs, /pages/about.
7. **Google Business Profile** for the Dorval roastery (even without a retail
   counter, a service-area profile anchors "roasted in Montréal" credibility
   and the Organization schema's address).
8. **Fill social links in the theme customizer** as accounts go live — they
   feed the Organization `sameAs` automatically.
9. **Reviews app** (e.g. Judge.me free tier) once first orders land — real
   reviews unlock star rich results; wire its schema or ask Claude to emit
   `AggregateRating` from real data then.

## 4. Keyword map (launch scope)

| Page | Primary | Secondary |
|---|---|---|
| Home | fox meyer coffee (brand) | nitrogen sealed coffee cans, specialty coffee canada |
| /pages/shop | specialty coffee box canada | coffee sampler box, mix and match coffee |
| PDP Fox Meyer | specialty espresso blend canada | SCA 86+ espresso, caramel cocoa espresso |
| PDP Petite Grenouille | full-bodied espresso blend | molasses walnut coffee |
| /pages/about | montreal coffee roaster / torréfacteur dorval | fresh roasted coffee montreal |

FR mirrors (post-locale-publish): café de spécialité en ligne, boîte de café,
café en grain frais torréfié, torréfacteur montréal / dorval, café scellé à l'azote.

**Positioning insight from the research:** nobody in Canada owns "coffee in
nitrogen-sealed cans" — the canned-coffee SERP is all nitro cold-brew RTD
(Rise, Stumptown), and the specialty-roaster SERP (Pilot, Monogram, 49th
Parallel…) competes on origin stories, not freshness tech. "Roast-day freshness,
sealed in aluminium" is a defensible, ownable query space. Lean every content
piece on it.

## 5. Content engine (the actual "hyper-competitive" part)

A slow-ramp organic strategy lives or dies on content + links, not meta tags.
The theme has a dormant Dawn blog (`blog.json`/`article.json` with Article
schema already wired). Re-skin it to the `.fms` design system when ready.

**Pillar (build first, EN+FR):** "Why oxygen is killing your coffee — and why
we can it." The category-defining explainer every other page links to.

**Cluster articles (2/month is enough on a slow ramp):**
- How long does coffee stay fresh after roasting? (high-volume question query)
- Cans vs. bags vs. valve bags: coffee packaging compared
- What SCA 86+ actually means
- Espresso dialing guide for Fox Meyer / Petite Grenouille (links from PDPs)
- Le café de spécialité à Montréal : guide du débutant (FR-first, local)
- Gift guides seasonally ("coffee gifts Canada" Q4 — the musette is the hook)

**Link building (Québec-first, realistic):**
- Pitch the FR roundup ecosystem: La Presse gourmand, Silo 57, Tourisme
  Montréal roasters page, quebecregiongourmande — they refresh lists yearly.
- Roaster directories: coffeeroast.com, RoasterRank (barist.app) — free listings.
- The musette is link-bait: cycling cafés / cycling media crossover pieces.
- Retail placements (single-can boutiques) → ask each stockist for a
  "stockists" backlink both ways.

**AI-search (AEO):** the FAQPage/Organization/Product schema shipped today is
the substrate. Keep FAQ answers self-contained and factual (LLMs quote them);
the About page's named people + Dorval address make the brand entity-resolvable.

## 6. Guardrails

- Never mark up placeholder reviews/ratings (Google manual-action risk).
- Orange-CTA / restrained-voice brand rules apply to meta copy too — no
  "BEST coffee!!" title-tag spam; the current titles are the ceiling for tone.
- Homepage is a Three.js/GSAP single-page — keep new content OUT of it;
  content weight belongs on /pages/shop, PDPs, and the blog.
- Redirect-stub routes must keep their noindex if ever touched.
