# Restart snapshot — paused August 13, 2026

> Live state of `fox-meyer.myshopify.com` captured from the Admin API **before**
> pausing/cancelling the Shopify plan, so the store can be rebuilt from this file
> plus the git repo. Everything here lives **only in Shopify** — git does not see
> any of it.
>
> Companion docs: [`CLAUDE.md`](CLAUDE.md) (product model + build rules),
> [`backup-english-content-2026-07.md`](backup-english-content-2026-07.md) (EN
> product/page copy), [`seo-strategy.md`](seo-strategy.md),
> [`fr-translation-string-inventory.md`](fr-translation-string-inventory.md).

## 0. Do these BEFORE you cancel

1. ~~Download the 14 Shopify CDN files~~ — **done Aug 13, 2026**, committed to
   [`shopify-files-backup/`](shopify-files-backup/) (§8). This was the only
   genuinely unrecoverable item.
2. **Export products CSV** (Products → Export) — belt and braces over §3.
3. **Download the live theme as a .zip** (Online Store → Themes → Actions →
   Download theme file) — git already has it, but the zip captures any
   customizer state that never got committed back.
4. **Run `git pull` and `shopify theme pull`** and commit anything the
   customizer pushed back, so `main` is truly current.
5. **Note the Copy Desk custom app** — Settings → Apps → Develop apps. Its API
   token dies with the store; you'll create a new one on restart and put it in
   `tools/copy-desk/.env` (gitignored, so it is not in the repo).
6. **Verify cancel vs. "Pause and build"** in your admin. Shopify has offered a
   reduced-cost pause tier that keeps the store editable with checkout disabled,
   versus a full close where data is retained only for a limited window. Confirm
   the current terms and price yourself — do not trust a remembered figure.

**Not a risk:** there is **no custom domain on this store** (§2). `foxmeyer.co`
was never connected, so cancelling endangers no domain registration. Whatever
registrar holds `foxmeyer.co` is unaffected.

**Also not a risk:** **0 orders, ever.** 3 customer records exist. Nothing to
preserve on the sales side.

## 1. Shop

| Field | Value |
|---|---|
| Store | Fox Meyer — `fox-meyer.myshopify.com` |
| Shop ID | `79341125864` |
| Plan | **Basic** |
| Currency | CAD |
| Timezone | America/Toronto |
| Contact email | marc@nine185.com |
| Orders / customers | **0 orders**, 3 customers |
| Location | "Shop location" (`gid://shopify/Location/87590371560`), address is just "Canada" — incomplete |

## 2. Domains

| Host | Notes |
|---|---|
| `fox-meyer.myshopify.com` | **Primary**, SSL on |
| `3nj03p-4c.myshopify.com` | Auto-generated alias, SSL on |

No custom domain is connected. `foxmeyer.co` is still pending per
[`seo-strategy.md`](seo-strategy.md).

## 3. Products

All three are **ACTIVE**, vendor "Fox Meyer", **0 inventory**, inventory
**tracked**, and — importantly — **weight is 0 kg on every variant** (see §5
flag). **No product images exist at all** (media is empty on all three).

| Product | Handle | Product ID | Variant ID | SKU | Barcode (GTIN) | Price |
|---|---|---|---|---|---|---|
| Fox Meyer | `fox-meyer` | `9504051560680` | `48568777605352` | `FM-FOX-150` | `627146205108` | $12.00 |
| Petite Grenouille | `petite-grenouille` | `9504051691752` | `48568777965800` | `FM-PG-150` | `627146205061` | $14.00 |
| Founder's Edition Musette | `founders-edition-musette` | `9505186349288` | `48571798257896` | — | — | $28.00 |

**Type:** "Whole Bean Coffee" (both coffees; musette has none).

**Tags — Fox Meyer:** canned coffee, espresso blend, Montreal roaster,
nitrogen-sealed, SCA 86+, specialty coffee, whole bean
**Tags — Petite Grenouille:** canned coffee, medium-dark roast, Montreal
roaster, nitrogen-sealed, SCA 86+, specialty coffee, whole bean
**Tags — Musette:** none

