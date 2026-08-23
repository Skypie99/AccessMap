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

---

## 2026-08-22 · Phases 06 and 07 merged, on Sky's direct instruction

`main` was `1984c3e` (00–05b). Both branches were **fast-forward-clean** — no
conflict in source or in `COPY_LEDGER.md`, because 07 was branched off the 06
tip rather than off `main` (see `build/07/BUILD_REPORT.md` §0).

| Step | SHA | What |
|---|---|---|
| before | `1984c3e` | 00–05b |
| after 06 | `c1212b5` | + report form · Settings · Profile · empty states |
| **after 07** | **`b1020d1`** | + the modal estate · announcement parity · SW-36 · hygiene |

**Gate re-run ON MERGED MAIN, not inherited from the branches:**
typecheck 0 errors · jest **241 suites / 3600 passed / 32 todo / 0 failed** ·
lint 0 errors / 82 warnings.

**NOT PUSHED.** `origin/main` is still `e8e7610`; local `main` is **42 ahead**.
Pushing is deliberately left until after the device gate (Prompt 08), so the
material and title calls can be reversed cheaply if the phone disagrees.

### Undo

```bash
git -C ~/AccessMap reset --hard 1984c3e   # drops BOTH 06 and 07
git -C ~/AccessMap reset --hard c1212b5   # drops 07 only, keeps 06
```

Safe while unpushed. Both phase branches are intact
(`design/gsp-06-forms-2026-08-22`, `design/gsp-07-modals-2026-08-22`).

### Carried into main unratified, deliberately

34 copy-ledger strings — 11 visible from Prompts 01/02/04, plus Phase 3's 22
a11y strings and W-37. Prompt 08 step 25 says nothing merges with an unratified
ledger; `origin/main` already shipped 00–04 the same way. See
`build/COPY_LEDGER.md` §OUTSTANDING AT A GLANCE.
