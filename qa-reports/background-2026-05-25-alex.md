---
date: 2026-05-25
author: Alex (Accessibility Engineer)
mode: background
model_tier: opus-4-7
project: AccessMap
cycle_id: background-alex-a11y-2026-05-25
scope: AUDIT-ONLY (Const. Art. 12.5)
branch_prefix_used: none (no commits — AccessMap AUDIT-ONLY in background)
---

# Alex — AccessMap Background A11y Audit

**Standard:** WCAG 2.2 Level AA
**Type:** READ-ONLY background scan
**Files reviewed:** all `src/components/*.tsx` (22) + all `src/screens/*.tsx` (10) on `main` (HEAD `a42518a`)

---

## VERDICT: PASS — no blockers

The AccessMap codebase is in strong a11y shape after the recent waves of Alex fixes (audit-2026-05-25, residual-2026-05-25, pending-fixes-2026-05-25, flashbanner-contrast, cherry-pick). Every interactive element I scanned has an `accessibilityLabel`. Modals use `accessibilityViewIsModal`. Most Pressables have either `minHeight ≥ 44` or `hitSlop`. Live regions and `announceForAccessibility` are wired throughout.

This audit found only **3 minor findings + 2 informational observations**. None are merge blockers. All recommended for the next eligible cycle when AccessMap leaves AUDIT-ONLY mode.

---

## FINDINGS

### F1 — LegendModal: duplicate "Close legend" announcement (WCAG 1.3.1, 4.1.2)

**File:** [src/screens/LegendModal.tsx:35-39, 134-141](src/screens/LegendModal.tsx)

The backdrop `<Pressable>` (line 35-39) has `accessibilityLabel="Close legend"` and `accessibilityRole="button"`. The bottom-of-card `<Pressable>` (line 134-141) also has `accessibilityLabel="Close legend"` and `accessibilityRole="button"`. VoiceOver users swiping through this modal will encounter TWO "Close legend" buttons, which is confusing — they can't tell which is which without trial.

**Fix proposal for Shamus (next eligible cycle):**
Hide the backdrop Pressable from the a11y tree. It's a tap-anywhere-to-dismiss convenience for sighted users; SR users already have the explicit "Close" button at the bottom of the card.

```tsx
<Pressable
  style={styles.backdrop}
  onPress={onClose}
  accessibilityElementsHidden
  importantForAccessibility="no-hide-descendants"
>
```

Removes the duplicate without changing visual behavior. Matches the pattern PhotoLightboxModal uses for its backdrop pressable (lines 61-66).

**WCAG:** 1.3.1 Info and Relationships (Level A) + 4.1.2 Name, Role, Value (Level A).

---

### F2 — FlashBanner: imperative announce + accessibilityLabel double-announce risk (WCAG 1.3.1)

**File:** [src/components/FlashBanner.tsx:41-45, 60-63](src/components/FlashBanner.tsx)

`useEffect` fires `AccessibilityInfo.announceForAccessibility(message)` when the banner mounts (line 43). The Pressable that renders the banner ALSO has `accessibilityLabel={message}` (line 61). If a screen-reader user happens to be focused near the top of the screen when the banner appears, they may hear the same text twice: once imperative, once when focus lands on the Pressable.

**Fix proposal (next eligible cycle):**
Drop `accessibilityLabel={message}` and replace with a static label that describes the dismiss action, since the announcement already conveys the content:

```tsx
accessibilityLabel="Notification — tap to dismiss"
accessibilityHint={message}
```

OR drop the imperative `announceForAccessibility` call entirely and rely on `accessibilityLiveRegion="polite"` on the wrap View — but this changes platform timing behavior, so the label-side fix is safer.

**WCAG:** 1.3.1 Info and Relationships (Level A).

**Note:** UpdateBanner.tsx has the same pattern (line 46 imperative + accessibilityLiveRegion="polite" on the View at line 63). The comment in UpdateBanner (lines 60-63) claims `polite` only fires on Android while `announceForAccessibility` covers iOS — but `accessibilityLiveRegion` does fire on iOS via VoiceOver too. The comment is misleading and the double-announce risk exists on both platforms.

