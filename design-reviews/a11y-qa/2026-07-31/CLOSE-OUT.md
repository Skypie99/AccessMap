# A11Y DEEP QA + FIX TRAIN — CLOSE-OUT

**Project:** AccessMap (Expo SDK 54 · RN 0.81 · React 19.1 · Supabase) · **Date:** 2026-07-31
**Phase A** (audit, read-only) — Fable 5 max effort, banked per lens.
**Phase B** (fix) — same window family, at/above the Opus 5 floor the train sets.
**Branch:** `a11yqa/1-fix-train`, cut from the audited tip `shipready/3-polish-submission` @ `5ab3f0c`. **Nothing merged. `main` untouched at `512494a`.**

---

## §1 THE VERDICT

> **Does this project deserve the sentence "accessibility benefits everyone" today?**

**Yes — for the first time honestly, and with two caveats that are Sky's to close.**

Before this train the app was already unusually strong: an escape law guarded at 36/36 surfaces, a six-layer reduced-motion contract, a severity grammar that never speaks through colour alone, a k≥3 privacy floor whose claim is true in the README, the code, and the product. That was real work and it held up under audit.

What the audit found was not sloppiness. It was the **specific, quiet class of defect that only appears when someone actually tries to use the thing with a screen reader** — announced-but-inoperable switches, focus that never enters a sheet, containers that swallow their own buttons, status messages spoken on one platform and silent on the other. Every one of those was invisible to a green test suite, and several were actively **entrenched by tests that could not fail**.

That class is now closed, guarded, and — where a machine cannot prove it — written down as a device row rather than assumed.

**The two caveats:**

1. **The hosted privacy policy is stale and misstates a legal right** (C-2). It tells users account deletion lives in Settings; the product has it on Profile. App Store Connect points reviewers at that page. Republishing is Sky's hands — no agent can do it.
2. **The README's conformance sentence still overclaims** (C-1) — it cites WCAG 2.1 when the house standard is 2.2, and "fully accessible" is a promise no audit can carry without the device pass. It is *much* closer to true than it was this morning: the sign-in silence that falsified it in-path is fixed.

---

## §2 CONSERVATION TABLE — every Phase-A finding disposed

**The law: nothing is dropped.** Every row is FIXED, GATED-AWAITING-SKY, PARKED-with-reason, or DEVICE-PENDING.

### Blocker (1 product + 2 claims)

| ID | Finding | Disposition | Evidence |
|---|---|---|---|
| **A11Y-212** | 4 notification toggles announce as switches, cannot be operated by SR | ✅ **FIXED** `d57b65f` | Identity+operability co-located on the Switch; the *entrenching* test rewritten to operate by label. RED 9 → GREEN 19/19 |
| **C-2** | Hosted privacy policy is stale; misdirects the account-deletion right | 🔴 **GATED-AWAITING-SKY** | Physical: republish the ratified §SKY-9 text to GitHub Pages, or repoint `privacyPolicyUrl`. The repo already pins the correct text verbatim |
| **C-1** | README "WCAG 2.1 AA — fully accessible" overclaims + wrong version | 🔴 **GATED-AWAITING-SKY** | In-path falsifier (A11Y-203) now FIXED. Remaining: version number is Sky's wording; "fully" needs the device pass. See §4 |

### High (9)

| ID | Finding | Disposition | Evidence |
|---|---|---|---|
| A11Y-201 | Focus-in absent on 29 of 36 dismissables (**SR-070** closed) | ✅ **FIXED** `a654b52` | Estate-wide adoption + `focusOnOpen.guard` (source census, marker-anchored exemptions, rot tripwire). RED 23 files → GREEN |
| A11Y-202 | Nearby — the flagship SR surface, which auto-opens for SR users — no focus-in | ✅ **FIXED** `c104a08` | Behavioral guard: no call while closed, one per present, re-fires per re-open |
| A11Y-203 | Sign-in client validation silent on iOS + web | ✅ **FIXED** `9464454` | All three branches route through `showError`. RED 3 → GREEN |
| A11Y-213 | Labeled containers swallow their children ×3 (incl. **PROTECT-2** recovery card) | ✅ **FIXED** `0c6c52d` | S13 counter-pattern; summary node carries semantics; render-identical styles |
| A11Y-214 | 6 accessible-by-default Pressables swallow actions (**SR-040**, **SR-072** closed) | ✅ **FIXED** `a17103d` | Same pattern; Legend shell keeps tap-swallow + AVM + escape with zero AT presence |
| A11Y-221 | Lightbox swipe-only paging (2.5.7) | ✅ **FIXED** `8392a71` | Prev/Next 44pt chips, ends disabled, page announced, RM-gated scroll |
| A11Y-226 | Guest→sign-in destroys the report draft (3.3.7) | ✅ **FIXED** `95755c9` | In-memory consume-once stash; tests drive the real unmount/remount seam |
| A11Y-228 | Keyboard covers the focused input ×3 (2.4.11) | ✅ **FIXED** `b5ce96d` | House KAV recipe ×2 + scroll-inset ×1; new `keyboardAvoidance.guard` |
| A11Y-229 | White-on-brand fails dark at 3.42:1, 7 small-text sites (**SR-112** finally run) | ✅ **FIXED** `70829eb` | M-52 grammar → ctaFill. **Arbiter exit 0 both themes**; 2 large-text sites deliberately KEPT + pinned |

