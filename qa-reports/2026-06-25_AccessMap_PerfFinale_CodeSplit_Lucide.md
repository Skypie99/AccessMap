# AccessMap — Performance Finale Fix-Run (web code-split + lucide slim-down)

**Date:** 2026-06-25
**Branch:** `fix/qa-sweep` (off `main` @ `45bca1a`) — **stacks** with the committed perf quick-wins so it all merges as ONE build.
**Commits (3, newest first):**
- `8a7cce5` — `style(web): move code-split lazy consts below imports (eslint import/first)`
- `53e741a` — `perf(web): deep-import lucide icons to stop unused-icon over-ship`
- `215c201` — `perf(web): code-split Settings/Admin screens + Report/FlagDetail modals via React.lazy`

**NOT merged, NOT pushed.** `main` stays at `45bca1a`; branch has no upstream. Sky merges.
**Scope:** the last *invisible* perf pass (foundation before the visible-design rollout). Zero on-screen change — the proof is numbers.

---

## BEFORE → AFTER (web export, `npx expo export --platform web`)

| Metric | Before | After | Δ |
|---|---|---|---|
| **Main JS chunk** (`AppEntry`) | 4,151,427 B (4.15 MB) | **2,281,757 B (2.28 MB)** | **−1,869,670 B (−45%)** |
| **# JS chunks** | 1 | **7** | gated code now loads on demand |
| **Total `_expo/static/js`** | 4,056 KB | **2,368 KB** | **−1,688 KB (−42%)** |
| **Total `dist`** | 5,040 KB | **3,352 KB** | **−1,688 KB (−33%)** |
| **Modules bundled** | 2,846 | **~1,200** | ~1,650 unused icon modules gone |

The headline: the initial download is **~1.87 MB lighter** (4.15 → 2.28 MB main chunk). Most of that is Part B; Part A also defers four gated surfaces into on-demand chunks.

---

## Part A — Code-split (commit `215c201`, tidy `8a7cce5`)

Wrapped gated, interaction-only surfaces in `React.lazy` + `<Suspense>`. **No build-config change** — Expo SDK 54 / Metro auto-splits async `import()` on web.

| Surface | Where | Chunk (after) |
|---|---|---|
| `SettingsScreen` | RootNavigator (drawer-only) | `SettingsScreen-*.js` 29 kB |
| `AdminScreen` | RootNavigator (drawer + `is_admin`) | `AdminScreen-*.js` 8.95 kB |
| `ReportFlagModal` | MapScreen render-site | `ReportFlagModal-*.js` 26.9 kB |
| `FlagDetailModal` | Tasks **and** Profile render-sites | `FlagDetailModal-*.js` 48.1 kB (one **shared** chunk — Metro dedups) |

- Navigator screens use a small `lazyScreen()`/`ScreenFallback` helper (theme-token spinner) so RN v7's `component` prop gets a plain component that forwards nav/route props.
- Modals stay **always-mounted** (visible-prop controlled) wrapped in `<Suspense fallback={null}>` — **open/close behavior byte-for-byte unchanged**, the chunk just loads on demand.
- Main chunk after Part A alone: 4.15 → 4.04 MB (−113 KB). Total JS ~flat (chunking overhead) — the win is the smaller initial download, the big bytes come from Part B.

**Kept EAGER:** Home, Tasks, Profile (visible tabs) and **MapScreen**. MapScreen stays eager per brief *and* because Leaflet is already anchored in the main chunk by the eager `HomeScreen` (`<PlatformMap>` at `HomeScreen.tsx:264`) — lazy-loading MapScreen would *not* move Leaflet out, so no real gain + a loading state. Documented, not done.
**Skipped:** `LeaderboardModal` is **dead code** (mounted nowhere — only a definition + a `.todo` test). The real leaderboard is `LeaderboardScreen` (`ProfileScreen.tsx`). Per the agreed core-set scope, not split. *(Candidate for deletion in a future cleanup.)*

---

