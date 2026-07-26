# QA Gate Report — feat/phase5-trust-score & feat/phase5-anon-reporting

**Date:** 2026-06-01  
**Reviewer:** Gary (QA Lead)  
**Branch for this report:** `qa/phase5-trust-anon-gate`  
**Branches under review:** `feat/phase5-trust-score`, `feat/phase5-anon-reporting`  
**Method:** Isolated git worktrees at `/tmp/wt-trust-score` and `/tmp/wt-anon-reporting`

---

## Summary Table

| Check | trust-score | anon-reporting |
|-------|-------------|----------------|
| `tsc --noEmit` | ✅ EXIT:0 — clean | ❌ EXIT:2 — 1 error |
| `jest --passWithNoTests` | ⚠️ 19 failures / 1433 pass | ❌ ALL 90 suites fail |
| Code review | ⚠️ 1 logic bug, 2 test issues | ❌ 1 missing migration |
| UX / flow | ✅ No regressions observed | ✅ Anon UX well-designed |
| **VERDICT** | **NOT READY** | **NOT READY** |

---

## Branch 1 — `feat/phase5-trust-score`

### Commits on this branch (vs main)

```
9e9fcd8 docs(a11y): Alex trust-score accessibility audit report
383f746 a11y(trust-score): WCAG 4.1.2 fixes for tier progress bars, point history list, leaderboard
745a4f0 test(trust-score): getNextTierProgress() + tier-badge emoji + description coverage
6e5c0ab polish(trust-score): Dani visual polish — leaderboard podium tints, point history icons + relative time, tier progress bar, empty state
165238c copy(trust-score): warm UX copy for tiers, point events, push notifications
```

---

### 1. TypeScript (`tsc --noEmit`)

**PASS — EXIT:0. Zero type errors.**

---

### 2. Jest (`jest --passWithNoTests`)

**RESULT: 2 suites FAIL, 88 PASS — 19 tests fail, 1433 pass.**

#### Failing suites

| Suite | Root cause |
|-------|-----------|
| `src/lib/__tests__/createAnonFlag.test.ts` | `createAnonFlag` is NOT exported from `src/lib/flags.ts` on this branch — it lives on `feat/phase5-anon-reporting` only. All tests in this suite call a function that doesn't exist here. |
| `src/lib/__tests__/anonRateLimit.test.ts` | `Cannot find module '../anonRateLimit'` — `src/lib/anonRateLimit.ts` does not exist on this branch. It belongs on the anon-reporting branch. |

**Root cause:** Both test files for anon-reporting features (`createAnonFlag.test.ts` and `anonRateLimit.test.ts`) were accidentally committed onto the trust-score branch. These tests belong exclusively on `feat/phase5-anon-reporting`.

**Fix required:** Remove both files from the trust-score branch:
```bash
git rm src/lib/__tests__/createAnonFlag.test.ts src/lib/__tests__/anonRateLimit.test.ts
```

---

### 3. Code Review

#### Key files reviewed
- `src/lib/reputationTier.ts` — pure tier logic
- `src/lib/pointEvents.ts` — point event history fetch
- `src/lib/__tests__/reputationTier.test.ts` — tier test coverage
- `src/screens/TasksScreen.tsx` — flash banner point display
- `supabase/migrations/2026-05-30_trust_score_system.sql` — migration

#### 🔴 BLOCKER — TasksScreen flash banner shows stale point values

The trust-score migration (`2026-05-30_trust_score_system.sql`) replaces `handle_flag_status_change` with new point values:

| Event | Old (schema.sql) | New (migration) |
|-------|-----------------|-----------------|
| Reporter: verified | +5 | +10 |
| Reporter: resolved | +10 | +15 |
| Actor: verified | +2 | +3 |
| Actor: resolved | +5 | +7 |

**TasksScreen still shows the old values** (`TasksScreen.tsx:484–491`):

```tsx
// Line 484 — should be +10 / +3
const msg = isOwn ? 'Verified! +5 points' : 'Verified! +2 points';
// Line 491 — should be +15 / +7
const msg = isOwn ? 'Resolved! +10 points' : 'Resolved! +5 points';
```

