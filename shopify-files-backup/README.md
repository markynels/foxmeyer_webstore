# Shopify Files backup

The 14 images that lived in **Settings → Files** on `fox-meyer.myshopify.com`
and nowhere else — pulled from the Shopify CDN on **August 13, 2026**, before
pausing the plan. Filenames and dimensions match the Admin API exactly.

These are **not theme assets.** They sit outside `assets/` on purpose: Shopify's
theme sync only reads `assets/ config/ layout/ locales/ sections/ snippets/
templates/`, and `assets/` must stay flat, so a subfolder there would break the
GitHub integration. Nothing here is served by the storefront.

To restore: Settings → Files → Upload, then re-point whatever referenced them
(none of the custom homepage/Shop/PDP sections do — they use the `assets/`
copies committed in this repo).

Inventory and full context: [`../RESTART.md`](../RESTART.md) §8.
