# Device-Tune Phase 2 (D2) — The Drawer Joins the Material World

**Branch:** `devicetune/2-drawer-material` (base `067864e` = the Phase-1 tip; `main` == `origin` == `d43f867` unchanged)
**Date:** 2026-07-25
**Status:** **D2a CLOSED** (the scheme rebind — the bug Sky reported — is fixed and gated). **D2b mockup gate OPEN**, awaiting Sky's pick. Tip `8cded0b`.
**STOP on branch.** No merge, no push, no builds (device-tune DECISIONS §S S-3).

---

## 0. Provenance — read this first

| | |
|---|---|
| **Model requested by the phase prompt** | Fable 5, max effort, no fallback swap |
| **Model that actually ran** | **Claude Opus 5** (`claude-opus-5`) |
| **Why the difference** | The session's model is fixed by the harness at launch; a running session cannot re-point itself at another model. The phase prompt asked for the provenance to be tagged rather than silently assumed, so it is tagged: **this phase was NOT built by Fable 5.** |

If the Fable-5 provenance matters for this phase's record, the phase needs re-firing in a Fable-5 window — the branch is reproducible from `067864e`.

---

## 1. What Sky saw, and what was actually true

Sky's device read: **the drawer renders dark over a light app — it reads as two different apps** — and the drawer plus its destination pages should carry the liquid-glass material like the rest of AccessMap.

The device read was correct. The cause was not a bug in the ordinary sense:

- **The dark drawer was a ratified design, not an accident.** R2 ratified an "always-dark navigation rail" (M-45, `design-reviews/r2-audit/04_material_migration_spec.md:131-146`; R2 `DECISIONS.md` S-5; `GLASS.md:188-190`), and `DESIGN.md:257-259` still lists "the always-dark nav chrome" among the fixed-background exceptions that must NOT be themed.
- **It had a receipt.** A previous re-tokenization (`271e8ec`) broke light mode — "tokens went invisible" — and was reverted. That revert was then written into the component itself as law, in six separate comment blocks.

**Sky's D2 phase prompt supersedes the ratification** (Sky's intent outranks a recorded design decision). So this phase does two things at once: it rebinds the drawer, and it **amends the living law** so the next audit reads the new rule instead of dutifully reverting the fix. The historical R2 record is left exactly as written — supersession is recorded in `design-reviews/device-tune/DECISIONS.md` §S S-4, not by editing history.

---

## 2. The theme-lock diagnosis — why `271e8ec` failed and this does not

This is the load-bearing finding of the phase (DECISIONS §F **F-8**).

`271e8ec`'s failure was real, and its recorded explanation was wrong. The shipped comments said *"theme tokens would go invisible in light mode."* What actually happened is that **`271e8ec` was a partial binding**: it tokenized three **inks** while leaving the panel a hardcoded near-black. Light-mode inks (`#222`-family) then landed on a still-dark surface — which is exactly "invisible".

> The failure was **incoherence between surface and ink**, not the tokens.

This phase binds **surfaces and inks together, in one commit**. That is why the identical token set now passes the arbiter 32/32 in both schemes and both transparency states.

### The mechanism that made the drawer structurally scheme-blind

| Mechanism | Where (at base `067864e`) |
|---|---|
| `makeStyles(color, reduceTransparency)` accepted the palette but used it **exactly once** — for the logo tile | `HamburgerDrawer.tsx:428` (`logoMini.backgroundColor: color.brand`) |
| `makeItemStyles()` took **no palette argument at all** — the nav rows could not follow the theme even in principle | `:478` |
| ~15 hardcoded dark literals across backdrop / panel / edge / lip / header border / brand / close button / divider / footer / row icons / chevron / X / pressed / label / muted label | `:254, :363, :368, :379, :393, :396, :413, :421, :438, :445, :454, :463-473, :489, :500, :506` |

### F-10 — the two-blues split, found by the rebind

`DrawerItem` hardcoded `#4E89EF` for row icons — that is the **dark**-palette brand. Twelve lines away, `logoMini` already used `color.brand`. So in light mode the drawer rendered **two different brand blues simultaneously**: a `#1466E0` logo tile above `#4E89EF` icons. Binding the icons to `color.brand` retires it; no separate fix was needed.

---

## 3. Treatment, surface by surface

