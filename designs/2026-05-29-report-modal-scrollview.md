# Design Spec — ReportFlagModal ScrollView + Sticky Footer
**Date:** 2026-05-29  
**Author:** Dani (Design Compiler — Layer 4 Visual Entropy + WCAG 1.4.4 gate)  
**Triggered by:** Alex Phase 3 A11y Parity Matrix · WCAG 1.4.4 fail (dynamic type clipping)  
**File:** `src/screens/ReportFlagModal.tsx`  
**Branch for implementation:** `a11y/phase3-polish` (or next a11y cycle branch)

---

## 1. The Problem

The modal `card` View is a plain `View` with `padding: 20` and no height constraint or scroll. Content is:

1. Title + location (≈60pt)
2. Templates ScrollView (≈52pt)  
3. Category label + ScrollView (≈80pt)
4. Severity label + buttons (≈70pt)
5. Severity hint text (≈40pt)
6. Description label + TextInput (≈120pt)
7. Character counter (≈20pt)
8. Photo label + buttons or preview (≈90pt)
9. Context tags label + chips (≈100pt)
10. Tag helper text (≈24pt)
11. **Action bar: Cancel + Report** (≈72pt)

Total content ≈ **728pt**. iPhone SE (1st/2nd gen) screen height = 568pt. Even on an iPhone 14 (844pt), the modal card covers nearly the full screen with all fields visible. With **Dynamic Type Large Accessibility** enabled (text scales 1.35×–2.0×), every row above expands and the Submit button is pushed off screen.

**WCAG 1.4.4 (Resize Text):** Content and functionality must be fully operable when text is scaled up to 200%. The Submit button becoming unreachable is a hard functional failure.

---

## 2. Architecture Decision: Sticky Footer Pattern

The actions row (Cancel + Report) must remain **always visible and reachable** regardless of content height. This means:

```
┌────────────────────────────────┐
│  [modal card — maxHeight 88%]  │
│  ┌──────────────────────────┐  │
│  │  ScrollView (flex: 1)    │  │
│  │    Title                 │  │
│  │    Location              │  │
│  │    Templates             │  │
│  │    Category              │  │
│  │    Severity              │  │
│  │    Description           │  │
│  │    Photo                 │  │
│  │    Context tags          │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │  Sticky Actions (fixed)  │  │
│  │    [ Cancel ] [ Report ] │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

The `card` View becomes a flex column with two children: a scrollable content area and a pinned action bar.

---

## 3. Implementation spec

### 3.1 Structural change to JSX

```jsx
// BEFORE
<View style={styles.card} accessibilityViewIsModal>
  <Text style={styles.title} accessibilityRole="header">Report a flag</Text>
  <Text style={styles.location}>...</Text>
  {/* templates, category, severity, description, photo, context tags */}
  <View style={styles.actions}>
    <Pressable ...Cancel />
    <Pressable ...Submit />
  </View>
</View>

// AFTER
<View style={styles.card} accessibilityViewIsModal>
  <ScrollView
    style={styles.scrollArea}
    contentContainerStyle={styles.scrollContent}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  >
    <Text style={styles.title} accessibilityRole="header">Report a flag</Text>
    <Text style={styles.location}>...</Text>
    {/* templates, category, severity, description, photo, context tags */}
    {/* tagHelper */}
  </ScrollView>
  {/* actions STAY OUTSIDE ScrollView — sticky footer */}
  <View style={styles.actions}>
    <Pressable ...Cancel />
    <Pressable ...Submit />
  </View>
</View>
```

**Key rule:** Everything above the action bar moves inside `<ScrollView>`. The `<View style={styles.actions}>` stays outside as the last direct child of `card`.

### 3.2 Style changes

```ts
// card — was: { backgroundColor, padding: 20, borderTopLeftRadius, borderTopRightRadius, gap: 12 }
// Now: remove padding + gap (moved into scrollContent), add maxHeight + overflow
card: {
  backgroundColor: color.surface,
  borderTopLeftRadius: radius.xl,
  borderTopRightRadius: radius.xl,
  maxHeight: '88%',          // prevents card from taking full screen; leaves ~12% backdrop visible
  flexShrink: 1,             // allows card to compress on sub-600pt screens
  overflow: 'hidden',        // clips scroll content at the rounded corners
},

// NEW: scrollArea — the scrollable container
scrollArea: {
  // no explicit height; grows to fill card between header and sticky actions
},

// NEW: scrollContent — contentContainerStyle for the ScrollView
scrollContent: {
  padding: spacing.xl,       // spacing.xl = 20 — mirrors original card padding
  gap: spacing.md,           // spacing.md = 12 — mirrors original card gap
  paddingBottom: spacing.sm, // spacing.sm = 8 — small extra pad before the hairline
},

