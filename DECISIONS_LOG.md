# AccessMap — Structural Decisions Log

**Append-only decision record** (source of truth for major decisions, migrated from PROJECT_STATE.md on 2026-05-25)

---

## D-1 | 2026-05-25 | OPEN
**Decision:** Apply `2026-05-25_flag_edit_rls_replacement.sql` migration in Supabase SQL Editor

**Options:** 
A. Apply migration (required to unblock merge of `origin/shamus/marker-clustering-2026-05-25`)  
B. Hold migration (stalls flag-edit feature indefinitely)

**Constraints:** Const. Art. 1.3 (production changes as files only). Shamus marker-clustering branch ready after migration.

**Status:** BLOCKING — awaiting Sky action  
**Urgency:** BLOCKING — flag edit cannot merge without it  
**qa-report source:** AccessMap PROJECT_STATE.md (as of 2026-05-25)

---

## D-2 | 2026-05-25 | OPEN
**Decision:** Apply `2026-05-25_push_tokens.sql` migration + deploy Edge Function + install `expo-notifications`

**Options:**
A. Apply all three (complete push notifications stack)  
B. Apply migrations only, defer Edge Function  
C. Hold (push notifications remain incomplete)

**Constraints:** Const. Art. 1.3 (files only). Three-part coordination: migration, Edge Function deploy, client install.

**Status:** HIGH — fully built, zero user value until applied  
**qa-report source:** AccessMap PROJECT_STATE.md (as of 2026-05-25)

---

## D-3 | 2026-05-25 | OPEN
**Decision:** Steve trigger sign-off on `2026-05-23_status_update_trigger_proposal.sql`

**Options:**
A. Steve approves trigger approach (Morgan recommends APPROVE)  
B. Steve requests RLS-only alternative  
C. Hold (stalls status update pipeline)

**Constraints:** Const. Art. 1.3 (security decisions as proposals). Morgan recommends APPROVE.

**Status:** HIGH — awaiting Steve security review  
**qa-report source:** AccessMap PROJECT_STATE.md (as of 2026-05-25)

---

## D-4 | 2026-05-25 | OPEN
**Decision:** Apply pending migration batch: `data_layer_hardening`, `rls_initplan_and_non_owner_status_update`, `realtime_flags`

**Options:**
A. Apply all three (~15 min in SQL Editor)  
B. Apply individually with review per migration  
C. Hold for next sprint

**Constraints:** Const. Art. 1.3 (files only). Realtime flags unlock Supabase Realtime feature.

**Status:** MEDIUM (~15 min in SQL Editor)  
**qa-report source:** AccessMap PROJECT_STATE.md (as of 2026-05-25)

---

## D-5 | 2026-05-25 | OPEN
**Decision:** Heat-map severity-colour rendering: gradient yes or no

**Options:**
A. Gradient rendering (Jordan pre-reviewed, approved with conditions)  
B. Flat categorical colors (simpler implementation)  
C. Hold heat-map feature (reduce scope)

**Constraints:** Const. Art. 0.1 (quality over speed). Jordan pre-reviewed and approved A with conditions (k>=3 floor, severity disclosure).

**Status:** MEDIUM — Sky answer unblocks Shamus build  
**qa-report source:** AccessMap PROJECT_STATE.md (as of 2026-05-25)

---

## D-6 | 2026-05-25 | OPEN
**Decision:** Flag edit history audit table: apply `2026-05-25_flag_edit_history_table.sql` migration yes or no

**Options:**
A. Apply migration (enables edit history tracking and audit trail)  
B. Hold migration (ship without edit history for now)

**Constraints:** Const. Art. 1.3 (files only). Conditional — apply only if Sky answers YES.

**Status:** LOW  
**qa-report source:** AccessMap PROJECT_STATE.md (as of 2026-05-25)

---

## D-7 | 2026-05-25 | OPEN
**Decision:** Constitution Art. 1.2 amendment (Cowork-as-Sky merge authority)

**Options:**
A. Amend Const. Art. 1.2 to permit Cowork merges  
B. Keep current rule: only Sky may merge to main  
C. Defer amendment until next constitutional review

**Constraints:** Const. Art. 11 (Sky-only amendment authority). No sprint impact.

**Status:** LOW — no sprint impact  
**qa-report source:** AccessMap PROJECT_STATE.md (as of 2026-05-25)

---

## How to Use This Log

- **Append new decisions** with: D-<next-number> | YYYY-MM-DD | status
- **Status values:** OPEN, SKY-DECIDED, RESOLVED
- **Each decision** includes: what it is, options, constraints, status, urgency, source
- **Non-decisions** (e.g., "we chose option A and shipped it") → update status to RESOLVED with outcome note
- **Cross-references:** link to qa-reports and PROJECT_STATE.md for context
