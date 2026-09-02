# Build 33 OpenFreeMap Web-Demo Transplant — QA Receipt

**Session:** FLAGSTONE-B33-OPENFREEMAP-TRANSPLANT-20260901
**Engine/model:** Claude Code (Opus 4.8), Sky-initiated interactive session
**Date:** 2026-09-01
**Branch:** `claude/build33-openfreemap-web-20260901`
**Worktree:** `~/AccessMap/.claude/worktrees/migration-map-repair-fix2-921aac`
**Status:** ✅ PASS — DO NOT MERGE / DO NOT PUSH / DO NOT DEPLOY (Sky merges, Sky pushes)

---

## 1. Goal

Rebuild the OpenFreeMap web-basemap repair on top of the **exact EAS iOS Build 33
source commit**, preserving every newer Build 33 map/UI behavior, removing CARTO +
the "API KEY REQUIRED" watermark, and passing local web runtime acceptance.

## 2. Verified immutable source

| Fact | Value |
|---|---|
| Build 33 source commit | `f5594171e75bc5ec92a87d0392c361601ddedfba` |
| Commit subject | `docs(qa): record RCTFatal diagnosis and XXXL acceptance` (Sky, 2026-08-31) |
| Product repair in its ancestry | `76ee3559…` `fix(final-polish): consolidate sheet and filter repairs` (verified ancestor ✓) |
| App version | 4.1.1 (iOS build 33) |

**Graph fact that makes the transplant well-defined:** the old provider baseline
`a0bf4d0` is a **linear ancestor** of `f5594171` (merge-base = `a0bf4d0` itself).
So Build 33 = old baseline + newer map-UI/product commits, and the provider delta
`a0bf4d0..fa267ca` transplants onto Build 33 as a pure 3-way merge.

## 3. Old (stale) provider migration used as the delta source — NOT cherry-picked blindly

Branch `codex/flagstone-web-demo-repair-20260901`:
`95c9c1e` (truth audit) → `fa267ca` (impl) → `4fa922d` (qa) → `d6b17a1` (accept).

Only the **implementation commit `fa267ca`** was used, and only as a 3-way *diff*,
never as authoritative resulting files. Mechanism: it swaps the CARTO raster
`CachedTileLayer` for an **OpenFreeMap vector style rendered inside the same Leaflet
map** via `@maplibre/maplibre-gl-leaflet` + `maplibre-gl` — which is exactly why it
composes cleanly with Build 33 (also Leaflet), keeping all marker / cluster / popup /
heatmap machinery.

## 4. Build 33 UI precheck (before mutation)

| Check | Result |
|---|---|
| Expanded on-map heat legend removed (`HeatmapLegend.tsx` + test absent, no refs) | ✓ |
| Compact `LegendModal.tsx` present (525 lines) | ✓ |
| Single session-dismissible heat notice in `MapScreen` (`heatNoticeDismissed`) | ✓ |
| Single compact location warning (`permissionDenied` banner) | ✓ |

Newer Build 33 UI confirmed present → safe to mutate.

## 5. Method

1. `git checkout -b claude/build33-openfreemap-web-20260901 f5594171` (exact source).
2. `git cherry-pick -n fa267ca` → applied **100% cleanly, zero conflicts** (git's own
   3-way merge). Independently reproduced the `PlatformMap.web.tsx` merge with
   `git merge-file` (ours=Build 33, base=`a0bf4d0`, theirs=`fa267ca`) — also clean;
   working tree byte-identical to that merge.
3. `package-lock.json` regenerated deterministically: reset to Build 33's lock, then
   `npm install --legacy-peer-deps` added only the maplibre dependency subtree.

## 6. Files changed vs Build 33 (12) — all PROVIDER- or TEST-required

