# Morgan — "legal pages won't open / gestures missing" investigation

**Date:** 2026-08-19
**Branch:** `fix/legal-sheets-and-gestures-2026-08-19` (off `main` @ `e3d9685`)
**Trigger:** Sky — "privacy policy and terms and community guidelines no longer open! we fixed
this previously and some gestures for the map navigation seem to be missing."

---

## Summary

Three separate things were tangled together in one report. Two are explained and one is fixed;
the third — the legal sheets refusing to open — **did not reproduce anywhere I could observe**,
and I say so plainly rather than shipping a guess as a fix.

| # | Symptom | Verdict |
|---|---|---|
| 1 | Map gestures missing | **Explained — deliberate removal**, landed in the build Sky just installed |
| 2 | "We fixed this previously" | **Real bug found + fixed** — the same defect, at a second call site that never got the guard |
| 3 | Privacy / Terms won't open | **REPRODUCED AND FIXED** on the simulator — a UIKit presentation rule, not a JS bug. See §3 |

---

## 1 · The missing map gestures — found, and they are deliberate

Sky's TestFlight builds (from `eas build:list`):

| Build | Commit | Date |
|---|---|---|
| 27 | `d7cd907` | Aug 13 |
| **28** | **`d0fbede`** | **Aug 19, 2:21 PM — the one Sky is holding** |

57 commits landed between them. One of them is `0d129a1` *"retire the C-lite switch app-wide"*,
which says in its own body:

> removed both long-press flip triggers (Map bar title, Tasks header)

That is the answer. **Two long-press gestures were deleted in exactly the build Sky just
installed:**

- long-press the Map command-bar title ("Explore") — was the glass material A/B flip
- long-press the Tasks header — the same switch, second door

Sky was *using* those gestures — they existed only so she could flip the material under her own
eyes while judging blur-vs-crystal on device. Once she ruled `full`, the switch was retired and
both triggers went with it. Working as intended, but nobody told her in those words, so it read
as breakage.

**Every other map gesture is intact** (verified in source on this tip):

- long-press the map to drop a pin — `onLongPressMap`, still wired
- pan / pinch-zoom / rotate / pitch — the platform's, deliberately handler-free (guard law F2)
- zoom floor `minZoomLevel={3}` — was already in build 27, not new
- Tasks card long-press (bulk select), filter-set long-press, pull-to-dismiss sheets, pageSheet
  swipe-dismiss — all present

**Nothing to fix here.** If Sky misses the flip, it can come back as a Settings row instead of a
hidden long-press — but that is a product call, not a defect.

---

## 2 · "We fixed this previously" — she is right, and it was only half fixed

The bug Sky remembers is `ee8821d` (2026-07-25), *"the focus enhancement could kill the drawer on
web"*: on react-native-web `findNodeHandle` **throws**, it was being called inside the hamburger's
`onPress`, so the press handler aborted and the whole menu went inert.

That fix was applied to `useDrawerTrigger` / `useSurfaceTrigger`. **It was never applied to
`useFocusOnOpen` — the other call site of the same function**, in the same file
(`src/lib/accessibility.ts`).

### Proof, not inference

Reproduced live in a browser against `main`'s tip. Console, one line per modal opened:

```
[error] Uncaught Error: findNodeHandle is not supported on web.
                        Use the ref property on the component instead.
```

Four modal opens → four throws. Every dismissable surface in the app uses this hook: Privacy,
Terms, About, Legend, Nearby, Report, Onboarding, HowToHelp, SignIn, Profile.

### Why every gate missed it

The same reason the drawer regression shipped: **react-test-renderer implements `findNodeHandle`
perfectly well**, so all 3,061 jest tests stayed green, typecheck stayed at 0, and lint stayed
clean straight through it.

### What was actually broken

Because this hook runs in a `setTimeout` rather than a press handler, the throw could *not* abort
a tap the way the drawer one did — the sheets still opened. What was silently dead is the
**WCAG 2.4.3 focus move itself**: on web, the screen-reader cursor has never moved onto a modal
title when it opens. The A11Y-201 feature has been inert on that platform since it shipped.

### The fix — `5ce2833`

Same two layers as `ee8821d`, for the same stated reason:

1. Skip on web **by design** — `setAccessibilityFocus` is a stub with an empty body there, so
   there is no cursor to move even with a valid handle.
2. `try/catch` anyway. An accessibility *enhancement* must never be able to throw, on any
   platform, for any reason.

New suite `src/lib/__tests__/focusOnOpen.test.tsx` **forces** the throw rather than waiting for a
platform to produce it, and pins all three directions: web skips registration, a throwing
`findNodeHandle` is swallowed, and native still moves the cursor (so the guard is not so defensive
that it quietly disables the feature).

**Gates:** typecheck 0 · 3 new tests · 3064/3064 green.

**Verified in a real browser, before and after, same sequence** (drawer → About → Privacy over
About):

| | `findNodeHandle` uncaught errors |
|---|---|
| before | **1 per modal open** — 4 opens, 4 throws |
| after | **0** |

