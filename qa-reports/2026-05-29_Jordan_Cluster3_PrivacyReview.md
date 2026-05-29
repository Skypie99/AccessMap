# Jordan — Cluster 3 Privacy Review
**Date:** 2026-05-29  
**Role:** Jordan (Legal/Privacy Advisor, Claude Corp)  
**Scope:** Phase-0 privacy review — Cluster 3, triggered by Morgan per Const. Art. 7.6  
**Branches reviewed:** `fix/security-hardening-2026-05-30` · `docs/incident-response-2026-05-30-steve`  
**Mode:** READ-ONLY / PROPOSE-ONLY — no code modified, no DB writes, no external sends  
**Const. Art. 7.6 triggers fired:** #4 (RLS/data handling change — rate-limit migration) + #2 (disability-adjacent data) + #1 (location data)

---

> **LEGAL DISCLAIMER — MANDATORY, EVERY REPORT**
>
> I am Jordan, an AI privacy advisor. Nothing in this document constitutes legal advice. All findings are advisory and based on a technical reading of the code and publicly available summaries of PIPEDA, BC PIPA, and GDPR. Before acting on any finding here — especially before launching the app publicly, handling a real breach notification, or representing compliance to any regulator — you must consult a qualified privacy attorney licensed in your jurisdiction (British Columbia, Canada at minimum). I am not a lawyer. I cannot and do not guarantee legal compliance.

---

## OVERALL VERDICT

| Item | Verdict |
|---|---|
| Rate-limit migration (`2026-05-30_flag_creation_rate_limit.sql`) | **APPROVE WITH CONDITIONS** |
| Incident response / GDPR notification plan (`docs/SECURITY_INCIDENT_RESPONSE.md`) | **APPROVE WITH CONDITIONS** |
| Privacy Policy draft (`docs/PRIVACY_POLICY.md`) | **APPROVE WITH CONDITIONS** (noted below as bonus review) |

No item is a hard BLOCK. The migration is technically sound for privacy. The incident plan is directionally correct but has specific gaps for Canadian law (PIPEDA) that require conditions before it can be treated as a real operational playbook. No disability data, location data, or PII is newly collected or exposed by either item.

---

## DECISIONS FOR SKY

The following items require Sky's decision before the incident plan can be treated as operationally complete. These are not launch blockers for the rate-limit migration itself, but they are blockers for calling the incident response plan "ready."

| # | Decision Needed | Why |
|---|---|---|
| **DSK-1** | Confirm PIPEDA breach notification strategy: do you want to register a contact with the Office of the Privacy Commissioner (OPC) before launch, or rely on the reactive complaint mechanism? | The current plan names GDPR DPA but has no equivalent OPC step. Accessibility apps in Canada with disability-adjacent data have heightened OPC scrutiny. |
| **DSK-2** | Confirm Supabase server region. The privacy policy placeholder says "[region — Sky specifies before launch]." This affects whether EU GDPR applies (servers in Ireland / EU vs. US). If servers are US-based, GDPR compliance requires a Data Processing Agreement (DPA) with Supabase and, if EU users are targeted, Standard Contractual Clauses. | |
| **DSK-3** | Confirm whether AccessMap actively targets EU users. If yes, the GDPR notification obligations in the incident plan trigger fully. If Canada-only (which is the intended scope), GDPR is a stretch goal, not a hard requirement; the plan should say so explicitly to avoid over-promising compliance. | |
| **DSK-4** | Confirm the support contact email. The privacy policy has two `[support email — Sky fills this in]` placeholders. This must be resolved before any public launch. An empty contact point means breach notification obligations under PIPEDA cannot be satisfied. | |

---

## PART 1 — RATE-LIMIT MIGRATION REVIEW

**File:** `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql`  
**Content:** 40 lines. Creates a `SECURITY DEFINER` trigger function `check_flag_rate_limit()` that counts `flags` rows for `auth.uid()` in the last 24 hours. If count >= 20, raises an exception. Attaches as a `BEFORE INSERT` trigger on `public.flags`.

### 1a. Does the migration log, store, or expose new PII?

