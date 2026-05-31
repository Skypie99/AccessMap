# AccessMap — Phase 7 Strategy: Growth & Scale

**Author:** Morgan (Project Manager)
**Date:** 2026-05-31
**Status:** DRAFT for Sky review
**Predecessor:** Phase 6 (App Store Launch) — live public App Store app with real users
**Phase theme:** Features that make AccessMap genuinely transformative and self-sustaining.

---

## 0. Context: Where We Come From

Phase 6 shipped AccessMap to the App Store. Phase 7 assumes we have:
- **Real users** actively mapping real barriers in the wild
- **Live heatmap data** accumulated from community reports
- **Trust score** (Bronze/Silver/Gold/Diamond tiers) live and cosmetic from Phase 5
- **Anonymous viewing + reporting** live from Phase 5/6
- **Admin moderation** (Option A: flag removal) live from Phase 6

Phase 7 is not a polish pass. It's about making AccessMap indispensable — the kind of app that changes how people with disabilities navigate cities, and makes contributors feel their work has lasting real-world impact.

---

## 1. Phase 7 Items

Effort scale: **S** ≈ ≤1 day · **M** ≈ 2–4 days · **L** ≈ 1 week · **XL** ≈ 2+ weeks

---

### Item 1 — Accessible Route Scoring ⭐ Flagship

**User story:**
*As a wheelchair user, I can enter a start and end address, check "Avoid steps and construction," and get a route that uses AccessMap's community flag data to navigate the most accessible path — not just the fastest one.*

**The problem this solves:**
Standard navigation apps (Google Maps, Apple Maps) don't know about broken elevators, temporary construction blocking ramps, or that the "accessible entrance" on 3rd Street has been broken for two months. AccessMap does. Route scoring is the moment that community data becomes real navigation.

**How it works:**

1. **Street network graph** — fetch the OpenStreetMap road and path network via OSRM (open-source routing engine, free, no API key). Each graph edge = one street or path segment.
2. **Flag penalty overlay** — for each `open` or `verified` flag, add a penalty to the nearest street segment:
   - **Severity (1–5):** severity 5 = near-impassable (heavy penalty), severity 1 = minor inconvenience (light penalty).
   - **Category:** different penalty weights per user accessibility preference. An elevator outage is critical for elevator-dependent users, irrelevant for ambulatory ones.
   - **Status:** only `open` and `verified` flags add penalties. `resolved` flags = 0 penalty (barrier was fixed).
3. **User accessibility profile (new concept):** a minimal preference set — "I use a wheelchair," "I have difficulty with stairs," "I use a white cane." One or two taps before a route query. Weights the penalty map per user. Never required; never analyzed by the system.
4. **Route output:** standard A-to-B route with inline `[Accessibility notes]` at each flagged segment: *"Broken ramp reported 3 weeks ago — consider alternate path one block north."*

**Effort:** **XL** (2–3 weeks total, parallelizable across owners)

This is the largest Phase 7 build. OSRM integration + the penalty overlay model + UI are all non-trivial. Peter owns the routing engine; Dana owns the flag-penalty query; Shamus owns the UI.

| Component | Effort | Owner |
|---|---|---|
| OSRM route API integration (Edge Function or client-side) | M | Peter |
| Flag-to-edge penalty mapping query (`ST_DWithin`, PostGIS) | M | Dana |
| User accessibility profile (preference storage, opt-in) | S | Dana |
| Route penalty calculation + A* overlay | L | Peter |
| Route UI (start/end input, route display, inline flag callouts) | L | Shamus |
| Dani design pass (route card style, flag callout treatment) | M | Dani |

**Dependencies:**
- PostGIS extension live (Phase 6 Item 7 — performance track). If not yet applied, this is the first blocker.
- Heatmap data is already live ✅
- `listFlags()` with bounding box query already exists ✅
- OSRM: free, self-hosted via Docker or via third-party API. P7-AD-1 decides which.

**Jordan privacy flag:**
- **User accessibility profile** = disability-adjacent data. Jordan must review before this ships:
  - Is "I use a wheelchair" considered disability data under PIPEDA?
  - If yes: explicit consent flow required; data must not be exposed to other users or analyzed for profiling.
  - Recommended framing: store as a routing preference (like "avoid highways"), not a disability declaration. Never display to others.
