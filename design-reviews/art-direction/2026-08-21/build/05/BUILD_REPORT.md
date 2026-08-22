# BUILD REPORT — Prompt 05 · Phase 2b (onboarding in the light + sign-in on the primitives)

**Flagstone art-direction build series · Direction 1 "Ground · Stone · Path"**
2026-08-22 · iPhone 17e sim-release · seven commits · two device passes.

---

## 1. Branch

| | |
|---|---|
| Branch | `design/gsp-05-onboarding-2026-08-22` |
| Base | `e8e7610` = `main` = `origin/main` (0 ahead / 0 behind at branch time) |
| Prerequisite | Prompt 01 IS merged. `TypeBlock` / `TYPE_BLOCK`, `isAxRecompose`, and SignIn's 1.5 hero compaction were all present on the base and are built on, not re-derived. |
| `main` | untouched. Sky merges. |

No base deviation. Unlike Prompt 04, everything this phase needs was already on `main`.

## 2. Gates — measured, not quoted

| Gate | Baseline (on the base, before the first edit) | Final | Verdict |
|---|---|---|---|
| `npm run typecheck` | 0 errors | 0 errors | holds |
| `npx jest --ci -w 3` | **236 suites · 3447 passed · 32 todo · 0 failed** | **237 suites · 3468 passed · 32 todo · 0 failed** | +1 suite, +21 tests, **0 lost** |
| `npm run lint` | **0 errors · 82 warnings** | **0 errors · 82 warnings** | holds exactly |

18 files, 1,556 insertions / 653 deletions.

The known `ReportFlagModal` anon-rate-limit flake did not fire in either run.

## 3. The commits

| # | Commit | What |
|---|---|---|
| 5.1a | `21a90a8` | `fixedDark` ink family + `color.errorOnDark*` on both palettes + `Input onDark` + DESIGN.md §1 row |
| 5.1b | `09b941c` | `OnboardingCards` rebuilt on `ScreenStage` / board 05; 3 guards re-pinned; new 17-test render suite; DESIGN.md §7 |
| 5.1c | `09451f0` | one animation driver for every progress stone |
| 5.2 | `f1b8ed0` | `OnboardingModal` replay on the same template |
| 5.3 | `75dff74` | `SignInScreen` onto `Input onDark`; tokenised error red; one-run footer; derived tracking |
| 5.4 | `eea4796` | **device pass 1** — the vertical overflow fade, and the footer's flex-basis |
| 5.5 | `c61778b` | **device pass 2** — a 44pt ramp for an edge that cuts prose |

---

## 4. What each item did

### 5.1a — the primitive learns the one surface it could not draw

SignIn hand-rolled a twin of `Input` for one honest reason: the primitive is
themed, and on a cover that paints its own navy gradient the LIGHT palette draws
a white field with dark ink. So the app's highest-stakes form reimplemented the
label, focus ring, 44pt floor and error row, and its error red became a third,
undocumented family.

- **`fixedDark`** (theme.ts) collects the ten always-dark inks SignIn already
  shipped, **verbatim** — lifted, not re-picked, so an adopting screen renders
  byte-identically. Their contrast paper trail moved with them.
- **`color.errorOnDark` / `errorOnDarkBg` / `errorOnDarkBorder`** re-export the
  error trio through BOTH palettes from that one source, so a themed component
  can reach it via `useColor()`. Same value in each palette: a cover has one
  appearance. Deliberately NOT `errorFg`/`errorBg`, which are each palette's
  card pair and are illegible on a `#0a1428` cover.
- **`Input` gains `onDark`.** Every ink resolves in one `ink` object instead of
  seven scattered ternaries. The themed branch is byte-identical.

**Measured:** `errorOnDark` `#fca5a5` on the error box over the form card over
the cover (composite ≈ `#3B2A39`) = **7.0:1**, AAA. Recorded in DESIGN.md §1.

### 5.1b — onboarding joins the app

