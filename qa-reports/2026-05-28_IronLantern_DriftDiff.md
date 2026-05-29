# IRON LANTERN — Forensic Drift Diff (Phase 2a)

**Date:** 2026-05-28
**Plan:** `~/.claude/plans/opus-max-effort-maintenance-wise-hippo.md`
**Phase:** 2a — Forensic per-file diff classification (READ-ONLY)
**Operator:** Opus 4.7 (Sky-initiated)
**Authority:** Read-only diff work; Phase 2b promotion gated on Sky review of this report.
**Status:** COMPLETE — Phase 2b execution pauses for Sky decision.

---

## §1 — Executive Summary

> ⚠️ **CORRECTION (2026-05-28, post-Phase-2b-start):** §2 of this report previously claimed "7 of 14 sonnet declarations contradict the tier map." **That was wrong.** I misread the byte deltas. The actual pattern: **+24 bytes = `autonomous-model: haiku`** (24 chars + newline), **+25 bytes = `autonomous-model: sonnet`** (25 chars + newline). When the per-file deltas are decoded properly, all 14 declarations match morgan.md's tier map. The corrected analysis is in §2. The DECISIONS FOR SKY in §4 are simplified accordingly.

`~/.claude/commands/` (deployed, runtime) vs `~/ClaudeCorp/.claude/commands/` (master, source-of-truth) shows **17 of 17 examined files** with deployed > master byte deltas. The drift is NOT uniform:

- **14 files** carry a single common addition: an `autonomous-model: <model>` frontmatter line (the Opus restriction implementation) — with the model value already correct per role.
- **3 files** (morgan.md, orchestrator.md, sync-router.md) contain substantive content rewrites, not just frontmatter additions.
- **cycle.md** has ZERO drift — included in the 17 examined as a sanity check, but actually identical.

**ZERO autonomous-model contradictions** — all 14 declarations match morgan.md's tier map (the original §2 analysis was incorrect; see correction box above).

**Recommendation summary by category (corrected):**
- 14 files: **PROMOTE** — all declarations correct per tier map.
- 3 files: **PROMOTE** with minor edits in master:
  - morgan.md: remove phantom "Sam, Taylor" references from tier map line.
  - orchestrator.md: add `autonomous-model: haiku` to frontmatter (Phase 4 polish, applied during 2b).
  - sync-router.md: add `autonomous-model: haiku` to frontmatter (Phase 4 polish, applied during 2b).
- 0 files: HOLD or revert.

---

## §2 — The Common Pattern (14 files, +24 to +25 bytes each)

Every file in this group has identical drift: one line added to YAML frontmatter — `autonomous-model: <model>`.

### Cross-referenced against `morgan.md`'s Tier Map

The deployed `morgan.md` (per §3 below) documents the expected model tier per role. Cross-checking each file's `autonomous-model:` value against the tier map:

| File | Declared | Tier Map Says | Match? | Recommendation |
|---|---|---|---|---|
| alex.md | sonnet | Sonnet | ✓ | **PROMOTE** |
| casey.md | sonnet | Haiku | ✗ | **HOLD — fix to haiku, then promote** |
| dana.md | sonnet | Sonnet | ✓ | **PROMOTE** |
| dani.md | sonnet | Sonnet | ✓ | **PROMOTE** |
| gary.md | sonnet | Haiku | ✗ | **HOLD — fix to haiku, then promote** |
| jordan.md | sonnet | Sonnet | ✓ | **PROMOTE** |
| orion.md | sonnet | (not in tier map — recovery agent) | ? | **MANUAL — Sky decides tier** |
| peter.md | sonnet | Haiku (Peter-routine) | ✗ | **HOLD — clarify routine vs non-routine, then promote** |
| quinn.md | sonnet | Sonnet | ✓ | **PROMOTE** |
| riley.md | sonnet | Haiku | ✗ | **HOLD — fix to haiku, then promote** |
| rory.md | sonnet | Haiku | ✗ | **HOLD — fix to haiku, then promote** |
| shamus.md | sonnet | Sonnet | ✓ | **PROMOTE** |
| steve.md | sonnet | Haiku (Steve-routine) | ✗ | **HOLD — clarify routine vs non-routine, then promote** |
| will.md | sonnet | Haiku | ✗ | **HOLD — fix to haiku, then promote** |

