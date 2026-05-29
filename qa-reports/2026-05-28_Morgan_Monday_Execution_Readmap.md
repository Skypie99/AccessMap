# 🚀 MONDAY EXECUTION READMAP — AccessMap + Portfolio Merge Waves
**Date:** 2026-05-28 (preparation)  
**Execution:** 2026-06-02 (Monday)  
**Authority:** Morgan Standing Approval (orchestrated execution)  
**Timeline:** AccessMap 10am–11:30am | Portfolio 1pm–2pm  

---

## PHASE 0 — PRE-EXECUTION (Saturday EOD → Sunday Evening)

### Saturday EOD Verification (6pm)

**Dani — Design/A11y Verification (15 min)**
- [ ] All 9 AccessMap diverged branches rebased successfully
  - `git fetch origin main` → `git branch --no-merged main` confirms clean state
  - `npm run typecheck` PASSES on `design/auto-2026-05-26-linheight-token`
- [ ] All 8 Portfolio diverged branches rebased successfully
  - `git fetch origin main` → clean state
  - `npm run typecheck` PASSES on all UI branches

**Gary — Test Verification (15 min)**
- [ ] Run full test suite on both projects
  - AccessMap: `npm test -- --coverage` → all 54 tests PASS, coverage baseline captured
  - Portfolio: `npm test` → all tests PASS
  - Typecheck: `npm run typecheck` PASSES (zero errors)
- [ ] Lint: `npm run lint` PASSES (zero errors)
- [ ] Prettier: `npm run format` → no diffs (pre-commit hook satisfied)

**Shamus — Conflict/Merge Validation (10 min)**
- [ ] For each previously-diverged branch:
  - `git merge origin/main` (or rebase result if already done)
  - Confirm no merge conflicts in output (`CONFLICT` lines = BLOCKER, escalate immediately)
  - `npm test` PASSES (no regressions from merge)
  
**Morgan — Sign-Off Collection (10 min)**
- [ ] Collect async approvals from:
  - Gary: tests PASS, coverage captured
  - Dani: design layers (tokenization, consistency) validate
  - Alex: a11y parity matrix PASS (if required by tier)
  - Peter: perf baseline (if required by tier)
  - Rory: release branch ready
- [ ] Record in `qa-reports/2026-05-28_Morgan_ExecutionLog_Saturday.md`: all checks ✅ or BLOCKER ❌

### Sunday Evening Verification (6pm)

**Morgan — Final Gate (5 min)**
- [ ] Confirm no new commits to branches since Saturday 6pm (git log check)
- [ ] Verify all sign-offs from Saturday are still valid
- [ ] Confirm Monday 10am team availability (Shamus, Gary, Dani, Peter, Rory all ready)
- [ ] Issue **GREEN LIGHT** or **HOLD** in Slack + iMessage to Sky

---

## PHASE 1 — MONDAY PRE-FLIGHT (9:30am–10am)

### 9:30am Status Dashboard

**Morgan — 5-minute briefing** (read this on Monday morning):

| Component | Status | Count | Risk | Gate |
|---|---|---|---|---|
| **AccessMap branches** | Rebased ✅ | 18 total | LOW | Typecheck PASS |
| **Portfolio branches** | Rebased ✅ | 12 total | LOW | Typecheck PASS |
| **Test suite (AccessMap)** | PASS | 54 tests | ✅ | Coverage baseline ✅ |
| **Test suite (Portfolio)** | PASS | 40 tests | ✅ | All green ✅ |
| **Sign-offs collected** | ✅ | Gary, Dani, Alex, Peter | ✅ | All async ✅ |
| **Conflicts resolved** | ✅ | 17 branches clean | — | Merge ready |

**Go/No-Go Decision:**
- If any status = ❌ → HOLD + escalate to Sky via Morgan iMessage
- If all status = ✅ → GO. Start Phase 2 at 10am sharp

### 9:50am Slack Notification

Post to #engineering (if channel exists) or directly to Shamus/Rory:

> **MERGE WAVE GO.** AccessMap 10am–11:30am (18 branches, critical path ~45min). Portfolio 1pm–2pm (12 branches, critical path ~42min). All branches validated. Test suite PASS. Standing by.

---

