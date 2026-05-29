# Steve — Branch Security Review
**Date:** 2026-05-29  
**Role:** Steve (Safety/Security Engineer)  
**Model tier:** Sonnet (claude-sonnet-4-6) — Sky-initiated review session  
**Scope:** READ-ONLY. No merges, no DB applies, no code changes made.  
**Branches reviewed:** 5 (4 named + 1 duplicate candidate)

---

## Summary Table

| Branch | Verdict | Needs Jordan? | Condition / Note |
|---|---|---|---|
| `fix/security-hardening-2026-05-30` | **BLOCK — ALREADY MERGED** | No | Migration file + ios plist plist keys already landed in `main` (commits `4de52a4`, `359dfa8`). See SQL findings below for one advisory condition even on a fresh apply. |
| `feat/shared-status-badge-2026-05-30` | **BLOCK — SUPERSEDED** | No | All unique commits (`a0c6992`, `bbe64bc`, `f3c2dd1`) are already absorbed by Rory's merge wave; `StatusBadge.tsx` and its callsite refactors already live in `main`. Merging now would be a no-op at best, confusing at worst. |
| `claude/exciting-satoshi-25772e` | **BLOCK — CONFIRMED DUPLICATE** | No | Identical unique-commit set to `feat/shared-status-badge-2026-05-30` (both reduce to the same 7 commits not in main, same tree diff `+513/-52`). Drop this branch — do not merge. |
| `docs/incident-response-2026-05-30` | **BLOCK — MISLEADING NAME + SUPERSEDED** | No | Despite the `docs/` prefix this branch contains ONLY app code (`StatusBadge.tsx` + tests). The single unique commit (`a0c6992`) is already in `main`. Branch name is a CI/team confusion hazard; drop it. |
| `docs/readme-v020-2026-05-30` | **BLOCK — MISLEADING NAME + SUPERSEDED** | No | Same situation as `docs/incident-response`: contains ONLY `StatusBadge.tsx` + tests (commit `a0c6992`), zero docs. Already in `main`. Drop it. |

---

## Safe for Rory to merge

**None of the five reviewed branches.** All five are already superseded by prior Rory merge waves or have conditions that must be resolved first.

---

## BLOCK — Reasons by branch

### 1. `fix/security-hardening-2026-05-30` — ALREADY MERGED (BLOCK)

**What the branch adds:**
- `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` — 40-line BEFORE INSERT trigger
- `app.json` — adds `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription` under `expo.ios.infoPlist`
- `qa-reports/2026-05-30_Steve_SecurityHardening.md` — Steve's own prior report

**Already in main:**
```
4de52a4 fix(security): add flag creation rate limit migration (20 flags/user/24h)
359dfa8 fix(ios): add NSCameraUsageDescription + NSPhotoLibraryUsageDescription to infoPlist
```
`git diff main...fix/security-hardening-2026-05-30` shows these files ARE different from main, because the branch's merge-base predates the above commits landing on `main` directly. The three-dot diff reveals the branch's copy of the migration file is identical in content to what is already at `main:supabase/migrations/2026-05-30_flag_creation_rate_limit.sql`. The only delta is `NSLocationAlwaysAndWhenInUseUsageDescription` in `app.json` (not yet in `main`).

**Net unique delta remaining:** just `NSLocationAlwaysAndWhenInUseUsageDescription` in app.json — everything else is already in `main`.

**Security analysis of the SQL migration (for the record — already in main):**

