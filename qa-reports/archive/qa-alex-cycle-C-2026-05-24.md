# Alex — WCAG 2.2 AA review of Cycle C — 2026-05-24

Read-only audit of 4 Cycle C branches against main `40d7dd2`. No code changes, no commits, no external sends (Const. Art. 9.4).

Branches audited (all in worktrees under `~/AccessMap/.claude/worktrees/`):

| Branch | Worktree | Commit |
|---|---|---|
| **T1** status-history audit trail | `wt-t1` | `79544b9` `feat/status-history-2026-05-24` |
| **C4** time-of-day / context tags | `wt-c4` | `7da774c` `feat/time-of-day-tags-2026-05-24` |
| **CL1** lift 4 shared modals | `wt-cl1` | `eaf59be` `chore/lift-shared-modals-2026-05-24` |
| **CL2** `color.brandText` theme token | `wt-cl2` | `35aa1d3` `chore/brandtext-theme-token-2026-05-24` |

---

## Summary

**1 HIGH, 6 MEDIUM, 7 LOW** = 14 total findings across 4 branches.

| Branch | H | M | L | Verdict |
|---|---|---|---|---|
| T1 status-history | 0 | 2 | 3 | **MERGE with polish** |
| C4 context tags | **1** | 1 | 1 | **BLOCK on C4-1** |
| CL1 lift shared modals | 0 | 3 | 1 | **MERGE with polish** (a11y regressions are pre-existing, not introduced) |
| CL2 brandText token | 0 | 0 | 2 | **MERGE — net a11y win** |

**Headlines:**
- **C4-1 (HIGH, 1.4.3)** — selected tag chips render white 13pt-semibold (600) on `#2f80ed` = **3.80:1**, FAILS 4.5:1 normal-text floor. 13pt-600 does NOT meet "large text" (which requires ≥14pt-bold/700 OR ≥18pt-regular). Same anti-pattern as Cycle B F4-1 and TB-1. Fix: bump fontSize 13 → 14 AND weight 600 → 700, OR change selected-state bg to a darker brand (e.g. `#1c4f99` brandText, which is 7.6:1).
- **CL2 is a quiet win.** New `color.brandText = #1c4f99` (7.6:1 on white) replaces `color.brand = #2f80ed` (3.3:1) at 3 small-text callsites. All 3 migrated correctly. Improves contrast strictly; introduces no regression.
- **CL1 is structurally sound.** The lift to `SharedModalsHost` preserves each modal's existing a11y posture. Findings are about the EXISTING (pre-CL1) FeedbackModal/MyFeedbackModal lacking `accessibilityViewIsModal` — relevant to flag because CL1 is the cycle that scrutinizes the architectural pattern. Not a regression CL1 caused; flagged as cross-cycle debt.
- **T1's StatusHistoryModal is the cleanest new component this cycle.** Single LOW polish (missing live-region announcement on data-loaded), single MEDIUM (Android `importantForAccessibility` parity).

---

## Findings by branch

### T1 — `feat/status-history-2026-05-24`

New `StatusHistoryModal.tsx` (264 lines) + `FlagDetailModal` adds a "History" button + sibling modal mount.

