# AccessMap — Phase 6 Strategy

**Author:** Morgan (Project Manager)  
**Date:** 2026-05-30  
**Status:** DRAFT for Sky review  
**Predecessor:** Phase 5 (Wave 7 / Sprint 3) — Public Beta build; nearly complete  
**Maps to roadmap:** v1.0.0 (Public App Store Launch) + v1.1.0 (Growth Layer)

---

## 0. Where we are coming from (Phase 5 recap)

Phase 5 shipped the complete beta-ready feature set:

| Feature | State |
|---|---|
| Onboarding carousel (5 slides, permission priming) | Complete — `feat/sprint3-design-polish` (`79e9150`) |
| Sentry analytics wrapper + 5 instrumented events | Complete — `feat/sprint3-sentry-analytics` |
| Disability filtering Phase A (category chips + context tags) | Complete — `feat/sprint3-disability-filtering` |
| Design polish (onboarding, gallery, disability chips, comments) | Complete — `feat/sprint3-design-polish` |
| UX copy pass (accessibility copy, microcopy improvements) | Complete — `feat/sprint3-ux-copy` |
| Android push notifications | Branch `feat/sprint3-android-push` — in review |
| Anonymous viewing (anon SELECT on flags) | `2026-05-29_anon_flags_select.sql` — Jordan-approved, propose-only |

**TestFlight status:** EAS build `2e91ae9b` installed; sign-in ✅ map ✅; `ReportFlagModal` layout fix committed (`dfb9af7`). One backend blocker: Supabase `net.http_post` extension not enabled — push notifications inert until Sky applies. App Store listing copy ready at `docs/APP_STORE_LISTING.md`.

**Carry-forward constraint (locked Sky decision, Phase 5):**
> No comment moderation for v1.0. Scope is flags and accounts only. This applies to admin tooling in Item 4 below.

---

## 1. Phase 6 Item Specs

Effort scale: **S** ≈ ≤1 day · **M** ≈ 2–4 days · **L** ≈ 1 week · **XL** ≈ 2+ weeks.

---

### Item 1 — App Store Submission ⭐ (highest priority)

**User story:** *As a potential user, I can find and download AccessMap from the public App Store — not just TestFlight.*

**Effort:** **M** (2–4 days of prep; Apple review is 1–3 business days, independent)

**What's already done:**
- Listing copy: `docs/APP_STORE_LISTING.md` — full description, keywords, subtitle, categories, age rating, screenshot plan — all ready.
- Privacy policy draft: `docs/PRIVACY_POLICY.md` — written, needs Jordan legal review + public hosting URL.
- App Store Connect app record: ASC App ID `6774709116` already in `eas.json` — record exists in ASC.
- Bundle ID: `com.accessmap.app` registered.
- Team ID: `S78F8ZA8QU` wired.

**What's missing (blockers for submission):**

| Blocker | Owner | Detail |
|---|---|---|
| Privacy policy public URL | Sky + Jordan | Draft exists in `docs/PRIVACY_POLICY.md`. Jordan must do legal review. Sky must host at a public URL before submission (required by Apple). See AD-1. |
| App Store screenshots | Dani + Rory | 6 screenshots at 6.7" iPhone resolution (2796×1290 px) mandatory. Captions, frames optional. See plan in `docs/APP_STORE_LISTING.md`. |
| Phase 5 branches merged to main | Rory | All Sprint 3 branches must be on main before the production EAS build. |
| Production EAS build | Rory | `eas build --profile production --platform ios` after all Phase 5 branches merge. Preview build `2e91ae9b` is not a production build. |
| `app.json description` field | Sky | Currently `null`. Fill with short text (e.g. "Community-powered accessibility barrier map"). This appears in some store contexts. |
| `net.http_post` Supabase extension | Sky | Must be enabled before production build so push notifications work at launch. SQL: `CREATE EXTENSION IF NOT EXISTS pg_net;` in Supabase SQL editor. |
| App Store review notes | Sky | Simple text Apple requires: test account credentials + "This app uses location to place flags on a map. All photos have GPS metadata stripped before upload." |
| Android production build | Rory | `eas build --profile production --platform android` — submit to Google Play closed testing track. |

**Schema/RLS:** None (App Store submission is an external process, not a code change).

**Jordan privacy flag:** **YES** — privacy policy legal review is required before App Store submission. See AD-1.

**Steve security review:** **No** new review for this item; prior Steve gates cleared.

**Dependencies:**
- Phase 5 all branches merged (Rory merge queue).
- Jordan privacy policy sign-off (AD-1).
- AD-2 (screenshot tooling decision).

**Recommended sprint:** **Sprint 4 — FIRST.** This is the defining deliverable of Phase 6. Everything else is post-launch growth.

---

### Item 2 — Onboarding Optimization (A/B testing)

**User story:** *As the product team, we can measure onboarding conversion and test variants to improve the % of new users who grant location permission and complete setup.*

