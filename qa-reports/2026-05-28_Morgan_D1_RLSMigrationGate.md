# D1 DECISION GATE — RLS MIGRATION APPLY

**Type:** Database migration execution (Sky-only action per Constitution Art. 1)  
**Blocking:** `shamus/marker-clustering-2026-05-25` merge  
**Migration file:** `supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql`  
**Timeline:** 5 min (apply in Supabase SQL Editor)  
**Unblocks:** Shamus merge + marker clustering + flag editing UI

---

## DECISION FOR SKY

**Action needed:** Apply the RLS migration in Supabase SQL Editor

```sql
-- File: supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql
-- Purpose: Tighten RLS for flag_edits table to prevent unauthorized modifications
-- Safe to apply: idempotent, no data loss, reversible via rollback
```

**Once applied:**
- Shamus's `shamus/marker-clustering-2026-05-25` branch unblocks
- Marker clustering + flag editing UI can merge to main
- Prerequisite for Alex a11y fixes on same branch

---

## NEXT STEPS (AFTER SKY APPLIES)

1. Sky applies migration (5 min)
2. Morgan signals Shamus: "D1 resolved, your branch is unblocked"
3. Shamus merges marker-clustering to main
4. Alex validates a11y fixes on merged code
5. Complete

---

## ADDITIONAL CONTEXT

**Migration safety:**
- Idempotent (safe to re-run)
- No data loss (only adds/modifies RLS policies)
- Rollback available if needed (reverse migration steps)
- Dependencies: None (standalone schema change)

**Why it's critical:**
- Prevents unauthorized flag edits via direct DB access
- RLS floor enforcement (authenticated user only, user-scoped edits)
- Prerequisite for secure feature flags/edits in production

---

**Morgan standing by. Awaiting Sky migration apply. Then Shamus unblocks. ✓**
