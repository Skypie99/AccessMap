# FlagCard Redesign — PASS 3: BUILD

**Date:** 2026-06-28 · **Component:** the inline `FlagCard` in `src/screens/TasksScreen.tsx` · **Pass:** 3 of N — BUILD (the locked direction) · **Branch:** `overhaul/flagcard-redesign` (off `main` `8a7cce5`) · **Repo:** `~/AccessMap`

> **What this is:** the third pass of the FlagCard redesign recipe. Passes 1–2 diagnosed and chose a direction; this pass **builds** it to the locked 8-point contract, on a branch, in three committed stages, gate-green, with a one-glance before→after. **Nothing merged or pushed — Sky reviews the branch + does the device check, then SHE merges.** Presentation-only: the action handlers (`onSetStatus` / `onShowDetails`) and all data/auth/engine behaviour are untouched.

---

## What was built (3 staged commits)

| Commit | Stage | Change |
|---|---|---|
| `438cddf` | **A — action row** | Replaced four content-sized `flexWrap` pills with the proven equal-share flex (`flexGrow`/`flexBasis:0`, the `bulkBtn` pattern). One descriptor list + render helper drives a **tiered single row** (lead `flexGrow:1.5`, quiet equal-share rest) and a **deliberate 2-row stack** (lead full-width + sub-row), chosen by `compactActions = width < 375 \|\| fontScale >= 1.3` computed once in the parent. `hitSlop` on every button; Reject set apart. Added the missing Verify/Resolved/Reject `accessibilityHint`s. |
| `75a39b2` | **B — material + severity** | `card`: `shadow.e2` → `shadow.e1` + hairline `border` (Home's flat-list language); symmetric padding. Severity now leads the header as a legible **`SeverityBadge "3 · Moderate"`** (number + word + colour); removed the left accent stripe + the buried "Severity N" + the standalone category icon. `SeverityBadge` `sm` text bumped 10 → 11 (the legible floor `StatusBadge` already uses). |
| `27ba1a1` | **C — clamp + declutter** | Description `numberOfLines={2}` (full text in Details); meta drops "Severity N" and composes with `filter(Boolean).join(' · ')`; removed the italic hint line (both "tap to view on map" and the select-mode "tap to select/deselect"). |

**Result:** the common open+photo card is **6 elements** (severity badge · title · status · photo · 2-line description · meta) — down from the measured ~8–10 — with one clear primary and a row that can no longer wrap raggedly.

---

## ★ Contract conformance table (the 8 locked criteria)

| # | Contract point | How verified | Result |
|---|---|---|---|
| 1 | Decluttered, one clear primary + real hierarchy | Element count 6 (was ~8–10); only Verify filled, Resolved neutral, Reject/Details ghost — see before→after | **PASS** |
| 2 | Row fits 375pt AND reflows to 320pt AND ×1.6, never ragged | `compactActions` switch (`width<375 \|\| fontScale>=1.3`); equal-share flex (no `flexWrap`); flex math + reconstruction confirm 375 = one row, 360/320/×1.6 = deliberate 2-row stack. *(Real-device touch on the reflowed row = NEEDS-SKY-DEVICE.)* | **PASS** |
| 3 | ≥44×44 incl. width + spacing + `hitSlop`; Reject apart | `minHeight:44` every button; flex owns width (≥~63px even at 375); `gap: spacing.sm`; `hitSlop: spacing.xs`; Reject separated from Verify (Resolved between them in-row, Reject in the sub-row when stacked) | **PASS** |
| 4 | Severity legible (not colour-alone) + status badge | `SeverityBadge` renders **number + word + colour** ("3 · Moderate") at the 11pt legible floor; `StatusBadge` (dot + word) retained | **PASS** |
| 5 | Description 2-line clamp | `numberOfLines={2}` — caps the unbounded-growth case (a long note used to drive the card to ~1612px); `dynamicTypeGuard` green | **PASS** |
| 6 | Material = `e1` + hairline, never `e2` | `card` now `...shadow.e1` + `borderWidth:1` (was `...shadow.e2`); grep confirms no `e2` on the card. *(Live-blur GlassSurface deliberately NOT per-row — perf; it's the device-opt-in.)* | **PASS** |
| 7 | AA both themes; SR labels/roles/states preserved; 3 hints added | Reuses themed, AA-validated tokens in both palettes (before→after shows light + dark legible); card `checkbox` role + `checked`/`disabled` states + every button label preserved; added Verify/Resolved/Reject hints | **PASS** |
| 8 | Feels calm / editorial / expensive, not busy / shouting / lopsided | Before→after render shows the shift from the candy-pill slab to a restrained lifted card. *(Final on-device feel = NEEDS-SKY-DEVICE.)* | **PASS (web); device-confirm pending)** |

---

## Gate results

| Gate | Result |
|---|---|
| `npm run typecheck` | **0 errors** |
| `npm test` | **107 suites · 1722 passed** (+117 todo) — incl. both brittle guards (`dynamicTypeGuard`, `qaMergeConsolidation`) green; none needed editing |
| `npm run lint` | **0 errors** (87 pre-existing warnings in other files; `TasksScreen.tsx` + `SeverityBadge.tsx` clean — no new warnings) |
| `npx expo export --platform web` | **exit 0** — the real RN component (all changes) compiles + bundles for web cleanly (build-integrity proof) |
| **Fence** | `git diff main...HEAD --stat` = **only** `src/screens/TasksScreen.tsx` + `src/components/SeverityBadge.tsx`. No data/auth/EXIF/RLS/migration/RPC/points/location files. |

---

## Before → after

- **One-glance render:** shown inline in the session (today vs built, 375pt, + the action-row resilience strip).
- **Full standalone artifact:** [`assets/2026-06-28_flagcard/before-after.html`](assets/2026-06-28_flagcard/before-after.html) — token-faithful reconstruction from the **exact final RN StyleSheet values** (the same method as Discovery's baseline images at `assets/2026-06-26_flagcard/`), across the full stress matrix (375/360/320 + ×1.6) and edge states (verified · no-photo · select-mode · long-description clamp), both light + dark.

*(Web reconstruction = Chromium-faithful flexbox. Native iOS blur/feel, Safari/WebKit layout, VoiceOver order, and real scroll are device-only — see below.)*

---

## ★ Reusable recipe (the template for Pass 4 — other screens)

1. **Tiered equal-share action row.** Order actions `[lead, ...rest]`; single row = `lead { flexGrow:1.5, flexBasis:0, minWidth:0 }` + `rest { flexGrow:1, flexBasis:0, minWidth:0 }`; compact = `lead` full-width (`alignSelf:'stretch'`) + an equal-share sub-row. Drive it with one `compactActions = width < X || fontScale >= Y` from `useWindowDimensions()`, **computed in the parent** and passed down (one Dimensions subscription, not N). **Never** `flexWrap` content-sized pills; **never** put a hard `height:` on a `*Row/Text/Label` style (the `dynamicTypeGuard` scan).
2. **Restrained material.** Solid `surface` + hairline `border` + `shadow.e1` (perf-safe for list rows; AA-guaranteed; live blur is the device-opt-in, not a default).
3. **Legible severity.** `<SeverityBadge showLabel size="sm" />` (with the 10→11 legible floor) in the header; drop colour-only stripes.
4. **Bounded text.** `numberOfLines={2}` on free text; compose meta with `filter(Boolean).join(' · ')`.

---

## NEEDS-SKY-DEVICE checklist (Sky's phone)

- [ ] **Material feel** — is solid tint + hairline + `e1` right on real iOS, or does it want a live-blur `GlassSurface`? (Is blur worth it on the list wash, or muddy?)
- [ ] **★ Scroll smoothness** with the new card down a long list — the perf call (web shows no jank with the no-blur material; real device confirms).
- [ ] **Safari/WebKit** layout (web build is Chromium-only-verified).
- [ ] **VoiceOver / TalkBack** reading order + the new Verify/Resolved/Reject hints read correctly.
- [ ] **Real touch** — no mis-tap on the reflowed 2-row at narrow width / large type; confirm the 320pt + ×1.6 extreme (the longest label, "Resolved") stays comfortable.

---

## Decisions flagged for Sky (all reversible, mockup-driven)

1. **Dropped the left severity stripe** — the header `SeverityBadge` now carries severity (matches the locked mockup; avoids double-encoding).
2. **Dropped the standalone category icon** — the title text carries the category; this hits the ≤6-element target and matches the mockup. *(One line to add back if you want it.)*
3. **Removed the whole hint line** incl. the select-mode "tap to select" — selection is conveyed by the checkmark + the `checkbox` role/`checked` state.
4. **Material = solid + hairline + `e1`, no per-row live blur** — perf-safe for a scrolling list; the "restrained glass" feel is mostly the tint + lift, and live blur is the device-opt-in.
5. **Verified-state lead = Resolved** (`flexGrow:1.5`, neutral fill — *not* a brand primary), so one layout engine serves both states.
6. **Verify `flexGrow:1.5` (not 2)** — the RN translation of the mockup's "2"; leaves the longest secondary ("Resolved") room at 375pt without clipping (the mockup used a narrower system font).

---

*Built to the locked direction, gate-green, fence held, shown in one glance. Waiting on Sky's branch review + device check. She merges.*
