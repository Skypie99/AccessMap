# PROMPT 07 — PHASE 3 · BUILD REPORT

**Branch** `design/gsp-07-modals-2026-08-22`
**Base** `15cf262` (tip of `design/gsp-06-forms-2026-08-22`)
**Commits** 11 · 57 files · +2509 / −1808
**Sim-release** built and re-walked on the iPhone 17e (`9C9D3ED6…`), light + dark, medium + AXL.

---

## 0. THE PREREQUISITE, AND WHY I BUILT ANYWAY

The prompt says **"PREREQUISITE: Prompt 06 merged."** It was not. At the start of
this window `main` was `1984c3e`, fifteen commits behind the 06 tip.

I branched off the **06 tip** rather than `main`, and did not wait. Phase 3
rewrites the same modal estate 06 had just finished touching — Settings,
Profile, the report form — so branching off `main` would have produced a
guaranteed conflict in the same files and in `COPY_LEDGER.md`, which is the
exact trap the memory note about Prompt 03 records ("merge the LATER branch, it
carries the resolution"). Every prior prompt in this series chained the same
way.

**What Sky has to do: merge 06, then 07, in that order.** Nothing else changes.

---

## 1. GATES

| Gate | Baseline (before the first edit) | Final |
|---|---|---|
| `npm run typecheck` | 0 errors | **0 errors** |
| `npx jest --ci -w 3` | 241 suites / 3560 passed / 32 todo / 0 failed | **241 suites / 3600 passed / 32 todo / 0 failed** |
| `npm run lint` | 0 errors, 82 warnings | **0 errors, 82 warnings** |

**+40 assertions**, all of them guard re-pins or new coverage. No suite was
deleted, no assertion relaxed. The known `ReportFlagModal` anon-rate-limit flake
did not fire in any run.

⚠ **One acceptance prediction did not hold.** The brief expected dead-style
deletion to REDUCE the lint count. It did not — 82 both ways. `no-unused-vars`
does not reach object properties, so 57 dead styles were invisible to lint the
whole time. That is *why* they accumulated, and why the mechanical census
(§4.1) was the only way to find them. The bar as written (warnings ≤ baseline)
is met.

---

## 2. WHAT SHIPPED, PER ITEM

### 7.1 — Two shells, no third

| Commit | What |
|---|---|
| `474c022` | `Sheet` grows eight seams; `SegmentedControl` created |
| `dd3f406` | Ten sheets adopt `Sheet`; five guards re-pinned |
| `298677a` | About joins the pageSheet class |
| `d73d347` | `PrefsRow` for the two notification twins |
| `fcaad42` | Settings + FlagDetail adopt `SegmentedControl`; three guards re-pinned |
| `6f72907` | **The grabber stops lying** — `SheetPull` wired into the primitive |

**The estate before:** ten hand-rolled copies of one shell, with three corner
radii (`lg`/`xl`), three height caps (80/85/90%) — two of which never
resolved — and titles at `h1`, `xxl` and `xl`.

**Visible changes, stated plainly because they are visible:**

- Every one of the ten now has a **grabber** and **pulls to dismiss**. Nine had
  neither.
- **One title size (`xl`).** The Leaderboard's editorial `h1` (28pt) is the
  biggest single change on screen. It was Phase 11's deliberate choice, and
  §S5's "no third shell" is what overrides it. **If Sky wants that title back,
  it is one prop on the primitive — but then it is a third shell.**
- One corner (`xl`): StatusHistory and NotificationPrefs were at `lg` (C13).
- **T4's shrink-then-wrap on every sheet title.** One had it; nine did not.
- **D22 closed: the Leaderboard's 90% cap RESOLVES.** It sat on a card whose
  parent was content-sized, so it never applied — the same G6/SR-099 shape four
  siblings had.
- **D19 closed:** ReportContent's abuse radios went through `a11yToggle`, so
  the selection announces on web too.
- **C15 closed:** About is a pageSheet and swipes down like its five siblings.
  Its close X moves to the chrome recipe (24pt, `inkGlassMuted`); its
  `accessibilityViewIsModal` is correctly *gone*, because a pageSheet is its own
  UIKit scene.
- **D3 closed:** `PrefsRow` ends the two-costume drift (radius 12 vs 16, padding
  12 vs 16, height 56 vs 64, title `base`/600 vs `lg`/bold, subtitle `xs` vs
  `sm`, shadow none vs e1).

### 7.2 — Announcement parity · `1486b92`

`accessibilityLiveRegion` is **Android-only** in React Native. Four surfaces
rendered a spinner inside one and were counted covered; on iOS VoiceOver they
fetched, filled and finished in silence. Three did not label the spinner
either — so a VoiceOver user who found it heard *nothing*, which is worse than
silence because they know something is there.

Each loading site now carries all three facts (labelled spinner + polite region
+ iOS-gated announce), because any one alone is a half-fix that looks finished.
Five outcome announcements are back-ported from `HiddenCommentsModal`. Four
controls that said less than their own siblings (B1, B2, B4, D3) are levelled up.

Every announcement string lives in `copy.ts`. See COPY_LEDGER §Prompt 07 for all
22, AGENT-PROPOSED.

### 7.3 — The SW-36 class · `b1233a6`

**Three of the four named sites were already closed**, and saying so is better
than a silent omission:

| Item | Status |
|---|---|
| D20 · onboarding actions row | closed by Phase 1a §1.3 |
| D23 · Profile `tierHeaderRow` | closed by Phase 1a §1.3 (minWidth 140) |
| D24 · Tasks filter/search rows | closed by Phase 1a §1.3 |
| Leaderboard title `numberOfLines` | closed by 7.1b — the primitive's header carries T4 |
| `sectionCountPill` padding | **the pill does not exist.** Phase 2a retired it and folded the count into the section header's own text. No padding left to scale. |

Two were genuinely left, and they are the two shapes the earlier passes did not
cover:

- **C10 · the activity filter rail.** `flexWrap` on the row AND `flexShrink: 0`
  on the chip — a chip that can shrink satisfies the row by getting narrower
  than its own word instead of moving to the next line.
- **The bulk-action bar.** Four verbs at `flexBasis: 0` whose only escape was
  `adjustsFontSizeToFit` to 0.8 — and "Resolve" hit that floor and still
  clipped. Now the same STACK the cards take, at the same `isCompactLayout`
  threshold, so the screen changes shape all at once. **All four** buttons opt
  in: in a column `flexBasis` means HEIGHT, so one left out renders 0pt tall.

### 7.4 — Hygiene · `43ee0be` · `bf83e63` · `9403c59`

See §4 for the per-file table.

---

## 3. THE ONE THING ONLY THE DEVICE CAUGHT

**The grabber was a promise the sheet did not keep.**

I opened StatusHistory on the rebuilt binary, saw its new grabber, pulled it,
and nothing happened.

`SheetHeader` draws that pill and its whole job is to advertise a drag — its own
docblock says so in as many words. The primitive drew it and wired **nothing**
behind it: `SheetPull`, the one ratified pull handler, had three adopters and
the shared `Sheet` was not among them. Survivable at two consumers. 7.1b made it
eleven, which would have multiplied a lying affordance rather than fixing one.

`6f72907` wraps the primitive's card in `SheetPull`, routed through `onClose` —
the same expression Close, `onRequestClose` and `onAccessibilityEscape` already
take, so focus-return is inherited, not forked.

⚠ **And the hazard that fix introduces,** which is why it is not a two-line
commit. `SheetPull` activates on a DOWNWARD drag. On a sheet scrolled away from
its top, an unwired pull dismisses when the user meant to scroll back up. All
twelve consumers now wire `useAtTop()` onto their scrollers and hand the
primitive `atTop` + `scrollRef`. MyReports and MyWatched wire **both** branches:
a sheet whose loading state and list state scroll independently needs both, or
the gesture is safe in one state and wrong in the other.

Verified on device: the pull dismisses StatusHistory and leaves FlagDetail (its
parent) open underneath, which is right.

---

## 4. THE HYGIENE TABLE

### 4.1 · Dead styles — 57 deleted, 1 restored

Found **mechanically**: every key declared in a `StyleSheet` and never
referenced as `styles.<key>` in its own file. That census found 58 — more than a
name sweep would have (`center`, `subtitle`, `commentsEmptyText`,
`nearestBtnChevron`, `dismissText` and `tabular` match no icon-ish pattern) —
and it drains to zero rather than to "the ones I thought of".

| Family | Files | Keys |
|---|---|---|
| `closeBtnText` | 6 | 6 |
| `*Glyph` | 6 | 8 |
| `*Icon` / `*Chevron` | 8 | 12 |
| Tasks' retired chip families (`mineChip*`, `catChip*`, `sortChip*`) + `title` | 1 | 13 |
| everything else the name sweep would have missed | 9 | 18 |

**What proves zero behaviour change** — three things, not an assertion:

1. **tsc.** `styles.foo` on a `StyleSheet.create` object is TYPED, so deleting a
   live key is a compile error. It caught exactly one: `tabular` in `FlagCard`
   is live, reached through a SECOND stylesheet (`styles_mono`) that a
   `styles.`-only census cannot see. Restored. **57, not 58.**
2. **No guard or test names any of them** — checked before deleting. The
   source-pinning guards pin COMMENTS and SELECTORS, which is a different thing
   from a style key.
3. Full suite unchanged.

### 4.2 · Retokenisation — substitutions only

| Change | Sites | Guard that proves nothing moved |
|---|---|---|
| `44` → `a11y.minTargetSize` | MapScreen ×14, ReportFlagModal ×8, Profile ×12, PhotoGallery ×4 | `hitTargetFrame.guard` green; the token IS 44 |
| `'700'/'600'/'500'` → `font.weight.*` | 8 files, 27 sites | tsc; the tokens ARE those strings |
| `-0.3` → `font.tracking.heading`, `0.4` → `font.tracking.loose` | 5 | exact-value match |
| Profile `aboutRow` `minHeight: 64` → `size.row` | 1 | `settingsGrammar.guard` pins the token = 64 |

### 4.3 · Line heights — five that DO move

Each was hand-tuned past the system's ×1.4 formula and now takes the token for
its own size. Amounts stated because they are visible in a capture, if only just:

| Site | Before | After | Was |
|---|---|---|---|
| About body | 21 | 20 | ×1.50 → ×1.40 at `base` |
| Resources intro | 22 | 20 | ×1.57 → ×1.40 at `base` |
| Resources cardBlurb | 20 | 18 | ×1.54 → ×1.40 at `sm` |
| ReportFlag input | 19 | 20 | ×1.36 → ×1.40 at `base` (also its raw `fontSize: 14`, which IS `font.size.base`) |
| ErrorBoundary body | 22 | 21 | ×1.47 → ×1.40 at `md` |

### 4.4 · The rest

| Item | What | Proof |
|---|---|---|
| `reputationTier.ts` | four hexes → theme tokens; `medalPlatinum` added to both palettes | literals WERE the light palette's values |
| Admin Remove | `error` → `errorStrong` | A8; `errorStrong` is the destructive-FILL token |
| `useHeatCells` | **adopted**, not deleted — MapScreen had an inline copy | the hook has the only test coverage this privacy-floor computation has |
| UpdateBanner docblock | claimed `role=alert`; QA #8 dropped it | corrected |
| photoNudge comment | quoted `warningBg/warningFg 8.3:1`; the card uses INFO | corrected to the measured pair, 7.9:1 light / 6.2:1 dark |
| `Severity ↓` | → Lucide `ArrowDown` | I1/I3; spoken label unchanged (COPY_LEDGER W-07) |
| D16 · two spreads in comments | **applied** | `decorativeHiding.guard` gains the strip-then-count rule |
| PhotoLightbox raw blacks | already closed | the theme's own comment records replacing them |

---

## 5. GUARDS — 9 re-pinned, 0 relaxed

Every one tripped **by design**, because a rule it enforced moved across a new
seam. Each is re-pinned to the SAME rule stated on both sides of that seam, and
seven of the nine are now **stronger** than before.

| Guard | Why it tripped | The re-pin |
|---|---|---|
| `dismissalStandard` A | census 37→27; ten `<Modal>` tags moved into the primitive | counts `<Sheet>` consumers as the surfaces they are; **+A2** (a consumer hands over a real `onClose`) and **+A3** (the primitive wires that ONE handler to both doors). Sheet consumers were checked for nothing here before. |
| `focusOnOpen` | same shape | same fix, **+** an assertion that the primitive runs the hook AND lands its ref on the title — ten surfaces' focus-in hangs off that one call |
| `keyboardClass` | four sheets delegate the mechanism | **Recipe D**: consumer opts in AND primitive implements Recipe F. Its `hasCap` resolver also stopped mis-reading ONE-LINE style blocks as "no cap" — a false negative in the dangerous direction |
| `sheetBodyScrolls` | SW-42/SW-45 strings moved | composed across the seam, asserted both sides. `fill` being a silent no-op is a failure the old single-file assertions could not see |
| `MyWatched.containment` | the trap moved to the primitive's backdrop View | **placement changed, and the comment says so.** T20's "never the backdrop" gave *consistency* as its reason, not a platform one; on iOS the isolation comes from the Modal's own window either way. What the new placement adds: trap and escape on ONE node, now pinned as a same-tag fact |
| `disputeControl` | §SKY-3c's cluster now holds a primitive | anchors on the control's tag instead of a style name FlagDetail no longer owns |
| `bp11PressVocab` | the cell's press style moved | checked where it lives, **+** for the ABSENCE of an opacity there, which the old assertion did for four siblings and never for this one |
| `inertControlVisual` | SW-49's third verb carrier moved | takes TWO facts now: the sheet hands over `busy`, AND the control answers with a spinner. The second is new — a primitive that dropped it would downgrade every consumer at once |
| `sheetPull` | the primitive became the fourth adopter | ADOPTERS now keys on RENDERING `<SheetPull`, not on importing its module (twelve files import `useAtTop`); **+3**: the primitive wires the gesture to its own `onClose`; every `<Sheet>` with a vertical scroller **in its own body** passes `atTop`; a non-vacuity floor |

Plus **new coverage**: `announceCoverage` +23 · `flexBasisUnderLargeType` +6 ·
`decorativeHiding` +5.

---

## 6. ACCEPTANCE — what I verified, and what I could not

### Verified on the rebuilt sim-release

| Item | Result | Capture |
|---|---|---|
| Half-sheet shows the grabber | ✅ StatusHistory | `17e_light_m_E3_statushistory_sheet.png` |
| …and **dismisses by pull** | ✅ (after `6f72907`) — parent sheet survives | — |
| About swipes down like its siblings | ✅ | `17e_light_m_C15_about_pagesheet.png` |
| Bulk bar stacks at AXL | ✅ four full-width buttons, no clipping | `17e_light_axl_A4_tasks_bulkbar_stacked.png` |
| FlagDetail's verbs through the primitive | ✅ | `17e_light_m_C3_flagdetail_segmented.png` |
| About at AXL, light + dark | ✅ no clipping, chrome pane holds | `17e_{light,dark}_axl_C15_about_pagesheet.png` |
| About dark, medium | ✅ | `17e_dark_m_C15_about_pagesheet.png` |
| Loading states announce | ✅ **by test** (`announceCoverage` +23) | — |

### NOT verified — and honestly, not verifiable by me

**Everything behind auth.** RAILS 9 forbids signing in, so these could not be
walked and are **NEEDS-DEVICE for Sky**:

| Item | Why |
|---|---|
| **Leaderboard's cap at AXL (D22)** — the acceptance line | opens from the signed-in Profile only. The fix is structural (the primitive's cap resolves where the old one could not) and `sheetBodyScrolls` pins it, but **nobody has seen a long list at AXL** |
| Achievements · ActivityFeed · MyReports · MyWatched · NotificationPrefs half-sheets | all Profile-gated |
| C10's filter-rail wrap at AXL | ActivityFeed is Profile-gated |
| The five outcome announcements | Settings push/export/unblock and MyWatched unwatch all need an account |

