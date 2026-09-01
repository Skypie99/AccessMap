# FINAL BUILD 32 STABILIZATION RECEIPT

BASE SHA:
`7e13d76e70e6604f4ee1035267fecdb4ad387905`

BASE TREE:
`0dadbc0b0bc674ba67a3ebb5851f797a84937f80`

FINAL REPAIR SHA:
`8df608220a6486e6b749d9364b6ade63540eea11`

FINAL REPAIR TREE:
`2fe715d6d2903860b2d849a8aa8beb4f4e3aeca5`

WORKTREE:
`/Users/skypie/AccessMap-codex/final-ui-stabilization-build32`

BRANCH:
`codex/final-ui-stabilization-build32-20260831`

ROOT CAUSE — SHEET FLICKER:
`SheetPull` completed its downward animation, reset its native translation to zero, and only then asked the owning `Modal` to close. The reset happened while the native modal was still visible, so the card jumped back on-screen for a frame before the modal dismissal finished. The shared primitive now holds the card below the viewport until `Modal.onDismiss`, then resets it. Direct `SheetPull` adopters (Legend, report, and flag detail) use the same lifecycle.

ROOT CAUSE — SHEET HEIGHT/DISMISS:
Several affected surfaces still used compact, hand-rolled 90%-capped modals or standard content-sized `Sheet` geometry. Filter Flags was an inline, collapsible overlay rather than a sheet. My Feedback, Help, and Address Search therefore did not inherit the shared swipe, focus, safe-area, and expanded-height behavior. The affected surfaces now use the existing expanded shared `Sheet`, scroll-aware pull arming, and keyboard-aware pull disabling. About Flagstone source was not changed.

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
FAIL — rendered session not completed. The exact repaired bundle reached the existing iOS development client, then correctly stopped because this isolated worktree has no Supabase environment configuration. Credentials were not copied, sourced, inspected, or printed from another checkout.

XXXL:
FAIL — same rendered-environment blocker.

ABOUT FLAGSTONE CONTROL:
FAIL — source guard passed and its source was unchanged, but the required rendered control check was not completed.

CLOSE FLICKER:
FAIL — focused lifecycle tests passed; rendered one-swipe/one-close acceptance remains unverified.

SHEET HEIGHT:
FAIL — expanded-adoption guards passed; rendered Large/XXXL acceptance remains unverified.

SWIPE DISMISS:
FAIL — shared gesture tests passed; rendered touch acceptance remains unverified.

KEYBOARD AVOIDANCE:
FAIL — source/type/tests passed; rendered keyboard workflow remains unverified.

TASK→MAP CARD FLICKER:
FAIL — scheduler/readiness tests passed; rendered navigation acceptance remains unverified.

SEARCH HELPER CLIPPING:
FAIL — helper copy is unchanged and now uses scalable `font.lineHeight.sm`; rendered Large/XXXL acceptance remains unverified.

FILTER FLAGS:
FAIL — source now uses an expanded scrollable shared sheet with clean successor-surface handoff; rendered acceptance remains unverified.

SAVED PLACES:
FAIL — source now uses expanded keyboard-aware geometry; rendered acceptance remains unverified.

AVATAR SOURCE FLOW:
PASS — focused test starts with an APP1 source fixture containing explicit `Exif` and `GPS` bytes, proves uploaded bytes contain neither marker, proves the exact missing-RPC response selects the owner-scoped fallback only after sanitization, and proves the users row receives the sanitized URL. Existing report-photo sanitizer tests also passed even though shared sanitizer code did not change.

DYNAMIC TYPE RESTORED TO LARGE:
NO — Dynamic Type was not changed because the rendered app could not pass its environment guard.

UNRESOLVED RELEASE BLOCKERS:
1. One attributable local rendered session at Large and Accessibility XXXL is still required for every named surface and About Flagstone control.
2. The Build 32 physical TestFlight avatar proof is still required: select a known-location-metadata photo, upload, retrieve the stored object, and independently prove GPS/location and other source metadata are absent.
3. Because items 1–2 remain open, no EAS build is authorized by this receipt.