- **Route queries** (start/end points) = location data covered by existing privacy policy. Route queries must not be logged or stored server-side. Ephemeral computation only.

**Steve security review:** Light — OSRM integration is outbound read. Flag penalty query is parameterized PostGIS. No new write surface.

**What it unlocks:**
This is the feature that transforms AccessMap from a "map of problems" into a navigator for real life. It is the headline feature in every press release, grant application, and city partnership pitch from Phase 7 onward. Every other Phase 7 item becomes more valuable once routing exists.

**Recommended sprint:** Sprint 7 (flagship). Start with a single-city prototype. Get user feedback before broad rollout.

---

### Item 2 — Business / Venue Profiles

**User story:**
*As a restaurant owner, I can claim my venue on AccessMap, add my accessibility information (step-free entrance, accessible restroom, hearing loop), and respond to community flags about my property — so customers with disabilities have accurate, owner-verified information before they arrive.*

*As a user with a disability, I can view a venue's claimed accessibility profile before visiting — with the owner's own assurance, plus community verification alongside it.*

**The problem this solves:**
AccessMap currently only knows about problems (barriers). Venue profiles add the positive layer: what is actually accessible, from the source. This is the first moment the app becomes useful for *planning* a visit, not just flagging failures after the fact.

**Privacy model:**

| Data | Visible to | Privacy risk | Jordan constraint |
|---|---|---|---|
| Venue name, address, accessibility features | Everyone | None — voluntary public disclosure | None |
| Flag responses from venue | Everyone | None | Venue cannot see the flagging user's identity |
| Claim status (unverified / email-verified / certified) | Everyone | None | — |
| Claimant identity | Admin only | Low | Not exposed publicly; stored for moderation |

**Who verifies a business is real? Three-tier model:**

1. **Tier 1 — Unverified:** Anyone can claim a venue. Profile shows "Reported by community member — not verified." Low trust, but searchable and useful.
2. **Tier 2 — Business Confirmed:** Claim triggers an email to the business's listed domain (entered by claimant, or auto-fetched from OSM). Business clicks a confirmation link. Badge: "Email Verified."
3. **Tier 3 — AccessMap Certified:** Sky (admin) manually upgrades a venue to Certified — reserved for high-traffic venues (hospitals, transit hubs, major attractions) or confirmed city partnerships. Badge: "AccessMap Certified ✓"

**Monetization angle (first revenue):**

| Tier | Price | Features |
|---|---|---|
| Free | $0 | Claim profile, add accessibility info, respond to flags, Email Verified badge |
| Pro | ~$9/month | Venue analytics (views, route mentions), priority badge in route recommendations, export accessibility report as PDF |
| Partnership | Custom | Cities and transit authorities — bulk venue management, city-branded profiles, API data export for transit systems |

**Effort:** **XL** (2–3 weeks for full claim flow + Pro tier)

**Schema additions:**
```sql
venues (id, name, address, lat, lng, category, claimed_by uuid references users, claim_tier text, created_at)
venue_accessibility (venue_id, feature_key text, value text, updated_at, updated_by uuid references users)
venue_flag_responses (id, venue_id, flag_id, response_text, created_at)
venue_claims (id, venue_id, claimant_user_id uuid, email_sent_to text, verified_at timestamptz, admin_verified_by uuid)
```

**Dependencies:**
- Admin moderation (Phase 6 Item 4) must be live — needed to handle fraudulent claims.
- Trust score (Phase 5) live ✅ — Platinum users get priority in flagging unclaimed venues.
- Jordan review on claim verification flow + flag-response RLS.

**Jordan privacy flag:**
- **Flag responses:** venue owner must never see the identity of the user who filed a flag. RLS must ensure `flags.user_id` is not accessible via the venue response context. This is the most important constraint.
- **Claim email domain:** stored for verification. Not PII. Fine.
- **Venue data auto-generated from OSM:** public data about public spaces. No privacy concern.

