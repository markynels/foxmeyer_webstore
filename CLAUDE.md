# Fox Meyer Webstore

Shopify storefront for Fox Meyer — specialty coffee (roasted in Dorval, Québec; nitrogen-sealed cans). Dawn-based theme. Store: `fox-meyer.myshopify.com`.

## Product model (DTC) — source of truth

> Decided June 2026 (`Fox_Meyer_Decisions_Summary_for_ClaudeCode.md`). This **supersedes** any earlier per-can / cart-tier-threshold logic. The storefront has largely migrated to the box model; a couple of admin-side cleanup items remain — see "Migration" below.

**The core of the business model is the two box formats.** DTC sells exactly two products — a **4-Can Box** and an **8-Can Box**. **No single cans on the DTC store.** Single cans still exist, but only through retail/wholesale placements (e.g. a boutique shelf); they are not a storefront SKU and must not appear on foxmeyer.co.

**Launch = one-time sales only. Subscriptions are deliberately deferred** (see "Subscriptions — deferred").

- **4-Can Box** — mix-and-match, free shipping. Merchandise as *the way to meet the brand* ("try both", default 2 Fox + 2 Grenouille — frame as a sampler, not "bulk").
- **8-Can Box** — mix-and-match, free shipping, **includes a collectible musette** (bundled automatically, no separate charge, not a standalone SKU; rotating seasonal editions in Year 2+, one edition at launch).
- **Box builder:** customer chooses any split of the two coffees per box (4-can: 4×Fox, 2+2, 3+1…; 8-can: any split summing to 8).

### The two coffees (what goes in the boxes)
- **Fox Meyer** (orange fox) — $12.00 CAD/can reference, 150g can. GTIN 627146 20510 8. Brazil + Colombia, SCA 86+, medium-dark. Notes: velvety caramel, dark cocoa, toasted almond.
- **Petite Grenouille** (green frog) — $14.00 CAD/can reference, 150g can. GTIN 627146 20506 1. Brazil + India + Guatemala, SCA 86+, medium-dark. Notes: rich molasses, dark cocoa, toasted almond, walnut finish.

### Pricing & shipping
- Box price = **sum of chosen cans** at per-can reference ($12 / $14). 4-can box ranges $48–$56; 8-can box ranges $96–$112, depending on the Fox/Grenouille split.
- **Pricing is provisional** — the per-can references and box totals may move once real packaging/vendor costs land (box cost is a placeholder, see Open flags). Build pricing so it's easy to adjust; don't hardcode totals where a can-sum will do.
- **No cart-level percentage discounts** at any size.
- **Both boxes ship free, always.** There is **no** free-shipping threshold (every DTC order is already 4+), so no "free shipping at 4+" Shopify Function and no "add X cans for free shipping" progress bar.
- Optional low-priority soft upsell: a single "one box away from the musette" nudge on the 4-can box prompting an upgrade to the 8-can box. This is *not* the old threshold mechanic.

## Subscriptions — DEFERRED (do not build for launch)

Subscriptions are intentionally **out of scope for launch.** Ship the store on **one-time box sales only**, then introduce subscriptions later as a value-add. Do not add subscription UI, apps, or copy to the launch build.

Rationale (Marc): the subscription mechanism is still being worked out, and launching it day 1 risks overloading the release. Hypothesis — no one subscribes before they've tried the product, so forcing one-time sales at inception and enabling subscriptions afterward reads as a *customer benefit*, especially if it carries a recurring-order discount.

When it's eventually built (post-launch, design TBD; numbers below are **not final**):
- **4-pack** — recurring discount (~10%?), free shipping, skip/pause/swap. Likely cheaper than the one-time 4-can box — surface that as the entry-to-membership nudge.
- **8-pack bi-monthly** — recurring discount (~15%?), free shipping, rotating musette ~every 3rd order.
- The discount % is **not finalized.**
- App: likely Shopify Subscriptions (native); Recharge only if multi-tier complexity demands it.

