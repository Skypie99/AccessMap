# Jordan Privacy Gate — Guest Sign-In + Hamburger Menu
**Date:** 2026-05-29
**Role:** Jordan (Privacy Officer)
**Branch:** `feat/guest-signin-hamburger-menu-2026-05-29`
**Trigger:** Jordan Trigger #4 — new auth flow (guest/unauthenticated sign-in)
**Verdict:** APPROVE WITH CONDITIONS

---

## Scope Reviewed

Stash `stash@{0}` (WIP, pre-merge) on branch `feat/guest-signin-hamburger-menu-2026-05-29`, plus the committed branch head (`597848d feat(ui): Round 1 liquid-glass design overhaul`). Files examined:

- `App.tsx` — `Gate` component, guest mode state
- `src/screens/SignInScreen.tsx` — new `onGuest` prop + guest CTA
- `src/navigation/RootNavigator.tsx` — hamburger button, `HamburgerDrawer` wiring
- `src/components/HamburgerDrawer.tsx` — drawer nav, sub-screen modals, sign-in/sign-out action
- `src/screens/HowToHelpScreen.tsx` — static content modal
- `src/screens/ResourcesScreen.tsx` — static placeholder modal
- `src/lib/flagsStore.tsx` — `FlagsProvider`, offline cache, fetch logic
- `src/lib/flags.ts` — `listFlags`, `listFlagsPage`
- `src/lib/supabase.ts` — client initialisation
- `src/lib/auth.tsx` — `AuthProvider`, session context
- `src/screens/ReportFlagModal.tsx` — submit guard
- `src/screens/MapScreen.tsx` — Report FAB wiring
- `supabase/schema.sql` — full RLS posture for all tables

---

## 6-Trigger Findings

### Trigger 1 — Location Data

**Finding: LOW RISK. No new location exposure introduced.**

Guest mode renders `RootNavigator` directly with no authenticated user. `MapScreen` uses `expo-location` for the Report FAB pre-fill, but:

1. Location is requested only when `ReportFlagModal` opens to place a GPS pin.
2. `ReportFlagModal.tsx` line 183 guards: `if (!user) { Alert.alert('Not signed in', 'Sign in to report a flag.'); return; }` — the submit path aborts immediately. The modal can be opened by a guest (the FAB is still visible), but no location data is transmitted or persisted.
3. Guest users can browse the already-public map without providing location. This matches the existing web demo path (no change in exposure).

**No new location risk.**

---

### Trigger 2 — Disability Data

**Finding: NO CHANGE. No new disability-related fields introduced.**

`HowToHelpScreen` and `ResourcesScreen` are purely static content screens — no data collection, no forms, no fields. `HamburgerDrawer` renders navigation links only. The disability-adjacent flag category/severity data structure is unchanged.

**No disability data risk.**

---

### Trigger 3 — PII Beyond Auth

**Finding: LOW RISK. Guest mode persists no user data — with one observation.**

Guest mode is a pure client-side boolean (`guestMode` state in `Gate`, App.tsx). It is:
- Not written to AsyncStorage
- Not sent to Supabase
- Not readable across sessions (resets on app restart; guest re-sees the sign-in screen on next launch)

No email, display name, push token, or any PII is collected or stored for guests.

**Observation (non-blocking):** The `RegisterPushToken` path in `auth.tsx` only runs when `session?.user` is non-null — it cannot fire in guest mode. No risk here.

**No PII risk.**

---

### Trigger 4 — RLS / Auth / Session Change (PRIMARY TRIGGER)

**Finding: CONDITIONAL APPROVAL. RLS is safe, but one structural gap must be addressed.**

#### What guest mode does to the auth layer

Guest mode sets a React state flag (`guestMode = true`) and renders `RootNavigator` without calling `supabase.auth.signInAnonymously()` or any Supabase anonymous auth. The Supabase client retains no session. All Supabase queries run under the **anon** key with no JWT — i.e., the `anon` role.

#### RLS posture for the anon role

Every policy on `public.flags`, `public.users`, and `public.push_tokens` is scoped to `to authenticated`:

```sql
create policy "flags readable by authenticated"
  on public.flags for select
  to authenticated
  using (true);

create policy "flags insert own"
  on public.flags for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
```

There is **no `to anon` policy on any table**. This means:
- Anon SELECT on `flags` → **blocked by RLS** (PostgREST returns empty result set, not an error)
- Anon INSERT/UPDATE/DELETE on any table → **blocked by RLS**
- Anon access to `push_tokens` → **blocked by RLS**
- Anon access to `users` → **blocked by RLS**

#### The gap: guest map view will show zero flags

`listFlags()` and `listFlagsPage()` in `flags.ts` use the Supabase client with no auth JWT in guest mode. With the current RLS policies (anon = no policies = implicit deny), these queries will return empty results or a 403 depending on Supabase version. The map will be blank for all guests.

This is a **UX blocker**, not a privacy risk — but Shamus must make a deliberate decision here before building further. The two options are:

**Option A (recommended by Jordan):** Add a narrow anon SELECT policy for `flags` only:
```sql
create policy "flags readable by anon"
  on public.flags for select
  to anon
  using (true);
```
This is privacy-safe because flags contain no PII — they have lat/lng, category, severity, description, and a photo_url. No email, no user identity (only a UUID `user_id` with no join possible under anon). This is functionally identical to the existing web demo path.

**Option B:** Pass a `publicClient` using the anon key without auth headers explicitly, or use `supabase.auth.signInAnonymously()` (Supabase anonymous auth). This is heavier and introduces an actual session row in `auth.users` — not preferred.

**Condition 1 (required before Shamus builds the guest map rendering):** Either implement Option A (add anon SELECT policy for `flags`) or explicitly document that guest map will show zero flags and the Report FAB will be the only affordance (which is confusing UX). Sky decides; Jordan approves both, but Option A is strongly recommended.

