# AccessMap — Changelog

All notable changes to AccessMap, in plain human language.
Readable by a non-technical stakeholder — no commit hashes, no jargon.

> **Note:** This is the first formal CHANGELOG for AccessMap.
> Prior history is summarised from the git log and qa-reports; entries before
> 2026-05-22 are inferred from code context and were not written at the time of
> the work.

---

## [Unreleased]

These items are built, tested, and passing — they are waiting on a database
migration that Sky needs to apply, or on a formal Sky merge decision.

### Added

- **Flag editing (awaiting RLS migration).** Owners of their own open flags can
  edit the description, category, and severity directly from the flag detail
  screen. The edit button only appears on flags that have not yet been verified,
  resolved, or rejected, so community trust in the triage record stays intact.
  Waiting for: Sky to apply `supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql`
  in the Supabase dashboard before the feature is promoted to users.

- **Dark-mode-ready StatusHistoryModal.** The status history panel now reads its
  background colour from the design token rather than a hard-coded white hex
  value, making it ready for a future dark-mode switch. ARIA list and listitem
  roles were also added for screen readers on the web build.

- **`decorativeProps` sweep.** Nine purely decorative icon and glyph elements
  across the app are now explicitly hidden from screen readers, preventing
  VoiceOver and TalkBack from reading visual flourishes that carry no
  informational content.

### Fixed

- No blocking fixes are pending in the unreleased queue. Minor accessibility
  polish items (LegendModal duplicate close-button, FlashBanner double-announce)
  are documented and queued for the next cycle.

### Security

- The `notify-flag-status` Edge Function currently has no caller authentication.
  A hardening proposal (shared-secret JWT check + input validation) is
  documented in `qa-reports/qa-2026-05-25-security-audit.md` and is pending
  Sky review before the function is deployed to production.

---

## [0.11.0] — 2026-05-25

### Added

- **Map marker clustering.** Nearby flags on the map now cluster into a single
  branded bubble when zoomed out. Tapping a cluster zooms in to reveal the
  individual pins. Cluster bubbles announce the count and category to
  VoiceOver and TalkBack.

- **Flag status timeline.** The flag detail screen now shows a chronological
  strip of every status change a flag has been through — "Reported → Verified →
  Resolved" — so users can track a flag's full history at a glance. The panel
  hides gracefully if the status-history migration has not yet been applied.

- **Offline tile cache.** The app stores recently viewed map tiles on the device
  so the map renders correctly with a slow or absent internet connection. The
  cache expires after 7 days, caps at 50 MB, and is always cleared when the
  user signs out so no location trace is left on a shared device.

- **Push notifications (opt-in).** Users who choose to enable notifications
  receive a push alert when one of their flags is verified or resolved. An
  in-app explanation appears before any system permission is requested, and the
  setting can be turned off at any time in Settings.
  Requires Sky actions before production use: apply the `push_tokens` migration,
  deploy the `notify-flag-status` Edge Function, run
  `npx expo install expo-notifications`.

- **Flag pagination ("Load More").** The Tasks list now loads flags in pages
  rather than all at once. A "Load More" button at the bottom fetches the next
  20 flags without losing scroll position.

- **Photo review in triage.** Flag thumbnails now appear inline in the Tasks
  triage list so reviewers can assess a photo without leaving the list and
  opening a separate detail screen.

- **`flagsMap` O(1) lookups.** An internal optimisation: the app maintains a
  fast lookup table for flags by ID, which speeds up bulk-select operations in
  the Tasks screen when many flags are loaded.

- **GitHub Actions CI.** Every push and pull request now runs the full
  TypeScript typecheck and test suite automatically.

- **ESLint and Prettier configuration.** Code style rules are committed to the
  repo so the linter and formatter run consistently.

- **Design tokens — size and backdrop category.** `size.thumb`, `size.cardMin`,
  `backdropStrong`, `backdropCaption`, and `overlayBtn` added to the design
  system. This is groundwork for the future dark-mode theme switch.

### Fixed

- **Residual contrast issues.** Several components still used a raw `#999` grey
  that fails WCAG AA. They now use `color.textSubtle`, which passes AA at all
  text sizes.

- **`renderItem` memoization.** The Tasks screen no longer re-renders every
  card on each scroll event; only cards whose underlying data has changed update.

