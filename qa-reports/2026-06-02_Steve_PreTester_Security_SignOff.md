# Steve — Pre-Tester Security Sign-Off — 2026-06-02

**Auditor:** Steve (Safety Engineer)
**Delegated by:** Morgan (pre-tester gate, 2026-06-02)
**Live project verified (read-only):** `kldlwszpfkdmsjrjhjym`
**Source:** Dana's gate report `qa-reports/2026-06-02_Dana_PreTester_Security_Gate.md`

---

## Overall Verdict

**CONDITIONAL PASS — Apply F2 + F3 + duplicate trigger drop. BLOCK distribution on webhook secret rotation.**

F2 and F3 migrations are correctly authored and safe to apply per Dana's runbook. The duplicate `handle_flag_status_change` trigger is already GONE from prod (double-points bug self-resolved). The absolute blocker before any public tester distribution is the webhook secret rotation: TWO hardcoded secrets are live in pg_catalog — one in the `notify-flag-status` trigger args and a SECOND in the `notify_flag_status_webhook` function body. Both are readable by any superuser query. Neither migration addresses this.

---

## Per-Item Review

---

### Item 1 — Webhook Secret Rotation Design

**Status: CONCERN — BLOCKER before distribution**

**Live verification (2026-06-02):**

The `pg_trigger` query and `pg_proc` query against the live project confirm two distinct hardcoded secrets, not one:

| Location | Secret present | Readable by |
|---|---|---|
| `notify-flag-status` trigger tgargs | YES — 64-hex-char `X-Webhook-Secret` header | Any superuser / service-role catalog query |
| `notify_flag_status_webhook` function body (pg_proc.prosrc) | YES — SECOND 64-hex-char value embedded in `net.http_post(headers := ...)` call | Same |

These are two different secrets for two overlapping webhook paths (the pg_net direct trigger and the plpgsql wrapper). Dana's report correctly identified the trigger tgargs secret but the function body secret is a SEPARATE credential also requiring rotation.

**Rotation design assessment:**

The proposed design (Edge Function env var `WEBHOOK_SECRET` / `NOTIFY_WEBHOOK_SECRET` + Vault) is the correct approach. Reviewing the live Edge Function code at `supabase/functions/notify-flag-status/index.ts`:

- The function already reads `Deno.env.get('NOTIFY_WEBHOOK_SECRET')` and checks the `X-Webhook-Secret` header — the env-var plumbing is already in place on the receiving end.
- After rotation, the trigger and function body must both be updated to stop sending the old secret. The `notify_flag_status_webhook` plpgsql function will need to be `CREATE OR REPLACE`d with a Vault lookup instead of the inline literal. Dana must author this replacement.
- Supabase Vault is the correct mechanism for the function body secret (not env-only): a pg_proc body is more durable storage than an env var, and the Vault `decrypted_secrets` approach ensures the secret is never exposed in `pg_proc.prosrc` in future. For the `notify-flag-status` trigger (which calls `supabase_functions.http_request` directly), the secret cannot be pulled from Vault at trigger-fire time — this trigger should be dropped and replaced with an approach that calls the plpgsql wrapper (`notify_flag_status_webhook`) or is removed in favor of the single-path consolidation post-tester.

**Residual gaps not addressed by Dana's plan:**

1. `pg_stat_statements`: If the secrets were passed as literal strings in a `SELECT` or `PERFORM` that hit pg_stat_statements, they could persist in query text. The plpgsql `PERFORM net.http_post(headers := jsonb_build_object(..., 'X-Webhook-Secret', '<literal>'))` call is function-body text, not a parameterized statement — it will not appear in `pg_stat_statements.query`. This gap is NOT present here.

2. **Supabase logs / Edge Function logs**: The old Edge Function logs may contain request headers if Supabase logged them at receive time. Rotation invalidates the old secret anyway, so log residue becomes inert after rotation. No additional action needed beyond rotation.

3. **The old secret value**: Once the new secret is active and the trigger/function recreated without the old value, the old credential is inert even if found in old logs or backup restores. Rotation is sufficient — no need to scrub pg_stat_statements or logs.

