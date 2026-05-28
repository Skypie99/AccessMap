# AccessMap — System Constitution

**Version:** 1.1 · Created: 2026-05-25 · Last updated: 2026-05-25

This document is the governing agreement for the AccessMap project. It exists
to make implicit rules explicit — so any contributor, agent, or reviewer can
answer "is this okay to do?" without asking Sky.

When in doubt, the answer is: **stop, surface it, wait for Sky's decision.**
Shipping broken security is worse than shipping late.

---

## 1. What AccessMap Is (and Isn't)

### What it is

AccessMap is a crowdsourced accessibility-flagging mobile app. Users report
physical accessibility problems — broken sidewalks, missing ramps, blocked
paths, missing pedestrian signals, steep grades — by dropping a pin at the
location. Other users in the community then verify, resolve, or reject those
reports. A flag that has been verified by the community carries real weight;
the community trust model is the core product.

The app is built on a React Native / Expo + Supabase stack. It runs on iOS,
Android, and the web. It was started as a learning project for a beginner
coder, which means architecture choices favour clarity over cleverness and
diffs are kept small and understandable.

**The user base is explicitly people with disabilities and mobility
limitations.** This shapes every privacy and security decision in this
document. Location data combined with flag-category data can reveal
sensitive details about a person's disability type, neighbourhood, and daily
routines. Treat all user data accordingly.

### What it will never be

- A social network. There are no follows, no DMs, no public profiles beyond a
  display name.
- A commercial data product. Flag and location data is never sold, aggregated
  for third parties, or used for any purpose outside the app's stated mission
  (helping people with disabilities navigate the physical world).
- An over-engineered system. If a feature can be built with what is already in
  the stack, it should be. New dependencies require Sky's explicit sign-off.
- A system where agents apply live database changes. Only Sky touches the
  production Supabase instance.
- A platform for identifying individuals. The status-history view omits the
  `user_id` of whoever made each change. Community triage is deliberately
  pseudonymous at the activity level.

---

## 2. The RLS Rule

**Row Level Security is the real enforcement layer. It is never weakened.
Every schema change has a matching migration file. The migration file always
has a rollback section.**

### Why RLS matters for an app that handles disability and location data

Supabase exposes the Postgres database directly over a REST API and a
realtime WebSocket. Any authenticated client can attempt to read or write any
row. The only layer that prevents a buggy client, a malicious user, or a
misconfigured API call from accessing data it should not see is RLS. It runs
inside Postgres on every query. The client cannot bypass it.

Application-level code — TypeScript, form validation, conditional rendering —
is not a security boundary. A user with a REST client can skip it entirely.
RLS cannot be skipped.

For AccessMap specifically: the flags table contains coordinates (location
data) and category descriptions (disability context). The users table
contains email addresses and display names. The push_tokens table contains
device identifiers. Any weakening of the RLS that protects these tables
is a privacy incident, not just a bug.

### The standing RLS rules

1. **Every new table must have RLS enabled** (`ALTER TABLE ... ENABLE ROW
   LEVEL SECURITY`) before it is used in production. A table without RLS
   is readable and writeable by every authenticated client.

2. **Every new table requires explicit policies.** RLS enabled with no
   policies is default-deny (nobody can read or write). The policies must
   be intentional and reviewed, not inherited from a template.

3. **The `initPlan` pattern is standard.** All policies use
   `(SELECT auth.uid())` rather than bare `auth.uid()`. The bare call is
   evaluated per row; the subselect is evaluated once per query statement.
   Semantics are identical; performance on large tables is materially better.
   The Supabase Security Advisor's `auth_rls_initplan` warnings will flag any
   deviation.

4. **Policy changes ship as migration files, never as ad-hoc SQL.** The file
   belongs in `supabase/migrations/` with an ISO-date prefix. It must be
   idempotent (safe to run twice) and include a ROLLBACK section in comments
   so Sky can undo it if needed.

5. **Weakening any existing policy requires Sky's sign-off and a migration
   with rollback.** "Weakening" includes: broadening the USING clause,
   removing a WITH CHECK constraint, adding a new INSERT policy on a table
   that previously had none, or granting table access to a wider role.

