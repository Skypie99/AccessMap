# SIM-WALK HANDOFF — Flagstone Full Simulator Walk (Phase A)

**Run started:** 2026-08-19 23:46 PDT · **Model:** Fable 5 (Phase A = walk + diagnose only; Phase B = separate Opus window fixes)
**Output root:** `design-reviews/sim-walk/2026-08-19/`
**Repo:** `~/AccessMap` (app is named **Flagstone**; repo folder + identifiers deliberately still say accessmap — bundle `com.accessmap.app`, slug `accessmap`, scheme `accessmap://` — these are PROTECTED, never "fix")

## COMMIT HANDSHAKE (state before first tap; repeat at close-out)
- **Walked binary built from:** main @ `bc91789` ("Merge: the guard walkers went blind…"), local main == origin/main, clean tracked tree, 2026-08-19.
- **Tip check:** `bc91789` IS the current tip of main and origin/main at build time → everything merged to date (incl. today's legal-sheets/gestures fix, anon content filter `189bf5a`, Flagstone rename) is in the walked binary.
- **Build type:** PENDING — Route A in progress: local **Release** simulator build (sim-release; not a dev client). fmt/Xcode-26.6 fix verified present on main (`b70ca86`, plugin `./plugins/withFmtXcode26Fix` in app.json).

## RESUME PROTOCOL (successor: read this first)
1. Re-boot sim state recorded below (device + appearance + content size + account state).
2. Never re-walk a screen marked BANKED in `COVERAGE.md`; never re-log a defect already in `LEDGER.md`.
3. Continue from **NEXT ACTION** below.

## CURRENT SIM STATE
- Devices in matrix: **iPhone 17 Pro Max** `1AFA3DED-3D31-4397-9361-B24C31ADE750` (largest) · **iPhone 17e** `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC` (smallest available — NO SE-class exists in the iOS 26.5 runtime; recorded as a matrix limitation, not skipped coverage)
- supportsTablet: **false** (app.json) → no iPad in matrix; Apple reviews iPhone-only. ✓ deliberate.
- Booted iPhone 17 `DF1B630E…` belongs to another session today — DO NOT TOUCH.
- Appearance: not yet set (default light). Content size: default. Account state: signed out (fresh install pending).

## ONE-WRITER / PEER SESSIONS
- Peer session `heuristic-mestorf-e6b08b-53` live (worktree `.claude/worktrees/heuristic-mestorf-e6b08b`, branch already merged into main). Coordination message sent 23:47; claimed Pro Max + 17e sims + main-checkout build for this walk.
- Phase A makes NO commits and NO tracked-file edits. `ios/` is untracked (CNG).

## PRODUCTION LAW (live backend!)
- Anonymous write flows: fill → verify submit enables → NEVER press.
- Authed flows: password sign-in CANNOT be performed by the agent (credential-handling prohibition — system rule + Const. hard prohibition #5). Authed-only screens walk to the sign-in edge; full authed walk goes to SKY-QUEUE unless a credential-free session path exists (to verify during census).
- Never touch real user content. No [SIMTEST] rows created yet. Cleanup ledger: `SIMTEST_CLEANUP.md` (create on first row).

## INTERACTION LAYER (Step 0 outcome)
- **idb: UNAVAILABLE on this Mac** — `brew install idb-companion` resolves to nothing in core; `facebook/fb/idb-companion` needs "Command Line Tools for Xcode 27.0" (Apple download + admin install; not performable). fb-idb pip client additionally needed a Python-3.14 asyncio shim (written: scratchpad/idbrun) but is moot without the companion.
- **Substitute (equivalent capabilities): WebDriverAgent** (appium-webdriveragent via npm at scratchpad/wda/, built with local Xcode 26.6). Gives `/source?format=json` (full AX tree WITH frames = the describe-all equivalent, measured hit-targets) + W3C actions (tap/swipe/longpress) + typing. Driver: `scratchpad/wda.py <port> <cmd>`. Plan: WDA runner on port 8100 → Pro Max, 8101 → 17e. Sim MCP screenshot errored (matches memory: broken on this Mac); screenshots via `xcrun simctl io <udid> screenshot`.
- Verified-tap proof: PENDING (after app install).

## DONE SCREENS (Pro Max, light pass)
A1 Onboarding ✓ · A2 SignIn-edge ✓ (+B5/B6 from SignIn) · A3 Home ✓ (+C1 search, G1 location deny/grant, B3 feedback edge) · A9 Drawer ✓ · C17 Resources ✓ · C16 HowToHelp ✓ · C15 About ✓ (+F1 legal-over-modal PASS both sheets) · A5 GuestProfile ✓ (+hosted sign-in sheet edge) · A7 Settings ✓ (+B1 Help, B2 Changelog, B4 MyFeedback, D1 HiddenComments, D2 Replay, C13/D3 banner-prefs sheet, C18 Blocked (disabled-correct), C19 Export (gated-correct), Sign-out confirm probe) · Appearance Dark/System exercised

## ✅ PHASE A COMPLETE (2026-08-20 05:1x)
Both device passes done. Close-out written: `00_CLOSEOUT.md`. Ledger final: `LEDGER.md` (1 Blocker / 7 High / 9 Med / ~12 Low). 28/40 nodes walked, gap fully explained. [SIMTEST] cleanup done. WDA runners + log streams stopped. Sims idle (app installed, guest, Pro Max location granted, both reset to light/medium type). Zero commits, zero tracked edits.

## IF RESUMING (only the SKY-QUEUE authed remainder is left)
Needs Sky to sign into reviewer account on a booted sim first. Rebuild rig: `simctl boot <udid>`; relaunch WDA `cd scratchpad/wda/node_modules/appium-webdriveragent && TEST_RUNNER_USE_PORT=8100 xcodebuild -project WebDriverAgent.xcodeproj -scheme WebDriverAgentRunner -destination "id=<udid>" -derivedDataPath scratchpad/wda/dd test-without-building`; driver `scratchpad/wda.py <port> <cmd>`. Then walk A5b/C9–C12/C14/authed-C3/G3/Admin.

## CURRENT SCREEN
None — walk stopped, rig torn down.

## SIM/ACCOUNT STATE (successor: re-establish exactly this)
Pro Max `1AFA3DED…`: app installed, GUEST mode, appearance System (OS light), sim location set 49.2609,-123.1139, LOCATION GRANTED to com.accessmap.app, notifications NOT granted (guest switch disabled), onboarding completed, WDA on port 8100 (runner task b7zfh1e2o), log stream running → logs/console-promax.log
iPhone 17e `9C9D3ED6…`: app installed, NEVER launched, no WDA runner yet (use port 8101)

## REMAINING (Pro Max)
A4 Tasks (+C3 FlagDetail nest E1/E2/E3 + C8 lightbox, READ-ONLY on live rows) → A6 FullMap (+C2 presets, C4 saved places, C5 legend, C6 nearby, C7 report-to-EDGE, map a11y) → deep link accessmap://flag/{id} → dark pass (simctl appearance dark, re-shoot every banked screen) → AX Dynamic Type pass (content_size accessibility-extra-large spot-per-screen) → then 17e top-flow repeat (Onboarding via Skip, SignIn, Home, Tasks+detail, FullMap+report-edge, Settings) → close-out coverage arithmetic.

## SKY-QUEUE (authed remainder)
Signed-in walk needs Sky to sign into the reviewer/[SIMTEST] account once on each sim (password-only auth; agent cannot enter credentials). Then: A5b Profile full, C9-C12 profile modals, C14 Leaderboard, authed C3 actions (verify/resolve), G3 push dialog, Admin (if admin account).

## NEXT ACTION
Tap Tasks tab → census → walk list + C3 FlagDetail (read-only; no status changes, no comment submits) + nested E1/E2/E3 + C8.

---

# ═══ SESSION 5 — AUTHED PASS (Phase A-2) ═══
**Started:** 2026-08-20 16:14 PDT · Model: Fable 5 · walk + diagnose only, NO fixes

## COMMIT HANDSHAKE (session 5, before first tap)
`git -C ~/AccessMap rev-parse main` = **bc917891513da35265559f373b110b2a6bd8ea7f** — **UNCHANGED from the walked binary.** Branch = main, tracked tree clean (only untracked design-reviews artifacts). Walked binary remains valid; no rebuild needed. Build type = **sim-release**.

## RIG STATE (session 5)
- WDA Pro Max port **8100** (bg task benbnuskm, log `logs/wda-promax-authed.log`) — UP, verified-tap proof: SignIn "Show password"→"Hide password" + SecureTextField→TextField (app state changed).
- WDA 17e port **8101** (bg task b52qooh55, log `logs/wda-17e-authed.log`).
- Console stream Pro Max → `logs/console-authed.log` (bg task bab42qlr6).
- Both sims: appearance **light**, content_size **medium**.
- Shots → `shots/promax-authed/`, `shots/17e-authed/`.

## ACCOUNT STATE
- App relaunch drops to **SignInScreen** on both devices (the guest latch `onGuest` is in-memory only, not persisted — noted, not a defect).
- **PARKED ON SIGN-IN, AWAITING SKY'S LOGIN.** Agent never types/reads/stores credentials.
- Proof shots: `shots/promax-authed/01_signin_parked_READY.png`, `shots/17e-authed/00_signin_parked_17e.png`.

## DONE SCREENS (session 5)
A5b Profile signed-in ✓ · C11 MyReports ✓ · C12 MyWatched ✓ · C10 ActivityFeed ✓ · C9 Achievements ✓ · C14 Leaderboard ✓ · drawer(Admin row) ✓ · A4 Tasks authed ✓ · C3 FlagDetail authed ✓ · E2/E3 verdict ✓ · SW-30 re-test ✓
**ALL 6 SKY-QUEUE NODES WALKED.** New findings SW-38..SW-48 (incl. 2 BLOCKERS: SW-46 abuse-report unreachable app-wide, SW-47 SW-30 confirmed identical under auth).

## ACCOUNT FACTS (established, load-bearing)
- Signed in as **skylerhalisky@gmail.com — Sky's REAL account**, NOT a throwaway. 90 points, 6 real reports, Bronze, 10 pts from Silver.
- Account **IS ADMIN** (`is_admin=true`) — drawer shows Admin row; tab count 5→6. Sky expected non-admin. Cause: the `users.is_admin` SELECT grant only went live 2026-08-18 (src/lib/admin.ts), so the gate silently read false for months.
- **Points trigger is forward-only** → a verify/resolve on any own row would push 90→105 and permanently cross Silver + Engaged. WRITE ACTIONS ESCALATED TO SKY, not assumed.

## CURRENT SCREEN
Pro Max: Tasks, FlagDetail closed, signed in. 17e: Home, signed in, **BLOCKED on an iOS "Save Password?" sheet** (see below).

## ✅ PRO MAX COMPLETE
All SKY-QUEUE nodes + A8 Admin + G2/E1/C8 photo path + G3 push + Settings gated rows + SW-30/26/37/20/32 re-tests + full write walk (create → comment → verify → resolve → delete) + dark + AX-XL. Close-out: `00_CLOSEOUT_AUTHED.md`. Coverage **37/40**, the 3 gaps each explained. Findings **SW-38 → SW-53**, incl. 2 BLOCKERS.

## ✅ SESSION 5 COMPLETE — nothing outstanding for the agent
17e repeat DONE · Sign out DONE (Pro Max back at SignInScreen) · close-out `00_CLOSEOUT_AUTHED.md` finalised · rig torn down.
**Open items are Sky's only:** start from **`PHASE_B_MASTER_PLAN.md`** — all **48** findings in 4 root-cause-grouped waves, plus 6 decisions that are hers. Wave 1 has its own ready-to-run brief, **`PHASE_B_WAVE_1_BLOCKERS.md`** (SW-46 → SW-47), then SW-52 (privacy — needs her decision first) and SW-42; plus the DEVICE-ONLY remainder in the close-out.
Sky deferred both Blockers to Phase B on 2026-08-20 rather than fixing them in the walk window. A scratch branch was created and deleted with zero commits — `main` still `bc91789`, zero tracked edits across the whole session.

## (historical) REMAINING
1. **17e small-screen authed repeat — was BLOCKED:** an iOS **"Save Password?"** sheet (Not Now [51,500,140,49] / Save [199,500,140,49]) plus the app's push priming alert underneath (Not now [51,460] / Enable [199,460]) sit over the 17e Home. **The agent must not touch a credential-storage prompt — Sky taps it.** Once clear: Profile → C12 MyWatched (worst SW-42 case at 390×844) → one verify action.
2. **Sign out on the Pro Max** — deliberately held until last so the authed surface stays available.
3. Note: the 17e still shows **"14 barriers"** and the deleted [SIMTEST] flag as Open — stale client cache, expected with real-time updates OFF; verify it clears on refresh during the 17e pass.

## NEXT ACTION
Sky signs in on Pro Max → agent verifies session by censusing Profile tab (must show stats surface, NOT GuestProfile CTA) → walk A5b, C9–C12, C14, authed C3, G3, photo path, E2/E3 re-test, SW-30/SW-37/SW-20/SW-32/SW-01 re-test.
