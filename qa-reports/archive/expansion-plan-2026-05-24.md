# AccessMap Expansion Plan — 2026-05-24
**Morgan · planning pass · supersedes nothing (additive)**

Read time: ~8 minutes. Designed to hand directly to the team.

---

## 1 — Executive Summary

### What we're building toward
AccessMap evolves from **a flag-dropping app** to **a community-verified
accessibility map you can actually plan a trip around**. Three product
pillars drive the next 3–4 months of work:

1. **Trust** — multi-user verification, status history, reporter
   reputation. So a wheelchair user can rely on what they read.
2. **Context** — threaded comments, multiple photos, accessibility tags
   beyond severity/category. One photo of a missing ramp doesn't tell
   the full story.
3. **Reach** — push notifications for watched & nearby flags, public
   web URLs for sharing, basic routing-app handoff. Get the data to
   the people who need it, when they need it.

### Why this direction matters
The current app captures and displays flags well. What it doesn't yet
do is help a real disabled user *decide* — "is this curb cut reliable
enough to bet my commute on?" The next phase makes the data
**decision-grade**: with discussion, context, and timely updates.
That's the difference between an interesting map and an indispensable
one.

### What success looks like (next 3–4 months)
- A user can open a flag, read 2–3 comments from other community
  members, see who verified it and when, and tap "Get directions" to
  hand the route to Apple/Google Maps.
- A user gets a push notification when a flag they watch flips status.
- The flag list works offline (cached) — critical for transit/dead
  zones.
- The web build is at near-parity with native, with web-specific
  affordances (right-click, deep-link URLs).
- The dataset crosses ~500 active flags with avg. 2.5 verifications
  each — meaningful signal.

---

## 2 — Feature Expansion Roadmap (prioritized)

20 features grouped into the three phases below. Complexity is rough
build effort: **L** = ~1 cycle (3–8 hr Shamus + QA), **M** = ~2–3
cycles, **H** = ~4+ cycles or needs special skill.

### Trust pillar
| # | Feature | Why | Complexity | Deps |
|---|---|---|---|---|
| T1 | Flag status history (audit trail) | "Who verified this and when?" — core trust signal | L | (none) |
| T2 | Threaded comments on flags | Discussion = context. "Is this always blocked or only Tuesdays?" | M | Schema (Dana) + RLS (Steve) |
| T3 | Multi-user verification threshold | A flag flips to "verified" only after N independent verifies (currently 1 user can flip) | L | (none — pure trigger logic) |
| T4 | Reporter reputation tier | Visible badge for high-quality reporters (10+ verified) — signals trust | L | (uses existing points data) |
| T5 | Inappropriate-content flagging | Community moderation for spam/harassment in comments | M | Depends on T2 |

### Context pillar
| # | Feature | Why | Complexity | Deps |
|---|---|---|---|---|
| C1 | Multiple photos per flag | One photo misses context. Before/after, multiple angles | M | Schema |
| C2 | Accessibility-specific tags | "wheelchair_only", "cane_user", "vision_impaired" tags layered on top of category | M | Schema |
| C3 | Status notes ("verifier reason") | "Verified — sidewalk has been re-poured" — short text on each status change | L | Builds on T1 |
| C4 | Time-of-day / weather tags | "Blocked at high tide", "Slippery when wet" — important for outdoor access | L | (uses string array on flag) |
| C5 | Linked flags ("see also") | "This curb cut is broken, but the one 50m east is fine" — pointer between flags | M | Schema (cross-ref table) |

### Reach pillar
| # | Feature | Why | Complexity | Deps |
|---|---|---|---|---|
| R1 | Push notifications (watched + nearby) | Real-time updates when a watched flag changes or a new flag appears near you | H | Expo notifications + edge function |
| R2 | "Get directions" handoff | Tap → open Apple/Google Maps with destination. No routing on our side — just hand-off | L | (uses existing Open-in-Maps pattern) |
| R3 | Offline cached flags | Last N flags + your watched/saved persist offline | M | Cache layer (peter) |
| R4 | Public web flag URLs | `accessmap.app/flag/<uuid>` — shareable, deep-linkable | M | Web routing + SSR-ish snippet |
| R5 | Heatmap / cluster view (map) | When zoomed out, show clusters not individual pins | M | (react-native-maps clustering + Leaflet plugin) |