## PHASE 2 — ACCESSMAP MERGE WAVE (10:00am–11:30am)

### **TIER 1 — Safety Foundation (10:00am–10:10am, parallel)**

**Target:** All test + fix branches merged cleanly.  
**Owner:** Gary (executes) + Morgan (gate)  

| Branch | Command | Expected | Timeout | Gate |
|---|---|---|---|---|
| `test/gary-wave2` | `git merge origin/test/gary-wave2` | FAST FORWARD or MERGE COMMIT | 2 min | Tests all PASS |
| `security/hardening` | `git merge origin/security/hardening` | FF or MC | 2 min | Typecheck PASS |
| `fix/sql-cleanup` | `git merge origin/fix/sql-cleanup` | FF or MC | 2 min | No data loss (dry-run confirm) |
| `design/token-update` | `git merge origin/design/token-update` | FF or MC | 2 min | Token Drift Detector PASS |
| `a11y/alex-wave2` | `git merge origin/a11y/alex-wave2` | FF or MC | 2 min | WCAG 2.2 AA confirm |

**Merge procedure (repeat for each):**
```bash
git fetch origin
git checkout main
git merge --no-ff origin/<branch> -m "Merge <branch> (Tier 1)"
# Expected: "Already up to date" (FF) or new merge commit (no conflicts)
npm test  # Confirm no regressions
git log --oneline -1  # Capture commit SHA
```

**Success criteria:** 5 branches merged, all tests PASS, coverage baseline stable.  
**Abort condition:** Any merge conflict OR test failure. Escalate to Gary + Morgan.  
**Rollback:** `git reset --hard HEAD~1` + re-push (if already pushed).

---

### **TIER 2 — Design Polish (10:10am–10:30am, parallel)**

**Target:** Design + perf branches merged.  
**Owner:** Dani + Peter (executes) + Morgan (gate)  
**Conditional gates:**
- `a11y-perf/wave3`: Requires Alex a11y parity PASS (Layer 2 Design Compiler)
- `ui/dani-warmth`: Requires Luxury UI Score ≥75 (Layer 5)

| Branch | Command | Expected | Gate | Condition |
|---|---|---|---|---|
| `design/creative-polish` | `git merge origin/design/creative-polish` | FF or MC | Tokenization PASS | None (pre-merged?) |
| `a11y-perf/wave3` | `git merge origin/a11y-perf/wave3` | FF or MC | A11y Parity PASS | Alex sign-off |
| `ui/dani-warmth` | `git merge origin/ui/dani-warmth` | FF or MC | Luxury UI ≥75 | Dani sign-off |

**Merge procedure:**
```bash
git merge --no-ff origin/<branch> -m "Merge <branch> (Tier 2)"
npm test
npm run typecheck
git log --oneline -1
```

**Success criteria:** 3 branches merged, no visual regressions, test suite PASS.  
**Conditional abort:** If gate condition not met (e.g., Dani scorecard <75 or Alex a11y FAIL), Morgan escalates: POLISH LOOP activation or BLOCK (see decision tree below).  
**Rollback:** `git reset --hard HEAD~1`.

---

### **TIER 3 — Feature Implementation (10:30am–11:05am, parallel with safety buffer)**

**Target:** All 6 feature branches merged.  
**Owner:** Shamus (executes) + Morgan (gate)  
**Conditional gates:**
- `feat/notify-flag-status`: Requires Rory notifications Edge Function LIVE (D2 applied)
- `feat/heat-map-severity`: Requires performance baseline PASS (Peter)
- `feat/shamus-category-quickfilter`: No gate (Gary sign-off sufficient)
- `feat/shamus-flag-deeplink-detail`: No gate
- `shamus/marker-clustering`: No gate (D1 already merged? verify)
- `feat/tasks-search`: No gate

| Branch | Command | Gate | Condition |
|---|---|---|---|
| `shamus/marker-clustering` | `git merge ...` | D1 DONE | Pre-merged? verify |
| `feat/shamus-flag-deeplink-detail` | `git merge ...` | Gary tests PASS | None |
| `feat/shamus-category-quickfilter` | `git merge ...` | Gary tests PASS | None |
| `feat/notify-flag-status` | `git merge ...` | Notifications LIVE | Rory Edge Function deployed |
| `feat/heat-map-severity` | `git merge ...` | Perf baseline PASS | Peter validation |
| `feat/tasks-search` | `git merge ...` | Gary tests PASS | None |

