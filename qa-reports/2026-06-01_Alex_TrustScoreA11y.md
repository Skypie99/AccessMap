# Alex — A11y Audit: Trust Score UI (feat/phase5-trust-score)
**Date:** 2026-06-01
**Branch:** feat/phase5-trust-score
**Commit:** 383f746
**Standard:** WCAG 2.2 AA
**Status:** ALL FIXES APPLIED

---

## Scope

Targeted audit of four trust-score components added in Phase 5:

1. Tier progress bar — `ProfileScreen.tsx`
2. Point history list — `ProfileScreen.tsx`
3. Leaderboard podium rows — `LeaderboardModal.tsx`
4. Leaderboard empty state — `LeaderboardModal.tsx`

All findings were 🟢 SAFE FIX. All five fixes applied directly to `feat/phase5-trust-score` and committed as `383f746`. TypeScript clean (`npm run typecheck` passes with zero errors).

---

## WCAG Findings and Fixes

### 1. Tier progress bar — WCAG 4.1.2 Name/Role/Value — 🟢 FIXED

**Before:** `tierProgressTrack` View had `accessibilityElementsHidden={true}` + `importantForAccessibility="no-hide-descendants"`. The bar was invisible to AT. A comment incorrectly justified this as "decorative duplicate" — but the bar conveys a numeric value (tier-to-tier progress) not fully surfaced elsewhere. WCAG 4.1.2 requires progressbar components to have an accessible name AND expose their value.

**After:**
```jsx
<View
  style={styles.tierProgressTrack}
  accessibilityRole="progressbar"
  accessibilityLabel={`${tier.label} tier, ${points} of ${tier.nextThreshold} points to ${nextTier?.label ?? 'next tier'}`}
  accessibilityValue={{ min: tier.threshold, max: tier.nextThreshold, now: points }}
>
  <Animated.View
    ...
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  />
</View>
<Text
  style={styles.tierProgressLabel}
  accessibilityElementsHidden
  importantForAccessibility="no-hide-descendants"
>
  {tierGap} pts to {nextTier?.label ?? 'next tier'} ...
</Text>
```

VoiceOver now announces: **"Silver tier, 150 of 500 points to Gold — progress bar."** The fill animation and visual text label are hidden from AT (both covered by the bar's label).

---

### 2. Milestone progress bar — WCAG 4.1.2 Name/Role/Value — 🟢 FIXED

Same issue: `progressTrack` was entirely `accessibilityElementsHidden`. Fixed identically:

```jsx
accessibilityRole="progressbar"
accessibilityLabel={`Progress toward ${milestoneLabel}, ${points} of ${nextMilestone} points`}
accessibilityValue={{ min: 0, max: nextMilestone, now: points }}
```

VoiceOver announces: **"Progress toward Community Hero badge, 150 of 500 points — progress bar."** Fill View and `heroSubtitle` Text hidden from AT (covered by bar label).

---

### 3. Point history list — WCAG 1.3.1 Info and Relationships — 🟢 FIXED

**Before:**
- No `accessibilityRole="list"` wrapper; AT perceived the rows as an unstructured sequence of text blocks.
- Each row's `accessibilityLabel` was `"${eventLabel}, ${sign}${delta} points, ${dateStr}"` — event name first, delta buried after it.
- No `role="listitem"` on rows (needed for web ARIA traversal).

**After:**
- Wrapped all mapped rows in `<View accessibilityRole="list">`.
- Each row adds `role="listitem"`.
- Label reordered to action-first: **"Earned 10 points: Your flag was verified, 2h ago"** / **"Lost 5 points: Flag marked as spam, May 31"**.

Direction icons (↑/↓) already had `accessibilityElementsHidden={true}` — no change needed.

---

### 4. Leaderboard podium rows — WCAG 1.3.1 Info and Relationships — 🟢 FIXED

**Before:** `accessibilityLabel` for ranks 1–3 started with `"Gold, 1st place, …"`. The word "Gold" alone is ambiguous — it could mean a tier name, a colour, or a prize. AT users who cannot see the background tint or emoji have no way to know this is a medal placement.

**After:**
```js
const medalPrefix =
  rank === 1 ? 'Gold medal, 1st place' :
  rank === 2 ? 'Silver medal, 2nd place' :
  rank === 3 ? 'Bronze medal, 3rd place' :
  ordinalLabel(rank);
```

Full announcement: **"Gold medal, 1st place, Bronze tier, Sky, 450 points."**

---

### 5. Leaderboard empty state — WCAG 4.1.2 Role — 🟢 FIXED

Added `accessibilityRole="text"` to the "No contributors yet" `<Text>` element for explicit ARIA semantics on web.

**Contrast check:** `textMuted` (#666 on #fff = 5.74:1 light; #aaa on #111 = 6.7:1 dark) — both pass WCAG AA ✅.

---

## Accessibility Parity Matrix (Layer 2)

| Component | SR labels | Color contrast | Motion | Touch target | Result |
|---|---|---|---|---|---|
| Tier progress bar | ✅ progressbar + label | ✅ fill white on brand (non-text 3:1) | ✅ OS respects | N/A | **PASS** |
| Milestone progress bar | ✅ progressbar + label | ✅ | ✅ | N/A | **PASS** |
| Point history list | ✅ list/listitem, action-first label | ✅ successStrong 4.66:1; error 5.39:1 | N/A | ✅ minHeight 28 (rows are not tappable) | **PASS** |
| Leaderboard podium rows | ✅ "Gold medal, 1st place, …" | ✅ podium tints decorative; text uses color.text ≥4.5:1 | N/A | ✅ minHeight 48 | **PASS** |
| Leaderboard empty state | ✅ accessibilityRole="text" | ✅ 5.74:1 | N/A | N/A | **PASS** |

**Layer 2 result: PASS** ✅

---

## Decisions for Sky

None. All changes are additive (label + role attributes only). Zero visual impact for sighted users. TypeScript clean.

---

*End of report*