### Foundations & polish
| # | Feature | Why | Complexity | Deps |
|---|---|---|---|---|
| F1 | Dark mode (system / light / dark) | Major UX request; helps low-vision users with light sensitivity | M | Theme refactor (Dani + Alex) |
| F2 | Onboarding flow (first-launch tutorial) | App has no first-launch experience. ~3 cards explaining: drop pins → verify → earn points | L | (none) |
| F3 | Settings screen consolidation | Currently settings are scattered across modals; one screen with sections | L | (none) |
| F4 | Filter presets / saved searches | "Show me unresolved wheelchair-blocking flags near me" — saved as a preset | L | AsyncStorage only |
| F5 | i18n (Spanish first, then 2–3 more) | Inclusivity. Disability is global; English-only excludes huge populations | H | i18next + content audit |

---

## 3 — Execution Sequencing

Three phases, each 4–6 cycles. Each cycle = one big-lift session
(6 parallel builds + QA + polish, ~30–60 min wall time).

### Phase 1 — Immediate wins (4 cycles, 2–3 weeks)
Goal: **ship 8–10 high-impact features that compound on existing patterns,
zero schema risk.**

- **Cycle A** — F2 Onboarding · F3 Settings consolidation · F4 Filter presets · R2 Get-directions handoff (4 features; all AsyncStorage / nav-only)
- **Cycle B** — T1 Status history (read-only audit trail) · T4 Reporter reputation tier · C4 Time-of-day tags · R5 Map clustering (4 features; existing schema or pure-client)
- **Cycle C** — F1 Dark mode (single big effort + 2 small polishes) — needs theme refactor; treat as cycle theme
- **Cycle D** — Phase-1 QA + polish sweep · merge train · ship to TestFlight beta

**Why this order:**
- Cycle A items are zero-risk (no schema, no perms) and unblock
  user-visible value immediately
- Cycle B introduces T1 + T4 which lay groundwork for Trust pillar
  without needing the comment system yet
- Cycle C (Dark mode) is a focused theme refactor — best done as
  its own cycle to avoid stomping parallel feature work
- Cycle D is consolidation + beta release

### Phase 2 — Core expansion (5 cycles, 4–6 weeks)
Goal: **ship the Trust + Context pillars meaningfully. Schema changes
land here.**

- **Cycle E** — T3 Multi-user verification threshold (trigger logic) · C3 Status notes (depends on T1 from Phase 1) · F5 i18n scaffolding (no content yet)
- **Cycle F** — T2 Threaded comments (THE big one — needs Dana + Steve + Shamus collaboration) — treat as cycle theme
- **Cycle G** — C1 Multi-photo per flag (schema change) · C2 Accessibility tags (schema change) — bundle the two schema changes into one migration
- **Cycle H** — T5 Content moderation (builds on T2) · C5 Linked flags (cross-ref table) · F5 i18n Spanish content pass
- **Cycle I** — Phase-2 QA sweep · migration audit · merge train · ship to TestFlight beta

### Phase 3 — Reach + polish (4 cycles, 3–4 weeks)
Goal: **get the app outside its current native silo.**

- **Cycle J** — R3 Offline cache layer (Peter heavy) · R4 Public web flag URLs scaffolding
- **Cycle K** — R1 Push notifications — THE big one; needs edge function (Dana) + permission flow (Jordan + Steve) + UI (Shamus + Alex)
- **Cycle L** — R4 Web flag pages content + SEO basics · accessibility audit on web (Alex heavy)
- **Cycle M** — Phase-3 QA + polish · production release prep · post-mortem

---

## 4 — Team Assignment Strategy

### Per-agent primary lanes

