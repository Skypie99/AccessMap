# RUN — PHASE B **WAVE 1**: THE TWO BLOCKERS (SW-46 + SW-47)

> **Scope note:** this brief covers Wave 1 ONLY — the two Blockers. There are **48 findings** in total. The full remediation plan, grouped by shared root cause into four waves, is **`PHASE_B_MASTER_PLAN.md`** beside this file. Do not treat these two as the whole job.

Paste this whole file into a fresh window. This is **fix work**, not a walk. Model: Opus (Sky-initiated only — see the Opus rule in `~/.claude/CLAUDE.md`).

**Provenance:** root causes below were verified end-to-end during the Phase A-2 authed sim walk (2026-08-20) against **sim-release @ main `bc91789`** — not inferred from reading code. Evidence paths are given per item. Full context: `00_CLOSEOUT_AUTHED.md`, findings in `LEDGER.md` § Session-5.

---

## RAILS (non-negotiable)
- **Never touch `main`.** Branch off `bc91789`. One commit per blocker. Sky merges — nobody else.
- **STEP 0 — YOU (the agent) run this first, before editing anything. Sky does nothing; there is no prerequisite for her.**
  Pin the gate baseline. Two of three were already measured on `bc91789` during the walk: **typecheck 0 errors · lint 0 errors / 78 warnings (pre-existing)**. The **jest baseline was NOT captured** — so run `npx jest --ci -w 3` and record the result BEFORE your first edit. Without it you cannot tell a pre-existing failure from one you caused.
- Gate law: `npm run typecheck` · `npx jest --ci -w 3` · `npm run lint`.
- 🔴 **Never run `prettier --write src`** — it breaks 5 source-pinning guard tests (PROTECT-11 / §SKY-6).
- `com.accessmap.app`, slug/scheme `accessmap` are PROTECTED identifiers. Never "fix" them.
- Mandatory after the code change: **REBUILD → reinstall → RE-WALK in the simulator.** Neither of these bugs is catchable by unit tests alone (see "why tests missed it" under SW-46).

---

## BLOCKER 1 — SW-46: the abuse-report path is unreachable for every user

### What happens
In FlagDetail, **History** and **Report** are visible and enabled, and tapping them does nothing. No error, no in-app feedback. `ReportContentModal` is the **Apple Guideline 1.2(b)** objectionable-content report sheet and it is mounted in exactly ONE place app-wide (`FlagDetailModal.tsx:1777` for flags, `:1935` for comments) — so a UGC app currently ships with its report mechanism 100% dead, for flags *and* comments. Guest and signed-in alike; auth is irrelevant.

### Root cause (verified)
The handlers fire correctly. iOS then refuses to present. Console, captured at the exact tap second, one line per dead tap:
```
[com.apple.UIKit:Presentation] Attempt to present <RCTModalHostViewController: 0x12f521900>
on <UIViewController: 0x1051b8c00> (from <RNSScreen: 0x127374000>)
which is already presenting <RCTModalHostViewController: 0x1273b5e00>.
```
`0x1273b5e00` is the already-presented FlagDetail Modal. The two sheets are mounted as **siblings AFTER `</Modal>`** (`FlagDetailModal.tsx:2161` and `:2174`), so they resolve to the **screen's** view controller, which FlagDetail already occupies.

### The fix
**Move `<StatusHistoryModal>` and `<ReportContentModal>` INSIDE the `</Modal>`, directly after `{legal.sheets}` (line 2159).** The outer fragment then becomes unnecessary.

### Why this fix and not another — you have already solved this exact bug twice
- `LegalSheets.tsx` documents **the identical UIKit error**, found 2026-08-19, and states the remedy: *"Mount the sheet INSIDE the surface that opens it. A presented view controller may itself present, so the sheet now presents from ITS OWN modal's VC rather than from the occupied root."* That shipped and works.
- `PhotoGallery` presents a real `<Modal>` lightbox over the already-presented `ReportFlagModal` — **verified working live during the walk** (`shots/promax-authed/C8_lightbox_attempt.png`).
- `FlagDetailModal` already renders `{legal.sheets}` INSIDE its Modal, **three lines above** the broken pair. The correct and incorrect patterns sit adjacent in one file.

### Also fix (or this returns)
Four comments assert the sibling pattern is sound. All four are false:
`FlagDetailModal.tsx:2169` · `MapScreen.tsx:2808` · `StatusHistoryModal.tsx:14` · `ReportContentModal.tsx:16`.
`MapScreen.tsx:2808` ("already proven here — StatusHistoryModal stacks over FlagDetailModal") has **already been used to justify another decision**. Correct them in the same commit.

### Why the existing tests missed it
`StatusHistoryModal.test.tsx` and `ReportContentModal.test.tsx` both exist and both pass. They test the components in isolation — the defect is in **where the parent mounts them**, which a child's unit test structurally cannot catch. **The regression test must render `FlagDetailModal` and assert the sheet actually presents.**

