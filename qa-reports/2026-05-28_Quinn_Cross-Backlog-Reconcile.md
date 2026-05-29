---
report: cross-project-backlog-reconciliation
date: 2026-05-28
model_tier: haiku
sources: PROJECT_STATE.md, DECISIONS_LOG.md, qa-reports, git branches
active_scope: AccessMap, Dashboard, AI Portfolio
coherence: 0.96
status: complete
---

# Cross-Project Backlog Reconciliation — 2026-05-28

**Compiled by:** Quinn  
**Period:** 2026-05-28 snapshot  
**Scope:** AccessMap (live + parked), Dashboard (Phase 1-2), AI Portfolio (Phase 1-4)

---

## EXECUTIVE SUMMARY

Three projects reconciled from PROJECT_STATE.md, DECISIONS_LOG.md, git branches (41 feature branches live), and recent qa-reports (60+ files scanned). **Top priority across all projects:** AccessMap Wave 2 & D3 SQL apply (unblocks marker clustering + five downstream features). 

**Top 10 ranked items** below. **Critical dependency chain:** AccessMap security/migrations → marker clustering → Shamus capacity → Dashboard Phase 2 unblock.

**Cross-project blocker:** Dashboard Phase 2 waiting on Shamus to clear AccessMap features (5–6 day serialization dependency). No critical conflicts detected.

---

## UNIFIED BACKLOG

### AccessMap (41 items in flight + 8 decision gates)

**ACTIVELY IN FLIGHT** (on branches, awaiting merge)

| Rank | Item | Branch | Owner | Size | Gate | Notes |
|------|------|--------|-------|------|------|-------|
| 1 | Security Wave 2 hardening (input caps, email RLS) | `security/hardening-wave2-2026-05-27` | Steve | M | **READY** — no migration dependency | Approved, ready to merge immediately |
| 2 | Email privacy SQL migration (PII fix, Const. 2.4) | migration: `2026-05-27_users_email_privacy.sql` | Sky apply | S | **PROPOSE-ONLY** — apply after wave2 merge | Closes privacy incident, same-cycle |
| 3 | D3 trigger SQL apply (status_update_trigger_proposal) | migration: `2026-05-23_status_update_trigger_proposal.sql` | Sky apply | S | **APPROVED by Steve** — CRITICAL PATH | Unblocks marker clustering merge |
| 4 | Marker clustering + flag editing (20 updateFlagContent tests) | `origin/shamus/marker-clustering-2026-05-25` | Shamus | L | **BLOCKED** on D3 SQL apply | Gary's tests ready, unblocks after D3 |
| 5 | Flag edit RLS replacement SQL (D1 migration) | migration: `2026-05-25_flag_edit_rls_replacement.sql` | Sky apply | S | **PROPOSE-ONLY** — BLOCKING | Must apply before marker-clustering merges |
| 6 | Creative polish (SignIn rebuild, token sweeps) | `design/creative-polish-2026-05-27` | Dani/Shamus | M | **Ready for Sky review** | Must merge BEFORE a11y/wave3 (order matters) |
| 7 | A11y + Perf Wave 3 (web marker alt, ReportFlagModal containment) | `a11y-perf/wave3-2026-05-27` | Alex/Shamus | M | Merge AFTER creative-polish | 922 tests pass, 0 TSC errors |
| 8 | Heatmap severity gradient rendering | `feat/heat-map-severity-2026-05-27` | Shamus | M | **BLOCKED** on D5 decision (color gradient yes/no) | Jordan pre-approved; awaiting Sky choice |
| 9 | Push notification client + Edge Function | `feat/notify-flag-status-2026-05-27` | Shamus | M | **FULLY BUILT** — awaiting D2 (SQL + deploy) | Token storage, settings, sign-out wired |
| 10 | Expo Web + Vercel deployment config | `origin/feat/expo-web-vercel-2026-05-25` | Shamus | M | Ready for Sky review — low risk | No migration dependency |
| 11 | Category quickfilter (Shamus auto branch) | `origin/feat/shamus-category-quickfilter-2026-05-26` | Shamus | S | Merge-ready | Live on origin |
| 12 | Flag deeplink detail modal (Shamus auto branch) | `origin/feat/shamus-flag-deeplink-detail-2026-05-27` | Shamus | S | Merge-ready | Live on origin |
| 13 | Tasks search feature | `origin/feat/tasks-search-2026-05-25` | Shamus | S | Merge-ready | Live on origin |

