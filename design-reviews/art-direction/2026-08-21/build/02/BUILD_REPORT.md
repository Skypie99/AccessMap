# BUILD REPORT — Prompt 02 · Phase 1b

**FlagDetail re-ranked, the sheet material re-arbitrated, the mission statement in the product.**
Flagstone art-direction build series, Direction 1 "Ground · Stone · Path" · 2026-08-21 · iPhone 17e sim-release.

---

## 1. Branch

| | |
|---|---|
| Branch | `design/gsp-02-flagdetail-2026-08-21` |
| Base | `2c631e7a0ae7796d5e65ec18d6748bd110e5663a` — `main`, with Phase 0 and Phase 1a already merged |
| `main` | untouched. Five commits sit on the branch; you merge. |
| Handshake | tree clean of tracked changes; three worktrees under `.claude/worktrees/` all stale (Aug 19–20, detached, nothing modified today); last commit on `main` was your own Phase 0/1a merge record. |

Rollback, whole prompt, one line:

```bash
git -C ~/AccessMap revert --no-edit 22c88e3^..359179e
```

## 2. Gates — measured, never quoted

| Gate | Baseline (at base SHA, before the first edit) | Final | Verdict |
|---|---|---|---|
| `npm run typecheck` | 0 errors | 0 errors | holds |
| `npx jest --ci -w 3` | **232 suites · 3370 passed · 32 todo · 0 failed** | **233 suites · 3376 passed · 32 todo · 0 failed** | +1 suite (`mission.guard`), +6 tests, **0 lost** |
| `npm run lint` | **0 errors · 82 warnings** | **0 errors · 82 warnings** | holds exactly |
| Arbiter | — | `gsp-bulk-stacks.json` → **exit 0, every pair PASS** | see §5 |

39 files, 2871 insertions / 643 deletions. The known `ReportFlagModal` rate-limit flake did not appear in any run.

## 3. The five commits

| # | SHA | What |
|---|---|---|
| 2.2a | `22c88e3` | The dense bulk floors + `BULK_FLOOR_CANDIDATE`, arbitrated |
| 2.2b | `087c8ae` | `ScreenStage strength`, and Terms/Privacy onto flat surface (rule S3) |
| 2.1 | `0d6d2ce` | The FlagDetail re-rank (board 03) + D13, D14, D15 |
| 2.3 | `498d754` | The mission statement (Q11) |
| 2.4 | `359179e` | What the simulator changed — see §6 |

---

## 4. §2.1 — the re-rank

The sheet reads in the board's order now: header block (stripe · title · census · meaning) → description → one quiet meta paragraph → photos **only when there are photos** → one filled verb → one ghost segmented control → a More row of equal circles → comments → the abuse path as a sentence.

**Q2 = C** shipped as one prop. `primaryIntent: 'triage' | 'read'`, default `'read'`; `TasksScreen` passes `'triage'`. From the queue the primary is **Verify** and the siblings pin to the sheet's foot; from the map or Profile the primary is **Directions** and the three community verbs sit under a **Community check** label. `primaryIsVerify` also tests `canVerify`, so a flag that cannot be verified falls back to the reader's verb rather than drawing a filled button that is not offered.

**Q16 unchanged.** No "block it" instruction arrived in this window, so owner self-verify/resolve/reject stays exactly as shipped. D27 remains your decision.

**Q17 shipped.** The raw coordinates are no longer printed. The copy path survives in full as a labelled "Copy coordinates" link with the icon as its accessory — a real 44pt box on both axes, which is a better answer to SW-25 than the width floor it replaces.

**Nothing spoken was lost.** The severity pill and the status pill each carried a composite label; both are joined into the census line's accessible name, so VoiceOver hears the same sentence it heard before. The anon badge's "Reported anonymously" is now the meta paragraph's attribution clause. The visible meta line is compact ("2d ago", "876 m away", "11 min walk"); the spoken one keeps the full timestamp and `speakDistance`, because `formatDistance` renders "m" and "km" and a screen reader reads those as letters.

