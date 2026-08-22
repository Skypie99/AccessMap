# MERGE LOG — Flagstone art-direction build series (2026-08-21)

Local merges only. **Nothing has been pushed**; `origin/main` is untouched.

## 2026-08-22 — phases 02, 03, 04 merged on Sky's direct say-so

| | |
|---|---|
| main BEFORE | `2c631e7` (phases 00 + 01) |
| main AFTER | `9e493d8` |
| merged | `design/gsp-02-flagdetail-2026-08-21`, `design/gsp-03-map-2026-08-21`, `design/gsp-04-flagcard-2026-08-21` |
| ahead of `origin/main` | 43 commits, unpushed |

### How it went in

02 merged clean. **03 then conflicted** on
`design-reviews/art-direction/2026-08-21/build/COPY_LEDGER.md` — the same single
doc conflict the GSP-04 branch had already hit and resolved (both phases append
their own section to one file; no source file conflicted, then or now).

Rather than hand-resolve the same conflict a second time and risk a resolution
that differs from the one already reviewed, that merge was **aborted** and 04
merged directly instead: the GSP-04 branch already contains 02 and 03 in full,
plus the resolved ledger. All three are ancestors of `main` — verified with
`git merge-base --is-ancestor`, not inferred from the merge output.

### Gates ON the merged tree (not on the branch)

- `npm run typecheck` — clean
- `npm run lint` — **0 errors**, 82 warnings (the standing baseline)
- `npx jest --ci -w 3` — 236 suites · 3447 passed · 32 todo · **0 failed**

### Undo

```bash
git -C ~/AccessMap reset --hard 2c631e7
```

Safe while unpushed: it returns `main` to phases 00 + 01 and leaves all four
phase branches intact.
