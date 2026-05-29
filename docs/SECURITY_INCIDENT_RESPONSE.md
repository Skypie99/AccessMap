# AccessMap Security Incident Response Plan

**Last updated:** 2026-05-30  
**Owner:** Steve (Security Engineering)  
**Audience:** Sky, Morgan, Rory, Shamus, Dani, Gary  
**Escalation:** Morgan → Sky (incident confirmation) → Rory (infrastructure), Gary (CI/safety)

---

## Severity Levels

| Level | Description | Response Time | Example |
|---|---|---|---|
| **P0 — Critical** | Data breach, auth bypass, mass PII exposure, RLS compromise | Immediate (< 1 hour) | All users' GPS locations exposed; auth token leaked in git history |
| **P1 — High** | Single user data exposed, injection vulnerability, weak auth, spam outbreak | Same day (< 4 hours) | EXIF GPS on 5 photos; rate-limit bypass allowing 1K flags/min |
| **P2 — Medium** | Minor spam/abuse, config drift, non-PII data leak, rate limit bypass contained | Next day (< 24 hours) | 3 spam flags posted; temporary API slowdown |
| **P3 — Low** | Theoretical vulnerability, minor config issue, missing non-critical security header | Next sprint (< 5 days) | HSTS header not set; CSP could be stricter |

---

## Decision Tree

**START HERE when incident is reported:**

1. **Is data being actively exposed or exfiltrated RIGHT NOW?**
   - YES → P0, go to CONTAIN (Step 1 below)
   - NO → continue
2. **Is a user account, auth token, or API key compromised?**
   - YES → P1, go to ASSESS (Step 2 below)
   - NO → continue
3. **Is spam/abuse happening or a rate limit is bypassed?**
   - YES → P2, go to ASSESS
   - NO → continue
4. **Is this a potential future vulnerability with no active exploit?**
   - YES → P3, log in backlog, assign to Gary for triage
   - NO → Not a security incident; log as bug

---

## P0 — Critical Incident Playbook

### Step 1: Contain (within 15 minutes)

**Your goal: stop the bleeding.** Act fast; ask questions later.

#### If user data is being accessed without authorization (RLS bypass)

**Scenario:** You see in Supabase logs that a user query is returning rows they shouldn't access (e.g., another user's flags).

1. **Emergency SQL lockdown:**
   ```bash
   # Via Supabase Dashboard → SQL Editor, run:
   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
   ```
   This disables the app immediately. Yes, this breaks the app. That's the point.

2. **Identify the leak:**
   - Supabase Dashboard → Logs → filter for unusual queries
   - Check if RLS policy is missing or buggy: Dashboard → Tables → [table] → Auth Policies
   - Note the query and timestamp

3. **Regenerate compromised keys:**
   ```bash
   # Supabase Dashboard → Settings → API
   # Click "Regenerate" on:
   # - anon key (if leak is from client-side)
   # - service role key (if leak is from backend)
   ```
   Update all references in Vercel, GitHub Actions, and local .env immediately.

4. **Disable affected user accounts (if known):**
   ```bash
   # Via Supabase Dashboard → Authentication → Users
   # Click the user → "Disable user"
   # OR via SQL:
   UPDATE auth.users SET banned_until = NOW() + INTERVAL '30 days' WHERE id = '[user-id]';
   ```

---

#### If push notifications are sending spam or malicious content

**Scenario:** Flag notifications are being sent to users without being triggered, or contain spam.

1. **Kill the notification function:**
   ```bash
   # Supabase Dashboard → Edge Functions
   # Find "notify-flag-status"
   # Click → Delete (or comment out the trigger if you want to keep the code)
   ```

2. **Identify the attack vector:**
   - Is the webhook being called externally? Check if `NOTIFY_WEBHOOK_SECRET` is leaked
   - Is a user triggering it via direct Supabase calls?
   - Is the function itself buggy and triggering on wrong events?

3. **Regenerate the webhook secret:**
   ```bash
   # Supabase Dashboard → Settings → Environment Variables
   # Delete: NOTIFY_WEBHOOK_SECRET
   # Create new one (or have Rory regenerate in Vercel)
   openssl rand -base64 32
   ```

4. **Check notification logs:**
   ```bash
   # Supabase Dashboard → Edge Functions → notify-flag-status → Logs
   # See what triggered the function and when
   ```

---

#### If an attacker is spamming flags or creating abuse

**Scenario:** A user or bot is creating hundreds of flags in minutes, or flags with offensive content.

1. **Ban the attacker immediately:**
   ```bash
   # Supabase Dashboard → Authentication → Users
   # Find the user by email or ID
   # Click → Disable user
   # OR via SQL:
   UPDATE auth.users SET banned_until = NOW() + INTERVAL '90 days' WHERE id = '[attacker-id]';
   ```

