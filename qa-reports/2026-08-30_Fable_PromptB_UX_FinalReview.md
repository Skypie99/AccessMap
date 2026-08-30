# Flagstone Prompt B Fable UX Final Review

## Inputs

- Repository: `Skypie99/AccessMap`.
- Audited product source: `2762a5447600e8de55be912ccb26e95456484945` (same SHA B2 audited; this branch is based exactly on it).
- Canonical technical input: B2 final architecture report at `bd8ec619fdfaf862f1d568f80094242a324d610f`, `qa-reports/2026-08-30_SolMax_PromptB_B2_FinalArchitecture.md` on `origin/codex/solmax-prompt-b-b2-final-architecture-20260830`.
- B2 is treated as authoritative for backend scope, schema, privacy grants, server authority, media/storage, deletion architecture, worker ownership, build strategy, and technical stop conditions. Nothing below overrides those decisions.
- Scope of this review: human-visible state truth only, on the Prompt-B surfaces. Source was inspected read-only: `src/lib/errors.ts`, `src/lib/copy.ts`, `src/lib/location.ts`, `src/lib/photos.ts`, `src/lib/flagsStore.tsx` (state semantics only), `src/screens/HomeScreen.tsx`, `src/screens/TasksScreen.tsx`, `src/screens/MapScreen.tsx`, `src/components/FlagDetailModal.tsx`, and — for state/copy semantics only — `src/screens/ProfileScreen.tsx`, `src/components/MyReportsModal.tsx`, `src/components/ActivityFeedModal.tsx`, `src/screens/SignInScreen.tsx` (deletion-receipt card), `src/lib/accountDeletionReceipt.ts`.
- ActivityFeedModal is under an active Prompt-A layout repair. This review touches its STATE SEMANTICS only and gives no layout, Sheet, or SectionList instructions. Any ActivityFeed observation here is DEFER / REVALIDATE AGAINST FINAL PROMPT-A SHA.
- No product edits, no test edits, no backend changes, no migrations, no simulator, no native build, no merge, no deployment. The only file this branch adds is this report.

## Executive UX Verdict

The B2 minimum client contract is the right human-experience cut, and most of what it needs is already designed correctly in the audited source — the failure/empty/offline honesty gates on Home, Tasks, and Map are unusually good and must be preserved, not rewritten. The genuine user-facing defects are exactly the four B2 already scoped: the double-period failure banner, Home's three uncaught Retry paths, raw native location diagnostics reaching an alert, and a gallery that renders backend failure as "No photos" and can show a previous flag's photos under the current flag. This review adds exact copy for the two places B2 left wording open (gallery error, location failure), confirms the shared failure sentence, and raises one item outside B2's client file list for technical recheck: the account-deletion card's "status unavailable" branch offers only an unconfirmed "Dismiss unavailable receipt" with no way to re-check status, which invites a user to discard their recovery receipt during a transient outage. Zero findings require changing B2's backend architecture.

## State-Truth Review

For each surface: can the user always tell LOADING from SUCCESS from EMPTY from ERROR from RETRYING from RECOVERED, plus OFFLINE/STALE where relevant?

### Surface 1 — Shared flag experience (Home / Tasks / Map / Nearby)

The shared provider (`flagsStore.tsx`) has truthful semantics today: it clears `error` only on genuine success or a usable offline-cache fallback, sets `isOfflineCache` + `offlineCachedAt` when serving the cache, and re-throws from `refresh()` when no cache can satisfy the caller.

- **LOADING** — Home shows skeleton rows and a "Loading…" headline on first load (`showFirstLoad`); Tasks/Map have equivalent loading treatments. Truthful.
- **ERROR (empty)** — Home refuses to compute a "0 barriers" census on a settled failure (headline renders `—`, HomeScreen.tsx:358) and shows a distinct error card ("Couldn't load barriers." + "Try again"). Tasks' `ListEmptyComponent` branches on `flagsError` first ("Couldn't load flags") before any filtered/caught-up empty branch (TasksScreen.tsx:~1520). Error cannot masquerade as empty on these surfaces.
- **ERROR (data on screen)** — Home shows a dedicated "Couldn't refresh — showing older data. Tap to try again." banner when a refresh fails over non-cache data (HomeScreen.tsx:588–604); Map and Tasks show the shared `failureBannerText` banner. Correct, except the banner sentence itself currently renders "That feature isn't available yet.. Tap to retry." — the confirmed double period (`copy.ts:69–73` appends `. ${RETRY_VERB}` to a provider message that already ends in a period). B2 mandates the fix; B-UX-001 confirms the exact output.
- **RETRYING** — Map's banner is the model: button role, `disabled` while in flight, busy state, visible "Retrying…" swap, live region (MapScreen.tsx:2583–2616). Home and Tasks keep the prior error visible during retry with no explicit "Retrying…" — acceptable for release because nothing falsely reads as success (B2 question 1 answered: keep prior error visible; do not rebuild Home/Tasks banners for Prompt B; optional convergence is Prompt-C polish, B-UX-010).
- **RECOVERED** — provider clears `error` only on owner success, never on unrelated navigation. Verify visually after the read repair (B-UX-004/005).
- **OFFLINE / STALE** — the offline banner states the data's age (`offlineBannerText(cachedAt)`) and is mutually exclusive with the failed-refresh banner (`error && flags.length > 0 && !isOfflineCache`). A normal user can tell "saved data from 2 hours ago" from "the live request failed" from "genuinely nothing here." Preserve (B-UX-P2).
- **Home Retry defect** — all three Home entry points are bare `void refresh()` (HomeScreen.tsx:349, 590, 618); the provider intentionally re-throws when there is no cache, so a failed Retry is an unhandled rejection and the banner can appear to do nothing. B2 already mandates the caught callback; B-UX-004 verifies the visible behavior.