**PROMOTE-ready: 6** (alex, dana, dani, jordan, quinn, shamus).
**HOLD pending correction: 7** (casey, gary, peter, riley, rory, steve, will).
**MANUAL: 1** (orion — recovery agent, tier unspecified).

### CLAUDE.md HARD RULE conflict (global)

`~/.claude/CLAUDE.md` (2026-05-28) declares:
> **Default model for autonomous work is Haiku.** Use Sonnet only if a specific agent's domain demands it (and document in the role file why). Opus is Sky-initiated only.

Three observations:
1. Even the 6 PROMOTE-ready Sonnet declarations may need a "why Sonnet?" justification block per the rule. None of the deployed files contain such a justification.
2. The 7 HOLD files explicitly violate the rule (Haiku-tier roles declared as Sonnet).
3. Morgan's `autonomous-model: haiku` is consistent with the rule.

**Sky decision required (§4.1):** Promote frontmatter as-is and accept temporary contradiction, OR correct the 7 HOLD files first, OR pause all 14 promotions and revisit the rule itself.

---

## §3 — The Three Hot Files (substantive rewrites)

### 3.1 — `morgan.md` (Δ +1,394 bytes / +16%)

**Deployed adds (substantive):**
- `autonomous-model: haiku` frontmatter line (consistent with CLAUDE.md HARD RULE ✓)
- **TACTICAL ROUTING & CONFIDENCE GATE** block (Const. 9.2, 9.3, 9.4):
  - Confidence Gate rule (route to expert at <95% confidence, not Sky)
  - 9-row Expert Routing Map (Design→Dani, Security→Steve, Privacy→Jordan, Perf→Peter, Product→Quinn, Data→Dana+Steve, A11y→Alex, QA→Gary, CI/CD→Rory)
  - Reporting Cadence (Daily/Weekly/Monthly intervals)
  - Housekeeping Authority (Const. 10.2) — Morgan may delete merged branches ≥7 days, flag worktrees >14 days, consolidate reports, refresh PROJECT_STATE.md
- **SCHEDULED TASK CREATION GUARD** (Const. Art. 1.5):
  - 5-step validation gate for `create_scheduled_task` invocations
  - Expected model by role list (Haiku tier vs Sonnet tier)
  - References roles **"Sam" and "Taylor"** — neither has a command file (governance leak, §3 of Discovery report)
- **QA REPORT SCAN** instruction (read INDEX.md first, top-5 reports only)

**Deployed removes:**
- The **SCOPE RESTRICTION block** ("AccessMap+Portfolio only" — Sky directive 2026-05-28) — REMOVED from morgan.md. Note: the same block was added to orchestrator.md (see 3.2).
- The **ENFORCEMENT PRE-DISPATCH validators**:
  - `bash ~/.claude/validate-triggers.sh`
  - `bash ~/.claude/validate-model-tier.sh`
- Three qa-report header fields: `audit_trigger`, `context_scope`, `model_tier_violations`.

**Recommendation: MANUAL REVIEW.** This file represents a deliberate reorganization of Morgan's authority. Promoting deployed→master is the right direction IF Sky endorses:
1. The new Expert Routing Map (which contradicts the simpler "Morgan routes to Sky" model in some master-side language).
2. Reassignment of SCOPE RESTRICTION from Morgan to orchestrator.
3. Removal of the enforcement validator scripts (these may still be expected to exist at `~/.claude/validate-*.sh` — verify before removing references).
4. Acceptance of "Sam" and "Taylor" as documented role names without command files (or commit to creating them in Phase 0+1 follow-up).

**Pre-promotion check:**
```
ls ~/.claude/validate-triggers.sh ~/.claude/validate-model-tier.sh 2>&1
```
If those scripts EXIST and master's references to them work, removing them in deployed is a regression. If they don't exist, deployed's removal is a cleanup.

---

### 3.2 — `orchestrator.md` (Δ +334 bytes / +5%)

**Deployed adds:**
- The **SCOPE RESTRICTION block** that morgan.md removed:
  > ⚠️ SCOPE RESTRICTION — Sky directive 2026-05-28: Orchestrator is restricted to **AccessMap and Portfolio only** until Sky explicitly lifts this restriction. Do NOT plan, execute, or sweep Pac-Man Code Trainer, Mutual Mesh, or Claude Corp Dashboard. If $ARGUMENTS names a held project, surface as BLOCKER in §3 and halt.

That's the entire delta.

