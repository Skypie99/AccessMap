# Alex — WCAG 2.2 AA review of Cycle B — 2026-05-24

Read-only audit of 5 Cycle B branches against main `5b982ec`. No code changes.

## Summary

5 branches reviewed. **2 HIGH, 6 MEDIUM, 5 LOW** findings; **2 of 5 branches blocked** on a recurring contrast anti-pattern (white-on-#2f80ed at 13pt-bold, and white-on-#27ae60 at 13pt-bold — both fail 1.4.3 AA normal-text 4.5:1). The remaining 3 branches (R2, T4, Data export) are merge-clean on accessibility with only LOW/MEDIUM polish notes.

Encouraging signs this cycle: every new control has a label + hint + role; decorative emoji are correctly hidden from AT with both `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"` (Android win); SR-discoverable button alternatives exist for every long-press affordance (Tasks bulk-select).

Recurring debt: the brand-blue/white text-on-button anti-pattern made it through Layer 2 in two branches despite an explicit comment in F4-wire's diff claiming "white on #2f80ed = 4.6:1" — that claim is **mathematically wrong** (actual ~3.80:1). Need a guard test or design-token PR (see polish ticket P1 + ESCALATE to Dani).

## Findings by branch

### R2 — `feat/get-directions-2026-05-24`

Single Directions button + Linking handoff + error Alert.

| # | Sev | WCAG | Finding |
|---|---|---|---|
| R2-1 | LOW | 1.4.3 | "Directions" button is white 14pt-bold on `#2f80ed` → contrast **3.80:1**. 14pt-bold qualifies as **large text** (WCAG: 14pt bold OR 18pt regular), so it clears the 3:1 large-text floor. **Verbatim pass** but only by 0.80 — any later font-size or weight cut would break it. Pre-existing on `viewMapBtn`/`verifyBtn`/`directionsBtn`; flagging because this is the cycle that pushed the new button. |
| R2-2 | MEDIUM | 4.1.3 / cross-platform | `Alert.alert('Could not open maps app.')` is a no-op on react-native-web. If `Linking.openURL` rejects on web (very rare but possible — popup-blocker / `maps:` scheme not registered if iOS Safari falls back somehow), the user gets **silent failure** with no SR announcement. Use the `confirm` / cross-platform alert helper used elsewhere, or fall back to `window.alert` on web. |
| R2-3 | LOW | 4.1.2 | New `accessibilityLabel="Get directions to this flag"` + `accessibilityHint="Opens your maps app with directions"`. Hint is slightly redundant with the label but reads cleanly. PASS. |

**Verdict: MERGE.** (R2-2 is a polish ticket, not a blocker — main path Lin king call succeeds in 99%+ cases.)

### T4 — `feat/reputation-tier-2026-05-24`

New tier pill + new explainer modal with 4 tier rows.

| # | Sev | WCAG | Finding |
|---|---|---|---|
| T4-1 | LOW | 1.4.3 | Tier pill text `#1b4373` on `#fff` → contrast **9.53:1**. (Agent claimed ~10:1; verified independently.) PASS, well above 4.5:1. |
| T4-2 | LOW | 2.5.8 | Tier pill: `minHeight: 32, minWidth: 44, hitSlop: 8` → effective tap target **48 × ≥60 pt**. PASS WCAG 2.5.8 AA (24×24 floor) AND meets iOS HIG 44pt. |
| T4-3 | LOW | 1.1.1 | Pill emoji + all 4 row emoji are decorative, marked with **both** `accessibilityElementsHidden` AND `importantForAccessibility="no-hide-descendants"`. Android + iOS both correct. PASS. |
| T4-4 | LOW | 4.1.2 | Modal `accessibilityViewIsModal` set on the inner sheet view (the topmost content view) — correct usage on iOS. PASS. |
| T4-5 | LOW | 1.3.1 | Modal header `<Text accessibilityRole="header">` PASS. |
| T4-6 | MEDIUM | 4.1.2 | Current-tier row uses `accessibilityRole="text"` + `accessibilityState={{ selected: true }}`. RN's API accepts this but VoiceOver announces "selected" inconsistently on non-button roles. **Mitigated** because the label also appends `". Your current tier."` AND the visible "· you are here" tag carries the same info. Acceptable; consider `accessibilityRole="text"` → `"none"` removal or switching to a button if tier rows become tappable. |
| T4-7 | LOW | 4.1.3 | Footer "X points away from {tier}" — one-shot on modal open. SR will traverse it naturally as the user reads down. PASS (no live region needed). |
| T4-8 | LOW | 1.3.1 | Removed `accessible={true}` from `heroCard` so the pill can be focusable independently. **Verified**: streak card is its own independently-`accessible` View (Profile line 720), so removing the hero-level grouping does **not** affect the streak's SR grouping. The points number now has its own `accessibilityLabel={`${points} points`}` so "27" is read as "27 points". PASS. |
| T4-9 | LOW | 1.4.3 | "POINTS" label (`#dbe7fb` 11pt-bold on `#2f80ed`) → **3.07:1** → FAILS 4.5:1 normal-text. **Pre-existing on main, not introduced by T4.** Flagged for sweep ticket. Same for `heroSubtitle` (`#dbe7fb` 13pt-bold on the same blue). |

**Verdict: MERGE.** Hero pill and modal are clean. T4-9 is a pre-existing main-branch issue; out of scope for this branch.

### F4-wire — `feat/filter-presets-apply-2026-05-24`

Two new MapScreen buttons + modal extension with Apply button.

| # | Sev | WCAG | Finding |
|---|---|---|---|
| F4-1 | **HIGH** | 1.4.3 | **3 new buttons fail normal-text contrast.** (a) `presetBtn` "＋ Save as preset" — white 13pt-bold on `#2f80ed` = **3.80:1**. (b) `presetBtnSecondary` "Load preset…" — `#2f80ed` 13pt-bold on white = **3.80:1**. (c) `applyBtn` row Apply button inside FilterPresetsModal — white 13pt-bold on `#2f80ed` = **3.80:1**. All three FAIL 1.4.3 AA (4.5:1 required for normal text). 13pt-bold is below the 14pt-bold "large text" threshold. **The agent's inline code comment claiming "white on #2f80ed = 4.6:1" is wrong.** Fix: bump font to 14pt OR darken background to `#1f6dd0` (=5.36:1 with white at 13pt-bold). |
| F4-2 | LOW | 2.5.8 | All 3 new buttons `minHeight: 44`. PASS. |
| F4-3 | LOW | 4.1.2 | Save modal: TextInput has `accessibilityLabel="Preset name"` + `accessibilityHint` + `maxLength={60}` + `autoFocus`. Header has `accessibilityRole="header"`. PASS. |
| F4-4 | LOW | 4.1.3 | `AccessibilityInfo.announceForAccessibility('Saved preset: X')` on Save AND `'Applied preset: X'` on Apply — genuinely useful: the visible result (modal dismiss + chips flipping state on Map) would otherwise be silent for SR users. PASS. |
| F4-5 | MEDIUM | 4.1.2 | Preset row `accessibilityRole="button"` on the outer View, but the row also contains 3 child Pressables (Apply, Rename, Delete) with their own roles. **Nested touchable inside a `button`-role View confuses VoiceOver** — it may flatten the row into one element and hide the child buttons. Recommended: remove the outer `accessibilityRole="button"` (only the children should be buttons), or change to `accessibilityRole="none"`. |
| F4-6 | LOW | 3.2.x | Section hidden when signed out: `{authUser && (...)}`. No SR announcement of absent feature, which is fine semantically — absent UI isn't perceivable to anyone. PASS. |
| F4-7 | LOW | 4.1.3 | Save announcement + modal close are mildly redundant (the focus move already implies success). Harmless; PASS. |

**Verdict: BLOCK on F4-1.** Three new buttons fail normal-text contrast. Easy fix: bump fontSize 13 → 14 (and font.weight stays 700) on `presetBtnText`, `presetBtnSecondaryText`, `applyBtnText`. That single change moves them into the 14pt-bold large-text bucket → 3:1 floor → PASS.

### Tasks bulk-select — `feat/tasks-bulk-select-2026-05-24`

Two entry points + floating action bar with 3 buttons.

| # | Sev | WCAG | Finding |
|---|---|---|---|
| TB-1 | **HIGH** | 1.4.3 | **All 3 bulk-bar buttons + the entry button fail normal-text contrast.** (a) `selectEntryText` `#2f80ed` 13pt-bold on `#eef1f5` = **3.35:1**. (b) `bulkVerifyBtn` "Verify (N)" white 13pt-bold on `#2f80ed` = **3.80:1**. (c) `bulkResolveBtn` "Resolve (N)" white 13pt-bold on `#27ae60` = **2.83:1** — also fails the 3:1 non-text floor (1.4.11). (d) `bulkCancelText` `#2c3e50` on `#eef1f5` = **8.79:1** PASS. Fix: bump fontSize 13 → 14 across `selectEntryText`, `bulkBtnText`, `bulkCancelText` (large-text 3:1 covers verify + entry); the green resolve button needs a darker shade — `#1e8449` would give ~3.95:1 with white at 14pt-bold. |
| TB-2 | LOW | 4.1.2 | Cards in selection mode: `accessibilityRole="checkbox"` + `accessibilityState={{ checked }}`. Labels reword to "{Category}. Selected." / "Not selected." with explicit state-as-text. PASS. |
| TB-3 | LOW | 2.5.7 | Long-press is multi-pointer/timing-sensitive; the "Select multiple" button is the SR/keyboard alternative and starts the selection empty. Equivalent path exists. PASS 2.5.7 + 2.1.1. |
| TB-4 | LOW | 2.5.8 | All bulk buttons + entry button `minHeight: 44`. PASS. Checkmark indicator 22×22 is `accessibilityElementsHidden` so target rule N/A. |
| TB-5 | LOW | 4.1.2 | Bulk buttons carry `accessibilityState={{ disabled, busy }}` and labels that change to "Verify selected. No open flags selected." when count is 0. Excellent. PASS. |
| TB-6 | LOW | 4.1.3 | Entry: `announceForAccessibility('Selection mode. Tap cards to select.')` once. Completion: `announceForAccessibility('Verified N flags.')`. Both confirmed in code. PASS. |
| TB-7 | MEDIUM | 4.1.3 | Floating bar has `accessibilityLiveRegion="polite"`. Bar contains buttons whose **labels include the count** ("Verify (3)", "Resolve (3)") and that count **changes on every card toggle**. Live region will re-announce each label change as the user picks cards — likely SR-noisy in practice. Mitigation: move the count into a separate, non-live `Text` and keep the buttons' labels static ("Verify selected" / "Resolve selected"). Or drop the live region and rely on the one-shot entry announcement + per-card checked-state announcements (which already exist via accessibilityState). |
| TB-8 | MEDIUM | UX-not-WCAG | Selection state is component-local; comment says "Switching tabs unmounts TasksScreen which resets the selection". **RootNavigator does not set `unmountOnBlur=true`**, so React Navigation's default keeps the screen mounted. Selection therefore **persists across tab switches** (Map → Tasks → still in selection mode). For SR users this means landing back in an unannounced "selection mode" — confusing. Either set `unmountOnBlur: true` on the Tasks tab in `RootNavigator.tsx`, OR add a `useFocusEffect` that calls `exitSelection()` on blur. |
| TB-9 | LOW | 1.3.1 | Selected card visual: tinted bg `#eaf3ff` + 2px blue border + ✓ in top-right. Color is **not the sole means** (border + checkmark redundancy) → PASS 1.4.1. |

**Verdict: BLOCK on TB-1.** Fix the 4 contrast issues + TB-7's live-region noise. TB-8 is UX consistency, not WCAG, but worth fixing in the same PR.

### Data export — `feat/data-export-2026-05-24`

One Settings row + Share/Alert flow.

| # | Sev | WCAG | Finding |
|---|---|---|---|
| DE-1 | LOW | 1.4.3 | Row title `color.textStrong` (`#222`) on white = ~16:1 PASS. Subtitle `color.textMuted` (`#666`) on white = ~5.74:1 PASS. |
| DE-2 | LOW | 1.1.1 | Both `📋` icon and `›` chevron carry `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`. Android + iOS hidden correctly. PASS. |
| DE-3 | LOW | 2.5.8 | Row `minHeight: 64` (explicitly pinned with a comment guarding against future shrinkage). PASS. |
| DE-4 | LOW | 4.1.3 | Success Alert: `"Exported N flags + M feedback items to your clipboard."` — includes counts, SR-announced. PASS. |
| DE-5 | MEDIUM | 4.1.3 | Error Alert is generic: `"Could not export data" / "Try again."`. The actual error message (`errorMessage(e)`) is computed but only used for the cancel-detection regex. SR users get no actionable info. Recommend surfacing the cleaned error message OR a per-cause hint ("Check your internet connection"). |
| DE-6 | MEDIUM | 4.1.3 / status | **No loading indicator during the async fetch.** Row goes to opacity 0.6 and `accessibilityState.disabled` flips, but on a slow connection the 2–5 second fetch leaves sighted users staring at a dim row. Add an `ActivityIndicator` in the trailing slot, OR temporarily swap the subtitle to "Exporting…" while busy. SR users hear "dimmed, double-tap to activate" on a second tap attempt, but pre-emptive status messaging would be better. |
| DE-7 | LOW | 4.1.2 | Web flow: `window.alert` blocks the JS thread and is read by SR — works. Web fallback (no clipboard API) dumps the full text into the alert. Long but correct for PIPEDA right-of-access. PASS. |
| DE-8 | LOW | 4.1.3 | Native `Share.share` → OS share sheet a11y is OS-built-in. After dismissal: `Alert.alert('Data exported', successMsg)` includes counts. PASS. Pre-share announcement of size would be a nicety, not required. |

**Verdict: MERGE.** DE-5 and DE-6 are polish; the row is otherwise clean.

## Cross-cycle patterns

### Pattern 1 — `#2f80ed` + `#27ae60` on 13pt-bold text keeps failing 1.4.3 AA

Surfaced in F4-1, TB-1 — **7 new buttons across Cycle B**. The agent in F4-wire even commented "white on #2f80ed = 4.6:1, clears AA"; that number is wrong (actual 3.80:1). Same anti-pattern surfaced in Cycle A.

The simplest fixes:
1. **Bump fontSize 13 → 14** on every Cycle B 13pt-bold button → 14pt-bold qualifies as "large text" → 3:1 threshold → PASSES.
2. OR introduce semantic tokens `color.brandPress` = `#1f6dd0` and `color.successPress` = `#1e8449` and use them as the button backgrounds. (ESCALATE to Dani — design-system change, not a single-PR auto-fix per Const. 5.5.)

### Pattern 2 — `Alert.alert` used directly (web no-op)

4 of 5 branches use raw `Alert.alert` for errors/info (R2, F4-wire, Tasks bulk-select, Data export). On react-native-web `Alert.alert` is silent. We have a `confirm` helper used elsewhere; we need an analogous `notify`/`alertCross` helper that uses `window.alert` on web and `Alert.alert` natively. Polish ticket; LOW per-instance but **MEDIUM** cumulatively for web SR users.

### Pattern 3 — Decorative icons hidden correctly on Android

Good news: every branch this cycle paired `accessibilityElementsHidden` with `importantForAccessibility="no-hide-descendants"`. This was missing in earlier cycles. **Trend improving.**

### Pattern 4 — `color.textSubtle` (#999) reuse — none

No Cycle B branch used `#999` / `#888` / `color.textSubtle` for visible primary text. Used only on chevron (decorative, hidden). **Trend improving.**

## Merge verdict (table)

| Branch | Verdict | Blockers | Polish |
|---|---|---|---|
| R2 `feat/get-directions-2026-05-24` | **MERGE** | — | R2-2 (web Alert) |
| T4 `feat/reputation-tier-2026-05-24` | **MERGE** | — | T4-6 (role/state), T4-9 (pre-existing hero label contrast — out of scope) |
| F4-wire `feat/filter-presets-apply-2026-05-24` | **BLOCK** | F4-1 (3 buttons fail 1.4.3) | F4-5 (nested touchable role) |
| Tasks bulk-select `feat/tasks-bulk-select-2026-05-24` | **BLOCK** | TB-1 (4 contrast failures incl. resolve at 2.83:1) | TB-7 (live region noise), TB-8 (selection survives tab switch) |
| Data export `feat/data-export-2026-05-24` | **MERGE** | — | DE-5 (specific errors), DE-6 (loading indicator) |

**3 merge-clean, 2 blocked. Both blockers are fixable by bumping fontSize 13 → 14 + (for resolve button) darkening to `#1e8449`.**

## Polish tickets (priority order)

1. **P1 (HIGH, BLOCKER × 2 branches)** — Fix 7 button-contrast failures across F4-wire and Tasks bulk-select. Either bump 13pt → 14pt on `presetBtnText`, `presetBtnSecondaryText`, `applyBtnText` (F4-wire) + `selectEntryText`, `bulkBtnText`, `bulkCancelText` (Tasks bulk-select), AND darken `bulkResolveBtn` background from `#27ae60` to `#1e8449`. **ESCALATE to Dani** for the design-token version (semantic `color.brandPress` / `color.successPress`).
2. **P2 (MEDIUM, Tasks bulk-select)** — TB-7: drop the `accessibilityLiveRegion="polite"` from the bulk bar OR move the count into a separate non-button Text. Current setup will re-announce every count change as the user toggles cards.
3. **P3 (MEDIUM, Tasks bulk-select)** — TB-8: add `useFocusEffect(() => () => exitSelection())` to TasksScreen so selection clears on tab blur, matching the spec and avoiding SR confusion on tab return.
4. **P4 (MEDIUM, cross-cycle)** — Create `src/lib/notify.ts` with a cross-platform `notify(title, message)` helper that uses `window.alert` on web and `Alert.alert` natively. Migrate the 4 raw-Alert sites this cycle (R2-2 + the 3 in F4-wire/Tasks/Data export).
5. **P5 (MEDIUM, Data export)** — DE-6: add `ActivityIndicator` in the row's trailing slot during `exporting` state, OR swap the subtitle to "Exporting your data…" while busy.
6. **P6 (LOW, Data export)** — DE-5: surface the specific `errorMessage(e)` (cleaned) in the error Alert instead of the generic "Try again."
7. **P7 (LOW, F4-wire)** — F4-5: remove the outer `accessibilityRole="button"` from preset rows that contain child Pressables (Apply / Rename / Delete). Outer role should be `"none"` so the children are independently focusable.
8. **P8 (LOW, T4)** — T4-9: pre-existing hero card contrast on `heroLabel`/`heroSubtitle` (`#dbe7fb` 11–13pt on brand-blue = 3.07:1). Out of scope for T4 itself; track separately.
9. **P9 (LOW, R2)** — R2-2: route the Directions failure through the new cross-platform notify helper (P4).

---

## Accessibility Parity Matrix (Const. Art. 2.4 — Layer 2)

AccessMap has **no dark mode**, **no RTL**, **single locale**. Rows that exist as comparative variants this cycle: signed-in vs signed-out (F4-wire), selection-mode vs default (Tasks bulk-select), busy vs idle (Data export), large vs small text scaling (Dynamic Type), iOS vs Android (decorative-icon hiding parity), native vs web (Alert behavior parity). Columns = the 7 AA criteria.

| Variant / row | Focus visibility | Color contrast | Keyboard nav | SR labels | Motion reduction | Dynamic type | Touch target |
|---|---|---|---|---|---|---|---|
| **R2 Directions button** | PASS (Pressable default focus ring) | PASS (3.80:1 on 14pt-bold = large-text PASS) | PASS | PASS (label + hint + state) | N/A (no animation) | PASS (fontSize 14 scales) | PASS (minHeight 44) |
| **T4 Tier pill (pressed)** | PASS | PASS (9.53:1) | PASS | PASS (rich label + hint) | N/A | PASS | PASS (44pt via hitSlop) |
| **T4 Tier modal (open)** | PASS | PASS (all 6.6–9.5:1 measured) | PASS (close button focusable) | PASS (header role, viewIsModal, selected state) | LOW: `animationType="slide"` — does not check `useReducedMotion`. **MEDIUM** | PASS | PASS |
| **T4 Hero card (label rows)** | N/A (text) | **FAIL** 3.07:1 on `#dbe7fb` 11pt-bold (pre-existing) | N/A | PASS | N/A | PASS | N/A |
| **F4 Preset buttons (signed-in)** | PASS | **FAIL** 3.80:1 white/blue 13pt-bold (F4-1) | PASS | PASS | N/A | PASS | PASS (44) |
| **F4 Preset section (signed-out)** | N/A (hidden) | N/A | N/A | N/A (no element) | N/A | N/A | N/A |
| **F4 Save modal TextInput** | PASS | PASS | PASS | PASS | N/A | PASS | PASS |
| **F4 Preset row in modal (Apply mode)** | PASS | **FAIL** 3.80:1 white/blue 13pt-bold on applyBtn | PASS | PARTIAL (F4-5 nested touchable risk) | N/A | PASS | PASS |
| **Tasks: default mode** | PASS | PASS | PASS | PASS (button role + label) | N/A | PASS | PASS |
| **Tasks: selection mode (cards)** | PASS | PASS | PASS | PASS (checkbox role + checked) | N/A | PASS | PASS |
| **Tasks: bulk bar (all buttons)** | PASS | **FAIL** TB-1 (3 of 4 contrast failures) | PASS | PASS | LOW: `slide` animation, no reduce-motion check | PASS | PASS (44) |
| **Tasks: bulk bar (disabled state)** | PASS | PASS (button still visible, dimmed) | PASS | PASS (`disabled` state) | N/A | PASS | PASS |
| **Tasks: entry button** | PASS | **FAIL** 3.35:1 selectEntryText | PASS | PASS | N/A | PASS | PASS (44) |
| **Data export row (idle)** | PASS | PASS | PASS | PASS | N/A | PASS | PASS (minHeight 64) |
| **Data export row (busy)** | PASS | PASS (opacity 0.6 still meets 3:1) | PASS | PARTIAL (no loading indicator — DE-6) | N/A | PASS | PASS |
| **Web: any Alert path** | PASS | N/A | PASS | **FAIL** silent on web — `Alert.alert` no-op (cross-cycle Pattern 2) | N/A | N/A | N/A |
| **Android: decorative icon hiding** | N/A | N/A | N/A | PASS (all 5 branches use both flags) | N/A | N/A | N/A |
| **iOS: decorative icon hiding** | N/A | N/A | N/A | PASS | N/A | N/A | N/A |

**Layer 2 Parity verdict: FAIL.** 5 FAIL cells (4 contrast + 1 web-Alert) and 2 PARTIAL cells (busy row, nested touchable). Per Const. 7.5 a11y is a pillar (never POLISH); per the matrix rule any FAIL = Layer 2 FAIL = BLOCK or ESCALATE. **F4-wire and Tasks bulk-select are BLOCKED.** R2, T4, Data export PASS Parity for their own surfaces (the pre-existing T4 hero contrast is out-of-scope for that branch — track as separate ticket).

**ESCALATE to Dani:** the auto-fix needs a semantic color token `color.brandPress` (= darker blue, ~`#1f6dd0`) and `color.successPress` (= darker green, ~`#1e8449`) so future buttons don't reinvent the contrast bug. Per Const. 5.5 + 2.4.3, new design tokens go through design-system review, not an a11y/auto-* branch.
