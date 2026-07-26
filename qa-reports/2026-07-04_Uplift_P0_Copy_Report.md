# AccessMap UPLIFT — P0: Copy & Mechanical Honesty — RESULT

**Date:** 2026-07-04 · **Branch:** `uplift/p0-copy` (8 commits off `main@82e738b`) · **Model:** Opus 4.8 ultracode, max effort
**Design authority:** `design-reviews/fable-audit/2026-07-04_AccessMap_Design_Review.md` (Phase 0) + `02_findings.md`
**Status:** ✅ **All five members CLOSED. STOPPED on the branch — NOT merged, NOT pushed, NOT built.** Sky merges; one EAS build carries everything; the device gate is hers.

---

## Pre-flight gate — PASS
`main` tip **is** the audited HEAD `82e738b`; the full glass chain (Tasks A–D, W2 Profile, map-1→4) is merged; `uplift/p0-copy` was a fresh branch. Green base re-confirmed before the first edit (typecheck 0 · lint 0 errors/77 warnings · the one pre-existing jest flake noted below).

## Build gate — PASS
- **typecheck:** 0 errors.
- **lint:** 77 problems (0 errors, **77 warnings = the exact baseline, 0 new**).
- **jest:** 1740 passed / 84 todo / **1 pre-existing failure** — `TasksScreenFlagCard.test.tsx:115` (`/ago$/` relative-time assertion) fails **identically on pristine `main@82e738b`** (a date-dependent flake, today = 2026-07-04); P0 never touches TasksScreen. Flagged as a separate task (chip: "Fix date-dependent flake in TasksScreenFlagCard test").
- Updated `ReportFlagModal.test.tsx`: **36/36** green.
- `git diff main` = 12 intended files only; clean tracked tree.

## Adversarial verification — 5 independent skeptics, all PASS
One agent per member re-read the committed diff **and the live code**, checking every field-(7) requirement + the named PROTECT invariants + scope. Verdicts: **S5, S18, S15, S19, S20 all `closed=true / protectOk=true / scopeOk=true`, zero blockers.** Two *minor* S15 voice nits surfaced; one fixed (below), one judged defensible by the verifier itself.

---

## Per-member results

### S5 — Report pill starts a report · CRITICAL · L3-1 · `2d50784`
**Changed:** `MapScreen.tsx` openReport effect now fires `if (!dropLocation) void requestLocation()` before opening (mirrors the FAB); `onRequestLocation` prop wired into `ReportFlagModal`, which renders a 44pt **"Use my location"** retry when `!location`; the disabled submit gained an `accessibilityHint` stating the reason.
**Verified (web):** guest, no geolocation grant → Home "Report" pill → the sheet shows the retry button + spoken reason instead of the old permanently-disabled dead end. `location.test.ts` untouched. PROTECT-3/8/6 intact. Native deny-path = code-inferred. Skeptic: byte-clean, no eslint regression.

### S18 ①② — "Submit report" label + banner reflow · CRITICAL · L5-03 · `70b6834`
**Changed:** submit visible text → **"Submit report"** (both modes); accessible name → "Submit report anonymously" (anon) / "Submit report" (auth) — name contains visible text ⇒ **WCAG 2.5.3 PASS**; title + banner still state anonymity. Anon banner `flexWrap` + info-block `flexBasis` so "Sign in" wraps below and the sentence keeps word-boundary wrapping. Tests updated.
**Verified (web @ 200%/200px):** banner wraps on word boundaries (mid-word shred gone), "Sign in" on its own line, submit label stays inside its pill. **Item ③ (header collision) confirmed absent — deferred to P2 (rides S8).** PROTECT-3/4/8/10 intact.

