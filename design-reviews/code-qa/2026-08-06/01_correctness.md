# LENS 1 — CORRECTNESS · code-qa 2026-08-06 · `[F5/2026-08-06]`

**Target:** `d243b51` (working tree, read-only). **Gates at audit time:** tsc 0 · lint 0 err/80 warn · jest 200/2923+84todo/0 fail.

**Coverage:** full reads of `flags.ts`, `supabase.ts`, `auth.tsx`, `flagsStore.tsx`, `account.ts`, `admin.ts`, `anonRateLimit.ts`, `points.ts`, `streak.ts`, `comments.ts`, `users.ts`, `photos.ts`, `dataExport.ts`, `watchedFlags.ts`, `reports.ts` (header+parser), `feedback.ts`/`feedbackStore.ts` (submit paths), `blockedTerms.ts` (headers+contract); targeted reads of `ReportFlagModal` submit flow, `FlagDetailModal` edit/status flow, `TasksScreen` bulk+single triage, `MapScreen` locate/permission arrival, `PlatformMap` imperative handle, `OnboardingCards` permission slides. Censuses: silent-catch (zero empty catches repo-wide), `.then`-without-`.catch` (all sites checked — internally fail-soft or guarded, two exceptions below), loose equality (only deliberate `!= null`), falsy-zero fallbacks (none live), timers (S11 bounds correct — race loser is observed by `Promise.race`, no unhandled-rejection path).

**Verdict:** the write core is in unusually good shape — three prior trains (security phase-b, a11y, ship-ready) left real fences, and flagsStore's seq/teardown discipline is exemplary. What remains is **guard-parity drift**: paths added later that skip the guards their siblings enforce.

---

## Findings

### COR-1 · HIGH — The flag EDIT path skips every content guard the CREATE path enforces
**Surface:** `src/components/FlagDetailModal.tsx:552-570` → `src/lib/flags.ts:1296-1305` (`updateFlagContent`).
**Evidence:** `handleSaveEdit` builds `{ description: editDesc.trim() || null, category, severity }` and calls `updateFlagContent`, which is a bare `.update(patch)`. The create path (`createFlag`, flags.ts:1193-1210) enforces, at the same trust boundary: coordinate checks (n/a for edit), `assertValidCategoryAndSeverity` (flags.ts:1164-1171), `normalizeFlagDescription` incl. the **2000-char cap** (flags.ts:1174-1182), and the **Apple 1.2(a) blocked-term filter** (flags.ts:1208-1210). None run on edit.
**DB backstop:** `supabase/schema.sql:59-64` — category/severity DO have CHECK constraints (edit gap there is parity-only), but `description text` has **no length constraint** and no content constraint.
**Failure scenario:** signed-in user creates a clean flag (filter passes), then edits the description to blocked content or a 100k-char string while status is `open` (`canEdit = isOwn && status==='open'`, FlagDetailModal.tsx:525). The write lands. The 1.2(a) filter is bypassed on an **attributed** path — distinct from KNOWN TODO 0.2 (anon-create bypass) and from server-side A3-5 (RLS rewrite-at-any-status, Sky-artifact).
**Disposition:** Phase B — route the edit patch through the same three guards (`normalizeFlagDescription` + `assertValidCategoryAndSeverity` + blocked-term). Description cap + validation are unambiguous parity fixes; the blocked-term half is the same *ratified* filter already applied to this user's content on create — flagged in QUESTIONS (Q-1) only so Sky sees the complete filter map alongside her 0.2 decision. Guard test: edit with a blocked term must throw `CONTENT_BLOCKED_MESSAGE`.

### COR-2 · MEDIUM — display_name accepts blocked terms; every other public free-text surface filters
**Surface:** `src/lib/users.ts:16-32` (`updateUserProfile`).
**Evidence:** display_name gets trim + 60-char cap only. `addComment` (comments.ts:180-182) and `createFlag` (flags.ts:1208-1210) both run `containsBlockedTerm` on their free text. display_name renders publicly on the Leaderboard (`listLeaderboard`) and on comment attribution (`COMMENT_SELECT` embed).
**Failure scenario:** user sets display_name to a slur → it renders on the public leaderboard and beside every comment; no submit-time filter fired anywhere.
**Disposition:** BANKED QUESTION (Q-2) — extending the filter to a new surface is a moderation-policy call per the 0.2 precedent ("adding a filter to a submit path is a moderation-policy change and those are yours to make"). One line if yes.