**Effort:** **S–M** (instrumentation is S; shipping a variant is M)

**What's already done:**
Phase 5 shipped a 5-slide onboarding carousel with `onboarding_completed` and `onboarding_skipped` Sentry events. The `FirstLaunchGate` + `OnboardingCards` components exist in the codebase.

**What's remaining:**

First, establish the baseline from TestFlight beta data (2–4 weeks of beta). Then instrument slide-level events and test one variant.

**Instrumentation (S — do before App Store launch):**
Add `onboarding_slide_viewed` (with `slideIndex: 0–4`) to the carousel so we know where users drop off. Also capture `location_permission_granted: boolean` and `notification_permission_granted: boolean` at the end of onboarding. These complement the existing `onboarding_completed` / `onboarding_skipped` events.

**Variants to test (M — 2–4 weeks post-launch):**

| Variant | Description | Hypothesis |
|---|---|---|
| **A — Control** | Current 5-slide carousel (value prop → why location → location permission → notification permission → get started) | Baseline |
| **B — Minimal (3 slides)** | Cut slides 4–5 (notification + disability intro); show "Customise notifications in Settings" hint instead | Hypothesis: fewer slides = higher completion; notification slide is conversion drag |
| **C — Permission-first** | Lead with location permission rationale immediately (slide 1 = "why location"); slide 2 = value prop; permission prompt fires earlier | Hypothesis: users who see context first grant location at higher rate |

**Success metric:** `location_permission_granted` rate within onboarding session. Secondary: 7-day retention of users who completed vs. skipped onboarding.

**A/B split:** Route users deterministically by `userId.charCodeAt(0) % 3` (no external tool needed; Sentry events carry the variant tag).

**Schema/RLS:** None. Pure client-side (Sentry events + AsyncStorage).

**Jordan privacy flag:** **No** (no new data pattern — Sentry events are already reviewed; no user identity in events).

**Steve security review:** **No.**

**Dependencies:** Beta data (2–4 weeks of TestFlight + early App Store downloads). Variant B/C ship in a minor update (`v1.0.1`).

**Recommended sprint:**
- Instrumentation → **Sprint 4** (land with App Store submission or first patch).
- Variant testing → **Sprint 5** (4–6 weeks post-launch, when baseline data exists).

---

### Item 3 — Push Notification Content Strategy

**User story:** *As a user, I receive useful, timely notifications that bring me back to flags I care about — not spam.*

**Effort:** **M** (Edge Function update + scheduling; content is the main design work)

**What's already done:**
- `notify-flag-status` Edge Function written and deployable.
- `push_tokens` table + client-side registration exists.
- iOS push end-to-end tested (inert until `net.http_post` extension enabled).

**Notification tiers and triggers:**

**Tier 1 — Personal (high relevance, low annoyance):**

| Notification | Trigger | Content | Jordan constraint |
|---|---|---|---|
| Flag verified | Reporter's flag status → `verified` | "Your [category] flag was verified ✓ +5 points" | Category only — no description text |
| Flag resolved | Reporter's flag status → `resolved` | "The barrier you reported has been fixed! +10 points" | No description |
| Your verify credited | Your `verified` action confirmed by second actor | "Your verification helped resolve a flag. +2 points" | No flag text |

**Tier 2 — Community (medium relevance, opt-in default off):**

| Notification | Trigger | Content | Notes |
|---|---|---|---|
| Flag near you updated | New flag INSERT within ~500m of user's last known location | "New accessibility report near [neighbourhood name]" | Neighbourhood name, not lat/lng. Location imprecision is required. See AD-3. |
| Reopen threshold met | Resolved flag receives 3+ reopen votes | "A resolved flag in your area may need re-checking" | No PII, no location beyond "your area" |

**Tier 3 — Growth (low priority, post-v1.0):**

| Notification | Trigger | Content | Notes |
|---|---|---|---|
| Achievement unlocked | New achievement row inserted | "You earned [Badge Name]!" | Safe — no location or disability data |
| Weekly digest (opt-in) | Scheduled Sunday evening Edge Function | "[N] flags resolved near you this week" | Opt-in only. Supabase `pg_cron` or external scheduler. |

**Jordan hard constraints on push content:**
- **Never** include flag description text (user-written, could contain PII).
- **Never** include exact lat/lng in notification body.
- Location references must be address-level or neighbourhood-level (rounded to street name).
- Push token storage already Jordan-reviewed; no new pattern.

**Edge Function changes needed:**
- Add `category` to the notification payload lookup (already in the flags row).
- Add neighbourhood reverse-geocode lookup for Tier 2 (Nominatim API or Supabase Edge Function using OpenStreetMap — no cost, no PII shared).
- Add per-user opt-in column `push_notify_community boolean default false` to `push_tokens` or user prefs table (Dana to design). See AD-3.

**Schema/RLS:** **Light** — one new column for community-notification opt-in. Alternatively, extend `notification_preferences` if it already exists (Dana to check).

