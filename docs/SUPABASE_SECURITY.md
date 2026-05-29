# Supabase Security Hardening Guide

**Do this before public launch.** All settings are in the Supabase Dashboard at supabase.com.

---

## 1. Enable Row Level Security (All Tables)

Go to: Database → Tables → [each table] → RLS

Verify RLS is enabled on:
- [ ] `users` table
- [ ] `flags` table
- [ ] `push_tokens` table

If RLS shows "Disabled" on any table: click the toggle to enable it immediately.

---

## 2. Restrict API Key Permissions

Go to: Project Settings → API

**Anon key (public):**
This key is in your client app. Anyone can see it.
- ✅ It should ONLY have access to what RLS allows
- Verify: can you read other users' emails with the anon key? (If yes → apply email privacy migration)

**Service role key (secret):**
- This key bypasses RLS — it can do ANYTHING
- ✅ Must NEVER be in client code (only server/Edge Functions)
- Check: `grep -r "SERVICE_ROLE\|service_role" ~/AccessMap/src` — should return nothing

---

## 3. Enable Auth Security Settings

Go to: Authentication → Settings

- [ ] **Confirm email:** Enable (prevents fake signups)
- [ ] **Minimum password length:** Set to 8+
- [ ] **Rate limiting:** Already on by default — verify it's not disabled

Go to: Authentication → Settings → Advanced

- [ ] **JWT expiry:** 3600 seconds (1 hour) — not too long
- [ ] **Refresh token rotation:** Enable

---

## 4. Configure Storage Security

Go to: Storage → Policies

- [ ] `flag-photos` bucket: is it private or public?
  - If public: anyone can view photos by URL — acceptable for accessibility flags
  - Verify: uploaded photos don't expose user identity in their URL

- [ ] Check bucket RLS policies match what's in the migrations

---

## 5. Enable Database Audit Logging (Optional but recommended)

Go to: Database → Extensions

- [ ] Enable `pgaudit` extension (logs all queries — useful for incident response)
- Note: increases storage usage; enable only if needed for compliance

---

## 6. Set Up Alerts

Go to: Project Settings → Alerts

- [ ] Error rate spike → email alert
- [ ] Database CPU > 80% → email alert
- [ ] Storage > 80% capacity → email alert

---

## 7. Review Edge Function Secrets

Go to: Edge Functions → Environment Variables

Verify these secrets are set:
- [ ] `NOTIFY_WEBHOOK_SECRET` — for notify-flag-status and send-push-notification functions
- [ ] No plaintext credentials in function code

---

## 8. Check Network Restrictions (Optional)

Go to: Project Settings → Network

For production, consider:
- Restricting DB connections to your EAS build server IP (not public)
- Only accessible from Supabase Edge Functions

---

## Quick Verification Checklist

Run this before launch:
```bash
# Verify no service key in client code
grep -r "SUPABASE_SERVICE_ROLE\|service_role_key" ~/AccessMap/src ~/AccessMap/app 2>/dev/null | grep -v ".env"
# Should return nothing

# Verify .env is in .gitignore
cat ~/AccessMap/.gitignore | grep ".env"
# Should show .env or .env.local
```

---

## Contact

Questions about Supabase security → Supabase docs: https://supabase.com/docs/guides/platform/permissions
Data breach → follow `docs/SECURITY_INCIDENT_RESPONSE.md` playbook
