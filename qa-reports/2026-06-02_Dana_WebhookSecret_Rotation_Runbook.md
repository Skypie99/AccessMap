# Webhook Secret Rotation Runbook
**Author:** Dana (Backend Engineer)
**Date:** 2026-06-02
**Project:** AccessMap / Supabase project `kldlwszpfkdmsjrjhjym`
**Status:** PREP-ONLY — nothing applied to live DB or deployed

> **v2 — corrected 2026-06-02 after Steve security review + live read-only topology check.**
> Block C completely rewritten: do NOT recreate `notify-flag-status`; only DROP it.
> Topology note added (§2d). Smoke-test updated to check for single 200, not two 400s.
> Block B confirmation added: live `prosrc` inspection verified the function body carries
> a hardcoded literal — Block B's `CREATE OR REPLACE` overwrites it with Vault lookup.

---

## 1. Background

The `notify-flag-status` trigger on `public.flags` fires on every row UPDATE and calls the `notify-flag-status` Edge Function via `supabase_functions.http_request`. The shared secret that authenticates that call is currently **hardcoded as a literal in the trigger's `tgargs`**, which means it is visible to anyone with access to `pg_trigger` / `pg_get_triggerdef` (Supabase superusers, anyone who runs `SELECT pg_get_triggerdef(...)`, migration scripts, etc.).

This runbook moves the secret to **Supabase Vault** and replaces the trigger with a `SECURITY DEFINER` function that reads the secret from Vault at fire time — so the literal never appears in `tgargs` or any DDL statement.

---

## 2. Read-only inspection summary

### 2a. Live trigger `notify-flag-status` — the BROKEN no-op (secret masked)

```
CREATE TRIGGER "notify-flag-status"
AFTER UPDATE ON flags
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://kldlwszpfkdmsjrjhjym.supabase.co/functions/v1/notify-flag-status',
  'POST',
  '{"Content-type":"application/json","X-Webhook-Secret":"<REDACTED — 64-char hex>"}',
  '{}',
  '5000'
)
```

**Problem:** The `X-Webhook-Secret` value is baked into the 3rd argument of `http_request` at `CREATE TRIGGER` time as a plain text literal in `tgargs`. Rotating it requires dropping and recreating the trigger. There is no runtime Vault lookup — hence this full migration.

**Additional problem (confirmed live):** `supabase_functions.http_request` passes an empty `{}` body (its 4th `tgarg`). The Edge Function calls `parseWebhookBody({})` → returns `null` → **returns 400 on every invocation**. This trigger is a broken no-op. It has never successfully fired a notification. It must be dropped and must NOT be recreated.

### 2b. Live trigger `flag_status_notify_trigger` — the WORKING path

**Confirmed via live `pg_trigger` query (2026-06-02):**

```
trigger_name              timing  level  function_schema  function_name
flag_status_notify_trigger  AFTER   ROW    public           notify_flag_status_webhook
```

This trigger already calls `public.notify_flag_status_webhook()` on AFTER UPDATE on `public.flags`, FOR EACH ROW. It is the real notification path. After Block B replaces the function body with Vault-lookup code, this trigger delivers secure, correct notifications with no further DDL needed.

### 2c. Current function body — secret confirmed in prosrc (read-only, 2026-06-02)

`pg_get_functiondef('public.notify_flag_status_webhook'::regproc)` was run read-only against the live DB. The result confirms the current function body contains a **hardcoded literal secret** in the `X-Webhook-Secret` header argument to `net.http_post`. The literal is 64 hex characters, visible to anyone who can call `pg_get_functiondef`.

Block B's `CREATE OR REPLACE FUNCTION public.notify_flag_status_webhook()` **overwrites this body** with code that reads the secret from `vault.decrypted_secrets` at runtime. After Block B runs, no literal secret appears anywhere in `pg_proc.prosrc`.

### 2d. Edge Function payload compatibility — confirmed

The Edge Function (`supabase/functions/notify-flag-status/index.ts`) reads only `record` and `old_record` from the JSON body (via `parseWebhookBody`). Block B builds `{ type, table, schema, record, old_record }` — the extra fields (`type`, `table`, `schema`) are ignored by the Edge Function. Payload is compatible; no Edge Function source changes needed.

### 2e. Edge Function — NO CODE CHANGE NEEDED

`supabase/functions/notify-flag-status/index.ts` line 59:

```typescript
const secret = Deno.env.get('NOTIFY_WEBHOOK_SECRET');
```

The Edge Function **already** reads the secret from the `NOTIFY_WEBHOOK_SECRET` environment variable. You only need to update the env var value in the Supabase dashboard and redeploy. No source file edits are required.

### 2f. Infrastructure confirmed available

