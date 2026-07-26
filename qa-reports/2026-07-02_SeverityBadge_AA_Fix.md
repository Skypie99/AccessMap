# SeverityBadge AA contrast fix — sev 2–4 text ink

**Date:** 2026-07-02 · **Branch:** `fix/severity-badge-aa` (off `fix/visual-sweep`) · **Commit:** `92a2be6` · **Sky merges.**

## What was wrong

`theme.ts` `severity[2..5].textOnColor` was white. White passes on sev-5 red `#D92D20` (4.83:1) but **fails WCAG AA** at badge text sizes on the mid-ramp fills:

| Severity | Fill | white text | ink `#0F1B2D` |
|---|---|---|---|
| 2 · Mild | `#F0A030` | ~2.1:1 ✗ | **8.05:1 ✓** |
| 3 · Moderate | `#F2792B` | ~2.5:1 ✗ | **6.21:1 ✓** |
| 4 · Significant | `#E85638` | ~3.4:1 ✗ | **4.79:1 ✓** |
| 5 · Severe | `#D92D20` | **4.83:1 ✓** (kept) | 4.35:1 ✗ |

Measured with WCAG relative-luminance math during the 2026-07-02 Material Lab pass (arbiter script: `/Users/skypie/AccessMap-material-lab/2026-07-02/shared/contrast-check.mjs`; evidence rows in `candidate-a-cast-light/contrast-result.txt`).

## The fix (2 files, 6 changed values total)

- `src/theme.ts` — `severity[2..4].textOnColor: '#ffffff' → '#0F1B2D'` (sev-1 already ink; sev-5 stays white — ink would fail there). Rationale + measurements documented in the comment above the ramp.
- `DESIGN.md` §1 — the "Text — on brand" usage note no longer claims white works on all severity colors.

**Consumers affected (both benefit, no code changes needed):** `SeverityBadge.tsx` (Tasks cards, detail modal) and `AdminScreen.tsx:165`. The severity **fills** are untouched — the test-pinned ramp (`severityColor.test.ts`) and the map/heatmap hierarchy are unchanged.

## Verification

- `npm run typecheck` ✓ · `npm test` ✓ — 106 suites, 1702 passed (84 todo), incl. `severityColor.test.ts`.
- **Live web verification, both themes** (expo web, guest, Playwright — computed styles, not eyeball): sev-4 badge renders `rgb(15,27,45)` ink on `rgb(232,86,56)`; sev-5 renders white on `rgb(217,45,32)`. Light + dark identical (the ramp is mode-independent by design).
- Proof screenshots: `qa-reports/assets/2026-07-02_sevbadge_aa/tasks-sevbadge-{light,dark}.png`.
- Sev 1–3 not present in live data but share the exact same table-lookup code path; ratios covered by the math above.

## Merge

```bash
cd ~/AccessMap && git checkout fix/visual-sweep && git merge --ff-only fix/severity-badge-aa
```

(1-commit fast-forward onto the sweep branch; rollback = `git reset --hard bbf7261` on this branch.)

## Related (not in this fix)

- The dark-mode FlagCard **title** legibility bug (near-black on dark card) is a separate chip/task — different root cause (title color not themed), untouched here.
- The Material Lab candidates already carry this ink fork; when a material system ships, its spec and this fix agree.