6. **The current production policies (as of 2026-05-25):**

   | Table | Policy name | Scope |
   |-------|-------------|-------|
   | `public.flags` | `flags select` | All authenticated users can read all flags |
   | `public.flags` | `flags insert own` | Authenticated users insert only their own rows |
   | `public.flags` | `flags owner edit open` | Owner can edit description/category/severity on open flags only (PENDING — `2026-05-25_flag_edit_rls_replacement.sql` not yet applied) |
   | `public.flags` | `flags status update by any authenticated` | Any authenticated user can change `status` only; all other columns frozen via WITH CHECK |
   | `public.users` | `users select own` | Users read only their own row |
   | `public.users` | `users update own row` | Users update only their own row |
   | `public.feedback` | `feedback_insert_self_or_anon` | Authenticated or anonymous insert; no select for others |
   | `public.flag_status_history` | (maintainer-only direct SELECT) | Public reads via `flag_status_history_public` view only |
   | `public.push_tokens` | Owner-only select / insert / update / delete | User's own token only |
   | Storage `flag-photos` | Authenticated upload to `<auth.uid()>/...` path | Public read, owner delete |

---

## 3. Who Can Do What

Sky is the only human with direct production access. The following actions
require Sky to perform them personally — no agent, no automation, no shortcut.

### Sky only

- Apply any database migration to the live Supabase instance
- Merge any branch to `main` (including via Cowork, the terminal, or the
  GitHub UI — if Sky is operating the tool, the merge is permitted)
- Add any npm dependency to `package.json`
- Deploy a Supabase Edge Function (`supabase functions deploy`)
- Change or drop any RLS policy
- Change any Supabase auth configuration (JWT expiry, OAuth provider, email
  template)
- Push `main` to `origin/main`
- Submit to TestFlight or the App Store
- Modify the `handle_new_user` or `handle_flag_status_change` trigger functions
  (security definer functions — they run with elevated DB privileges)
- Make any change to `supabase/schema.sql` that is not purely additive
- Run `supabase db push` against any environment
- Change the Storage bucket or its RLS policies

### Morgan only (external communication)

Morgan is the only agent that ever contacts Sky directly — by email, iMessage,
or any other channel. All other roles write findings to `qa-reports/` and
Morgan aggregates. No other agent sends external messages, regardless of how
urgent the finding seems.

Morgan may message Sky on direct `/morgan` invocation only — never from inside
an orchestrator run or background cycle.

### Jordan gates (pre-build, not post-build)

Jordan's privacy review is required **before** any UI is built for features
that touch:

- User location data (current position, flag coordinates)
- Disability context (flag categories, descriptions, severity)
- Photo uploads or photo metadata
- Push notification tokens (device identifiers under PIPEDA)
- RLS policies on any table that stores the above
- New persistence layers (AsyncStorage keys, new tables)
- Data export or data sharing features

Jordan's mandatory conditions are merge gates, not suggestions. A feature
does not ship until all conditions are satisfied.

### Alex gates (a11y, post-build)

Every UI change goes through an Alex accessibility sweep before it is
considered done. The Dani Design Compiler 7-layer gate runs on all
UI-touching changes. A Compiler result of BLOCK or ESCALATE stops the merge
until resolved.

---

## 4. Branching and Merge Rules

### Branch naming

| Prefix | Used for |
|--------|----------|
| `feat/` | New features and enhancements |
| `fix/` | Bug fixes and crash fixes |
| `a11y/` | Accessibility-only changes (no feature changes) |
| `qa/` | Test additions, QA infrastructure |
| `docs/` | Documentation — FEATURES.md, LEARNINGS.md, CHANGELOG.md updates |
| `chore/` | Config, dependency changes, code health with no user-visible effect |
| `design/` | Design token changes, style-only sweeps |
| `release/` | Release config (eas.json, app.json version bumps) |

Agent-initiated branches follow `<role>/slug-YYYY-MM-DD` — for example
`shamus/flag-editing-2026-05-25` or `a11y/contrast-2026-05-25`.

Background-cycle auto-branches follow `qa/auto-YYYY-MM-DD`.

### Merge rules

