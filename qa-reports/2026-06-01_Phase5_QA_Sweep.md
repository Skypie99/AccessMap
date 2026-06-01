# Phase 5 QA Sweep — Gary + Peter + Steve
**Date:** 2026-06-01  
**Branch:** `feat/phase5-qa-sweep`  
**Scope:** Phases 1–5, with Phase 5 (trust score, anon reporting, AppText rollout) as primary focus

---

## TL;DR

| Role | Status | Fixes Applied | Blockers |
|------|--------|---------------|----------|
| Gary (Tests) | ✅ Clean | 2 (test + TS) | 0 |
| Peter (Performance) | ⚠️ One MEDIUM | 0 (propose-only) | 0 |
| Steve (Security) | 🔴 2 CRITICAL | 0 (DB-side, Sky applies) | 2 migration applies needed |

**Before this sweep:** 1 failing test suite, 149 TS errors across 3 files  
**After this sweep:** 94/94 suites pass, 1530 tests, `tsc --noEmit` clean

---

## Gary — Test Coverage

### Test Run Results (after fixes)
```
Test Suites: 94 passed, 94 total
Tests:       136 todo, 1530 passed, 1666 total
TypeScript:  0 errors (tsc --noEmit clean)
```

### Fixes Applied

#### Fix 1 — OnboardingCards.tsx: Unicode curly quotes as JS string delimiters (CRITICAL)
**Root cause:** The CARDS array in `src/components/OnboardingCards.tsx` used Unicode typographic quotes (`‘` / `’`) as JS string delimiters instead of ASCII straight quotes `'`. TypeScript can't parse these — they're not valid JS string tokens. This caused 149 cascading TS parse errors.

**Affected lines:** 91–120 (the CARDS constant), plus several style strings.

**Fix:** Replaced all `\xe2\x80\x98` (LEFT SINGLE QUOTATION MARK) and `\xe2\x80\x99` (RIGHT SINGLE QUOTATION MARK) bytes with ASCII `'` (0x27). Same pass also ran on `ProfileScreen.tsx` and `TasksScreen.tsx` which had the same issue (1 occurrence each, both in `Alert.alert()` strings).

**Likely cause:** Copy-paste from a design document or rich-text editor (Notion/Word/Google Docs) that auto-corrects quotes.

**Note:** After the byte replacement, Jest's transform cache was stale. Cleared with `npx jest --clearCache` — all tests passed clean.

#### Fix 2 — ReportFlagModal.test.tsx: Missing `font.family` in `@/theme` mock (CRITICAL)
**Root cause:** The `@/theme` mock at line 197 of `src/screens/__tests__/ReportFlagModal.test.tsx` defined `font.size` and `font.weight` but omitted `font.family`. `AppText.tsx` reads `font.family.display` (etc.) at module load time to build `VARIANT_FAMILY`, causing a crash before any test ran:

```
TypeError: Cannot read properties of undefined (reading 'display')
  at Object.display (src/components/ui/AppText.tsx:39:27)
```

**Fix:** Added `font.family` to the mock with all 8 font family strings matching the real theme:
```js
family: {
  display: 'PlusJakartaSans_800ExtraBold',
  displayBold: 'PlusJakartaSans_700Bold',
  body: 'PublicSans_400Regular',
  bodyMedium: 'PublicSans_500Medium',
  bodySemibold: 'PublicSans_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_600SemiBold',
},
```

**Result:** ReportFlagModal.test.tsx now passes 19/19 tests covering the full anon/auth routing surface.

### Critical Path Coverage Audit

| Flow | Test File | Status |
|------|-----------|--------|
| Authenticated flag submission | `createFlag.test.ts`, `flags.test.ts`, `flags.supabase.test.ts` | ✅ Covered |
| Anonymous flag submission | `createAnonFlag.test.ts`, `ReportFlagModal.test.tsx` | ✅ Covered |
| Anon rate limiting | `anonRateLimit.test.ts` | ✅ Covered |
| Trust score / reputation tier | `reputationTier.test.ts` | ✅ Covered |
| Onboarding completion | `onboarding.test.ts`, `onboardingState.test.ts` | ✅ Covered |
| Sign-in / sign-out | *(no test file found)* | ⚠️ **Gap** |
| Points trigger (verify/resolve) | `points.test.ts`, `pointEvents.test.ts` | ✅ Covered |

**Sign-in gap:** There is no test for `signIn()`, `signUp()`, or `signOut()` from `src/lib/auth.tsx` / `supabase.ts`. These are thin wrappers around Supabase Auth SDK calls, so the risk is low — but a smoke-level test asserting correct arguments to the Supabase client would close the loop. Flagging as **PROPOSE-ONLY** work.

### 136 `it.todo()` stubs
Not failures — these are intentional placeholder stubs for future features (reopen flow, offline queue, guidance text). Spread across `offlineCache.test.ts`, `reportTemplates.test.ts`, `flags.test.ts`, and others. Normal for in-progress features.

