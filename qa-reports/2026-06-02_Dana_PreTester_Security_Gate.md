# Dana Report — Pre-Tester Security Gate — 2026-06-02

## 1. DECISIONS FOR SKY
> **Five live actions required — none applied by any agent. Sky executes each step in the Supabase dashboard.**

- [ ] **[URGENT] Rotate the hardcoded webhook secret exposed in `notify-flag-status` trigger args**
  - **Action:** Supabase Dashboard → Edge Functions → `notify-flag-status` → Environment Variables → set `WEBHOOK_SECRET` to a freshly generated value (e.g. `openssl rand -hex 32`). Then recreate the `notify-flag-status` trigger referencing `vault.decrypted_secrets` or the env var instead of the inline literal. See §5d below for the exact DROP/CREATE SQL block.
  - **Rollback:** Re-insert the old literal (already exposed — rotation is the priority; no rollback needed for the rotation itself).
  - **Why deferred:** Live DDL touch on a trigger that fires webhook — irreversible side effect (Const. 5.3). Agent cannot rotate secrets.
  - **Owner:** Dana / Steve

- [ ] **[APPLY] F2 — Function search_path hardening + EXECUTE revoke**
  - **Action:** Supabase Dashboard → SQL Editor → paste and run `supabase/migrations/2026-06-01_function_exec_and_search_path_hardening.sql`. Apply preview branch FIRST (see §7 runbook step 1).
  - **Rollback:** Documented in migration header (GRANT EXECUTE + RESET search_path, 4 lines).
  - **Why deferred:** Const. Art. 5.3 — live DB DDL.
  - **Owner:** Dana

- [ ] **[APPLY] F3 — flag_photos INSERT policy tightening**
  - **Action:** Supabase Dashboard → SQL Editor → paste and run `supabase/migrations/2026-06-01_flag_photos_insert_guard.sql`. Apply preview branch FIRST (see §7 runbook step 2).
  - **Rollback:** Documented in migration header (DROP new policy + recreate WITH CHECK (true), 2 lines).
  - **Why deferred:** Const. Art. 5.3 — live RLS DDL.
  - **Owner:** Dana

- [ ] **[APPLY] Drop duplicate `trigger_flag_status_change` trigger (DOUBLE-POINTS fix)**
  - **Action:** Supabase Dashboard → SQL Editor → run:
    ```sql
    DROP TRIGGER IF EXISTS trigger_flag_status_change ON public.flags;
    ```
    Keep `on_flag_status_change` (the canonical one from schema.sql). Verify: `SELECT tgname FROM pg_trigger WHERE tgrelid='public.flags'::regclass AND tgname LIKE '%flag_status_change%';` — should return exactly one row.
  - **Rollback:** `CREATE TRIGGER trigger_flag_status_change AFTER UPDATE OF status ON public.flags FOR EACH ROW EXECUTE FUNCTION public.handle_flag_status_change();`
  - **Why deferred:** Const. Art. 5.3 — live DDL.
  - **Owner:** Dana

- [ ] **[MANUAL] Provision reviewer test account with a fresh password**
  - **Action:** Supabase Dashboard → Authentication → Users → "Add user" → use a fresh email (e.g. `appstore-reviewer@accessmap-test.com`) and a randomly generated password never committed to git. Record the credentials ONLY in App Store Connect review notes (the "Demo Account" field), nowhere else.
  - **Rollback:** Delete the user in Supabase Auth → Users if App Store review is rejected.
  - **Why deferred:** Credentials must never enter git or any agent output (Const. Art. 5 + global CLAUDE.md rule). Sky provisions manually.
  - **Owner:** Sky (no agent can touch this safely)

---

## 2. BLOCKERS / FAIL_FAST

- **BLOCKER — Hardcoded webhook secret exposed in `notify-flag-status` trigger args (pg_trigger tgargs).** The secret is readable by any superuser/service-role query against `pg_trigger`. This must be rotated BEFORE the app goes live. The F2 migration (search_path hardening) also does NOT fix this — a separate DROP/CREATE of the trigger is required. See §5d.
  - **Quarantined?** Partially — the trigger is internal DB plumbing, not directly reachable by end users. But rotating before TestFlight/App Store distribution is mandatory.
  - **Recommended path:** Sky rotates secret via Supabase dashboard Edge Function env var, then recreates trigger referencing the secret from Vault or env var. Dana will author the replacement SQL once Sky confirms the rotation.