| Agent | Primary lane | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|---|
| **Shamus** (builder) | Feature vertical slices | 6–8 features | 4–6 features (incl. T2) | 4 features (incl. R1) |
| **Dana** (backend) | Schema, migrations, RLS files | Light | Heavy (T2, C1, C2, C5 migrations) | R1 edge function |
| **Steve** (security) | RLS review, auth/permission audit | Light | Heavy (review every Dana migration; T2 comment-flagging logic) | R1 notification opt-in audit |
| **Alex** (a11y) | WCAG audits, theme tokens | Heavy (F1 dark mode, F2 onboarding a11y) | Per-cycle a11y sweep | R4 web a11y push |
| **Gary** (QA / tests) | Test coverage, jest config, CI | Per-cycle pass | Per-cycle pass | Per-cycle pass + smoke harness |
| **Peter** (perf) | Render perf, query plans | Light (R5 clustering perf) | Light | Heavy (R3 offline + R5 cluster tuning) |
| **Dani** (design) | Visual consistency, theme | F1 dark mode palette | Comment thread UI specs | Web responsive specs |
| **Jordan** (privacy/legal) | Permission flows, PIPEDA | F2 first-launch privacy card | T2 comment retention policy | R1 push opt-in flow |
| **Will** (docs) | README, CLAUDE.md, LEARNINGS | Per-cycle | Per-cycle | User-facing help additions |
| **Casey** (community) | Contributor docs | After Phase 1 ship | Comment moderation guide | Beta tester onboarding |
| **Riley** (user research) | Persona validation | Validate F4 preset list with disabled users | Validate T2 thread UX | Validate R1 notification frequency |
| **Quinn** (PM/QA) | Cross-branch correctness review | Per-cycle | Per-cycle | Per-cycle |
| **Rory** (devops) | EAS Build, CI/CD | Set up CI for beta | TestFlight automation | Production release pipeline |

### Where parallel work is possible (single cycle)
- **6 disjoint Shamus feature builds** — proven pattern from this
  session. Worktree isolation, separate component + lib + test files.
- **3 read-only QA agents** running concurrently against the same
  branch set (Quinn correctness + Alex a11y + Gary tests).
- **Dana + Steve** on a migration can run in parallel with **Shamus**
  building the client side against the intended schema shape.

### Where coordination is REQUIRED (serial)
- **Theme refactor (F1)** must complete before any feature touching
  styles in the same cycle. Don't run F1 in parallel with feature
  builds that touch theme tokens.
- **Schema changes (C1, C2, C5)** must land their migration FILE
  before client features depend on them. Even though Sky applies the
  migration manually, the client code can target the intended shape.
  Bundle schema changes per cycle to minimize migration count.
- **i18n scaffolding (F5)** must precede any new user-facing strings.
  After F5 lands, every feature build must wrap strings in `t('key')`
  — needs to be enforced via Gary's lint pass.
- **Push notifications (R1)** — Jordan privacy review BEFORE Shamus
  starts the UI. Permission language is the privacy-sensitive bit.

---

## 5 — Risks + Constraints

### Technical risks
1. **Schema migration sprawl** — Phase 2 adds 4 schema changes (T2,
   C1, C2, C5). Each one needs a migration file, RLS rules, and
   typing in `src/types/database.ts`. Mitigation: bundle related
   changes; max 2 migrations per cycle; Steve reviews every one.
2. **Push notification reliability** (R1) — Expo notifications need
   APNs/FCM setup AND a server-side trigger AND device token
   management. High effort; many failure modes. Mitigation: treat
   as its own cycle; build server piece first; client UI second.
3. **Offline cache invalidation** (R3) — Classic hard problem.
   Mitigation: scope tightly — cache last N flags by timestamp,
   no write queue, no sync logic. Read-only offline.
4. **Web-native divergence** continues to bite (R8 Alert.alert,
   R11 Share regression — both caught this session). Mitigation:
   Gary should add a Playwright web smoke test in Phase 1.
5. **Comment system abuse vectors** (T2 + T5) — spam, harassment,
   PII leakage. Mitigation: T5 moderation MUST land in same cycle
   as T2; rate limiting via RLS; Steve audits.

### Over-engineering risks
1. **Threaded comments (T2)** wants to grow into a forum. Resist —
   AccessMap is a map first. Cap thread depth at 1 (no nested
   replies). No edit history. No mentions.
2. **Routing (originally considered)** would need OSRM or external
   API. Replaced with R2 (hand-off to Apple/Google Maps) — same
   user value, 10× less complexity.
