# FINAL BUILD 32 STABILIZATION RECEIPT

BASE SHA:
`7e13d76e70e6604f4ee1035267fecdb4ad387905`

BASE TREE:
`0dadbc0b0bc674ba67a3ebb5851f797a84937f80`

FINAL REPAIR SHA:
`30fbbb7eeb6f25c7b9949d34696ea86daba04360`

FINAL REPAIR TREE:
`d1746e0cc3f6f834e20d088e3da21dd064cfe4d0`

WORKTREE:
`/Users/skypie/AccessMap-codex/final-ui-stabilization-build32`

BRANCH:
`codex/final-ui-stabilization-build32-20260831`

ROOT CAUSE — SHEET FLICKER:
`SheetPull` completed its downward animation, reset its native translation to zero, and only then asked the owning `Modal` to close. The reset happened while the native modal was still visible, so the card jumped back on-screen for a frame before the modal dismissal finished. The shared primitive now holds the card below the viewport until `Modal.onDismiss`, then resets it. Direct `SheetPull` adopters (Legend, report, and flag detail) use the same lifecycle.

ROOT CAUSE — SHEET HEIGHT/DISMISS:
Several affected surfaces still used compact, hand-rolled 90%-capped modals or standard content-sized `Sheet` geometry. Filter Flags was an inline, collapsible overlay rather than a sheet. My Feedback, Help, and Address Search therefore did not inherit the shared swipe, focus, safe-area, and expanded-height behavior. The affected surfaces now use the existing expanded shared `Sheet`, scroll-aware pull arming, and keyboard-aware pull disabling. The rendered XXXL pass then exposed a second bounded cause: My Reports and Recent Activity capped descriptions at two lines. Those two caps were removed so the existing scrollable rows can show complete copy. About Flagstone source was not changed.

ROOT CAUSE — TASK→MAP CARD:
The readiness ladder called native `showCallout` five times even after the first presentation. Reopening a native callout is not idempotent and caused the visible open/close/open pulse. The scheduler also captured a null map handle at schedule time and left the Tasks navigation intent in route params. Platform handles now return whether a marker was ready, the ladder reads the live handle on each rung and stops after the first successful presentation, and the focus intent is cleared after the bounded readiness window.

ROOT CAUSE — AVATAR:
The Build 31 client calls `prepare_flag_photo_upload`, then translates a missing-function response into “That feature isn't available yet.” A read-only live schema inspection confirmed that `prepare_flag_photo_upload`, `commit_avatar_photo_upload`, and `cancel_flag_photo_upload` are not deployed. It also confirmed that the `flag-photos` bucket, owner upload/delete policies, `public.users.avatar_object_key`, and owner profile UPDATE policy are present. The repair uses the proven owner-scoped avatar object path only for the exact missing-function response. All other backend failures still fail. Path selection remains after the existing shared report-photo re-encode, metadata sanitizer, structural verification, and MIME gates, so original bytes cannot reach Storage.

SHARED PRIMITIVE / SYSTEM USED:
- Existing `Sheet` and `SheetPull`; no second dismissal implementation.
- Existing `uploadStrippedImage` → native/web re-encode → `sanitizeImageMetadata` → `verifyExifStripped`; no duplicate avatar sanitizer.
- Existing `useAtTop` scroll/pull arbitration and `useKeyboardVisible` workflow guard.
- Existing map callout scheduler, changed from repeated presentation to readiness-until-first-success.

## Compact surface inventory

| Surface group | Owner/primitive before | Repair |
|---|---|---|
| Reports, Watched, Achievements, Leaderboard, Updates, Feedback | Shared `Sheet` / shared owner state | Shared dismissal-complete reset applies once |
| Recent Activity, What's New | Shared standard `Sheet` | Expanded shared `Sheet` |
| My Feedback, Help | Hand-rolled `Modal` + KAV | Expanded shared `Sheet`, RNGH scroll, keyboard-safe pull |
| Address Search | Hand-rolled full-height `Modal` + KAV | Expanded shared `Sheet`, token line height, keyboard-safe pull |
| Saved Places | Standard shared `Sheet` + KAV | Expanded shared `Sheet`, keyboard-safe pull |
| Filter Flags | Inline/collapsible map overlay | Expanded shared `Sheet`, full scroll, dismissal-complete successor handoff |
| Legend/report/detail | Direct `Modal` + `SheetPull` | Dismissal-complete translation reset |
| Tasks → Map callout | Repeated imperative open ladder | Live readiness ladder, first-success stop, consumed route intent |

