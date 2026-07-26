# R2 BUILD PLAN — MASTER (the whole judgment, first)

**What this is:** the phased execution train for AccessMap Round 2 — every proposal in the Round-2 slate scheduled into exactly one fire-ready phase, with the material-migration sub-train nested intact. Authored 2026-07-15 on **Claude Fable 5 max effort** (same window as the Part-3 synthesis); **execution runs on Opus 4.8 ultracode MAX EFFORT, all sub-agents max effort** — the report + these prompts carry the judgment, so no executor re-derives design. If this window had died mid-plan: any missing phase file is authorable FROM this master + the report alone (the template contract in §12 + the phase table in §5 carry everything structural; the T-block specs live in the report §5).

**Deadline-resilience note:** this file was written FIRST, before any phase file.

---

## §1 Authority chain (read order for every window)

1. **`design-reviews/r2-audit/build-plan/DECISIONS.md`** — the cross-window ledger. Every phase reads it FIRST and appends its results. A pick made in one window reaches the next as disk state, never chat history.
2. **THE REPORT (the design authority):** `/Users/skypie/AccessMap/design-reviews/r2-audit/2026-07-10_AccessMap_R2_Design_Review.md` — verified on disk at plan-authoring (178,555 bytes; cold-read verdict SHIP). Execute to its recorded taste; never invent a decision it already made.
3. **For MP phases only, ALONGSIDE the report:** `design-reviews/r2-audit/04_material_migration_spec.md` (the train's per-M-id atomic edits, §3) + `design-reviews/r2-audit/tools/r2-material-stacks.json` (the arbiter declaration; banked proof `design-reviews/r2-audit/assets/arbiter/r2-material.txt`, exit 0, 80 pairs).
4. Working record: `design-reviews/r2-audit/05_r2-slate.md` (process log, skeptic raw verdicts at `design-reviews/r2-audit/partials/r2p3-stage3-raw.json`).
5. Material law: `GLASS.md` (repo root) + `DESIGN.md` — REFERENCED, never re-invented. `src/components/ui/GlassSurface.tsx` is DO-NOT-EDIT.

All repo paths relative to `/Users/skypie/AccessMap`.

## §2 Audited state + the version handshake

- **Audited SHA:** `bench/4-quality` @ `a8549ff3d6d15ed4410b71d803d50a130613d3d0` (main was `01f7392` — bench NOT merged at plan-authoring).
- **Baseline markers (re-verify in BP1):** `PHOTO_MAX_DIMENSION` greps in `src/lib/flags.ts` (+ its test) · `src/components/LiveStatusRegion.tsx` exists · `variant="bulk"` in `src/screens/NearbyFlagsModal.tsx` (~:202).
- **Test baseline:** jest **1857/0** · typecheck 0 · lint 0 errors (77 warnings pre-existing). No known flakes at this base (the `/ago$/` fixture flake was fixed in `01f7392`, which bench stacks on). **Any red at base = STOP.**
- **THE HANDSHAKE (BP1, before any edit):** record actual HEAD/branch; if the tree Sky designates as base ≠ the audited content (markers missing, or meaningful drift in the files a phase touches), **STOP and flag the divergence to Sky — never build against drift.** Record Sky's base designation in DECISIONS.md. Default base: the audited tip `a8549ff` (if Sky has merged bench→main by fire time, base = main and BP1 verifies main contains the three markers).

## §3 Infrastructure discovered (Step-0 truth — the rails are adapted to THIS, not assumed)

| Net | Found on disk | Rail |
|---|---|---|
| **Git** | yes | Stacked branches, ONE linear train (see §4); one commit per work item; each phase records its base tip as the rollback anchor; resume rule (re-fire the same prompt, continue from the first un-landed item); STOP on branch — merge/push/build are Sky's hands, always |
| **Tests** | jest 1857/0 · typecheck · lint (0 err) | Gates on every phase: `npm run typecheck` 0 · `npm test` green with count recorded · `npm run lint` 0 errors, no new warnings |
| **Contrast arbiter** | `~/AccessMap-material-lab/2026-07-02/shared/contrast-check.mjs` + the stacks-JSON convention + GLASS.md/DESIGN.md | ANY color/floor/ink change ships only on a named sibling `tools/r2-<slug>-stacks.json` at exit 0 (measured, never asserted; never eye-tuned). The 7 immutable prior stacks files (`audit/p2-material/bench3-material/shipped/wave1/wave2/map`-stacks.json) stay untouched — diff-check each phase |
| **Deploy** | EAS TestFlight — a STORE-BUILT app | **Scheduling mode: ONE consolidated device gate after the ONE build** (`cd ~/AccessMap && npx eas-cli build --platform ios --profile testflight --non-interactive` — Sky's command, never auto-run). Phases CONTRIBUTE device items to DECISIONS §D; BP17 consolidates the final checklist (§11) |
| **Device boundary** | report §7: blur/frost feel, VoiceOver/TalkBack, haptics, true DT×2, Reduce Transparency, Apple light tiles = device-only. The expo-web DEV server crashes Map/Tasks (lucide lazy) — pre-existing; the **static export lifts it** | Captures/evidence via the audit's own rig: `design-reviews/r2-audit/tools/probe-export.mjs` (static export, `:8082`) + `tools/capture.mjs`. Web evidence = `web-approximated`; tag honestly; NEEDS-SKY-DEVICE flows to DECISIONS §D |

## §4 Train topology (one linear stack — an ordering law, see §6.L2)

```
base (Sky designates; default a8549ff)
 └─ r2/bp1-callout-true            (BP1: T1)
     └─ r2/bp2-perception-floor    (BP2: T11+T16)
         └─ r2/bp3-trust-hand      (BP3: T4+T8)
             └─ r2/mp0-first-frame (BP4: T2/MP0)      ┐
                 └─ r2/mp1-home-stage      (BP5)      │ THE MATERIAL SUB-TRAIN
                     └─ r2/mp2-profile-lists (BP6)    │ (04 §7 verbatim: gates,
                         └─ r2/mp3-overlay-rest (BP7) │  sizes, stop-on-branch;
                             └─ r2/mp4-trust-ledger (BP8) │ MP5 optional-Sky)
                                 └─ r2/mp5-admin-editorial (BP9) ┘
                                     └─ r2/bp10-severity-grammar (T5)
                                         └─ r2/bp11-press-vocab (T3)
                                             └─ r2/bp12-status-ledge (T6)
                                                 └─ r2/bp13-arrival-waits (T7+T9)
                                                     └─ r2/bp14-editorial-frame (T13+T14)
                                                         └─ r2/bp15-drawer-guest (T12+T10)
                                                             └─ r2/bp16-copy-gate (T17+T18)
                                                                 └─ r2/bp17-hygiene-deploy (T19+T15+T20)
```

- Every phase branch cuts from the PRIOR phase's recorded tip (DECISIONS §P carries each tip). If MP5 is skipped (Sky's §6.7 call), BP10 cuts from the MP4 tip and BP17's paper leg records the B14 deliberate-exception line.
- **Sky merges by prefix** (pure ff): merging any phase's tip lands everything before it. Round-1 convention: one merge of the chosen tip, one build.
- Rollback: every phase report names its base tip — `git reset --hard <base>` abandons only that phase.
- T15's `theme.ts` commit lives inside `r2/bp17-hygiene-deploy` — which is NOT an MP branch, so the train's zero-theme-edits gate (each MP phase diff-checks `theme.ts` untouched *on its own branch*) holds by construction.

## §5 The phase table (17 fresh windows)

| # | File | Branch | Carries | Effort | One-line purpose |
|---|---|---|---|---|---|
| BP1 | `01_preflight-and-callout.md` | `r2/bp1-callout-true` | **T1** | M | The version handshake + the slate's only CRITICAL: the callout always lands in clear map, one honest rhythm (canceller, 0ms rung, tile-swap continuity) |
| BP2 | `02_perception-floor.md` | `r2/bp2-perception-floor` | **T11 + T16** | M+S | SR state on every stateful chip + visible/truthful keyboard focus (3 WCAG SCs) + the tab badge gets one writer |
| BP3 | `03_trust-engine-hand-and-voice.md` | `r2/bp3-trust-hand` | **T4 + T8** | M+M | The Report sheet + triage answer the hand (AA-safe pressed treatment, commit-point haptics) + the FlagCard spoken recompose |
| BP4 | `04_mp0-first-frame.md` | `r2/mp0-first-frame` | **T2 · MP0** | 1 window | M-56 boot frame, M-55 empty-card, M-52 banner + the Stage-6 in-tier ink repairs (M-46, M-51) + comment hygiene — highest feel-per-line |
| BP5 | `05_mp1-home-stage.md` | `r2/mp1-home-stage` | **T2 · MP1** | 1 window | M-06: Home joins the stage (every mount + re-ink enumerated in 04 §3) |
| BP6 | `06_mp2-profile-lists.md` | `r2/mp2-profile-lists` | **T2 · MP2** | 1 window | M-39/M-40/M-38: one shared B4-engineered recipe ×3 |
| BP7 | `07_mp3-overlay-rest.md` | `r2/mp3-overlay-rest` | **T2 · MP3** | 1 window | M-37/M-22/M-42/M-24 + the Leaderboard drift re-inks; Fork-12 default (accept-and-record) per block |
| BP8 | `08_mp4-trust-ledger.md` | `r2/mp4-trust-ledger` | **T2 · MP4** | 1 window | M-36/M-41 — the 82 KB FlagDetail last; reopen→brandText carries the ⚑ Sky-veto check |
| BP9 | `09_mp5-admin-editorial.md` | `r2/mp5-admin-editorial` | **T2 · MP5** | 1 window | OPTIONAL (Sky's §6.7 call, checked in DECISIONS before any edit; unanswered → STOP) — M-23/M-49 Admin editorial |
| BP10 | `10_severity-grammar.md` | `r2/bp10-severity-grammar` | **T5** | L | The actor completed: grammar on every severity surface + `SeverityDisc` primitive + the onboarding teaching row |
| BP11 | `11_press-vocabulary.md` | `r2/bp11-press-vocab` | **T3** | L | One press dialect app-wide on the repaired primitive; tab-bar a11y-prop forwarding is load-bearing |
| BP12 | `12_status-ledge.md` | `r2/bp12-status-ledge` | **T6** | M | The status voice gets one podium — placement pub-sub + vehicle arbitration (minimal path per DECISIONS default) |
| BP13 | `13_arrival-and-waits.md` | `r2/bp13-arrival-waits` | **T7 + T9** | M+M | The undetermined arrival's one voice (reusing BP1's instant camera path) + word-every-wait/never-claim-a-zero |
| BP14 | `14_editorial-frame.md` | `r2/bp14-editorial-frame` | **T13 + T14** | S–M+M | Type survives 200%, cheap-win insets (Profile OUT — standing decision) + every chip rail earns its overflow scent |
| BP15 | `15_drawer-and-guest.md` | `r2/bp15-drawer-guest` | **T12 + T10** | S–M+M | The drawer passage (dressed arrival + symmetric exit, 220-collapse hard-coupled) + the guest Profile joins the family |
| BP16 | `16_copy-gate.md` | `r2/bp16-copy-gate` | **T17 + T18** | S+S | Mechanics ship (announce gate, Bell glyph); EVERY string lands in one before/after table → **STOP for Sky's picks** (incl. F4-20 retitle + the Jordan Art. 7 k≥3 sign-off); strings apply only on resume after DECISIONS carries the picks |
| BP17 | `17_hygiene-and-deploy.md` | `r2/bp17-hygiene-deploy` | **T19 + T15 + T20** + consolidation | S×3 | Ghost hues/marks · the tab-bar ink token (arbiter-gated, off-train) · T20's three one-commit legs · **consolidate the deploy checklist + the final R2-D device list** |

## §6 ORDERING LAWS (stop-gates, not suggestions — each with what breaks if violated)

- **L1 — BP1 runs first, and its handshake precedes any edit.** *Breaks:* building on drifted state corrupts every downstream diff, evidence capture, and rollback anchor; and T7 (BP13) consumes the PlatformMap instant-camera path T1 creates — built out of order, T7 forks the camera logic the report forbids duplicating.
- **L2 — One linear stack; every branch cuts from the prior phase's recorded tip.** *Breaks:* parallel branches share files (MapScreen, TasksScreen, FlagDetailModal, UpdateBanner, MyWatchedModal appear in 2+ phases) — parallel topology forces rebases mid-train and voids the per-phase diff gates.
- **L3 — The MP sub-train stays CONTIGUOUS (BP4→BP9) and internally ordered MP0→MP1→MP2→MP3→MP4→(MP5).** *Breaks:* 04 §7 fixes the branch topology (each MP cut from the prior MP tip) and the recipe-maturity law (one recipe proven on six simpler sheets before the 82 KB FlagDetail); interleaving foreign commits into the MP lineage muddies the train's material-only diff discipline that its own PROTECT-diff gate depends on. The sub-train's internal gates survive intact — no exceptions.
- **L4 — BP3 (T4+T8) lands BEFORE BP8 (MP4).** *Breaks:* T8 edits FlagDetailModal a11y labels/verbs; landing them after would put text hunks against MP4's freshly-material diff — MP4's gate asserts content composition byte-identical to ITS base, so text must settle first.
- **L5 — BP10 (T5) lands AFTER BP8 (MP4).** *Breaks:* T5's FlagDetail chip sub-item composes with the re-materialed sheet; the report's own sequencing ("after the material T where both ship").
- **L6 — T15 (`theme.ts`) never rides an MP branch.** *Breaks:* every MP phase gate diff-checks zero `theme.ts` edits; a theme commit on the MP lineage fails the train's own gate. Scheduled BP17 (post-train).
- **L7 — T20's three legs respect their windows:** containment (MyWatchedModal prop) AFTER MP2 merges into the lineage (BP6 tip) — satisfied at BP17; dialog-craft AFTER MP0 — satisfied; paper/doc leg is the CABOOSE (after MP1 at minimum; carries the B14-exception line if MP5 was skipped and the dialog record-note if Sky picked record-not-unify). *Breaks:* landing the containment prop between MP2's cut and merge would blur MP2's material-only diff; documenting §8's Home line before MP1 lands would describe an unshipped state.
- **L8 — BP16 (the copy gate) runs late.** *Breaks:* T17's before/after table must converge on the SETTLED register — earlier phases (T9's error strings, T8's label mechanics, T7's arrival line) land first or the table proposes against moving text.
- **L9 — BP17 runs last.** *Breaks:* it consolidates the launch ledger + device list from every prior phase's contributions; run early it consolidates nothing.
- **Value-front-load (why this order and not pure rank):** ranks 1/4/5 (T1, T11+T8) land in the first three windows; rank 2 (the train) opens with its highest feel-per-line phase (MP0); rank 3 (T5) lands the window after its dependency clears. A train stopped at ANY tip has already shipped the most valuable work available at that depth.