3. **i18n** is a rabbit hole. Cap initial scope at Spanish only
   (next-largest accessibility-app user base). Other languages
   are Cycle L+ work, not Cycle E.
4. **Dark mode** (F1) tempts a theme system refactor. Resist a
   full design-system rebuild — extract existing hex literals to
   tokens, add a dark-mode object, switch via a context. ~200
   lines, not 2000.

### Duplication / conflict risk
1. **Settings screen consolidation (F3)** vs **dark mode toggle
   placement (F1)** — F1's toggle should live in F3. Schedule
   F3 first or have F1 add a placeholder + plan to relocate.
2. **Filter presets (F4)** vs **multi-user verification (T3)** —
   T3 might add a new flag status; if so, F4's preset definitions
   need to accommodate the new status. Land T3 first OR design F4's
   storage shape to be additive.
3. **Photo handling (C1) multi-photo** touches photo upload code
   that also touches Storage RLS — coordinate with Steve.
4. **60+ stale feature branches** are a perpetual conflict trap.
   Triage required before Phase 1 Cycle A starts.

---

## 6 — Next Actions (very important)

### What should be built FIRST (this week)
1. **Sky merges 9 parked branches** (R7–R15 from this session) —
   prerequisite for any new feature work to avoid further branch
   bloat. ~10 minutes with the recipe in
   `qa-reports/cycle-2026-05-24-v2.md`. Decide B1 (R9 location prompt)
   first.
2. **Sky applies migrations 1 + 2** (`supabase/realtime.sql` +
   `2026-05-23_feedback_table.sql`) — unblocks features already
   coded. ~5 min in Supabase dashboard.
3. **Cycle A kickoff** — Shamus builds 4 parallel features:
   F2 Onboarding · F3 Settings consolidation · F4 Filter presets ·
   R2 Get-directions handoff. ~45 min wall time. All zero-schema.

### Which agent starts IMMEDIATELY
- **Sky** (5 min): merge the 9 parked branches per the recipe
- **Sky** (5 min): apply 2 unblocking migrations
- **Shamus** ×4 (parallel, ~30 min each): start Cycle A's 4 features
  in isolated worktrees off the freshly-merged main
- **Quinn + Alex + Gary** (parallel, after Cycle A): QA pass on
  Cycle A's 4 branches
- **(Sky)** (5 min): merge Cycle A's branches per recipe

### What should be DEFERRED
- **F5 i18n** — defer to Cycle E (Phase 2). Don't add it to Phase 1
  cycles even as scaffolding — risk of churn while features are
  still solidifying.
- **R1 Push notifications** — defer to Cycle K. Too many moving
  parts for early phase. Build Trust/Context pillars first.
- **R3 Offline cache** — defer to Cycle J. Premature optimization
  until user count justifies it.
- **Routing on-platform** — deferred indefinitely. R2 hand-off
  delivers same user value at 10× less complexity.
- **60+ stale branch deletion** — defer to a quiet weekend window;
  not urgent.

### Suggested cycle cadence
- **2 cycles per week** is realistic (Tuesday + Saturday morning).
- 4 weeks = Phase 1 complete + TestFlight beta released.
- ~14 weeks total to Phase 3 production release.

---

## Where this plan lives
- **Master copy:** `/Users/skypie/AccessMap/qa-reports/expansion-plan-2026-05-24.md`
- **Companion copy:** `/Users/skypie/Documents/Claude/Agent Summarys /Access Map Summarys/2026-05-24_Expansion_Plan.md`
- **Email-ready text:** `/Users/skypie/AccessMap/qa-reports/expansion-plan-2026-05-24_email.txt`

## Open clarifying questions (none blocking — but flag if any matter)
- **Server side:** are we OK adding 1–2 Supabase edge functions
  (R1 push trigger, possibly R4 web SSR snippet)? Assumed yes.
- **External APIs:** R2 hands off to Apple/Google Maps via deep
  link — that's a URL, not an API integration. No new dep.
- **i18n scope:** Spanish first, then Mandarin + Arabic + Hindi?
  Or English/Spanish only? Cycle L is the decision point.
- **TestFlight beta cadence:** end of each phase, or continuous?

— Morgan, planning pass complete, 2026-05-24
