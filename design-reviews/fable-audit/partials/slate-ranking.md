# Fable Audit — AccessMap — Part 3: The Ranked Slate (canonical)

**Subject:** AccessMap @ `main` `82e738bc177f8a0b14ca0aa978c6ffb92bc5c54b` (post-glass-chain HEAD). **Date:** 2026-07-04.
**Source of record.** The 20 canonical proposals are frozen in `partials/slate-proposals.v2.md` (v2 reconciled — 12 KEEP / 8 FIX / 0 KILL). This file is the **canonical ranked ordering** plus the **full judge score matrix** the ranking was computed from. It ranks the slate; it does not re-open it. Nothing here edits app code, runs a build, or touches the database — it is a read-only synthesis of the two judge panels' scores.

---

## Scoring model (stated explicitly)

Two judge panels (P1, P2), each with three judges (**advocate**, **craft**, **taste**). Each judge produces, per proposal, a **composite** on a 0–20 scale:

```
composite = impact*2 + cohesion + ethos
```

- **impact** (0–5) — how much the change moves the disabled-user experience / closes a real defect; doubled because impact is the dominant axis for a civic safety product.
- **cohesion** (0–5) — how much it makes the app read as one deliberate product (material / chrome / content / motion coherence).
- **ethos** (0–5) — how in-character it is for AccessMap's stated identity (born-accessible, honest, the severity-grammar signature, GLASS/WCAG discipline).

Maximum composite = `5*2 + 5 + 5 = 20`.

Aggregation, in order:

1. **Panel score** = arithmetic **mean of that panel's 3 judge composites**.
2. **Final score** = **mean of the two panel scores** (a median-of-2 — each panel weighted equally, so no single judge or panel can dominate; the two-panel mean is deliberately conservative).
3. **Effort tiebreak** — when finals tie, the **smaller effort wins the higher rank** (S < M < L). A cheaper proposal at equal merit ships sooner.
4. **Stable-ID tiebreak** — if still tied, the **lower stable `S{n}` ID** wins (deterministic, audit-stable). 

**Worked tie (the only one in this slate):** S15 and S16 both finish at **14.167**. S15 is effort **S**, S16 is effort **M** → S15 takes rank 16, S16 rank 17. (The effort tiebreak resolves it before the ID tiebreak is needed.)

**Verification note.** Every panel mean and final below was recomputed from the raw judge matrix (§ Full judge score matrix) and matches the ranking table exactly (all 20 rows; P1, P2, and final to the published precision). The formula chain is closed and reproducible.

---

## THE RANKED SLATE (canonical order, best first)

`P1` = P1 panel mean · `P2` = P2 panel mean · `final` = mean(P1, P2) · **TOP-5** = the five highest finals.