### Risk: low
The effects at `FlagDetailModal.tsx:2266-2274` already close both sheets when `!visible`, so nothing is stranded when the parent unmounts its children. `ReportContentModal` carries its own `useLegalSheets`, so there is no ordering conflict with `{legal.sheets}`.

### Verify (must do all three)
1. Rebuild sim-release → FlagDetail → **History** opens StatusHistoryModal; **Report** opens ReportContentModal; both close cleanly.
2. Console shows **no** "already presenting" line on either tap.
3. Report sheet's own Terms/Privacy links still open over it (the F4 legal-sheet case).

---

## BLOCKER 2 — SW-47: re-opening a flag from a second screen crashes it

### What happens
Open flag X's detail from Tasks → close → open flag X from the map callout (or My Reports) → the hosting screen dies into the ErrorBoundary. **Reproduced 4 times across 2 flags and 3 different second-parents** during the walk. Signed in or out — identical.
```
Error: cannot add `postgres_changes` callbacks for realtime:flag_comments:<uuid> after `subscribe()`.
'[ErrorBoundary] uncaught render error:'
```
Note the sharpened repro: **same-parent re-open does NOT crash** (tested twice, including a deliberate fast close→reopen race). It needs a **second FlagDetail host alive for the same flagId**.

### Root cause (verified chain)
1. `RealtimeClient.channel(topic)` **returns the EXISTING channel** when the topic matches — it does not create a new one (`node_modules/@supabase/realtime-js/dist/main/RealtimeClient.js:343-353`).
2. `useComments.ts:101` names the topic `flag_comments:${flagId}` — **flagId alone**, so every host for one flag collides on one channel object.
3. `FlagDetailModal.tsx:246-254` syncs `shownFlag` **only when `flag` is truthy**. Closing sets `flag = null`, so `shownFlag` is never cleared — Tasks' modal keeps `shownFlag = X` and **stays subscribed indefinitely**, invisible.
4. Opening X from a second screen runs a second `useComments(X)` → same channel → `.on()` on an already-subscribed channel → throw → uncaught in render → ErrorBoundary.

`useComments`' effect has **no auth condition** (deps `[flagId, tableNotReady, fetch]`, `useComments.ts:129`) — which is exactly why signing in changed nothing.

### The fix — three small changes, together
1. **Only subscribe while visible.** Pass `visible` into `useComments` and bail when false. This is the real correctness fix: an invisible modal holding a live realtime subscription is the actual defect, and it also stops three screens holding subscriptions for flags nobody is looking at.
2. **Make the topic unique per hook instance** — append `useId()` to the topic. Makes the collision structurally impossible even if two visible hosts ever coexist, and closes a teardown race: `removeChannel` is **async**, so a fast close→reopen can still find the old channel registered. (That race was NOT reproducible in the walk, but it is live in the code.)
3. **Wrap the subscribe in try/catch.** Argue for this one hardest: comments-realtime is a *nicety*, and today its failure destroys the whole screen and every tab that mounts that flag. Even with 1 and 2 correct, any future regression should degrade to "no live updates", not to a Blocker.

### Do NOT fix it this way
Clearing `shownFlag` on close is a one-line fix and is **wrong** — that retention is deliberate, and it is what stops the sheet blanking during its exit animation.

### Verify
1. Tasks → flag X details → close → map callout → flag X details → **no crash**, comments render.
2. Repeat via My Reports as the second parent (the walk's third repro path).
3. Post a comment and confirm live insert still updates the list (realtime not broken by the topic change).
4. Confirm no channel leak: closing the sheet should remove its channel.

---

## RELATED, NOT IN SCOPE HERE (do not scope-creep)
- **SW-48** — "Try again" DID recover cleanly under auth, twice, contrary to SW-31's banked claim. **Re-verify SW-31's premise before writing any fix for it.**
- **SW-52 (High, privacy)** — a photo attached to a CANCELLED report is silently published with your NEXT report (`reset()` only runs after a successful submit). Privacy-touching → **surface to Sky before touching** (Const. hard prohibition #5). Separate commit, separate decision.
- **SW-42** — the KAV-wrapped profile sheets render undersized and clip their own content. Next in the recommended order after these two.

## ID BOOKKEEPING — these two Phase A IDs are closed BY this wave, not separately
- **SW-30 ≡ SW-47.** Same defect. SW-30 is the Phase A (guest) ID; SW-47 is the Phase A-2 re-test that confirmed it identical under auth and sharpened the repro. Fixing SW-47 closes SW-30 — **do not hunt for a second bug.**
- **SW-26 is SUPERSEDED by SW-46.** SW-26 recorded "History + Report buttons silently dead" and framed it as guest-only. That framing was wrong: A-2 proved it affects every user and identified the real mechanism. **Fix SW-46; mark SW-26 closed-as-superseded, not fixed-separately.**

## RECOMMENDED ORDER
**SW-46 first** — it is the App Store blocker, it is roughly a 20-line move, and the pattern is already proven twice in this repo. Then SW-47.

**STOP after the two commits. Do not merge.**