| Concern | Finding | Verdict |
|---|---|---|
| SQL injection | No user-controlled string is interpolated into SQL. `auth.uid()` is a Supabase-provided UUID, not caller-supplied text. `flag_count` is an integer COUNT result. `RAISE EXCEPTION` uses `%` with a hardcoded integer literal, not `%s` with user input. No injection surface. | SAFE |
| `SECURITY DEFINER` privilege escalation | Function runs as the defining role (postgres/service_role). The body only reads `flags` with a `WHERE user_id = auth.uid()` filter — it does not write, it does not bypass RLS on other tables, it does not grant roles. The use of `SECURITY DEFINER` here is standard Supabase pattern for trigger functions that need to read across RLS. | SAFE for this scope |
| `auth.uid()` in SECURITY DEFINER context | `auth.uid()` reads from the JWT session context. In a `SECURITY DEFINER` function called from a BEFORE INSERT trigger, the session context (JWT) is the inserting user's session — this is correct. An unauthenticated caller would return `NULL`, which means `user_id = NULL` returns no rows → `flag_count = 0` → trigger passes. That means unauthenticated inserts (if RLS permits them) are NOT rate-limited. Mitigation: existing RLS policy on `flags` already requires `auth.uid() IS NOT NULL` for INSERT, so this edge case is blocked upstream. | SAFE — relying on upstream RLS; document this dependency |
| `DROP TRIGGER IF EXISTS` idempotency | Correct pattern. Safe to re-run. | SAFE |
| `CREATE OR REPLACE FUNCTION` idempotency | Correct pattern. | SAFE |
| Role isolation | Function only queries `flags` table. No cross-schema access. No `GRANT` statements. | SAFE |
| Missing rollback | No rollback script provided. Constitution Art. 3 requires schema changes to include rollback. **CONDITION before re-applying:** Add a rollback file (`2026-05-30_flag_creation_rate_limit_rollback.sql`) containing `DROP TRIGGER IF EXISTS enforce_flag_rate_limit ON flags; DROP FUNCTION IF EXISTS check_flag_rate_limit();`. Not a blocker for merging the branch (migration file is already in `main`), but a CONDITION if anyone runs `supabase db reset` in CI. | ADVISORY |

**Does it touch privacy-sensitive areas?** The `NSLocationAlwaysAndWhenInUseUsageDescription` plist key is a location-permission string. It is display copy only — it does not change what location data is collected or how it is stored. Jordan does not need to review this.

**Merge verdict:** BLOCK. The branch is redundant (migration already in main). If Sky wants the `NSLocationAlwaysAndWhenInUseUsageDescription` key (the only remaining delta), it should land via a targeted commit to a new branch, not this one, to avoid confusion.

---

### 2. `feat/shared-status-badge-2026-05-30` — SUPERSEDED (BLOCK)

**What the branch adds (vs main):**
Unique commits not yet in main at the time this branch was cut:
```
a0c6992 feat(ui): add shared StatusBadge component, replace 3 inline callsites
bbe64bc fix(ux): guest FAB explanation + statusHint color correction
f3c2dd1 refactor(ui): migrate 3 inline status pills to StatusBadge
e2c822d docs: add TestFlight + Google Play beta testing guide with tester invitation steps
34b5885 docs: release runbook — CI to App Store (Rory)
4566330 docs: App Store + Play Store listing copy (Quinn)
2a6361b docs: TestFlight + Play Store beta testing guide (Riley)
```

**All of these are now in main** via the Rory merge wave (see `main` commits `b1ed3dc`, `5afdf9a`, etc.). `StatusBadge.tsx` and its tests already exist at `main:src/components/StatusBadge.tsx`. The branch's `docs/APP_STORE_LISTING.md` and `docs/BETA_TESTING_GUIDE.md` are the only files the three-dot diff shows — and those docs were merged earlier via `docs/app-store-listing-2026-05-30` and `docs/beta-testing-guide-2026-05-30`.

**Security assessment of StatusBadge.tsx (for the record):**

| Concern | Finding | Verdict |
|---|---|---|
| Unsafe data handling | Component receives a `FlagStatus` typed enum value. No raw user input is rendered unsanitised. `STATUS_LABELS` is a static lookup map. `STATUS_COLORS` is a static palette map. No network calls. No storage access. | SAFE |
| Accessibility label injection | `accessibilityLabel` prop is caller-supplied, but this is display text only — no eval, no SQL, no filesystem access. | SAFE |
| XSS/injection surface | This is a React Native component; there is no DOM/innerHTML; template injection is not applicable. | N/A |
| Over-broad permissions | None requested. | SAFE |
| Jordan needed? | No. Component is display-only; does not handle location, disability data, or authentication. | No |

**Merge verdict:** BLOCK. Content already in `main`. Merging would create redundant merge commit and potentially confuse future blame/bisect.

---

### 3. `claude/exciting-satoshi-25772e` — CONFIRMED DUPLICATE (BLOCK)

**Duplicate confirmation:**

Both `feat/shared-status-badge-2026-05-30` and `claude/exciting-satoshi-25772e` produce **identical `git diff main...` output**:
- Same 8 files changed, same `+513 / -52` line counts
- Same unique-commit list (7 commits, identical SHAs: `a0c6992`, `bbe64bc`, `f3c2dd1`, `e2c822d`, `34b5885`, `4566330`, `2a6361b`)
- The `claude/` prefix indicates this is an auto-generated worktree branch that was not cleaned up after the work landed in `feat/shared-status-badge-2026-05-30`

