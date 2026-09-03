# Lane D — Static accessibility + UX review of signed-in surfaces

Date: 2026-09-02
Worktree: /Users/skypie/AccessMap-deep-audit-20260902 (CURRENT_MAIN = origin/main 70b52a30; worktree HEAD 3d7e03b0 has NO diff vs origin/main for any target file, so worktree line numbers == CURRENT_MAIN)
Compared against SUBMITTED_BUILD_33 = f5594171 (not in main), via `git diff origin/main f5594171 -- <file>` and `git grep -n … f5594171`.
Method: read-only static review (cat/grep/git show/git diff). No simulator, no network, no writes outside this file.

Status: COMPLETE

## File inventory / Build 33 delta status

| File | main lines | B33 delta (origin/main..f5594171) |
|---|---|---|
| src/screens/ProfileScreen.tsx | 2881 | +/-356: TypeBlock wrap on nav groups + point history, AX recompose of point rows, chevron scales, account-deletion status card + receipt flow, copy dash→period. Error card, progress bars, stat/status labels UNCHANGED. |
| src/components/MyReportsModal.tsx | 687 | +/-59: RNGH FlatList/ScrollView, `presentation="expanded"`, row description `numberOfLines={2}` REMOVED. Error banner unchanged. |
| src/components/MyWatchedModal.tsx | 643 | +/-86: RNGH lists, expanded, AX empty-state variants. Row actions / Clear all / hitSlops unchanged. |
| src/components/AchievementsModal.tsx | 240 | +/-106: AX recompose of rows, expanded sheet. No a11y semantics change. |
| src/components/ActivityFeedModal.tsx | 493 | +/-88: SectionList scroll bridge, error banner moved into ListHeaderComponent, description `numberOfLines` removed. |
| src/components/StatusHistoryModal.tsx | 323 | +/-10: RNGH ScrollView, expanded. |
| src/components/HiddenCommentsModal.tsx | 501 | no diff |
| src/screens/NotificationPreferencesScreen.tsx | 306 | no diff |
| src/components/NotificationPrefsModal.tsx | 266 | +/-22: RNGH ScrollView, expanded, PrefsRow reflow. handleToggle unchanged. |
| src/screens/AdminScreen.tsx | 470 | +/-564: MOD1 report queue (SegmentedControl toggle, report cards, reject/remove/delete-comment/no-action/target-unavailable/finish-review), Restore on rejected flags. |
| src/components/FlagDetailModal.tsx | 3121 | +/-306: pull-dismiss lifecycle (reduce-motion still honoured via useSheetPullDismissLifecycle), photos loading/error/retry, admin-only Reject + Restore, guest sign-in-to-review boundary, copy changes. Edit/Delete/comment/watch handlers unchanged. |
| src/components/CommentBubble.tsx | 468 | no diff |
| src/components/ReportContentModal.tsx | 643 | +/-19: RNGH ScrollView, expanded. Controls unchanged. |
| src/components/PhotoLightboxModal.tsx | 180 | no diff |
| src/screens/LeaderboardScreen.tsx | 585 | +/-108: RNGH FlatList, AX recompose rows, avatar scales, expanded. Error state UNCHANGED. |

Shared primitives read for context: AppText (variant caps display 1.3 / heading 1.5 / label 1.6 / mono 1.4 / body uncapped), TypeBlock (header 1.6, chrome 1.3, content uncapped), Sheet (title focus on open, accessibilityViewIsModal + onAccessibilityEscape on backdrop, 44pt Close, reduce-motion gated), SheetPull, PrefsRow, EmptyState, SegmentedControl, Skeleton, PhotoGallery, GlassSurface (forwards `...rest` incl. `accessible` to a View), RemoteImage, src/lib/accessibility.ts, theme (a11y.minTargetSize 44, font.size caption 11 / xs 12 / sm 13 / base 14 / md 15 / lg 16).

## What is done well (one note)

