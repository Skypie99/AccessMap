# Jordan — Phase 6 Privacy Gate Audit

**Date:** 2026-06-01  
**Regulation scope:** PIPEDA (Canada) + GDPR-equivalent awareness  
**Role:** Jordan (Legal/Privacy Advisor) — NOT a lawyer. All findings require professional legal review before production.  
**Documents reviewed:**
- PHASE6_STRATEGY.md (Morgan, 2026-05-30) — feature specs and gating decisions
- Phase 5 Privacy Audit (Jordan, 2026-05-31) — trust score conditions + pre-existing findings
- Codebase: HeatmapLayer.tsx, RankBadge.tsx, reputationTier.ts, LeaderboardModal.tsx
- Database schema: flags, users, flag status, RLS policies
- AsyncStorage usage: flagUpdates.ts, anonRateLimit.ts
- Analytics: analytics.ts (stub), sentry.ts
- Privacy Policy draft: docs/PRIVACY_POLICY.md

---

## Executive Summary

**VERDICT: APPROVE WITH CONDITIONS**

Phase 6 features are **privacy-compliant for launch** under the following conditions:

1. **Privacy Policy update** — must add disclosure of trust tier leaderboard visibility before App Store submission.
2. **Push Tier 2 opt-in decision (AD-3)** — community proximity notifications must default OFF; Jordan confirms the proximity matching design meets PIPEDA.
3. **Heatmap k-anonymity confirmed** — the k≥3 floor prevents location inference attacks; no change needed.
4. **Analytics remains stub** — no PII sent externally; cleared.
5. **Admin scope (AD-4: Option A recommended)** — flag removal only is privacy-safe; account suspension requires additional review if chosen later.
6. **Trust score cosmetic tiers** — low-risk reputation display; functional gating (weighted votes, reopen threshold) requires separate PIPEDA review per Phase 5 conditions.
7. **Anonymous reporting deferred to v1.1** — correct decision; the privacy cost and RLS complexity are high and should not ship alongside App Store launch.

---

## Trigger Analysis (Constitution Art. 7.6)

For each Phase 6 feature, the 6 mandatory triggers:

### 1. Location Data

**FIRES.** Multiple features expose location or enable location inference:

- **Heatmap:** displays aggregated location data in grid cells. **Mitigated by k-anonymity floor (k≥3).** Cells are computed by `bucketFlagsToCells()` in `@/lib/heatmap.ts` (line 93–152). Any cell with fewer than 3 flags is dropped entirely before rendering. Cell centroids are coarse (±0.005°, ~555 m). Raw flag coordinates are never exposed to the rendering layer. **Risk: CONTAINED.** No change needed; design is pre-approved (HeatmapLayer.tsx line 23–32 cites Jordan review).

- **Push Tier 2 (community proximity):** triggers notifications when a new flag is "near you" based on proximity to user's last-known location. **This is a new server-side operation:** matching user's location to incoming flag coordinates to decide whether to send a notification. The notification text itself contains no coordinates (only "neighbourhood name" per spec §3 Item 3). **Risk: MEDIUM.** Proximity matching is a new data operation. The match result (notification yes/no) is ephemeral and not persisted, but the user's last known location is re-used from existing location permission. **Condition:** Confirm with Sky in AD-3 that this proximity matching is acceptable under PIPEDA. The operation is not tracking (it's a one-time comparison at notification time), but it does pair location + flag data server-side, which is new.

- **Leaderboard:** displays `display_name + points`, not location. Leaderboard itself carries no location risk. However, users with high points have spent significant time in the app and are likely accessibility advocates or people with disabilities. Tiers are derived from points (see Risk 2 below). **Risk: LOW to MEDIUM.** Indirect, not direct, location-enabled.

### 2. Disability Data

**FIRES (indirect, cosmetic).** The trust tier system (Bronze/Silver/Gold/Platinum) is derived from engagement with accessibility-flag reporting. A user with Platinum tier (200+ points) has demonstrated sustained engagement with accessibility issues. The tier is shown publicly on the leaderboard and (in Phase 5 spec §3.1) will appear on flag detail screens ("Verified by Gold member").

The tier itself does not state or measure disability. However, there is a plausible correlation: users who most consistently and accurately report accessibility barriers are likely to be people with disabilities or close allies. Exposing tier publicly could enable targeting of disabled-community members.