Only pre-existing React DOM-prop warnings remain in the console (`accessible`,
`importantForAccessibility`, `accessibilityElementsHidden` leaking to web DOM elements) — cosmetic
noise, unrelated, and untouched by this change.

---

## 3 · Privacy / Terms not opening — REPRODUCED, root-caused, fixed

⚠️ **This section replaces an earlier "not reproduced" verdict.** That verdict was correct about
web and wrong about the app, and it stood only because local simulator builds had been blocked
since July 25 (§4). The moment one ran, the bug appeared on the first try.

### What actually happens

Tapping **Terms & Community Guidelines** or **Privacy Policy** inside the About sheet does
**nothing at all** — no error, no log in JS, no visual response. The cause is UIKit, not React:

```
[com.apple.UIKit:Presentation] Attempt to present <RCTModalHostViewController>
on <UIViewController: 0x1130a9800> (from <UIViewController: 0x1130a9800>)
which is already presenting <RCTModalHostViewController: 0x133c15e00>.
```

One line per dead tap, timestamps matching the taps exactly.

`SharedModalsHost` mounts both sheets as siblings of the tab navigator, so they present from the
**root** view controller. From Settings — a tab screen — that is correct, and it is exactly why
Settings was the only entry point that ever worked. From a surface that is **itself a Modal** it
cannot work, and it fails silently.

### Five entry points shipped this way

| Surface | Link | Status before |
|---|---|---|
| About | Privacy Policy | dead |
| About | Terms & Community Guidelines | dead |
| ReportContentModal | Terms & Community Guidelines | dead |
| ReportFlagModal | "View guidelines" (blocked content) | dead |
| FlagDetailModal | "View guidelines" ×2 (blocked content) | dead |

The last three are the **Apple 1.2(a) affordance** that `b200eb0` built — dead in exactly the
place it was built for.

### The comment that sent this the wrong way

`RootNavigator.tsx` asserted:

> "Native does not care: a pageSheet is its own UIKit scene and the last-presented modal is on top
> regardless of tree position."

That is false. The mount-**order** fix it describes was real, but only ever fixed **web**, where
two modals are same-z-index fixed divs and the later sibling wins. Web was fine throughout; native
never was. Corrected in place (`fd6632e`).

### The fix

`useLegalSheets()` mounts the sheet **inside** the surface that opens it, so it presents from that
modal's own view controller — legal — and About stays open beneath it, which is the
over-not-under behaviour §SKY-6 asked for in the first place.

Not a new pattern: **SignInScreen has mounted both sheets locally since B-3**, for an unrelated
reason, and both open correctly there on device. That working surface is what identified the shape
of the fix. Settings keeps the shared host.

**Verified on device, before and after, same taps:** both About links dead → both open, About
still visible beneath, closing returns to it. **Zero** "already presenting" errors afterward.

New guard `legalSheetPresentation.guard.test.ts` fails if any file rendering its own `<Modal>`
reaches for the shared host, or takes the hook without rendering `legal.sheets`. Its regexes were
checked against the old buggy shape, the fixed shape, and a tab screen — a guard that cannot fail
is worth nothing. Three existing guards asserted the broken arrangement and were **updated, not
deleted**: their intent is intact, only the mechanism assertion changed.

**Gates:** typecheck 0 · lint 0 errors · 209 suites / 3068 tests green.

---

### What I checked first, and why it misled me

### What I checked

**Web, local dev server** — Settings → Privacy Policy opens and renders in full. About → Privacy
opens *over* About correctly.

**Web, the live demo at accessmap.skypistudio.com** — same, both paths, including the
modal-over-modal case that the mount-order comment in `RootNavigator.tsx` was written to fix.

**The hosted legal pages** — all 200 as of now:

| URL | Status |
|---|---|
| `…/AccessMap/privacy/` | 200 |
| `…/AccessMap/terms.html` | 200 |
| `…/AccessMap/support.html` | 200 |
| `…/AccessMap/accessibility.html` | 200 |
| `…/AccessMap/assets/site.css` | 200 |
| `…/AccessMap/assets/a11y.js` | 200 |

⚠️ **These were 404 an hour ago.** A parallel session was refactoring the site *during* this
investigation (`e3d9685`, 17:00 — shared `site.css` + `a11y.js`, and a brand-new
`docs/terms.html`). Until it was pushed, `terms.html` and both shared assets did not exist on the
live site. **If Sky was looking at the hosted pages, that window is very likely what she saw** —
and it has since resolved itself.

### The code did not change

`PrivacyScreen.tsx` and `TermsScreen.tsx` are **byte-identical** between build 27 (where they
worked) and build 28. `RootNavigator.tsx` and `AboutScreen.tsx` changed by brand strings only
(`AccessMap` → `Flagstone`). The in-app Terms and Privacy screens, and the pageSheet swipe
gestures, were all already in build 27.