**`distanceKm` is passed IN.** This sheet holds no location permission and does not acquire one to decorate a meta line; the three call sites pass what they already know, and the line omits the segment when they do not.

Also landed: **D13** (edit-form category chips were ~28pt), **D14** (two multiline inputs hard-capped their own growth inside a sheet that scrolls), **D15** (the "after" photo's own alt text was discarded by the before/after summary — the one image whose job is showing what changed).

### Two extra C1/D7 fills, found by strengthening a guard

`brandInkAA` listed three style names. Rewritten to assert the RULE class-wide — *no style block in this file fills themed `brand`* — it immediately found two more: `commentSendBtn` and `categoryChipActive`, both white labels at 13pt bold on themed `brand`, **3.42:1 in dark**, both with a pressed state already on `ctaFillPressed` (so the press was crossing the palette boundary, the exact tell D2b recorded). Light mode is byte-unchanged at both sites because light `brand` **is** `#1466E0`. **`MapScreen`'s filter panel wears the same `categoryChipActive` pattern and is Prompt 03's to align** — flagged, not touched.

---

## 5. §2.2 — the material, and the floor the device set

### The arbiter

`build/02/gsp-bulk-stacks.json` → `build/02/gsp-bulk-arbiter.txt`, **exit 0, zero FAIL**. Two new pairings for the bulk tier (`bulkDense`, `bulkLiteDense`) plus a segment-cell stack, measured over the saturated tokens that were seen ghosting — `severity[2]` #F0A030, `ctaFill` #1466E0, the dark card text #F5F5F5 — on top of the shipped chaotic-backdrop set. Every ink that lands on the sheet is paired, not just the count label the 2026-07-03 set carried:

| Ink | light | dark |
|---|---|---|
| `textStrong` — title, description | 14.90:1 | 16.25:1 |
| `text` — meta values | 11.83:1 | 14.46:1 |
| `inkGlassMuted` — census, meta, report sentence | 8.27:1 | 9.49:1 |
| `inkSelect` — segment cells, Copy coordinates, More labels | 6.55:1 | 11.18:1 |
| `inkSelect` on a segment cell over the worst backdrop | **5.22:1** (worst pair) | 7.80:1 |
| white on `ctaFill` — the one filled verb | 5.24:1 | 5.24:1 |

### Two corrected premises

**1. FlagDetail never rendered the floor the defect row named.** It passes `forceEngineered`, so it draws the `*Lite` micro-gradient. D8's 0.85 `glassBulkFloor` is the *Legend / Nearby / About / Help / Feedback / Sheet-primitive* path. FlagDetail's ghosting came from `glassBulkLite1` — 0.90 light, 0.92 dark. The dense candidate had to move **both** pairs; moving only the floor would have shipped a green build that changed nothing on the screen the prompt is about.

**2. The plan's dark candidate was thinner than what already ships.** 0.90 measures a 1.279:1 ghost against the Tasks card's `#f5f5f5`; the shipped engineered stop 0.92 measures 1.206:1. Applied literally to the engineered path it would have **deepened D2** — "the single worst legibility moment in the app" — with every gate green.

### The floor the device set

Built at the ratified target first. The 17e rejected it: "Very steep sidewalk", "9.9 km · 2d ago" and a whole Verify/Resolved/Reject/Details row were still legible under the sheet. Rule S2 asks for the value that stops **any** saturated token reading through and calls 0.92/0.90 a *target*, "whichever the arbiter and the device prefer".

Measured on the captures themselves, on the band where the Tasks list ghosts through the sheet's lower half:

| Arm | light ghost | reading |
|---|---|---|
| shipped (`main`) | 1.092:1 at the 0.90 stop — and **13.9:1 in dark**, fully legible | the defect |
| plan target 0.92 / 0.90 | **1.092:1** | still readable — rejected |
| **dense 0.97 / 0.975** (shipped default) | **1.035:1** | at the threshold |
| blur40 | **1.019:1** | letterforms dissolved |

Dark runs one step denser (0.975) than light (0.97). That asymmetry is measured, not taste: light text under a dark floor bleeds more than dark text under a light one, which is D2's prose finding in numbers.

Evidence: `after/_cmp_ghosting_light.png`, `after/_cmp_ghosting_dark.png`.

**The Legend, measured the same way** (the callout's blue "Open details" bleeding through, §15's third sighting): blue-minus-red **20 → 4**, contrast **1.123:1 → 1.020:1**. The blob is gone. `after/17e_light_m_C5_legend.png`.

### Flipping the A/B for your device build

One word in `src/theme.ts` (line 85):

```bash
sed -i '' "s/'dense' as BulkFloorCandidate/'blur40' as BulkFloorCandidate/" ~/AccessMap/src/theme.ts
```

Then rebuild. `'shipped'` is the control arm and is byte-identical to `main`. **Both arms were BUILT and captured, not just written** — `after/_candidate_blur40_light_m.png` is the blur40 sheet on the 17e.

| | `dense` (default) | `blur40` |
|---|---|---|
| how it works | raises the floor / engineered stops until nothing shows through | drops `forceEngineered` on FlagDetail and blurs at 40 |
| ghost | 1.035:1 | 1.019:1 — the blur destroys the letterforms rather than hiding them |
| the cost | the bulk tier is now nearly opaque; the "liquid glass" reads as paper | the sheet is no longer white — it tints with whatever is beneath — and blur has a real GPU cost on a full-height sheet |
| reach | every bulk sheet | every bulk sheet; FlagDetail additionally leaves the engineered path |

Whichever you pick, **the loser is deleted in a cleanup commit** — the C-lite precedent. The flag lives in `theme.ts` and is read by the bulk recipe's *inputs*, so `GlassSurface.tsx` is untouched, as PROTECT requires, and no call site was edited to carry it.

### The stage's volume knob (S3)

`ScreenStage` gained `strength` (0–1, default 1), multiplying the pool alphas only — implemented as SVG `stopOpacity`, so `strength={1}` is byte-identical to before the prop existed and every tab screen is unchanged without being edited. Tabs 1.0 · Resources and How to help **0.6** · Terms and Privacy **0**.

Measured on Resources, sampling the two pool centres: the pools land at **exactly 0.6×** their previous contribution (pool B's red channel: −151 → −90.6 predicted, −92 measured).

**F9, as asked:** the Terms/Privacy body ink was `inkOnStage` on the raw stage — **4.83:1 light** (the declared grain-worst point) / **6.85:1 dark**. On the flat page it reads **6.77:1 / 7.15:1**. Both passed before, both pass better now, so nothing needed re-arbitrating; recorded because the plan asked for the number. Sampling the Terms body background: **(245,248,253) / (243,246,252) / (164,190,231) → (255,255,255) everywhere.** That (164,190,231) was one of the two blue blotches the critic named.

**About was named in the plan as a stage-mounting sheet and is not one** — it is a bulk-glass card with no `ScreenStage`. Nothing to turn down there.

---

## 6. §2.3 — the mission statement

First section on About, under the existing tracked-caps style, before the how, because it is the why. Exported once from `copy.ts` as `MISSION_STATEMENT`; the guest Profile reads the same constant in Prompt 06.

Byte-verified against the ratified text in `design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md`: **228 characters, ASCII only, straight apostrophe, no em dash.** `src/__tests__/mission.guard.test.ts` fails on a smart quote as readily as on a rewrite, because a typographic substitution is still somebody editing your words.

`after/17e_light_m_C15_about_mission.png` shows it live — and shows the thing you need to decide (§8, W-11).

---

## 7. The simulator: what it changed that the gates could not see

Four defects, all with green gates:

1. **The title rendered at zero height.** `styles.title` carried `flex: 1` — correct while the title was a row child beside the close button, wrong the moment it became a column child of the header block, where flex sized it on the column's content-driven height. The sheet shipped a census line and a meaning sentence under an invisible title, and typecheck, 232 suites and lint all passed over it.
2. **The floor missed** at the plan's ratified target — §5.
3. **A lone fifth More-row item** stretched to the full width and centred itself. Fixed basis, no grow: a predictable 4-up, the fifth wrapping to the left.
4. **"Flag as wrong" spanned the cluster's full width**, which read as a fourth segment cell — the §SKY-3c collapse arrived at by layout rather than by wording. It is a pill now.

Plus one deliberate polish: the body gained enough bottom padding to scroll clear of the pinned foot. X4 banked that overlap as "scrollable, not clipped" and it still is — but a row cut in half at the moment you stop scrolling reads as clipped.

## 8. The walk — light + dark, medium + accessibility-extra-large

Sim-release on the 17e (`9C9D3ED6…`), `Build Succeeded` in `build.log`, fresh `main.jsbundle` each time. Location pre-granted. **Production law honoured: signed in as your real account, and no write flow was ever completed — no Verify, Resolved, Reject, Delete, Flag as wrong, Send or Report was pressed.**

| Capture | Verdict |
|---|---|
| `17e_light_m_C3_flagdetail_triage.png` | board 03 **A**: stripe · title · census · meaning, description second, one quiet meta line, one filled Verify, 4-up More row, pinned Resolved \| Reject |
| `…_triage_scrolled.png` | comments, composer and the abuse sentence all clear the pinned foot |
| `17e_dark_m_C3_flagdetail_triage.png` | D2's ghosting gone |
| `17e_light_axl_C3_flagdetail_triage.png`, `17e_dark_axl_…` | header block caps at 1.6 and keeps its order; **the segmented cells stack** (F4); nothing clips; the sheet scrolls |
| `17e_light_m_C3_flagdetail_read.png` | board 03 **B**: Directions is the one filled verb, "COMMUNITY CHECK" labels the three-cell control, More row is Map · Share · History · Watch |
| `17e_light_m_C5_legend.png` | the callout's blue no longer bleeds through |
| `17e_light_m_B5_terms.png` | body on flat white; the pools are gone |
| `17e_light_m_C15_about_mission.png` | the mission section is present |
| `17e_light_m_C17_resources.png` | pools at 0.6× |
| `_candidate_blur40_light_m.png` | the other arm of the A/B, built and captured |

**VoiceOver contract, verified by the guards rather than by claim:** `focusOnOpen.guard` green (focus lands on the title — `titleRef` is still on the title `AppText`); `dismissalStandard.guard` **laws B, B2 and J pass unchanged** (escape closes, the handler is on the containment View not the `<Modal>`, focus return is wired end to end — no `onClose` / `onAccessibilityEscape` / focus-return site was moved); `reportControl.guard` green (the abuse control is still a labelled `button`, reachable by every user, single-sourced from `copy.ts`, carrying no hint). `sheetPull`, `brandInkAA`, `hitTargetFrame` green. **103 tests across those six suites.**

### One acceptance item NOT met, and why

> "Legend **and the filter panel**: the callout's blue no longer bleeds through."

The Legend is fixed and measured. **The filter panel is not, and cannot be by this prompt.** It is `variant="row"` with the crystal `liteColors` (`MapScreen.tsx:1907`, `:1965`) — row glass at 0.70/0.60, the tier that carries the FlagCards. The dense **bulk** floor does not reach it, and raising row glass is a different decision that belongs with the card family in Prompt 04. Current state captured as `17e_light_m_A6_map_filters.png`. Routed, not silently dropped.

---

## 9. Guards — nine re-pinned, one added, none deleted

| Guard | Why it tripped, and what it says now |
|---|---|
| `bp10SeverityGrammarGuards` | the severity grammar moved from a pill to the census line (C2: the colour appears once, and it is the stripe). "of 5" still pinned, now through `severityA11y` joined with `statusA11y` |
| `oneNameOneThing` | the anon badge became the meta sentence's attribution clause. Three cases, three strings, unchanged |
| `disputeControl` | the cluster replaced the `actionRow`. **Strengthened**: the pill and Report are now asserted to be in *different containers*, and the dispute is asserted *not* to be one of the verdict cells |
| `brandInkAA` | **Strengthened** from three named sites to the class-wide rule — which is what found the two extra fills |
| `inertControlVisual` | style names moved with the re-rank; the rule is identical and all three surviving triage controls still swap in a spinner |
| `bp11PressVocabGuards` | same fill-swap dialect, renamed carriers, **plus the three controls the re-rank introduced** so the file's press vocabulary stays whole |
| `hitTargetFrame` | SW-25's answer used to be a width floor on a small control; it is now a control that is not small. **Both axes pinned** — strictly more than before |
| `webResilience` | the copy control's anchor moved with it; the rule (the copy path goes through the tested handler, never an inline `Share.share`) is untouched |
| `MapScreen.detail` | the mount window widened for the new `distanceKm` prop; the five props it is about are unchanged |
| **`mission.guard` (NEW)** | pins the mission statement character for character, and pins the "AccessMap" decision open |

---

## 10. DECISIONS FOR SKY

**D-1 · The bulk-sheet material — the one that needs your eyes.** `dense` is the default; `blur40` is built and captured. Both kill the ghosting; they cost different things (§5). This is a phone decision, not a screenshot decision.

**D-2 · The mission statement says "AccessMap" in an app called Flagstone.** About now reads "WHY FLAGSTONE" and then a sentence naming AccessMap, one line apart — see `after/17e_light_m_C15_about_mission.png`. Shipped verbatim as instructed, and deliberately not touched by the rename sweep, because ratified copy is yours. If it should follow the rename: edit `MISSION_STATEMENT` in `src/lib/copy.ts` and the matching `RATIFIED` line in `src/__tests__/mission.guard.test.ts`; both surfaces follow.

**D-3 · "Report it".** Board 03 writes the abuse sentence as *"Something wrong with this report? **Report it**"*. It ships as *"…? **Report**"*. Making the visible word "Report it" requires the control's accessible NAME to become "Report it" too (WCAG 2.5.3 — voice control says what it sees), and that name is your §SKY-3c word, which RAILS 6 forbids a builder editing. One line in `copy.ts` takes the board's wording, and everything follows. Full detail in the COPY_LEDGER, W-10.

**D-4 · The COPY_LEDGER.** Seven new strings (W-03…W-09) as placeholders, plus the two decisions above. Nothing merges until you ratify.

**D-5 · "Resolved" vs "Mark resolved".** The board draws the segment cell as "Mark resolved"; the prompt says use "Resolved" unless you ratify the change, so the shipped word stands.

**D-6 · The filter panel** (§8) — row glass, routed to Prompt 04.

**D-7 · `MapScreen`'s `categoryChipActive`** wears the same themed-`brand` fill this build fixed on the sheet. Prompt 03's to align.

## 11. NEEDS-DEVICE

1. **The floor decision (D-1).** The simulator's blur is not the device's; `GLASS.md` has said so since Deep Field shipped. The ghost numbers here are from sim-release captures, which is the conservative direction for `blur40` (real blur is stronger) and neutral for `dense` (opacity is opacity). Judge both arms on hardware.
2. **VoiceOver, spoken.** The contract is guard-verified in source; the *sentences* — the census line reading "severity 3 of 5, Moderate, status Open", the meta paragraph reading its full timestamp and unabbreviated distance — want one real VoiceOver pass.
3. **The pinned foot at AX5+.** Verified at accessibility-extra-large in both modes; the larger steps were not walked.

## 12. Residuals

- The body still scrolls *under* the pinned foot in triage mode. X4 banked that as designed; it now has room to scroll clear, but it is a scroll, not a layout guarantee.
- `pendingPhotoInput` is an empty style key, kept with a comment rather than deleted so D14's reason stays where the next reader will look.
- The map's first frame still opens without flags in view (Prompt 03, M2) — which is why the read-mode sheet was reached through the Recently-viewed chip and the callout rather than a cold map tap.

**STOP. Sky merges.**