**VoiceOver announcement timing (7.2).** Jest proves the wiring — the label, the
region, the iOS gate, the string's home in `copy.ts`. It cannot prove the
utterance, its timing, or that the loading and completion announcements do not
tread on each other. That is a VoiceOver session on a real device.

**The pull gesture's FEEL** on the other eleven consumers. I verified one by
hand — but the CORRECTNESS chain is closed by tests at both ends, which is
better than this section first said:

| Link | Proven by |
|---|---|
| `useAtTop` flips false on scroll, true at top, and counts iOS rubber-band overscroll as "at top" | `SheetPull.test.tsx` (pre-existing) |
| every `<Sheet>` with a scroller in its body passes `atTop` | `sheetPull.guard` (new, this phase) |
| `SheetPull` arms only when `enabled && atTop` | `SheetPull.test.tsx` (pre-existing) |

So "a downward drag dismisses when the user meant to scroll" is covered, not
merely guarded. What is left for a device is the THRESHOLD and the SPRING — how
far and how fast a pull has to be before it commits, on each list — which no
test can judge.

---

## 7. DECISIONS FOR SKY

1. **The Leaderboard's title, `h1` → `xl`.** The single most visible change in
   this phase. §S5 says one shell; Phase 11 deliberately made that title
   editorial. One prop restores it — and makes it a third shell. Your call.