### S15 — first-run honesty copy · L1-2(copy)/L1-8/L8-4/L8-11/L8-14 · `d60df92` + follow-ups `a02a7da`,`abff4b1`,`b7a2e81`
**Changed:** (1) SignIn guest copy corrected — anonymous reporting stated as available, the true "verify/resolve needs an account" kept (L1-5). (2) Photo/tap over-promise softened on **both** OnboardingCards slide 2 **and** HowToHelp step 1 (photo qualified signed-in-only). (3) Submit-moment sentence added above the footer. (4) Noun canon (safe prose half): "Couldn't load barriers", "Most recent barriers", "flags waiting to be verified", "No … flags in this area".
**Two follow-ups the process caught:** preview verification caught that the first commit missed **onboarding slide 2** (`a02a7da`); it also surfaced the same-screen "5 barriers" vs "Most recent reports" contradiction (`abff4b1`). Adversarial-verify caught an SR hint/note noun mismatch → aligned to "flags" (`b7a2e81`).
**Verified (web):** slide 2, submit-moment, and "Most recent barriers" all render. SignIn guest block is native-only → code-verified / NEEDS-SKY-DEVICE. **Scope held:** `STATUS_LABELS` unchanged (open→unconfirmed is S1/P2); "My Reports" + "Tasks" names not renamed; anon-sheet exemplar copy untouched (PROTECT-11).

### S19 — consent "Not now" + de-theater · L1-3 · `4ab5cd9`
**Changed:** `showMaybeLater`→`showDecline`, broadened to both permission slides, native-gated; permission-aware label/hint (location "Not now" / notifications "Maybe later"). Web primary CTA relabeled **"Continue"** (text + a11y label + hint) — no web permission request wired.
**Verified (web):** location slide CTA reads "Continue", not "Allow Location". The native "Not now" decline is native-only ⇒ NEEDS-SKY-DEVICE. Denial still never blocks. **Scope held:** relabel only — wiring the guest location request is Fork-3, left for Sky.

### S20 — trust-fallback surfaces · L8-12/L8-13/L8-14 + casing · `0bc4dc5`
**Changed:** Help FAQ — no "Map tab" survives, guest report path named, magnifier described as address search (filters = the sliders), resolved-marker copy corrected. Changelog — v3.0.0 entry prepended (SKY-EDITABLE). Casing — Settings "What's new"→"What's New". About — unanchored "…are open" softened to "built on open tools"; status-log claim made precise ("open any flag's details").
**Verified:** real tab structure (Home/Tasks/Profile) confirmed live; resolved-marker copy **fact-checked against `PlatformMap.web.tsx`** (color = severityColor; resolved swaps glyph for a check). `helpSearch` + `MyReportsModal` tests green. Copy/link only.

---

## Left for Sky (nothing silently dropped)
- **S18 ③** header-title × Feedback-pill collision → **P2** (hard dependency on S8).
- **Fork-3 halves (3, UI/copy half done, structural half is Sky's):** (a) whether the web/guest build should openly **request location** + expose a real **sign-in path** (P0 only relabels/de-theaters); (b) **hide the RLS-refused** Verify/Resolve/Reject triage buttons from guests (L1-5 — not touched); (c) the **structural vocabulary** — rename "My Reports" + the "Tasks" tab, and `STATUS_LABELS` `open→unconfirmed` (owned by S1/P2).
- **SKY-EDITABLE copy drafts:** all S15/S20 prose is drafted in the app's voice for Sky's eye — notably the **changelog v3 bullet list + date**, and the **About "open" claim** (soften shipped; if the repo is public, restore "open source" + add a real link/license — Sky's call).
- **Two verify-first checks resolved in-build:** resolved-marker rendering (confirmed), About "open" claim location (found under Credits, softened).

## Evidence
Web-verified in the Expo-web (Chromium) preview — **not Safari/WebKit**, so WebKit-only CSS is out of scope; native paths tagged NEEDS-SKY-DEVICE. a11y-tree + screenshot captures and the full evidence log: `design-reviews/fable-audit/uplift-assets/P0-verification-evidence.md`.

## Next
Per Sky's sequencing this session: **after P0 is merged → Portfolio P1** (`~/Portfolio`, `uplift/p1-identity` — identity binding + OG card, with its hard mockup gate). Separate repo, separate plan.
