# SHIP-READY Phase 1 — 03 · Dismissal Census + Spec (Lens 3)

Repo @ `512494a`. Evidence law honored: swipe / pageSheet / AVM / escape-gesture cells are `code-inferred` + `NEEDS-SKY-DEVICE`; the ~9-minute live web segment (guest, zero mutating clicks) proves handler wiring only. **Escape-key results are WEB-ONLY signals** — `onRequestClose` fires on web Escape and Android back; iOS has neither.

> **Headline correction to the pre-scouted hypotheses.** `<Modal` appears at 33 JSX sites, but one is a null-stub (`FlagDetailModal.tsx:359`, `visible={false}`) and `OnboardingCards` (App.tsx-mounted) was missed. **True count: 32 real Modal surfaces** + `ui/Sheet` as a shared primitive + 3 non-Modal transients. **SR-027/028/030 denominators should read 32, not 33.** Two further corrections are in the table: Resources/HowToHelp are **pageSheets, not transparent overlays** (so SR-028's "exactly 1 swipe surface" is wrong — there are **3**), and they correctly carry **no AVM** because a pageSheet is its own UIKit scene.

---

## §1 Census table

Affordances: **X**=icon close · **T**=text close · **BD**=backdrop tap · **ORC**=`onRequestClose` (Android back + web Escape) · **AVM**=`accessibilityViewIsModal` · **SW**=swipe · **RM**=motion-gated · **FO**=focus-on-open · **FR**=focus-return. Evidence: **CI**=code-inferred · **WV**=web-verified · **NSD**=NEEDS-SKY-DEVICE.

### Pooled modals (`SharedModalsHost`, RootNavigator.tsx:403-411)
| # | Surface | file:line | Class | Current affordances | Ev | Gap |
|---|---|---|---|---|---|---|
| 1 | HelpModal | `HelpModal.tsx:99` | card dialog | X 44pt :120 · ORC :104 · AVM :113 · RM · no BD · no FO/FR | CI + **WV (X renders OUTSIDE viewport — F-G6)** | +escape, +FO, fix overflow |
| 2 | ChangelogModal | `ChangelogModal.tsx:91` → `ui/Sheet.tsx:122` | sheet (primitive) | X 40pt · ORC · AVM · RM · handle (a11y-hidden) · FO ✓ · no BD/FR | CI | +escape **on the primitive** (fixes 2 consumers) |
| 3 | FeedbackModal | `FeedbackModal.tsx:161` | card dialog | X 44pt (disabled while sending) · T Cancel :318 · **guarded** ORC :166 · AVM · RM · KAV | CI + WV (Escape closes) | +escape (same `!sending` guard) |
| 4 | MyFeedbackModal | `MyFeedbackModal.tsx:114` | card dialog | X 44pt · ORC · AVM · RM | CI | +escape, +FO |

### Drawer + sub-screens
| # | Surface | file:line | Class | Current affordances | Ev | Gap |
|---|---|---|---|---|---|---|
| 5 | **HamburgerDrawer** | `HamburgerDrawer.tsx:277` | drawer (device-tune-shipped) | X 44pt · BD scrim (a11y-hidden) · ORC · AVM on panel · `animationType="none"`+own Animated · **RM snap same-tick** · exit latch · **FO + FR — the only FR in the app** | CI + **WV: X, scrim, Escape all close; focus returns to trigger on both paths** | **escape prop ONLY — preserve everything else verbatim** |
| 6 | ResourcesScreen | `ResourcesScreen.tsx:116` | **pageSheet** | X 44pt · ORC · **SW (pageSheet :119)** · RM · no AVM *(correct)* · no FO | CI + NSD | +escape, +FO, **+grabber** |
| 7 | HowToHelpScreen | `HowToHelpScreen.tsx:85` | **pageSheet** | X 44pt · ORC · **SW** · RM · no AVM *(correct)* · no FO | CI + NSD | +escape, +FO, +grabber |
| 8 | AboutScreen | `AboutScreen.tsx:45` | card dialog | X 44pt · ORC · AVM · RM (3 mount points: drawer, Settings :643, Profile :1861) | CI | +escape, +FO |

### MapScreen
| # | Surface | file:line | Class | Current affordances | Ev | Gap |
|---|---|---|---|---|---|---|
| 9 | ReportFlagModal | `MapScreen.tsx:2603` → `:495` | card dialog over map | **T "Cancel and close" :1078 only — no header X** · ORC :495 **(unguarded — see F-G9)** · AVM ×2 · RM · KAV · FO ✓ · 2 horizontal chip strips | CI | +escape **with `!submitting` guard**, consider header X |
| 10 | FlagDetailModal | `:2641` → `:735` | card dialog over map | X 44pt (disabled while busy) · ORC · AVM · RM · FO ✓ | CI | +escape |
| 11 | LegendModal | `:2652` → `:34` | card dialog | T "Close" full-width · **BD** (aria-hidden) · ORC · AVM · RM · FO ✓ | CI + **WV: all three paths close; focus returns** | +escape |
| 12 | AddressSearchModal | `:2654` → `:198` | card dialog | X (hitSlop 12) · ORC · AVM · RM · KAV | CI | +escape, +FO |
| 13 | SavedPlacesModal | `:2671` → `:254` | card dialog | X · ORC · AVM · RM · nested Cancel :365 | CI | +escape, +FO |
| 14 | **NearbyFlagsModal** | `:2700` → `:190` | **pageSheet — the swipe surface** | T "Close" (~44pt) · ORC · **SW** · AVM · RM · horizontal chips :241 | CI + **WV: Close works; focus lands on BODY (F-G7)** + NSD | +escape, +FO, +grabber, **fix focus-return** |
| 15 | FilterPresetsModal | `:2736` → `:352` | card dialog | X · ORC · AVM · RM · nested Cancels | CI | +escape, +FO |
| 16 | "Name this preset" | `MapScreen.tsx:2747` | centered alert | T Cancel only · guarded ORC · RM fade · KAV · **NO AVM** | CI | **+AVM**, +escape, +FO |
| 17 | "Name this filter" | `MapScreen.tsx:2832` | centered alert | T Cancel only · guarded ORC · RM fade · KAV · **NO AVM** | CI | **+AVM**, +escape, +FO |

### TasksScreen
| # | Surface | file:line | Class | Current | Ev | Gap |
|---|---|---|---|---|---|---|
| 18 | Filter & sort Sheet | `:1054` → `ui/Sheet.tsx:122` | sheet | X 40pt · ORC · AVM · RM · handle · **no BD by design** · FO ✓ | CI + **WV: X + Escape close, backdrop correctly does NOT, focus returns** | +escape on primitive |
| 19 | FlagDetailModal (Tasks) | `:1512` | — | same component as #10 | CI | inherits |
| 20 | PhotoLightboxModal | `:1927` → `:38` | lightbox | X 44pt · **BD** (a11y-hidden) · ORC · AVM · RM fade | CI | +escape |
| 21 | Bulk-action bar | `:1401` (**not a Modal**) | inline overlay | T "Cancel selection" · **no ORC** (Android back doesn't clear selection) | CI + NSD | consider BackHandler (low) |

### ProfileScreen
| # | Surface | file:line | Class | Current | Ev | Gap |
|---|---|---|---|---|---|---|
| 22 | SignInScreen modal | `:835` → `SignInScreen.tsx:95` | full-screen modal (opaque) | **T "← Back" — renders only when `onClose` passed** · ORC · AVM · RM · **no swipe (by explicit comment :112-115)** | CI + NSD | +escape; Back placement → §7 |
| 23 | Delete-account confirm | `:1759` | destructive alert | T Cancel + T Delete · guarded ORC · AVM · RM fade · no BD *(correct)* | CI | +escape (Cancel semantics) |
| 24 | Tier explainer | `:1901` | card dialog | X · ORC · AVM · RM fade | CI | +escape |
| 25-30 | MyReports `:266` · MyWatched `:277` · ActivityFeed `:209` · Achievements `:203` · Leaderboard `:274` · NotificationPrefs `:146` | — | card dialogs | X · ORC · AVM · RM · **no FO** (all six) | CI | +escape, +FO |

### Settings / first-run / nested
| # | Surface | file:line | Class | Current | Ev | Gap |
|---|---|---|---|---|---|---|
| 31 | OnboardingModal (replay) | `SettingsScreen.tsx:652` → `:141` | full-screen | T "Skip" · ORC→**`handleSkip`** · AVM · RM · fullScreen ⇒ no swipe | CI + NSD | +escape→`handleSkip` (**not** raw close — it fires the `onboarding_skipped` analytics event) |
| 32 | NotificationPreferencesScreen | `:654` → `:135` | card dialog (flag-gated) | X · ORC · AVM · RM · FO ✓ | CI | +escape |
| 33 | PhotoGallery lightbox | `PhotoGallery.tsx:160` | lightbox (nested) | X · BD (a11y-hidden) · ORC · AVM · RM fade · paging ScrollView | CI | +escape |
| 34 | StatusHistoryModal | `StatusHistoryModal.tsx:135` ← FlagDetail `:1499` | **modal-over-modal** | X · ORC · AVM · RM · no FO | CI + NSD (stacking) | +escape, +FO |
| 35 | **OnboardingCards (first-run)** | `OnboardingCards.tsx:278` ← `App.tsx:195` | full-screen | T "Skip" · ORC→`onDone` · AVM · RM fade · fullScreen ⇒ no swipe · mounted conditionally (no `visible` prop) | CI + WV | +escape→`onDone` |
| — | Transients | FlashBanner · LiveStatusRegion · UpdateBanner | out of class | tap/auto-expire/✕ | CI | none |
| — | System dialogs | **76 `Alert.alert`** + **14 `confirm()`** | OS-owned | — | CI | out of scope (see 00 §4) |

---

## §2 THE SPEC

### 2.1 The a11y layer (leads; everything below inherits it)

**(A) Visible non-gesture close — AUDIT RESULT: 32/32 PASS.** No surface is gesture-only. Two correct conditionals: SignInScreen renders "← Back" only when `onClose` is passed (on the auth wall there is deliberately no close — it is a wall, not a dismissible surface); PhotoLightboxModal renders its frame even when `photoUrl === null` so the X stays reachable — **adopt that defensive pattern as the rule.**
The X-vs-text convention is **already consistent by content type and should be codified, not changed**: list/pageSheet surfaces use a text "Close"; card dialogs use a 44pt icon X top-trailing; destructive and form dialogs use a text Cancel pair. This matches iOS convention — not a fork.

**(B) `onAccessibilityEscape` — SR-027 CONFIRMED: 0 occurrences repo-wide** (grep exit 1). The exact RN prop is **`onAccessibilityEscape`** (iOS-only, fired by the VoiceOver two-finger-Z scrub; Android's equivalent is the hardware back that `onRequestClose` already serves).
Spec: **all 32 real Modals get `onAccessibilityEscape={<the same handler as their onRequestClose>}`** — same reference, same guards, no new behavior. Four surfaces carry guards that must be copied verbatim:
```tsx
onAccessibilityEscape={() => { if (!sending) onClose(); }}      // FeedbackModal.tsx:166
// MapScreen.tsx:2752 → if (!savingPreset)  ·  :2837 → if (!savingSet)
// ProfileScreen.tsx:1764 → if (!deletingAccount)
```
Two route to **named** handlers, not raw `onClose`: OnboardingModal → `handleSkip` (fires `onboarding_skipped` analytics — a raw close silently corrupts the funnel), OnboardingCards → `onDone`. Best leverage: adding it to `ui/Sheet.tsx:122` covers two consumers in one edit.

**(C) AVM completeness — SR-029 confirmed + bounded.** Present on 28. **Genuinely missing on exactly 2**: the Name-this dialogs (`MapScreen.tsx:2747`, `:2832`) — centered text-entry alerts over a live map, the worst case for focus leakage. Three further absences are **correct, not gaps** (Resources/HowToHelp/Nearby are separate pageSheet scenes; the drawer sets it on the panel not the backdrop, deliberately). Placement style varies across the codebase but is functionally equivalent — **do not churn it.**

**(D) Reduced motion — 32/32 gated, ZERO violations.** Every `animationType` is `reducedMotion ? 'none' : …`. The single hardcoded `animationType="none"` (drawer) is the designed exception: it owns its own Animated and snaps same-tick under RM with no timers. **The RM contract holds app-wide.**

**(E) Focus-return-to-trigger — the real app-wide gap.** `useTriggerHandle` has exactly **one** consumer (the drawer). The other 31 surfaces leave VoiceOver focus where the surface used to be; live web confirms the split (drawer returns focus; Nearby strands it on `BODY`). Spec: generalize the drawer's proven contract into `useSurfaceTrigger()` in `src/lib/accessibility.ts`, **including the `Platform.OS === 'web'` early return and try/catch** (`drawerContext.tsx:99-104` — that guard exists because RNW's `findNodeHandle` throws and once made the hamburger inert). Adopt on Nearby, FlagDetail, Legend, Report first. Phase-2 slate item, not a one-liner.

**(F) Focus-on-open** — present on 7 of 32; missing on 17 card dialogs. One line each.

**(G) Android hardware back — 32/32 covered.** Class-wide PASS. Only gap is the non-Modal bulk bar.

### 2.2 Sheets — pageSheet + swipe + **visible grabber** + visible Close
`ui/Sheet` already ships a correctly a11y-hidden grabber; **the 3 real pageSheets (Resources, HowToHelp, Nearby) have none** — and on a real pageSheet the grabber is the only signifier that swipe works. Keep `ui/Sheet`'s deliberate no-backdrop-close (web-verified as coded).

### 2.3 Full-screen modals — X top-leading or Done/Skip top-trailing per content type. Native `fullScreen` correctly forbids swipe: **do not add a gesture.**

### 2.4 Drawer — PRESERVE VERBATIM (device-tune-shipped, SEAM)
Cited so Phase 2 cannot redesign it: `animationType="none"` + own `Animated.parallel`; RM snaps slide **and** fade same-tick then releases the latch with zero timers; the exit latch gates on `openRef.current`, never on `finished`; `onDismiss={presentPendingSubScreen}` — **the name is pinned by the D1 route guard, which greps for that exact string**; the scrim is `accessible={false}` + `no-hide-descendants` because exposing it double-spoke "Close menu"; AVM on the panel, not the backdrop; the `handedOff` reason-flag distinguishes plain-close from hand-off. **Only permitted change: adding `onAccessibilityEscape={closeDrawer}`.**

### 2.5 Card dialogs / lightboxes / system dialogs
Card dialogs: visible Cancel/X + AVM + **no swipe** (a swipe over a form risks data loss and there is no gesture layer to build it on). Lightboxes: X + a11y-hidden backdrop — the shipped pattern; pinch-zoom stays deferred. System dialogs: OS-owned, out of scope beyond the web-shim note.

### 2.6 Swipe vs the box-none map law — REASONED, NOT ASSUMED
`MapScreen.tsx:1620-1635` keeps the root overlay `pointerEvents="box-none"` so the map stays pannable underneath. **ReportFlagModal and FlagDetailModal must NOT get swipe-down**, for two independent reasons: (1) both are `transparent` Modals in a separate RN Modal host *above* the box-none tree, so a swipe zone would need its own gesture responder — only buildable by adding `react-native-gesture-handler` wiring, which re-opens a settled law; (2) both contain horizontal carousels (template + category strips; Nearby's chips; MyWatched; PhotoGallery paging), and a vertical sheet-drag competing with a horizontal pager is exactly the ambiguity Apple's own sheets avoid by reserving the drag to the grabber. **Verified: `PanResponder` / `GestureDetector` / `Swipeable` = ZERO occurrences repo-wide** — all swipe in this app is UIKit's, via `pageSheet`. Spec: swipe stays limited to the pageSheet class, where UIKit resolves the conflict.

---

## §3 Phase-2-buildable gap list

- **G1 — escape prop ×32 (mechanical, greppable, near-zero risk).** Add `onAccessibilityEscape` beside each `onRequestClose`, same handler. Guarded four: `FeedbackModal:166`, `MapScreen:2752`, `MapScreen:2837`, `ProfileScreen:1764`. Named-handler two: OnboardingModal→`handleSkip`, OnboardingCards→`onDone`. Primitive one: `ui/Sheet.tsx:122`. Drawer: `→closeDrawer`. **ReportFlagModal needs a `!submitting` guard it does not currently have — see F-G9.**
- **G2 — AVM ×2**: `MapScreen.tsx:2763`, `:2848` (the `styles.nameCard` Views). Closes SR-029.
- **G3 — grabber ×3 pageSheets**: Resources `:136`, HowToHelp `:105`, Nearby `:203` — reuse `ui/Sheet.tsx:44-50` verbatim incl. `accessibilityElementsHidden` + `no-hide-descendants`.
- **G4 — focus-on-open ×17 card dialogs**: `const titleRef = useFocusOnOpen<Text>(visible)` + `ref={titleRef}` on the header.
- **G5 — focus-return generalization**: new `useSurfaceTrigger()` modeled on `drawerContext.tsx:82-117` *with* the web guard + try/catch. Adopt Nearby → FlagDetail → Legend → Report.
- **G6 — HelpModal card overflow (live-found)**: X sits at **y = −53 (above the viewport)** at 375×812 with a full FAQ list; `maxHeight:'90%'` is on `card` but `cardWrap` is unbounded so the header scrolls off. Fix: `maxHeight` on `cardWrap` or `flexShrink:1` on the card (FeedbackModal's `body` already does the latter).
- **G7 — NearbyFlagsModal focus-return** (BODY after Close).
- **G8 — bulk-bar BackHandler** (Android-only, low).
- **G9 — ReportFlagModal mid-submit close guard** (see findings).

---

## §4 Findings

| SR | Tier | Evidence | Where | What |
|---|---|---|---|---|
| **SR-063** | **HIGH** | code-inferred (WCAG 2.1.1/2.4.3) | all 32 Modals | SR-027 confirmed by repo-wide grep (exit 1): `onAccessibilityEscape` is absent everywhere, so the VoiceOver scrub-escape does nothing on any surface in the app. → G1 |
| **SR-064** | **HIGH** | web-verified + NEEDS-SKY-DEVICE | `HelpModal.tsx:113`, styles `:212-230` | Close X renders **outside the viewport (y = −53)** at 375×812 with a full FAQ list; unbounded `cardWrap` lets the header scroll away. Combined with SR-063 this leaves Help with **no working dismissal on web except Escape** — and Escape has no iOS equivalent. → G6. **Mechanism + class scope now at SR-099 (01 §S): unresolved `maxHeight:'90%'` on an auto-height parent — same recipe live on AboutScreen (X at y=−65) and latent in Feedback/MyFeedback; the G6 fix must cover the class, not just Help.** |
| **SR-065** | MED | code-inferred | `MapScreen.tsx:2747`, `:2832` | Both Name-this dialogs lack AVM — VoiceOver can wander onto the live map behind a text-entry dialog. → G2 |
| **SR-066** | MED | code-inferred | 31 of 32 surfaces | Focus-return-to-trigger exists only on the drawer. → G5 |
| **SR-067** | MED | web-verified | `NearbyFlagsModal.tsx:205` | Focus lands on `BODY` after Close. → G7 |
| **SR-068** | MED | code-inferred | `ReportFlagModal.tsx:495` | `onRequestClose` is passed `onClose` **unguarded**, unlike its four guarded siblings, and the parent handler (`MapScreen.tsx:2612-2618`) cannot guard it (the `submitting` flag lives in the child). Android back mid-submit can close the sheet out from under an in-flight `createFlag`. → G9 |
| **SR-069** | LOW | code-inferred + NSD | Resources `:119`, HowToHelp `:88`, Nearby `:194` | SR-028 refined: **3 pageSheets swipe, not 1** — and none of the three shows a grabber, the only signifier that swipe works. → G3 |
| **SR-070** | LOW | code-inferred | 17 card dialogs | No focus-on-open. → G4 |
| **SR-071** | LOW | code-inferred | `TasksScreen.tsx:1401` | Bulk bar is not a Modal, so Android back doesn't clear selection. → G8 |
| — | INFO | code-inferred | 4 sites | SR-030 confirmed **exactly**: backdrop-close on Legend, Drawer, PhotoLightbox, PhotoGallery — and **3 of the 4 are deliberately a11y-hidden**. The pattern is coherent; **no change recommended.** |

## §5 CHECKS-PASSED
Zero-`onAccessibilityEscape` verified repo-wide (grep exit 1) · `Alert.alert` = **76** exactly as hypothesized · **RM gating 32/32, zero violations** · **`onRequestClose` 32/32** (Android back covered class-wide) · **visible labeled close 32/32** (no gesture-only surface) · **no custom gesture code anywhere** (PanResponder/GestureDetector/Swipeable = 0) · backdrop-close sites = exactly 4, all enumerated · AVM 28 present / 2 missing / 3 correctly-absent / 1 by-design-elsewhere · live web: drawer X+scrim+Escape all close with focus returning on both paths; `ui/Sheet` X+Escape close and backdrop correctly does not; Legend all three paths close with focus return; Nearby Close works; Feedback opens + Escape closes · **brink protocol honored** (no Submit/Send/Delete/Verify/Resolve/Reject, no geocode query, repo untouched).

## §6 NEEDS-SKY-DEVICE
1. Swipe-down actually dismisses on the 3 pageSheets — never web-verifiable. 2. Swipe does **not** fight Nearby's horizontal category chips (the one place both coexist). 3. VoiceOver two-finger scrub: currently does nothing on all 32; after G1, verify — especially that scrub during send/save correctly no-ops on the four guarded surfaces. 4. AVM truth under VoiceOver — priority: the 2 Name-this dialogs post-G2, and **StatusHistoryModal's modal-over-modal stacking**. 5. **HelpModal X reachability (SR-064)** — is y=−53 real native clipping or an RNW artifact? Test at largest Dynamic Type. **If real, this is a ship blocker, not polish.** 6. Drawer contract intact after the escape prop lands (exit latch, sub-screen handoff, RM snap, focus return). 7. `fullScreen` swipe-lock on OnboardingModal/OnboardingCards/SignIn — confirm a user cannot swipe out of the auth wall. 8. Safe-area on the 3 pageSheets + the lightbox's hardcoded `top: 48` close button on notch devices.

## §7 Mockup-gate candidates (genuinely open visual calls only)
1. **Grabber styling on the 3 pageSheets** — *that* they get one is platform convention (not a fork); whether they reuse `ui/Sheet`'s 36×4 pill over a **chrome-glass** header (Resources/HowToHelp) vs the **bulk-glass fill** (Nearby, where Sky picked D10 edge-to-edge) is a genuine material call.
2. **ReportFlagModal close affordance** — the only large form with no header X, only a bottom "Cancel and close" that can scroll under the keyboard. Header X vs. single bottom control is a real choice with a data-loss dimension (an easy X on a half-filled report). Both defensible.
3. **SignInScreen "← Back" placement** — currently inline in the scroll body so it scrolls away; convention would pin it top-leading. Open because the surface is a gradient hero, not a chrome header.

**Explicitly NOT forks:** escape props, AVM, focus-on-open, the X-vs-text convention (already consistent), backdrop-close policy (coherent as shipped), RM gating (already 32/32).

## §8 Open questions
1. Restate SR-027/028/030 denominators as **32**? (This report does; prior briefs said 33.) 2. Split G1 (mechanical escape) from G5 (new hook + adoption) into separate Phase-2 items — **recommended**. 3. Is broadening `ui/Sheet` adoption (2 consumers vs ~20 hand-rolled equivalents) in scope, or a debt item alongside the open `ui/Button` adopt-or-remove question? 4. **SR-064 severity pivots on a device answer** — sequence it early in Phase 2. 5. Any *new* string this spec implies (e.g. a header-X label "Close report") routes to **BP16**, not authored here.

## §9 Parent closure of the census's NOT-VERIFIED items (recovery window, 2026-07-26)

The census agent's return carried two §NOT-VERIFIED items with specified closing checks. Both run by the parent, read-only:

**(a) Third-idiom backdrop-dismiss patterns — CLOSED: none exist.** `grep -rn "TouchableWithoutFeedback\|onStartShouldSetResponder" src/` (non-test) → **zero hits** (exit 1). Combined with the census's own negative sweep of named backdrop styles, the backdrop-close census is complete: **exactly 4 sites** (Legend, Drawer, PhotoLightbox, PhotoGallery), all via the `absoluteFill` Pressable idiom, 3 of 4 a11y-hidden. SR-030's denominator statement stands as banked; no undercount.

**(b) ReportFlagModal mid-submit close semantics — CLOSED: the child does NOT block it internally; G9 is genuinely needed.** Read of the full submit machine (`ReportFlagModal.tsx:106` `submitting` state + `:117` `submittingRef` set synchronously at `:309-314`; every input/chip/photo control disables during flight; `finally` at `:486` clears state + the S11 stall timer on every exit): **nothing guards `onRequestClose={onClose}` at `:495`** — Android back / web Escape mid-submit closes the sheet over an in-flight `createFlag`. The S11 design escalates-never-aborts slow writes, so the insert continues after close; a reopened sheet is a fresh instance with a fresh `submittingRef`, so a user who re-fills and re-submits after an actually-committed write produces a duplicate (the exact shape S11's comment says the anon 5/day limit punishes). Confirms SR-068 (MED) as filed and pins the Phase-2 fix: `onRequestClose`/`onAccessibilityEscape` both need the `if (!submitting)` guard — the flag already exists at `:106`, a one-line wrap.
