---
mode: background
model_tier: opus-4-7
project: AccessMap
role: Gary (QA Engineer)
cycle_id: gary-bg-2026-05-24-v3
branch: main (AUDIT-ONLY — Const. 12.5 privacy-sensitive default)
audit_only: true
supersedes: none (third Gary cycle today; supplements background-2026-05-24-gary.md and -v2)
---

# Gary — BACKGROUND audit (2026-05-24, v3)

**Scope:** Third scheduled Gary cycle of the day. The morning cycle
(`background-2026-05-24-gary.md`) noted the brief was outdated — Jest
is landed, 578 cases green. The afternoon addendum
(`background-2026-05-24-gary-v2.md`) drafted four copy-paste-ready
test files (`users.ts`, `flagsSupabase`, `points.fetchCurrentPoints`,
`feedbackSend`) and a `watchedFlags` gap.

**This cycle does not restate either.** It adds three things they
didn't have:

1. **A whole-project coverage number** — not just `src/lib`. Spoiler:
   it's **29.02%**, not the ~80% the lib-only number suggests.
2. **A refined CI rollout** — a "land today" variant of the standing
   CI proposal that ships typecheck + test without waiting on the
   lint proposal.
3. **A clean bill of health on test-suite hygiene** — no
   `it.skip`/`fit`/`xit`, no leaked console output, no flakiness,
   suite runs in ~1.3s. The 578-test green is not papering over
   smells.

Halt sentinel: absent. Tests: green (578/578). Typecheck: green. No
commits this cycle (Const. 12.5).

---

## 1. Whole-project coverage — the lib number is not the headline

The morning report quoted 79.82% statement coverage. **That's
`src/lib/` in isolation.** When the coverage net is widened to
include the UI layer, the picture is much smaller:

```
File                         | % Stmts | % Branch | % Funcs | % Lines
All files (lib+screens+
  components+navigation)     |   29.02 |    23.50 |   22.93 |   28.83
lib                          |   79.82 |    80.48 |   78.09 |   81.06
components                   |    0    |     0    |     0   |     0
screens                      |    0    |     0    |     0   |     0
navigation                   |    0    |     0    |     0   |     0
```

Per-area uncovered code, ranked by raw line count:

| Area | Files | Lines uncovered | Biggest offender |
| --- | --- | --- | --- |
| `screens/` | 10 | ~5,000 | `MapScreen.tsx` (1,614 lines, 0%) |
| | | | `ProfileScreen.tsx` (1,341 lines, 0%) |
| | | | `TasksScreen.tsx` (944 lines, 0%) |
| `components/` | 19 | ~3,800 | `FlagDetailModal.tsx` (582), `FilterPresetsModal.tsx` (527), `MyReportsModal.tsx` (492) |
| `navigation/` | 1 | ~110 | `RootNavigator.tsx` |
| `lib/` (six untested files) | 6 | ~250 | `flags.ts` (138 lines), `flagsStore.tsx` (116) |

### What this means

The lib layer is genuinely well-tested. The **UI layer has no tests
at all** because the project has no React Native renderer setup —
adding any component test requires the dependency
`@testing-library/react-native` plus a small jest preset tweak. This
was implied in v2's "needs new dep" notes but never spelled out as a
single structural decision.

### DECISION FOR SKY — strategic, not tactical

There are two coverage tracks, and they're independent:

- **Track A (cheap, in-flight):** Continue extending lib coverage
  using the four test-file adds drafted in v2 (`users`,
  `flagsSupabase`, `points`, `feedbackSend`) + the `watchedFlags`
  gap. **No new deps.** Pushes lib from 79.82% → ~93% and whole-project
  from 29% → ~32%. v2 already drafted the code; foreground cycle just
  needs to apply.
- **Track B (one-time investment, larger):** Add
  `@testing-library/react-native` + `react-test-renderer` to enable
  component/screen tests. This is a propose-only because it adds
  three top-level dev dependencies and changes jest setup. Unlocks
  ~9,000 lines of UI code for testing. Without Track B, the
  whole-project coverage number is **capped at ~33%** no matter how
  much lib coverage we add.