1. **`main` is Sky-only.** No agent, automation, or scheduled task merges to
   `main`. Sky uses `git merge --no-ff` followed by `git push origin main`.

2. **TypeScript must be green at every handoff.** Before any branch is handed
   to Sky for review, run `npm run typecheck` and confirm zero errors. A branch
   that introduces type errors is not ready for merge.

3. **Tests must pass at every handoff.** Run `npm test -- --forceExit` and
   confirm the full suite passes. Pay attention to open-handle warnings — they
   indicate an async dependency was not torn down and will flap in CI.

4. **Sequential merges, not concurrent.** Wait for the previous merge to appear
   on `origin/main` before starting the next one. Concurrent merges on the same
   working tree cause collisions. Parallel agent work must use separate git
   worktrees. (See LEARNINGS.md: 2026-05-25 sequential merge rule.)

5. **Schema, RLS, and security changes are propose-only.** An agent writes the
   migration file and documents the exact steps for Sky. Sky applies it to the
   Supabase dashboard. Agents never execute SQL against the live database.

6. **New dependencies are propose-only.** An agent documents the package,
   reason, and alternatives in `DECISIONS_LOG.md` and waits for Sky's decision.
   The `--legacy-peer-deps` flag is required for this project when installing
   react-leaflet-related packages (react-leaflet 5 pins React ^19.2.6; Expo
   SDK 54 pins 19.1.0).

### Auto-mode branch classification

Branches from automated orchestrator runs must include the date in the name
(`qa/auto-2026-05-25`). Background-mode agents may only produce one reversible
change per cycle. Background-mode agents must never commit to AccessMap in
AUDIT-ONLY mode (see `~/.claude/CLAUDE.md` Art. 12 definition of when
AUDIT-ONLY applies).

---

## 5. Naming Conventions

Derived from the actual files in `src/components/`, `src/hooks/`, `src/lib/`,
`src/screens/`, and `src/types/`. These are not aspirational — they describe
what exists and what must be followed for consistency.

### Components (`src/components/`)

Files are PascalCase `.tsx`. All components in `src/components/` are modals
or sub-views that the map or screen layer opens — they are not page-level
screens. Current examples: `FlagDetailModal`, `FeedbackModal`,
`FilterPresetsModal`, `PhotoLightboxModal`, `StatusHistoryModal`,
`FlashBanner`, `PlatformMap`, `PlatformMap.web` (platform-split file),
`SearchInputRow`, `OnboardingCards`, `UpdateBanner`.

Platform-specific files use the `.web.tsx` suffix for the web variant and
`.tsx` (no suffix) for the native variant.

### Screens (`src/screens/`)

PascalCase `.tsx`. Screens are full tab-level or bottom-sheet-level views:
`MapScreen`, `TasksScreen`, `ProfileScreen`, `SignInScreen`,
`ReportFlagModal`, `SettingsScreen`, `OnboardingModal`, `AboutScreen`,
`LegendModal`, `NearbyFlagsModal`.

### Library modules (`src/lib/`)

camelCase `.ts` (not `.tsx` unless the module exports a React context or
provider). One module per concern. Current examples:

| File | What it holds |
|------|--------------|
| `flags.ts` | `listFlags`, `createFlag`, `updateFlagStatus`, `updateFlagContent`, `uploadFlagPhoto`, `CATEGORY_LABELS`, `SEVERITY_LABELS`, `STATUS_LABELS`, `STATUS_COLORS`, `severityColor`, `SEVERITY_ORDER`, page-size constants |
| `flagsStore.tsx` | `FlagsProvider`, `FlagsContext`, `useFlags`, offline cache helpers, `offlineCacheKey` |
| `flagsRealtime.ts` | Realtime subscription helpers, `mergeFlagRealtimePayload` |
| `auth.tsx` | `AuthProvider`, `useAuth` |
| `supabase.ts` | Typed Supabase client, sign-in/sign-up/sign-out helpers |
| `a11yText.ts` | `severityA11y`, `statusA11y` — centralised accessibility label helpers |
| `accessibility.ts` | `decorativeProps`, `useScreenReader`, `useReducedMotion` |
| `errors.ts` | `errorMessage` — single error-extraction helper |
| `confirm.ts` | `confirm` — platform-aware confirmation dialog |
| `tileCache.ts` | Offline tile cache (TTL, LRU, user-keyed, sign-out clear) |
| `pushNotifications.ts` | Push token helpers, `showPushExplanation`, `getPushEnabled` |
| `statusHistory.ts` | `listStatusHistory`, `StatusHistoryEntry` type |
| `filterPresets.ts` | Per-user named filter presets (AsyncStorage) |
| `filterSets.ts` | Device-wide shared filter sets (AsyncStorage) |