SEO titles/descriptions and full HTML descriptions are preserved in
[`backup-english-content-2026-07.md`](backup-english-content-2026-07.md) and
still match live.

**Publications:** all three are published to **Online Store, Point of Sale and
Shop** — including the musette (see §9 flag 2).

## 4. Automatic discount — the musette bundle

| Field | Value |
|---|---|
| ID | `gid://shopify/DiscountAutomaticNode/1526040690920` |
| Type | `DiscountAutomaticBxgy` |
| Title | Founder's Edition Musette |
| Status | **ACTIVE**, starts 2026-05-20T02:19:49Z, no end date |
| Rule | Buy **8** of {Fox Meyer, Petite Grenouille} → get **1** Founder's Edition Musette at **100% off** |

To rebuild: Discounts → Create → Buy X get Y → automatic; customer buys minimum
**quantity 8** of the two coffee products; customer gets **1** of Founder's
Edition Musette; discounted value **free**.

## 5. Shipping — "General profile" (default)

### Domestic (Canada)
| Rate | Price | Conditions |
|---|---|---|
| **Standard** | **$0.00 CAD** | **none** ← this is what makes both boxes ship free |
| Express | $20.00 CAD | none |

This matches the rule in `CLAUDE.md`: free shipping comes from the **rate**, not
a discount. Do not reintroduce a blanket free-shipping automatic discount.

### US Cross-border (weight-banded + free over $100)
| Rate | Price | Condition |
|---|---|---|
| Standard International | $7.90 | weight 0 – 0.5 kg |
| Standard International | $19.90 | weight 0.5001 – 1.5 kg |
| Standard International | $29.90 | weight 1.5001 – 30 kg |
| Standard International | $0.00 | order total ≥ $100.00 CAD |
| Express International | $34.90 | weight 0 – 1.5 kg |

### International (26 countries: AE AT AU BE CH CZ DE DK ES FI FR GB HK IE IL IT JP KR MY NL NO NZ PL PT SE SG)
| Rate | Provider |
|---|---|
| `canada_post` | **Canada Post carrier-calculated**, 0% markup, $0 fixed fee |

⚠️ **Flag:** every variant weighs **0 kg**, so all US orders fall into the
cheapest band ($7.90) and Canada Post gets a 0 kg parcel to quote. Set real
per-can weights before taking international orders. Doesn't affect domestic
(flat $0/$20, no weight conditions).

## 6. Pages, policies, menus

**Pages** (both published — handles must match the theme template suffixes):
| Title | Handle | Template suffix | ID |
|---|---|---|---|
| Shop | `shop` | `shop` | `132154556648` |
| About | `about` | `about` | `132187422952` |

**Policies** — all four now exist (privacy, refund, shipping, terms of service).
This is **newer than** [`backup-english-content-2026-07.md`](backup-english-content-2026-07.md),
which recorded only the privacy policy. The EN baseline text is in
[`store-policies-en-2026-07.md`](store-policies-en-2026-07.md). Bill 96 / Law 25
require FR versions at least as prominent as EN.

**Menus:**
| Handle | Items |
|---|---|
| `main-menu` | "Shop" → type FRONTPAGE (`/en`) |
| `footer` | "Search" → `/en/search` |
| `customer-account-main-menu` | Orders, Profile (Shopify defaults) |

⚠️ **Flag:** the main menu's "Shop" is a **FRONTPAGE** link (the homepage), not
`/pages/shop`. The custom header doesn't read this menu, so it's invisible
today — but fix it if Dawn surfaces are ever re-enabled.

## 7. Localization — the FR flip already happened

| Locale | Primary | Published |
|---|---|---|
| **French (`fr`)** | **yes** | **yes** |
| English (`en`) | no | **no** |

**The store is FR-only right now.** `CLAUDE.md` describes the flip as a plan
with "both published via Translate & Adapt" — in reality **EN is unpublished**,
so the native `{% form 'localization' %}` FR/EN toggle in both headers renders
**nothing** (it needs two published locales). Either publish EN or expect a
single-language store on restart.