**Steve security review:** YES — the claim flow is a new write surface. Steve reviews:
- Can a user fraudulently claim a competitor's venue? (Yes at Tier 1 — system is explicit that Tier 1 is unverified. Tier 2 and 3 are the trust signals.)
- Can a venue owner deanonymize flag reporters via flag responses? Must be prevented in RLS.
- Can the claim email domain field be used to enumerate business contacts? (Rate-limit claims per user; no bulk enumeration.)

**What it unlocks:**
- First revenue stream (Pro tier — when venues start asking for analytics)
- City and transit authority partnership conversations
- Positions AccessMap as the definitive accessibility authority for venues, not just a complaint map
- Phase 8 social layer: venues become social objects — neighborhood crews can adopt them, accessibility stories can reference them

**Recommended sprint:** Sprint 7 (read-only venue data from OSM, no claim flow). Sprint 8 (claim flow, free tier). Pro tier when venues are actively requesting analytics.

---

### Item 3 — Trust Score Functional Gating

**User story:**
*As a Gold contributor, my flag verifications carry more weight because the community has learned I'm accurate — so high-quality contributors can move flags through the pipeline faster and with less friction.*

**Context:**
Phase 5 built the trust score cosmetically (Bronze/Silver/Gold/Diamond with thresholds: Bronze 0, Silver 100, Gold 500, Diamond 1500 pts). Phase 7 makes it do real things. This is the moment gamification stops being decoration and starts being community governance.

**The three gates:**

| Tier | Threshold | New capability | Rationale |
|---|---|---|---|
| **Silver** | 100+ pts | 2 verifications instead of 3 to advance a flag to `verified` | Silver users have a track record; the community has validated their accuracy |
| **Gold** | 500+ pts | Verifications carry 1.5× weight (equivalent to 1.5 standard verifications) | Gold users are consistently accurate across many flags; their signal is stronger |
| **Diamond/Platinum** | 1500+ pts | Can initiate a "flag-as-wrong" challenge; three Diamond users agreeing = auto-reject after 24h review | Diamond users are the most trusted voices in the community; rarely wrong |

**On "obviously wrong" / Diamond challenges:**
The Platinum auto-reject gate is deliberately narrow. A Platinum user cannot unilaterally remove a flag — they flag-as-wrong, which opens a 24-hour review window. Three Diamond users agreeing = auto-reject. Sky (admin) can override at any time. This prevents coordinated abuse while allowing the community to self-police obvious spam.

**Effort:** **M** (2–4 days)

