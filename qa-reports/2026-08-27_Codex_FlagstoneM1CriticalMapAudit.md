# Flagstone M1 — Critical Map Interaction & Floating-Chrome Runtime Audit

**Audit date:** 2026-08-27  
**Scope:** One read-only iOS Simulator audit of the Flagstone map runtime. No source, configuration, dependency, permission, account, or production state was changed. No report, feedback, comment, vote, media upload, verification, resolution, rejection, or submission was performed.

## SKY AT A GLANCE

- **Outcome:** **NO MAP REPAIR REQUIRED**
- **Map pin → full Barrier Detail:** works through both an individual map pin and a pin exposed after cluster expansion.
- **No confirmed P0 or P1:** no crash, data loss, material map unusability, repeatable pin-detail failure, control interception, or stable Report-control loss was observed in the supported checks.
- **Important limits:** the controller could not provide a capture-verifiable scroll gesture or a true two-finger pinch. Enabled-location states, accessibility text size, dark appearance, and a forced marker/control collision were not exercised because doing so would require a permission/state change or a capability this controller did not provide.
- **M2:** do not open an M2 repair lane. Defer only any later visual polish or physical-device follow-up to post-submission/L1.

## MAP VERDICT

No evidence-backed map interaction defect requiring repair was found. The supported runtime evidence shows the primary pin and cluster detail paths, usable floating controls, an explicit legend-dismiss control with recovery, and clean report-flow restoration. This is not a blanket certification of unexercised multi-touch or permission-enabled states.

## MAP PIN → DETAIL

**WORKS AS INTENDED.** A directly targeted individual marker opened its callout; the callout's visible detail action opened the full Barrier Detail presentation. A matching recent-list card reached the same map callout/detail route. After expanding the initial cluster, an exposed individual marker again opened a callout and its detail action reached full Barrier Detail. No private report content or exact coordinates are retained in this report.

## CONFIRMED P0

None.

## CONFIRMED P1

None.

## P2

None confirmed in the supported scope. A marker-under-floating-chrome collision was not reproducible, so no visual-overlap polish item is asserted.

## TOOLING LIMITATIONS

- The local controller captured screenshots, semantic snapshots, taps, coordinate taps, zoom-button actions, and cluster expansion, but not a capture-verifiable scroll or genuine two-finger pinch.
- It exposed the location banner and its actions, but testing enabled-location behavior, Dynamic Type, and dark appearance would require simulator settings/permission changes outside this audit's safe state.
- A marker/locate-control collision was not present in the audited view; the collision case is therefore **NOT VERIFIED**, not a defect.
- The simulator's generic Settings route opened from the location actions, but the unconfigured simulator did not resolve to a Flagstone-specific settings pane. No setting was changed.

## ⭐ RECOMMENDATION

Do not implement M2. Keep the approved branch unchanged and defer any optional visual refinements or physical-device gesture coverage to a separately authorized post-submission/L1 review.

## PRECHECK

- **Approved worktree:** `/Users/skypie/AccessMap-codex/presubmission-ui-polish`
- **Branch:** `codex/presubmission-ui-polish`
- **Approved/re-derived HEAD:** `539c0a03e9fe4cb9a7b9f8a350fdc630cbc86294`
- **Tracked status immediately before and after runtime work:** clean (`## codex/presubmission-ui-polish` only).
- **Simulator ownership:** only `Flagstone Audit iPhone 17 Pro` was booted at final confirmation. No iPhone 17e was booted or used.
- The primary checkout was not accessed for writes and its known dirty material was not altered.

## CURRENT-BINARY PROOF

The pre-existing installed app could not be proven to have been built from the approved current HEAD. The authorized local fallback was therefore used.

- **Build working directory:** `/Users/skypie/AccessMap-codex/presubmission-ui-polish`
- **Build command/path:** the existing `ios/Flagstone.xcworkspace`, `Flagstone` scheme, Debug Simulator configuration, and a temporary DerivedData directory outside the repository.
- **Build completion:** `** BUILD SUCCEEDED **`.
- **Build type:** local Debug / “Sign to Run Locally”; no EAS, TestFlight, paid build, dependency installation, fetch, pull, rebase, or generated tracked-project change.
- **Installed app:** local Simulator app container ending in `Flagstone.app`; bundle identifier `com.accessmap.app`; build number `15`; installed timestamp `2026-08-27T13:34:49-0700`.
- **Metro:** no Metro process was retained for the final audit, so Metro cwd/port is **not applicable**. Debug logs showed an unavailable local development connection on port 8097, while the installed app nevertheless rendered and completed the audited flows. Debug launch/bundle timing was not rated as product performance.
- **Post-build Git check:** clean at the approved HEAD.

## CAPABILITY GATE

