# SHIP-READY Phase 2 — HANDOFF (phase STOPPED on the branch)

Updated: 2026-07-26 · Branch **`shipready/2-blockers-dismissal`**, 19 commits off `main == origin/main == 512494a`
Plan: `~/.claude/plans/ship-ready-phase-2-snuggly-sutton.md` · Report: `07_PHASE2_REPORT.md` · Census: `06_dismissal_census_verified.md`
Provenance: Opus 5, ultracode max effort.

**Gate at the tip: tsc 0 · eslint 0 errors / 79 warnings · jest 167 suites / 2310 passed / 0 failed / 84 todo.**
Baseline was 158 / 2227 / 0. `src/components/ui/GlassSurface.tsx`: **0 changed lines**. No migration applied.

## Completed

| Commit | Item |
|---|---|
| `d327b7e` | **A1 · B-7** comments embed — prod REST **300 → 200**, verified |
| `9235e3b` | **B1 · G6** sheet-overflow ×5 — About X **−65 → 97**, Help **−53 → 97**, wrapper exactly 90% |
| `a2fc50c` | **A2 · B-5** `supportsTablet: false` |
| `0a6a38c` | **A3 · B-4** icon alpha — 1,003,245 opaque px, **0** changed RGB |
| `40cccf1` | **A4 · R-12** ship command — two faults, one unreported |
| `b7a8398` | **A5 · R-11** stale Sentry claim removed |
| `0b871cf` | **A6 · R-8a** privacy manifests B-α + B-β |
| `1e2d67d` | **A7 · R-8b** `expo-media-library` + its two dead jest mocks |
| `51041ec` | **A8 · B-2** privacy links ×3, PROTECT-11 held |
| `44a62e0` | **B2 · G9** Report mid-submit close guard |
| `ca9b1ce` | **B3 · G1a** `ui/Sheet` primitive + its first test file |
| `da972ae` | **B4 · G1b** drawer — one prop, 7 insertions / 0 deletions |
| `b653603` | **B5 · G1c** guarded + destructive surfaces |
| `7b6cd49` | **B6 · G1d** both onboarding surfaces |
| `6d51254` | **B7 · G1e + G2** MapScreen — AVM where there was none |
| `0a7a1bb` | **B8 · G1f** the remaining surfaces — 32/32 |
| `4f7ad5e` | **B9** the source-derived guard suite |
| `7343b0c` | **A9 · B-1a** W1 artifact banked + client half gated off |
| `bf2b36d` | **A10 · B-1b** hide list — Apple 1.2(c) mechanism |

## Current

Nothing in flight. The branch is complete as far as it goes and **stops here** — Sky merges, builds, submits.

## Remaining — read `07_PHASE2_REPORT.md §3` for the reasoning

1. **G5 focus-return hook + 4 adoptions — the one picked item not delivered.** Fully specced in the plan §B11.
   Generalise the `useDrawerTrigger`/`useTriggerHandle` **pair** *including* the `Platform.OS === 'web'` early
   return and try/catch; `restore` fires on `onDismiss`, not close-intent; ship `markHandoff` from day one.
   Adopt **Nearby → Report → FlagDetail → Legend** (Nearby first: the only web-verified failure; Legend last:
   zero behavioural coverage).
2. **G3 grabbers — arbiter FIRST, then a mockup gate, then code.** `ui/Sheet`'s pill is `color.borderStrong`,
   declared in **zero** of the 20 stacks manifests, ≈1.01–1.23 over chrome glass against a 3.0 floor. And
   03 §7.1 is wrong about Nearby: its header paints opaque `color.surface` over the fill, so Nearby has a
   **solid-chrome option the other two lack** — that is the genuine fork for Sky.
3. **SR-112 arbiter** — flag the PROTECT-16 collision (a dark-only `ctaFill` fixes SR-112 and regresses
   mode-independence) rather than resolving it in code.
4. **1.2(c) affordance** — the hide-list mechanism is built and tested; the visible control needs one string.
5. **Sky-side**: apply the SQL slate (then flip `DISPUTE_ENABLED`) · B-3 policy rewrite · B-6 reviewer creds ·
   the device list.

## ⚠ Carry this forward — it invalidates part of 03

**`onAccessibilityEscape` on `<Modal>` is a silent no-op.** RN 0.81.5 forwards an explicit allowlist to
`RCTModalHostView` (`Libraries/Modal/Modal.js:326-347`); the prop is not in it and typechecks only because
`ModalProps` spreads `ViewProps`. It works **on a View** (`RCTView.m:447`). Every handler in this phase rides
the containment node, and guard assertion **B2** fails if one is ever moved back onto a Modal tag.

Also: **rn-web drops the prop entirely**, along with `accessibilityViewIsModal`, and stubs
`setAccessibilityFocus` to an empty body — so the escape work has **zero web-observable delta** and its first
real proof is Sky's device pass.

## Next action (if resuming cold)

Read this file → `07_PHASE2_REPORT.md` → `06_dismissal_census_verified.md`. Verify `git log --oneline main..HEAD`
matches the table above, re-run the gate, then start at **G5** (item 1).