**Jordan privacy flag:** **YES** — Tier 2 introduces location proximity matching server-side. Jordan must confirm that matching a user's last-known location to incoming flag coordinates is acceptable under PIPEDA (this is server-side proximity, not location tracking). The match result (notification sent or not) is ephemeral — no new PII row is created.

**Steve security review:** **No** new review for content changes. If Tier 2 adds a location-proximity Edge Function, Steve reviews for injection / spoofing risk (low surface).

**Dependencies:**
- `net.http_post` / `pg_net` extension enabled (Sky — required for ANY push to fire).
- Tier 1 is ready as soon as extension is enabled.
- Tier 2 requires AD-3 (opt-in decision) + Jordan proximity sign-off.
- Tier 3 is post-v1.0.

**Recommended sprint:** **Tier 1 → Sprint 4** (low-hanging; just enable the extension). **Tier 2 → Sprint 5** (needs Jordan review + AD-3). **Tier 3 → v1.1.**

---

### Item 4 — Admin Moderation Tools

**User story:** *As an AccessMap admin (Sky), I can remove abusive flags and suspend abusive accounts without writing SQL — keeping the public map clean.*

**Effort:** **M** (Option A) · **L–XL** (Option B)

**Two scopes — Sky decides (AD-4):**

#### Option A — Flag-only moderation (MVP, recommended)

What it includes:
- `is_admin boolean not null default false` column on `public.users` (Sky-only grant via SQL).
- `flags.status` gains a `removed` value (soft-delete; auditable; not shown on map; counts excluded from public totals).
- `AdminScreen` (hidden tab, visible only when `is_admin = true`) with a simple flag list — filter by `status = 'open'` to triage — and a "Remove" action.
- **No comment moderation** (locked Sky decision from Phase 5).

What it does NOT include:
- User account suspension.
- Audit log UI (soft-delete `removed_by / removed_at` columns are enough for v1.0 auditability).
- Bulk actions.

#### Option B — Full admin panel (flags + user account management)

Adds to Option A:
- `users.suspended_at timestamptz null` + `users.suspension_reason text null`.
- Write-deny RLS on all tables keyed on `suspended_at IS NOT NULL` (flags, comments, votes).
- `AdminScreen` user management tab: search by display name, suspend/unsuspend, view flag count.
- Audit log table (`admin_actions`) for moderation event history.

**Morgan recommends Option A.** Beta volume will be small enough to handle edge cases with direct SQL. Build Option B when abuse patterns emerge and a UI is genuinely faster than SQL.

**Schema/RLS:**

*Option A:*
- `ALTER TABLE public.users ADD COLUMN is_admin boolean NOT NULL DEFAULT false;`
- `ALTER TYPE flag_status ADD VALUE IF NOT EXISTS 'removed';` (or use a `removed_by_admin` column if enum changes are painful in Supabase)
- RLS: `is_admin` column must join the protected-columns set from `2026-05-29_restrict_users_update_columns.sql` so users cannot self-grant it.
- Admin-only SELECT policy on a `moderation_flags` view (shows all flags regardless of `status`).

*Option B (additive):*
- `ALTER TABLE public.users ADD COLUMN suspended_at timestamptz;`
- `ALTER TABLE public.users ADD COLUMN suspension_reason text;`
- New RLS deny policies: `USING (suspended_at IS NULL)` on INSERT/UPDATE for flags, comments, votes.
- New table: `admin_actions (id, admin_id, action_type, target_type, target_id, reason, created_at)`.

**Jordan privacy flag:** **YES.** Admin tooling means one person (Sky) can view aggregate user behavior and take account-level actions. Jordan must confirm:
- What data is visible in the admin flag list (no disability-profile inference from flag clusters).
- That suspension is a reversible, not automated, decision (no GDPR automated-profiling trigger).
- User transparency: do suspended users see a message explaining why? (Recommend yes — a generic "Your account has been restricted. Contact support." with a support email.)

**Steve security review:** **YES — required before apply.** The `is_admin` column must not be self-grantable. Steve verifies: RLS cannot be bypassed by a non-admin to flip their own `is_admin`, `removed` status does not expose admin identity to the public API, and the `AdminScreen` has no client-trusted authority (RLS is the real gate).

**Dependencies:**
- **AD-4** (Sky): scope decision — Option A or B.
- `2026-05-29_restrict_users_update_columns.sql` must be applied (so `is_admin` joins protected columns) — this is an existing pending migration.
- Steve gate before any migration apply.
- Jordan gate before apply.

**Recommended sprint:** **Sprint 5 (v1.0.1)** — not needed for initial App Store launch, but needed before the app reaches public scale where manual SQL moderation becomes impractical. Build Option A in Sprint 5; Beta abuse signal gates Option B.

---

### Item 5 — Community Trust Score

**User story:** *As a user, I have a visible reputation tier that reflects the quality of my contributions — so the community can see who has a track record of accurate reports.*