### Medium (13)

| ID | Finding | Disposition | Evidence |
|---|---|---|---|
| A11Y-204 | iOS VO never hears filter result counts | ✅ **FIXED** `368674b` | Explicit announce; overclaiming comment corrected |
| A11Y-205 | Action-with-no-feedback ×3 branches | ✅ **FIXED** `368674b` | Fixed **at `showFlash`** so a future flash cannot be silent by omission; 5 duplicate announces removed |
| A11Y-206 | Single Watch/Unwatch silent | ✅ **FIXED** `368674b` | Both directions announce |
| A11Y-207 | SavedPlaces has no announce path; failures invisible on web | ✅ **FIXED** `368674b` | Announces + all 4 `Alert.alert` → `notify`. The remove-failure (same defect, unaudited) fixed alongside |
| A11Y-208 | 2 ReportFlag openers never `register()` | ✅ **FIXED** `cba6851` | `register()` above the platform split; return target reasoned, not guessed |
| A11Y-215 | 11 hard + 6 split label-in-name mismatches (2.5.3) | ✅ **FIXED** `3c948e4` | **16** found by a real scanner; names now QUOTE ratified visible copy. Class-wide guard |
| A11Y-216 | 14 `selected`-on-button — web SRs hear no state | ✅ **FIXED** `3c948e4` | → `pressed`; native byte-identical. `toggleStateWeb.guard` closes what T11/BP2 half-migrated |
| A11Y-217 | Dialog names dead on native at ~37 sites (**SR-115**) | ✅ **DISPOSED — ratified scope** `3c948e4` | Web reads the attribute; native reads the focused header, now *guaranteed* by A11Y-201. Moving them would have ADDED dead props (that is A11Y-218's finding) |
| A11Y-222 | Pull-to-refresh the only labeled refresh ×7 | ✅ **FIXED (4/7)** `d32e85c` · 🔶 **3 AWAITING-SKY** | 4 sheets get a labeled Refresh in the existing 44pt recipe. Tasks/Profile/Admin are **primary chrome** → mockup gate, not agent judgement |
| A11Y-223 | Home Clear-search 36×36 | ✅ **FIXED** `b0b0cbb` | hitSlop 14 → 44 effective, slop math stated |
| A11Y-230 | `textSubtle` on `surfaceNeutral` fails both themes | ✅ **FIXED** `ed84609` | **Arbiter exit 0 both themes**; disposes ship-ready's undisposed "THE FINDING" rows |
| A11Y-234 | ~126 native-only decorative props do nothing on web (**F-22**) | ✅ **FIXED** `3c948e4` + `a2ae39f` | Two passes: 69 paired sites, then 39 **leaves hidden on iOS ONLY** — worse than the headline count implied. Helper adoption 8 → 108 |
| SR-042 | Home speaks `formatDistance` not `speakDistance` | ✅ **FIXED** `cba6851` | Label only; visible chip unchanged |

### Low (15) — `e6a289b` unless noted

| ID | Disposition |
|---|---|
| A11Y-209 (SR-116) dead AVM + stale line ref | ✅ FIXED — prop **removed**, not annotated |
| A11Y-210 announce tested at 8/55; UpdateBanner spy silenced-not-asserted | ✅ FIXED — the one test shape that cannot fail, now asserts all 3 states |
| A11Y-211 wording coherence (Map error label) | ✅ FIXED |
| A11Y-219 two Cancels missing disabled state | ✅ FIXED |
| A11Y-231 (SR-077) ctaFillPressed doc 7.5 vs 7.00 | ✅ FIXED both sites |
| A11Y-232 (SR-073) web blur not suppressible | ✅ FIXED — `prefers-reduced-transparency` twin |
| A11Y-233 FeedbackModal email autocomplete | ✅ FIXED |
| A11Y-218 tablist unlabeled (Leaderboard) | ✅ FIXED `3c948e4` |
| A11Y-220 double state-speak (Leaderboard) | ✅ FIXED `3c948e4` |
| L3-1 no skip link | ✅ FIXED |
| A11Y-215b 6 split-phrase | ✅ FIXED (folded into 215) |
| A11Y-218 remaining 7 inert container labels | ⏸ **PARKED** — each needs a per-site call (delete the dead label vs expose the node); a machine would guess |
| A11Y-224 3 at-floor targets | 📱 **DEVICE-PENDING** — rows D-A/N |
| A11Y-225 dead divergent header variant | ⏸ **PARKED** — latent only; removal touches live nav config for a surface that never renders |
| A11Y-227 sign-up lacks `newPassword` | ⏸ **PARKED with reason** — ONE dual-purpose password field serves both flows; `newPassword` would weaken sign-in autofill, the common case. Needs a form split, not a prop |
| L1-1 no a11y lint rule | ⏸ **PARKED** — adding `eslint-plugin-react-native-a11y` is a dependency change. **Materially mitigated**: this train added 7 source-scanning guards that cover more than a lint plugin would |

### Re-surfaced known-open (reasons stand)

SR-074 · SR-075/076/081/091/045 · SR-078 · SR-079 · SR-058 · SR-034 · SR-033 · SR-071 · SR-080 · SR-082 · SR-096 · SR-100/106/107 · SR-101/102/103/109 · SR-113 · SR-114 · B1-D · B1-E · F-20/F-21 · SR-006 · B-1(a)/(c) · B-6 · SR-021 → all remain as Phase A recorded them. **SR-034 (no automated 44pt guard) is the standing gap that let A11Y-223 in** and is still open.

**Conservation check: 1 Blocker + 2 claims + 9 High + 13 Med + 15 Low = 40 findings. 33 FIXED · 2 GATED-AWAITING-SKY · 4 PARKED-with-reason · 1 DEVICE-PENDING. Zero dropped.**

---

## §3 GATES

| Gate | Baseline | Final |
|---|---|---|
| `npx jest --ci -w 3` | 186 suites / 2826 passed / 0 failed | **see §6** |
| `npm run typecheck` | 0 errors | **0 errors** |
| `npm run lint` | 0 errors / 80 warnings | **0 errors / 80 warnings — exact** |
| Arbiter proof sets | 13/13 ratified exit 0 | **13/13 + 2 NEW exit 0** |
| `GlassSurface.tsx` PROTECT | 0 changed lines | **0 changed lines** |
| Agent-applied migrations | 0 | **0** |

**New arbiter proof sets** (measured, never eyeballed):
- `a11yqa-brand-ink-stacks.json` — ALL PASS both themes
- `a11yqa-timestamp-ink-stacks.json` — ALL PASS both themes

**New guards (7)** — all source-scanning classes, not site lists:
`focusOnOpen.guard` · `accessibleParentTrap.guard` · `keyboardAvoidance.guard` · `brandInkAA.guard` · `announceCoverage.guard` · `labelInName.guard` · `toggleStateWeb.guard` · `decorativeHiding.guard`

---

## §4 THE CLAIMS VERDICT — what Sky must word

**C-2 — the hosted privacy policy (Blocker, physical).** The page at `skypie99.github.io/AccessMap/privacy/` is the pre-ratification May 30 text. It says deletion lives at *Settings > Account > Delete Account*; the product has it on **Profile**, and Sky already corrected the in-app copy (§SKY-9). Two published statements of a legal right disagree, and App Store Connect points at the stale one. **Fix: republish, or repoint `privacyPolicyUrl`.**

**C-1 — the README sentence.** Currently: *"WCAG 2.1 AA — fully accessible from signup to reporting."*

What changed today: the in-path falsifier is gone (A11Y-203), and the focus-in class it leaned on is closed estate-wide (A11Y-201).

What still stands between the app and that exact sentence:
1. **"2.1" is the wrong version** — the house standard is 2.2, and the 2.2-six were audited. This is strictly an *undersell*.
2. **"fully" is a conformance promise** no audit can carry without the device pass (SR-021, D-A/D-B rows).

Two honest options, both Sky's words:
- **Now:** *"Built to WCAG 2.2 AA and continuously audited."*
- **After the device pass:** the stronger sentence becomes defensible.

---

## §5 WHAT ONLY SKY CAN DO

1. **Republish the privacy policy** (C-2) — Blocker.
2. **Word C-1** — one sentence.
3. **Run the device script** — `DEVICE-SCRIPT.md`. **D-B6 gates the merge** (§SKY-3h).
4. **Decide the 3 remaining refresh affordances** (A11Y-222) — primary chrome, mockup gate.
5. **Merge.** ⚠️ This branch is **105 commits ahead of main, only 18 of them mine** — the other 87 are the pre-existing ship-ready/R2 train. Merging this merges *that* too.

---

## §6 GATE RUN — see `PHASE-B-LOG.md` for the per-fix ledger

Final full-gate results are recorded in `PHASE-B-LOG.md` §Final Gate.