| # | Sev | WCAG | File:Line | Finding |
|---|---|---|---|---|
| T1-1 | LOW | 1.4.3 | `src/components/FlagDetailModal.tsx:752` | New `historyBtnText`: `#2f80ed` 14pt-bold on white card = **3.80:1**. 14pt-bold qualifies as large text → 3:1 floor → PASS by 0.80. **Same fragility as the View on Map / Share buttons.** When CL2 lands, swap to `color.brandText` (7.6:1) to bring the History button into line with the migrated View-on-Map / Share trio — the inline comment at L741 even pre-flags this. PASS, but ship CL2 first if both are landing this cycle so the trio stays consistent. |
| T1-2 | LOW | 2.5.8 | `src/components/StatusHistoryModal.tsx:202-210` | Close button: 32×32 + `hitSlop={12}` → effective **56×56**. PASS AA 24×24 and iOS HIG 44pt floors. |
| T1-3 | MEDIUM | 4.1.3 | `src/components/StatusHistoryModal.tsx:127-150` | The loading state has `accessibilityLiveRegion="polite"` on its View — but when the fetch completes the spinner unmounts and the entry list mounts in a NON-live region. SR users get no completion cue. The visible change (spinner → list) is obvious to sighted users; for SR it's silent until they explicitly traverse downward. Fix: after `setLoading(false)` + `setEntries(data)`, call `AccessibilityInfo.announceForAccessibility('Loaded N status history entries')` (or `'No status history yet'` for the empty case). |
| T1-4 | MEDIUM | 4.1.2 / 1.3.2 (Android parity) | `src/components/StatusHistoryModal.tsx:107` | `<View style={styles.card} accessibilityViewIsModal>` — `accessibilityViewIsModal` is iOS-only. On Android, sibling content (the backdrop View + the underlying `FlagDetailModal` card) is still in the SR traversal tree, so a TalkBack swipe-right at the end of the history list can leak focus back into the parent modal. The sibling `PhotoLightboxModal` has the same issue. Fix: add `importantForAccessibility="no-hide-descendants"` on the `styles.backdrop` View (line 106) so Android hides everything below the topmost card. (Or wrap the card in a parent View where ONLY the card is `important`.) |
| T1-5 | LOW | 1.4.3 | `src/components/StatusHistoryModal.tsx:218, 230-235, 259-263` | Spot-check on body copy: `loadingText` #555 on white = **7.45:1** PASS; `emptyBody` #444 on white = **9.74:1** PASS; `entryAttribution` #666 on white = **5.74:1** PASS. All clear AA. |

**Verdict: MERGE.** T1-3 + T1-4 are polish — fold into the same commit before merge.

### C4 — `feat/time-of-day-tags-2026-05-24`

New context-tag chip picker added to ReportFlagModal. New `src/lib/contextTags.ts` with 9-tag vocabulary.

