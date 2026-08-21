# PHASE B — WAVE 1 RESULT: the two Blockers

**Brief:** `PHASE_B_WAVE_1_BLOCKERS.md` · **Plan:** `PHASE_B_MASTER_PLAN.md` (48 findings, 4 waves)
**Date:** 2026-08-20 · **Branch:** `fix/simwalk-w1-blockers-2026-08-20`, branched off `main @ bc91789`
**`main` was not touched.** Two commits, not merged. Sky merges.

| | |
|---|---|
| **SW-46** (≡ closes SW-26 as superseded) | ✅ **FIXED and VERIFIED in the simulator** |
| **SW-47** (≡ closes SW-30) | ✅ **FIXED and VERIFIED in the simulator** |

---

## STEP 0 — the gate baseline, pinned before the first edit

Two of three were recorded on `bc91789` already; the jest baseline had never been captured, so it was run first. All three were re-measured rather than taken on trust.

| Gate | Baseline @ `bc91789` | After both commits | Δ |
|---|---|---|---|
| `npm run typecheck` | **0 errors** | 0 errors | — |
| `npx jest --ci -w 3` | **209 suites · 3070 passed · 32 todo · 0 failed** | **210 suites · 3079 passed · 32 todo · 0 failed** | +1 suite, +9 tests |
| `npm run lint` | **0 errors / 78 warnings** | 0 errors / 78 warnings | — |

The +9 are the new regression tests. **No pre-existing test was disturbed, and no warning count moved.** `prettier --write src` was never run.

---

## BLOCKER 1 — SW-46 · the abuse-report path was unreachable for every user

**Commit `bb39bc4`** · `FlagDetailModal.tsx` `StatusHistoryModal.tsx` `ReportContentModal.tsx` `MapScreen.tsx` + new test

### What was wrong
`StatusHistoryModal` and `ReportContentModal` were mounted as siblings **after** `FlagDetailModal`'s `</Modal>`, so they resolved to the **screen's** view controller — the one FlagDetail itself occupies while open. iOS refuses a second presentation from an already-presenting VC. History and Report rendered visible and enabled and did nothing at all.

`ReportContentModal` is the **Apple Guideline 1.2(b)** objectionable-content sheet, and `FlagDetailModal` is its **only mount point app-wide**, for flags *and* comments. A UGC app was shipping with its report mechanism 100% dead.

### The fix
Both sheets moved **inside** the `Modal`, directly after `{legal.sheets}`. The structural diff is one line: `</Modal>` moves from before the pair to after it. A presented view controller may itself present, so they now present from *this* modal's VC, which is free.

This is the third time the repo has solved this bug — `LegalSheets.tsx` documents the identical UIKit error from 2026-08-19 and prescribes exactly this remedy; `PhotoGallery`'s lightbox already does it; and `{legal.sheets}` sat inside this very Modal three lines above the broken pair. The correct and incorrect patterns were adjacent in one file.

### The four false comments — all corrected
They kept regenerating the bug, so they were treated as part of it.

| File | The claim | Why it was false |
|---|---|---|
| `FlagDetailModal.tsx` | "StatusHistoryModal above is the shipped precedent for a payload-carrying sheet stacked over this one" | StatusHistoryModal was the *same bug*, dead since it shipped |
| `StatusHistoryModal.tsx` | "Sibling-Modal pattern, like PhotoLightboxModal" | `PhotoLightboxModal` is mounted on **TasksScreen — a tab screen**, where the root VC is free and a sibling mount is correct. Never a precedent for this |
| `ReportContentModal.tsx` | cited StatusHistoryModal as its precedent | precedent for the *arrangement*, never for the arrangement *working* |
| `MapScreen.tsx` | "Nesting is already proven here" | see the new finding below — this one load-bears a live decision |

### Why the existing tests missed it, and what replaces them
`StatusHistoryModal.test.tsx` and `ReportContentModal.test.tsx` both exist and both passed throughout. They mount the children **standalone**; the defect was never in a child, it was in where the parent mounts them — which a child's unit test structurally cannot see. `FlagDetailModal` had ~14 guard tests reading it as **source** and not one that rendered it.

