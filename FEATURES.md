# AccessMap — feature backlog

The next things to build, ordered roughly by value vs. cost. One vertical
slice per item. Keep each spec to a single sentence — flesh it out only
when you (or an agent) picks it up.

This file is the source of truth for what to build next. If something is
"in progress" or "shipped (unmerged)", note it inline; remove items once
they land on `main`.

---

## Now (next 1–2 runs)

- **Categories / severity legend on the Map.** A small "?" button on the
  Map that opens a sheet explaining the six categories and the 1–5
  severity scale (icon + color + words) so users learn the encoding.
- **Persistent flag-load error banner on the Map.** Replace the one-shot
  `Alert` in `MapScreen.refreshFlags()` with a persistent banner the user
  can tap to retry (proposal P-NEW-2 in `qa-reports/qa-2026-05-23.md`).
- **Filter flags on the Map by status.** The Map filter panel already
  filters by category and severity; add a status row (open / verified /
  resolved / rejected) — defaults to open + verified to match `listFlags`.

## Next (this month)

- **Accessible list view of nearby flags.** A screen-reader-first
  alternative to the map (auto-shown when the screen reader is on, or
  reachable from a Map FAB). High value for blind users.
- **Onboarding / first-run flow.** 3–4 swipeable cards explaining what
  flags are, how severity works, and how points are earned. Shown once
  on first sign-in.
- **Profile editing.** Edit `display_name`, choose default landing tab,
  set "prefer list view" accessibility preference.

## Later (sequence after the above)

- **Confirmation & feedback flows.** The reporter points are currently
  silent — show a flash banner (and `announceForAccessibility`) when
  points are awarded after creating or triaging a flag.
- **Marker clustering on the Map.** Proposal P4 in
  `qa-reports/qa-2026-05-22.md`.
- **Shared FlagsProvider.** Proposal P5 in `qa-reports/qa-2026-05-22.md`
  — replaces the duplicate `listFlags` fetch in MapScreen and
  TasksScreen with one source of truth.

## Shipped (unmerged — awaiting review)

- **My Reports view.** Bottom-sheet modal from Profile showing all of
  your flags across statuses; tap to open full detail / triage / delete.
  Branch `feat/my-reports-2026-05-23`.
- **Flag detail modal in Tasks.** Bottom-sheet modal with full info,
  photo, all triage actions, and owner-only Delete. Branch
  `feat/flag-detail-modal-2026-05-23`.

## Conventions

- Born accessible — labels, roles, contrast, 44pt targets, reduced motion.
  See `~/.claude/scheduled-tasks/shamus-feature-pusher-engineer/SKILL.md`
  and the AccessMap reference in the feature-development skill.
- Match the existing patterns: screens in `src/screens/`, data in
  `src/lib/`, map only through `PlatformMap`, types use `type` (not
  `interface`).
- Schema / RLS / new-dependency / auth changes are **propose-only** —
  never apply them silently.
