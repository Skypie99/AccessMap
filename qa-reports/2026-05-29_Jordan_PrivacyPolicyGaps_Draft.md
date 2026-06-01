# Jordan — Privacy Policy Gaps Draft Report

**Date:** 2026-05-29  
**Role:** Jordan (Legal/Privacy Advisor, Claude Corp)  
**Branch:** `jordan/privacy-policy-gaps-2026-05-29`  
**Mode:** PROPOSE-ONLY — no code modified, no DB writes, no external sends, no merges, no pushes  
**Prior report base:** `qa-reports/2026-05-29_Jordan_Cluster3_PrivacyReview.md`

---

> **LEGAL DISCLAIMER — MANDATORY, EVERY REPORT**
>
> I am Jordan, an AI privacy advisor. Nothing in this document constitutes legal advice. All findings are advisory and based on a technical reading of the code and publicly available summaries of PIPEDA, BC PIPA, and GDPR. Before acting on any finding here — especially before launching the app publicly, handling a real breach notification, or representing compliance to any regulator — you must consult a qualified privacy attorney licensed in your jurisdiction (British Columbia, Canada at minimum). I am not a lawyer. I cannot and do not guarantee legal compliance.

---

## Summary

This report documents the draft changes made to `docs/PRIVACY_POLICY.md` and `docs/SECURITY_INCIDENT_RESPONSE.md` on branch `jordan/privacy-policy-gaps-2026-05-29`, addressing the three privacy policy gaps and five incident-response conditions identified in the 2026-05-29 Cluster 3 review.

**No application code was modified.** `npm run typecheck` is not applicable — doc-only changes.

**This branch must NOT be merged to main.** It is a propose-only draft for Sky's review and completion of the `[SKY TO CONFIRM]` items below.

---

## Branch and Files Changed

| Branch | `jordan/privacy-policy-gaps-2026-05-29` |
|---|---|
| Base | `main` (commit `2a9bd86`) |
| Commit | `ac24259` |
| Files changed | `docs/PRIVACY_POLICY.md`, `docs/SECURITY_INCIDENT_RESPONSE.md` |
| Lines changed | +184 insertions, -28 deletions |
| Code files changed | None |
| typecheck required | No (doc-only) |

---

## [SKY TO CONFIRM] Checklist

These are the items Sky must fill in before either document can be published or treated as operationally complete. None can be invented or inferred from the repo.

### From docs/PRIVACY_POLICY.md

- [ ] **PP-CONFIRM-1 — Supabase server region**
  What is the region of your Supabase project? Check Supabase Dashboard → Settings → General → Region.
  Examples: `ca-central-1` (Canada, Montreal), `us-east-1` (United States), `eu-west-1` (Ireland).
  This determines whether the cross-border data transfer notice is required and which country's laws apply to your storage.

- [ ] **PP-CONFIRM-2 — Supabase DPA status**
  Has a Data Processing Agreement been signed with Supabase?
  - If YES: provide the DPA execution date so the policy can state it accurately.
  - If NO: the policy currently states "we have a DPA" — this claim must be removed or qualified until one is signed.
  Supabase offers a standard DPA for GDPR; see https://supabase.com/privacy for their current terms.

- [ ] **PP-CONFIRM-3 — Disability-inference consent screen**
  Does the current app present any consent or disclosure screen before the first flag submission explaining that submitting flag data may reveal disability status? If not, consider adding one before App Store submission. (Advisory — confirm requirement with legal counsel.)

- [ ] **PP-CONFIRM-4 — Support contact email**
  Two `[support email — Sky fills this in]` placeholders remain in the privacy policy (pre-existing from the original draft). This must be a real email address before any public launch. An empty contact point means PIPEDA breach notification obligations cannot be satisfied.

- [ ] **PP-CONFIRM-5 — EU targeting scope**
  Is AccessMap actively targeting EU/EEA users at launch? This determines whether GDPR is a hard legal requirement or a stretch goal. If Canada-only, several GDPR-specific sections can be marked as "not applicable at launch" to avoid over-promising compliance.

### From docs/SECURITY_INCIDENT_RESPONSE.md