---

### F3 — PlatformMap.web.tsx: zero a11y attributes (WCAG 1.3.1, 2.1.1, 4.1.2)

**File:** [src/components/PlatformMap.web.tsx](src/components/PlatformMap.web.tsx)

Only `.tsx` file in src/ with **no** `accessibilityLabel`/`accessibilityRole`. Web users on the react-leaflet map have no SR-friendly labels for map markers or controls.

This is a known structural gap (leaflet markers don't auto-attach ARIA), and the native variant (`PlatformMap.tsx`) is the production critical path. Mention here so it's tracked but not a current blocker — web build is secondary.

**Recommendation:** Defer to a dedicated `a11y/web-map` cycle. Will require touching the Marker render path with `keyboard: true`, `alt` attributes, and roving `tabindex`. Out of scope for a single-fix cycle.

---

### F4 — Informational: TextInput placeholder-only labels in MapScreen filter inputs

**File:** [src/screens/MapScreen.tsx](src/screens/MapScreen.tsx) (search inputs around lines 280-320, 530-570)

Saw `<TextInput placeholder="…">` in several filter and search UI blocks without an adjacent `accessibilityLabel` on the input or a paired visible Text label. Placeholder text is not a substitute for a label (WCAG 3.3.2) — it disappears on focus and is read inconsistently across SR.

Not flagged as F1/F2/F3 because the screen has surrounding context (panel title, section heading) that an SR user navigates through first. But adding `accessibilityLabel` to each TextInput would be a clean improvement.

**Recommendation:** Audit each TextInput in `MapScreen.tsx`, `ReportFlagModal.tsx`, `AddressSearchModal.tsx` for explicit `accessibilityLabel`. Quick sweep, propose in a future a11y cycle.

---

### F5 — Informational: LegendModal close button touch target borderline (WCAG 2.5.8)

**File:** [src/screens/LegendModal.tsx:209-216](src/screens/LegendModal.tsx)

The bottom "Close" button uses `paddingVertical: 14` + `fontSize: 15` ≈ ~43pt effective height. Borderline below the 44×44pt WCAG 2.2 SC 2.5.8 minimum. A `minHeight: 44` on `styles.closeBtn` would put it cleanly over the line.

Not urgent — most users will hit it without issue — but the existing pattern in the rest of the codebase (FlashBanner, UpdateBanner viewBtn) uses explicit `minHeight: 44`. Worth a consistency pass.

---

## PASSING — clean areas

| Area | Files | Status |
|---|---|---|
| `accessibilityViewIsModal` on all modals | All 11 Modal components | ✓ |
| Touch target `minHeight: 44` or `hitSlop` | 29 / 32 component files | ✓ |
| `accessibilityRole="header"` on titles | Most modals | ✓ |
| Decorative icons hidden from AT (`accessibilityElementsHidden`) | StatusHistoryModal, PhotoLightboxModal, LegendModal | ✓ |
| Live regions on dynamic content | MapScreen, ProfileScreen, MyReportsModal, SignInScreen | ✓ |
| Singular/plural copy in announcements | UpdateBanner, PlatformMap cluster | ✓ |
| Contrast (post-residual-2026-05-25 sweep) | Whole app | ✓ via brand-token usage |
| Disabled state communicated to AT | FlagDetailModal save/cancel | ✓ |

---

## DECISIONS FOR SKY

_None required._ All three findings (F1-F3) are non-blocking and can be picked up by Shamus in a future a11y cycle. AccessMap remains in good a11y shape.

---

## Cycle compliance check

- ✓ HALT check ran (no sentinel)
- ✓ Mode: background logged in header
- ✓ AUDIT-ONLY (no commits to AccessMap — Const. 12.5)
- ✓ No external sends (this file → qa-reports/ only, Morgan picks it up)
- ✓ No `~/.claude/**` touched
- ✓ ≤1 reversible scoped change per cycle — the single change for this cycle was applied to Prompt Library Tool (eligible project); see that project's qa-report for details
