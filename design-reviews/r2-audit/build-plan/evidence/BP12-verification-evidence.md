# BP12 — The status ledge (T6) — verification evidence

**Branch:** `r2/bp12-status-ledge` · **base** `9d1ff85` (bp11 tip) → **tip** `705a798`
**Date:** 2026-07-17
**Provenance:** phase authored on Claude Fable 5 (2026-07-15); **built on Opus 4.8 ultracode max effort** (Sky started this session on Opus for this train — satisfies the Opus gate). Model law S-10.
**Resolves:** F2-03 (HIGH; canonical for F5-04 placement + F5-08 two-vehicle collision). Tier: Meaningful (S-2). Vehicle path: MINIMAL arbitration/stacking (S-6).

---

## ⚠️ FOR SKY — a concurrent BP11 commit is duplicated on this branch (documented, no lost work)

While I was building (between my Commit 3 and Commit 4), the **concurrent BP11 agent's completion commit `eafd20e`** — "r2/bp11 — T3: finish the estate — same-file neutral residuals + error-red CTAs" — landed on the checked-out `r2/bp12-status-ledge` branch. (All repo commits are authored as `skylerhalisky@gmail.com`, so the author field is the BP11 *agent*, not a manual commit by you.) **BP11's own §P entry (line 48) documents the same event and its recovery.**

