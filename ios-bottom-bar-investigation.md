# iOS homepage "bottom bar" — investigation & status

**Status:** Partially resolved + deliberately parked. Revisit before go-to-market if still bothersome.
**Last worked:** 2026-06-22 (multi-hour on-device live-debug session).
**Live fix commit:** `57d39e1` (iOS Chrome gradient crossfade). Everything else from the session was reverted to the original.

---

## Symptom

On **mobile iOS only** (both Safari and Chrome), on the **very first uncached load** of the homepage in a new private/incognito session, a **plum/purple bar** appears along the **bottom of the screen** (under the URL bar). It only affects the homepage (`/`), not `/shop`. **It disappears on refresh** and never comes back until the next cold session.

## Root cause — it's TWO different mechanisms, one per browser

Proven on-device via Mac Safari Web Inspector, using the user's own working site (shouldigooutdoors.com) as a control.

### iOS Safari — the bar is browser chrome (NOT fixable)
**Any WebGL `<canvas>` on the page makes iOS Safari abandon its translucent (see-through) toolbar and instead fill the band under the URL bar with a solid color it samples once at load.** The homepage's Three.js 3D can (`#fm-stage`) is that canvas.

Proven by elimination:
- Hide the canvas + fixed backdrops → translucent (no bar).
- Green backdrop `<div>` alone, canvas hidden → still translucent (fixed *divs* are fine).
- Add the canvas back — fixed, `absolute`, inset 110px from the bottom, or shrunk to a small centered box → **solid bar every time.**

So on Safari it's literally **the 3D can or the clean toolbar.** The control site has no canvas, so its toolbar is translucent.

### iOS Chrome — the bar is an in-page strip (fixable)
iOS renders the page's own normal-flow background in the thin strip under the URL bar (the fixed backdrop + WebGL canvas are clipped before reaching it; only normal-flow content paints there). That strip shows `.fm-page`'s plum gradient as a bar over the green sections. Content (cards, text, overlays) paints over it — "everything covers it except the background."

## Why it's first-load-only / clears on refresh

iOS's URL bar is dynamic. On a **cold load** the page composites during the URL-bar-collapse transition, exposing the band and latching that state for the page's life. On a **warm reload** everything paints with the viewport already settled, so the band never gets exposed. It's a first-paint timing artifact, not something in our code.

## Decision (2026-06-22)

- **Keep the 3D can.** It's a signature homepage element. → **Accept the Safari bar** (OS limit; first-load-only, clears on refresh, cosmetic, no-traffic store).
- **Fix Chrome.** Deployed in `57d39e1`.

## What's deployed (the Chrome fix)

In `assets/fox-meyer-homepage.js`, the render loop crossfades `.fm-page`'s gradient toward the green backdrop's gradient using the same `greenAmt` that drives the backdrop opacity. At `greenAmt 0` it's byte-identical to the original plum (hero unchanged); the gradient is only ever visible in the bottom strip (the fixed backdrop covers it everywhere else). Result: the Chrome strip now **tracks plum→green** instead of staying purple.

**Residual:** a faint **shade seam** between the strip and the section remains, because the strip (`.fm-page`, `background-attachment: fixed`) and the section (`.fm-bg-green`, `position: fixed`) are sized by iOS to slightly different viewport heights (layout vs visual), so the same gradient lands on a slightly different shade at the boundary. Minor, Chrome-only, first-load-only, gone on refresh.

## Options if we revisit before launch

- **Chrome seam (low risk):** at full green, make `.fm-page` a **solid** forest color instead of a gradient, so there's no position-dependent gradient to mismatch. One deploy + a Chrome eyeball.
- **Safari bar (bigger call):** swap the live 3D can for a **static can image on iOS only** (no WebGL) — Safari's toolbar then goes clean/translucent, and it's lighter on mobile battery. Desktop/Android keep the full animation. This is the *only* way to remove the Safari bar.

## What was tried and ruled out (do NOT repeat)

Sizing/anchoring the fixed backdrop (`inset:0`, `100lvh`, 200px overscan, bottom-anchoring); z-index changes; tracking `body`/`html`/`.fm-page` background-color to the crossfade; moving the plum gradient to a fixed `.fm-bg-plum` layer (also regressed the hero look); a fixed bottom strip element; `<meta name="theme-color">` static **and** dynamic (verified ignored on both browsers with a static bright-red value that produced no red); `viewport-fit=cover` (the control site doesn't even use it). None of these address the Safari canvas mechanism.

## Key files

- `sections/fox-meyer-homepage.liquid` — homepage markup (loader, `#fm-bg-green`, `#fm-stage` canvas).
- `assets/fox-meyer-homepage.css` — `.fm-page`, `.fm-bg-green`, `.fm-stage` layers.
- `assets/fox-meyer-homepage.js` — Three.js render loop; the Chrome crossfade fix lives here (search `lastBgKey`).
- `layout/fox-meyer.liquid` — minimal layout (viewport meta here).