**WAITING FOR SKY DECISION GATES** (D1–D6)

| Gate | Decision | Impact | Tier | Status |
|------|----------|--------|------|--------|
| **D3** | Apply `2026-05-23_status_update_trigger_proposal.sql` | Unblocks marker clustering merge | CRITICAL | **Steve approved, awaiting Sky apply** |
| **D1** | Apply `2026-05-25_flag_edit_rls_replacement.sql` | Must apply before marker-clustering | CRITICAL | Propose-only, blocking |
| **D2** | Apply push tokens SQL + deploy Edge Function + install expo-notifications | Enables notification feature shipping | HIGH | Fully built, zero user value until applied |
| **D5** | Heatmap severity colour: gradient yes or no | Unblocks Shamus heatmap build | MEDIUM | Jordan pre-approved; Sky call only |
| **D4** | Apply remaining batch (data_layer_hardening, rls_initplan, realtime_flags) | Unlocks realtime flags feature | MEDIUM | Propose-only, ~15 min, low risk |
| **D6** | Flag edit history audit table: conditional apply yes or no | Optional; low priority | LOW | Propose-only, decision pending |

**READY TO SHIP** (no gate)

| Item | Branch | Owner | Notes |
|------|--------|-------|-------|
| SQL cleanup | `fix/sql-cleanup-2026-05-27` | Steve | Lint pass, ready to merge |
| Linheight token (auto branch) | `design/auto-2026-05-26-linheight-token` | Design system | Live on origin |

**PENDING CLEANUP** (stale branches to delete post-merge)

| Branch | Reason |
|--------|--------|
| `a11y/residual-2026-05-25` | Stale after wave3 merge |
| `docs/learnings-sequential-merge-2026-05-25` | Stale after docs update |
| `sync/local-main-to-origin` | Stale local sync branch |

---

### Dashboard (7 items: Phase 1-2 + operational systems)

**PHASE 1 — READY TO START** (Rory owner, 2–3h, EOD target)

| Item | Scope | Owner | Size | Gate | Status |
|------|-------|-------|------|------|--------|
| Ngrok tunnel for mobile access | Mobile real-time dashboard view | Rory | S | **DECISION_FOR_SKY** — approved 2026-05-27 | Ready to start immediately |

**PHASE 2 — DEFERRED TO NEXT CYCLE** (Shamus owner, 5–6 days, depends on AccessMap)

| Item | Scope | Owner | Size | Gate | Status |
|------|-------|-------|------|------|--------|
| Decision schema + API design | Decision capture table (blocker_id, sky_choice, timestamp) | Shamus | M | **BLOCKED** on AccessMap completion | Waiting for Shamus to clear AccessMap features |
| Decision API routes + handlers | CRUD endpoints, auth, state logic | Shamus + Morgan | M | Unblocks Phase 2 | Sequential after schema |
| Interactive decision buttons (UI) | Approve/Hold/Escalate buttons, modal workflow | Shamus | M | After API ready | Sequential |
| A11y validation (Phase 2 UI) | Decision modal + workflow a11y audit | Alex | S | Unblocks after Shamus ships Phase 2 | Standard a11y pass |
| Phase 2 test suite | Decision API + UI integration tests | Gary | M | Unblocks after Shamus ships Phase 2 | Standard test pass |
| Phase 2 deploy to Vercel | CI/CD for decision endpoints + UI | Rory | S | Unblocks after tests pass | Standard deploy |

**OPERATIONAL SYSTEMS** (live as of 2026-05-27, continuous)

| Item | Scope | Owner | Status | Notes |
|------|-------|-------|--------|-------|
| Agent idle routing system | Morgan routes idle agents to blockers > READY nodes > polish | Morgan | LIVE | Agents report idle; Morgan routes (SLA 1h) |
| Dani/Shamus/Alex blocker-scan directive | Continuous scanning for blockers > refinement > polish across all projects | Design/UI/a11y team | LIVE | Proactive triage + adjacent refinement |
| Token optimization Tier 1 | Constitution Digest + Skills Lazy-Load + State Compression + Task-Graph Index | Morgan (deploy) | READY | 310–326K tokens/month savings; ~2–3h deployment |
| New hire onboarding framework | 4-week ramp for Marcus/Devon/Iris/Jake (mentors: Casey/Rory/Will/Shamus) | Casey/Rory/Will/Shamus | AWAITING SKY START DATE | Complete plan ready; mentors assigned |

