# BP16 · PROTECT-24 (the Lucide house style) — before/after

PROTECT-24 = "no decorative UI emoji returns; the Lucide house style is the app's icon language." The report names the UpdateBanner `🔔` as **the one surviving decorative emoji** — T17 closes it. This is a *mechanic* (it ships this run), distinct from the T17 strings (which only enter the proposed table).

## The change (committed `8adb4d4`)

**Before** — a native emoji glyph in an `<AppText>`:
```tsx
<AppText variant="body" style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
  🔔
</AppText>
// styles.icon: { fontSize: font.size.xl }   // xl === 18
```

**After** — a Lucide `<Bell/>` following the house decorative-icon pattern:
```tsx
<Bell
  size={18}                       // === sibling dismiss X (size 18) === the emoji's old font.size.xl
  color={color.brandOnSoft}       // EXISTING banner token (already tints the X icon + the banner text) → no new ink pair
  strokeWidth={2.2}               // === sibling X
  accessibilityElementsHidden     // iOS decorative hide (unchanged from the emoji)
  importantForAccessibility="no"  // Android decorative hide (unchanged from the emoji)
/>
// dead `icon` style removed
```

## Why no pixel frame is attached (honest limitation, not skipped)

The audit's capture rig (`design-reviews/r2-audit/tools/probe-export.mjs` + `capture.mjs`, Playwright over the static export on :8082) is **strictly read-only and never authenticates**. `UpdateBanner` renders **only** for a signed-in user who has *unseen status changes on tracked flags* (`count > 0`) — an auth-gated, data-dependent, transient state the read-only rig cannot reach. Standing up a bespoke isolation-render + screenshot would mean inventing tooling the rails forbid, and the "before" emoji would render as a browser emoji anyway (web-approximated, low value).

**Authoritative proof instead** (deterministic, stronger than a screenshot):
- **The emoji-census jest guard** — `src/components/__tests__/UpdateBanner.test.tsx` renders the banner and asserts **zero** `\p{Extended_Pictographic}` string leaves in the tree. It **passes on the Bell** and would **fail on the pre-fix 🔔** (the Bell is an SVG with no string children). This is the app-wide "last decorative emoji is gone" lock. `[verified]`
- **The committed diff** above — emoji → Lucide Bell, existing token, decorative hiding preserved. `[verified]`
- The *pixel look* of the swap (a bell emoji → a line-drawn bell, same blue) is a trivial decorative change; the exact rendering rides Sky's next device pass. `[NEEDS-SKY-DEVICE — cosmetic only]`

## PROTECT surfaces NOT visually touched this run
- **PROTECT-1** (Nearby row labels) — untouched; only Nearby *search* strings enter the proposed table.
- **PROTECT-11** (privacy voice) — only *proposed* in the k-caveat table row (+ Jordan Art.7 note); nothing shipped.
- **PROTECT-17** (OnboardingCards "Back. Disabled on first card.") — untouched; the T18 mechanic is in OnboardingModal, a different component.
- **PROTECT-19** (em-dash status grammar) — honored by every *proposed* status string in the table; nothing shipped.