**Assessment:** This is an **accepted product design decision** per Phase 5 spec §3.1 (cosmetic tier display). The risk is real but low given:
- Tier derives from contribution *accuracy* (points from verification), not from any disability-profiling algorithm
- Many Platinum users may be non-disabled accessibility advocates
- The app is opt-in; participation is a choice
- Privacy Policy already discloses that `display_name + points` are visible to other users (PRIVACY_POLICY.md lines 53–54)

**Condition:** Privacy Policy must be updated (see Condition 1 below) to add explicit disclosure that participation in the leaderboard and trust tier system is visible to other app users, and that this visibility reflects user engagement with the accessibility community.

**Risk level: LOW–MEDIUM (accepted per product spec, not a blocker).**

### 3. PII Beyond Auth

**FIRES (moderate).** Phase 6 introduces several new data storage patterns:

- **trust_score numeric column on users** — derived from flag verification/reporting activity. Exposed to all authenticated users via the public `users` SELECT policy. Not PII in isolation, but combined with display_name and points, it is a behavioral profile. Already pre-approved in Phase 5 audit with conditions (see Phase 5 report §1, Item 5, Condition 3).

- **Leaderboard data** — `id, display_name, points` fetched and displayed to all authenticated users. Points are already exposed; cosmetic tiers add no new PII column. **CLEAN.**

- **Push token storage** — `push_tokens` table stores `user_id, token, device_id, created_at` per existing Phase 5 architecture. Not new in Phase 6, already Jordan-reviewed. **CLEAN.**

- **Anonymous rate limit table** (`anonRateLimit.ts`, lines 22–25) — stores timestamps of anonymous submissions **locally on the device** in AsyncStorage, not on the server. No PII stored. The hashed device ID (with daily salt per Phase 6 spec §1 Item 6) is NOT persisted to the database in Phase 6 *read* scope (anonymous reporting is deferred to v1.1 and requires Jordan sign-off). **CLEAN for Phase 6.**

**Risk level: MEDIUM (pre-mitigated by Phase 5 conditions).**

### 4. RLS/Auth/Session Change

**FIRES (light).** Phase 6 does not introduce new tables *in Phase 6 read scope*. Per the PHASE6_STRATEGY.md:

- **Admin Option A** (Item 4) would add `is_admin boolean` column to users + new `removed` enum value on flag status. This is *deferred to Sprint 5*, not v1.0, and requires Steve + Jordan gates before apply.

- **Trust score** (Item 5) already reviewed in Phase 5 (Condition 3 addresses RLS for streak columns).

- **Anonymous reporting** (Item 6) introduces nullable `user_id` on flags + new `anon_rate_limits` table + new RLS policy for unauthenticated. **Deferred to v1.1** pending Jordan + Steve gates.

**For Phase 6 v1.0 scope (App Store submission), no new RLS changes.** The changes that appear in sprint roadmaps (Admin, Anon) are explicitly deferred post-launch.

**Risk level: NONE (deferred features).**

### 5. External API Sending User Data

**FIRES (contained).** Three external integration points:

1. **Analytics stub** (`src/lib/analytics.ts`, lines 1–55) — currently a no-op. The stub defines an event catalog (flag_created, flag_viewed, flag_status_changed, user_signed_in, push_notification_received, tile_cache_hit/miss) but the `track()` function does not forward to any provider (line 28–37). **No data sent.** Comment on line 20 warns against adding tile coordinates ("do not add x/y tile coords"). When analytics are wired in the future (v1.1+), this will require a separate Jordan review. **CLEAN for Phase 6.**

2. **Sentry** (`src/lib/sentry.ts`, lines 1–21) — initializes `Sentry.init()` with DSN and environment config. **Per PROJECT_STATE.md and PHASE6_STRATEGY §1 Item 1, Sentry was removed from Phase 5 and must not be enabled for the production EAS build.** The `sentry.ts` file is present for the SDK but the app.json build step should have `--clearPrevious` to strip it. **Rory to confirm on production build (no PII in error payloads if it fires, but should not fire in release build).** **CLEAN for v1.0 if disabled.**