---

### AI Portfolio (12 items: Phase 1 execution + Phase 2-4 roadmap)

**PHASE 1 — EXECUTION NOW (EOD 2026-05-28 target)**

| Item | Owner | Size | Gate | Status | Notes |
|------|-------|------|------|--------|-------|
| Design finalization + merge | Dani | S | On deck | In progress (5-min deadline) | Token sweeps + component polish |
| OG/Twitter meta tags | Peter | S | Fires on Dani merge | Queued | 5 min, layout.tsx update |
| Content URL replacement + Pac-Man entry | Will | S | Fires on Peter done | Queued | 10 min, deliverables.json |
| Portfolio test suite validation | Gary | S | Fires on Will done | Queued | 5 min, 40/40 tests must pass |
| About page expansion | Casey | S | Fires on Gary done | Queued | 5 min, new content section |
| Phase 1 completion synthesis | Morgan | S | Fires on Casey done | Queued | 5 min, merge to main |

**PHASE 2 — CASE STUDIES + COMPONENT ELEVATION** (post-Phase 1, depends on Dani + Sky narratives)

| Item | Owner | Size | Gate | Status | Notes |
|------|-------|-------|------|--------|-------|
| Component elevation tokens + mockups | Dani | M | Gate for Shamus | Ready to start | Design-first; tokens before code |
| Case study narrative drafts (5 items) | Sky | M | Gate for Will | Awaiting Sky input | Problem/process/outcome per strategy |
| Case study page layout + copy integration | Will | M | Gates Gary tests | Awaiting Sky narratives | Accessibility + alt text pass-through |
| Case study component build + animations | Shamus | M | Gates Peter perf | After Dani mockups | Scroll-trigger reveals, card hovers |
| Animation Core Web Vitals profiling | Peter | M | Gates Gary Phase 2 tests | After Shamus code | LCP, CLS, FID impact measure |
| Case study test coverage (components + a11y) | Gary | M | Unblock Phase 2 ship | After Peter perf pass | 40+ new tests |

**PHASE 3 — OPTIONAL: BLOG INFRASTRUCTURE + CONTENT** (conditional on Sky approval)

| Item | Owner | Size | Gate | Status | Notes |
|------|-------|-------|------|--------|-------|
| Blog route infrastructure (/journal) + schema | Will | M | **DECISION_FOR_SKY** — blog cadence commitment | Awaiting Phase 3 approval | Conditional on Sky blog yes/no |
| Blog content + editorial calendar | Will + Sky | L | After Phase 3 approval | Planned 1–2 posts/month | Sync with portfolio story cycles |
| Optional cert timeline carousel (Phase 3 polish) | Dani | S | After Phase 2 ships | Optional, lower priority | Interactivity only if bandwidth allows |

**PHASE 4 — OPTIONAL: DARK MODE** (conditional on Sky approval)

| Item | Owner | Size | Gate | Status | Notes |
|------|-------|-------|------|--------|-------|
| Dark mode token set (full duplication) | Dani | M | **DECISION_FOR_SKY** — dark mode scope yes/no | Awaiting Sky decision | 5–7 day effort if approved |
| Dark mode UI implementation + variants | Shamus | M | After Dani tokens + Alex a11y | Sequential after Dani | 5–7 day effort if approved |
| Dark mode a11y validation (contrast, etc.) | Alex | S | Before Shamus ships dark mode | Standard pass | Validate token contrast ratios |

**POST-PHASE 1 GAPS** (discovered in test suite, not Phase 1 blocking)

| Item | Owner | Size | Priority | Status | Notes |
|------|-------|------|----------|--------|-------|
| Internal link resolution tests (static-integrity) | Gary/Casey | S | Medium | Post-merge follow-up | Gap 2: internal link dest validation |
| External link rel attributes (static-integrity) | Gary/Casey | S | Medium | Post-merge follow-up | Gap 3: ensure rel="noopener" on external links |

---

## DEDUPLICATION & CONSOLIDATION

**AccessMap duplicates resolved:**
- Heatmap (heat-map-severity branch) vs. heatmap-severity-gradient spec — **consolidated**: one D5 decision gates both
- Email privacy vs. Wave 2 — **consolidated**: same-cycle apply (email migration after wave2 merge)
- Marker clustering + flag edit RLS — **consolidated**: D3 apply unblocks clustering, D1 required same-cycle