**Merge procedure (parallel, 2-min timeout each):**
```bash
# In parallel across 6 branches:
git merge --no-ff origin/<branch> -m "Merge <branch> (Tier 3)"
npm test
npm run typecheck
git log --oneline -1
```

**Success criteria:** 6 branches merged, no integration failures, feature smoke tests PASS.  
**Conditional abort:** If notifications not LIVE or perf baseline FAIL, escalate (see decision tree).  
**Rollback:** `git reset --hard HEAD~1` per branch.

---

### **TIER 4 — Release (11:05am–11:15am)**

**Target:** Release + changelog merged.  
**Owner:** Rory (executes) + Morgan (gate)  

| Branch | Command | Gate |
|---|---|---|
| `release/auto-2026-05-28` | `git merge origin/release/auto-2026-05-28` | All Tiers 1–3 PASS |

**Merge procedure:**
```bash
git merge --no-ff origin/release/auto-2026-05-28 -m "Release: Wave 3 + Phase 1 integration"
npm test
npm run typecheck
git log --oneline -1
```

**Success criteria:** Release branch merged, version bumped, changelog updated.  
**Rollback:** `git reset --hard HEAD~1`.

---

### **Post-Merge Validation (11:15am–11:30am)**

**Gary — Full test suite + coverage capture (10 min)**
```bash
npm test -- --coverage
# Expected: all 54 tests PASS, coverage report generated
npm run typecheck  # zero errors
npm run lint       # zero errors
```

**Output:** `qa-reports/2026-05-28_Morgan_AccessMap_MergeWave_Complete.md`
- Timestamp of final merge
- List of 18 branches merged (count + SHA)
- Test results: ✅ all PASS, coverage baseline updated
- Deployment status: READY FOR STAGING

**Morgan — Merge Wave Completion Report (2 min)**
- [ ] Post to Slack: "AccessMap merge wave COMPLETE (18 branches, 11:30am). Tests PASS. Proceeding to Portfolio."
- [ ] Update `PROJECT_STATE.md` in AccessMap repo: merge wave timestamp, version, next phase

---

## PHASE 3 — PORTFOLIO MERGE WAVE (1:00pm–2:00pm)

### **Identical structure, smaller scope (12 branches, ~42 min critical path)**

**TIER 1 (1:00pm–1:10pm):** Tests + fixes (4 branches)
- `test/auto-2026-05-25-gary-portfolio-tests`
- `test/gary-static-integrity`
- `fix/auto-2026-05-25-wave2`
- `fix/auto-2026-05-25-wave5-final`

**Merge procedure:** Same as AccessMap Tier 1.

**TIER 2 (1:10pm–1:25pm):** Content + assets (4 branches)
- `assets/auto-2026-05-25-project-images`
- `content/auto-2026-05-25-links-and-copy`
- `docs/auto-2026-05-25-will-merge-guide`
- (design/portfolio-creative-polish already merged Saturday)

**Merge procedure:** Same as AccessMap Tier 2 (no conditional gates for Portfolio).

**TIER 3 (1:25pm–1:50pm):** Features + UI (5 branches)
- `feat/portfolio-wave4` (already merged Phase 1 cascade? verify)
- `perf/auto-2026-05-28-peter` (Peter sign-off required)
- `ui/auto-2026-05-25-dani-warmth`
- `ui/auto-2026-05-25-homepage-polish`
- `ui/auto-2026-05-25-shamus-card-upgrade`

**Merge procedure:** Same as AccessMap Tier 3.

**Post-merge validation (1:50pm–2:00pm):**
```bash
npm test
npm run typecheck
npm run lint
# Expected: all PASS, 40 tests ✅
```

---

## DECISION TREES & CONTINGENCIES

### **Scenario A: Branch Merge Conflict (Low probability, ~5%)**

**If:** `git merge` output contains `CONFLICT`

**Then:**
1. Abort merge: `git merge --abort`
2. Contact branch owner + Shamus (Gary if test branch, Dani if design)
3. Identify specific file(s) with conflict
4. **Option 1 (if resolvable in <5 min):** Resolve conflict + retry merge
5. **Option 2 (if >5 min):** DEFER branch to next wave; update merge sequence
6. **Option 3 (if unresolvable):** Escalate to Morgan → Sky decision

