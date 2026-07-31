# MASTER TABLE — A11Y DEEP QA 2026-07-31, PHASE A (Fable 5)

Audited: `shipready/3-polish-submission` @ `5ab3f0c` (the full integration tip; main trails by 87). Gates at audit time: jest 186/2826/0 · tsc 0 · lint 0/80 · 13/13 ratified arbiter sets exit 0.
Evidence tags: **P** programmatic · **R** rendered · **D** NEEDS-SKY-DEVICE. Cross-ref = prior-ledger identity (re-surfaced items carry their original reasons; nothing closed was re-found).

## Blocker

| ID | Finding | SC | Surface | Tag | Cross-ref |
|---|---|---|---|---|---|
| **A11Y-212** | 4 notification toggle rows announce as switches but cannot be operated by SR (role on handler-less wrapper; real Switch AT-hidden; test entrenches it) | 4.1.2 / operability | NotificationPreferencesScreen:102-119 | P (+D confirm) | Alex-1 class, new site |
| **C-2** | Hosted privacy policy is the stale pre-§SKY-9 text; misdirects the account-deletion right (says Settings; product = Profile) | claims law | skypie99.github.io/AccessMap/privacy/ | P (fetched live) | NEW; fix is Sky-physical |
| **C-1** | README "WCAG 2.1 AA — fully accessible from signup to reporting" overclaims (falsified in-path by A11Y-203; wrong standard version; device proof outstanding) | claims law | README.md:18 | P | NEW; Sky words or Phase B earns it |

## High

| ID | Finding | SC | Surface | Tag | Cross-ref |
|---|---|---|---|---|---|
| A11Y-201 | Focus-in absent on 29 of 36 dismissables (house doctrine; titles exist, hook exists) | 2.4.3 | 29 files (list in lens-2/sweep) | P+D | **SR-070 re-surfaced** (was deferred-G4 at "26") |
| A11Y-202 | NearbyFlagsModal — the flagship SR surface — has focus-return but no focus-in, incl. the SR auto-open path | 2.4.3 | NearbyFlagsModal:199,:222 · MapScreen:561-573 | P+D | new (G5 fixed return half only) |
| A11Y-203 | Sign-in client validation errors silent on iOS + web (Android-only live region; only the server branch announces) | 3.3.1 + 4.1.3 | SignInScreen:45-52,:187-196 | P | NEW |
| A11Y-213 | Labeled containers swallow their interactive children ×3 — incl. the PROTECT-2 empty-filters recovery card (its "Reset all filters" is unreachable to VO) | 4.1.2/1.3.1 | MapScreen:2414-2455 · AddressSearchModal:305-329 · FlagDetailModal:1078-1095 | P+D | S13/L6-04 class, new sites |
| A11Y-214 | Accessible-by-default Pressables wrap nested interactives ×6 (rows swallow their action buttons) | 4.1.2 | MyWatched:222 · MyReports:200 · ActivityFeed:148 · PhotoGallery:93 · **HomeScreen:357 = SR-040** · **LegendModal:56 = SR-072** (swallows its own SR close path) | P+D | SR-040 + SR-072 re-confirmed at HEAD + 4 new |
| A11Y-221 | PhotoGallery lightbox is swipe-only between photos (no prev/next; unbounded community photos on FlagDetail) | **2.5.7** | PhotoGallery:180-195 | P | NEW |
| A11Y-226 | Guest→sign-in handoff destroys the report draft (remount; all fields re-entered) | **3.3.7** | ReportFlagModal:609-618 · App.tsx:141-150 | P | NEW |
| A11Y-228 | 3 bottom-anchored sheets take text input with no KAV — keyboard covers the focused input (2 are autoFocus) | **2.4.11** | SavedPlacesModal:344 · FilterPresetsModal:238,:430 · FlagDetailModal:1745 | P+D | NEW (7 sibling surfaces have KAV) |
| A11Y-229 | White-on-`brand` fails dark mode at 3.42:1 — 5+ small-text sites (active chips ×3 surfaces, Home retry, own-comment timestamp); submit CTA + Home pill pass only as large-text at 3.42 vs 3.0 | 1.4.3 | Nearby:478 · ReportFlag:1269 · MyReports:616 · Home:723 · CommentBubble:57/:114 | P (measured) | **SR-112 finally run**; M-52 grammar is the fix precedent |

## Medium