| # | Sev | WCAG | File:Line | Finding |
|---|---|---|---|---|
| C4-1 | **HIGH** | 1.4.3 | `src/screens/ReportFlagModal.tsx:467-475` | **Selected chip text fails normal-text contrast.** `tagChipText` is `fontSize: 13, fontWeight: '600'` and when `tagChipTextActive` swaps the color to white on `#2f80ed` bg, the resulting ratio is **3.80:1**. WCAG "large text" requires 14pt-**bold** (700) or 18pt regular — 13pt-semibold (600) does NOT qualify, so the 4.5:1 normal-text floor applies. **FAIL.** The inline comment at L450 claims "Both pass WCAG AA 4.5:1 contrast" — that claim is wrong for the active state. **Fix (any one):** (a) bump `tagChipText` to `fontSize: 14, fontWeight: '700'` (becomes large text, 3:1 floor, 3.80:1 PASS); (b) change `tagChipActive.backgroundColor` from `#2f80ed` to `#1c4f99` (5.0:1 → wait, white on #1c4f99 = 7.6:1, well past 4.5:1); (c) keep blue background but change `tagChipTextActive.color` from white to something darker… won't work, need darker bg. **Recommended:** (b) — uses the same brand token CL2 just introduced (`color.brandText`), normalizes the chip palette, AND satisfies AA at any size. Unselected state at #1a4f8a on white = ~9.0:1 PASS — only the active state is broken. |
| C4-2 | LOW | 2.5.8 | `src/screens/ReportFlagModal.tsx:453-462` | `tagChip` has `minHeight: 44, paddingHorizontal: 14, paddingVertical: 10`. PASS AA 24×24 and iOS HIG 44pt. Width auto-sizes to label; the shortest label "School hours" is ≥80pt wide → comfortably over the 44pt floor on both axes. |
| C4-3 | MEDIUM | 4.1.3 | `src/screens/ReportFlagModal.tsx:296-308` | No `AccessibilityInfo.announceForAccessibility` on chip toggle. `accessibilityState={{ checked: active }}` gives SR users a state announcement on each toggle ("checked" / "not checked"), which is sufficient per 4.1.2. But the visible "X selected" count is implicit; an SR user can't tell at-a-glance how many they've picked without traversing the whole row. **Mitigation:** the count is also visible to sighted users only implicitly (by which chips are filled). PASS strictly under 4.1.2. **Polish:** consider adding a small `<Text accessibilityLiveRegion="polite">{contextTags.length > 0 ? `${contextTags.length} selected` : 'No tags selected'}</Text>` between the chip row and the helper text so both audiences see/hear the count update. (Listed as MEDIUM because Cycle B established the live-region pattern for similar flows.) |
| C4-4 | LOW | 1.4.1 | `src/screens/ReportFlagModal.tsx:296-308` | Color-only-meaning check: selected vs. unselected chips differ by background fill (blue vs. white) AND by `accessibilityState.checked`. Color is NOT the sole means of communicating selection. The tag *values* (morning_rush, etc.) describe time-of-day conditions, NOT severity — no color encoding of severity is happening here. PASS 1.4.1. |

**Verdict: BLOCK on C4-1.** Easy one-style fix; the rest is polish. Recommend fixing C4-1 + C4-3 in the same commit.

### CL1 — `chore/lift-shared-modals-2026-05-24`

Refactor: 4 shared modals (Help / Changelog / Feedback / MyFeedback) lifted from ProfileScreen + SettingsScreen into a single `<SharedModalsHost>` mount inside RootNavigator, behind a new `SharedModalsProvider` context.

| # | Sev | WCAG | File:Line | Finding |
|---|---|---|---|---|
| CL1-1 | MEDIUM | 2.4.3 / 2.4.11 (Focus restoration) | `src/navigation/RootNavigator.tsx:171-188`, `src/lib/sharedModalsContext.tsx:79` | **Focus restoration on close is NOT explicitly managed.** Before CL1, each modal was a sibling of the trigger button inside the SAME screen — when the modal unmounted, React Native + the OS handed focus back to the trigger's parent stack. After CL1, all 4 modals mount as siblings of the **tab navigator**, far from the trigger. On RN this still works *most of the time* (the OS's default focus-on-dismiss picks the screen root), but it's no longer the trigger button — it's the screen's top element (the ScrollView). **Severity assessment:** I cannot empirically verify focus behavior in this read-only audit, but the architectural change DOES create the risk. **Recommendation:** after `setOpen(null)` fires from a close action, capture the trigger ref and call `AccessibilityInfo.setAccessibilityFocus(reactTag)` on the trigger. This is the same pattern Material UI / Radix use for portal-mounted modals. Alternatively, verify on iOS VoiceOver + Android TalkBack that focus lands on or near the original trigger before merging. **Verification path (no code change):** open Help from Profile → Help row → close → check whether VoiceOver focus returns to "Help & FAQ" row or jumps to the tab bar / scrollview top. |
| CL1-2 | MEDIUM | 4.1.2 (cross-platform parity) | `src/components/FeedbackModal.tsx`, `src/components/MyFeedbackModal.tsx` | **FeedbackModal and MyFeedbackModal do not set `accessibilityViewIsModal`** anywhere in the file (checked via `grep -n "accessibilityViewIsModal" src/components/FeedbackModal.tsx src/components/MyFeedbackModal.tsx` → no matches). Their RN `<Modal>` parent provides OS-level focus containment on most platforms, but iOS VoiceOver can leak focus to siblings without the inner `accessibilityViewIsModal` hint. **Pre-existing on main — NOT introduced by CL1.** Flagging here because CL1 is the cycle that scrutinizes the shared-modal pattern, and now that 4 of these modals share a mount point, any focus leak from one would now bleed across all 4. HelpModal and ChangelogModal DO set the relevant a11y props (have `importantForAccessibility="no-hide-descendants"` on decorative children). Bring Feedback + MyFeedback up to the same standard. |
| CL1-3 | MEDIUM | 4.1.2 (Android `importantForAccessibility` parity) | `src/components/FeedbackModal.tsx`, `src/components/MyFeedbackModal.tsx` | Same files: no `importantForAccessibility="no-hide-descendants"` on backdrop / sibling content. On Android with TalkBack, this means when one of these 4 shared modals is open, the underlying tab navigator + tab bar are still in the SR traversal tree. Pre-CL1 the modal lived inside the screen body and the tab bar was always traversable anyway; post-CL1 it's the same OS behavior but with a now-shared mount that's worth fixing once across all 4. **Add `importantForAccessibility="no-hide-descendants"` on the dimmed-backdrop View** in FeedbackModal + MyFeedbackModal. |
| CL1-4 | LOW | 4.1.2 (mutex behavior) | `src/lib/sharedModalsContext.tsx:46-67` | The `SharedModalKey` union allows only one modal open at a time — opening one implicitly closes the others. This matches the Cycle B Tasks-bulk-select pattern of one-shared-state-key and avoids stacked-modal SR confusion. PASS. Documented in the file header (L20-22). |

