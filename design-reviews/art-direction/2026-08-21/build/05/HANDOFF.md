# HANDOFF — GSP-05 · Phase 2b · onboarding in the light + sign-in on the primitives

**Prompt:** `build-prompts/05_phase2b_onboarding_and_signin.md`
**Branch:** `design/gsp-05-onboarding-2026-08-22`
**Base:** `e8e7610` = `main` = `origin/main`. No base deviation — Prompt 01 was already merged.

## ✅ RUN COMPLETE — Sky merges

Seven commits, two device passes, all gates green. Report: `BUILD_REPORT.md`.
Copy for ratification: `../COPY_LEDGER.md` §"Prompt 05" (nothing shipped; 8 banked).

## Gates
| | baseline | final |
|---|---|---|
| typecheck | 0 errors | 0 errors |
| jest | 236 / 3447 / 32 todo / 0 fail | **237 / 3468 / 32 todo / 0 fail** |
| lint | 0 err / 82 warn | 0 err / 82 warn |

## Commits
- `21a90a8` 5.1a — `fixedDark` + `color.errorOnDark*` both palettes + `Input onDark` + DESIGN.md §1
- `09b941c` 5.1b — OnboardingCards rebuilt on ScreenStage (board 05); 3 guards re-pinned; new 17-test suite; DESIGN.md §7
- `09451f0` 5.1c — one animation driver for every progress stone
- `f1b8ed0` 5.2 — OnboardingModal replay on the same template
- `75dff74` 5.3 — SignInScreen onto `Input onDark`, tokenised error red, one-run footer, derived tracking
- `eea4796` 5.4 — device pass 1: vertical overflow fade (hook + primitive extended, `useOverflowFade`), footer flex-basis
- `c61778b` 5.5 — device pass 2: 44pt ramp for the prose edge

## Guards re-pinned (never deleted)
`flexBasisUnderLargeType` · `bottomInsetSafety` (SW-02) · `bp10SeverityGrammarGuards`.
Reasons in the report §7. `onboardingCoherence`, `labelInName`, `decorativeHiding`,
`privacyLink`, `terms`, `privacy` all pass **unchanged**.

## If RESUMED
Nothing is in flight. The branch is complete and stops here by design (RAILS: Sky merges).
Re-verify `main` is still `e8e7610` before merging; if it moved, rebase and re-walk
onboarding + SignIn only.

## Sim state (restored at close)
iPhone 17e `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC` booted · **light · medium** ·
app installed from the final Release build (bundle `13:00:51`), location NOT granted,
sitting on onboarding card 4. One booted sim.

⚠ Onboarding is gated by a device-wide AsyncStorage flag — every look at card 1 needs a
fresh install. `./walk.sh <capture-name>` does uninstall → install → grant location →
launch → wait → capture. `./cap.sh <name>` is a bare screenshot. `./reinstall.sh <app>`
is the install half alone.

⚠ `xcrun simctl launch` returns before the JS bundle mounts — capturing immediately gets
the splash screen. Both helpers wait 9s.

⚠ When rebuilding: `expo run:ios` TRUNCATES `build.log` at start, so a `grep` for
"Build Succeeded" can match the PREVIOUS run's content and report a stale success. Wait on
the task, then verify `main.jsbundle`'s mtime is newer than every source file you edited.
I nearly banked captures from an uncertain binary this way.

## What Sky is left with
1. **Merge** (see the report's rollback line).
2. **COPY_LEDGER §Prompt 05** — 8 banked strings + the two divergent card-1 sentences.
3. **NEEDS-DEVICE** — haptics on permission grant, the real OS dialogs, VoiceOver by ear,
   Reduce Motion / Reduce Transparency.
4. **Four design calls** flagged in §12: the bottom-weighted composition, the gold/severity-1
   near-twin, the replay's step-2 glyph, and the two off-scale type sizes.
5. **One banked defect with the tool already built**: SignIn's guest note is sliced by the
   pinned footer at AXL (pre-existing) — one wrapper + `<OverflowFade orientation="vertical" />`.
