# D4 Realtime Flags — Jordan Privacy Review
**Role:** Jordan (privacy/PII reviewer)
**Date:** 2026-05-28
**Branch reviewed:** `feat/d4-realtime-flags-2026-05-28`
**Spec:** `qa-reports/2026-05-28_Dana_D4-RealtimeFlags-Filtered-SQL.md`
**Implementation:** `qa-reports/2026-05-28_Shamus_D4-Client-Implementation.md`
**Tests:** `qa-reports/2026-05-28_Gary_D4-Tests.md`
**Read-only:** Yes. No code modified. No Supabase mutating tools called.

---

## Overall Verdict: PASS

All 6 privacy properties verified. No failures. Two low-severity observations noted (acknowledged by Shamus, both within acceptable posture).

---

## Property Verification Table

| Property | Verdict | File:Line | Notes |
|----------|---------|-----------|-------|
| PRIV-1: Broadcast payload contains only {id, status}; re-fetch always via RLS-gated endpoint | **PASS** | `src/lib/flagsStore.tsx:358-363` (payload extraction); `src/lib/flags.ts:391-399` (fetchFlagById via `supabase.from('flags').select(...)`) | Only `flagId` is extracted from the broadcast payload. Full row re-fetched exclusively via `fetchFlagById()` which uses the standard Supabase REST client (RLS-enforced). No sensitive columns (`lat`, `lng`, `category`, `severity`, `description`, `user_id`, `photo_url`) are read from the broadcast. |
| PRIV-2: Per-user opt-in toggle defaults to OFF | **PASS** | `src/lib/realtimePrefs.ts:21,36-39`; `src/lib/realtimePrefs.ts:63` | `STORAGE_KEY = 'realtime_enabled'`. `loadRealtimeEnabled()` returns `raw === 'true'` — absent key (null) evaluates to `false`. `useRealtimeEnabled` initializes `useState(false)` synchronously, then hydrates from disk asynchronously. Both paths default to `false`. `FlagsProvider` at `flagsStore.tsx:349` calls `loadRealtimeEnabled()` and returns immediately (no subscription) if result is `false`. |
| PRIV-3: Geofence filter actively DISCARDS flags outside viewport (not just logs) | **PASS** | `src/lib/flagsStore.tsx:378-379`; `src/screens/MapScreen.tsx:279-295` | `if (gate && !gate(freshFlag)) return;` at line 379 — hard discard via early return before any state mutation. MapScreen registers a predicate that performs a bounding-box comparison. No log-only path exists; failure of the gate stops the state update cold. |
| PRIV-4: log_realtime_event called on BOTH subscribe AND unsubscribe | **PASS** | `src/lib/flagsStore.tsx:401` (subscribe); `src/lib/flagsStore.tsx:410` (unsubscribe) | Subscribe: `void logRealtimeEvent('subscribe', D4_CHANNEL)` inside `status === 'SUBSCRIBED'` callback. Unsubscribe: `void channelRef.unsubscribe().then(() => void logRealtimeEvent('unsubscribe', D4_CHANNEL))` in the effect cleanup. Note: if `enabled === false`, `channelRef` is never set (line 350 returns early), so the unsubscribe path is gated on `if (channelRef)` (line 408) — no spurious unsubscribe log when the feature was never enabled. Correct behavior. |
| PRIV-5: No new client-side data persistence beyond legitimate flag state (no caching of broadcast payloads) | **PASS** | `src/lib/flagsStore.tsx:238` (only write path to offline cache) | `writeFlagsCache()` is called only inside `refresh()` (line 238), which writes `fetchedRows` from the paginated REST endpoint. The realtime payload handler (`lines 357-396`) never calls `writeFlagsCache` or `AsyncStorage.setItem`. The `{id, status}` broadcast content is never persisted. Only `realtime_enabled` (a boolean feature toggle with no PII) is written to AsyncStorage by `realtimePrefs.ts`. |
| PRIV-6: No new client-side external API endpoints sending user data anywhere new | **PASS** | `src/lib/realtimeLog.ts:26-29` (only external call); diff scope | The only new outbound call is `supabase.rpc('log_realtime_event', { p_event, p_channel })` — this writes to the project's own Supabase instance, not a third-party endpoint. `p_event` is one of `'subscribe'`/`'unsubscribe'` (not PII). `p_channel` is the literal string `'flags-status'` (not PII). No `fetch()`, `axios`, `XMLHttpRequest`, or third-party SDK calls added. `realtimePrefs.ts` is AsyncStorage-only. |

