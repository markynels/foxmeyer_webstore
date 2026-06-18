# Fox Meyer — Shop page & PDP (CRO build notes)

A high-conversion **Shop hub** and **branded PDP** built to match the custom homepage
(plum/cream/orange, Barlow Condensed) instead of stock Dawn. All copy is editable in the
theme customizer; live price/availability always pull from Shopify.

## Files added / changed
| File | Role |
|---|---|
| `sections/fox-meyer-shop.liquid` | Unified Shop hub — both cans, inline add-to-cart + Shop Pay express, bundle tiers, trust row, reviews, FAQ. Schema-driven copy. |
| `sections/fox-meyer-product.liquid` | Branded PDP (replaces stock Dawn product page) — gallery, buy box, recipe, trust, FAQ, sticky mobile buy bar. |
| `snippets/fox-meyer-product-card.liquid` | Reusable shop card with product form + `payment_button`. |
| `snippets/fox-meyer-header.liquid` / `fox-meyer-footer.liquid` | Branded header (live cart count) + footer. |
| `assets/fox-meyer-store.css` | Shared store styling, scoped under `.fms`. |
| `assets/fox-meyer-store.js` | AJAX cart (add/change/remove), slide-in cart drawer, free-shipping progress, quantity steppers, sticky buy bar, toasts. |
| `templates/page.shop.json` | Shop page template (layout `fox-meyer` + `fox-meyer-shop`). |
| `templates/product.json` | Rewired to the branded product section. |
| `templates/index.json` | Homepage "Shop" buttons now point to `shopify://pages/shop`. |
| Shopify products | Prices corrected to **$12 / $14**, SKUs (`FM-FOX-150` / `FM-PG-150`) + descriptions added; `/pages/shop` page created. |

## CRO decisions baked in
1. **Fewest clicks for a 2-SKU line.** The Shop page lets shoppers add either can inline — no
   collection → PDP → cart detour. Each card carries its own quantity + Add-to-cart + express button.
2. **Express checkout front-and-centre.** Shopify's dynamic `payment_button` (Shop Pay / Apple Pay /
   Google Pay) sits under every Add-to-cart, skipping the cart entirely — the single biggest lever on
   mobile conversion.
3. **AJAX cart drawer, never a full reload.** Adding opens a slide-in drawer with a live
   **free-shipping progress bar** ("add 2 more cans for free shipping") to lift average order value.
4. **Bundle ladder.** 1–3 / 4+ (free shipping, "most popular") / 8+ (free shipping + musette) nudges
   quantity up. Threshold is configurable (`free_ship_qty`).
5. **Objection handling in-page.** Trust strip, "Why Fox Meyer" icons, social-proof reviews, and a FAQ
   (freshness, whole-bean, shipping, returns, payment) answer the questions that stall checkout.
6. **Sticky mobile buy bar** keeps price + Add-to-cart in reach on the PDP as you scroll.
7. **Trust & risk reversal**: 100-day freshness guarantee, "roasted to order", secure-checkout cues.

## Checkout flow — important constraints & recommendations
Shopify's checkout itself is hosted and not theme-editable (deep customization needs Shopify Plus +
checkout extensions). So "streamlined checkout" = removing friction on the path *to* it. To finish:
- **Enable accelerated checkouts** (Settings → Payments → Shop Pay / Apple Pay / Google Pay) so the
  express buttons render. Turn on **Shop Pay**.
- **Express checkout on cart & PDP**: already wired via `payment_button`.
- **Free-shipping rule**: create a shipping rate of $0 for orders ≥ 4 items (or a threshold), so the
  on-page free-shipping promise is real at checkout.
- Consider **Shopify "post-purchase" / Shop Pay one-tap** and a **bundle/volume discount** (Discounts)
  to back the 8+ musette perk.

## ⚠️ Action required before it works
- **Both cans are currently `Sold out`** — inventory is *tracked, quantity 0, policy DENY*
  (`availableForSale: false`). The Add-to-cart/express buttons will render disabled until you either
  (a) add stock, (b) set "Continue selling when out of stock", or (c) untrack inventory.
- **Upload product photos** to each product in Shopify (the page falls back to the theme can images for now).
- **Preview** with `shopify theme dev`, then `git commit` + push to deploy (per CLAUDE.md workflow).