**CLAUDE.md explicitly documents this coupling:**
> "Flash-banner points in TasksScreen are now coupled to the trigger in `supabase/schema.sql` (handle_flag_status_change). If the trigger values ever change, update the +5/+10/+2/+5 strings in `setStatus` to match."

Once the migration is applied, every user who verifies or resolves a flag will see a flash banner that under-reports their points. A user who earns +10 will see "+5 points". This is a UX lie and will erode trust in the point system.

**Fix required (in TasksScreen.tsx):**
```tsx
// Line 484
const msg = isOwn ? 'Verified! +10 points' : 'Verified! +3 points';
// Line 491
const msg = isOwn ? 'Resolved! +15 points' : 'Resolved! +7 points';
```

#### ✅ reputationTier.ts — excellent pure logic

- `safePoints()` defensive coercion handles `null`, `undefined`, `NaN`, `±Infinity` → 0 (Bronze). Good.
- `getTier()` walks top-down from Platinum, guaranteed to return Bronze (0-threshold floor). Correct.
- `getNextTierProgress()` returns 1.0 for Platinum (no next tier). Correct.
- `matchesTier()` is a clean predicate for feature gates.
- All boundary conditions (99→100 Silver, 499→500 Gold, 1499→1500 Platinum) confirmed correct via test coverage.

#### ✅ pointEvents.ts — solid with graceful degradation

- `getPointEventHistory()` has a 42P01 guard (undefined_table): returns `[]` if the migration hasn't been applied yet. This is the right defensive pattern.
- Cap of 50 rows is sensible — prevents unbounded fetches.

#### ✅ Migration quality (2026-05-30_trust_score_system.sql)

- Correctly marked PROPOSE-ONLY. Good.
- All triggers use `SECURITY DEFINER` with `SET search_path = public`. Good.
- All functions have `REVOKE EXECUTE ... FROM public, anon, authenticated`. Good.
- Idempotent via `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`. Good.
- Full rollback block included. Good.
- Comment vote cap `IF total_votes <= 10` after INSERT counts including the new row — so this rewards exactly 10 votes, not 11. Confirmed correct.
- Spam penalty only fires on admin rejection (`auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true)`). Good constraint.
- Streak bonus recursion guard (`IF NEW.event_type = 'streak_bonus' THEN RETURN NEW`). Correct.

---

### 4. UX / Flow Concerns

- **Tier badges are decorative** — the design spec marks tier emojis as decorative (hide from screen readers). Verified in the a11y commit. No concern.
- **Point history empty state** — degrades gracefully when `point_events` table absent (42P01 guard). Good.
- **Leaderboard** — `LeaderboardModal.tsx` exists and is referenced in `ProfileScreen.tsx`. Not deep-audited but no obvious regressions.

---

### 5. Verdict — trust-score

## ❌ NOT READY

**Blockers (must fix before merge):**

1. **TasksScreen.tsx:484–491 — stale flash-banner point values.** After the migration applies, users will see incorrect "+5" when they earn "+10". Fix is a 2-line change. This is explicitly called out in CLAUDE.md.

2. **Stranded test files.** Remove `src/lib/__tests__/createAnonFlag.test.ts` and `src/lib/__tests__/anonRateLimit.test.ts` from this branch, or port `createAnonFlag` and `anonRateLimit.ts` to this branch (likely the wrong choice — they belong on anon-reporting).

Both are quick fixes. Once resolved, re-run `tsc` + `jest` and resubmit for gate.

---

---

## Branch 2 — `feat/phase5-anon-reporting`

### Commits on this branch (vs main)

```
73638ed polish(anon-reporting): Dani Design Compile — token sweep on anon UI
```

(Note: the bulk of the anon-reporting implementation is in earlier commits that aren't explicitly in this branch's diff vs main — the branch carries a large changeset including the Sentry integration, `anonRateLimit.ts`, `createAnonFlag`, and the full ReportFlagModal anon flow.)

---

### 1. TypeScript (`tsc --noEmit`)

**FAIL — EXIT:2. 1 type error:**

```
src/lib/sentry.ts(1,25): error TS2307: Cannot find module '@sentry/react-native'
  or its corresponding type declarations.
```

**Root cause:** `@sentry/react-native` is in `package.json` at version `~7.2.0` but is NOT installed in `node_modules`. The `@sentry/` scope directory exists but is empty.