**Markets:** one market, "Canada" (`ca`), primary, enabled, no custom web
presence.

**Backups for the flip:** theme EN state = `english-baseline` branch; admin EN
content = [`backup-english-content-2026-07.md`](backup-english-content-2026-07.md).

## 8. Files from Shopify's CDN — backed up

14 images lived in Settings → Files and nowhere else. **They are now committed
to [`shopify-files-backup/`](shopify-files-backup/)** (18 MB, downloaded and
dimension-verified Aug 13, 2026), so cancelling no longer loses them. Re-upload
via Settings → Files on restart.

| File | Size |
|---|---|
| `Brand_Logo.png` | 1451×412 |
| `Fox_Meyer_Logo_Transparent.png` | 1395×459 |
| `Favicon.png` | 48×48 |
| `Foxy.png` | 1000×1000 |
| `Foxy_5471df8b-…​.png` | 1536×1536 |
| `above_the_clouds.png` | 3008×2000 |
| `above_the_clouds2.png` | 3008×2000 |
| `above_the_clouds2_9bfb801a-…​.png` | 3008×2000 |
| `above_the_clouds_mobile.png` | 1615×2000 |
| `Sub_Hero_Section.png` | 2200×2200 |
| `Sub_Hero_Section3.png` | 2107×1395 |
| `Sub_Hero_Section3_aef7440c-…​.png` | 2200×2200 |
| `Petite_Grenouille.png` | 470×395 |
| `Petite_Grenouille_997ce2f9-…​.png` | 545×458 |

All under `https://cdn.shopify.com/s/files/1/0793/4112/5864/files/`.

## 9. Discrepancies found at snapshot time

Recorded as-is; none were changed during this snapshot.

1. **FR flip is live, EN is unpublished** (§7) — `CLAUDE.md` still frames this as
   a plan with both locales published.
2. **The musette IS published to the Online Store channel** (§3). `CLAUDE.md`
   says it must **not** be ("keep it that way"). Inventory is 0 so it isn't
   buyable, but the rule is currently violated.
3. **All four policies exist** — the July backup doc says only privacy did.
4. **All variant weights are 0 kg** (§5) — breaks weight-based US/international
   rates.
5. **No product images anywhere** — consistent with `seo-strategy.md`'s pending
   list; the PDP and Shop hub have nothing to show.
6. **Main menu "Shop" points at the homepage**, not `/pages/shop` (§6).

## 10. Restart checklist

1. Reactivate/select a Shopify plan on the same store if it's still reopenable;
   otherwise create a store and work through §1–§8.
2. **Reconnect the GitHub integration**: Online Store → Themes → Add theme →
   Connect from GitHub → `markynels/foxmeyer_webstore`, branch `main`. Publish
   that theme. (Live theme at pause: **`foxmeyer_webstore/main`**,
   `gid://shopify/OnlineStoreTheme/157112893672`. Also present, unpublished:
   `Savor` `156379447528`, `Fox_Meyer` `157112107240`.)
3. Recreate the two Pages with **exactly** the handles/suffixes in §6, or the
   custom templates won't resolve.
4. Recreate products (§3), then re-upload §8 files and real product photos.
5. Rebuild the shipping profile (§5) — **Domestic Standard $0 with no condition**
   is the one that matters.
6. Recreate the BxGy musette discount (§4) and unpublish the musette from the
   Online Store channel.
7. Set the store password on until launch (`CLAUDE.md`: no traffic yet).
8. Recreate the Copy Desk custom app; put its token plus `ANTHROPIC_API_KEY` in
   `tools/copy-desk/.env` (see [`tools/copy-desk/README.md`](tools/copy-desk/README.md)).
9. Re-check locales (§7) and re-publish EN if the FR/EN toggle is wanted.
10. Work the pending admin lists in [`seo-strategy.md`](seo-strategy.md) §3 —
    domain, GSC, sitemap, product photos.
