# DEVICE GATE — Prompt 08

Flagstone art-direction build series · opened 2026-08-22 · **results not yet banked**

This file is the ledger for Prompt 08. An agent opened it and filled in
**everything checkable from the repo** (§0–§2). Every numbered row in §3 onward
is **empty on purpose** — those are phone answers, and no agent can see the
phone. Read your notes back to an agent and it fills the Verdict column, or
write in it yourself.

Legend for Verdict: `PASS` · `FAIL` · `N/A` · `SKIPPED` · or free text.

---

## 0. THE BUILD — the SHA question, answered

The prompt says: *"Note the build number. Ask the agent to confirm the branch SHA
that went into it."* Confirmed against the repo, not from a doc:

| | |
|---|---|
| Branch | `main` |
| **SHA that would go into the build** | **`a1a94f6`** |
| Source identical to | `b1020d1` (the phase-07 merge tip) — `a1a94f6` adds **only** `build/MERGE_LOG.md`, **0 files under `src/`** |
| Working tree | **clean** — zero modified tracked files. What builds is what is committed. |
| Contains | Prompts 00 · 01 · 02 · 03 · 04 · 05 · 05b · 06 · 07 (all merged) |
| Gate on this tree | typecheck 0 errors · jest **241 suites / 3600 passed / 32 todo / 0 failed** · lint 0 errors / 82 warnings |
| App name | Flagstone · version `3.0.0` · bundle `com.accessmap.app` |
| Build number | **assigned by EAS** — `appVersionSource: "remote"` + `autoIncrement`, so `app.json`'s `15` is not what ships. Read it off the EAS build page and write it below. |

**Build number actually issued:** `________`  ·  **Build date:** `________`

### The command

The `testflight` profile — store distribution, Release config. *(`preview` is an
internal link, not TestFlight.)* **This is a paid build; fire it yourself.**

```bash
cd ~/AccessMap && npx eas build --platform ios --profile testflight
```

---

## 0b. ⚠ CORRECTION — `main` is PUSHED. The undo advice on file is stale.

`MERGE_LOG.md` says *"Nothing has been pushed; `origin/main` is untouched"* and
offers `git reset --hard`. **That is no longer true.** Verified against the real
remote, not the local tracking ref:

```
git ls-remote origin main  →  a1a94f6...  refs/heads/main
git reflog show origin/main  →  a1a94f6 @{0}: update by push
                                e8e7610 @{1}: update by push
```

`main` and `origin/main` are **the same commit, 0 ahead / 0 behind**. All 43
commits past `e8e7610` are on the remote.

**What this changes for you:** the plan's premise — *"the material and title
calls can be reversed cheaply because nothing is pushed"* — is gone. Reversing a
phone verdict is now a **revert commit**, not a `reset --hard`. Still cheap, still
one commit, but it lands as history rather than disappearing. Don't run the
`reset --hard` lines in `MERGE_LOG.md` against `main` — they would need a
force-push over a pushed branch.

The phase branches are still intact if you want to compare:
`design/gsp-06-forms-2026-08-22`, `design/gsp-07-modals-2026-08-22`.

---

## 1. THE MATERIAL A/B — how to flip it (prompt items 1–2)

Current value in `src/theme.ts:85`: **`'dense'`** — the shipped default.

```ts
export const BULK_FLOOR_CANDIDATE = 'dense' as BulkFloorCandidate;
```

Three arms. One word is the whole edit; `GlassSurface.tsx` is untouched either way.

| Arm | What it does | Ghost | What it costs |
|---|---|---|---|
| **`dense`** *(shipped)* | raises the floor / engineered stops until nothing shows through | 1.035:1 | the bulk tier is nearly opaque — "liquid glass" reads as paper |
| **`blur40`** | drops `forceEngineered` on FlagDetail, blurs at 40 | 1.019:1 — dissolves letterforms rather than hiding them | the sheet is no longer white; it tints with whatever is beneath. Real GPU cost on a full-height sheet — **this is the arm to watch on the old phone in item 3** |
| **`shipped`** | control arm, byte-identical to pre-A/B `main` | 1.279:1 light / 1.206:1 dark | the ghosting D2 called the worst legibility moment in the app |

To build the other arm:

```bash
sed -i '' "s/'dense' as BulkFloorCandidate/'blur40' as BulkFloorCandidate/" ~/AccessMap/src/theme.ts
```