| Was | Is |
|---|---|
| bespoke dark gradient + glow orb, in both OS modes | the real `ScreenStage`, both palettes |
| a translucent card whose top edge cut across the hero | no card; hero and copy in one bottom-anchored zone |
| the composition slid ~60pt when the footer gained a row | the decline slot is RESERVED on all five cards; the top bar holds its height on the finisher |
| a "N / 5" pill AND a dot row | five stones, the current one stretched into a bar |
| severity discs at 32 inside a glass box | the production `SeverityDisc` at 48, the hero of card 2 |
| Lucide `MapPin` on card 3 | the house pin |
| a four-point sparkle on the finisher | the pin mark |
| "Not now" / "Maybe later" for one gesture | "Not now" on both (Q12) |
| "Allow Location" / "Turn on Notifications" | sentence case (Q12) |
| Skip on the last card | Skip on cards 1–4 |
| a second hand-rolled reduce-motion listener | the shared `useReducedMotion()` |
| announce fired on mount, over the focus jump | announce on genuine card changes only (D21) |
| **zero analytics** on the pre-auth flow that primes two OS permissions | skip / complete / permission-outcome, at parity with the replay |

**The five stones are width-bound, not scale-bound.** They must be visible
together — that is the teaching moment — so growth stops at the fit, not at a
multiplier. `scaleWithType` is deliberately **not** used, and this is the one
place the build departs from the prompt's letter: its ceiling is a fixed 2×, and
five discs across a 390pt screen cannot reach it (5 × 48 × 2 + gaps = 512 into a
342pt column). The same contract is applied with the row as the ceiling — box
and digit grow together, `maxFontSizeMultiplier={1}` so the glyph never scales
twice. Result on device: 48pt at default, ~65pt at AXL. The discs get **bigger**
at large type, which is X12's complaint reversed.

**Recomposition at ≥1.5× (F4/T5):** hero to the top at 0.7, copy column full
bleed (`spacing.xxl` → `spacing.lg`), title capped 1.6, body capped 2.0, CTA row
`column-reverse` with the primary full-width. Both halves of T5 in order — widen
the column, then cap the text.

### 5.2 — the replay

Same template, same stage, same stones, same fixed CTA column, same
recomposition. Its own good ideas are untouched: the 1×1 offscreen live region
that IS the screen-reader surface, the `wasVisible` announce gate, the F20 reset,
the haptic on every move, Back conditionally rendered rather than disabled.

What deliberately did NOT converge, and the coherence guard says why: three
steps, "Step N of 3", "Done", and the card scripts. **Only the drawing was ever
accidental.**

The two type caps are imported from `OnboardingCards` rather than restated. Two
copies of "1.6 and 2.0" in two files with a guard test between them describing
how they drift is a joke that writes itself.

### 5.3 — SignIn on the primitives

- Both fields are `Input onDark`. The eye is the primitive's `rightSlot` — same
  44pt target, one fewer absolute overlap. `maxFontSizeMultiplier` **stays at
  1.4**, not the primitive's 1.5: a field's own text sits in a box with a fixed
  floor and the label above carries the meaning, so the tighter cap is right and
  it is what shipped. *(Recorded, as the prompt asked.)*
- **Errors now know whose fault they are.** A mistyped email is the email
  field's problem, so the primitive draws it there — red outline, message below,
  and the message in the field's own `accessibilityHint`, which is what a screen
  reader hears when the cursor returns to the box. A server refusal is nobody's
  field and keeps the standalone row. One message, once, where it can be acted
  on. **A11Y-203 is untouched:** `showError()` still announces explicitly on
  every branch.
- The error box is `errorOnDark*`; the title's raw `letterSpacing: -0.8` is gone
  (it matched neither tracking token and overrode the size-derived value).

**The footer, and the one place the board was not followed.** Board 11 draws one
run, and it is one run — the policy link and the consent side by side with a dot
between, in a row that wraps back to the old two-line stack when Dynamic Type
needs it. What the board draws and this does **not** do is collapse both into a
single sentence with inline links: a nested `<Text onPress>` can carry neither
padding nor hitSlop (the W-01 finding from Phase 0), so that composition would
put **both legal links on the account-creation screen under the 44pt floor**.
The floor wins. The guards did not force this — `privacyLink.guard` and
`terms.guard` pin the labels and the reading order, not the layout — the floor
did, and that is worth being precise about because the prompt asked which.

