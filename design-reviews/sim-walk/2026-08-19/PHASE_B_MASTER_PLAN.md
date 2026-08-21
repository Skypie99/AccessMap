# PHASE B — MASTER REMEDIATION PLAN (all 48 findings)

**Source:** the Flagstone simulator walk, Phase A (guest, 2026-08-19) + Phase A-2 (authed, 2026-08-20), both against **sim-release @ main `bc91789`**.
**Read BOTH:** `LEDGER.md` **and** the per-screen banks in `screens/` — SW-08/09/10/11/12/13/14/16/17/19/20/21/25 have their detail **only** in the screen banks, not as ledger rows.
**Numbering:** 48 distinct IDs. Gaps SW-04/05/15/18/24 were never assigned. SW-26 is superseded by SW-46; SW-30 ≡ SW-47.

## HOW TO USE THIS
Waves are ordered by risk, and **grouped by shared root cause** — most of these are not 48 separate edits. The micro-hit-target cluster alone is nine IDs and roughly one sweep. Fire one wave per window; commit per cluster, not per finding.

## RAILS (every wave)
- **Never touch `main`.** Branch off `bc91789`. Sky merges — nobody else.
- **STEP 0 each window:** pin the gate baseline before editing. Known on `bc91789`: **typecheck 0 errors · lint 0 errors / 78 warnings (pre-existing)**. **Jest baseline NOT captured — run `npx jest --ci -w 3` first.**
- Gate: `npm run typecheck` · `npx jest --ci -w 3` · `npm run lint`.
- 🔴 **Never `prettier --write src`** — breaks 5 source-pinning guard tests (PROTECT-11 / §SKY-6).
- `com.accessmap.app`, slug/scheme `accessmap` are PROTECTED. Never "fix".
- **Rebuild → reinstall → re-walk** after each wave. Several of these (SW-46, SW-42, SW-49) are structurally invisible to unit tests.

---

# WAVE 1 — BLOCKERS · **brief already written: `PHASE_B_WAVE_1_BLOCKERS.md`**
| ID | What |
|---|---|
| **SW-46** | Abuse-report + status-history sheets unreachable app-wide (Apple 1.2(b)). Fix = move both inside `</Modal>`; pattern already proven twice in-repo. Also correct 4 false code comments. |
| **SW-47** (≡ SW-30) | Realtime re-subscribe crash, cross-parent. Fix = subscribe only while visible + per-instance channel topic + try/catch so realtime can never take down the screen. |
**Do these first.** SW-46 is the store-review blocker.

---