2. **If you don't know the user ID:**
   ```bash
   # Supabase Dashboard → SQL Editor
   SELECT id, email, created_at FROM auth.users 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   # Look for recently created accounts that don't match real user patterns
   ```

3. **Delete the spam flags:**
   ```bash
   # Via Supabase Dashboard or SQL:
   DELETE FROM flags WHERE user_id = '[attacker-id]';
   DELETE FROM flag_photos WHERE flag_id IN (
     SELECT id FROM flags WHERE user_id = '[attacker-id]'
   );
   ```

4. **Disable flag creation temporarily (if attack is ongoing):**
   ```bash
   # Add a temporary trigger to the database:
   CREATE TRIGGER block_all_flags BEFORE INSERT ON flags
   FOR EACH ROW EXECUTE FUNCTION raise_exception('Flag creation disabled due to abuse');
   # (Gary will help with this if needed)
   ```

---

#### If an auth token or API key is leaked

**Scenario:** You find an anon key, service role key, or user JWT in git history, logs, or public code.

1. **Rotate IMMEDIATELY:**
   ```bash
   # Supabase Dashboard → Settings → API
   # Regenerate BOTH:
   # - anon key
   # - service role key
   ```

2. **Update all environments:**
   ```bash
   # Vercel Production & Preview
   # - NEXT_PUBLIC_SUPABASE_ANON_KEY
   # - SUPABASE_SERVICE_ROLE_KEY
   
   # GitHub Actions (if any secrets stored)
   # Settings → Secrets → update matching keys
   
   # Local .env files
   # Update and don't commit
   ```

3. **Check if the old key was used:**
   ```bash
   # Supabase Dashboard → Logs → filter for the old key
   # See if any unauthorized access occurred
   ```

4. **If the leak is in git history:**
   ```bash
   # DO THIS CAREFULLY — check with Morgan first
   git filter-branch --tree-filter 'rm -f .env' HEAD
   git push origin main --force-with-lease
   # This rewrites history and force-pushes. COORDINATE WITH TEAM FIRST.
   ```

---

### Step 2: Assess (within 1 hour)

Answer these questions with evidence:

1. **What data was accessed?**
   - GPS locations? Photo EXIF? User emails? Flag content?
   - Check Supabase logs and cross-reference with table structure

2. **How many users were affected?**
   ```bash
   # Count unique user_ids accessing data they shouldn't:
   SELECT COUNT(DISTINCT user_id) FROM logs 
   WHERE resource LIKE '%unauthorized%' AND created_at > NOW() - INTERVAL '1 hour';
   ```

3. **Is it still happening RIGHT NOW?**
   - Check Supabase → Logs in real-time
   - If YES, repeat CONTAIN step 1

4. **When did it start?**
   - Timestamp from logs
   - Correlate with code deployments, config changes

5. **How did it happen?**
   - RLS misconfiguration?
   - Missing input validation?
   - Exposed API key?
   - Social engineering?

---

### Step 3: Notify (within 24 hours of confirmed breach)

**GDPR requires notification within 72 hours if personal data was exposed.**

#### Who to notify

- **Affected users:** Send breach notification email
- **Supervisory authority (if EU):** File Data Protection Impact Assessment (DPIA) at your national DPA
- **App stores (if live):** Apple App Store, Google Play (if incident affects app security)
- **Sky:** Via Morgan immediately upon confirmation

#### Breach notification email template

```
Subject: Security Notice — AccessMap Account Protection Update

Dear AccessMap User,

On [DATE] at [TIME], we detected a security incident in AccessMap 
that may have exposed the following information:

[ ] GPS locations
[ ] Photo metadata (EXIF)
[ ] Flag content
[ ] Your email address
[ ] Profile information

What we found:
[Describe what happened in plain language]

What we did immediately:
[Describe containment actions]

What you should do:
1. Change your password at [link to reset]
2. Review your flag history at [link to flag settings]
3. Disable location sharing if you're concerned
4. Contact us if you have questions: [support email]

We apologize and are committed to preventing this in the future.

— AccessMap Security Team
```

#### GDPR notification (if applicable)

Contact your national Data Protection Authority. Example (Ireland):
```
Data Protection Commission
21 Lime Street
Dublin D01 1GA
Ireland

Subject: Data Breach Notification
```

---

### Step 4: Fix and Verify

1. **Write the fix:**
   - If RLS policy bug: correct the policy in Supabase Dashboard
   - If input validation missing: add validation in `src/lib/flags.ts` (Gary will review)
   - If key leaked: see Contain → Step 1

