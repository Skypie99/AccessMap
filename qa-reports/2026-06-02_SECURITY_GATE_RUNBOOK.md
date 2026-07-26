# AccessMap — Pre-Tester Security Gate — Sky's Runbook
**Assembled by Morgan, 2026-06-02 · all steps Sky-executed (live DB / credentials = hard gate)**

Team prep + sign-off behind each step:
- Dana (backend) — authored/verified the SQL · Steve (security) — signed off · Morgan — consolidated.
- Detail reports: `2026-06-02_Dana_WebhookSecret_Rotation_Runbook.md` (v2), `2026-06-02_Dana_PreTester_Security_Gate.md`, `2026-06-02_Steve_PreTester_Security_SignOff.md`.

**Already done ✅** — duplicate points trigger dropped + Morgan-verified live (double-points fixed).

> Recommended order below. F2 + F3 are independent and already cleared — you can do those first as a warm-up if you like. Apply F2/F3 on a **Supabase preview branch first**, verify, then run the identical SQL on prod.

---

## STEP 0 — Webhook secret rotation 🔴 (closes BOTH exposed secrets; Dana v2)
**Why:** two hardcoded secrets are live in `pg_catalog` (one in the `notify-flag-status` trigger args, one in the `notify_flag_status_webhook` function body) + that trigger is a broken no-op. This removes both and leaves one secure Vault-based path. Full SQL = Dana's rotation runbook §4–5.

1. **Generate:** `openssl rand -hex 32` → your new secret (don't paste it anywhere but steps 2 & 3).
2. **Edge Function secret:** Supabase → Edge Functions → `notify-flag-status` → Secrets → set `NOTIFY_WEBHOOK_SECRET` = new value → Save.
3. **Redeploy:** `npx supabase functions deploy notify-flag-status --project-ref kldlwszpfkdmsjrjhjym`
4. **Block A** (SQL Editor): `vault.create_secret('<new value>', 'webhook_secret', ...)` — see runbook §4 Block A.
5. **Block B** (SQL Editor): `CREATE OR REPLACE FUNCTION notify_flag_status_webhook()` reading from Vault — see runbook §4 Block B (long; paste as-is).
6. **Block C** (SQL Editor) — *corrected*:
   ```sql
   DROP TRIGGER IF EXISTS "notify-flag-status" ON public.flags;   -- drop the broken one; do NOT recreate
   ```
7. **Smoke test:** flip a flag's status → Edge Function logs show **exactly one** `200` (not two, not 400/401).

---

## STEP 1 — F2: function search_path + EXECUTE hardening ✅ Steve PASS
Preview branch → verify webhook still fires → then prod (identical SQL):
```sql
alter function public.notify_flag_status_webhook()             set search_path = public;
alter function public.enforce_flag_status_only_for_non_owner() set search_path = public;
revoke execute on function public.notify_flag_status_webhook()             from public, anon, authenticated;
revoke execute on function public.enforce_flag_status_only_for_non_owner() from public, anon, authenticated;
revoke execute on function public.check_flag_creation_rate_limit()         from public, anon, authenticated;
revoke execute on function public.check_flag_rate_limit()                  from public, anon, authenticated;
```
Steve confirmed: the `REVOKE` does **not** stop the triggers firing (Postgres runs them as owner); `net.http_post` is schema-qualified so the `search_path` pin is safe.

---

## STEP 2 — F3: flag_photos INSERT guard ✅ Steve PASS
Preview branch → verify → then prod:
```sql
drop policy if exists "flag_photos: authenticated insert" on public.flag_photos;
create policy "flag_photos: authenticated insert"
  on public.flag_photos for insert
  to authenticated
  with check ( position('/flag-photos/' || (select auth.uid())::text || '/' in url) > 0 );
```
Steve confirmed: all real app upload URLs satisfy this; table has 0 rows → clean apply.

---

## STEP 3 — Reviewer test account (dashboard, manual)
Auth → Users → Add user → fresh email + `openssl rand -base64 16` password → put the creds **only** in App Store Connect → App Review → Demo Account. Never in git/chat.

---

## After the security gate
- ♿ **Alex's device a11y pass** — VoiceOver (iPhone) + TalkBack (Android), script in `2026-06-02_Alex_PreTester_A11y_Gate.md`.
- 🚀 **Build → TestFlight** — `eas secret:list` (confirm Supabase env vars) → `eas build --platform ios --profile testflight --non-interactive` → `eas submit --platform ios --profile production --latest --non-interactive`.
