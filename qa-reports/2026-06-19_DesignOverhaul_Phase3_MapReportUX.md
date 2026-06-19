# AccessMap Overhaul — Phase 3: Core Map & Report-a-Flag UX

**Date:** 2026-06-19
**Branch:** `overhaul/phase3-map-report-ux` (stacked on `overhaul/phase2-design-system`)
**Scope:** PRESENTATION / a11y / copy / static content. Zero data/auth/privacy/EXIF/RLS/RPC changes.
**Merge:** Sky-only. First wave = 4 commits. Built from a 4-lens Opus recon (`qa-reports`-adjacent map).

---

## Shipped — first wave (4 commits)

| Commit | Change | Gate |
|---|---|---|
| `ebc2de4` | **Hero 2 — the report-a-flag privacy moment.** A1: a calm, always-visible "Location is removed from your photos automatically" line (lock icon) under the Photo label, *before* any pick/failure. A2: on success, announce "Report filed. Location data was removed from your photos." — a resolved `uploadFlagPhoto` *proves* the fail-closed strip passed, so this reads the already-resolved result. A4: reframed the anon photo gate from paywall-tone to "Your anonymous report still counts. Sign in to add a photo…" | typecheck + 36/36 ReportFlagModal tests |
| `8c82e2b` | **Dead heatmap label** (`{heatmapEnabled ? 'Heat map' : 'Heat map'}` → "Heat map · On/Off") + **dangling-pronoun empty state** ("...Try broadening them" → "No flags match your active filters. Try clearing one, or reset them all.") in both the live announcement and the card label. | typecheck + MapScreen suites |
| `9c46d07` | **Native map callout brand fonts** — title/meta/description swapped from raw `<Text>` (system font) to `<AppText>`, matching the rest of the app. | typecheck + 0 lint errors |
| `8864f56` | **ResourcesScreen seeded** — the "Coming soon" placeholder replaced with 6 curated, evergreen physical-accessibility resource cards (report-to-city, advocacy, accessibility maps, route planners, know-your-rights, support). URL-light: plain info cards until a link is supplied (no dead links). | typecheck + lint clean |

## 🔒 Fence proof
Phase 3 touched `ReportFlagModal.tsx`, `MapScreen.tsx`, `PlatformMap.tsx`, `ResourcesScreen.tsx` (+ one test). **Zero changes to `flags.ts`/`supabase`/the EXIF engine.** The privacy edits were verified to add presentation *around* the fenced calls — `uploadFlagPhoto` (L347), `createFlag` (L352), `createAnonFlag` (L312) are byte-identical.

## ⚠ NEEDS-SKY-VISUAL / decisions (fold into the EAS / TestFlight build)
1. **Privacy copy** — approve/tweak the wording: the inline line "Location is removed from your photos automatically." and the success announcement "Report filed. Location data was removed from your photos." (Sky's call on tone — chosen "calm, clearly visible".)
2. **ResourcesScreen links** — `TODO(Sky)`: supply the specific URLs you want each of the 6 cards to point at (cards stay as info cards until then).
3. The native callout font swap + map-label fixes — confirm on device.

## Remaining Phase 3 — second wave + flags (not yet built)
**Do-next (presentation, mostly safe):**
- **A3** — in-flow submit-success beat before the modal closes (visual; needs feel/timing on device).
- **A5** — severity selector polish (clearer selected state / escalation), all labels/colors from the unified scale.
- **C2 / C3** — native callout: SeverityBadge + StatusBadge instead of plain "Severity n • status"; add "Anonymous" provenance (web popup already has it).
- **C4** — HeatmapLegend spoken color names → align to `SEVERITY_COLOR_NAMES`.
- **ET-06a** — make the web-guest San Francisco fallback legible ("Showing San Francisco — search or use your location").

**Subjective / device-sensitive (recommend Sky's eye first):**
- **ET-03** — action bar reads as a cramped 8-button "dev toolbar" (drop hairline dividers / regroup).
- **ET-04** — overlay banners can stack → single top-notice precedence slot.
- **ET-05** — Report FAB disabled-until-GPS clarity.

**Flagged for Sky (touch the fence or need a decision):**
- **ET-06b** — web "Use my location" (browser geolocation, user-initiated, no auto-prompt). Brushes the location-permission concern → **FLAG-FOR-SKY**.
- **C5** — heat-badge white-on-orange contrast at sev 3/4 — **device/contrast-tool check**, don't change blindly.
- **C6** — native pins are plain OS teardrops vs the bespoke web pins — a real parity gap, but a rewrite needs a `tracksViewChanges` perf plan + device testing → **flag, don't rewrite**.

## Review / merge / rollback
- **Review:** `git diff overhaul/phase2-design-system..overhaul/phase3-map-report-ux`.
- **Merge:** Sky-only, after Phase 2. Run full `npm test` first.
- **Rollback:** per-commit revert; all presentation/content — fully reversible.