Every sheet in scope moves screen-reader focus to its title on open (Sheet primitive; FlagDetail/HiddenComments/NotificationPreferences/PhotoLightbox do it themselves), carries `accessibilityViewIsModal` + `onAccessibilityEscape` on the containment node, and keeps a labelled 44pt Close beside the swipe. Reduce Motion is honoured everywhere an animation exists (Sheet/Modal animationType, Skeleton pulse, ProfileScreen progress bars, PhotoGallery paging, B33 SheetPull lifecycle). Verify/resolve/reject, watch/unwatch, comment post/delete/hide/block, unhide, reopen and dispute all announce their outcome; StatusHistory, NotificationPrefsModal, NotificationPreferencesScreen and ReportContentModal pair Android live regions with explicit iOS announcements. Status and severity are never colour-only (StatusBadge text+dot, SeverityDisc digit, Admin sev pill label+number, FlagDetail census line). Destructive actions (reject, delete flag/comment, remove/dismiss, clear watched, block, sign out, delete account) all go through `confirm()`.

## Candidates

### CAND-D-01 — HIGH — Accessible-parent trap: "Try again" unreachable to VoiceOver on Profile load-error card and Leaderboard error state
- category: voiceover-focus-trap (A11Y-213 class)
- affected_state: BOTH — ProfileScreen main 992-1013 unchanged in B33 (B33 1052-1064); LeaderboardScreen main 385-401 unchanged in B33 (B33 416-427).
- confidence: HIGH
- claim: Both error-recovery containers set `accessible` + `accessibilityLabel` on the parent that holds the Retry Pressable, so on iOS the whole card collapses into one VoiceOver leaf and the Retry button cannot be reached or activated.
- evidence: ProfileScreen.tsx:993-1001 `<GlassSurface … accessible accessibilityLiveRegion="polite" accessibilityLabel={"Couldn't load your profile. …"}>` wrapping Pressable :1004-1011 ("Try again, load your profile"); GlassSurface.tsx:151,204,240 extends ViewProps and spreads `...rest` onto the View, so `accessible` is real. LeaderboardScreen.tsx:385-390 `<View style={styles.stateWrap} accessibilityLiveRegion="polite" accessible accessibilityLabel={…}>` wrapping Pressable :393-400 ("Try again, load the leaderboard"). The repo's own guard (src/__tests__/accessibleParentTrap.guard.test.ts:19-21) states it is site-pinned and does not catch new instances.
- why_it_matters: The only recovery path from a failed profile/leaderboard load is invisible to screen-reader users; the live-region announcement even tells them an error occurred and then offers no operable control.
- verification_needed: iOS VoiceOver on a forced load failure: swipe through the card and confirm "Try again" is never focused; Android TalkBack for contrast (TalkBack usually still reaches children).
- historical_relation: Same defect class as A11Y-213 (MapScreen empty card / AddressSearch / FlagDetail after-photo tip), fixed there on 2026-07-31; these two sites were not enumerated.

### CAND-D-02 — MEDIUM — Tier and milestone progress bars are not accessibility elements on iOS; their visible labels are hidden, so VoiceOver gets no progress at all
- category: screen-reader-semantics
- affected_state: BOTH — main 1121-1126 / 1161-1172 unchanged (B33 1179, 1219).
- confidence: MEDIUM
- claim: Both progressbar Views carry role/label/value but no `accessible` prop; on iOS a plain View only becomes focusable with `accessible={true}`. The redundant text labels beneath them are decorativeProps-hidden, so nothing on the hero conveys "N pts to Gold" / "N points to <badge>" to VoiceOver.
- evidence: ProfileScreen.tsx:1121-1126 (`accessibilityRole="progressbar"`, no `accessible`), :1139-1144 label `{...decorativeProps}`; :1161-1172 same, :1189-1194 hidden. House precedent that does it right: TasksScreen.tsx:1294-1297 `accessible accessibilityRole="progressbar"`.
- why_it_matters: The hero's progress information (WCAG 1.3.1 / 4.1.2) is sighted-only; the tier pill hint only promises the numbers inside the explainer sheet.
- verification_needed: iOS VoiceOver: swipe from the points figure and confirm whether a "progress bar, N of M" element is announced. Android TalkBack likely focuses it (contentDescription), so test iOS specifically.