- **Jest open-handles warning.** The test suite now exits cleanly after every
  run with no dangling async handles.

- **A11y residuals — three items.** `MapScreen` now announces filter changes via
  `announceForAccessibility` (WCAG 4.1.3); both PlatformMap variants respect the
  system `reduce motion` preference (WCAG 2.3.3); web photo thumbnails have
  category-derived `alt` text instead of empty strings (WCAG 1.1.1).

### Changed

- **Centralised sign-out cleanup.** Signing out now clears the offline flag
  cache, the push notification token, and the tile cache in one atomic
  operation — no stale data or orphaned tokens remain after a session ends.

- **Sequential merge discipline documented.** Concurrent agents must work in
  separate git worktrees. This internal process rule is now in LEARNINGS.md.

---

## [0.10.0] — 2026-05-24

### Added

- **Flag status history table.** A database table records every status
  transition a flag goes through. A privacy-safe public view omits the identity
  of who made each change so the community can see a flag's history without
  learning individual user behaviour.

- **Realtime flag updates.** The map and Tasks list update live when another
  user on a different device verifies or resolves a flag — no refresh needed.

- **Saved filter presets.** Users can name and save combinations of category
  filters, severity thresholds, and status filters, then reapply them in one
  tap. Presets are stored per-user on the device.

- **Default filter on launch.** The map opens with a sensible default filter
  rather than showing all flags at every severity level.

- **`SearchInputRow` reusable component.** A shared search bar used across My
  Reports and My Feedback, replacing two duplicate inline implementations.

- **`color.placeholderText` design token.** A single AA-compliant token for
  input placeholder text, replacing scattered raw grey values.

- **`decorativeProps` accessibility helper.** Shared utility that marks
  decorative elements as hidden from screen readers.

- **Tasks scope persistence.** The "Mine / All" toggle in the Tasks screen is
  remembered across sessions.

### Fixed

- **SignInScreen accessibility.** Input fields now have visible labels, improved
  border contrast (5.7:1 from a prior 3.2:1), `placeholderTextColor` at AA, and
  `accessibilityRole="header"` on the screen title.

- **FlashBanner contrast and touch target.** The green success banner now meets
  WCAG AA. The UpdateBanner touch target was increased from 36 pt to 44 pt.

- **`placeholderTextColor` sweep.** All inputs use `color.placeholderText`
  rather than raw grey literals.

- **ProfileScreen sign-out confirmation.** Signing out now shows a "Are you
  sure?" dialog rather than immediately ending the session.

### Changed

- **Hex literals → design tokens (15 files).** The first phase of the
  dark-mode migration: named tokens (surface, textPrimary, brand) replace inline
  hex values so a future dark palette requires no callsite changes.

- **Error handling tier policy formalised.** All `try/catch` blocks follow a
  documented tiered policy: fatal errors surface to the user, ephemeral errors
  degrade silently with a console warning.

### Security

- **RLS `initPlan` rewrite.** Four RLS policies and two Storage policies now
  use `(select auth.uid())` instead of bare `auth.uid()`. This prevents
  per-row function evaluation on large flag tables and resolved four warnings
  from the Supabase Security Advisor.

- **Non-owner status-update policy.** A new database policy allows any
  authenticated user to flip the `status` column on any flag (enabling community
  triage), but a `WITH CHECK` clause prevents them from changing any other column.

---

## [0.9.0] — 2026-05-23

### Added

- **Full WCAG 2.2 AA accessibility pass.** Every interactive element has an
  `accessibilityLabel`. All modals use `accessibilityViewIsModal`. Pressable
  touch targets meet the 44 pt minimum. Live regions and
  `announceForAccessibility` are wired throughout.

- **`a11yText` helpers.** Centralised helpers for severity and status
  accessibility labels so VoiceOver reads "severity 3 of 5, Moderate" and
  "status Open" rather than raw numbers and enum strings.

- **`useReducedMotion` hook.** Animated transitions respect the system "reduce
  motion" preference.

- **`useScreenReader` hook.** The map switches to the accessible list view
  when a screen reader is active.

- **`errorMessage` utility.** A single function extracts human-readable error
  text from any thrown value, replacing eleven slightly-different inline
  implementations.

- **Filter persistence.** The active map filter state is saved across app
  restarts.

- **Saved filter sets.** Named combinations of active map filters that can be
  switched in one tap.