---

### 2. Jest (`jest --passWithNoTests`)

**FAIL — 90/90 suites fail, 0 tests run.**

Every suite fails to run with:
```
Cannot find module '@sentry/react-native' from 'jest.setup.js'
```

`jest.setup.js` has `jest.mock('@sentry/react-native', () => ({...}))` — the mock factory is correct, but Jest's resolver cannot find the module to register the mock against because it's not installed. 0 tests run across the entire test suite.

**Root cause: same as tsc** — `@sentry/react-native` not installed.

---

### 3. Code Review

#### Key files reviewed
- `src/lib/sentry.ts` — Sentry wrapper
- `src/lib/anonRateLimit.ts` — per-device rate limiting
- `src/lib/flags.ts` (`createAnonFlag`) — anon flag insertion
- `src/screens/ReportFlagModal.tsx` — anon submission flow
- `supabase/migrations/` — all migrations on this branch

#### 🔴 BLOCKER 1 — `@sentry/react-native` not installed

`package.json` lists `"@sentry/react-native": "~7.2.0"` but `npm install` has not been run. Fix:

```bash
npm install @sentry/react-native --legacy-peer-deps
```

**Additional note:** `@sentry/react-native` requires Expo config plugin setup in `app.json` and may need a `pod install` on iOS for native bindings. If this isn't a full native Sentry integration (just error reporting), the simpler path is to remove the import in `sentry.ts` and use a lightweight error capture that doesn't need native modules — but that's a scope decision for Shamus/Sky, not Gary. At minimum, `npm install` must run.

#### 🔴 BLOCKER 2 — Missing anon INSERT RLS policy on `public.flags`

`createAnonFlag` inserts a row with `user_id` not set (NULL), called from an unauthenticated Supabase session (anon role). **No INSERT policy exists for the `anon` role on `public.flags`.**

Current state in all migrations:
```sql
create policy "flags insert own"
  on public.flags for insert
  to authenticated                          -- ← authenticated only
  with check ((select auth.uid()) = user_id);
```

Under PostgREST implicit deny, an `anon`-role INSERT will return a `403 Forbidden` error. The JSDoc on `createAnonFlag` says:
> "Privacy contract (enforced here AND by DB RLS WITH CHECK)"

But that DB WITH CHECK does not exist.

**Required migration (new file):**

```sql
-- supabase/migrations/2026-06-01_anon_flag_insert.sql
-- PROPOSE-ONLY — Sky applies in Supabase Dashboard.

-- Allow unauthenticated (anon) users to insert flags.
-- The WITH CHECK enforces user_id IS NULL so anon rows cannot
-- impersonate any authenticated user's UUID.
DROP POLICY IF EXISTS "flags anon insert" ON public.flags;
CREATE POLICY "flags anon insert"
  ON public.flags FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
```

This is the companion migration to `2026-05-29_anon_flags_select.sql` (which added anon SELECT) — anon INSERT was omitted and is required for the feature to function.

#### ✅ `createAnonFlag` — good coordinate validation

```ts
if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw ...
if (lat < -90 || lat > 90) throw ...
if (lng < -180 || lng > 180) throw ...
```

