# PHASE B LOG — code-qa 2026-08-06 · bank-as-you-go · `[F5/2026-08-06]`

**Branch:** `codeqa/1-cleanup-2026-08-06` off base **`d243b51`** (the audited preship tip). Cross-train law honored: no other Phase-B fix branch existed at branch time.
**Model note:** fire message names Opus 5 max effort for Phase B; this window is Sky-launched **Fable 5 max effort** (the higher tier — "never lower" satisfied upward). Provenance tag unchanged.
**Baseline (MEASURED by this window, first action):** tsc exit 0 · lint 0 errors / 80 warnings · `npx jest --ci -w 3` → 200 suites, 2923 passed / 84 todo / 3007 total, 0 failed, exit 0. Matches Phase A. Hold-or-improve from here.
**Questions state:** no DECISIONS file found newer than the Phase A bank; fire message carries no answers → every Q-gated row runs its banked default (Q-1 filter half OPEN · Q-2 OPEN · Q-3 default triage · Q-4 all splits PARKED · Q-5 untouched · Q-6/Q-7 delete-defaults proceed · Q-8 banner only).
**Seam:** `src/lib/copy.ts` legal strings PROVISIONAL (Sky's open Terms Cowork prompt) — untouched by every item below.

---

## Fixed (one commit per item)

### COR-1 · HIGH — edit path now runs the createFlag trust-boundary guards — `34994aa`
- `updateFlagContent` guards: `assertValidCategoryAndSeverity` (widened to per-field for partial patches; createFlag call sites unchanged) + `normalizeFlagDescription` (trim / whitespace→null / 2000-cap, refuses **before** any network call).
- Blocked-term half NOT applied — Sky-gated (Q-1), seam comment in code says so.
- TEST-3 flipped deliberately: old "passes the patch object directly" pin renamed/re-scoped to guarded pass-through; file header updated.
- **Non-vacuity proof:** 7 of the 9 new guard tests FAILED against the unguarded code (run recorded before the fix); boundary + partial-update pins pass by design.
- Gates after: tsc 0 · lint 0/80 · jest 200 suites / **2932 passed / 3016 total** / 0 failed.
- Note for Sky: edit form input already had `maxLength={2000}` (FlagDetailModal.tsx:1317) — the gap was lib-only.

### SLOP-3 · MED — canonical `postgrestErrors.ts`, six converts — `aaff327`
- Census COMPLETED: disputes.ts was a 6th family member (same reopen-shape inline, its own fence says "copied deliberately from requestFlagReopen") — converted with the family.
- SR-092 + F38 WHY blocks moved verbatim with the code. 18-test unit suite = the family's contract (embed early-out, F38-narrow function fallback, column probe).
- Named deltas: photos gains embed early-out + msg-42P01 · users.ts message fallback narrowed (bare "does not exist" now surfaces — honest direction) · reopen/dispute gain only the narrow "could not find the function" phrasing (F38 LOCKING pins green).
- Proof: pre→post full suite green, zero existing pins changed (2932→2950).

### COR-3 · MED — `listFlagPhotos` rethrows real failures — `cab8702`
- [] reserved for migration-pending; network/RLS/embed throw. Docstring aligned.
- FlagDetailModal gallery load gains the catch **Phase A wrongly assumed existed** (view path: warn + keep list; write path addFlagPhoto now fails loudly pre-position-math).
- 3 swallow pins deliberately flipped, non-vacuity proven (3 failed pre-fix); sync table-missing defensive catch kept + pinned.
- ⚠ Rider banked: gallery has NO error-state UI — distinguishing "no photos" vs "couldn't load" visually is feature work for Sky's queue (noted under Questions addendum).

### SLOP-1 · MED — superseded pre-vendoring header deleted — `6cafd57`
- Lines 1-49 (false "NOT a vendoring" claim + discharged §SKY-6 review fence) removed; verified first that header #2 preserves the D-2 rationale verbatim + limits + provenance. Comment-only.

### DEAD-1 · MED — 3 gate-nothing feature flags removed — `430f406`
- HEATMAP/PUSH_NOTIFICATIONS (zero readers; heatmap ships via DEFAULT_HEATMAP_MODE) + GUEST_SIGNIN_ENABLED=false (claimed to gate SHIPPED guest access — the active lie). PUSH_NOTIF_TYPES_ENABLED kept (live reader + Sky Decision 2 comment). 3 dead pins removed with keys (2952→2949).

### TEST-1 · MED — wave6 stub plan retired, todos 84→32 — `c2f9f4c`
- Order swap vs plan (TEST-1 before DEBT-1) so DEBT-1 writes post-triage numbers — reason recorded.
- 52 todos + 2 vacuous prop tests deleted with per-group citations (real CommentBubble contract suite · brandInkAA.guard + live palette · px-pin cosmetics policy-parked); 2 still-true rows IMPLEMENTED non-vacuously; ambiguous rows parked to QUESTIONS addendum per Q-3's own rule. 32 integration-stub todos KEPT as honest markers.
- Bonus: lint warnings 80→77 (stub unused-vars).

### DEBT-1 · MED — test counts were ~2× stale — `8111720`
- README 1,120 → "2,900+"; CLAUDE.md ~1575 → "~2,950" (drift-resistant under-promise; measured floor 2,949/2,981 cited). C-1 WCAG sentence untouched. README:14 points values deferred to DEBT-2 (same wrong-values family).

### TYPE-1/2 · LOW pair — expired casts retired — `a2e2042`
- createFlag as-Record/as-never pair + disputes.ts `(supabase as any)` gone; both retirement conditions were already met in database.ts. tsc exit 0 = the proof. Hatch census 18→15.

### DEAD-2 · LOW — flagsRealtime.ts + test deleted — `647dfc2` (mock-resolution check clean; −1 suite/−11 tests announced)
### DEAD-3 · LOW — apply-migrations.js deleted — `f2f6208` (Q-7 default)
### DEAD-4 · LOW — 6 orphaned category SVGs deleted — `8a98c7e` (Q-6 default; react-native-svg stays, live consumers)
### DEAD-5 · LOW — CreateAnonFlagInput twin deleted, WHY comments migrated to AnonFlagInput — `0f8a630`
### DEAD-6 · LOW — deleteFlagPhoto deleted (uncalled; promised a nonexistent Edge Function; SR-050 class pre-staged) — `3f14f8a` (−2 tests announced)

### SLOP-4 · LOW — one convert + the family's fences honored — `c698873`
- Switch off-thumb `#f4f3f4` ×4 → `androidSwitchThumbOff` theme export (mode-independent by design, value-identical).
- **DISPOSITION CORRECTIONS (verify-first over Phase A):** PlatformMap pin chrome = PROTECT-16 mode-independent (named fence) · LegendModal rings = replicas of those pins · DUP-3 labelTone = double-fenced fill-keyed ink · MapScreen placeChips = "PINNED ALWAYS-LIGHT" fence w/ measured 2.0:1 failure · `#333` (8.28:1 computed) + `#1a1a1a` (any-tile WCAG guarantee) ratified. All PARKED as protected, fences cited in the commit. New debt rider: RootNavigator:288 shadow literal vs themed glow token — Sky's call.

### SLOP-5 · LOW — 2 converts + 1 correction — `5d56b52` (amended)
- reports.ts + feedbackStore.ts inlines → `errorMessage(e)`; deltas named (friendly rewrite + string-throw surfaces as message); 1 pin flipped deliberately with comment. ProfileScreen:695 corrected: instanceof-narrowed F63 copy, not a bypass — PARKED.
- ⚠ Process note: first cut landed red (grep masked jest exit — the |tail lesson relearned); amended same commit; explicit exit-code gating from here on.

### SLOP-7 · LOW — anon validator voice aligned to createFlag's ratified strings — `7892129` (loose-regex pins verified green)
### SLOP-8 · LOW — 3 DEV logs get the analytics.ts eslint-disable convention — `8963e33` (warnings 77→74)

### COR-4 · LOW — true pre-CAS status logged — `be8423b` (guard waived w/ reason; SLOP-6 owns the site at Phase-6)
### COR-5 · LOW — zoomBy `.catch` parity with sibling — `e72baca` (guard waived w/ reason)
### COR-6 · LOW — permission-throw can't strand the slide — `c3f8544` (guard waived w/ reason — no carousel harness)
### TEST-2 · LOW — F32 window deterministic — `2a90823` (sensitivity PROBED: early-resolve failed the window, restored green)
### DEBT-2 · LOW — points docs = reality (10/15/3/7, + README:14 same family) — `d0deb45`
### TYPE-3 · LOW — Relationships entry lands; 2 of 3 casts retired — `88970bb` (addComment cast KEPT honestly; NEW banked question: live user_id default/trigger un-captured)
### DEBT-3 · LOW — ARCHIVED banner on PROJECT_STATE.md — `ff48d8e` (Q-8 default)

## Final dispositions at their slots
- **COR-7 PARKED:** fence-ordered success sequences (PROTECT-3/8) + typed hoist + recordAnonSubmit tier question = not the "trivial" arm; callbacks internal/benign today.
- **SLOP-2 PARKED** (the "else PARK" arm): migration-bearing rename, cosmetic win.
- **SLOP-6 PARKED** to Phase-6 wiring (its own second arm).

## TRAIN COMPLETE — see 11_CLOSE_OUT.md (conservation table · gate deltas · honesty ledger · debt census · one-author verdict). STOPPED ON BRANCH.

## Parked so far
(per banked defaults) CPLX-1 all splits (Q-4) · COR-2 (Q-2) · Q-1 filter half · SLOP-2 pending fallback decision at its slot.