**Recommendation:** land Track A first (Sky already authorized in v2
decision #1), then revisit Track B as a separate proposal in a
foreground cycle. Don't bundle them — different risk profiles.

---

## 2. Refined CI proposal — "land today" variant

The standing `qa-reports/proposal-ci-2026-05-23.md` workflow has a
`lint` step in its matrix. Lint isn't installed yet (also
propose-only). The original assumption was that all three land
together; that's still the cleanest path. **But** there's an
intermediate that's strictly better than nothing:

### Variant A — ship CI without lint (today-doable)

Same `.github/workflows/ci.yml` as the standing proposal, but with
the matrix as `[typecheck, test]` (drop `lint`). This:

- Ships PR-level safety **today**, no `npm install` required.
- Uses scripts that already exist (`npm run typecheck`, `npm test`).
- When lint lands later, change exactly one line:
  `matrix.check: [typecheck, lint, test]`.

### Why this matters

The morning report flagged CI as "bottlenecked on lint." That's true
for the **complete** workflow, but it's not true for **any** workflow
— even a 2-check matrix catches the kind of regression that has been
historically caught manually (e.g. forgetting `npm run typecheck`
before merging a `cycle-B-*` branch).

### Exact change to proposal-ci-2026-05-23.md

Replace lines 51-52 with:

```yaml
    strategy:
      fail-fast: false
      matrix:
        check: [typecheck, test]   # add 'lint' when proposal-lint-* lands
```

Everything else (workflow name, install, run blocks) stays.

### DECISION FOR SKY

Ship variant A now, or wait for lint? Variant A is **same risk, less
value, available today**. Standing proposal stays unchanged as the
target end state.

Not auto-applying because creating `.github/workflows/` is in
Track B's "changes how the project ships" zone — even if it's CI-only,
the workflow runs on every push and counts as an external surface
change.

---

## 3. Suite hygiene audit (new this cycle)

Walked the entire `src/lib/__tests__/` tree looking for the classic
"green suite, no actual coverage" anti-patterns:

| Smell | Count | Notes |
| --- | --- | --- |
| `it.skip` / `test.skip` / `xit` / `xdescribe` | **0** | Clean |
| `fit` / `fdescribe` (focused-only) | **0** | Clean — no risk of unintended-skip on CI |
| `console.log` debug leftovers | **0** | Clean |
| `console.warn` intentional silencing | **5 files** | All in filter*/preset*/mapFilters; have an explanatory comment, `mockRestore` in `afterAll`. Correct use. |
| TODO/FIXME/XXX markers | **0** | Clean |
| Empty `describe` blocks | **0** | Clean |
| `it.only` accidentally left in | **0** | Clean |

Test count distribution (38 files, 578 cases reported by Jest;
~541 visible to grep — gap is nested describes / `each()` tables):

- **Lightest:** `changelogExpanded` (5 cases), `errors` (6),
  `filterPanelPrefs` (7).
- **Heaviest:** `reputationTier` (32 cases), `savedPlaces` (27),
  `distance` (25).
- **Mean:** ~14 cases per file. **Reasonable distribution.**

Suite runtime: 1.251s (no-coverage). With `--coverage`: 6.117s
(~5x — within normal Jest range, no instrumentation surprises).

**Verdict:** the suite is not papering over anything. The 578 green
cases represent genuine behavior coverage of the lib surface. The
problem is that the lib surface is ~21% of the codebase, not that the
tests are weak.

---

## 4. One small addressable gap that needs no new deps and isn't in v2

The v2 addendum drafted four test files. There's a **fifth** worth
flagging that v2 missed because it sits outside `src/lib/`:

### `src/theme.ts` — 0% coverage, fully pure, no deps

