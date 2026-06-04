# AccessMap — UI/UX Polish Report (more-expressive elevation)

**Date:** 2026-06-03
**Branch:** `ui-polish/accessmap-2026-06-03` (13 commits, **NOT merged** — main stays your gate)
**Scope:** Whole-app UI/UX refinement — make AccessMap read as a genuinely professional, premium, *more-expressive* product, with accessibility as the same goal as polish.
**Gates:** `tsc --noEmit` clean after every commit · `npm test` 95 suites / 1564 passing · 18 source files changed (+665 / −305) · no new dependencies · no DB/RLS/auth/migration changes.

---

## 1. DECISIONS FOR SKY (read first)

All judgment calls below were taken on the safest reversible path. Nothing here is merged or live.

1. **The foundation was already premium — this pass is elevation, not a rebuild.** AccessMap already had 50+ WCAG-AA tokens, custom fonts, motion tokens, dark mode, haptics, and solid primitives (three prior passes). So the diff reads as "every screen lifted + the bolder direction + consistency closed," not "new design system." Several audit complaints (crammed Map action bar, missing Settings sections) were already addressed in prior passes — I refined rather than rebuilt those.

2. **You chose "more expressive" — I delivered it inside the accessibility floor.** Gradients, soft glows, richer accent use, and celebratory gamification beats — every one held to WCAG 2.2 AA contrast, reduced-motion, Dynamic Type, and 60fps. (Flagging, per your portfolio history: this is the louder direction you asked for; it's all on the branch for you to veto before merge.)

3. **No new dependency.** The brief assumed `react-native-reanimated`; it isn't installed. I used the existing RN `Animated` API + the project's `motion` tokens. `expo-linear-gradient` and `expo-blur` were already installed and cover the expressive direction.

4. **Disability-tag chips & the anon lock were already/now on-brand (privacy-safe).** The disability context-tag icons were *already* Lucide (a stale comment said "emoji"). I replaced one real emoji — the 🔒 on the anonymous-reporting banner — with a Lucide `Lock`. **All changes are presentational: the `context_tags` payload and tag logic are byte-identical; nothing about location or disability data collection/display changed.**

5. **Two scoped follow-ups I deliberately did NOT bundle in (too large/risky for a visual pass):**
   - **Brand-font cleanup:** ~17 secondary/modal files still use raw `<Text>` (system font) instead of `<AppText>` (Public Sans / Plus Jakarta). I converted the core screens + the files I touched; the rest is a mechanical ~200-node pass best done deliberately. Flagged in DESIGN.md §11.
   - **`Sheet` adoption:** most existing modals are intentionally full-screen page-sheets / lightboxes / drawers — they should NOT become bottom-sheets. No migration warranted; `Sheet` is for new bottom-sheets.

6. **Delivery:** this report is saved to `qa-reports/` and to your **Access Map Summaries**; I've prepared a Gmail **draft** to skylerhalisky@gmail.com (you press send — the safest reversible path, and it respects the "only Morgan messages Sky" rule). Say the word and I'll send it.

7. **Hard lines held:** no merge to main · no live DB / RLS / auth / migration changes (none needed) · nothing newly collects/logs/exposes location or disability data.

---

## 2. BEFORE → AFTER (the elevation, screen by screen)

### Shared primitives (cascade to every screen) — `src/components/ui/`
- **AppText** — *before:* `heading`/`display` text wasn't exposed to screen readers as a header. *after:* `variant="heading"` now carries `accessibilityRole="header"` (VoiceOver/TalkBack rotor navigation works), explicit role still wins.
- **Pill** — *before:* compact chips below the 44pt target. *after:* a `hitSlop` guarantees the 44pt touch target *without* inflating the visual chip; label renders in the brand font.
- **Card** — *before:* no tactile feedback, one elevation. *after:* optional light **haptic** on tap (web-safe), plus an `elevated` variant (deeper shadow) for feature cards.
- **Button** — *before:* flat brand fill, no focus ring, no haptic, system-font label. *after:* **brand gradient + soft glow**, a no-layout-shift **focus ring** (WCAG 2.4.7), a **press haptic**, and an `AppText` label. (Primitive was previously unused — now ready for adoption; the Report submit already uses the same gradient treatment.)

### AdminScreen — *the standout transformation*
- **Before:** predated the design system entirely — hardcoded navy hexes, raw `<Text>`, literal font sizes, `Courier` mono, a bare photo thumbnail, plain text buttons. Looked like a different, unfinished app.
- **After:** fully themed (light/dark parity like every other tab), `AppText` throughout, a **severity pill** (label + number — WCAG 1.4.1) + `CategoryIcon` + `StatusBadge`, a rounded bordered photo, and **icon action buttons** (Trash2 / Ban) with pressed states + medium/selection haptics. Warm empty state (Inbox + copy) and a `Lock` unauthorized state. The deliberate non-`accessible` card wrapper (so moderation buttons stay individually reachable, a prior HIGH a11y fix) was preserved.

### TasksScreen — *the triage queue, now scannable*
- **Before:** monotone white cards; a small severity dot; plain uppercase status text; a flat grey box while photos loaded; subtle elevation.
- **After:** a **colored severity accent stripe** down each card's left edge (kills the monotone feel, reinforces severity already in text), cards lift to a stronger shadow, `CategoryIcon` + `StatusBadge` replace the dot + raw text, and a **real shimmer skeleton** covers the photo until it actually paints. The empty state lifts too.

### ReportFlagModal — *the core action, friendlier + more rewarding*
- **Before:** the high-severity photo hint was **amber** (read as a *warning*); the submit button was a flat fill; the coordinate line was cold mono; the anon banner used a 🔒 emoji.
- **After:** the photo hint is re-tinted to a calm **info/tip** blue (reads as a helpful pointer); the submit button gains the **brand gradient + glow**; a gentle **success haptic** fires on a successful report (a celebratory beat); a `MapPin` warms the coordinate line; the emoji is now a Lucide `Lock`. *Presentational only — the report payload is unchanged.*

### ProfileScreen — *the celebratory surface*
- **Before:** a solid blue hero with a neutral drop shadow; thin (6–8px) near-invisible white progress bars; flat stat cards.
- **After:** a **gradient hero wash + soft brand glow**; **thicker Civic-Gold progress fills** (gold = the gamification language — pops against the blue and ties points/tier progress to rewards); stat cards lift with more depth. Progress-bar a11y values unchanged.

### MapScreen — *the heart, refined not rebuilt*
- **Before:** already a connected action-bar tray + collapsible filter panel from prior passes; white overlays could blend into varied map tiles.
- **After:** **hairline borders** on the action tray, filter panel, and empty card so they read as crisp objects over any basemap; filter section labels get the design's loose tracking + clearer separation. (Intentionally light-touch — it was already on-system, and it's the highest-risk file.)

