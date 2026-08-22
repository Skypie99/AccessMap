# HANDOFF — GSP-06 · Phase 2c · report form · Settings · Profile · empty states

**Prompt:** `build-prompts/06_phase2c_report_settings_profile_empty.md`
**Branch:** `design/gsp-06-forms-2026-08-22`
**Base:** `1984c3e` = local `main` (9 ahead of `origin/main`). Prompts 01, 02, 04 (and 03, 05, 05b) verified as ancestors — prerequisite met.

## ✅ RUN COMPLETE — Sky merges

Ten commits, one device pass, all gates green. Report: `BUILD_REPORT.md`.
Copy for ratification: `../COPY_LEDGER.md` §"Prompt 06" (21 placeholders, 0 shipped-as-final).

## Gates
| | baseline | final |
|---|---|---|
| typecheck | 0 errors | 0 errors |
| jest | 237 / 3469 / 32 todo / 0 fail | **241 / 3560 / 32 todo / 0 fail** |
| lint | 0 err / 82 warn | 0 err / 82 warn |

## Commits
- `3c844b0` 6.1a location line in words; the coordinate behind Show/Copy; new `locationSource` prop
- `d051323` 6.1b no default severity; inert Submit on the C5 grammar; the ask on the meaning line
- `90f8b2c` 6.1c the picker becomes the Legend's radio rows at >=1.5x
- `09f1aff` 6.1d Q6 — one string, seen and spoken
- `b2df2b4` 6.2 Settings on the Home list grammar; Q15; Moderation; `size.row`
- `8e65fb1` 6.3a the guest Profile gets something to say
- `871b280` 6.3b the signed-in Profile in tokens and in three cards
- `06ade27` 6.4 `EmptyState` + 8 adoptions; scaled skeletons; C6 banners
- `9858f67` 6.5 D26 `Linking.openSettings()` on a locked denial
- `41da985` 6.6 device pass — 4 defects the green suite could not see

## Guards re-pinned (never deleted)
`bp3TrustEngineGuards` · `inertControlVisual` · `flexBasisUnderLargeType` ·
`qaMergeConsolidation` · `typeBlock`. Reasons in the report §4.
`reportControl`, `sheetPull`, `keyboardClass`, `onboardingCoherence`,
`profileProgressBars`, `profileStatsSemantics`, `labelInName`, `hitTargetFrame`,
`mission` all pass **unchanged**.

## New suites
`settingsGrammar.guard.test.ts` (16) · `profileHeroGrammar.guard.test.ts` (15) ·
`EmptyState.test.tsx` (27) · `MapScreen.openSettings.test.ts` (9), plus 24 tests
inside the existing ReportFlagModal and GuestProfile suites.

## If RESUMED
Nothing is in flight. The branch is complete and stops here by design (RAILS: Sky merges).
Re-verify `main` is still `1984c3e` before merging; if it moved, rebase and re-walk the
report form, Settings and the guest Profile only.

## Sim state (restored at close)
iPhone 17e `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC` booted · **light · medium** ·
app installed from the final Release build (bundle 16:41), location granted,
signed out. One booted sim.

⚠ `expo run:ios` TRUNCATES `build.log` at start, so grepping for "Build Succeeded"
can match the PREVIOUS run. Wait for the process, then verify `main.jsbundle`'s
mtime against every edited source. Done before both capture passes here.

⚠ A relaunch drops back to SignIn (the guest session is not persisted), so every
walk starts with "Browse without an account".

⚠ Time-box every `simctl` call: `perl -e 'alarm 40; exec @ARGV' xcrun simctl …`.

## What Sky is left with
1. **Merge** (rollback line in the report §2).
2. **COPY_LEDGER §Prompt 06** — 21 placeholders, and two ⚠ decisions that want a
   yes or no specifically: §SKY-7's section pick S1 being reversed, and §C6's
   wording vs. the two failed-refresh banners.
3. **A design-system finding** (report §5): dark `brandSoft` sits 1.76:1 from
   `ctaFill`, too close to signal a state. Fixed locally with an outline; the
   token itself is your call.
4. **NEEDS-SKY-SIGN-IN** — one walk of the signed-in Profile (the agent cannot
   hold credentials).
5. **NEEDS-DEVICE** — VoiceOver on the new radio group and the Show/Copy pair;
   Reduce Motion over both progress bars; a real iOS denial walked to
   `canAskAgain === false` (simctl cannot reproduce the OS's one-shot rule).
6. **Two deliberate non-changes**, both one-liners in the ledger: the lock
   banner's em dash, and "Update preferences" -> "Which updates to show".
