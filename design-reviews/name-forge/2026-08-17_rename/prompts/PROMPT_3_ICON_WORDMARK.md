# THE FLAGSTONE MARK [TOP AVAILABLE OPUS · MAX EFFORT · design run · OPTIONAL, never blocking]

USAGE: fire in a fresh session from `~/AccessMap`, whenever Sky wants it. **This is optional and it blocks nothing.** The app can ship to the App Store with the current pin-and-figure mark exactly as it is. Do not fire this if the goal today is to submit.

WHAT THIS IS: the app is now called **Flagstone**, and the mark is still the AccessMap mark: a Wayfinder-Blue map pin carrying a white striding figure. The name has a picture in it that the current mark does not use. Every flag report is a stone; laid down one by one they pave a path everyone walks. This run explores whether a flag-and-stone mark is better than what exists, and it is allowed to conclude that it is not.

★ HOUSE PROTOCOLS: propose-only, no silent apply · OUTPUT: `~/AccessMap/design-reviews/name-forge/2026-08-17_mark/` (create; `RUN_LOG.md` first, then phase files, then `CLOSE-OUT.md`) · REGISTER: warm, human, boutique, zero corporate slop, ZERO EM DASHES in anything user-facing.

★ WHERE THE MARK LIVES TODAY, all four copies. A mark change is only real when every one of them moves together:
1. `src/components/LogoMark.tsx` — the React Native SVG, two variants (`color`, `white`), 96×120 artboard, `accessibilityLabel="Flagstone"`.
2. `public/index.html` — a hand-inlined copy of the same artwork in the pre-JS loading splash, marked `aria-hidden`.
3. `assets/brand/app-icon.png` — the iOS app icon AND the splash image (`app.json` points `icon` and `splash.image` at the same file).
4. `public/icon-192.png`, `public/icon-512.png` — the PWA icons in `public/manifest.json`.

★ NEVER TOUCH: the `#1466E0` Wayfinder Blue brand token or anything else in `src/theme.ts` without a stated reason and Sky's sign-off · the severity color grammar · bundle ID, slug, scheme · `main` · anything under `qa-reports/`, `design-reviews/` (except this run's own new folder), or `security-audit/`.

---

## PHASE 1 · Read what exists before drawing anything
Bank `01_read.md`: the current mark's actual geometry from `LogoMark.tsx` (paths, artboard, stroke weights, where the white knockout is used and why), the contrast facts already established (the colour pin holds ≥3:1 on the light stage; it dips to ~2.7:1 on dark, which is why the white variant exists on dark: see the note at `src/screens/GuestProfile.tsx:43-47`), and every surface the mark appears on. Do not skip this: the contrast pairing is load-bearing and a new mark must satisfy it or it is not shippable.

## PHASE 2 · Three directions, drawn, not described
Bank `02_directions.md` with **three** distinct explorations as real inline SVG, each rendered at 1024, 180, 60, and 29 px so the small sizes are judged honestly:
- **A · The flag.** The name's first half. Risk to test: a flag at 29px is a smudge, and "flag" already means something specific inside this app (a report). Does the brand mark colliding with the product noun help or confuse?
- **B · The stone.** The path made of laid stones. Risk to test: reads as generic geometry, or as a wall rather than a path.
- **C · Flag on stone.** Both halves, one object. Risk to test: two ideas in 29px is usually one idea too many.
Plus **D · the honest control: keep the current pin-and-figure mark.** It is already accessible, already shipped, already tested on device, and it carries a disability-forward figure that neither a flag nor a stone does. State the case FOR the control as strongly as for the others.

For each: how it holds at 29px, on the light stage and the dark stage, in colour and in white knockout, with the measured contrast ratio against both stages. A direction that cannot hold 3:1 on both stages is dead, and say so.

## PHASE 3 · The wordmark
`Flagstone` is 9 characters. Bank `03_wordmark.md`: how it sets in the app's existing brand font (find the real font in `src/lib/fonts.ts` and `src/theme.ts`, do not guess), at the sign-in title size, the drawer heading size, and the splash size. Check the one thing that actually bites: whether the letterforms hold at the smallest place the wordmark appears, and whether `Flagstone` needs different tracking than `AccessMap` did (it is shorter and has no internal capital).

## PHASE 4 · Recommendation, and permission to say no
Bank `CLOSE-OUT.md`: one recommendation, the losing directions with their reasons, and the full implementation cost of the winner across all four copies of the mark listed above, including the PNG regeneration that an agent cannot verify visually. **"Keep the current mark" is a legitimate and possibly correct recommendation.** If the control wins, say it plainly and stop; do not manufacture a change to justify the run.

If a new mark wins, build it on branch `design/flagstone-mark` and propose only. Flag explicitly that the PNG assets (app icon, PWA icons) need Sky's eyes on a real device, because an agent cannot judge how an icon looks on a home screen.

★ DECISIONS FOR SKY: none needed to fire. The output is a decision document, not a change to main.

★ FENCES: propose-only, no merge, no push, no store submission, no external send, no purchase · `main` untouched · no live database, no credentials · nothing invented; every contrast number measured, not estimated. Report and STOP.
