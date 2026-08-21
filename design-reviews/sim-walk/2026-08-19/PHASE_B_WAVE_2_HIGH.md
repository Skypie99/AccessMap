# RUN — PHASE B **WAVE 2 of 4**: THE HIGH FINDINGS

Paste this whole file into a fresh window. This is **fix work**. Model: Opus (Sky-initiated only).
**Prerequisite: Wave 1 (`PHASE_B_WAVE_1_BLOCKERS.md`) should be merged or at least committed first** — SW-46 changes the same file this wave touches (`FlagDetailModal.tsx`).
Full context: `PHASE_B_MASTER_PLAN.md` · findings: `LEDGER.md` **and** the per-screen banks in `screens/` (several findings live only there).

---

## RAILS (non-negotiable)
- **Never touch `main`.** Branch off the Wave 1 tip (or `bc91789` if Wave 1 isn't in yet). One commit per cluster. **Sky merges — nobody else.**
- **STEP 0 — you run this, before editing. Sky does nothing.** Pin the gate baseline: `npm run typecheck` · `npx jest --ci -w 3` · `npm run lint`. Known on `bc91789`: typecheck **0 errors**, lint **0 errors / 78 warnings** (pre-existing). **The jest baseline was never captured — record it now** so you can tell a pre-existing failure from one you caused.
- 🔴 **Never `prettier --write src`** — breaks 5 source-pinning guard tests (PROTECT-11 / §SKY-6).
- `com.accessmap.app`, slug/scheme `accessmap` are PROTECTED identifiers. Never "fix" them.
- **Rebuild → reinstall → re-walk the simulator** at the end. SW-42 in particular cannot be confirmed fixed from tests.

---

## ⚠ BEFORE YOU START — two of these are NOT yours to fix yet
- **SW-52 (privacy)** — do **not** edit until Sky has approved it. Const. hard prohibition #5: privacy-affecting changes get surfaced to Sky first. If she hasn't, skip it and say so in the report.
- **SW-23** — marked PLAUSIBLE. It needs **real VoiceOver on a device**; the AX tree is only a proxy. **Do not write a fix from simulator evidence.** Leave it, and say why.
- **SW-31** — half of it was already falsified (→ SW-48: "Try again" recovered cleanly, twice, under auth). **Re-verify the premise before fixing.** Its *other* half is real and worth doing: the fallback copy tells users to "switch to another tab and come back", which is false during a cross-tab crash.

---

## CLUSTER 1 — Safe-area / bottom inset: **SW-01 (High) + SW-02 (Low)** · one root cause
**SW-01:** the Apple 1.2 UGC consent line is invisible at rest. Measured: consent control rect **y948–993 on a 956pt screen** (Pro Max) — below the fold, ~8pt under the home indicator. Privacy Policy button ends **y929**, 7pt past the 922 safe-area boundary. **On the 17e (844pt) the consent line AND the Privacy button are entirely off-screen** (y933–978 / y869–914). The code's own intent says it "must be visible where the account is created" (`SignInScreen.tsx:339`).
**SW-02** is the same defect class elsewhere: onboarding cards 3+4 ("Not now" / "Maybe later", y884–928 = 6pt past 922) and the SignIn bottom links.
**Fix:** one bottom-inset treatment — anchor above the bottom safe-area inset rather than the raw screen edge, and get the consent line above the fold at rest on the **smallest** device, not just the largest.
**Verify:** census SignIn on **both** 440×956 and 390×844; the consent line must be visible without scrolling on both, and nothing may sit past the safe-area boundary.
**Why it matters:** store-review relevant — App Review walks this signed out, on a small device.

## CLUSTER 2 — Map focus: **SW-28 (High)**
FlagDetail's **"View on Map"** opens FullMap **without focusing the flag** — no animateTo, no callout, map stays at the user's location. The **Tasks-card-title path focuses perfectly** (evidence pair: `A6_map_focused2.png` vs `A6_map_cardtitle_focus.png`), so the param wiring differs between entry points.
**Fix:** make the FlagDetail path pass what the working path passes. The working path is the reference implementation — read it first.
**Verify:** from FlagDetail → View on Map, the map animates to the flag and opens its callout. A-2 confirmed the focus persists ≥10s once applied, so a correct fix should be stable, not transient.

## CLUSTER 3 — Location dead-end: **SW-37 (High) + SW-11 (Med)** · one root cause
Deny location → "Waiting for location…" forever, **Submit permanently disabled even when the form is fully filled**, and **no manual pin-placement fallback**. The core value flow is blocked for any privacy-conscious user.
**A-2 established this is NOT an auth problem:** signed in *with* location granted, the header reads real coordinates and Submit is enabled — the flow completes to the edge. Auth changes nothing.
**Fix:** add manual pin placement (or an equivalent "set location on the map" path) so a user who denies location can still file a report.
**Verify:** with location **denied**, fill the form and confirm Submit becomes enabled via the manual path, on both devices.

## CLUSTER 4 — Sheet geometry family: **SW-42 (High) + SW-45 (Med)** · decide once for the family
**Measured card heights** (screen 956 on Pro Max; the sheets' own cap is `maxHeight:'85%'` = 813pt):
| Node | Card h | % | KeyboardAvoidingView? | Content clipped? |
|---|---|---|---|---|
| C9 Achievements | 692 | 72.4% | **no** | no |
| C10 ActivityFeed | 692 | 72.4% | **no** | no |
| C11 MyReports | **500** | **52.3%** | **YES** | list viewport only 198pt → ~1.5 of 6 cards |
| C12 MyWatched | **352** | **36.8%** | **YES** | **empty-state instruction 100% invisible** |
The two healthy sheets have **no KAV**; the two broken ones both wrap the card in `<KeyboardAvoidingView behavior="padding">` with **no `keyboardVerticalOffset`**, inside a `<Modal transparent>` over a bottom tab bar — `MyReportsModal.tsx:288-289`, `MyWatchedModal.tsx:306-307`. `card` also sets `overflow:'hidden'` (`MyReportsModal.tsx:528`), so overflow is **clipped rather than scrolled**.
**★ The 17e narrows the cause:** C12's card is **354pt on the 17e vs 352pt on the Pro Max** — essentially **constant across a 112pt difference in screen height**. `maxHeight:'85%'` would have produced 717pt / 813pt. So this is a **fixed/collapsed height**, not a mis-evaluated percentage. Chase that.
**SW-45** is the same family from the other side: the Leaderboard sheet runs **flush to y956**, overlapping the tab bar, and paints list rows over a ghosted "Home / Tasks / Profile" including the red badge. C9–C12 all stop at y835 and never overlap. **The family is internally inconsistent** — decide once: do sheets clear the tab bar, or cover it? (**This is one of Sky's 6 decisions — ask before implementing.**)
**Verify:** re-measure all five sheets on **both** devices after the fix; C12's instruction line must be readable, and the answer to the tab-bar question must be the same for every sheet.

## CLUSTER 5 — **SW-52 (High, privacy)** · **GATED ON SKY'S APPROVAL**
A photo attached to a report you **cancel** is silently carried into your **next** report and published to the public map. Proven live: the points feed awarded "Earned 3 points: Added a photo" for a report whose photo picker was never opened, and the created flag rendered the abandoned image.
**Cause:** `reset()` clears photos/description/category/tags but **only runs after a successful submit** (`ReportFlagModal.tsx:225-236`, stated in its own comment). The modal is a persistent `visible`-prop component that never unmounts, so Cancel leaves every field populated.
**Fix (small):** call `reset()` on cancel/dismiss as well as on success, or clear `photoUris`/`photoAlts` in the `!visible` branch.
**Verify:** attach a photo → Cancel → reopen → the photo section must be empty. Then confirm a *successful* submit still resets, and that a **failed** submit does NOT (the code deliberately keeps drafts alive so the user can retry without re-picking — do not break that).

## CLUSTER 6 — **SW-31 (High)**, the half that survived
Fix the ErrorBoundary fallback copy: it tells users to "switch to another tab and come back", which is **false** during a cross-tab crash. Do **not** touch the recovery path without re-verifying SW-48 first.

---

## STOP CONDITION
Stop when the clusters above are committed (one commit each) and the gate is green. Write `qa-reports/` or a Wave-2 close-out noting: baseline vs final gate numbers, what you fixed, **what you deliberately did not fix and why** (SW-23, and SW-52 if unapproved), and the re-walk evidence.
**Do not merge.**