**Effort:** **L** (formula + MVP display) · **XL** (if functional/capability-gating is included)

**What's already done:**
Points and achievement tracking exist (`handle_flag_status_change` trigger, points column, 5 achievement badges). These are the raw ingredients for a trust score.

**Scoring model design:**

*Earn trust:*

| Action | Trust points |
|---|---|
| Flag you reported verified by 3+ users | +10 |
| Flag you reported resolved (within 90 days of report) | +5 |
| Verification you submitted later confirmed (flag resolved) | +3 |
| Flag active without contest for 60 days | +2 |
| Visit streak milestone (7-day, 30-day) | +1 per milestone |

*Reduce trust (soft signals — v1.1, not v1.0):*

| Action | Trust impact |
|---|---|
| Flag you reported rejected by admin | −5 |
| Flag you reported removed by admin (spam/abuse) | −15 |
| Account suspended | Score frozen at suspension value |

*Trust tiers (cosmetic for v1.0):*

| Tier | Score | Display | Capability |
|---|---|---|---|
| New | 0–49 | No badge | Report, vote |
| Trusted | 50–149 | Bronze badge | Weighted verify votes (1.5×) |
| Established | 150+ | Gold badge | Reopen threshold reduced (7 days instead of 30) |

**Jordan constraint on gating:** The trust score must **never gate accessibility reporting itself**. Reporting is always open at any trust level. Only advanced mechanics (weighted votes, reopen threshold) gate on trust — and only after Jordan confirms these don't constitute prohibited automated decision-making under PIPEDA.

**Where it's computed:** Dana recommends a materialized view or a `trust_score numeric generated` column updated by the existing `handle_flag_status_change` trigger (cheapest; no new scheduled job). Periodic recalculation job is an option for v1.1 if the formula gets more complex.

**Schema/RLS:**
- `users.trust_score numeric not null default 0` — updated by trigger on flag status change.
- `users.trust_tier text generated always as (CASE WHEN trust_score >= 150 THEN 'established' WHEN trust_score >= 50 THEN 'trusted' ELSE 'new' END) STORED` (or computed in a view).
- RLS: trust score is public (SELECT by anyone), so it's exposed to the existing users SELECT policy. Steve reviews for behavioral-data leakage.

**Jordan privacy flag:** **YES** — a reputation score is a profiling output. Jordan must confirm:
- Cosmetic tiers are fine (display-only).
- Weighted votes (Trusted) and reduced reopen threshold (Established) are simple rule-based, non-probabilistic, and transparent — this likely stays outside automated-decision-making territory, but Jordan must confirm.
- The score itself must not proxy for disability status or medical information (it doesn't — it's based on verified contribution accuracy, not who you are).

**Steve security review:** **YES** — trust scores are a gaming target. Steve reviews: can a user collude to inflate scores (sock-puppet flags → verify each other), can the score be manipulated via the existing points-write RLS (it must be fully server-side), and does displaying the score expose behavioral data that could identify a user's disability.

**Dependencies:**
- **AD-5** (Sky): cosmetic-only vs. functional-gating. Start cosmetic; gate on Jordan sign-off for functional.
- **AD-6** (Sky + Jordan): confirm weighted votes are acceptable under PIPEDA.
- Steve review before migration apply.

**Recommended sprint:** **Sprint 5** (cosmetic tier display) · **v1.1** (capability gating, after Jordan + Steve gates, after beta provides gaming signal data).

---

### Item 6 — Anonymous Reporting

**User story:** *As a visitor without an account, I can report a new accessibility flag — without creating an account — so the barrier to contributing community data is as low as possible.*

**Effort:** **L** (significant RLS surgery, rate-limiting rework, and privacy design)

**Important:** Anonymous *viewing* is already done (Jordan-approved, `2026-05-29_anon_flags_select.sql`). This item is about anonymous *writing*.

**Privacy-safe design (Jordan constraint: no `user_id`, no IP logging):**

1. **Rate-limit by device fingerprint only.** Use a hash of `expo-device` device ID (not the raw ID — hash with a rotating daily salt). Limit: 1 flag per device per 24 hours without an account. No IP address stored or logged anywhere — not in the DB, not in Supabase logs.

2. **Anonymous flags are immutable post-submit.** No `user_id` means no identity to assert ownership. Once submitted, anon flags cannot be edited or deleted by the submitter. They can be removed by an admin (Item 4). This is the cleanest privacy/UX contract.

3. **`user_id` becomes nullable** on `public.flags`. The `handle_flag_status_change` trigger must no-op gracefully when `user_id IS NULL` (no points awarded, no reporter notification sent).

4. **Anon flags are visually distinguished** on the map (lighter colour or "Community report" label) so verified users know no one is accountable for follow-up.

5. **Points trigger:** anon reporters earn no points (no account = no points ledger). The actor who verifies an anon flag still earns +2 per normal rules.

