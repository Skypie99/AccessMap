# QA_PLAN_A11Y — Final Pre-Tester Accessibility & UX Audit

**Auditor:** Alex (Accessibility Engineer) · **Date:** 2026-06-01
**Branch:** `qa-alex/accessmap-2026-06-01` off `main` (`5fb80ce` — the merged polish build)
**Standard:** WCAG 2.2 AA (+ iOS HIG 44pt / VoiceOver, Material 48dp / TalkBack)

> AccessMap exists for disabled users. Accessibility is the product working, not a lint
> score. This is one of the last rounds before human testers — production bar: every screen
> reachable and escapable, fully operable with VoiceOver/TalkBack, legible at large type, no
> dead ends, no meaning by color or motion alone.

The app is mature: prior a11y passes + the polish merge already landed the SR list alternative
to the map (`NearbyFlagsModal`, auto-opens under a screen reader), severity **labels** everywhere,
a labeled SignInScreen, dark mode, reduced-motion gates, Dynamic-Type caps, and the
Input/Sheet/Skeleton primitives (~1,380 a11y props across the tree). So this is a **final polish +
edge-case** pass — find the gaps between the existing coverage and harden the whole surface.

---

## Surface inventory (audit by journey, every screen)

**Journeys:** onboarding (5-card) → sign in / guest → map (browse, filter, saved places, heatmap,
report via FAB & long-press) → tasks triage (verify/resolve/reject, bulk, search/sort) → flag detail
(+ photo lightbox, comments, status history) → profile (points, tiers, streak, my reports/watched,
activity, achievements, leaderboard, prefs) → settings (dark mode, help, changelog, feedback, about,
export, sign-out/delete) → admin.

**Screens/modals (~31):** App/FirstLaunchGate · OnboardingCards/OnboardingModal · SignInScreen ·
MapScreen · ReportFlagModal · LegendModal · NearbyFlagsModal · AddressSearchModal · SavedPlacesModal ·
FilterPresetsModal · TasksScreen (+FlagCard) · FlagDetailModal · PhotoLightboxModal · StatusHistoryModal ·
ProfileScreen · MyReportsModal · MyWatchedModal · ActivityFeedModal · AchievementsModal ·
LeaderboardScreen/Modal · NotificationPrefsModal/Screen · TierExplainerSheet · SettingsScreen · HelpModal ·
ChangelogModal · FeedbackModal · MyFeedbackModal · AboutScreen · ResourcesScreen · HowToHelpScreen ·
AdminScreen · HamburgerDrawer · FlashBanner · UpdateBanner.

Platforms: native (VoiceOver/TalkBack — primary tester target) + web (react-leaflet — secondary;
architectural web items are proposals).

---

## Audit lenses (WCAG POUR + UX) and what each fix records

For each finding: journey+location · the barrier · **who it affects** (blind / low-vision / motor /
cognitive / color-blind / Deaf) · WCAG 2.2 SC · severity · the smallest correct fix · how to verify
with assistive tech. **Additive, truthful fixes only** — never a label/role/alt that lies; if it can't
be made correct, it's a proposal.

- **Perceivable** — text alternatives (1.1.1); use of color, esp. severity 1–5 (1.4.1); contrast
  text 4.5:1 / non-text 3:1 incl. dark mode (1.4.3 / 1.4.11); Dynamic Type / resize (1.4.4 / 1.4.10).
- **Operable** — target size 44pt/48dp (2.5.8); non-drag alternatives for map/lightbox (2.5.7);
  focus visible + order + trap/return in modals + not obscured (2.4.3 / 2.4.7 / 2.4.11 / 2.1.2);
  reduced motion (2.3.3).
- **Understandable** — labels/instructions, error identify+suggest, accessible auth (3.3.2 / 3.3.1 /
  3.3.3 / 3.3.8); status messages announced (4.1.3).
- **Robust** — name/role/value on every control (4.1.2).
- **Map** — the SR list alternative is a first-class path; verify it's complete and operable.
- **UX** — empty/loading/error states; no dead ends; consistent legible patterns.

## Workflow
- One logical change per commit; message names barrier + fix + WCAG SC + who it helps.
- `npm run typecheck` green after every fix; revert any reddening fix to a proposal.
- `npm test` (Jest) at end of pass.
- Additive/localized edits; **flag every shared-file edit** (theme, ui primitives, navigation,
  accessibility lib, flags). Propose new views/deps/schema/auth/web-map architecture — never auto-apply.
- Do **not** touch concurrent-agent churn files (`DECISIONS_LOG.md`, `PROJECT_STATE.md`,
  `TASK_GRAPH.json`, untracked `qa-reports/*`); `git add` only files this audit changes.

## Deliverable
`qa-reports/2026-06-01_Accessibility_UX_QA_Report.md` — DECISIONS FOR SKY first, then findings, fixes,
proposals, shared-file edit list, remaining risk. Review with `git diff main..qa-alex/accessmap-2026-06-01`.