### Hooks

Named `use` + PascalCase. Hooks that belong to a specific lib module live in
that module (e.g. `useAuth` in `auth.tsx`, `useFlags` in `flagsStore.tsx`).
Cross-cutting hooks (`useScreenReader`, `useReducedMotion`) live in
`src/lib/accessibility.ts`. Standalone hooks get their own `src/lib/use*.ts`
file if they are substantial.

### Types (`src/types/database.ts`)

Database row types use the `Row` suffix: `FlagRow`, `UserRow`, `FeedbackRow`.
The `Database` type follows the Supabase-generated shape with `Tables`,
`Views`, `Functions`, `Enums`. All shapes use `type`, not `interface` — the
postgrest-js type engine requires `type` aliases to correctly infer generic
parameters. Never use a plain `[]` for `Relationships`; use the
`EmptyRelationships` alias.

### Exported constants

UPPER_SNAKE_CASE: `FLAG_PHOTOS_BUCKET`, `INITIAL_PAGE_SIZE`, `NEXT_PAGE_SIZE`,
`CONTEXT_TAGS`, `SEVERITY_ORDER`, `CATEGORY_LABELS`.

### Design tokens

Token names are semantic, not literal: `color.surface` not `color.white`,
`color.textPrimary` not `color.darkGrey`. Token categories:

- `color.*` — all colour values (verified WCAG AA at their intended pairings)
- `font.*` — sizes and weights
- `spacing.*` — padding, margin, gap
- `shadow.*` — elevation shadows
- `radius.*` — border radii
- `motion.*` — animation duration and easing
- `size.*` — fixed-dimension UI elements (`size.thumb = 80`, `size.cardMin = 96`)
- `breakpoints.*` — responsive layout

No hardcoded hex values outside `src/theme.ts`. No hardcoded pixel sizes for
standard UI elements. Severity colours live in `theme.severity[1..5]` and are
a distinct colour-blind-safe ramp — they are not governed by the same AA-pairing
requirement as text tokens.

### Test files

Located in `src/lib/__tests__/`. Named `<module>.test.ts` or
`<module>.test.tsx`. Mirror the module they test: `flags.ts` → `flags.test.ts`,
`flagsStore.tsx` → there is no direct store test (store is integration-level;
individual lib helpers have unit tests). Each test file must clean up async
resources — no open handles after the suite completes.

### QA reports

`qa-reports/<ISO-date>_<role>_<slug>.md`. Background cycles use
`background-<ISO-date>-<role>.md`. Orchestrator cycles use
`cycle-<ISO-date>.md`. Design Compiler results use
`<ISO-date>_DesignCompile_<feature-slug>.md`.

---

## 6. What Requires Sky's Sign-Off

A complete and exhaustive list. If an action is not listed but feels
consequential, surface it as a blocker.

### Database

- Apply any migration file to the live Supabase instance (including `supabase db push`)
- Change or drop any RLS policy
- Change any trigger function (`handle_new_user`, `handle_flag_status_change`,
  `set_flag_updated_at`, `handle_flag_insert_history`)
- Change the `flag-photos` Storage bucket policies
- Add a new table or view to the public schema
- Enable or disable Realtime on any table
- Change any Supabase auth configuration

### Code and dependencies

- Merge any branch to `main`
- Add any npm dependency (including `devDependencies`)
- Eject from the Expo managed workflow (this is irreversible)
- Change the `app.json` `ios.bundleIdentifier` or `android.package` values

### Security and privacy

- Any change that touches user location data (read or write path)
- Any change that touches disability context (flag categories, descriptions)
- Any change that touches photo uploads, photo storage, or photo URLs
- Any change that touches push notification tokens
- Any change to the data export (`dataExport.ts`) that adds new data categories
- Enabling analytics, crash reporting, or any third-party SDK that sends data
  off-device