### CAND-D-03 — MEDIUM — Status-pill and stat-tile labels shrink-to-fit instead of scaling with Dynamic Type
- category: dynamic-type
- affected_state: BOTH — main 1397-1402 and 2163 unchanged (B33 1473, 2273).
- confidence: MEDIUM
- claim: The 11pt caption labels ("OPEN/VERIFIED/RESOLVED/REJECTED" and "Reported/Verified/Resolved") use `adjustsFontSizeToFit numberOfLines={1}` with no `minimumFontScale`, inside pills whose width is fixed by the 4-up row (flexBasis 0, minWidth 70, maxWidth 48%). At 1.3x-1.6x "VERIFIED" already exceeds the ~63pt inner width, so the label is scaled back down to roughly its 11-12pt default; at AX sizes it can shrink further. The smallest text on the screen is the one that refuses to grow.
- evidence: ProfileScreen.tsx:1397-1402 (`adjustsFontSizeToFit numberOfLines={1}` on statusPillLabel), :2624-2654 (statusPill flexGrow 1/flexBasis 0/minWidth 70/maxWidth '48%'; statusPillLabel fontSize caption 11, uppercase, tracking loose); :2163 Stat label `adjustsFontSizeToFit numberOfLines={1}`, :2607-2615 (caption 11, uppercase). Contrast Sheet.tsx:143-145 and CommentBubble.tsx:187-189 which bound the shrink with `minimumFontScale={0.8}` and allow a second line.
- why_it_matters: WCAG 1.4.4 — text must remain readable at 200%; a label pinned at ~11pt for a low-vision user on an accessibility product is a direct miss. The pills are also buttons, so their visible name does not scale.
- verification_needed: iOS Larger Text at XXXL and AX3: measure rendered label height in the status pill row and the stat trio; confirm whether it wraps/grows or is scaled down.

### CAND-D-04 — MEDIUM — Load failures (and load completion) are silent on iOS VoiceOver across the list surfaces
- category: live-region / announce
- affected_state: BOTH — every site below is unchanged or only relocated in B33.
- confidence: HIGH (static: `accessibilityLiveRegion` is Android-only in RN; no `announceForAccessibility` on these paths)
- claim: The house rule documented at StatusHistoryModal.tsx:119-127 and ReportContentModal.tsx:196-211 (pair the Android live region with an iOS-only announce) is applied to only four surfaces. Everywhere else in scope a fetch error renders a banner with no announcement, and skeleton/loading states rely on Android-only live regions, so an iOS screen-reader user who opened a sheet hears the title and then silence while it loads and fails.
- evidence (main → B33): MyReportsModal.tsx:412-424 error banner, :439-446 loading (liveRegion only) → B33 420; MyWatchedModal.tsx:428-434 missing banner, :448-454 refresh error, :504 loading, :509-521 error → B33 440, 460, 540; ActivityFeedModal.tsx:276-288, :292 → B33 336; HiddenCommentsModal.tsx:366-372, :377 (no diff); LeaderboardScreen.tsx:379, :385-390 (liveRegion only) → B33 416; AdminScreen.tsx:294-306 (liveRegion only) → B33 767, 825; FlagDetailModal.tsx:2057-2069, :2101-2113 comments errors → B33 2229, 2272; ProfileScreen.tsx:992-1001 (liveRegion only) → B33 1052-1055. Zero `announceForAccessibility` in MyReportsModal, ActivityFeedModal, AdminScreen, LeaderboardScreen, AchievementsModal (grep counts).
- why_it_matters: WCAG 4.1.3 status messages; on the platform the app is submitted for, a failed fetch is indistinguishable from an empty list to VoiceOver users.
- verification_needed: iOS VoiceOver with network disabled: open My Reports / Watched / Recent Activity / Leaderboard / Admin and confirm nothing is spoken after the title.
- historical_relation: A3/D18 pattern (2026-08) — applied to StatusHistory, both notification-prefs surfaces and ReportContent; not propagated.