- [ ] **IR-CONFIRM-1 — OPC registration strategy**
  Do you want to register a contact with the Office of the Privacy Commissioner of Canada (OPC) before launch, or rely on the reactive complaint mechanism? Accessibility apps with disability-adjacent data face heightened OPC scrutiny. Pre-registering is not required but demonstrates proactive compliance. See https://www.priv.gc.ca.

- [ ] **IR-CONFIRM-2 — BC IPC submission process**
  Review the BC IPC breach notification process at https://www.oipc.bc.ca/ before any incident occurs so the process is understood in advance. Confirm the current form/portal URL is accurate and bookmark it.

- [ ] **IR-CONFIRM-3 — Breach register location**
  Should the breach register live in `qa-reports/breach-register.md` (inside the repo) or in a separate private/restricted location? Given it may contain sensitive details about real security incidents, consider whether it belongs outside the repo.

- [ ] **IR-CONFIRM-4 — EU DPA contact for GDPR (if applicable)**
  If AccessMap targets EU users, confirm which national DPA is the lead supervisory authority (depends on EU establishment or majority user base). The plan currently uses Ireland as an example — this may or may not be correct.

- [ ] **IR-CONFIRM-5 — Support email in breach notification template**
  The breach notification email template contains `[SKY TO CONFIRM: support email]` — same as PP-CONFIRM-4 above. One decision resolves both.

---

## What Was Changed — Detail

### docs/PRIVACY_POLICY.md

| Gap | Section | Change |
|---|---|---|
| **PP-1 (Server Region)** | "How We Store & Protect Your Data → Storage Location" | Replaced bare `[region — Sky specifies before launch]` with a `[SKY TO CONFIRM]` placeholder that tells Sky exactly where to look (Supabase Dashboard → Settings → General → Region). Added a cross-border data transfer notice explaining PIPEDA implications of US storage (potential CLOUD Act requests, foreign law access) and disability-data sensitivity. |
| **PP-2 (DPA Status)** | "Sharing & Third Parties → Supabase (Cloud Provider)" | Replaced the existing assertion ("we have a DPA") with a conditional disclosure: if DPA is signed, states it with date; if not, discloses that the DPA is in progress. Added Jordan advisory note on when a DPA is legally required vs. best practice under Canadian law. |
| **PP-3 (Disability-Inference Disclosure)** | "What We Collect → When you report or verify a flag" | Added a callout explaining that the combination of flag location + category + user identity can infer disability status, that this is a voluntary submission, that it is publicly visible to all app users, and what users can do to avoid this inference. |
| **PP-3 (Disability-Inference — full section)** | New section: "Sensitive Personal Information — Disability and Accessibility Data" | Added a full dedicated section with: plain-language explanation of what data is shared, a protection table (EXIF stripping, no profiling, RLS, encryption), a candid "what we cannot protect against" (public flags are public), legal classification under PIPEDA/BC PIPA/GDPR, and a `[SKY TO CONFIRM]` item on whether a consent screen should be added before first flag submission. |
| Version and disclaimer | Header | Bumped to v1.1, added Jordan advisory draft disclaimer at top. |

### docs/SECURITY_INCIDENT_RESPONSE.md

| Condition | Section | Change |
|---|---|---|
| **IR-1 (PIPEDA/BC PIPA — HIGH)** | Step 3: Notify | Replaced the single GDPR-centric notification block with a full bi-jurisdictional section: PIPEDA RRSH assessment table with AccessMap-specific default assessment; OPC notification steps with URL; BC IPC notification steps with URL; complete "who to notify" matrix; updated breach notification email template with disability-inference language; breach record-keeping obligation (24 months / 2 years). |
| **IR-2 (Severity reclassification — MEDIUM)** | Severity Levels table | "EXIF GPS on 5 photos" example moved from P1 → P0 in the Examples column. Added explanatory note below the table explaining why: GPS + category + user identity = disability-inference data, which is presumptively RRSH for AccessMap regardless of number of users. |
| **IR-3 (git filter-branch annotation — LOW)** | P0 → If auth token/API key leaked → Step 4 | Added prominent comment: "SKY-ONLY MANUAL ACTION — DO NOT EXECUTE AS AN AUTOMATED AGENT ACTION" with Constitution reference. |
| **IR-4 (Absolute path fix — LOW)** | Scenario 1: EXIF GPS data → Reference | Replaced `/Users/skypie/AccessMap/EXIF_SECURITY_CONTEXT.md` with `./EXIF_SECURITY_CONTEXT.md` (repo-relative). |
| **IR-5 (GDPR Art. 34 + breach register — LOW)** | Step 3: Notify | Added GDPR Art. 34 data subject notification note alongside Art. 33. Breach register (Step 3c) is new and satisfies the PIPEDA 24-month record-keeping obligation — also serves as the GDPR Art. 33(5) documentation requirement. |
| Version history | Version History table | Added 2026-05-29 entry with full list of changes and Jordan advisory disclaimer. |
| Draft notice | Header | Added Jordan advisory draft notice at top of document. |

