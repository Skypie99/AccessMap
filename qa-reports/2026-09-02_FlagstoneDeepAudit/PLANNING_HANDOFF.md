# PLANNING HANDOFF — Flagstone Deep Audit 2026-09-02

Inputs for Sky + ChatGPT to build phased repair waves. **No repair prompts here**, by design. Authoritative detail: `FINDINGS_LEDGER.md`. Historical context: `HISTORICAL_RECONCILIATION.md`.

## The one decision everything else hangs on

**Which lineage is the next build cut from?** `origin/main` (70b52a30) does not contain the submitted Build 33 product code (f5594171, 113 commits ahead) — FDA-001. Until that is settled, half the findings below have two different answers:

- **Converge main to the shipped lineage** → FDA-034, FDA-039 and much of the XXXL/sheet work disappear because Build 33 already fixed them; the backend-contract breaks (FDA-002/003/004/019) come with it and must be fixed or reverted.
- **Continue from main** → the Build 33 client defects never ship, but every Build 33 UI/accessibility repair must be re-done, and `main` is the lineage whose migration set no longer reproduces production (FDA-027).

Nothing in the audit can make this call: it is a product and release decision.

## Ordering (severity × blast radius, not effort)

### 1. Release blockers — none for the submitted binary
No finding justifies pulling Build 33 from review. The four HIGH client→backend breaks (FDA-002/003/004/019) are real and shipped, but each is either admin-only, signed-in-only, or has a working guest path, and none is a data-loss or privacy breach. See "Release-risk synthesis" in `FINAL_AUDIT_REPORT.md`.

### 2. Privacy / security / consent
FDA-042 (anon readers get reporter `user_id` + precise coordinates — needs Jordan review), FDA-021 (`users` columns client-writable: points/streaks/email forgeable), FDA-024 (deletion leaves photos, avatars, `contact_email`; uid stays in `photo_url`), FDA-041 (push ignores notification preferences), FDA-025 (webhook secret literal in a public repo — Sky-only rotation), FDA-007 (reviewer password literal at HEAD and in history — Sky-only rotation), FDA-026 (user/admin enumeration), FDA-012 (default `anon`/`authenticated` grants incl. TRUNCATE), FDA-008 (leaked-password protection off), FDA-010 (trigger functions EXECUTE-granted), FDA-029 (web SW caches `/auth/v1/user`), FDA-013 (CSP report-only, stale allowlist).

### 3. Moderation / safety integrity
FDA-020 (any signed-in user can permanently reject any report — the most damaging community action, ungated), FDA-023 (INSERT can create flags already `verified`), FDA-004 (Build 33 admin Reports queue 42703s), FDA-002 (admin Remove flag dead on Build 33), FDA-022 (points farming).

### 4. Functional correctness in the shipped build
FDA-003 (account deletion says it failed while deleting the account — also App Store 5.1.1(v)), FDA-019 (signed-in photo reports fail), FDA-040 (no password reset), FDA-035 (FAQ denies the −20 rejection penalty the trigger applies), FDA-038 (guest not remembered), FDA-043 (sign-up confirmation copy).

### 5. Release truth / governance
FDA-001 (the lineage decision), FDA-005 (no backend-contract gate — the reason 002/003/004/019 shipped undetected), FDA-027 (main's migrations don't reproduce production), FDA-015 (pgTAP never runs in CI), FDA-016 (self-attested privacy gate), FDA-044 (env-missing blank screen), FDA-046 (config hygiene).

### 6. App Store risk
FDA-006 (demo account unverifiable — Sky must confirm before review), FDA-030 (policy promises deletion/retention behaviour the code lacks), FDA-045 (leaderboard not disclosed), FDA-003 and FDA-019 as reviewer-visible failures.

### 7. UI / visual quality
FDA-039 (main: search sheet under the tab bar), FDA-034 (main: raw location error), FDA-033 (onboarding permission CTAs read dead), FDA-036 (web alerts silent). Plus the sub-4 matrix scores in `UI_VISUAL_ACCEPTANCE.md`: main's Explore chrome (material mismatch, floating pieces), main's Filter panel (clips), main's Legend (doesn't use available height), Tasks "Task tools" sheet (a whole sheet for one row), the sign-in-required alert (dead end, no Sign in action).