6. **Future upgrade path:** if an anon user creates an account later, they can manually "claim" their anon flag by submitting the same location + category (or via a secret token approach — v1.1 design decision, not required for MVP).

**Schema/RLS:**
- `flags.user_id` changes from `NOT NULL REFERENCES public.users(id)` to `REFERENCES public.users(id)` (nullable).
- `flags.is_anonymous boolean not null default false` — explicit flag for UI and moderation.
- New RLS: anon INSERT policy — `USING (is_anonymous = true AND user_id IS NULL)` for unauthenticated role. **Rate-limit check must be server-side (Edge Function) because Supabase RLS cannot check device fingerprint**.
- Anon INSERT goes through an Edge Function that checks the device hash against a `anon_rate_limits` table (hash, last_submitted_at) before proxying the INSERT via service role. This is the cleanest way to enforce the rate limit without exposing the service role to the client.
- `anon_rate_limits (device_hash text primary key, last_submitted_at timestamptz)` — ephemeral; 24h TTL rows pruned by a scheduled function or `pg_cron`.

**Jordan hard gate:** This item does NOT start until Jordan formally signs off on:
1. Whether hashed device ID (even with daily salt) constitutes personal information under PIPEDA. If yes, it requires disclosure and a retention period.
2. Whether anonymous flag data (location + category, no `user_id`) is a new processing basis requiring updated privacy policy disclosure.
3. The `anon_rate_limits` table — is the hashed device ID stored here PII? What retention is acceptable?

**Steve security review:** **YES — largest new attack surface in Phase 6.** Steve reviews: the Edge Function route (injection, replay attacks, hash collision tolerance), the `anon_rate_limits` table (can it be enumerated to fingerprint users?), the `USING` policy on anon INSERT (no service-role bypass available to clients), and whether `is_anonymous = true` can be spoofed by an authenticated user to post "anonymous" flags under a different accountability model.

**Dependencies:**
- **AD-7** (Sky): do we want anonymous reporting at all, given the abuse + privacy cost? Recommend: **yes, but only after Jordan and Steve sign off and after v1.0 is live and stable.** Ship anon *view* now; defer anon *write* to v1.1.
- Jordan sign-off (strong gate).
- Steve sign-off (strong gate).
- Item 4 (admin moderation) should land first so there's a removal path before anon writing opens.

**Recommended sprint:** **v1.1 (defer from App Store launch).** Anonymous viewing is already the beta-launch win. Anonymous writing is a meaningful long-term funnel improvement but carries the heaviest privacy and security cost of any Phase 6 item. Build it deliberately after v1.0 is stable and both gates are cleared.

---

### Item 7 — Performance at Scale (10k+ flags)

**User story:** *As a user in a city with thousands of flags, the map loads fast, scrolls smoothly, and push updates arrive within seconds — even as the dataset grows.*

**Effort:** **M** (profiling plan + targeted fixes) · **L** (if PostGIS migration is needed)

**Phase 6 performance plan — three surfaces:**

#### 7a. Flags Query (database layer)

**Current pattern:** `listFlags()` likely queries `WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?` (bounding-box filter). At 10k rows, without a spatial index, this is a full-table scan.

**Profiling step:** Run `EXPLAIN ANALYZE` against the flags query with a seed of 10k rows. Compare:
- Current (lat/lng column indexes, if any)
- Composite `(lat, lng)` B-tree index
- PostGIS `geography` column + `ST_DWithin()` query (best for radius + viewport queries at scale)

**Likely fix:** Add a GiST index on a PostGIS `geography` column. This is a new migration and a new Supabase extension (`postgis` — already available in Supabase). Query changes from bounding-box to `ST_Intersects(geom, ST_MakeEnvelope(...))` — Peter owns the query rewrite.

**Expected gain:** ~10–50× faster flags query at 10k rows.

#### 7b. Map Rendering (client layer)

**Current state:** Marker clustering branch (`origin/shamus/marker-clustering-2026-05-25`) exists but is blocked on D3 SQL apply. This branch becomes critical at 10k flags — unclusterd markers at that density makes the map unusable.

**Phase 6 action:** Unblock and merge the clustering branch (D3 is Steve-approved, pending Sky apply). Tune clustering params (`maxZoom: 14`, `radius: 60`) in a dense-city scenario.

**Realtime subscription scoping:** The current Supabase Realtime subscription listens to all flag changes. At 10k flags with active users, every INSERT/UPDATE broadcasts to all connected clients. Scope the subscription to a map viewport bounding box using `filter: eq('status', 'open')` + client-side viewport filtering, or use Supabase broadcast channel per geographic cell.

**Expected gain:** Map usable at 10k+ markers; Realtime event volume per client stays constant regardless of total flag count.

#### 7c. Cold Start & Memory (mobile layer)

Phase 5 Peter audit flagged cold start as yellow (not red). At scale, the offline flags cache (24h TTL, all flags) becomes a memory pressure risk on low-end Android devices.