New suite `FlagDetailModal.sheetPresentation.test.tsx` renders the **parent**, opens each sheet the way a user does, and asserts the one relationship UIKit actually consults: *is the sheet a descendant of the modal already presenting?*

**Verified as a real regression detector — both assertions fail against the pre-fix arrangement and pass after.**

---

## BLOCKER 2 — SW-47 · re-opening a flag from a second screen crashed the screen

**Commit `d2da5a5`** · `useComments.ts` + `FlagDetailModal.tsx` + tests

### The chain (all four links confirmed in source)
1. `RealtimeClient.channel(topic)` **returns an existing channel** when the topic matches (`realtime-js/RealtimeClient.js:343-353`).
2. The topic was `flag_comments:${flagId}` — flagId alone — so every host for one flag shared one channel object.
3. `FlagDetailModal` syncs `shownFlag` only when `flag` is truthy, so a closed sheet stays mounted **and stayed subscribed**, indefinitely and invisibly.
4. Opening the same flag from a second screen called `.on()` on an already-subscribed channel, which throws — uncaught, in render.

`RealtimeChannel.on()` throws with **exactly** the string in the crash report, which closes the chain rather than inferring it.

### The fix — three changes, each closing a different door
1. **`active` gate** — `FlagDetailModal` passes its own `visible`; an inactive host does not subscribe at all. The correctness fix, and it stops three screens holding channels open for flags nobody is looking at. Gates the *subscription* only; the initial load stays unconditional so a reopened sheet still has its thread.
2. **Per-instance topic** (`useId()`) — makes the collision structurally impossible even if two visible hosts coexist, and closes the async-`removeChannel` teardown race that is live in the code though it never reproduced.
3. **try/catch** — realtime is a nicety; its failure must cost a feature, not the screen. Channel creation and subscribe are split so the catch still holds the handle `channel()` already registered when `.on()` throws — an un-removed registration would poison the next attempt, the same failure one layer down.

**Not** fixed by clearing `shownFlag` on close — that retention is deliberate and is what stops the sheet blanking mid-exit-animation.

### Tests
Six new hook-level cases, **all six verified to fail against the pre-fix hook and pass after**. Hook-level on purpose: what broke was two *instances* interacting, which no single-instance render test and no source scan can see. One existing assertion changed from an exact topic string to a prefix match, because the topic deliberately changed shape; nothing else in that suite moved.

---

## SIMULATOR RE-WALK — rebuild → reinstall → re-walk

**Build:** `npx expo run:ios --configuration Release --no-bundler` on iPhone 17 Pro Max (`1AFA3DED…`), from the branch. `BUILD_EXIT=0`, `Build Succeeded`, same **sim-release** type as the walk. Launched into the real UI with the embedded bundle — no dev-launcher chrome. Driver: the walk's own WebDriverAgent (`tools/wda.py`), port 8100.

**Console:** `xcrun simctl spawn … log stream` filtered to `process == "Flagstone" OR subsystem == "com.apple.UIKit"`, captured across the whole walk.

### Results

| # | Check | Result |
|---|---|---|
| 1 | FlagDetail → **History** opens `StatusHistoryModal` | ✅ presents over the detail card, which stays visible behind it |
| 2 | FlagDetail → **Report** opens `ReportContentModal` | ✅ presents fully — 5 category radios, reason field, Cancel/Send |
| 3 | Both close cleanly | ✅ |
| 4 | **No "already presenting" line** on either tap | ✅ |
| 5 | SW-47: same flag, Tasks → close → Map → open | ✅ **no crash** |
| 6 | SW-47 repeated | ✅ **6 consecutive cross-parent opens, all clean** (the walk hit the crash in 4) |
| 7 | F4 — a legal sheet still opens over an in-modal surface | ✅ Privacy Policy presents over About |
| 8 | Report sheet's **own** Terms link opens over it | ⚠️ **could not be tested — see new finding N-2** |

### Whole-walk console tally — 112,077 lines captured

