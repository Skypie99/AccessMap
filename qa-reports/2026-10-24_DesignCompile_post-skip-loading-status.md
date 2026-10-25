# Design Compile Result — post-skip-loading-status — 2026-10-24

**Feature:** words for the web wait after Skip (one loading frame, a delayed polite status, one arrival
announcement) and an accurate failed-download screen.
**Branch:** `optionb-accessible-loading` (local only; `402c817d` + `95d66818`)
**DONE-request:** `qa-reports/2026-10-24_OptionB_Accessible_Loading_QA.md` (Sky-started session, not a Shamus cycle)
**Compiler version:** Const. Art. 2.4 (v1.11)

> Scope note: Layers 4 and 5 are Dani's manual scores. The numbers below are the author's **provisional**
> self-scores with justifications, offered so Dani can confirm or overrule them; they are not Dani's scores.

## 1. COMPILER RESULT
> **ESCALATE**

## 2. LAYER BREAKDOWN
| Layer | Status | Score | Notes |
|---|---|---|---|
| 1. Tokenization | PASS | — | Added UI values are tokens only: `font.size.md`, `color.text`, AppText `bodyMedium`; the frame reuses `ScreenFallback` (`spacing.xxl`, `spacing.sm`, `radius.*`) and the failure reuses `ErrorFallback` unchanged. A scan of the added lines finds no raw colour or size. `NAVIGATOR_STATUS_DELAY_MS = 1000` is a wait threshold, not a motion value (same pattern as the existing `NAVIGATOR_RETRY_DELAY_MS`). |
| 2. Accessibility Parity | PASS (automated) · real AT DEFERRED | — | 27 applicable cells PASS on automated evidence (matrix below); screen-reader speech, VoiceOver and Safari acceptance are **DEFERRED by the owner**, not passed. |
| 3. Component Consistency | PASS | Cohesion 18/20 (provisional) | No new component or variant: `ScreenFallback` gains an optional `children` slot, `ErrorFallback` gains optional `title`/`body`. Component debt: 0. |
| 4. Visual Entropy | PASS (provisional) | 90/100 | One text line in the slot the destination header's subtitle uses; nothing moves when it appears. |
| 5. Luxury UI Score | PASS (provisional) | 91/100 | See scoring below. |
| 6. Regression Safety | PASS | — | Adjacent surfaces unchanged: lazy Settings/Admin fallback renders exactly as before (no children); crash screen copy unchanged (SW-31 tests pass); welcome and Home untouched. |
| 7. Compile Decision | ESCALATE | — | Pillar-touching change (accessibility); automated layers pass; Dani's scoring and real-AT verification are outstanding. |

### Layer 2 — parity matrix (automated; Chromium 151 + WebKit 26.5 via Playwright 1.62.1)
| Row \ Criterion | Focus | Contrast | Keyboard | Screen reader (semantics, automated) | Motion reduction | Reflow / text size | Touch target |
|---|---|---|---|---|---|---|---|
| Loading frame, light | PASS — no focus move, no trap | PASS — status 9.83:1 min vs rendered stage | PASS — Tab reaches only "Skip to content" | PASS — `role=status`, polite, atomic, text set after 1 s | PASS — no animation added | PASS — one line at 320 CSS px (1.4.10) | N/A (no control) |
| Loading frame, dark | PASS | PASS — 11.68:1 min | PASS | PASS | PASS | PASS | N/A |
| Reduced motion | PASS | PASS | PASS | PASS — announcement independent of motion | PASS — skeleton static at 0.5, no running animations | — | N/A |
| Failure screen | PASS — "Try again" reachable (Chromium 2 Tabs incl. skip link; WebKit 1) and activates with Enter | PASS — unchanged ErrorFallback tokens; axe: no contrast violation | PASS | PASS — `role=alert`, network-specific copy | PASS — no animation | PASS — wraps cleanly at 320 CSS px | PASS — button min height 44 |
| Arrival | PASS — focus left where the visitor put it | — | PASS | PASS — one polite "Flagstone is open." only after an announced wait | — | — | — |

