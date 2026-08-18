# Flagstone Accessibility Innovation Vision

> **Status:** Proposal — not yet implemented. Each section ends with a
> "Minimum viable" slice that could ship in a single sprint.

An accessibility app that is itself inaccessible is a contradiction. This
document goes beyond compliance checklists to ask: *how could Flagstone become
an indispensable daily tool for people with disabilities?*

---

## 1. Verified Accessible Routes

### The idea

Flagstone already knows where barriers are. The next step is using that data
to answer the question every wheelchair user asks before leaving home: *"Is
this path safe for me today?"*

A "verified accessible route" is a walking path between two points that:
- Avoids open/verified barrier flags along the way.
- Passes through areas where flags have been *resolved* (confirmed clear).
- Carries a confidence score based on flag age and verifier count.

### What this would require

| Requirement | Detail |
|---|---|
| **Flag density** | A grid cell needs at least one flag within ~50 m of every 100 m segment to be trustworthy. Sparse areas must be marked "unverified" rather than "clear." |
| **Graph routing** | We need a pedestrian routing graph (OpenStreetMap's walking network via OSRM or OpenRouteService). Flagstone flags are overlaid as edge weights: a verified barrier on a segment raises its cost to near-infinity; a resolved flag reduces cost. |
| **Routing API** | A Supabase Edge Function (or Vercel serverless function) accepts `{origin, destination, profile}` and returns a weighted route. Client renders the polyline on the map. |
| **Staleness model** | A flag older than 90 days and unverified should decay in weight — sidewalks get repaired. The confidence score must show the user when data is stale. |
| **Clear-flag density floor** | Segments with no flags at all are *unknown*, not *clear*. The UI must distinguish "no barrier reported" from "confirmed accessible." |

### Minimum viable slice

**Heatmap-guided routing:** before building a full routing engine, surface the
existing heatmap data as a "barrier density" layer that a user can visually
follow (or avoid) when planning a trip. No backend changes required — the
heatmap cells already encode severity. Add a "route planning" mode where the
user taps two points and the app highlights the heatmap gradient between them.

---

## 2. Disability-Specific Filtering

### The idea

A wheelchair user and a low-vision user have almost no overlap in the barriers
they need to know about. Showing every flag category to everyone creates noise
that erodes trust. A first-class *accessibility profile* turns Flagstone from
a generic map into a personalised guide.

### How flag categories map to disability profiles

| Profile | High-relevance categories | Low-relevance |
|---|---|---|
| **Wheelchair / mobility aid** | `no_ramp`, `broken_sidewalk`, `blocked_path`, `steep_grade` | `missing_signal` |
| **Low vision / blind** | `missing_signal` (crossing timers, tactile strips), `blocked_path` | `steep_grade`, `broken_sidewalk` (less critical with cane) |
| **Deaf / hard of hearing** | `missing_signal` (audio-only crossing announcements), any flag near transit stops | Most others |
| **Cognitive / neurodiverse** | `blocked_path` (unexpected detours are disorienting), any construction | `steep_grade` |
| **General / no profile** | All categories equally weighted | — |

### Implementation plan

**Phase A — saved profiles (no schema change)**
- Add a "My accessibility profile" picker in ProfileScreen (4 preset options + "Custom").
- Each profile is a `FilterPreset` under the hood — it sets the category and
  severity filters automatically when the user switches tabs.
- Store the active profile in `AsyncStorage`; apply it on launch as the default
  filter, overridable per-session.

**Phase B — profile-aware flag cards**
- Flag cards in TasksScreen show a "relevant to you" badge when the flag's
  category matches the user's active profile.
- Reporting flow: when a user's profile is set, pre-select the matching
  category in `ReportFlagModal` as the default (still editable).

**Phase C — profile in the database (schema change required)**
- Add `disability_profile` column to `public.users` (nullable enum or jsonb).
- Jordan gate required: disability profile is sensitive health data — storage,
  RLS, and deletion must be reviewed before landing (see Art. 7 protocol).
- Once stored server-side, profile data enables community trust scoring (§3).

### Minimum viable slice

Ship a `ProfileFilterPreset` component in the Profile tab: four tappable
cards ("Wheelchair", "Low vision", "Deaf/HoH", "Cognitive"). Tapping one
applies the matching `FilterPreset` to the Map — no new DB columns, no privacy
review needed. A "Reset to all" option clears the profile.

---

## 3. Community Trust Score

### The idea

A flag with 10 verifications carries more signal than one with 1. But
currently all verifiers are equal. A trust score weights verifications by:

1. **Verifier count** — more independent eyes = higher confidence.
2. **Profile diversity** — a flag for a missing ramp confirmed by both a
   wheelchair user *and* a sighted pedestrian is more credible than one
   confirmed by five wheelchair users (who all have the same vantage point).
3. **Recency** — recent verifications outweigh stale ones.

### How it would work

**Trust score formula (proposed):**

```
trust = Σ (recency_weight(v) × profile_weight(v))  for each verifier v
```

Where:
- `recency_weight(v)` = `1.0` if verified within 30 days, decays by 10% per
  month to a floor of `0.2`.
- `profile_weight(v)` = `1.5` if the verifier has a disability profile that
  matches the flag's category; `1.0` if no profile set; `0.8` if the verifier's
  profile is orthogonal to the category.

**Thresholds for display:**

| Score | Label | UI indicator |
|---|---|---|
| < 2 | Unverified | Grey dot (existing behaviour) |
| 2 – 5 | Community verified | Blue checkmark |
| 5 – 10 | Well verified | Blue double-checkmark |
| > 10 | Highly trusted | Gold badge |

**Database requirements:**

- `public.verifications` table: `flag_id`, `user_id`, `created_at`, `action`
  (verify/resolve/reject). Currently the flag's status change is atomic and
  un-audited — we need a verifications audit log.
- The trust score is computed in a Postgres view or materialized view; no
  application-layer calculation.
- Jordan gate: verifier profiles are disability data — the join between
  `verifications` and `users.disability_profile` must be reviewed before any
  query exposes per-user profile data in aggregated results (even as a weight).

### Integration with the points system

The existing trigger (`handle_flag_status_change`) awards flat points. The
trust-score model adds a *quality multiplier*: verifying a well-evidenced flag
(photo + description + matching profile) could award bonus points. This
incentivises thorough verification over drive-by clicks.

### Minimum viable slice

**Verifier count badge:** without any new DB schema, count the number of status
changes per flag from the existing `flags` activity or add a simple
`verification_count` integer column (no join needed, no disability data
exposed). Display this count as a "verified by N people" badge on the TaskCard
and the map callout. The diversity weighting and trust decay are Phase 2.

---

## Design principles for all three features

1. **Opt-in everything.** Disability profiles are personal. No feature should
   require a profile to be useful; profiles make it *better*.

2. **Transparent confidence.** Never show a route or a trust score without
   explaining what it's based on. Blind trust in sparse data does harm.

3. **Privacy by design.** Before storing any disability profile data,
   Jordan (privacy gate) must approve the schema, RLS policy, and deletion
   path. The profile should be deletable independently of the account.

4. **Community first.** These features only work with flag density. Features
   that incentivise more (and better) reporting build the foundation.
