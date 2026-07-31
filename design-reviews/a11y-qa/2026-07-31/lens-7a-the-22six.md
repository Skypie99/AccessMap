# LENS 7a — THE WCAG 2.2-SIX (banked 2026-07-31)

Deliberate manual verification of the six criteria new in 2.2, each by number. Anchor fact: assertion F of `dismissalStandard.guard.test.ts:359-375` statically bans PanResponder/GestureDetector/Swipeable repo-wide — there is no custom gesture code; every drag surface is a platform primitive.

## 2.5.7 Dragging Movements

**PASS on the map** — the historic gap is closed and stays closed: app-styled 48×48 "Zoom in"/"Zoom out" (`MapScreen.tsx:2564-2583`, S6) on both platforms via the `zoomBy` handle; the List FAB is visible for everyone (`:2584-2608`), address search + Recenter + Nearby-row-select are non-drag pan paths. Leaflet's occluded default control deliberately replaced. **PASS** on onboarding carousels (Back/Next engineered with in-comment 2.5.7 rationale), sliders (none exist — severity is discrete buttons, PROTECT-3), swipe-dismiss sheets (all five pageSheets carry visible Close), list rows (no swipe actions; bulk-select has the "Select multiple" button), reorder (none exists).

- **A11Y-221 (High · 2.5.7 · programmatic): PhotoGallery's lightbox is swipe-only between photos.** `PhotoGallery.tsx:180-195` — horizontal `pagingEnabled` ScrollView is the only navigation; no prev/next buttons exist in the file; the page counter is decorative (`:215-226`). The fallback path (thumbnail rail `:144-154`) is itself a horizontal drag at 5 photos (512pt > 375pt viewport). Consumers: ReportFlagModal (≤5 own photos) and **FlagDetailModal `:1098` — unbounded community photos**. Single-photo `PhotoLightboxModal` is fine (nothing to navigate).
- **A11Y-222 (Medium · 2.5.7 · programmatic): pull-to-refresh is the only labeled refresh path on 7 surfaces** (TasksScreen `:1290-1299` — retry button appears only in the error state; ProfileScreen `:890`; AdminScreen `:282`; MyReports `:407`; MyWatched `:422` — whose accessibilityLabel literally instructs "Pull down to refresh"; ActivityFeed `:295`; MyFeedback `:208`). Tiered Medium, honestly: indirect non-drag alternatives exist (close/reopen the modal; Profile auto-refreshes on tab focus) but none are discoverable as refresh. A visible refresh affordance or focus-refetch would close the class.
- **NOTE (not a violation):** horizontal chip rails scroll by UA-native drag with no arrow buttons (10 sites; `OverflowFade` hints, doesn't scroll). Content scrolling is user-agent-provided and out of 2.5.7's operation scope — recorded for the device pass, not manufactured into a failure.

## 2.5.8 Target Size (Minimum) — house floor 44pt, SC floor 24px

**No control below 24px exists — zero Blocker-class rows.** House-floor residue:

- **A11Y-223 (Medium · house 44pt floor · programmatic): HomeScreen Clear-search ✕ is 36×36 effective** (`HomeScreen.tsx:377-387` — no size box, X@16 + hitSlop 10) — the one genuine sub-44 interactive in the app, and the same control SR-040 says VoiceOver can't reach (A11Y-214). One fix closes both.
- **A11Y-224 (Low · at-floor margins · programmatic + NEEDS-SKY-DEVICE): 3 marginal targets** — MyWatched `unwatchBtn` ≈42×44 effective (hitSlop overlaps the 8pt gap to its 44pt neighbor, `:256-265,:497-498`); FlagDetail `coordsCopyBtn` ≈44×47 exactly at floor (`:1275-1289`); native map pins 38×40 (`PlatformMap.tsx:575-580` — inline/essential-adjacent, clustering mitigates; device row).
- Confirmed ≥44 with slop math everywhere else (tab bar ~54pt items, all modal ✕ 44+, all chips minHeight 44, composite recipes deliberately sized so slop regions don't collide — evidence table in the sweep record). SR-034 (no automated 44pt guard) remains the standing gap that lets the next A11Y-223 in.

## 3.2.6 Consistent Help — **PASS**

The Feedback affordance sits in the same relative position (last item of the right header cluster, after the menu button) on all seven full screens, all routing to the single pooled FeedbackModal — verified per-screen (Home/Tasks/Profile/Settings/Admin/GuestProfile/FullMap). Modal sub-surfaces carry Close only, which 3.2.6 does not penalize.
- **A11Y-225 (Low · latent divergence · programmatic):** the never-rendered `renderHeaderRight` text-pill variant (`RootNavigator.tsx:257-268`) — dead code that resurrects a divergent Feedback treatment the moment any screen shows the nav header. **+ Low note:** the deeper Help & FAQ rows live in different sections on Profile vs Settings, and the drawer (the one menu reachable everywhere) has no Help row.

## 3.3.7 Redundant Entry

- **A11Y-226 (High · 3.3.7 + core-flow UX · programmatic): the guest→sign-in handoff destroys the report draft.** The anon banner's "Sign in" is `onPress={onClose}` (`ReportFlagModal.tsx:609-618`); the draft (category, severity, description, photos, context tags) lives only in component state (`:114-119`); signing in swaps `<RootNavigator/>` for `<SignedInArea/>` at the same tree position (`App.tsx:141-150`) — React unmounts the guest tree. The user re-enters everything. The guest is the App-Review cohort, and reporting is the app's core act.
- **PASS everywhere else, with strong evidence:** location never re-asked; templates prefill (7 entries, description only-when-empty, announced); FeedbackModal prefills the session email and preserves drafts across close/reopen; reopen/dispute ask one field; sign-up→profile re-asks nothing; edit forms prefill (the 3.3.7 exception, used correctly).

## 3.3.8 Accessible Authentication (Minimum) — **PASS**

Paste is blocked nowhere (zero `contextMenuHidden`/`onPaste`/`caretHidden`/`selectTextOnFocus` in src); no CAPTCHA or cognitive test; email+password with `autoComplete`/`textContentType` wired for manager fill; guest bypass exists. 
- **A11Y-227 (Low · polish · programmatic):** the sign-up branch reuses `textContentType="password"` instead of `"newPassword"` (`SignInScreen.tsx:176`), weakening iOS's strong-password generation prompt; no show-password toggle exists.

## 2.4.11 Focus Not Obscured (Minimum)

**PASS on the chronic suspects:** the absolute native tab bar has a measured content reserve on all six routes (per-screen evidence table); the status-pill ledge system reserves stacked slots (`SLOT_STRIDE=64`) and is `box-none` + transient; the map callout gets bespoke top-clearance fed into leaflet autopan and an RM instant-cut — effectively a purpose-built 2.4.11 fix. Web has zero sticky/fixed CSS.

- **A11Y-228 (High · keyboard-obscures-focused-input class · programmatic + NEEDS-SKY-DEVICE): 3 bottom-anchored sheets take text input with no KeyboardAvoidingView.** (a) SavedPlacesModal — `autoFocus` place-name input, no KAV import in the file (`:344-355`); (b) FilterPresetsModal — create AND rename prompts, both `autoFocus`, no KAV (`:238-246`, `:430-438`); (c) FlagDetailModal — comment input at the very bottom of a body ScrollView with no `automaticallyAdjustKeyboardInsets` (`:1745-1757`, `:1028-1031`). On iOS the keyboard rises over the exact input being typed into. Every other input surface in the app carries KAV (7 sites verified) — this is unfinished adoption, not a missing pattern.
- **NOTE (needs-browser):** Tasks' measured chromePane reserve is correct at rest; programmatic/keyboard focus to a row scrolled beneath the z-50 pane may align under it on web (`scrollIntoView` targets the container edge). Device-script row.
- **Android caveat (needs-device):** all KAVs use `behavior={ios?'padding':undefined}` and no `softwareKeyboardLayoutMode` is set — RN Modals don't resize on Android by default. iOS is the submission target.

## Test-coverage state

Pinned: no-gesture-code (F), fullscreen-no-swipe (E), escape/back parity (B/B2/D), G5 count (J), Sheet dismissal, tab-bar aria-selected. **Not pinned:** target sizes (SR-034), lightbox paging alternative, refresh alternatives, guest-draft preservation, KAV coverage. Phase B guard candidates all.
