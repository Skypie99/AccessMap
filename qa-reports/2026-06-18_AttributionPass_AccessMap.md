# Attribution Pass — AccessMap (web demo)

**Date:** 2026-06-18
**Branch:** `attribution/accessmap-shell-2026-06-18` (commit `b133c28`, off `main` db30a45)
**Status:** ✅ Built + verified via real export · **QUEUED FOR SKY** (Sky-only merge, Art.5/7/9)
**Surface:** accessmap.skypistudio.com (Vercel builds `npx expo export --platform web` → `dist/`)

---

## Why
Cold-eye review: the demo link is a ~4MB CSR bundle with a near-blank first paint that "on mobile reads as broken," **no og:image** (bare unfurl), and **no "built by Sky."** Fix: make the first beat read as AccessMap + Sky, give it a share card, and link home — without claiming a mobile app that was never shipped.

## What changed (2 files, both in `public/`)
1. **`public/index.html`** (the template `expo export` uses):
   - **Instant-paint brand splash inside `#root`** — "AccessMap · community-powered accessibility map · A project by Sky Halisky" + a `skypistudio.com` backlink. Because the app mounts with `createRoot` (classic CSR — `expo/AppEntry.js`, no Expo Router), React **replaces** `#root`'s children on mount, so the splash needs **no removal script and can never get stuck**. Dark text on the white pre-paint (AA-legible); reduced-motion safe. Doubles as the fix for the "blank screen looks broken" finding.
   - **`<head>` meta** — `description`, `author` (Sky Halisky), `canonical`, full Open Graph + Twitter `summary_large_image`.
2. **`public/og-image.png`** — 1200×630, AccessMap blue (`#1466E0`), map-pin motif, byline "A project by Sky Halisky · skypistudio.com".

## Truthfulness
Copy describes a **web app only** — no iOS / TestFlight / App-Store claim (the audit confirmed it was never built/submitted).

## Constraints honored
- Attribution only — **no app / TS / RN logic** touched; `App.tsx` untouched (the in-`#root` pattern avoided needing a mount hook).
- `dist/` is gitignored; only the two `public/` source files are committed.

## Verification — the engineering-risk gate (built output)
Ran the **actual Vercel build** locally: `npx expo export --platform web`. Confirmed in `dist/`:
- `dist/index.html` contains `name="author" content="Sky Halisky"`, `og:image`/`og:title`/`twitter:card`, the `#am-splash` node, and the `A project by … Sky Halisky` backlink.
- `<title>` resolves `%WEB_TITLE%` → **AccessMap**.
- `dist/og-image.png` emitted (public/ asset copied through).

## DECISIONS FOR SKY
1. **Approve** the splash copy + OG card, then **merge** `attribution/accessmap-shell-2026-06-18` (Sky-only) and let Vercel redeploy.
2. After deploy: open accessmap.skypistudio.com on iPhone Safari — confirm the splash paints immediately (not a white/broken beat) and the app still mounts over it; paste the URL into a link-preview checker for the OG card.
3. (Separate, not this pass) the live-DB security decisions + EAS TestFlight build remain in Morgan's queue.