- **Distance and ETA on flag detail.** The detail screen shows walking distance
  and estimated time to reach the flag location.

- **Error banner.** A dismissible banner appears when the app cannot reach the
  server, rather than silently showing an empty or stale state.

- **Onboarding modal.** First-time users see a brief walkthrough explaining
  accessibility flags and how to report them.

- **Profile edit.** Users can update their display name from the Profile screen.

- **Points toast.** A brief "+5 points" animation plays in the Tasks screen
  after a successful verify or resolve action.

- **Tasks sort options.** The Tasks list can be sorted by severity, distance,
  or date reported.

- **Map long-press to report.** Holding a finger on the map opens the Report
  modal with the tapped coordinates pre-filled.

- **Profile nearest-flag jump.** The Profile screen shows the nearest open flag
  and a button to jump to it on the map.

- **Tasks tab count badge.** A red badge on the Tasks tab shows how many open
  flags are currently loaded.

- **Relative timestamps.** Flag cards show "2h ago" instead of a bare date.

- **Copyable coordinates.** The coordinate display in the flag detail modal can
  be long-pressed to copy or tapped to share via the native share sheet.

- **Description character counter.** The description field in the Report form
  shows a character counter that turns amber at 400 characters and red at 480,
  signalling the 500-character hard limit is approaching.

- **"Mine / All" toggle in Tasks.** Chips above the Tasks list filter to only
  the current user's own flags.

- **Map legend.** A legend sheet explains each severity colour and status icon.

- **Achievements modal.** A panel in the Profile screen shows earned badges
  based on reporting and triage history.

- **Activity feed.** A modal showing recent flag activity across all users.

- **Nearby flags modal.** A list of the closest accessibility issues to the
  current location.

- **My Reports and My Watched modals.** Dedicated views for flags the user has
  filed or is watching.

- **In-app changelog.** A modal listing recent improvements, readable without
  leaving the app.

- **Context tags on flags.** Reporters can tag a flag with conditions
  ("when wet", "construction", "morning rush") to describe when a hazard is
  most severe.

- **Feedback form.** A modal for submitting bug reports and ideas; writes to
  the server (if migration applied) and opens the mail composer as a fallback.

- **Realtime flag updates.** The app subscribes to live Supabase events so new
  flags and status changes appear on the map without a manual refresh.

### Fixed

- **Duplicate severity/status constants removed.** `SEVERITY_LEVELS`,
  `SEVERITY_VALUES`, `STATUS_LABEL`, and `STATUS_COLORS` were declared
  independently in multiple screen files. All now import from `src/lib/flags.ts`.

- **`severityColor` moved to the shared library.** The helper that maps
  severity 1–5 to a hex colour was extracted from a screen file to
  `src/lib/flags.ts` so every part of the app reads from one canonical source.

- **Stale `.skill` bundle files removed from git.** Binary bundles were
  accidentally committed; they are now gitignored.

### Changed

- **Architecture: `src/lib/` holds all shared logic.** Pure helper functions no
  longer live in screen or component files. A new `src/lib/errors.ts` holds the
  error extraction helper; `src/lib/flags.ts` holds the entire severity/status/
  category vocabulary.

### Security

- **Data-layer hardening.** `flags.description` is capped at 2,000 characters
  at the database level. `users.points >= 0` is enforced by a check constraint.
  A composite index on `(status, created_at desc)` speeds up `listFlags`. A
  dead `flags_geo_idx` btree index (which did not help spatial queries) was
  dropped.

---

## [0.1.0] — 2026-05-22 (first commit + overnight QA pass)

The repository was created on 2026-05-22. The initial version shipped:

- Expo SDK 54 + React Native + TypeScript strict project structure.
- Supabase auth, `public.flags` and `public.users` tables with full RLS.
- Map view with flag pins (react-native-maps on native, react-leaflet on web).
- Report a flag form with photo upload via camera or photo library.
- Tasks list showing open and verified flags with triage actions.
- Profile screen with points and flag counts.
- Points trigger awarding reputation to reporters and triagers on verify/resolve.
- Storage bucket `flag-photos` with owner-scoped upload and delete policies.
- An overnight QA pass producing 10 fix commits and 9 propose-only improvements
  (see `qa-reports/qa-2026-05-22.md` for the full breakdown).