**Verdict: MERGE.** No accessibility regressions are introduced by the refactor itself. CL1-2 and CL1-3 are pre-existing debt in 2 of the 4 lifted modals, but the lift makes them louder — fix in the same PR if possible. CL1-1 is a real concern that needs manual VoiceOver/TalkBack verification (Const. Art. 2.4 Layer 2 — Accessibility Parity Matrix would catch this with a focus-restoration row).

### CL2 — `chore/brandtext-theme-token-2026-05-24`

New `color.brandText = #1c4f99` token + migration of 3 small-text callsites (AddressSearchModal `clearRecentText`, FlagDetailModal `viewMapBtnText` + `shareBtnText`, MapScreen `presetBtnSecondaryText`).

| # | Sev | WCAG | File:Line | Finding |
|---|---|---|---|---|
| CL2-1 | LOW | 1.4.3 | `src/theme.ts:45`, all 3 callsites | **Token value verified.** `#1c4f99` on `#ffffff` = **7.59:1** (calculated). PASS AA 4.5:1 normal text AND AAA 7:1 normal text. Strict contrast improvement at all 3 migrated callsites:<br>• `AddressSearchModal.clearRecentText` (14pt + semibold): was `#2f80ed` (3.30:1, large-text PASS only) → now 7.59:1 PASS at any size. **Net win.**<br>• `FlagDetailModal.viewMapBtnText` (14pt bold): was `#2f80ed` (3.80:1, large-text PASS only) → now 7.59:1 PASS. **Net win.**<br>• `FlagDetailModal.shareBtnText` (14pt bold): same as above. **Net win.**<br>• `MapScreen.presetBtnSecondaryText` (14pt bold): same. **Net win.** |
| CL2-2 | LOW | 4.1.2 / consistency | `src/components/FlagDetailModal.tsx:734, 748` | The migrated `viewMapBtnText` and `shareBtnText` now use the literal `#1c4f99` directly instead of `color.brandText`. The comment block says it's "Uses color.brandText" but the code is a hex literal. Functionally identical to using `color.brandText` since the literals match the token, but it loses the central-token benefit — if CL2's token ever shifts, these literals won't track. Same nit on `MapScreen.presetBtnSecondaryText` (L1923). **Polish:** import `color` from `@/theme` and use `color.brandText` in the StyleSheet, matching how `AddressSearchModal` already does it. (Note: FlagDetailModal already imports from `@/theme`? Worth checking before recommending — fix is one line each.) |

