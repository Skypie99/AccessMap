# BENCH-1 — House Style & Hygiene · Verification Evidence

**Branch:** `bench/1-housestyle` (6 stacked commits off `main` @ `01f7392`) · **STOPPED on branch — not merged, not pushed, not built.**
**Model:** Opus 4.8, max effort. No arbiter (bench/polish tier).
**Members:** B2 (emoji → Lucide), B3 (Wayfinder mark), B11 (hygiene sweep).
**Date:** 2026-07-06

---

## Gate status (all green, held at every commit)

| Gate | Baseline (fresh branch) | Final (HEAD `9e7f251`) |
|---|---|---|
| `tsc --noEmit` | 0 errors | **0 errors** |
| `npm run lint` | 0 errors / 77 warnings | **0 errors / 77 warnings** (no new) |
| `jest` | 1805 pass / 0 fail / 84 todo | **1804 pass / 0 fail / 84 todo** |

The −1 test is deliberate: B2-ii removed the now-obsolete `every template has a non-empty glyph` assertion (the field no longer exists). One pre-existing `/ago$/` date-fixture flake was observed once mid-run and was green on every re-run — it is memory-documented, and every B-item diff is causally unrelated to it (no date/list/timer surface).

**Diffstat vs main:** 16 files, **+90 / −119** (net-negative — a hygiene pass should remove more than it adds).

---

## B2-i — Retire the decorative UI emoji for Lucide (L2-9 · §10) — CLOSED

L2-9 named 7 sites; **verify-first found 8** (an identical `🔍` at AddressSearchModal no-matches the stale audit missed). All swapped to house-style Lucide line icons (2px stroke, theme-token color, decorative):

| Site | Was | Now |
|---|---|---|
| FeedbackModal category chips | 🐛💡❤️💬 | `Bug`/`Lightbulb`/`Heart`/`MessageCircle` (shared name-map) |
| MyFeedbackModal rows | 🐛💡❤️💬 | same map |
| MyFeedbackModal empty ×2 | 🔍 / 💬 | `Search` / `MessageCircle` |
| AddressSearchModal ×3 | 🕘 / ⚠️ / 🔍 | `Clock` / `AlertTriangle` / `Search` |
| FlagDetailModal comments-empty | 💬 | `MessageCircle` |

