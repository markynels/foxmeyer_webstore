# Fox Meyer Webstore

Shopify storefront for Fox Meyer — specialty coffee (roasted in Dorval, Québec; nitrogen-sealed cans). Dawn-based theme. Store: `fox-meyer.myshopify.com`.

## Products
- **Fox Meyer** — $12 CAD, 150g can
- **Petite Grenouille** — $14 CAD, 150g can

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