### SettingsScreen — *a premium control*
- **Before:** section headers + themed rows already present; the appearance picker was a flat tinted segment.
- **After:** the Light/Dark/System control is now the classic **"lifted selected pill"** segmented control (recessed track + white elevated pill), larger icons, and clearer section breaks.

### Periphery + iconography
- **Icons:** finished the system — AccessMap is now **100% Lucide/SVG**. The last Ionicons (tab bar, hamburger menu, drawer items, onboarding cards, how-to-help steps, resources) were all converted, glyph-for-glyph, labels preserved.
- **ResourcesScreen / HowToHelpScreen / HamburgerDrawer:** brand fonts (`AppText`), Lucide icons, and a touch of card depth.

---

## 3. Design system — what was added (extend, don't fork)

Added to `src/theme.ts` (+ both palettes in `ThemeContext.tsx`):
- **Focus ring:** `a11y.focusRingWidth: 2`, `a11y.focusRingOffset: 2` (ring colour = `color.brand`). Closes WCAG 2.4.7 / 2.4.11.
- **Info/tip pairing:** `color.infoBg` / `infoFg` — calm blue, AA in both palettes (7.9:1 light / 6.2:1 dark).
- **Gradients:** `gradient.brand` / `brandHero` / `gold` — mode-independent, for CTAs + gamification.
- **Glows:** `shadow.glowBrand` / `glowGold` — soft decorative colored shadows.