**Escalation template:**
> Merge conflict in `<branch>`: `<file>:<line-numbers>`. Root cause: `<description>`. Ownership: `<role>`. Recommended: defer to next wave vs. escalate to branch owner for immediate resolution.

---

### **Scenario B: Test Failure Post-Merge (Medium probability, ~15%)**

**If:** `npm test` fails on merged branch

**Then:**
1. Identify failing test(s): `npm test -- --verbose`
2. Revert branch: `git reset --hard HEAD~1`
3. Contact test owner (Gary) + branch owner
4. **Option 1 (if regression from merge):** Reapply merge + fix test → retry
5. **Option 2 (if pre-existing test gap):** Defer branch, investigate post-wave
6. **Option 3 (if data/schema issue):** Escalate to Dana (schema) or Steve (RLS)

**Escalation template:**
> Test failure post-merge of `<branch>`: `<test name>`. Reverted. Ownership: `<role>`. Cause: `<description>`. Recommend: `<fix or defer>`.

---

### **Scenario C: Conditional Gate Not Met (Medium probability, ~20% per gate)**

**If:** Gate condition fails before merge (e.g., Dani Luxury UI Score <75, Alex a11y FAIL, Rory notifications not LIVE)

**Then:**
1. **For Luxury UI Score <75 (Dani, non-structural):**
   - Activate Design Polish Loop (Morgan dispatches Dani Phase 1)
   - Defer branch to next wave (don't merge yet)
   - Target: 2h max, Saturday afternoon completion

2. **For A11y Parity FAIL (Alex):**
   - BLOCK merge immediately (a11y is a pillar, Const. Art. 7.5)
   - Route to Alex + Dani for design-system fix or escalation
   - Cannot merge without PASS

3. **For Notifications not LIVE (Rory):**
   - Defer `feat/notify-flag-status` to next wave
   - Merge all other Tier 3 branches
   - Rory completes Edge Function deploy post-merge, re-merge `feat/notify-flag-status` Mon evening

4. **For Performance baseline FAIL (Peter):**
   - Conditional: defer `feat/heat-map-severity` if impact >10% regression
   - Otherwise merge with notation: "post-merge optimization target"

---

### **Scenario D: Critical Blocker Discovered (Low probability, ~3%)**

**If:** A blocker emerges that prevents entire wave (e.g., main branch corrupted, database schema out of sync, security vulnerability in merged branch)

**Then:**
1. **STOP immediately.** Do not continue merging.
2. Escalate to Morgan → Sky via iMessage (urgent)
3. Capture state: `git log --oneline -20`, `npm test` output, error detail
4. Propose rollback: `git reset --hard <last-clean-SHA>`
5. Post-mortem: schedule 30-min call to understand root cause

---

## REAL-TIME STATUS TEMPLATE

**Create and update during execution:**

```markdown
# AccessMap Merge Wave — Real-Time Status
**Started:** 10:00am  
**Current Time:** [HH:mm]  

## Tier 1 (10:00–10:10)
- [ ] test/gary-wave2 — [PENDING | MERGING | PASS | FAIL]
- [ ] security/hardening — [PENDING | ✅ DONE | FAIL]
- [ ] fix/sql-cleanup — [PENDING | ✅ DONE | FAIL]
- [ ] design/token-update — [PENDING | ✅ DONE | FAIL]
- [ ] a11y/alex-wave2 — [PENDING | ✅ DONE | FAIL]

**Tier 1 Status:** [ON TRACK 10:10] | [BEHIND 15 MIN] | [CRITICAL BLOCKER]

## Tier 2 (10:10–10:30)
[... repeat ...]

## Tier 3 (10:30–11:05)
[... repeat ...]

## Tier 4 (11:05–11:15)
[... repeat ...]

## Post-Merge Validation (11:15–11:30)
- [ ] Tests PASS: `npm test` [PENDING | ✅ DONE | FAIL]
- [ ] Typecheck PASS: `npm run typecheck` [PENDING | ✅ DONE | FAIL]
- [ ] Lint PASS: `npm run lint` [PENDING | ✅ DONE | FAIL]

**Final Status:** [COMPLETE 11:30am] | [DELAYED, ETA HH:mm] | [FAILED, ROLLBACK HH:mm]

**Deferred Branches:** (if any)
- [branch name]: [reason], [planned re-merge: day/time]

**Sign-off:** Morgan (timestamp + notes)
```

---

## ABORT & ROLLBACK PROCEDURES

### **Complete Wave Rollback (Nuclear Option)**

**If:** Merge wave is catastrophically broken (multiple branch failures, data corruption, security issue), escalate to Sky and execute:

```bash
# 1. Identify last-clean commit
git log --oneline | grep -i "before wave\|pre-merge" | head -1

# 2. Reset to last-clean state
git reset --hard <SHA>

# 3. Verify state
npm test
npm run typecheck

# 4. Force-push to origin (if needed)
# ⚠️ ONLY WITH SKY APPROVAL
# git push origin main --force-with-lease
```

**Escalation to Sky:**
> Wave rollback executed due to `<reason>`. Reverted to SHA `<last-clean>`. Current tests: `<status>`. Recommend: `<recovery path>` (retry wave on different date, skip wave and deploy separately, etc.).

---

## SUCCESS CRITERIA

**AccessMap wave complete when:**
- ✅ All 18 branches merged to main
- ✅ `npm test` all PASS (54 tests)
- ✅ `npm run typecheck` PASS (zero errors)
- ✅ `npm run lint` PASS (zero errors)
- ✅ Coverage baseline captured in `qa-reports/`
- ✅ No merge conflicts in any branch
- ✅ Completed by 11:30am (buffer: +15 min if needed)

**Portfolio wave complete when:**
- ✅ All 12 branches merged to main
- ✅ `npm test` all PASS (40 tests)
- ✅ `npm run typecheck` PASS (zero errors)
- ✅ `npm run lint` PASS (zero errors)
- ✅ Completed by 2:00pm (buffer: +15 min if needed)

---

## POST-WAVE VERIFICATION (2:00pm–2:15pm)

**Gary — Staging Deployment Readiness (5 min)**
- [ ] Both projects build successfully: `npm run build` PASS
- [ ] TypeScript production mode check
- [ ] No unhandled console errors or warnings

**Morgan — Final Gate & Communication (5 min)**
- [ ] Update `PROJECT_STATE.md` with wave completion timestamp + version
- [ ] Post to Slack: "MERGE WAVES COMPLETE. AccessMap 18/18 ✅ | Portfolio 12/12 ✅. Deployed to staging. Awaiting Sky sign-off for production."
- [ ] iMessage Sky: "Monday merge waves successful. Both projects ready for staging validation."

---

## CONTINGENCY: Friday Audit Synthesis Slips

**If** Friday audit synthesis runs late (past 6pm) and Saturday rebase is at risk:

**Decision point (Friday 6:30pm):**
- If synthesis missing: defer rebase to Sunday evening (move Monday start to 11am, add 1h buffer)
- If synthesis shows critical issue: escalate to Sky Friday evening for emergency call Saturday morning
- If synthesis shows polish loop needed: activate loop Saturday 10am-12pm, keep Monday start at 10am (tight but feasible)

---

## CONTINGENCY: Saturday Rebase Fails

**If** Saturday rebase uncovers major conflicts (>3 branches with non-trivial conflicts):

**Decision point (Saturday 3pm):**
- Morgan conference call with Git owners (Shamus, Dani, Gary)
- Option A: Rebase conflicts → manual resolution + test on each branch (2h extra, finish Sat 8pm)
- Option B: Defer conflicted branches to next wave (skip 2–3 branches, compress Mon schedule to 9am-11:30am)
- Option C: Escalate to Sky for architectural guidance (conflict root cause)

**Escalation to Sky:**
> Saturday rebase blockers: `<branches>` have non-trivial conflicts. Root cause: `<description>`. Recommend: `<option>`. Time impact: `<hours>`. Can execute Monday start on time? `<yes/no>`.

---

**Report:** qa-reports/2026-05-28_Morgan_Monday_Execution_Readmap.md  
**Authority:** Morgan Standing Approval  
**Status:** READY FOR SATURDAY EXECUTION.