2. **Test on staging FIRST:**
   ```bash
   cd ~/AccessMap
   npm test
   # Run manual tests in staging Supabase
   ```

3. **Write a migration if DB schema changed:**
   ```bash
   # Create file: supabase/migrations/YYYY-MM-DD_HHmmss_description.sql
   # Example: "Add RLS policy to flags table"
   ```

4. **Deploy to production:**
   ```bash
   git checkout -b fix/security-incident-[name]
   git commit -am "security: fix [incident] — [brief description]"
   git push origin fix/security-incident-[name]
   # Open PR, get Gary's review, Shamus approves, Rory merges
   ```

5. **Verify the fix:**
   - Re-run Supabase security advisors: `Supabase Dashboard → SQL Editor`
   - Manually test the exploit is now blocked
   - Check logs for signs of continued attack

---

## P1 — High-Priority Incident Playbook

### Scope

- Single user's data exposed (not mass breach)
- Vulnerability found but not actively exploited
- Rate limit bypass, spam outbreak (> 10 reports)
- Weak auth discovered in code review

### Response

1. **Assess immediately (< 4 hours)**
   - Identify what data/user is affected
   - Check if vulnerability is being exploited
   - Document in Slack/notes with timestamps

2. **Fix and test on staging**
   - Don't push to production yet
   - Get Gary's review for correctness

3. **Deploy to production within same day**
   - Create PR, review with team
   - Shamus approves, Rory merges

4. **Notify affected user if personal data involved**
   - Email within 48 hours
   - Keep it brief and actionable

---

## P2 — Medium-Priority Incident Playbook

### Scope

- Limited spam/abuse (< 10 reports)
- Non-PII data leaked
- Rate limit bypass that's temporary or low-impact
- Config drift (e.g., missing security header)

### Response

1. **Assess (within 24 hours)**
   - Scope the problem
   - Document root cause

2. **Fix in next planned deploy**
   - Add to sprint backlog
   - Get Gary's code review
   - Deploy when ready

3. **Post-incident review optional**
   - Log findings in qa-reports if systemic

---

## P3 — Low-Priority Incident Playbook

### Scope

- Theoretical vulnerability with no exploit path
- Missing non-critical security header
- Potential future risk

### Response

1. **Log in backlog**
   - Assign to Gary for triage
   - Add to sprint planning

2. **Fix when convenient**
   - No urgency
   - Standard code review

---

## Common Incidents and Quick Fixes

### 🚨 Scenario 1: EXIF GPS data on uploaded photos

**Detection:** User reports location leaked from photo upload.

**Fix:**
```bash
# 1. Immediately block new uploads with EXIF:
# In src/lib/flags.ts, add EXIF stripping (see commit ea7732c)

# 2. Check if prior photos leaked GPS:
# Download a sample of uploaded photos from Supabase Storage
# Use online EXIF viewer or: exiftool image.jpg | grep GPS
# If GPS found: this is a P0 breach

# 3. Contact affected users individually with breach letter

# 4. Add EXIF stripping validation to upload form
```

**Reference:** `/Users/skypie/AccessMap/EXIF_SECURITY_CONTEXT.md`

---

### 🚨 Scenario 2: Rate limit bypass (spam flags)

**Detection:** Single user posts 50+ flags in 1 minute.

**Fix:**
```bash
# 1. Ban the user (see Contain → Step 1)

# 2. Verify rate limit is in place:
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%rate_limit%';

# 3. If trigger missing, apply migration:
# supabase/migrations/2026-05-30_flag_creation_rate_limit.sql

# 4. Test locally:
# - Create 5 flags quickly
# - 6th should fail with "too many requests"
```

---

### 🚨 Scenario 3: Auth token in git history

**Detection:** GitHub code scanning alerts on exposed JWT or key in old commit.

**Fix:**
```bash
# 1. Rotate the token IMMEDIATELY:
# - If anon key: Supabase Dashboard → Settings → API → Regenerate
# - If user JWT: user must re-authenticate

# 2. Check if used maliciously:
# Supabase Logs → filter for old token

# 3. Remove from git (COORDINATE WITH MORGAN FIRST):
git filter-branch --tree-filter 'rm -f .env' HEAD
git push origin main --force-with-lease

# 4. Add .env to .gitignore if not already
echo ".env" >> .gitignore
git add .gitignore && git commit -m "chore: ensure .env never committed"
```

---

### 🚨 Scenario 4: RLS policy missing or bypassed

**Detection:** Supabase advisor alert or manual test shows user can see another user's flags.