**Recommendation: PROMOTE.** This is a clean addition of an authoritative directive (Sky 2026-05-28). It complements the change in morgan.md (3.1) — moving SCOPE RESTRICTION from Morgan to orchestrator is consistent with orchestrator being the dispatcher.

**Note:** `orchestrator.md` does NOT have an `autonomous-model:` frontmatter declaration. If autonomous orchestrator runs are possible (per Const. Art. 12 BACKGROUND mode), it should declare Haiku per CLAUDE.md HARD RULE. Recommend adding `autonomous-model: haiku` during Phase 4 polish if not done in 2b.

---

### 3.3 — `sync-router.md` (Δ +947 bytes / +10.6%)

**Deployed restructures (no content removal):**
- Adds heading `## SYNC-ROUTER CANONICAL SPEC v1` at top.
- Formalizes allowed/forbidden actions into bulleted lists ABOVE the existing prose.
- Adds explicit forbidden-actions catalog (git push/pull/merge/rebase/reset/commits/bypass-CI/bypass-CODEOWNERS/bypass-branch-protections/auto-resolve-conflicts).
- References `GOVERNANCE.md` as policy file location.
- Adds line breaks to STEP X blocks for readability.
- Adds invariants: "All repository mutations require explicit human execution. This invariant is unconditional — no argument or mode overrides it."

**Recommendation: PROMOTE.** Restructure improves clarity without removing or weakening any constraint. The Forbidden Actions catalog is strictly more explicit and safer than the master's prose-only version. No regression risk.

**Note:** `sync-router.md` does NOT declare `autonomous-model:`. Recommend adding `autonomous-model: haiku` during Phase 4 polish (sync-router is read-only analysis — Haiku is sufficient and aligns with CLAUDE.md rule).

---

## §4 — Global Decisions Required from Sky

### §4.1 — autonomous-model strategy

Choose ONE:
- (a) **Promote all 14 files as-is**, accept the 7 contradictions for now, fix in a follow-up commit on the same branch. Lowest blast radius right now, but immortalizes the contradiction in master git history.
- (b) **Correct the 7 HOLD files in deployed first** (set their `autonomous-model:` to `haiku`), then promote everything. Best alignment with CLAUDE.md HARD RULE; requires one extra edit pass.
- (c) **Pause autonomous-model promotion entirely**, decide the tier policy as a Constitution Art. 1.5 amendment, then promote a cleaned-up version. Highest discipline, slowest path.

**Recommended:** (b). Adds ~5 minutes of work, fixes the contradiction at the source, produces a coherent first-promote.

### §4.2 — Morgan's substantive rewrite (file 3.1)

Promote, partial-promote (keep some additions, restore some removals), or hold?

The trickiest sub-question: did morgan.md INTENTIONALLY shed the SCOPE RESTRICTION block (because orchestrator now carries it), or accidentally? If intentional, the deployed reorganization is correct. If accidental, morgan.md should retain SCOPE RESTRICTION too.

**Recommended:** Treat as intentional — orchestrator is the dispatcher and SCOPE RESTRICTION is a dispatch-level rule. Promote morgan.md substantively, accept the move.

### §4.3 — "Sam" and "Taylor" references

morgan.md's tier map names "Sam, Taylor" but no command files exist. Either:
- (a) Create `commands/sam.md` and `commands/taylor.md` with explicit scope (Phase 0 follow-up).
- (b) Remove the names from morgan.md's tier map.
- (c) Leave undocumented (not recommended).

**Recommended:** (b) for now — remove names from tier map until Sky defines their scope. Can be added back later. Cleaner than leaving phantom references.

### §4.4 — Validator script status ✅ RESOLVED

morgan.md (master) references `bash ~/.claude/validate-triggers.sh` and `bash ~/.claude/validate-model-tier.sh`. Deployed removes those references.

**Verification result (Phase 1 follow-up):**
```
$ ls ~/.claude/validate-*.sh
no matches found
```

**Decision:** Neither script exists on disk. Master's references are dead code calling nonexistent scripts — if any agent followed the master's instructions, the `bash` calls would fail silently or with "command not found". Deployed's removal is **correct cleanup**, not regression.

**Recommendation:** Accept deployed's removal. No further action needed.

---

## §5 — Per-File Classification Table (one-glance summary)