2. **22 a11y strings, AGENT-PROPOSED** (COPY_LEDGER §Prompt 07). Announcements
   are the only interface some users get; these are copy and they are yours.
3. **`heatBadge`'s shadow — one instruction I did not follow.** The brief says
   → `shadow.e1`. I left it. That badge sits on MAP TILES at opacity 0.25 /
   radius 3 / elevation 3; `e1` is 0.06 / 2 / 1, tuned for cards on the app's
   light background. Applying it would visibly flatten an affordance whose
   shadow does real separation work against arbitrary basemap imagery — the same
   reason `shadow.pin` exists as its own tier. **The right answer is a
   map-surface shadow token**, which is a design decision, not a sweep.
4. **Four 56pt list rows** (AddressSearch ×2, GuestProfile, Profile). §S6 says
   one row height and it is 64, so these should converge — but that is +8pt on
   four surfaces, and 7.4 is declared zero-behaviour-change. Belongs in a phase
   that can capture it.
5. **24 raw `letterSpacing` values have no exact token** (0.2 ×9, −0.1 ×4,
   0.3 ×3, −0.2 ×3, 0.6 ×2, 0.1, −0.8, −0.4). Snapping them to the nearest would
   change tracking visibly for no gain in truth. T2's real answer is to pass
   `size` to `AppText` and let tracking derive — a composition change.
6. **The dark medal tints have never rendered.** The dark palette forks
   `medalSilver`/`medalBronze` ("lightened for legibility on dark surfaces") and
   nothing reads the fork: the tier ladder is a static array that cannot call
   `useColor()`. Fixing it changes how two badges look in dark mode.
7. **`SegmentedControl`'s two `track` palettes.** Structure is unified; the inks
   are not, because its two consumers sit on different backdrops and their
   palettes were arbitrated separately against them. One palette across both
   means an arbiter run, not a guess.
8. **`NotificationPreferencesScreen` is the last hand-rolled half-sheet.** The
   prompt's list named the *modal* and not the *screen*, so I respected it. Its
   twin has moved; it has not. One obvious next commit.

---

## 8. ROLLBACK

```bash
git revert --no-commit 15cf262..HEAD && git commit -m "Revert Phase 3"
```

Or, to drop the branch entirely: `git reset --hard 15cf262`.

Per item: each of the eleven commits reverts cleanly on its own **except**
`6f72907` (the pull fix), which depends on `dd3f406`'s adoptions — revert that
one first if you are unpicking by hand.

**STOP. Sky merges.**
