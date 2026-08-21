# RUN — THE FLAGSTONE **AUTHED PASS** (Phase A-2 · walk + diagnose only, NO fixes)

Paste this whole file into a fresh window. Model: **Fable 5** (judgment/audit). Do not fix anything — findings only; Phase B fixes them later.

---

## WHAT THIS IS

The Flagstone full simulator walk (Phase A) is **complete for the guest surface** — 28/40 screen-graph nodes walked, 1 Blocker + 7 High + 9 Med banked with measured evidence. Twelve nodes could not be reached because the app's only auth is **email + password**, and an agent may never type credentials.

Sky is now signing in **herself, directly in the Simulator window**. Your job: walk everything that only exists behind that session, measure it the same way, and **append** the findings to the same ledger so Phase B fixes guest + authed in one pass.

**Read first, in this order** (all under `~/AccessMap/design-reviews/sim-walk/2026-08-19/`):
1. `00_CLOSEOUT.md` — coverage arithmetic, route taken, what's already proven good
2. `LEDGER.md` — every existing finding + the severity rollup (**next free ID = SW-38**)
3. `01_SCREEN_GRAPH.md` — the 40-node census; your targets are the SKY-QUEUE rows
4. `HANDOFF.md` — rig state + resume protocol
Never re-walk a banked screen. Never re-log an existing finding — if you can *extend* one (e.g. it behaves differently when signed in), add a new row that cites the old ID.

---

## ★ THE LOGIN HANDOFF — how this works (do not deviate)