### 8. Test / code debt
FDA-014 (destructive UI paths untested), FDA-017 (32 `it.todo` with no harness), FDA-018 (format ungated, no safe-area mock), FDA-037 (architecture debt), FDA-011 (TS 6 vs SDK 54), FDA-009 (legacy `flags_user_scoped`), FDA-028 (global anon caps as DoS switch).

## Safe parallel clusters

**Cluster A — Backend/RLS (one migration lineage, one pgTAP suite, one review):** FDA-009, 010, 012, 020, 021, 023, 026, 042. All are policy/grant edits to the same tables; batching them means one apply, one proof, one rollback. Must follow the FDA-005/027 lineage decision.

**Cluster B — Sky-only credential + dashboard actions (no code):** FDA-006, 007, 008, 025, and the FDA-046 config items. Zero code risk, immediate value, unblocks the App Store gate. **Start here.**

**Cluster C — Client copy and small UX (no backend):** FDA-035, 043, 045, 030 (copy half), 033, 038, 034 (port from Build 33), 036. Independent of everything else.

**Cluster D — Test/CI infrastructure:** FDA-005, 014, 015, 016, 017, 018. Touches no product code; can run start-to-finish alongside any other cluster. FDA-005's contract gate is what prevents a repeat of this audit's four HIGH findings.

**Cluster E — Layout/sheet work:** FDA-039 + the sub-4 UI matrix rows. Conflicts with Cluster C only if both edit the same screens — sequence C before E per screen.

## Dependency chains (must be sequential)

1. **FDA-001 (lineage decision) → FDA-027 (single migration lineage) → Cluster A → FDA-002/004/019 (deploy-or-revert the Build 33 contracts) → FDA-005 (gate that keeps it true).** This is the spine of the whole plan.
2. **FDA-003 (deletion design: legacy vs D1F4) → FDA-024 (erasure completeness) → FDA-030 (policy copy that matches).** Deciding the deletion architecture first prevents writing the policy twice.
3. **FDA-020 (who may reject) → FDA-004 (the moderation queue that acts on it) → FDA-035 (the FAQ describing the penalty).**
4. **FDA-006/007 (Sky) → any TestFlight or App Store action.**

## High-UI-impact cluster
FDA-039, 034, 033 + Explore chrome material unification + Filter/Legend height. If main is chosen as the lineage, add every Build-33-only design item in `evidence/b33-design-intent-source-map.md` (grounded tab capsule, tab dividers, selected-chip ink, `Sheet presentation="expanded"` across 17 surfaces, the whole XXXL repair set) — that file is the port list.

## High-risk cluster (do not batch with anything)
FDA-003 and FDA-024 (irreversible, privacy-sensitive, needs Jordan + Sky), FDA-042 (changes the public read contract), FDA-020 (changes community triage semantics — product decision first), any production migration apply.

## Quick wins (small, safe, visible)
FDA-008, 010, 035, 043, 045, 046, 038, 034, 009. Most are one-line or one-migration; several close historical items that have been open for months.

## Historical relation
`HISTORICAL_RECONCILIATION.md` §A lists **31 verified still-open historical items** with current evidence and FDA links; §B lists **29 that could not be verified** without a signed-in session, a device, or App Store Connect. Notable long-open items now carrying FDA IDs: S14/P6 → FDA-040, S17 → FDA-042, S4 → FDA-024, S13 → FDA-004, DFS#2 → FDA-041, MR-3 → FDA-045, §0.1 → FDA-007, U1 → FDA-044, MR-4 → FDA-016, P3 → FDA-027.

## What the audit could not decide, and why
Any finding whose proof needs a signed-in or admin session (the audit never creates accounts or enters passwords), a production write (anonymous report submission, admin delete, account deletion), a real device (VoiceOver, Dynamic Type — see `evidence/dynamic-type-environment-gap.md`), or App Store Connect. These are listed per finding under RECOMMENDED_ACCEPTANCE_TEST and collectively in the final report's Evidence gaps.