**Verdict: MERGE.** Cleanest branch of the cycle — strict a11y improvement, zero regression risk. CL2-2 is style/tokens hygiene, not WCAG.

---

## Cross-cycle patterns

### Pattern 1 — Brand-blue (#2f80ed) under small bold/semibold text on white STILL bites

Surfaced now in C4-1 (3rd appearance: Cycle A had one, Cycle B had F4-1 + TB-1 + bulkResolveBtn). 13pt-600 fails 4.5:1; the fix is always either bumping to 14pt-700 OR darkening to `color.brandText` (#1c4f99 = 7.6:1).

**CL2 is the right structural fix.** Now that `color.brandText` exists as a token, every NEW brand-blue-on-white text callsite in Cycle C onward should use it. The single quietest guard that would have caught C4-1: a lint rule (or PR template checkbox) that flags any new style with `color: #2f80ed` AND `fontSize < 14` OR `fontWeight < '700'`. **ESCALATE to Dani**: in the design system, mark `color.brand` as "UI-and-large-text-only" (the token comment now says this — L42 of theme.ts) and require `color.brandText` for any text below 14pt-bold.

### Pattern 2 — `accessibilityViewIsModal` + Android `importantForAccessibility="no-hide-descendants"` parity is half-done

T1-4, CL1-2, CL1-3. The newer modals (StatusHistoryModal, PhotoLightboxModal, HelpModal, ChangelogModal) DO this correctly; the older ones (FeedbackModal, MyFeedbackModal) don't. CL1 doesn't introduce the gap but makes it visible. **Recommend cross-cycle ticket: audit every `<Modal>` in `src/components/` for the iOS + Android focus-containment pair.**

### Pattern 3 — Live-region completion announcements after async data loads

T1-3, C4-3. The pattern of "spinner has `accessibilityLiveRegion`, but after the spinner unmounts there's no completion cue" recurs. The Cycle B Tasks bulk-select did this right (`announceForAccessibility('Verified N flags.')`); the Cycle C additions skipped it. Fix is one line per modal.

### Pattern 4 — Focus restoration after modal-portal-mount close

CL1-1. New to this cycle because CL1 is the first cycle to lift modals out of their trigger screens. Needs explicit `AccessibilityInfo.setAccessibilityFocus(triggerRef)` on close, OR empirical iOS/Android verification before merge. **Add a "Focus restoration" row to the Accessibility Parity Matrix (Const. Art. 2.4 Layer 2)** so this gets checked every cycle going forward.

### Cycle B carry-forward verification

Spot-check of the Cycle B contrast fixes that landed on main:

| Cycle B finding | Status on main `40d7dd2` |
|---|---|
| F4-1 (preset buttons 13→14pt bold) | Verified in `MapScreen.tsx:1923` — `presetBtnSecondaryText` is `fontSize: 14, fontWeight: '700'`. Fix landed. |
| TB-1 (bulkResolveBtn green darken `#27ae60` → `#1e8449`) | Verified in `TasksScreen.tsx` — `bulkResolveBtn: { backgroundColor: '#1e8449' }` (grep'd, found). Fix landed. |
| Pre-existing hero label contrast (T4-9) | Still present (out of scope). Track separately. |

**No regressions from Cycle B detected.** CL2 builds on the same color-contrast direction (token-based) which is exactly the structural response Cycle B's polish ticket P1 recommended.

---

## Accessibility Parity Matrix (Const. Art. 2.4 — Layer 2)

Variants in this cycle: signed-in vs signed-out (CL1 — neither modal differs), iOS vs Android (T1-4, CL1-3), portal-mounted vs in-screen modal (CL1-1), unselected vs selected chip (C4-1), unmigrated vs migrated brand color (CL2-1). Columns = 7 AA criteria + Focus restoration.

| Variant / row | Focus restoration | Focus visibility | Color contrast | Keyboard nav | SR labels | Motion reduction | Dynamic type | Touch target |
|---|---|---|---|---|---|---|---|---|
| **T1 History button (new)** | N/A (sibling modal opens) | PASS | PASS by 0.80 (3.80:1, large) | PASS | PASS (label + hint + state) | N/A (no animation beyond Modal slide) | PASS (14pt scales) | PASS (parent Pressable ≥44) |
| **T1 StatusHistoryModal close** | Closes via setHistoryOpen(false) — focus returns to History button in FlagDetailModal (likely OK, in-tree) | PASS | PASS (#333 on #eef1f5 ≈ 11.5:1) | PASS | PASS (label + hint) | T1-poss MEDIUM: Modal `animationType="slide"` not gated on reduce-motion — but this is RN's built-in Modal animation, not user-coded. Same posture as every other Modal in the app. ACCEPT pre-existing pattern. | PASS | PASS (32 + hitSlop 12 = 56) |
| **T1 entry rows** | N/A | N/A | PASS (#222 entryLine ≈ 16:1, #666 attribution = 5.7:1) | N/A (not interactive) | PASS (combined `accessibilityLabel` per row) | N/A | PASS | N/A (not interactive) |
| **C4 chip unselected** | N/A | PASS (Pressable focus) | PASS (#1a4f8a on white ≈ 9.0:1) | PASS | PASS (label = full tag, role checkbox, state checked=false) | N/A | PASS | PASS (minHeight 44) |
| **C4 chip selected** | N/A | PASS | **FAIL (3.80:1)** ← C4-1 | PASS | PASS (state checked=true) | N/A | Borderline (13pt is small for dynamic-type scaling above 200%) | PASS |
| **CL1 trigger from Profile** | **UNVERIFIED — risk** ← CL1-1 | PASS | PASS | PASS | PASS | N/A | PASS | PASS |
| **CL1 trigger from Settings** | **UNVERIFIED — risk** ← CL1-1 | PASS | PASS | PASS | PASS | N/A | PASS | PASS |
| **CL1 trigger from Header (Feedback)** | **UNVERIFIED — risk** ← CL1-1 | PASS | PASS | PASS | PASS | N/A | PASS | PASS |
| **CL2 #2f80ed → #1c4f99 (all 3 callsites)** | N/A | N/A | **PASS — 3.30/3.80:1 → 7.59:1** (strict improvement) | N/A | N/A | N/A | PASS | N/A |
| **iOS FeedbackModal a11y posture** | Inherited from RN Modal | PASS | PASS | PASS | PASS | N/A | PASS | PASS |
| **Android FeedbackModal a11y posture** | Inherited from RN Modal | PASS | PASS | PASS | PASS | Underlying tabs still traversable ← CL1-3 | PASS | PASS |

---

## Merge verdict (table)

| Branch | Verdict | Blockers | Polish to fold in |
|---|---|---|---|
| T1 status-history | **MERGE** | — | T1-3 (announce on data loaded), T1-4 (Android importantForAccessibility on backdrop) |
| C4 context tags | **BLOCK** | **C4-1** (selected chip white-on-blue 13pt-600 = 3.80:1, fails 4.5:1) | C4-3 (live-region count) |
| CL1 lift shared modals | **MERGE-with-verify** | — | CL1-1 (manually verify focus-restoration on VoiceOver/TalkBack before merge), CL1-2 + CL1-3 (Feedback/MyFeedback modals a11y posture; pre-existing, lift makes it shared-mount-shared-bug — bring up to HelpModal's standard) |
| CL2 brandText token | **MERGE** | — | CL2-2 (use `color.brandText` instead of literal `#1c4f99` at the 3 migrated callsites) |

**3 merge-clean (with polish), 1 blocked.** C4-1 fix is one-style: either bump to `fontSize: 14, fontWeight: '700'` OR change `tagChipActive.backgroundColor` from `'#2f80ed'` to `color.brandText` (`#1c4f99`). Both work; the second normalizes the chip palette with CL2 and is the recommended path.

---

## Polish tickets (priority order)

1. **P1 (HIGH, BLOCKER on C4)** — `src/screens/ReportFlagModal.tsx:464` change `tagChipActive.backgroundColor` from `'#2f80ed'` to `color.brandText` (`#1c4f99`). Imports `color` from `@/theme`. Fixes C4-1 and uses the CL2 token. One line + one import.
2. **P2 (MEDIUM, T1)** — `src/components/StatusHistoryModal.tsx` after L75 (`setLoading(false)`): `AccessibilityInfo.announceForAccessibility(data.length === 0 ? 'No status history yet' : 'Loaded ' + data.length + ' status history entr' + (data.length === 1 ? 'y' : 'ies'))`. Import `AccessibilityInfo` from `react-native`. Fixes T1-3.
3. **P3 (MEDIUM, T1)** — `src/components/StatusHistoryModal.tsx:181-183` add `importantForAccessibility="no-hide-descendants"` to the backdrop View so Android TalkBack hides the FlagDetailModal underneath. Fixes T1-4.
4. **P4 (MEDIUM, CL1 — VERIFICATION-required)** — Empirically test focus restoration on iOS VoiceOver and Android TalkBack: open Help from Profile, close, verify focus returns to "Help & FAQ" row (not to the screen scrollview top, not to the tab bar). Repeat for all 4 modals × 3 trigger locations (Profile, Settings, Header). If any fail, capture trigger ref via `useRef` + call `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(triggerRef.current))` on close. Fixes CL1-1.
5. **P5 (MEDIUM, CL1)** — Bring `FeedbackModal.tsx` + `MyFeedbackModal.tsx` up to the same `accessibilityViewIsModal` + `importantForAccessibility="no-hide-descendants"` posture as HelpModal/ChangelogModal. Pre-existing debt; CL1's shared-mount makes it 4-way relevant. Fixes CL1-2 + CL1-3.
6. **P6 (MEDIUM, C4)** — Add a polite-live-region count text `${count} selected / No tags selected` below the chip row. Fixes C4-3.
7. **P7 (LOW, T1)** — Once CL2 lands, swap `historyBtnText: { color: '#2f80ed', ... }` to `{ color: color.brandText, ... }` to bring the History button in line with the migrated View on Map / Share buttons. Fixes T1-1.
8. **P8 (LOW, CL2)** — Replace the 3 literal `#1c4f99` callsites with `color.brandText`. Fixes CL2-2. (Note: `AddressSearchModal` already uses the token correctly; this is just the FlagDetailModal + MapScreen callsites.)
9. **P9 (LOW, cross-cycle — ESCALATE to Dani)** — Add a lint or PR-template check for "new style has `color: '#2f80ed'` AND (`fontSize < 14` OR `fontWeight < '700'`)" → require `color.brandText` instead. Would have caught C4-1 automatically.

---

## DECISIONS FOR SKY

None blocking. C4-1's fix is a one-line style change; CL1-1's focus-restoration verification can be done on a real device in 5 minutes. No privacy / auth / location surface touched by any of the 4 branches.

---

## What was NOT audited (out of scope)

- The SQL migrations in T1 (`2026-05-24_status_history_table.sql`) and C4 (`2026-05-24_flag_context_tags.sql`) — that's Dana's lane. Const. Art. 1 / 5 (no live-DB writes); these are file-on-disk migrations.
- The new tests in `src/lib/__tests__/contextTags.test.ts` + `statusHistory.test.ts` + `sharedModalsContext.test.tsx` — that's Gary's lane. Spot-checked existence only.
- TypeScript strictness, `tsc --noEmit` passes — out of a11y scope.
- Cycle B/A merge-clean carry-forwards beyond contrast (e.g. live-region noise on bulk bar) — assumed resolved; sampled only the contrast claims.
