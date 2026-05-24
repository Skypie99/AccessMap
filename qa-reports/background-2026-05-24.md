# Quinn — Background Product Pass — 2026-05-24

**mode:** background
**model_tier:** opus-4.7
**project:** AccessMap
**cycle_id:** quinn-product-bg-2026-05-24
**role:** Quinn (Product Manager)
**branch:** none (AUDIT-ONLY per Const. 12.5 — AccessMap is privacy-sensitive)
**halt_check:** `~/.claude/BACKGROUND_HALT` absent at cycle start
**inputs read:** FEATURES.md, recent qa-reports (PM v2, Quinn r7-r15, Quinn cycle-A, expansion-plan), git log/branches on main + unmerged tips

---

## TL;DR

The backlog has drifted from reality. FEATURES.md still describes R7/R8/R9
as "parked on branches awaiting Sky merge" — **all three have been merged
to `main`**, along with R10–R15, F2 (Onboarding), F3 (Settings hub), and
F4 (Filter Presets manager). The "Now" tier still names Marker Clustering
and Realtime SQL apply, both of which are still correct top-of-queue but
are blocked on Sky (one dep approval, two SQL applies) — they are
*decisions*, not buildable work.

Three fresh, *unmerged* branches landed in the last ~15 minutes and
together comprise the real next slice for Shamus / Sky:

1. `feat/get-directions-2026-05-24` — **Cycle A R2 — Get-directions handoff** (4 min old)
2. `feat/reputation-tier-2026-05-24` — **Cycle B T4 — Reporter reputation tier** (1 min old)
3. `feat/filter-presets-apply-2026-05-24` — **F4-wire — Filter Presets save/apply on Map** (1 min old)

Plus `cycle/auto-2026-05-24` (Tasks "All / Mine" scope toggle + Map-filter
polish + 7 tests) and `perf/auto-2026-05-24` (Peter's memoization sweep)
are still unmerged from earlier today.

Cycle A is **80% landed** (F2 + F3 + F4-manager + R9 + R7 + R8 in `main`;
R2 + F4-wire still on branches). Cycle B has begun (T4 branched; T1, C4,
R5 not yet started). The top product question for Sky is *whether to clear
the four Sky-only blockers* (clustering deps, two SQL applies, branch
cleanup) **before** Shamus starts Cycle B-rest, or in parallel.

No new privacy-sensitive surface was introduced this pass — R9's location
prompt was already resolved last cycle by Sky's "option B" choice (cached
permission only). The **next privacy-sensitive surface on the horizon is
T2 (Threaded comments)** — that one needs Jordan + Steve + Sky before
Shamus builds.

---

## 1 — Backlog State of Reality

### What FEATURES.md says vs. what `main` actually contains

| FEATURES.md claims | Reality on `main` HEAD (`5b982ec`) | Action |
|---|---|---|
| "R7 parked on branch" | **Merged** (tasks-sort with persistence) | Remove from "Parked" section |
| "R8 parked on branch" | **Merged** (map long-press drop) | Remove from "Parked" section |
| "R9 parked on branch" | **Merged** (Profile nearest-flag jump, with Sky-chosen cached-permission privacy gate) | Remove from "Parked" section; add to "Shipped" with the privacy resolution noted |
| (not listed) | **Merged**: R10 Help/FAQ search, R11 Share refactor, R12 Changelog collapsible, R13 My Reports search, R14 Address recents, R15 Feedback filter | Add to "Shipped 2026-05-24" |
| (not listed) | **Merged**: F2 Onboarding flow, F3 Settings hub + About + confirm helper | Add to "Shipped 2026-05-24 — Cycle A" |
| (not listed) | **Merged**: `feat/filter-presets-manager-2026-05-24` (F4-manager pure-lib + modal, but **modal has no entry point yet — dormant**) | Add to "Shipped" with explicit note that wire-up is on `feat/filter-presets-apply-2026-05-24` |
| "Now: Marker clustering — DECISIONS FOR SKY" | Still blocked on Sky's dep approval | Keep, restate decision crisply |
| "Now: Realtime — awaiting one SQL run" | Still blocked on Sky applying `supabase/realtime.sql` | Keep, restate |
| "Default-filter-set — shipped on `feat/default-filter-set-2026-05-23` (unmerged)" | **Already merged** | Move to Shipped |
| "Distance test coverage — Loop 5 didn't add one" | Likely fixed by Gary's recent +7 tests on `cycle/auto-2026-05-24` (not yet merged) | Re-check after that branch lands; for now keep as Open |
| "Address search / jump-to" | **Shipped** (Nominatim search May 23 + recents R14 May 24) | Remove from Next |
| "Wire `accessmap://flag/{id}` deep-link handler" | Not yet built | Keep in Next |