**PROVIDER REQUIRED**
- `src/components/PlatformMap.web.tsx` — CARTO `CachedTileLayer` → `OpenFreeMapLayerWrapper` (maplibre-gl-leaflet); Build 33 callout work preserved.
- `package.json` — `+maplibre-gl@^5.24.0`, `+@maplibre/maplibre-gl-leaflet@^0.1.4` (Build 33's own dep changes untouched).
- `package-lock.json` — maplibre subtree only.
- `public/sw.js` — tile CacheFirst host `.basemaps.cartocdn.com` → `tiles.openfreemap.org`; `CACHE_VERSION v2→v3` (discards CARTO watermark imagery).
- `vercel.json` — CSP (Report-Only) img-src+connect-src `*.basemaps.cartocdn.com` → `tiles.openfreemap.org`.

**TEST REQUIRED**
- `src/__tests__/openFreeMapWebConfig.guard.test.ts` (A) — sw host + v3 + no cartocdn.
- `src/__tests__/securityHeaders.guard.test.ts` (M) — CSP admits OpenFreeMap, asserts no cartocdn.
- `src/components/__tests__/PlatformMapWeb.openFreeMap.test.ts` (A) — provider guard.
- `src/components/__tests__/PlatformMapWeb.calloutClear.test.tsx` (M) — 3-way merged (both sides' additions kept).
- `src/components/__tests__/PlatformMapWeb.reduceMotion.test.tsx` (M).
- `src/components/__tests__/PlatformMapWeb.tileFlip.test.tsx` (M).
- `src/components/__tests__/CachedTileLayer.test.ts` (D) — CARTO tile-cache class removed.

No file outside those two categories changed. `.env`, `dist/`, `node_modules` remain gitignored.

## 7. PlatformMap.web.tsx preservation proof

Build 33's three callout additions are all present in the merged file:
`showCallout: (flagId) => boolean` (returns `false` when marker unmounted),
the opaque `.am-map-callout` popup CSS (white floor / dark ink), and
`className="am-map-callout"` on `<Popup>`.

The 15 `userId` refs + `useAuth`/`user`/`track`/`tileCache` imports that the merge
removed were **100% CARTO tile-cache infrastructure** (the `CachedTileLayer` class +
wrapper, lines 629–806/852–853/1084 only fed it). Verified: identical usage counts in
`a0bf4d0` and `f5594171`; zero usage outside the removed cache. **No feature regression.**
`npm run typecheck` clean confirms no dangling symbols.

## 8. Validation gates

| Gate | Result |
|---|---|
| `git diff --check` | clean ✓ |
| `npm run typecheck` (`tsc --noEmit`) | PASS ✓ |
| `npm run lint` | 0 errors (91 warnings = pre-existing Build 33 baseline in untouched files) ✓ |
| Affected suites (openFreeMapWebConfig, securityHeaders, PlatformMapWeb.openFreeMap/calloutClear/reduceMotion/tileFlip) | **all 6 PASS** ✓ |
| Web export (`expo export --platform web`) | PASS — bundles `maplibre-gl-*.css` + `leaflet-*.css`; `sw.js` in dist ✓ |
| OpenFreeMap style endpoints (positron/dark/liberty/bright) | all HTTP 200; every glyph/sprite/tile sub-resource on single host `tiles.openfreemap.org` ✓ |

### Full-suite reconciliation (the important part)

Full `jest` run (`.claude` ignore overridden) on this branch: **21 failed suites /
17 failed tests / 3885+ passed**. The **same 21 suites fail on the pristine Build 33
source `f5594171`** (verified in `~/AccessMap-codex/final-polish-consolidation-20260831`,
real node_modules) → **pre-existing baseline, zero new failures from this transplant.**
Sampled causes: `pointsSqlParity` / `noCredentialsInTree` = ENOENT on migration files
Build 33 renamed to timestamped names; `mapChromeBudget` / `privacy` = source/content
drift guards on files not touched here. `FlagDetailModal.gallery` is flaky under full-suite
load (passes in isolation and in the 2nd full run). None relate to the web basemap.

## 9. Runtime acceptance (production web export served locally, faithful Vercel path)

Loaded via `expo export` → static server on `127.0.0.1:8090` (real `.env`, values never
printed/committed). Onboarding → Home → Full map.

**Basemap**
- OpenFreeMap **Positron light** renders (roads, labels, water, "MIDTOWN"/"RUTLAND", route shields) ✓
- OpenFreeMap **dark** renders (dark cartography, light roads/labels) ✓
- **Zero** "API KEY REQUIRED" imagery; no blank field once at a normal zoom ✓
- 24 requests to `tiles.openfreemap.org` (style/source/sprites/glyphs/tiles) **all HTTP 200**; **0 CARTO requests**; no credential-bearing URLs ✓

**Content**
- **13 flags** loaded from Supabase (matches expected); markers positioned; cluster ("2") renders ✓
- Marker click → callout with **opaque white card** ("Broken sidewalk · SEVERITY 3 OF 5 · MODERATE · OPEN · Reported 16h ago" + "Open details") ✓

**Desktop interaction** — pan ✓, wheel/`+`/`−` zoom ✓, marker click ✓, popup ✓, "Open details" present ✓, Recent list + "Open full map" ✓.

**Theme flip** — light → dark → light: chrome + basemap both swap, markers remain, no stale CARTO, no crash ✓. *Note:* live style-swap repaint lags a few seconds (cached-style `load` timing in the inherited `OpenFreeMapLayerWrapper` retire logic); a fresh page load renders the correct style immediately.

**Attribution** — "Leaflet | OpenFreeMap © OpenMapTiles Data from OpenStreetMap", visible bottom-right on the full map; suppressed on the decorative Home peek (as designed) ✓.

**Console/network** — no map/CSP/tile/maplibre errors. Only: (a) a *stale* "Supabase env vars missing" from the very first pre-`.env` load (this session then loaded 13 flags fine), and (b) service-worker registration blocked by the Browser-pane sandbox (`sw.js` serves 200 and its content is guard-tested; production/Vercel registers it normally).

**Mobile (~375px)** — Home map peek renders OpenFreeMap Positron (roads, "MIDTOWN", route 33, water) ✓. Deeper mobile interaction (full-map open / marker tap / pinch) = **TOOLING-UNPROVEN** — Browser-pane clicks hang in mobile emulation; not a product failure.

## 10. Privacy

No provider credential exists (OpenFreeMap needs none). Provider requests carry only
normal browser/network metadata + viewport-derived tile geography. No Supabase user id,
Flagstone identity, email, report owner/description, or auth token is sent to the provider.
`sw.js` comment documents this explicitly.

## 11. Governance

Main untouched. No merge, no push, no deploy, no DB/Supabase mutation, no native iOS
change. One implementation commit + this QA receipt commit on the candidate branch only.

---

*Visual evidence captured live in the Browser pane during this session (light basemap,
dark basemap, opaque marker callout, mobile peek). Reproduce locally:*
`set -a; . ./.env; set +a; npx expo export --platform web --clear` *then serve `dist/`.*