Every value below is an **already-arbitrated house token**. This phase introduces **no new ink or floor values** and changes **no token definitions** — `theme.ts` and `ThemeContext.tsx` values are untouched (comment-level amendment only).

| Site (base line) | Bound to | Dark delta |
|---|---|---|
| panel fill `:393` | `reduceTransparency ? rtFill : color.glassChromeLite0` | **byte-stable** |
| right edge `:396` | `color.glassChromeEdge` | byte-stable |
| inner lip `:413` | `color.glassChromeLip` | byte-stable |
| backdrop `:379` | `color.scrim` | 0.5 → 0.6 (recorded) |
| brand wordmark `:438`, row label `:500` | `color.textStrong` | byte-stable (`#f5f5f5`) |
| muted label `:506` | `color.inkGlassMuted` + weight → 500 | 0.48 white @400 → `#B8BEC9` @500 |
| row icons `:363` | `color.brand` | byte-stable (`#4E89EF`) — and retires F-10 |
| muted icon / chevron `:368` / close X `:254` | `color.inkGlassMuted` | ≈ byte |
| header border `:421`, divider `:454` | `color.glassChromeEdge` **(deviation — see §3.1)** | small recorded delta |
| close-button fill `:445`, pressed row `:489` | `color.glassNeutralBtn` | 0.08 / 0.06 → 0.10 |
| web `backdropFilter` `:402-404` | unchanged (scheme-independent) | — |

**Dark mode barely moves.** The drawer's dark literals were already byte-identical to the dark glass tokens (DECISIONS §F **F-9**): `rgba(13,18,32,0.94)` **is** `glassChromeLite0` dark; the edge **is** `glassChromeEdge`; the lip **is** `glassChromeLip`; `#f5f5f5` **is** `textStrong`; `#4E89EF` **is** `brand`. Five small deltas remain, all recorded, all improvements.

### 3.1 One deliberate deviation from the phase spec

The phase prompt mapped the header border and the section divider to `color.border` / `color.divider`. **I bound them to `color.glassChromeEdge` instead**, for a measured reason:

- `color.border` light is `#e5e5e5`. The light panel composites to `#EDEDED`–`#F8F8F8`. That hairline measures **1.08:1** — effectively invisible. The header separator would have disappeared in light mode.
- `color.glassChromeEdge` is the hairline the chrome tier already uses, it measures 1.21:1 on the same composite (normal for a 1px separator), and it keeps **one hairline vocabulary** across the panel — the right edge, the header rule and the divider all speak the same line.

Nothing else in the spec was changed. Flagging it because it is a spec deviation, not an implementation detail.

### 3.2 Reduce Transparency — a deliberate asymmetry (DECISIONS §A A-3)

`rtFill = color.scheme === 'dark' ? '#0D1220' : color.overlay`

Dark keeps the **shipped flattened tone byte-for-byte** so dark mode does not move. Light takes `color.overlay`, the house RT chrome fill (GLASS §6). Symmetric `color.overlay` was rejected: dark `color.overlay` is a *neutral* `rgba(20,20,20,0.97)` and would visibly shift the panel off the navy deep field it has always been — a real regression bought for nothing. `#0D1220` is the **only** raw dark literal left in the file, and a guard pins it to the RT fork by line.

---

## 4. Arbiter proof

`design-reviews/device-tune/tools/devicetune-drawer-material-stacks.json` (+ banked `.txt`)

```
node ~/AccessMap-material-lab/2026-07-02/shared/contrast-check.mjs \
  design-reviews/device-tune/tools/devicetune-drawer-material-stacks.json
```

**32 pairs · ALL PASS · exit 0.**

- Surfaces: `panel` and `panel + wash` (close button / pressed row), each in normal and RT states, per scheme.
- Stack order models the real object: `[scrim, panelFill]` — the drawer is a welded panel+scrim, and the scrim is painted first.
- Bases are opaque `#000` and `#FFF` in **both** schemes per GLASS §12.2: the drawer opens over FullMap, whose tiles are an axis independent of the JS theme (web CartoDB `dark_all` is always dark, even in light mode).
- Tightest pair: light `brand` as a row icon on a pressed row over `#000` — **4.00:1** against a 3.0 floor.
- Biggest real gain: the muted Sign-out label moves off a knife-edge **4.97:1** at 400 weight to **9.57:1** at 500 — which also brings it into compliance with the GLASS §2 type law ("text on glass carries ≥500 weight"), which it had been violating.
- Non-informational ornament (scrim, hairlines, washes) carries no pairs, per GLASS §7.1.