PHYSICAL-DEVICE CHECKS STILL REQUIRED:
1. After local rendered acceptance passes and Sky independently launches the one Build 32 binary, use a photo with known GPS/location EXIF as the avatar.
2. Confirm selection and upload succeed without the Build 31 unavailable-feature error.
3. Retrieve/inspect the stored image and prove GPS/location, EXIF, and other source metadata removed by the shared sanitizer are absent.
4. Re-run the named sheet/map/keyboard checks on physical Build 32 at Large and Accessibility XXXL, including one-swipe/one-close and Tasks → Map one-presentation behavior.
5. The shared sanitizer source did not change, so the hard requirement does not force another report-photo device proof; the existing report-photo sanitizer automated suite nevertheless passed.

BUILD 32 READY:
NO

NEXT:
Provide this isolated worktree with approved local runtime configuration without exposing credentials, then run the one consolidated Large → XXXL → restore-Large simulator session. If it passes, Sky may decide whether to launch the single Build 32 EAS build. Do not launch EAS from this receipt.

## Gates and actual results

- Exact base identity: PASS (`HEAD` and tree matched the requested base; tracked state clean before edits).
- Focused final Jest selection: PASS — 31 suites, 442 passed, 14 todo, 0 failed.
- Avatar shared sanitizer/report-photo regression suite: PASS (`src/lib/__tests__/flags.test.ts` included in the 31-suite run).
- Typecheck: PASS — `tsc --noEmit`, exit 0.
- Lint: PASS — exit 0, 0 errors, 92 pre-existing warnings across the tree.
- Diff audit: PASS — `git diff --check`, exit 0.
- Package/lock audit: PASS — no package or lockfile changes.
- Local rendered launch: BLOCKED — exact worktree bundled successfully (1,634 modules); app fail-closed error: Supabase environment variables missing. No credential workaround was attempted.
- CoreSimulator command-line probe also returned an unavailable CoreSimulatorService, while the already-running Simulator UI remained accessible. This environment result proves nothing about app layout.

## What's left

Only the consolidated rendered/device acceptance described above. Source implementation and automated verification are complete. The candidate is deliberately not marked ready.

## DECISIONS FOR SKY

### 1. Approved local runtime configuration for the isolated worktree

- Decision: how the exact worktree should receive its local Supabase runtime configuration for the one rendered session.
- Recommendation: use Sky's existing approved local configuration mechanism without sharing values in chat or copying them into Git, then rerun this worktree's single acceptance session.
- Why: the app intentionally refuses to start without configuration, and estate rules prohibit Codex from inspecting or handling credentials.
- Alternative: skip local rendered acceptance.
- Impact: the alternative leaves all Large/XXXL/touch/keyboard claims unproven and keeps `BUILD 32 READY: NO`.

### 2. Build authorization after local acceptance

- Decision: whether to launch the single Build 32 EAS build after the local rendered matrix passes.
- Recommendation: Sky launches exactly one Build 32 only after every local row passes; Codex does not launch it.
- Why: the requested consolidation rule forbids another binary before sheet/map/avatar source and local acceptance are complete.
- Alternative: request Build 32 now from source/test evidence alone.
- Impact: the alternative violates the hard readiness requirement and risks a Build 33.

### 3. Future upload-intent backend rollout

- Decision: whether the currently absent upload-intent RPC system should be deployed in a separately authorized backend change later.
- Recommendation: keep it outside this stabilization wave; use the exact missing-function compatibility path for Build 32 and review the coupled D1F4 upload-intent migration separately.
- Why: the existing proposed migration is coupled to broader account-deletion/auth safeguards, and production mutation was explicitly prohibited without approval.
- Alternative: authorize a reviewed production migration before Build 32.
- Impact: the alternative materially expands scope and release risk; no such mutation was performed.
