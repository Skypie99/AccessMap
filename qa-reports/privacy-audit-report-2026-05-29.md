# AccessMap — Privacy & Data Compliance Audit (2026-05-29)

**Auditor:** Jordan, Privacy Officer  
**Timeline:** 2026-05-28 → 2026-05-29  
**Scope:** 12+ uncharted branches built 2026-05-26–27 (D-NEW-9)  
**Authority:** Constitution Art. 7.6 (Mandatory Privacy Gate)

---

## Executive Summary

### Overall Status: 🚫 **BLOCKED** (Critical unresolved privacy issue)

**Blocker:** EXIF/GPS metadata in uploaded flag photos is **NOT** being stripped before storage. This exposes user home/work locations to disclosure and is a **pre-launch privacy violation** per Const. Art. 7.3. 

**All other findings:** ✅ PASS or ⚠️ CONDITIONAL PASS with clear remediation paths.

---

## Branches Audited

| # | Branch | Type | Finding |
|---|---|---|---|
| 1 | `feat/push-notifications-2026-05-25` | Feature | ⚠️ CONDITIONAL PASS |
| 2 | `feat/auto-2026-05-25-shamus-wave6-notif-prefs` | Feature | ✅ PASS |
| 3 | `feat/photo-triage-2026-05-25` | Feature | 🚫 BLOCKED |
| 4 | `feat/offline-cache-2026-05-25` | Feature | ✅ PASS |
| 5 | `feat/distance-filter-2026-05-25` | Feature | ✅ PASS |
| 6 | `feat/edit-profile-2026-05-25` | Feature | ✅ PASS |
| 7 | `feat/recently-viewed-2026-05-25` | Feature | ✅ PASS |
| 8 | `feat/auto-2026-05-25-shamus-watched-search` | Feature | ✅ PASS |
| 9 | `feat/shamus-flag-deeplink-detail-2026-05-27` | Feature | ✅ PASS |
| 10 | `feat/notify-flag-status-2026-05-27` | Feature | ✅ PASS |
| 11 | `feat/heat-map-severity-2026-05-27` | Feature | ✅ PASS |
| 12 | `a11y/auto-2026-05-25-alex-wave6-settings-onboarding` | A11y | ✅ PASS |
| 13 | `security/hardening-wave2-2026-05-27` | Hardening | 🚫 BLOCKED |

---

## Detailed Findings

### 🚫 BLOCKER #1: EXIF/GPS Metadata in Flag Photos

