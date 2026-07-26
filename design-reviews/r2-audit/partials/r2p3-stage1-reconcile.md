# R2 Part 3 — Stage 1: RECONCILE (working partial)

Date 2026-07-10 · Model: claude-fable-5 max (this session; Sky-pinned via /model) · HEAD `a8549ff` `bench/4-quality` (re-verified at Part-3 start; markers 3/3; arbiter banked header re-read: `EXIT CODE: 0 … RESULT: ALL PASS`, 80 pairs).

## Sources + id inventories

| source | ids | count |
|---|---|---|
| `02_feel_findings.md` final ladder (post-verification) | F1-01…F6-09 canonical | **65** (73 filed → 65; dedup map in 02 §Calibration / `partials/ladder.json`) |
| `03_material_census.md` §2 | M-01…M-57 | **57** (critic PASS; Stage-6: zero rows re-classified) |
| `04_material_migration_spec.md` §1 reading test | breaks B1…B14 — **aliased RB1…RB14 in Part-3 artifacts** (collision guard vs bench B1–B11; numbers unchanged, ids in 04 untouched) | **14** |
| `04` §6 open-question register | items §6.1…§6.12 | **12** |
| `04` §8 shipped-drift families (trials file, exit 1 by design) | M-52 View · M-36 reopen · M-48 light-inactive · M-51 chip · M-22 rankTop · M-46 dark chrome | **6** (5 repaired in-train; M-48 light-inactive = the Part-3 slate obligation, §6.12) |

**Pre-flight judgment call (logged per plan):** the reading-test break list lives in `04` §1, not inside `03` as Part 3's completeness wording expects. Nothing is absent on disk — placement difference only; proceeded.

## The merged severity ladder (one ladder — what the slate walks)

RB placements are Part-3 reconciliation calls (Part 2 tiered nothing); rationale = Round 1's severity definitions ("materially impairs … the cohesion/trust mission" = HIGH). RB12/RB13 are NOT defects (ratified tiers — §2b; they land in conservation as ratified/fork rows, not on the ladder).

- **CRITICAL (1):** F2-01 — pin callout composites under map chrome (S3 trust doorway; the signature text itself occluded).
- **HIGH (22):** F1-01 · F1-02 · F1-03 · F1-04 · F2-02 · F2-03(≡F5-04/08) · F2-04(≡F5-06) · F3-01(≡F5-07) · F4-02 · F4-03 · F5-02 · F5-03 · F6-01 — plus material: RB1 two-worlds tab switch · RB2 leftover legacy pane · RB3 glass sheet over paper page · RB4 trust ledger wears the least-considered material (S3 doorway) · RB5 same break, other doorways · RB6 one hallway, two buildings (Profile list) · RB7 the same split inside Settings · RB8 boot strobe (dark-mode first frame) — plus drift: **M-48-ink** shipped tab bar light-inactive label fails AA on every translucent state (3.17/4.04; live worst cases: dark photos under bar, always-dark web tiles; 04 §4/§6.12 "Part 3 slates it").
- **MEDIUM (29):** F1-05..09 · F2-05..08 · F3-02 · F3-03(≡F4-05) · F4-01 · F4-04 · F4-06..11 · F5-01(≡F4-12) · F5-05 · F6-02(≡F2-09) · F6-03..06 — plus RB10 third recipe on the map · RB11 the one banner not speaking banner · RB14 the last nav header (Admin).
- **LOW (19):** F1-10(≡F2-10) · F1-11 · F1-12 · F1-14 · F2-11 · F3-04..06 · F4-13..19 · F6-07..09 — plus RB9 drawer siblings' presentation-shape delta (glass-family softened).
- **POLISH (7):** F1-13 · F2-12 · F2-13 · F3-07 · F4-20 · F5-09 · F5-10.

**Cross-part dedup:** no true duplicates found — Part 1 files FEEL defects, Part 2 files MATERIAL defects; where both touch one surface they are different facets. Cross-refs recorded (one defect once, facets linked): RB4 ↔ F6-01 (same sheet: material holdout vs grammar-goes-quiet — one T may resolve both, ids stay distinct) · RB11 ↔ F4-19 (UpdateBanner: material vs emoji copy) · RB10 ↔ F5's PROTECT'd recovery card (material recipe vs protected state pattern — the fix must not disturb the PROTECT) · RB2 ↔ F1-11 (Home search pill: legacy material vs press affordance).