### Surface 2 — FEATURE_UNAVAILABLE

"That feature isn't available yet." (`errors.ts:27`) is the mapped copy for genuinely-missing backend objects (42P01/42883/PGRST202/PGRST204 and `/does not exist/`). After the B2 read repair this sentence should appear only when the backend truly lacks a table/function — a real "not yet migrated" condition — for which "isn't available yet" is truthful, calm, and does not promise a feature roadmap. Paired with Retry it forms a coherent two-sentence banner once the punctuation is fixed: retrying is legitimate during a rollout window. **No wording change is recommended.** The only defect is composition: B2's required exact output stands — `That feature isn't available yet. Tap to retry.` — one period at each sentence boundary, in both the visible text and every accessibility label that composes the same pair (Map composes its label separately at MapScreen.tsx:2596; it must not diverge from the visible sentence). Copy changes proposed for this surface: 0 of the allowed 3.

### Surface 3 — Location failure

- The permission-denied path is a separate, non-throwing state (`permissionDenied`, the S4 arrival banner, `arrivalPermissionDenied`) with honest first-run behavior — never tells a never-asked user that location is off. Preserve.
- The thrown-exception path leaks: MapScreen's native catch shows `Alert.alert("Couldn't find your location", errorMessage(e))` (MapScreen.tsx:1305) and `useUserLocation` stores `errorMessage(e, 'Could not get location.')` (location.ts:257); `errorMessage` passes unrecognized raw messages through, so `kCLErrorDomain error N` text can reach the user. B2 mandates the location-specific normalizer; B-UX-003 supplies the exact user copy.
- The 15-second timeout already produces good copy ("Location request timed out. Check your signal and try again.", location.ts:51) — the normalizer must not flatten it away; a timeout is more actionable than the generic sentence.
- The app is fully usable without location (Home falls back to LATEST/most-recent honestly; Map still renders). The failure copy should say so — the user must learn they can continue.

### Surface 4 — Gallery failure

The highest-value check, and the defect is confirmed end-to-end:

- `listFlagPhotos` converts a missing relation to `[]` (photos.ts:41, 53) and `isRelationMissing` broadly matches `/does not exist/` — so the runtime-confirmed missing-column failure renders as an empty gallery.
- `FlagDetailModal`'s load effect catches every throw with only `console.warn` and keeps the current list (FlagDetailModal.tsx:392–397), and its clearing branch runs only when the modal closes (`!visible || !shownFlag`), not when `shownFlag.id` changes while visible — so a failed load for flag B can leave flag A's photos on screen under flag B's details. Stale cross-flag evidence is worse than false-empty.
- The empty presentation is an explicit "No photos" placeholder with `accessibilityLabel="No photos attached"` (PhotoGallery.tsx:174–181) — a failure shown through it is an active false statement, to sighted and screen-reader users alike.

Required states after the B2 fix: LOADING (per-flag, cleared on flag change), REAL EMPTY (keep "No photos"), ERROR (owned, accessible, with Retry — copy in B-UX-002), RECOVERED (error clears only when the same loader succeeds; the user stays in the modal, same flag, same scroll context — Retry must never close or reset the modal).

### Surface 5 — Profile / My Reports / Recent Activity

All three are independent state owners with already-truthful skeletons:

- Profile: `loadError` + "Try again" card, mirrors Leaderboard's pattern (ProfileScreen.tsx:200, 1049–1059).
- My Reports: `loadError` banner + "Retry", and every empty branch is gated behind `loadError ? null : …` (MyReportsModal.tsx:421–506) — failure cannot masquerade as "you have no reports."
- Recent Activity: `loadError` banner + "Retry" (`accessibilityLabel="Retry loading activity"`), loading skeleton gated on `!loadError`, fallback copy "Could not load recent activity." (ActivityFeedModal.tsx:104, 277–290). State semantics are sound; once the shared read contract works these surfaces recover with no new UI architecture. **No layout observations are made for ActivityFeedModal** — any such item is DEFER / REVALIDATE AGAINST FINAL PROMPT-A SHA.
- Retry verbs differ across these surfaces ("Retry", "Try again", "Tap to retry."). Not a release defect — banner buttons describe the gesture, standalone buttons name the action, and each error state is independently owned. Defer unification to Prompt C (B-UX-008; answers B2 question 3: identical verbs are not required for release).

### Surface 6 — Account-deletion receipt

Receipt persistence through ambiguous status is intentional safety behavior and is preserved by this review. The status card's copy is honest per state (REQUESTED / DELETING / REVIEWING / COMPLETE each get a distinct truthful sentence; the ambiguous branch says "This device has a deletion receipt, but status is temporarily unavailable." — it neither claims failure nor completion). COMPLETE is announced to screen readers. That copy stands.

The gap is the action set, not the words: when `deletionStatusUnavailable` is true, the only offered control is "Dismiss unavailable receipt" — there is no "Check again," `refreshDeletionStatus` runs only on mount, and `dismissDeletionReceipt` clears the receipt immediately with no `confirm()` (SignInScreen.tsx:263–293, 113–118). A user whose one status check hit a transient outage is invited — by the only button on the card — to permanently discard the recovery receipt for a deletion whose status says "temporarily unavailable." That is adversarial question 7 realized. `SignInScreen.tsx` is not in B2's seven-file client contract and receipt behavior is B2-VERIFY-ONLY, so this is raised as REQUIRES B2 TECHNICAL RECHECK (B-UX-007), not silently added to scope.

### Adversarial questions — answers

1. **ERROR as EMPTY?** Yes — gallery only (B-UX-002). Home/Tasks/My Reports/Activity all gate empties on no-error; Admin is covered by B2's own blocker matrix.
2. **Stale ERROR after SUCCESS?** Provider clears on owner success only; independent owners clear `loadError` at load start / on success. Verify visually post-repair (B-UX-004/006).
3. **Retry tappable with no understandable transition?** Yes, two places: Home's uncaught `void refresh()` (B2-mandated fix; verify as B-UX-004) and the deletion card's unavailable branch, which offers no retry at all (B-UX-007).
4. **Offline cache mistaken for fresh?** No — age-stamped offline banner, mutually exclusive with the failure banner (B-UX-P2).
5. **Location failure scary/technical or implying location is mandatory?** Yes today (raw `kCLErrorDomain` passthrough); B-UX-003 fixes copy and states the user can continue without location.
6. **Gallery failure hiding real photos behind false-empty?** Yes — confirmed; B-UX-002.
7. **Deletion ambiguity misleading the user into acting on false certainty?** Yes — the dismiss-only unavailable branch; B-UX-007.
8. **Prompt-B recovery UI at large text sizes?** Semantic requirements only: Map's banner caps at `numberOfLines={2}`, so at large sizes the visible retry verb can truncate (the a11y label preserves it for screen readers); the gallery error state must keep its Retry control reachable at large sizes. Full Dynamic Type audit is Prompt C (B-UX-009).

## Findings

### B-UX-001

- **ID:** B-UX-001
- **CLASS:** MUST IMPLEMENT IN PROMPT B
- **SEVERITY:** MEDIUM (release polish + state clarity on three P0 surfaces)
- **SURFACE:** Home / Tasks / Map failure banner (`src/lib/copy.ts` `failureBannerText`; Map's separately-composed a11y label MapScreen.tsx:2596)
- **CURRENT STATE:** `failureBannerText` appends `. Tap to retry.` to a provider message that already ends in a period, rendering "That feature isn't available yet.. Tap to retry." Map's accessibility label composes the same pair by a different recipe and currently reads correctly — the visible text and spoken text disagree.
- **USER RISK:** The double period reads as a broken app on the app's most common failure surface; visible/spoken divergence confuses users who use both.
- **RECOMMENDATION:** Implement B2's copy.ts fix so the composed banner is exactly one sentence boundary, preserving the existing retry-dedupe. The FEATURE_UNAVAILABLE sentence itself is retained unchanged (see State-Truth §Surface 2 — it is truthful for the only condition that can still produce it after the read repair). Assert visible text and every composed accessibility label produce the identical sentence.
- **EXACT COPY CHANGE:** Required composed output, verbatim per B2: `That feature isn't available yet. Tap to retry.`
- **WHY PROMPT B:** Already in B2's minimum client contract (`copy.ts`); this review confirms the exact output and adds the visible/a11y parity requirement.
- **LIVE IOS PROOF:** Force a read failure; the banner shows the exact sentence with single periods; VoiceOver reads the same sentence.
- **B2 ARCHITECTURE IMPACT:** NONE