### CAND-D-05 — MEDIUM — AdminScreen moderation actions give no screen-reader feedback; rows vanish or mutate silently
- category: post-action-feedback
- affected_state: BOTH — main 141-184 / 245-268; B33 adds Restore (415-441) and the whole report queue (runReportAction + five report actions) with the same silence. `git grep announceForAccessibility f5594171 -- src/screens/AdminScreen.tsx` returns nothing.
- confidence: HIGH
- claim: After Remove/Dismiss (and in B33 Restore, Reject flag, Remove flag, Delete comment, No action, Target unavailable, Finish review) the only outcome is the row disappearing or its StatusBadge changing; there is no `announceForAccessibility`, no live region on the list, and success has no visual toast either. Errors use `Alert.alert` (fine on native, silent on web).
- evidence: AdminScreen.tsx:141-163 handleRemove, :165-184 handleDismiss — success path only `setFlags(...)`; :237-243 the action buttons are replaced by a spinner (focus lost) then the card disappears. Compare MyWatchedModal.tsx:194-203 (A3: "a ROW DISAPPEARING is the one result a screen reader cannot observe").
- why_it_matters: A moderator using VoiceOver cannot tell whether a permanent delete happened; the F18 double-tap guard exists precisely because repeated presses are likely.
- verification_needed: iOS VoiceOver on Admin: Remove a flag, confirm nothing is announced and where focus lands after the card unmounts.

### CAND-D-06 — MEDIUM — AdminScreen truncates the content being moderated with no way to expand
- category: ux-content-truncation
- affected_state: BOTH — main :222 (flag description `numberOfLines={2}`); B33 widens it: 481 (description 2), 592 (report reason 3), 610 (target flag description 2), 628 (reported comment 3).
- confidence: HIGH
- claim: The moderator decides "Remove flag" / "Delete comment" / "Reject" from cards that clip the description, the reporter's reason and the reported comment at 2-3 lines with no expand affordance and no detail view. At large Dynamic Type three lines hold a sentence fragment.
- evidence: AdminScreen.tsx:222 `numberOfLines={2}`; B33 AdminScreen.tsx:481, 592, 610, 628. Note B33 itself REMOVED `numberOfLines={2}` from MyReportsModal (diff @@ -262) and ActivityFeedModal (diff @@ -196) rows, acknowledging the truncation problem, but not on the one screen where the full text is load-bearing.
- why_it_matters: Wrong moderation decisions on partial evidence; for the abuse-report queue (Apple 1.2(b)) the reason text is the whole case.
- verification_needed: Seed a flag with a 2000-char description and a report with a long reason; open Admin at default and AX sizes and confirm there is no route to the full text.

### CAND-D-07 — MEDIUM — NotificationPrefsModal swallows a failed preference save: the switch stays flipped, nothing is said
- category: error-feedback / user-data-write
- affected_state: BOTH — main 143-154 unchanged (B33 154-157).
- confidence: HIGH
- claim: `handleToggle` optimistically flips the switch and fire-and-forgets `savePrefs`; the rejection handler is an explicit no-op ("swallowed — savePrefs already warned"). A user (sighted or not) is shown a preference that did not persist; the comment defers correction to "next focus reconciles", i.e. the switch silently flips back later.
- evidence: NotificationPrefsModal.tsx:147-152; contrast the F43 rule applied in MyWatchedModal.tsx:204-216 and FlagDetailModal.tsx:529-534 ("a failed save means … did NOT stick — say so, per the user-data write tier"). NotificationPreferencesScreen delegates to its hook (not reviewed here).
- why_it_matters: Muting "Rejected" updates and then receiving them anyway is exactly the kind of preference failure users cannot diagnose.
- verification_needed: Force `savePrefs` to reject (e.g. AsyncStorage quota) and toggle; confirm no notify/announce and that the switch reverts only on the next Profile focus.

