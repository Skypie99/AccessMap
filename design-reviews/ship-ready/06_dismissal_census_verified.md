# SHIP-READY Phase 2 — 06 · Dismissal Census, VERIFIED

Branch `shipready/2-blockers-dismissal` off `main @ 512494a` · 2026-07-26 · Opus 5 max effort.
Design authority: `03_dismissal_census_and_spec.md`. This file is the *result* — 03's census re-derived
**from source** and checked against what actually shipped.

> **⚠ TOP-LINE HONESTY STATEMENT.** The dismissal standard ships **code-inferred only**. It cannot be
> otherwise: `grep -rl onAccessibilityEscape node_modules/react-native-web/dist/` returns **nothing**, and
> rn-web drops `accessibilityViewIsModal` too and stubs `setAccessibilityFocus` to an empty function body.
> **G1, G2 and all focus work produce ZERO web-observable delta** — a before/after web capture of them is not
> weak evidence, it is *no* evidence. The simulator tier is down (fmt pod vs Xcode 26.6, SEAM) and no store
> build exists. **The first real proof of the escape gesture is Sky's device pass** (rows D-B1…D-B12).
> What *is* web-proven this phase: G6's close X returning on-screen, the three privacy links, and the
> comments 300→200 REST flip. Those are marked `WV` below and nothing else is.

## §0 The correction 03 could not have made

**`onAccessibilityEscape` on `<Modal>` is a silent no-op.** RN 0.81.5's `Modal.render()` forwards an
**explicit allowlist** to `RCTModalHostView` (`Libraries/Modal/Modal.js:326-347`) — no `{...props}` spread —
and the prop is not in it. It typechecks only because `ModalProps` spreads `ViewProps`. The prop is real and
implemented **on a View** (`ViewPropTypes.js:77`, `RCTView.m:447` `accessibilityPerformEscape`).

03's G1 as written ("add it beside each `onRequestClose`") would have shipped **zero behaviour with every
guard green**. Every handler in this phase therefore rides the modal's **containment node** — the View
already carrying `accessibilityViewIsModal` — and `dismissalStandard.guard.test.ts` assertion **B2** fails if
anyone ever "tidies" one back onto the Modal tag.

## §1 Denominators, re-derived

| Quantity | 03 said | Verified | Note |
|---|---|---|---|
| `<Modal>` tags | 33 | **33** | ✅ |
| live surfaces | 32 | **32** | `FlagDetailModal.tsx:359` is a `visible={false}` null-stub — skipped explicitly, and declared in the guard's allow-list so a stale exemption fails |
| classes | — | **27 overlay · 3 pageSheet · 2 fullScreen** | derived from `presentationStyle` |
| escape props | 0 | **32** | one per live surface, one-to-one (a naive grep says 33 — it counts a comment) |
| AVM surfaces | 28 | **30** | +2 from G2; MapScreen had **zero** before |
| RM-gated | 32/32 | **32/32** | now *measured*, not just "no bare literal" — guard assertion C |
| `onRequestClose` | 32/32 | **32/32** | Android back covered class-wide, by construction |
| custom gesture code | 0 | **0** | `PanResponder` / `GestureDetector` / `Swipeable`, repo-wide |

**Three of 03's counts were not reproducible** and are corrected here: G4's "17 card dialogs missing
focus-on-open" (the reproducible numbers are **15** card-dialog-classed / **26** total); G5's hook name (the
web guard lives in **`useDrawerTrigger`**, not `useTriggerHandle`); and "AVM present on 28" mixing surfaces
with occurrences (47 occurrences across 29 files at the time).

## §2 The census — 32 live surfaces

Evidence tags are **per cell, not per row**: one surface legitimately mixes `WV` (a button pressed in a real
browser) with `NSD` (a gesture no browser can perform).
`CI` code-inferred · `WV` web-verified · `NSD` NEEDS-SKY-DEVICE · `N/A` positively not applicable.

**CLOSE** = a visible, labelled, ≥44pt affordance. **SWIPE** = UIKit sheet dismissal.
**ESC** = `onAccessibilityEscape` on the containment node, handler identical to `onRequestClose`.