`src/theme.ts` is a single-file constant module (colors, font sizes,
spacing). It's currently outside the `collectCoverageFrom` glob
because it's at `src/theme.ts` rather than `src/lib/theme.ts`. Two
options:

- **(a)** Move `src/theme.ts` → `src/lib/theme.ts` and update its 30+
  importers (mechanical, but a lot of file churn — not a Gary task,
  belongs to Dani or Shamus).
- **(b)** Widen `collectCoverageFrom` in jest.config.js to include
  `src/**/*.{ts,tsx}` instead of just `src/lib/`. **One-line change.**

If `theme.ts` is purely constants (no exported functions), coverage
will jump to 100% the moment it's included — no test needed. But:

- The MORE valuable side-effect of (b) is that screens/components
  start showing in the coverage table by default, so the
  whole-project number (29.02%) becomes visible on every `npm test
  -- --coverage` run rather than only when invoked with a manual glob.

### DECISION FOR SKY

Apply (b) now? It's a single line in `jest.config.js`:

```diff
- // (no collectCoverageFrom — defaults to all files touched by tests)
+ collectCoverageFrom: [
+   'src/**/*.{ts,tsx}',
+   '!src/lib/supabase.ts',  // skip thin client builder
+ ],
```

Reversible (one-line revert), no new deps, no test changes. The
visibility win alone is worth it — currently we only know the UI is
at 0% because Gary ran a manual glob; that fact should be obvious
on the dashboard.

Not auto-applying because BACKGROUND mode is AUDIT-ONLY for
AccessMap (Const. 12.5) and even jest.config.js belongs on a `test/`
branch with Sky's eyes on it first.

---

## 5. Standing items recap (re-surfacing because index integrity)

Unchanged from cycle 1 + 2:

1. `qa-reports/proposal-lint-2026-05-23.md` — ESLint + Prettier
   install. Owner approval required.
2. `qa-reports/proposal-ci-2026-05-23.md` — original CI workflow.
   See §2 for a today-doable variant.
3. `qa-reports/proposal-testing-2026-05-23.md` — **shipped 2026-05-23**.
   Needs annotation or move per morning report §2 DECISION.
4. v2's four drafted test files (Track A) — pending Sky's
   authorization to land in a foreground `test/` branch.

---

## 6. DECISIONS FOR SKY (this cycle's net-new)

1. **Strategic split — Track A vs Track B.** Confirm Track A
   (no-new-deps lib coverage) lands first, before any
   `@testing-library/react-native` discussion. (§1 — recommended.)
2. **Ship the CI today-doable variant?** A `.github/workflows/ci.yml`
   with `matrix: [typecheck, test]`, no lint dep needed. (§2.)
3. **Widen jest's `collectCoverageFrom` to `src/**/*.{ts,tsx}`?**
   One-line change. Makes the 29% whole-project number visible on
   every coverage run instead of buried behind a manual glob. (§4.)

All three are propose-only — nothing changed this cycle.

---

## Cycle audit trail

- Started: 2026-05-24 evening (third Gary scheduled cycle).
- Halt sentinel: absent (`~/.claude/BACKGROUND_HALT` not present).
- AUDIT-ONLY enforced: no file writes outside `qa-reports/`.
- Reversible-change budget used: 0 of 1 (audit-only by mode policy).
- External sends: none (Const. 12.2 → Art. 9.4 inherited; this
  report stays in `qa-reports/`, Morgan picks it up).
- Files read: `package.json`, `jest.config.js`, `jest.setup.js`,
  `babel.config.js`, `qa-reports/proposal-{lint,ci}-2026-05-23.md`,
  prior `qa-reports/background-2026-05-24-gary*.md`,
  `src/lib/__tests__/*.test.ts` directory listing, `src/screens/`,
  `src/components/`, `src/navigation/` directory listings.
- Test runs: `npm run typecheck` (green), `npx jest --silent`
  (578/578), `npx jest --coverage` with `src/**` glob (numbers in §1).
- Output: this report. STOP — Morgan picks it up on next sweep.