**F2 does NOT fix this** (correctly noted by Dana). F2 only does `set search_path = public` and `REVOKE EXECUTE` — it does not touch the function body and does not remove the inline secret.

**Required before applying F2** (or at minimum before any public distribution): rotate both secrets; DROP and recreate `notify-flag-status` trigger and `notify_flag_status_webhook` function without inline literals. Dana must author the replacement SQL.

---

### Item 2 — F2: Function search_path + EXECUTE revoke

**Status: PASS — with one documented caution Sky must act on**

**Live state confirmed (2026-06-02):**

| Function | security_definer | search_path | anon EXECUTE | auth EXECUTE |
|---|---|---|---|---|
| `notify_flag_status_webhook` | YES | MUTABLE | YES | YES |
| `enforce_flag_status_only_for_non_owner` | NO | MUTABLE | YES | YES |
| `check_flag_creation_rate_limit` | YES | already pinned | YES | YES |
| `check_flag_rate_limit` | YES | already pinned | YES | YES |

All four functions confirmed callable via RPC today. Supabase `get_advisors` also live-confirms the same lints: `function_search_path_mutable` on both mutable functions; `anon_security_definer_function_executable` and `authenticated_security_definer_function_executable` on all four.

**Migration SQL review:**

The F2 migration (`2026-06-01_function_exec_and_search_path_hardening.sql`) is correct:
- `ALTER FUNCTION ... SET search_path = public` is applied only to the two MUTABLE functions — the two already-pinned ones are untouched. Correct.
- `REVOKE EXECUTE ... FROM public, anon, authenticated` covers all four. Correct.

**Trigger firing after REVOKE — confirmed safe:**

In PostgreSQL, trigger execution is governed by the trigger definition itself, not by EXECUTE privilege on the function. The trigger fires as the table owner's security context, not by calling the function via a privilege grant. Revoking EXECUTE from `public/anon/authenticated` removes only the `/rest/v1/rpc/<function>` surface — it has zero effect on trigger invocation. This is verified by how `handle_new_user` and `handle_flag_status_change` already work: both have EXECUTE revoked from all roles in `schema.sql` and their triggers fire correctly in prod today.

**search_path pin on `notify_flag_status_webhook` — CAUTION:**

The live function body calls `net.http_post(...)`. The `net` extension is in the `net` schema (confirmed by `pg_proc` query: `nspname = 'net'`). The call in the function body is written as `PERFORM net.http_post(...)` — schema-qualified. A `set search_path = public` pin does NOT break schema-qualified calls. The pin only affects unqualified identifiers. Since the call is `net.http_post`, pinning `search_path=public` is safe and will not break the webhook.

However: this function also has a hardcoded secret in its body (Item 1). The recommended sequence is therefore to rotate the secret and recreate the function FIRST, then F2 can be applied to the replacement. If Sky applies F2 first (before the function body is cleaned up), the search_path pin will be applied to a function that still carries the inline secret — the pin doesn't make the secret worse, but it's cleaner to pin the already-sanitized version.

**Smoke test requirement:** Apply to preview branch first per Dana's runbook. Confirm the status-change webhook still fires (the `flag_status_notify_trigger` path calls this function via trigger, not via RPC). This test is required.

---

### Item 3 — F3: flag_photos INSERT policy tightening

**Status: PASS — no legitimate-insert breakage**

**Live state confirmed (2026-06-02):**

The `flag_photos: authenticated insert` policy currently has `WITH CHECK (true)` — confirmed live via `pg_policies` and `get_advisors` (`rls_policy_always_true` lint active). 0 rows in `flag_photos` table currently, so no existing data to migrate.

**Migration SQL review:**

The F3 migration replaces `WITH CHECK (true)` with:

```sql
WITH CHECK (
  position('/flag-photos/' || (select auth.uid())::text || '/' in url) > 0
)
```

**URL pattern compatibility verified:**

