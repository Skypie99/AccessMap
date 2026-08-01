# DEVICE SCRIPT — A11Y QA 2026-07-31 (FINAL)

**This is a deliverable, not an afterthought.** Everything below is a claim that jest *cannot* prove, because react-native-web stubs `setAccessibilityFocus`, no-ops `announceForAccessibility`, and drops `accessibilityViewIsModal` and `onAccessibilityEscape` entirely. Green tests are not green devices. These rows are the rest of the truth.

**Settings shorthand:** VO = VoiceOver on · AX5 = Dynamic Type at the largest accessibility size · RM = Reduce Motion on · RT = Reduce Transparency on · KB = external keyboard (web = desktop browser).

**Post-fix rows flipped meaning.** At audit time many of these read "confirm the bug". They now read **"confirm the fix"** — a FAIL is a regression, not a known issue.

---

## ⛔ RUN THIS FIRST — it gates everything

| # | Surface | Setting | What to check | PASS | FAIL |
|---|---|---|---|---|---|
| **D-B6** | Help, then About | 1.0× / 1.3× / AX5 | The close ✕ stays fully on-screen and tappable at all three sizes. | ☐ | ☐ |

> **DEFERRED BY SKY, 2026-07-31.** She merged without this row, which is her call to make on her own gate. Kept at the top because it is still the highest-value two minutes in this document, not because it blocks anything now. The underlying defect (SR-064/099) was fixed in an earlier train — this row verifies that fix at AX5. If it did regress, a sighted user at the largest text size could not close Help or About by the ✕, though the back/escape gesture still dismisses both. **Recommended before App Store submission**, where an AX5 reviewer walk is plausible.

---

## A. Confirm the fixes (this train)

### A1 · One VoiceOver journey (~15 min, do these in order)

| # | Surface | What to check | PASS | FAIL |
|---|---|---|---|---|
| N-1 | Settings → Push notification types | Focus each of the 4 toggle rows and **double-tap**. Each must actually flip, and re-announce its new state. *(A11Y-212 — the Blocker. Before today, double-tap did nothing on all four.)* | ☐ | ☐ |
| N-8 | Sign in | Type a bad email, submit. The red validation row must be **spoken**, not just drawn. Repeat with a 3-character password. *(A11Y-203)* | ☐ | ☐ |
| N-6 | Open About, Help, Saved Places, Achievements, My Reports | On each open, the cursor must land **inside, on the title** — never stranded on the control behind. *(A11Y-201, 29 surfaces changed; these 5 are the spot-check)* | ☐ | ☐ |
| N-7 | Map → List (Nearby), **both** the manual open and the automatic one VO gets | On present: cursor lands on "Nearby flags". On close: returns to the List button. *(A11Y-202 + D-B13/D-B17)* | ☐ | ☐ |
| N-2 | Map → filter until zero results | Swipe **into** the recovery card: the per-filter chips and "Reset all filters" must each be their own stop. *(A11Y-213 — PROTECT-2; this was one flat blob)* | ☐ | ☐ |
| N-3 | Map → ⓘ Legend | Traverse the card. "Close legend" must be reachable, and the card shell must **not** grab focus as one giant unnamed element. *(A11Y-214 / SR-072)* | ☐ | ☐ |
| N-4 | Profile → Watched Flags, then My Reports, then Recent Activity | Per row: the summary, "Show on map", and "Stop watching" must be **three separate stops**. *(A11Y-214)* | ☐ | ☐ |
| N-5 | Home → type a search | "Clear search" must be reachable **and** comfortably tappable. *(SR-040 + A11Y-223: was unreachable AND 36×36)* | ☐ | ☐ |
| N-9 | Map → apply a category filter with results > 0 | You must hear the **count** ("12 of 45 flags shown"), not just the filter name. *(A11Y-204 — iOS heard nothing here)* | ☐ | ☐ |
| N-14 | Map → long-press to report → submit or cancel | On close, the cursor must land on the **Report FAB**, not nowhere. *(A11Y-208)* | ☐ | ☐ |
| N-17 | Flag detail → Watch, then Unwatch | Each press must **say** what happened. The label flipping is not enough — VO does not re-read a focused button. *(A11Y-206)* | ☐ | ☐ |
| N-18 | Profile → Saved Places → save a place | The save must be announced. Then force a failure (airplane mode) — the error must be **spoken and visible**. *(A11Y-207)* | ☐ | ☐ |
| N-19 | Home → any nearby row | The distance must be spoken in **words** — "297 meters away", never "297 em". *(SR-042)* | ☐ | ☐ |

### A2 · Voice Control (~3 min) — a cohort nothing else in this checklist covers

Turn on **Settings → Accessibility → Voice Control**, then *say* what you see:

| # | Say | Expect | PASS | FAIL |
|---|---|---|---|---|
| N-20 | "Tap Try again" (on any error card) | It activates. *(A11Y-215 — 16 controls had names that did not contain their visible text, so these commands did nothing)* | ☐ | ☐ |
| N-21 | "Tap Help and FAQ" · "Tap Delete Account" · "Tap Browse without an account" | Each activates. | ☐ | ☐ |