| # | Surface | file:line | Class | CLOSE | SWIPE | ESC | AVM | RM | Back |
|---|---|---|---|---|---|---|---|---|---|
| 1 | AchievementsModal | `components/AchievementsModal.tsx:203` | overlay | X · CI | N/A — class forbids | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 2 | ActivityFeedModal | `components/ActivityFeedModal.tsx:209` | overlay | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 3 | AddressSearchModal | `components/AddressSearchModal.tsx:198` | overlay | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 4 | FeedbackModal | `components/FeedbackModal.tsx:161` | overlay | X (disabled while sending) · **WV** | N/A | ✓ **guarded** CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 5 | FilterPresetsModal | `components/FilterPresetsModal.tsx:352` | overlay | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 6 | FlagDetailModal | `components/FlagDetailModal.tsx:735` | overlay | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 7 | **HamburgerDrawer** | `components/HamburgerDrawer.tsx:277` | overlay | X + scrim · **WV** | N/A | ✓ CI+NSD | ✓ panel | ✓ own Animated | ✓ CI |
| 8 | HelpModal | `components/HelpModal.tsx:99` | overlay | X · **WV — y=−53 → 97** | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 9 | MyFeedbackModal | `components/MyFeedbackModal.tsx:114` | overlay | X · **WV** | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 10 | MyReportsModal | `components/MyReportsModal.tsx:266` | overlay | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 11 | MyWatchedModal | `components/MyWatchedModal.tsx:277` | overlay | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 12 | NotificationPrefsModal | `components/NotificationPrefsModal.tsx:146` | overlay | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 13 | OnboardingCards | `components/OnboardingCards.tsx:278` | **fullScreen** | T Skip · **WV** | **N/A — fullScreen forbids** | ✓ →`onDone` CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 14 | PhotoGallery lightbox | `components/PhotoGallery.tsx:160` | overlay | X + backdrop · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 15 | PhotoLightboxModal | `components/PhotoLightboxModal.tsx:38` | overlay | X + backdrop · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 16 | SavedPlacesModal | `components/SavedPlacesModal.tsx:254` | overlay | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 17 | StatusHistoryModal | `components/StatusHistoryModal.tsx:135` | overlay (modal-over-modal) | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 18 | **ui/Sheet** → ChangelogModal | `components/ui/Sheet.tsx:122` | overlay | X 40pt · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 19 | **ui/Sheet** → Tasks filter | *(same primitive)* | overlay | X · **WV** | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 20 | AboutScreen | `screens/AboutScreen.tsx:47` | overlay | X · **WV — y=−65 → 97** | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 21 | HowToHelpScreen | `screens/HowToHelpScreen.tsx:85` | **pageSheet** | X · CI | **CI + NSD → D-B3** | ✓ CI+NSD | N/A — own scene | ✓ CI | ✓ CI |
| 22 | LeaderboardScreen | `screens/LeaderboardScreen.tsx:274` | overlay | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 23 | LegendModal | `screens/LegendModal.tsx:34` | overlay | T Close + backdrop · **WV** | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 24 | "Name this preset" | `screens/MapScreen.tsx:2747` | overlay | T Cancel · CI | N/A | ✓ **guarded** CI+NSD | ✓ **NEW (G2)** | ✓ CI | ✓ CI |
| 25 | "Name this filter" | `screens/MapScreen.tsx:2843` | overlay | T Cancel · CI | N/A | ✓ **guarded** CI+NSD | ✓ **NEW (G2)** | ✓ CI | ✓ CI |
| 26 | **NearbyFlagsModal** | `screens/NearbyFlagsModal.tsx:190` | **pageSheet** | T Close · **WV** | **CI + NSD → D-B3/D-B4** | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 27 | NotificationPreferencesScreen | `screens/NotificationPreferencesScreen.tsx:135` | overlay | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 28 | OnboardingModal (replay) | `screens/OnboardingModal.tsx:141` | **fullScreen** | T Skip · CI | **N/A — fullScreen forbids** | ✓ →**`handleSkip`** CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 29 | SignInScreen modal | `screens/ProfileScreen.tsx:835` | overlay | T ← Back (only when `onClose`) · **WV** | N/A | ✓ cross-file CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 30 | Delete-account confirm | `screens/ProfileScreen.tsx:1759` | overlay | T Cancel + T Delete · CI | N/A | ✓ **guarded → Cancel** CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 31 | Tier explainer | `screens/ProfileScreen.tsx:1909` | overlay | X · CI | N/A | ✓ CI+NSD | ✓ CI | ✓ CI | ✓ CI |
| 32 | ReportFlagModal | `screens/ReportFlagModal.tsx:502` | overlay | T "Cancel and close" (disabled while submitting) · CI | N/A | ✓ **guarded (G9)** CI+NSD | ✓ child :508 | ✓ CI | ✓ CI |
| — | *(FlagDetailModal.tsx:359)* | — | — | **DEAD STUB — `visible={false}`, never renders.** In the guard's allow-list | | | | | |