The scoring formula and tiers already exist. Changes needed:
1. Update `handle_flag_status_change` trigger to check verifying user's `trust_tier` and apply weighted counting.
2. Track individual verifications in a `flag_verifications` junction table with a `weight` column (if this table doesn't exist from the Phase 5 build — check before Dana starts).
3. Add the Diamond "flag-as-wrong" flow: `flag_challenges` table + 24h review logic + notification to admin.
4. Update the flag detail UI to show "2 verifications needed" vs "3 verifications needed" based on the viewer's tier.

**Schema additions:**
```sql
-- Check if this already exists from Phase 5 trust score build
flag_verifications (id uuid, flag_id uuid references flags, user_id uuid references users,
  weight numeric default 1.0, created_at timestamptz)

-- New for Diamond challenges
flag_challenges (id uuid, flag_id uuid references flags, challenger_user_id uuid references users,
  reason text, created_at timestamptz, resolved_at timestamptz, outcome text,
  agree_count int default 1)
```

**Dependencies:**
- Trust score from Phase 5 ✅ (tiers live)
- Jordan sign-off on weighted verification (deferred from Phase 6 AD-5/AD-6)
- Steve review: gaming vectors for weighted verify

**Jordan privacy flag:**
Weighted verification is rule-based, transparent, and non-probabilistic. The trust tier is public. This likely stays outside PIPEDA automated-decision-making territory — but Jordan must confirm before functional gating ships. Key framing: the gate affects who can verify flags, not who can access the app or services. No adverse decisions against users. Reporting is always open at every tier.

**Steve security review:** YES — weighted verification is a gaming target. Steve verifies:
- Can a user create sock-puppet accounts to inflate trust score and mass-verify flags? (Rate limiting on flag submissions + verification actions should throttle this; Steve confirms the current limits are sufficient.)
- Does the three-Diamond-agrees threshold prevent coordinated clique abuse?
- Is the 24h review window sufficient for admin oversight of Diamond challenges?

**What it unlocks:**
- Quality-based community governance: the community polices itself with Sky as backstop
- Faster resolution of high-confidence flags (Gold verifiers move things faster)
- Foundation for Phase 8 social identity (the Diamond badge is a visible community status symbol — earnable, meaningful, displayed prominently on the Phase 8 community profile)
- Reduces Sky's moderation load over time as Diamond contributors take on more governance

**Recommended sprint:** Sprint 7. This is M effort with high governance leverage. Start the Jordan conversation immediately — it's been deferred since Phase 6.

---

### Item 4 — Area Analytics for Contributors

**User story:**
*As a contributor who's been mapping my neighborhood for six months, I can see the impact my reports have had — which barriers are fixed, which areas I've helped, and whether my work is making a difference. Not vanity metrics. Real, local, specific context.*

**The problem this solves:**
Contribution is the engine of AccessMap. Contributor retention is existential. People stop contributing when their work feels invisible. Area analytics makes the invisible visible — with local, personal, specific data, not global leaderboard comparisons.

**Feature design (on the Profile screen):**

```
Your [Mission District] impact:

  47 flags filed
  31 verified by the community ✓
  12 resolved — barriers fixed! 🎉
  4 in review now

Your most reported barrier types:
  Broken/missing ramp ██████████  19
  Construction block  ████████    12
  Broken sidewalk     ████         9

Areas you've mapped:
  Mission District — your home turf (28 flags)
  SOMA (11 flags)
  Noe Valley (8 flags)

[Mini heatmap of your flags — color-coded by status]
```

When route scoring (Item 1) is live, add:
*"Your resolved flags have appeared on 3 community-saved routes."*

**Effort:** **M** (2–4 days)

Mostly aggregate SQL queries + a new section on the Profile screen. The mini heatmap reuses the existing heatmap component with a user-scoped filter.

**Schema changes:** None. All data is derivable from existing `flags` and `users` tables.

**Privacy design — two modes:**

| Data | Visible to | Default | Rationale |
|---|---|---|---|
| Full impact summary (counts, types, mini heatmap) | Self only | **Private** | Precise mapping pattern reveals where user lives/works/travels |
| Neighborhood flag count ("42 flags in the Mission") | Others (opt-in) | **Off** | Neighborhood-level is coarse enough; user chooses to share |
| Mini heatmap | Others (opt-in) | **Off** | Flag cluster → location inference risk; must be user's explicit choice |

**Jordan privacy flag:**
- The contributor's geographic mapping pattern is sensitive data. If someone reports 40 flags within a 2-block radius, that pattern could reveal where they live, work, or spend time daily. This data defaults to private-to-self.
- Jordan must confirm: is a neighborhood-level aggregate ("42 flags in the Mission District") safe for public display when the user opts in? Recommended answer: yes, if the resolution is neighborhood (not street/block) and the count is across a broad area.
- The analysis never infers or labels disability from flag history. No text analysis of flag descriptions.

**Steve security review:** No new attack surface. All queries are read-only on the user's own data.

**What it unlocks:**
- Contributor retention: people who can see their impact come back
- Foundation for Phase 8 community profiles (this data feeds the "Your accessibility story" section automatically)
- Identifies power contributors for neighborhood crew leader roles (Phase 8 Item 2)
- Social proof: "I've helped fix 12 barriers" is a real, shareable fact — not a score

**Recommended sprint:** Sprint 7. High retention value, low engineering cost. Build it early and iterate.

---

### Item 5 — Saved Accessible Routes

**User story:**
*As a regular commuter who's found an accessible path to the farmers market, I can save it, add my own notes ("use the back entrance — the front steps are steep"), and share it with other users navigating the same area.*

**The problem this solves:**
Item 1 (route scoring) generates routes algorithmically. Saved routes add the human layer: routes that real people with disabilities have personally verified as accessible, week after week. An algorithm can't know that the "accessible" entrance on Valencia is awkward for power chairs even though it technically has a ramp. A person who uses that route every week knows.

**Feature design:**

*Saving a route:*
- After generating a route (requires Item 1) → tap "Save this route"
- Add a name: "My route to the Ferry Building"
- Add notes (optional): "Steep approach on Beale St — go one block north to Howard instead."
- Choose visibility: Private (just me) / Public (anyone) / Shareable link

*Discovering saved routes:*
- A "Saved Routes" layer toggle on the map shows community-shared routes as colored lines
- Tap a route → see name, contributor tier badge, notes, and "Was this still accessible?" confirmation button
- Route accuracy score: the ratio of "still accurate" to "needs review" confirmations over the last 90 days

*Route health (keeps routes from going stale silently):*
- When a new flag appears on or near a saved route, the creator gets a notification: "A new barrier was reported near your route to the Ferry Building — check if it still works."
- If 3 users report a route as blocked → status changes to "Needs review" (no longer shown as a recommended route until the creator confirms or updates it)

**Effort:** **L** (1 week)

This requires Item 1 (route scoring) to be live first. The social sharing + route health decay mechanics add meaningful complexity beyond simple persistence.

**Schema additions:**
```sql
saved_routes (id uuid, user_id uuid references users, name text, notes text,
  route_geojson jsonb, visibility text, status text default 'active', created_at, updated_at)
saved_route_flags (route_id uuid references saved_routes, flag_id uuid references flags)
saved_route_reviews (id uuid, route_id uuid references saved_routes,
  reviewer_user_id uuid references users, still_accurate boolean, note text, created_at)
```

**Dependencies:**
- Item 1 (Accessible Route Scoring) must ship first. Routes need to be generated before they can be saved.
- Jordan review on public route sharing (start/end points as location data, route notes as user-authored text).
- Realtime subscription (or a scheduled check) for new flags near saved routes.

**Jordan privacy flag:**
- **Shared route start/end points:** public start/end between two public places (not a home address) is not PII. Fine — but the UI should make clear that saved public routes show the contributor's username, not their location.
- **Private routes:** user's personal travel patterns. Default private. User opts into sharing.
- **Route notes:** user-authored text that could inadvertently contain PII ("my house is on the corner"). A report button on public route notes is sufficient for v1. Admin moderation applies.

**Steve security review:** Light. Route GeoJSON is structured data (no injection surface). Public sharing links must use opaque UUIDs (not sequential IDs) to prevent route enumeration. Report-this-note button sufficient for user-authored note moderation.

**What it unlocks:**
- A layer of local human knowledge that no routing algorithm can replicate
- Retention: saving a route is a commitment to return to the app
- Phase 8 social layer: "Community's most-shared routes in the Mission District" becomes a social object — discoverable, shareable, meaningful
- Long-term: a library of human-verified accessible routes is uniquely valuable data that no other app has

**Recommended sprint:** Sprint 8 (after Item 1 lands in Sprint 7).

---

## 2. Sky Decisions Needed (P7-AD-#)

| # | Decision | Affects | Morgan's recommendation | Urgency |
|---|---|---|---|---|
| **P7-AD-1** | Route scoring backend: in-house OSRM (free, self-hosted via Docker on a VPS or Supabase Edge Function) vs. third-party API (Valhalla, HERE, MapBox Directions — ~$50–200/month at modest scale)? | Item 1 | **In-house OSRM.** Free, no rate limits, data stays local. Add third-party as fallback only if OSRM performance is insufficient. | Before Item 1 starts |
| **P7-AD-2** | User accessibility profile: explicit preference (checkboxes: "I use a wheelchair", "I have low vision") vs. derived from filtering behavior? | Item 1 | **Explicit preference (Option A).** Honest, gives users control, avoids behavioral inference risk. Jordan will prefer A. | Before Item 1 starts |
| **P7-AD-3** | Venue profiles: build the full claim flow in Phase 7, or ship read-only venue data from OSM first and add claiming in Phase 8? | Item 2 | **Read-only in Phase 7, claim flow in Phase 8.** OSM venue data is free. Claiming requires full verification + legal model. Don't rush it. | Before Item 2 starts |
| **P7-AD-4** | Monetization for venue Pro tier: is Sky willing to take payments (requires Stripe or equivalent)? | Item 2 | **Defer payments to Phase 8.** Prove value with free profiles first. Add Pro tier when venues are asking for analytics. | Before Sprint 8 |
| **P7-AD-5** | Diamond flag challenges: Platinum users can initiate a challenge (three-agree auto-reject after 24h review), or should flag challenges be admin-only? | Item 3 | **Platinum challenges are fine with the 3-agree threshold + 24h review window.** Sky can always override. If Sky prefers admin-only, that's simpler and equally valid. | Before Item 3 starts |
| **P7-AD-6** | Area analytics public visibility: can users opt to show their neighborhood flag count publicly, or is all analytics private-to-self? | Item 4 | **Opt-in public is fine for neighborhood-level aggregates** (e.g., "42 flags in the Mission"). Jordan must confirm precise mapping patterns stay private-to-self. | Before Item 4 ships |

---

## 3. Privacy and Security Gate Summary

| Item | Jordan gate | Steve gate |
|---|---|---|
| 1 Route Scoring | **YES** — accessibility profile is disability-adjacent data | Light — outbound read only |
| 2 Venue Profiles | **YES** — flag identity vs. venue owner deanonymization risk | **YES** — claim flow is a new write surface |
| 3 Trust Score Gating | **YES** — PIPEDA automated-decision check (deferred from P6) | **YES** — gaming vectors for weighted verify |
| 4 Area Analytics | **YES** — contributor mapping pattern = location inference | No new surface |
| 5 Saved Routes | **YES** — shared routes, private travel patterns | Light — UUID sharing, report button |

---

## 4. Recommended Execution Order

**Guiding principle:** Route Scoring (Item 1) is the Phase 7 flagship. Everything else grows in value once routing exists. But Trust Score Gating (Item 3) is M-effort with high governance value and should ship early. Area Analytics (Item 4) is the retention play — high value, low cost.

### Sprint 7 — Core Growth Layer

| Priority | Item | Who | Gate |
|---|---|---|---|
| 1 | Trust Score Functional Gating (M) | Dana + Shamus | Jordan AD-6 confirmation (deferred from P6) + Steve review |
| 2 | Area Analytics MVP — private-to-self (M) | Shamus + Dana | No gate for private-only; Jordan consultation on opt-in public |
| 3 | Route Scoring — OSRM prototype, single city (XL starts here) | Peter + Dana | P7-AD-1 decided; PostGIS live |
| 4 | Venue Profiles — read-only OSM data, no claim flow (M) | Shamus | No gate for read-only |

### Sprint 8 — Routes + Social Foundation

| Priority | Item | Who | Gate |
|---|---|---|---|
| 1 | Route Scoring — full UI + flag penalty overlay (complete Item 1) | Peter + Shamus | Sprint 7 prototype validated |
| 2 | Saved Routes (L) | Shamus + Dana | Jordan sign-off; Item 1 live |
| 3 | Venue Claim Flow — free tier (L) | Shamus + Dana | Jordan + Steve gates; P7-AD-3 decided |
| 4 | Area Analytics — opt-in public neighborhood count | Shamus | Jordan confirmation |

### Phase 7 exit criteria

Phase 7 is complete when:
- Accessible route scoring is live for at least one city (real users have used it)
- Trust score is doing real governance work (weighted verifications and Diamond challenges in production)
- Area analytics is visible to contributors (even private-only)
- Venue read-only profiles appear on the map

---

## 5. The Phase 7 Thesis

Phase 6 put AccessMap on the App Store. Phase 7 answers the question every new user eventually asks: *why should I keep contributing?*

The answer is: because the app gets more powerful when you do. Your verified flags make routes more accurate. Your trust tier gives you more governance authority in the community. Your mapped area shows you the barriers you've helped fix. And one day soon, a stranger with a power wheelchair navigates Valencia Street using a route that includes your verified data — and they'll never know your name, but the city is a little more navigable because you were here.

That's the Phase 7 thesis. Not growth hacking. Not DAU metrics. Transformative utility that makes this community indispensable to each other.

---

*Filed by Morgan (PM). No code or schema changes in this document. All items propose-only until Sky approves execution. Start with P7-AD-1 through P7-AD-6 in §2 before Peter or Rory begins Sprint 7 infrastructure work. The Jordan conversation on trust score gating (P7-AD-5, deferred from Phase 6) is the most urgent unlock — start it now.*
