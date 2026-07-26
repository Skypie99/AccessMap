# BP16 — The Copy Gate — verification evidence

**Branch:** `r2/bp16-copy-gate` · **base** `c0ee449` (BP15 tip) · **date** 2026-07-18
**Provenance (S-10):** spec + plan authored **Claude Fable 5** max (2026-07-15); executed **Claude Opus 4.8** ultracode max effort (Sky-initiated, plan-approved via ExitPlanMode). The verification + table workflow ran **8 sub-agents, all `claude-opus-4-8`**, at max/high effort. Provenance disclosed per S-10.

## What this phase is — and where it STOPS

BP16 ships the **two mechanics** that are trust-load-bearing and not copy — (T18) the replay-tutorial **announce gate**, (T17) the **Bell glyph** — and produces the **full before/after proposed-strings table** for every T17/T18 string. Then it **STOPS**: under **S-8**, no user-facing string ships until Sky's per-string pick lands in **§A**, and the k≥3 caveat additionally needs a recorded **Jordan Art. 7 sign-off**. Verified at build time: **§A carries no BP16 pick; no Jordan sign-off is recorded.** → **zero strings shipped this run.**

Commit-plan status:
| # | Item | State |
|---|---|---|
| 1 | T18 announce gate (mechanic) + jest suite | ✅ shipped — commit `d9d3887` |
| 2 | T17 Bell glyph (mechanic) + census guard | ✅ shipped — commit `8adb4d4` |
| 3 | THE TABLE (ships nothing) + ledger | ✅ produced — this file + DECISIONS §A; commit 3 |
| 4 | ON RESUME — apply Sky's picked strings + test lockstep | ⛔ NOT this run — gated on §A picks + Jordan sign-off |

---

## Commits (this order)

- **`d9d3887` — commit 1 (T18 announce gate).** `src/screens/OnboardingModal.tsx`: two refs (`wasVisible`, `prevIndex`) + a single `visible`-gated announce-owner effect replacing the old `[index]`-only effect; reset-to-0 effect unchanged. `+ src/screens/__tests__/OnboardingModal.test.tsx` (new, 4 scenarios). Wording kept verbatim "Step N of M".
- **`8adb4d4` — commit 2 (T17 Bell glyph).** `src/components/UpdateBanner.tsx`: `import { Bell, X }`; 🔔 → `<Bell size={18} color={color.brandOnSoft} strokeWidth={2.2} accessibilityElementsHidden importantForAccessibility="no" />`; dead `icon` style dropped. `+ src/components/__tests__/UpdateBanner.test.tsx` (new, emoji census 3/3).
- **commit 3 (this evidence + DECISIONS appends).** Ships nothing.

## Gates (all green) `[verified]`

- **typecheck** `tsc --noEmit` → **0 errors**.
- **lint** → **0 errors / 77 warnings = exact BP15 baseline, 0 NEW** (all 77 pre-existing, none in the 4 touched files; `eslint src/screens/OnboardingModal.tsx` and the banner file emit nothing).
- **test** `npm test` → **144/144 suites, 2047 passed, 0 failed** (baseline 2040 + **7** new: 4 announce-gate + 3 census; +2 suites). The 84 `todo` are pre-existing markers; the worker-teardown/tasksSort console noise is pre-existing.
- **diff scope** — `git diff --stat c0ee449..HEAD` = **exactly the 4 intended tracked files** (2 src + 2 new tests). All evidence/table/ledger artifacts live under the **untracked** `design-reviews/` tree. `.claude/launch.json` deletion is pre-existing (in no commit), not staged.
- **7 immutable stacks files** — untouched (none edited).
- **arbiter** — **none needed**: no color/floor/ink pair changed (the Bell reuses the already-arbitrated `brandOnSoft` banner ink). No stacks sibling declared.
- **blur budget** — +0 (Bell is an SVG; the announce gate is logic-only).

---

## M1 — announce gate: the fix + proof

**Root cause.** OnboardingModal is kept **permanently mounted** by SettingsScreen (`:652`, only `visible` toggles). The position-announce effect keyed on `[index]` alone fired "Step 1 of 3" on the **initial closed mount**, publishing a phantom status to VoiceOver while the user sits on Settings; and it announced inconsistently on open (only when the last session ended past card 0).