The app's upload path in `src/lib/flags.ts` builds: `const filePath = \`${userId}/${Date.now()}.${ext}\`` and calls `supabase.storage.from('flag-photos').getPublicUrl(filePath)`. The resulting public URL has the form:

```
https://kldlwszpfkdmsjrjhjym.supabase.co/storage/v1/object/public/flag-photos/<uid>/<timestamp>.jpg
```

Live SQL simulation confirms: `position('/flag-photos/<uid>/' in <full-url>)` returns 66 (non-zero) — the check passes for all legitimate app-generated URLs.

**`photos.ts` insert path reviewed:** `addFlagPhoto` calls `uploadFlagPhoto(user.id, localUri)` which returns the public URL, then inserts `{ flag_id, url, position }` into `flag_photos`. The URL is always the storage public URL containing the authenticated user's UID in the path. `batchInsertFlagPhotos` in `photos.ts` does the same — URLs are already-uploaded storage URLs. Both paths pass the new WITH CHECK.

**Edge cases confirmed safe:**
- A user trying to insert another user's URL: `position('/flag-photos/<other-uid>/' in url)` — fails if the caller's own UID doesn't match. Correct.
- An external URL like `https://attacker.com/x.jpg`: will not contain `/flag-photos/<auth.uid>/`. Rejected. Correct.
- The `(select auth.uid())` subselect wrapper is correct — avoids per-row re-evaluation for performance, matching the pattern used elsewhere in the schema.

**No rollback risk** from the 0-row table state. Clean apply.

---

### Item 4 — Additional Security-Relevant Findings

**4a. DOUBLE-POINTS bug: ALREADY RESOLVED ON PROD**

Dana's report stated both `on_flag_status_change` AND `trigger_flag_status_change` were active. Live trigger query today returns only `on_flag_status_change` for `handle_flag_status_change`. The duplicate was already dropped — either by the prior session's F1 apply or a separate action. The DROP step in Dana's runbook can be skipped (the `DROP TRIGGER IF EXISTS` is idempotent, so running it is harmless, but it will return "trigger does not exist" rather than changing anything).

**4b. Two overlapping webhook triggers remain on public.flags:**

| Trigger | Function | What it does |
|---|---|---|
| `flag_status_notify_trigger` | `notify_flag_status_webhook` (plpgsql) | Calls `net.http_post` to the Edge Function; checks `OLD.status IS NOT DISTINCT FROM NEW.status` guard |
| `notify-flag-status` | `supabase_functions.http_request` (pg_net direct) | Calls the same Edge Function URL with the hardcoded inline secret |

These two triggers both call the same Edge Function on every status update — meaning the Edge Function receives two POST requests per status change. The Edge Function's old_record guard (`old_record.status === record.status`) may deduplicate them at the notification layer if both carry old_record. However, the `supabase_functions.http_request` trigger sends `'{}'` as the body per the trigger args — meaning it sends an EMPTY body, which the Edge Function's `parseWebhookBody` will reject as a 400. So in practice, only the `flag_status_notify_trigger` path is delivering live notifications. The `notify-flag-status` pg_net direct trigger is essentially a broken no-op (400 every time), plus the secret exposure. Dropping it as part of the secret rotation is correct and will clean up both issues at once.

**Post-tester action for Dana:** Once the secret is rotated and the `notify-flag-status` trigger is dropped, confirm whether `flag_status_notify_trigger` alone is sufficient or whether the `notify_flag_status_webhook` plpgsql wrapper (which it calls) should be consolidated.

**4c. Two duplicate updated_at triggers on public.flags:**

Live query reveals `on_flag_updated_at` (calls `set_flag_updated_at`) and `update_flags_updated_at` (calls `update_flags_updated_at`) both fire BEFORE UPDATE on `public.flags`. These are a minor inefficiency but not a security concern — both are BEFORE triggers that just set `updated_at = now()`. The second one is a no-op if the first already set it. Not a blocker for tester distribution; route to Dana for cleanup post-tester.

**4d. Supabase get_advisors notices `flags status update by any authenticated` policy:**