**PARTIALLY PASSED — supported findings only.** The runtime supplied visual capture plus interpretation, a semantic snapshot, at least five visible elements, and repeated tap-driven state changes: Home → full map, marker → callout → detail, cluster → individual pins, legend open/close, and report open/cancel. It also supplied zoom-button actions and focused app logs.

The controller did not supply a dependable capture-verifiable scroll outcome or true two-finger pinch. Those checks are not used to claim a regression or a pass.

## LOCATION BANNER RESULT

**PASS (default text, light appearance, location-off state).** The full location-off message was readable with no left/right clipping; its `Open Settings` action was visibly present and received a tap. The map remained visually available around the banner. The action opened the simulator Settings route; no permission or account setting was changed.

**NOT VERIFIED:** accessibility text sizing and dark appearance; neither was changed for this audit.

## MAP-PIN RESULT

**WORKS AS INTENDED.** Repeated direct interaction registered, produced a visible callout, and the callout detail action produced full Barrier Detail. The same flag's established recent-card route reached the same map callout/detail path.

## CLUSTER RESULT

**WORKS AS INTENDED.** The initial cluster was visibly and semantically identified as containing ten flags. Tapping it expanded the map into individual pins. A coordinate-targeted post-expansion pin registered, showed a callout, and opened full Barrier Detail through its detail action.

## FLOATING-CHROME RESULT

**ACCEPTABLE in the observed state; collision stress case NOT VERIFIED.** Header, location banner, zoom controls, list, legend, dismiss control, and disabled report control were visible at once without an observed marker becoming permanently unreadable or untappable. Markers remained independently targetable after cluster expansion. A forced marker-under-header/banner collision could not be reproduced with the available controller, so collision avoidance is neither demanded nor judged here.

## LOCATE-CONTROL RESULT

**NOT VERIFIED for overlap; no interaction defect observed.** In the observed layout, the visible locate control and nearby marker targets were spatially distinct. A direct locate-control tap responded by opening Settings; no settings were modified. A real marker/locate overlap was not present to test independent hit targets, so no P1 interception claim is supported.

## DISMISS-X RESULT

**PASS.** The circular X adjacent to the legend had the exposed runtime name `Dismiss map legend shortcut`. It dismissed that shortcut. `More map tools` exposed a `Map legend` action as the recovery route; opening and closing the legend returned to the map without a stuck sheet or backdrop. The explicit runtime label rules out an accessibility-defect finding for this control in the audited state.

## REPORT-FAB RESULT

**PASS for stable location-off restoration; enabled state NOT VERIFIED.** The in-map Report FAB was consistently present but correctly disabled while location access was off. The permitted report flow was opened without entering data, then cleanly cancelled twice. After each settled dismissal the map returned and its location-off disabled Report FAB remained stable. No normal enabled-FAB state was forced because that would require a location-permission/state change.

## CORE MAP REGRESSION

- Repeated zoom-in/zoom-out controls accepted actions and left the map usable; no crash, stale backdrop, or stuck sheet was observed.
- Touches outside a callout dismissed it; legend open/close restored the map.
- The audit did **not** establish a pure repeated pan sequence, pan-then-pinch, pinch-then-pan, or true pinch in/out. Safe drag/scroll attempts did not provide capture-verifiable gesture completion with this controller. These are **NOT VERIFIED**, not regressions.
- No obvious dead zone or snap-back was observed in the controls and marker actions that were successfully exercised.

## RUNTIME WARNINGS

Focused, app-process Simulator logs were reviewed. They included Debug-local connection refusal on port 8097, expected location-off/Core Location denial diagnostics, MapKit resource/tile timeouts, and simulator/framework diagnostics. A future UIKit scene-lifecycle warning and one Core Location main-thread performance diagnostic also appeared.

None coincided with a crash, blocked interaction, or user-visible jank during the supported checks. No `RCTView` shadow warning was observed in the scoped log read. These warnings are not release findings in this M1 audit.

## SUSPECTED ITEMS

None. Unexercised conditions remain tooling limitations rather than suspected defects.

## AUDIT LIMITATIONS

This was one local Debug Simulator run using the approved HEAD, not a production or physical-device acceptance test. The following are outside the evidence base: real location permission, account content, Dynamic Type, dark appearance, true multi-touch pinch, and a deliberately overlapped marker/locate-control state. No exact coordinates or user-entered descriptions are retained.

## EXACT M2 PACKET

Not produced: no P0 or P1 was confirmed.

## DECISIONS FOR SKY

**Decision:** whether to open M2.  
**Recommendation:** do not open it.  
**Why:** M1 produced no evidence-backed P0/P1; both direct and cluster-exposed pin paths reached full detail, and floating controls remained usable in the observed state.  
**Alternative:** authorize a later physical-device/L1 gesture and appearance pass.  
**Impact:** preserves the approved map architecture and avoids unnecessary pre-submission churn; it does not replace physical-device coverage for the explicitly unverified gesture and appearance cases.

## OUTCOME

**NO MAP REPAIR REQUIRED**
