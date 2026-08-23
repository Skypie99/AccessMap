# HANDOFF — GSP-06 · Phase 2c · report form · Settings · Profile · empty states

**Prompt:** `build-prompts/06_phase2c_report_settings_profile_empty.md`
**Branch:** `design/gsp-06-forms-2026-08-22`
**Base:** `1984c3e` = local `main` (9 ahead of `origin/main`). Prompts 01, 02, 04 (and 03, 05, 05b) verified as ancestors — prerequisite met.

## ✅ RUN COMPLETE — Sky merges

Fourteen commits (ten of build, one source fix, three of evidence), one device
pass, one signed-in walk, all gates green. Report: `BUILD_REPORT.md`.
Copy: `../COPY_LEDGER.md` §"Prompt 06" — **all 21 strings RATIFIED 2026-08-22**
(`ab8801f`); both reversals upheld. Nothing there is awaiting an answer.

## Gates
| | baseline | final |
|---|---|---|
| typecheck | 0 errors | 0 errors |
| jest | 237 / 3469 / 32 todo / 0 fail | **241 / 3560 / 32 todo / 0 fail** |

Re-verified independently at `ab8801f` on a clean tree (2026-08-22): typecheck 0
errors, jest 241 / 3560 / 32 todo / **0 fail** in 115s. Reproduces exactly.
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
- `b36edb5` 6.7 evidence (report, handoff, ledger, captures)
- `0aaa5a1` 6.8 `surfaceVariant` forked — the progress track was invisible in LIGHT (1.03:1), found on the signed-in walk
- `ddb8f1d` 6.9 evidence — the signed-in walk, its four captures, and what it changed
- `ab8801f` 6.10 Sky ratifies the 21 strings and upholds both reversals (ledger only)

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

⚠ **The sim is signed in as Sky's real account again** (Sky typed the password
2026-08-22 — an agent cannot). Do NOT sign out: no agent can sign back in, and
that is what made the signed-in Profile uncapturable for the whole series until
now. If a guest-state walk is needed, ask Sky rather than signing out.

⚠ Signing in fires an in-app push-notification Alert on first Home. Answer **Not
now** — "Enable" registers a push token on the real account. The MCP tap needs a
second attempt on that alert; the first one lands but does not register.

⚠ Time-box every `simctl` call: `perl -e 'alarm 40; exec @ARGV' xcrun simctl …`.

## What Sky is left with
1. **Merge** (rollback line in the report §2).
2. ~~**COPY_LEDGER §Prompt 06**~~ — **DONE** (`ab8801f`): 21 strings ratified,
   §SKY-7's S1 reversal and §C6's red-banner reversal both upheld. One thing it
   leaves behind: **§C6 in the design-system doc should gain a sentence** — amber
   is an informational notice about the data, red is an operation that failed.
3. **A design-system finding** (report §5): dark `brandSoft` sits 1.76:1 from
   `ctaFill`, too close to signal a state. Fixed locally with an outline; the
   token itself is your call.
4. ~~**NEEDS-SKY-SIGN-IN**~~ **CLOSED 2026-08-22** — Sky signed the sim in;
   the walk ran, 4 captures banked, SW-41 confirmed on the real account (124
   points → one bar; the Phase-0 shot of the same account shows two). It also
   turned up the `surfaceVariant` defect fixed in 6.8, plus a second
   design-system question (how deep should a progress lane be) left open in the
   report §5.
5. **NEEDS-DEVICE** — VoiceOver on the new radio group and the Show/Copy pair;
   Reduce Motion over both progress bars; a real iOS denial walked to
   `canAskAgain === false` (simctl cannot reproduce the OS's one-shot rule).
6. **Three things the ratification deliberately did not cover**, because they are
   questions rather than proposed strings: the lock banner's em dash;
   "Update preferences" -> "Which updates to show"; and the "YOUR REPORTS"
   section heading, which is the same two words as `ReportsBreakdownCard`'s own
   title a screen away. The first two are one-liners in the ledger.