Both arms were **built and captured**, not just written — `build/02/after/_candidate_blur40_light_m.png` is the blur40 sheet on the 17e. Screenshot comparison is in `build/02/BUILD_REPORT.md` §5.

Whichever wins, **the loser is deleted in a cleanup commit** (the C-lite precedent).

> ⚠ One TestFlight build carries **one** arm. Flipping means a second paid build,
> or a local sim/dev build for the A/B and TestFlight for the winner only.

**DECISION D-1 — the material:** `________________`  (dense · blur40 · leave as shipped)

**Item 2 — same sheet in dark mode** (sim ghosting was worse there): `________________`

---

## 2. WHAT IS ALREADY BANKED, SO YOU DON'T RE-WALK IT

Verified in the simulator across phases 00–07 and **not** needing your phone:
Legend measured and fixed · About at AXL light+dark, no clipping · loading-state
announcements wired (proven by test) · pull-to-dismiss correctness chain
(`useAtTop` + `sheetPull.guard` + `SheetPull.test.tsx`).

What tests **cannot** reach is in §3 and §7 below.

---

## 3. THE WALK — 25 rows, yours to fill

### Performance — the release gate (oldest supported phone)

| # | Check | Verdict | Notes |
|---|---|---|---|
| 3 | Fast-scroll Tasks with 10+ cards; FlagDetail over it; pan map with crystal bar; open Legend. Any hitch → name the screen. | | |
| 4 | Map without POIs / with filter: does Kelowna feel too bare? Are transit stops + parks enough to orient by? | | |

### Large type — Larger Accessibility Sizes, 2nd-largest and largest

| # | Screen | Check | Verdict | Notes |
|---|---|---|---|---|
| 5 | SignIn | form + "Browse without an account" visible without scrolling (P01) | | |
| 6 | Onboarding | reinstall to see it. No words broken mid-word; discs are the hero; Next reachable (P05) | | |
| 7 | Home | title above subtitle; discs above text; nothing under the Report button (P01/04) | | |
| 8 | Legend | "Minor" above "Inconvenient but usable" (P01) | | |
| 9 | Nearby list | full descriptions, not clipped (P00) | | |
| 10 | Map bar | no `Ex…` (P00) | | |
| 11 | Report form | severity **list**, not five tiny circles; Submit disabled until you pick (P06) | | |
| 12 | FlagDetail | verbs stacked and reachable at the bottom (P02) | | |

### VoiceOver — on, swipe right through each screen

| # | Screen | Expected | Verdict | Notes |
|---|---|---|---|---|
| 13 | FlagDetail | title → census → meaning → description → meta → primary verb → the pair → More → comments → "Report it" **as a button** | | |
| 14 | Map | bar reads label "Explore" even when the word is hidden; Legend button; List pill; Nearby opens automatically; picking a flag opens detail **over** the list (SW-46). **If the detail does not appear, say so — this is the known unverified path.** | | |
| 15 | Onboarding | each card announced **once** | | |
| 16 | Home | rows read the composite sentence once — no double "severity" | | |

### Reduce Motion / Reduce Transparency / Increase Contrast

| # | Setting | Expected | Verdict | Notes |
|---|---|---|---|---|
| 17 | Reduce Motion | sheets appear without sliding; pull-to-dismiss snaps; nothing animates on the map | | |
| 18 | Reduce Transparency | every sheet goes solid **and still looks like the same app** | | |
| 19 | Increase Contrast / Differentiate Without Colour | discs still carry numbers; pins still separate from tiles | | |

### Touch

| # | Check | Verdict | Notes |
|---|---|---|---|
| 20 | Pin out of a tight cluster (44pt wrapper) · guest "Sign in" link on the report form · unwatch a flag | | |

### Real data

| # | Check | Verdict | Notes |
|---|---|---|---|
| 21 | Far from Kelowna, location on: honest empty peek + "No reports here yet. You could add the first." | | |
| 22 | A flag **with photos** in the new detail sheet — the strip, and the alt texts under VoiceOver. ⚠ **No such flag exists in production** (0 visible flags have a photo). **File one yourself early in the walk** — it clears this row AND unblocks store shot 24.5. | | |
| 23 | A **non-admin** account (the 2026-08-20 walk was admin): Profile · Tasks actions · drawer without Admin | | |

### The store shots

