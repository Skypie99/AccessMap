# BUILD REPORT — GSP-06 · Phase 2c
## The report form · Settings · Profile · empty, loading and error states

**Prompt:** `build-prompts/06_phase2c_report_settings_profile_empty.md`
**Branch:** `design/gsp-06-forms-2026-08-22`
**Base:** `1984c3e` (= local `main`; 9 commits ahead of `origin/main`)
**Prerequisite check:** prompts 01, 02 and 04 are all ancestors of the base, as are 03, 05 and 05b. Verified with `git log`, not assumed.
**Status:** complete. Fourteen commits — ten of build, four of evidence.
**STOP — Sky merges.**

---

## 1. Gates

| | baseline (measured on the base, before the first edit) | final |
|---|---|---|
| `npm run typecheck` | 0 errors | **0 errors** |
| `npx jest --ci -w 3` | 237 suites · 3469 passed · 32 todo · 0 failed | **241 suites · 3560 passed · 32 todo · 0 failed** |
| `npm run lint` | 0 errors · 82 warnings | **0 errors · 82 warnings** |

+4 suites, +91 tests. The lint warning count is unchanged: four were introduced
during the work (unused imports and styles left behind by adoptions) and all
four were cleaned up rather than absorbed into the baseline.

**Re-verified independently on 2026-08-22 at `ab8801f`, on a clean tree, not
copied from the run above:** `npx tsc --noEmit` 0 errors ·
`npx jest --ci -w 3` **241 suites · 3560 passed · 32 todo · 0 failed** (115s).
The numbers below reproduce exactly.

One flake seen and dismissed honestly: `ReportContentModal.test.tsx` failed once
under `-w 3` at 20.7s, passed alone in 4.3s and passed on the next full run.
Not touched by this branch.

---

## 2. Commits

| SHA | What |
|---|---|
| `3c844b0` | 6.1a the location line says a human thing; the coordinate moves behind Show/Copy |
| `d051323` | 6.1b no default severity; the inert Submit; the ask on the meaning line |
| `90f8b2c` | 6.1c the picker becomes the Legend's radio rows at >=1.5x |
| `09f1aff` | 6.1d Q6 — one string, seen and spoken |
| `b2df2b4` | 6.2 Settings on the Home list's grammar (+ Q15, Moderation, `size.row`) |
| `8e65fb1` | 6.3a the guest Profile gets something to say |
| `871b280` | 6.3b the signed-in Profile in tokens and in three cards |
| `06ade27` | 6.4 `EmptyState` + eight adoptions, scaled skeletons, C6 banners |
| `9858f67` | 6.5 D26 — `Linking.openSettings()` on a denial the app cannot re-ask |
| `41da985` | 6.6 device pass — four defects the gates could not see |
| `b36edb5` | 6.7 evidence — this report, the handoff, the ledger, the first captures |
| `0aaa5a1` | 6.8 `surfaceVariant` forked — the progress track was invisible in LIGHT (1.03:1), found on the signed-in walk |
| `ddb8f1d` | 6.9 evidence — the signed-in walk, its four captures, and what it changed |
| `ab8801f` | 6.10 Sky ratifies the 21 strings and upholds both reversals (ledger only) |

The ten build commits end at 6.6. Everything after is evidence, with one
exception: **6.8 is a source fix**, forced by what the signed-in walk showed.

**50 files, +3191 / −561** across the branch; of those, **32 are source or test
files** (+2601 / −561). The earlier figure in this table (31 files, +2581 / −560)
was measured at 6.6 and did not yet include 6.8's two-file token fork.

**Rollback (one line):**

```bash
git -C ~/AccessMap reset --hard 1984c3e
```

---

## 3. What landed, item by item

### 6.1 The report form (board 04)

- **Q17.** The sheet's second line read `at 49.88800, -119.49600` — an engineer's
  answer on the one screen where the user most needs to feel "yes, that is the
  place", and (X7) the least useful information on the sheet rendered at its
  most legible size. It says where you are in words now. Which words depends on
  which of the two answers the coordinate is, and the sheet could not tell:
  `MapScreen` hands it `dropLocation ?? location`. A new `locationSource` prop
  carries it (`'gps'` by default, so every existing caller is unchanged);
  MapScreen passes the same expression it already uses to choose the coordinate.
  The numbers are one tap away behind **Show**, with **Copy** beside them on
  FlagDetailModal's share/clipboard pattern. Both controls carry the 44pt box
  via `a11y.minTargetSize` and lead their accessible names with the visible word.