### A3 · Keyboard and touch (no VO needed)

| # | Surface | Setting | What to check | PASS | FAIL |
|---|---|---|---|---|---|
| N-10 | Saved Places → Add · Filter Presets → save/rename · Flag detail → comment box | keyboard up | The keyboard must **not** cover the field you are typing in. *(A11Y-228 — two of these autoFocus, so it happened instantly)* | ☐ | ☐ |
| N-11 | A flag with 3+ photos → open the lightbox | any | Reach photo 2 **without swiping** — Prev/Next chips. Ends disable rather than vanish. *(A11Y-221)* | ☐ | ☐ |
| N-12 | Guest: fill a report (category, severity, description, a photo) → tap "Sign in" → authenticate → reopen Report | any | **The draft is still there.** *(A11Y-226 — this used to wipe everything)* | ☐ | ☐ |
| N-22 | My Reports / Watched / Recent Activity / My Feedback | any | Each header has a **Refresh** button that works without pulling down. *(A11Y-222)* | ☐ | ☐ |

### A4 · Dark mode, RM, RT

| # | Surface | Setting | What to check | PASS | FAIL |
|---|---|---|---|---|---|
| N-13 | Nearby active chips · Report severity pills · My Reports sort chips · own comment bubbles · Home retry | **dark** | The numbers already rule these AA (arbiter exit 0) — this row is **Sky's taste**: does the slightly deeper blue still look right? *(A11Y-229)* | ☐ | ☐ |
| N-23 | Other people's comment timestamps | dark **and** light | Legible, not washed out. *(A11Y-230 — 3.69:1 in dark before)* | ☐ | ☐ |
| N-24 | The submit CTA + Home report pill | dark | **Deliberately unchanged** (they pass as large text). If they now look mismatched next to the swapped chips, that is a **mockup-gate decision** for you, not a bug. | ☐ | ☐ |
| **D-A9** | Map camera | **RM on** | Recentre/fly-to must **jump**, never glide. *The one RM claim jest cannot prove* — `duration: 0` may read as falsy. | ☐ | ☐ |
| D-A10/11 | Glass surfaces | **RT on** | Blur drops to the opaque fill. | ☐ | ☐ |
| N-25 | Web (desktop) | RT on in OS | Blur drops on the tab bar / sign-in / onboarding / drawer. *(A11Y-232 — new; web had no RT path at all)* | ☐ | ☐ |

### A5 · Web / keyboard-only (desktop browser)

| # | What to check | PASS | FAIL |
|---|---|---|---|
| N-16 | Escape closes each modal · Tab stays trapped inside · focus ring visible on every control | ☐ | ☐ |
| N-15 | Tab to a Tasks row scrolled beneath the sticky pane — does focus scroll it into **clear** view? | ☐ | ☐ |
| N-26 | Press Tab once on a fresh page load: **"Skip to content"** should appear. *(L3-1)* | ☐ | ☐ |
| N-27 | With a web screen reader (VO in Safari / NVDA): active filter chips must announce **pressed/selected** state. *(A11Y-216 — silent on web before)* | ☐ | ☐ |
| N-28 | Web SR: traversal must not stumble over decorative icons, chevrons, or the tap-anywhere photo backdrop. *(A11Y-234 — 108 sites were leaking to web only)* | ☐ | ☐ |

---

## B. The standing lists (inherited — still owed)

- **D-B1…D-B21** — dismissal census · G5 focus return (incl. D-B11 placement, D-B14 UIKit race, D-B15 report-submit handoff) · Phase-3 rows.
- **D-A1…D-A13** — AX5 walks D-A1..A5 · unlabeled legend shell D-A6 · rotor headings D-A8 · **D-A9** · RT D-A10/A11 · DWC severity D-A12 · announce utterances D-A13.
- **R2-D0…R2-D18** · **device-tune consolidated 20 rows** · **fable ④** (EXIF on-device · L6-04 Tasks-card VO · L6-19).
- **The 10-line smoke script** — line 4 (first anonymous report end to end) is the first production-write proof.
- Run-2/Run-3 walks: ToS three-entry · Unhide flow incl. airplane mode · View-guidelines path · Privacy screen walk · grabber on real glass at AX5 · owner photo takedown 404s · guest cold walk.

---

## C. Suggested single sitting (~50 min)

1. **D-B6** — it gates the merge. If it clips, stop and tell me.
2. **A1** — the VoiceOver journey, in order (~15 min).
3. **A2** — Voice Control (~3 min). Cheap, and nothing else covers that cohort.
4. **A3** — keyboard/touch (~8 min).
5. **AX5 block** — D-A1..A5 + N-13's surfaces.
6. **RM/RT block** — D-A9 first; it is the one jest cannot reach.
7. **A5** — desktop browser (~8 min).
8. **The smoke script** — ends on a real anonymous report.

**A FAIL on any A-row is a regression in this train's work — send me the row number and I will fix it.** A FAIL on a B-row is pre-existing and already tracked.
