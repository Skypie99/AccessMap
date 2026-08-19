# Morgan — AccessMap: Distance to App Store Submission

```yaml
date: 2026-08-03
role: Morgan (Project Manager)
mode: ACTIVE (direct /morgan invocation)
model_tier: Opus 5 (Sky-initiated, surge window expired — direct invocation, Const. CLAUDE.md Opus rule satisfied by Sky starting it)
scope: READ-ONLY. No commit, checkout, merge, build, test run, live-DB query, or external send performed.
delta_vs: 2026-08-02 (career-arsenal/roadmap/2026-08-01/03_CRITICAL-PATH-APP-STORE.md)
coherence_score: 0.94
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
```

## ANSWER IN ONE LINE

**4.6 hours of Sky's hands — 5.3 to be not-embarrassing. Zero agent work remains. The constraint is serialization, not hours.**

---

## §1 DEPENDENCY GRAPH

```
nodes:
  - sky/appstore#step-0   (Sky, rotate reviewer credential)          0.10 h  HANDS-ONLY
  - sky/appstore#step-0b1 (Sky, decide createAnonFlag filter)        0.10 h  decide
  - sky/appstore#step-0b2 (Sky, Terms deletion sentence)             0.25 h  decide + token-cheap build
  - sky/appstore#step-1   (Sky, ff-merge ui-polish + push)           0.20 h  HANDS-ONLY
  - sky/appstore#step-2   (Sky, first EAS testflight build)          0.50 h  HANDS-ONLY  ★ HINGE
  - sky/appstore#step-3   (Sky, device sitting DEVICE-SCRIPT §C)     1.05 h  HANDS-ONLY
  - sky/appstore#step-4   (Sky, App Store Connect forms)             1.50 h  HANDS-ONLY
  - sky/appstore#step-5   (Sky, Accessibility Nutrition Labels)      0.40 h  HANDS-ONLY
  - sky/appstore#step-6   (Sky, screenshots 6.9" + 6.5")             1.00 h  HANDS-ONLY
  - sky/appstore#step-7   (Sky, submit)                              0.20 h  HANDS-ONLY

edges:
  - step-0   → step-4   (gate: new creds must exist before review-notes field is filled)
  - step-0b1 → step-1   (gate: must land before merge to be in v1)
  - step-0b2 → step-1   (gate: must land before merge to be in v1)
  - step-1   → step-2   (gate: nothing ships unmerged)
  - step-2   → step-3   (gate: a binary must exist)
  - step-3   → step-5   (gate: declare only rows actually verified on device)
  - step-3   → step-6   (gate: real screens to capture)
  - step-2   → step-4   (partial: ASC forms fillable in parallel with build queue, except review notes)
  - step-4   → step-7
  - step-6   → step-7
acyclic: true
```

**Shape in one line:** `0 → 0b → 1 → 2 → {3 → 5, 3 → 6} → 4 → 7`

---

## §2 REASON FOR ORDERING

- **Step 0 first — it closes two blockers with one act.** Rotation ends the estate's only live exploitable exposure (S-1/XR-25) *and* satisfies Apple 2.1(a) working-demo-creds. Cite: `03_CRITICAL-PATH-APP-STORE.md §3.3`; `security-audit/2026-07-31/phase-b/FORK_S1_credential_rotation.md` §"THE ORDER MATTERS".
- **Rotate before purging in-tree copies.** Purging first is theatre in the wrong order. Cite: `FORK_S1` Step 1 → Step 2.
- **Step 1 is one fast-forward because the security train is an ancestor of the polish train.** `sec/phase-b-hardening-2026-07-31` (11 commits) is inside `ui-polish/…` (22 commits). Verified this run: `git merge-base --is-ancestor` → true; `0 22` ahead/behind. Cite: `evidence/02_accessmap-nonship.md` §0.2.
- **LEARNINGS:2026-05-23 — Merge-on-done > stacking branches.** The learning's own auto-land checklist (no conflict · tsc green · jest green · no protected path) is satisfied at the `ui-polish` tip per `qa-reports/2026-08-01_AccessMap_PreShip_UI_Polish_Report.md` §QA floor (200 suites / 2923 passed / 0 failed). This is exactly the stacked-branch cascade the learning warns about — 52 of 58 local branches are already merged; one branch is the whole backlog.
- **Step 2 is the hinge and must happen early, not late.** It is the step most likely to surprise (SR-021: no binary-launch evidence has ever existed) and it is only 30 minutes. Cite: `ship-ready/12_READY_OR_NOT.md §2″` SR-021.
- **Steps 5 and 6 are downstream of step 3 for honesty reasons, not technical ones** — you may only declare accessibility rows you actually verified on hardware. Cite: `ship-ready/04_appstore_readiness.md §A-6`.
- **Screenshots are iPhone-only.** `supportsTablet: false` verified at `main:app.json` this run — the 13″ iPad set is retired.

### Jordan-trigger check (Const. Art. 7.6)