Full reference + rules in **DESIGN.md §12**; rationale in the §9 decision log.

---

## 4. Dark-mode parity

Every change consumes themed tokens via `useColor()`, so light + dark both work:
- AdminScreen now themes correctly in both modes (was hardcoded navy).
- The info/tip pairing has dedicated dark values (6.2:1).
- Gradients/glows are mode-independent by design (a brand-blue gradient button is brand-blue in both modes; white label ≥16pt bold holds AA in both).
- The hero glow uses `glowBrand` (`#1466E0`) consistently rather than a `#000`/`#fff` shadow that inverts oddly in dark.

---

## 5. Accessibility result

Accessibility was treated as the product, not a trade-off:
- **Contrast:** every new pairing is AA-verified (info/tip 7.9:1 / 6.2:1; gold-on-blue progress is decorative with the value in the a11y label; gradient labels keep the solid-brand AA-large/UI posture). Severity is always label + number, never colour alone (WCAG 1.4.1).
- **Headers:** `AppText variant="heading"` now exposes `role="header"` app-wide.
- **Touch targets:** Pill now guarantees 44pt; Admin buttons ≥44pt.
- **Reduced motion:** no new un-gated motion — the only animations are the existing reduced-motion-gated ones (Skeleton shimmer, Button press, Profile progress). The photo shimmer reuses the gated `Skeleton`.
- **Haptics:** added on key picks/actions (card tap, button press, report success, admin moderation) — honored at the OS level, not gated on reduce-motion (correct per DESIGN.md).
- **Screen-reader integrity:** all `accessibilityLabel` strings preserved (a guard test that pins them stayed green; one Admin guard test was updated in lockstep because the severity rendering improved from `Severity N` to a `label · number` pill).

---

## 6. Performance

- All animations are transform/opacity on the native driver (no new JS-thread work).
- Gradients self-round via `borderRadius` (no `overflow:hidden`, which would clip iOS shadows and force extra layers).
- The Tasks photo shimmer reuses the existing `Skeleton` (already optimized + reduced-motion-aware); no new render cost beyond a placeholder that unmounts on image load.
- No change to data fetching, query shapes, or list virtualization.

---

## 7. What the second sweep caught

- **Brand-font gap (real):** ~17 secondary/modal files render raw `<Text>` (system font). Converted the core screens + touched files; scoped the rest as a mechanical follow-up (DESIGN.md §11).
- **`Sheet` adoption (non-issue):** confirmed most modals are intentionally full-screen / lightbox / drawer — not bottom-sheets. No migration.
- **Stale docs:** DESIGN.md's §1 colour table still shows the pre-2026-05-30 brand hex; noted inline (the tokens in `theme.ts` are the source of truth).
- **Unadopted Button primitive:** the expressive `Button` is ready but only the Report submit currently uses the gradient treatment (applied directly). Future CTAs can adopt `Button` for consistency.

---

## 8. How to review

```bash
git diff main..ui-polish/accessmap-2026-06-03
```
- **Migrations:** none (pure UI pass).
- **Commits:** 13, each scoped + typecheck-green; bisectable.

**On-device checklist (a fresh EAS build is the real gate for an accessibility-first app):**
1. **VoiceOver (iOS) + TalkBack (Android):** swipe Tasks cards, the Report context tags + photo tip, Admin Remove/Dismiss, Settings sections — headers announce as headings, every button is individually reachable, labels read correctly, the photo nudge reads as a tip.
2. **Largest Dynamic Type:** no clipping in Tasks cards, Profile stats/progress, Settings rows, button labels.
3. **Light + dark:** toggle in Settings → verify the info/tip nudge, the gradients, the gold progress, and the Admin migration all read correctly in both; the focus ring is visible on a focused Button.
4. **Reduce Motion ON:** Button press, Skeleton/photo shimmer, and Profile progress all snap/disable.
5. **Touch targets:** filter Pills and chips are comfortably ≥44pt.
6. **Web (`npm run web`):** haptics no-op cleanly; gradients render; nothing crashes.

---

*Generated by Dani (audit/design) → Shamus (build) → Will (docs) on branch `ui-polish/accessmap-2026-06-03`.*
</content>