**Severity:** CRITICAL (Pre-Launch Gate)  
**Location:** `feat/photo-triage-2026-05-25`, `security/hardening-wave2-2026-05-27`  
**Reference:** `qa-reports/2026-05-25_Dana_EXIF_GPS_Leak.md` (Dana's pre-launch finding)

#### The Issue

Flag photos are uploaded to Supabase Storage **without EXIF metadata stripping**. This exposes:
- GPS coordinates embedded in photos taken from users' homes/work locations
- Timestamps indicating when/where users were present
- Camera model + other device fingerprinting data
- Potentially other PII embedded by the camera/phone

**Attack surface:**
- Files stored in Supabase Storage retain full EXIF headers
- Accessible to: Supabase admins, Storage bucket readers, any third-party service integrating with the bucket
- User-visible downloads include EXIF data
- Users may not be aware they're sharing location data

#### Current Status (Audit Date 2026-05-29)

✗ **NO EXIF STRIPPING IMPLEMENTED** on any branch  
✗ **NO WARNING PROMPT** to users  
✗ **NO STORAGE-LEVEL POLICY** to strip EXIF on server-side

Code audit of `feat/photo-triage-2026-05-25:src/lib/flags.ts`:
```typescript
// uploadFlagPhoto() — NO EXIF processing
const response = await fetch(localUri);
const arrayBuffer = await response.arrayBuffer();
// ...directly upload to Supabase Storage without stripping
```

#### Decision Status

**Dana's finding** dated 2026-05-25 identified three options:
- **Option A:** Strip EXIF on upload (client-side + server-side Edge Function) — **RECOMMENDED**
- **Option B:** Disallow uploads entirely
- **Option C:** Add user warning (insufficient alone)

**Status:** 🟡 **OPEN** — Awaiting Sky decision on which option to pursue.

#### Our Audit Verdict

This is a **pre-launch blocker** per Constitution Art. 7.3 (Privacy Pillar):
> "AccessMap must never ship a feature that collects or persists accessibility-user location data without explicit, informed consent and a documented retention policy."

Accessibility users are a targeted population. Unintended location exposure through photos violates their trust.

**ACTION REQUIRED BEFORE MERGE:**
1. Sky decision: Option A (EXIF strip), Option B (disable photos), or Option C (warning only)
2. If Option A: Route to Steve (security review) + Shamus (client-side + server-side implementation)
3. If Option B or C: Document decision + brief Dani on feature scope change

---

### ⚠️ CONDITIONAL PASS: `feat/push-notifications-2026-05-25`

**Components:** Push token storage, notification preferences, Edge Function triggers  

#### Location Data: ✅ PASS

**Finding:** Push tokens are device identifiers, NOT location data. The token table schema (`supabase/migrations/2026-05-25_push_tokens.sql`) stores:
- `user_id` (UUID, FKed to users.id on delete cascade)
- `token` (opaque Expo push token string)
- `platform` (ios/android/web enum)
- `created_at`, `updated_at` (timestamps)

**No location columns.** ✅

#### PII Storage: ✅ PASS (with caveats)

**Finding:** Push tokens are **device identifiers**, not PII. They're not personally identifiable on their own; they only link to user accounts through the user_id column. RLS policies enforce:
- Owner-only read/insert/update/delete
- Service-role bypass (Edge Function uses service key)

**Caveat:** Tokens CAN be linked to identity if exfiltrated + cross-referenced with Expo's systems. But this is an **Expo platform risk**, not an AccessMap one.

**Verdict:** ✅ Safe as implemented.

#### Metadata & Consent: ✅ PASS

**Finding:** No EXIF/metadata risks on push tokens (they're opaque strings). 

**Consent model:** Opt-in + persistent toggle. User stores preference in AsyncStorage (local-only). No server-side preference table yet (that's the D2 schema pending Dana review).

**Verdict:** Consent flow is sound. ✅

#### Sign-Out Cleanup: ✅ PASS

**Finding:** `src/lib/supabase.ts:signOut()` calls:
```typescript
const { deletePushToken } = await import('./pushNotifications');
await deletePushToken(userId);
```

Push token deleted from `push_tokens` table on sign-out. ✅

**Verdict:** ✅ PASS — Conditional on D2 (push_tokens schema) being merged. Once merged, this is fully clean.

#### Overall: ⚠️ **CONDITIONAL PASS**

- **Condition:** D2 (`supabase/migrations/2026-05-25_push_tokens_table.sql`) must be applied before notifications go live in production. Schema + RLS are sound; no changes required.
- **Action:** Notify Rory (DevOps) when D2 is approved for migration apply.

---

### ✅ PASS: `feat/auto-2026-05-25-shamus-wave6-notif-prefs`

**Component:** Notification preferences (on-device only)

#### Finding

Notification prefs stored in AsyncStorage at key `@accessmap/notification_prefs_v1:{userId}`:
```typescript
export interface NotificationPrefs {
  notifyOnOpen: boolean;
  notifyOnVerified: boolean;
  notifyOnResolved: boolean;
  notifyOnRejected: boolean;
}
```

- **No PII:** Just 4 booleans.
- **No location:** Purely UI control (gates which banner notifications appear).
- **User-scoped key:** Two users on same device don't leak each other's prefs.
- **Defensive load:** Missing fields default to `true` (backwards-compatible).
- **No server sync:** Local-only (yet). If future multi-device sync is added, this becomes a Supabase table with the same shape.

#### Verdict

✅ **PASS** — No privacy concerns. Clean, minimal, defensive design.

---

### ✅ PASS: `feat/offline-cache-2026-05-25`

**Component:** Offline tile cache + AsyncStorage caching

#### Finding

Tile cache (`src/lib/tileCache.ts`) — audited in main branch; same in this branch:
- **User-keyed:** Every key includes `userId`; cache isolated per account
- **Sign-out cleanup:** `clearTileCache(userId)` called from `signOut()` (verified in supabase.ts)
- **Size-bounded:** Max 50 MB per user, LRU eviction to 40 MB
- **TTL-managed:** 7-day expiry (tiles auto-drop after 7 days)
- **No PII:** Just opaque map tiles (raster data)

**Additional cache:** Offline flags cache
- Key: `@accessmap/offline_flags_v1:{userId}`
- Sign-out cleanup wired: ✅ (verified in supabase.ts)

#### Verdict

✅ **PASS** — All Jordan conditions met (C1–C5 offline-tiles, offline-flags).

---

### ✅ PASS: `feat/distance-filter-2026-05-25`

**Component:** Distance calculation + location hooks for Tasks/Profile screens

#### Finding

`src/lib/location.ts`: One-shot location fetch (not a tracker).

**Privacy gates:**
- **Foreground permission:** Explicit OS prompt (Expo-managed)
- **No persistence:** Location stored in React state, not in AsyncStorage or DB
- **No background tracking:** One-time "where am I?" fetch only
- **graceful degradation:** If permission denied, location stays null; screen shows no distance data
- **requireExistingPermission flag:** Profile's Nearest card respects Constitution Art. 9.6 (privacy-sensitive prompts user-initiated, never auto on tab focus)

**Web path:** Uses browser Geolocation API (same permission semantics as native).

#### Verdict

✅ **PASS** — Excellent privacy-by-design. No consent violations, no unauthorized tracking.

---

### ✅ PASS: `feat/edit-profile-2026-05-25`

**Component:** User profile updates (display_name, avatar)

#### Finding

`src/lib/users.ts:updateUserProfile()`:
```typescript
export async function updateUserProfile(
  userId: string,
  patch: UserProfilePatch,
): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  // ...
}
```

- **User-scoped:** Only the authenticated user can update their own row (RLS enforces via `auth.uid()`)
- **No sensitive fields exposed:** avatar_url, display_name only
- **No auth token leakage:** Avatar uploads use UUID path prefix (storage RLS enforces owner-only access)

#### Verdict

✅ **PASS** — Standard user profile pattern, RLS-protected, no privacy leaks.

---

### ✅ PASS: `feat/recently-viewed-2026-05-25`

**Component:** "Recently viewed flags" list (on-device tracking of flag IDs user opened)

#### Finding

Stored in AsyncStorage at `@accessmap/recently_viewed_v1:{userId}`:
- List of 10 flag IDs, most-recent first
- User-scoped key (no cross-user leak)
- Bounded to prevent unbounded growth
- Sign-out cleanup: ✅ (wired in supabase.ts)
- **No location data:** Just flag IDs, which are public anyway (users can see all flags on the map)

#### Verdict

✅ **PASS** — Minimal, bounded, local-only tracking. No privacy concern.

---

### ✅ PASS: `feat/auto-2026-05-25-shamus-watched-search`

**Component:** "Watched flags" list (user's bookmarks of flags they're tracking)

#### Finding

Stored in AsyncStorage at `@accessmap/watched_flags_v1:{userId}`:
- List of flag IDs user is watching
- Bounded to 200 entries
- User-scoped key
- Sign-out cleanup: ✅ (wired in supabase.ts)
- **Purely local:** No server sync (future multi-device sync would add a Supabase table)

#### Verdict

✅ **PASS** — Same pattern as recently-viewed. No PII, no location exposure.

---

### ✅ PASS: `feat/shamus-flag-deeplink-detail-2026-05-27`

**Component:** Deep-linking to flag details (URI: `accessmap://flag/:flagId`)

#### Finding

`src/navigation/RootNavigator.tsx`:
```typescript
const linking = {
  prefixes: ['accessmap://'],
  config: {
    screens: {
      Map: 'flag/:flagId',
    },
  },
};
```

- **Only exposes flag ID:** No lat/lng in the URI
- **No user context:** Deep-link doesn't include auth token or user ID
- **Standard React Navigation:** Uses platform-native linking APIs (safe)

**Verdict:** ✅ **PASS** — Deep-link surface is minimal, non-sensitive.

---

### ✅ PASS: `feat/notify-flag-status-2026-05-27`

**Component:** Edge Function that sends push notifications on flag status change

#### Finding

`supabase/functions/notify-flag-status/index.ts`:

**Security:**
- ✅ Shared-secret auth (`X-Webhook-Secret` header required)
- ✅ Status-change guard (only fires if `record.status != old_record.status`)
- ✅ Input validation (rejects malformed records)
- ✅ Oracle prevention (all paths return 'ok', no token enumeration)
- ✅ No sensitive logging: Function comments explicitly state "DO NOT log push tokens — they are device identifiers (PIPEDA personal information)"

**Privacy:**
- No location data sent in notifications (only flag ID + status)
- No user consent logs (Expo handles token format validation)

#### Verdict

✅ **PASS** — Excellent security hardening. No PII leakage, no tracking risk.

---

### ✅ PASS: `feat/heat-map-severity-2026-05-27`

**Component:** Heatmap with k-anonymity floor

#### Finding

`src/lib/heatmap.ts`:
```typescript
/**
 * Two non-negotiable conditions baked in by Jordan (privacy review):
 * 1. K-anonymity floor (k>=3): cells with fewer than kFloor flags are
 *    dropped entirely.
 * 2. The severity scale must be disclosed in the UI.
 */

export const DEFAULT_K_FLOOR = 3;

export function bucketFlagsToCells(
  flags: ReadonlyArray<FlagRow>,
  opts: BucketOptions = {},
): HeatCell[] {
  const kFloor = opts.kFloor ?? DEFAULT_K_FLOOR;
  // ... drops cells with < 3 flags
}
```

**Grid design:**
- 0.005° cells (~555m N–S block scale)
- Grid bucketing is simple, auditable, easy to tune
- No geohashing (easy to understand and reverse if needed)

**UI disclosure:**
- HeatmapLegend modal explains the severity scale (mean severity 1.00–5.00)
- Per-cell numeric label shows mean severity

#### Verdict

✅ **PASS** — K-anonymity floor enforced, grid scale appropriate, disclosure clear.

---

### ✅ PASS: `a11y/auto-2026-05-25-alex-wave6-settings-onboarding`

**Component:** Accessibility settings + onboarding

#### Finding

Accessibility preferences (`src/lib/accessibility.ts`):
- **System-level only:** Uses `AccessibilityInfo.isReduceMotionEnabled()` (iOS/Android native API)
- **No storage:** Reads live system preference on each call
- **No user-defined prefs persisted:** Callers (MapScreen, etc.) suppress animations based on live system state

**Settings screen:** Displays existing toggles (dark mode, notification prefs) — already audited above.

#### Verdict

✅ **PASS** — No new privacy concerns. System-level prefs are appropriate for accessibility features.

---

### 🚫 BLOCKER #2: `security/hardening-wave2-2026-05-27` (Inherits EXIF blocker)

This branch is a hardening pass that **includes the unresolved EXIF issue** from Branch #1. Same blocker applies.

Additionally:
- **No additional privacy findings** beyond the EXIF leak
- **Security hardening looks sound** (webhook auth, oracle prevention, etc.)
- **Will be unblocked once Dana's EXIF decision is resolved and implemented**

---

## Privacy & Data Checklist

| Category | Finding | Verdict |
|---|---|---|
| **Location tracking** | No unauthorized tracking. One-shot permission-gated fetches only. | ✅ |
| **Location data persistence** | No home/work addresses stored in DB (flags use user-reported lat/lng only) | ✅ |
| **Tile cache + offline flags** | User-scoped, TTL-managed, cleared on sign-out | ✅ |
| **Push tokens** | Device identifiers, RLS-protected, deleted on sign-out | ✅ |
| **Notification preferences** | Local-only, user-scoped, 4 booleans only | ✅ |
| **Recently viewed + Watched** | Local-only, user-scoped, ID lists only (public data) | ✅ |
| **User profile edits** | RLS-protected, minimal fields (name + avatar URL) | ✅ |
| **Photo EXIF/GPS** | 🚫 **NOT STRIPPED** — Critical blocker | 🚫 |
| **Consent flow** | Permission prompts appropriate, no dark patterns | ✅ |
| **Sign-out cleanup** | All local caches + push tokens cleared | ✅ |
| **PII logging** | No sensitive data logged; function comments prevent token logging | ✅ |
| **Deep-linking** | URI exposes only flag IDs, no location/auth | ✅ |
| **Heatmap privacy** | k≥3 anonymity floor enforced, UI disclosure clear | ✅ |

---

## Consent & GDPR Readiness

### Current State

- **Permission prompts:** ✅ Wired for location, push tokens, accessibility
- **Privacy policy:** Not yet referenced in CLAUDE.md or app.json. **ACTION:** Add privacy policy URL to app config before launch
- **Data export:** Not wired (no `dataExport` utility yet, though exists in codebase)
- **Account deletion:** Not wired (Supabase Auth can delete auth.users, but public.users cleanup not confirmed)
- **Retention policy:** Not documented (tiles: 7d TTL ✅, offline flags: 24h TTL ✅, push tokens: user-lifetime or app-lifetime ?)

### Gaps

1. **Privacy policy URL** not linked in app
2. **Account deletion flow** not wired (no "Delete my account" button)
3. **Data retention policy** not published to users (tiles/flags/tokens TTL needs transparency)

### Verdict: ⚠️ **CONDITIONAL GDPR-READY**

Assuming:
- Privacy policy is published at app launch
- Account deletion flow is wired (can be done post-launch if Sky approves)
- Retention times (7d tiles, 24h offline, lifetime tokens) are disclosed

These are **launch-readiness items** (Day 2 polish), not blockers.

---

## Summary of Action Items

### 🚫 BLOCKER — MUST RESOLVE BEFORE MERGE

1. **EXIF/GPS Metadata Leak**
   - Decision: Sky chooses Option A (EXIF strip), B (disable photos), or C (warning)
   - Route to: Steve (security) + Shamus (implementation)
   - Timeline: Decision needed TODAY/TOMORROW for merge wave Friday/Monday

### ⚠️ CONDITIONAL — MERGE OK IF CONDITIONS MET

2. **Push Notifications (D2 pending)**
   - Condition: `supabase/migrations/2026-05-25_push_tokens_table.sql` must be merged before feature goes live
   - Status: Awaiting Dana review (D2)
   - Action: Notify Rory once approved

### 💚 BEST-EFFORT — LAUNCH-READINESS POLISH

3. **Privacy Policy Link**
   - Add PRIVACY_POLICY_URL to app.json + SignInScreen footer
   - Owner: Will (docs) + Dani (UI placement)
   - Timeline: Before app launch

4. **Account Deletion Flow**
   - Wire "Delete my account" button in ProfileScreen
   - Trigger: Sky decision (launch-day or post-launch)
   - Owner: Shamus (UI) + Rory (schema cleanup)

5. **Data Retention Disclosure**
   - Add to Privacy Policy: "Tile cache: 7 days | Offline flags: 24 hours | Push tokens: until sign-out or deletion"
   - Owner: Will (docs)

---

## Appendix: Audit Scope & Methodology

**Branches audited (13 total):**
- `feat/push-notifications-2026-05-25`
- `feat/auto-2026-05-25-shamus-wave6-notif-prefs`
- `feat/photo-triage-2026-05-25`
- `feat/offline-cache-2026-05-25`
- `feat/distance-filter-2026-05-25`
- `feat/edit-profile-2026-05-25`
- `feat/recently-viewed-2026-05-25`
- `feat/auto-2026-05-25-shamus-watched-search`
- `feat/shamus-flag-deeplink-detail-2026-05-27`
- `feat/notify-flag-status-2026-05-27`
- `feat/heat-map-severity-2026-05-27`
- `a11y/auto-2026-05-25-alex-wave6-settings-onboarding`
- `security/hardening-wave2-2026-05-27`

**Audit focus:**
1. Location data — tracking, retention, consent
2. PII — storage method, sign-out cleanup, logging
3. EXIF/metadata — photo handling, stripping
4. Disability data — preference storage, opt-in vs opt-out
5. Consent flows — prompts, privacy policy, GDPR

**Methodology:**
- Code inspection (TypeScript, SQL migrations, Edge Functions)
- RLS policy review (Supabase security)
- AsyncStorage key audit (user-scoping, cleanup)
- Sign-out flow tracing (all caches cleared?)
- Pre-existing findings cross-ref (Dana's EXIF report)

---

## Jordan's Approval

**Auditor:** Jordan, Privacy Officer  
**Date:** 2026-05-29  
**Signature:** Reviewed and authorized for escalation to Sky

**Next gate:** Sky decision on EXIF option (A/B/C) → Route to Steve + Shamus → Re-audit post-implementation

---

**Report status:** AWAITING SKY DECISION ON EXIF BLOCKER