**No.** The migration does not:
- Create a new table
- Add a new column
- Log user IDs, IP addresses, or timestamps anywhere
- Write to any audit log table

The trigger uses `auth.uid()` transiently in a local variable (`flag_count INTEGER`) to run a `COUNT(*)`. This value is never persisted or returned to the client. No new data is written to disk by this migration.

**Existing data touched:** The trigger reads `flags.user_id` and `flags.created_at` — columns that already exist on the table and have been through prior privacy review (see `2026-05-28_Jordan_SQL-D1-D4-Privacy.md`). No new columns are added.

**Error message surface:** The exception message `Rate limit exceeded: maximum 20 flags per 24 hours` does not expose user identity, location, or disability data. It is an appropriate operational error.

### 1b. PII / data-retention / consent implications

| Dimension | Finding | Risk |
|---|---|---|
| **IP address** | Not collected. Supabase may log IPs at the infrastructure level (connection logs), but this migration adds nothing to that baseline. | NONE — migration-level |
| **User identifiers** | `auth.uid()` is used in-flight, not stored. No UUID is persisted by this function. | NONE |
| **Timestamps** | `NOW() - INTERVAL '24 hours'` is a rolling window computed in memory. No new timestamp column is written. | NONE |
| **Data minimization (PIPEDA Sch. 1, Principle 4)** | The trigger queries only `user_id` and `created_at` — the minimum needed to enforce the rate limit. This is compliant with the data-minimization principle. | PASS |
| **Consent** | No new data is collected that requires consent. Rate-limiting is an operational security measure, not a data use that requires user consent. | NOT APPLICABLE |
| **Retention** | The trigger operates on the existing `flags` table retention policy. The flag rows that the trigger counts were already being retained under existing policy. No additional retention is introduced. | NONE |

### 1c. PIPEDA concerns (Canadian context)

PIPEDA (Canada) and BC PIPA require that personal information not be used for purposes beyond what was disclosed to users. Counting a user's own flag submissions for rate-limiting purposes is an operational security use that falls within "reasonable purposes" and does not require separate disclosure. However, the privacy policy should note that usage data may be used to prevent abuse — this is already addressed in the existing draft policy ("App usage — which screens you visit"). The rate-limiting function is consistent with that disclosure.

**One note:** The `SECURITY DEFINER` attribute means the function runs with elevated privileges (the Supabase service account, not the calling user). This is the correct and secure pattern for a rate-limiting trigger, but it does mean the function can read `flags` rows beyond what RLS would normally allow for the authenticated user. In this case the query is scoped to `WHERE user_id = auth.uid()`, so the privilege elevation is constrained correctly. No other user's data is accessible via this function.

### 1d. Heightened-sensitivity considerations (disability + location data)

AccessMap stores two categories of data that are heightened-sensitivity under Canadian law:
- **Location data** (`flags.lat`, `flags.lng`) — precise geographic coordinates
- **Disability-adjacent data** — flag categories and descriptions describing accessibility barriers, associated with a `user_id` (reporter)

The rate-limit trigger does NOT read, expose, or aggregate either of these fields. It reads only `user_id` (UUID) and `created_at` (timestamp). The sensitive fields are irrelevant to the rate-limit computation.

**No heightened-sensitivity risk from this migration.**

### 1e. Conditions

**Condition RL-1:** Before applying this migration in production, confirm that Supabase infrastructure-level logs (not application logs — the Supabase connection/request logs at the platform level) do not retain `user_id` values from trigger function execution in a way that creates a new identifiable log line tied to rate-limit events. This is an infrastructure question for Rory to confirm with Supabase's logging documentation — not a blocker to applying the migration, but should be documented in the runbook.

---

## PART 2 — INCIDENT RESPONSE / GDPR PLAN REVIEW

**File:** `docs/SECURITY_INCIDENT_RESPONSE.md`  
**Content:** Full P0–P3 incident playbook with breach notification procedures, email template, GDPR escalation reference.

### 2a. GDPR coherence

The plan's Step 3 (Notify) states: "GDPR requires notification within 72 hours if personal data was exposed." This is directionally accurate for GDPR Article 33 (supervisory authority notification) but incomplete:

| GDPR Requirement | Plan Status | Gap |
|---|---|---|
| 72-hour supervisory authority notification | Stated correctly | Incomplete: applies only when breach is "likely to result in a risk to the rights and freedoms of natural persons." Not every breach triggers this. |
| Article 34 notification to data subjects | Not mentioned | Gap: GDPR also requires data subject notification "without undue delay" when the breach is "likely to result in a high risk" (higher bar than Art. 33). The plan's email template is appropriate but the triggering threshold is not explained. |
| DPA contact (Ireland example given) | Ireland DPC listed as example | Potentially misleading if servers are not EU-hosted. If Sky is Canada-only with no EU targeting, listing a specific EU DPA as "example" may cause confusion during a real incident. |
| Documentation obligation (Art. 33(5)) | Not mentioned | GDPR requires documenting ALL breaches even if not reportable. The post-incident review template captures root cause and timeline, which partially satisfies this, but it should be explicit that a breach register must be maintained. |

### 2b. PIPEDA coherence (Canadian primary obligation)

This is the most significant gap in the current plan.

**PIPEDA breach obligations under the 2018 amendments (PIPEDA Breach of Security Safeguards Regulations):**

| PIPEDA Requirement | Plan Status | Gap |
|---|---|---|
| Report to OPC when breach poses "real risk of significant harm" (RRSH) | **Not mentioned at all** | HIGH SEVERITY GAP. The plan mentions GDPR 72 hours and EU DPAs but contains zero reference to the Office of the Privacy Commissioner of Canada (OPC), which is the primary regulator for Sky's app. |
| Report to OPC "as soon as feasible" (no fixed hour window — different from GDPR 72 hrs) | Not mentioned | The plan implies a 72-hour window (GDPR) but PIPEDA uses "as soon as feasible" — which may be faster or slower depending on circumstances. |
| Notify affected individuals "as soon as feasible" when RRSH exists | Partially covered (email template) | The email template is good but the triggering threshold (RRSH assessment) is not documented. |
| Maintain a breach record for ALL security incidents (even non-reportable ones) for 24 months | Not mentioned | The plan has a post-mortem template but does not say these records must be kept for 24 months. |
| RRSH factors: sensitivity of info, probability of misuse, number of individuals affected | Not mentioned | For AccessMap specifically, location + disability-adjacent data are among the highest-sensitivity categories — a breach of even one user's GPS history tied to disability status could easily meet the RRSH threshold. |

**Assessment:** The incident plan is written GDPR-first and PIPEDA-second. Given that AccessMap is a Canadian product (Sky is in BC), this priority is inverted. The GDPR section is more detailed than the Canadian section (which does not exist). Before this document can be treated as a real operational playbook, it needs a dedicated PIPEDA section.

### 2c. BC PIPA

BC PIPA (Personal Information Protection Act) is British Columbia's private-sector privacy law and supersedes PIPEDA for BC-collected, BC-controlled data. It has similar but not identical breach notification obligations. The current plan does not mention BC PIPA at all. Given Sky is in BC, this is a material omission.

Key BC PIPA difference: BC PIPA requires notification to the BC Information and Privacy Commissioner (IPC) for significant breaches — a separate regulator from the OPC. The plan currently has no entry for either Canadian regulator.

**This does not block the rate-limit migration or a software merge. It is a documentation gap in an ops runbook.**

### 2d. Heightened-sensitivity data — what a breach of AccessMap data means

The incident plan lists "GPS locations" and "Photo metadata (EXIF)" in the breach notification email template. This is good. But it does not explain to the team why these are heightened-sensitivity:

- **Location data tied to disability context:** A flag submitted by a user includes lat/lng + a disability-category description. If that user's email is also exposed, you have: "This person (email X) reported an inaccessible location (lat/lng) indicating they have a mobility impairment." This is a combined disclosure of location + disability status — which under Canadian law (and GDPR Art. 9) is special-category health/disability data tied to an identifiable person. A breach of even a small number of these records likely meets RRSH under PIPEDA.
- **The P1 example in the plan** reads: "EXIF GPS on 5 photos." Under AccessMap's data sensitivity, 5 photos with GPS + user_id + disability category could be a P0-level privacy incident, not P1. The severity classification should reflect the sensitivity of the underlying data combination.