### B-UX-002

- **ID:** B-UX-002
- **CLASS:** MUST IMPLEMENT IN PROMPT B
- **SEVERITY:** HIGH (false evidence about the world; the map's core proof surface)
- **SURFACE:** Flag Detail gallery (`src/lib/photos.ts` `listFlagPhotos`, `src/components/FlagDetailModal.tsx` load effect, presentation via PhotoGallery)
- **CURRENT STATE:** Backend failure renders as the designed "No photos" empty placeholder (missing relation → `[]`; all other throws → `console.warn` + keep current list). Switching flags while the modal is visible does not clear the previous flag's photos, so a failed load can leave flag A's photos under flag B's details. No error UI exists.
- **USER RISK:** A user checking whether a barrier has photographic evidence is told "No photos" when the request failed — or worse, shown the wrong flag's photos. Both are false statements on an accessibility-evidence surface.
- **RECOMMENDATION:** Implement B2's helper+consumer fix (throw every backend error; per-flag reset; stale-completion rejection; owned accessible error state with Retry; clear error only when the same loader succeeds). Presentation requirements from this review: (a) the error state must be visually and semantically distinct from the "No photos" placeholder — never reuse that label or its `No photos attached` accessibility label for a failure; (b) Retry keeps the user in the modal, on the same flag, without resetting unrelated detail state; (c) on success the error clears and the ordered photos render; on real-empty after recovery, "No photos" is again correct and allowed.
- **EXACT COPY CHANGE:** New gallery error state copy, exactly: `Couldn't load photos. Tap to retry.` (two sentences, house register, matches the shared failure grammar; the tappable error area carries it as both visible text and accessible name).
- **WHY PROMPT B:** In B2's minimum client contract; B2 left the error wording open — this supplies it.
- **LIVE IOS PROOF:** With a fault harness (pre-native per B2; live only if a safe harness exists): open a flag under failure → error state (not "No photos"); open flag A then flag B under failure → no A photos under B; Retry → ordered photos appear, error gone.
- **B2 ARCHITECTURE IMPACT:** NONE

### B-UX-003

- **ID:** B-UX-003
- **CLASS:** MUST IMPLEMENT IN PROMPT B
- **SEVERITY:** MEDIUM (trust + comprehension at a permission-adjacent moment)
- **SURFACE:** Location failure (`src/lib/location.ts` normalizer + `useUserLocation` catch; `src/screens/MapScreen.tsx` native `requestLocation` catch; Report's delegated Use My Location)
- **CURRENT STATE:** Thrown native exceptions flow through `errorMessage`, whose fallback passes raw text through — `kCLErrorDomain error N` can reach the alert body. The alert title "Couldn't find your location" is good. The timeout path already has good specific copy. Permission-denied is a separate non-throwing state with its own honest banner.
- **USER RISK:** Scary platform diagnostics at a moment users associate with privacy; nothing tells the user they can keep using the app without location.
- **RECOMMENDATION:** Implement B2's location-specific presentation boundary with the copy below for the generic thrown-exception case. Keep the existing alert title. Do not flatten the timeout message ("Location request timed out. Check your signal and try again.") — it is more actionable and already safe. Do not add Settings deep-links or change permission architecture; Settings guidance beyond this sentence belongs only on the actual denied path, which already exists and is unchanged.
- **EXACT COPY CHANGE:** Generic location-failure body, exactly: `Couldn't get your location. Check that Location Services is on and try again. You can keep using the map without it.` (Refines B2's proposed draft: house-voice contraction, and adds the one fact B2's draft omitted — the user may continue without location.)
- **WHY PROMPT B:** In B2's minimum client contract; B2 marked its own draft "such as" — this is the adjudicated wording.
- **LIVE IOS PROOF:** Trigger a native location failure (e.g., simulator with no fix); alert shows the exact copy, no domain/code text; a later Retry that succeeds centers the map.
- **B2 ARCHITECTURE IMPACT:** NONE

### B-UX-004

- **ID:** B-UX-004
- **CLASS:** VERIFY IN PROMPT B
- **SEVERITY:** HIGH (P0 landing surface recovery)
- **SURFACE:** Home (three Retry entry points: RefreshControl HomeScreen.tsx:349, stale-data banner :590, error card :618)
- **CURRENT STATE:** All three call bare `void refresh()`; the provider re-throws on cache-less failure, so a failed Retry is an unhandled rejection and the control can appear inert.
- **USER RISK:** Tapping Retry during an outage does nothing visible — the banner neither changes nor explains, and repeated taps look like a dead button.
- **RECOMMENDATION:** After B2's caught-callback fix lands, verify on live iOS: failed load → error card visible with headline `—` (never "0 barriers") → Retry → fresh rows, error and offline markers cleared; failed refresh over data → "Couldn't refresh — showing older data" banner → Retry → banner clears; repeated failure produces no crash/unhandled-rejection and the prior error stays visible (no false success flash). Prior error remaining visible during retry is the accepted release behavior (B2 question 1); an explicit "Retrying…" swap on Home/Tasks is Prompt-C polish only (B-UX-010).
- **EXACT COPY CHANGE:** NONE
- **WHY PROMPT B:** The fix is B2 scope; the human-visible transition is what Prompt B must prove.
- **LIVE IOS PROOF:** UX-01 / UX-02 / UX-12 in the acceptance matrix.
- **B2 ARCHITECTURE IMPACT:** NONE

### B-UX-005

- **ID:** B-UX-005
- **CLASS:** VERIFY IN PROMPT B
- **SEVERITY:** MEDIUM
- **SURFACE:** Home / Tasks / Map offline-vs-failure distinction
- **CURRENT STATE:** Correctly designed: age-stamped offline banner (`offlineBannerText`) when serving cache; failure banner only when `error && data && !isOfflineCache`; provider clears error when the cache fallback satisfies.
- **USER RISK:** If the repair disturbs this gating, saved data could read as fresh, or a cache fallback could double-report as a failure.
- **RECOMMENDATION:** Verify after the shared read repair: offline (airplane mode with warm cache) shows the age-stamped offline banner and NO failure banner; live failure with no cache shows the error state and NO offline banner; recovery clears both.
- **EXACT COPY CHANGE:** NONE
- **WHY PROMPT B:** Shared-contract change touches exactly this seam; regression here silently breaks state truth.
- **LIVE IOS PROOF:** UX-04 in the acceptance matrix.
- **B2 ARCHITECTURE IMPACT:** NONE

### B-UX-006

- **ID:** B-UX-006
- **CLASS:** VERIFY IN PROMPT B
- **SEVERITY:** MEDIUM
- **SURFACE:** Profile, My Reports, Recent Activity (independent state owners)
- **CURRENT STATE:** Each has a truthful local error state with Retry, and empty branches gated behind no-error. Recent Activity is state-semantics-only here (active Prompt-A surface).
- **USER RISK:** Independent owners could retain a stale local error after the shared read recovers, or a recovery could fail to clear the local banner.
- **RECOMMENDATION:** Verify each independently on live iOS: failure → local error visible (never the empty state) → local Retry → own rows render and the local banner clears; Profile save/counts unaffected. Any Recent Activity check runs against the final Prompt-A SHA and asserts state transitions only, not layout.
- **EXACT COPY CHANGE:** NONE
- **WHY PROMPT B:** B2 requires independent recovery proof for these named failures; this is its human-visible form.
- **LIVE IOS PROOF:** UX-08 / UX-09 / UX-10 in the acceptance matrix.
- **B2 ARCHITECTURE IMPACT:** NONE

### B-UX-007

- **ID:** B-UX-007
- **CLASS:** REQUIRES B2 TECHNICAL RECHECK
- **SEVERITY:** HIGH (irreversible loss of a safety capability by invited tap)
- **SURFACE:** Account-deletion receipt card, signed-out screen (`src/screens/SignInScreen.tsx:263–293`, `dismissDeletionReceipt` :113)
- **CURRENT STATE:** When the mount-time status check fails (`deletionStatusUnavailable`), the card says "…status is temporarily unavailable" but its ONLY action is "Dismiss unavailable receipt," which clears the SecureStore receipt immediately, with no confirmation and no way to re-run the status check (the "Check status" button exists only in the non-unavailable branch; `refreshDeletionStatus` otherwise runs only on mount).
- **USER RISK:** One transient network failure converts the card into an invitation to permanently discard the recovery receipt for a deletion whose true state is unknown — the exact false-certainty action B2's receipt-preservation invariant exists to prevent. The copy says "temporarily"; the button contradicts it.
- **RECOMMENDATION:** Do NOT weaken receipt retention — the fix strengthens it. Proposed delta, pending B2 recheck because `SignInScreen.tsx` is outside B2's seven-file client contract and receipt behavior is B2-VERIFY-ONLY: in the unavailable branch, (a) offer "Check status" (reusing the shipped label/`Checking…` busy state) as the primary action so a transient outage is recoverable in place, and (b) route "Dismiss unavailable receipt" through the house `confirm()` with a body stating the consequence (removal of this device's recovery receipt while status is unknown). No new status semantics, no backend change, no receipt-format change.
- **EXACT COPY CHANGE:** NONE proposed here (the confirm body is new copy and should be authored inside the recheck, not smuggled past the budget).
- **WHY REQUIRES B2 TECHNICAL RECHECK:** Adds a production edit outside B2's frozen client file list on a deletion-adjacent surface; B2's B-3 stop conditions treat deletion production edits without new evidence as a stop. This report is that new evidence; the recheck decides whether Prompt B absorbs it or it ships immediately after under its own authority.
- **LIVE IOS PROOF:** If accepted: with a receipt present and the network blocked, the card shows the unavailable copy, "Check status" retries in place and recovers when the network returns; Dismiss requires explicit confirmation. (Use a safe non-destructive fixture per B2 — never a manufactured production deletion.)
- **B2 ARCHITECTURE IMPACT:** REQUIRES B2 TECHNICAL RECHECK (client file-list scope only; no backend, privacy, or receipt-semantics change).

### B-UX-008

- **ID:** B-UX-008
- **CLASS:** DEFER TO C
- **SEVERITY:** LOW
- **SURFACE:** Retry verbs app-wide ("Retry" — My Reports/Activity; "Try again" — Home error card/Profile; "Tap to retry." — Home stale banner/Map/Tasks banners)
- **CURRENT STATE:** Three verb families across independently-owned error states; each is locally coherent (banners describe the gesture, buttons name the action).
- **USER RISK:** Minor register inconsistency; no comprehension failure.
- **RECOMMENDATION:** Unify (or deliberately ratify the banner/button split) as a Prompt-C copy pass. Answers B2 question 3: identical verbs are NOT required for this release.
- **EXACT COPY CHANGE:** NONE
- **WHY C:** Pure style consistency; touching it now would widen Prompt B's diff across surfaces B2 froze as verify-only.
- **LIVE IOS PROOF:** N/A.
- **B2 ARCHITECTURE IMPACT:** NONE

### B-UX-009

- **ID:** B-UX-009
- **CLASS:** DEFER TO C
- **SEVERITY:** MEDIUM (bounded by the semantic rules below)
- **SURFACE:** Recovery UI at large text sizes (Map failure banner `numberOfLines={2}`; gallery error state; deletion-receipt card)
- **CURRENT STATE:** Map's banner can visually truncate the retry verb at large Dynamic Type (the accessibility label preserves it for screen-reader users); the new gallery error state has no large-text spec yet.
- **USER RISK:** A large-text user could see a failure sentence whose visible action verb is clipped.
- **RECOMMENDATION:** Two semantic requirements bind Prompt B's new/changed UI without a broad audit: (1) the gallery error state's Retry affordance must remain visible and tappable at large text sizes (don't cap it into truncation); (2) any banner that visually truncates must keep the full sentence in its accessible name (Map already does — preserve that pattern). The broad Dynamic Type audit of failure/recovery UI is Prompt C's.
- **EXACT COPY CHANGE:** NONE
- **WHY C:** Prompt C owns Dynamic Type; only the two semantic floors above apply to Prompt B's own new UI.
- **LIVE IOS PROOF:** Prompt C.
- **B2 ARCHITECTURE IMPACT:** NONE

### B-UX-010

- **ID:** B-UX-010
- **CLASS:** DEFER TO C
- **SEVERITY:** LOW
- **SURFACE:** Home/Tasks failure banners' in-flight treatment
- **CURRENT STATE:** Map swaps to "Retrying…" with a busy indicator and disabled state during retry; Home/Tasks keep the static error visible.
- **USER RISK:** None material — no state falsely reads as success; the divergence is polish.
- **RECOMMENDATION:** Consider adopting Map's "Retrying…" pattern on Home/Tasks in Prompt C. Answers B2 question 1: prior-error-visible is acceptable for release; the explicit retrying state is the better long-term pattern but not a Prompt-B requirement.
- **EXACT COPY CHANGE:** NONE
- **WHY C:** Rebuilding two more banners now widens the frozen Prompt-B client diff for polish.
- **LIVE IOS PROOF:** N/A.
- **B2 ARCHITECTURE IMPACT:** NONE

## Preserve

Behavior that is already right and must NOT be rewritten during Prompt B implementation:

- **B-UX-P1 — Home's honesty gates.** The `—` headline on settled failure (never a false "0 barriers" census), the five-clause `emptyLocal` gate (no absence claim over loading/error/stale), and the invitation-not-error empty state (HomeScreen.tsx:252–274, 355–363, 639–664).
- **B-UX-P2 — Offline disclosure with age.** `offlineBannerText(cachedAt)` ("Showing saved data from N ago — connect for the latest.") and its mutual exclusion with the failed-refresh banner. This is exactly the saved-vs-failed-vs-empty distinction the review model demands, already shipped.
- **B-UX-P3 — Map's failure-banner accessibility contract.** Button role, live region, busy/disabled during retry, visible "Retrying…", and the full-sentence accessible name (MapScreen.tsx:2583–2616). Keep it byte-for-byte in spirit; only the composed sentence changes under B-UX-001.
- **B-UX-P4 — Tasks' five-branch empty truth.** Error ("Couldn't load flags") ≠ filtered-empty ≠ search-empty ≠ "Nothing to triage yet" ≠ the "All caught up" celebration, which is reserved for a genuinely empty, fully-loaded list (TasksScreen.tsx ListEmptyComponent).
- **B-UX-P5 — Deletion-receipt honesty.** Distinct truthful bodies for REQUESTED/DELETING/REVIEWING/COMPLETE, the COMPLETE screen-reader announcement, receipt retention through outage, and the "temporarily unavailable" sentence that neither claims failure nor completion. B-UX-007 changes the unavailable branch's ACTIONS only, and only after recheck.

## Prompt-C Deferrals

- B-UX-008 — Retry-verb unification (or deliberate ratification of the banner/button split).
- B-UX-009 — Dynamic Type audit of failure/recovery UI (Prompt B inherits only the two semantic floors stated in the finding).
- B-UX-010 — "Retrying…" in-flight treatment on Home/Tasks banners, matching Map.

## Prompt-B Human-Visible Acceptance Matrix

Live, human-visible checks only — no REST/database probes (B2 owns those). Run on the exact accepted candidate per B2's B-5 rules; gallery fault cases stay pre-native unless a safe fault harness already exists.

| CHECK ID | SURFACE | START STATE | ACTION | EXPECTED VISIBLE RESULT | FAIL CONDITION |
|---|---|---|---|---|---|
| UX-01 | Home | Load failed, no cache (error card, headline `—`) | Tap "Try again"; backend now healthy | Fresh rows render; error card and `—` gone; count headline returns | Banner/card persists after success; "0 barriers" shown on failure; crash or dead tap |
| UX-02 | Home | Data on screen; refresh failed (stale banner) | Tap "Couldn't refresh…" banner; backend healthy | Rows update; stale banner clears | Banner survives success, or appears alongside offline banner |
| UX-03 | Tasks | Load failed (banner "That feature isn't available yet. Tap to retry.") | Pull-to-refresh, then tap banner; backend healthy | Exact single-period sentence before retry; rows render; banner clears; filters/pagination intact | Double period; banner outlives success; empty state shown instead of error |
| UX-04 | Home/Tasks/Map | Airplane mode, warm cache | Open each surface | Age-stamped offline banner, saved rows, NO failure banner | Failure banner over cache, or cache presented with no banner |
| UX-05 | Map | Load failed | Tap banner while request in flight, then let it succeed | "Retrying…" + busy state during flight; markers render; banner clears | Banner tappable-but-inert; success with banner still visible |
| UX-06 | Map / Report | Native location exception (no fix available) | Trigger locate / Use My Location | Alert: "Couldn't find your location" + exact B-UX-003 body; no kCLError/domain text | Raw native diagnostic visible; copy implies the app is unusable without location |
| UX-07 | Flag Detail gallery | Gallery load fails (harness) | Open flag with known legacy photos | Distinct error state with "Couldn't load photos. Tap to retry." — NOT "No photos" | "No photos" or a previous flag's photos shown on failure |
| UX-08 | Flag Detail gallery | Error state from UX-07 | Tap retry; backend healthy | Ordered photos render in the same modal, same flag; error clears | Modal closes/resets; error persists after success; wrong order |
| UX-09 | Profile | Load failed ("Try again" card) | Tap "Try again"; backend healthy | Points/counts render; local error clears; display-name save works | Stale local error after success; empty profile presented as normal |
| UX-10 | My Reports | Load failed (banner + "Retry") | Tap "Retry"; backend healthy | Own rows render; local banner clears | Empty "no reports" state shown for a failure; banner outlives success |
| UX-11 | Recent Activity | Load failed (banner + "Retry") — run against final Prompt-A SHA; state assertions only | Tap "Retry"; backend healthy | Recent rows render; local banner clears | Failure shown as empty activity; stale banner after success |
| UX-12 | Sign-out screen receipt card | Receipt present; status endpoint unreachable | Observe card | "…status is temporarily unavailable" body; no claim of failure or completion; receipt survives outage without user action | Copy implies deletion failed/completed; receipt silently cleared by the outage itself |

## Claim Boundaries

This review inherits every B2 claim boundary. In UX terms, no Prompt-B copy or state presentation may imply:

- photo or avatar upload is fixed, or that adding a photo is proven end-to-end (gallery claims are legacy-read + truthful-error only);
- canonical upload/provenance, canonical deletion, or leaderboard canonical avatars work;
- every media path is fixed, or that the final release binary has been accepted;
- account-deletion status is knowable when it is not — the receipt card must keep saying "unavailable," never "failed" or "complete," during ambiguity;
- realtime or monthly-leaderboard recovery.

The FEATURE_UNAVAILABLE sentence makes no forward promise beyond "yet," which is acceptable for the genuine missing-migration condition it maps; no UX copy proposed here adds any new promise.

## Fable Prompt B UX Delta

```text
FABLE PROMPT B UX DELTA

MUST IMPLEMENT:
B-UX-001, B-UX-002, B-UX-003
(all three land inside B2's existing seven-file client contract — no new files)

VERIFY:
B-UX-004, B-UX-005, B-UX-006

DEFER TO C:
B-UX-008, B-UX-009, B-UX-010

PRESERVE:
B-UX-P1, B-UX-P2, B-UX-P3, B-UX-P4, B-UX-P5

REQUIRES B2 TECHNICAL RECHECK (do not implement without it):
B-UX-007 — deletion-receipt unavailable branch: add in-place "Check status"
retry + confirm() on "Dismiss unavailable receipt". SignInScreen.tsx is outside
B2's frozen client file list; receipt semantics themselves are unchanged.

EXACT COPY CHANGES:
1. failureBannerText composed output (B2-mandated, confirmed):
   "That feature isn't available yet. Tap to retry."
   — one period per sentence; visible text and composed a11y labels identical.
2. Gallery error state (new): "Couldn't load photos. Tap to retry."
3. Location generic thrown-failure body (new):
   "Couldn't get your location. Check that Location Services is on and try
   again. You can keep using the map without it."
   — keep alert title "Couldn't find your location"; keep the existing
   timeout sentence untouched.

STATE TRANSITION RULES:
- An error may clear ONLY on its own owner's success (provider or local),
  never on navigation or unrelated activity.
- Prior error stays visible while a retry is in flight; no state may read as
  success before recovery. Map's "Retrying…"/busy pattern is preserved as-is;
  Home/Tasks get no new in-flight UI in Prompt B.
- Empty states render only when loading is settled, error is null, and (where
  a cache exists) the data is not a stale fallback.
- Offline cache is always disclosed with age (offlineBannerText) and is
  mutually exclusive with the failure banner.
- Every Retry entry point is caught; a failed retry visibly remains a failure.

GALLERY RULES:
- listFlagPhotos throws every backend error (no missing-relation []).
- Detail modal: clear photos + error on flag change; reject stale
  completions; failure shows the owned error state (never "No photos",
  never a previous flag's photos); Retry re-runs the same loader in the
  same modal context; error clears only after that loader succeeds;
  real-empty after success keeps the existing "No photos" placeholder.

LOCATION RULES:
- No native domain/code text reaches any user surface; diagnostics stay
  internal.
- Permission-denied remains its own non-throwing state and copy; Settings
  guidance beyond the B-UX-003 sentence appears only on the denied path.
- Failure copy always states the app remains usable without location.

DELETION-RECEIPT RULES:
- Receipt persistence through ambiguous/unavailable status is intentional —
  never clear it on outage, never encourage dismissal in copy.
- Ambiguity copy must claim neither failure nor completion (current copy
  already complies — preserve it).
- Action-set change (retry + confirmed dismissal) only via B-UX-007 recheck.

LIVE IOS UX CHECKS:
UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09, UX-10
(UX-11 against final Prompt-A SHA, state-only; UX-12 with a safe fixture)

DO NOT ALTER:
- B2 backend scope
- privacy/security decisions
- deletion recovery semantics
- technical stop conditions
- current ActivityFeed Prompt-A layout architecture

STALENESS RULE:
B2 and this UX review were prepared against product source
2762a5447600e8de55be912ccb26e95456484945. Prompt B will begin from a newer
independently accepted Prompt-A SHA. Before implementing any recommendation
above, revalidate the affected source against the exact Prompt-B base.
ActivityFeed recommendations require special revalidation because that
surface is actively changing under Prompt A.
```

## Future Retrieval

```bash
git fetch origin
```

```bash
git show origin/fable/prompt-b-ux-final-review-20260830:qa-reports/2026-08-30_Fable_PromptB_UX_FinalReview.md
```