- **You never type, read, request, or store the password.** Not in the sim, not in chat, not in a file. If Sky offers to paste it, decline and point back to this protocol.
- **Your move:** park the app on the sign-in surface (Profile tab → "Sign in to your account", or the drawer's Sign in row), take a screenshot proving it's ready, and tell Sky "ready for your login."
- **Sky's move:** she types email + password into the Simulator window and taps Sign in.
- **Her signal:** she says signed-in. **Verify it yourself** before walking (census the Profile tab — it should show her stats surface, not the GuestProfile CTA) and screenshot the proof.
- If the sign-in fails, report exactly what the screen and console say. Do not retry with guessed credentials.

---

## ★ THE PRODUCTION LAW (this build talks to the LIVE Supabase backend)

The bundle is pointed at the real production backend, so authed actions **write real rows**.

- Any row you create — flag, comment, feedback, saved place, preset — is prefixed **`[SIMTEST]`**, logged in `SIMTEST_CLEANUP.md` the moment it's created, and **deleted before you stop**.
- Prefer acting on **your own** `[SIMTEST]` flag. **Never** verify, resolve, reject, comment on, report, or edit any real user's content — not even to "see what happens."
- Points/status changes you cause on your own row are acceptable and must be noted in the cleanup ledger (the points trigger is forward-only; note anything you can't undo).
- If a cleanup can't be completed in-app, bank it as Sky's one-tap list with the exact row IDs.
- Sky's separate pre-submission task — purging the 20 old test flags via `supabase/migrations/2026-08-18_purge_test_flags.sql` — is **not yours**. Don't run migrations, don't touch the dashboard.

---

## ENVIRONMENT — already built and standing (verify, don't rebuild)

| Thing | Value |
|---|---|
| Repo | `~/AccessMap` (app is **Flagstone**; `com.accessmap.app`, slug/scheme `accessmap` are PROTECTED — never "fix") |
| **Walked binary** | **main @ `bc91789`**, sim-release (Release config, embedded bundle) |
| `.app` | `~/Library/Developer/Xcode/DerivedData/Flagstone-dzchufdcllkfptcsdoaxwrtpbayq/Build/Products/Release-iphonesimulator/Flagstone.app` |
| Sims (booted, app installed) | **iPhone 17 Pro Max** `1AFA3DED-3D31-4397-9361-B24C31ADE750` (440×956) · **iPhone 17e** `9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC` (390×844) |
| Pro Max state | guest, light, location GRANTED, sim location 49.2609,-123.1139 (Vancouver) |
| Driver | `design-reviews/sim-walk/2026-08-19/tools/wda.py` — `python3 tools/wda.py <port> <cmd>` (census · source · tap · eltap · settext · clear · swipe · longpress · type · home · screen) |
| WDA build | already compiled at `/private/tmp/claude-501/-Users-skypie/80694a25-eae8-431c-b5ed-c8d8b1d9abaa/scratchpad/wda/` |

**★ COMMIT HANDSHAKE — state before the first tap and again at close-out.** Confirm `git -C ~/AccessMap rev-parse main` is still `bc91789`. If main has moved, **stop and say so** — either rebuild from the new tip (~75 min cold, `npx expo run:ios --configuration Release --no-bundler --device <udid>`) or get Sky's explicit call to walk the older binary. Every finding carries the commit tag + build type (sim-release).

**Start the rig** (relaunch WDA on the Pro Max, then prove one tap changes app state before declaring the walk possible):
```bash
cd /private/tmp/claude-501/-Users-skypie/80694a25-eae8-431c-b5ed-c8d8b1d9abaa/scratchpad/wda/node_modules/appium-webdriveragent && TEST_RUNNER_USE_PORT=8100 xcodebuild -project WebDriverAgent.xcodeproj -scheme WebDriverAgentRunner -destination "id=1AFA3DED-3D31-4397-9361-B24C31ADE750" -derivedDataPath /private/tmp/claude-501/-Users-skypie/80694a25-eae8-431c-b5ed-c8d8b1d9abaa/scratchpad/wda/dd test-without-building
```
Run it in the background, watch its log for `ServerURLHere`, then `curl -s http://127.0.0.1:8100/status`. Also start a console stream per device (`xcrun simctl spawn <udid> log stream --predicate 'process == "Flagstone"' --style compact > logs/console-authed.log`) — a silent console error on a working-looking screen is a finding.

---

## THE TARGETS (walk these; coverage is arithmetic)

**The 6 SKY-QUEUE nodes** — the whole reason for this pass:
| Node | What to prove |
|---|---|
| A5b Profile (signed-in) | real stats/points/counts, avatar, edit paths, hero layout at both sizes |
| C9 AchievementsModal | badge states, locked vs earned, labels |
| C10 ActivityFeedModal | real activity rows, empty/loading, pagination |
| C11 MyReportsModal | her own reports, status chips, row actions |
| C12 MyWatchedModal | watch list, unwatch path |
| C14 LeaderboardScreen | ranking, her position, ties, self-highlight |

**Plus everything the guest gate blocked:**
- **Authed C3 FlagDetail actions** — Verify / Mark resolved / Reject on a `[SIMTEST]` flag you created. Watch the points flash banner and the status change end-to-end.
- **Comments** — compose + submit on your own `[SIMTEST]` flag; then hide-comment, and the blocked-term filter path if you can trip it with an obviously blocked test string on your own row.
- **E3 StatusHistoryModal / E2 ReportContentModal** — SW-26 says both buttons are dead as a guest. **Check whether they work when signed in** — that single fact tells Phase B whether it's an auth-gate bug or a wiring bug. High value.
- **Photo path** — now that you can attach: ReportFlagModal photo picker → **E1 PhotoGallery** → **C8 PhotoLightbox**, plus the EXIF/sanitize gate (`sanitizeImageMetadata`, historically the #1 device bug). Sim photo library only; camera stays DEVICE-ONLY.
- **G3 push permission** — the Settings switch was silently disabled for guests (SW-20). Signed in it should be live: flip it, catch the OS dialog, walk both accept and deny.
- **Export my data**, **Blocked people**, **banner preferences** (all guest-gated before), **Sign out** for real.
- **A8 AdminScreen** — only if her account is `is_admin`. If not, say so and leave it census-complete.

**Re-test these known findings under auth** (cite the ID, add a new row if behavior differs):
- **SW-30 (BLOCKER)** — re-opening the *same* flag's detail crashes via `postgres_changes … after subscribe()`. Guest comments are gated yet the channel still subscribed. **Signed in, comments actually render — is it worse, identical, or absent?** Establish this precisely; it shapes the Phase B fix.
- **SW-37** — report flow dead-ended with location denied. Does an authed report with location granted complete to the edge? (Fill it, verify Submit enables — you MAY submit **one** `[SIMTEST]`-described flag if you need a row to act on, then delete it at close.)
- **SW-20**, **SW-32**, **SW-01** (does the consent line matter on the authed sheet?)

**Both devices:** full pass on Pro Max; repeat the top authed flows (Profile, one modal, one verify action) on the 17e — small screens are where sizing dies. Both appearances (`xcrun simctl ui <udid> appearance dark|light`) on every new screen, and Dynamic Type at `content_size accessibility-extra-large` spot-checked per screen.

**Measure, don't eyeball:** every screen gets an accessibility-tree census with frames; hit targets checked numerically against the 44pt floor; safe-area/home-indicator intrusion checked; elements-exercised / elements-found stated per screen.

---

## HOW TO BANK (the resume protocol — absolute)

Write to disk **the moment** each screen completes; never hold findings in context.
- **Findings** → append to `LEDGER.md` under a new `## Session-5 additions (authed pass)` table. **New IDs start at SW-38.** Every row: tier · screen · repro · evidence file · measured numbers for sizing · the commit tag.
- **Per-screen banks** → `screens/<NODE>_authed.md` (elements exercised/found, measured numbers, outcomes verified, positives worth keeping).
- **Screenshots** → `shots/promax-authed/` and `shots/17e-authed/`.
- **Created rows** → `SIMTEST_CLEANUP.md`, updated at creation *and* at deletion.
- **`HANDOFF.md`** → after every screen: done screens · current screen · sim device + appearance + **account state** · remaining · next action. A usage-limit death must cost at most one screen.
- Update the severity rollup at the bottom of `LEDGER.md` when you finish.

**ONE-WRITER LAW:** other sessions share this repo. Phase A made zero commits and zero tracked-file edits — **keep it that way.** All artifacts stay untracked under `design-reviews/sim-walk/2026-08-19/`.

---

## METHOD NOTES (hard-won last session — these save you an hour)

- **Settle 2.5s+ before censusing** after opening a sheet; the tree lags the animation and you will misread "didn't open."
- **Screenshot is the tie-breaker.** When the tree says a surface is absent, take a screenshot before concluding — see SW-23 (FlagDetail intermittently vanishes from the AX tree while visibly rendered).
- **`eltap` on an element below the viewport is a silent no-op.** Scroll it into view first.
- **The keyboard hides buttons** and some (e.g. a dialog's Save) never enter the tree at all — dismiss the keyboard or use the return key, and log it as a finding (SW-32).
- **Verify dialogs actually closed** after Cancel/OK; taps during settle get swallowed.
- Detect sheets by their **own** title/close element — the screen underneath stays in the tree and reads as "visible."
- **`timeout` does not exist on macOS.** Don't use it in probes; it silently fires your fallback branch and fakes a hang.
- **Don't pile up `simctl` calls** — one at a time, and never `killall CoreSimulatorService` (it shuts every sim down; recovery is `xcrun simctl boot <udid>`, ~25s).
- Long-press = `longpress x y 1.2` at coordinates; the element-level touchAndHold endpoint isn't in this WDA build.

---

## STOP CONDITION

Stop when the SKY-QUEUE list is walked and banked. Then write `00_CLOSEOUT_AUTHED.md` with:
- **coverage arithmetic** (nodes walked / total now reachable; elements exercised / found; every remaining gap explained)
- the **commit handshake** repeated
- the **`[SIMTEST]` cleanup proof** (rows created → rows deleted, or Sky's one-tap list with IDs)
- the honest **DEVICE-ONLY remainder** (real VoiceOver, camera, push delivery, real GPS, release-binary truth)
- an updated severity rollup covering guest + authed together

**Do not fix anything. Do not commit. Do not merge.** Report and stop.

---

## ⚑ WHAT SKY DOES (the only human steps)

1. **Pick the test account** — ideally a fresh throwaway, *not* the old reviewer login `AccessMap2026!`, which is sitting in git history at `9fd1cd9` and needs rotating before App Store review anyway.
2. **Type the login into the Simulator window** when the agent says it's parked on the sign-in screen.
3. Optional: say whether that account is an admin (decides whether AdminScreen is in scope).
4. Unrelated and still open: run the test-flag purge migration before submission.