**Phase 6 action:** Cap the offline cache at the last-viewed viewport (not all flags globally). On cache restore, load only the saved bounding box. Peter owns this as a targeted optimization.

**Schema/RLS:**
- 7a: New PostGIS `geography` column migration (additive, rollback-safe). RLS unchanged.
- 7b: No schema change (clustering is client-side; Realtime scoping is client-side config).
- 7c: No schema change (AsyncStorage structure change only).

**Jordan privacy flag:** **No** (performance changes don't touch data patterns).

**Steve security review:** **Light** — PostGIS migration introduces a new extension. Steve confirms it doesn't open a new SQL injection surface (it doesn't; `ST_*` functions are parameter-safe).

**Dependencies:**
- 7a: Peter + Dana collaboration on query rewrite + migration. Profiling must happen first (can't optimize what you haven't measured).
- 7b: D3 SQL apply unblocks clustering branch immediately.
- 7c: No hard dependencies.

**Recommended sprint:** **Profiling → Sprint 5** (after v1.0 ships; need real data to measure against). **Fixes → Sprint 5–6** as profiling identifies the real bottlenecks. Don't optimize prematurely — measure first.

---

## 2. Sky Decisions Needed (AD-#)

| # | Decision | Affects | Morgan's recommendation | Urgency |
|---|---|---|---|---|
| **AD-1** | Privacy policy: Jordan legal review, then host at public URL. Where does it live? Options: (a) GitHub Pages `accessmap.app/privacy` (already scaffolded at `docs/privacy-policy.html`), (b) Supabase Storage public file, (c) Notion public page. | Item 1 (blocks submission) | Option (a) — GitHub Pages. Already has `docs/github-pages-setup.md`. Consistent with existing support page. | **Before App Store submission** |
| **AD-2** | Screenshot tooling: (a) Rory runs the iOS Simulator at 6.7" and screenshots all 6 screens manually, (b) use a screenshot automation tool (Fastlane Snapshots), (c) Sky records them on device. | Item 1 (blocks submission) | Option (a) — Simulator screenshots, Dani adds caption frames in Figma. Fastlane adds complexity Sky doesn't need for 6 images. | **Before App Store submission** |
| **AD-3** | Push Tier 2 opt-in: (a) community notifications default OFF (users must opt in), (b) default ON for users who granted notification permission. | Item 3 | Option (a) — default OFF. Users should choose, not be opted into nearby-flag notifications. Jordan likely agrees; proximity matching is a new data operation. | Before Tier 2 ships (Sprint 5) |
| **AD-4** | Admin moderation scope: Option A (flag removal only) vs. Option B (flags + user account management). | Item 4 | **Option A** — remove spam flags is the real v1.0 need. Account suspension can wait for a demonstrated abuse pattern. | Before Sprint 5 build |
| **AD-5** | Trust score: cosmetic display only (New/Trusted/Established badge) vs. functional gating (weighted votes, reduced reopen threshold). | Item 5 | **Cosmetic-only for Sprint 5.** Functional gating requires Jordan PIPEDA sign-off on automated decision-making. Start with the badge; add function after sign-off. | Before Sprint 5 build |
| **AD-6** | Trust score formula: approve the scoring model in §1 Item 5 above, or adjust weights. | Item 5 | Model in §1 is Morgan's recommendation. Sky approves or adjusts. The specific numbers matter less than the principle that reporting is always open. | Before Sprint 5 build |
| **AD-7** | Anonymous reporting (writing): go or no-go? | Item 6 | **Defer to v1.1.** Anonymous viewing is the near-term win. Anonymous writing requires Jordan + Steve gates and Item 4 (admin moderation) to land first. Don't rush it. | Before v1.1 planning |

**Privacy/security gate summary:**

| Item | Jordan | Steve (pre-apply) |
|---|---|---|
| 1 App Store submission | **YES** (privacy policy review) | No |
| 2 Onboarding A/B | No | No |
| 3 Push Tier 1 | No (covered by prior review) | No |
| 3 Push Tier 2 | **YES** (proximity matching) | No |
| 4 Admin tools | **YES** | **YES** |
| 5 Trust score (cosmetic) | **YES** (profiling output) | **YES** (gaming) |
| 5 Trust score (functional) | **YES + PIPEDA check** | **YES** |
| 6 Anon reporting | **YES (strongest gate)** | **YES** |
| 7 Performance | No | Light (PostGIS extension) |

---

## 3. Recommended Execution Order

**Guiding principle:** App Store launch is the Phase 6 milestone. Everything else is growth. Sequence the launch-blockers first, then add growth features in stability-order.

### Sprint 4 — App Store Launch Track (target: v1.0.0)