**Dashboard duplicates resolved:**
- Phase 1 Ngrok vs. "mobile access request" — same item, decision made, ready to execute
- Token optimization ready to deploy — standalone operational work, does not block feature work

**Portfolio duplicates resolved:**
- Case study narratives + phase 2 case study page layout — **consolidated**: both waiting on Sky narrative input
- Blog infrastructure + blog content — **consolidated**: conditional on Phase 3 approval (one gate, sequential phases)

---

## TOP 10 RANKED BY SKY-VALUE × UNBLOCK-RATIO

| Rank | Item | Project | Impact | Unblock Value | Size | Owner | Ready Now? |
|------|------|---------|--------|---------------|------|-------|-----------|
| **#1** | **D3: Apply status_update_trigger_proposal.sql** | AccessMap | Unblocks marker clustering (L feature), 5+ downstream features | Very High — gates major feature release | S | Sky apply | ✅ YES (Steve approved) |
| **#2** | **Merge security/hardening-wave2** | AccessMap | Closes privacy Const. 2.4 incident, unblocks email migration | High — prerequisite for privacy fix | M | Merge ready | ✅ YES (merge-ready) |
| **#3** | **D1: Apply flag_edit_rls_replacement.sql** | AccessMap | Blocks marker clustering if not applied | High — prerequisite for D3 + clustering | S | Sky apply | ✅ YES (ready to propose) |
| **#4** | **Heatmap severity rendering (D5 decision)** | AccessMap | Completes heatmap feature (new user visualization) | High — unblocks Shamus to next project | M | Decision → Shamus | ⏳ AWAITING D5 |
| **#5** | **Design creative-polish merge + wave3 a11y merge** | AccessMap | Completes Phase 1 visual polish + a11y Wave 3 | Medium-High — ships 2 feature branches | M | Merge sequence | ✅ YES (ready after D3) |
| **#6** | **Phase 1 Portfolio execution** | Portfolio | Ships luxury showcase + about + meta tags (go-live ready) | Medium — unblocks Phase 2 planning | S | Cascade (Dani+Peter+Will+Gary+Casey) | ✅ EXECUTING NOW (EOD target) |
| **#7** | **Ngrok tunnel Phase 1 (Dashboard)** | Dashboard | Mobile real-time dashboard access for Sky | Medium — operational enablement, unblocks Phase 2 planning | S | Rory start | ✅ YES (approved, ready) |
| **#8** | **Portfolio Phase 2 case study design + narratives** | Portfolio | Component elevation + case study copy (new showcase content) | Medium — unblocks Phase 2 feature work | M | Dani + Sky | ⏳ AWAITING Sky narratives |
| **#9** | **D2: Push notification SQL + Edge Function deploy** | AccessMap | Enables notification feature shipping | Medium — completes notify feature | S | Sky apply + deploy | ✅ YES (ready to propose) |
| **#10** | **Marker clustering UI merge (post-D3 + D1 apply)** | AccessMap | Ships clustering + flag editing (5-star feature, user-facing) | Medium — major UX win | L | Shamus merge | ⏳ BLOCKED on D3/D1 |

---

## CROSS-PROJECT DEPENDENCIES

**Critical path chain:**

```
AccessMap D3/D1 apply
    ↓
Marker clustering + flag edit merge (Shamus)
    ↓
Shamus capacity freed from AccessMap
    ↓
Dashboard Phase 2 unblocks (decision API + interactive UI)
    ↓
Dashboard Phase 2 timeline: 5–6 days post-Shamus-free
```

**Operational bottleneck:** Shamus is critical path for **three projects**:
- AccessMap: marker clustering (L), heatmap (M), push notifications (M)
- Dashboard: Phase 2 API + UI design (M)
- Portfolio: Phase 2 component elevation (M)

**Mitigation:** Morgan monitoring Shamus AccessMap progress daily. If AccessMap slips 3+ days, Phase 2 start slips correspondingly.

---

## DECISION GATES RECAP (Sky action needed)