- **No work is at risk.** The BP11 agent already **cherry-picked `eafd20e`'s content onto `r2/bp11-press-vocab`** (now tip `8acb184` — I verified `errorPressed`/`borderPressed` are present there). So `eafd20e` on bp12 is a **duplicate** whose content is safely on bp11.
- It is **BP11** work (press-state color swaps → `errorPressed`/`borderPressed`) touching 6 files: `FlagDetailModal.tsx`, `MapScreen.tsx`, `TasksScreen.tsx` (style blocks ~1967–2372), `bp11PressVocabGuards.test.ts` (+3 guards), `theme.ts`, `ThemeContext.tsx`. Disjoint from my BP12 regions (its TasksScreen edits are style defs far from my one-line `publishLedge={false}` at :839), so **no conflict** — the branch is fully green with it.
- **Consequence:** the cumulative tracked diff `9d1ff85..705a798` carries those 6 files *in addition to* my 8 BP12 files. My 4 BP12 commits are cleanly scoped (proof below); the extra files are entirely `eafd20e`.
- **Documented remediation (BP11 §P, "Left for Sky") — I did NOT run it** (it's a history rewrite, and the instruction lives in a file, not from you in chat): drop the duplicate so bp12 is your 4 BP12 commits only —
  ```
  git rebase --onto 7de1f34 eafd20e r2/bp12-status-ledge
  ```
  Safe because the content is preserved on bp11 `8acb184`; this replays my Commit 4 onto Commit 3, dropping only the duplicate. Run it when both agents are idle. (Afterward, bp12 would normally also rebase onto the current bp11 tip `8acb184` per the stack.)

---

## Commits (mine — exactly the 8 intended files, verified `git show --stat e413b78 8c2c264 7de1f34 705a798`)

| # | SHA | What |
|---|-----|------|
| 1 | `e413b78` | `statusLedge.ts` store + `ScreenHeader` focused header-height publish |
| 2 | `8c2c264` | `LiveStatusRegion` docks below the header (announce byte-preserved) |
| 3 | `7de1f34` | vehicle arbitration + inner-pill `box-none` + Tasks `publishLedge={false}` |
| 4 | `705a798` | guards (19 tests): placement, box-none, arbitration, focus-publish |

Files (mine): `src/lib/statusLedge.ts` (new) · `src/components/ui/ScreenHeader.tsx` · `src/components/LiveStatusRegion.tsx` · `src/components/FlashBanner.tsx` · `src/screens/TasksScreen.tsx` (1 prop) · + 3 test files (`statusLedge.test.ts` new, `LiveStatusRegion.test.tsx` extended, `ScreenHeader.test.tsx` new).

## Commit-plan items — all CLOSED

1. **Placement pub-sub + header publish** ✅ `statusLedge.ts` (house pattern: module state + `Set` listeners + `useSyncExternalStore`, scalar hooks only). `ScreenHeader` publishes its outer-container HEIGHT (onLayout, guard `h<=0`) while focused via non-throwing `useContext(NavigationContext)`, seeds from `isFocused()` on mount, owner-guarded clear-on-blur, `publishLedge` opt-out.
2. **LiveStatusRegion subscribes + docks** ✅ wrapper `top` → `computeLedgeTop(insets.top, headerHeight, slot)`; registers occupant keyed on `rendered`. Map/no-header → today's `Math.max(insets.top,56)` byte-for-byte.
3. **Arbitration + box-none** ✅ FlashBanner joins as lower-priority occupant (stacks below the voice); inner pill → `pointerEvents="box-none"` (Retry still hittable); FlashBanner dismiss Pressable untouched.
4. **Announce-safety guards** ✅ 19 tests (below). No double/dropped announce; Tasks channel unmigrated.
5. **Captures + PROTECT evidence** ✅ this file + `evidence/BP12/`.

## Gates — all pass

- **typecheck** — `tsc --noEmit` → **0 errors** ✅ (verified)
- **jest** — clean full run at HEAD `705a798`: **136/136 suites, 2000 passed, 0 failed, 84 todo** ✅ (verified; `bp12-clean-jest.log`). Composition: **1979** baseline (`9d1ff85`) **+ 19 BP12 guards + ≈2–3 from your `eafd20e`** (bp11PressVocabGuards). No unrelated red. *(One earlier full run showed a `MyReportsModal` 15s-timeout — confirmed an environmental load flake under a 119s overloaded run: it renders no ScreenHeader, and passes in 1.7s in isolation.)*
- **lint** — `eslint` on all changed files → **0 errors, 0 warnings** ✅ (verified with `--max-warnings 0`; test helpers refactored `any`→`unknown` to hold the no-new-warnings floor).
- **arbiter** — none required (position-only; **no ink/color/floor change** — report §7). Not run; correct. ✅
- **blur budget** — **unchanged**: zero `GlassSurface`/BlurView added, so `__getLiveBlurPaneCount` is unaffected at any simultaneous state. ✅ (code-inferred)
- **7 immutable stacks JSON** — untouched (my diff contains none of them). ✅
- **diff scope (mine)** — my 4 commits touch **exactly** the 8 intended files (verified). ✅  *(The branch's cumulative diff additionally carries your `eafd20e` — see flag above.)*

## PROTECT proof

- **PROTECT-18 (announce law byte-preserved)** — `evidence/BP12/PROTECT-18_LiveStatusRegion.diff`: the **only** removed line is the old wrapper `top` (`Math.max(insets.top,56)` → `computeLedgeTop(...)`, reformatted multi-line, same element instance); everything else is additive (import + 2 hooks + the box-none comment/prop). The native announce effect (`announceForAccessibility(status.message)`, now :72) and the web text-mutation carrier + zero-width-space parity (now :119) are **unchanged** — a `style.top` update never remounts the aria-live node. The 6 existing announce/text-mutation/monotonic-key tests stay green (runtime proof). ✅ (verified)
- **PROTECT-7 (RM discipline)** — no motion touched; the entrance/exit animation + reduced-motion gating are byte-unchanged. ✅
- **box-none law** — extended to the new text-carrier pill; guarded by the `countBoxNone` test (idle 1 → active 2). ✅

## Web evidence (web-approximated — device is the real gate)

- **Render-regression probe** (fresh `expo export` + `probe-export.mjs` on :8082, *with* BP12): `tasks: RENDERS · map: RENDERS · nearbyList: RENDERS · report: RENDERS`. No ErrorBoundary. The one `findNodeHandle` pageerror is **pre-existing** (`src/lib/accessibility.ts`; none of my 5 changed files use it). ✅
- **Home header frames** — `evidence/BP12/app__{light,dark}__390__home-header.png`: the "9 barriers" editorial header renders intact and un-decapitated (the pill is status-triggered, so its docked visual is device-gated). No visual regression.
- The docked-pill and two-vehicle-stack visuals require a status event (submit forbidden by the rig; no debug hook added) — **deferred to device (R2-D16)**.

## Strings

**None.** Position-only; zero user-facing string changes (honesty fences moot). Tasks' Fork-2-coupled points strings byte-identical.

## NEEDS-SKY-DEVICE — R2-D16

iPhone VoiceOver: the pill announces **once**, docked **below** the header (Home/Profile/Settings/Admin); the menu circle is fully tappable (inner pill box-none); SR announce timing preserved through the reposition; Map placement unchanged.

## Things for Sky to eyeball
1. **The `eafd20e` interleaving** (top of this file) — your call.
2. On device (R2-D16): the docked-pill placement + the un-intercepted menu circle.
3. Per-screen sanity: confirm Profile/Settings/Admin render `ScreenHeader` as their *top* chrome (they publish by default). Home verified (guest-web default) and Tasks opted out. If any other screen nests its header like Tasks, add `publishLedge={false}` there.
