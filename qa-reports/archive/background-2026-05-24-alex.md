# Alex — Background Accessibility & UX Pass — 2026-05-24

mode: background
model_tier: opus-4-7
project: AccessMap
cycle_id: alex-bg-2026-05-24
role: Alex (Accessibility Engineer)
branch: none (AUDIT-ONLY per Const. 12.5 — AccessMap is privacy-sensitive in background mode)
halt_check: `~/.claude/BACKGROUND_HALT` absent at cycle start
external_sends: none (Const. 12.2 / 9.4 — Morgan-only channel; this report is the handoff)
inputs read: `git log -20`, `src/theme.ts`, `src/screens/SignInScreen.tsx`, `src/components/FlashBanner.tsx`, `src/components/UpdateBanner.tsx`, `src/screens/ReportFlagModal.tsx`, samples of MapScreen/TasksScreen/Profile, `qa-reports/qa-alex-cycle-B-2026-05-24.md`, `qa-reports/qa-alex-r7-r15-2026-05-24.md`, `qa-reports/background-2026-05-24.md`

---

## TL;DR

Cycle B fixes landed cleanly on `main` — the seven 13pt-bold contrast failures Alex flagged in `qa-alex-cycle-B-2026-05-24.md` (P1) appear resolved in the merged code (verified by sampling the cleanup commit `40d7dd2`). The earlier R7–R15 sweep was also picked up (placeholders, touch target, header role).

This pass found **3 new accessibility gaps on `main` that no prior Alex pass covered**, all in low-traffic surfaces that escaped the per-branch cycle reviews:

1. **`FlashBanner` success tone fails 1.4.3 large-text contrast** — white 14pt-bold on `#27ae60` = **2.78:1** vs. the 3:1 floor. This is the visible channel for every "+points!" reward toast. **HIGH.**
2. **`UpdateBanner` View button fails 1.4.3 normal-text contrast AND 2.5.5 touch target** — white 13pt-bold on `#2f80ed` = 3.80:1 (need 4.5:1, since 13pt-bold is NOT large text); `minHeight: 36` < 44pt floor. **HIGH on contrast, MEDIUM on touch target.**
3. **`SignInScreen` has no visible labels, no `accessibilityLabel` on either TextInput, light default placeholder, and a 1.6:1 input border (#ccc on white) that fails 1.4.11 non-text 3:1.** The auth-gate screen is currently the weakest a11y surface in the app. **HIGH cumulative.**

Plus 3 recurring cross-cycle items already raised but worth re-surfacing because they touch fresh code: placeholder-color drift (#999 / `color.textSubtle`), web `Alert.alert` no-op, and unchecked reduce-motion across 15+ slide modals.

**No code changes made this cycle** (Const. 12.5 AUDIT-ONLY). All findings below are propose-only — Morgan can route to Shamus / Dani.

---

## Walking the real flows

I walked four user journeys end-to-end before noting anything down. Each one in plain language:

1. **First-time sign-up** — `SignInScreen` is the very first thing a user sees. Two unlabelled inputs, an alert if auth fails, a blocked-feedback path on web. **Worst surface in the app for low-vision / SR users right now** (paradoxical since it gates everything).
2. **Open the Map and report a flag** — `MapScreen` → FAB → `ReportFlagModal`. Healthy. Severity has number+word+color (1.4.1 PASS), category pills have labels/state, the live region on the severity hint is doing real work for SR users.
3. **Verify or resolve a flag from Tasks** — `TasksScreen`. Cycle B's bulk-select sweep is in. The sort-chip touch target fix (R7) landed. Status cards still color-code without color-only meaning (status pills carry text). Healthy.
4. **Earn points → see the flash banner → check Profile** — `FlashBanner` mounts → user sees "+5 points". For a wheelchair user with low vision, the banner is the *only* feedback that their action paid off. The contrast bug here is a real reward-loop bug, not just a checklist failure.

---

## New findings (post-merge — not covered by prior Alex passes)

### Finding 1 — `FlashBanner` success tone fails large-text contrast — **HIGH**

- **File / line:** `src/components/FlashBanner.tsx:93,95`
- **Surface:** every points-earned toast across the app (currently bound in `App.tsx`; designed as generic per the file's own JSDoc).
- **What:** `pillSuccess: { backgroundColor: '#27ae60' }` + text style `{ color: '#fff', fontWeight: '700', fontSize: 14 }`.
- **Math:** white on `#27ae60` → L_bg ≈ 0.327, contrast ratio **2.78:1**. 14pt-bold qualifies as "large text" under WCAG (≥14pt bold OR ≥18pt regular), so the floor is 3:1. **2.78 < 3.00 → FAIL 1.4.3 AA large-text.** Identical green to the cycle-B `bulkResolveBtn` issue (TB-1) but on a higher-impact surface — every reward.
- **Why it matters:** the reward toast is the *only* signal that a verify/resolve actually paid out points until the user visits Profile. Low-vision sighted users who can't make out the white text on green get **no perceivable confirmation**. SR users are fine (announceForAccessibility is called) — but a deaf-blind user or any user who relies on visual confirmation loses the loop.
- **Fix (proposed):** darken to `#1e8449` (≈3.95:1 with white at 14pt-bold — clears AA large-text). Same darker-green token Cycle B's TB-1 fix proposed; reuse it here. If Dani introduces `color.successPress = #1e8449`, route both call sites through it.
- **Branch this would land on if approved out of background mode:** `a11y/flashbanner-contrast-2026-05-24` (one-line style change, reversible).

### Finding 2a — `UpdateBanner` View button fails normal-text contrast — **HIGH**

- **File / line:** `src/components/UpdateBanner.tsx:108,114`
- **Surface:** banner that appears on Profile when one or more tracked flags changed status since the user's last visit. Persistent until tapped.
- **What:** `viewBtn { backgroundColor: '#2f80ed', minHeight: 36 }` + `viewBtnText { color: '#fff', fontWeight: '700', fontSize: 13 }`.
- **Math:** white on `#2f80ed` at 13pt-bold = **3.80:1**. 13pt-bold is **NOT** large text — large text requires ≥14pt-bold. Floor is 4.5:1 (normal text). **3.80 < 4.50 → FAIL 1.4.3 AA.** This is the exact anti-pattern the F4-wire reviewer caught in Cycle B but here it survived on a pre-existing surface.
- **Fix (proposed):** bump `viewBtnText.fontSize` 13 → 14 (now 14pt-bold = large-text → 3.80 ≥ 3.00 → PASSES). One-character diff.

### Finding 2b — `UpdateBanner` View button touch target below WCAG 2.5.5 — **MEDIUM**

- **File / line:** `src/components/UpdateBanner.tsx:104-112`
- **What:** `viewBtn { minHeight: 36, paddingVertical: 8, paddingHorizontal: 14 }` and no `hitSlop`. Effective hit area ≈ 36pt × ~70pt. **FAIL WCAG 2.5.5 AAA (44pt) and below Apple HIG 44pt minimum**; PASS AA 2.5.8 24pt floor strictly speaking, but the broader-recognized 44pt rule is what we've used elsewhere (FAB, bulk-select buttons, Directions button all 44+).
- **Fix (proposed):** `minHeight: 44` OR add `hitSlop={{ top: 4, bottom: 4 }}` to expand the touch box without enlarging the visible pill.

### Finding 3 — `SignInScreen` is the weakest a11y surface in the app — **HIGH (cumulative)**

`src/screens/SignInScreen.tsx` was last touched 2026-05-23 and has *not* been reviewed in any of the Cycle A, Cycle B, or R7–R15 passes. It's the gate to everything else, so this is worth surfacing as one combined finding.

| # | Sev | WCAG | Finding | Fix |
|---|---|---|---|---|
| SI-1 | HIGH | 4.1.2, 3.3.2 | TextInputs have **no `accessibilityLabel`** and **no visible label**. Only `placeholder="Email"` / `"Password"`. After the user types, the placeholder disappears and SR users get nothing useful (TalkBack/VoiceOver will read the typed value but not what the field is for). Low-vision sighted users have no visible field name once they've started typing. | Add `<Text>` labels above each input AND `accessibilityLabel="Email address"` / `"Password"` on each TextInput. |
| SI-2 | HIGH | 1.4.11 | Input border `#ccc` on white = **1.6:1**. Fails 3:1 non-text contrast for UI components. The field's edge is the only thing visually distinguishing it from the background. | Change `borderColor` to `color.borderStrong` (`#d0d4dc` = ~1.7:1 — still too light!) → actually use `#8a8a8a` or `color.textMuted` (`#666` = 5.7:1) for the input border, or add a subtle shadow + filled bg approach. Best fix: `borderColor: '#666'` or use the token system. |
| SI-3 | MEDIUM | 1.4.3 | **No `placeholderTextColor` set.** RN falls back to platform default, which is `#C7C7CD` on iOS — `#C7C7CD` on white = **2.27:1**, FAIL. Android is darker but still fails on most devices. | Add `placeholderTextColor={color.textMuted}` (`#666` = 5.7:1) — same fix recommended for the MyReports placeholder cleanup that already happened (`#5b6470` = 5.96:1 there, similar idea). |
| SI-4 | MEDIUM | 4.1.3 (web) | `Alert.alert('Auth error', error.message)` and `Alert.alert('Check your email', ...)` are **no-ops on react-native-web**. Web users who type wrong credentials get **silent failure** — same Cross-cycle Pattern 2 from `qa-alex-cycle-B-2026-05-24.md`. | Migrate to the cross-platform `notify()` helper proposed in P4 of `qa-alex-cycle-B-2026-05-24.md` (or use the existing `confirm` helper as an interim). |
| SI-5 | LOW | 2.5.8 | RN `<Button>` on iOS has no enforced minimum size — it's a `UIButton` with the system default. On Android it renders to ~36–40pt tall. Adequate but inconsistent with the 44pt rule the rest of the app enforces. | Replace with a `Pressable` styled to 44pt minHeight, matching the rest of the app. (Optional.) |
| SI-6 | LOW | 1.4.6 | The title `<Text style={styles.title}>AccessMap</Text>` has no `accessibilityRole="header"`. Sighted users see it; SR users navigating by header rotor (iOS VoiceOver) miss it. | Add `accessibilityRole="header"`. |

**Verdict:** SignInScreen needs a dedicated polish PR. Bundling fixes for SI-1 through SI-6 is a ~30-line diff, all surgical, all additive (no UX behavior changes).

### Finding 4 — `FlashBanner` SR double-announce — **MEDIUM**

- **File / line:** `src/components/FlashBanner.tsx:43, 63`
- **What:** the component both calls `AccessibilityInfo.announceForAccessibility(message)` in a `useEffect` AND sets `accessibilityLiveRegion="polite"` on the visible `Pressable`. On Android (and partly on iOS), VoiceOver/TalkBack will speak the message **twice** — once from the announce call, once when the new live-region content mounts.
- **Why it slipped:** Cycle B's `77e0c982` fix removed a double-announce on the Profile tier pill (different mechanism — split-element decomposition). The `FlashBanner` pattern is independent and pre-existing. Easy to miss because announceForAccessibility looks like the canonical pattern in our codebase.
- **Fix (proposed):** drop the `accessibilityLiveRegion="polite"` (keep the announce call, which is more reliable cross-platform and fires only once per `message` change) **OR** drop the announce call (keep the liveRegion, but liveRegion will not announce if the banner is already mounted and only the text changes — so the announce call is genuinely safer here).
- Recommendation: **drop the `accessibilityLiveRegion="polite"` from the Pressable**; keep the announce call. One-line removal.

---

## Recurring cross-cycle items (re-surfaced because they keep showing up)

### Recurring 1 — `color.textSubtle` (#999) placeholder drift — still alive in 4 files

Already raised in `qa-alex-r7-r15-2026-05-24.md` (Cross-branch pattern #1). The `MyReportsModal` instance was fixed (`#5b6470`). Still using `#999`/`color.textSubtle` on placeholders:

- `src/components/HelpModal.tsx:142` — `color.textSubtle` on `surfaceSoft` (#f7f8fa) = 2.68:1
- `src/components/FeedbackModal.tsx:209, 222` — `color.textSubtle`
- `src/components/AddressSearchModal.tsx:202` — `color.textSubtle`
- `src/screens/NearbyFlagsModal.tsx:136` — `#999` literal (bypasses tokens)

**Proposed system-level fix (ESCALATE to Dani):** introduce a `color.placeholderText = '#5b6470'` (5.96:1 on `surfaceSoft`) and migrate all four. This was Ticket P4 in the R7–R15 report and remains open.

### Recurring 2 — `Alert.alert` direct usage breaks web

Already raised as Cross-cycle Pattern 2 in `qa-alex-cycle-B-2026-05-24.md` (P4). New occurrences this cycle: `SignInScreen.tsx:31, 35` (audit gate path — pre-existing, just hadn't been flagged), and `MapScreen.tsx:411, 470, 526, 670, 774` (filter save errors, preset save errors, location errors, address-search errors).

The cleanup commit `40d7dd2` did migrate **some** Alert sites to the `confirm` helper. The `notify(title, message)` helper proposed in P4 still does not exist; it's the missing primitive. **Still ESCALATE to Dani / Shamus for spec.**

### Recurring 3 — Reduce-motion ignored by 15+ slide modals

Already raised as a LOW in T4-modal review. Now I can see scope: **20 occurrences** of `animationType="slide"` and 4 of `animationType="fade"` across the app. Only `OnboardingCards.tsx` checks `AccessibilityInfo.isReduceMotionEnabled()`. WCAG 2.3.3 is AAA so this is technically out of AA scope, but RN ≥0.71 has `useReducedMotion()` (via `useAccessibilityInfo`) and the fix is one-line per modal: `animationType={reduceMotion ? 'none' : 'slide'}`.

**Proposed:** add a `useReducedMotion()` hook to `src/lib/` (or just inline the AccessibilityInfo subscription), then wrap the 20 `animationType` props. Single PR, additive, ~50 LOC. Or — simpler — change the default in a `Modal` wrapper component if Dani is up for that. ESCALATE to Dani.

---

## Polish tickets (priority order)

| # | Pri | Title | Files | Effort | Type |
|---|---|---|---|---|---|
| A1 | HIGH | FlashBanner success-tone contrast (Finding 1) | `src/components/FlashBanner.tsx:93` | 1 LOC | a11y/flashbanner-contrast |
| A2 | HIGH | UpdateBanner View button contrast (Finding 2a) | `src/components/UpdateBanner.tsx:114` | 1 LOC | a11y/updatebanner-contrast |
| A3 | HIGH | SignInScreen full a11y pass (Finding 3 — SI-1, SI-2, SI-3) | `src/screens/SignInScreen.tsx` | ~30 LOC | a11y/signin-a11y |
| A4 | MEDIUM | UpdateBanner View button touch target (Finding 2b) | `src/components/UpdateBanner.tsx:109` | 1 LOC | a11y/updatebanner-touch |
| A5 | MEDIUM | FlashBanner SR double-announce (Finding 4) | `src/components/FlashBanner.tsx:63` | 1 LOC removal | a11y/flashbanner-double-announce |
| A6 | MEDIUM | SignInScreen Alert→notify migration (SI-4) | depends on `notify()` helper | blocked on A8 | a11y/signin-notify |
| A7 | LOW | SignInScreen header role + Button → Pressable (SI-5, SI-6) | `src/screens/SignInScreen.tsx` | ~10 LOC | a11y/signin-polish |
| A8 | MEDIUM | Create `notify()` cross-platform helper (Cross-cycle Pattern 2) | new `src/lib/notify.ts` | ~20 LOC | infra (Shamus) |
| A9 | MEDIUM | Migrate `color.textSubtle` placeholders to `color.placeholderText` (Recurring 1) | theme.ts + 4 modal files | ~10 LOC | ESCALATE Dani |
| A10 | LOW | useReducedMotion() helper + wrap 20 modal animationTypes (Recurring 3) | ~21 files | ~50 LOC | ESCALATE Dani |

A1, A2, A4, A5 are all 1-line fixes — bundle into one PR `a11y/contrast-touch-sweep-2026-05-24` if Sky wants the minimum-friction path. A3 is its own PR because SignInScreen is a load-bearing screen that deserves clean before/after diffs for review.

---

## Accessibility Parity Matrix (Const. Art. 2.4 — Layer 2)

AccessMap has no dark mode, no RTL, single locale. Rows = surfaces audited this cycle that weren't in prior Alex passes; columns = the 7 AA criteria.

| Variant / row | Focus visibility | Color contrast | Keyboard nav | SR labels | Motion reduction | Dynamic type | Touch target |
|---|---|---|---|---|---|---|---|
| **FlashBanner success tone** | PASS (Pressable focus ring) | **FAIL** 2.78:1 white-on-#27ae60 14pt-bold (Finding 1) | PASS | PARTIAL (double-announce — Finding 4) | N/A (banner doesn't animate) | PASS | PASS (44 minHeight) |
| **FlashBanner info tone** | PASS | PASS 3.80:1 white-on-#2f80ed at 14pt-bold = large-text PASS | PASS | PARTIAL (same double-announce) | N/A | PASS | PASS |
| **UpdateBanner View button** | PASS | **FAIL** 3.80:1 white-on-#2f80ed at 13pt-bold (Finding 2a) | PASS | PASS (label + hint + count) | N/A | PASS | **FAIL** 36pt < 44pt (Finding 2b) |
| **UpdateBanner Dismiss (✕)** | PASS | PASS #1a4fa3 on #eaf3ff = 8.5:1 | PASS | PASS (label + hint) | N/A | PASS | PASS (30+hitSlop 10 = 50pt) |
| **SignInScreen — Email input** | PARTIAL (default focus ring is platform-stock, not visible-enough) | **FAIL** 1.6:1 border + 2.27:1 default placeholder (SI-2, SI-3) | PASS | **FAIL** no accessibilityLabel (SI-1) | N/A | PASS (fontSize 16) | PASS |
| **SignInScreen — Password input** | PARTIAL | **FAIL** same | PASS | **FAIL** same | N/A | PASS | PASS |
| **SignInScreen — Sign in / Create buttons** | PASS | PASS (native Button) | PASS | PASS (title becomes name) | N/A | PASS | PARTIAL (no enforced 44pt) |
| **SignInScreen — Auth error path** | N/A | N/A | N/A | **FAIL on web** silent Alert.alert (SI-4) | N/A | N/A | N/A |
| **All slide modals (20 sites)** | PASS | PASS | PASS | PASS | **PARTIAL** none check reduceMotion (Recurring 3) | PASS | PASS |
| **HelpModal search placeholder** | PASS | **FAIL** 2.68:1 (Recurring 1) | PASS | PASS (accessibilityLabel) | N/A | PASS | PASS |
| **FeedbackModal placeholders** | PASS | **FAIL** same | PASS | PASS | N/A | PASS | PASS |
| **AddressSearchModal placeholder** | PASS | **FAIL** same | PASS | PASS | N/A | PASS | PASS |
| **NearbyFlagsModal placeholder** | PASS | **FAIL** same | PASS | PASS | N/A | PASS | PASS |

**Layer 2 Parity verdict for newly-audited surfaces: FAIL.** 8 FAIL cells across FlashBanner, UpdateBanner, SignInScreen, and 4 placeholder sites. None block existing merged work (per Const. 7.5 + 2.4.3 these are pre-existing on `main`, not regressions from a feature branch), but A1+A2+A3 are the right surgical fixes to restore Parity PASS.

---

## What I improved this cycle

Nothing — AUDIT-ONLY per Const. 12.5 (AccessMap is privacy-sensitive in background mode). All findings above are propose-only.

If background mode were not in effect (i.e., on a normal `/alex` invocation), I would have made these one-line/one-property fixes on `a11y/contrast-touch-sweep-2026-05-24`:

1. `FlashBanner.tsx:93` — `'#27ae60'` → `'#1e8449'`
2. `FlashBanner.tsx:63` — remove `accessibilityLiveRegion="polite"`
3. `UpdateBanner.tsx:114` — `fontSize: 13` → `fontSize: 14`
4. `UpdateBanner.tsx:109` — `minHeight: 36` → `minHeight: 44`

Total: 4 LOC, no UX-visible behavior change, typecheck stays green (only style/prop values touched), reversible. Sky can approve out-of-band and a follow-up `/alex` run can land them.

---

## Forward-looking suggestions

### Suggestion 1 — Introduce a shared `Button` primitive

Every cycle so far has produced contrast/touch-target failures because each new button gets restyled in its own `StyleSheet.create({...})`. The fix appears 3+ times per cycle review.

**Proposal:** a `<Button variant="primary"|"secondary"|"success" size="sm"|"md">` primitive in `src/components/Button.tsx` that:

- Pins `minHeight: 44` always (cannot be overridden lower).
- Maps `variant` to design-tokenised bg + text colors that have been pre-verified at the chosen `size` against WCAG 1.4.3 AA.
- Bundles `accessibilityRole="button"`, propagates `accessibilityLabel`/`Hint`/`State`.
- Allows `hitSlop` via prop for visually-compact buttons.

One primitive, one source of truth for the design-token-to-contrast mapping, no future cycle introduces a 36pt button or a 13pt-bold-on-brand-blue text fail again. This is the single highest-ROI a11y investment the project could make. ESCALATE to Dani for design-token alignment and Shamus for implementation.

### Suggestion 2 — Add a CI guard for AA contrast

Cycle B's F4-wire had a code comment claiming "white on #2f80ed = 4.6:1" — wrong (3.80:1). A 30-LOC test that walks `theme.ts` color pairings used in the app's known button styles and asserts they pass the appropriate WCAG floor would catch this class of bug at PR time, not at Alex-review time. Output: a single test file `src/__tests__/a11y/contrast.test.ts` that imports `theme.ts`, hand-lists ~10 known foreground/background pairings the app uses, computes contrast (or uses `wcag-contrast` from npm), and fails if any pairing drops below 4.5 for normal text or 3.0 for large/UI.

This would have caught Findings 1 and 2a automatically. ESCALATE to Gary (test infra) + Dani (token validation).

---

## Decisions for Sky

None blocking. All three new findings are surgical fixes with no UX-tradeoffs:

- **A1 (FlashBanner green):** swap `#27ae60` → `#1e8449`. Slightly darker green; reward-toast remains "successful green" visually. Approve?
- **A2 (UpdateBanner View button):** bump 13pt → 14pt. Pixel-perfect-comparable. Approve?
- **A3 (SignInScreen):** add visible labels above email/password, darker border, set `placeholderTextColor`. Visible change but improves first-time UX for everyone. Approve?

If yes to all three, a follow-up `/alex` invocation can land them on `a11y/contrast-touch-sweep-2026-05-24` (no Dani escalation needed for these specific values — they're within the existing token vocabulary or are localized literals).

A8 (notify helper), A9 (placeholder token), A10 (reduce-motion) all need Dani's design-system input first.

---

End of report. No external sends. Morgan picks up.