- **STATE — Duplicate `handle_flag_status_change` trigger is live and causing DOUBLE-POINTS.** Both `on_flag_status_change` AND `trigger_flag_status_change` are active on `public.flags`. Every status change is awarding points twice. This is confirmed live (see §3 verification below).

---

## 3. Summary

This is the pre-tester security gate runbook for the five open propose-only items from the 2026-06-01 security audit. Read-only catalog queries against the live Supabase project (`kldlwszpfkdmsjrjhjym`) confirm: F2 gap is live (two functions with mutable `search_path` + all four trigger functions still callable via RPC), F3 gap is live (INSERT policy still `WITH CHECK (true)`), the hardcoded webhook secret is locatable in pg_trigger tgargs on `notify_flag_status_webhook`-adjacent infrastructure, both duplicate triggers are active on `public.flags` (double-points confirmed), and no reviewer test account exists yet. The apply runbook in §7 gives Sky the exact execution sequence — preview branch dry-run first, then prod.

---

## 4. What Shipped (Checkpoints)

No commits made this cycle — read-only verification + runbook only (Const. Art. 5.3).

---

## 5. Read-Only Verification Results

### 5a. F2 — Function search_path + EXECUTE (pg_proc query, 2026-06-02)

**Query:** `SELECT proname, prosecdef, proconfig FROM pg_proc JOIN pg_namespace ... WHERE proname IN (...)` (see §7 for full SQL)

| Function | security_definer | proconfig (search_path) | Status |
|---|---|---|---|
| `notify_flag_status_webhook` | YES | **NULL — MUTABLE** | GAP CONFIRMED |
| `enforce_flag_status_only_for_non_owner` | NO | **NULL — MUTABLE** | GAP CONFIRMED |
| `check_flag_creation_rate_limit` | YES | `search_path=public` | Already pinned |
| `check_flag_rate_limit` | YES | `search_path=public` | Already pinned |
| `handle_flag_status_change` | YES | `search_path=public` | Already pinned |
| `handle_new_user` | YES | `search_path=public` | Already pinned |

**EXECUTE grants query** (pg_proc via `has_function_privilege`):

All four trigger functions (`notify_flag_status_webhook`, `enforce_flag_status_only_for_non_owner`, `check_flag_creation_rate_limit`, `check_flag_rate_limit`) currently grant EXECUTE to both `anon` AND `authenticated`. They are callable via `/rest/v1/rpc/`. **This is the exact gap F2 closes.**

**F2 migration is correct and necessary.** The migration pins `search_path = public` on the two mutable functions and then revokes EXECUTE from `public, anon, authenticated` on all four. The two already-pinned functions (`check_flag_*`) only need the REVOKE, not the ALTER — the migration correctly applies the ALTER only to the two mutable ones. No issue with migration SQL.

**Caution from migration header (reproduced):** `notify_flag_status_webhook` has a hardcoded supabase.co Edge Function URL in its body (`url_is_supabase_domain=true`, `url_is_edge_function=true`). Pinning `search_path=public` on a SECURITY DEFINER function that calls `net.*` unqualified can break it if the schema resolution changes. **Test on a preview branch first and verify the webhook fires before applying to prod.**

### 5b. F3 — flag_photos INSERT policy (pg_policies query, 2026-06-02)

**Query:** `SELECT policyname, cmd, roles, with_check FROM pg_policies WHERE tablename='flag_photos'`

| Policy | cmd | roles | with_check |
|---|---|---|---|
| `flag_photos: authenticated insert` | INSERT | `{authenticated}` | **`true`** — GAP CONFIRMED |
| `flag_photos: authenticated read` | SELECT | `{authenticated}` | N/A |
| `flag_photos: flag owner delete` | DELETE | `{authenticated}` | scoped to flag owner ✓ |
| `flag_photos: flag owner update` | UPDATE | `{authenticated}` | scoped to flag owner ✓ |

