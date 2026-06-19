# AccessMap Overhaul — Phase 1: Demo First-Impression

**Date:** 2026-06-19
**Branch:** `overhaul/phase1-demo-firstimpression` (off `main@4ebd824`)
**Scope:** PRESENTATION ONLY (the live web demo's cold open). Zero data/auth/privacy/fence changes.
**Merge:** Sky-only (AccessMap is not Art. 17). This report packages the phase for review.

---

## What changed & why

The live demo's first 10 seconds were a text-only splash on a white page that then flipped to the always-dark map (CartoDB Dark Matter) — a jarring white→dark flash, no brand mark, no "it's loading" cue, and no installable web manifest. The attribution pass had already added the splash text + OG share card (kept intact). This phase finishes the branded cold open — all in `public/`, nothing in app source.

| Change | File | Detail |
|---|---|---|
| Brand pin in the first frame | `public/index.html` | Inlined the AccessMap pin SVG (same artwork as `src/components/LogoMark.tsx`) above the wordmark — the first beat now reads as *AccessMap*, not plain text. |
| Kill the white→dark flash | `public/index.html` | `prefers-color-scheme` block: pre-paint page background + splash colors harmonize to the OS theme (light → `#fff`; dark → app surface `#111`, with the dark-token brand `#4E89EF` / `#84AEF6`). Parsed in `<head>` so the very first frame already matches. |
| "It's working" cue | `public/index.html` | Three staggered loading dots so the ~4 MB bundle parse reads as *loading*, not *frozen*. **Reduced-motion safe** (WCAG 2.3.3): animation removed, dots stay as a static cue. |
| Installable PWA + share polish | `public/manifest.json` (new), `public/index.html` | `manifest.json` (name/short_name/description/standalone/icons), `<link rel="manifest">`, dual `theme-color` (light brand `#1466E0` / dark nav `#0d1829`), `apple-touch-icon`. |
| PWA icons | `public/icon-192.png`, `public/icon-512.png` (new) | 192/512 square icons from `assets/brand/app-icon.png` (1024²). |

## 🔒 Fence proof (mandatory)
`git diff --stat main -- . ':(exclude)qa-reports'` → **`public/index.html` only** (+62/−2). New files: `public/{manifest.json,icon-192.png,icon-512.png}`. **Zero** changes to `src/`, `supabase/`, `App.tsx`, or any data/auth/privacy/EXIF/RLS/RPC module. The web guest gate (`App.tsx` L143–146) is untouched.

## Built-output verification (AC)
Clean `npx expo export --platform web` (exit 0). In the built `dist/index.html`:
- ✅ Brand pin SVG (`am-pin`), loading dots (`am-dots`), dark-mode block, reduced-motion block all present.
- ✅ Byline / OG / Twitter / `canonical` / `author` / `og:image` **all retained**; template tokens correctly substituted (`<html lang="en">`, `<title>AccessMap</title>`).
- ✅ `dist/manifest.json` + `dist/icon-192.png` + `dist/icon-512.png` copied through; `_expo` bundle emitted.
- Note: `dist/` is gitignored — **Vercel rebuilds from `public/` on deploy**, so nothing stale is committed.

## AC scorecard
| Acceptance criterion | Status |
|---|---|
| Logo mark in the first painted frame | ✅ |
| No white→black flash (`prefers-color-scheme`) | ✅ (verified in built CSS) |
| Reduced-motion-safe progress cue | ✅ |
| Built `dist` retains author/OG/canonical/backlink | ✅ |
| Installable manifest + theme-color | ✅ (bonus) |

## NEEDS-SKY-DEVICE / deploy (folds into your deploy + device pass — decision #3)
1. **iPhone Safari cold-load** on the Vercel **preview** deploy of this branch: confirm (a) dark-mode visitors see no white flash, (b) the pin + dots render, (c) reduced-motion (Settings → Accessibility → Motion) freezes the dots, (d) "Add to Home Screen" shows the AccessMap icon + name.
2. Chromium preview can't certify Safari/iOS — this is a real-device check.

## Re-sequenced (deliberate, not dropped)
The web-guest **"Use my location"** affordance + the SF-default region (`MapScreen.tsx:109`) were in the Phase 1 proposal, but they require new geolocation UI threaded through the dense `MapScreen` — that file is already opened in **Phase 3**, so doing it there avoids touching `MapScreen` twice. Moved to Phase 3 (presentation-only; user-initiated tap, no auto-prompt — stays fence-safe).

## Review / merge / rollback
- **Review:** `git diff main..overhaul/phase1-demo-firstimpression -- public/index.html`; open the Vercel preview.
- **Merge:** Sky-only. After merge, redeploy; the live cold open updates.
- **Rollback:** revert the single commit on this branch / `git checkout main -- public/index.html` + delete the 3 new `public/` files. Fully reversible, presentation-only.