### 2e. The `git filter-branch` instruction

The plan contains:
```bash
git filter-branch --tree-filter 'rm -f .env' HEAD
git push origin main --force-with-lease
```

This is correct as an incident-response tool for key rotation, but it violates the Claude Corp Constitution's absolute rule: **never modify main without Sky's explicit approval.** The plan is written as a human-executable runbook (not an agent runbook), so this rule technically does not apply to Steve or Sky manually executing it — but it should be annotated clearly as a "Sky-only action" to prevent an agent from executing it autonomously during a background incident-response loop.

**Condition IR-3 (below) addresses this.**

### 2f. "EXIF_SECURITY_CONTEXT.md" reference

The plan references `/Users/skypie/AccessMap/EXIF_SECURITY_CONTEXT.md` in Scenario 1. That is an absolute local path — it will not work for any other team member and will fail if the repo is cloned to a different path. This should be a repo-relative path: `./EXIF_SECURITY_CONTEXT.md` or `docs/EXIF_SECURITY_CONTEXT.md` (or the file should be moved to docs/).

### 2g. Conditions for incident-response plan

**Condition IR-1 (HIGH):** Add a dedicated **PIPEDA/BC PIPA section** before Step 3 (Notify) that:
- Names the OPC (federal) as the primary Canadian breach regulator
- Names the BC IPC as the BC-specific regulator
- States the "as soon as feasible" reporting standard (not 72 hours)
- Lists the RRSH factors (sensitivity, probability of misuse, number affected)
- States that AccessMap's location + disability-adjacent data combination is presumptively high-sensitivity, meaning most breaches involving more than one user's flag data will likely meet the RRSH threshold
- States the 24-month breach record-keeping obligation

**Condition IR-2 (MEDIUM):** Update the severity classification table. The example "EXIF GPS on 5 photos → P1" should be flagged as potentially P0 for AccessMap given the disability-data context. Add a note: "For AccessMap, any exposure of GPS + user identity + flag category should be treated as P0 regardless of number of users, pending RRSH assessment."

**Condition IR-3 (LOW):** Annotate the `git filter-branch` + `git push origin main --force-with-lease` snippet with: "Sky-only manual action. Do not execute as an automated agent action." This prevents a future agent operating in BACKGROUND mode from interpreting this as an allowed operation.

**Condition IR-4 (LOW):** Replace the absolute path `/Users/skypie/AccessMap/EXIF_SECURITY_CONTEXT.md` with a repo-relative path.

**Condition IR-5 (LOW):** Add a GDPR Article 34 row to the notification table (data subject notification when high risk), and add a "breach register" requirement noting records must be kept for 24 months (PIPEDA) / 2 years (BC PIPA).

---

## PART 3 — PRIVACY POLICY DRAFT (BONUS REVIEW)

The `docs/PRIVACY_POLICY.md` on the branch is a good draft. As it is already labeled "Draft — requires legal review before launch," I am reviewing it for Jordan-tier issues only (not endorsing it as legally compliant).

### Strengths
- Correctly disclaims itself as a draft
- Covers PIPEDA, GDPR, CCPA, BC PIPA explicitly
- EXIF stripping section is accurate and specific
- Data retention table is concrete and time-bounded
- User rights (access, deletion, correction) are all listed

### Gaps requiring attention before launch

**PP-1 (HIGH — PIPEDA):** The policy states user data "is stored by Supabase" with "[region — Sky specifies before launch]." The region must be filled in before launch. If Supabase servers are in the US, PIPEDA requires disclosing cross-border data transfers and the country to which data is transferred. Many Canadian users have heightened sensitivity to US storage of disability-related data (potential law enforcement access under US law). This requires Sky's decision (DSK-2 above).

