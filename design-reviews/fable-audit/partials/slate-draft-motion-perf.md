# Slate draft — cluster "motion-perf" (L4 motion + L7 felt-performance/resilience)

DRAFTER candidate proposals for Part 3 of the AccessMap Fable Audit. STRICT READ-ONLY provenance. Every candidate traces to Part-2 finding IDs; WCAG 2.2 AA is a hard floor; GLASS.md law and the 17 PROTECT items are respected (fixes EXTEND, never regress). Backend/privacy/scope items carry a FORKS-TO-SKY line and scope only the UI half.

Source findings walked: L4-01, L4-02, L4-03, L4-04, L4-05, L4-07, L4-09, L4-10, L4-11, L4-12 (motion); L7-01 (+ the "Unknown error" copy rider), L7-02, L7-03, L7-05, L7-07, L7-11 (felt-performance/resilience). Sky-decision forks that bound this cluster: note #1 (proximity architecture, behind L7-03) and note #4 (k-anonymity / offline-cache scope, behind L7-02).

Over-produced on purpose (over-production feeds the runner-up bench). Same-defect facets folded per the dedup map (L4-06 → L5-06 lives in another cluster; L4-11/L4-12/L4-07/L4-08 dead-delay/token-drift facets folded into one hygiene candidate).

---

## motion-perf-1 · Bring the web map camera up to the native reduce-motion standard (kill the falsy-zero trap)

**Resolves:** L4-01 (primary), L4-02 (web cluster leg), L4-04 (Leaflet built-ins under RM), and the L4-09 stale doc-comment that seeded the whole web-shaped hole.

**Tier:** MUST-FIX (it is a confirmed WCAG 2.3.3 failure on a core flow). **Effort:** S–M (a handful of one-line call-site changes + one RM-conditional prop block on `MapContainer`; no new abstraction).

**Signature candidate:** No — but it is the single highest-value access fix in this cluster; it converts the app's *worst* motion into parity with its *best*.

