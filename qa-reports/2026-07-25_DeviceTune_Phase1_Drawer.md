# Device-Tune Phase 1 — D1: Dead Drawer Destinations

**Date:** 2026-07-25 · **Branch:** `devicetune/1-drawer-function` (base `d43f867` → tip `067864e`, 4 commits) · **Status:** BUILT + VERIFIED — **STOPPED ON BRANCH** awaiting Sky's merge (Const. Art. 1)
**Sky's device read:** hamburger → Resources / How To Help / About the App / Settings — "they are not working now."

## Baseline (fresh branch, before any edit)

- `npm run typecheck` — **0 errors**
- `npm run lint` — **0 errors / 77 warnings** (documented baseline)
- `npm test` — **2055 passed / 2 failed / 84 todo, 146 suites** — the 2 fails are the documented pre-existing parallel-run flakes (`MyReportsModal`, `StatusHistoryModal`); both **pass in isolation 10/10** (re-verified this run: 10/10 in 2.2 s). Matches the BP17 handshake baseline.

## STEP 0 — Discovery (recorded in `design-reviews/device-tune/DECISIONS.md`)

- **R2 seam:** R2 train fully merged (`main` == `r2/bp17` tip `d43f867`); R2 §P ledger stale; **no unmerged R2 work claims the drawer/pages**; BP16 copy-gate still pending → **string fence** for this phase (S-1).
- **Census:** all four destinations statically wired; Resources/HowToHelp/About = sibling `visible`-prop Modals inside `HamburgerDrawer` (by design, not nav routes); Settings/Admin = hidden lazy tab routes via `navigationRef`. **Doors-to-empty-rooms fork MOOT** — every destination has a real shipped screen with real content.
- **Sign out:** works but has **no confirmation** (`HamburgerDrawer.tsx:159-165`) — the only sign-out path in the app that skips `confirm()`.

## Per-destination diagnosis

**The premise correction first:** none of the four destinations is unwired. Every route/screen exists and every handler fires ([HamburgerDrawer.tsx:219-240](../src/components/HamburgerDrawer.tsx), [RootNavigator.tsx:369-390](../src/navigation/RootNavigator.tsx)). The failure is a runtime **iOS Modal dismiss/present collision** introduced by BP15's exit latch (merged in the R2 train — exactly the delta between Sky's last-good build and the current TestFlight build).

| Destination | Mechanism | Evidence (file:line, pre-fix) |
|---|---|---|
| **Resources** | `navigate('resources')` schedules `setTimeout(setSubScreen, motion.duration.base)` = **180 ms** — the same instant the T12 `rendered` latch completes the exit animation and flips the drawer Modal's `visible=false`. Two UIKit transactions (drawer **dismissal**, pageSheet **presentation**) land in the same frame; iOS either drops a presentation started during a dismissal, or presents the sheet from the drawer's still-presented controller and then tears it down with it. RN never retries a dropped presentation → the screen never appears. | timer: HamburgerDrawer.tsx:132-149 (pre-fix); latch release: :80, :118-125; `motion.duration.base = 180`: theme.ts:478; sub-screen sibling Modals: :272-283; `presentationStyle="pageSheet"`: ResourcesScreen.tsx:119 |
| **How To Help** | Identical mechanism, identical clock. | HowToHelpScreen.tsx:85-88 (pageSheet) |
| **About the App** | Identical mechanism; its Modal is the `transparent` bottom-sheet variant (overFullScreen presentation) — same transaction class, same collision. | AboutScreen.tsx:45 |
| **Settings** | Path is architecturally different (immediate `navigationRef.navigate('Settings')` to a registered hidden tab route — no modal presentation involved) and is register-verified. Ranked hypotheses: **(S1)** collateral of the wedged sub-screen state — a failed tap strands a sibling Modal at `visible=true`, poisoning subsequent modal/nav transactions in the session; **(S2)** it only *appeared* dead in the same poisoned session; **(S3)** an independent defect (lazy chunk / Suspense) — least likely. No Settings-specific code change made without evidence; the handoff fix removes the poisoning source (S1/S2). Final confirmation rides the device list. | RootNavigator.tsx:465-468 (delegation), :369-379 (registration), :43-60 (lazy + dressed fallback) |
| **Sign out** | Not dead — but it was the only sign-out path in the app with **no confirmation** (Settings and Profile both `confirm()` first). | HamburgerDrawer.tsx:159-165 (pre-fix) |