**PP-2 (MEDIUM — GDPR):** The policy describes a "Data Processing Agreement with Supabase ensuring GDPR/CCPA compliance." As of this review, it is not confirmed that this DPA is in place. If it is not executed, this claim is inaccurate. Sky should verify the DPA status with Supabase before launch (DSK-2).

**PP-3 (MEDIUM — Disability Data Disclosure):** The policy does not explicitly disclose that flag data (location + category + description) can be used to infer the reporter's disability status. Under PIPEDA, collecting disability-adjacent information requires an explicit disclosure of purpose. The current policy says location and description are collected for "placed as a marker on the map" — which is accurate but does not acknowledge that the combination constitutes sensitive personal information. Recommend adding: "Flags you submit, including location and accessibility category, may indicate information about your disability status or mobility needs. This information is submitted voluntarily and is visible to all users of the app."

**PP-3 (LOW — Children):** The policy states the app is "not directed at children under 13." However, accessibility apps are frequently used by caregivers and parents reporting barriers on behalf of children with disabilities. The policy should address whether data about a third party (e.g., the parent reports a barrier for their child's wheelchair) is handled differently. This is edge-case but relevant to the disability context.

**PP-4 (LOW — Audit Logs):** The retention table states "Audit logs (for security) — 30 days." The rate-limit migration does not add audit logs, but if audit logging is added later (a recommendation I have made in prior reports), the privacy policy retention table must be updated to match. The 24-month PIPEDA breach record obligation also conflicts with the 30-day log retention if breach-record logs are stored in the same system.

---

## SUMMARY TABLE

| # | Item | Verdict | Conditions | Priority |
|---|---|---|---|---|
| RL | Rate-limit migration | APPROVE WITH CONDITIONS | RL-1 (infra logging confirmation) | LOW |
| IR | Incident response plan | APPROVE WITH CONDITIONS | IR-1 (PIPEDA/BC PIPA section), IR-2 (severity reclassification), IR-3 (git annotation), IR-4 (path fix), IR-5 (GDPR Art 34 + breach register) | IR-1 HIGH / others LOW–MEDIUM |
| PP | Privacy policy draft | APPROVE WITH CONDITIONS (pre-existing draft) | PP-1 (server region), PP-2 (DPA verification), PP-3 (disability disclosure), PP-4 (audit log retention) | PP-1/PP-2 HIGH before launch |
| DSK | Decisions for Sky | — | DSK-1 (OPC strategy), DSK-2 (server region/DPA), DSK-3 (EU targeting), DSK-4 (support email) | DSK-1/DSK-2 HIGH |

---

## EXECUTIVE SUMMARY (for Morgan to relay)

**Jordan — Cluster 3 Phase-0 Review complete. 2026-05-29.**

The rate-limit migration is privacy-safe: it stores no new PII, uses `auth.uid()` only transiently, reads only user_id + created_at, and adds no new data surface. APPROVE WITH one low-priority condition (confirm Supabase infra logs do not create a new PII log line from trigger execution).

The incident response plan is directionally correct but was written GDPR-first. For a Canadian product (Sky in BC), this is inverted: there is no mention of the OPC (federal breach regulator) or the BC IPC (provincial regulator), and the RRSH standard and 24-month record-keeping obligation under PIPEDA are absent. These are documentation gaps, not code bugs — but the plan cannot be called operationally ready until IR-1 is addressed. APPROVE WITH CONDITIONS.

Four items require Sky's decision before launch (DSK-1 through DSK-4): OPC registration strategy, Supabase server region and DPA status, EU targeting scope, and support contact email. None blocks the rate-limit migration merge. All block calling the incident plan complete.

No disability data, location data, or PII is newly collected or exposed by either item under review.

**This report is advisory. All findings require review by a qualified privacy attorney before acting on them.**

---

*Report written by Jordan (AI Privacy Advisor, Claude Corp) — PROPOSE-ONLY mode. No code was modified, no DB was written to, no external messages were sent.*  
*Constitution Art. 7.6 triggers satisfied: #1 (location), #2 (disability), #4 (RLS/data change).*  
*File: `/Users/skypie/AccessMap/qa-reports/2026-05-29_Jordan_Cluster3_PrivacyReview.md`*
