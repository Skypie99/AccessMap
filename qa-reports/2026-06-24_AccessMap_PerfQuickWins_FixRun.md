# AccessMap — PERF Quick-Wins Fix-Run

**Date:** 2026-06-24
**Scope:** Performance quick-wins from `qa-reports/2026-06-23_AccessMap_Master_QA_Sweep.md` (the bigger web code-split is a separate prompt and was NOT touched).
**Branch:** `fix/qa-sweep` (off `main` @ `45bca1a`). **No merge, no push.**
**Commit:** `1c6a62d` — `perf(qa): render + build quick-wins (QA sweep 2026-06-23)` (8 files, +86/−34).

---

## Branch handling (important context)

`fix/qa-sweep` is a **shared QA-sweep integration branch**, not a clean cut:
- It already carried **9 committed sibling fixes** (`fix(qa): moderate item N …` — Report FAB, ProfileScreen load error, AddressSearch, reconcile refresh, confirm-before-Reject, PhotoGallery rotation, deep-link race, drawer nav retries + a test). Those commits touched MapScreen/TasksScreen/ProfileScreen, so my verified line numbers are correct **for this branch** (cutting off `main` would have invalidated them and created future conflicts).
- It also carried **~14 files of *uncommitted* WIP from a parallel a11y/design run** (an "always-dark drawer" + accessibility changes across `HamburgerDrawer.tsx`, `HelpModal.tsx`, `AppText.tsx`, `Sheet.tsx`, `accessibility.ts`, `location.ts`, `points.ts`, `LegendModal.tsx`, `NotificationPreferencesScreen.tsx`, `ReportFlagModal.tsx` + test, plus `PROJECT_STATE`/`DECISIONS_LOG`/`TASK_GRAPH`).

Only **one** of my target files (`HamburgerDrawer.tsx`) overlapped that WIP, in a different region (sibling at lines ≥152; my timer fix at ~70/105). To keep my commit clean and **not disturb the parallel run's in-flight work**, I `git stash push`-ed only `HamburgerDrawer.tsx`, applied my timer fix on the clean file, committed, then `git stash pop`-ed the sibling WIP back (clean auto-merge, no conflicts). End state: my commit holds only my 8 files; the sibling's uncommitted WIP is preserved exactly as found.

---

## Fixes applied

| # | Item | File(s) | Status |
|---|------|---------|--------|
| 1 | Memoize `makeStyles` (`useMemo(() => makeStyles(color), [color])`) | `MapScreen.tsx:217`, `TasksScreen.tsx:89`, `ProfileScreen.tsx:150`, `FlagCard` `TasksScreen.tsx:1287` | ✅ |
| 2 | Fix defeated `FlagCard` memo — hoist inline `onPress` into a stable `handleCardPress` (deps `[selection.active, handleViewOnMap]`); `renderFlagItem` uses it | `TasksScreen.tsx` | ✅ |
| 3 | Prune dead font weights — per-weight subpath imports instead of the `@expo-google-fonts/*` barrel | `src/lib/fonts.ts` | ✅ **verified 48→8** |
| 4 | Lighthouse CI — `serve dist` (expo export output) not `serve web-build` | `.lighthouserc.js:4` | ✅ |
| 5 | Memoize auth context value (client-side `useMemo` only — no `supabase/`/DB touch) | `src/lib/auth.tsx` | ✅ |
| 6 | HamburgerDrawer timer leak — store `navigate()` `setTimeout` in a ref, `clearTimeout` on unmount | `src/components/HamburgerDrawer.tsx` | ✅ |
| 7 | Service-worker stale-shell — NetworkFirst for navigations, bump `CACHE_VERSION` v1→v2; hashed JS/CSS stay StaleWhileRevalidate | `public/sw.js` | ✅ **verified in dist** |
| 8 | Lucide tree-shaking | — | 🔍 **investigated — see below** |

### Item 1 note
`useMemo` was already imported in all three screens. The win assumes `color` (from `useColor()`) is referentially stable, which it is for a theme context; the change is correct/harmless regardless.

