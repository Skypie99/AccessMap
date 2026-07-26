# Fable Audit — AccessMap — Part 3: The Improvement Slate (PROCESS LOG)

**Subject:** AccessMap @ `main` `82e738bc177f8a0b14ca0aa978c6ffb92bc5c54b` (post-glass-chain HEAD). **Date:** 2026-07-04.
**Model:** Opus 4.8, max effort — the whole fan-out (Sky's explicit direction; Fable 5 was credit-exhausted from Part 2). Disclosed, not silent.
**What this file is:** the working file + full process log for the Part-3 synthesis. The *reader-facing deliverable* is `2026-07-04_AccessMap_Design_Review.md`; the *canonical proposal source* is `partials/slate-proposals.v2.md`; the *canonical ranking* is `partials/slate-ranking.md`. This file records HOW the slate was produced — every stage, gate, and verdict — so the result is auditable and reproducible.
**Fence:** strict read-only. HEAD unchanged at `82e738b`; zero tracked files modified; only `design-reviews/fable-audit/` additions. No build, no DB, no git write.

---

## 0. Pre-flight (gate passed)

`02_findings.md` verified complete: §Calibration (verdict table + dedup map + correction ledger + final severity ladder), all eight lens sections L1–L8, the motion inventory table, the meta-calibration table, §Parked-item dispositions (6), §Sky-decision notes (7), §Merged PROTECT list (17), the copy-observations index, and the arbiter appendix. Supporting: `01_orientation.md`, `01_baseline-reads.md` (6 persona reads), `01_render-index.md` (410-file index, VERIFY1 PASS), `assets/annotated/` (36 PNGs — one per CRITICAL/HIGH). **Material walked:** 6 CRITICAL + 30 HIGH = 36 canonical findings, 0 skeptic-refuted. No prior `03_*`/report file → fresh run.

---

## 1. Orchestration (validated design)

A Plan agent pressure-tested the multi-agent orchestration before execution and its **8 MUST-FIX corrections were all incorporated** into the workflow (`accessmap-audit-part3-slate`):

1. **Set-level backfill gate** after adversarial verify (a KILL cannot silently drop the slate below 10 proposals or below 3 signatures) — implemented as a reconcile-agent instruction **plus** a JS floor-assertion with an explicit second backfill call.
2. **Frozen stable IDs at first merge** + a **dedicated reconcile agent** (not a merge re-run, not main-loop edits) applying FIX conditions in place.
3. **Rail checklist injected into every skeptic** — the 17-item PROTECT list + GLASS invariants (blur only 12/24, `forceEngineered` for sub-row surfaces, virtualization law, `box-none`, `GlassSurface.tsx` DO-NOT-EDIT, no eye-tuned floors) + WCAG-AA-floor + RN/Expo hard-facts (`announceForAccessibility` no-op on web; RN-web drops `accessibilityState.selected`). Skeptics returned **per-rail booleans** and had to *verify*, not trust, each "preserves PROTECT-N" claim.
4. **Named owners** for the parked-reconciliation table (merge), the Sky-decision forks (integrator), and the consolidated device list (integrator).
5. **Scores-only judges + deterministic synthesis** — judges emit raw composites to files; a JS step (not an agent) computes median-across-panels + top-5.
6. **Color/floor arbiter rule** — any color/floor/severity proposal must adopt an existing ratified token and name the arbiter re-run in VERIFICATION (skeptic auto-FIX otherwise).
7. **Dedicated writer agent** (fresh context) for the final report, with a section checklist + one-screen exec-summary budget.
8. **Final fence-check** (read-only `git status`) before declaring done.

**Principle honored throughout:** agent *returns carry control-flow only* (counts, ids, gate booleans); all *content lives in `partials/` files* addressed by id.

---

## 2. Stage log

| Stage | Agents | Output partials | Result |
|---|---|---|---|
| **A · Draft** | 5 (by lens-cluster) | `slate-draft-{arrival-trust,material,flows-device,access,motion-perf}.md` | Over-produced candidates across all 8 lenses (5–8 each) → thin candidate rows returned; prose banked to files. |
| **B · Merge** | 1 | `slate-proposals.md` (114 KB) | Deduped across clusters (facets folded to canonicals) → **20 proposals**, stable IDs **S1–S20**, all 7 fields authored, **7 signature** tagged, runner-up bench kept, 6-row parked-reconciliation table emitted, FORKS-TO-SKY lines added. |
| **C · Verify** | 20 (one skeptic/proposal) | `slate-verdict-S1..S20.md` | **12 KEEP / 8 FIX / 0 KILL.** Per-rail booleans banked; every FIX carried concrete fix-conditions (mostly: scope-to-web, split a backend half to a FORKS-TO-SKY line, or add the arbiter re-run to VERIFICATION). |
| **C′ · Reconcile + backfill gate** | 1 | `slate-proposals.v2.md` (143 KB) | 8 FIXes applied in place (IDs + 7 fields preserved, scope never widened); 0 KILLs to drop. **Floors held: 20 ≥ 10 proposals, 7 ≥ 3 signatures → 0 backfilled.** |
| **D · Judge** | 6 (2 panels × 3 roles) | `judge-P1-{advocate,craft,taste}.md`, `judge-P2-*` | Each judge scored all 20 at once (rankings are relative). Composites returned scores-only. |
| **Synthesis (JS)** | 0 (deterministic) | `slate-ranking.md` | `composite = impact*2 + cohesion + ethos`; panel = mean of its 3 judges; final = mean of 2 panels; effort then stable-ID tiebreak. Full matrix + top-5 emitted. |
| **E · Integrate** | 1 | `slate-ranking.md`, `slate-integration.md` | Phases (0–5), the 9 Sky-decision forks, and the ONE consolidated NEEDS-SKY-DEVICE list. |
| **F · Write** | 1 (fresh writer) | `2026-07-04_AccessMap_Design_Review.md` (122 KB) | The reader-facing report assembled against the section checklist with a one-screen exec summary. |

Run totals: **35 agents, ~4.9M tokens, ~68 min.**

---

## 3. Adversarial-verify ledger (Stage C)

**12 KEEP / 8 FIX / 0 KILL** across the 20 proposals. Nothing was killed because the merge held the rails (traceability, AA floor, GLASS law, existing-token adoption) from the start; the 8 FIXes were tightenings, not rescues. Representative fix-conditions applied at reconcile:

- **Web-scoping** where a claim was web-only (e.g. the flagship-chrome and reduce-motion camera fixes are web-surface; native is unaffected by construction).
- **Backend split to a FORKS-TO-SKY line** where a UI proposal sat atop a data/scope decision (S3, S4, S5, S1's count/date half — see §5).
- **Arbiter re-run named in VERIFICATION** wherever a proposal touches a color/floor/severity value, adopting the existing `severity[n].textOnColor` token (`theme.ts:543-547`) rather than inventing one; `GlassSurface.tsx` untouched.

Per-proposal reasoning + the 7 per-rail booleans are in `partials/slate-verdict-S{n}.md`.

---

## 4. Judge panels + ranking (Stages D + synthesis)

Full score matrix and the panel-disagreement analysis are in `partials/slate-ranking.md`. Headline ranked ordering (final = mean of two panel means; **TOP-5 = ranks 1–5**):

| rank | id | title | effort | tier | final |
|---|---|---|---|---|---|
| 1 | **S3** | Map pin becomes a doorway: surface the trust ledger where trust is spent | L | Signature | **19.667** |
| 2 | **S9** | Mount the accessibility engine on web (modern RN ≥0.71 a11y dialect) | L | Signature | **19.5** |
| 3 | **S1** | Wear the severity grammar everywhere + define "verified" | M | Signature | **19.333** |
| 4 | **S4** | Honest arrival: kill "N flags nearby" + surface denied-location banner (CRIT) | M | Meaningful | **18.333** |
| 5 | **S6** | Honest zoom: app-styled 44pt zoom buttons (CRIT) | M | Signature | **17.667** |
| 6 | S2 | textOnColor ink at the 6 un-forked severity-digit sites (CRIT) | S | QuickWin | 17.5 |
| 7 | S7 | Claim the flagship map: theme tiles, tame third-party chrome (web) | M | Signature | 17.167 |
| 8 | S5 | Report pill actually starts a report (Home-pill location parity) (CRIT) | S | QuickWin | 16.5 |
| 9 | S18 | "Submit report" label + 200%-zoom reflow guards (CRIT) | S | QuickWin | 16.167 |
| 10 | S11 | Data-layer timeout + honest "still trying" escalation | M | Meaningful | 15.667 |
| 11 | S13 | Free Tasks card actions from the accessible-parent trap (VoiceOver #1) | M | Meaningful | 15.5 |
| 12 | S8 | One editorial header family across every tab | M | Signature | 15.333 |
| 13 | S10 | Confirm the submit: visible + live success banner | M | Meaningful | 15.167 |
| 14 | S14 | Ratified hairline boundary on map pins (light-tile legibility) | M | Meaningful | 14.833 |
| 15 | S12 | Web map camera up to the native reduce-motion standard | M | Meaningful | 14.667 |
| 16 | S15 | First-run honesty sweep (retire 4 minute-one over-promises) | S | QuickWin | 14.167 |
| 17 | S16 | Fix the two worst map touch targets ("Clear" + action-bar overflow) | M | Meaningful | 14.167 |
| 18 | S17 | Contain the Home map peek (one button, no tap-theft) | S | QuickWin | 14 |
| 19 | S19 | Location-consent slide "Not now" + stop web permission theater | S | QuickWin | 13.333 |
| 20 | S20 | Repair trust-fallback surfaces (Help/changelog/About/casing) | S | QuickWin | 11.833 |

**Tier mix:** 7 QuickWin (S) · 11 Meaningful (M) · 2 Signature-L. **7 signature bets** total (S1, S3, S6, S7, S8, S9, + S11 co-tagged). **Top-5** = three signatures (S3, S9, S1) + two CRITICALs (S4; S6 is both). **CRITICAL coverage:** all 6 audit CRITICALs own a proposal (L3-1→S5, L3-2→S4, L2-1→S2, L5-01→S6, L5-03→S18, L6-01→S9), and four of the six land in the top nine.

---

## 5. Parked-reconciliation + Sky-decision forks

**Parked items (6) — all dispositioned** (full table in `slate-proposals.v2.md`; source `partials/dispositions.md`):

| # | Parked item | Lands as |
|---|---|---|
| ① | RecentlyViewedRow white-digit | **In scope** → S2 (site 5 of 6 in the textOnColor adoption) |
| ② | `stagePoolB` lower-right pool | **Sky-fork 7** (keep/kill taste call — imperceptible either way) |
| ③ | Dark saved-place-chips | **Sky-fork 8** (unbuilt variant; device-only read) |
| ④ | EXIF-strip + VoiceOver checks | **Device list** (EXIF GPS verify + L6-04 flattening + L6-19 modal) |
| ⑤ | `ui/Button` adopt-or-remove | **Sky-fork 9** (zero call sites; adopt vs delete) |
| ⑥ | `bodyMedium` ≥500-on-glass | **Device list** (haze feel — arbiter-clean, perceptual only) |

**Sky-decision forks (9)** — every top proposal that sits atop a backend/data/scope decision carries a FORKS-TO-SKY line scoping only its UI half. Consolidated in `slate-integration.md` §2: proximity architecture (behind S4), points-economy honesty (S… trigger), auth-wall/guest contract (behind S5/S15/S19), k-anonymity/cache-scope, trust-model scope (behind S3/S1's count-date half), product-name collision, + the three parked taste/scope forks (②③⑤).

**Consolidated NEEDS-SKY-DEVICE list** — one deduped list in `slate-integration.md` §3, folding in every proposal's device leg + parked ④ + ⑥ + L2-6 true-blur + L4 native RM traces + iOS light Apple tiles + RT states + real Dynamic Type + **the ONE EAS TestFlight build** (Sky's build, Sky's merge — the gate every device truth converges on).

---

## 6. File index

- **Reader-facing report:** `2026-07-04_AccessMap_Design_Review.md`
- **Canonical proposals (7 fields each, reconciled):** `partials/slate-proposals.v2.md` · pre-reconcile: `partials/slate-proposals.md`
- **Ranking + judge matrix:** `partials/slate-ranking.md`
- **Phases + forks + device list:** `partials/slate-integration.md`
- **Draft rosters:** `partials/slate-draft-{arrival-trust,material,flows-device,access,motion-perf}.md`
- **Skeptic verdicts:** `partials/slate-verdict-S1..S20.md`
- **Judge scorecards:** `partials/judge-P{1,2}-{advocate,craft,taste}.md`
- **Part 1/2 inputs:** `01_orientation.md`, `01_baseline-reads.md`, `01_render-index.md`, `02_findings.md`, `partials/{L1..L8,calibration,dispositions,sky-notes,protect-merged,verdicts,copy-index}.md`

---

## 7. Cold-read gate

**Verdict: SHIP** (fresh zero-context agent, read only `2026-07-04_AccessMap_Design_Review.md` + read-only `ls`/`test -f` on cited assets). All seven checks passed, no FIX-list:

1. **Stands alone** — every load-bearing concept (severity grammar, GLASS.md law, the two header families, "web IS guest mode," the arbiter/contrast system, PROTECT, forks) is defined before it's leaned on; no dangling references.
2. **Exec summary one screen** — per-persona FIND/Trust/CONTRIBUTE grades for all R1–R6, a cohesion verdict vs GLASS.md (names the header split), the top-5, and the signature thesis.
3. **Actionability** — ranked (finals), tiered (S/M/L), phased (0→5); do-first items unambiguous + CRITICAL-tagged; 9 Sky-forks + the device-only list in their own labeled sections.
4. **Asset links resolve** — all 36 annotated PNGs exist (spot-checked 8); render-index, findings, verdicts, integration, and the permission-denied captures all present; zero missing.
5. **Trace integrity** — all 20 proposals carry a `Resolves:` line citing L{n}-{seq}; every cited finding appears in §3.
6. **Honesty caveats** — the "annotated PNG shows the surface, not the defect" caveat verbatim + full code-/probe-only list; §7 coverage statement (rendered vs code-inferred vs device-only, incl. where the audit is thin) + the Fable→Opus model-provenance disclosure.
7. **Internal consistency** — exec-summary top-5 (S3/S9/S1/S4/S6) matches the ★TOP-5 markers; all 20 appear in both the ranked table and as full sections; the ambition-mix prose (7+8+3+2) reconciles to 20; the 6-CRITICAL mapping agrees everywhere.

_"The report is dense but every section earns its place, and a reader with zero prior context can act on it Monday morning."_ — cold-read agent.

**Part 3 COMPLETE.** No fixes required post-cold-read. Fence held end-to-end: HEAD `82e738b` unchanged, zero tracked-file modifications, only `design-reviews/fable-audit/` additions.