| Priority | Item | Who | Gate |
|---|---|---|---|
| 1 | Merge all Sprint 3 branches to main | Rory | All Sprint 3 CI gates green |
| 2 | Enable `pg_net` extension in Supabase (unblocks push) | Sky | SQL: `CREATE EXTENSION IF NOT EXISTS pg_net;` in SQL editor |
| 3 | Jordan privacy policy legal review | Jordan | Review `docs/PRIVACY_POLICY.md`; approve or mark changes |
| 4 | Host privacy policy at public URL (GitHub Pages) | Rory + Sky | Deploy; confirm URL resolves |
| 5 | Generate 6 App Store screenshots | Dani + Rory | 2796×1290px iOS simulator; Dani adds captions |
| 6 | Fill `app.json description` and support URL | Sky | 1-minute task |
| 7 | Production EAS build | Rory | `eas build --profile production --platform ios` |
| 8 | Upload listing + screenshots to App Store Connect | Sky | Copy from `docs/APP_STORE_LISTING.md` |
| 9 | Fill privacy URL + support URL in ASC | Sky | URLs confirmed in step 4 |
| 10 | Write App Store review notes | Sky | See template in §5 below |
| 11 | Submit for App Store review | Sky | Apple review: 1–3 business days |
| 12 | Instrument `onboarding_slide_viewed` events | Shamus | Before v1.0 launch; needed to establish baseline |

### Sprint 5 — Growth Layer (target: v1.0.1 – v1.1.0)

| Priority | Item | Who | Gate |
|---|---|---|---|
| 1 | Push Tier 1 live (Tier 1 triggers verified end-to-end) | Rory + Shamus | `pg_net` enabled from Sprint 4 |
| 2 | Admin Option A (flag removal) | Dana + Shamus | Steve + Jordan gates |
| 3 | Trust score cosmetic tier | Dana + Shamus | Steve + Jordan gates |
| 4 | Onboarding Variant B test | Shamus | 4 weeks of baseline data from v1.0 |
| 5 | Performance profiling (flags query, map at 10k) | Peter + Dana | Seed DB to 10k rows; `EXPLAIN ANALYZE` |
| 6 | Push Tier 2 (community proximity) | Dana + Rory | Jordan AD-3 sign-off |

### v1.1 — Maturity Pass

| Item | Condition to start |
|---|---|
| Anonymous reporting (Item 6) | Jordan + Steve both cleared; admin moderation (Item 4) live |
| Trust score functional gating | Jordan PIPEDA sign-off; cosmetic tier shipped + stable |
| Performance fixes (PostGIS, Realtime scoping) | Profiling complete; bottleneck confirmed |
| Admin Option B (user suspension) | Beta abuse signal justifies UI |

---

## 4. Phase 6 Launch Checklist — TestFlight → Public App Store

The exact steps in order. Each step must complete before the next.

### Step 1 — Codebase ready (Rory)
```
[ ] All Sprint 3 branches merged to main (feat/sprint3-*)
[ ] npm run typecheck — 0 errors
[ ] npm test — all tests pass
[ ] git tag v1.0.0
```

### Step 2 — Backend ready (Sky — Supabase SQL editor)
```
[ ] CREATE EXTENSION IF NOT EXISTS pg_net;  (enables push notifications)
[ ] Apply 2026-05-30_flag_comments.sql (if not yet applied)
[ ] Apply 2026-05-30_flag_reopen_requests.sql (if not yet applied)
[ ] Apply 2026-05-25_push_tokens.sql (if not yet applied)
[ ] Deploy notify-flag-status Edge Function (Supabase Dashboard → Edge Functions)
[ ] Set NOTIFY_WEBHOOK_SECRET in Edge Function secrets
[ ] Confirm anonymous view migration applied: 2026-05-29_anon_flags_select.sql
```

### Step 3 — Legal / privacy ready (Jordan + Sky)
```
[ ] Jordan reviews docs/PRIVACY_POLICY.md — approves or marks required changes
[ ] Sky applies Jordan's changes
[ ] Privacy policy hosted at public URL (GitHub Pages or equivalent)
[ ] URL confirmed accessible: curl -I https://<your-url>/privacy → 200 OK
[ ] Support URL confirmed (GitHub Issues or skylerhalisky@gmail.com)
```

### Step 4 — App Store listing ready (Dani + Sky)
```
[ ] 6 screenshots generated at 6.7" iPhone (2796×1290px)
    → Screen 1: Map with flag clusters
    → Screen 2: Flag detail + status history
    → Screen 3: Report flow
    → Screen 4: Tasks list
    → Screen 5: Heatmap view
    → Screen 6: Profile + achievements
[ ] Screenshot captions in English (see docs/APP_STORE_LISTING.md)
[ ] app.json description field filled (not null)
[ ] All listing copy reviewed and approved by Sky (copy in docs/APP_STORE_LISTING.md)
```

### Step 5 — Production build (Rory)
```bash
# Run from AccessMap/ after v1.0.0 tag
eas build --profile production --platform ios
# Wait for build email (~15-25 min)
# Note the build ID for submit step
```