#### No anon write risk

Even with Option A, all write policies remain `to authenticated`. Anon INSERT/UPDATE/DELETE on flags, users, or push_tokens will continue to be blocked by RLS. No guest can create, verify, or modify any flag.

---

### Trigger 5 — External API Sending User Data

**Finding: CLEAN. No new third-party calls introduced.**

New packages added: `expo-blur`, `expo-linear-gradient`, `@expo/vector-icons`. These are:
- Rendering-only packages (blur effects, gradients, icon fonts)
- Zero network activity
- No analytics, no telemetry, no data transmission

`HamburgerDrawer`, `HowToHelpScreen`, `ResourcesScreen`, and `LogoMark` are all client-only components. No new external API calls anywhere in the diff.

**No external data transmission risk.**

---

### Trigger 6 — New Data Persistence

**Finding: CLEAN. Guest mode persists nothing.**

`guestMode` is React state — ephemeral, in-memory, not written to AsyncStorage or any database. On app restart, guest mode resets and the user sees the sign-in screen again. This is the correct and privacy-safe design.

The offline flag cache (`@accessmap/offline_flags_v1:<userId>`) is keyed by `userId`. With no userId in guest mode, `flagsStore.tsx` skips the cache write (line: `if (currentUserId && isDefaultStatuses) { void writeFlagsCache(...) }`). No guest flag data is cached.

**No new persistence risk.**

---

## RLS Blast Radius Analysis

Full table coverage of the anon role:

| Table | anon SELECT | anon INSERT | anon UPDATE | anon DELETE |
|---|---|---|---|---|
| `public.flags` | BLOCKED (no anon policy) | BLOCKED | BLOCKED | BLOCKED |
| `public.users` | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| `public.push_tokens` | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| `storage.objects` (flag-photos) | Public bucket, URL-based (no RLS needed) | BLOCKED (authenticated only) | n/a | BLOCKED |

**If Option A is implemented (anon SELECT on flags):**

| Table | anon SELECT | anon INSERT | anon UPDATE | anon DELETE |
|---|---|---|---|---|
| `public.flags` | ALLOWED (lat, lng, category, severity, description, photo_url, status, created_at — no PII) | BLOCKED | BLOCKED | BLOCKED |
| All others | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

This is a safe blast radius. No PII is exposed via the flags table under anon.

---

## Conditions for Approval

**Condition 1 (REQUIRED — blocks Shamus building guest map feature):**
Shamus must implement one of the following before the guest map renders anything:

- **Option A (recommended):** Add an anon SELECT policy for `public.flags`. Supply the following migration file at `supabase/migrations/2026-05-29_anon_flags_read.sql`:
  ```sql
  -- Allow unauthenticated (anon/guest) users to read flags.
  -- Flags contain no PII (no email, no display_name; user_id UUID cannot
  -- be reverse-looked-up under the anon role). This mirrors the existing
  -- web demo path and enables the guest map view.
  drop policy if exists "flags readable by anon" on public.flags;
  create policy "flags readable by anon"
    on public.flags for select
    to anon
    using (true);
  ```
  This migration must be created as a PROPOSE-ONLY file. Do not apply it to the live database — follow Const. Art. 5. Sky/Dana apply separately.

- **Option B:** Leave guest map intentionally blank and add a `<Text>Sign in to see the map</Text>` empty state. If this is the chosen path, document it explicitly in the PR description.

**Condition 2 (RECOMMENDED — non-blocking):**
The Report FAB should be hidden or disabled for guest users rather than showing an alert on submit. The current behavior (FAB visible → tap → modal opens → fill in form → submit → alert "not signed in") is a privacy-adjacent UX problem: the form collects location permission and description text before telling the user they can't submit. Shamus should guard the FAB at render time:

```tsx
// In MapScreen.tsx — hide Report FAB for guests (authUser === null)
{authUser && (
  <Pressable onPress={() => setReportOpen(true)} ...>
    <Text>＋ Report</Text>
  </Pressable>
)}
```

This is a polish condition, not a hard blocker. Jordan approves shipping without it, but it should land before the feature exits beta.

**Condition 3 (RECOMMENDED — non-blocking):**
The footnote on `SignInScreen` currently reads:
> "Location is only used when reporting a flag. Your email is never shown publicly."

This is accurate. No change needed. Jordan confirms the copy is compliant.

---

## Summary

The guest sign-in flow is architecturally sound. The design is correct — guest mode is ephemeral state, no PII is collected or persisted, RLS blocks all writes from the anon role, and the existing report gate at `ReportFlagModal` line 183 correctly prevents unauthenticated flag submission.

The single real issue is a functional gap: the flag SELECT policies require the `authenticated` role, so guests on the current schema will see a blank map. This must be resolved via Condition 1 before Shamus builds out the guest map rendering. The resolution (add anon SELECT on flags) is a safe, one-line migration.

No privacy blockers. No new PII exposure. No external data leakage. No disability data exposure.

**APPROVE WITH CONDITIONS (Conditions 1 required, 2 and 3 recommended).**

---

## Decisions for Sky

| # | Decision | Who | Action |
|---|---|---|---|
| **Option A vs B** | Should guest users see the live flag map (Option A: add anon SELECT policy) or see a blank/empty state (Option B: no migration)? | Sky | Jordan approves both; Option A recommended |
| **Condition 2** | Hide Report FAB for guests at render time rather than surfacing alert on submit | Sky/Shamus | Polish — recommended before beta exit |

---

*Jordan (Privacy Officer) — AccessMap*
*This gate covers Jordan Trigger #4 (auth flow change). No other triggers fired at blocking severity.*