| Signature | Count |
|---|---|
| `already presenting` | **0** |
| ``after `subscribe`` `` | **0** |
| `ErrorBoundary` | **0** |
| `uncaught render` | **0** |
| `postgres_changes` (error form) | **0** |

Evidence: `shots/wave1-verify/` — five screenshots + the gzipped console log.

### Declared limits of this walk
- **Guest only.** The app was signed out and an agent may not enter a password. Both blockers are auth-independent by the brief's own evidence — SW-26 and SW-30 are the guest-side IDs of these exact defects — so guest verification is valid for presentation and for the crash. **The authed re-check is Sky's.**
- **SW-47 verify step 3 (post a comment, confirm live insert) was NOT performed.** It needs auth *and* it writes to the live production backend. Realtime INSERT handling is covered by the existing unit tests; live-insert behaviour on the new topic is unverified on device.
- **SW-47 verify step 4 (no channel leak)** is covered by unit test (`removeChannel` on teardown), not observed on device — realtime channel state is not visible from outside the process.
- **My Reports as the third parent** needs auth; Tasks and Map were used.
- One device (17 Pro Max). The 17e was not re-walked.

---

## NEW FINDINGS — not among the 48

### N-1 · `MapScreen`'s screen-reader branch is the SW-46 shape, unverified — `MapScreen.tsx`
The S3 branch presents `FlagDetailModal` on top of a **deliberately still-open** `NearbyFlagsModal`. Those two are **siblings on that screen**, both presenting from the screen's VC — the exact arrangement SW-46 was. It was justified by the false "nesting is already proven here" comment, which is what makes this more than a coincidence.

**Not reproduced** — the branch is screen-reader-only and this walk did not run VoiceOver. **Not fixed** — out of Wave 1's scope, and any fix is a real decision (close Nearby first, which the comment says races the transition, or restructure the mount). The comment now records it as **suspect and unverified** instead of proven. **Needs real VoiceOver on device.** Sits naturally beside SW-23, SW-03 and SW-16 in the device-only bucket.

### N-2 · the Report sheet's Terms & Community Guidelines link is drawn outside the sheet — `ReportContentModal.tsx`
Measured on device: the sheet's card ends at **y≈813**; the Terms button's frame is **[20, 810, 400, 44]**. It is present in the accessibility tree and **invisible on screen**, and a tap at its centre does nothing — so it is reachable by VoiceOver and by nobody else. This is the app's in-context link to the community guidelines, sitting on the Apple 1.2(b) surface.

**This is pre-existing, not caused by the SW-46 move.** `ReportContentModal` is `KeyboardAvoidingView`-wrapped with `maxHeight: '90%'` and reads insets from `SafeAreaInsetsContext` — React context flows through the **component tree**, not the native view hierarchy, and an RN `Modal` is a full-screen presentation either way, so nesting cannot change its geometry. It is the **SW-42 family** ("KAV-wrapped sheets render undersized and clip their own content"), and it was simply invisible before because the sheet could never present at all.

**Recommend folding N-2 into the Wave 2 SW-42/SW-45 decision** — it is the same question ("do sheets clear the tab bar or cover it?") on a third surface, and that surface is the store-review one.

### Confirmed in passing
- **SW-13** — the tab bar announced "tab, 1 of 5" on a 3-tab bar. Live.
- **SW-27** — "279.2 km · 3351 min walk". Live.
- **SW-08** — Home showed "Loading…" then a load failure that cleared on retry; the underlying transient is real (the first flag load failed, a retry succeeded).

---

## DECISIONS FOR SKY

1. **Merge `fix/simwalk-w1-blockers-2026-08-20`** — two commits, `bb39bc4` then `d2da5a5`. Gate green, both fixes verified on device. Nobody else merges.
2. **N-2** — fold into the Wave 2 SW-42/SW-45 sheet-geometry decision, or treat as its own store-blocker-adjacent fix. It is on the 1.2(b) surface.
3. **N-1** — needs a real VoiceOver device pass before anyone writes a fix. Do not fix it blind.
4. **Authed re-check of both blockers** — 2 minutes signed in: open a flag's History and Report, then open the same flag from Tasks and My Reports back to back.
5. **SW-52 still needs your approval before anyone edits it** (privacy; unchanged by this wave).

## NEXT
Per the master plan: **SW-52 decision → Wave 2 → Wave 3 Cluster A+B → Wave 3 rest → Wave 4.** Wave 2's brief is `PHASE_B_WAVE_2_HIGH.md`.

**Rollback:** `git revert d2da5a5` and/or `git revert bb39bc4` — independent, either order.