**The fix.** One `visible`-gated effect owns every position announce, using `wasVisible`/`prevIndex` refs; the open announce is **hard-coded to position 1** (the reset target) so no stale pre-reset index is ever spoken.

**Commit-sequence proof (all 4 invariants):** `[verified — jest 4/4 + 3 independent skeptics]`
1. **Closed mount (visible=false)** → `opening=false`, `movedWhileOpen=false` → else branch → **silent**. (No phantom.)
2. **Open (false→true)** → `opening=true` → **one** "Step 1 of 3", `prevIndex←0`. `setIndex(0)` no-ops when already 0.
3. **Reopen after nav to card 3** → open commit announces position 1 **without reading `index`** and baselines `prevIndex←0`; the reset's `setIndex(0)` settle commit computes `movedWhileOpen = (0 !== 0) = false` → silent. **Never "Step 3 of 3".**
4. **Navigate while open** → `movedWhileOpen` path, one announce per distinct index change ("Step 2 of 3", "Step 3 of 3").

Wording verbatim "Step N of M" (the 'Step'→'Card' flip is table row `step-card`, deferred). Motion-decoupled (never reads `reducedMotion`).

**Adversarial verdicts (3/3 UPHELD, high confidence, 0 refutations):**
- **timing-and-effect-ordering** — UPHELD. Traced initial-visible=true mount, effect flush order, `setIndex(0)` bail, StrictMode double-invoke (app doesn't use StrictMode; the `wasVisible` ref survives it anyway), rapid open→close→open, `handleScroll` path. Found a NEW uncovered scenario (mount with `visible=true`) → code survives (one correct "Step 1 of 3").
- **a11y-voiceover-semantics** — UPHELD. The gated announce and the separate polite live-region View (`:169–175`, untouched) are complementary (position vs title/body) — no duplication/drop; net a11y improvement (removes only the mis-timed phantom). Back/Next static labels byte-identical.
- **regression-deps-and-blast-radius** — UPHELD. Deps exactly `[index, visible]`, no eslint-disable; `goTo`/`handleScroll`/reset effect unchanged; **only two render sites** (SettingsScreen:652 + the test); App.tsx first-run uses a different component (OnboardingCards) — unaffected. (Noted a pre-existing stale comment at SettingsScreen:644 — not introduced here, zero runtime effect.)

## M2 — Bell glyph: the fix + proof

🔔 (the last decorative UI emoji app-wide) → Lucide `<Bell/>`, size 18 (= sibling X = the emoji's old `font.size.xl`), tinted `color.brandOnSoft` (the banner's existing ink), SR-hidden on both platforms; dead `icon` style removed.

**Adversarial verdicts (2/2 UPHELD, high confidence, 0 refutations):**
- **ink-token-and-no-arbiter-claim** — UPHELD. `brandOnSoft` pre-exists (`ThemeContext.tsx:56` #B4CFFA / `theme.ts:85` #0F53BE) and already tints the sibling X + banner text; the codebase's own "banner ink law → brandOnSoft (arbiter-legal on banner)" corroborates. **Zero new ink pair → no arbiter, no stacks sibling.** No stacks file touched.
- **census-guard-validity-and-a11y-hiding** — UPHELD. Empirically confirmed `/\p{Extended_Pictographic}/u` matches 🔔 (U+1F514) and the walker collects nested string leaves regardless of a11y flags → the guard **would fail on the pre-fix emoji, passes on the SVG Bell** (non-vacuous, anchored by the passing label assertion). Bell carries both hiding props (verified they reach the host SVG via lucide's `...rest`); count still conveyed by the live region + "View N updates" label. Pre-fix emoji carried the identical hiding props → a11y contract preserved exactly.

**PROTECT-24** (the Lucide house style) is completed by this swap. Before/after + the honest reason no pixel frame is attached (the banner is auth+data-gated; the capture rig never authenticates; the census jest is authoritative) → `evidence/BP16/PROTECT-24.md`.

## Adversarial verification — summary

**5 skeptics · 0 REFUTED · 5 UPHELD · all high confidence.** No fix-loop needed. Workflow `wf_cd1067b7-42c`; all agents `claude-opus-4-8`; the workflow was read-only on the app (HEAD unchanged at `8adb4d4` after the run). Full per-skeptic findings in the workflow journal.

---

## THE TABLE — 38 PROPOSED before/after strings (ships nothing; every row awaits Sky's §A pick)

Rails honored across all rows: em-dash status grammar (PROTECT-19); search copy keeps the TRUE 3-field list (description+category+status per `flagSearch.ts`) — never 2-field; Canadian "colour"; sentence-case (proper noun AccessMap kept); k-caveat converges **wording only** (DEFAULT_K_FLOOR at `heatmap.ts:29` stays the single numeric source). `[kind]` = **M** mechanical (single obvious convergence) / **T** taste (Sky picks between options, no default). SR channel noted only where it differs from visible.

### k-caveat — single-source the privacy promise (5 rows) · **needs Jordan Art. 7 sign-off (below)**
- **kcav-export** · `src/lib/copy.ts` (new export) · **[M]** · after: `export const HEAT_K_CAVEAT = \`Heat zones only appear where at least ${DEFAULT_K_FLOOR} flags have been reported.\`;` (imports `DEFAULT_K_FLOOR` from `./heatmap`). One exported privacy sentence imported by all sites — the offlineBannerText discipline. PROTECT-11.
- **kcav-anchor** · `MapScreen.tsx:2481` · **[M]** · before `Heat zones only appear where at least {DEFAULT_K_FLOOR} flags have been reported. Based on community reports — coverage varies by area.` → after `{HEAT_K_CAVEAT} Based on community reports — coverage varies by area.` (rendered text unchanged; becomes the imported source).
- **kcav-legend** · `LegendModal.tsx:185` · **[M]** · before `To protect reporters, heat zones only appear where at least 3 flags have been submitted.` → after `{HEAT_K_CAVEAT}` (= "…at least 3 flags have been reported."). Drops the **hardcoded `3`** for interpolated `DEFAULT_K_FLOOR`, and `submitted`→`reported`. ⚠️ **loses the "To protect reporters" purpose gloss** — see Jordan advisory.
- **kcav-toggle** · `MapScreen.tsx:2152` (heat-toggle accessibilityHint, visible=spoken) · **[M]** · before `Overlays a coloured grid… Only areas with at least {DEFAULT_K_FLOOR} reports are shown.` → after `Overlays a coloured grid… {HEAT_K_CAVEAT}`.
- **kcav-filterhint** · `MapScreen.tsx:2164` · **[M]** · before `Heat zones only appear where at least {DEFAULT_K_FLOOR} flags have been reported. Colour shows mean severity (1–5)…` → after `{HEAT_K_CAVEAT} Colour shows mean severity (1–5)…` (already on the right words; single-sources its lead sentence).

### noun-canon — "flag" (the DB word) → "barrier" (the public voice) (3 rows)
- **noun-report-title** · `ReportFlagModal.tsx:521` visible / `:495` aria-label · **[M]** · `Report a flag` → `Report a barrier`. Anon path `Report anonymously` unchanged. ⚠️ **breaks tests** — see resume lockstep.
- **noun-fab** · `MapScreen.tsx:2582` FAB accessibilityLabel (SR only) · **[M]** · `Report a flag here` → `Report a barrier here`. Aligns to the confirm dialog (`:1531`) which already says "Report a barrier here?".
- **noun-tasks-subtitle** · `TasksScreen.tsx:836` · **[M]** · `Verify and resolve reports` → `Verify and resolve barriers`. (Profile's "your stats, badges, and reports" is EXEMPT per report §6 — do not touch.)

### search — converge register, keep the TRUE 3-field list (4 rows)
- **search-tasks-placeholder** · `TasksScreen.tsx:939` · **[M]** · `Search by description or category…` → `Search description, category, or status…`. ⚠️ **DRIFT:** Tasks actually ships a **2-field** string (omits "status") — the exact forbidden pattern; fix converges to the real 3 fields.
- **search-nearby-placeholder** · `NearbyFlagsModal.tsx:232` · **[M]** · `Search descriptions, categories, status…` → `Search description, category, or status…` (register-converge with Tasks; keep 3 fields; do NOT port a 2-field wording).
- **search-nearby-empty** · `NearbyFlagsModal.tsx:296/:303` · **[M]** · `No flags match "{query}"…` → `No barriers match "{query}". Try a shorter or different search.` (keeps the query echo — the model Help adopts).
- **search-tasks-empty** · `TasksScreen.tsx:304` (spoken announce) · **[M]** · `No flags match your search.` → `No barriers match your search.`

### partial-success (1 row)
- **partial-success** · `ReportFlagModal.tsx:453/:454` · **[M]** · title `Flag saved without context tags` → `Report filed — context tags not saved.` (em-dash grammar); body de-jargoned: `…the context tags didn't save this time; they'll turn back on automatically once the server catches up.`

### tasks-footer — stop over-claiming completeness (1 row)
- **tasks-footer** · `TasksScreen.tsx:1291` visible / `:1289` SR · **[M]** · visible `That's everything nearby — you're up to date` → `That's every report loaded — more appear as neighbours flag them.`; SR `You have seen all flags nearby` → matched to the visible. Retires the two claims a crowdsourced model can't make. PROTECT: this is the pagination end-line, NOT the five-way empty fork (untouched).

### dialect — American "color" → Canadian "colour" (5 rows, all [M])
- **dialect-onboarding** · `OnboardingModal.tsx:51` · **dialect-changelog** · `ChangelogModal.tsx:41` · **dialect-help-42** · `HelpModal.tsx:42` · **dialect-help-50** · `HelpModal.tsx:50` · **dialect-legend-61** · `LegendModal.tsx:61` ("What the **colours** and categories…" — also ends LegendModal contradicting its own entry rows which already say "colour").

### casing — sentence-case sweep completion (6 rows, all [M]; label prop = visible+SR together)
- **case-drawer-help** · `HamburgerDrawer.tsx:222` · `How To Help` → `How to help`.
- **case-drawer-about** · `HamburgerDrawer.tsx:226` · `About the App` → `About the app`.
- **case-profile-watched** · `ProfileScreen.tsx:1399` · `Watched Flags` → `Watched flags`.
- **case-profile-activity** · `ProfileScreen.tsx:1422` · `Recent Activity` → `Recent activity`.
- **case-profile-feedback** · `ProfileScreen.tsx:1523` · `My Feedback` → `My feedback`.
- **case-profile-delete** · `ProfileScreen.tsx:1749` (+ confirm `:1813`) · `Delete Account` → `Delete account` (the confirm-gravity "This cannot be undone" stays).

### help-echo (1 row)
- **help-echo** · `HelpModal.tsx:149` · **[M]** · `No FAQ matches that search. Try a different term.` → `No FAQ matches "{query}". Try a different term.` (adopts the NearbyFlagsModal echo model; live region already announces it).

### home-empty (1 row)
- **home-empty** · `HomeScreen.tsx:373` · **[M]** · `No barriers reported yet.` → `No barriers reported yet — tap + to report the first.` (em-dash grammar; genuine-empty only).

### step-card — align the replay position grammar (1 row) · ⚠️ DRIFT
- **step-card** · `OnboardingModal.tsx:93/:96` (announce) + `:257/:274` (Back/Next SR labels) · **[M]** · `Step N of M` → `Card N of M` (matches OnboardingCards which already says "Card N of M"). **DRIFT:** these are **SR-only** sites (the visible counter is decorative dots at `:233`), NOT the plan-cited `:74/231/248`. PROTECT-17 "Back. Disabled on first card." untouched. The T18 announce-gate mechanic (already shipped) keeps "Step" until this pick lands.

### settings-retitle — the eyebrow/title stutter (1 row) · **[T] TASTE, no default**
- **settings-retitle** · `SettingsScreen.tsx:468` eyebrow / `:469` title · eyebrow "SETTINGS" over title "Settings" — the only tab where both say the same word.
  - **Option A** — keep the eyebrow, retitle: eyebrow "SETTINGS" / title **"Preferences"** (or "Your preferences").
  - **Option B** — keep title "Settings", change the eyebrow: eyebrow **"YOUR APP"** / title "Settings".
  - Both hold the S8 editorial-header family (every tab wears eyebrow+title).

### register-rewrite — the two "bureaucrat" sentences (2 rows) · **[T] TASTE, no default**
- **register-rewrite-tasks-loadmore** · `TasksScreen.tsx:1249` · before `None of the reports loaded so far need attention, but there are more to load. Use "Load more" below to keep looking.`
  - **Option A** (plain/warm): `Nothing here needs attention yet — tap Load more to keep looking.`
  - **Option B** (em-dash status): `All caught up on what's loaded — more reports sit below. Tap Load more.`
- **register-rewrite-flagdetail-date** · `FlagDetailModal.tsx:955` · visible field label `Date` (its value's SR label already says "Reported on {date}").
  - **Option A**: relabel **"Reported"**. **Option B**: relabel **"Reported on"** (mirrors the SR label). Status-quo "Date" remains valid if Sky prefers the terse field.

### parked from earlier phases — surfaced for the gate (proposed-only; NOT BP16's own mechanics) (7 rows)
- **parked-bp3-resolve** · `FlagDetailModal.tsx:1456` · **[M]** · action button `Resolved` → `Resolve` (siblings Verify/Reject are already imperative; SR label "Mark this flag resolved" stays). *(BP3's parked verb flip.)*
- **parked-bp13-noloc** · `MapScreen.tsx:156` (`NO_LOCATION_HINT`) · **[M]** · `…the most recent flags, not ones near you.` → `…the most recent barriers…`. (See critic gap: also `MapScreen:1217`, a second no-location wording — converge together.)
- **parked-bp13-loading** · `HomeScreen.tsx:197` · **[M]** · `Loading…` (confirm the single loading verb + house ellipsis U+2026 — no change needed).
- **parked-bp13-cantload** · `MapScreen.tsx:1683` + `TasksScreen.tsx:1232` · **[M]** · `Couldn't load flags` → `Couldn't load barriers`. ⚠️ DRIFT: HomeScreen:349 already says "Couldn't load barriers." with a **curly** apostrophe vs Map/Tasks **straight** — converge noun AND apostrophe.
- **parked-bp13-retryverb** · `copy.ts` `RETRY_VERB` "Tap to retry." vs `HomeScreen.tsx:335/:339` "Tap to try again." · **[M]** · pick ONE retry verb app-wide + single-source it. (`bp13FailureVoice.test.ts` pins RETRY_VERB.)
- **parked-bp13-filing** · `ReportFlagModal.tsx:1119` · **[M]** · `Filing your report…` — flagged as a **probable KEEP** ("report" as verb-object reads natural, like Profile's exempt "reports"); Sky confirms the exemption rather than a silent canon-flip.
- **parked-bp15-guestline** · `SettingsScreen.tsx` (guest arrival) · **[M]** · `Opening Settings — one moment` — ⚠️ **does not exist in code**; a proposed optional status line for the drawer→Settings ScreenFallback that ships WITHOUT it (skeleton-first). May never ship.

**Conservation:** 38 rows = 5 k-caveat + 3 noun + 4 search + 1 partial + 1 footer + 5 dialect + 6 casing + 1 help-echo + 1 home-empty + 1 step-card + 1 settings-retitle + 2 register + 7 parked.

### Completeness critic — verdict **COMPLETE**, one soft gap
All 15 enumerated categories present; every rail holds (3-field search, em-dash on all status strings, k-number never changed, no invented HelpModal caveat, no title-case leak, all 3 taste rows carry options + "no default"). **One within-category gap:** `MapScreen.tsx:1217` carries a **second** no-location body wording ("Location is off, so the map shows the most recent flags…") that still says "flags" — fold it into `parked-bp13-noloc`'s scope so both no-location wordings converge together. `[recorded for Sky]`

### Jordan Art. 7 — k≥3 caveat semantic-equivalence — **SIGNED OFF (advisory)**
> **Semantic-equivalent = YES.** "submitted"→"reported" is verb-canon only (the k-floor count is **status-agnostic** — verified `heatmap.ts` `bucketFlagsToCells` counts raw flags, no lifecycle filter — so the counted set is identical). The dropped "To protect reporters" is **rationale, not guarantee**: the operative promise is the RULE, preserved verbatim on every surface; removing the gloss makes the app **under-claim** (the safe direction), states nothing false, removes no reliable guarantee. **STRENGTHENS**: one single-sourced sentence hardened against drift; the Legend's hardcoded "3" becomes the interpolated `DEFAULT_K_FLOOR` (can never silently diverge from the enforced floor). **Fork 4 boundary respected** — threshold value, k-mechanics, and the single numeric source are untouched (wording only).
>
> **Non-blocking advisory:** the convergence retires the ONLY surface that named the privacy *purpose*. Consider folding a short "to protect reporters" clause into the single-source string so every surface **gains** the purpose statement (a strict strengthening) — a Sky/Dani taste call inside the wording lane. **Minor note:** confirm "reported" isn't misread as "reported to the city" (the adjacent "community reports" clause disambiguates).
>
> **Jordan is NOT a lawyer — this sign-off is advisory and requires professional legal review before it is relied upon.** For the resume to ship the k-caveat rows, this sign-off (or Sky's own) must be **recorded in §A**.

---

## Drifts surfaced (verify-first — all adaptable; recorded for Sky)
From the plan: (1) the "orphan text node at SettingsScreen:69" does not exist — the phantom announce originates from the always-mounted OnboardingModal (fix target correct); (2) the replay deck is inline in OnboardingModal, not shared with OnboardingCards (copy-port targets OnboardingModal — the deferred `step-card` row); (3) HelpModal has no k≥3 caveat (convergence is MapScreen + LegendModal only — the assembler did NOT invent one); (4) PROTECT-17 Back button is a `disabled` prop, preserved either way; (5) minor line drift on every anchor (all re-located).
New from the assembler: (6) **Tasks search placeholder is actually a forbidden 2-field string** (`search-tasks-placeholder`); (7) **step-card** lives at SR sites `:93/:96/:257/:274`, not the cited `:74/231/248`, and the visible counter is decorative dots; (8) **retry-verb split** ("Tap to retry." vs "Tap to try again."); (9) **read-failure apostrophe split** (curly vs straight); (10) `MapScreen:1217` second no-location wording (the critic gap).

## What unlocks the resume (commit-plan item 4 — NOT this run)
1. **Sky records per-string picks in §A** — the mechanical rows can be a blanket "apply all mechanical" or per-row; the **3 taste rows** (settings-retitle, register-rewrite ×2) need an explicit Option A/B; confirm the **parked-bp13-filing** exemption; decide the Jordan advisory (fold "to protect reporters" in, or not).
2. **A Jordan Art. 7 sign-off is recorded in §A** for the k-caveat rows (the advisory sign-off above, or Sky's own).
3. **Test lockstep** (must land in the same resume commit as the strings that break them): `ReportFlagModal.test.tsx:399/402 & 427/430` (`'Report a flag'`→ new noun); `qaMergeConsolidation.test.ts:35` (`"Report a flag here"` FAB); `TasksScreenFlagCard.test.tsx:128/157/170` (`getByText('Resolved')` → 'Resolve'); `bp13FailureVoice.test.ts` (RETRY_VERB if the verb changes); the OnboardingModal announce tests if step→card is applied (the gate stays correct; only the asserted string changes). Plus grep guards (zero "Report a flag" variants, zero user-facing "color", zero title-case strays).

## PROTECT status
PROTECT-24 completed (Bell) — `evidence/BP16/PROTECT-24.md`. PROTECT-1/11/17/19 not shipped this run (preserved or table-only): PROTECT-11 (privacy voice) proposed in the k-caveat rows + Jordan note; PROTECT-19 (em-dash) honored by every proposed status string; PROTECT-1 (Nearby row labels) untouched (only Nearby *search* strings proposed); PROTECT-17 (OnboardingCards Back) untouched.

## Honesty tags
Gates, diff scope, commit SHAs, the 4-scenario proof, the 5/5 skeptic verdicts, and the census non-vacuousness = **`[verified]`**. Proposed table wordings = **`[proposed — Sky picks]`**. Jordan sign-off = **`[advisory — needs professional legal review]`**. The PROTECT-24 pixel look = **`[NEEDS-SKY-DEVICE — cosmetic]`**. The announce-gate device-observable (no phantom on a mounted-closed Settings; replay announces once on open) folds into **R2-D3** VoiceOver.