**What / why.** Today a user who asked their OS for less motion gets the **largest, curviest, longest** motion in the entire app — Leaflet's signature zoom-out-arc-zoom-in flight, ~1–4s for a cross-town jump — on the exact "tap a barrier, see it on the map" moment that is the FIND loop's payoff (probe `rm-flight` caught a genuine intermediate zoom frame at t700, and the flight still running at t1600). The cause is a two-character trap: `flyTo(…, { duration: reducedMotion ? 0 : 0.6 })` at `PlatformMap.web.tsx:626` passes `duration: 0`, and Leaflet treats `0` as falsy → falls through to its distance-based default (`leaflet-src.js:3522`). Native already does this right — `animateToRegion(…, reducedMotion ? 0 : 600)` genuinely lands instant (RNM's `duration <= 0 → moveCamera` guard). The fix is to make web behave like native: under reduce-motion, pass Leaflet `{ animate: false }` (which short-circuits to an instant `setView`, `leaflet-src.js:3474-3475`) instead of relying on a falsy duration; apply the same to the cluster-expansion `flyTo` at `:345` (and thread `reducedMotion` into `ClusteredMarkers`, which never receives it today, `:252-266`); and set `zoomAnimation={false}` / `fadeAnimation={false}` + popup `autoPan:false` on the `MapContainer`/callout when RM is on so a callout-open can't animated-pan the map either. Same PR fixes the `accessibility.ts:95` doc comment ("Web/unsupported platforms quietly resolve to `false`" is wrong for this RN-web version — the lie that plausibly rationalized "why gate what can't fire?") and rewrites the `:625` "Instant jump… (WCAG 2.3.3)" comment to name the falsy-zero trap so it never regresses.

**Access floor.** This IS the WCAG 2.3.3 (Animation from Interactions) compliance; the whole point is the hard floor. On device, the felt result is the mockup deliverable (before: a swooping cross-town arc; after: an instant cut) — NEEDS-SKY-DEVICE only for the *feel*, not the correctness (probe-proven at HEAD).

**PROTECT preservation.** Preserves PROTECT-7 (the native camera gate — this brings web *up to* it, touches neither the native path nor its intent). Preserves the map overlay `pointerEvents="box-none"` gesture law (no change to hit-testing). Preserves PROTECT #7 in the merged list (reduce-motion discipline outside the map camera) by extending its standard to the last surface that escaped it. Non-RM users are untouched (0.6s flight stays).

---

## motion-perf-2 · Data-layer timeout + honest "still trying" escalation (the danger-path silence fix)

**Resolves:** L7-01 (primary), plus the L7-01 rider (Map offline banner renders raw **"Unknown error"** instead of the friendly `errors.ts` copy), and the "Loading flags…" copy observation (reserve it for cold load; use "Updating…" over live data).

**Tier:** MUST-FIX (R1's stated #1 fear; a danger-path honesty gap on a safety product). **Effort:** M (a timeout race in the data layer mirroring the GPS one, plus a "still trying" state and one copy-mapping fix).

**Signature candidate:** YES (co-lead). Memorable, ownable, ACCESS-FIRST, and in-ethos: it makes the app's *own documented principle* ("expo-location can hang indefinitely… never leave the caller on a spinner forever") true of the data layer too. It is the temporal-honesty spine the whole L7 verdict is built around.

**What / why.** The GPS layer got a 15s hard race *specifically because* an unbounded await is unacceptable on these journeys (`location.ts:44-58`); the Supabase data layer never did (`supabase.ts:25-33` — no custom fetch, no `AbortSignal`, no `Promise.race`; grep-confirmed). On clean offline the honest terminal states fire in ~5–30s (probe-verified: Home settles to "Couldn't load reports." + Try again; Map fires its error banner). But on **poor signal** — one bar, packet loss, captive portal, the actual field case — the request can pend until the OS socket gives up (~60s iOS, minutes on web), and for that entire window the Map pill says "Loading flags…", Home shows an em-dash title + message-less skeletons, and a report submit sits on its spinner, with no escalation, no cancel, no time bound. R1 converted exactly this into the mission's most dangerous misreading: "an empty map reads as 'no barriers.'" The fix is a bounded, escalating middle: race every data read/write against a timeout (same shape as the GPS race), and at a threshold surface a calm **"Still trying — check your signal"** state (a real, persistent live region so it also announces) with a manual retry, *before* the OS gives up — so "still working" and "dead" stop looking identical. Bundle the two small copy defects the skeptic surfaced: route the offline-abort path through the friendly `errors.ts` mapping (kill the raw "Unknown error"), and split "Loading flags…" (cold) from "Updating…" (revalidating over data) so loading-from-nothing and refreshing-something read differently.

**Access floor.** The escalation state must be a persistent-mount `role=alert`/`aria-live` region (the L6-02 lesson: mount-timed live regions on web don't reliably fire — the reliable survivors are the always-mounted ones like the status pill). No AA color is traded; the retry control inherits the existing 44pt affordance grammar.

**PROTECT preservation.** Preserves PROTECT #8 in the merged list (shaped, honest loading + terminal states — this fills the *unbounded middle* between them, does not touch the terminal cards or the shaped skeletons). Preserves PROTECT #6 (the locating fix + battery/thermal posture) — the timeout mirrors the GPS race, adds zero pollers/intervals (still zero `watchPositionAsync`). Preserves PROTECT #15 (store fetch discipline — `fetchSeqRef` stale-discard, SWR cache paint are untouched; the timeout composes with them). Preserves PROTECT #2 (the empty-filters recovery card as the template these states aspire to).

---

## motion-perf-3 · Data-age on the offline banner + surface refresh failures on Home ("saved 2 h ago")

**Resolves:** L7-02 (the age leg + the Home-hides-refresh-failure leg), plus the `copy.ts` age copy observation. **FORKS-TO-SKY** on the guest-exclusion leg.

**Tier:** SHOULD-FIX. **Effort:** S (read the already-stored `cachedAt`, format a relative age into the existing banner; add the Home error/last-updated affordance to match Map/Tasks).

**Signature candidate:** No — a quick, high-trust win.

**What / why.** The offline banner is the app's core honesty device for the field scenario, and it is quietly weaker than its copy implies in three ways (all three CONFIRMED). (1) **No age.** `cachedAt` is *written* (`flagsStore.tsx:47,67`) but *discarded on read* (`:97` returns only `entry.rows`), so the one static string "Showing saved data — connect for the latest." (`copy.ts:11`) covers data 2 minutes old and 23.9 hours old identically — and "a day is several tides of sidewalk obstruction." The fix reads the timestamp that already exists and states it: **"Showing saved data from 2 h ago — connect for the latest."** (2) **Home hides refresh failures.** Home's error card only renders when `flags.length === 0` (`HomeScreen.tsx:283`) and Home has no `RefreshControl` (`:176`), so a failed background revalidate leaves stale rows presented as current with no indicator — while Map (`:1901`) and Tasks (`:1163`) show their error banners regardless of row count. Home is the odd one out; give it a last-updated stamp / pull-to-refresh so stale-presented-as-fresh stops on the landing surface too. (3) **Guests get no offline fallback at all** — the cache key is user-scoped by design (privacy; Jordan Condition 2, `flagsStore.tsx:30-31`), so every web user (web IS guest mode) and every native browse-without-account user gets the error/empty state where a signed-in user gets cache, and nothing tells them offline resilience is an account feature.

**FORKS-TO-SKY (Sky-decision note #4 — k-anonymity / offline-cache scope).** Leg (3) is a deliberate privacy-vs-utility architecture choice, not a UI defect — *whether* guests get any offline cache is Sky's ratification, not this slate's call. This candidate scopes only the UI honesty of legs (1) and (2) (age + Home refresh-failure surfacing) which are pure copy/UI and safe; if Sky decides guests *should* get a scoped cache, a one-line "offline resilience needs an account" note on the guest error state is the UI follow-on, but that follows the decision, it does not precede it.

**Access floor.** Age string rides the existing banner ink (already arbiter-passed); no new contrast token. Any new banner text uses `<AppText>` and the ratified body tokens.

**PROTECT preservation.** Preserves PROTECT #11 (the privacy-forward trust voice — the age fact makes the banner *more* honest, and the guest-scope silence is flagged, not silently "fixed" in a way that could leak the user-scoped key). Preserves PROTECT #10 (Home's honesty law — a last-updated stamp is the *same* honesty applied to refresh; distances are still never fabricated). Preserves PROTECT #8 (honest states).

---

## motion-perf-4 · State-aware map status pill — stop the "N flags nearby" lie on stale/denied/global states

**Resolves:** the copy half of L7-03 and L7-04/L3-2-facet-b (the pill's proximity claim) — scoped to the **pill's honesty**, not the query. **FORKS-TO-SKY** on the proximity architecture behind it.

**Tier:** SHOULD-FIX (until the data can back the word, the word should not claim what it can't). **Effort:** S (make one string state-aware). **Signature candidate:** No.

**What / why.** "N flags nearby" (`MapScreen.tsx:1278-1283`) is, in the audit's words, "the most load-bearing dishonest word in the app." It is false by construction three ways: the count comes from a global most-recent page with no lat/lng predicate (L7-03), it keeps asserting "nearby" over the San-Francisco fallback region when permission is denied (L7-04, R1's #1 trust hit: "a flat lie"), and the panned-empty probe caught it saying "5 flags nearby" over a viewport with **zero** pins. The honest, no-backend fix is to stop the pill claiming proximity it cannot substantiate: say what is true — **"N reports loaded"** / **"Showing most recent"** — and make it state-aware so in the denied/fallback state it does not assert nearness at all (pairs with the denied-arrival banner, which is another cluster's L3-2 fix). This is the copy leg only; it makes the pill honest *today* regardless of when the data layer grows a geo-scoped query.

**FORKS-TO-SKY (Sky-decision note #1 — proximity architecture, behind CRITICAL L3-2 + HIGH L7-03).** The *real* fix — bounded/`ST_DWithin`-style spatial queries + a `onRegionChange` viewport re-fetch (which neither `PlatformMap` variant exposes today) — is a DATA-LAYER decision Sky owns; it is never auto-run and it is genuine work, not a one-liner. This candidate deliberately scopes only the UI/copy half (make the pill stop lying) and names the fork; it does not add the geo query, and it does not touch the realtime viewport-gate inversion (`flagsStore.tsx:495-497`), which lives inside the same architecture decision.

**Access floor.** Pure copy; no contrast/token change. The pill is a persistent-mount live region already (PROTECT-relevant — the one that reliably announces on web), so the honest string also reaches SR users.

**PROTECT preservation.** Preserves PROTECT #10 (Home's honesty law extended to the Map pill). Does not touch PROTECT-relevant zoom-button geometry (the L5-01 occlusion is a separate cluster's fix; this only changes the pill's *text*, not its position).

---

## motion-perf-5 · Heat-map "no zones in view" companion + the iOS cluster-spring / continuous-motion gate

**Resolves:** L7-11 (heat no-zones feedback) + L4-03 (iOS cluster spring `LayoutAnimation` un-gated on every pan) + L4-02 (native cluster-fit leg). Folded because they are the two "continuous / outcome-invisible motion on the Map's core surface" gaps that a device pass settles together.

**Tier:** SHOULD-FIX. **Effort:** S–M (one conditional line for the heat companion; one prop `animationEnabled={false}` / `preserveClusterPressBehavior` on the native cluster view; both are additive). **Signature candidate:** No.

**What / why.** Two Map-surface gaps where the *outcome* of motion (or its absence) is invisible. (a) **Heat map ON can render nothing with no feedback** (L7-11): the layer's *rule* is honestly disclosed ("heat zones only appear where at least 3 flags…") but its *outcome* is not — capture `map__light__390__heatmap-on.png` shows the toggle on, disclaimer + full legend mounted, and **zero cells drawn**, pixel-identical to at-rest; R1: "nothing on the map actually changed." One conditional line — **"No heat zones qualify in this view yet"** when `heatmapEnabled && heatCells.length === 0` — closes the on/empty/broken ambiguity. (b) **Un-gated continuous spring motion on iOS** (L4-03 + L4-02 native): the clustering library fires `LayoutAnimation.configureNext(Presets.spring)` (~700ms) on *every* `onRegionChangeComplete` — i.e., every pan/zoom settle — because `animationEnabled` defaults true and the app never opts out (`PlatformMap.tsx:111-169` passes neither `animationEnabled={false}` nor `preserveClusterPressBehavior`); worse, `configureNext` is *global for that layout pass*, so any overlay that changes layout in the same frame inherits the 700ms spring, bypassing every `useReducedMotion` gate in app code. And a native cluster tap runs `fitToCoordinates(…)` animated (no `animated:false`). The fix is additive props that gate this on the reduce-motion hook. Both are iOS-only code paths → NEEDS-SKY-DEVICE for amplitude, but the code gap is confirmed.

**Access floor.** (a) The heat companion text is a persistent element (renders whenever the empty condition holds) so it announces; uses `<AppText>` + ratified tokens. (b) is a WCAG 2.3.3 alignment on the continuous-motion side of the Map (the camera-fly side is motion-perf-1).

**PROTECT preservation.** Preserves PROTECT #7-merged (reduce-motion discipline — extends the gate to the library-driven iOS spring that currently escapes it). Preserves PROTECT #15 (marker snapshot discipline — `tracksViewChanges={false}` + content-derived keys are untouched; `animationEnabled` is orthogonal to view-change tracking). Preserves the heat-map k≥3 privacy floor (the companion states the *outcome*, never lowers the threshold — Sky-note #4 territory left intact). Preserves PROTECT #2 (the empty-filters card as the template the heat companion follows).

---

## motion-perf-6 · Photo pipeline: resize on ingest (thumbnails stop shipping 12–48MP originals)

**Resolves:** L7-05 (photo resize). **FORKS-TO-SKY** only insofar as it touches the auth-only photo path (guests have no photo affordance) — but the fix itself is pure client-side and privacy-preserving.

**Tier:** SHOULD-FIX (scale- and network-dependent; today's dataset is small). **Effort:** S (add a resize step to the existing `manipulateAsync` call that already runs). **Signature candidate:** No — a clean felt-performance win on the "can I get past this?" moment.

**What / why.** The EXIF-strip re-encode already runs on every uploaded photo — but it is `manipulateAsync(uri, [], { compress: 0.9 })` with an **empty actions array and no resize** (`flags.ts:108-111`). So a 12–48MP phone photo is stored near-original-size and then *downloaded and decoded at full resolution* into every 64–120px thumbnail (`TasksScreen.tsx:1676-1712`) and callout (`PlatformMap.tsx:261-268` at 120px; web popup `.web.tsx:398-404`), because RN's built-in `Image` does no downsampling (expo-image/FastImage aren't in the stack). On weak LTE the callout photo — the very thing a user opens to judge "can I actually get past this?" — can take many seconds, and several photo cards in the Tasks window cost real memory on older devices (decode size scales with *pixels*, not file size). The fix rides the call that already exists: add a `resize` action (cap the long edge to a sensible upload dimension) to the same `manipulateAsync` that already strips EXIF — no new dependency, no new network path, and the EXIF strip is preserved because it re-encodes exactly as before.

**Access floor / privacy.** The EXIF GPS strip must stay intact (this is the RESOLVED EXIF-leak fix, `c6298df`, + its verify gate — memory index) — the resize is *added to* the same re-encode that does the strip, it does not replace or bypass it. No AA impact (images carry `alt`/`accessibilityLabel` already). The existing mitigations (virtualization-lazy mount `photoInView`, skeleton-until-`onLoad`, clean error fallback) are preserved.

**PROTECT preservation.** Preserves PROTECT #9 (report-submit hardening — the storage-orphan cleanup, partial-failure honesty, and the strip-succeeded-gated announcement are untouched; the resize composes inside the same manipulate call). Preserves the virtualization law (PROTECT #3/#14 — `windowSize`/`removeClippedSubviews` untouched; this reduces per-decode cost *within* the existing windowing). Preserves parked-item ④'s EXIF-strip contract (NEEDS-SKY-DEVICE for on-device GPS-removal verification remains true; resize does not alter that pending check).

---

## motion-perf-7 · Web locate-failure gets a visible/spoken outcome (no more silent-vanishing spinner)

**Resolves:** L7-07 (locate failure silent on web). Facet-adjacent to L3-2's denied-arrival work but distinct: this is the *active locate-request* failure, not the passive already-denied arrival.

**Tier:** SHOULD-FIX. **Effort:** S (replace the web no-op `Alert.alert` catch with a visible, announced banner/state that mirrors the report sheet's existing "Waiting for location…" pattern). **Signature candidate:** No.

**What / why.** When "Recenter on me" / the locate flow fails or times out on web, `requestLocation`'s catch is `Alert.alert("Couldn't find your location", …)` — a **no-op on react-native-web** (`MapScreen.tsx:1030-1033`) — and the `finally` clears `locating` (`:1034-1036`), so the "Finding your location…" banner (which was *announced* to SR at `:993`, raising an expectation) simply vanishes with no visible or spoken outcome. Native shows the Alert and is fine. This is the failure-side twin the honest "Finding your location…" copy lacks (L7 copy index): web is a first-class guest surface, the announcement created an expectation, and the action is *actionable* (retry, check browser permission). The report sheet already handles the same gap correctly with a visible "Waiting for location…" state (`ReportFlagModal.tsx:467`) — copy that pattern to the Map locate catch: a visible, `role=alert` "Couldn't find your location — check your browser's location permission and try again" with a retry. The 15s GPS bound means the silence lasts at most one timeout cycle, so this is MEDIUM-tier, but it closes a raised-then-dropped expectation on the guest surface.

**Access floor.** The outcome must be a persistent `role=alert`/`aria-live` (again the L6-02 lesson — the web-no-op `announceForAccessibility` cannot carry it; a mounted live region can). No color/token change; retry control inherits 44pt grammar.

**PROTECT preservation.** Preserves PROTECT #6 (the locating fix + its tests — this adds the *web failure outcome*, does not touch `initialLocationAction` or the `location.test.ts` invariants that clear the spinner on non-granted mount; the 15s race and zero-watchers posture are untouched).

---

## motion-perf-8 · Motion hygiene sweep — tokenize the stray literals, gate the dead reduce-motion delays, add the missing pulse token + an RM regression test

**Resolves:** L4-07 (600ms tier-fill literal + JS-thread race), L4-08 (onboarding dot spring literals), L4-10 (Skeleton 700ms pulse literal / missing token), L4-11 (drawer 220ms dead-delay under RM), L4-12 (nearby-select 350ms dead-delay under RM), L4-05 (no RM regression test). Folded: these are one "the motion law has a few unenforced edges" cleanup.

**Tier:** POLISH → SHOULD-FIX (the RM *test* leg is the one that earns SHOULD — it is how L4-01/L4-02 shipped and survived a flagged report). **Effort:** M in aggregate, but each leg is S and independently shippable. **Signature candidate:** No — pure discipline, but it hardens the discipline the app is *praised* for.

**What / why.** The app's motion governance is genuinely exemplary (every `Animated` system RM-gated, all 32 modals flip to `animationType="none"`, glass primitives carry zero motion) — but a few literal edges escape the token law and a couple of RM delays are *dead time for exactly the users who asked for snappiness*. (a) **Dead RM delays:** the drawer→sub-screen handoff waits a literal `setTimeout(…, 220)` "so the drawer closes visually first" (`HamburgerDrawer.tsx:112-115`) and nearby-select waits `setTimeout(…, 350)` before opening the callout (`MapScreen.tsx:2179`) — under RM both close *instantly* but the wait remains, so RM users eat 220ms/350ms of nothing. Gate them: `reducedMotion ? 0 : 220`. (b) **Token drift:** the tier-progress fill animates width over a **600ms literal** on the JS thread, timed to fire when Profile's focus-refetch lands (`ProfileScreen.tsx:793-796` — off the scale entirely; the scale maxes at `duration.slow` 320); onboarding dot pills use literal spring params (`speed:18, bounciness:3`, `OnboardingCards.tsx:156-175`); Skeleton pulses on literal `700`s (`Skeleton.tsx:47-48`) — the token scale has no loop-pulse value, so add `motion.duration.pulse` (or a documented exception) rather than leave the last primitive literal unaccounted. (c) **The RM regression test** (L4-05): the motion law has *zero* test enforcement (grep for `reducedMotion|isReduceMotionEnabled` across `*.test.*` = zero) — `useReducedMotion` itself is untested and no component pins any RM branch, which is *exactly* how the falsy-zero trap shipped and survived. Add guard tests that mock the hook and assert the invariants (e.g. `flyTo` called with `animate:false` under RM, `animationType==='none'`, sheen not mounted) — the same guard-test treatment the glass/DT laws already got. Also correct the stale `DESIGN.md:279` claim ("the bottom-sheet slide and drawer are the only longer moves" — the camera and tier-fill are longer) and the `01_render-index.md` "test-inferred" RM tag (no such test exists — yet).

**Access floor.** Gating the dead delays *improves* RM users' experience (removes imposed latency); the pulse token is a hygiene extension, not a floor change. No contrast/token-color change anywhere.

**PROTECT preservation.** Preserves PROTECT #7-merged (reduce-motion discipline — this *hardens* it: every changed literal stays RM-gated, and the new test pins the gates so they can't silently drop). Preserves the hardened guard-test suite (PROTECT-list) by *adding* to it in the same style, never weakening it. Preserves GLASS.md (no eye-tuned floors, blur budget untouched — none of these legs touch blur, tint, or the contrast tokens; adding a `motion.duration.pulse` token is a motion-scale extension, not a contrast-token invention). The JS-thread tier-fill note is observed; whether to move it to a native-driver-friendly property is a small build decision left inside the leg, not prescribed here.

---

## Cluster notes for the assembler

- **Ambition mix:** motion-perf-2 (data-layer timeout) is the co-signature — the temporal-honesty spine, memorable and access-first. motion-perf-1 (web camera parity) is the highest-value *correctness* fix and a MUST. Quick wins: motion-perf-3, -4, -5(a), -7. Meaningful: motion-perf-2, -6, -8. motion-perf-1 spans S–M.
- **Forks named, not smuggled:** motion-perf-3 forks to Sky-note #4 (guest cache scope); motion-perf-4 forks to Sky-note #1 (proximity architecture / geo query). Both scope only their UI/copy half. No candidate proposes a DB migration, a geo predicate, or a realtime-gate change — those stay Sky's.
- **Dedup honored:** L4-06 (Home-peek motion) is a facet of L5-06 (live-peek defect) and belongs to the map-occlusion/target cluster, not here — not re-proposed. The denied-arrival banner (L3-2/L7-04) is another cluster's fix; motion-perf-4 touches only the *pill copy*, motion-perf-7 only the *active-locate* failure, so no double-count.
- **PROTECT-7 is the north star** for motion-perf-1: the native camera gate is the standard; every web change brings web *up to* it. GlassSurface.tsx untouched throughout; expo-blur intensities (12/24) untouched (nothing in this cluster adds or moves a BlurView); the `box-none` gesture law untouched; virtualization law untouched.
