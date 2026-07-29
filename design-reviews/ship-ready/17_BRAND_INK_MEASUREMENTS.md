# SHIP-READY — 17 · THE SIX `color.brand`-AS-TEXT SITES, MEASURED

**Date:** 2026-07-29 · Branch `shipready/3-polish-submission` · Closes Sky's decision item **`12 §3′.11`**
**Provenance:** Opus 5, max effort · **Nothing was restyled. No code changed.**

---

## Verdict

**All six sites pass. Nothing needs a `brandOnSoft` remedy.**

The Car-4 arbiter flagged these as *unmeasured*, not as failing — its finding was
*"already shipped elsewhere is an argument, not a measurement."* This is the measurement. It also found
three structural facts the flag list did not have, and those are worth more than the ratios.

---

## §1 What the six sites actually are

`12 §3′.11` lists them as `ProfileScreen:2418 · MapScreen:3458 · PhotoGallery:303 · HelpModal:315 ·
ChangelogModal:197,207`. Re-located by content (the line numbers had drifted — `MapScreen:3458` is now
`zoomBtn`, an unrelated style), they fall into three groups:

| # | Site | What it really is |
|---|---|---|
| 1 | `ProfileScreen.tsx:2416` `nearestBtnChevron` | 🪦 **DEAD STYLE — never rendered.** `styles.nearestBtnChevron` appears exactly once in the file: its own definition. Nothing references it |
| 2 | `MapScreen.tsx:3480` `fabSecondaryText` | ✅ **The only real text.** Renders the word "List" on the secondary FAB, 15px bold, NOT hidden from AT |
| 3 | `PhotoGallery.tsx:303` `addIcon` | Renders `+` as text, 24px semibold, `accessibilityElementsHidden` + `no-hide-descendants` |
| 4 | `HelpModal.tsx:313` `faqChevron` | ⚠️ **The style's `color` is INERT.** Its only child is a lucide `<ChevronDown size={16} color={color.brand}>` — an SVG, which paints from its own `color` prop. The text style's colour touches nothing |
| 5 | `ChangelogModal.tsx:195` `chevron` | ⚠️ Same — inert style colour wrapping a lucide icon at 16px |
| 6 | `ChangelogModal.tsx:205` `bulletGlyph` | Renders `•` as text, 15px, `accessibilityElementsHidden` |

**So of "six brand-as-text sites": one is dead, two have inert colours, and three actually paint brand ink
as text.** The two inert ones still have a real brand-coloured *icon* to measure, so all six are measured
below regardless — but a future audit should not spend arbitration effort on 1, 4 and 5 as text.

---

## §2 The measurements

Tokens: `brand` `#1466E0` light / `#4E89EF` dark · `surface` `#FFFFFF` / `#1E1E22` ·
`brandSofter` `#EEF4FE` / `#0F2D5E` · `overlay` `rgba(255,255,255,0.97)` / `rgba(20,20,20,0.97)`.

| Site | Light | Dark | Floor applied | Result |
|---|---|---|---|---|
| **`fabSecondaryText`** "List", 15px bold on `overlay` | **5.24:1** | **5.39:1** | **4.5** — real text, 15px bold is below the 18.66px large-text threshold | ✅ PASS |
| ⤷ same, worst-case map showing through the 3% ¹ | **4.89:1** | **5.04:1** | 4.5 | ✅ PASS |
| **`addIcon`** `+`, 24px semibold on `brandSofter` | 4.74:1 | **3.95:1** | **3.0** — 24px clears large-text, and it is a11y-hidden decoration | ✅ PASS |
| **`bulletGlyph`** `•`, 15px on `surface` | 5.24:1 | 4.86:1 | 3.0 — a11y-hidden decoration | ✅ PASS |
| **`faqChevron`** icon, 16px SVG on `surface` | 5.24:1 | 4.86:1 | 3.0 — non-text graphical object | ✅ PASS |
| **`chevron`** icon, 16px SVG on `surface` | 5.24:1 | 4.86:1 | 3.0 — non-text graphical object | ✅ PASS |
| **`nearestBtnChevron`** | — | — | — | 🪦 not rendered; nothing to measure |

¹ `overlay` is 97% opaque over the map, so 3% of the tile beneath bleeds through. Composited against the
most hostile possible tile (black under the light overlay, white under the dark one) the floor is still
cleared. This is the honest worst case, not the flattering one.

**The tightest margin in the set is `addIcon` in dark at 3.95:1 against a 3.0 floor.** It would fail a
4.5 floor — but 24px semibold is large text by WCAG 1.4.3 (≥18.66px bold), and the glyph is additionally
hidden from assistive technology with its meaning carried by the parent's
`accessibilityHint`. 3.0 is the correct floor twice over.

---

## §3 Why nothing was changed

`12 §3′.11` said each site "needs its own surface arbitration". That has now happened, and the answer is
that every one of them was already fine. Applying the `brandOnSoft` remedy anyway would have:

- changed the visual weight of five shipped surfaces for no accessibility gain, in a ship-ready run whose
  whole discipline is *the shipped baseline unregressed*; and
- destroyed the evidence that they were measured — a swapped token looks identical to a token that was
  always right.

The one thing worth doing is documentation, and it is done: `12 §3′.11` is corrected in the same commit so
the next audit does not re-derive this. **The dead `nearestBtnChevron` style is left in place** — deleting
it is correct but unrelated to this run, and it is now recorded rather than lurking as a seventh false
positive.

---

## §4 Method

Contrast computed by the WCAG 2.x relative-luminance formula (sRGB linearisation, `(L1+0.05)/(L2+0.05)`).
Alpha compositing done explicitly where a surface is translucent. Every colour is read from
`src/theme.ts` / `src/theme/ThemeContext.tsx` at `99faada`, not from a design file — the tokens the binary
actually ships.

**Nothing was merged, submitted, or applied to the database.**
