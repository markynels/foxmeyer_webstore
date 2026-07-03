# Copy Desk

Local dashboard for comparing and editing all consumer-facing **FR/EN copy** across the Fox Meyer store — theme locale strings, section-settings copy, and Shopify admin content — side by side, with lint (brand rules, placeholder parity), export (CSV / JSON / XLIFF) and an append-only change history (`data/history.jsonl`, committed — the record for future A/B work).

## Run

```sh
node "tools/copy-desk/server.mjs"
# → http://localhost:4477
```

Requires Node ≥ 20. No npm install — zero dependencies.

## What edits go where

| Copy | EN | FR |
|---|---|---|
| Theme strings (`fms` locale keys) | writes `locales/en.default.json` | writes `locales/fr.json` |
| Section settings (homepage/shop/about/product) | writes `templates/*.json` | staged → published to Shopify (Translations API) |
| Admin content (products, pages, policies, SEO) | read-only in v1 — edit in Shopify admin | staged → published to Shopify |

**Git-backed saves never commit or push.** Review with `git diff`, then commit & push as usual — the push auto-deploys the theme. The dashboard blocks git-backed saves when `origin` is ahead (customizer auto-commits); pull first.

**Shopify-backed edits are staged locally** (`data/staged.json`) until you hit **Publish staged**, which re-checks content digests first — if the EN source changed since you staged, the entry is excluded and flagged instead of silently overwriting.

## Connecting Shopify (needed for FR section settings + admin content)

1. Shopify admin → Settings → Apps and sales channels → Develop apps → Create app ("Copy Desk").
2. Admin API scopes: `read_translations`, `write_translations`, `read_products`, `write_products`, `read_content`, `write_content`, `read_themes`, `read_online_store_pages`, `write_legal_policies`.
3. Install the app, reveal the Admin API access token (`shpat_…`).
4. Create `tools/copy-desk/.env` (gitignored):

```
SHOPIFY_STORE=fox-meyer.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxx
# SHOPIFY_API_VERSION=2026-01   (optional override)
```

5. In the dashboard, hit **Refresh from Shopify**. Missing scopes are reported per resource type.

Without `.env` the tool runs in git-only mode (locale files + EN section settings).

## AI transcreation (FR drafts)

Generates Québec-French transcreations of the EN copy with the Anthropic API — the intended flow for **autopopulating missing FR, then reviewing it with a native French speaker before anything deploys**. It replaces reliance on Shopify's Translate & Adapt auto-translation.

Setup — add to the same `tools/copy-desk/.env`:

```
ANTHROPIC_API_KEY=sk-ant-xxx
# ANTHROPIC_MODEL=claude-opus-4-8   (optional override; this is the default)
```

Two buttons appear once the key is set:

- **✦ AI draft** (per FR cell) — generates a transcreation of that entry's EN text and drops it into the FR textarea. Nothing is saved; you review/edit, then Save/Stage as usual (lint runs on save).
- **✦ AI-fill missing FR (group)** (filter bar) — transcreates every untranslated entry in the active group and applies each through the normal save path: locale strings are written to `locales/fr.json` (review via `git diff`, nothing deploys until you commit & push), Shopify-backed copy is staged (review before "Publish staged"). Entries whose AI output trips lint are skipped and listed for manual handling.

The model is briefed on the brand rules (voice à la Aesop/Kinto, « vous », `ᴹᴰ` not `®`, no "Fox Blend", exact placeholder/HTML preservation) and is shown existing FR copy as a terminology reference. Batch-applied entries are marked `"ai": true` in `data/history.jsonl`.

**Review is still mandatory** — AI output is a draft. Have a native French speaker approve the `git diff` / staged set before pushing or publishing.

## Lint rules

- **"Fox Blend"** anywhere → error (internal name, never consumer-facing).
- `®` in FR → warn (Quebec surfaces use **ᴹᴰ**); `ᴹᴰ` in EN → warn.
- Placeholder parity: Liquid `{{ product }}` and JS `{count}` tokens must match the other language; HTML tag parity for `*_html` strings.

Errors block saving unless you tick "Save anyway".

## Files

- `data/history.jsonl` — committed. One line per edit/stage/publish, with `variant`/`experiment` fields reserved for A/B testing.
- `data/staged.json`, `data/shopify-cache.json`, `.env` — local state, gitignored.

## v1.5 backlog

EN admin publish (+ automatic FR re-registration after digest change), XLSX export, CSV/XLIFF import round-trip, per-entry history view, surfacing the not-yet-migrated hardcoded Liquid strings (see `fr-translation-string-inventory.md` §C).