- **Q5.** `useState<FlagSeverity>(3)` became `useState<FlagSeverity | null>(null)`.
  Submit is inert until a disc is chosen, in the C5 disabled grammar;
  `blockedReason()` gained the case so the hint says which precondition is
  missing (location still wins when both are); the meaning line carries the ASK
  until a rating exists, in the same polite live region. `ReportDraft.severity`
  widened to `| null` so a draft handed across the sign-in swap can say "not
  answered yet" instead of restoring a 3 nobody chose. `reset()` clears it, so
  SW-52's cancel means cancel here too.
- **F4 / X7.** At >=1.5x the five-across picker becomes the Legend's rows
  (`SeverityDisc` 32 + word + meaning), announced as a radio group. The selected
  row keeps all three non-colour signals. The row's accessible name is
  byte-identical to the disc's — pinned by a test that reads one and compares
  the other.
- **Q6.** The visible submit word and its accessible name are one constant.
- The form `TypeBlock` (header 1.6) from Prompt 01 is untouched; the description
  field stays uncapped.
- **The lock banner keeps its em dash.** The prompt allows removing it only if
  Sky ratifies; it is logged in the ledger with the exact one-line change.

### 6.2 Settings (board 07)

Grouped cards (one per section, hairline seams, `overflow: hidden`), no leading
icons (I4 — the drawer keeps its icons and the guard pins that), the push row
joins `SettingsRow` via a new trailing `control` slot, Q15's guest **Sign in**
row on the drawer's own route, a **Moderation** section, `size.row = 64` shared
with the drawer, and the eyebrow stops repeating the title.

Two busy idioms became one, and the merged one took the push row's **measured**
spinner colour (`color.text`), not the component's `textSubtle`, whose own
comment already said it was too low-contrast for a thin stroke.

### 6.3 Profile (board 08)

**Guest.** `MISSION_STATEMENT` verbatim from the one exported constant (the same
one About reads; `mission.guard` passes unchanged), a three-line "With an
account" card whose rows are STATEMENTS not controls, the stage at
`strength={0.6}`, the lone `LogoMark` retired to About, and the column scrolls.