| Component | Status |
|---|---|
| `supabase_vault` v0.3.1 | Installed |
| `vault.decrypted_secrets` view | Exists |
| `vault.create_secret()` | Exists — signature: `(new_secret text, new_name text, new_description text, new_key_id uuid)` |
| `vault.update_secret()` | Exists — for future re-rotations |
| `pg_net` v0.20.0 | Installed |
| `net.http_post()` | Exists — signature: `(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer)` |
| `webhook_secret` in Vault | **Does not exist yet** — first rotation creates it |

---

## 3. Architecture: Why the trigger must change

`supabase_functions.http_request` is a trigger function that receives its arguments via `tgargs` — literal strings baked in at `CREATE TRIGGER` time. It cannot perform a Vault lookup at fire time.

**Solution:** Replace it with a custom `SECURITY DEFINER` trigger function (`public.notify_flag_status_webhook`) that:

1. Reads the secret from `vault.decrypted_secrets` at runtime (each trigger invocation).
2. Calls `net.http_post` directly (pg_net), passing the secret as a header.
3. Falls through silently if the Vault entry is missing (fail-open on notifications — the status change is already committed; we don't want to block the UPDATE).

This means the secret never appears in `tgargs`, `pg_get_triggerdef`, or any migration file.

---

## 4. SQL Sky runs in Supabase SQL Editor

Run these three blocks **in order**, in a single session, **after** setting the Edge Function env var and redeploying (see §5).

### Block A — Store the new secret in Vault

Replace `<NEW_SECRET_VALUE>` with the output of `openssl rand -hex 32` (generate it yourself — do not share it in chat, email, or any document).

```sql
-- Block A: Store new secret in Vault
-- Run ONCE. If you need to re-rotate later, use vault.update_secret() instead.

SELECT vault.create_secret(
  '<NEW_SECRET_VALUE>',        -- the actual secret — generate with: openssl rand -hex 32
  'webhook_secret',            -- name (how the trigger function looks it up)
  'Shared secret for notify-flag-status DB webhook → Edge Function auth',
  NULL                         -- key_id: NULL = use the default vault key
);

-- Verify it was stored (does NOT return the decrypted value):
SELECT id, name, description, created_at
FROM vault.decrypted_secrets
WHERE name = 'webhook_secret';
```

### Block B — Create the Vault-reading trigger function

```sql
-- Block B: Replace supabase_functions.http_request trigger with a Vault-aware function.
-- SECURITY DEFINER so it can read vault.decrypted_secrets (which requires elevated access).

CREATE OR REPLACE FUNCTION public.notify_flag_status_webhook()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, vault, net
AS $$
DECLARE
  v_secret    text;
  v_payload   jsonb;
BEGIN
  -- Read the webhook secret from Vault at runtime.
  -- If missing (e.g. during initial setup), skip the HTTP call rather than
  -- blocking the UPDATE — the status change is already committed.
  SELECT decrypted_secret
  INTO   v_secret
  FROM   vault.decrypted_secrets
  WHERE  name = 'webhook_secret'
  LIMIT  1;

  IF v_secret IS NULL THEN
    RAISE WARNING '[notify_flag_status_webhook] vault entry "webhook_secret" not found — skipping HTTP call';
    RETURN NEW;
  END IF;

  -- Build the webhook payload in the same shape Supabase DB webhooks use.
  v_payload := jsonb_build_object(
    'type',       'UPDATE',
    'table',      'flags',
    'schema',     'public',
    'record',     row_to_json(NEW),
    'old_record', row_to_json(OLD)
  );

  -- Fire the HTTP call asynchronously via pg_net.
  -- net.http_post signature: (url, body, params, headers, timeout_milliseconds)
  PERFORM net.http_post(
    url                  := 'https://kldlwszpfkdmsjrjhjym.supabase.co/functions/v1/notify-flag-status',
    body                 := v_payload,
    params               := '{}'::jsonb,
    headers              := jsonb_build_object(
                              'Content-Type',    'application/json',
                              'X-Webhook-Secret', v_secret
                            ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

-- Grant execute to postgres role only (trigger fires as the function owner).
REVOKE ALL ON FUNCTION public.notify_flag_status_webhook() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_flag_status_webhook() TO postgres;
```

### Block C — Drop the broken trigger only (DO NOT recreate)

> **v2 correction:** The original Block C recreated `notify-flag-status` pointing at
> `notify_flag_status_webhook()`. That would have produced DOUBLE webhook firing:
> both the re-created `notify-flag-status` trigger AND the already-existing
> `flag_status_notify_trigger` call the same function on every UPDATE.
> The correct fix is DROP only.

```sql
-- Block C: Drop the broken no-op trigger.
-- DO NOT recreate it. The working path is:
--   flag_status_notify_trigger → notify_flag_status_webhook() (now Vault-reading after Block B)
--
-- Dropping notify-flag-status removes:
--   (a) the hardcoded secret in tgargs
--   (b) the broken empty-body {} POST that returns 400 on every call
--
-- After this block there is exactly ONE webhook trigger on public.flags:
--   flag_status_notify_trigger

DROP TRIGGER IF EXISTS "notify-flag-status" ON public.flags;

-- Verify: exactly one AFTER UPDATE webhook trigger remains.
SELECT tgname, pg_get_triggerdef(oid, true) AS trigger_def
FROM   pg_trigger
WHERE  tgrelid = 'public.flags'::regclass
  AND  NOT tgisinternal
  AND  tgname IN ('notify-flag-status', 'flag_status_notify_trigger');
-- Expected: one row only → flag_status_notify_trigger
--           trigger_def references notify_flag_status_webhook, NOT http_request
--           NO secret literal visible anywhere in trigger_def
```

---

## 5. Ordered "Sky executes" runbook

Follow this sequence exactly. Do not run SQL before redeploying the Edge Function, or the new trigger will fire with the new secret while the function still validates against the old one.

### Step 1 — Generate the new secret (your terminal)

```bash
openssl rand -hex 32
# Copy the output — this is <NEW_SECRET_VALUE>. Do not paste it anywhere except Steps 2 and 3.
```

### Step 2 — Set Edge Function env var

In the **Supabase Dashboard** → Project `kldlwszpfkdmsjrjhjym` → **Edge Functions** → **`notify-flag-status`** → **Secrets**:

- Find `NOTIFY_WEBHOOK_SECRET`
- Update its value to `<NEW_SECRET_VALUE>`
- Save

### Step 3 — Redeploy the Edge Function

No source code changes are needed. Redeploy to pick up the new env var:

```bash
# From your AccessMap repo root:
npx supabase functions deploy notify-flag-status --project-ref kldlwszpfkdmsjrjhjym
```

Or via Supabase Dashboard → Edge Functions → `notify-flag-status` → **Deploy**.

### Step 4 — Store secret in Vault (SQL Editor, Block A)

Open Supabase Dashboard → **SQL Editor**. Run **Block A** from §4 above, replacing `<NEW_SECRET_VALUE>` with the value you generated in Step 1. Verify the confirmation SELECT returns one row.

### Step 5 — Create Vault-reading trigger function (SQL Editor, Block B)

Still in SQL Editor, run **Block B** from §4. No substitutions needed.

### Step 6 — Drop the broken trigger (SQL Editor, Block C)

Run **Block C** from §4. The verification SELECT should return **exactly one row**: `flag_status_notify_trigger`, with `trigger_def` referencing `notify_flag_status_webhook` and no secret literal visible. If `notify-flag-status` still appears, the DROP did not execute — do not proceed.

### Step 7 — Smoke-test (single-fire verification)

1. Sign in to AccessMap on any device.
2. Submit a test flag (or use the Supabase Dashboard → Table Editor to manually flip a flag's `status` from `open` to `verified`).
3. Check **Edge Functions → Logs → `notify-flag-status`** in the Supabase Dashboard immediately after the status change.
   - **Pass:** exactly **one** invocation visible, returning `200 ok`.
   - **Fail — double fire:** two invocations appear for the same status change. This means Block C did not run or `notify-flag-status` was recreated. Roll back by re-running `DROP TRIGGER IF EXISTS "notify-flag-status" ON public.flags;`.
   - **Fail — 401:** Block B did not run, or Block A Vault entry does not match the Edge Function's `NOTIFY_WEBHOOK_SECRET`. Check both.
   - **Fail — 400:** the payload shape is wrong. Compare Block B's `v_payload` against the Edge Function's `parseWebhookBody` (both expect `record` + `old_record`).
4. Optional: confirm a push notification arrives on a device with a registered push token — verifies end-to-end delivery through `send-push-notification`.

---

## 6. Future re-rotation procedure

Once the Vault entry exists, future rotations are simpler — no trigger rebuild needed:

```sql
-- Future rotation (don't run now):
SELECT vault.update_secret(
  id          := (SELECT id FROM vault.decrypted_secrets WHERE name = 'webhook_secret'),
  new_secret  := '<NEXT_SECRET_VALUE>',
  new_name    := 'webhook_secret',
  new_description := 'Shared secret for notify-flag-status DB webhook → Edge Function auth',
  new_key_id  := NULL
);
```

Then update `NOTIFY_WEBHOOK_SECRET` in the Edge Function secrets and redeploy. The trigger function reads from Vault at runtime, so no DDL changes are required.

---

## 7. What was NOT done

- No secret value was committed to this file or any file in the repo.
- No SQL was applied to the live database.
- No Edge Function was deployed.
- No git add/commit/stash/checkout was run.

---

## Decisions for Sky

None — this is a pure prep artifact. All steps are Sky-executed.

**One note:** The `send-push-notification` Edge Function also has a `SEND_PUSH_SECRET` env var (used by `notify-flag-status` to call it). That is a separate secret and is NOT in scope for this rotation. If Steve's report flagged it separately, rotate it under a separate runbook pass.
