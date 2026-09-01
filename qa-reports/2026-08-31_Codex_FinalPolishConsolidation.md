# FLAGSTONE FINAL POLISH CONSOLIDATION RECEIPT

## Candidate identity

| Field | Value |
|---|---|
| Worktree | `/Users/skypie/AccessMap-codex/final-polish-consolidation-20260831` |
| Branch | `codex/final-polish-consolidation-20260831` |
| Base SHA | `7c0fc24b7739b9142ac9d428d34216d9707a4413` |
| Base tree | `1ad9f16d25347536dd5b0c0fbc4015c139620ebd` |
| Final source repair SHA | `76ee3559fb8fad03f52ec3609c0fe5fbd33b2f0b` |
| Final source repair tree | `7c6aafcee481300e70f84f0efbb1be654142546f` |

No EAS build, merge, push, deployment, production database action, auth change,
or private photo selection/upload occurred.

## What changed

- **Tasks Filter & Sort:** made the existing shared Sheet expanded and
  scroll-aware, reserved its bottom safe-area floor, added visible `REPORTS`
  and `CATEGORY` group labels, disambiguated the two `All` controls for assistive
  technology, and removed one-line/shrink behavior from sort choices.
- **Downward sheet dismissal:** preserved Map → Nearby as the untouched native
  `pageSheet` reference. The source comparison found that Nearby lets UIKit own
  card and dimming-layer dismissal, while transparent `SheetPull` sheets moved
  their card and then triggered a second native Modal slide. The shared
  lifecycle now fades the owning scrim during the same native-timed card exit,
  disables only that redundant second slide, latches one gesture to one close,
  and resets safely on a later controlled open (including Android, where
  `Modal.onDismiss` is absent). The shared Sheet covers My Reports, Watched
  Flags, Recent Activity, Achievements, Leaderboard, Updates, My Feedback,
  Help & FAQ, What's New, and Send Feedback. The direct Legend, report, and
  flag-detail SheetPull adopters use the same lifecycle.
- **Map callout readability:** native callouts already use the opaque
  `color.surface` card. The web popup no longer relies on Leaflet defaults: its
  explicit `am-map-callout` class enforces the same opaque white reading floor
  and dark ink over map tiles.
- **Avatar/RLS diagnosis:** no sanitizer or backend change was made. Source
  inspection found a self-query in the `public.users` UPDATE policy created by
  `supabase/migrations/20260603002810_admin_role.sql`; this is structurally
  consistent with the observed `infinite recursion detected in policy for
  relation "users"` error when the Build 32 legacy avatar fallback updates the
  row. Effective production policy/catalog state was not inspected because this
  is authentication and personal-photo code; no migration was prepared or
  applied.

## Files changed

- `src/components/ui/SheetPull.tsx`
- `src/components/ui/Sheet.tsx`
- `src/screens/LegendModal.tsx`
- `src/screens/ReportFlagModal.tsx`
- `src/components/FlagDetailModal.tsx`
- `src/screens/TasksScreen.tsx`
- `src/components/PlatformMap.web.tsx`
- Focused tests/guards for the shared lifecycle, Tasks sheet, Map card, and
  existing containment/Legend invariants.

## Focused gates and actual results

| Gate | Result |
|---|---|
| Typecheck: `npm run typecheck` | PASS |
| Lint: `npm run lint` | PASS — 0 errors; 92 pre-existing warnings |
| Focused Jest selection | PASS — 14 suites, 218 tests |
| Final lifecycle recheck after the reset-on-open hardening | PASS — 3 suites, 24 tests |
| Diff audit: `git diff --check` | PASS |
| Nearby reference source | PASS / UNCHANGED — no diff to `NearbyFlagsModal.tsx`; it remains the native `pageSheet` with `allowSwipeDismissal` |
| Shared Profile/Feedback lifecycle wiring | PASS — named shared-Sheet adopters inherit the one lifecycle; direct Legend/report/detail adopters are explicitly wired |
| Map callout source contract | PASS — native opaque surface and web explicit opaque class covered by focused tests |

The larger focused suite emitted pre-existing React `act(...)` and timer-teardown
warnings from existing asynchronous test fixtures, but all selected suites and
tests passed. No full suite was run.

## Runtime acceptance boundary

The configured Simulator was running an unattributed Flagstone instance. An
attempt to start this exact candidate failed locally before a Metro session was
available (`ERR_SOCKET_BAD_PORT` from the automatic port allocation); a bounded
fixed-port retry never reached a served session and was stopped. No further
launch loop was run. Therefore source/simulated-gesture checks below are not
substituted for candidate-attributed visual or touch evidence.

| Required final acceptance | Result |
|---|---|
| Nearby reference | PASS / UNCHANGED in source; no new candidate runtime observation needed for this untouched native reference |
| Profile sheet clean dismissal | FAIL — candidate-attributed real swipe not observed |
| Send Feedback clean dismissal | FAIL — candidate-attributed real swipe not observed |
| Filter & Sort physical bottom/safe-area and Large/XXXL rendering | FAIL — candidate-attributed runtime not available |
| Legend clean dismissal | FAIL — candidate-attributed real swipe not observed |
| Grey trailing artifact | NOT ASSESSED on this candidate; no exact remaining surface can be honestly named |
| Close → reopen flicker | NOT ASSESSED on this candidate; shared source/simulated-gesture regression test passes |
| One-swipe → one-close | SOURCE PASS; runtime FAIL / unobserved |
| Map barrier/detail/callout readability | SOURCE PASS; runtime FAIL / unobserved |
| Avatar picker/upload | BLOCKED — no private photo selection or configured Storage/profile write was authorized |
| Avatar RLS policy security | BLOCKED — effective production policy inspection and any migration require Sky's explicit auth/privacy decision |

## Release result

**FINAL RELEASE READY: NO.**

Do not request or recommend an EAS build. The source repair is committed, but
the required candidate-attributed Large/XXXL and real one-swipe acceptance has
not occurred, and the avatar error remains an authentication/privacy blocker.

## What's left

1. Start an attributable local candidate or approved non-production build, then
   run one real downward swipe per required named sheet at Large and XXXL.
   Record only the requested state transitions and confirm a stable closed
   screen after each; Nearby must remain unchanged.
2. Have Sky or an authorized backend owner perform a read-only review of the
   effective `public.users` RLS policies and policy dependencies. If the
   self-query is confirmed, prepare a smallest owner-only migration with a
   documented rollback for separate review. Do not apply it.
3. Only after the RLS decision, use an explicitly authorized controlled avatar
   test; no production profile/photo mutation was attempted here.

## DECISIONS FOR SKY

### 1. RLS authority and repair scope

- Decision: authorize a privacy/auth owner to inspect the effective production
  `public.users` policy graph and, if confirmed, review a smallest migration.
- Recommendation: do this before any avatar retry or release build.
- Why: the source policy self-query is the precise structural recursion route,
  but source history cannot prove the live policy graph.
- Alternative: ship or retry avatar upload without policy verification.
- Impact: the alternative leaves a known profile-photo failure and security
  ambiguity in the release path.

### 2. Candidate-attributed runtime matrix

- Decision: provide a launchable exact candidate and perform the requested
  Large/XXXL, one-swipe visual checks.
- Recommendation: run the compact matrix before considering a build.
- Why: automated lifecycle tests prove source sequencing, not real UIKit/gesture
  compositing, safe-area geometry, or Dynamic Type appearance.
- Alternative: accept source tests as visual acceptance.
- Impact: the alternative would overstate evidence and violates the requested
  no-EAS-until-every-row-passes rule.