### CAND-D-08 — LOW — MyWatchedModal row actions: hit-slop regions overlap and the unwatch star is a 24pt visible/AT target
- category: touch-target
- affected_state: BOTH — main 292-316, 623-624 unchanged (B33 304, 315-316, 666).
- confidence: HIGH (geometry from source)
- claim: `rowRight` gap is spacing.sm (8pt); "Show on map" carries hitSlop 8 and "Stop watching" hitSlop 10, so their slop zones overlap by 10pt and the later sibling (unwatch) wins the ambiguous strip. The star button itself is 16pt glyph + 4pt padding = 24x24 visible and that is the frame VoiceOver draws; 44 exists only via slop, which the codebase's own SW-22/SW-43 notes say is invisible to the accessibility frame and must be "real".
- evidence: MyWatchedModal.tsx:294-304 (hitSlop 8), :306-315 (hitSlop 10), :623 `rowRight … gap: spacing.sm`, :624 `unwatchBtn: { padding: spacing.tight }`; the app's own overlap rule at CommentBubble.tsx:402-407 ("any gap below 16 makes the two slop regions OVERLAP"); real-size rule at MyWatchedModal.tsx:612-617.
- why_it_matters: A mis-tap aimed at "Show on map" removes the flag from the watched list (announced, but still a surprise); Switch-Control/VoiceOver users see a 24pt control beside a 44pt one.
- verification_needed: Accessibility Inspector frame of the star; tap the 8pt gap between the two buttons on device.

### CAND-D-09 — LOW — Silent success after FlagDetail edit-save and delete, and after MyWatched "Clear all"
- category: post-action-feedback
- affected_state: BOTH — FlagDetailModal main 781-806 / 1033-1055 unchanged (B33 823 / 1091-1106); MyWatchedModal main 219-240 unchanged (B33 226-238).
- confidence: HIGH
- claim: Edit-save collapses the form with no "Changes saved" announcement; Delete confirms, closes the sheet and reloads the parent with no "Flag deleted" announcement (verify/resolve/reject on the same sheet do announce at :835-841). "Clear all" empties the list and lands on an EmptyState that is not `live`, so a VoiceOver user hears nothing after confirming a bulk removal.
- evidence: FlagDetailModal.tsx:790-793 (setShownFlag/onEdited/setIsEditing only), :1047-1049 (deleteFlag → onDeleted → onClose); MyWatchedModal.tsx:229-231 (setFlags([]) then clearWatched), :526-534 EmptyState without `live` (EmptyState.tsx:65-70 documents the prop for exactly this).
- why_it_matters: WCAG 4.1.3; the single-item unwatch path already announces (MyWatchedModal.tsx:199-203), so the bulk path is an inconsistency.
- verification_needed: VoiceOver: save an edit, delete a flag, clear all watched; note what is spoken.

### CAND-D-10 — LOW — Pull-to-refresh is the only refresh on AdminScreen (and Leaderboard), and the UI instructs the user to drag
- category: dragging-alternative (WCAG 2.5.7)
- affected_state: BOTH — AdminScreen main 289, 308-310; B33 767-781 and 839 repeat "· pull to refresh" for both queues. LeaderboardScreen main 436-438 unchanged.
- confidence: HIGH
- claim: The list sheets got a 44pt Refresh button as the single-pointer alternative (A11Y-222), but Admin's only refresh is the RefreshControl drag (plus an invisible tab-blur/focus reload), and its header text literally says "pull to refresh". Leaderboard's RefreshControl has `refreshing={false}` and no button; the ranking-period tab is the only non-drag reload.
- evidence: AdminScreen.tsx:288-290, :307-311; LeaderboardScreen.tsx:436-438; the alternative pattern at MyReportsModal.tsx:288-304.
- why_it_matters: Users who cannot perform a drag (switch access, tremor, some AT) have no discoverable way to refresh the moderation queue.
- verification_needed: Confirm no other refresh route on Admin beyond tab switching.

