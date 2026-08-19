# Flagstone On-Call Runbook

**Owner:** SRE team (Devon + Riley)  
**Last updated:** 2026-05-29  
**Scope:** Production incident response, escalation paths, and first-responder steps.

---

## Severity Definitions

| Level | Name | Definition | Response SLA |
|-------|------|------------|--------------|
| **P0** | Critical | Total outage — app unusable for all users (auth broken, map blank, data loss) | Page immediately. First response < 5 min. Fix or mitigate < 30 min. |
| **P1** | High | Core feature broken for a significant % of users (flag creation fails, tasks broken) | Page on-call. First response < 15 min. Fix < 2 hrs. |
| **P2** | Medium | Degraded experience, workaround exists (photo uploads slow, filter chip missing) | Ticket same day. Fix < 24 hrs. |
| **P3** | Low | Cosmetic or edge-case issue affecting <1% of users | Ticket. Fix in next sprint. |

---

## Dashboards and Tools

| Resource | URL / command |
|----------|---------------|
| Supabase dashboard | https://supabase.com/dashboard — select the Flagstone project |
| Supabase logs (real-time) | Dashboard → Logs → API / Auth / PostgREST |
| EAS Build status | https://expo.dev — Builds tab |
| GitHub Actions CI | https://github.com/skypie/AccessMap/actions |

---

## First-Responder Checklist (any P0/P1)

1. **Acknowledge** the alert. Post in the incident Slack channel (or iMessage Sky directly for P0 after-hours).
2. **Check Supabase** API logs for 4xx/5xx rates. Compare to baseline. NOTE: there is no crash-telemetry tool. No crash reporter ships, by design and per both privacy policies, so app-side crashes surface only through user reports and App Store Connect crash logs.
4. **Identify scope** — is it affecting all users or a subset (platform, auth state, region)?
5. **Check recent deployments** — last EAS build? last merge to main? Rollback if correlated.
6. **Mitigate first, root-cause second** — a rollback or feature-flag disable buys time.
7. **Document** what you find in the incident channel as you go. Morgan needs a timeline.

---

## Failure Mode Playbooks

### Supabase Completely Down

**Symptoms:** All API calls fail with network/5xx. Supabase logs show an `AuthApiError` or `PostgrestError` flood.

**Steps:**
1. Check https://status.supabase.com — if a platform incident, wait and subscribe to updates.
2. If a project-specific issue: check Supabase Dashboard → Logs → PostgREST for error details.
3. If stuck for > 15 min with no Supabase status update, escalate to Sky (P0 call).
4. Do NOT apply migrations or schema changes during an active outage.

**Recovery:** Once Supabase recovers, verify auth flow end-to-end with a test account. Check flag creation and photo upload.

---

### Edge Function Errors Spiking

**Symptoms:** Supabase Logs → Edge Functions shows failures from `supabase/functions/*`.

**Steps:**
1. Check Edge Function logs in the Supabase Dashboard → Functions tab.
2. Identify the failing function and the error. Common causes:
   - Unhandled exception in function code
   - Missing/expired environment secret (check Dashboard → Project Settings → Secrets)
   - Timeout (default 150 s — check if the function is doing too much)
3. If a code bug: hotfix on a branch, deploy via `supabase functions deploy <name>`.
4. If a secret/config issue: rotate or re-add the secret in the dashboard (no code deploy needed).
5. If timeout: check for N+1 queries or slow external calls in the function.

**Recovery:** Re-run a synthetic request after the fix. Verify the Supabase log error rate drops.

---

### App Crash Spike (Mobile)

**Symptoms:** A new crash type is reported by users or appears in App Store Connect crash logs. There is no in-app crash reporter, so expect this signal to lag.

**Steps:**
1. Open App Store Connect → your app → Analytics/Crashes, or collect the reporting user's device and OS version. Identify the crash.
2. Check the stack trace. Is it in our code or a React Native / Expo runtime crash?
3. Check git log: what merged to main in the last 24 hours?
4. If correlated with a deploy: **use EAS to submit the previous build** to TestFlight/App Store as a rollback (Rory owns this step).
5. If no deploy correlation: check if it's device-specific (iOS version, screen size) or universal.
6. Disable the related feature flag (`HEATMAP_ENABLED`, etc.) if the crash is isolated to one feature.

**Recovery:** Verified when App Store Connect's crash rate returns to baseline (< 0.1% of sessions). That signal lags, so also confirm directly with the reporting users.

---

### Auth Broken (Users Cannot Sign In)

**Symptoms:** `signInWithEmail` / `signUpWithEmail` return errors for all users. Supabase Auth logs show an `AuthApiError` flood.

**Steps:**
1. Check Supabase Dashboard → Auth → Users. Can you see the user list (confirms DB is up)?
2. Check Supabase Dashboard → Logs → Auth for specific error.
3. Common causes:
   - Supabase project paused (free-tier projects pause after inactivity — unpause in dashboard)
   - JWT secret rotation (check Dashboard → Project Settings → API)
   - RLS policy on `public.users` blocking the `handle_new_user` trigger
4. For RLS issues: use the Supabase SQL editor under a privileged role to bypass RLS and test manually.
5. If Supabase project is paused: click "Restore" in the dashboard. Takes 1–2 min.

**Recovery:** Sign in with a test account end-to-end. Verify Profile tab shows points and display name.

---

## Escalation Path

```
Devon / Riley (first responders)
  → Sky (P0 only, after-hours; P1 if no resolution in 30 min)
  → Supabase support chat (if platform-level issue confirmed)
  → Expo support (if EAS build/update pipeline is the failure)
```

For P0s: Sky's contact is in the team contacts doc (do not publish here).

---

## Post-Incident (all P0/P1)

Within 24 hours of resolution:
1. Write a blameless post-mortem (timeline, root cause, impact, fix, prevention).
2. File action items as GitHub issues with `incident` label.
3. Update this runbook if the failure mode wasn't covered or steps were wrong.

Post-mortem template: `docs/runbooks/postmortem-template.md` (create when first needed).
