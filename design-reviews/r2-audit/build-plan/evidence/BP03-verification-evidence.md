# BP3 — The trust engine (T4 + T8) — verification evidence

**Branch:** `r2/bp3-trust-hand` · **base/rollback anchor:** `373c582` (== `r2/bp2-perception-floor` tip == main) · **tip:** _(recorded in DECISIONS §P)_
**Date:** 2026-07-17 · **Model law (S-10):** phase file authored **Claude Fable 5 max** (2026-07-15); **executed Opus 4.8 ultracode, max effort, all sub-agents max** — provenance disclosed, per Sky's direction for this train.
**Closes:** T4 (F1-01 + F1-08) · T8 (F4-02, F4-08, F4-10, F4-17, F4-01 badge-doubling leg).

Every claim below is tagged: **[verified]** (ran a gate/tool first-hand) · **[code-inferred]** (read the committed source) · **[web-verified]** (static-export probe) · **[NEEDS-SKY-DEVICE]**.

---

## 1 · What shipped, per commit-plan item

| Item | Commit | What landed | Tag |
|---|---|---|---|
| 1 · T4 report-sheet | `49fd538` | All 10 ReportFlagModal Pressables gain a fill-composited pressed dim (`chipPressed`=`color.borderPressed`, the house idiom; Submit uses a gradient scrim), gated to the neutral/inactive state so an active brand fill is never dimmed under white text. `hapticSelection` moved to `onPressIn` on the category + severity pickers. Submit keeps `hapticNotify('success')`. | [verified] |
| 2 · T4 triage haptics | `dbfa19b` | `hapticImpact('medium')` + `hapticNotify('success')` at the top of the shared `applyStatusChange` (covers all 3 actions + both callers, always post-Reject-confirm); `hapticNotify('error')` at the top of `setStatus`'s catch (both branches). The 3 commit actions get `haptic='none'`; Details keeps `'selection'`, threaded via `haptic={a.haptic}`. | [verified] |
| 3 · T8 spoken recompose | `18b6e94` | FlagCard `baseLabel` + selection label route through `severityA11y`/`statusA11y`; each action a11yLabel gains `— ${category}${, distance?}` (null-guarded on `distanceInfo`); Home distance-branch keeps `statusA11y`; Legend sevDot adopts `{...decorativeProps}`; photo nudge interpolates `SEVERITY_LABELS[severity].toLowerCase()`, retiring "major". (Test co-evolved: the S13 summary-label assertion updated to the taught grammar.) | [verified] |
| 4 · PROPOSED strings (ships nothing) | — | Recorded in §4 below — the `'Resolved'→'Resolve'` verb flip + the photo-nudge visible change, for BP16's copy gate. No code shipped. | [code-inferred] |
| 5 · guards + arbiter | `db61189` | `bp3TrustEngineGuards.test.ts` (source contracts) + 3 behavioral FlagCard guards + the arbiter `r2-report-ack-stacks.json`. | [verified] |

---

## 2 · Gate results

| Gate | Result | Tag |
|---|---|---|
| `npm run typecheck` | **0 errors** | [verified] |
| `npm run lint` | **0 errors, 77 warnings** — all pre-existing, in files BP3 did not touch (flags.ts, flagsStore.tsx, NearbyFlagsModal.tsx); matches the BP2 `0/77` baseline exactly. **No new warnings.** | [verified] |
| `npm test` | **1944 passed / 0 failed** (+84 todo), 131 suites. Baseline **1929** (BP2 tip) + **15** BP3 guards. The one existing assertion the T8 label change touched (`TasksScreenFlagCard.test.tsx` S13 summary) was updated to the taught grammar and amended into commit 3. | [verified] |
| **Arbiter** `r2-report-ack-stacks.json` | **ALL PASS, exit 0** (measured, `contrast-check.mjs`). Light: neutral **9.78:1**, brand **5.42:1**, submit **5.09:1**. Dark: neutral **8.37:1**, brandText **5.07:1**, brandOnSoft **7.17:1**, submit **5.09:1**. All ≥ 4.5 AA. | [verified] |
| Diff scope | **Exactly 6 tracked files**: ReportFlagModal / TasksScreen / HomeScreen / LegendModal + 2 test files. No PROTECT file, no stacks file, no `.claude/launch.json` in the diff. | [verified] |
| 7 immutable prior stacks files | **Untouched** — none appears in the phase diff. | [verified] |

