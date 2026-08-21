# C7 — ReportFlagModal (SIGNED IN, location GRANTED) + G2 photo path + E1/C8 · Pro Max · sim-release @ bc91789

## ★ SW-37 RE-TEST — ANSWERED
Phase A: anonymous report with location **denied** dead-ended ("Waiting for location…" forever, Submit permanently disabled, no manual-pin fallback).
**Signed in with location granted: the flow completes to the edge.** Header reads **"at 49.26090, -123.11390"** (real coordinates, not a waiting state) and **"Submit report" is `enabled=1`** (194×45 ✓) alongside "Cancel and close" (194×45 ✓).
**Verdict: SW-37 is a location-availability defect, NOT an auth defect.** Auth changes nothing about it; the missing manual-pin fallback remains the real gap for any user who denies location.
**Not submitted** — walked to the edge only, per the Production Law.

## FORM SURFACE (all measured)
- Quick-fill templates ×7 (117–201 × 45 ✓), horizontally scrolled
- Category ×6 (58–117 × 45 ✓) · Severity ×5 (**44×45 — exactly at floor** ✓) with a live explainer line ("Severity 3: Hard for many users.")
- Description TextView 398×79 · Seasonal tags ×5 · "Who does this affect?" ×5 · Context tags ×9 (all ≥45 tall ✓)
- Honest limits stated in copy: "Up to 5. Leave empty if none.", "Counts toward the same 5-tag limit."
- Consent/expectation line: "Your report appears on the map right away for everyone; neighbours can verify or resolve it."

## G2 PHOTO PATH — WALKED (this is new coverage; Phase A had no photo data)
1. **Add photo** (96×97 ✓) → action sheet **Take photo / Choose from library / Cancel** (288×48 each ✓). Camera = DEVICE-ONLY.
2. **OS photo-library permission dialog fired correctly on user action** — *"“Flagstone” would like full access to your Photo Library."* (rename correct ✓). Options **Limit Access… / Allow Full Access / Don't Allow**, all 288×49 ✓. Granted Full Access to proceed.
3. Picker loaded 6 sim photos (2009–2018). Selected one → **attached**.
4. Attached state: **"Photo 1 of 1"** thumbnail (96×97 ✓), **"Remove photo 1"** (**28×29 — under floor, SW-50**), and a second **"Add photo"** slot (multi-photo supported).
5. **E1 PhotoGallery / C8 PhotoLightbox reached**: tapping the thumbnail opened a full-screen lightbox [0,0,440,956] with **"Close photo"** 44×44 ✓; close worked.

## ★ EXIF / SANITIZE GATE — code-verified, not observable without submitting
The UI promises *"Location data is automatically removed from your photos before they are uploaded."* That wording is **accurate and correctly placed**: `sanitizeImageMetadata` runs inside the **upload** pipeline (`flags.ts:810`, "byte-level metadata sanitizer … splices"), i.e. on submit — not at attach time. So attaching a photo (as done here) legitimately does not trigger it, and **the sanitizer could not be observed executing without creating a real flag**. The source photo genuinely carried location (`loc=true` in the picker's file URL, `logs/console-authed.log` 17:05:39), so the gate has real input to strip on a real submit. **Banked as write-gated coverage, not as a pass or a fail.**

## POSITIVES WORTH KEEPING
- **A per-photo alt-text field**: "Describe the photo for screen reader users (optional)" appears as soon as a photo is attached. This is a genuinely above-average accessibility feature for a UGC app and should survive Phase B untouched.
- The EXIF promise is stated **in the form, next to the control**, before the user picks — not buried in the privacy policy.
- The permission dialog fired only on explicit user action (privacy gate honoured, consistent with Phase A).

## FINDING RAISED
SW-50 — "Remove photo 1" at 28×29pt.