3. **Push notification Edge Function** (`notify-flag-status`, deployed to Supabase) — sends push tokens to APNs / Firebase, not user data. Notification body is restricted to category + points (no description, no exact location, no user identity beyond the token). **Per Phase 6 spec §1 Item 3 (Push Content Strategy), strict constraints enforced:** no description text (could contain PII), no lat/lng, neighbourhood-only location references. **CLEAN.**

**Risk level: NONE (analytics stub; Sentry disabled; push content restricted).**

### 6. New Data Persistence

**FIRES (multiple tables, all reviewed or deferred).** 

**In Phase 6 v1.0 scope (App Store launch):**
- **No new tables.** Existing `flags`, `users`, `push_tokens` only.
- **No new columns** on existing tables that affect data persistence (trust_score columns are Phase 5, already audited).

**In Sprint 5 / v1.1 scope (deferred, requires separate gates):**
- **Admin Option A:** `is_admin boolean` on users + `removed` enum on flags.status
- **Anonymous reporting:** nullable `user_id` on flags + `anon_rate_limits` table
- **Trust score functional gating:** potential new columns for tracking weighted votes or suspension state (not yet designed)

**For Phase 6 v1.0, no new persistence patterns. No change needed.**

**Risk level: NONE (for v1.0 scope).**

---

## Feature-by-Feature Risk Assessment

### Phase 6 Item 1: App Store Submission

| Feature | Triggers | Risk Level | Mitigation |
|---|---|---|---|
| Privacy Policy legal review (AD-1) | PII, external sends, new persistence | MEDIUM | Jordan (this audit) + professional legal review required before launching |
| Privacy policy public URL (AD-1) | Data collection disclosure | MEDIUM | Policy hosted at public URL; version control in GitHub Pages |
| App Store listing copy | Disability adjacency | LOW | Listing does not mention accessibility or disability; standard app description |
| Review notes + test account | Auth, user data | LOW | Test account created by Sky; credentials not logged |

**Verdict: APPROVE WITH CONDITIONS.** Conditions: (1) Professional legal review of PRIVACY_POLICY.md, (2) Privacy policy hosted and accessible at launch, (3) Privacy policy URL added to App Store Connect before submission.

---

### Phase 6 Item 2: Onboarding A/B Testing

| Feature | Triggers | Risk Level | Mitigation |
|---|---|---|---|
| `onboarding_slide_viewed` events | Analytics (stub) | NONE | Sentry/analytics not wired; events logged locally in dev only |
| `location_permission_granted` flag | Location consent tracking | LOW | Permission grant is user-initiated; consent is explicit; no location data collected yet |

**Verdict: APPROVE.** No privacy concerns; analytics remain stub.

---

### Phase 6 Item 3: Push Notifications — Tier 1 (Personal)

| Notification | Trigger | Risk Level | Mitigation |
|---|---|---|---|
| Flag verified | Reporter's flag `open → verified` | NONE | No user identity exposed beyond notification recipient (push token = single user) |
| Flag resolved | Reporter's flag `open/verified → resolved` | NONE | Points and category sent; no description or location |
| Your verify credited | Verifier action confirmed | NONE | No flag text, no location, no other actor identity |

**Verdict: APPROVE.** Notification content is restricted per spec; no PII or location data exposed.

---

### Phase 6 Item 3: Push Notifications — Tier 2 (Community, AD-3 decision needed)

| Notification | Trigger | Risk Level | Mitigation |
|---|---|---|---|
| Flag near you updated | New flag within ~500m of user's last-known location | MEDIUM | Proximity matching is a new server-side operation; neighbourhood imprecision required; opt-in default OFF |
| Reopen threshold met | Flag votes exceed threshold | LOW | No location or user identity in body |

**Verdict: APPROVE WITH CONDITION (AD-3).** Condition: (1) Sky decides: community notifications default OFF, (2) Jordan confirms proximity matching (matching user location + flag coordinates server-side to decide notification send) is PIPEDA-compliant. The operation is not tracking (no persistent location store, not background monitoring), but pairing location + flag data server-side is a new capability that requires disclosure and explicit user consent. Per spec, consent is the opt-in toggle, which is acceptable.

---

### Phase 6 Item 4: Admin Moderation Tools (Option A — Flag Removal, AD-4 recommended)