**Signed-in.** The points figure on `font.size.display` through the `size` PROP
(so tracking derives) at `font.lineHeight.display`, capped 1.3. The tier pill on
the gold pair (C4 — it was wearing the app's utility blue). One progress bar at
a time, with the milestone bar rendering only when its target actually differs;
both bars now fill on the same reduced-motion-gated driver. Ten floating panes
became three cards. Four commit controls gained `hapticSelection`. Every raw
`fontSize` / `fontWeight` / `letterSpacing` / `borderRadius` in `makeStyles` is
a token; five dead emoji-size styles from the Lucide migration are deleted.

`tierHeaderRow` already carried the SW-51 wrap (D23) — verified, not re-added.
Stat semantics (SW-39) and the tier/badge threshold tables are untouched.

### 6.4 Empty, loading and error (board 10)

New `src/components/ui/EmptyState.tsx`: the path mark (five discs, the third one
dashed and empty), heading, optional body, optional action, optional live
announcement. Adopted on Home (true-zero + error), Tasks, MyReports, MyWatched,
ActivityFeed, HiddenComments, Achievements and `ReportsBreakdownCard`, with each
site's hand-rolled `emptyTitle`/`emptyBody` styles deleted. One documented
exception carried by the component: Tasks' "All caught up" keeps its gold
Sparkles disc, because that state is a celebration and gold is the gamification
colour.

Two states that did not exist before: Achievements had no empty state at all,
and the breakdown card answered a failed fetch with `return null` — vanishing,
which is indistinguishable from "you have no reports".

Skeleton bars follow `PixelRatio.getFontScale()`, so the placeholder stops
being drawn at the shape of a row nobody is about to get.

### 6.5 `Linking.openSettings()` (D26)

A `permissionLocked` state reads `canAskAgain` from both the request path and
the arrival probe. Three controls change, and only in that state: the denied
banner gains an "Open Settings" link, the recenter button becomes that route and
says so, and the Report FAB's hint stops naming the recenter button. The fence
is the point — a user who can still be re-asked keeps today's wording, and the
in-app sentence survives in the source for them (a test pins that it does).

---

## 4. Guards re-pinned (never deleted) — six, each with its reason

| Guard | Was | Is | Why |
|---|---|---|---|
| `bp3TrustEngineGuards` | finger-down tick census == 2 | == 3, and `hapticSelection()` calls == press-in handlers | Still the same TWO pickers; severity now has two compositions and only one is ever mounted. The load-bearing half is **strengthened**: the call count is now asserted equal to the handler count, so a release-time tick still fails. |
| `inertControlVisual` | the push row's dim as a style spelled out at the call site | the component's `disabled` branch, reached by the same `pushBusy \|\| pushLocked` the suite already pins | The row IS a `SettingsRow` now, so the hand-copied style does not exist. SW-20/SW-49's actual remedy, made structural. |
| `flexBasisUnderLargeType` | non-vacuity read the literal `fontSize: 18` | reads `font.size.xl` **and asserts that token is 18** | Strictly stronger than the string it replaced. |
| `qaMergeConsolidation` | a 800-character window on the Report FAB | slices to the FAB's own closing tag | The window had already been widened 600 -> 800 once; a guard that must be re-measured whenever the code gets a line longer is measuring the wrong thing. |
| `typeBlock` | explicit caps under a content block == `[]` | `['screens/ReportFlagModal.tsx:1.3']` | The 1.3 is not inside the new block: it is the COMPACT picker's digit in the other ternary branch, a fixed 44x44 circle whose rationale predates this work. |
| `HomeScreen.emptyLocal` | — | **passes unchanged** | Listed because it governs the string F-05 promotes; the derivation reads the same constant. |

**Passing unchanged, verified, and named because the prompt named them:**
`reportControl` · `sheetPull` · `keyboardClass` · `onboardingCoherence` (the
Replay-tutorial row's title, subtitle and hint are byte-identical) ·
`profileProgressBars` (SW-41) · `profileStatsSemantics` (SW-39) · `labelInName` ·
`hitTargetFrame` · `mission` · `decorativeHiding` · `privacy` · `terms`.

### New suites — 4 files, 91 tests

- `settingsGrammar.guard.test.ts` (16) — every row inside a group, no row
  re-growing its own card, no icons, one spinner, the exclusive Sign in / Sign
  out pair, the shared height token, moderation under its own heading.
- `profileHeroGrammar.guard.test.ts` (15) — the display token, the token sweep,
  the gold pill, the bar-divergence predicate **evaluated against the shipped
  milestone and tier tables** at 90 / 10 / 600 points, three cards, four haptics.
- `EmptyState.test.tsx` (27) — the recipe rendered for real; the adoption and the
  C6 banner colours scanned across all eight surfaces.
- `MapScreen.openSettings.test.ts` (9) — the gate, the three controls, and the
  fence (nothing changes for a user who can still be re-asked).
- plus 24 new tests inside `ReportFlagModal.test.tsx` and `GuestProfile.test.tsx`.

**Source-scan idiom, stated because it is a choice:** ProfileScreen, SettingsScreen
and MapScreen each need a navigator, Supabase, auth, a tab bar and the shared
modal host to mount; this repo already defers their full renders to
Detox/Playwright and guards them by source scan (`inertControlVisual`,
`profileProgressBars`, `MapScreen.arrival`, `qaMergeConsolidation`). What these
new suites protect is composition and token discipline, which is exactly what a
source scan can see. Where behaviour could be tested for real it was:
`EmptyState` and `GuestProfile` render, the report form's 24 tests drive the
actual component, and the bar-divergence predicate is computed from real data.

---

## 5. The device pass — four defects the green suite could not see

The suite was green for all nine commits before `41da985`. The 17e found four
defects anyway, **two of them inside the accessibility work itself**.

| # | Defect | Fix |
|---|---|---|
| DP-1 | At AXL the picker's WORD was drawn smaller than its MEANING — X6's inversion, reproduced inside the control built to fix X7 | one `content` TypeBlock over the pair, as the Legend does |
| DP-2 | The guest Profile's last row sat under the tab bar with nothing below it to scroll | `BottomTabBarHeightContext ?? 0` (the hook throws outside a tab navigator, and this component exists to be testable standalone) |
| DP-3 | In DARK the inert Submit was indistinguishable from a live one | a 1.5pt outline in the pair's own ink — a second, non-colour channel |
| DP-4 | The revealed coordinate read as a line detached from the sentence above it | one wrapper, so the ScrollView's row gap cannot open between them |

**DP-3, measured on the device rather than reasoned from a token table:**

```
light   inert #D9E7FD  vs live #1F68DA  = 4.15 : 1     the fill carries the state
dark    inert #0E4499  vs live #1F68DA  = 1.76 : 1     the fill does NOT
dark    outline #B4CFFA vs live fill    = 3.27 : 1     clears WCAG 1.4.11
light   outline #0F53BE on the tint     = 5.60 : 1
```

A dark palette's "soft brand" is a dark blue, so it can never sit far in
luminance from a mid brand blue. C5's soft-tint grammar is right in light and
mute in dark; the result was an enabled-LOOKING control that answers a tap with
nothing, which is the exact class SW-49 exists to stop.

> ### ⚠ DESIGN-SYSTEM FINDING 1 FOR SKY (not fixed here, deliberately)
> **Dark `brandSoft` (#0E4499) sits 1.76:1 from `ctaFill` (#1466E0) — too close
> to signal a state.** Any dark control that expresses "disabled" as a
> brand-soft fill has the same problem, not just this button. Fixing the token
> itself would ripple across every chip, banner and avatar placeholder that
> reads it, so it is your call. The outline is the local remedy; a palette
> answer would retire the need for it.

### The signed-in walk found a fifth (commit `6.8`)

**`surfaceVariant` carried the same value in BOTH palettes** —
`rgba(255,255,255,0.25)` — and its own comment justified that with "the hero
surface is always brand blue", a premise that expired when the hero became the
pale row glass. Measured on the 17e: the progress track read **1.03:1** against
the card in light and 2.30:1 in dark. Light-mode users saw a lone gold pill with
no lane around it; dark-mode users saw a proper bar. The Phase-0 capture of the
same account shows it has been that way at least since this series began.

Light now takes `borderStrong` (1.43:1 measured on the rebuilt binary); dark
keeps the white wash. Two call sites in the tree, both the bars 6.3b reworked.

> ### ⚠ DESIGN-SYSTEM FINDING 2 FOR SKY (deliberately left open)
> **How deep should a progress LANE be?** `borderStrong` is the house's strong
> hairline and is a named token rather than a number a builder picked, but 1.43:1
> in light against 2.30:1 in dark means the two schemes still do not read alike.
> Going darker is colour arbitration, which is not a builder's call — and there
> is a real tension either way: a deeper track separates lane-from-card but
> reduces gold-fill-against-lane (1.36:1 at the value I measured). Worth one
> arbiter run.

---

## 6. Captures

`build/06/after/` — the 17e (390x844), sim-release, `main.jsbundle` verified
newer than every edited source before each pass.

| File | State |
|---|---|
| `17e_light_m_C7_report.png` | no default severity; inert Submit; "At your current location" + Show |
| `17e_light_m_C7_report_rated.png` | Show revealed: mono coordinate + Copy; disc 4 with fill/tick/ring; Submit live |
| `17e_light_axl_C7_report.png` | the Legend rows as the picker (post-DP-1: the word holds its size) |
| `17e_light_axl_C7_report_rated.png` | the selected row's tint + ring + tick |
| `17e_dark_m_C7_report.png` | post-DP-3: the inert Submit wears its outline |
| `17e_light_m_A7_settings_top.png` | grouped cards, no icons, push row in the group |
| `17e_light_m_A7_settings_scrolled.png` | MODERATION section; ACCOUNT → **Sign in** for a guest |
| `17e_dark_m_A7_settings.png` | the same on the dark row glass |
| `17e_light_m_A5_profile_guest.png` | the mission card and the three account lines |
| `17e_light_axl_A5_profile_guest.png` | the subtitle wraps (X11 holding); the mission runs at x2 and scrolls |
| `17e_light_axl_A5_profile_guest_scrolled.png` | post-DP-2: the last row clears the tab bar |

### ✅ NEEDS-SKY-SIGN-IN — CLOSED. Sky signed the simulator in on 2026-08-22.

| File | State |
|---|---|
| `17e_light_m_A5_profile_signedin.png` | 124 points in mono at 48, the gold Silver pill, **one** progress bar, post-6.8 track |
| `17e_light_m_A5_profile_signedin_stats.png` | the stat trio as ONE card, three mono cells (6 / 5 / 4) |
| `17e_light_m_A5_profile_signedin_nav.png` | YOUR REPORTS (4 rows) and COMMUNITY & ACCOUNT (3), one card each, hairline seams |
| `17e_dark_m_A5_profile_signedin.png` | the gold pair on dark (`goldLight #3D2A00` / `goldDark #FCC44D`); the track visible |

**SW-41 confirmed against the real account, which is the whole point of the
change.** At 124 points the next tier target and the next badge target are both
500, so the two bars coincide and the milestone bar is correctly hidden — ONE
bar. The Phase-0 capture of the same account shows TWO gold stubs in the same
place, which is exactly the frame the walk originally photographed. Before and
after, same account, same points: the divergence rule does what it claims.

**And it surfaced a defect no capture in this series had caught** — see 6.8 and
the second finding in §5.

**Still not captured on the device, and why — covered by tests:**

- **Home's true-zero and error cards** — the live backend has 13 flags in the
  walked region and there is no in-app route to either state. Covered by
  `EmptyState.test.tsx`'s adoption scan; forcing them on the device means
  cutting the network, which the production-law rail makes a poor trade.
- **The Achievements empty state and the breakdown-card error** — both are
  behind auth as well.

**Production law observed:** the report form was walked to the edge and
cancelled. Nothing was submitted, no account was signed into, no live content
was touched.

---

## 7. Copy

`build/COPY_LEDGER.md` §"Prompt 06" — **21 new placeholder strings** (W-16 to
W-36) and one format change (F-05), each naming the single place it changes.
This phase writes the most placeholders in the series, as the prompt predicted.
Nothing guarded was touched.

### ✅ RATIFIED 2026-08-22 (commit `ab8801f`)

**Sky reviewed all 21 strings, the format change, and both ⚠ decisions below,
and approved them.** They are the shipped copy now. Both reversals stand. The
two entries below are kept as the record of what was decided and why — they are
no longer open questions:

1. **§SKY-7 section pick S1 is reversed** — Hidden comments and Blocked people
   move out of Feedback into their own Moderation section. Instructed by the
   prompt; it is your ruling being revisited, so it is flagged rather than
   buried. One-line revert.
2. **§C6's wording and the two failed-refresh banners disagree.** The rule says
   amber when stale data remains; MyWatched and HiddenComments both show a
   failed refresh with their rows still on screen, so by the letter of the rule
   they were already right. The prompt names both files and instructs red, and
   red resolves a real incoherence the rule does not address (MyWatched rendered
   a FAILURE in the same amber banner as an informational notice; MyReports and
   ActivityFeed — the modals §C6 cites as already correct — use `errorBg` for
   any load failure). Built as instructed; the rule may want one more sentence.
   One style swap reverts either banner.

---

## 8. What is left for Sky

1. **Merge** (rollback line in §2).
2. ~~**Ratify the copy**~~ — **DONE 2026-08-22** (`ab8801f`). All 21 strings
   ratified and both reversals upheld. What that ratification explicitly did
   NOT cover, because they are questions and not proposed strings: the lock
   banner's em dash, "Update preferences", and the "Your reports" heading that
   duplicates `ReportsBreakdownCard`'s own title (item 6 and §6 item 4 below).
   One consequence to carry forward: **§C6 in the design-system doc should gain
   the sentence the ruling implies** — amber is an informational notice about
   the data, red is an operation that failed.
3. **The design-system finding in §5** — dark `brandSoft` vs `ctaFill`.
4. ~~**NEEDS-SKY-SIGN-IN**~~ — **CLOSED 2026-08-22.** Sky signed the sim in and
   the walk ran; captures and the SW-41 confirmation are in §6. Two things were
   deliberately NOT pressed, because they write to the real account: Save
   display name / the avatar picker (and the default-tab pills and realtime
   toggle were left alone too). Those four are where the new haptics live, and
   haptics cannot be felt in a simulator anyway — they stay on the NEEDS-DEVICE
   list below.
   **One naming observation from the walk:** `ReportsBreakdownCard`'s own title
   is "Your reports" and W-30's new section heading is "YOUR REPORTS". They sit
   on the same scroll, roughly a screen apart, so they do not collide visually —
   but they are the same two words twice. Renaming either is your call.
5. **NEEDS-DEVICE** — VoiceOver by ear on the new radio group and the
   Show/Copy pair; Reduce Motion over both progress bars; the four Profile
   haptics (Save display name, avatar, default-tab pills, realtime toggle — a
   simulator cannot render them); a real iOS permission denial walked to
   `canAskAgain === false` for D26 (the simulator grants and revokes through
   `simctl`, which does not reproduce the OS's one-shot rule).
6. **Two things this build deliberately did not do**, both one-liners, both in
   the ledger: the lock banner's em dash, and "Update preferences" ->
   "Which updates to show".