| ID | Finding | SC | Surface | Tag | Cross-ref |
|---|---|---|---|---|---|
| A11Y-204 | iOS VO never hears filter result counts (Android-only live region; zero-case only announced; comment overstates) | 4.1.3 | MapScreen:1699-1710 (+Tasks refresh/category paths) | P+D | NEW |
| A11Y-205 | Action-with-no-feedback: bulk-watch all-already-watched; post-action refresh-fail flash (Tasks pill has no announce path) | 4.1.3 | TasksScreen:601,:552,:693 | P | NEW |
| A11Y-206 | Single Watch/Unwatch silent (bulk announces) | 4.1.3 | FlagDetailModal:356-375 | P | NEW |
| A11Y-207 | SavedPlacesModal: no announce path at all; save-failure Alert is invisible on web | 4.1.3 / house policy | SavedPlacesModal:121-148 | P | F46/SR-057 class, new instance |
| A11Y-208 | Two ReportFlagModal openers never `register()` → no focus return (native long-press path) | G5 contract | MapScreen:1566,:1575 | P+D | NEW |
| A11Y-215 | 11 hard label-in-name mismatches (+6 split-phrase Low) — voice-control users can't speak what they see | 2.5.3 | 8 files (lens-2b table) | P | NEW |
| A11Y-216 | 14 `selected`-on-button sites never migrated to `a11yToggle({pressed})` — web SRs hear no state | 4.1.2 (web) | 7 files (lens-2b) | P | T11 unfinished adoption |
| A11Y-217 | Dialog names dead on native at ~37 `<Modal aria-label>` sites; the dismissal guard pins the dead prop | 4.1.2 | estate-wide | P | **SR-115 re-surfaced** +new nuance |
| A11Y-222 | Pull-to-refresh is the only labeled refresh on 7 surfaces (indirect alternatives undiscoverable) | 2.5.7 | 7 list surfaces (lens-7a) | P | NEW |
| A11Y-223 | HomeScreen Clear-search ✕ is 36×36 — the app's one genuine sub-44 target (same control SR-040 swallows) | 2.5.8 house floor | HomeScreen:377-387 | P | NEW (fix pairs with A11Y-214) |
| A11Y-230 | `textSubtle` on `surfaceNeutral` fails both themes (4.37/3.69) — live at the comment timestamp; recorded by ship-ready's proof set, never disposed | 1.4.3 | CommentBubble:61/:114 | P (measured) | comment-report stacks "THE FINDING", undisposed |
| A11Y-234 | ~126 native-only decorative-hiding props do nothing on web — decorative content leaks into the web AX tree | 1.3.1/4.1.2 (web) | estate-wide | P | **F-22 re-surfaced** |
| SR-042 | Home row SR labels speak abbreviated `formatDistance` not `speakDistance` — re-verified at HEAD | 4.1.2 quality | HomeScreen:588 | P | SR-042 re-confirmed (undisposed) |

## Low

L1-1 no a11y lint rule (process) · L3-1 no skip link (pass-by-technique) · A11Y-209 dead AVM on Modal tag + stale comment (**SR-116**) · A11Y-210 announce wiring behaviorally tested at 8/55 sites; UpdateBanner spy silenced-not-asserted · A11Y-211 wording coherence (glass "Lite/reduced"; Map error label drops the visible retry verb — screens disagree) · A11Y-218 7 inert container labels (+1 unlabeled tablist) · A11Y-219 2 Cancels missing disabled state · A11Y-220 hint restates name; Leaderboard double-state · A11Y-224 3 at-floor targets (D) · A11Y-225 dead divergent header-Feedback variant + Help-row placement drift · A11Y-227 sign-up lacks `newPassword` + no show-password · A11Y-231 ctaFillPressed doc 7.5 vs 7.00 (**SR-077**) · A11Y-232 web blur has no `prefers-reduced-transparency` twin (**SR-073 re-scoped**, 4 sites) · A11Y-233 FeedbackModal email field lacks autocomplete purpose (1.3.5) · A11Y-215b 6 split-phrase label-in-name.

## Re-surfaced known-open (reasons stand; queued for Phase B/Sky triage, not re-argued)

SR-074 (no accessibilityActions; ~5 swipes/card → D-A5) · SR-075/076/081/091/045 (Dynamic Type set → D-A3/A4) · SR-078 (tab-bar cap, documented exemption → D-A2) · SR-079 (Settings announces nothing) · SR-058 (live region retains last message) · SR-034 (no automated 44pt guard — the gap that admits the next A11Y-223) · SR-033 (box-none comment-enforced → D-B12) · SR-071 · SR-080 (positional photo alt — product decision) · SR-082 (FlashBanner RM guard) · SR-096 · SR-100/106/107 · SR-101/102/103/109 · SR-113 (exempt) · SR-114 · B1-D (vacuous hint rule) · B1-E · F-20/F-21 (Sky owes a/b/c; rec (a)) · SR-006 · B-1(a)/(c) · B-6 · SR-021.

## Verified sound (the negative space — what this audit proved still holds)

Escape law 36/36 · AVM estate · G5 count+guards · web z-order · inert scenes · announce infra + shim · severity grammar + ramp (exact) · D-4 dark sweep (exact) · tab tints · brandOnSoft pairs · grabber ink · focus ring ≥3:1 · 13/13 arbiter sets · k≥3 claim chain (README↔code↔Legend) · dynamicType + RM + RT contracts · 3.3.8 auth (paste never blocked, no cognitive test) · 3.2.6 consistent Feedback · 2.5.8 zero sub-24px · map 2.5.7 closed (S6 zoom + List FAB) · target-size estate ≥44 with slop math · forms labeled · no gesture code · icons named · media N/A.