The linter flags this as `rls_policy_always_true` because the USING clause is `true`. This is by design — the column-locking enforcement is done by the `enforce_flag_status_only_for_non_owner` BEFORE trigger, not by RLS USING. This was explicitly verified and accepted during the F1 fix session. Not a gap.

**4e. `increment_reopen_request` and `log_realtime_event` callable by authenticated:**

`get_advisors` reports these as `authenticated_security_definer_function_executable`. Per the F2 migration comments, these are intentionally kept as callable RPCs (design intent). The migration correctly excludes them from the REVOKE. Not a gap.

**4f. Reviewer test account migration (`2026-05-31_reviewer_test_account.sql`):**

> ### ⚠️ CORRECTION — 2026-07-31 (security audit train, Phase B, finding S-2)
>
> **The conclusion below is wrong and was wrong when written.** The credential
> was committed, in TWO places, by `9fd1cd9` (2026-05-31). The 2026-06-02
> cleanup (`c51c46a`) redacted the `.sql` migration comment only and missed the
> credential table added in the same commit — so the string has been live in
> `origin/main` of a **public** repo ever since. Six in-tree copies survive.
>
> The finding was closed by re-reading the one file it cited. **A secret finding
> is closed by re-grepping the string across HEAD and history — never by
> re-reading the one file the original finding named.**
>
> Re-rated **HIGH**. The exposure is real; live verification shows the exact
> published address does not resolve to an account, but the password string is
> public and a reviewer account exists at a one-character-different domain.
> **Rotation is the fix and it is Sky's to perform.** Purging these files is
> hygiene that belongs *after* rotation, so the historical text below is left
> intact rather than quietly rewritten.
>
> Detail: `security-audit/2026-07-31/LENS1_secrets_exposure.md` (S-1, S-2).

The file header says "PROPOSE-ONLY" and requires manual Step 1 (create auth user via dashboard). Critically, the file does NOT hardcode a password — it only populates profile + sample flags after the user exists. The Steve 2026-06-01 security report's finding ("password `AccessMap2026!` committed") appears to refer to an earlier draft or a different version of this file. The current file on disk has no hardcoded password. No action needed on this item — Dana's instruction to provision the account manually via the dashboard is the correct path.

---

## Apply Order Recommendation

1. **BEFORE any distribution:** Rotate both webhook secrets (trigger tgargs + function body). Drop `notify-flag-status` trigger. Recreate `notify_flag_status_webhook` function with Vault lookup. Dana must author the replacement SQL. This is the hard blocker.

2. **F2** — preview branch first, then prod. Supabase linter will clear the two `function_search_path_mutable` and three `*_security_definer_function_executable` lints on the four trigger functions. Caution: ideally applied AFTER the function body is cleaned up per step 1, so the search_path pin lands on the sanitized version. If sequence is inverted, it's not dangerous — just aesthetically wrong.

3. **F3** — preview branch first, then prod. Zero rows in the table; clean apply. Linter `rls_policy_always_true` for `flag_photos` will clear.

4. **Duplicate trigger drop** — ALREADY DONE. `DROP TRIGGER IF EXISTS trigger_flag_status_change` is safe to run but will be a no-op.

5. **Reviewer account** — Sky provisions manually, no migration to apply.

---

## DECISIONS FOR SKY (Steve)

- **[BLOCKER — do before tester distribution]** Two hardcoded webhook secrets must be rotated and removed from pg_catalog before any public tester distribution. Dana must author replacement SQL (Vault-backed function body + `notify-flag-status` trigger drop/recreate or consolidation). Supabase Vault is the right mechanism for the function body. The Edge Function already reads from env var (`NOTIFY_WEBHOOK_SECRET`) — no Edge Function code change needed, only a secret rotation in the dashboard.

- **[INFO — no action required]** Duplicate `trigger_flag_status_change` (double-points trigger) is already gone from prod. Dana's DROP step is a no-op but harmless to run.

- **[POST-TESTER — route to Dana]** Two updated_at triggers on flags + two webhook trigger paths. Cleanup / consolidation after tester gate.