---

## Peter — Performance

### MapScreen: filteredFlags recalculates on every GPS tick (MEDIUM)

**Location:** `src/screens/MapScreen.tsx:709–743`

`filteredFlags` is a `useMemo` that includes `location` in its deps array. When distance filtering is ON, this is correct — the haversine calculation needs the user's current position. But when `distanceFilterEffective === false`, the `location` dep causes the full filter pass to re-run on every GPS position update (can be 1–10 Hz on an active device).

**Cost on typical use:** Low — GPS updates while the map is open can be frequent (highway driving, active commutes). The filter pass iterates all loaded flags and runs O(n) category/severity/tag checks. With 200+ flags loaded, this is ~50 μs per tick but adds up to measurable CPU churn over a session.

**Proposed fix (not applied — Sky approves):**
```ts
const filteredFlags = useMemo(() => {
  if (!filtersActive) return flags;
  return flags.filter((f) => {
    // … category/severity/tag checks …
    if (!distanceFilterEffective || maxDistanceKm === null || !location) return true;
    return haversineKm({ lat: location.lat, lng: location.lng }, { lat: f.lat, lng: f.lng }) <= maxDistanceKm;
  });
}, [flags, activeCategories, minSeverity, filtersActive, activeDisabilityTags,
   distanceFilterEffective, maxDistanceKm,
   ...(distanceFilterEffective ? [location] : [])]);  // conditional dep
```

### All-Clear Items

- **useEffect at line 192** (`refreshSavedPlaces`): No cleanup needed — it's a void async call guarded by `placesMountedRef`. No leak.
- **useEffect at line 913** (initialRegion sync): Intentional `eslint-disable` comment for dep omission. Correct pattern — just a ref update, no cleanup needed.
- **`initialRegion` useMemo** at line ~897: Tight dependency on `location` only. Correct and minimal.
- **`heatCells` useMemo**: Correctly gated on `heatmapEnabled` and `filteredFlags`. No excess recomputation.
- **OnboardingCards Animated.Values**: Created once via `useRef` — no leak. `AccessibilityInfo` subscription is properly cleaned up with `sub.remove()` in the return function.
- **ProfileScreen re-renders**: 24 `useState` hooks but each is narrowly scoped. Refresh-key pattern (`reportsRefreshKey`, etc.) correctly limits re-fetch scope on tab focus.
- **`getTier()` call in FlagDetailModal**: Called inside an event handler (`handleReopenSubmit`), not in render body. No re-render cost.
- **`reputationTier.ts` functions**: Pure O(4) functions. No optimization needed at current scale.

---

## Steve — Security

### 🔴 CRITICAL-1: Anon INSERT policy is PROPOSE-ONLY — not yet applied to DB

**File:** `supabase/migrations/2026-05-30_anon_flag_reporting_photo_fix.sql`

The `"flags anon insert"` RLS policy lives only in the migrations folder as a proposal. The base `supabase/schema.sql` has NO anon INSERT policy. Until this migration is applied, `createAnonFlag()` will fail with a **403 "violates row-level security policy"** error from Supabase — anonymous flag reporting is **completely non-functional in production**.

**The migration is well-designed** — it correctly enforces:
```sql
with check (
  user_id  is null
  and photo_url is null
)
```
— blocking both user_id spoofing and photo URL injection.

**Action required (Sky):**
1. Apply `supabase/migrations/2026-05-29_account_deletion_cascade.sql` first (makes `user_id` nullable — prerequisite).
2. Apply `supabase/migrations/2026-05-30_anon_flag_reporting_photo_fix.sql` (adds the anon INSERT policy with both guards).
3. Smoke test: submit an anonymous flag from the app, confirm `user_id IS NULL` and `photo_url IS NULL` in the Supabase Table Editor.

### 🔴 CRITICAL-2: Anon SELECT policy (`"flags readable by anon"`) also PROPOSE-ONLY

**File:** `supabase/migrations/2026-05-29_anon_flags_select.sql`

Same category — the anon SELECT policy for the guest browse feature is also PROPOSE-ONLY. Until applied, unauthenticated / guest users see a blank map (no flags returned).

**Action required (Sky):** Apply `supabase/migrations/2026-05-29_anon_flags_select.sql` if the guest browse feature is intended to be live. Jordan reviewed and approved this migration — no PII concerns (`public.flags` contains no email/name/token; `user_id` is UUID only and cannot be reverse-looked-up via the anon role since `public.users` has no anon SELECT policy).

### MEDIUM: AsyncStorage rate limit is bypassable via reinstall

**File:** `src/lib/anonRateLimit.ts`

The 5-per-24-hour anon submission quota is enforced entirely via `AsyncStorage`. A user who reinstalls the app (or clears storage) resets their quota. No server-side IP or device throttle.