All 13 pre-existing stacks files: **0-diff** (checksummed before and after).

---

## 5. Destinations (C5) — verified, zero code

The phase expected the four drawer destinations to already wear the material. They do — verified by read:

| Screen | Recipe | Evidence |
|---|---|---|
| Resources | `ScreenStage` + chrome pane + row glass + arbitrated inks | `:124`, `:130-131`, `:202`, `:207-209`, `inkOnStage :276`, `inkGlassMuted :147` |
| How To Help | `ScreenStage` + chrome pane + row glass + banner glass | `:93`, `:99-100`, `:134-136`, `:161-162`, `inkOnStage :235` |
| About the App | `GlassSurface variant="bulk"` bottom sheet | `:52`, scrim `:149`, `inkGlassMuted :233`, scheme-aware LogoMark `:60` |
| Settings | `ScreenStage` + row glass throughout | `:454`, `:109`, `:518`, `inkOnStage :470-471` |
| _(Admin, same drawer tier)_ | `ScreenStage` + row glass | `:103`, `:117`, `:188` |

**Recorded as a deliberate tier, not drift** — these shipped to the GLASS.md authority already. No code changed.

**Observation only (no action):** About is a `variant="bulk"` bottom sheet while its three siblings are full-screen stage+chrome pages. That is a sibling-grammar inconsistency (the B9 observation). It is *not* a material defect and is out of D2's scope — noting it so it can become a fork if Sky wants one.

---

## 6. Gates

All measured at the tip (`8cded0b`) on a quiet machine.

| Gate | Result |
|---|---|
| `tsc --noEmit` | **0 errors** |
| `npm run lint` | **77 problems — 0 errors, 77 warnings.** Byte-identical to the baseline. (Commit 4 briefly took it to 79 via a duplicate import; commit 5 restored it. The gate is "77 exact" precisely so that cannot hide behind "still zero errors".) |
| `npx jest` | **152 suites · 2116 passed · 0 failed** (84 todo, pre-existing) |
| Arbiter | **exit 0 · 32/32 PASS**, both schemes × both transparency states |
| declared == shipped | **0 mismatches**, verified token-by-token against `theme.ts` + `ThemeContext.tsx` |
| Pre-existing stacks files | **13/13 byte-identical** (checksummed before and after) |
| PROTECT list | **untouched** — `git diff --stat` vs base touches only the drawer, its context, its two inline trigger sites, `HeaderActions`, four test files, and three comment-level doc edits |
| Browser captures | **30/30 banked**, each against a *fresh* static export of the code it claims to show |

### The jest baseline dispute is resolved

The prompt flagged that records disagreed (2072 vs 2074). Both were wrong. Measured directly at base `067864e`:

| | Suites | Passed | Todo |
|---|---|---|---|
| Base `067864e` | 148 | **2076** | 84 |
| Tip `8cded0b` | 152 | **2116** | 84 |
| Delta | +4 | **+40** | 0 |

The four new suites contain exactly 40 tests (`material.guard` 16 · `scheme` 6 · `focus` 15 · `drawerTrigger` 3). **Conservation is exact — no pre-existing test changed state.** Use **2076** as the base number from here.

### A regression this phase shipped, and how it was caught

C3 broke the drawer on the web build: `register()` runs inside the hamburger's `onPress` before `setOpen(true)`, and RNW's `findNodeHandle` **throws**, aborting the handler. **The menu was completely inert on web, and all 67 tests were green** — `react-test-renderer` implements `findNodeHandle`, so the failing path did not exist under jest.

It was caught because the candidate-A captures came back showing a plain Home screen with no drawer. A Playwright `pageerror` probe named it in one line. C4 fixes it (skip on web by design + try/catch) and pins it with three tests, including one that forces `findNodeHandle` to throw and one that proves the guard did not silently disable the feature on native.

**This is the phase's most useful finding: the capture rig earned its cost by catching a bug the entire test suite could not see.** Recorded as DECISIONS §F F-14.

---

## 7. Verification honesty ledger

