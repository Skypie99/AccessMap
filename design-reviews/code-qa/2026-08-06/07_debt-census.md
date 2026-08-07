# LENS 6 — DEBT CENSUS · code-qa 2026-08-06 · `[F5/2026-08-06]`

## The complete TODO/FIXME/HACK ledger (production code)
**4 TODOs · 0 FIXME · 0 HACK · 0 XXX** in 51.3k LOC — measured, not sampled.

| Marker | Age (git blame) | Owner-of-truth | Gate |
|---|---|---|---|
| `ResourcesScreen.tsx:9` `TODO(Sky)` — drop in real resource links | 2026-06-19 (7 wks) | **Sky** (KNOWN carry-over) | none — content decision |
| `FlagDetailModal.tsx:808` — replace client dedup once Dana's reopen migration lands | 2026-05-30 (10 wks) | Dana migration (fork state) | migration applied |
| `featureFlags.ts:9` — replace with real flag service | 2026-05-29 (10 wks) | Phase-2 strategy doc | DEAD-1 shrinks this file first |
| `pushNotifications.ts:223` `TODO(analytics)` — foreground-received event | 2026-05-29 (10 wks) | Phase-6 analytics wiring | analytics backend exists |

All four are honest, owned, and gated — none is silent rot. No action beyond DEAD-1's adjacency.

## Findings — config/doc drift (docs claiming what code contradicts)

### DEBT-1 · MEDIUM — Both load-bearing docs understate the test suite by ~2×
- `README.md:19` — *"GitHub Actions CI — **1,120 automated tests** on every push"*
- `CLAUDE.md` (repo) — *"`npm test` (Jest, **~1575 tests**)"*
- **Measured this run:** 2923 passing / 3007 total (84 todo), 200 suites.
README is public (a hiring manager reads it); CLAUDE.md is what every agent loads. Both anchor a stale number two eras old. **Disposition:** Phase B — correct both counts (factual figures, not ratified prose; note the count is a moving floor, e.g. "2,900+"). Cross-ref: the same README paragraph carries the KNOWN C-1 WCAG overclaim (GATED-AWAITING-SKY) — touch ONLY the count line, not the a11y sentence.

### DEBT-2 · LOW — Repo CLAUDE.md contradicts itself on point values
§Database says reporter +5/+10, actor +2/+5; the §"Recent QA pass" note in the same file says the live trigger awards 10/15/3/7 — and `points.ts:11-18` (the declared single source of truth) confirms 10/15/3/7. The KNOWN carry-over ("points-value drift decision") is about *choosing* values; this row is narrower: one file disagreeing with itself. **Disposition:** Phase B — align §Database to the QA-pass note + points.ts (recording reality ≠ pre-empting Sky's future value decision; say so in the commit).

### DEBT-3 · LOW — PROJECT_STATE.md is five trains stale
Self-dated 2026-06-20; "Current Status" pins main at `45bca1a` (now `9964f8f`, with the preship tip beyond that). It is honest about its own date, but its NEXT-ACTIONS section no longer matches APP_STORE_TODO (the live doc). **Disposition:** QUESTIONS-lite — regenerate via Sky's `/new-window` compiler or stamp an ARCHIVED banner pointing at APP_STORE_TODO; Phase B may add the banner (one line, reversible) if unquestioned.

### DEBT-4 · LOW — PC-4's cosmetic k≥3 promise has a fourth site: the public README
`README.md:10` — *"privacy-safe k≥3 minimum"*. The KNOWN Critical PC-4 (client-side render filter ≠ privacy floor) cited LegendModal:199, heatmap.ts:143, MapScreen:2572; the README carries the same promise to the most public audience. **Not a new finding — a new SITE of a known one.** **Disposition:** appended to Sky's PC-4 artifact decision (QUESTIONS cross-ref); no unilateral rewording (claims copy is hers).

### DEBT-5 · INFO — Dependency hygiene: deliberately unmeasured this run
`npm outdated` was not run (unattended read-only posture; registry round-trip adds nothing an overnight audit should act on alone). Standing pins that must NEVER be "fixed" as outdated: **eslint `^9` (never v10 — 2026-06-01 law)** · react-leaflet 5 via `--legacy-peer-deps` (React 19.1 pin) · `typescript ~6.0.0` · `jest 29` + `jest-expo 54` move only with the Expo SDK. Phase B MAY run `npm outdated` read-only and file results here; majors are noted, never auto-bumped.

### Cross-refs already censused elsewhere
`blockedTerms.ts` stale header → SLOP-1 · 84 todo stubs → TEST-1 · dead feature flags + their TODO → DEAD-1 · migrations-dir drift → KNOWN X-2 (Sky artifact A-19-class) · `app.json` 3.0.0 vs `package.json` 0.2.0 → KNOWN TODO 0.4 · reviewer-creds six in-tree copies → KNOWN 0.1 (untouched by this train on purpose).

**FINISHED** — lens 6 complete. 1 Med · 3 Low · 1 info. The debt story matches the one-author read: nearly nothing is silent; what drifts is *numbers in prose*, and the prose is otherwise unusually honest.
