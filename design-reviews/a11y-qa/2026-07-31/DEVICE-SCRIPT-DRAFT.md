# DEVICE SCRIPT — DRAFT (A11y-QA 2026-07-31, Phase A)

The honest last mile: what only Sky's hands on real hardware can verify. Draft = Phase A's new rows + the consolidated standing lists. Phase B finalizes it after fixes land (some rows below flip from "confirm the bug" to "confirm the fix").

**Settings used per section:** VO = VoiceOver on · AX5 = Dynamic Type at the largest accessibility size · RM = Reduce Motion on · RT = Reduce Transparency on · KB = external keyboard (web = desktop browser).

## A. New rows from this audit

| # | Surface | Setting | What to check | PASS | FAIL |
|---|---|---|---|---|---|
| N-1 | Settings → Notification preferences | VO | Focus each of the 4 toggle rows; double-tap. **Expect (bug): announces as switch, double-tap does nothing** (A11Y-212). After Phase B: toggling works + state re-announces | ☐ | ☐ |
| N-2 | Map → zero-results filter card | VO | Swipe into the card: can you reach "Reset all filters" and the per-filter chips as separate stops? (Bug: one flattened alert, A11Y-213) | ☐ | ☐ |
| N-3 | Legend (map ⓘ) | VO | Traverse the legend: is "Close legend" reachable? Does the card shell take focus as one giant unnamed element? (SR-072/A11Y-214) | ☐ | ☐ |
| N-4 | My Watched rows | VO | Per row: are "Show on map" AND "Stop watching" individually reachable? (A11Y-214; same check on My Reports / Activity rows) | ☐ | ☐ |
| N-5 | Home search | VO | After typing, is "Clear search" reachable and comfortably tappable? (SR-040 + 36×36, A11Y-214/223) | ☐ | ☐ |
| N-6 | Any 5 modals lacking focus-in (e.g. About, Help, Saved Places, Achievements, My Reports) | VO | On open: where does the cursor land — inside on the title, or stranded behind? (A11Y-201; house doctrine says stranded) | ☐ | ☐ |
| N-7 | Map → List (Nearby) — both manual open AND the VO auto-open | VO | On present: does the cursor land on the sheet title? On close: does it return to the List button? (A11Y-202 + D-B13/D-B17) | ☐ | ☐ |
| N-8 | Sign-in | VO | Type a bad email, submit. Is the red validation row spoken? (A11Y-203 — expect silence pre-fix) | ☐ | ☐ |
| N-9 | Map filters | VO | Apply a category/severity filter with results >0: do you hear the result count, or only the filter name? (A11Y-204) | ☐ | ☐ |
| N-10 | Saved Places → Add · Filter Presets → save/rename · Flag detail → comment box | keyboard up | Does the iOS keyboard cover the input you're typing in? (A11Y-228) | ☐ | ☐ |
| N-11 | Flag with 3+ photos → lightbox | any | Is there any non-swipe way to reach photo 2? (A11Y-221 — expect no pre-fix) | ☐ | ☐ |
| N-12 | Guest: fill a report → tap "Sign in" → authenticate | any | Is the draft still there? (A11Y-226 — expect gone pre-fix) | ☐ | ☐ |
| N-13 | Dark mode: Nearby active chips · Report severity pills · My Reports sort chips · own comment bubbles · Home retry | dark | Eyeball-confirm the measured 3.42:1 legibility complaints are real on hardware (A11Y-229) — the numbers already rule; this row is for Sky's taste on the fix candidates | ☐ | ☐ |
| N-14 | Tasks → long-press map report path | VO | After submitting a report opened via map long-press, where does the cursor land on close? (A11Y-208) | ☐ | ☐ |
| N-15 | Web (desktop): Tasks list | KB | Tab to a row scrolled beneath the sticky chrome pane — does focus scroll it into clear view or under the pane? (lens-7a note) | ☐ | ☐ |
| N-16 | Web: any page | KB | Escape closes each open modal; Tab stays trapped inside; focus ring visible on every control (verified in code; 2-minute confirm) | ☐ | ☐ |

## B. The standing lists (inherited, still owed — run with this script)

- **D-B6 ⛔ THE BLOCKING GATE**: Help + About close ✕ at 1.0×/1.3×/AX5 — a clip upgrades SR-099 to BLOCKING. Merge/Phase-3-complete stays forbidden until this passes (§SKY-3h conditional).
- **D-B1…D-B21** (dismissal census · G5 focus return incl. D-B11 placement, D-B14 UIKit race, D-B15 report-submit handoff · Phase-3 rows: modal-over-modal, AX5 secondaryRow, composite comment labels, end-to-end report).
- **D-A1…D-A13** (nutrition-label: AX5 walks D-A1..A5 · unlabeled legend shell D-A6 · rotor headings D-A8 · **D-A9 RM native camera jump** · RT D-A10/A11 · DWC severity D-A12 · announce utterances D-A13).
- **R2-D0…R2-D18** · **device-tune consolidated 20 rows** (qa-reports/2026-07-26 …§8) · **fable ④** (EXIF on-device · L6-04 Tasks-card VO · L6-19) · the **10-line smoke script** (line 4 = first anonymous report end-to-end = first prod-write proof).
- Run-2/Run-3 walk rows: ToS three-entry walk · Unhide flow (incl. "no longer available" + airplane mode) · View-guidelines path · Privacy screen walk (incl. sign-in cover's separate mount) · grabber on real glass at AX5 · owner photo takedown 404s · guest cold walk.

**Ordering suggestion for one sitting (~45 min):** D-B6 first (it gates everything) → N-1..N-9 (VO pass, one journey) → AX5 block (D-A1..A5 + N-13's surfaces) → RM/RT block (D-A9..A11) → keyboard/web block (N-15/16) → the smoke script.