// actions — was: { flexDirection: 'row', gap: 12, marginTop: 8 }
// Now: pin below ScrollView with separator + safe-area bottom pad
actions: {
  flexDirection: 'row',
  gap: spacing.md,           // spacing.md = 12 — unchanged
  paddingHorizontal: spacing.xl,  // spacing.xl = 20 — matches scroll content
  paddingTop: spacing.md,    // spacing.md = 12
  paddingBottom: spacing.xl, // spacing.xl = 20 — safe area gap (no safe-area-context in project)
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: color.borderSubtle,
  backgroundColor: color.surface,  // explicit bg so hairline isn't bleed
},
```

### 3.3 Imports / additions needed

- `ScrollView` is already imported in `ReportFlagModal.tsx` ✅ (used for horizontal template/category rows)
- `StyleSheet` already imported ✅
- No new imports needed

### 3.4 What NOT to change

- `backdrop` style: unchanged (`flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end'`)
- All action button styles (`actionBtn`, `cancelBtn`, `submitBtn`, etc.): unchanged
- `accessibilityViewIsModal` stays on the `card` View: unchanged
- All horizontal `ScrollView` components inside (templates, categories): unchanged — they remain inside the new vertical `ScrollView`, nested scrolls work correctly on both platforms

---

## 4. Keyboard behaviour

The modal's `backdrop` uses `justifyContent: 'flex-end'`, which means the entire card is anchored to the bottom. When the software keyboard appears:
- iOS: The card lifts naturally because the viewport shrinks. With `flexShrink: 1` on the card, the card compresses and the sticky footer stays visible.
- Android: Same. The `backdrop` View reflows.
- No `KeyboardAvoidingView` wrapper is needed inside the modal — the bottom-anchored layout handles it.

`keyboardShouldPersistTaps="handled"` on the ScrollView is **required** — without it, tapping the severity buttons or photo buttons while the description input keyboard is open will dismiss the keyboard instead of registering the tap.

---

## 5. Scroll-to-active-input (implementation note for Shamus)

After adding the ScrollView, the description TextInput is mid-scroll. On iOS, RN will auto-scroll to keep the active input in view when the keyboard appears, provided the TextInput is inside a ScrollView — this is automatic behavior, no extra code needed.

If this doesn't fire (unlikely but possible on some Android versions), Shamus can use a `scrollViewRef.current?.scrollToEnd({ animated: true })` in the TextInput `onFocus` handler. Don't implement this preemptively — only if needed after manual testing.

---

## 6. Edge cases

| Case | Behaviour |
|---|---|
| iPhone SE 2nd gen (375×667pt) at default text size | Card reaches maxHeight='88%' (≈587pt), content scrollable, actions pinned |
| iPhone 14 Pro Max (430×932pt) at default text size | Card grows to fit content (≈728pt), likely fits without scroll on large phones |
| Dynamic Type Accessibility Extra Large (×1.5) | Each row grows; card hits maxHeight; ScrollView activates; actions always visible ✅ |
| Dynamic Type Accessibility XXL (×2.0) | Same pattern; longer scroll needed but Submit always reachable ✅ |
| Landscape orientation (narrow height) | `flexShrink: 1` allows card to compress below 88% height; scroll covers the rest ✅ |
| Photo preview shown (140×140pt thumbnail) | Content grows; already handled by scroll ✅ |
| All context tags shown + all templates | Longest possible form; all reachable via scroll ✅ |

---

## 7. Verification checklist (for Gary / Alex post-implementation)

- [ ] On iPhone SE simulator: Submit button visible without scrolling at default text size
- [ ] On iPhone SE: Submit button reachable via scroll at Accessibility text size (Extra Large)  
- [ ] Tapping severity buttons while description keyboard is open → keyboard stays open, severity registers ✅ (`keyboardShouldPersistTaps="handled"`)
- [ ] Tapping photo buttons while description keyboard is open → keyboard stays, photo picker opens ✅
- [ ] Cancel button always visible (bottom of card) ✅
- [ ] Rounded corners clip correctly with `overflow: 'hidden'` on card ✅
- [ ] `accessibilityViewIsModal` still on `card` View (not on ScrollView) ✅
- [ ] `npm run typecheck` passes ✅

---

## 8. Token compliance

All values in §3.2 use tokens from `src/theme.ts`:
- `spacing.xl` (20) — ✅
- `spacing.md` (12) — ✅  
- `spacing.sm` (8) — ✅
- `color.surface` — ✅
- `color.borderSubtle` — ✅
- `radius.xl` — ✅
- `StyleSheet.hairlineWidth` — platform-native, not a custom value ✅

No raw pixel values introduced. Token drift: zero.