Validates before any DB call. Payload correctly omits `user_id` (DB stores NULL). `photo_url: null` (Storage RLS requires `auth.uid()` in path — anon can't upload). Good.

#### ✅ `anonRateLimit.ts` — clean sliding window

- 5 submissions per 24-hour sliding window. Implementation is correct.
- `loadTimestamps()` is defensive: returns `[]` on parse failure or empty storage.
- `checkAnonRateLimit()` does not record — caller must call `recordAnonSubmit()` on success. Design is correct and mirrors the test spec.
- Rate limit is **client-side only** (AsyncStorage per device, not per IP). This is expected for a lightweight feature — a user clearing app storage or using a second device can bypass it. Acceptable tradeoff for MVP; document as known limitation.

#### ✅ `ReportFlagModal.tsx` — clean anon flow

- `isAnon = !user` gate is clean.
- `checkAnonRateLimit()` called before `setSubmitting(true)` — correct order (cheap check runs before showing spinner).
- Alert on limit reached includes both "Sign In" and "OK" options. Good UX.
- Anon path skips photo upload and context tags — intentionally simplified. Documented in-code.
- `track('flag_created', ...)` call after anon submit — analytics event fires correctly regardless of auth state.
- Anon banner accessibility: `accessibilityLabel="Reporting anonymously. Your identity is not stored."` with `accessibilityRole` on the "Sign in" link. Alex-approved pattern.
- Template chip picker is hidden in anon mode (`!isAnon && templates.length > 0`). Correct — templates aren't needed for the simplified anon form.

---

### 4. UX / Flow Concerns

- **No server-side rate limit** — client-side AsyncStorage is the only guard. A cleared cache bypasses it. Acceptable for MVP; worth a follow-up server-side check (DB function counting anon inserts per IP/fingerprint). Not a blocker.
- **Anon flag visible in Tasks tab immediately** — anon flags are `status: 'open'` and will appear in the Tasks list. Tasks tab shows `user_id === current user.id` for "my reports" — anon flags have `user_id = NULL` so they won't appear in any user's "my reports" filter. Correct.
- **"Sign in" link inside anon banner calls `onClose`** — this closes the modal and drops the user back to the map where they can tap Sign In. Acceptable UX, though a direct navigation to SignInScreen would be more direct. Not a blocker.

---

### 5. Verdict — anon-reporting

## ❌ NOT READY

**Blockers (must fix before merge):**

1. **`npm install @sentry/react-native --legacy-peer-deps` not run.** Breaks tsc and all 90 test suites. Zero test coverage on this branch currently. After installing: verify `jest.setup.js` mock works and re-run the full suite.

2. **Missing DB migration: anon INSERT policy on `public.flags`.** `createAnonFlag()` will fail at runtime with a PostgREST 403. This is not covered by the mocked test suite. A companion migration file must be added and marked PROPOSE-ONLY. Suggested SQL provided above.

Both are well-defined fixes. After resolving, re-run tsc + jest and resubmit for gate.

---

---

## Decisions for Sky / Rory

1. **trust-score point values** — The new migration changes reward amounts significantly (+5→+10, +10→+15, +2→+3, +5→+7). Confirm these values are final before Shamus updates the flash banner strings. If the values change again before merge, the banner will need another update.

2. **Sentry integration scope** — Does `feat/phase5-anon-reporting` intend full native Sentry (with EAS build plugin, iOS pod install, DSN in secrets) or a lightweight stub? The anon-reporting branch has a real `@sentry/react-native` integration. If this is premature (no DSN configured yet), reverting `sentry.ts` to the trust-score stub pattern removes both blockers from the sentry side.

3. **Merge order** — These branches share a large common base. If both land, trust-score should merge first (it has the point trigger migration that anon-reporting's point tracking depends on). Verify there's no migration conflict between `2026-05-30_trust_score_system.sql` and the anon flag insert migration.

4. **anon-reporting test coverage after sentry fix** — Once `@sentry/react-native` is installed, verify the `createAnonFlag.test.ts` and `anonRateLimit.test.ts` suites pass completely (they are on this branch and test the right files here).

---

## What Each Branch Needs to Ship

### trust-score (2 fixes)
- [ ] `src/screens/TasksScreen.tsx:484` — change `'+5 points'` → `'+10 points'`, `'+2 points'` → `'+3 points'`
- [ ] `src/screens/TasksScreen.tsx:491` — change `'+10 points'` → `'+15 points'`, `'+5 points'` → `'+7 points'`
- [ ] `git rm src/lib/__tests__/createAnonFlag.test.ts src/lib/__tests__/anonRateLimit.test.ts`
- [ ] Re-run: `tsc` must stay 0, `jest` must be 0 failures

### anon-reporting (2 fixes)
- [ ] `npm install @sentry/react-native --legacy-peer-deps` (+ any required Expo plugin wiring in `app.json`/`metro.config.js`)
- [ ] Add `supabase/migrations/2026-06-01_anon_flag_insert.sql` with anon INSERT policy (PROPOSE-ONLY)
- [ ] Re-run: `tsc` must be 0 errors, `jest` all suites must pass

---

*Gary — QA Lead. Report only. Sky and Rory decide the merge.*
