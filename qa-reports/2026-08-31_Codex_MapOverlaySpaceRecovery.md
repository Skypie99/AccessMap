# Map overlay space recovery

## Candidate

- Worktree: `/Users/skypie/AccessMap-codex/map-heat-xxxl-fix-20260831`
- Branch: `codex/map-heat-xxxl-fix-20260831`
- Previous HEAD: `596e3747798008faf0c438a5f7ec1454b21c861a`
- New source SHA: `f94e7a1ff841039c2ac03359857bc6d31b15b73d`
- New source tree: `4b79276f54f474c8e93188fd38bdd3f59035c681`

## Files changed

- `src/screens/MapScreen.tsx`
- `src/screens/__tests__/MapScreenHeatEmpty.test.ts`
- This QA receipt

The change is limited to Map overlay composition. The upper Heat Zone card is retained and moved above the Location-is-off card. The Location-is-off banner uses reduced vertical padding and an inline Settings action at ordinary text sizes; at XXXL it keeps the existing stacked, readable composition. Its copy is unchanged. Map calculations, thresholds, gestures, controls, navigation, and safe-area logic are unchanged.

## Checks

```bash
NODE_PATH=/private/tmp/accessmap-test-stubs/node_modules:/Users/skypie/AccessMap/node_modules /Users/skypie/AccessMap/node_modules/.bin/jest --ci --watchman=false src/screens/__tests__/MapScreenHeatEmpty.test.ts src/screens/__tests__/MapScreen.heatmap.test.tsx src/screens/__tests__/MapScreen.openSettings.test.ts --runInBand
```

Result: PASS — 3 suites, 34 passed, 14 todo.

```bash
./node_modules/.bin/eslint src/screens/MapScreen.tsx src/screens/__tests__/MapScreenHeatEmpty.test.ts src/screens/__tests__/MapScreen.openSettings.test.ts
```

Result: PASS.

```bash
git diff --check
```

Result: PASS.

No EAS, deployment, push, merge, or production action was performed.

## Required receipt

| Check | Verdict |
| --- | --- |
| Upper Heat card present | PASS (source + focused test) |
| Lower Heat card removed | PASS (source + focused test) |
| Ghost space removed | PASS source-level; no lower card/container/style remains |
| Map viewport reclaimed | PASS source-level; additional pixels not measured live |
| Default size | LIVE UNPROVEN |
| XXXL | LIVE UNPROVEN |
| Pan/zoom preserved | LIVE UNPROVEN; no gesture code changed |
| Product source changed | YES |
| Simulator verification | LIVE UNPROVEN |

## Blocker

No complete native dependency/runtime environment was available to build this exact SHA, prove Metro attribution, or directly verify default and XXXL pixels, clipping, overlap, reachability, and map gestures. No stale Simulator evidence was used.

## FINAL VERDICT

BLOCKED — source-level overlay space recovery is complete and focused checks pass; live default/XXXL acceptance remains outstanding.