---

## Code References — Key Lines

| Concern | File | Lines | Observation |
|---------|------|-------|-------------|
| Payload only extracts `id` | `src/lib/flagsStore.tsx` | 358–363 | `raw.new` and `raw.old` only accessed for `.id` field — no other columns read. Cast to `{ id?: string }` prevents accidental access to other fields even if the publication were misconfigured. |
| Re-fetch path uses standard RLS client | `src/lib/flags.ts` | 391–399 | `supabase.from('flags').select(...).eq('id', flagId).maybeSingle()` — identical to the existing fetch path, no bypass. |
| Default-off guard in FlagsProvider | `src/lib/flagsStore.tsx` | 349–351 | `if (!mounted || !enabled) return;` — if `loadRealtimeEnabled()` returns false, the async body exits before creating any channel. |
| Gate discard is unconditional return | `src/lib/flagsStore.tsx` | 378–379 | `if (gate && !gate(freshFlag)) return;` — early return after full row is fetched but before `setFlags`. No partial state update occurs. |
| Both log call sites | `src/lib/flagsStore.tsx` | 401, 410 | Both calls use `void` (fire-and-forget); neither blocks the subscribe/unsubscribe flow. |
| No broadcast payload persistence | `src/lib/flagsStore.tsx` | 357–396 | The entire realtime handler body contains zero `AsyncStorage.setItem` or `writeFlagsCache` calls. |

---

## Observations (Non-Blocking)

These were raised as open questions by Shamus and are within acceptable posture. Jordan confirms neither constitutes a privacy violation.

### OBS-1 — Device-scoped `realtime_enabled` key (Shamus OQ-1)

**Concern:** `AsyncStorage` key `realtime_enabled` is not user-scoped. If two users share one device, the second user inherits the first user's realtime preference.

**Jordan assessment:** Acceptable. The value is a feature toggle (`"true"` / `"false"`) with no PII content. The worst-case cross-user leak is that User B inherits User A's preference for receiving realtime flag status updates — not location data, not disability context, not identity. The realtime subscription itself is authenticated per-user (Supabase Realtime requires a valid JWT), so the subscription created for User B is scoped to User B's session regardless of the toggle value.

**Recommended follow-up (non-blocking):** If multi-user device sharing becomes a documented use case, use a user-scoped key: `@accessmap/realtime_enabled:${userId}`. This is a UX improvement, not a privacy remediation.

### OBS-2 — Gate-absent window on app launch (Shamus OQ-2)

**Concern:** Between app launch and `setViewportGate` executing (one render cycle), `viewportGateRef.current === null`. During that window, realtime events pass without geofencing.

**Jordan assessment:** Acceptable. Two mitigating factors: (1) The realtime subscription itself only starts after `loadRealtimeEnabled()` resolves, which is an async operation taking at minimum one event-loop tick after component mount. By the time any events could arrive, `setViewportGate` will have executed. (2) Even if an event arrived during this window, it would call `fetchFlagById` via the RLS-gated endpoint and update state — which is the same behavior as a normal flag refresh. No sensitive data is leaked; the gate is a cosmetic scope filter, not a data-access control.

**The gate logic at `flagsStore.tsx:378`:** `if (gate && !gate(freshFlag)) return;` — the `gate &&` check means a null gate passes all flags. This is correct defensive behavior for the launch window: when MapScreen hasn't registered a predicate yet, all flags are accepted (same as no-realtime behavior).

---

## Privacy Posture Summary

D4 Option 2 (filtered broadcast) maintains a correct privacy posture. Compared to Option 1 (full-row broadcast), this implementation:

1. Never transmits `lat`, `lng`, `category`, `severity`, `description`, `user_id`, or `photo_url` over the Realtime channel.
2. All sensitive data travels exclusively via the existing RLS-enforced REST endpoint.
3. The feature is opt-out by default (users must actively enable it).
4. Geofence enforcement is active discard, not passive logging.
5. Observability logging is scoped to the user's own session (SECURITY DEFINER function with `auth.uid()` enforcement server-side).
6. No new external data destinations introduced.

The implementation matches the spec (Dana) and the client wiring described in Shamus' report. Gary's 21 tests cover the critical privacy invariants at the unit level.

---

## Const. Art. 5 Compliance

No Supabase mutating MCP tools called. No migrations applied. No code modified. Read-only review only.

---

## Next Step

D4 client code is privacy-approved. Pending: Sky applies Dana's SQL via the Supabase dashboard Cowork prompt. After that, the filtered broadcast goes live.