| Node | Triggers fired | Verdict |
|---|---|---|
| step-0 credential rotation | none (single-account password change, not an auth-architecture change) | skip Jordan |
| step-0b1 `createAnonFlag` filter | none — content filter, no new persistence or identity handling | skip Jordan (moderation-policy call is Sky's per `05 §3 ⑯`) |
| step-1 merge / step-2 build / step-6 screenshots | none | skip Jordan |
| **step-4 ASC privacy nutrition labels** | **location data · PII beyond auth** | **Jordan advisory** — answers are pre-written (`§A-Sheet-A`), but they are a binding public privacy declaration covering precise location. One read-through before filing. |
| **Sentry over-disclosure (off-path, see §3)** | **external processor claim for user data** | **Jordan advisory** — policy names a processor that does not exist in code |
| **`[01]AM-22` k≥3 promise (off-path)** | **disability data · privacy promise** | **Jordan required before any reword** — roadmap §3.5a concurs |

---

## §3 BLOCKED NODES

- `{node: step-0b1 createAnonFlag filter, why: "createAnonFlag (main:src/lib/flags.ts:1740) never calls containsBlockedTerm — the only call site is :1207 inside createFlag (:1183). The entire Apple 1.2(a) submit-time filter is bypassed by reporting anonymously, which is the cohort an App Review reviewer occupies by default.", unblock: "Sky says yes → one-line filter call", type: DECISION_FOR_SKY}`
- `{node: step-0b2 Terms deletion sentence, why: "main:src/lib/copy.ts:621 states 'You can delete your account any time in Settings.' The control is on Profile. VERIFIED THIS RUN: the live privacy policy already says 'Profile > Delete Account' — so two published documents contradict each other in the doc Apple reads under 1.2.", unblock: "Sky ratifies the one-word fix", type: DECISION_FOR_SKY}`
- `{node: admin-tab-renders-for-nobody, why: "main:src/lib/admin.ts:27 does .select('is_admin'); the security audit's live read records is_admin as not SELECT-able by authenticated. The 1.2(b) takedown lever exists in SQL but through a screen that renders for no account, including Sky's.", unblock: "one read-only grant check settles it; then Sky decides (0.25 h), an agent can fix", type: DECISION_FOR_SKY}`
- `{node: step-2 first EAS build, why: "SR-021 — no binary-launch evidence has ever existed for this app. Local simulator builds are currently broken (fmt pod vs Xcode 26.6), so no cheaper tier would have caught a launch defect.", unblock: "run the build — it is the only way to resolve an unknown build", type: BLOCKER}`
- `{node: step-3 device sitting, why: "Nothing about this app is device-proven. Everything shipped since 2026-06-20 is web-preview-proven or code-inferred.", unblock: "one ~50-min sitting per DEVICE-SCRIPT.md §C", type: BLOCKER}`
- `{node: sentry-over-disclosure, why: "Live privacy policy states 'We use Sentry to capture crash logs' and '30 days (via Sentry)'. VERIFIED THIS RUN: main:src/lib/sentry.ts is a 4-line no-op stub ('Sentry removed — re-add in Phase 6'). Over-disclosure is the legally safe direction but is the kind of mismatch a privacy reviewer notices (5.1.1(i)).", unblock: "Sky decides: reword policy, or ship without crash reporting knowingly", type: DECISION_FOR_SKY}`
- `{node: version-provenance, why: "main:app.json = 3.0.0, main:package.json = 0.2.0.", unblock: "set both equal before step 2 (0.05 h). app.json is authoritative; eas.json appVersionSource=remote means EAS owns the build number regardless.", type: MISSING_INPUT}`

---

## §4 CHECKPOINT REFERENCES

- `{name: main-tip, role: Sky, artifact: commit:9964f8f (== origin/main, in sync, nothing unpushed), qa-report: this file §5}`
- `{name: the-one-merge, role: Sky, artifact: branch:ui-polish/accessmap-preship-2026-08-01#d243b51 (22 ahead / 0 behind, ff-able — verified), qa-report: 2026-08-01_AccessMap_PreShip_UI_Polish_Report.md "Merge (yours)"}`
- `{name: security-train-inside-polish, role: Steve, artifact: branch:sec/phase-b-hardening-2026-07-31#354584c (ancestor of ui-polish — verified), qa-report: security-audit/2026-07-31/phase-b/CLOSE_OUT.md §8}`
- `{name: critical-path-source, role: Opus 5 roadmap run, artifact: ~/career-arsenal/roadmap/2026-08-01/03_CRITICAL-PATH-APP-STORE.md, qa-report: same file §3.0–§3.7}`
- `{name: privacy-url-live, role: Morgan (this run), artifact: https://skypie99.github.io/AccessMap/privacy/ → resolves, real policy, v1.1 dated 2026-07-31, qa-report: this file §5}`
- `{name: photo-privacy-shipped, role: Steve, artifact: main:src/lib/flags.ts (sanitizeImageMetadata present), qa-report: security-audit/2026-07-31/phase-b/CLOSE_OUT.md §8}`

---

## §5 DUPLICATION REPORT

- `{agents: [Morgan (this run), Opus 5 roadmap run 2026-08-02], overlap: "the 7-step chain, merge topology, and hour arithmetic", resolution: "Roadmap keeps authorship. Morgan re-verified rather than re-derived, and contributes three NEW facts the roadmap listed as open questions — see below. No re-run of validated checkpoints (Const. 8.6)."}`

**New this run (not in the roadmap):**
1. **Q-3.1 SETTLED** — `https://skypie99.github.io/AccessMap/privacy/` **is live**, a real policy, v1.1 / 2026-07-31. The roadmap's **#1-ranked rejection risk (automatic, 5.1.1) is closed.**
2. **`[01]AM-11` located to one line** — `main:src/lib/copy.ts:621`. The roadmap knew the sentence was wrong; this pins the exact file:line, and confirms via the live policy that the *policy* half is already correct.
3. **The Sentry mismatch confirmed live on both halves** — policy discloses it, `main:src/lib/sentry.ts` is a 4-line no-op. Roadmap rated this "low-moderate" from documents; now measured on both sides.
4. Blocker 1 line numbers drifted −1/−9 from the roadmap (`1208→1207`, `1749→1740`, `1184→1183`) — same finding, benign rebase drift. Roadmap's substance holds 100%.

---

## §6 STATE SNAPSHOT

```yaml
project: AccessMap
main: 9964f8f (== origin/main)
head_at_scan: ui-polish/accessmap-preship-2026-08-01 @ d243b51
branches_local: 58
branches_merged_into_main: 52
branches_unmerged: 5  # ui-polish (the one that matters) + 4 non-ship
tracked_tree: clean (76 untracked paths, all design-reviews/ artifacts)
gates_at_polish_tip: 200 suites / 2923 passed / 0 failed; tsc exit 0; lint 0-error baseline
gate_command: npx jest --ci -w 3
distance_to_submittable: 4.65 h Sky-hands
distance_to_not_embarrassing: 5.30 h Sky-hands
agent_work_remaining: 0
hard_deadline_soft: 2026-09-01 (Apple social-media questionnaire becomes mandatory)
hard_deadline_capacity: 2026-09-17 (medical leave ends — 45 days from today)
open_decisions_for_sky: 6
live_security_exposure: 1 (plaintext reviewer credential on public origin/main, day 62+)
```

**Standing rules re-asserted:** never bare `git gc` in this repo (202 dangling commits). No agent performs any step of the credential rotation. `docs/APP_STORE_REVIEWER_NOTES.md` was NOT opened this run and no credential value appears anywhere in this report.

---

## §7 EXECUTION PLAN SUMMARY

- **Phases:** 4 — (P0 five-minute closes) → (P1 the merge) → (P2 the build/hinge) → (P3 device + forms + submit)
- **Classification:** 10 nodes total · READY 4 (step-0, step-0b1, step-0b2, version-fix) · LOCKED 6 (all downstream of step-1/step-2) · BLOCKED 0 by agents
- **Critical path:** `step-0 → step-0b → step-1 → step-2 → step-3 → step-6 → step-7` = 4.65 h
- **Parallelizable:** step-4 ASC forms fill during step-2's build queue (except review notes, which need step-0). step-5 + step-6 both fan out from step-3.
- **BACKGROUND constraints:** N/A — ACTIVE mode, direct invocation. No background cycle may perform any node here (all are HANDS-ONLY or Sky-decision).
- `acyclic: true`

---

## DECISIONS FOR SKY

| # | Decision | Cost | Morgan's recommendation |
|---|---|---|---|
| D-1 | Add the blocked-term filter to `createAnonFlag`? | 0.10 h decide | **Yes, in v1.** "Amber by choice" is defensible; "amber because one function forgot to call another" is not. Cheapest defensible move on the whole 1.2 table. |
| D-2 | Fix the Terms deletion sentence (`copy.ts:621` Settings→Profile)? | 0.25 h | **Yes.** Your live privacy policy already says Profile. Two published docs contradicting each other is a rejection *shape*. |
| D-3 | Repair the Admin tab grant before submit? | 0.25 h decide | **Yes, verify at least.** One read-only grant check. The 1.2(b) green is currently unearned. |
| D-4 | Sentry: reword the policy, or accept no crash reporting knowingly? | 0.10 h | **Reword to match reality.** Over-disclosure is legally safe but reviewers cross-read. Knowingly accepted is fine; unknowingly is not. |
| D-5 | Take the ui-polish train in v1, or security-only? | 0 h | **Take both.** One fast-forward, gates identical to baseline. Splitting costs more of your time than reviewing them. |
| D-6 | Declare Accessibility Nutrition Labels? | 0.40 h | **Yes.** An accessibility app declaring no accessibility is the row a hiring manager notices. This is the G1 row. |

---

_Morgan · read-only · Const. Art. 9 · no external send performed without Sky's word._