## Part B — Lucide deep-import (commit `53e741a`) — the big lever

`lucide-react-native@1.x`'s `exports` map is barrel-only, and Metro doesn't tree-shake, so one named import dragged the **whole ~1,700-icon set** (~1.3 MB source) into the bundle for ~70 used icons. Fixed with three surgical, reversible pieces:

1. **`babel-plugins/lucide-deep-imports.js`** (new, ~130 lines, no new dependency) — rewrites `import { Flag } from 'lucide-react-native'` → `import Flag from 'lucide-react-native/icons/flag'`. The Name→file map is **parsed from lucide's own root manifest**, so it covers every deprecated alias (`Home→house`, `HelpCircle→circle-question-mark`, `CheckCircle2→circle-check`, `PlayCircle→circle-play`, `AlertTriangle→triangle-alert`) and `*Icon`/`Lucide*` variants, and **can't drift** from the installed version. An unknown icon name is a **loud build error** — never a silent wrong/missing icon.
2. **`metro.config.js`** — `resolver.resolveRequest` maps `lucide-react-native/icons/*` to the real ESM files (the exports map blocks the subpath otherwise). **Surgical to lucide**; every other request falls through to the default resolver untouched (so `@supabase` etc. keep their exports-map resolution).
3. **`jest.config.js`** — `moduleNameMapper` sends the same deep paths to lucide's per-icon **CJS** files (Jest is CommonJS) — resolves without the barrel or an ESM transform.

**Mechanism used: #1 (babel + resolver), clean — no fallback to tree-shaking or patch-package needed.**

**Result:** main chunk 4.04 → **2.28 MB (−1.76 MB)**; total JS −1.69 MB; modules 2,846 → ~1,200.

---

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | ✅ 0 |
| `npm test` (jest) | ✅ 107 suites, **1,722 passed**, 117 todo, 0 failed |
| `npm run lint` | ✅ **0 errors, 87 warnings** (≤ 88 baseline; **0 new** — the relocation tidy removed the `import/first` regression) |
| `npx expo export --platform web --clear` | ✅ clean build, 7 chunks emitted |
| **Icons present/absent** (path-data grep, survives minification) | ✅ used icons present (house/map-pin/flag/user/list-checks); unused **gone** (banana/rocket/umbrella/cake/anchor) |
| **Runtime** (dev server, browser) | ✅ app boots, **5 SVG icons render**, no error overlay, **no console errors** (only pre-existing `shadow*`/`pointerEvents` RN-Web deprecation warnings) |

**Build-config safety:** after each config change the web export was re-run with `--clear` and confirmed clean + the app loads. (Caught early: `expo export` without `--clear` serves cached transforms — the babel plugin only took effect after a `--clear`.)

**Native:** unaffected — the same babel transform + resolver apply on native; lazy+Suspense is native-safe. (Sky's TestFlight build is the on-device confirmation.)

---

## Parallel-WIP overlap

The 2026-06-24 report noted a parallel a11y/design WIP on this branch (incl. `ReportFlagModal.tsx`). At run time the working tree was **clean of uncommitted code** (only untracked `qa-reports/`), so nothing to stash. My edits touch *render-sites* (`MapScreen`/`Tasks`/`Profile`) and configs — **not** `ReportFlagModal.tsx` itself — so there is no overlap regardless.

## Files changed
- `src/navigation/RootNavigator.tsx`, `src/screens/MapScreen.tsx`, `src/screens/TasksScreen.tsx`, `src/screens/ProfileScreen.tsx` (code-split)
- `babel.config.js`, `metro.config.js`, `jest.config.js`, `babel-plugins/lucide-deep-imports.js` (lucide)
- **Not touched:** `supabase/**`, DB/auth.

## Decisions for Sky
- Ready to merge into the single build with Prompts 1–4. **Sky merges** (no push done).
- Optional future cleanup: delete dead `LeaderboardModal` (and consider lazy-splitting `LeaderboardScreen`/other Profile modals — the declined "broad sweep" tier).