Screen reader column = DOM / accessibility-tree evidence (Playwright aria snapshots in both engines, Chromium's
native AX tree: `status`, `live=polite atomic=true`). What a real screen reader speaks, and when, is **not** proven.

### Layer 5 — Luxury UI (provisional self-score)
| Dimension | Score | Max | Justification |
|---|---|---|---|
| Spacing Harmony | 22 | 25 | Status sits in the header column's existing `spacing.sm` gap, on the bars' `spacing.xxl` edge; at desktop width the whole frame stays top-left (inherited from ScreenFallback). |
| Typography Discipline | 17 | 20 | One line at `font.size.md`; the welcome's already-loaded medium face is used so the line cannot swap fonts mid-read — weight 500 against the Home subtitle's 400 is the deliberate cost. |
| Color System Integrity | 19 | 20 | `color.text`; muted ink was tried first and measured 4.47:1 in the pool, so it was replaced (`95d66818`). |
| Motion Restraint | 15 | 15 | Nothing added moves; the text appears without a transition. |
| Component Cohesion | 18 | 20 | Reuse only (ScreenFallback slot, ErrorFallback copy). |
| **Total** | **91** | 100 | premium tier, provisional |

### Layer 4 — Visual Entropy (provisional self-score)
Spacing Rhythm 22/25 · Typography Hierarchy 17/20 (the status is the strongest text on an otherwise empty
frame, by design) · Layout Predictability 19/20 (no shift when the line appears) · Motion Restraint 15/15 ·
Density Balance 17/20 → **90/100**.

## 3. VIOLATIONS
- None introduced. Found and fixed during the session: **Layer 2 — Contrast:** the status in `color.textMuted`
  measured 4.47:1 at its worst background pixel in light mode (`src/navigation/AppNavigator.web.tsx`, status line),
  below 4.5:1 → `95d66818` switches to `color.text` (9.83:1).
- Pre-existing, not introduced (reported for Alex, present on `main` 6195bf0 too): welcome card scroller
  `scrollable-region-focusable` (serious); Home "Open full map" button `label-content-name-mismatch` (serious,
  accessible name "Open the full map"); page-level `landmark-one-main`, `page-has-heading-one`, `region` (moderate);
  the ScreenStage SVG is exposed as an unnamed `img` on web because react-native-web ignores `accessible={false}`.

## 4. FIXES PROPOSED
| Layer | Role | Branch | Commit SHA | What it fixes |
|---|---|---|---|---|
| 2 | (Sky session, a11y) | optionb-accessible-loading | 402c817 | Words for the post-Skip wait; failed download says so; one loading frame |
| 2 | (Sky session, a11y) | optionb-accessible-loading | 95d6681 | Status contrast 4.47:1 → 9.83:1 |

## 5. ESCALATIONS
- **Dani:** confirm or overrule the provisional Layer 4/5 scores; approve the copy "Loading Flagstone…",
  "Flagstone is open.", "Couldn't load Flagstone / Check your connection and try again. If it keeps happening,
  reload the page."; note the deliberate bodyMedium weight.
- **Alex:** real assistive-technology verification of the status, arrival and alert behaviour (VoiceOver + Safari,
  iOS) — the owner DEFERRED manual testing for this session; the pre-existing findings in §3 need triage.
- **Morgan:** pillar-touching (Const. Art. 7.5) — surface both items to Sky with the PR.

## 6. FINAL DECISION
> **Decision: ESCALATE**
>
> Layers 1, 3 and 6 pass on evidence and Layer 2 passes every automated cell, after one contrast defect was found
> and fixed in-session. The decision is ESCALATE rather than COMMIT because this change exists for the
> accessibility pillar, real screen-reader behaviour is unverified by the owner's choice, and Layers 4–5 still need
> Dani's own scores. Nothing here blocks a draft PR; it blocks treating the UI as DONE.
