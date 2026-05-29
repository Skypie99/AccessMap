---
date: 2026-05-25
author: Morgan
mode: ACTIVE (direct /morgan invocation)
model_tier: sonnet-4-6
project: Claude Corp (cross-project — AccessMap context)
coherence_score: 0.98
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
---

# Morgan PM Briefing — Constitution Art. 1.2 Amendment Proposal
**2026-05-25 | Direct invocation | Sky directive: amend merge authority rule**

---

## §1 — Dependency Graph

**nodes:**
- `sky/edit-constitution` (Sky, filesystem-edit) — edit Art. 1.2 in ~/ClaudeCorp/.claude/CONSTITUTION.md
- `sky/edit-claude-md` (Sky, filesystem-edit) — update hard-prohibitions echo in ~/ClaudeCorp/.claude/CLAUDE.md
- `sky/deploy-constitution` (Sky, shell) — cp -R ~/ClaudeCorp/.claude/* ~/.claude/
- `sky/update-authorized-list` (Sky, decision) — define who is on the authorized-humans list and where it lives

**edges:**
- `sky/update-authorized-list` → `sky/edit-constitution` (gate: list must exist before rule references it)
- `sky/edit-constitution` → `sky/edit-claude-md` (data: CLAUDE.md echoes Art. 1 hard prohibitions; must stay in sync)
- `sky/edit-claude-md` → `sky/deploy-constitution` (gate: both files must be edited before deploy)

---

## §2 — Reason for Ordering

- **Authorized list before rule change (Const. Art. 11):** The amendment replaces a concrete rule ("Sky alone") with a reference rule ("authorized humans"). A reference rule without a defined referent is weaker than no rule — any GitHub write-access holder could claim authorization. The list must be defined and located before the rule goes live. `ASSUMPTION` — Sky has a specific list of authorized humans in mind; this briefing assumes Cowork-as-Sky is the primary use case.
- **CLAUDE.md must mirror Art. 1 (Const. Art. 1):** CLAUDE.md §Hard prohibitions explicitly echoes "Never modify `main`. Only Sky merges." If Constitution is amended but CLAUDE.md is not, agents operating from the CLAUDE.md overlay (the default load path) will still enforce the old rule. `LEARNINGS:2026-05-24 — Phase 2.1 template audit` confirmed that CLAUDE.md and Constitution must stay in sync; drift caused the Morgan email/iMessage gap that required an emergency patch.
- **Deploy is atomic (Const. Art. 11):** `cp -R` is the canonical deploy. Editing master files without deploying means the running system still enforces the old rule.
- **LEARNINGS:2026-05-23 — merge pattern (AccessMap/LEARNINGS.md line 120–135):** The one-at-a-time merge discipline depends on a clear authority rule. The amendment expands who can execute merges; the LEARNINGS pattern (clean check → merge → next branch) still applies regardless of which authorized human executes it.

---

## §3 — Blocked Nodes

```
{node: sky/update-authorized-list,
 why: "Amendment references 'explicitly authorized humans' but no list, location, or grant/revocation mechanism is defined",
 unblock: "Sky decides: (A) Cowork = Sky (same person, different tool — Art. 1.2 rewritten to say 'Sky, using any tool Sky operates directly, may merge to main'); OR (B) formal named list added to Constitution or a new ~/ClaudeCorp/.claude/AUTHORIZED_MERGE_HUMANS.md file with grant/revocation process",
 type: DECISION_FOR_SKY}

{node: sky/edit-constitution,
 why: "Only Sky amends Constitution (Art. 11) — no agent can make this change",
 unblock: "Sky edits ~/ClaudeCorp/.claude/CONSTITUTION.md Art. 1.2 directly",
 type: DECISION_FOR_SKY}
```

---

## §4 — Checkpoint References

```
{name: constitution-art-1-2-current,
 role: morgan,
 artifact: branch:n/a — file-read,
 qa-report: qa-reports/2026-05-25-morgan-constitution-amendment.md:1}

{name: accessmap-pr2-audit-gap,
 role: morgan,
 artifact: commit:0564c66,
 qa-report: qa-reports/2026-05-25-morgan-release-blockers.md:44}

{name: mutualmesh-pr2-audit-gap,
 role: morgan,
 artifact: commit:87d27f2,
 qa-report: MutualMesh/qa-reports/2026-05-25-morgan-next-phase.md:1}
```

---

## §5 — Duplication Report

No duplications detected this cycle. Prior 7 days qa-reports surveyed: 2026-05-25-morgan-release-blockers.md (MutualMesh), 2026-05-25-morgan-next-phase.md (MutualMesh). No role is being asked to repeat shipped work. Constitutional amendment is a new topic not covered in any prior qa-report.

---

## AMENDMENT ANALYSIS

### Current rule (Art. 1.2)
> "No agent modifies `main`. Merging is Sky's alone."

### Proposed rule
> "Only explicitly authorized humans may approve or merge to main."

---

### What the change covers

| Area | Current | Proposed |
|------|---------|---------|
| Agent merges | Prohibited | Prohibited (unchanged) |
| Sky merges | Permitted | Permitted |
| Cowork merges | Ambiguous — Sky operating Cowork is Sky | Explicitly permitted if Cowork is on the authorized list |
| Other collaborators | Prohibited | Permitted if on the authorized list |
| GitHub repo admins | Prohibited | Depends on whether they're on the authorized list |

---

### Risks introduced

**1. Referent ambiguity (HIGH if list is not defined)**
"Explicitly authorized" has no content until a list exists. Without one, the rule is weaker than the current rule — it's a standard that can't be enforced. Every merge becomes a judgment call about whether the person was "authorized."

**2. Audit gap amplification (MEDIUM)**
Two merges already bypassed the PR review process (AccessMap canonical sync, MutualMesh PR #2 — both via direct push with branch protection temporarily disabled). Expanding merge authority without formalizing the list risks normalizing the pattern. The amendment should explicitly state whether direct-push bypasses are still prohibited even for authorized humans.

**3. Revocation lag (LOW but real)**
If a collaborator is authorized and later access needs to be removed, the list must be updated and deployed. There's currently no revocation SOP. If not defined, an authorized-but-removed person retains authority until the list is updated.

**4. Cowork specifically (LOW — actually a clarification, not a risk)**
Cowork is Sky operating a different Claude interface. "Sky using Cowork" is Sky. The ambiguity that led to this amendment was a misunderstanding of the current rule's intent, not an actual gap. Option A (below) resolves this with zero structural change.

---

### Two options for Sky

**Option A (Recommended) — Clarify, don't broaden**

Rewrite Art. 1.2 to make the original intent explicit:

> "No agent modifies `main`. Only Sky may merge to main — including when Sky operates through any tool (Cowork, terminal, GitHub UI). The prohibition is on agents acting without Sky, not on the tool Sky uses."

This resolves the Cowork confusion with no structural change to merge authority. No authorized list needed. No new governance overhead.

**Option B — Formal authorized-humans list**

Rewrite Art. 1.2 as:

> "No agent modifies `main`. Only humans on the authorized merge list may approve or merge to main. The list is maintained at `~/ClaudeCorp/.claude/AUTHORIZED_MERGE_HUMANS.md`. Sky is always on the list. Additions and removals require Sky's explicit edit. Direct-push bypasses (branch protection disabled) are still prohibited except by Sky for emergency recovery."

Then create `~/ClaudeCorp/.claude/AUTHORIZED_MERGE_HUMANS.md`:
```
# Authorized Merge Humans
## Current List
- Sky Halisky (GitHub: Skypie99) — permanent, no expiry

## Grant Process
Sky edits this file and deploys (cp -R ~/ClaudeCorp/.claude/* ~/.claude/).

## Revocation
Sky removes the entry and deploys.
```

Option B is correct if Sky ever wants a collaborator (not just Cowork) to merge PRs.

---

### Exact filesystem steps (either option)

**Option A:**
1. Open `~/ClaudeCorp/.claude/CONSTITUTION.md`
2. Find Art. 1.2 (line ~23): `1.2 **No agent modifies `main`.** Merging is Sky's alone.`
3. Replace with: `1.2 **No agent modifies `main`.** Only Sky may merge to main — including when Sky operates through any tool (Cowork, terminal, GitHub UI). The prohibition is on agents acting without Sky, not on the tool Sky uses.`
4. Open `~/ClaudeCorp/.claude/CLAUDE.md`
5. Find: `**Never modify `main`.** Only Sky merges.`
6. Replace with: `**Never modify `main`.** Only Sky merges — including via any tool Sky operates directly (Cowork, terminal, GitHub UI).`
7. Run: `cp -R ~/ClaudeCorp/.claude/* ~/.claude/`

**Option B:**
1–6: Same as Option A but with Option B text.
7. Create `~/ClaudeCorp/.claude/AUTHORIZED_MERGE_HUMANS.md` with the list above.
8. Run: `cp -R ~/ClaudeCorp/.claude/* ~/.claude/`

---

## DECISIONS FOR SKY (summary)

| # | Decision | Options | Time |
|---|----------|---------|------|
| 1 | Which amendment approach? | A (clarify) or B (formal list) | 1 min |
| 2 | Edit Constitution + CLAUDE.md | Filesystem edit per steps above | 5 min |
| 3 | Deploy | `cp -R ~/ClaudeCorp/.claude/* ~/.claude/` | 30s |

---

## §6 — STATE SNAPSHOT

```yaml
updated: 2026-05-25
cycle: constitution-amendment-proposal
project: Claude Corp (cross-project)
active_modules:
  - Constitution v1.11 Art. 1.2 (current)
completed_this_cycle:
  - Amendment analysis produced
  - Two options defined with exact steps
  - Risk assessment complete
decisions_pending:
  - Option A vs B — DECISION_FOR_SKY
  - Constitution edit — DECISION_FOR_SKY
  - Deploy — DECISION_FOR_SKY
open_risks:
  - Two existing audit gaps (direct-push merges on AccessMap + MutualMesh)
  - Amendment without defined list creates weaker rule than current
known_contradictions: none
next_cycle_intent: >
  After Sky chooses option + deploys: confirm ~/.claude/CONSTITUTION.md
  reflects new Art. 1.2. Future merges by Cowork are then constitutionally
  sanctioned. No agent action needed post-deploy.
```