So whatever Sky saw on device is **not** a change to those screens. The remaining app-side
candidate worth device time is that `0d129a1` made every `variant="row"` surface mount a **real
iOS BlurView** with no lite fallback — the commit flagged this itself as
`NEEDS-SKY-DEVICE`. Heavy stacked blur over a live map is the kind of thing that degrades on
device and on nothing else.

### Nothing further needed from Sky here

The two questions this section used to end with — phone or Safari, which row — are answered: the
app, the About sheet (and four more surfaces besides). Closed.

---

## 4 · Unmerged work (Sky's question)

**Local branches with commits not on `main`:**

| Commits | Last | Branch | What it is |
|---|---|---|---|
| 3 | 08-13 | `security/reviewer-cred-purge` | Reviewer-credential purge + a `noCredentialsInTree` guard. **This is build 27's commit** |
| 2 | 07-25 | `fix/fmt-xcode26-local-sim-2026-07-25` | The fmt/Xcode-26 fix. **See below — this one matters** |
| 1 | 08-17 | `docs/ship-preflight-2026-08-17` | Rename ship-preflight report (docs) |
| 1 | 08-17 | `docs/presubmit-prompt` | Pre-submit prompt bundle (docs) |
| 1 | 07-14 | `fix/noscript-fallback` | Honest `<noscript>` fallback for the web build |
| 1 | 07-04 | `fix/tasksflagcard-date-flake` | Makes a test assertion time-stable |

**Remote-only:** 7 dependabot branches (1 commit each), `origin/feat/phase5-anon-reporting` (2),
`origin/feat/phase5-trust-score` (6).

**`main` is in sync with `origin/main`.** 46 stashes exist, oldest from May — worth a separate
triage pass, not this one.

### The one that actually costs something

**`fix/fmt-xcode26-local-sim-2026-07-25` has been unmerged since July 25, and it is why nobody can
test on a simulator.** Without it, a local iOS build dies with 5 consteval errors in
`fmt/format-inl.h` under Xcode 26.6 — I hit exactly that on my first attempt tonight.

I cherry-picked it onto this branch and **the local simulator build now succeeds end to end** —
first time since July 25. Evidence:

- the plugin flips exactly **2** build configurations to `gnu++17` (fmt Debug + Release), exactly
  as its commit message predicted
- `xcodebuild` compiled all 104 pods with **zero errors** — the 5 consteval failures in
  `fmt/format-inl.h` are gone
- `Flagstone.app` is installed and launching on the iPhone 17 Pro simulator
  (`com.accessmap.app`, verified via `simctl listapps`)

Note the prebuild regenerates `ios/` under the new brand — it is now `ios/Flagstone.xcworkspace`,
not `ios/AccessMap.xcworkspace`. `ios/` is gitignored, so nothing tracked moved.

**This is the reason a regression like Sky's reaches her phone before anyone sees it.** All 3,061
tests pass, typecheck is 0, lint is clean — and the two bugs found tonight were both invisible to
every one of those gates. The only thing that catches this class is running the app, and running
the app locally has been blocked for three and a half weeks.

**Recommendation: merge it.**

---

## 5 · Two machine-level snags (Sky's password needed)

Neither is a repo problem; both block local device testing.

**1 · CocoaPods can't run in this shell.** `LANG` is empty and `LC_CTYPE=C`, so `pod install` dies
with `Unicode Normalization not appropriate for ASCII-8BIT`. Workaround used tonight:

```bash
cd ~/AccessMap/ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
```

Permanent fix — add to `~/.zshrc`:

```bash
export LANG=en_US.UTF-8
```

**2 · Xcode was never actually selected, and its first-launch was never accepted.**

I first read this as a false alarm — `xcode-select -p` returns
`/Applications/Xcode.app/Contents/Developer`, so the tooling's "Xcode is installed but not
selected" looked wrong. It isn't. Two checks settle it:

- `/var/db/xcode_select_link` — **does not exist.** That is the symlink `xcode-select -s`
  writes. With no link, `xcode-select -p` is reporting a *default*, not a selection.
- `xcodebuild -checkFirstLaunchStatus` — **exits 69.** The first-launch / license step has never
  been completed.

Both need sudo, so Sky has to run them:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

```bash
sudo xcodebuild -runFirstLaunch
```

Until then the interactive simulator panel cannot attach, and there is **no tap injection
available** — `simctl` has no tap/touch verb and `idb` is not installed. Screenshots and app
launch work; navigating the UI does not.

---

## DECISIONS FOR SKY

1. **Merge `fix/fmt-xcode26-local-sim-2026-07-25`** (or this branch, which carries it). It
   unblocks local simulator testing — the only gate that would have caught either bug tonight.
2. **Merge this branch** for the `findNodeHandle` fix — real, reproduced, 3 new tests.
3. ~~Answer the two questions in §3~~ — **answered by the device repro. §3 is closed.**
4. **Do you want the glass long-press flip back?** It is gone on purpose. If you miss it, it
   should return as a visible Settings row, not a hidden gesture.
5. **Triage the 46 stashes** — separate pass.