## §7 Cross-phase dependencies (what N consumes from M)

- BP13/T7 ← BP1/T1: the PlatformMap shared instant-camera path (setView/animateTo `animate:false` cut) — REUSED, never forked.
- BP10/T5 ← BP8/MP4: the re-materialed FlagDetail sheet (T5's chip/stake-line sub-item lands on it).
- BP10/T5 → BP16/T18: the `SeverityDisc` primitive (T18's onboarding row prefers it; degrades to the inline recipe if T5 somehow deferred — no hard dependency).
- BP11/T3 ← BP2/T11: chip containers gain state semantics first; T3's pressed styles coordinate into coherent hunks (either order is code-safe; this order matches ranking).
- BP17/T20-paper ← BP4/MP0 (dialog note), BP5/MP1 (GLASS §8 Home line), BP9/MP5 (skip → B14 exception), BP16 (if Sky's dialog pick = record).
- BP17 consolidation ← every phase's DECISIONS §D (device items) + §L (launch items) appends.
- All phases ← BP1's handshake (base designation in DECISIONS §P).

## §8 Sky-gate schedule (the plan schedules gates; it never resolves Sky's halves)

| Where | Gate | Default carried (from the report/DECISIONS — never invented here) |
|---|---|---|
| BP1 | Version handshake result → DECISIONS §P; drift → STOP | Base default = audited `a8549ff` |
| BP8/MP4 | ⚑ reopen-button orange→`brandText` re-ink (fixes a live 2.07 AA fail) | Proceed per 04's block; HONOR a veto if DECISIONS carries one — check before the commit |
| BP9/MP5 | Include/skip (§6.7) | OPEN — unanswered in DECISIONS → the phase STOPS having edited nothing |
| BP12/T6 | Vehicle path | Default = MINIMAL arbitration/stacking (per DECISIONS; full migration is Sky-optional — Fork-2-adjacent strings never move) |
| BP16 | THE COPY GATE — full before/after table (both channels), F4-20 retitle pick, dialect/casing calls, the k≥3 wording with **Jordan Art. 7 semantic-equivalence sign-off** | Nothing ships unproposed; strings apply on resume only after DECISIONS carries the picks |
| BP17/T20-dialog | Unify (fade + e3 four-of-four) vs record-only | Default = unify-down-to-fade per the T20 block; record fallback honored from DECISIONS |
| Any phase | A touched PROTECT surface's before/after renders | Saved to evidence for Sky's eye BEFORE the phase stops |
| Forks 1–13 | NEVER resolved by any phase | UI/read halves only; decision halves surface to DECISIONS §F as questions, never as builds |

## §9 CONSERVATION MAP (both directions — the plan's own gate)

**Slate → phases (every proposal in EXACTLY ONE phase):**
T1→BP1 · T2→BP4–BP9 (its six MP phases; one proposal, one nested sub-train) · T3→BP11 · T4→BP3 · T5→BP10 · T6→BP12 · T7→BP13 · T8→BP3 · T9→BP13 · T10→BP15 · T11→BP2 · T12→BP15 · T13→BP14 · T14→BP14 · T15→BP17 · T16→BP2 · T17→BP16 · T18→BP16 · T19→BP17 · T20→BP17.
**Count: 20/20 mapped; no proposal unmapped (an unmapped proposal is a defect of this plan).**

**Phases → slate (nothing smuggled in):** every work item in every phase file is one of T1–T20 (or T2's MP0–MP5 interior, which IS T2), plus exactly two non-slate DUTIES that create no product change: BP1's version handshake (process) and BP17's checklist consolidation (paperwork from prior phases' ledger appends). **Any new idea during building → DECISIONS §PARKING-LOT, never a phase** — an unaudited addition has none of the slate's adversarial hardening.

## §10 MINIMUM-VIABLE CUT (the fast path that still delivers the thesis)

**BP1 → BP2 → BP3 → BP4 (MP0) → BP5 (MP1) → BP10 (T5)** — six windows:
the sole CRITICAL fixed at the trust doorway (one hand) · the WCAG perception floor + the trust engine's spoken voice (one voice, access-first) · the two loudest material wins — the first frame stops strobing and Home joins the stage (one material, where every session starts) · and the severity grammar completed everywhere it renders (the signature). T2 is knowingly PARTIAL in this cut (MP2–MP4 finish the one-material claim); the train pauses cleanly at any tip because Sky merges by prefix. NOTE for the cut: BP10 normally sequences after MP4 (L5) — in the MVC, T5's FlagDetail chip sub-item is DEFERRED (one commit, clearly marked) and lands when MP4 does; everything else in T5 proceeds.

## §11 Launch-sequencing ledger (seed — BP17 consolidates the final checklist)

1. Sky designates the merge tip (any phase prefix; full train = `r2/bp17-hygiene-deploy` tip) → **Sky merges** (pure ff expected) — never an agent.
2. **Sky fires the ONE build:** `cd ~/AccessMap && npx eas-cli build --platform ios --profile testflight --non-interactive`.
3. **The consolidated device gate** (after the one build): the report §4's **R2-D0…R2-D18** ledger + every per-phase addition accrued in DECISIONS §D. Highest-stakes single check: R2-D1 (Tasks-card VoiceOver flattening). Privacy gate: R2-D4 (EXIF GPS). The train's own gate: R2-D14.
4. No web deploy exists for AccessMap (web is a verification surface, not a product deploy). No DNS items. No store submission (prohibited — TestFlight only, Sky's hand).
5. Post-device-pass follow-ups (Sky's picks recorded in DECISIONS): Fork answers that unlock deferred halves (e.g. Fork 11 mechanism flip; Fork 10 swap addendum phase if chosen).

## §12 THE PHASE-PROMPT TEMPLATE CONTRACT (every phase file carries ALL of this — and how to rebuild one)

Every `NN_*.md` is a self-contained, fresh-window prompt with these sections, in order:
1. **HEADER** — phase id/name · branch + base (= prior phase's tip from DECISIONS §P; BP1 ALONE: the Sky-designated base per S-9 — §P starts empty and BP1's handshake writes its first entry) · carries (T-ids) · effort · model note carrying, in substance: *"Authored on Fable 5 max (2026-07-15, the synthesis window). EXECUTE on Opus 4.8 ultracode MAX EFFORT, all sub-agents max effort. Provenance honestly tagged in the phase report."*
2. **READ FIRST** — DECISIONS.md (apply every standing decision touching this phase) → the report at its exact path (the phase's own ranked block(s) + §4 PROTECT + §5 fork boundaries) → (MP phases) 04 §3's named block lines + the stacks JSON. **Verify-first:** every cited `file:line` was true at authoring — re-grep the anchor text before editing; small drift → adapt and note; meaningful drift (mechanism moved/absent) → STOP to Sky.
3. **STANDING DECISIONS INLINED** — the subset relevant to this phase, copied in (self-containedness includes decisions).
4. **THE WORK — the phase's T-block spec(s) INLINED VERBATIM from the report** (all seven fields + the absorbed skeptic FIX line) + the commit plan (one commit per work item, named).
5. **RAILS (adapted per §3)** — report = authority · PROTECT ACTIVE (§13) · fork discipline (UI/read halves only; decision halves → DECISIONS §F) · honesty fences (no invented copy/claims/numbers; strings PROPOSED unless DECISIONS carries the pick; em-dash status grammar) · `GlassSurface.tsx` DO-NOT-EDIT · `pointerEvents="box-none"` law untouched · blur budget never exceeded (worst simultaneous state + the invisible tab-bar pane) · RM designed-stillness + 220ms delay-gate/pulse discipline · no CSS-only tricks (RN) · zero Supabase writes, no deploys, no external sends.
6. **GATES (all hard, before the stop)** — typecheck 0 · jest green, count recorded (baseline 1857 at `a8549ff`; count grows with added guards) · lint 0 errors/no new warnings · arbiter sibling `tools/r2-<slug>-stacks.json` exit 0 for ANY ink/floor change (name it) · blur-pane count asserted where material/panes touched · PROTECT before/after renders saved · captures via the static-export rig where visual · **diff = intended files only** (list them) · the 7 immutable stacks files untouched · every phase-assigned item CLOSED or explicitly forked with a reason — nothing silently dropped.
7. **EVIDENCE + LEDGER DUTIES** — write `build-plan/evidence/BP{nn}-verification-evidence.md` (what shipped, per-gate results, honest tags: verified / web-approximated / code-inferred / NEEDS-SKY-DEVICE) · captures under `build-plan/evidence/BP{nn}/` · append to DECISIONS: §P (this phase's tip SHA), §D (device items contributed), §L (launch items), §F (any fork question surfaced), gate results.
8. **STOP** — built + green + STOPPED on the branch. Never merge, push, build, deploy. One phase per fresh window. **Resume rule:** re-fire this same file after a stall; reconcile the branch's existing commits against the commit plan and continue from the first gap — never redo a landed item, never renumber.

**To rebuild a lost phase file:** take §12's skeleton, fill §5's row (branch/carries/purpose), inline the T-block(s) from the report §5 (grep `### #N · T{id} —`), add the phase-specific laws from §6/§7/§8 that name it, and the DECISIONS subset. That is the whole recipe — no other context needed.

## §13 PROTECT — ACTIVE, not decorative

The report §4 lists PROTECT-1…17 (Round 1) + PROTECT-18…27 (Round 2) + the Round-2 nominations. Every phase: (a) quotes the PROTECT items its files touch, (b) **re-renders each touched PROTECT surface before/after** (static-export rig) and saves both frames to its evidence folder for Sky's eye, (c) diff-verifies the byte-preserved ones its T-block names. Load-bearing spot list by phase: BP1 (box-none law, SR nested-detail continuity, S12 RM intent) · BP2 (audible filter-acknowledgment loop, PROTECT-26 announce shim) · BP3 (PROTECT-3 sheet architecture, haptics RM-independence, confirm-gate-on-Reject, PROTECT-18 announce law) · BP4–BP9 (the train's §3 PROTECT statements re-verified by diff, PROTECT-21 bulk tier, PROTECT-27 ThemeContext default) · BP10 (PROTECT-4 grammar, PROTECT-25 wording spine, ink-fork asymmetry, pin four-channel capacity, Legend/Nearby geometry) · BP11 (drawer-row dim + FlagCard stack spread-never-dilute, PROTECT-20 44pt) · BP12 (PROTECT-18 announce mechanism byte-preserved) · BP13 (PROTECT-2 recovery card, S11 read ladder, honest no-location suffix, PROTECT-19 em-dash grammar) · BP14 (ScreenHeader rhythm, M18/M16 contracts) · BP15 (welded arrival, presentation grammar 25/5, Suspense-null warm chunks, PROTECT-17 disabled-label pattern) · BP16 (PROTECT-1 Nearby row labels frozen, PROTECT-11 privacy voice, spoken-brevity twins, five-way empty fork) · BP17 (PROTECT-24 Lucide house style, the M-48 kill record, PROTECT-5 arbitration system).

## §14 PARKING LOT (planning-time ideas — NOT scheduled; Sky's to promote)

*Empty by discipline at authoring.* Nothing new was invented during planning; every scheduled item traces to the audited slate. (If executors hit an idea mid-phase: it lands in DECISIONS §PARKING-LOT with a one-line rationale — never in a phase.)

## §15 ADVERSARIAL SELF-VERIFY (the audit's discipline, turned on this plan)

One skeptic per phase file + one for master+DECISIONS, each checking: genuinely fresh-window runnable (zero unstated context) · specs + standing decisions carried INSIDE · the report path real and cited · rails match §3's discovered infrastructure · its conservation entries true (carries exactly its §9 T-ids; nothing smuggled). Verdicts + applied fixes recorded here:

**SELF-VERIFY RECORD (2026-07-15, the authoring window):** 18 adversarial skeptics ran (one per phase file + one on this master/DECISIONS pair), **Fable 5 max effort**, all read the real disk state. Verdicts: 11 PASS / 7 FIX — **10 BLOCKERs + 43 MINORs, ALL APPLIED** (raw verdicts banked at `design-reviews/r2-audit/build-plan/evidence/selfverify-raw.json`). The blockers the pass caught and killed: BP1's template residue that would have deadlocked the train's first window (the empty-§P STOP condition) · BP3 silently dropping two T8 legs (the Home statusA11y-with-distance branch + the severity-4 photo-nudge label) and citing a nonexistent LegendModal path · BP10/BP13's diff-scope gates contradicting their own inlined specs (wrong dirs; missing files) · three arbiter-gate self-contradictions where the gate said "no arbiter" while the inlined spec mandated a named sibling (BP3/T4 `r2-report-ack`, BP14/T14 `r2-chip-fade` conditional, BP15/T10 `r2-guest-profile`). Systemic template repairs applied to all 17 files: the 7-immutable-stacks REAL locations (4 of 7 live under `qa-reports/assets/*`, not `design-reviews/`), the diff-scope carve-out for each phase's own untracked-side artifacts, the arbiter runner path + sibling directory named wherever a declaration is conditional or mandated, and the master path added to the six MP files' read lists. Post-fix scripted conservation re-check: **CLEAN — 20/20 both directions, no smuggled blocks.**
