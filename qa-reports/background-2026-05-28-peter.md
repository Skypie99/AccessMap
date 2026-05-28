# Peter — Background Performance Audit
**Date:** 2026-05-28 | **Mode:** BACKGROUND / AUDIT-ONLY
**Role:** Peter (Performance Engineer) | **model_tier:** sonnet
**Project:** AccessMap | **cycle_id:** background-2026-05-28-peter

---

## Status: AUDIT-ONLY (no changes — Const. 12.5)

---

## Findings

### 1. Pagination — RESOLVED ✅
- `flagsStore.tsx` imports `listFlagsPage`, `INITIAL_PAGE_SIZE`, `NEXT_PAGE_SIZE` from `./flags.ts`.
- The unbounded `listFlags` concern from prior audits has been addressed. Pagination is implemented.
- **No action needed.**

### 2. Marker clustering — OPEN (structural, not targetable in BACKGROUND)
- No clustering layer exists for the map at scale.
- **Impact at 100×:** Hundreds of individual markers on `PlatformMap` cause frame-rate degradation; the map becomes unusable above ~500 visible pins.
- **What's needed:** Clustering library (e.g. `react-native-map-clustering` for native, `leaflet.markercluster` for web). Architectural addition — out of scope for BACKGROUND mode.
- **Recommendation:** Queue for Shamus (feat branch) with Quinn spec when blocker queue clears.

### 3. Rendering pipeline — BASELINE DOCUMENTED
- `MapScreen.tsx` uses `useMemo` for all derived flag data.
- `flagsStore.tsx` uses React context with `useCallback` for stable references.
- No unguarded re-render triggers observed in the data path.
- **No action needed at current scale.**

---

## Scale Stress (10× / 100×)

| Concern | 10× (100 flags) | 100× (1000 flags) |
|---------|-----------------|-------------------|
| Pagination | ✅ Handled | ✅ Handled |
| Map markers (no clustering) | ⚠️ Noticeable lag | ❌ Unusable |
| Filter/sort computation | ✅ Negligible | ⚠️ ~10ms (still acceptable) |

---

## Decisions for Sky
None from Peter. Clustering is the only structural gap — surfaced for future sprint planning.