**F3 migration is correct and necessary.** The gap is exactly as described: `WITH CHECK (true)` on INSERT allows any authenticated user to attach any URL string to any flag. The migration replaces this with a `position('/flag-photos/' || auth.uid()::text || '/' in url) > 0` check, tying the row to a file the caller actually owns.

### 5c. Item 4 — Duplicate triggers on public.flags (pg_trigger query, 2026-06-02)

**Query:** `SELECT tgname, function_name FROM pg_trigger WHERE relname='flags' AND proname='handle_flag_status_change'`

| Trigger name | Function | fires_on_update | is_row_level | column_watched (attnum) |
|---|---|---|---|---|
| `on_flag_status_change` | `handle_flag_status_change` | YES | YES | 9 (`status`) |
| `trigger_flag_status_change` | `handle_flag_status_change` | YES | YES | 9 (`status`) |

**DOUBLE-POINTS BUG IS LIVE.** Both triggers are enabled (`tgenabled='O'`), both fire AFTER UPDATE OF status (attnum=9 confirmed = `status` column), both call `handle_flag_status_change`. Every status transition currently awards points twice.

**Safe to drop:** `trigger_flag_status_change` — it is the duplicate. `on_flag_status_change` is the canonical name matching `schema.sql` line 115. The DROP is in the §1 decision item above.

**Note:** There are also two webhook-firing triggers on `public.flags`:
- `flag_status_notify_trigger` → calls `notify_flag_status_webhook()` (the plpgsql function)
- `notify-flag-status` → calls `http_request()` (pg_net direct, with hardcoded args — see §5d)

These two serve overlapping purposes. This is a secondary concern but worth Dana + Steve reviewing post-tester to decide which webhook path to retain.

### 5d. Item 3 — Hardcoded secrets in trigger/function definitions (pg_proc + pg_trigger, 2026-06-02)

**Secrets scan query results:**

| Object type | Name | Suspicious content |
|---|---|---|
| `pg_proc` (function body) | `notify_flag_status_webhook` | YES — contains `https://` (supabase.co Edge Function URL hardcoded in body) |
| `pg_trigger` (tgargs) | `notify-flag-status` | YES — `X-Webhook-Secret` header with a 64-hex-char value hardcoded in trigger arguments |
| All other functions | (18 others) | No suspicious content |

**IMPORTANT:** Secret values are NOT reproduced here. The locations are:
1. **`notify-flag-status` trigger tgargs** — The `X-Webhook-Secret` header value is embedded in the pg_trigger `tgargs` field. It is readable by any superuser query. This is the primary rotation target.
2. **`notify_flag_status_webhook` function body** — Contains a hardcoded supabase.co Edge Function URL (not a secret per se, but confirms the function is tightly coupled to a specific endpoint without Vault indirection).

**Remediation path (Sky executes):**
1. Generate a new webhook secret: `openssl rand -hex 32`
2. In Supabase Dashboard → Edge Functions → `notify-flag-status` → set env var `WEBHOOK_SECRET=<new-value>`
3. Update the Edge Function handler to verify `request.headers.get('X-Webhook-Secret') === Deno.env.get('WEBHOOK_SECRET')`
4. Recreate the trigger without the inline secret (Dana will author this SQL once secret rotation is confirmed):
   ```sql
   -- Sky runs this AFTER rotating the Edge Function env var
   DROP TRIGGER IF EXISTS "notify-flag-status" ON public.flags;
   -- Dana will provide the replacement CREATE TRIGGER referencing the vault/env var
   -- Do NOT recreate with the old inline secret value
   ```
5. Validate: trigger fires → Edge Function receives the new secret header → accepts the call.

**Note on Supabase Vault:** The canonical approach is to store the secret in `vault.create_secret(...)` and reference it in the function body as a `SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='webhook_secret'`. Dana can author this migration once Sky confirms the rotation.

### 5e. Item 5 — Reviewer test account (auth.users query, 2026-06-02)

**Query:** `SELECT email FROM public.users WHERE email ILIKE '%test%' OR email ILIKE '%review%' ...`

**Result: 0 rows.** No reviewer/test account exists in the live database. Sky must provision one fresh via the Supabase Dashboard (see §1 decision item 5).

---

## 6. Findings by Domain