**Risk:** A determined bad actor can flood the map with anonymous spam flags — ~5 per reinstall cycle.  
**Accepted trade-off:** Jordan approved AsyncStorage-only enforcement as acceptable for early-stage community. The flag moderation path (admin screen + reject action) provides mitigation.  
**Phase 2 hardening:** Add a Supabase Edge Function that checks recent INSERTs by IP (`request.headers['x-forwarded-for']`) before allowing the anon INSERT.

### MEDIUM: Reputation tier threshold is client-side only (not server-enforced)

**File:** `src/components/FlagDetailModal.tsx:465–510`

The reopen vote threshold (`Bronze = 3, Silver = 2, Gold/Platinum = 1`) is evaluated entirely in the app. A patched client could set `getTier(Infinity)` → get Platinum → use a 1-vote threshold regardless of actual points.

**Risk:** LOW in practice — the vulnerability only affects the reopen system, which is a convenience feature. The server tracks the raw vote count but doesn't validate the threshold the client used to decide whether to reopen.  
**Accepted trade-off:** Documented in the codebase as "Wave C scaffolding — `getTier(null)` until profile data flows into FlagDetailModal." The real fix (pass `user.points` from AuthContext) is F10 Phase 2 work.

### MEDIUM: `getTier(null)` hardcodes Bronze — all users appear Bronze tier (UX gap)

**File:** `src/components/FlagDetailModal.tsx:480`

```typescript
const tier = getTier(null); // defaults to Bronze until profile data is available
```

High-reputation users (Silver/Gold/Platinum) see the wrong reopen threshold in the UI ("3 more requests needed" when they actually only need 1). This is a UX bug, not a security issue, but it negates the user benefit of the reputation system for the reopen feature.

**Fix path:** Expose `public.users.points` through `AuthContext` (or a `ProfileContext`). The data already exists in the DB and is fetched in ProfileScreen. A shared hook (`useProfile()`) would make it available in FlagDetailModal without a prop-drilling chain.

### MEDIUM: Reopen vote dedup is client-side only (same category as rate limit)

The per-flag, per-session dedup that prevents a single user from submitting multiple reopen votes on the same flag uses AsyncStorage. Clearing storage allows re-voting. Documented and accepted in the migration (`2026-05-30_flag_reopen_requests.sql`). Phase 2 hardening: server-side bloom filter or hashed token log.

### GOOD: Photo URL injection guard is effective

`createAnonFlag()` explicitly sets `photo_url: null` in the payload, and the RLS policy enforces `photo_url IS NULL` at the DB layer. An anon client cannot inject an arbitrary image URL into a flag row. Storage RLS (`auth.uid()` in upload path) remains enforced for all uploads. This is a well-designed two-layer guard.

### GOOD: RLS policies are correct and non-overlapping

The authenticated and anon INSERT policies are mutually exclusive:
- `"flags insert own"` (`to authenticated`): requires `auth.uid() = user_id`
- `"flags anon insert"` (`to anon`): requires `user_id IS NULL`

An authenticated user cannot accidentally null their `user_id`; the `"flags insert own"` policy would reject such a row. Sound design.

---

## DECISIONS FOR SKY

1. **Apply these two migrations in Supabase dashboard (in order):**
   - `supabase/migrations/2026-05-29_account_deletion_cascade.sql` — makes `flags.user_id` nullable
   - `supabase/migrations/2026-05-29_anon_flags_select.sql` — enables guest map browse
   - `supabase/migrations/2026-05-30_anon_flag_reporting_photo_fix.sql` — enables anon flag submission
   
   Both Phase 5 features (guest browse + anon reporting) are **non-functional until these are applied.**

2. **`filteredFlags` distance-filter performance fix:** Approve or defer the conditional-dep approach for the `location` dep in MapScreen's `filteredFlags` useMemo. Low urgency but measurable on active GPS devices.

3. **Sign-in/sign-out smoke test:** Worth adding a minimal test for `signIn()`/`signOut()` wrappers in a future Gary cycle.

4. **`getTier(null)` → profile-aware:** The F10 scaffolding note in `FlagDetailModal.tsx:480` should be resolved before shipping reputation tiers as a user-facing benefit. Consider a `useProfile()` hook to surface `points` from AuthContext.

---

## Files Changed in This Sweep

| File | Change |
|------|--------|
| `src/components/OnboardingCards.tsx` | Replace Unicode curly-quote string delimiters with ASCII `'` |
| `src/screens/ProfileScreen.tsx` | Replace Unicode curly-quote (1 occurrence in Alert string) |
| `src/screens/TasksScreen.tsx` | Replace Unicode curly-quote string delimiters (Alert strings) |
| `src/screens/__tests__/ReportFlagModal.test.tsx` | Add `font.family` to `@/theme` mock |