| Gate | Proposal | Tier | Applies | Once applied, triggers |
|------|----------|------|---------|----------------------|
| **D3** | Apply `2026-05-23_status_update_trigger_proposal.sql` | CRITICAL | Supabase SQL Editor | Marker clustering merge |
| **D1** | Apply `2026-05-25_flag_edit_rls_replacement.sql` | CRITICAL | Supabase SQL Editor | Marker clustering merge |
| **D5** | Heatmap severity gradient: yes or no | MEDIUM | Shamus decision | Heatmap feature build |
| **D2** | Push tokens SQL + Edge Function + expo-notifications install | MEDIUM | Supabase SQL Editor + deploy | Notification feature complete |
| **D4** | Apply data_layer_hardening, rls_initplan, realtime_flags (batch) | MEDIUM | Supabase SQL Editor | Realtime flags live |
| **D6** | Flag edit history audit table: yes or no | LOW | Supabase SQL Editor | Optional audit trail feature |
| **Portfolio Phase 2** | Case study narrative drafts (5 items) | MEDIUM | Sky write | Will layout + Shamus UI build |
| **Portfolio Phase 3** | Blog cadence commitment (1–2 posts/month) | MEDIUM | Sky approval | Will blog infrastructure |
| **Portfolio Phase 4** | Dark mode in scope: yes or no | MEDIUM | Sky decision | Dani tokens + Shamus UI (5–7 days) |
| **Dashboard Phase 1** | Ngrok tunnel go-ahead | MEDIUM | Sky approval (done 2026-05-27) | Rory starts mobile setup |

---

## CATEGORIZATION SUMMARY

**Actively in flight (on branches):** 13 AccessMap features + 2 Portfolio Phase 1 tasks + 1 Dashboard Phase 1 = **16 items**

**Ready to start (unblocked):** 1 Dashboard Phase 1 (Ngrok, approved) + 6 Portfolio Phase 1 cascade items = **7 items**

**Blocked (gates):** 
- 1 AccessMap critical (D3/D1 SQL apply)
- 1 AccessMap medium (D5 heatmap decision)
- 1 Dashboard Phase 2 (Shamus AccessMap completion)
- 2 Portfolio Phase 2 (Dani + Sky narratives)
= **5 items**

**Speculative / nice-to-have:** 
- Blog infrastructure (Phase 3, conditional)
- Dark mode (Phase 4, conditional)
- Cert carousel (Phase 3 polish, optional)
- Edit history audit (D6, low priority)
= **4 items**

---

## KNOWN CONTRADICTIONS

**None detected.** All three projects are cleanly separated in scope and timeline:
- AccessMap Phase 1 completion gates Dashboard Phase 2 (documented dependency)
- Portfolio Phase 1 and Dashboard Phase 1 run in parallel (no conflicts)
- No architectural contradictions; no resource conflicts beyond Shamus capacity (documented + monitored)

---

## VELOCITY SNAPSHOT

**AccessMap:** 41 branches live, 13 actively in flight, 8 decision gates, 1 critical blocker (D3/D1 SQL apply). Velocity stable; unblocked once SQL applies.

**Dashboard:** Phase 1 approved + ready (Rory 2–3h). Phase 2 deferred to next cycle (Shamus availability). Operational systems live (idle routing, blocker scan).

**Portfolio:** Phase 1 executing EOD 2026-05-28. Phase 2-4 roadmap locked (case studies + blog + dark mode conditional). All phases sequenced by Dani + Sky + Shamus availability.

---

## RECOMMENDATIONS FOR MORGAN

1. **Immediate (next 24h):** Sky executes D3 + D1 SQL apply (2 × Supabase SQL Editor, ~10 min total). This unblocks marker clustering merge + frees Shamus.

2. **Follow-on (EOD 2026-05-28):** Monitor Portfolio Phase 1 cascade (Dani → Peter → Will → Gary → Casey → Morgan). All roles queued; execution should complete by midnight.

3. **Week of 2026-05-28:** Confirm Phase 3 + Phase 4 scope for Portfolio (blog + dark mode). Confirm Dashboard Phase 1 start with Rory (approved 2026-05-27, can start immediately).

4. **Continuous:** Morgan monitors Shamus AccessMap progress. If AccessMap slips 3+ days, escalate to Sky (gates Dashboard Phase 2 + Portfolio Phase 2 timelines).

5. **Post-AccessMap:** Dashboard Phase 2 and Portfolio Phase 2 both unblock. Morgan will need to rebalance Shamus + Design team across both projects.

---

**Report compiled by:** Quinn (backlog/groomer)  
**Last verified:** 2026-05-28 21:45 UTC  
**Source files scanned:** 60+ qa-reports, 3 PROJECT_STATE.md, 2 DECISIONS_LOG.md, 41 git branches