---

## Typecheck Note

No TypeScript or application source files were modified. `npm run typecheck` is not applicable to this branch. If Sky merges or cherry-picks any part of this branch, there is no typecheck requirement for the doc changes — but Sky should run `npm run typecheck` on the branch before any merge as a general best practice to confirm no unrelated TS errors exist.

---

## Pre-Launch Readiness After [SKY TO CONFIRM] Items Are Resolved

Once Sky completes all `[SKY TO CONFIRM]` items above and a qualified privacy attorney reviews both documents, the following pre-launch conditions from prior Jordan reviews will be satisfied:

| Prior Condition | Status After This Draft |
|---|---|
| PP-1: Server region disclosure | DRAFT READY — needs Sky's Supabase region input |
| PP-2: DPA status disclosure | DRAFT READY — needs Sky's Y/N confirmation + date |
| PP-3: Disability-inference disclosure | DRAFT COMPLETE — section written, no Sky input needed (except consent screen decision) |
| DSK-2: Server region (Decisions for Sky) | DRAFT READY — same as PP-1 |
| IR-1: PIPEDA/BC PIPA section | DRAFT COMPLETE — OPC + BC IPC sections added |
| IR-2: Severity reclassification | COMPLETE — EXIF GPS reclassified to P0 |
| IR-3: git annotation | COMPLETE — Sky-only annotation added |
| IR-4: Path fix | COMPLETE — absolute path → repo-relative |
| IR-5: GDPR Art. 34 + breach register | COMPLETE — both added |

**Remaining pre-launch blockers (unchanged from prior review):**
- DSK-1: OPC registration strategy (IR-CONFIRM-1 above)
- DSK-4: Support contact email (PP-CONFIRM-4 / IR-CONFIRM-5 above)

---

## Executive Summary (for Morgan to relay)

**Jordan — Privacy Policy Gaps Draft complete. 2026-05-29.**

Branch `jordan/privacy-policy-gaps-2026-05-29` contains draft fixes for the three privacy policy gaps and five incident-response conditions flagged in the Cluster 3 review. Two files changed: `docs/PRIVACY_POLICY.md` (server region, DPA status, and disability-inference disclosure sections added) and `docs/SECURITY_INCIDENT_RESPONSE.md` (full PIPEDA/BC PIPA section added with RRSH standard, OPC/BC IPC regulators, 24-month record-keeping, breach register; EXIF GPS reclassified from P1 to P0; git filter-branch annotated as Sky-only; absolute path fixed).

Five `[SKY TO CONFIRM]` items for the privacy policy and five for the incident plan require Sky's input before either document can be published. The two highest-priority items are: (1) Supabase server region — affects cross-border transfer disclosure and GDPR applicability; (2) support contact email — required before PIPEDA breach notification obligations can be satisfied. No application code was modified. No typecheck needed.

This branch must NOT be merged without Sky's review and completion of all `[SKY TO CONFIRM]` items, plus review by a qualified privacy attorney.

**This report is advisory only. All findings require review by a qualified privacy attorney before acting on them.**

---

*Report written by Jordan (AI Privacy Advisor, Claude Corp) — PROPOSE-ONLY mode. No code modified, no DB writes, no external sends, branch not pushed.*  
*Branch: `jordan/privacy-policy-gaps-2026-05-29` (local only — not pushed)*  
*Constitution Art. 7.6 triggers satisfied: #1 (location data), #2 (disability-related data)*  
*File: `/Users/skypie/AccessMap/qa-reports/2026-05-29_Jordan_PrivacyPolicyGaps_Draft.md`*