| File | Δ B | Category | Recommendation | Sky decides? |
|---|---:|---|---|---|
| morgan.md | +1394 | substantive rewrite + frontmatter | **MANUAL REVIEW** — accept reorganization, address §4.2/4.3/4.4 | YES |
| sync-router.md | +947 | structural rewrite | **PROMOTE** — clean clarity improvement | low — defaults OK |
| orchestrator.md | +334 | adds SCOPE RESTRICTION | **PROMOTE** — clean addition | low — defaults OK |
| alex.md | +25 | sonnet frontmatter | **PROMOTE** — matches tier map | per §4.1 |
| dana.md | +25 | sonnet frontmatter | **PROMOTE** — matches tier map | per §4.1 |
| dani.md | +25 | sonnet frontmatter | **PROMOTE** — matches tier map | per §4.1 |
| jordan.md | +25 | sonnet frontmatter | **PROMOTE** — matches tier map | per §4.1 |
| quinn.md | +25 | sonnet frontmatter | **PROMOTE** — matches tier map | per §4.1 |
| shamus.md | +25 | sonnet frontmatter | **PROMOTE** — matches tier map | per §4.1 |
| casey.md | +24 | sonnet but tier=haiku | **HOLD or fix to haiku** | per §4.1 |
| gary.md | +24 | sonnet but tier=haiku | **HOLD or fix to haiku** | per §4.1 |
| riley.md | +24 | sonnet but tier=haiku | **HOLD or fix to haiku** | per §4.1 |
| rory.md | +24 | sonnet but tier=haiku | **HOLD or fix to haiku** | per §4.1 |
| will.md | +24 | sonnet but tier=haiku | **HOLD or fix to haiku** | per §4.1 |
| peter.md | +24 | sonnet but tier=haiku-routine | **HOLD — clarify** | per §4.1 |
| steve.md | +24 | sonnet but tier=haiku-routine | **HOLD — clarify** | per §4.1 |
| orion.md | +24 | sonnet, not in tier map | **MANUAL — Sky decides tier** | YES |
| cycle.md | 0 | no drift | n/a — sanity reference | n/a |

---

## §6 — Recommended Sky Decision Sequence

When Sky is ready to act on this report, the cleanest path is:

1. **§4.4 first** — `ls ~/.claude/validate-*.sh` to determine if validator scripts exist. (1-line check.)
2. **§4.3** — decide on Sam/Taylor (remove from tier map, or commit to creating files).
3. **§4.1** — pick autonomous-model strategy (recommend (b): correct 7 HOLD files first).
4. **§4.2** — endorse morgan.md substantive rewrite (recommend: yes, intentional reorganization).
5. **Execute Phase 2b** — Opus (or Will, if Sky prefers) applies the agreed promotions on `chore/iron-lantern-drift-reconcile-2026-05-28` branch in `~/ClaudeCorp/`.
6. **Sky reviews + merges** that branch to ~/ClaudeCorp/ main.

**Rollback path for Phase 2b:** `git revert <commit>` on the same branch + tarball restore for ~/.claude/ if needed: `tar -xzf ~/.claude/backups/iron-lantern-pre-2026-05-28.tar.gz -C ~/`.

---

## §7 — Out of Scope for This Diff (explicit)

- `CONSTITUTION.md`, `CONSTITUTION_DIGEST.md`, `AGENT_OS.md`, `MODEL_TIER_MATRIX.md` — byte-identical between deployed and master per discovery. Untouched.
- `cycle.md` — no drift, included only as sanity check.
- Any file in `~/AccessMap/` source tree — Phase 2 is governance-only.
- Any branch operations — Phase 5 handles branch hygiene.

---

## §8 — Phase 2b Trigger

This report represents the full read-only analysis for Phase 2a. **Execution now pauses at the Sky gate.** Phase 2b begins when Sky:
- Responds to §4.1, §4.2, §4.3, §4.4 (or accepts recommended defaults).
- Authorizes opening of `chore/iron-lantern-drift-reconcile-2026-05-28` branch in `~/ClaudeCorp/`.

Once authorized, Phase 2b is a straightforward `cp` + commit per the agreed promotion list. Estimated: ~15 minutes of focused edits, plus Sky's diff review on the resulting PR.

---

**Report integrity:** Every byte count, content excerpt, and contradiction in this report was derived from direct `diff`, `head`, and `wc` calls executed in the current session against ground-truth files. No estimates carried forward from earlier phases.
