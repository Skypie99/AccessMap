# HANDOFF — GSP-04 · Phase 2a · one flag family + the Tasks chrome

**Prompt:** `build-prompts/04_phase2a_flagcard_family.md`
**Branch:** `design/gsp-04-flagcard-2026-08-21`
**Base:** `fefcffc` = `main 2c631e7` + `design/gsp-02-flagdetail-2026-08-21` + `design/gsp-03-map-2026-08-21`

## ⚠ BASE DEVIATION — read this first
Prompt 04 declares "PREREQUISITES: Prompts 00, 01, 02 merged". At start, **only 00 and 01
were merged**; 02 and 03 were built and reported but still sitting on their own branches.
Branching off bare `main` would have put 04's rewrite of `TasksScreen.tsx`,
`hitTargetFrame.guard.test.ts` and the COPY_LEDGER on a base missing both, and handed Sky
three-way conflicts in exactly the files 04 rewrites. So the branch starts from an
integration of the series so far. One conflict, in `build/COPY_LEDGER.md` only (both
sections kept, in numeric order); every source file auto-merged.

Merge order for Sky is therefore 02 -> 03 -> 04. To rebase 04 onto a different base:
`git rebase --onto <newbase> fefcffc design/gsp-04-flagcard-2026-08-21`.

## Measured baselines (on the base, before the first edit)
- typecheck: clean
- lint: **0 errors / 82 warnings**
- jest: see BUILD_REPORT (run at base)

## Done
- **4.1** `src/components/ui/FlagCard.tsx` + barrel + `FlagCard.dynamicType.test` (21 tests) — `427e2d9`
- **4.2a** Home rows -> FlagCard row density — `0d1a712`
- **4.2b** Nearby cards -> FlagCard card density; PROTECT-1 label pinned — `5ba89ca`
- **4.2c** Tasks card + the re-ranked action row; 3 guards re-pinned — `8b0b871`
- **4.2d** SeverityBadge retired (0 call sites); StatusBadge kept — `218512d`
- **4.3** Tasks chrome compaction (control row, tool sheet, section count, banner,
  CHROME_FALLBACK_HEIGHT 210 -> 146); tasksHeaderReclaim + tasksFilterSheet + bp11 re-pinned
- **4.4** mono numerals: FlagCard census distance, Nearby trailing distance, Tasks
  banner distance, Tasks section count. (eta and "2d ago" stay in the body face —
  board 09 draws only the distance in mono.)

## RUN COMPLETE — Sky merges

All of 4.1-4.4 built, gated and walked on the 17e. Report: `BUILD_REPORT.md`.
Copy for ratification: `../COPY_LEDGER.md` §"Prompt 04".

Final gates: typecheck clean · lint **0 errors / 82 warnings** (baseline) ·
jest **236 suites / 3447 passed / 32 todo / 0 failed**.

Commits `427e2d9 · 0d1a712 · 5ba89ca · 8b0b871 · 218512d · f992b7b · eb5f6c1 · 1425214`.
Rollback: `git revert --no-commit fefcffc..design/gsp-04-flagcard-2026-08-21`.

## FOUR THINGS THE DEVICE CAUGHT THAT THE GATES COULD NOT
1. `formatDistance` joins value and unit with U+00A0; in a mono face that is a
   full character advance, so every row read "314   m". Fixed by `MonoDistance`
   (value in mono, unit and joiner in the surrounding face).
2. `variant="mono"` caps at 1.4 while `body` is uncapped, so OUTSIDE a content
   TypeBlock the numeral shrank ~40% away from its own sentence at AXL. The card
   density had a block; the row density did not. Both do now; the Tasks banner
   (chrome, caps 1.6) states its cap explicitly.
3. The card header's `flexWrap` + 100% flex basis did NOT wrap on device even
   though the styles resolve correctly (probed, not assumed). The row density
   does wrap with the same shape. **Unexplained** — so the card states the
   recomposition as a column of two rows rather than depending on it.
4. The ⋯ sheet's rows had no horizontal gutter, so the icon sat flush to the
   screen edge while the sheet title sat 16pt in.

## Two things a successor must not undo
- Nearby passes `clampDescription={false}`. Phase 0 item 0.2 uncapped that
  description on purpose (T4/D2); the card density's 3-line rule must not put
  the clip back.
- The Tasks lead verb's fill is assigned by POSITION, not on the `verify`
  descriptor. Declaring it per-verb leaves an already-verified card with zero
  filled controls.

## Open for Sky (detail in BUILD_REPORT §9)
1. `9 . 9 km` — JetBrains Mono's period is a full advance. A consequence of
   §T1/Q21, not a slip; the app's coordinates already read this way. Your call.
2. "Mark resolved" vs "Resolved" — banked, with the exact edit written out.
3. "Select multiple" is two taps deep now — recorded as an honest cost.
4. Three new strings need your word: `Task tools`, `More task tools`, the ⋯ hint.

## Sim state
- iPhone 17e booted, final Release binary installed, **light + medium** (restored).