# WAVE 2 — HIGH (5 actionable; 2 need something before they can be fixed)
| ID | Cluster | Note |
|---|---|---|
| **SW-01** | **Safe-area / bottom inset** (with SW-02) | Apple 1.2 UGC consent line is below the fold at rest — **fully off-screen on the 17e**. Store-review relevant. Fix with SW-02: one bottom-inset root cause. |
| **SW-28** | Map focus | "View on Map" from FlagDetail doesn't focus the flag; the Tasks-card path does. Param wiring differs between entry points — the working path is the reference. |
| **SW-37 + SW-11** | **Location dead-end** | Same root: deny location → no manual-pin fallback → Submit permanently disabled. **Auth-independent** (confirmed in A-2). Fix both together: add manual pin placement. |
| **SW-42 + SW-45** | **Sheet geometry family** | The two KAV-wrapped profile sheets render at 36.8% / 52.3% and clip their own content (C12's instruction line is 100% invisible). **17e evidence narrows it:** card height is ~constant (352pt vs 354pt) across a 112pt screen difference → fixed/collapsed height, NOT a bad percentage. SW-45 is the same family from the other side (leaderboard overlaps the tab bar). **Decide the whole family once:** do sheets clear the tab bar or cover it? |
| **SW-52** | **Privacy — NEEDS SKY FIRST** | Photo from a CANCELLED report is published with your NEXT report. `reset()` only runs after a successful submit. Const. hard prohibition #5 → surface to Sky before editing. Fix is small (reset on cancel/dismiss); the *decision* is hers. |
| SW-23 | **VERIFY FIRST — do not fix blind** | FlagDetail intermittently absent from the AX tree. Marked PLAUSIBLE; the AX tree is a proxy. **Needs real VoiceOver on device** before anyone writes a fix. |
| SW-31 | **RE-VERIFY PREMISE FIRST** | Its "Try again re-crashes" half **did not hold** under auth (→ SW-48). Its other half — fallback copy saying "switch to another tab and come back", which is false during a cross-tab crash — **still stands and is worth fixing**. |

---

# WAVE 3 — MED (20), grouped
### Cluster A — micro hit targets (**9 IDs, ~one sweep**)
`SW-09` clear-search 16×17 · `SW-10` search bar ~34pt (AX frame 358×20) · `SW-12` Report FAB 105×42 (primary CTA, 2pt under) · `SW-22`+`SW-43` list-row **titles 21–29pt across Tasks / MyReports / ActivityFeed — one shared row component, one fix** · `SW-25` copy-coords 21×24 · `SW-33` collapse-filter 90×32 · `SW-35` heat-map controls 24–25 · `SW-40` tier chip 87×33 (83×32 on 17e) + display-name field 286×39 · `SW-50` remove-photo 28×29 (overlaps its own thumbnail, so a miss opens the lightbox).
> Measured numbers for every one are in the censuses. **`SW-29`** (map markers 38×40) is in this family but was judged *acceptable* — map-marker convention. Decide explicitly; don't fix by reflex.

### Cluster B — tab-bar a11y count
`SW-13` + `SW-38`: hidden routes inflate "tab N of 5"/"of 6" on a **3-tab** bar, and the count **leaks admin status**. One fix.

### Cluster C — Profile data semantics
`SW-39`: headline tiles mix a **lifetime total** (`reported`) with **current-status snapshots** (`verified`/`resolved`), and omit rejected — so 6 / 0 / 3 doesn't reconcile and "0 VERIFIED" sits under an activity feed saying "Your report was verified" twice. **Confirmed live in A-2:** the tile went 1 → 0 the moment the flag moved verified → resolved. Decide: relabel as current-status + add Rejected, or make them lifetime. **Do not change the trigger.**

### Cluster D — Leaderboard
`SW-44` every anonymized contributor gets a **"ME"** monogram (from `'Member'.slice(0,2)`), so the one badge reading "me" is on other people. `SW-45` see Wave 2.

### Cluster E — silently inert controls
`SW-49`: the push toggle ignored two consecutive taps right after mount, with **no** handler error and **no** alert; a control switch proved the driver was fine. **A-2 saw this pattern three times** (push switch, severity buttons, Verify). `runStatusChange` opens with `if (busy) return` and `handlePushToggle` with `if (!user || pushBusy) return` — silent early-returns while the control still renders as enabled. Worth treating as one class: **an enabled-looking control must never no-op silently.**

### Cluster F — remaining singles
`SW-08` Home card says "No reports here yet" while showing a SF-default map against Kelowna data · `SW-20` guest push switch disabled with no dimming/explainer (auth resolves the gating; the guest presentation bug stands) · ~~`SW-32` filter-preset **Save** absent from the AX tree *and* under the keyboard~~ — **CORRECTED 2026-08-20: neither half held on re-walk. Present at 149×45, clear of the keyboard, correctly `enabled=0` on an empty draft. No fix written; see the ledger's correction row** · `SW-53` **CLAUDE.md under-documents the points economy** (+5 report / +3 photo / +1 comment are undocumented; measured 90 → 124) — load-bearing because CLAUDE.md warns the Tasks flash strings must track the trigger · `SW-48` **not a fix** — a correction to SW-31; re-verify before acting.

---

# WAVE 4 — LOW (15), grouped
- **Safe-area:** `SW-02` bottom-anchored controls intrude the 34pt home-indicator inset (**pair with SW-01**).
- **Copy / label-vs-behaviour:** `SW-06` "Open the map" label vs rendered capitalization (WCAG 2.5.3) · `SW-17` replay finisher says "Open the map", returns to Settings · `SW-21` banner-prefs row subtitle vs its sheet's purpose line · `SW-34` reporter attribution drifts between "Another community member" and "Anonymous".
- **Dynamic Type:** `SW-36` + `SW-51` mid-word wrapping at accessibility-extra-large on Tasks **and** the Profile breakdowns — one shared text treatment.
- **Onboarding:** `SW-19` two divergent onboarding surfaces (5-card first-launch vs 3-step replay) and the row subtitle matches only the replay.
- **Misc:** `SW-27` "3351 min walk" absurd at 270km · `SW-41` two stacked progress bars render as duplicates at Bronze (thresholds coincide at 100 — verify they can ever diverge before collapsing them) · `SW-29` see Cluster A.
- **VERIFY ON DEVICE FIRST, don't fix blind:** `SW-03` duplicated scroll-bar a11y nodes on the pager · `SW-16` replay-intro copy exposed only as 1×1pt StaticText.

---

# DECISIONS FOR SKY (not engineering calls)
1. **SW-52** — privacy. Approve before anyone edits.
2. **SW-42 / SW-45** — do sheets clear the tab bar or cover it? One answer for the family.
3. **SW-39** — current-status tiles (+ Rejected) or lifetime counts?
4. **SW-29** — accept 38×40 map markers as convention, or raise to 44?
5. **SW-07** (no forgot-password) and **SW-14** (sparse guest profile) — product choices, logged as OBS, not defects.
6. **SW-19** — keep two onboarding surfaces or converge them?

# NOT PHASE B — device-only, and no fix should be written without it
Real VoiceOver (**SW-23**, SW-03, SW-16) · camera capture + real EXIF · push **delivery** and the OS notification dialog (needs a fresh install — `simctl privacy` has no `notifications` service) · real GPS · release-binary performance · force-rotate · **a normal non-admin signed-in user's view** (A-2 ran on an admin account).

# SUGGESTED SEQUENCING
**W1 (blockers) → SW-52 decision → W2 → W3 Cluster A+B (cheap, high polish-per-edit) → W3 rest → W4.**
Re-walk the simulator after W1 and after W2; the sheet-geometry and inert-control findings cannot be confirmed fixed from tests alone.
