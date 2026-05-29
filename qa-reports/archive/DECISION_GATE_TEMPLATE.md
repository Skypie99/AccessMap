# Decision Gate Template
**Use this for D1–D8 decisions. Fill one page, Sky approves in 5 min.**

---

## Gate: `D[N]` — [Decision Name]

**Status:** PENDING / READY FOR SKY / APPROVED / APPLIED  
**Timestamp (Sky approval):** YYYY-MM-DD HH:MM UTC  
**Timestamp (Applied):** YYYY-MM-DD HH:MM UTC  

---

## What It Unblocks

**Features:** [list features by branch name]  
**Count:** X features  
**Estimated impact:** Y days of merged work, Z tests unlocked, ...  

**Example:**
```
Features: origin/shamus/marker-clustering-2026-05-25
Count: 3 features (marker clustering, flag editing, Gary tests)
Estimated impact: 6 days of merged work, 150 tests, enables Dani's polish phase
```

---

## Prerequisites

**Must be done first:**
- [ ] Item A (done by whom? date?)
- [ ] Item B
- [ ] None

**Example:**
```
- [ ] Shamus completes flag-edit UI code review (in progress, ETA 2026-05-28)
- [ ] Gary writes 20 updateFlagContent tests (done, commit 7f3c91)
- [ ] Alex runs a11y audit on clustering UI (done, 5 fixes applied)
```

---

## What to Apply

**Location:** Supabase SQL Editor OR Terminal OR Dashboard  
**Files/commands:**

```sql
-- File: supabase/2026-05-25_flag_edit_rls_replacement.sql
-- Paste entire contents into Supabase SQL Editor, click Run
```

OR

```bash
# File: ~/AccessMap
npx expo install expo-notifications
npm run dev  # rebuild
```

---

## Rollback Plan

**If something breaks, revert with:**

```sql
-- Rollback: 2026-05-25_flag_edit_rls_replacement.sql
-- Run backwards (remove columns, drop policies in reverse order)
-- Detailed SQL in: supabase/ROLLBACKS.md (flagged as CRITICAL)
```

**Time to rollback:** X min  
**Data loss risk:** None / Low (y rows affected) / Medium  
**Testing after rollback:** [what to verify]

---

## 5-Min Checklist

- [ ] **I've read prerequisites section** — all items checked DONE
- [ ] **I understand what this unblocks** — I can name the 3 features above
- [ ] **Rollback plan is clear** — I know how to undo if needed
- [ ] **I've skimmed the SQL/code** — no obvious red flags
- [ ] **I'm applying at a good time** — no production incidents active, team is ready

**If any box is unchecked: do NOT apply yet. Message the owner asking what's missing.**

---

## Decision

**Sky says:**  
☐ APPROVED — apply now  
☐ APPROVED WITH CONDITIONS — [list conditions]  
☐ HOLD — reason: [needs X first]  
☐ BLOCKED — reason: [cannot apply because Y]  

---

## Applied Confirmation

**Who applied:** [name]  
**When:** YYYY-MM-DD HH:MM  
**Confirmation:** [link to Supabase logs, git commit, or screenshot]  
**Team notification sent:** Yes / No (Slack/iMessage to Shamus/Dani)  

---

## Template: D3 Example (Status Update Trigger)

**Status:** READY FOR SKY  
**Timestamp (approval):** —  

### What It Unblocks
**Features:** status-history system (already merged via migration)  
**Count:** 1 system feature, unlocks Sky visibility into flag lifecycle  
**Estimated impact:** Enables D8 EXIF privacy audit (needs status history for verification)  

### Prerequisites
- [ ] Steve signs off on trigger logic (in progress, waiting Steve confirmation)
- [ ] Morgan confirms no RLS conflicts (done, reviewed 2026-05-24)

### What to Apply
```sql
-- File: supabase/2026-05-23_status_update_trigger_proposal.sql
-- Paste into Supabase SQL Editor, click Run
```

### Rollback Plan
```sql
-- Simple: DROP TRIGGER IF EXISTS handle_flag_status_change ON public.flags;
```
**Time:** 1 min  
**Data loss:** None  
**Testing:** Verify points haven't changed in last 24h (query public.users table)

### 5-Min Checklist
- [ ] Steve confirmed trigger is safe (PENDING — waiting Steve)
- [ ] Trigger doesn't conflict with flag edit RLS (confirmed)
- [ ] No performance impact on flag updates (Steve reviewed, OK)
- [ ] Rollback is simple (yes, one DROP)

### Decision
**Waiting for:** Steve confirmation (D3 trigger sign-off)  
**Once approved:** Apply immediately, no dependencies

---

## Template: D1 Example (Flag Edit RLS — APPLIED)

**Status:** APPLIED  
**Timestamp (approval):** 2026-05-28 14:32 UTC  
**Timestamp (applied):** 2026-05-28 14:35 UTC  

### What It Unblocks
**Features:** origin/shamus/marker-clustering-2026-05-25  
**Count:** 3 features  
**Estimated impact:** 6 days of merged work, 150 new tests, unblocks Wave 5 polish  

### Prerequisites
- [x] Gary's 20 updateFlagContent tests written (commit 7f3c91)
- [x] Alex a11y audit on clustering UI (5 fixes applied to branch)
- [x] Shamus code review complete (all comments addressed)

### What to Apply
```sql
-- File: supabase/2026-05-25_flag_edit_rls_replacement.sql
ALTER POLICY "flags owner edit open" ON public.flags
  USING (auth.uid() = user_id AND status = 'open');
```

### Rollback Plan
```sql
-- Revert RLS to previous: ALTER POLICY "flags update own" ...
-- Data: zero rows affected
-- Time: 1 min
```

### 5-Min Checklist
- [x] All prerequisites done
- [x] Shamus ready to merge immediately after
- [x] RLS policy reviewed by Steve (OK)
- [x] Rollback is simple

### Decision
✅ **APPROVED** — Applied 2026-05-28 14:35 UTC  

### Applied Confirmation
**Who applied:** Sky  
**When:** 2026-05-28 14:35 UTC  
**Confirmation:** Supabase SQL Editor execution log (anon role can now edit 'open' flags)  
**Team notification:** Sent to Shamus: "D1 applied, merge when ready"