- Shared map **`src/components/feedbackCategoryIcons.ts`** (new) — kept OUT of `lib/feedback.ts` because importing `lucide-react-native` there pulled `react-native-svg` into the mailto-logic unit test and broke it (real constraint the plan didn't foresee; the relocation is the fix). Mirrors DESIGN.md §10's "achievements use Lucide via a name map."
- Now-orphaned text-icon styles removed (`categoryChipGlyph`, `categoryGlyph`, `emptyIcon`×2, `errorIcon`, `recentGlyph`) — B2 leaves no new dead styles.
- **`web-verified`:** the Feedback modal renders the four Lucide line icons, tinting white-on-blue when a chip is selected (screenshot in-session). The a11y-tree snapshot of the app shows **zero emoji `StaticText` nodes** anywhere.

## B2-ii — ReportFlagModal template chips → CategoryIcon (L2-9 fold-in) — CLOSED

Sky-approved fold-in of the verify-first discovery. The template chips rendered per-template glyphs `▦↥⛔🚗🔊⛰` at `ReportFlagModal.tsx:597` — a §10 violation L2-9 never enumerated.
- Retired at the source: removed the `glyph` field from `ReportTemplate` + all 7 templates; the chip now renders `<CategoryIcon category={t.category} decorative />` (wears the bespoke house icon set — PROTECT-16). Icon tints with the active state like the label.
- **PROTECT-3 held:** change is confined to the glyph→icon *inside* the chip — the sticky footer, the five severity buttons, and the chip's 44pt target/label/role are untouched.
- **`blocked_path` collision** (⛔ construction / 🚗 parked share the category) is resolved by design: both render the category glyph, disambiguated by their labels — correct for a category-icon system. Per-template distinction is a flagged follow-up, **not** self-resolved.
- Test updated: `reportTemplates.test.ts` glyph assertions removed; the existing `category ∈ CATEGORY_ORDER` checks already guarantee a renderable CategoryIcon.
- **`code-inferred`** (typecheck + grep clean; the report form was not reached in the web session — it needs pin-placement interaction). Native chip render = `NEEDS-SKY-DEVICE`.

## B3 — Wear the Wayfinder mark on the 3 intro surfaces (L8-8 · PROTECT-16) — CLOSED

Retired the 3 stock identity stand-ins for `LogoMark` (per-slide illustrative icons Map/Bell/Sparkles/Target/Star left alone):
- **OnboardingCards** slide 1: Lucide `Compass` → `<LogoMark variant="mono" tint={accent} size={60}>` via a `brandMark` card flag. `code-inferred` (onboarding was already dismissed in the web session — resetting first-launch state is `NEEDS-SKY-DEVICE`).
- **OnboardingModal** slide 1: Lucide `MapPin` → `<LogoMark variant="mono" tint={brand} size={60}>`. Same tag.
- **HamburgerDrawer** header: placeholder "A" tile → `<LogoMark variant="white" size={24}>` inside the existing blue tile (the striding figure knocks out to show the tile blue). The drawer is native-oriented and **did not render in the Chromium web preview** → `NEEDS-SKY-DEVICE`.
- Dead `logoMiniText` style removed. `LogoMark` untouched.

## B11-A — Delete dead resurrection-trap styles + strip iconText ink (L2-12) — CLOSED

Re-proved orphaned (`styles.<key>` = 0) immediately before deleting. Removed 6: `filterChevron`, `emptyCardIcon` (MapScreen), `searchClearText` (TasksScreen), `rowChevron` (SettingsScreen), `myReportsChevron`, `aboutChevron` (ProfileScreen). Stripped only the always-overridden `color: color.brand` from `iconText` (style kept — it's used at MapScreen:1518, color overridden at rest/active). **`web-verified`:** the "1+" severity-quick button (uses `iconText`) renders correctly on the map toolbar. **Grep-clean** confirmed post-delete.

## B11-B — Adopt ctaFill at the 2 white-on-brand stragglers (L2-13) — CLOSED

`emptyCardBtn` (empty-filters "Reset all") and `nameBtnSave` (save-filter prompt): `backgroundColor: color.brand` → `color.ctaFill` (mode-independent; removes the latent dark-mode 3.42:1 fragility). List FAB's brand ink (Sky's ratified F4) untouched. **`web-verified`:** the filter panel's "Save current filter" button renders the ctaFill blue.

## B11-C — Bump on-glass 400 text to ≥500 (L2-10 · GLASS §2) — CLOSED (feel = NEEDS-SKY-DEVICE)

`variant="body"` → `"bodyMedium"` (PublicSans_500Medium, uncapped → DT-safe) at 6 on-glass sites: `savedEmptyText` + `statusHint` ×4 (MapScreen filter panel — verify-first found the 4th usage the census listed but exploration missed), and `emptyBody` (TasksScreen row-glass empty card). **Excluded, documented:** the locating banner's `bannerLocatingText` rides a 0.82-floor **legacy** pane the Deep-Field law doesn't formally bind — left at `body`.
- **`web-verified`:** `savedEmptyText` ("No saved filters yet…") renders legibly on the glass filter panel at the bumped weight.
- **★ `NEEDS-SKY-DEVICE` (D9):** the mechanical weight bump is code-verified; whether 500 actually *un-hazes* against the moving map is a device-eyes judgment — flagged, not claimed.

---

## PROTECT-list check — no regressions

GlassSurface.tsx untouched · ReportFlagModal sheet architecture (footer + 5 severity buttons) untouched · CategoryIcon set intact (now worn *more*) · **severity grammar intact** (`web-verified` — the Nearby list renders the numbered amber→red discs + word + status + freshness on every row) · Wayfinder mark / ctaFill mode-independence extended, never weakened.

## Flagged for Sky (out-of-scope discoveries — NOT changed here)

1. **`flags.ts:1107 CATEGORY_ICONS`** — a dead exported Unicode-glyph record (no non-test refs). Outside L2-12's named list + test-coupled; recommend deletion in a follow-up.
2. **`SearchInputRow.tsx:119 searchClearText`** — a *second* dead style (0 usages), same name as the TasksScreen one L2-12 named but a different file the finding didn't list. Plain dead style (no banned ink). Flagged, not deleted (scope discipline).
3. **`blocked_path` per-template distinction** — if the shared category icon on the two blocked_path chips reads too-samey on device, a follow-up can introduce distinct per-template Lucide icons (candidates for Sky's eye).

## Honest notes

- **Web console (dev-only):** decorative Lucide icons passing `accessibilityElementsHidden` log a react-native-web "unrecognized DOM attribute" warning on the SVG. This is a **pre-existing class** (the sibling `ChevronRight` in AddressSearchModal already does it) — kept for in-file consistency + native correctness; it is stripped in production and does not affect native (the primary target). Alongside pre-existing react-leaflet `onCreated`/`onChanged`/`onViewOnMap` DOM-prop warnings. None are functional errors.
- **Preview is Chromium-only** — cannot vouch for Safari/WebKit or native. Native marker/callout, the drawer mark, onboarding slide-1 marks, and the D9 haze feel are all `NEEDS-SKY-DEVICE`.

## CONFIRM
B2-i ✓ · B2-ii ✓ · B3 ✓ · B11-A ✓ · B11-B ✓ · B11-C ✓ (feel flagged) · 3 discoveries flagged for Sky · nothing dropped. **STOPPED on `bench/1-housestyle` — Sky merges; one build carries the tier.**