### COR-3 · MEDIUM — `listFlagPhotos` swallows every error into "no photos"
**Surface:** `src/lib/photos.ts:26-45`.
**Evidence:** docstring says *"Returns [] silently if the flag_photos table doesn't exist yet"* — but the outer catch (photos.ts:40-44) returns `[]` + `console.warn` for **any** failure (network, RLS, timeout). House error-tier for Supabase screen reads is a surfaced error.
**Failure scenario (the lens's "error handling that lies"):** transient network failure while opening a flag → gallery renders as "this flag has no photos"; on the resolved before/after surface the "after" evidence photo silently vanishes. Secondary: `addFlagPhoto` (photos.ts:60-61) computes `position = existing.length` from this — a swallowed error yields position 0 and a collision/mis-order for a flag that has photos.
**Disposition:** Phase B — return `[]` only for `isTableMissingError`; rethrow the rest (callers already have catch → Alert paths). Align the docstring. Guard test: a non-42P01 error must reject.

### COR-4 · LOW — Bulk-triage analytics logs a tautological `from` status
**Surface:** `src/screens/TasksScreen.tsx:551`.
**Evidence:** `from: updated.status === targetStatus ? 'open' : updated.status` — after a successful CAS (`updateFlagStatus(id, targetStatus, …)` line 548), `updated.status === targetStatus` is always true, so `from` is always `'open'`; a verified→resolved bulk resolve logs `from: 'open'`. The true prior status is available (`flagsMap.get(id)?.status` — the CAS argument itself).
**Note (checked, NOT a finding):** `flagId` in this event **is** stripped — `stripPII` lowercases and matches the `'flagid'` substring (analytics.ts:36-37, 47-51). No PII leaves the guard, and the whole pipeline is a `__DEV__` stub today.
**Also (SLOP cross-ref):** double taxonomy — lib fires `flag_status_updated` (flags.ts:1344) while this screen fires `flag_status_changed` for the same action.
**Disposition:** Phase B one-liner — capture the pre-CAS status into `from`.

### COR-5 · LOW — `zoomBy` promise unguarded while its sibling is guarded
**Surface:** `src/components/PlatformMap.tsx:256-261` vs `:198-221`.
**Evidence:** `void map.getCamera().then(...)` has no `.catch`; `handlePinPress`'s `Promise.all([...]).then(...).catch(() => {})` in the same file guards the identical failure (detached/unmounted native map rejects). Unhandled-rejection warning; no crash.
**Disposition:** Phase B one-liner — append `.catch(() => {})` with the sibling's rationale.

### COR-6 · LOW — Permission-slide action can strand the slide on a throwing OS call
**Surface:** `src/screens/OnboardingCards.tsx:264-276`.
**Evidence:** `handlePermissionAction` awaits `Location.requestForegroundPermissionsAsync()` / `requestNotificationPermission()` with no try/catch; a rejected permission request (rare OS/entitlement states) skips `goTo(index + 1)` — the primary button appears dead and the rejection is unhandled.
**Disposition:** Phase B — wrap in try/catch; on failure treat as not-granted and still advance (denying never blocks progress — the function's own contract, line 263).

### COR-7 · LOW — Submit success path can render as failure if a parent callback throws
**Surface:** `src/screens/ReportFlagModal.tsx:411-413` (anon) and `:500-517` (auth).
**Evidence:** `reset(); onCreated(...); onClose();` execute inside the try whose catch shows *"Couldn't submit your report"*. A throwing `onCreated`/`onClose` (parent state updates) after a **committed** insert produces the inverted message — the guest-report class, in miniature. Callbacks are internal and currently benign; risk is future-regression shaped.
**Disposition:** Phase B (safe-Medium candidate, take only if trivial): move the success-side calls after the try/catch boundary or wrap them separately. Otherwise PARK with this note.

### COR-ADV-1 · ADVISORY (rides Sky's TODO 0.2 — not a defect today)
When the 0.2 one-liner lands in `createAnonFlag`, the **anon** catch (`ReportFlagModal.tsx:422-423`) lacks the `isContentBlockedError → showBlockedContentAlert` routing the auth path has (`:529-530`) — an anon reporter whose text is blocked would get the generic failure without the guidelines affordance (§SKY-7 coherence). The 0.2 implementation should touch both files. → QUESTIONS (Q-1 note).

---

## Explicitly checked and CLEAN (so the next train doesn't re-walk them)
- flagsStore: seq-guard on refresh/loadMore/setStatuses (F12/F33/F34/F35), SWR cold-paint bow-out, S11 read bounds (race loser observed — no unhandled rejection), F32 channel teardown serialization, offline-cache scoping/TTL.
- Submit flow: F3 re-entry ref, S11 escalate-never-abort, orphan cleanup ordering incl. `uploadedPaths.length = 0` after createFlag, F57 junction-failure honesty, F46 web alert parity, rate-limit check→record ordering.
- Photo privacy pipeline: fail-closed at all five gates; structural JPEG/PNG walks handle fill bytes, RSTn, progressive SOS, PNG chunk bounds; zero-copy fast path; `storagePathFromPublicUrl` refuses on every ambiguity, loudly.
- Points/streak: DST-safe `Math.round` day diff, backwards-clock no-op, corrupted-blob recovery preserving `longest`; POINTS mirrors the live trigger (10/15/3/7).
- comments: PGRST201-vs-42P01 disambiguation, chunked `.in()` fetches, ON-DELETE-SET-NULL nullability honored end-to-end.
- signOut/deleteAccount: cache purge outside the userId guard, computed cache names swept by prefix, F50/F63 honest offline messaging, typed `AccountDeletedSignOutPendingError`.
- Triage: R-2/SR-093 guest gates on all three callers; F53 CAS everywhere a status is written; conflict → honest notify + close.

**Known-open cross-refs (NOT re-found):** TODO 0.2 anon-filter bypass · A3-5 owner rewrite-at-any-status (server) · AB-2 mass status flip (server) · TB-1 points writable (server) · admin.ts dead render · Sentry stub vs policy.

**FINISHED** — lens 1 complete. 1 High · 2 Med · 4 Low · 1 advisory.
