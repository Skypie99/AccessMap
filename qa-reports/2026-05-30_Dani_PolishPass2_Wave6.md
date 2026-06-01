# Dani — Wave 6 Design Polish Pass 2

**Date:** 2026-05-30
**Branch:** `design/wave6-polish-pass2` (commit bb6829a)
**TypeScript:** ✅ 0 errors (`tsc --noEmit`)
**Mode:** ACTIVE — code changes committed
**model_tier:** sonnet

---

## Loop Health Metrics

```
coherence_score:        HIGH — all changes traceable to token system + QA findings
state_consistency:      CONSISTENT — no conflicts with prior Dani pass (Pass 1 = component build; Pass 2 = hardening)
duplicate_work_detected: NONE — no cross-agent overlap detected
drift_risk:             LOW — wave 6 components are newly added; no pre-existing callsite regressions
```

---

## Scope

Second-pass design audit of all Wave 6 new components: `RankBadge`, `CommentBubble`, `RealtimePulse`, `LeaderboardScreen`. Read Steve's 2026-05-29 Wave6SecurityPreview and all 2026-05-30 qa-reports. No Alex report for today found; Alex's 2026-05-29 Wave6 A11y Innovation report reviewed.

---

## 1. QA Reports Scanned for Design Findings

| Report | Design-Relevant Findings |
|---|---|
| `2026-05-29_Steve_Wave6SecurityPreview.md` | No design issues. Security concerns about `verified_count` on leaderboard — noted below. |
| `2026-05-29_Alex_Wave6A11yInnovation.md` | No design defects — a11y additions are already implemented correctly. |
| `2026-05-30_Steve_SecurityHardening.md` | No design issues (plist keys + SQL rate limit only). |
| `2026-05-30_Steve_IncidentResponse.md` | No design issues. |

---

## 2. Token Audit — Wave 6 Components

### 2a. RankBadge.tsx

| Finding | Severity | Status |
|---|---|---|
| `fg: '#222'` hardcoded for gold variant | VIOLATION | ✅ FIXED → `color.textOnAccent` |
| `fg: color.textSubtle` on `color.border` = 2.2:1 contrast (WCAG FAIL) | BLOCKER | ✅ FIXED → `color.textMuted` (4.64:1, AA pass) |

**New token added:** `textOnAccent: '#222'` to both `src/theme.ts` (light palette) and `src/theme/ThemeContext.tsx` (dark palette). Rationale: `accentOrange` is `#f1a520` in BOTH palettes — it never changes between modes. Dark text (6.3:1) is always correct on amber regardless of system color scheme. Using `color.textStrong` would yield light text (`#f5f5f5`) on amber in dark mode — contrast ≈ 2.3:1, WCAG FAIL.

**Default rank badge contrast fix** is a silent WCAG 2.2 AA failure that existed since the first build. `#999` on `#e5e5e5` = 2.2:1. Fixed to `#666` on `#e5e5e5` = 4.64:1.

**Clean:** spacing uses `radius.sm`, `spacing.xs`; font uses `font.size.xs`, `font.weight.bold`. No other violations.

### 2b. CommentBubble.tsx

✅ **CLEAN** — all values use tokens (`useColor()`, `spacing.*`, `font.*`, `radius.*`). No hardcoded literals. Dark mode: both `isOwn` and `isOther` paths use dynamic `color.*` tokens that correctly invert.

### 2c. RealtimePulse.tsx