**Fix:**
```bash
# 1. Check the RLS policy:
# Supabase Dashboard → Tables → flags → RLS Policies

# 2. Correct policy should look like:
CREATE POLICY "Users can view their own flags"
  ON flags
  FOR SELECT
  USING (user_id = auth.uid());

# 3. If policy missing, add it immediately via SQL or Dashboard

# 4. Test:
# - Login as user A
# - Try to SELECT WHERE user_id = '[user B's ID]'
# - Should get 0 rows or error

# 5. Deploy fix in migration
```

---

### 🚨 Scenario 5: Webhook secret leaked / spam notifications

**Detection:** Notifications being sent without user action, or containing spam.

**Fix:**
```bash
# 1. Kill the function:
# Supabase Dashboard → Edge Functions → notify-flag-status → Delete

# 2. Regenerate webhook secret:
openssl rand -base64 32
# Add to Vercel env vars (or Supabase Settings → Environment)

# 3. Identify if webhook was called by attacker:
# Supabase Dashboard → Edge Functions → Logs
# See who called it and from where

# 4. Rewrite function with new secret before re-enabling:
# Only accept calls with valid HMAC signature
```

---

## Post-Incident Review

After **every P0 or P1** incident, write a post-mortem within 3 days.

**Location:** `~/AccessMap/qa-reports/YYYY-MM-DD_Steve_PostMortem_[incident-name].md`

**Template:**

```markdown
# Post-Mortem: [Incident Name]

**Date:** YYYY-MM-DD  
**Severity:** P0 / P1  
**Duration:** [HH:MM] from detection to containment  
**Owner:** Steve

## What Happened

[1-2 sentences describing the incident]

## Impact

- Users affected: [N]
- Data exposed: [types]
- Downtime: [duration]
- Revenue impact: [if any]

## Root Cause

[Why did this happen? Was it a code bug? Config? Human error?]

## Detection

How did we find out? (user report, monitoring alert, etc.)

## Response

Timeline of actions taken:
- [Time]: Action A
- [Time]: Action B

## Resolution

What permanent fix did we apply?

## Prevention

How do we prevent this in the future?
- Code change?
- Process change?
- Monitoring improvement?

## Action Items

- [ ] Deploy fix to production
- [ ] Update runbook (this file)
- [ ] Train team on prevention
- [ ] Notify affected users
```

---

## Monitoring & Detection

### Automated alerts to set up

Ask Gary to configure these in GitHub Actions or Supabase:

1. **RLS policy missing on public tables**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' 
   AND table_name NOT IN ('migrations', 'schema_migrations')
   AND NOT EXISTS (
     SELECT 1 FROM information_schema.role_table_grants
     WHERE table_name = tables.table_name AND privilege_type = 'SELECT'
   );
   ```

2. **Spike in flag creation (> 100/min)**
   - Supabase Dashboard → Logs → custom query

3. **Unauthorized queries (RLS violation attempts)**
   - Supabase logging to stdout/stderr

4. **Auth token in git**
   - GitHub → Settings → Security → Secret scanning (enabled by default)

---

## Escalation Chain

```
Incident reported
    ↓
Steve identifies severity (P0/P1/P2/P3)
    ↓
If P0: 
  ├→ Steve contains (15 min)
  ├→ Morgan notifies Sky immediately
  ├→ Rory assists with infrastructure (if needed)
  └→ Gary does code review (if fix needed)
    ↓
If P1:
  ├→ Steve assesses (4 hours)
  ├→ Morgan updates Sky
  ├→ Gary reviews any code fix
  └→ Rory deploys to production
    ↓
If P2/P3:
  └→ Log in backlog, standard sprint workflow
```

---

## Quick Reference: One-Liners

```bash
# Ban a user immediately
psql 'postgresql://...' -c "UPDATE auth.users SET banned_until = NOW() + INTERVAL '30 days' WHERE id = '[id]';"

# Check for recently created spam accounts
curl https://[project].supabase.co/rest/v1/auth/users \
  -H "apikey: [key]" | jq '.[] | select(.created_at > "'$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)'") | {id, email, created_at}'

# Disable RLS temporarily (EMERGENCY ONLY)
psql 'postgresql://...' -c "ALTER TABLE public.flags DISABLE ROW LEVEL SECURITY;"

# Re-enable RLS after fix
psql 'postgresql://...' -c "ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;"

# List all RLS policies on a table
psql 'postgresql://...' -c "SELECT * FROM information_schema.role_table_grants WHERE table_name='flags';"
```

---

## Links

- **Supabase Security Docs:** https://supabase.com/docs/guides/security
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **AccessMap codebase:** `/Users/skypie/AccessMap/`
- **Constitution & GDPR rules:** `~/.claude/CONSTITUTION.md`

---

## Version History

| Date | Changes | Owner |
|---|---|---|
| 2026-05-30 | Initial playbook, P0-P3 severity, GDPR notification | Steve |