### Infrastructure and release

- Deploy a Supabase Edge Function
- Create or change `eas.json` build profiles
- Submit to TestFlight or App Store Connect
- Push `main` to `origin/main`
- Set up any CI secrets (Supabase keys, Apple credentials, Google service account)

### Architectural

- Change the path alias mapping (`@/*` → `src/*`)
- Change the TypeScript `strict` setting or add any `ts-ignore` / `nocheck`
  directive without a Sky-approved reason
- Change the Supabase client initialisation in `src/lib/supabase.ts`
- Change the `handle_new_user` trigger that bootstraps `public.users` on sign-up

---

## 7. The Migration Checklist

Every migration file in `supabase/migrations/` must satisfy all of the
following before it is considered complete and ready for Sky to apply.

### Required elements

1. **ISO-date prefix in the filename.** Format: `YYYY-MM-DD_slug.sql`. The
   date is the date the file was authored, not the date Sky applies it.

2. **Header comment block.** The first lines of the file must explain:
   - What this migration does and why (in plain English)
   - Which agent or role authored it and when
   - Whether it is idempotent (it always must be)
   - ROLLBACK instructions — the exact SQL to undo the change

3. **Idempotency.** Every statement must be safe to run twice:
   - `CREATE TABLE IF NOT EXISTS`
   - `DROP POLICY IF EXISTS` before `CREATE POLICY`
   - `CREATE INDEX IF NOT EXISTS`
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   - `CREATE OR REPLACE FUNCTION` for functions

4. **RLS enabled on every new table.** `ALTER TABLE <name> ENABLE ROW LEVEL
   SECURITY;` must appear immediately after `CREATE TABLE`.

5. **Explicit policies on every new table.** At minimum: a SELECT policy
   scoped to the appropriate role (authenticated, anon, or none), and an INSERT
   policy if the table accepts writes. The policies must use the initPlan
   pattern: `(SELECT auth.uid())` not bare `auth.uid()`.

6. **AFTER APPLYING section.** The file must include a comment block telling
   Sky how to verify that the migration worked correctly — what to check in the
   Supabase Dashboard, what smoke test to run, what the expected outcome is.

7. **Propose-only header if required.** Any migration that has not yet been
   applied must include `!!! PROPOSE-ONLY — DO NOT APPLY YET !!!` at the top
   of the file so Sky knows it is waiting for review.

8. **No service-role key references.** Migration files must never reference or
   require the Supabase service-role key. If a migration needs elevated
   privileges (e.g., a SECURITY DEFINER function), document why in the header.

9. **Jordan sign-off for privacy-sensitive tables.** Any migration that creates
   a table storing location data, disability context, user identifiers, device
   tokens, or personal information must include a reference to Jordan's
   approval in the header comment (e.g., `Jordan APPROVED — see qa-reports/
   2026-05-25-jordan-offline-tiles.md`).

### Current migration status (2026-05-25)

| File | Status |
|------|--------|
| `2026-05-23_data_layer_hardening.sql` | Propose-only — pending Sky application |
| `2026-05-23_feedback_table.sql` | Propose-only — pending Sky application |
| `2026-05-23_rls_initplan_and_non_owner_status_update.sql` | Propose-only — pending Sky application |
| `2026-05-23_status_update_trigger_proposal.sql` | Propose-only — pending Sky application |
| `2026-05-24_flag_context_tags.sql` | Propose-only — pending Sky application |
| `2026-05-24_realtime_flags.sql` | Propose-only — pending Sky application |
| `2026-05-24_status_history_table.sql` | Propose-only — pending Sky application |
| `2026-05-25_flag_edit_history_table.sql` | Propose-only — pending Sky application |
| `2026-05-25_flag_edit_rls_replacement.sql` | Propose-only — **required before flag editing is promoted to users** |
| `2026-05-25_push_tokens.sql` | Propose-only — required before push notifications are enabled |

---

*This constitution is a living document. Changes require Sky's explicit
approval and a note in `DECISIONS_LOG.md` with the change, the reason, and
the date. No agent self-amends this document.*
