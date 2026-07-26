# BP10 / T5 — Verification Evidence — the severity grammar speaks everywhere severity renders

**Provenance (S-10):** phase spec authored on Claude Fable 5 (2026-07-15); this build EXECUTED on
**Opus 4.8 ultracode, max effort** (Sky-initiated, plan approved via ExitPlanMode 2026-07-17). Disclosed, never silent.

**Branch:** `r2/bp10-severity-grammar` · **base (rollback anchor):** `8a190a3` (tip of `r2/mp5-admin-editorial`, O-1 = INCLUDE) · **STOPPED on branch — never merged/pushed/deployed.**

**Baseline reconciliation:** the spec's "1857 at a8549ff" is the stale audit-HEAD figure. The real baseline at the `8a190a3` base is **1944 passed / 84 todo / 2028 total, 131 suites** (confirmed by a clean run before any edit — matches DECISIONS §P BP9). All growth below is guards this phase added.

---

## What shipped (per commit-plan item, in order)

| # | Commit | SHA | What landed |
|---|---|---|---|
| 1 | SeverityDisc primitive + 4 zero-delta adoptions | `bb3b93f` | `src/components/SeverityDisc.tsx` (size/digitSize/mfm/decorative; ink fork baked; `borderRadius: radius.circle`; decorative via house `decorativeProps`). Adopted at Legend 32/14, Nearby 32/13, ActivityFeed 28/12, RecentlyViewed 24/12+1.3 — each dropped its private `sevDot`/`sevDotText` StyleSheet + now-dead `severity`/`severityColor` imports. bp3 F4-01 guard relocated to the primitive. |
| 2 | FlagDetail chip word + stake line | `7dbede6` | chip `"Severity {n}"` → `"Severity {n} · {word}"`; new quiet stake line (`SEVERITY_DESCRIPTIONS`, flags.ts) under the meta row; a11y stays pinned to `severityA11y` (the "of 5" anchor). |
| 3 | Home Recent dot → numbered mini-disc | `d87ec05` | 11px dot → `<SeverityDisc size={24} …>`; dead `styles.dot` removed; `sep` marginLeft 40→52 (realign under the text). |
| 4 | Signed-in mirror surfaces + a11y sync | `9dadf23` | Profile pill `· severity 3` → `· Severity 3 · Moderate`; MyReports `• ` → `· ` + word; MyWatched colour dot → numbered disc; Tasks pill gains `· Severity {n} ·`. Profile + MyReports a11y routed through `severityA11y` (Sky's call). MyReports test flags-mock gained `SEVERITY_LABELS`. |
| 5 | Onboarding slide 2 five-disc row | `b3ba544` | `Card.severityScale` flag; slide 2 drops `icon: MapIcon`; illustration branches to an unframed row of five `SeverityDisc` (32/14, the Legend disc) on the gradient; ONE accessible group (`role=image`, spine-derived label); `severityScaleRow` keeps the 112pt footprint. |
| 6 | Arbiter + evidence + blur guard | (this commit) | `tools/r2-severity-disc-stacks.json` (exit 0); blur-budget guard; this evidence + DECISIONS append. |

Every commit-plan item CLOSED. Nothing silently dropped. Pins excluded (never touched); outcome beats (FlashBanner/LiveStatusRegion) untouched; killed-by-lens options stayed dead.

---

## Gates

| Gate | Result | Tag |
|---|---|---|
| `npm run typecheck` | **0 errors** (re-run after every commit) | verified |
| `npm run lint` | **0 errors, 0 NEW warnings** — proven per touched file by HEAD-vs-current warning count (all equal: Legend 0/0, Nearby 2/2, ActivityFeed 2/2, RecentlyViewed 0/0, FlagDetail 2/2, Home 0/0, Profile 0/0, MyReports 0/0, MyWatched warnings unchanged, Tasks 0/0, Onboarding 0/0) | verified |
| `npm test` | **green — 1966 passed / 84 todo, 132 suites, exit 0** (baseline 1944 + 22 BP10 guards). The `ReportFlagModal` L4 "anon rate-limit re-enable" test is a PRE-EXISTING load-timing flake (69s under parallel starvation; passes in isolation at ~0.4s; BP10 touches nothing it imports) — the authoritative clean run below has zero failures. | verified |
| Arbiter `r2-severity-disc-stacks.json` | **exit 0 — ALL PASS**, both modes (sev1 11.03, sev2 8.05, sev3 6.21, sev4 4.79, sev5 white 4.83 — all ≥ 4.5) | verified |
| 7 immutable prior stacks files untouched | verified — none edited (new sibling only) | verified |
| Tracked-diff scope | only the named `src/**` files + their tests. The arbiter JSON, this evidence, and the DECISIONS append all live in the untracked `design-reviews/` tree → absent from the tracked diff, as mandated. | verified |

---

## PROTECT re-verification

The BP10-touched PROTECT items, and how each was proven. **Note on captures:** the visual before/after
re-render was NOT produced this session — and for the load-bearing claims a screenshot is *weaker* than
what was done. The mode-independence and zero-delta claims are proven **by construction**, which a photo
cannot: the arbiter declares BOTH modes with identical surfaces/pairs and both pass (a disc cannot differ
across themes because its inputs are theme-independent), and the render tests assert the resolved styles
against theme-independent constants (`severityColor(sev)`, `severity[sev].textOnColor`). The auth-fenced
surfaces (Profile/MyReports/MyWatched/detail chip/Tasks pill) are literally uncapturable unsigned — the
spec assigns their eye pass to **R2-D15 (Sky device)**. See "For Sky" below.

| PROTECT | How preserved | Proof | Tag |
|---|---|---|---|
| **PROTECT-4** severity grammar (this phase EXTENDS it) | every real-severity surface now speaks number+word (+stake where room) | 8 surface guards + FlagDetail/Tasks/Profile/MyReports source guards | verified |
| **PROTECT-25** wording spine | labels derive from `SEVERITY_LABELS`; stakes from `SEVERITY_DESCRIPTIONS` (flags.ts, cited in code); NO invented severity words | source guards + code comments | verified |
| ink fork as ONE system | 1–4 dark ink / 5 white baked into the primitive, never a prop | render test `severity[4]='#0F1B2D' ≠ severity[5]='#ffffff'` + arbiter | verified (by construction) |
| ramp mode-independence | discs opaque ink-on-fill → byte-identical both themes | arbiter both modes identical + ALL PASS; render asserts theme-independent constants | verified (by construction) |
| Legend row rhythm + Nearby card grammar | zero-delta adoption (32/14, 32/13) | render style-equality tests + source geometry pins | verified |
| pin four-channel capacity | `SeverityDisc` NEVER applied to a pin | no pin file touched (diff scope) | verified |
| outcome beats severity-free | FlashBanner / LiveStatusRegion untouched | not in diff | verified |
| Fork 3 (presentation-only, signed-in) / Fork 5 (untouched) | Profile/MyReports/MyWatched/Tasks changes are presentation only; no gating, no verified-count, no guest-write | diff review | verified |
| blur budget unchanged | `SeverityDisc` is a plain opaque `<View>` — zero panes added | guard: source has no `BlurView`/`expo-blur`/`GlassSurface`/`intensity` | verified |

---

## Adversarial verification (master §15 — 4 skeptics, Opus 4.8 max, each tasked to REFUTE)

**4/4 UPHELD, 0 refutations, high confidence.** Each skeptic inspected the real diff / re-ran the gates:

1. **Zero-visual-delta** — UPHELD 4/4. No 1px difference; the dead `sevDotText.color: textOnBrand` (always inline-overridden) was the only dropped declaration; `radius.circle` clips a 24px square to the same circle as the old literal `12`. Caveat (non-visual, already disclosed): three sites' SR-hide idiom normalized UP to the house `decorativeProps` superset.
2. **SR strictly-richer-or-equal** — UPHELD. Every label ≥ before; "of 5" preserved (FlagDetail, MyReports) and newly added (Profile); onboarding is genuinely ONE node; Nearby's disc-hide is equal-on-iOS / better-on-Android.
3. **PROTECT preserved** — UPHELD 9/9. No pin/theme.ts/GlassSurface/FlashBanner/LiveStatusRegion touched; ink fork has no override prop; no invented words; 7 immutable stacks untouched.
4. **Arbiter + gates honesty** — UPHELD 4/4. Ratios independently recomputed (sev-4 4.7897, sev-5 4.8314 — genuine passes, 6.4% margin); `min: 4.5` is the *stricter* choice (not gaming); 0 new warnings per file; 1966 green confirmed.

**Follow-up surfaced (NOT a BP10 regression — recorded to §PARKING-LOT):** `NearbyFlagsModal.tsx:131` the *card's* accessibilityLabel still hardcodes bare `severity ${item.severity}` (no "of 5", no word) — and LegendModal's row label is a bespoke shape. Both are EQUAL to pre-BP10 (untouched), so no regression; a future spine sweep could route them through `severityA11y`.

---

## PROPOSED strings (S-8 — before/after; ship on Sky's §A ratification; all derive, none invented)

| Surface | Before | After | Source of the added words |
|---|---|---|---|
| FlagDetail chip | `Severity 4` | `Severity 4 · Significant` | `SEVERITY_LABELS` (theme.ts) |
| FlagDetail stake line | (none) | `Hard or unsafe for most users.` | `SEVERITY_DESCRIPTIONS[4]` (flags.ts — existing shipped copy) |
| Profile pill | `No ramp · severity 3` | `No ramp · Severity 3 · Moderate` | `SEVERITY_LABELS` |
| MyReports meta | `Severity 3 • Jul 17, 2026` | `Severity 3 · Moderate · Jul 17, 2026` | `SEVERITY_LABELS` (+ `•`→`·`) |
| Tasks pill | `Nearest open barrier · No ramp · 639 m` | `Nearest open barrier · No ramp · Severity 3 · 639 m` | number only (pill at capacity) |
| Onboarding group label | (decorative glyph, a11y-hidden) | `Severity scale — 1 Minor to 5 Severe` | `SEVERITY_LABELS[1]` + `[5]` — spec-sanctioned PROPOSED string |

a11y (SR) strings, richer-or-equal everywhere: Profile + MyReports labels routed through `severityA11y`
(gain "of 5" + word); Tasks a11y gains `severityA11y`; FlagDetail/Home/MyWatched already on the spine.

---

## a11y-tree

- **Discs are decorative everywhere** — render test asserts `accessibilityElementsHidden / importantForAccessibility="no-hide-descendants" / accessible=false` on the primitive; the host row/label speaks the severity. Nearby's old `importantForAccessibility="no"` (left the digit reachable on Android) normalized UP to the house spread — an a11y equal-or-better change.
- **Onboarding = one group node, no per-disc SR noise** — source guard: the row is `accessible role="image"` with a single spine-derived label; the five discs are decorative-by-default. (Runtime carousel mounts cleanly — `pushPermission.test` renders OnboardingCards green.)
- **Row labels carry number+word** — Home/Tasks/Profile/MyReports/MyWatched a11y all guarded.
- Full VoiceOver walk of the auth-fenced surfaces = **R2-D15 (Sky device)**.

---

## For Sky — eyeball at R2-D15 (auth-fenced, harness never signed in) + onboarding

1. Sign in; walk **Profile** pill, **MyReports**, **MyWatched** (now a numbered disc), the **FlagDetail** chip + stake line, the **Tasks** nearest-barrier pill — both light & dark; VoiceOver on the chip + Tasks pill.
2. **Onboarding slide 2** — the five-disc row on the dark gradient (light & dark, though onboarding is force-dark): confirm the "Legend in miniature" reads well and the group announces "Severity scale — 1 Minor to 5 Severe".
3. **Home Recent** row — the 24px numbered disc + the realigned separator (marginLeft 52).
4. Ratify the PROPOSED strings above into DECISIONS §A.

**Honest deviation:** the static-export visual before/after captures were not produced this session (the auth-fenced surfaces are uncapturable unsigned; the rig skips onboarding; the load-bearing mode-independence/zero-delta claims are proven more strongly by construction — see PROTECT table). The visual pass folds into R2-D15.