### Item 2 note
`renderFlagItem` still depends on `selection` (needed for `selected={isSelected(selection, item.id)}` and `selectionActive`), so selection toggles still re-render the list — but `FlagCard`'s `React.memo` now skips every *unchanged* card because `onPress` is finally referentially stable. Depending on `selection.active` (a boolean) rather than the whole `selection` object means `handleCardPress` only changes identity when entering/leaving select mode, not on each card toggle. `extraData` was intentionally **not** added (updates already propagate via `renderFlagItem` identity).

---

## Verification

| Gate | Result |
|------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (font subpaths are typed via each weight dir's `index.d.ts`) |
| `npm run lint` (`eslint src`) | ✅ 0 errors, 88 warnings (all pre-existing baseline; **no new warning from my changes** — notably no `exhaustive-deps` flag on the new hooks) |
| `npm test` (jest) | ✅ 107 suites, **1722 passed**, 117 todo, **0 failed** |
| `npx expo export --platform web` | ✅ Exported. Build asset manifest lists **exactly 8 `.ttf`** (was 48). |

**Item 3 proof:** `find dist -name '*.ttf' | wc -l` → **8** (jetbrains-mono 400/500/600, plus-jakarta-sans 700/800, public-sans 400/500/600). All italic/unused weights gone. First paint unchanged (same 8 weights load). Root cause was the package-root `index.js` barrel `require()`-ing every weight with Metro not tree-shaking; per-weight subpath imports pull only the used `.ttf`.

**Item 7 proof:** built `dist/sw.js` shows `CACHE_VERSION = 'v2'` and the `request.mode === 'navigate'` NetworkFirst branch. (Only `public/sw.js` was edited; `dist/sw.js` is regenerated from it on export.)

All gates ran against the full tree (my commit **plus** the sibling uncommitted WIP) — everything is mutually consistent.

---

## Item 8 — Lucide tree-shaking (investigate only)

**Verdict: `lucide-react-native` over-ships the entire icon set. Confirmed.**

Evidence:
- **Killer test (bundle grep):** icons the app *never* imports — `Anchor`, `Banana`, `Cake`, `Rocket`, `Umbrella` — are all present in the production web bundle. Only possible if the whole library ships.
- **Byte share (parsed from the emitted sourcemap's `sourcesContent`):** `lucide-react-native` = **1,345 KB ≈ 19.0% of mapped JS source — the single largest dependency**, ahead of `react-native-web` (674 KB), `react-dom` (512 KB), `leaflet` (454 KB). The app imports **44** icons.
- **Mechanism:** same barrel-over-ship as the fonts (named imports from `lucide-react-native` resolve through the package barrel; Metro/Babel are on defaults with no tree-shaking). Matches the sweep's "~5,783 SVG paths vs 44 icons" observation (~1,500 icons × ~3–4 path nodes).

*(source-map-explorer itself could not run — the npm cache has root-owned files causing `EACCES` on `npx`; I parsed the `.js.map` directly instead, which is authoritative for source bytes.)*

**Recommended follow-up (separate fix — NOT done here, like the code-split):**
Eliminating the over-ship is **not** a clean subpath swap like the fonts were. `lucide-react-native@1.17.0`'s `exports` map only exposes barrels (`.` and `./icons` → `index.mjs`) with **no `./icons/*` wildcard**, so per-icon modules (`dist/esm/icons/flag.mjs`, kebab-case) aren't cleanly importable through the public API. Options for a future pass: (a) a Babel transform that rewrites `import { Flag } from 'lucide-react-native'` → the per-icon module, (b) deep imports that bypass the exports map (fragile), or (c) enabling Metro's experimental tree-shaking. Potential saving on the order of ~1 MB of source — worth a dedicated prompt with its own before/after bundle measurement.

---

## Out of scope / not done
- Web code-split (separate prompt).
- Lucide import rewrite (item 8 is investigate-only; follow-up scoped above).
- The dist font-prune script (superseded — per-weight subpath imports fix the root cause).
- The parallel a11y/design WIP on the branch (left untouched).

## Notes for Sky
- Work is **committed to `fix/qa-sweep` (`1c6a62d`) only** — not merged, not pushed.
- The branch has unrelated **uncommitted** WIP from a parallel a11y/design run (14 files). It is intact and was not committed by me; whoever owns that run still needs to commit it. My `HamburgerDrawer.tsx` timer fix and their always-dark drawer change coexist cleanly in that file (different regions).
- `dist/` is gitignored (the verification export did not dirty git status).