Shotlist: `design-reviews/store-dossier/2026-08-05/dossier/03_screenshot-shotlist.md`
Capture at **1320×2868** (6.9″ phone or Pro Max sim).

> **⚠ MUST-1 has moved — read `STORE_DATA_READINESS.md` in this folder before capturing.**
> Checked against live production 2026-08-22:
> · **The seeding half is already done** — `2026-08-18_seed_reviewer_flags.sql` was applied; 12 honest Kelowna barriers are live. Don't re-seed.
> · **Only ONE junk row is visible by default** (`29718d8c`, "Very steep sidewalk"). The other 19 are invisible under `DEFAULT_STATUSES = ['open','verified']`.
> · **The row that matters for review is `af36e3bf` — "BUMBAKLOT"** — profanity, one filter tap away. Takedown file: `supabase/migrations/2026-08-22_takedown_junk_flags.sql` (preview → backup → guarded delete, exact rollback). **File only — you run it.**
> · **Shot 24.5 is BLOCKED**: zero visible flags have a photo. File one real photo report early in the walk (item 22) and it unblocks.
> · Every detail shot will show an **empty comment thread** — the only 2 comments in the database sit on rows the takedown removes.

| # | Shot | Captured | File |
|---|---|---|---|
| 24.1 | map + callout (light) | | |
| 24.2 | Legend (light) | | |
| 24.3 | Home | | |
| 24.4 | report form, filled | | |
| 24.5 | detail with photo — **needs item 22 done first** | | |
| 24.6 | Tasks | | |
| 24.7 | Legend in **dark** (your pick) | | |
| 24.8 | onboarding card 2 *(optional — never first)* | | |

### Ratify the words

| # | Check | Status |
|---|---|---|
| 25 | `build/COPY_LEDGER.md` §OUTSTANDING AT A GLANCE — **34 strings pending** | ☐ not started |

**Where it stands:** 11 visible strings from Prompts 01/02/04 (`W-02` … `W-15`)
plus Phase 3's 22 a11y strings (`A-01`…`A-22`) and `W-37`. Prompt 05b (8) and
Prompt 06 (21) are **already ratified**.

> ⚠ Two things to know before you sit down with it:
> 1. **`W-05`–`W-09` each appear TWICE** in the ledger — once in Prompt 02's
>    FlagDetail block, once in Prompt 05's onboarding block. Say which block you mean.
> 2. **The rule has already been bent.** Step 25 says nothing merges with an
>    unratified ledger — but all 34 are on `main` **and now on `origin/main`**
>    (see §0b). That was deliberate and logged. Ratifying is still owed; it is
>    now a follow-up rather than a gate.

---

## 4. NOT IN THE 25 — carried from phase 07, don't let these fall off

Prompt 08 was written before phase 07 closed. These are its explicit
**NEEDS-DEVICE** items and none of them appear above:

| # | Item | Why only a phone can answer |
|---|---|---|
| E-1 | **Leaderboard title at AXL** with a long list | Profile-gated, so never seen. It is the **only** sheet where the drop is **28pt → 18pt** (the rest are 20→18). If one title reads wrong, it is this one. Revert = one line in `Sheet.tsx` (`SheetHeader` `size={font.size.xl}`) — but that moves **all twelve**. | 
| E-2 | Achievements · ActivityFeed · MyReports · MyWatched · NotificationPrefs half-sheets | all Profile-gated, never walked |
| E-3 | C10's filter-rail wrap at AXL | ActivityFeed is Profile-gated |
| E-4 | The five outcome announcements (push on/off, export, unblock, stop-watching) | need a signed-in account |
| E-5 | **VoiceOver announcement timing** — do loading and completion announcements tread on each other? | Jest proves the wiring, never the utterance |
| E-6 | Pull-to-dismiss **threshold and spring** across the other 11 sheets | correctness is test-covered; *feel* is not judgeable by a test |

Verdicts: `E-1 ______` `E-2 ______` `E-3 ______` `E-4 ______` `E-5 ______` `E-6 ______`

---

## 5. AFTER THE WALK

1. Fill this file (or read your notes to an agent and let it fill it).
2. **D-1 material** → cleanup commit deleting the losing arm from `theme.ts`.
3. Anything FAIL → a revert or a fix commit **on a branch**, not on `main`.
4. Ratify or rewrite the 34 strings.
5. Then, and only then, the store forms.

**Nothing in this file has been filled in by an agent. Every blank is a real blank.**