## Naming & brand rules
- Consumer-facing coffee names are **"Fox Meyer"** (orange fox) and **"Petite Grenouille"** (green frog). **"Fox Blend" is INTERNAL ONLY — never on the site.**
- **Orange is reserved strictly for CTAs.** Voice: restrained/premium — reference Aesop, Kinto, Berluti; never specialty-coffee cliché.
- Bilingual FR/EN, **French markedly predominant** on Quebec-facing surfaces (Bill 96). Law 25 compliant. Use **"Fox Meyer ᴹᴰ"** for FR/Quebec-gov surfaces and **"Fox Meyer®"** for EN.

## Migration — old model → box model (cleanup checklist)

The Shop hub and PDP were originally built around per-can add-to-cart + bundle tiers + a free-shipping threshold. Status of the migration to the two-box model:

- [x] Remove single-can DTC product / per-can add-to-cart from the Shop hub and PDP. *(Shop hub is the box builder; PDP "Add to a box" links to it.)*
- [x] Build the 4-Can and 8-Can box with a mix-and-match box builder. *(Builder adds individual can variants summing to 4/8; see `sections/fox-meyer-shop.liquid`.)*
- [x] Remove the cart-tier free-shipping threshold (the "free ship at 4+" Shopify automatic-discount Function). *(Deleted June 2026 — the automatic discount "You've unlocked FREE shipping". Both boxes ship free unconditionally.)*
- [x] Remove the "add N cans for free shipping" progress bar and any 1–3 can "grey zone" cart states. *(No progress bar in the custom JS; the cart drawer now blocks checkout unless the can count is a complete set of boxes — see "Cart box-model enforcement" below.)*
- [x] Remove the bundle-tier pricing UI (no cart-level discounts). *(Builder price = sum of cans.)*
- [x] Purge any "Fox Blend" wording from consumer-facing copy. *(No occurrences in theme copy.)*

### Cart box-model enforcement (done June 2026)
- The custom cart **drawer** enforces the box rule: a valid cart is a positive multiple of 4 (every mix of 4- and 8-can boxes sums to a multiple of 4). When the count isn't a complete set of boxes, checkout is blocked with an "Almost a box" notice + a disabled "Add N more cans" button; rebalancing Fox/Grenouille stays free. See `boxState` in `assets/fox-meyer-store.js` and `.fms-box-warn` in `assets/fox-meyer-store.css`.
- The stock Dawn **/cart** page was the bypass (its unguarded checkout + Shop Pay / Apple Pay / Google Pay buttons). It — plus the other unused Dawn routes `collection`, `list-collections`, `search` — now redirect to `/pages/shop` via `sections/fox-meyer-redirect.liquid`. The slide-in drawer is the only path to checkout.
- **Residual gap (deferred):** a hand-typed `/checkout` after deliberately breaking a cart in the drawer is still technically possible. Only a Cart & Checkout Validation **Function** (a Shopify app/extension, not a theme change) closes it server-side; deferred as over-engineering for launch on the Basic plan. Revisit if real orders show broken boxes.
- The collectible musette is bundled via an automatic **BxGy** discount ("Founder's Edition Musette", ACTIVE). Its product is ACTIVE but **not** published to the Online Store channel (0 inventory, not standalone-purchasable) — keep it that way; it is not a storefront SKU.
- **Stray content removed (June 2026):** deleted the `le-cafe`, `preparation`, `fox-meyer` and `petite-grenouille` *content pages* (the last two duplicated the product PDPs) and the empty default **News** blog; trimmed the main menu to just "Shop". Real pages are `/pages/shop` and `/pages/about`.

### Open flags (track, not blockers)
- **Box packaging cost is a placeholder** (~$1.25 4-can / ~$1.75 8-can) pending a real vendor quote/MOQ — confirm before committing packaging spend.
- **Launch tripwire:** watch first-order conversion + add-to-cart-without-purchase over the first ~60 days / 150–200 orders. The 4-can floor (~$48–56) is a deliberate filter; soft conversion is the signal it's biting.
- **Designed-but-unbuilt fallback:** a 2-can trial box (customer pays shipping) is held ready to introduce **only if** the conversion tripwire fires. Do not build it for launch.

## Custom homepage
The homepage was refactored from a single-page `index.html` design (Three.js 3D spinning-can animation + GSAP scroll effects) into proper Shopify theme files:

| File | Role |
|---|---|
| `sections/fox-meyer-homepage.liquid` | Homepage section — all copy, prices, and links are editable via the theme customizer (schema-driven) |
| `assets/fox-meyer-homepage.css` | Styles, scoped under `.fm-page` to avoid clashing with Dawn |
| `assets/fox-meyer-homepage.js` | Three.js can animation + GSAP scroll behaviour |
| `layout/fox-meyer.liquid` | Minimal layout (no Dawn header/footer) so the custom design owns the full page |
| `templates/index.json` | Points to the custom layout + section |
| `assets/fox-meyer-logo.png`, `fox-meyer-fox.png`, `fox-meyer-can-a.jpeg`, `fox-meyer-can-b.jpeg` | Extracted image assets |

The original `index.html` is kept as the design reference.

Homepage notes:
- A **"Who is Fox Meyer?" about teaser** sits at the bottom (`#fm-about`), below the Shop card and above the footer, linking to `/pages/about`.
- The Three.js can animation lifts the cans away once you scroll past the Shop card (the exit guard is anchored to `#fm-about`), and the green backdrop fades back to plum over that same stretch.
- **iOS first-load "bottom bar":** a known plum bar appears under the URL bar on the first uncached iOS load (clears on refresh). It's two OS-level mechanisms — Safari's WebGL-canvas toolbar (accepted, can't fix while keeping the 3D can) and an iOS Chrome in-page strip (fixed via a gradient crossfade in `fox-meyer-homepage.js`, see `lastBgKey`). **Full investigation + revisit options: [`ios-bottom-bar-investigation.md`](ios-bottom-bar-investigation.md). Read it before touching this again — don't re-derive.**

## Branded store pages
The Shop hub, product page (PDP) and About page share one design system (mirrors the homepage: plum/cream/orange, Barlow Condensed). All are scoped under `.fms` and use the custom `fox-meyer` layout.

| File | Role |
|---|---|
| `sections/fox-meyer-shop.liquid` | Shop hub — the 4-Can / 8-Can mix-and-match box builder (price = sum of cans). Also: why, reviews, FAQ |
| `sections/fox-meyer-product.liquid` | Branded PDP |
| `sections/fox-meyer-about.liquid` | About / "Who is Fox Meyer?" — the people (Massilia, Marc, Armando), the freshness mission, fun & passion, closing CTA. Image pickers fall back to dashed placeholders until photos are uploaded |
| `assets/fox-meyer-store.css` | Shared stylesheet for Shop + PDP + About, scoped under `.fms` |
| `assets/fox-meyer-store.js` | Shop/PDP cart + add-to-cart behaviour |
| `snippets/fox-meyer-header.liquid`, `fox-meyer-footer.liquid`, `fox-meyer-product-card.liquid` | Shared header (Shop + Cart persist), footer, and product card |
| `templates/page.shop.json`, `page.about.json`, `product.json` | Wire the Shop / About pages and product template to the custom layout + sections |

Shopify Pages must exist with handles matching the template suffix for these to resolve: **shop** (`/pages/shop`, suffix `shop`) and **about** (`/pages/about`, suffix `about`). `url`-type schema settings can't default to `/pages/...` paths — leave the default off and apply the fallback in Liquid (`| default: '/pages/about'`).

## Editing workflow (IMPORTANT — follow every session)

GitHub is the **source of truth**. The Shopify GitHub integration auto-deploys the connected branch to the theme, and auto-commits customizer changes back to the branch.

1. **Pull first** — `git pull` before editing. If customizer edits may have happened, also `shopify theme pull`. Local can be stale because Shopify commits customizer changes back.
2. **Edit local files only** — never edit code in Shopify's web editor; it desyncs from git and a later push can overwrite it. Changing visual *settings* in the customizer is fine (those live in `config/settings_data.json`).
3. **Preview** — `shopify theme dev`, review at the local preview URL before anything goes live.
4. **Push** — `git commit` + `git push` after approval. The push auto-deploys to the connected theme.

```
git pull → edit local files → shopify theme dev (preview) → git commit & push (auto-deploys)
```

### Branch strategy
- `main` → connected to the **live** theme; only tested, approved changes
- (optional) `staging` → connected to a **draft** theme for work-in-progress; merge to `main` to go live

## Notes
- Theme is password-protected with no traffic yet — safe to iterate.
- Editable homepage content lives in section settings, not hardcoded — prefer updating schema defaults or the customizer over hardcoding copy.