### CAND-D-11 — LOW — Nameless spinners on Admin (isAdmin pending) and Profile (auth pending)
- category: loading-state-label
- affected_state: BOTH — AdminScreen main 114 (B33 346); ProfileScreen main 869 (region unchanged in B33 diff).
- confidence: HIGH
- claim: `<ActivityIndicator>` without `accessibilityLabel`, violating the file's own A4 rule ("every spinner has a label", StatusHistoryModal.tsx:190-194).
- evidence: AdminScreen.tsx:113-115; ProfileScreen.tsx:865-870.
- why_it_matters: VoiceOver lands on an unnamed animating element while the admin gate resolves.
- verification_needed: None beyond code; trivial fix.

### CAND-D-12 — LOW (web-only) — Lucide icons without decorativeProps inside scope
- category: decorative-icon-exposure
- affected_state: BOTH — none of the sites changed in B33 except new ones added (B33 AdminScreen 565, 567, 789, 847).
- confidence: MEDIUM (native VoiceOver skips SVGs; browser screen readers can announce "graphic")
- claim: The estate spreads `decorativeProps` on ~180 icons because rn-web forwards nothing to aria-hidden otherwise (accessibility.ts:47-67); these sites omit it. Inside labelled Pressables the impact is minimal; outside them (empty/alert states) a web screen reader can announce a bare graphic.
- evidence: AdminScreen.tsx:128 Lock (inside accessible alert), :252 Trash2, :264 Ban, :317 Inbox; MyReportsModal.tsx:252 MapPin; MyWatchedModal.tsx:303 MapPin, :314 Star; ProfileScreen.tsx:1310 Flame, :1350 MapPin, :2087 X; HiddenCommentsModal.tsx:356 X; ReportContentModal.tsx:296 X; FlagDetailModal.tsx:1435 X; B33 AdminScreen.tsx:565/567 MessageSquare/Ban, :789/:847 Inbox.
- why_it_matters: Web is the guest surface; noise in the reading order.
- verification_needed: NVDA/VoiceOver-Safari on web build.

### CAND-D-13 — LOW — Chip-group names are inert on iOS; FlagDetail edit radios have no radiogroup
- category: grouping-semantics
- affected_state: BOTH — MyReportsModal 360, ActivityFeedModal 254, MyWatchedModal 378/404, ProfileScreen 1382 unchanged; FlagDetailModal 1886-1914 / 1916-1941 unchanged (B33 2059, 2086).
- confidence: MEDIUM
- claim: `accessibilityLabel="Filter by status"` / "Sort order" / "Filter activity" / "Your reports by status" sit on non-accessible Views or horizontal ScrollViews with no role, so iOS never speaks the group name (and making them `accessible` would trap the chips). The edit form's category and severity `accessibilityRole="radio"` cells have no `radiogroup` container, unlike ReportContentModal.tsx:341-346 which does it correctly.
- evidence: as listed; SegmentedControl.tsx:87-90 documents the "unlabeled group is announced as nothing" rule (A11Y-218).
- why_it_matters: Screen-reader users hear "Newest, button, selected" with no context that it is a sort choice.
- verification_needed: VoiceOver rotor/containers on the chip rows.

### CAND-D-14 — LOW — ReportContentModal: inert-but-undimmed controls mid-send; reason field has no optional/limit cue
- category: disabled-state-visibility / form-guidance
- affected_state: BOTH — unchanged in B33 (only presentation prop changed).
- confidence: HIGH
- claim: During `submitting`, Close (:284-297), Cancel (:450-461), the five radios (:350-364) and the terms link (:416-428) are `disabled` with a11yToggle but no visual change (only Send dims, :465) — the SW-49 class FlagDetail fixed with `btnDisabled`. The reason TextInput (:390-401) has `maxLength` but no counter and no hint that it is optional (category alone suffices) or capped.
- evidence: ReportContentModal.tsx lines above; FlagDetailModal.tsx:2613-2631 for the SW-49 rationale.
- why_it_matters: Short window, but on a slow rung-1 insert a user taps Cancel and nothing happens; typed text stops at the cap with no explanation.
- verification_needed: Throttle network and press Cancel mid-send.