### Currently unmerged branches that matter

| Branch | Tip commit | What it ships | Status |
|---|---|---|---|
| `feat/get-directions-2026-05-24` | `235ca8d` (4 min) | **Cycle A R2** — "Get directions" hand-off from flag detail to Apple/Google Maps | Ready to merge (assuming green) |
| `feat/reputation-tier-2026-05-24` | `8c06fd6` (1 min) | **Cycle B T4** — Reporter reputation badge tier on Profile | Ready to merge |
| `feat/filter-presets-apply-2026-05-24` | `47c81ad` (1 min) | **F4 wire-up** — connects the manager modal to a Map entry point + apply | Ready to merge — **lights up the dormant F4-manager that's already in main** |
| `cycle/auto-2026-05-24` | `25862c6` (3 hr) | Tasks "All / Mine" scope persistence + Map-filter reset polish + 7 tests | Ready to merge |
| `perf/auto-2026-05-24` | `acee1cf` (4 hr) | Peter's perf sweep: 4 memoization commits + planning docs | Ready to merge |
| `design/auto-2026-05-23` | (Dani) | Component edits deferred from D4 decision | Decision deferred — re-surface |

### Stale branches that should be cleared (carry-forward Decision I from Morgan PM v1)

These branches lingered after their content was either merged via a
different branch or superseded. Their existence is cosmetic noise, not a
product risk:

- `feat/photo-lightbox-2026-05-23` (content already in `main` via a different merge path)
- `feat/my-reports-filter-2026-05-23` (superseded by `feat/my-reports-status-filter-2026-05-23`, which is merged)
- `feat/shared-flags-provider-2026-05-23` (merged separately)
- `feat/realtime-points-2026-05-23`, `feat/realtime-live-points-2026-05-23` (older work; verify against `main`)
- `feat/flag-pagination-2026-05-23` (verify; may be superseded)
- `worktree-agent-*` (orchestrator locks, not product branches)

Recommend including these in Sky's next branch-cleanup pass.

---

## 2 — Re-Ranked "Now" Tier (top of FEATURES.md as it should read)

After this pass, the deliberate top-of-backlog should be:

1. **Sky-only blockers (clear first, in any order — they unlock 5 features at once)**
   - **D-CL**: Approve `react-native-map-clustering` + `supercluster` deps → unlocks **R5 Map clustering** (in Cycle B per Morgan's plan)
   - **D-RT**: Apply `supabase/realtime.sql` → flips realtime flag updates from no-op to live (client already merged)
   - **D-FB**: Apply `supabase/migrations/2026-05-23_feedback_table.sql` → flips My Feedback history from empty-state to populated
   - **D-MERGE**: Merge the 5 unmerged ready branches above (in any order)

2. **Cycle B build slice (ready to start once D-CL lands and Cycle A finishes merging)**
   - **T1 — Flag status history (audit trail).** Read-only timeline on Flag Detail showing who changed status, when, and (optionally) why. Lays groundwork for T2 (comments) and C3 (verifier reason). **Complexity: L.** No schema needed if we read from existing `flags.updated_at` + a small new event log. **DECISION FOR SKY**: do we add a `flag_events` table (preferred, future-proof for C3) or compute history from a single audit-column trigger?
   - **T4 — Reporter reputation tier.** Branched at `feat/reputation-tier-2026-05-24`. Spec confirmed: profile badge derived from existing points data; no new schema; no new data collected. **Ready to merge.**
   - **C4 — Time-of-day / weather tags.** Optional string array on `flags` (`["high_tide","slippery_when_wet"]`). Surfaces as chips on Flag Detail. **Complexity: L** but needs schema column → Dana migration file. **No decision needed yet — surface in spec.**
   - **R5 — Marker clustering.** Same spec already in FEATURES.md. Blocked on D-CL approval.

3. **Foundations / polish that can ride alongside Cycle B**
   - **Wire `accessmap://flag/{id}` deep-link handler** (R11's share button still emits this URL with no listener). 1-hour build; `expo-linking` + existing `focusFlag` route param.
   - **Tasks "All / Mine" scope toggle** — already built on `cycle/auto-2026-05-24`, just needs merge.
   - **`confirmDestructive(...)` helper rollout** — Quinn's cycle-A Q-001 ticket. Five-line shim; eliminates the recurring `Alert.alert` no-op-on-web bug pattern (R8, R11, F3, F4 all hit it). High-leverage one-time fix.

4. **De-prioritized (move down or remove)**
   - "Distance test coverage" — likely covered by Gary's recent +7 tests on `cycle/auto-2026-05-24`; close after that merges and verify.
   - "Address search / jump-to" — **shipped**; remove.

---

## 3 — Build-Ready Specs for the Top 3 Now Items

### Spec 3.1 — Wire `accessmap://flag/{id}` deep-link handler

**User story.** As a community member, when a friend texts me an
AccessMap flag link, tapping it should open the app directly to that
flag on the Map tab (centered, callout open). Currently the share button
emits the URL but tapping it bounces to a "what app should open this?"
prompt or no-ops in-app.

**Scope.**
- Register `accessmap://` scheme in `app.json` (already partly there for native; confirm web `expo-router`-style routing).
- Add `Linking.addEventListener('url', handler)` in `App.tsx` (or root navigator). Parser: pull `id` from the URL, look up `lat/lng` from FlagsProvider, navigate to Map tab with `{ focusFlag: { id, lat, lng } }` route param (already supported per R8's drop flow).
- Handle the cold-start case: `Linking.getInitialURL()` on mount.
- Web build: `window.location.pathname` parse on first paint for `/flag/<uuid>` (paves the way for R4 — public web flag URLs — without committing to it yet).

**Acceptance criteria.**
- Cold-start: opening an `accessmap://flag/<uuid>` URL while the app is killed → app opens → Map tab → flag centered + callout visible within 1.5s of FlagsProvider hydration.
- Warm-start: same behavior when the app is backgrounded.
- Unknown UUID → toast "Flag not found" + land on Map at last position (no crash).
- Web: visiting `/flag/<uuid>` → same Map-tab-centered behavior.
- 4 unit tests on the URL parser (`src/lib/deepLink.ts`) covering: valid UUID, missing UUID, malformed URL, query-string suffix.

**Out of scope.**
- Public web flag URLs (R4) — separate feature; parser will be reusable.
- Universal Links / iOS Associated Domains — keep the scheme-based URL only this cycle.

**Dependencies.** None; uses `expo-linking` already in `package.json`.

**Privacy/ethics note.** **None.** URL contains only a public flag UUID; no PII. No new permissions.

**Rough size.** L — ~1 cycle (3–4 hr Shamus + 1 hr Gary tests).

---

### Spec 3.2 — `confirmDestructive(...)` helper + lint rule

**User story.** As a web user, when I tap Sign Out, Delete Preset, or
similar destructive actions, I should see a confirm dialog and the action
should fire on confirm — today these calls go through `Alert.alert`,
which is a documented no-op on RN Web, so the buttons silently do nothing
or fire without confirm.

**Scope.**
- New `src/lib/confirm.ts`:
  ```ts
  import { Alert, Platform } from 'react-native';
  export function confirmDestructive(opts: {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }) {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(`${opts.title}\n\n${opts.message}`)) opts.onConfirm();
      return;
    }
    Alert.alert(opts.title, opts.message, [
      { text: 'Cancel', style: 'cancel' },
      { text: opts.confirmLabel, style: 'destructive', onPress: opts.onConfirm },
    ]);
  }
  ```
- Replace all destructive `Alert.alert` call sites: `SettingsScreen.handleSignOutPress`, `FilterPresetsModal.handleDelete` (already-merged but dormant), `MapScreen.handleMapLongPress` (the web branch only), `ProfileScreen` any sign-out / delete-account paths.
- Add an ESLint rule (`no-restricted-syntax` on `CallExpression[callee.object.name="Alert"][callee.property.name="alert"]`) with an exemption comment for non-destructive paths — or simpler: a code-review checklist line in CLAUDE.md.

**Acceptance criteria.**
- On web Chrome + Firefox: Sign Out from Settings shows the browser confirm; clicking OK signs out, clicking Cancel doesn't.
- On native iOS + Android: identical UX to today (no regression).
- 3 unit tests on `confirmDestructive` mocking `Platform.OS` and `window.confirm` / `Alert.alert`.
- All 4 call sites converted; visual / a11y unchanged on native.

**Out of scope.** Non-destructive `Alert.alert` (informational toasts, simple OK-only dialogs) — those can stay until a separate pass.

**Dependencies.** None.

**Privacy/ethics note.** **None.**

**Rough size.** S — ~1 hour Shamus + 1 hour Gary.

---

### Spec 3.3 — T1: Flag Status History (audit trail)

**User story.** As a wheelchair user reading a flag, I want to see *who*
changed its status and *when* — "verified by 3 reporters in the last
week" is far more trustworthy than "verified, no further info." Status
history is the foundation for the Trust pillar.

**Scope.**
- **Schema** (Dana — propose-only migration file):
  ```sql
  CREATE TABLE public.flag_events (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_id    uuid NOT NULL REFERENCES public.flags(id) ON DELETE CASCADE,
    actor_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    kind       text NOT NULL CHECK (kind IN ('reported','verified','resolved','rejected','reopened')),
    note       text CHECK (length(note) <= 280),  -- reserves room for C3
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX flag_events_flag_id_created_at_idx ON public.flag_events (flag_id, created_at DESC);
  -- RLS: select policy mirrors flags.select (anyone can read);
  --      insert via SECURITY DEFINER RPC only (no direct INSERT from client)
  ALTER TABLE public.flag_events ENABLE ROW LEVEL SECURITY;
  CREATE POLICY flag_events_select ON public.flag_events FOR SELECT USING (true);
  -- (No direct INSERT/UPDATE/DELETE policies — RPCs only.)
  ```
  Plus a trigger on `flags` (or — preferred — an `audit_flag_status_change()` RPC called from each existing status-change RPC) that inserts the matching `flag_events` row atomically with the status update.

- **Client.**
  - New `src/lib/flagHistory.ts`: `useFlagHistory(flagId)` hook + pure
    `formatHistoryEntry(event)` helper. Newest-first; cap at 20 entries
    rendered per flag in the modal.
  - New section in `FlagDetailModal` between the photo and the action
    buttons: "History" header + vertical timeline.
  - SR support: each row reads as "{actor display name | 'Anonymous'}
    {kind} this flag {relative time}".

- **Reputation seed.** Reporter reputation (T4, already branched) can
  later be computed off `flag_events` instead of `points`, but this
  cycle T4 stays as-is; T1 just lays the data.

**Acceptance criteria.**
- Existing flow: when a user marks a flag verified, an event row inserts
  atomically (transaction succeeds together or rolls back).
- Modal: opening a flag with 3 history events shows them in reverse-chron
  order with relative timestamps and actor display names.
- Anonymous events (actor_id NULL after user account deletion) render as
  "Anonymous" without crashing.
- 6 unit tests on the history formatter; 1 RPC integration test (Gary)
  asserting the event row is created.
- RLS test (Steve): unauthenticated client can SELECT events; cannot
  INSERT/UPDATE/DELETE directly.

**Out of scope.**
- C3 (verifier reason text) — the `note` column reserves space; surfacing
  the input UI is the C3 ticket.
- T4 changes — reputation stays points-derived this cycle.
- Backfill of pre-T1 history — older flags will simply have no events
  listed (graceful: empty section omitted).

**Dependencies.**
- Dana migration file (`supabase/migrations/2026-05-24_flag_events.sql`)
- Steve RLS review on the migration
- Sky to apply the migration (same gate as other AccessMap SQL)

**Privacy/ethics note.** **MEDIUM.** Adds a new public-readable table of
who-did-what-when. Mitigations: actor_id is the auth UUID, not display
name; display name is fetched separately and respects user privacy
prefs (already in app); actor_id goes NULL on account deletion (FK
ON DELETE SET NULL). **Should be surfaced to Sky as a privacy decision
point before Dana writes the migration.** Per Const. Art. 9.

**Rough size.** M — ~2 cycles (1 Dana + Steve review, 1 Shamus + Gary).

---

## 4 — Privacy / Ethics Surface (Const. Art. 9)

No new privacy-sensitive change was *introduced* this cycle (R9's
location prompt was already resolved by Sky's cached-permission choice;
that resolution stands).

**Looking forward, the next 4 privacy-sensitive features that need Sky's
explicit approval before Shamus builds:**

| Feature | Why it's privacy-sensitive | Decision needed |
|---|---|---|
| **T1 Flag status history** (spec above) | New public-readable table of who-did-what-when on flags | Sky to approve the data model (actor_id-as-UUID, NULL on delete) and the SELECT-public RLS — before Dana writes the migration |
| **T2 Threaded comments** | User-generated text in public, attributable, with all the moderation surface that implies | Sky + Jordan + Steve sign-off needed: who can comment (auth gate?); moderation flow (T5 dep); rate-limit; PII redaction policy; right-to-delete |
| **R1 Push notifications** | Requires storing user push tokens server-side; tokens are PII-adjacent | Sky to approve token storage table + retention policy (Jordan to draft) |
| **AI Photo-to-Category (planning session #2)** | Image upload to model host; raw photo data leaves device | Sky + Jordan + Steve to draft `PRIVACY-AI.md` (EXIF strip, model host, retention, opt-out) — explicitly in Morgan PM v1 Steve recommendation |

**None of these should be started until the decision is in writing.**
Quinn's role is to *flag* — Morgan carries the question to Sky.

---

## 5 — DECISIONS FOR SKY (carry-forward + new)

These are restated from prior PM briefings for continuity. Quinn does
not introduce new decisions this pass — the open ones from Morgan's
v1 + v2 briefings are still open.

1. **D-CL — Approve marker-clustering deps** (`react-native-map-clustering` + `supercluster`). Steve cleared them. Sky's "approve" unblocks R5 Cycle B.
2. **D-RT — Apply `supabase/realtime.sql`.** Single idempotent line; client already merged.
3. **D-FB — Apply `supabase/migrations/2026-05-23_feedback_table.sql`.** Idempotent; flips My Feedback from empty-state to populated.
4. **D-T1 (new, conditional) — Approve the `flag_events` schema model** *before* Dana writes the migration. See Spec 3.3 + Section 4.
5. **D-AI (new, conditional) — `PRIVACY-AI.md` drafting authority.** Steve recommended drafting; Sky's yes/no determines whether Jordan + Steve start before any AI feature ships.

---

## 6 — Proposed FEATURES.md Edit (NOT APPLIED — Audit-Only)

Because AccessMap defaults to AUDIT-ONLY in BACKGROUND mode (Const.
12.5), Quinn does *not* commit this edit. Below is the diff for
Sky / Morgan to apply on `product/auto-2026-05-24` next time Quinn runs
in interactive mode (or for Sky to land directly).

**Proposed structure:**

```diff
@@ Now (next 1-2 runs) @@
-## Parked on branches (2026-05-23) — awaiting Sky merge
-...R7/R8/R9 details...
+## Shipped 2026-05-24 — R7-R15 wave (merged to main)
+
+- **R7 Tasks sort** (Newest/Oldest/Severity, persisted, +18 tests)
+- **R8 Map long-press drop** (native Alert + web contextmenu path, fixed post-Quinn audit)
+- **R9 Profile nearest-flag jump** (with cached-permission privacy gate; Sky chose option B)
+- **R10 Help/FAQ search**, **R11 Share refactor** (web fallback restored), **R12 Changelog collapsible**, **R13 My Reports search**, **R14 Address recents**, **R15 Feedback filter chips**
+
+## Shipped 2026-05-24 — Cycle A (merged to main)
+
+- **F2 Onboarding flow** (pre-auth 3-card intro + per-user FirstLaunchGate)
+- **F3 Settings hub** (consolidated Settings screen + `confirmDestructive` helper introduced here — broader rollout in Spec 3.2)
+- **F4 Filter Presets — manager** (modal + pure-lib; **dormant** — no entry point until `feat/filter-presets-apply-2026-05-24` lands)

@@ Now (top of queue) @@
-- **Marker clustering on the Map.** ...
-- **Realtime flag updates — client merged to main, awaiting one SQL run.** ...
+- **Sky-only unblocks (clear before Cycle B-rest)**:
+  - Approve marker-clustering deps (`react-native-map-clustering` + `supercluster`) → unlocks R5
+  - Apply `supabase/realtime.sql` → flips realtime live
+  - Apply `supabase/migrations/2026-05-23_feedback_table.sql` → flips My Feedback live
+  - Merge the 5 unmerged ready branches: `feat/get-directions-2026-05-24`, `feat/reputation-tier-2026-05-24`, `feat/filter-presets-apply-2026-05-24`, `cycle/auto-2026-05-24`, `perf/auto-2026-05-24`
+- **Wire `accessmap://flag/{id}` deep-link handler** — spec in `qa-reports/background-2026-05-24.md` §3.1
+- **`confirmDestructive(...)` helper rollout** — spec in §3.2; high-leverage one-time fix for the recurring RN Web `Alert.alert` no-op bug
+- **T1 Flag status history (audit trail)** — Cycle B opener; spec in §3.3; **DECISION FOR SKY required before Dana writes the migration** (privacy-sensitive)

@@ Next (this month) @@
-- **Default-filter-set on launch — shipped on `feat/default-filter-set-2026-05-23` (unmerged).** ...
-- **Address search / jump-to.** ...
-- **Wire `accessmap://flag/{id}` deep-link handler.** ...
+- **T4 Reporter reputation tier** (branched at `feat/reputation-tier-2026-05-24`; ready to merge)
+- **C4 Time-of-day / weather tags** (optional flag string array; needs Dana schema column; no decision yet)
+- **R5 Marker clustering** (gated on D-CL approval above)
+- **Tasks "All / Mine" scope toggle** (on `cycle/auto-2026-05-24`; ready to merge)

@@ Privacy queue (NEW SECTION — surface to Sky before Shamus builds) @@
+## Privacy queue (Const. Art. 9 — Sky decision required)
+
+These features cannot start until Sky approves the privacy model:
+- **T1 Flag status history** — new public-readable `flag_events` table
+- **T2 Threaded comments** — UGC moderation surface (also needs T5)
+- **R1 Push notifications** — server-side push-token storage
+- **AI Photo-to-Category / Voice-First Reporting** — image/audio leaves device; needs `PRIVACY-AI.md` first
```

This shape preserves history (everything currently in "Shipped recently"
stays), but trims "Parked on branches" because that whole section is
out of date, and replaces the now-stale Now/Next contents with reality.

---

## 7 — Cross-Cutting Insights

- **The QA pipeline is working well.** R7-R15 produced 5 HIGH findings;
  every one was caught by Wave 2 (Quinn/Alex/Gary read-only audits) and
  fixed in Wave 3 polish loops before merge. The pattern of build →
  audit → polish in disjoint worktrees is paying off (no merge
  conflicts across 13 parallel agents). Worth promoting in LEARNINGS.md
  if Will hasn't already.

- **Two recurring web-platform bugs keep getting introduced:**
  1. `Alert.alert` being a documented no-op on RN Web (R8, R11, F3, F4
     all hit it).
  2. `Share.share` rejecting on browsers without Web Share API
     (R11 originally regressed this; was restored in polish).
  **The `confirmDestructive` helper (Spec 3.2) closes #1 once and
  forever.** A similar `shareTextSafe(text)` helper would close #2 the
  same way. Worth either skill-level guidance for Shamus or a small
  shared utility cycle.

- **`feat/filter-presets-manager-2026-05-24` is in main but has no UI
  entry point.** That means there's currently dead-code shipping in
  every build. Low blast radius (one modal that no button opens), but
  **`feat/filter-presets-apply-2026-05-24` MUST land soon** or the
  manager just sits there. Recommend bundling it into the next merge
  batch as a hard requirement.

- **Cycle B planning is solid but order matters.** Morgan's expansion
  plan has Cycle B = T1 + T4 + C4 + R5. T4 is already branched (good).
  T1 needs a privacy decision *first* (D-T1). R5 needs a dep approval
  *first* (D-CL). C4 needs a tiny schema change (Dana). If Sky doesn't
  decide on D-T1 or D-CL, the cycle stalls. Recommend Sky resolve those
  two decisions (and the two SQL applies that are completely free)
  **before** the next big-lift cycle so Shamus isn't blocked mid-build.

---

## 8 — What I did NOT do (and why)

- **Did not edit FEATURES.md.** Const. 12.5 makes AccessMap AUDIT-ONLY
  in BACKGROUND mode. The proposed edit lives in §6 above for Sky /
  Morgan to apply later.
- **Did not commit anything or create a `product/auto-2026-05-24`
  branch.** Same reason.
- **Did not message Sky / Morgan / anyone.** Const. 12.2 inherits
  Art. 9.4 unconditionally — no external sends from background.
- **Did not modify code, specs in other directories, schema files, or
  anything outside `qa-reports/`.** Quinn writes docs only; in
  background mode, only this qa-report.
- **Did not touch `~/.claude/**` or `~/ClaudeCorp/.claude/**` or any
  governance file.** Const. 12.6 hard exclusion.

---

## 9 — Recommended Next Actions (for Morgan to pick up)

1. **Bundle the 5 unmerged branches** into Sky's next merge pass (any
   order, no conflicts expected — they touch disjoint file sets):
   - `feat/get-directions-2026-05-24`
   - `feat/reputation-tier-2026-05-24`
   - `feat/filter-presets-apply-2026-05-24` *(do not skip — closes the dead-code gap from F4-manager)*
   - `cycle/auto-2026-05-24`
   - `perf/auto-2026-05-24`
2. **Surface D-CL, D-RT, D-FB, D-T1, D-AI** to Sky in the next briefing
   (D-CL/D-RT/D-FB already on the list; D-T1 and D-AI are forward-looking
   privacy gates Quinn is naming here).
3. **Apply the FEATURES.md edit in §6** on a `product/auto-2026-05-25`
   (or later) Quinn run, in interactive mode.
4. **Run the stale-branch cleanup** (carry-forward Decision I) once the
   next merge pass lands.

---

*Quinn — 2026-05-24 · Mode: background (scheduled task) · No external send, no commit, audit-only. Stop.*