| Feature | Trigger | Risk Level | Mitigation |
|---|---|---|---|
| `is_admin` column on users | Admin identity, RLS bypass | MEDIUM | Column must be non-self-grantable; requires Steve gate before apply |
| Flag `removed` status | Admin action tracking | LOW | Soft-delete; auditable; not shown to public; admin identity not exposed |
| AdminScreen (hidden tab, admin-only) | Admin query scope, behavioral data | MEDIUM | Steve reviews RLS to prevent enumeration of flag clusters (could infer user activity patterns) |

**Verdict: APPROVE WITH CONDITION (AD-4, Option A).** Conditions: (1) Sky confirms Option A scope (flag removal only, no user suspension in v1.0), (2) Steve gate required before apply (verify `is_admin` column is protected from self-grant, `removed` status does not leak admin identity), (3) AdminScreen RLS does not allow enumeration of flag-verifier correlations that could reveal which named users act as accessibility advocates.

**Note:** If Option B (user account suspension) is chosen later, additional Jordan review required to confirm suspension does not violate PIPEDA automated-decision-making rules.

---

### Phase 6 Item 5: Community Trust Score (Cosmetic Tiers, v1.0 phase)

| Feature | Trigger | Risk Level | Mitigation |
|---|---|---|---|
| `trust_score numeric` column | Reputation + disability adjacency | MEDIUM | Pre-reviewed in Phase 5; Condition 3 requires email privacy migration be applied first |
| Trust tier emojis (Bronze/Silver/Gold/Platinum) | Disability profiling | LOW–MEDIUM | Cosmetic display only; acceptable per Phase 5 audit; Privacy Policy disclosure required |
| Leaderboard display (display_name + points + tier) | Behavioral profiling, targeting | MEDIUM | Already shows points; tiers add cosmetic data; low incremental risk given existing points exposure |

**Verdict: APPROVE WITH CONDITION (Phase 5 Condition 2 + 3).** Conditions: (1) Email privacy migration (`2026-05-27_users_email_privacy.sql`) must be confirmed applied before trust score migration, (2) Privacy Policy must disclose leaderboard visibility and trust tier participation. (3) Functional gating (weighted votes, reduced reopen threshold) is deferred to v1.1 and requires separate PIPEDA review per Phase 5 audit §1 Item 5.

---

### Phase 6 Item 6: Anonymous Reporting (Deferred to v1.1)

| Feature | Trigger | Risk Level | Mitigation |
|---|---|---|---|
| Hashed device ID (24h salt) | Rate-limit enforcement on anon submissions | HIGH | Hashed device ID may constitute PII under PIPEDA; storage/retention must be disclosed |
| `anon_rate_limits` table | Device tracking (soft) | HIGH | Ephemeral 24h TTL rows; but enumerable table could enable fingerprinting attacks |
| Nullable `user_id` on flags | Anonymous flag attribution | HIGH | RLS must prevent unauthenticated users from spoofing anon flag via authenticated account |

