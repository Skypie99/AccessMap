# AccessMap — Fence-feature proposals (#5, #7, #8)
_2026-06-17 · companion to the Creative/UI/UX audit. These 3 of the 10 UX ideas CANNOT be built in the presentation-only, branch-only, fences-untouched mode the overhaul runs in — each crosses a data/auth/privacy line and needs Sky's explicit decision. READ-ONLY analysis; nothing here is built._

I'll output the proposals directly as text:

## Fence-feature proposals (#5, #7, #8)

---

### Feature #5: Before/after resolution photos
**Pairing a "fixed" photo with the original when a flag is resolved.**

#### What crosses the fence:
1. **EXIF stripping pipeline** — new resolution photos follow the same `uploadFlagPhoto()` flow as flag reports (EXIF/GPS strip, verify, upload to `flag-photos` bucket).
2. **Photo junction table expansion** — current `flag_photos` table (2026-05-30 migration) stores photos linked to a `flag_id`. Resolvers will add photos to already-closed flags, requiring no schema change (photos tagged by position/creation timestamp instead).
3. **Storage path/RLS** — the resolver's uploaded photo must land at `<resolver_id>/<timestamp>.jpg` per existing Storage RLS policy (`split_part(name,'/',1) = auth.uid()`). Public read already permitted.

#### Presentation-layer safety first, then fence-crossing:

**PHASE 1 (Build now — no backend changes):**
- Add optional `resolution_photo_uri` state to `FlagDetailModal` (the modal where status changes to `resolved`).
- Wire `uploadFlagPhoto(user.id, localUri)` to capture the resolution photo.
- On successful upload, call `addFlagPhoto(flagId, url)` — the junction table already allows any authenticated user to insert (line 48–50 of migration).
- UI: show a "📸 Add resolution photo" button below status buttons when status is transitioning to `resolved` (only show during the status-change moment, not after).
- Render both photos side-by-side in the detail modal when resolved: original (from flag row) on left, resolution (most recent junction entry) on right. Handle null gracefully if resolver didn't attach one.

**PHASE 2 (Fence-crossing — needs Sky approval):**
- Currently there is no way to distinguish *which* photos in the junction table are resolution photos vs. community evidence added before the fix. Add an optional `photo_type` enum column (`original | evidence | resolution`) to `flag_photos` to tag them post-hoc.
- OR: simpler design — **just use insertion order**. Since resolution photos are only added at the moment of status → resolved, they'll naturally be the last photos in the junction row's position order. Display logic: "if status=resolved and flag_photos.length > 1, show the LAST photo as the resolution shot."

#### Risk & rollback:
- **Risk: Medium.** The EXIF stripping gate is battle-tested (flags.ts). Storage upload already enforces path-level RLS so a malicious user can't upload to another's folder. If the `addFlagPhoto()` call fails mid-flow, the photo sits orphaned in Storage (same as current flag-photo orphan cleanup hazard; Edge Function sweep already handles this).
- **Rollback:** Delete `photo_type` column if added. Reset UI to not offer the resolution-photo affordance. Orphaned photos in Storage are invisible to users (already acceptable per Decision 5).

#### Effort:
**Small (S).** ~2–3 hours. Reuse `uploadFlagPhoto()`, hook it into FlagDetailModal, render two-photo layout in detail modal.

#### Recommendation:
**Build PHASE 1 immediately (UI + upload reuse).** PHASE 2 (schema tagging) can wait until Sky's next active session if at all—the simple "last photo = resolution" heuristic works fine for MVP. This delivers a real feature with zero schema migrations.

---

### Feature #7: Voice-to-text search
**Hands-free address/flag search via microphone → speech recognition.**

#### What crosses the fence:
1. **Microphone permission** — iOS/Android require explicit runtime permission grant (`expo-av` or `expo-speech-recognition` for native; Web Speech API on browser).
2. **Speech-to-text backend** — three options:
   - **On-device (React Native):** Expo SDK 54 has no native speech recognition. Requires native module (e.g., `react-native-speech-to-text` from npm, or Expo prebuild).
   - **Cloud API (Web):** Browser's `SpeechRecognition` (Chromium-based) or cloud service (Google Cloud Speech, Azure, OpenAI Whisper via API).
   - **Native bridge:** React Native doesn't ship with this; would need `react-native-speech-to-text` or similar.
3. **Privacy cliff:** Transcript leaves the device (unless on-device only). Requires privacy disclosure + data-handling contract if using cloud.

#### Presentation-layer safety first, then fence-crossing:

**PHASE 1 (Build now — pure UI, no audio):**
- Add a 🎤 button next to the search input in `AddressSearchModal` (match the SearchInputRow's visual style).
- Wire the button to set a loading state + announce "Listening…" via AccessibilityInfo.
- Call a stub function `startVoiceSearch()` that immediately fails with "Voice search coming soon" so the UX flow is wired.
- Landing: the button is visible, the affordance is clear, but no audio is captured until backend is ready.

**PHASE 2 (Fence-crossing — needs Sky approval):**
- Choose audio transport:
  - **For web:** use browser's `SpeechRecognition` API (free, Chromium-only; Safari/Firefox fall back). Add feature-detect + disable gracefully.
  - **For native:** conditionally add `react-native-speech-to-text` and request microphone permission via `expo-permissions` / `expo-av`. Wrap in try/catch so missing module doesn't crash on Android.
- Implement `startVoiceSearch()` to:
  1. Request microphone permission.
  2. Start recording transcript.
  3. On final result, call `searchAddress(transcript)` (same debounce + Nominatim flow as typed text).
  4. Reset to "ready to type" state.
- Add privacy copy: "Your voice is sent to [service] for conversion to text" (match the app's privacy posture).

#### Risk & rollback:
- **Risk: Medium-high.** Speech recognition is notoriously accuracy-sensitive (accents, noise). Gibberish queries → empty Nominatim results → user confusion. Requires user testing.
- **Regression:** Web-only support is acceptable (Chromium + Safari fallback to text input). Native support can ship later.
- **Rollback:** Hide the 🎤 button via feature flag or remove the feature module. Typed search still works.

#### Effort:
**Medium (M).** 4–6 hours for web + graceful native fallback. Another 2–3 hours per platform (iOS/Android) if using native module. Test on real device.

#### Recommendation:
**Build PHASE 1 now (UI + stub).** PHASE 2 (web SpeechRecognition only, no native module) is a 3-hour follow-up. Defer native support until user feedback says it's valuable. This keeps the surface area small and testable.

---

### Feature #8: Leaderboard time-windows
**All-time / This Month / This Week display modes on the leaderboard.**

#### What crosses the fence:
1. **Backend schema/triggers** — current `users.points` is a flat counter (cumulative, all-time). Time-windowed points require:
   - New table `point_events` (user_id, event_type, points_delta, created_at) — audit log of every point change.
   - OR: add `points_*_period` columns to `users` (points_all_time, points_month, points_week) and refresh them on a cron schedule or via trigger recalc.
   - OR: compute at query-time using a WHERE clause on `handle_flag_status_change` created_at timestamps (slowest, requires complex window functions).
2. **Gamification psychology:** showing "this week" can create unhealthy point-chasing. Needs Sky's intent check.

#### Presentation-layer safety first, then fence-crossing:

**PHASE 1 (Build now — UI only, mock data):**
- Add a toggle/segmented-control in `LeaderboardModal` header: `[All-time] [This Month] [This Week]`.
- Wire each tap to set a local state variable `timeWindow: 'all_time' | 'month' | 'week'`.
- Keep the same `listLeaderboard()` call for all windows; just mark which window is selected (UI-only, no backend query yet).
- Visually differentiate: "Leaderboard · **This Week**" in the title, subtle highlight on the selected toggle button.
- Add a helpful subtitle: "Top contributors **this week**" (updates with selected window).

**PHASE 2 (Fence-crossing — needs Sky approval):**
- Option A (simple): Add `points_month` and `points_week` columns to `users`, updated by the trigger or a nightly cron Edge Function that sums recent events.
  - Pros: fast, cached.
  - Cons: 6-hour stale data (cron runs once per night).
- Option B (real-time): Keep a `point_events` audit table; recompute the window at query time using `WHERE created_at > now() - interval '1 week'`.
  - Pros: exact.
  - Cons: slow on large datasets; `listLeaderboard(limit=20)` becomes a complex GROUP BY + ORDER BY.
- Option C (hybrid): Store `points_*_period` cached, but update them via the same trigger as all-time points (no new cron). Trigger recalc on each point award.
  - Pros: always fresh, no cron.
  - Cons: trigger complexity, small query overhead.

**Recommended:** Option C. The trigger `handle_flag_status_change()` already fires on every status change. Add three columns (`points_all_time`, `points_week`, `points_month`) and update all three in the trigger. For weeks/months: read the current time, subtract 7/30 days, and SUM only events in that window within the trigger logic.

- Create new RPC `listLeaderboardByWindow(window: 'all_time' | 'week' | 'month', limit: int)` that selects from `users` ordering by the appropriate points column.
- Wire `LeaderboardModal` tab changes to call the new RPC.

#### Risk & rollback:
- **Risk: Medium.** Trigger complexity increases. If the recalc math is wrong, leaderboard ranks become nonsense (but readable data, not a security issue). Needs unit tests on the trigger.
- **Gamification concern:** weekly leaderboards can encourage unhealthy grinding. Needs explicit Sky sign-off that this aligns with app values.
- **Rollback:** Drop the new columns; queries revert to `order by points_all_time`. The UI still renders (tabs just all show the same ranking).

#### Effort:
**Medium (M).** 5–7 hours:
- 2 hours: add columns + test trigger logic.
- 2 hours: create RPC + schema migration.
- 1–2 hours: wire React state to RPC calls + visual differentiation.
- 1 hour: test across all three windows + edge cases (no activity this week).

#### Recommendation:
**Build PHASE 1 now (UI toggle + mock, no backend).** Defer PHASE 2 pending Sky's decision on whether weekly leaderboards fit the app's ethics. If approved, it's a straightforward trigger + RPC + hook wiring (ship in ~6 hours total).

---

## Summary table

| Feature | Fence Parts | Effort | Go-Build | Defer-to-Sky |
|---------|-------------|--------|----------|--------------|
| #5 Before/after photos | EXIF upload (reuse), schema tagging (optional) | **S** | Phase 1 (UI+upload) | Phase 2 (schema) |
| #7 Voice search | Microphone permission, speech-to-text API/native | **M** | Phase 1 (UI+stub) | Phase 2 (web SpeechRecognition only) |
| #8 Leaderboard time-windows | Schema (points_*_period columns), trigger recalc, RPC | **M** | Phase 1 (UI tabs) | Phase 2 (gamification ethics + backend) |

**Recommended next step:** Build all three PHASE 1 layers (UI + safe foundation). This unblocks design validation + QA dry-run. PHASE 2 work (Sky approvals + backend) can land in follow-up cycles once intent is confirmed.