### CAND-D-15 — LOW — PhotoLightboxModal: a photo that fails to load is hidden from assistive tech; image lacks `image` role
- category: image-semantics
- affected_state: BOTH — no diff.
- confidence: MEDIUM
- claim: On a dead/blocked URL RemoteImage renders its default fallback with `importantForAccessibility="no-hide-descendants"` (RemoteImage.tsx:68-84), so a VoiceOver user who opened "Photo viewer" hears only the Close button and no "photo could not load". The successful image is `accessible` + label but has no `accessibilityRole="image"` (AdminScreen.tsx:232-234 sets it).
- evidence: PhotoLightboxModal.tsx:73-80; RemoteImage.tsx:71-84.
- why_it_matters: Failure state silently indistinguishable from "no photo" for AT users.
- verification_needed: Open lightbox on a flag whose photo_url 404s with VoiceOver on.

### CAND-D-16 — NOTE — B33 account-deletion status card copy is contradictory for a signed-in reader
- category: ux-copy
- affected_state: SUBMITTED_BUILD_33 only (added in diff @@ -1883 → B33 ProfileScreen.tsx:1963-1990; not in main).
- confidence: LOW (intent unknown)
- claim: Two of the status strings shown to a user who is signed in and looking at their own profile read "Your account remains available only while deletion is being completed" (DELETING) and "Your account remains unavailable while a deletion review is completed" (REVIEWING). "Unavailable" while the account is demonstrably in use is confusing; the `Delete Account` button is disabled while any status exists, with the hint pointing "above" to the status card — correct spatially, but the card is a GlassSurface with an Android-only live region and no iOS announce (same class as CAND-D-04).
- evidence: B33 ProfileScreen.tsx:1964-1975, :1977-1982 disabled Delete + hint.
- why_it_matters: The deletion path is a privacy-sensitive flow (Const. Art. 9.6); ambiguous status copy invites repeat requests or support mail.
- verification_needed: Product/Sky ratification of the strings; confirm which statuses can actually be observed while signed in (delete-account Edge Function v4 is the only deployed one).

## Notes

- Documented, deliberate sub-44 visible targets left out of the candidate list: ProfileScreen tier pill (minHeight 32 + hitSlop 8, ProfileScreen.tsx:2361-2368 records Sky's call) and CommentBubble footer/delete buttons (~30pt visible + hitSlop 8, CommentBubble.tsx:261-266, "TREATMENT AWAITS SKY"). Both meet WCAG 2.5.8 (24pt) but not the house 44pt-real rule.
- Dynamic Type caps found in scope are all >= 1.3: ProfileScreen.tsx:1080 hero numeral 1.3 (display variant default), MyWatchedModal.tsx:284 SeverityDisc 1.3 (decorative digit in a fixed 24pt box), PhotoGallery "No photos" 1.4, Input 1.5. No `allowFontScaling={false}` anywhere in src. No fixed `height: N` box with scaling text was found in scope; fixed heights are images, icon circles, or the 44pt severity buttons (digit capped 1.4 in a 44 box).
- B33 improves Dynamic Type materially on ProfileScreen (TypeBlock content on nav groups and point history, AX recompose), Achievements, Leaderboard and MyWatched, and removes row-description truncation in MyReports/ActivityFeed; none of those diffs regress semantics. B33 FlagDetail drops `useReducedMotion` but the replacement `useSheetPullDismissLifecycle` reads it (B33 SheetPull.tsx:133,162).
- Guest-only controls (B33 "Sign in to review") were out of scope for this lane.