---

## 3 · Drift reconciliation (spec `a8549ff` → base `373c582`)

Every cited mechanism was **ANCHORED** (re-grepped before editing; 3 Explore agents). Line numbers shifted but no mechanism moved construct or vanished. Notable adaptations recorded honestly:

- **jest baseline is 1929, not the 1857 the phase file cites** (1857 +56 BP1 +16 BP2). BP3 grew it to 1944.
- **PhotoGallery pressed idiom** has two forms; the spec named both `thumbPressed`/`removeBtnPressed`, but `thumbPressed` is `opacity:0.75` (group opacity — the exact thing the absorbed FIX forbids). BP3 used the **background-swap** form via the app's own `color.borderPressed` token (FilterPresetsModal/MyReportsModal/LeaderboardScreen), never the opacity form.
- **FlagDetailModal** is under `src/components/` (not `screens/`) and fires **no haptic** → no double-fire risk from placing the outcome haptics in the shared `applyStatusChange`.
- **Probe path drift:** `probe-f401-*.mjs` live under `design-reviews/r2-audit/tools/` (not top-level `tools/`).
- **LegendModal sevDot is the only sibling with a text glyph** — the 3 sibling swatches (114/131/163) carry icons/dots, no digit, so scoping decorativeProps to the sevDot is complete, not partial.

---

## 4 · PROPOSED strings (item 4 — ships nothing this phase; for BP16's copy gate)

Per S-8, strings are proposed-only. Recorded here with before/after:

| Surface | Before | After (PROPOSED) | Notes |
|---|---|---|---|
| Tasks FlagCard verb — `TasksScreen.tsx:1549` (`label`) | `Resolved` | `Resolve` | a11yLabel "Mark this flag resolved" is KEPT. |
| FlagDetail verb — `FlagDetailModal.tsx:1436` (visible) | `Resolved` | `Resolve` | Same flip; unifies the two surfaces; the "Verify" sibling is already imperative. |
| **Test-lockstep for the flip** | — | — | `TasksScreenFlagCard.test.tsx:128/157/170` assert the literal `'Resolved'` (getByText) — they must flip in lockstep when BP16 lands the verb. |

