# LENS 5 — DUPLICATION + COMPLEXITY · code-qa 2026-08-06 · `[F5/2026-08-06]`

## Duplication

### DUP-1 · LOW — Twin anon-input interfaces with diverging docs
`CreateAnonFlagInput` (flags.ts:1277, dead, better-documented) vs `AnonFlagInput` (flags.ts:1730, live, doc-thin). Same shape, one concept, two declarations, the good WHY on the dead one. **Disposition:** merged into DEAD-5's fix (delete dead twin, migrate its comments).

### DUP-2 · MEDIUM — The PostgREST error-sniffing family (5 variants, one diverging bug)
Fully censused as **SLOP-3** (`02_slop-census.md`) — recorded here for conservation: comments.ts (canonical, SR-092-hardened) · photos.ts (missing the embed early-out → misclassification feeds COR-3) · flags.ts `isUnknownColumnError` · users.ts inline · flags.ts reopen inline. One extraction (`postgrestErrors.ts`), five converts, coordinate with COR-3.

### DUP-3 · LOW — The severity-ink threshold re-derived outside the ramp
`PlatformMap.tsx:362` and `PlatformMap.web.tsx:1064` hand-compute white-vs-ink (`meanRounded >= 5 ? '#fff' : '#0F1B2D'`) — the rule `severityRamp[n].textOnColor` already encodes (theme.ts:602+). If Sky ever re-tunes the AA ramp, the heatmap discs drift silently. Censused under **SLOP-4**; the convert is a token read.

### Measured NON-findings (recorded so nobody "fixes" them)
- **The six list modals' shared lifecycle** (`useFocusOnOpen` + `loading` + `if (visible) load()` — MyReports/MyWatched/MyFeedback/ActivityFeed/StatusHistory/HiddenComments): identical in shape, varied only where surfaces genuinely differ (refreshKey, reset-on-close). No diverging bugs found. Extracting a `useModalData` hook would trade the house's explicit, beginner-readable style for indirection — **style-war risk, not cleanup.** KEEP AS IS.
- **`PlatformMap.tsx` vs `PlatformMap.web.tsx`**: deliberate platform twins behind one imperative contract (`{ animateTo, showCallout }` — CLAUDE.md gotcha #3). Their divergence is the design. Only the shared-constant drift (DUP-3) is real.
- **`batchInsertFlagPhotos`' double `isTableMissingError` check** (photos.ts:100-109): looks redundant, is load-bearing (inner `throw error` re-enters its own catch). Simplifiable in SLOP-3's extraction, not before.

## Complexity

### CPLX-1 · god-file census (with the constraint every split proposal must respect)
Top of the ranking: `MapScreen.tsx` **3702** · `ProfileScreen.tsx` 2674 · `TasksScreen.tsx` 2663 · `FlagDetailModal.tsx` 2533 · `flags.ts` 1781 · `ReportFlagModal.tsx` 1633.
**The constraint:** all **18** `src/__tests__/*.guard.test.ts` suites read source files by path and anchor on exact source strings (`indexOf`/`toContain`). A split rewrites anchors across up to 18 guard suites — and four of those guards are currently **fail-open** (KNOWN HF-3/4/5/9), so splitting BEFORE the Guard Forge Phase B hardens them risks silently defusing guards that would not go red.
**Honest split proposals, in dependency order (ALL PARKED pending Sky + Guard-Forge-B):**
1. `flags.ts` (1781) — lowest risk, highest clarity win: the photo/EXIF pipeline (:11-963) is a self-contained module (`flagPhotos.ts` or `photoPipeline.ts`); the taxonomy constants (:1553-1665) another (`flagTaxonomy.ts`). Pure moves, re-exports preserved, no guard reads flags.ts by line today (verify at execution).
2. `MapScreen.tsx` (3702) — the biggest file and the most guard-pinned (classA + others read it). Split ONLY after HF-3 is fixed; candidates: the saved-places chip row, the locate/status banner cluster.
3. Profile/Tasks/FlagDetail — cohesive screen logic; splitting buys less than it costs today.
**Disposition:** QUESTIONS (Q-4) — sequencing decision is Sky's; no split is Phase-B-safe this run except (1), and even that is optional polish.

### CPLX-2 · Layering — CLEAN, one quirk
`src/lib` imports nothing upward (verified). Screens compose screens (Profile→Leaderboard etc.) and `HamburgerDrawer` (a component) hosts three screens — the drawer-as-container design, not a cycle (no screen imports the drawer back). No import cycles found among the files read. No action.

**FINISHED** — lens 5 complete. 1 Med (=SLOP-3) · 2 Low · god-file work parked with its real constraint named.
