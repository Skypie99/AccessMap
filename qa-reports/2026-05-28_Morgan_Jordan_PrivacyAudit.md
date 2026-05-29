# PRIVACY + DATA AUDIT — AccessMap

**Delegated to:** Jordan (Privacy & Compliance)  
**Authority:** Morgan autonomous deployment (safe + scoped)  
**Timeline:** 45 min  
**Scope:** Phase 1 privacy gate — data handling, consent, compliance

---

## THE WORK

AccessMap collects location data (flags) + user activity (triage, achievements). Pre-launch privacy audit required (Constitution Art. 7.6 trigger).

---

## EXECUTION SCOPE

1. **Location data audit:**
   - How is flag location (lat/lng) stored? (Supabase public.flags table)
   - Who can read it? (RLS: all authenticated users read all flags; public anon read)
   - Retention: is there a deletion/anonymization policy? (check project CLAUDE.md)
   - Heatmap k-anonymity: confirmed k≥3 in code per PROJECT_STATE?

2. **User activity audit:**
   - What activity is logged? (flag reports, triage actions, achievements)
   - Where is it stored? (activity_feed table?)
   - Who can read it? (check RLS policies)
   - Is there a retention limit? (auto-delete after N days?)

3. **Personal data (PII) audit:**
   - What PII is collected? (email, display_name, avatar_url in auth + public.users)
   - Is it minimized? (only what's necessary for the app)
   - Can users delete their account + associated data? (check sign-out flow + cascade rules)

4. **Consent & disclosure:**
   - Is there a Privacy Policy? (check if linked in app + website)
   - Do users consent before location is collected? (check onboarding flow)
   - Are they told how location is used? (heatmap, aggregation, retention)

5. **Third-party data flow:**
   - Any external APIs sending user data? (maps, analytics, crash reporting)
   - Are they documented in Privacy Policy?

6. **Report:** qa-report to `~/AccessMap/qa-reports/2026-05-28_Jordan_PrivacyAudit.md`
   - Audit checklist: PASS / FAIL / NEEDS-ACTION for each category
   - Any **blockers** for launch?
   - Recommendations (before launch / post-launch nice-to-have)
   - Privacy Policy review needed? (check if current)

---

## SCOPE NOTES

Accessibility app that collects location data — users with disabilities trust you with sensitive info. Get this right.

---

## NEXT STEP

Audit all categories, identify blockers, report by Friday EOD.

---

**Morgan standing by. Privacy gate for launch. ✓**