CHANGED SOURCE FILES:
- `src/components/ActivityFeedModal.tsx`
- `src/components/AddressSearchModal.tsx`
- `src/components/ChangelogModal.tsx`
- `src/components/FlagDetailModal.tsx`
- `src/components/HelpModal.tsx`
- `src/components/MyFeedbackModal.tsx`
- `src/components/MyReportsModal.tsx`
- `src/components/PlatformMap.tsx`
- `src/components/PlatformMap.web.tsx`
- `src/components/SavedPlacesModal.tsx`
- `src/components/ui/Sheet.tsx`
- `src/components/ui/SheetPull.tsx`
- `src/lib/users.ts`
- `src/screens/LegendModal.tsx`
- `src/screens/MapScreen.tsx`
- `src/screens/ReportFlagModal.tsx`
- `src/__tests__/finalBuild32SheetAdoption.guard.test.ts`
- `src/lib/__tests__/users.test.ts`
- `src/screens/__tests__/MapScreen.calloutRhythm.test.ts`
- `src/screens/__tests__/MapScreen.detailFocus.test.tsx`
- `src/screens/__tests__/MapScreen.guestHandoff.test.tsx`
- `src/screens/__tests__/MapScreen.headerActions.test.ts`
- `src/screens/__tests__/MapScreen.oneSurface.test.ts`

PACKAGE / LOCKFILE CHANGED:
NO

SUPABASE / PRODUCTION CHANGED:
NO. Read-only schema/catalog inspection only. No RPC, migration, policy, bucket, row, auth, or configuration mutation occurred.

LARGE TEXT:
PASS — the complete named surface/height/copy/close-control/keyboard sweep rendered. After the automated drag control proved unreliable, Sky supplied one real downward Simulator swipe per required sheet while Codex captured and inspected each transition. Every sheet closed exactly once and remained closed.

XXXL:
PASS — every named surface rendered at true `accessibility-extra-extra-extra-large`; one visible two-line truncation was reproduced and repaired in My Reports and Recent Activity, then reverified without ellipses. The previously blocked Saved Places naming field was opened with the approved fixed synthetic Simulator location and verified with the software keyboard at XXXL without saving.

ABOUT FLAGSTONE CONTROL:
PASS — rendered at Large and Accessibility XXXL with the native page-sheet geometry, complete accessibility tree, reachable Close control, and no source change.

CLOSE FLICKER:
PASS — the visible Close-control path passed across every named sheet at both sizes. The real swipe path also passed for My Reports, Watched Flags, Recent Activity, Achievements, Leaderboard, Updates, My Feedback, Help & FAQ, What's New, Send Feedback, About Flagstone, Map Legend, Filter Flags, Saved Places, and Search by Address. Each recording contained one open-to-closed transition and no later reopen or flicker.

SHEET HEIGHT:
PASS — My Reports, Recent Activity, My Feedback, Help & FAQ, What's New, Filter Flags, and Saved Places all rendered with expanded usable height at Large and Accessibility XXXL.

SWIPE DISMISS:
PASS — Sky performed one real downward Simulator swipe on each required sheet while Codex recorded the Simulator display. Frame-sequence inspection showed one dismissal transition followed by a stable closed state for every sheet. Accessibility state independently confirmed the expected Profile or Map surface after each close. Temporary recordings and extracted frames were deleted after inspection.

KEYBOARD AVOIDANCE:
PASS — My Reports, Help & FAQ, Send Feedback, and Search by Address kept the active field and Close control visible with the software keyboard at Large/XXXL. For Saved Places, the approved fixed, non-personal Simulator coordinate enabled the naming state at Large and XXXL; `Synthetic test place` entered successfully, the field plus Cancel/Save/Close controls remained reachable, and the software keyboard rendered without obscuring the naming controls. Save was never selected, the synthetic name was discarded, and the synthetic location plus temporary location permission were cleared afterward.

TASK→MAP CARD FLICKER:
PASS — recorded and observed at Large and Accessibility XXXL. The selected barrier resolved to one stable Map card; it remained presented through the final 15-second observation with no repeated opening or closing.

SEARCH HELPER CLIPPING:
PASS — the unchanged helper copy wrapped completely at rest at Large and Accessibility XXXL; the input and Close control remained visible with the software keyboard.

FILTER FLAGS:
PASS — expanded sheet, full option accessibility tree, visible controls, and stable Close-control dismissal rendered at Large and Accessibility XXXL.

SAVED PLACES:
PASS — expanded height and complete empty-state copy passed at Large and Accessibility XXXL. The naming field, software keyboard, input, Cancel, Save, and Close controls were rendered and reachable at both sizes using only the approved fixed synthetic Simulator coordinate. No place was saved and no production mutation occurred. Its real downward swipe closed once with no reopen or flicker.

AVATAR SOURCE FLOW:
BLOCKED FOR DEVICE — the local Profile control requested photo-library access and opened the native photo picker successfully. No photo was selected because that would immediately write to configured Storage/profile state without the separately required mutation approval. Focused tests start with an APP1 fixture containing explicit `Exif` and `GPS` bytes, prove uploaded bytes contain neither marker, prove the exact missing-RPC response selects the owner-scoped fallback only after sanitization, and prove the users row receives the sanitized URL. Existing report-photo sanitizer tests also passed; shared sanitizer source did not change.