**It paid for itself.** The compaction gave back the ~40pt board 11 predicted,
and the reclaimed space surfaced the guest note ("You can browse and report
barriers without an account…") that had been below the fold at default size on
the shipped screen. Compare `after/17e_light_m_A2_signin.png` with
`../../captures/17e_light_m_A2_signin.png`.

---

## 5. What only the device could tell me

Both gates were green and both of these were still wrong on screen.

### D-1 · the copy zone clipped in silence (fixed, 5.4 + 5.5)

At AXL, card 1's body ends **mid-glyph** hard against the progress row. It
scrolls — the board asks it to, and the shipped card did too — but the page gave
no sign a swipe would reveal the rest. **That is X12's finding word for word,
which this phase was supposed to close**, and the recomposition alone did not
close it: a 34pt body under a 54pt title cannot fit an 844pt screen however the
parts are arranged, so the honest fix is to make the scroll legible.

The app had already ruled on this shape (S16 / T14) and ships a fade and a
measurement hook for it — horizontally. Rather than fork a second fade:
`computeOverflowHasMore` was already three numbers and no axis, so the hook
costs one parameter; `OverflowFade` gains an `orientation`. Both default to
today's behaviour byte for byte, and the file is renamed `useOverflowFade`
because it now serves both axes (four existing call sites moved with it).

Device pass 2 raised the ramp from 28 to 44 for this site only — a chip rail
clips a control and wants a short decisive edge; this clips a **sentence** on a
pale stage. A per-site thickness, **not** a stronger ink: the colour is the
single source for every chip rail in the app.

### D-2 · the footer wrapped and orphaned its separator (fixed, 5.4)

The one-run footer rendered as the policy link and a **dangling dot** on one
line with the consent below — worse than the stack it replaced. `flexShrink: 1`
was never going to hold them together: Yoga runs its line-break test on the flex
BASE size, and the consent's intrinsic ~408pt overflowed the row before shrink
ever applied. `flexBasis: 0` takes the sentence out of that test; `minWidth`
stops it being squeezed below its longest word. **Both halves of the width rule
— the same lesson SW-36 taught, which I had just written into a guard two
commits earlier and then failed to apply.**

### D-3 · a guard caught a comment (fixed in place)

`privacy.guard` scans RAW source for a quoted "Privacy Policy" literal, to stop
the label forking away from `copy.ts`. My explanatory comment contained the
phrase in quotes and tripped it. Reworded. Working as designed.

---

## 6. Simulator evidence

iPhone 17e `9C9D3ED6…` (390×844), sim-release, handshake verified twice: the
final bundle is `13:00:51` against sources ≤ `12:55:44`. **Onboarding is gated by
a device-wide flag, so every look at card 1 is a genuinely fresh install**
(`uninstall` → `install` → `simctl privacy … grant location` → `launch`).

| Proof | File |
|---|---|
| Cards 1–5 at default, light — the board, on the app's stage | `after/17e_light_m_A1_onboarding_c1..c5.png` |
| Card 3 **primed** (location not granted) — the house pin in a `brandSoft` disc, "Allow location", "Not now" | `after/17e_light_m_A1_onboarding_c3_primed.png` |
| Card 3 **granted** (pre-granted via simctl, no OS dialog) — success disc + white check, CTA collapses to "Continue", decline gone, **nothing above it moves** | `after/17e_light_m_A1_onboarding_c3.png` |
| Card 4 after declining location — one decline word on both cards, no OS dialog fired | `after/17e_light_m_A1_onboarding_c4_primed.png` |
| Card 5 — pin mark, no sparkle, no Skip, gold finisher stone, **"Continue" present** | `after/17e_light_m_A1_onboarding_c5.png` |
| Card 1 at AXL — hero top, full-bleed copy, stacked CTA, the fade ramping into the cut | `after/17e_light_axl_A1_onboarding_c1.png` |
| **Card 2 at AXL** — all five discs bigger and still inside the column | `after/17e_light_axl_A1_onboarding_c2.png` |
| **Card 1 at 3XL — "accessibility" whole, no mid-word break (X13 closed)** | `after/17e_light_ax3xl_A1_onboarding_c1.png` |
| Cards 1–2 in dark — the dark stage, the discs, the lightened brand pin | `after/17e_dark_m_A1_onboarding_c1..c2.png` |
| The replay in dark — two surfaces, one drawing | `after/17e_dark_m_D2_replay_1.png` |
| SignIn default — the primitive's fields, the one-run footer, the guest note now visible | `after/17e_light_m_A2_signin.png` |
| SignIn at AXL — **both fields, both buttons AND the guest link in the first viewport** (X1 showed none of them) | `after/17e_light_axl_A2_signin.png` |

### Acceptance, item by item

| Asked | Result |
|---|---|
| Board 05's cards 1–5 at default | ✅ |
| Card 2 at AXL: hero top, full-bleed copy, stacked CTA | ✅ |
| No mid-word break at 3XL | ✅ "accessibility" whole |
| "Continue" present on card 5 | ✅ (guard-pinned too) |
| Permission buttons still prime correctly; no OS dialog before the tap | ✅ both cards, primed and granted states walked |
| Notifications: tap "Not now" | ✅ advances, no dialog |
| VoiceOver announces each card once | ✅ **by test** (3 cases: silent on mount, once per change, correct card on Back). Real VoiceOver → NEEDS-DEVICE |
| SignIn board 11 default + AXL | ✅ |
| Error state renders via `Input` | ✅ by test (field-attached; hint carries the message) |
| Links intact | ✅ all four legal guards pass |
| Gates green; `onboardingCoherence.guard` green | ✅ |

---

## 7. Guards re-pinned (never deleted)

| Guard | Was pinning | Now pins | Why the rule moved |
|---|---|---|---|
| `flexBasisUnderLargeType` | `cardScrollContent` / `cardScrollContentWide` / `bodyWide` / a wrapping `actions` row | `hero` → `heroWide`, the two named caps, and the CTA row **stacking** | Every name it used belonged to the glass card this phase deleted. Left alone it would have failed a screen that satisfies T5 **better** than the one it was written for — the one thing a guard must never do. |
| `bottomInsetSafety` (SW-02) | the decline link's `marginBottom: Math.max(28, insets.bottom)` | whatever is bottom-most derives the inset, **plus an ordering check** proving the decline is no longer it | SW-02's finding was that the decline guessed the pad because it was the last child. It is not any more — the CTA row is. The property moved with it; the old assertion would have demanded a margin on a control nowhere near the indicator. |
| `bp10SeverityGrammarGuards` | `<SeverityDisc … size={32}` | `hero: 'discs'`, `size={discSize}`, `DISC_BASE = 48`, and the fit arithmetic | 32 was the property when the row was a detail in a card. "Drawn big and all five fit" is the property now. |

Plus one **new** suite, `OnboardingCards.dynamicType.test.tsx` (17 tests): the
D21 announce (silent on mount / once per change / correct card on Back), the
measured word fit at 2.35 against the shipped copy, the widened column and
stacked CTA reaching the node, the five stones fitting at three sizes, the
reserved decline slot, one decline word, Skip's absence on the finisher, and the
four analytics events. `SignInScreen.test.tsx` gained three cases and had its
hand-written palette subset replaced with the real light palette — the subset
predated the primitive and was missing every token it reaches for, so the fields
were rendering with undefined inks and the suite had quietly stopped testing
what ships.

---

## 8. DESIGN.md diff

**§1 Color** — one new row:

> `| Fixed-dark surfaces | fixedDark.* + errorOnDark/Bg/Border | #fca5a5 / rgba(239,68,68,0.15) / rgba(239,68,68,0.3) | covers that paint their own dark background … errorOnDark on the error box over the form card over the cover (composite ≈ #3B2A39) = 7.0:1, AAA |`

**§7 Appearance (dark mode)** — the exception list, with a correction:

> **First-launch onboarding is no longer one** … Worth recording honestly: this
> list never *named* onboarding, but the code had treated it as an exception for
> months (a bespoke gradient, a glow orb, ~15 hardcoded inks with their own
> inline WCAG comments), so the doc and the app disagreed in the direction that
> hides work.

The prompt said §7's list "loses onboarding". It could not: onboarding was never
on it. The doc now records both the change and the discrepancy.

---

## 9. COPY_LEDGER

`../COPY_LEDGER.md` §"Prompt 05". **Nothing in this phase shipped a new
user-facing word.** All five cards carry the copy on `main` today, verbatim,
including its three em dashes.

- **2 changes, both ruled in the prompt's DECISIONS block:** one decline word
  ("Maybe later" → "Not now"); sentence case on the two permission CTAs. Both
  accessible names still contain the visible string (2.5.3 holds;
  `labelInName.guard` passes).
- **8 banked (W-05…W-12):** board 05's rewrite of cards 2, 4 and 5, the three em
  dashes it turns into stops, and the two granted-state strings that carry two
  more.
- **1 divergence surfaced, not resolved:** the two card-1 bodies promise
  different things ("so it gets fixed" vs "plan around it, or help fix it") with
  different verbs ("put it on the map" vs "drop a pin"). The coherence guard
  covers card COUNT, not this pair. Wanted: one promise and one verb, said
  twice — or a recorded decision that the replay speaks differently on purpose.

---

## 10. Analytics added

`OnboardingCards` had **none**. It now fires what the replay has always fired,
plus the outcome the funnel could never see. Platform only, no PII.

| Event | Props | When |
|---|---|---|
| `onboarding_skipped` | `platform`, `card` | Skip, and the VoiceOver escape gesture |
| `onboarding_completed` | `platform` | the finisher's "Continue" |
| `onboarding_permission` | `permission`, `outcome` (`granted` / `denied` / `declined`), `platform` | the OS result, or the "Not now" link |

`card` is new relative to the replay: it answers *where* people leave. The
escape gesture now routes through `handleSkip`, and the G1 comment that said
"this file has no analytics to preserve" was updated with it — it had become
false.

---

## 11. NEEDS-DEVICE

The simulator cannot settle these.

1. **Haptics.** `OnboardingCards` still has none. The replay fires
   `hapticSelection()` on every move; the first-launch flow does not, and a
   permission grant is the strongest candidate for one in the whole app. Not
   added here — it is a new sensation on a screen Sky has not felt yet, and
   `simctl` cannot verify it either way.
2. **Real OS permission dialogs.** Both were walked to the edge only: location
   pre-granted (so the granted state is real), and both decline paths taken. The
   actual system alert, and the grant→green-check transition it drives, want a
   thumb.
3. **VoiceOver.** The single-announce is proved by test, not by ear. Also
   unverified: whether the reserved-but-empty decline slot is silent to the
   rotor (it should be — an empty `View` with no accessible children).
4. **Reduce Motion / Reduce Transparency.** No `simctl` switch. The RM gates are
   unchanged in shape (Modal animation, pager scroll, the stone spring).

## 12. Residuals and observations — not fixed, deliberately

1. **SignIn's guest note is sliced by the pinned footer at AXL.** Content runs
   under the SW-01 footer with no scent — the same class as D-1, on the same
   screen. **Pre-existing**, not a regression (the shipped screen cut the tagline
   in the same place), and outside 5.3's scope. The tool now exists: it is one
   `CopyZone`-shaped wrapper plus `<OverflowFade orientation="vertical" />`. I
   left the account screen's structure alone rather than change it late in a
   device pass. Evidence: `after/17e_light_axl_A2_signin.png`.
2. **`ScreenStage`'s dark pool has a hard rectangular edge** in the top-left
   corner — the SVG ellipse's bounding box. **Pre-existing app-wide**, visible on
   the shipped dark Home (`../../captures/17e_dark_m_A3_home.png`) exactly as it
   is on dark onboarding. Not this phase's.
3. **The finisher's gold and severity 1's yellow are near-twins**
   (`goldAccent #FBB024` vs `severity[1] #F7C948`). Card 1's stone and card 5's
   are almost the same colour, so onboarding's one semantic colour moment reads
   as a repeat rather than as arrival. The board draws both. A design call, not
   a defect — flagged because nobody sees the two cards side by side except in
   this report.
4. **The composition is bottom-weighted, so roughly 40% of the screen above the
   hero is stage.** This is what board 05 draws — the void moved from *between*
   the card and the dots to *above* the copy, and it is air with an edge rather
   than leftover. Card 2 wears it better than card 1. Worth Sky's eye.
5. **Two off-scale type sizes**, 34 and 17, named as constants with the reason.
   `font.size` has 28/48 and 16/18 as neighbours. They are board 05's drawing of
   this one screen, not a proposal to grow the scale; the body cap of 2.0 is
   derived from 17 and moves with it.
6. **The replay's step 2 keeps its Lucide `Target` glyph**, where the
   first-launch flow teaches the same lesson with the five discs. "Same template,
   three steps as today" is the scope sentence, and swapping the hero changes
   what the replay teaches with — Sky's call, one line either way.
7. **`OnboardingModal` imports two constants from `OnboardingCards`**, which
   pulls the component into Settings' module graph. No bundle change (App.tsx
   already imports it) and no guard touched; the alternative was two copies of
   the same caps in two files that have a drift guard between them.

## 13. Rollback

```
git revert --no-commit c61778b^..HEAD && git commit
```

Or drop the branch: `main` is untouched at `e8e7610`.

**STOP. Sky merges.**