## Preliminary conservation buckets (T-ids back-filled after Stages 2–3; final table lives in the report §4)

**M-ids (57) — mechanical from 04 §2g:**
- PROPOSAL(T-migration): the 15 MIGRATE rows — M-06 · M-22 · M-23 · M-24 · M-36 · M-37 · M-38 · M-39 · M-40 · M-41 · M-42 · M-49 · M-52 · M-55 · M-56 (in-train drift repairs M-46/M-51 ride MP0 while their rows stay ratified).
- NO-ACTION(ratified, 04 §4 reasons): M-01..M-05 · M-07..M-21 · M-25..M-35 · M-43 · M-44 · M-45 · M-46 · M-47 · M-50 · M-51 · M-53 · M-54 · M-57 — with M-48 split: mechanism-adoption KILLED (trial record, NO-ACTION) + its shipped ink drift → PROPOSAL (M-48-ink T).
- FORK-adjacent rows stay bucketed above with the fork noted as boundary: M-14 (Fork 8) · M-12/M-13 (§6.2 new fork) · M-25..M-35 mechanism lever (§6.3, B4 flag #2) · M-47 blacks (§6.10).

**RB1–RB14:** RB1/RB2/RB3 → PROPOSAL(T-migration, MP1+MP0) · RB4/RB5/RB6/RB7 → PROPOSAL(T-migration, MP2–MP4) · RB8 → PROPOSAL(T-migration, MP0/M-56) · RB10 → PROPOSAL(T-migration, MP0/M-55) · RB11 → PROPOSAL(T-migration, MP0/M-52) · RB14 → PROPOSAL(T-migration, MP5 — Sky may skip; §6.7) · RB9 → NO-ACTION(recorded delta; glass-family) · RB12 → NO-ACTION(ratified dialog tier) with craft-delta remainder → candidate T (§6.11) · RB13 → NO-ACTION(ratified law) + FORK(§6.2).

**§6 register routing (never silently resolved):** §6.1→Fork 8 (inherited, boundary) · §6.2→NEW FORK (M-12/M-13 keep vs engineered swap) · §6.3→Sky-note under inherited B4 flag #2 (mechanism lever) · §6.4→Fork 9 boundary note (ui/Sheet) · §6.5→Sky-note (GLASS.md doc ownership) · §6.6→Sky-note (M-57 hex-sync comment) · §6.7→Sky-note inside T-migration (MP5 skip) · §6.8→NEW FORK or Sky-note (M-37 locked-row idiom) · §6.9→candidate T (MyWatched `accessibilityViewIsModal` — one-prop a11y hygiene; landing spot = Sky-note) · §6.10→NEW FORK or Sky-note (lightbox blacks) · §6.11→candidate T (dialog-tier craft deltas unify-or-record) · §6.12→candidate T (M-48-ink).

**F-ids:** buckets firm during Stage 2 drafting (PROPOSAL for CRIT/HIGH + draftable MEDIUMs; PROTECT for the ~33 lens nominations' subjects; PARK/NO-ACTION with reasons for the tail). Open item carried from 02 honesty ledger #16: F4-03's denied-arrival-banner render question → Sky-note/device row (S4 regression-watch adjacent). Part-2 PROTECT flag carried: ThemeContext total-default is load-bearing (S9 B.2) → PROTECT addition candidate.

## Process log (Part 3)

1. Step 0 pre-flight PASS (markers 3/3 · HEAD match · inputs complete · arbiter header re-read exit 0 · fence baseline banked to scratchpad).
2. Stage 1 reconcile: this file. Ladder merged (1 CRIT · 22 HIGH · 29 MED · 19 LOW · 7 POLISH = 78 defect-class items + 2 ratified-tier rows); RB alias declared; conservation prelim buckets assigned; no orphans by construction (65F+57M+14RB+12§6 all routed).
3. Next: Stage 2 drafter Workflow (4 clusters, fable/max, schema-forced) → merge to T1…Tn in `05_r2-slate.md`.