### Step 6 — Upload to App Store Connect (Sky)
```
[ ] Log in to appstoreconnect.apple.com
[ ] Open AccessMap app record (App ID: 6774709116)
[ ] App Information: confirm name, subtitle, categories (Navigation / Utilities)
[ ] Pricing: Free
[ ] Age Rating: complete questionnaire → expected 4+ (UGC, no objectionable content)
[ ] App Privacy: fill Data Types used (Location, Identifiers, Usage Data)
    → Location: "Location" (coarse + precise) — "Used for primary app functionality"
    → Photos/Videos: "Photos or Videos" — "Used for primary app functionality"
    → Identifiers: "Device ID" — "Used for app functionality" (push tokens)
[ ] Upload 6 screenshots to the 6.7" iPhone slot
[ ] Paste full description from docs/APP_STORE_LISTING.md
[ ] Paste promotional text (170 chars) from docs/APP_STORE_LISTING.md
[ ] Paste keywords (100 chars) from docs/APP_STORE_LISTING.md
[ ] Enter privacy policy URL
[ ] Enter support URL
```

### Step 7 — App Store review notes (Sky — paste in ASC "Review Notes" field)
```
Test account for App Store Review:
Email: [create a test account in Supabase before submission]
Password: [any secure password — Sky sets it]

Notes for reviewer:
- The app requests location permission to place flags on a map.
- All user-submitted photos are stripped of GPS metadata before upload.
- Users can browse the map without signing in (tap "Continue as Guest").
- To test flag reporting: sign in → tap the "+" button → pick a location on the map.
```

### Step 8 — Submit (Sky)
```
[ ] Select production build from Step 5 in the "Build" section of the version
[ ] Click "Submit for Review"
[ ] Apple review notification: 1–3 business days
```

### Step 9 — Release
```
[ ] If approved: choose "Phased Release" (7-day ramp, 1% → 100%)
    Reason: lets you catch any launch-day issues before 100% exposure
[ ] If rejected: read rejection reason in App Store Connect Resolution Center
    → Common reasons: privacy policy issue, missing review notes, screenshot inaccuracy
    → Fix the flagged item, resubmit (no new build needed unless code was the issue)
```

### Step 10 — Post-launch monitoring (first 48 hours)
```
[ ] Sentry dashboard: watch for crash rate spikes
[ ] App Store Connect: watch for review rating + written reviews
[ ] Check push notification delivery in Supabase Edge Function logs
[ ] Morgan daily briefing until crash rate < 0.1%
```

---

## 5. Summary Table — Phase 6 at a Glance

| # | Item | Effort | Jordan | Steve (pre-apply) | Schema change | Sprint |
|---|---|---|---|---|---|---|
| 1 | App Store submission | M | **YES** (policy) | No | None | **Sprint 4 (1st)** |
| 2 | Onboarding A/B | S–M | No | No | None | Sprint 4 (instrument) / Sprint 5 (variant) |
| 3 | Push Tier 1 | S | No | No | None | Sprint 4 |
| 3 | Push Tier 2 | M | **YES** | No | 1 column | Sprint 5 |
| 4 | Admin Option A | M | **YES** | **YES** | is_admin, status enum | Sprint 5 |
| 5 | Trust score (cosmetic) | M | **YES** | **YES** | trust_score column | Sprint 5 |
| 5 | Trust score (functional) | L | **YES (PIPEDA)** | **YES** | None new | v1.1 |
| 6 | Anon reporting | L | **YES (strong)** | **YES** | nullable user_id, anon_rate_limits | v1.1 |
| 7 | Performance profiling | S | No | No | None | Sprint 5 |
| 7 | Performance fixes | M–L | No | Light | PostGIS column | Sprint 5–6 |

---

## 6. Decisions FOR SKY (blocking summary)

Per Constitution Art. 1. Everything else flows from these:

- **AD-1 … AD-7** in §2 above. Most urgent: **AD-1** (privacy URL) and **AD-2** (screenshots) — both block App Store submission.
- **`pg_net` extension:** Sky enables this in the Supabase SQL editor. One line. Unblocks push notifications immediately. No migration file needed.
- **Test account for App Store review:** Sky must create a test account (email + password) before submitting. Apple reviewers must be able to log in and test the app. Note the credentials somewhere accessible to Sky (not in any file or chat).
- **Phased release vs. immediate:** Morgan recommends phased (7-day). If Sky prefers immediate, that's a valid choice — just watch Sentry more closely in the first 24 hours.

**No migration is applied by any agent.** All schema changes above are written as propose-only files for Sky to apply, consistent with current practice.

---

*Filed by Morgan (PM). No code or schema changes were made in producing this document. Recommend Sky start with the AD-1 table in §2 — answering AD-1 (privacy URL) and AD-2 (screenshots) unblocks the entire Sprint 4 track. Then read §4 (Launch Checklist) end-to-end and flag any step that looks unclear before Rory starts the production build.*
