# AccessMap — UI/UX Audit + Punch List (Dani)

**Date:** 2026-06-03
**Branch:** `ui-polish/accessmap-2026-06-03`
**Scope:** Whole-app UI/UX refinement pass — make it read as a genuinely professional, premium, *more-expressive* product, with accessibility as the same goal as polish.
**Aesthetic direction (Sky-confirmed):** More expressive — tasteful gradients, soft glows, richer accent use, celebratory gamification beats — every element held to WCAG 2.2 AA, Dynamic Type, reduced-motion, 60fps.

---

## Headline finding

AccessMap is **not** a from-scratch design job. The foundation is already premium:

- **Tokens (`src/theme.ts`):** 50+ semantic WCAG-AA color tokens (light + dark), a 13-size type scale on three custom fonts (Plus Jakarta Sans / Public Sans / JetBrains Mono), 4/8pt spacing, semantic radius, cool-tinted 3-tier shadows + a pin glow, motion tokens (durations / easing / spring presets), severity + heatmap ramps.
- **Systems:** complete dark mode (`ThemeContext` + `useColor()`), reduced-motion + screen-reader hooks (`src/lib/accessibility.ts`), a web-safe haptics wrapper (`src/lib/haptics.ts`), Dynamic-Type-capped `<AppText>`, and solid primitives (`AppText`, `Button`, `Input`, `Card`, `Pill`, `PointsChip`, `Skeleton`, `Sheet`, `RemoteImage`).
- **Icons:** Lucide + bespoke SVG (`CategoryIcon` / `TierIcon` / `LogoMark`); no emoji policy.

**The real gap is adoption + screen-level elevation + the bolder direction** — closing the distance between premium tokens and screens that under-use them, plus a handful of genuine rough edges. This pass *extends* the system; it does not fork it.

---

## Punch list — ranked by impact

### Shared primitives (fix first — cascades to every screen)
- **Button** — no visible focus ring (WCAG 2.4.7), no press haptic; internal raw `<Text>`. → focus ring token + `hapticImpact('light')` + `<AppText>` label + brand gradient/glow on primary.
- **Pill** — doesn't enforce 44pt touch target; raw `<Text>`. → `minHeight: a11y.minTargetSize` + `<AppText>`.
- **Card** — no haptic on press; no elevated/feature variant. → optional `hapticSelection()` + `elevated`/`gradient` variant.
- **AppText** — `heading`/`display` variants don't expose `accessibilityRole="header"`. → auto header role (overridable).

### Core screens
1. **AdminScreen** *(worst offender; predates the system)* — raw `<Text>`, literal font sizes, hardcoded navy hexes (`#0d1829`, `#1a2540`, `#60a5fa`), `fontFamily:'Courier'`, bare photo thumb, plain Pressable buttons. → full migration to tokens / `AppText` / `useColor()` / `Button`. Preserve the deliberate non-`accessible` card wrapper (WCAG 4.1.2 — buttons must stay individually reachable).
2. **TasksScreen** *(most-used triage surface)* — monotone cards, blank space while photo loads (no skeleton), dense undifferentiated filter chips, "administrative" bulk-select bar, flat empty state. → elevation + depth, photo `Skeleton`, grouped/sectioned filters, warmer empty state, tabular numerals.
3. **ReportFlagModal** *(core action)* — disability context tags use **emoji** prefixes (violates no-emoji rule + inconsistent with text-only seasonal/general tags); high-severity photo nudge reads as a *warning* (amber) not a *tip*; cold mono coordinate display; flat button row. → harmonize tag chips (emoji → SVG, labels unchanged), re-tint nudge as info/tip, warm coordinates, button depth, gentle success moment on submit. **Presentational only — `context_tags` payload unchanged (privacy).**
4. **MapScreen** *(heart of the app)* — action bar crams ~6 icon buttons with no grouping; filter panel is dense with no section headers; disability-tag chips styled inconsistently vs. other chips. → group the action bar into visual clusters with soft elevation; section headers in the filter panel; refined pins/clusters/legend; polished permission + offline UI. (Scope edits to `actionBar`/`filterPanel` regions; no map-logic refactor.)
5. **ProfileScreen** *(prime celebratory surface)* — hero lacks "celebration," progress bar nearly invisible (too thin), point-history is a flat table, stats pills have no variation. → gradient + soft-glow hero, thicker animated (reduced-motion-gated) progress bar, richer history rows with dividers, lifted stats pills (tabular numerals), prominent achievement count.
6. **SettingsScreen** — has section headers already but rows are plain; appearance icons small; no dividers. → section grouping polish, larger appearance icons, row-icon prominence, dividers.

### Periphery
- **SignInScreen** — already the expressive reference (gradient bg, glass card, glow button). Minor: tagline color, error affordance.
- **Leaderboard / About / NotificationPreferences / Resources / HowToHelp / NearbyFlags / Onboarding / Legend / FlagDetail** — consistency + expressive accents.
- **Ionicons → Lucide** in 5 files (HamburgerDrawer, OnboardingCards, RootNavigator, HowToHelpScreen, ResourcesScreen) — 1:1 glyph map, labels preserved.

### Cross-cutting
- Haptics under-used (~18 files) → expand on key picks/actions.
- ~69 raw hex literals in screens — some are deliberate (SignIn dark hero, map/pin colors, onboarding illustration; leave those), some are drift where a token already exists (e.g. FlagCard anon chip) → tokenize the drift only.
- DESIGN.md color table is **stale** vs. live `theme.ts` (old brand `#2f80ed`, old status hexes) → reconcile in docs phase.

---

## Constraints carried into every fix
- WCAG 2.2 AA on all text/UI incl. over gradients; full Dynamic Type; correct labels/roles/states; visible focus; reduced-motion honored; VoiceOver/TalkBack operable.
- 60fps (transform/opacity, native driver). Privacy: presentational only — nothing newly collects/logs/exposes location or disability data. iOS + Android + light/dark parity.
- Tests assert `accessibilityLabel` + visible copy by exact string — restyle freely, treat those strings as frozen.

---

## Modal-migration note
The Sheet migration is ~95% already done — only `src/lib/sharedModalsContext.tsx` (a provider, not a sheet) bare-imports `Modal`. This pass does a *small* audit of residual `<Modal>` usage, not a mass migration.
</content>
</invoke>