**Winner:** `feat/shared-status-badge-2026-05-30` (it is the canonical named branch with a meaningful name). `claude/exciting-satoshi-25772e` should be deleted.

**Merge verdict:** BLOCK — duplicate. Delete `claude/exciting-satoshi-25772e` without merging.

---

### 4. `docs/incident-response-2026-05-30` — MISLEADING NAME + SUPERSEDED (BLOCK)

**Gary's flag confirmed.** This branch contains NO incident response document. The only file changes are:
- `src/components/StatusBadge.tsx` (new)
- `src/components/__tests__/StatusBadge.test.tsx` (new)

These are pure app code, not docs. The single unique commit is `a0c6992` (`feat(ui): add shared StatusBadge component, replace 3 inline callsites`) — already in `main`.

**What happened:** This appears to be a branch that was used as a staging point for the StatusBadge work before it landed in `feat/shared-status-badge-2026-05-30`. The name is incorrect and misleading.

**Security/safety finding:** The name `docs/incident-response-2026-05-30` suggests there should be an incident response document. There is no such document in this branch or in `main`. This is a **gap, not a blocker** — but it is worth noting that AccessMap has no incident response playbook checked in (security policy documents landed in `docs/security-policy-2026-05-30`, but an IR runbook is separate). No Jordan involvement needed for the code itself.

**Merge verdict:** BLOCK — misleading name, content already in `main`. Drop this branch.

---

### 5. `docs/readme-v020-2026-05-30` — MISLEADING NAME + SUPERSEDED (BLOCK)

**Gary's flag confirmed.** Same situation as `docs/incident-response-2026-05-30`. The only change is commit `a0c6992` — `StatusBadge.tsx` + tests. No README, no docs.

**Merge verdict:** BLOCK — misleading name, content already in `main`. Drop this branch.

---

## Advisory: Rollback Gap for Rate-Limit Migration

The `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql` is already in `main` and in the repo. A companion rollback file does not exist:

```sql
-- Rollback: 2026-05-30_flag_creation_rate_limit_rollback.sql
DROP TRIGGER IF EXISTS enforce_flag_rate_limit ON flags;
DROP FUNCTION IF EXISTS check_flag_rate_limit();
```

Constitution Art. 3 requires schema changes to include rollback scripts. This is an advisory (not a blocker) since the migration has already landed in `main` and has not been applied to production yet. Sky should add the rollback file before applying the migration.

---

## Advisory: Missing `NSLocationAlwaysAndWhenInUseUsageDescription` in main

`main`'s `app.json` currently has `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` but is **missing** `NSLocationAlwaysAndWhenInUseUsageDescription`. This key is required for iOS apps that request "Always" location permission. If AccessMap will only ever request "When In Use," this key is not needed and the omission is correct. If the app ever requests background location, App Review will reject the build. A one-line addition to `app.json` resolves this — Sky should decide whether background location is in scope before the v0.2.0 App Store submission.

---

## DECISIONS FOR SKY

1. **`NSLocationAlwaysAndWhenInUseUsageDescription`:** Does AccessMap need background location (i.e., "Always" permission)? If yes, add the key before App Store submission. If no, no action needed.

2. **Rate-limit migration rollback file:** A rollback script for `2026-05-30_flag_creation_rate_limit.sql` should be added to `supabase/migrations/` before the migration is applied (pre-production gate, not a launch blocker).

3. **Branch cleanup:** The following branches should be deleted (all are superseded / duplicates):
   - `feat/shared-status-badge-2026-05-30`
   - `claude/exciting-satoshi-25772e`
   - `docs/incident-response-2026-05-30`
   - `docs/readme-v020-2026-05-30`
   - `fix/security-hardening-2026-05-30` (already merged into main via direct commits)

4. **Incident Response playbook:** An IR document was expected at `docs/incident-response-2026-05-30` but never written. AccessMap has no checked-in incident response runbook. Worth scheduling for a Morgan-coordinated task before public launch.

---

## What is safe to merge right now

Nothing from this review batch. All five branches are superseded by prior merge waves. No new code, no security changes, no docs remain outstanding from these branches.

---

_Steve — Security/Safety Engineer — READ-ONLY review. No merges, no DB changes, no production writes performed._
