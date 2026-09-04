# Flagstone final EMD — post-map-fix live acceptance

## Candidate identity

- Required starting HEAD: `dfaf1dddb51c5e329a5bf9f57135ba1b2e271f63`
- Verified starting HEAD: `dfaf1dddb51c5e329a5bf9f57135ba1b2e271f63`
- Verified starting HEAD tree: `e5ffffa1e07cc2eb44f4245829e5710f639b38ae`
- Worktree: `/Users/skypie/AccessMap-codex/map-heat-xxxl-fix-20260831`
- Starting tree cleanliness: YES
- Product source changed during this run: NO

## Attribution checks

- Approved configuration available: YES — presence confirmed in `/Users/skypie/AccessMap/.env` without reading or printing values. The candidate worktree has no `.env` of its own.
- Metro attribution to exact HEAD: FAIL — Expo resolved the exact project root but stalled before opening a serving listener. A port check also found a stale listener earlier; it was stopped only after an approved exact-PID request.
- Simulator attribution to exact HEAD: FAIL — CoreSimulatorService returned connection-invalid/connection-refused errors. The visible `Flagstone Audit iPhone 17 Pro` app is stale: its accessibility tree still exposes both the removed lower card and its dismiss button.

## Checks performed

- Exact HEAD/tree/status verification: PASS.
- Existing focused source tests/lint from the product candidate: previously PASS on the source commits in this worktree.
- No product mutation was made during this acceptance run.
- No EAS, deployment, push, merge, or production action was performed.

## Final receipt

| Check | Verdict |
| --- | --- |
| SHA | `dfaf1dddb51c5e329a5bf9f57135ba1b2e271f63` |
| TREE | `e5ffffa1e07cc2eb44f4245829e5710f639b38ae` |
| WORKTREE | `/Users/skypie/AccessMap-codex/map-heat-xxxl-fix-20260831` |
| TREE CLEAN | YES at acceptance start |
| APPROVED CONFIG AVAILABLE | YES |
| METRO ATTRIBUTION | FAIL |
| SIMULATOR ATTRIBUTION | FAIL |
| ONBOARDING DEFAULT | LIVE UNPROVEN |
| ONBOARDING XXXL | LIVE UNPROVEN |
| MAP HEAT DEFAULT | LIVE UNPROVEN |
| MAP HEAT XXXL | LIVE UNPROVEN |
| SINGLE HEAT CARD | LIVE UNPROVEN; stale Simulator showed two |
| LOCATION CARD COMPACT | LIVE UNPROVEN |
| OPEN SETTINGS DEFAULT | LIVE UNPROVEN |
| OPEN SETTINGS XXXL | LIVE UNPROVEN |
| MAP VIEWPORT | LIVE UNPROVEN |
| PAN | LIVE UNPROVEN |
| PINCH ZOOM | LIVE UNPROVEN |
| +/- ZOOM | LIVE UNPROVEN |
| COPY COMPLETE | LIVE UNPROVEN |
| WRAPPING | LIVE UNPROVEN |
| CLIPPING | LIVE UNPROVEN |
| ACTION REACHABILITY | LIVE UNPROVEN |
| OVERLAP | LIVE UNPROVEN |
| DYNAMIC TYPE RESTORED TO LARGE | NOT CHANGED |
| PRODUCT SOURCE CHANGED DURING THIS RUN | NO |
| UNRESOLVED P0 | 0 known |
| UNRESOLVED P1 | 1 — live acceptance blocked by runtime attribution |

## Final verdict

BLOCKED — exact-candidate Metro and Simulator attribution could not be established. No stale Simulator state is being claimed as acceptance evidence.