### Security (Steve / Dana)
- 🔴 **Hardcoded webhook secret in `notify-flag-status` trigger tgargs** — readable via pg_catalog, must be rotated before any public distribution. See §5d + §1 Decision 1.
- 🔴 **DOUBLE-POINTS bug live** — two triggers both call `handle_flag_status_change`; every status change awards points twice. Drop `trigger_flag_status_change`. See §5c + §1 Decision 4.
- 🟡 **F2 gap live** — 2 functions with mutable search_path; 4 trigger functions callable via RPC. Migration authored and ready. See §5a.
- 🟡 **F3 gap live** — `flag_photos` INSERT policy `WITH CHECK (true)`. Migration authored and ready. See §5b.
- 🟢 **`notify_flag_status_webhook` body** — hardcoded Supabase URL (not a secret but tight coupling). Acceptable short-term; migrate to env var / Vault post-tester.

### Data / Schema (Dana)
- Note: Two webhook-firing triggers exist for overlapping purposes (`flag_status_notify_trigger` + `notify-flag-status`). Recommend consolidating to one after the tester gate; not a blocker.

---

## 6.5 Process Self-Check

### Efficiency Check
Prior reports consulted: `qa-reports/2026-06-01_Security_Robustness_QA_Report.md` (Steve's original finding list), `qa-reports/2026-06-01_Gary_TrustScore_AnonReporting_Gate.md`, `MEMORY.md` security-audit entry (`security-audit-2026-06-01.md`). All five items were pre-identified by Steve; this pass is verification + runbook only — no redundant discovery work.

### Overlap Check
Steve's 2026-06-01 security report already identified items F1–F5. F1 (non-owner DELETE) was fixed and merged to main per MEMORY.md. This report covers the four remaining propose-only items (F2, F3, secrets, duplicate trigger) plus the reviewer account. No overlap with concurrent agents detected.

### Simplification Opportunities
The duplicate-trigger drop could be bundled with F2 into a single migration file. Kept separate here to preserve the "one concern per migration file" convention and allow independent rollback. If Sky prefers a single apply, combine at their discretion.

---

## 7. Ordered Apply Runbook (Sky executes)

> Apply on a **preview branch first**, then prod. Each step is independently rollback-able.

### Prerequisites
- Supabase Dashboard access to project `kldlwszpfkdmsjrjhjym`
- A Supabase Preview Branch spun up (Dashboard → Branches → Create branch)
- `openssl` available locally for secret generation

---

### STEP 0 — Rotate the webhook secret (URGENT — do this first, before any DDL)

```
1. In your terminal:
   openssl rand -hex 32
   # Copy the output — this is your NEW_WEBHOOK_SECRET

2. Supabase Dashboard → Edge Functions → notify-flag-status → Configuration
   → Set environment variable: WEBHOOK_SECRET = <NEW_WEBHOOK_SECRET>
   → Save

3. Update the Edge Function handler (src/edge-functions or supabase/functions/notify-flag-status/index.ts):
   - Verify: request.headers.get('X-Webhook-Secret') === Deno.env.get('WEBHOOK_SECRET')
   → Redeploy the Edge Function

4. Smoke test: trigger a flag status change in the app → confirm the Edge Function
   receives and accepts the webhook call (check Edge Function logs in Supabase Dashboard)

5. Once confirmed: DROP and recreate the notify-flag-status trigger WITHOUT the inline secret.
   (Dana will author the replacement migration SQL on request.)
```

---

### STEP 1 — Preview Branch: Apply F2 (search_path hardening + EXECUTE revoke)

```sql
-- Paste in Supabase → SQL Editor (on the PREVIEW BRANCH, not prod)
-- File: supabase/migrations/2026-06-01_function_exec_and_search_path_hardening.sql

alter function public.notify_flag_status_webhook()             set search_path = public;
alter function public.enforce_flag_status_only_for_non_owner() set search_path = public;

revoke execute on function public.notify_flag_status_webhook()             from public, anon, authenticated;
revoke execute on function public.enforce_flag_status_only_for_non_owner() from public, anon, authenticated;
revoke execute on function public.check_flag_creation_rate_limit()         from public, anon, authenticated;
revoke execute on function public.check_flag_rate_limit()                  from public, anon, authenticated;
```

**Smoke test (preview branch):**
1. Report a flag, then change its status → webhook + trigger still fire normally
2. Confirm `notify_flag_status_webhook` is no longer callable via REST:
   `curl -X POST https://<preview-url>/rest/v1/rpc/notify_flag_status_webhook -H "Authorization: Bearer <user-jwt>"` → expect 404 or permission denied
3. Run `get_advisors` (security) → `function_search_path_mutable` lint for these two functions should clear

**If preview passes → apply identical SQL on prod.**

**Rollback (if needed):**
```sql
grant execute on function public.notify_flag_status_webhook()             to public;
grant execute on function public.enforce_flag_status_only_for_non_owner() to public;
grant execute on function public.check_flag_creation_rate_limit()         to public;
grant execute on function public.check_flag_rate_limit()                  to public;
alter function public.notify_flag_status_webhook()             reset search_path;
alter function public.enforce_flag_status_only_for_non_owner() reset search_path;
```

---

### STEP 2 — Preview Branch: Apply F3 (flag_photos INSERT guard)

```sql
-- Paste in Supabase → SQL Editor (on the PREVIEW BRANCH, not prod)
-- File: supabase/migrations/2026-06-01_flag_photos_insert_guard.sql

drop policy if exists "flag_photos: authenticated insert" on public.flag_photos;

create policy "flag_photos: authenticated insert"
  on public.flag_photos for insert
  to authenticated
  with check (
    position('/flag-photos/' || (select auth.uid())::text || '/' in url) > 0
  );
```

**Smoke test (preview branch):**
1. As a signed-in user, add a photo to a flag via the PhotoGallery UI → URL is under your own folder → INSERT succeeds
2. In Table Editor, attempt to INSERT a `flag_photos` row with `url='https://example.com/x.jpg'` → must be REJECTED by WITH CHECK
3. Run `get_advisors` (security) → `rls_policy_always_true` lint for `flag_photos` should clear

**If preview passes → apply identical SQL on prod.**

**Rollback (if needed):**
```sql
drop policy if exists "flag_photos: authenticated insert" on public.flag_photos;
create policy "flag_photos: authenticated insert"
  on public.flag_photos for insert to authenticated with check (true);
```

---

### STEP 3 — Prod: Drop duplicate trigger (DOUBLE-POINTS fix)

> This is safe to apply directly on prod (single DDL statement, instant, reversible). No preview branch needed — but you may apply to preview first if you prefer consistency.

```sql
-- Supabase Dashboard → SQL Editor (prod)
DROP TRIGGER IF EXISTS trigger_flag_status_change ON public.flags;

-- Verify: should return exactly 1 row named 'on_flag_status_change'
SELECT tgname
FROM pg_trigger
JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid
JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid
WHERE relname = 'flags'
  AND proname = 'handle_flag_status_change'
  AND NOT tgisinternal;
```

**Smoke test:**
1. Change a flag's status (open → verified) → user earns exactly +5 reporter points (not +10)
2. Check `public.users.points` increments by the correct single amount

**Rollback (if needed):**
```sql
CREATE TRIGGER trigger_flag_status_change
  AFTER UPDATE OF status ON public.flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_flag_status_change();
```

---

### STEP 4 — Provision Reviewer Test Account

```
1. Supabase Dashboard → Authentication → Users → Invite user (or Add user)
2. Email: appstore-reviewer@<your-test-domain>.com (use a domain you control)
3. Password: generate fresh with `openssl rand -base64 16` — copy it now
4. STORE: paste email + password ONLY into App Store Connect → App Information
   → App Review Information → Sign-In Required → Demo Account
5. DO NOT commit, screenshot, or paste credentials into any chat, git commit, or file
```

---

## 8. Next Recommended Action

After Step 0 (secret rotation) is confirmed, Sky applies F2 → F3 → duplicate trigger drop in order. Reviewer account provisioning can happen in parallel with any step.

---

## GATE VERDICT

**READY-TO-APPLY (pending Sky)**

All five items are verified against live catalog. The two migration files are authored and syntactically correct. The apply runbook is ordered with preview-branch dry-run first. One urgent prerequisite: the webhook secret rotation (Step 0) must happen before distribution — the secret is currently readable in pg_catalog. The double-points bug is live and should be fixed before tester-facing builds. All other items are medium-severity and safe to apply in order.