| rank | id | title | effort | tier | P1 | P2 | **final** | top5 | fork | dev |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | S3 | The map pin becomes a doorway: surface the trust ledger where trust is spent | L | Signature ★ | 20 | 19.33 | **19.667** | ★TOP-5 | FORK | DEV |
| 2 | S9 | Mount the accessibility engine on web: adopt the modern RN ≥0.71 a11y dialect | L | Signature ★ | 19.67 | 19.33 | **19.5** | ★TOP-5 | FORK | DEV |
| 3 | S1 | Wear the severity grammar everywhere severity is spoken (and define "verified" in the same breath) | M | Signature ★ | 19.33 | 19.33 | **19.333** | ★TOP-5 | FORK | DEV |
| 4 | S4 | Honest arrival: kill the "N flags nearby" lie and surface the denied-location banner (CRITICAL) | M | Meaningful | 18.67 | 18 | **18.333** | ★TOP-5 | FORK | DEV |
| 5 | S6 | Give the map an honest zoom: app-styled 44pt zoom buttons in the overlay bottom | M | Signature ★ | 17.67 | 17.67 | **17.667** | ★TOP-5 | FORK | DEV |
| 6 | S2 | Adopt the ratified textOnColor ink at the six un-forked severity-digit sites (CRITICAL) | S | QuickWin | 17.33 | 17.67 | **17.5** |  | FORK |  |
| 7 | S7 | Claim the flagship map: theme the tiles, tame the third-party chrome (web-scoped) | M | Signature ★ | 17 | 17.33 | **17.167** |  | FORK | DEV |
| 8 | S5 | Make the Report pill actually start a report (location parity on the Home-pill path) (CRITICAL) | S | QuickWin | 17 | 16 | **16.5** |  | FORK |  |
| 9 | S18 | "Submit report" label + 200%-zoom reflow guards (CRITICAL) | S | QuickWin | 16 | 16.33 | **16.167** |  | FORK | DEV |
| 10 | S11 | Data-layer timeout + honest "still trying" escalation (the danger-path silence fix) | M | Meaningful ★ | 16 | 15.33 | **15.667** |  | FORK | DEV |
| 11 | S13 | Free the Tasks card actions from the accessible-parent trap (native VoiceOver #1) | M | Meaningful | 16.33 | 14.67 | **15.5** |  | FORK | DEV |
| 12 | S8 | One editorial header family across every tab | M | Signature ★ | 15.67 | 15 | **15.333** |  | FORK | DEV |
| 13 | S10 | Confirm the submit: a visible + live success banner on the CONTRIBUTE finish line | M | Meaningful | 16 | 14.33 | **15.167** |  | FORK | DEV |
| 14 | S14 | Give map pins the ratified hairline boundary so low-severity barriers stop vanishing on light tiles | M | Meaningful | 15.67 | 14 | **14.833** |  | FORK | DEV |
| 15 | S12 | Bring the web map camera up to the native reduce-motion standard (kill the falsy-zero trap) | M | Meaningful | 15 | 14.33 | **14.667** |  | FORK | DEV |
| 16 | S15 | First-run honesty sweep: retire the four promises the app can't keep in minute one | S | QuickWin | 15 | 13.33 | **14.167** |  | FORK |  |
| 17 | S16 | Fix the two worst map touch targets: the bare-text "Clear" and the invisible action-bar overflow | M | Meaningful | 15.67 | 12.67 | **14.167** |  | FORK | DEV |
| 18 | S17 | Contain the Home map peek: one clean button, no tap-theft, no app-exit | S | QuickWin | 15 | 13 | **14** |  | FORK | DEV |
| 19 | S19 | Give the location consent slide a visible "Not now" (and stop the web permission theater) | S | QuickWin | 14.33 | 12.33 | **13.333** |  | FORK | DEV |
| 20 | S20 | Repair the trust-fallback surfaces (Help FAQ accuracy, stale changelog, About anchors, casing sweep) | S | QuickWin | 12.67 | 11 | **11.833** |  | FORK |  |

**Column key.**
- **tier** — Signature ★ = one of the 7 deliberate signature bets; Meaningful ★ (S11) = tagged co-signature but scored/ranked as Meaningful; QuickWin = small high-signal fix; Meaningful = mid-effort structural fix.
- **top5** — the five highest finals: **S3, S9, S1, S4, S6** (ranks 1–5). These are the slate's headline bets.
- **fork** — every proposal carries a FORKS-TO-SKY line in `slate-proposals.v2.md` (each scopes only its UI half; the data/privacy/scope half is Sky's — consolidated in `slate-integration.md` §2). Marked FORK on all 20 for that reason.
- **dev** — DEV = the proposal has at least one NEEDS-SKY-DEVICE leg (the consolidated device list is `slate-integration.md` §3). Blank = fully in-harness verifiable (S2, S5, S15, S20 — all copy/token/logic, no device gate). The four non-DEV rows are exactly the ones whose verification needs no iPhone.

**TOP-5 read.** The top five are three signatures (S3, S9, S1) and two CRITICALs (S4 is CRITICAL; S6 is both CRITICAL *and* signature). Four of the six audit CRITICALs (S4, S6 in the top-5; S2, S5, S18 just below; S9 in the top-5) land in the top nine — the ranking naturally floats the must-ship access breaches and the signature moments together, which is why the phase plan in `slate-integration.md` can front-load CRITICALs without fighting the ranking.

---

## Full judge score matrix (the raw composites)

Each cell is that judge's **composite** (`impact*2 + cohesion + ethos`, 0–20) for that proposal. Panel mean and final are derived directly from these six rows.

| id | P1-advocate | P1-craft | P1-taste | **P1 mean** | P2-advocate | P2-craft | P2-taste | **P2 mean** | **final** |
|---|---|---|---|---|---|---|---|---|---|
| S1  | 20 | 20 | 18 | 19.33 | 20 | 18 | 20 | 19.33 | **19.333** |
| S2  | 17 | 18 | 17 | 17.33 | 19 | 17 | 17 | 17.67 | **17.5** |
| S3  | 20 | 20 | 20 | 20.00 | 19 | 19 | 20 | 19.33 | **19.667** |
| S4  | 19 | 18 | 19 | 18.67 | 19 | 17 | 18 | 18.00 | **18.333** |
| S5  | 18 | 17 | 16 | 17.00 | 17 | 15 | 16 | 16.00 | **16.5** |
| S6  | 18 | 18 | 17 | 17.67 | 19 | 16 | 18 | 17.67 | **17.667** |
| S7  | 15 | 18 | 18 | 17.00 | 17 | 17 | 18 | 17.33 | **17.167** |
| S8  | 15 | 16 | 16 | 15.67 | 16 | 13 | 16 | 15.00 | **15.333** |
| S9  | 20 | 20 | 19 | 19.67 | 20 | 19 | 19 | 19.33 | **19.5** |
| S10 | 16 | 16 | 16 | 16.00 | 16 | 13 | 14 | 14.33 | **15.167** |
| S11 | 16 | 16 | 16 | 16.00 | 16 | 16 | 14 | 15.33 | **15.667** |
| S12 | 15 | 16 | 14 | 15.00 | 16 | 13 | 14 | 14.33 | **14.667** |
| S13 | 16 | 18 | 15 | 16.33 | 15 | 14 | 15 | 14.67 | **15.5** |
| S14 | 14 | 18 | 15 | 15.67 | 14 | 14 | 14 | 14.00 | **14.833** |
| S15 | 14 | 17 | 14 | 15.00 | 17 | 13 | 10 | 13.33 | **14.167** |
| S16 | 16 | 16 | 15 | 15.67 | 15 | 11 | 12 | 12.67 | **14.167** |
| S17 | 14 | 16 | 15 | 15.00 | 14 | 12 | 13 | 13.00 | **14** |
| S18 | 16 | 17 | 15 | 16.00 | 18 | 15 | 16 | 16.33 | **16.167** |
| S19 | 15 | 15 | 13 | 14.33 | 14 | 12 | 11 | 12.33 | **13.333** |
| S20 | 12 | 14 | 12 | 12.67 | 12 | 11 | 10 | 11.00 | **11.833** |

**Panel means shown rounded to 2 dp; finals to the published precision (3 dp where it repeats, else exact).** Per-judge source files: `judge-P1-advocate.md`, `judge-P1-craft.md`, `judge-P1-taste.md`, `judge-P2-advocate.md`, `judge-P2-craft.md`, `judge-P2-taste.md`.

### Where the two panels disagreed (largest final-affecting gaps)

The two-panel mean is what smooths these; recording them so the ranking's stability is auditable:

- **S16** — P1 15.67 vs P2 12.67 (Δ3.00, the widest split). P2-craft (11) and P2-taste (12) read the action-bar overflow affordance as lower-cohesion than P1 did; the mean (14.167) still lands it mid-table but the effort tiebreak (M) drops it below S15.
- **S13** — P1 16.33 vs P2 14.67 (Δ1.66). P1-craft's 18 (the structural a11y-tree fix is craft-satisfying) vs P2-advocate's 15; the device-gated confirmation tempers the P2 advocate read.
- **S10** — P1 16.00 vs P2 14.33 (Δ1.67). P2-craft (13) and P2-taste (14) discount it as a supporting act to S5; P1 valued the finish-line payoff more evenly.
- **S15 / S19 / S20** — each shows P2 markedly below P1 (Δ1.67 / 2.00 / 1.67), the copy-sweep proposals reading as lower-ethos to P2-taste (10/11/10). They cluster at the bottom of the ranking accordingly — real, honest, but low-signature.
- **Full agreement:** S6 (17.67 = 17.67) and S1 (19.33 = 19.33) — both panels converged exactly, which is part of why S1 and S6 sit so confidently in the top-5.

---

## Anchors to the rest of Part 3

- **The 20 proposals in full** (all 7 fields each, reconciliation notes, PROTECT citations): `partials/slate-proposals.v2.md`.
- **Phasing, Sky-decision forks, consolidated device list:** `partials/slate-integration.md`.
- **Parked-item dispositions (6 rows):** `partials/dispositions.md` and the PARKED-RECONCILIATION table in `slate-proposals.v2.md`.
- **Sky-decision source notes (backend/data/privacy/scope):** `partials/sky-notes.md`.
- **The 6 CRITICALs** and their proposal owners: L3-1→S5, L3-2→S4, L2-1→S2, L5-01→S6, L5-03→S18, L6-01→S9.

*Ranking is read-only. The order above is advisory input to Sky's sequencing decision; the phase plan follows this ranked slate, never the reverse.*