| Claim | Evidence level |
|---|---|
| The drawer is light in light mode / dark in dark mode, over the live map and over Home | **verified** — 8 browser captures against fresh exports of base and tip |
| Dark mode is essentially byte-stable | **verified** — token-by-token equality + the paired dark captures |
| Every ink clears its WCAG floor in both schemes and both RT states | **verified** — arbiter exit 0, 32/32, declared == shipped |
| The drawer opens and all four destinations are reachable after C3+C4 | **verified** — 13/13 captures on the fixed build |
| Candidate B renders, and is visibly more translucent | **web-approximated** — Chromium `backdrop-filter` stands in for `expo-blur` |
| B transiently breaches `maxLivePanes = 12` at Tasks' worst case | **code-inferred** — from GLASS §3's own budget arithmetic (~9–10 rows + chrome + banner = 12, +1 drawer = 13) |
| The scrim duplicated the close button for VoiceOver | **code-inferred → NEEDS-SKY-DEVICE.** Two elements carried `accessibilityLabel="Close menu"` at base — that part is source-verified. But the banked BEFORE ARIA snapshot lists only **one**, because RNW renders the scrim as a generic `div`. Web does *not* reproduce the duplicate; the iOS claim is an inference. The fix is right regardless. (DECISIONS §F F-15) |
| Focus-on-open, focus-return, and the no-return-on-handoff asymmetry | **verified in jest** (15 tests) · **NEEDS-SKY-DEVICE** for real VoiceOver behaviour — `setAccessibilityFocus` has no web backend, so no capture can show it |
| Bottom clearance without the footer on a home-indicator device | **code-inferred** — the drawer's suites render bare, where insets are 0; only a device has a real inset |
| Blur *feel*, and RT on device | **NEEDS-SKY-DEVICE** — the iOS simulator is still blocked on the `fmt` pod under Xcode 26.6 (pre-existing, separate task) |

**Not done, and why:** no forced-Reduce-Transparency capture build. RT is iOS-only (`useReduceTransparency` returns false on web), so a capture would have required a hacked export whose honesty tag would be `web-approximated` anyway. The RT fork is instead proved two stronger ways — the arbiter covers both RT surfaces in both schemes, and `HamburgerDrawer.scheme.test.tsx` asserts the rendered RT fill is `#0D1220` in dark and `color.overlay` in light. A screenshot would have added less than either.

---

## 8. Device list — Phase 2 contributions

1. **The drawer in both themes over the live map** — the material read Sky reported. Does the light drawer now belong to the light app?
2. **Live scheme switch with the drawer open** (Settings → Appearance → Light/Dark while the panel is up) — the styles are memoized on the palette, so the flip should be immediate and complete.
3. **Reduce Transparency ON**, drawer + all four destinations, both schemes — the designed opaque state, never a smear.
4. **VoiceOver:** containment (nothing behind the panel reachable) · focus lands on the "AccessMap" header when the drawer opens · focus **returns to the hamburger** on a plain close (X / scrim / back) · focus does **not** return when a row hands off to a destination.
5. **Bottom clearance without the footer** on a home-indicator device — the last nav row must clear the indicator.
6. **If Sky picks candidate B:** frost feel, and the 13-pane worst case on Tasks with the drawer open.

---

## 9. What is Sky's, and what is next

**Nothing is merged, pushed, or built.** `main` == `origin` == `d43f867`, untouched. The branch stops at `8cded0b`.

1. **Open the board and pick a treatment** — `design-reviews/device-tune/D2b_mockup_gate.html`. Squint strip first (labels withheld), recommendation after it. **Recommendation: A**, which is what is already built — so "A" or "no pick" both mean *nothing further to do*. Only B needs work, and B needs an explicit blur-budget amendment.
2. **ff-merge order** — Phase 1 (`devicetune/1-drawer-function` @ `067864e`) is this branch's base, so merging Phase 2 brings Phase 1 with it. Still unmerged and unrelated: `fix/photo-privacy-sanitize` @ `64342e1` (CRITICAL, no file overlap) — your call on order.
3. **Device pass** — the six items in §8. Four of them cannot be proved anywhere but a device.
4. **Phase 3** — not started.

**Two things I would not let slip:**

- **The `fmt`/Xcode 26.6 blocker is now load-bearing.** Four of the six device-list items exist *because* the simulator is unavailable. That separate task is what turns this phase's inferences into facts.
- **F-14 is a rule, not an anecdote.** An accessibility enhancement sitting upstream of a primary action in a handler is a shape that will recur. It shipped past a 2,100-test suite because the failing platform does not exist under jest.