**Why every earlier gate missed it:** react-native-web Modals are portal divs — there is no UIKit transaction to collide — so the web dev-preview, the static-export probes, and jest all passed while the device failed. The reduce-motion path collided too (snap + `setTimeout(…, 0)` presents while the non-animated dismissal is still in flight), so RM users saw the same dead taps.

**Why it broke "now":** pre-BP15 the drawer Modal was `visible={open}` — its dismissal began at tap time, a full 220 ms before the sub-screen presented. BP15's welded exit (`rendered` latch) moved the dismissal to t≈180 ms and bound the present to the same 180 ms clock. The weld created the collision; the clock could never be made safe, only lucky.

## Fix

- **`c9c6bed` — commit 1 (D1/handoff):** retire the clock entirely. `navigate()` parks the request in a `pendingSubScreen` ref; the drawer Modal's **`onDismiss`** (iOS's dismissal-complete event) presents it — the earliest provably-safe instant. Android/web present at the latch-release commit (dialogs stack; portals don't collide). Reopen before the close finishes cancels the pending handoff. **Zero timers in either motion mode** — B5's designed-stillness contract strengthened (the RM path previously used `setTimeout(…, 0)`; now no clock at all). `reduceMotion.drawer.test.tsx` rewritten to pin the no-clock law; `HamburgerDrawer.exitLatch.test.tsx` untouched and green (the welded exit itself is preserved — only *when the sub-screen presents* moved).
- **`a929a6e` — commit 2 (D1/sign-out):** the drawer's Sign out now mirrors the Settings row exactly — same `confirm()` helper, **byte-identical strings** (`SettingsScreen.tsx:437` dialog, `:632` a11y hint — both verified verbatim in-repo before reuse; zero new user-facing copy, BP16 fence respected). Confirm runs before the drawer closes, so cancel leaves the user where they were; OK closes + `void signOut(user?.id)` like every other caller.
- **`7a43cea` — commit 3 (D1/guards):** the class-net. Behavioral: each in-drawer destination walked press → close → latch → dismissal → *its* marker mounts (and only its); Android/web immediate path; reopen-cancels-pending; Settings/Admin/Sign-in delegation; sign-out confirm cancel/OK/hint. Static (house idiom): every `onNavigate` tab must be a registered `Tab.Screen`, every `navigate(key)` must have a sibling `visible`-bound Modal, the `onDismiss` handoff must stay wired, and **no `setTimeout` may ever present a sub-screen again**.

No restyle, no glass, no token, no string changes — function only. No arbiter run required (no ink/floor/color pair changed).

## Verification

**Gates at tip (all three commits in):**
- `npm run typecheck` — 0 errors (after every commit).
- Lint — 0 errors; the two `require()` warnings my first test draft introduced were rewritten to `jest.requireActual` before banking (repo stays at its 77-warning baseline; changed files lint silent).
- Full jest, quiet machine: **148 suites / 2072 passed + 84 todo, 1 suite failed under parallel load → green in isolation (41/41)**. A second full run under heavy machine load (concurrent pod install) produced 4 parallel failures — the two documented flakes (MyReportsModal, StatusHistoryModal) plus ReportFlagModal (234 s under load) and flagsStoreSwr (96 s); **all four pass in isolation** (10/10 and 44/44 in 26 s). Classification: the repo's documented worker-teardown load-flake class, amplified by build contention; **zero deterministic failures, zero regressions** across every run.
- New guards: **16/16 green at tip.**

**Falsification (the unit-level before/after):** with the *pre-fix* `HamburgerDrawer.tsx` restored into the tree, the new guard suite fails **7 of 16** — the three destination handoffs, the Android latch-release path, both sign-out confirm behaviors, and the destructive hint — and passes the 9 contracts pre-fix code also honored. Against the fixed tree: 16/16. The guards discriminate exactly on the D1 surface; working tree restored byte-identical afterward (`git status` clean apart from the pre-existing `launch.json` deletion).

**PROTECT surfaces:** GlassSurface.tsx, severity grammar files, MapScreen box-none overlays, anonymity/honesty overlays, RM primitives — **zero touched** (`git diff --stat d43f867..HEAD` = HamburgerDrawer.tsx + 3 test files only). The drawer's own visuals: no style, token, layout, or JSX-visual line changed — the diff is handler logic, one `onDismiss` prop, and one accessibility hint (non-visual). The welded exit animation itself is untouched (exitLatch suite green, unmodified).

## The second mechanism — found during verification, and probably the one Sky hit

Driving the fixed build in a browser surfaced a **second, independent defect that shipped in BP15** and that commit 1 inherited: **an interrupted exit stranded the drawer Modal mounted and invisible.**

The latch released on `!open && finished`, where `open` came from the exit callback's **stale closure** (the value at the render that started the animation). When an exit ended with `finished:false` and no reopen followed — an animation superseded or stopped mid-flight, exactly what rapid or mid-animation taps produce — `rendered` stayed `true`. The result is a mounted drawer Modal at opacity 0 with a **full-screen backdrop `Pressable` still eating every tap in the app**. It is self-sustaining: each tap lands on the invisible scrim → `onClose()` → `open` is already `false` → no re-render → no release. **One wedge and Resources, How To Help, About *and* Settings all read "dead" until app relaunch** — a single mechanism that explains Sky's whole report, including Settings, whose navigation path is otherwise sound (hypothesis S1, now confirmed as a real mechanism rather than a guess).

Reproduced live: three rapid open/close cycles then a destination tap, on the pre-fix build → drawer stuck at `translateX(-288px)`, `[role="dialog"][aria-label="Menu"]` mounted, every subsequent tap swallowed. **`067864e` (commit 4)** gates the release on the live open intent (`openRef`) and ignores `finished`: any exit end-state releases the latch unless a reopen is genuinely in flight (`openRef.current === true`, which correctly no-ops so the panel springs back). The `exitLatch` suite's old interrupted-exit case had **pinned the wedge as intended behavior** — it asserted "interrupted ⇒ stays mounted" while never actually reopening — so it was corrected and a true-reopen case added alongside.

## Verified on the fixed build (real browser, live frames)

Every destination opened from the hamburger, each on the shipped static export of the branch tip:

| Destination | Result |
|---|---|
| Resources | ✅ renders — 6 info cards + the honesty footnote |
| How To Help | ✅ renders — 4 steps + the contribution callout |
| About the App | ✅ renders — v3.0.0 sheet, all 5 sections |
| Settings | ✅ renders — the real Settings surface (route `/Settings`, lazy chunk resolved) |
| Wedge regression | ✅ 3 rapid open/close cycles → destination still opens; app stays responsive (tab switch works after) |

**Environment honesty:** the in-app preview pane runs its tab hidden, which suspends `requestAnimationFrame` and freezes RN's slide mid-flight — a harness artifact, not app behavior; verification moved to a real browser tab with live frames. The **iOS simulator could not be used at all**: the vendored `fmt` pod fails to compile under this Mac's Xcode 26.6 (5× consteval errors in `format-inl.h`) — it would fail identically on untouched `main`, so it is unrelated to this work; a separate task was filed to resolve it. Because the sim was unavailable, **the iOS-specific `onDismiss` handoff is proven by code + the guard suite, not by a device run** — see the device list.

## Web-verified vs NEEDS-SKY-DEVICE

**Web-verified (real browser):** all four destinations render · the wedge fix under rapid interaction · app-wide responsiveness after · Settings lazy route · no console errors.

**NEEDS-SKY-DEVICE (TestFlight — Phase 1's contribution to the consolidated list):**
1. Hamburger → **Resources / How To Help / About the App** each open right after the drawer finishes closing (this is the iOS `onDismiss` path — the one leg web cannot exercise, since RN-web Modals are portals with no UIKit transactions).
2. Hamburger → **Settings** renders the real Settings surface.
3. **Rapid-tap torture:** open/close the drawer several times fast, then tap a destination — it must still open, and the app must stay tappable (the wedge check).
4. **Sign out** (signed-in account): confirm dialog appears; Cancel keeps the session *and* the drawer open; Sign out returns to sign-in.
5. **All of the above with Reduce Motion ON** (Settings → Accessibility → Motion): destinations appear instantly, no dead air, no wedge.

## D1 status

**D1 CLOSED pending Sky's device pass.** Both mechanisms are diagnosed with file+line evidence, fixed, and guarded: the dismiss/present race (commit 1) and the invisible-wedge latch (commit 4). Every destination is verified rendering in a real browser; the iOS-only leg is code-proven and guard-tested, and rides items 1–5 above. Nothing about the drawer's appearance changed — Phase 2 still owns material.

**Also surfaced, not acted on (Sky's calls):**
- `fix/photo-privacy-sanitize` @ `64342e1` (CRITICAL, unmerged, same base) — merge order is yours; no file overlap with this branch.
- Local iOS builds are blocked by the `fmt`/Xcode 26.6 incompatibility — separate task filed.
- Resources' cards still carry your own shipped `TODO(Sky)` for real links (ResourcesScreen.tsx:9-10); the cards degrade honestly to static info cards, so nothing shows a dead link. Untouched here.