✅ **CLEAN** — `DOT_SIZE = 10` is a structural constant (this component's only job), not a spacing token. `useColor()` throughout. `useReducedMotion()` correctly gating animation. No violations.

### 2d. LeaderboardScreen.tsx

| Finding | Status |
|---|---|
| `spacing` not imported — all spacing values hardcoded | ✅ FIXED — import added |
| 12 hardcoded spacing values with exact token equivalents | ✅ FIXED (see table below) |
| 2 hardcoded font sizes with token equivalents | ✅ FIXED |
| `hitSlop={8}` → `hitSlop={spacing.sm}` | ✅ FIXED |
| Loading state: `ActivityIndicator` only, no skeleton | ✅ FIXED — 6-row skeleton added |
| Error state: raw `loadError` text shown directly | ✅ FIXED — warm copy + hint subtext |
| Empty state: text-only with no visual anchor | ✅ FIXED — 🏆 icon + two-line copy |
| Dead code: `LeaderboardRow` extracted by linter but not used | ✅ FIXED — `renderItem` now delegates to `LeaderboardRow` memo |

**Spacing replacements applied:**

| Old value | Token | New value |
|---|---|---|
| `24` (card paddingBottom) | `spacing.xxl` | 24 |
| `20` (headerRow, subtitle, row, stateWrap, retryBtn, footer paddingHorizontal) | `spacing.xl` | 20 |
| `20` (headerRow paddingTop) | `spacing.xl` | 20 |
| `4` (headerRow paddingBottom) | `spacing.tight` | 4 |
| `12` (subtitle paddingBottom) | `spacing.md` | 12 |
| `16` (retryBtn marginTop) | `spacing.lg` | 16 |
| `6` (youBadge, verifiedBadge paddingHorizontal) | `spacing.xs` | 6 |
| `8` (hitSlop) | `spacing.sm` | 8 |

**Font size replacements:**

| Old value | Token | New value |
|---|---|---|
| `14` (closeBtnText fontSize) | `font.size.base` | 14 |
| `11` (youBadge, verifiedBadge fontSize) | `font.size.caption` | 11 |

**Intentional off-grid values (documented, left as literals):**

| Value | Location | Reason |
|---|---|---|
| `10` | row paddingVertical, gap; retryBtn paddingVertical | Between sm(8) and md(12) — list density choice; spacing system is 4pt grid |
| `5` | nameWrap gap | Compact badge gap between items; between tight(4) and xs(6) |
| `2` | youBadge/verifiedBadge paddingVertical | Sub-tight pill height; pill design requires less vertical room than text |
| `14` | footer paddingVertical | Between md(12) and lg(16) — intentional comfort padding for footer bar |
| `40` | stateWrap paddingVertical, spinner marginVertical | Generous whitespace for empty/error state centering |
| `36` | closeBtn width/height | Touch target larger than any radius token; structural |
| `54` | row minHeight | List row minimum height; structural |
| `60` | points minWidth | Points column alignment; structural |

---

## 3. Dark Mode Verification

| Component | Light ✓ | Dark ✓ | Notes |
|---|---|---|---|
| RankBadge gold | ✅ | ✅ | `textOnAccent` fixed (#222 on amber, both modes) |
| RankBadge silver | ✅ | ✅ | surfaceNeutral/textMuted — both have correct dark counterparts |
| RankBadge bronze | ✅ | ✅ | errorBg/errorFg — dark palette: #3b0f0f/#fca5a5, checked |
| RankBadge default | ✅ | ✅ | border/textMuted — dark: #333/#aaa = 5.2:1 ✓ |
| CommentBubble isOwn | ✅ | ✅ | brand/textOnBrand both invariant |
| CommentBubble isOther | ✅ | ✅ | surfaceNeutral/text correct in dark |
| RealtimePulse | ✅ | ✅ | success/textSubtle — both have dark equivalents |
| LeaderboardScreen | ✅ | ✅ | All makeStyles paths use useColor() via color arg |
| SkeletonRow | ✅ | ✅ | surfaceNeutral placeholder — dark: #2a2a2a, visually reads correctly |

---

## 4. Micro-Detail Pass

### LeaderboardScreen

| Check | Before | After |
|---|---|---|
| Loading state | `<ActivityIndicator>` centered in empty space | 6 skeleton rows matching live row dimensions — avatar + name + points placeholder bars |
| Error state | Raw `errorMessage(e)` text, generic "Retry" | "Couldn't load the leaderboard." (primary) + raw error as `stateHint` (secondary, subtle) + "Try again" button |
| Empty state | "No contributors yet. Be the first!" (text only) | 🏆 icon → "No contributors yet." → "Be the first to report and verify flags!" (two distinct text weights) |
| Transitions | Instant swap | Skeleton provides visual continuity from load → data |

### CommentBubble — already polished
- Skeleton pattern not needed (no separate loading state in current implementation — comments are loaded as part of FlagDetailModal)
- Error state not applicable — bubbles are rendered from already-loaded data

### RankBadge — no state complexity
- Pure display component, no loading/error/empty states needed

### RealtimePulse — no state complexity
- Binary connected/disconnected with pulse animation; `useReducedMotion` already wired

---

## 5. Security Note (Dani → Steve)

Steve's 2026-05-29 Wave6SecurityPreview flagged that `verified_count` on the leaderboard creates a profiling risk (disability context + location pattern inference). The current `LeaderboardScreen` exposes `verified_count`. This is a **Steve/Jordan domain decision**, not design. Flagging here so it surfaces to the right roles. Design has no objection to removing it if Steve/Jordan block it — the Leaderboard design is complete without it.

**Design impact if removed:** `verifiedBadge` style becomes dead code; remove it from makeStyles and the JSX condition at the same time.

---

## Design Compiler — L1 Tokenization Gate

| Layer | Check | Result |
|---|---|---|
| L1 Tokenization | Token Drift Detector — 6 violation classes | ✅ **0 violations** after fixes. All off-grid values documented. |
| L2 A11y Parity | Handled by Alex's Wave 6 pass | N/A — no new a11y violations introduced |
| L3 Consistency | Component Cohesion | ✅ All 4 new components follow established patterns |
| L4 Visual Entropy | RankBadge 4 variants all distinct + accessible | ✅ PASS |
| L5 Luxury UI | Skeleton loading, warm copy, icon empty state | ✅ PASS (polish level raised from baseline) |
| L6 Regression | No existing token changed; `textOnAccent` additive | ✅ No regression |
| L7 Decision | All L1–L6 PASS | **COMMIT** |

---

## Definition of Done

- [x] typecheck PASS — 0 errors
- [x] UI tokens + scorecard PASS — 0 violations; all off-grid values documented
- [x] acceptance criteria PASS — all Wave 6 components token-compliant + dark mode verified
- [x] rollback PASS — cherry-pick is reversible (`git revert bb6829a`)
- [x] reviewable PASS — diff-only changes; `textOnAccent` is additive
- [x] no duplicate work PASS — Pass 1 (build) vs Pass 2 (hardening) are distinct passes
- [x] no premature abstraction PASS — `textOnAccent` has immediate callers (RankBadge); `SkeletonRow` scoped to file
- [x] minimally sufficient PASS — only Wave 6 components touched; no drive-by refactors

---

*Dani — Design | 2026-05-30 | branch: design/wave6-polish-pass2*