DYNAMIC TYPE RESTORED TO LARGE:
YES — the main sweep queried `large`, changed once to `accessibility-extra-extra-extra-large`, then restored once. The explicitly approved Saved Places completion row made one additional bounded Large → XXXL → Large check. Final Simulator state was queried as `large`.

UNRESOLVED LOCAL RELEASE BLOCKERS:
NONE.

PHYSICAL-DEVICE CHECKS STILL REQUIRED:
1. After Sky independently launches the one Build 32 binary and it reaches physical TestFlight, use a photo with known GPS/location EXIF as the avatar.
2. Confirm selection and upload succeed without the Build 31 unavailable-feature error.
3. Retrieve/inspect the stored image and prove GPS/location, EXIF, and the other source metadata removed by the shared sanitizer are absent.
4. The shared sanitizer source did not change, so no normal report-photo device recheck is required by the consolidation rule.

BUILD 32 READY:
YES

NEXT:
Sky may initiate the single consolidated Build 32. Codex did not launch EAS. After that one binary reaches physical TestFlight, perform only the avatar upload/retrieval/metadata inspection listed above.

## Gates and actual results

- Exact base identity: PASS (`HEAD` and tree matched the requested base; tracked state clean before edits).
- Focused final Jest selection: PASS — 31 suites, 442 passed, 14 todo, 0 failed.
- Avatar shared sanitizer/report-photo regression suite: PASS (`src/lib/__tests__/flags.test.ts` included in the 31-suite run).
- Typecheck: PASS — `tsc --noEmit`, exit 0.
- Lint: PASS — exit 0, 0 errors, 92 pre-existing warnings across the tree.
- Diff audit: PASS — `git diff --check`, exit 0.
- Package/lock audit: PASS — no package or lockfile changes.
- Approved local runtime launch: PASS — the ignored runtime links were checked for existence only; values and link targets were not inspected, printed, copied, or modified.
- Focused post-render repair checks: PASS — 3 suites, 23 tests, 0 failed. Existing My Reports tests emitted pre-existing React `act(...)` warnings but passed.
- Rendered Large → Accessibility XXXL → Large session: PASS — all named presentation/copy/control rows ran; Dynamic Type restoration was confirmed. The approved completion session then closed the Saved Places naming/keyboard row at both sizes and supplied recorded real-touch swipe evidence for every required sheet.
- Rendered XXXL regression repair: PASS — removed only the two `rowDesc` line caps in My Reports and Recent Activity; both re-rendered with complete descriptions, and the new source guard passed.
- Real swipe capture matrix: PASS — 15 sheets; each sequence was open → dismissal transition → stable closed, with no later open state. All temporary video/frame evidence was deleted after inspection.
- Synthetic Saved Places completion: PASS — fixed non-personal Simulator coordinate only; synthetic name discarded; Save never selected; location cleared; temporary permission revoked; final Dynamic Type `large`.

## What's left

Only the physical avatar upload/storage metadata inspection remains, deliberately deferred until the one authorized Build 32 reaches physical TestFlight. Local rendered acceptance is complete and the source candidate is ready for that single build.

## DECISIONS FOR SKY

### 1. Synthetic simulator location for Saved Places keyboard proof

- Decision: RESOLVED — Sky authorized one fixed, clearly synthetic, non-personal Simulator location for this row only.
- Result: PASS at Large and XXXL without pressing Save. The synthetic name was discarded, then the location and temporary permission were cleared.

### 2. Real touch-swipe observations

- Decision: RESOLVED — Sky supplied one real downward Simulator swipe per required sheet while Codex recorded and inspected the transitions.
- Result: PASS for all 15 sheets; each closed once and stayed closed with no reopen/flicker.

### 3. Build authorization after local acceptance

- Decision: whether to launch the single Build 32 EAS build after the local rendered matrix passes.
- Recommendation: Sky launches exactly one Build 32 only after every local row passes; Codex does not launch it.
- Why: the requested consolidation rule forbids another binary before sheet/map/avatar source and local acceptance are complete.
- Alternative: request Build 32 now from source/test evidence alone.
- Impact: the alternative violates the hard readiness requirement and risks a Build 33.

### 4. Future upload-intent backend rollout

- Decision: whether the currently absent upload-intent RPC system should be deployed in a separately authorized backend change later.
- Recommendation: keep it outside this stabilization wave; use the exact missing-function compatibility path for Build 32 and review the coupled D1F4 upload-intent migration separately.
- Why: the existing proposed migration is coupled to broader account-deletion/auth safeguards, and production mutation was explicitly prohibited without approval.
- Alternative: authorize a reviewed production migration before Build 32.
- Impact: the alternative materially expands scope and release risk; no such mutation was performed.