**Verdict: DEFER TO v1.1.** Anonymous reporting is correctly deferred per PHASE6_STRATEGY §1 Item 6 (Morgan's recommendation, AD-7). Reasons: (1) Privacy cost is highest of Phase 6 items, (2) RLS complexity is significant, (3) requires strongest Jordan + Steve gates before implementation, (4) admin moderation (Item 4) should land first to provide removal path for abuse. **Do not ship anonymous reporting in v1.0; shipping is post-launch stability gate.**

---

### Phase 6 Item 7: Performance at Scale (PostGIS, etc.)

| Feature | Trigger | Risk Level | Mitigation |
|---|---|---|---|
| PostGIS geography column + ST_DWithin | Spatial indexing (no data exposure) | NONE | Indexes are structural; no user data exposed; Steve reviews for SQL injection surface (nil risk) |
| Marker clustering (client-side) | Map rendering (no data exposure) | NONE | Client-side bucketing; no new data pattern |
| Realtime subscription scoping | Subscription filtering | NONE | Client-side viewport filtering; no PII change |
| Offline cache optimization | Local AsyncStorage | NONE | Cached viewport boundaries only; no new PII |

**Verdict: APPROVE.** No privacy concerns; performance changes are structural.

---

## Heatmap Deep Dive: Correlating Location + Identity

**Key concern (triggered by Constitution Art. 7.6.1):** Can a bad actor use the heatmap to infer WHO flagged a specific location?

**Answer: NO.** Design prevents it:

1. **K-anonymity floor (k≥3):** Any cell with fewer than 3 flags is dropped entirely. A bad actor cannot isolate a single user's flag by looking at a sparse heatmap cell. Minimum cell size (~555 m) is also intentionally coarse — too large to pinpoint an individual user's home or workplace.

2. **No identifier in cell data:** Heatmap cells contain only:
   - Cell coordinates (centroid lat/lng)
   - Flag count
   - Mean severity
   - Max severity
   - Cell boundaries
   
   **No flag IDs, no user IDs, no verifier information.** The cell is an aggregate; the reporter/verifier identities are lost in bucketing.

3. **Flag list is separate:** The map shows both the heatmap layer (aggregate) and individual flag pins (detailed). A user **must** tap a pin to see flag detail (description, reporter name, verifier name). The heatmap cell itself exposes no individual reporter identity.

4. **Disclaimer enforced:** MapScreen.tsx renders Jordan-mandated disclaimer text whenever heatmap is enabled, informing users that the heatmap is an aggregate and does not track individuals (per HeatmapLayer.tsx lines 23–32 comment).

**Verdict: HEATMAP IS PRIVACY-SAFE.** No change needed.

---

## RankBadge and Leaderboard: Disability Targeting Risk

**Concern:** Public display of reputation tier + display_name could enable targeting of disabled-community members or activists.

**Assessment:**

1. **Tier is derived from engagement, not disability:** Platinum tier (200+ pts) means "accurate accessibility reporter," not "this person has a disability." Causation flows from behavior (reporting) → reputation (points/tier), not disability → reputation.

2. **Anonymity available:** Users can set display_name to anything (no name policy enforced). A user concerned about privacy can use a pseudonym like "AccessMap_User_42" and remain unidentified.

3. **Existing exposure:** Points are already public (`display_name + points` visible to all authenticated users per current schema + Phase 5 spec). Tiers add ordinal grouping (Bronze/Silver/Gold/Platinum), which is cosmetic and low-incremental risk.

4. **Opt-in participation:** The leaderboard is visible only to authenticated users (logged in). Anonymous viewing mode (Phase 5 feature) hides the leaderboard entirely.

5. **No filtering or targeting enabled:** The app does not expose "show me all Platinum users near [location]" or any cross-join of tier + location. Leaderboard is a standalone view.

**Verdict: LOW–MEDIUM RISK (accepted per product design).** Condition: Privacy Policy must disclose that participation in leaderboard and trust tiers is visible to other authenticated users. See Condition 1 below.

---

## AsyncStorage Data Handling

**Flag Updates Tracker** (`flagUpdates.ts`):
- Stores last-seen status of flags user cares about: `{ [flagId]: status }` per user
- Stored locally in AsyncStorage under key `@accessmap/flag_last_seen_v1:{userId}`
- **No encryption.** AsyncStorage on mobile is not encrypted; device lock provides protection.
- **Risk: LOW.** Local-only; deleted when user logs out or device is factory-reset. Fail-soft on every read/write (line 71–72, 80 console.warn on error). No server transmission.

**Anonymous Rate Limit** (`anonRateLimit.ts`):
- Stores timestamps of anonymous submissions: `[timestamp1, timestamp2, ...]` in AsyncStorage
- Key: `anon_submit_timestamps`
- **No device ID stored.** Rate limit is device-level (per app installation), but device ID itself is not persisted. Check against stored timestamps only (line 22–25).
- **Risk: NONE.** Local-only; no user identification; expires after 24h.

**Verdict: ASYNC STORAGE USAGE IS PRIVACY-SAFE.** Data is local, ephemeral, and fail-soft. No change needed.

---

## Conditions (APPROVE WITH CONDITIONS)

**Three conditions must be satisfied before App Store submission:**

### Condition 1 — Privacy Policy Update (REQUIRED before submission)

**Task:** Update `docs/PRIVACY_POLICY.md` and `docs/privacy-policy.html` to add disclosures:

1. **Trust tier visibility:** Add to §2 "How We Use Your Data" (after line 59):
   ```
   ### Community Leaderboard & Trust Tiers
   - Your display name and points total are visible to other authenticated app users via the Community Leaderboard
   - Your trust tier (Bronze, Silver, Gold, Platinum) is derived from the accuracy of your reports and is visible to other users
   - Participation in the leaderboard is voluntary — you can use a pseudonym as your display name to remain anonymous
   - The leaderboard is not visible to users browsing anonymously without an account
   ```

2. **Community notification opt-in (if Tier 2 ships in Sprint 5):** Add disclosure of neighbourhood-level proximity notifications and default-OFF opt-in.

3. **Regional compliance confirmation:** Existing GDPR/CCPA/PIPEDA sections are solid. No change needed.

**Owner:** Will (Technical Writer) to draft; Sky to review and approve before hosting.

**Gate:** This is a documentation task, not a code gate. Does not block trust score migration SQL apply (Phase 5 condition 2 covers). Must be completed before App Store submission (Sprint 4 checklist Step 3, PHASE6_STRATEGY §4).

---

### Condition 2 — Push Tier 2 Proximity Matching Approval (AD-3, decision needed)

**Decision for Sky:** Does Sky approve the design where AccessMap matches a user's last-known location to incoming flag coordinates server-side to decide whether to send a community notification?

**Option A (recommended):** YES — and community notifications default OFF (opt-in required). Users explicitly toggle "Nearby flag notifications" in Settings → Notifications. This is PIPEDA-compliant: proximity matching is a one-time server operation (not tracking, not persistent location store), and explicit user consent is obtained via the toggle.

**Option B:** NO — ship only Tier 1 (personal notifications) in v1.0. Tier 2 deferred to v1.1. This is also acceptable; community notifications are growth feature, not launch-blocking.

**Jordan position:** Option A is privacy-safe with the opt-in default OFF. Recommend this path.

**Owner:** Sky decision via AD-3 (Morgan routing). If YES: Jordan confirms proximity matching is acceptable per PIPEDA.

---

### Condition 3 — Email Privacy Migration Prerequisite (Phase 5, required before any trust score apply)

**Requirement:** `2026-05-27_users_email_privacy.sql` must be confirmed **applied** (not propose-only) before the trust score migration (`2026-05-30_trust_score_system.sql`) is applied.

**Reason:** The trust score migration adds streak columns to `users` (last_active_date, streak_days, longest_streak_days). These columns inherit the `users` table's SELECT policy, which grants them to the `authenticated` role. If the email privacy migration (which restricts column-level grants) has not been applied, these streak columns would be cross-user readable, violating Phase 5 Condition 3.

**How to verify:** In Supabase SQL Editor, run:
```sql
\d+ public.users
```
Confirm that the `authenticated` role's column grants do NOT include `email`. If `email` is still in the grant, the privacy migration has not been applied; stop and apply it first.

**Owner:** Dana or Rory to confirm before Sky applies trust score SQL. Shamus coordinates test.

---

### Condition 4 — Admin Option A Scope Confirmation (AD-4, decision needed)

**Decision for Sky:** Does Sky approve Admin Moderation Option A (flag removal only, no user suspension in v1.0)?

**Option A (recommended):** Flag removal only. Admins can soft-delete spam flags; no user account suspension. This is launch-ready and privacy-safe.

**Option B (deferred):** User account suspension added. Requires additional Jordan review to confirm suspension does not violate PIPEDA automated-decision-making rules and that users receive explanation of suspension reason.

**Jordan position:** Option A. User account suspension carries higher PIPEDA risk (potential automated decision-making trigger) and is not needed for v1.0 launch. Build and monitor Option A; add Option B in v1.1 if abuse patterns demand it.

**Owner:** Sky decision via AD-4 (Morgan routing). Shamus + Dana build. Steve reviews RLS before apply.

---

## Decisions for Sky

| # | Decision | Options | Jordan's Position | Urgency |
|---|----------|---------|-------------------|---------|
| **AD-3** | Push Tier 2 opt-in: default OFF or default ON? | OFF (user opts in) / ON (user opts out) | **OFF** — community proximity is a new data operation; explicit consent is PIPEDA-appropriate | Before Sprint 5 Tier 2 build |
| **AD-4** | Admin moderation scope: Option A or B? | A (flag removal only) / B (flags + user suspension) | **Option A** — launch-ready, privacy-safe. Option B deferred to v1.1 with additional gate | Before Sprint 5 build |

---

## Summary Table — Phase 6 Privacy Verdict

| Item | Phase | Triggers | Risk | Verdict | Condition |
|---|---|---|---|---|---|
| App Store submission | v1.0 | PII, disclosure, external sends | MEDIUM | APPROVE | Condition 1: Privacy Policy update |
| Onboarding A/B | v1.0 (instrument) / Sprint 5 (variant) | Analytics stub, consent | NONE | APPROVE | — |
| Push Tier 1 | v1.0 | Location, notification content | NONE | APPROVE | — |
| Push Tier 2 | Sprint 5 (AD-3 dependent) | Proximity matching, location | MEDIUM | APPROVE | Condition 2: AD-3 decision + consent design |
| Admin Option A | Sprint 5 (AD-4 Option A recommended) | Admin access, soft-delete | MEDIUM | APPROVE | Condition 4: AD-4 decision + Steve gate |
| Admin Option B | v1.1 (deferred) | Account suspension, PIPEDA | HIGH | DEFER | Requires separate Jordan + PIPEDA gate |
| Trust score cosmetic | Sprint 5 | Disability adjacency, profiling | MEDIUM | APPROVE | Condition 1: Privacy Policy update; Condition 3: email migration prerequisite |
| Trust score functional | v1.1 (deferred) | Automated decision-making | HIGH | DEFER | Requires PIPEDA sign-off per Phase 5 Condition 1 |
| Anonymous reporting | v1.1 (deferred) | Device ID, rate limit, RLS | HIGH | DEFER | Requires Jordan + Steve gates; admin moderation must land first |
| Heatmap | v1.0 | k-anonymity, location inference | LOW | APPROVE | No condition; design pre-approved |
| RankBadge + Leaderboard | v1.0 | Disability targeting, reputation | MEDIUM | APPROVE | Condition 1: Privacy Policy tier visibility disclosure |
| Performance (PostGIS, etc.) | Sprint 5 | Structural (no data exposure) | NONE | APPROVE | — |

---

## Critical Findings (No Blockers)

**None.** All Phase 6 v1.0 features (App Store launch scope) are privacy-compliant under the conditions above. The main privacy work is:

1. **Policy disclosure** (Condition 1) — necessary for transparency and PIPEDA compliance.
2. **User consent design** (Condition 2) — Tier 2 community notifications must opt-in.
3. **Migration order** (Condition 3) — email privacy migration must be applied first.
4. **Admin scope** (Condition 4) — Option A is safe; Option B deferred.

Features deferred to v1.1 (admin suspension, trust score functional gating, anonymous reporting) carry higher privacy/legal risk and should not ship alongside launch.

---

## Decisions for Sky (Blocking Summary)

Per Constitution Art. 1, before Rory starts the production EAS build and Sky submits to App Store:

1. **AD-3 (Push Tier 2 opt-in):** Sky confirms option (recommended: OFF). If not confirming Tier 2 for v1.0, Rory disables it in the production build.

2. **AD-4 (Admin scope):** Sky confirms Option A. If Option B is chosen, defer to v1.1 and submit without it.

3. **Condition 1 (Privacy Policy):** Will drafts tier visibility + community notification opt-in disclosures. Sky reviews and approves. Policy must be publicly hosted and URL confirmed accessible before App Store submission (Step 3 in PHASE6_STRATEGY §4 Launch Checklist).

4. **Condition 3 (Email migration prerequisite):** Dana confirms applied before Sky applies trust score SQL. Applicable only if trust score is in the production build; if deferred to Sprint 5, this is not a blocker for v1.0 submission.

---

## Final Notes

- **This audit is advisory.** All findings are subject to professional legal review by a qualified privacy attorney before production launch. Jordan is not a lawyer.
- **Regional specificity:** This audit assumes PIPEDA (Canada) as the primary framework. If the app launches in other regions (EU, US), additional GDPR/CCPA audit is required.
- **Change management:** If any Phase 6 feature is added or modified post-audit, re-trigger Jordan review before shipping.

---

*Audit completed by Jordan (Legal/Privacy Advisor). All conditions and decisions for Sky are documented above for routing via Morgan.*
