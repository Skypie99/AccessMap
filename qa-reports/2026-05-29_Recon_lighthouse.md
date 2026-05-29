# Reconciliation Plan — `ci/lighthouse-2026-05-30`

**Date:** 2026-05-29  
**Author:** Rory (READ-ONLY audit — no git writes executed)  
**Branch:** `ci/lighthouse-2026-05-30`  
**Target:** `origin/main` @ `259a034`  
**Merge-base:** `ea7732c` (Sky's `fix(prelaunch): dark mode hardcodes, touch targets, EXIF upload gate`)  
**Conflict files:** `src/components/HeatmapLayer.tsx`, `src/screens/MapScreen.tsx`

---

## 1. Branch Summary

The branch contains exactly **2 commits** on top of the merge-base:

| # | SHA | Message | Files touched |
|---|-----|---------|---------------|
| 1 | `a30f495` | `ci: add Lighthouse CI for accessibility + performance scoring on PRs` | `.github/workflows/lighthouse.yml` (new), `.lighthouserc.js` (new), `qa-reports/2026-05-30_Peter_WebPlatform.md` (new) |
| 2 | `39cddff` | `test(heatmap): Wave 5 — O(n) performance, privacy struct, key stability` | `src/components/HeatmapLayer.tsx` (new), `src/screens/MapScreen.tsx` (modified) |

Main moved forward ~60 commits after `ea7732c` — including a full D5 heatmap merge wave (`f250474`, `3096f0f`) and a guest-UX fix (`a99909c`, `5afdf9a`). That is the source of both conflicts.

---

## 2. Per-File Conflict Analysis

### 2a. `src/components/HeatmapLayer.tsx` — DIVERGENT (comment-level only)

**Branch version (39cddff):** Creates the file fresh (it was absent at `ea7732c`).  
**Main version (f250474 via 3096f0f):** Also creates the file fresh, via a different merge path.

The two versions are **functionally identical** — same exports, same `useHeatCells` hook, same k-anonymity logic, same Art. 7 enforcement. The divergence is cosmetic:

| Location | Branch wording | Main wording |
|----------|---------------|-------------|
| Line 14–15, top-level doc-comment | `"This component's job is to own that computation and expose a clean hook for callers."` | `"This component owns the computation and exposes a clean hook for callers."` |
| Lines 26–28, Art. 7 list | Uses em-dash `—` in bullets 1–3 | Uses hyphen `-` in bullets 1–3 |
| Line 51, prop JSDoc | `/** 'gradient' (default) or 'density'. ... */` | `/** gradient (default) or density. ... */` (no quotes) |

**Classification: REDUNDANT — DROP.**  
Main's version of this file is already correct and complete. The branch adds nothing substantive. The conflict arises because both sides independently created the file from the same scaffold. Resolution: take main's version unchanged.

---

### 2b. `src/screens/MapScreen.tsx` — DIVERGENT (two real differences)

Both sides start from the same base (`ea7732c` = `index e06b4b5`). The branch (`39cddff`) and main (`a99909c` + `f250474`) each made independent changes. The diff between them (`git diff origin/main origin/ci/lighthouse-2026-05-30 -- src/screens/MapScreen.tsx`) reveals:

#### Difference 1 — Guest FAB (DIVERGENT, main wins)

**Branch** reverts to the **old behaviour**: hides the Report FAB entirely for guest users (`{authUser && <Pressable>…</Pressable>}`), removing the ghost-FAB + Alert that main introduced in `fix/guest-ux-2026-05-30` (`a99909c`/`5afdf9a`).

**Main** ships the **ghost-FAB** pattern: guests see a disabled "＋ Report" button that fires `Alert.alert('Sign in to report', …)` on tap, with full a11y labels, plus `fabGuestDisabled` and `fabGuestText` styles. This is the Gary-tested, Shamus-merged version that was already in the `5afdf9a` merge commit on main.

**Classification: REDUNDANT — DROP the branch version.**  
The branch's older logic was superseded by the `fix/guest-ux-2026-05-30` feature already on main. Accepting the branch hunk here would silently delete the ghost-FAB and its a11y improvement, breaking the UX. Resolution: keep main's version.

#### Difference 2 — `heatmapDisclaimer` style (DIVERGENT, main wins)

**Branch** uses hardcoded hex/rgba values:

```
backgroundColor: 'rgba(0,0,0,0.55)',
color: 'rgba(255,255,255,0.85)',
```

**Main** uses design-token references:

```
backgroundColor: color.overlayBtn,
color: color.textOnBrand,
```

Main's token-based version is correct per the design-token migration (`fix/design-tokens-2026-05-30`) that landed before the D5 heatmap merge. Using `color.overlayBtn` / `color.textOnBrand` means dark-mode adapts automatically; the branch's hardcoded rgba values break dark-mode contrast correctness.

**Classification: REDUNDANT — DROP the branch version.**  
Main's token-referenced styles are superior and already shipped.

#### Difference 3 — `statusHint` color (DIVERGENT, main wins)

**Branch** uses `color.warningHint` for `statusHint`.  
**Main** uses `color.textMuted`.

The change to `color.textMuted` was intentional in the guest-UX fix (`a99909c`) — `warningHint` was deemed too alarming for a neutral status hint. Branch reverts this.

**Classification: REDUNDANT — DROP the branch version.**

#### Difference 4 — Jordan Art. 7 disclaimer comment wording (cosmetic)

Branch: `"per the conditional pass:"` vs. Main: `"per conditional pass:"` — one word difference.  
**Classification: REDUNDANT — DROP. Main's wording is fine.**

---

### 2c. `.github/workflows/lighthouse.yml` — GENUINELY NEW

This file **does not exist on main**. Main has only `ci.yml`, `eas-build.yml`, `eas-testflight-submit.yml`. Lighthouse CI is a new workflow that adds PR-level accessibility and performance gating.

**Classification: KEEP — cherry-pick.**

Content summary:
- Runs on every PR targeting `main`
- Node 22, `npm ci --legacy-peer-deps`
- Installs `serve` + `@lhci/cli@0.14.x`
- `lhci autorun` driven by `.lighthouserc.js`
- Optional `LHCI_GITHUB_APP_TOKEN` secret for inline PR annotations

**Note for implementer:** The `startServerCommand` in `.lighthouserc.js` runs `npx expo export --platform web && npx serve web-build -p 9001`. Verify that `web-build/` is the correct Expo web output directory for this project (some Expo setups output to `dist/` instead). Check `app.config.ts` or run `npx expo export --help` before landing.

---

### 2d. `.lighthouserc.js` — GENUINELY NEW

Not on main. Defines thresholds:
- Accessibility ≥ 0.9 → **error** (hard gate)
- Performance ≥ 0.6 → warn
- Best-practices ≥ 0.9 → warn
- SEO ≥ 0.7 → warn

**Classification: KEEP — cherry-pick.**

---

### 2e. `qa-reports/2026-05-30_Peter_WebPlatform.md` — GENUINELY NEW

Not on main. Peter's web-platform audit report documenting the Lighthouse CI decision.

**Classification: KEEP — cherry-pick.**

---

## 3. Reconciliation Recipe (ordered)

The branch is **mostly redundant** for code files — both conflict files (`HeatmapLayer.tsx`, `MapScreen.tsx`) already have better versions on main. The **only genuine value** is the 3 new CI/config files from commit `a30f495`.

### Step 1 — Create a clean salvage branch from main

```bash
git checkout -b ci/lighthouse-salvage origin/main
```

### Step 2 — Cherry-pick ONLY `a30f495` (Lighthouse CI commit)

```bash
git cherry-pick a30f495
```

This cherry-pick is **conflict-free**: all 3 files it touches (`.github/workflows/lighthouse.yml`, `.lighthouserc.js`, `qa-reports/2026-05-30_Peter_WebPlatform.md`) are net-new additions absent on main. No merge resolution needed.

### Step 3 — DROP `39cddff` entirely

Do **not** cherry-pick `39cddff`. Every change it makes to `HeatmapLayer.tsx` and `MapScreen.tsx` is either already on main in a superior form or actively reverts a feature (ghost-FAB) that was deliberately added. Picking it would:

1. Revert `color.overlayBtn` → `'rgba(0,0,0,0.55)'` (breaks dark mode)
2. Revert `color.textOnBrand` → `'rgba(255,255,255,0.85)'` (breaks dark mode)
3. Delete the ghost-FAB + a11y labels (UX regression)
4. Revert `statusHint` color from `color.textMuted` to `color.warningHint`

None of these are improvements.

### Step 4 — Verify pre-merge

```bash
npm test
npx tsc --noEmit
```

Expect: all tests pass (the Lighthouse CI commit adds no source changes, only workflow files).

### Step 5 — Open PR: `ci/lighthouse-salvage → main`

PR title: `ci: add Lighthouse CI — accessibility hard gate (≥0.9) + perf warn (≥0.6)`  
Tag: `@rory-review`, `@gary-qa`

Gary should verify:
- The LHCI threshold values align with current baseline scores
- `web-build/` vs `dist/` output path in `.lighthouserc.js`

---

## 4. Verdict

| Recommendation | Rationale |
|----------------|-----------|
| **SALVAGE_CHERRYPICK** | Branch is not abandon-worthy — `a30f495` adds real CI infrastructure not on main. But the second commit (`39cddff`) is entirely redundant/regressive and must be dropped. The salvage is one conflict-free cherry-pick away. |

**Drop:** `ci/lighthouse-2026-05-30` (delete branch after salvage is landed)  
**Keep:** `a30f495` (`lighthouse.yml` + `.lighthouserc.js` + Peter's QA report) via clean cherry-pick onto `ci/lighthouse-salvage`

---

## 5. Decisions for Sky

None required. This is a safe, purely additive CI change with no privacy, DB, or production-surface impact. Morgan may approve via standard Rory+Gary sign-off path per the elevated authority grant through 2026-05-30.