**SWIPE is `N/A` on 29 of 32 as a positive assertion, never a blank.** 03 §2.6 reasoned it out rather than
assuming: card dialogs, lightboxes, alerts and fullScreen surfaces get no swipe, because the two candidates
(Report, FlagDetail) are transparent Modals *above* the box-none tree and would need their own gesture
responder — which reopens a settled law — and because both carry horizontal carousels that a vertical drag
would fight. Swipe stays UIKit's, on the pageSheet class only. Guard assertions **E** and **F** enforce it.

## §3 Focus-return (G5) — a counted residue, never a false green

Sky's decision: **the hook + 4 adoptions**, with the rest enumerated rather than hidden.

| State | Count | Surfaces |
|---|---|---|
| ✓ adopted | **1** | HamburgerDrawer (shipped by device-tune; the app's only focus-return today) |
| — planned this phase | **4** | NearbyFlagsModal (the only *web-verified* failure — focus lands on `BODY`, SR-067) → ReportFlagModal → FlagDetailModal → LegendModal |
| — not this phase | **27** | the remainder, tracked in the improvement slate |

**Status: NOT BUILT this phase — see the report's "what is not done" section.** The column is declared,
counted and tracked; it is not reported green.

## §4 What the guard suite pins

`src/__tests__/dismissalStandard.guard.test.ts` — the census above is *derived from source on every run*, so
a new surface enters it automatically and must satisfy the same rules.

A non-vacuity · **B escape parity** (same handler, not merely present) · **B2 never on `<Modal>`** ·
C reduced-motion positive twin · D Android back class-wide · E no swipe on fullScreen · F repo-wide gesture
ban · G the map's box-none law · H the drawer's exact prop set · I allow-list hygiene.

Verified non-vacuous against three separate regressions, each naming the file and the fault: prop removed ·
prop moved onto `<Modal>` · handler drifted.

## §5 Device rows this phase contributes

Append to the standing device-tune list (which ends at 21).

| ID | Check |
|---|---|
| **D-B1** | VoiceOver two-finger-Z scrub dismisses — one representative per class (7). **Flips 02's D-A7 from "expect failure today" to a post-fix row.** |
| **D-B2** | Scrub during send/save correctly **no-ops** on the 5 guarded surfaces (Feedback · both Name-this · delete-account · Report post-G9) |
| **D-B3** | Swipe-down actually dismisses on all 3 pageSheets — never web-verifiable |
| **D-B4** | Swipe does not fight Nearby's horizontal category chips (the one place both coexist) |
| **D-B5** | AVM truth under VoiceOver: the 2 Name-this dialogs post-G2, and StatusHistory's modal-over-modal stacking |
| **D-B6** | **Help + About close X at 1.0× / 1.3× / AX5 post-G6.** If a real device still clips, **R-6 upgrades to BLOCKING** |
| **D-B7** | Drawer contract intact post-escape: exit latch, sub-screen hand-off, RM snap, focus return, fast re-tap |
| **D-B8** | fullScreen swipe-lock — a user cannot swipe out of OnboardingModal / OnboardingCards / the auth wall |
| **D-B9** | Safe-area on the 3 pageSheets + PhotoLightbox's hardcoded `top: 48` on notch devices |
| **D-B12** | **Map pan + pinch through the overlay gaps** with the Name-this dialogs closed **and** open. SR-033 records box-none as comment-enforced only — jest cannot catch this, it must be a manual gesture check |

*(D-B10 grabber legibility and D-B11 focus-return are not listed as owed: neither shipped this phase.)*