**Shipped-but-user-visible de-drift (flagged for Sky's eye):** the severity-4 photo nudge changed **"major barrier" → "significant barrier"** (`ReportFlagModal.tsx:953`, plus the two a11y announce sites). This is not new copy — it retires an invented word ("major" is absent from the taught `SEVERITY_LABELS`) in favour of the app's own severity-4 label ("Significant"). The report ships this as a mechanic (commit-plan item 3). Severity-5 text ("severe") is unchanged.

**F4-01 color-name-vocabulary SR leg: PARK-with-direction** (per the absorbed FIX) — BP3 scoped F4-01 to the badge-doubling leg only. The color-name-on-role-generic-rows leg is recorded here as parked, not dropped.

---

## 5 · PROTECT preservation

| PROTECT surface | How preserved | Tag |
|---|---|---|
| **PROTECT-3** ReportFlagModal sheet architecture | Footer (`actions`), the Submit double-submit guard `disabled={submitting \|\| !location}`, and the sheet structure are byte-unchanged; the only additions are the pressed-style callbacks + the `onPressIn` haptic move + the photo-nudge string. | [code-inferred] |
| **haptics.ts RM-independence** | `src/lib/haptics.ts` is **not in the phase diff** — byte-untouched; BP3 only calls the existing API. | [verified] |
| **Confirm-gate-on-Reject** | `setStatus`'s `status==='rejected' → confirm() → early return on cancel` is byte-intact; the commit haptic lands inside `applyStatusChange`, reached only AFTER the gate. | [code-inferred] |
| **PROTECT-18** LiveStatusRegion announce | `AccessibilityInfo.announceForAccessibility` calls unchanged in both screens. | [code-inferred] |
| **PROTECT-1** Nearby row labels + **GlassSurface** | `NearbyFlagsModal.tsx` and `GlassSurface.tsx` are **not in the phase diff**. | [verified] |

_Frame captures: the pressed FEEL is a transient press state + haptic (device-only); PROTECT byte-preservation is proven by diff-absence + source read above rather than screenshots. See §6._

---

## 6 · Adversarial verification (ultracode fan-out)

4 skeptics (Opus 4.8, max effort) each read the committed diff + source and tried to **refute** one axis. **Result: 4/4 UPHELD, 0 refutations, all high-confidence.** [verified]

| Lens | Verdict | Key first-hand evidence |
|---|---|---|
| **haptic-correctness** | UPHELD (high) | `hapticImpact('medium')`+`hapticNotify('success')` are the sole commit point in `applyStatusChange`, called only post-`await updateFlagStatus`; Reject confirm early-returns BEFORE any commit; the 3 commit buttons pass `haptic='none'` and `PressableScale` fires nothing for `'none'` (no press-tick to double the landing); `updateFlagStatus` throws `FlagStatusConflictError` on a CAS no-match, so success never fires on a no-op. **FlagDetailModal fires no haptic of its own** (grep empty; its buttons are plain `Pressable`) → no double-fire. |
| **aa-pressed-correctness** | UPHELD (high) | Exactly 10 pressed dims (9 `chipPressed` + the submit scrim); the ONLY `opacity` in the file is `submitBtnDisabled {opacity:0.6}` — the disabled state (WCAG-exempt), not a pressed dim. Every active-state control gates the dim with `!active`. All 4 inks modelled in both schemes; every arbiter hex matches the live token byte-for-byte; **independent WCAG re-derivation of #0F53BE on #dde3eb = 5.417:1 ≈ the tool's 5.42:1.** |
| **a11y-voice-correctness** | UPHELD (high) | Both helpers route correctly; `actionSubject` is null-guarded so no bare/duplicate comma is ever produced; Home places `statusA11y` before the distance; `decorativeProps` lands on the digit container, the authored-label row untouched; exactly 3 nudge sites, zero `'major'`. All composed strings grammatical. |
| **protect-preservation** | UPHELD | No PROTECT file in the diff; the Submit guard + confirm-gate + announce calls byte-intact; only the sanctioned dims/labels changed. |

**One nit surfaced (recorded, out of scope):** the haptic skeptic noted `FlagDetailModal`'s own `runStatusChange` catch does **not** fire an error haptic on failure (it shows a visible `notify()` dialog instead) — an asymmetry with the Tasks card's error haptic. FlagDetailModal is **not in BP3's diff scope** and the claim never asserted it; rated "a nit at most." Logged as a candidate for a later phase / §PARKING-LOT, not a BP3 defect.

---

## 7 · Web behavioral proof + NEEDS-SKY-DEVICE

**[web-verified]** Static web export (`npx expo export`, serving the production bundle on :8082 — the dev server crashes Map/Tasks on the lucide lazy boundary, so the export is the audit's sanctioned rig). Ran the banked `probe-export.mjs`:

```
tasks:      RENDERS
map:        RENDERS
nearbyList: RENDERS (auto-opened)
report:     RENDERS
```

All four BP3-touched screens render cleanly on web — **no regression** from the pressed dims, the function-child Submit, the recomposed labels, or the decorativeProps digit. The single `findNodeHandle is not supported on web` pageerror is a **pre-existing** focus-AX web quirk — confirmed **not** introduced by BP3 (`grep findNodeHandle` over the phase diff is empty) — and is non-fatal (every screen still renders).

_The pressed-frame before/after diff + the VoiceOver a11y-tree walk are the device-gated feel checks below; the digit-doubling fix (F4-01) is proven deterministically (guard + decorativeProps' `aria-hidden`, a primitive already used across MyWatchedModal/PlatformMap) and adversarially (skeptic a11y-voice, high confidence)._

**[NEEDS-SKY-DEVICE] (R2-D1-adjacent — the audit's highest-stakes gate):**
- Finger-down selection tick on the category + severity pickers; the signature severity control answers the press.
- Verify = a **medium thunk then a success notify** landing with the flash banner; the failure path gives an **error notify**; commit/outcome haptics feel distinct from the picker's selection.
- Reject still **confirms first**; the commit haptic fires only after confirmation.
- Reduce-Motion ON → the static dims and the haptics both still answer (dims are motionless; haptics ride the OS setting).
- **VoiceOver FlagCard walk:** each card reads **once** in the taught grammar ("No ramp, severity 4 of 5, Significant, status Open…"); each action names its flag uniquely ("Verify this flag — No ramp, …"); Legend rows read one utterance each (no doubled digit).
