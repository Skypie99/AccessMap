# P0 (Copy & Mechanical Honesty) — verification evidence

Branch `uplift/p0-copy` off `main@82e738b`. Web-verified in the Expo-web preview (Chromium — **not** Safari/WebKit, so WebKit-only CSS is out of scope; native paths tagged NEEDS-SKY-DEVICE). Before-states = the audit's `../assets/annotated/L*.png`; after-states below are live a11y-tree + screenshot captures from this session.

## S5 — Report pill starts a report (CRITICAL, L3-1) · web-verified
Guest, no geolocation grant: Home "Report a barrier" pill → report sheet. a11y-tree (after):
```
heading: "Report anonymously"
"Waiting for location…"
button: "Use my location"          ← NEW in-sheet retry (was absent; dead end)
alert: "Reporting anonymously. Your identity is not stored."
link:  "Sign in"                    ← still a sibling OUTSIDE the alert (PROTECT-8)
…
button: "Submit report anonymously" (visible "Submit report")
```
The old dead-end ("Waiting for location…" over a permanently-disabled submit with no recovery) is replaced by a 44pt "Use my location" retry + a spoken reason on the disabled submit. requestLocation now fires from the openReport effect (mirrors the FAB). **Screenshot captured** (report sheet @375). Native permission-denied retry loop = code-inferred.

## S18 ①② — "Submit report" + banner reflow (CRITICAL, L5-03) · web-verified @ 200%
- Submit button: visible **"Submit report"**, accessible name **"Submit report anonymously"** → the accessible name CONTAINS the visible text ⇒ WCAG 2.5.3 PASS. Title "Report anonymously" + the anon banner still state anonymity.
- At the 200%-zoom-equivalent squeeze (200px viewport) the banner wraps on **word boundaries** ("Reporting / anonymously — / your identity is / not stored.") and the **"Sign in" link drops to its own line** — the finding's mid-word shred ("Reporti/ng/anonym/ously") is gone. The submit label wraps but stays **inside its pill** (no overflow toward Cancel). **Screenshot captured** (200px reflow). Item ③ (header collision) deferred to P2 — not touched.

## S15 — first-run honesty copy · web-verified
- Onboarding slide 2 (after): *"Find the spot on the map and add the barrier there… (Signed-in users can add a photo, too.)"* — was *"Tap where the barrier is, snap a photo if you can…"*.
- Submit-moment sentence renders above the footer: *"Your report appears on the map right away for everyone; neighbours can verify it. AccessMap doesn't notify the city — see Resources."*
- Home: header "5 barriers" + subtitle now "Most recent barriers" (was "Most recent reports") — same-screen contradiction resolved.
- SignInScreen false-copy correction (native guest block; web is guest mode so this screen doesn't render on web) = code-verified / NEEDS-SKY-DEVICE.

## S19 — consent "Not now" + de-theater (L1-3) · web-verified
Location slide (slide 3), web: primary CTA now reads **"Continue"** (a11y-tree `button: "Continue"`), NOT "Allow Location" — no longer masquerades as a grant (relabel only; wiring is Fork-3). The native "Not now" decline is native-only by design ⇒ NEEDS-SKY-DEVICE.

## S20 — trust-fallback surfaces · code-verified + fact-checked
- Real tab structure confirmed live: **Home / Tasks / Profile** (no "Map tab") — the FAQ navigation fix is accurate.
- Resolved-marker claim checked against `src/components/PlatformMap.web.tsx`: pin color = `severityColor(flag.severity)` (kept on resolve); resolved swaps the category glyph for a check (`pinGlyphSvg(category, resolved)`). The corrected FAQ copy ("keep their severity color… marked with a checkmark") matches the real rendering.
- FAQ/About/Changelog/casing are deterministic static strings — code-verified; `helpSearch` + `MyReportsModal` tests green.

## Build gate (final)
- typecheck: 0 errors. lint: 77 problems (0 errors, 77 warnings) = the pre-existing baseline, **0 new**.
- jest: 1740 passed, 84 todo, **1 pre-existing failure** — `TasksScreenFlagCard.test.tsx:115` (`/ago$/` relative-time assertion). Confirmed to fail **identically on pristine `main@82e738b`** (date-dependent flake, today = 2026-07-04); untouched by P0. Flagged for a separate fix.
- My updated `ReportFlagModal.test.tsx`: 36/36 green.
