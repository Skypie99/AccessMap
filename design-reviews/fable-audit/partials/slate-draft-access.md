# Slate draft — cluster ACCESS (L6) — accessibility as the product

**Drafter:** L6 cluster (SR / motor / cognitive). **HEAD** `82e738b`. Read-only; candidates only.
**Source findings owned:** L6-01 (CRITICAL) · L6-02 · L6-04 · L6-05 · L6-07 (HIGH) · plus the L6 MEDIUM tail (L6-11, L6-14, L6-16, L6-17, L6-19, L6-21, L6-13, L6-18) and the copy/legend riders.
**Explicitly NOT owned here (dedup):** L6-08 / L6-10 fold into **Canonical C = L2-1** (white severity digit AA — the `textOnColor` mechanical adoption). That fix is the design/contrast cluster's slate entry; this cluster references it as the access-critical reason it must ship, and carries the two auth-gated RV sites (parked item ①) as *coverage riders* on that fix, not as a separate proposal. L6-20 (motor zoom) folds into **Canonical B = L5-01**, owned by the device-integrity cluster.

**Overarching frame (the lens's head-on judgment):** this codebase's accessibility layer is its single best-engineered subsystem — hooks, dual iOS/Android announce wiring, `accessibilityViewIsModal` across ~25 sheets, a centralized severity vocabulary — but it is written fluently in the **pre-0.71 React-Native a11y dialect that `react-native-web@0.21.2` no longer translates.** Four of six a11y subsystems (selection-state, announcements, focus-move, decorative-hiding) are silently sheared off at the web bundler — and web is the ONLY surface a guest can use today. For a product whose promise is "born accessible," shipping the web app without its accessibility engine mounted is a mission breach, not a polish item. That is the spine of this cluster.

**PROTECT anchors this cluster must preserve (from `protect-merged.md`):**
- PROTECT-1: the SR auto-open + NearbyFlagsModal as the map's accessible twin (fixes touch its *trigger* and *endpoints*, never its content).
- PROTECT-12: `src/lib/accessibility.ts` hook suite + `severityA11y`/`statusA11y` centralization + `accessibilityViewIsModal` across ~25 sheets — the natural seam; **adoption, not redesign.**
- PROTECT-3: ReportFlagModal's control vocabulary (the severity buttons, the liveRegion severity hint, the alert-node anon banner).
- PROTECT-4: `severityA11y`/`statusA11y` single-source phrase.
- PROTECT-5: LegendModal severity rows (number + word + spoken color + consequence).
- PROTECT-6: the announce+liveRegion dual-wiring convention.
- The GLASS.md invariants (arbiter decides floors; blur budget 12/24; `box-none` gesture law; `GlassSurface.tsx` DO-NOT-EDIT; virtualization law) — untouched by every candidate here (this cluster adds a11y props/routing/labels; it does not touch glass primitives or map gesture wiring).

---

## access-1 — Mount the accessibility engine on web: adopt the modern RN ≥0.71 a11y dialect the whole app already speaks in the old one  ★ SIGNATURE

**Resolves:** L6-01 (CRITICAL) · L6-02 · L6-11 · L6-16 (+ names the mechanism behind the web halves of L6-13, L6-18).

**What / why:** One systematic seam-level fix restores the app's own accessibility layer on the web surface — the only surface a guest has. The app sets `accessibilityState={{selected|checked|expanded|busy}}` at ~30 sites (report category/severity chips, Tasks scope/category/sort, the whole map filter panel, the Nearby list's category tabs), but RN-web 0.21.2's `createDOMProps` reads only the *flat* modern props (`aria-selected/checked/expanded/busy`) and drops the nested-object dialect entirely — proven by the trees, where the only `[selected]` anywhere is react-navigation's tab bar, which already uses the modern `aria-selected` (`BottomTabItem.tsx:353`). The fix is additive: add the flat `aria-*` prop **beside** the existing `accessibilityState` at each site (it maps to the same native state AND to the DOM), add the visually-hidden `aria-live` announce-shim so `announceForAccessibility` stops being a no-op on web, add `aria-hidden` to `decorativeProps` (`accessibility.ts:14-18`) so decorative icons stop announcing "image," and pass `aria-label` to each `<Modal>` so dialogs stop landing SR users in anonymous containers. The mission cost this closes is the whole reason it is the signature: today a blind web contributor submits a report whose category they cannot confirm, onto a defaulted form ("No ramp", severity 3), acting into silence — R2's "submitting blind in the worst sense." The single best-engineered subsystem in the app is one bundler-dialect gap away from working on the surface that needs it most; making it *actually* accessible on the web, end to end, is the most ownable and in-ethos signature this audit can produce — an accessibility app whose accessibility finally mounts where guests live.

**Ambition note / possible split:** this is deliberately a meta-candidate. If the slate wants smaller bites, it decomposes cleanly into four independently-shippable facets, each traceable: (a) `aria-selected/checked/expanded/busy` adoption at the ~30 state sites [the L6-01 core, the load-bearing half]; (b) the `aria-live` announce-shim [L6-02]; (c) `aria-hidden` in `decorativeProps` + on lucide icons [L6-11, mostly one shared-object edit]; (d) `aria-label` per `<Modal>` [L6-16]. access-1a and access-6 below carry (c) and (b) as standalone quick-win entries for the bench; the signature is the union framed as "mount the engine."

**Effort:** L (breadth — ~30 state sites + shim + shared-object edit; each edit is mechanical and low-risk, but the surface is wide and every touched screen wants a re-verify).
**Tier:** must-fix (contains a CRITICAL). **Signature:** YES.
**PROTECT:** preserves PROTECT-12 (this IS the "adoption, not redesign" the merged list nominates the hook suite for), PROTECT-1 (touches the Nearby list's tab *state props* only, never its row content), PROTECT-3 (adds flat props beside the report vocabulary, never alters the labels/liveRegion). No native regression — the flat props map to the same iOS/Android states the nested object already produced; the existing dual-wiring stays.
**Verification:** the L6 PROBE-REQUEST names it — a shipped-DOM attribute dump (not ariaSnapshot) of the report form + filter panel for `aria-selected|checked|expanded|live|hidden|modal` per element, converting the code-verified claims to shipped-DOM proof; plus the four glass arbiter proof-sets stay exit-0 (this touches no color token, so contrast is unaffected — named only to show it wasn't disturbed). Native truth (VoiceOver) remains NEEDS-SKY-DEVICE but is unchanged by construction.

---

## access-1a — Silence the "image" noise: add `aria-hidden` to `decorativeProps` so blind web users stop hearing an unlabeled, half-built app  (QUICK WIN / facet of access-1)

**Resolves:** L6-11.

**What / why:** The shared `decorativeProps` object (`accessibility.ts:14-18`) carries the OLD trio — `accessible:false` + `importantForAccessibility:'no-hide-descendants'` + `accessibilityElementsHidden:true` — none of which RN-web 0.21 honors (it maps only `aria-hidden`/`accessibilityHidden`). So every decorative image announces as "image": the Tasks screen *literally opens* on an anonymous "image" (`tasks__light__390.txt:1` — the ScreenStage grain), every onboarding slide icon, the report MapPin, the Nearby search icon, the profile placeholder, two icons per tab. Adding a single `aria-hidden: true` to the shared object (and letting lucide icons take `aria-hidden`) fixes most sites in one edit — a genuinely tiny, high-legibility win. R2: "the Tasks screen literally opens on 'image'"; first impressions for blind web users are of an unlabeled, half-built app — the opposite of the brand. Carved out as its own entry because it is the cheapest, most visible single improvement in the cluster and a clean stepping-stone if access-1 ships in pieces.

**Effort:** S (one shared-object edit + a sweep of the manual decorative twins). **Tier:** quick win. **Signature:** no.
**PROTECT:** preserves PROTECT-12 (edits the hook-suite's shared object exactly as it's meant to be extended). Native unaffected (the old trio keeps working on native; `aria-hidden` is additive).
**Verification:** DOM dump shows `aria-hidden` on the grain/icons; the a11y tree no longer opens Tasks on a bare "image."

---

## access-2 — Route the accessible list's one action into FlagDetailModal so FIND doesn't dead-end in the visual layer

**Resolves:** L6-05 (HIGH) · (closes the SR half of L3-12's callout cul-de-sac; L3-12 proper is owned elsewhere but this is its accessible remedy).

**What / why:** The NearbyFlagsModal is the app's best surface and its only verb is a trapdoor. Selecting "No ramp, severity 4, 297 meters away…" runs `onSelectFlag` (`MapScreen.tsx:2168-2180`): close the modal, `animateTo`, `showCallout` after 350ms — no focus move, no detail sheet. For a blind user the accessible surface disappears and focus lands nowhere managed, on a Leaflet popup (web) / react-native-maps Callout (native) that no focus move targets and that is notoriously SR-unreachable. The remedy already exists and is SR-complete: `FlagDetailModal.tsx` has `useFocusOnOpen` (`:125`), `severityA11y` (`:837`), and `accessibilityViewIsModal` (`:729`). Route `onSelectFlag` into FlagDetailModal — either always, or (to keep the map fly-to for sighted users) open the detail sheet when `screenReaderOn` and keep the callout otherwise. The FIND job's last step — "understand this barrier" — finally lands somewhere with a managed focus, a real heading, and the full trust ledger reachable, instead of silently exiting the accessible path. R1 (sighted) called the callout a cul-de-sac; for a blind user it is worse. This also quietly unlocks the trust-ledger surface (StatusHistoryModal composes inside FlagDetailModal) from the map, which today has no map→detail link at all.

**Effort:** M (wire an existing modal into MapScreen + a `screenReaderOn` branch; MapScreen does not currently import FlagDetailModal, so it's a real integration, not a one-liner). **Tier:** meaningful. **Signature:** candidate-adjacent (memorable "the best surface finally leads somewhere") but I rank access-1 as the cluster's signature; this is a strong MEANINGFUL.
**PROTECT:** preserves PROTECT-1 (adds an *endpoint* to the Nearby list, never touches its row content — exactly the "fixes touch its endpoints" clause), preserves the map's `box-none` gesture law and camera behavior (the sighted fly-to path is retained). GlassSurface untouched.
**Verification:** on web, DOM/tree shows FlagDetailModal opening from a list-row select with focus moved to its title; native FlagDetailModal reachability is NEEDS-SKY-DEVICE but the routing is code-verifiable. No arbiter change (no color touched).

---

## access-3 — Free the Tasks card's Verify/Resolve/Reject/Details from the accessible-parent trap so blind users can run the trust engine

**Resolves:** L6-04 (HIGH — "the single most important VoiceOver device-check in the audit").

**What / why:** Verification is the app's trust engine — the mechanism R1 and R6 both said decides whether any severity badge can be believed. On the primary triage surface, each Tasks card is a bare `<Pressable>` (accessible-by-default, `TasksScreen.tsx:1595-1607`) that WRAPS four `PressableScale` action buttons (`:1528-1590`). On iOS, `accessible` makes the card one VoiceOver leaf and its descendant buttons are not focusable — so a blind user's path to verifying a flag collapses to long-press → selection mode → the bulk bar (whose buttons are reachable siblings), or nothing, since the card tap opens the Map, not details. If confirmed on device, community moderation is sighted-only on the surface built for it. The fix is structural and known: lift the action row OUT of the accessible card wrapper as a sibling row, OR set `accessible={false}` on the card with a labeled inner summary node so both the summary and each action are independently focusable. (On web the buttons are reachable but as invalid nested `<button>`s with double-activation ambiguity — the same restructure fixes that too.) This is the cluster's highest-leverage *native* fix; it is device-gated for confirmation but the restructure stands on the documented RN flattening pattern.

**Effort:** M (restructure the card's a11y tree — sibling action row or `accessible={false}` + summary node; the FlagCard is inline in TasksScreen, so it's a focused edit on one component). **Tier:** meaningful (HIGH; native-critical if flattening confirmed). **Signature:** no.
**PROTECT:** preserves the bulk-select flow (PROTECT-adjacent — the bulk bar stays the multi-select path) and the card's visual layout; touches only the a11y grouping. No glass/token/gesture impact.
**Verification:** NEEDS-SKY-DEVICE is the gate (iOS VoiceOver: are Verify/Details focusable from a card?) — this is the audit's #1 device check. Web tree can confirm the nested-button invalidity is resolved. Best sequenced behind the ONE EAS TestFlight build.

---

## access-4 — Give map pins the ratified hairline boundary so low-severity barriers stop vanishing on light tiles

**Resolves:** L6-07 (HIGH, arbiter-measured).

**What / why:** GLASS.md §12 rule 4 is the app's own law — "a white ring vanishes on white tiles… use regime-decomposed unions" — and it was applied to clusters and heat badges but **never to pins**. The arbiter measured the gap head-on: the pin's 2.5px white ring reads **1.00:1** on Apple light tiles, and the sev1–3 fills read **1.57 / 2.15 / 2.78** (sev4 3.61, sev5 4.35 pass) — so an iOS light-mode user with low vision loses the yellows and ambers (the low-severity pins) into the tile background, and the severity ramp's low end disappearing first skews perceived risk *downward* on a safety map. The fix is the ratified precedent already shipping on clusters: the 1px `#0F1B2D` hairline-union (`PlatformMap.web.tsx:175` is the working exemplar) applied to the pin marker, so the boundary survives on any tile regime. This EXTENDS an existing arbitrated pattern rather than inventing anything. Web is exempt in practice (CartoDB dark tiles always → ring measures 21:1), so this is the iOS-light-tile arm — device-conditional and twin-mitigated (the Nearby list carries severity non-visually), which is exactly why it's HIGH not CRITICAL, but it is a real 1.4.11 boundary failure on the safety-critical FIND targets.

**Effort:** S–M (apply the existing hairline-union recipe to the pin renderer in both `PlatformMap.tsx` and `PlatformMap.web.tsx`; the recipe already exists on clusters — it's replication, not design). **Tier:** meaningful (arbiter-measured HIGH). **Signature:** no.
**PROTECT:** EXTENDS the GLASS §12.4 union law (the crown-jewel contrast-arbitration system, PROTECT/L2·L6) rather than regressing it; adopts the existing ink `#0F1B2D`, invents no new token. `GlassSurface.tsx` untouched.
**Verification:** **arbiter re-run required** — `contrast-check.mjs` + `tools/audit-stacks.json` (the §C tileExtremes rows) must show the pin ring/fill boundary clearing 3:1 on light tiles after the hairline is added; exit-0 on the four existing proof-sets confirms no regression. On-device Apple-light-tile visual is NEEDS-SKY-DEVICE.

---

## access-5 — Make severity speak one grammar everywhere: adopt `severityA11y` on the FIND surfaces that still say a bare number

**Resolves:** L6-14 (MEDIUM) — and the copy riders "Severity 4 · verified → Severity 4 of 5 — Significant · Verified" + "define Verified in the legend."

**What / why:** The vocabulary law — number AND word, everywhere — is honored *visually* but broken *aurally* on the surface that IS the product's answer to the map. The centralized helper `severityA11y(n)` → `"severity N of 5, {word}"` (`a11yText.ts:17-19`) exists and is correct, but has only three adopters (`PlatformMap.tsx:237`, `MyWatchedModal`, `FlagDetailModal`). The NearbyFlagsModal rows say bare "severity 4" (`:126`), Tasks cards say bare "severity" (`TasksScreen.tsx:1508`), Home rows say word-only and drop status when distance is present (`HomeScreen.tsx:320-324`), and web pins say number-only (L6-12). So a blind user in the map's accessible twin hears "severity 4" with no word and no scale — they must have memorized the legend to know 4 of what, in which direction (R2: "the plain-language scale only exists on Tasks and in the report form"; R6 took until the report form to decode severity). Adopt `severityA11y` at those four label sites (pure adoption of an existing phrase — the merged list's exact "adoption, not redesign" prescription), and add the missing **Status block to the LegendModal** ("Open = reported · Verified = confirmed by another user · Resolved = fixed") so "Verified" — the trust word on every row — is finally defined somewhere. This is a quick, high-comprehension win that makes the app's best accessible surface speak its own vocabulary law.

**Effort:** S (swap in the existing helper at ~4 sites + one new legend block reusing the FAQ's existing definition). **Tier:** quick win. **Signature:** no.
**PROTECT:** preserves PROTECT-4 and PROTECT-5 (this IS adopting the single-source phrase and extending the legend's vocabulary law — additive, never a rewrite); preserves PROTECT-1 (the Nearby row gains a word, loses nothing).
**Verification:** a11y tree of a Nearby row + a Tasks card shows "severity N of 5, {word}"; the legend renders a Status section. No arbiter change (labels only).

---

## access-6 — A visually-hidden `aria-live` announce-shim so the app's ~50 web announcements stop being no-ops  (facet of access-1, carried for the bench)

**Resolves:** L6-02 (HIGH).

**What / why:** `announceForAccessibility` and `setAccessibilityFocus` are *literally empty functions* in RN-web 0.21.2 — so every announcement the app carefully wires (auto-list count, filter-cycle confirmations, "Finding your location…", "Report filed.", selection-mode entry, sort/scope changes, glass-flip) is silent on web, and every `useFocusOnOpen` is dead. What survives is only the handful of liveRegions on persistently-mounted elements (map status pill, severity hint, bulk count) and `role=alert` mounts. The app thus *behaves* SR-aware (it even auto-opens the list because RN-web tells it everyone runs a screen reader) while delivering none of the speech that makes those behaviors legible — compounding the L6-01 silence into "a blind web contributor acts into silence." The fix is a tiny web-only shim: a single visually-hidden `aria-live="polite"` node whose text content the existing announce call-path writes to (keeping the current dual iOS/Android wiring untouched). This is offered as its own entry because it is the second load-bearing half of "mount the engine" and pairs with access-1a as the two cheapest facets; if access-1 ships whole, this folds into it.

**Effort:** S–M (one shim component + route the existing announce helper through it on web; the ~50 call sites don't change — they already call the helper). **Tier:** quick win / meaningful (HIGH severity, small fix). **Signature:** no.
**PROTECT:** preserves PROTECT-6 (the announce+liveRegion dual-wiring convention — the shim is the web leg of the same convention, added, not replaced), preserves PROTECT-12. Native announce path unchanged.
**Verification:** DOM shows the `aria-live` node updating on an announce trigger (e.g. filter change); pairs with the access-1 DOM dump. Real-SR confirmation of the spoken result is NEEDS-SKY-DEVICE but the shim's DOM behavior is verifiable in-harness.

---

## access-7 — Close the small-but-sharp native SR gaps: SignIn modal containment, page headings, and the legend-backdrop flattening risk  (housekeeping bundle)

**Resolves:** L6-19 (MEDIUM) · L6-17 (MEDIUM) · L6-21 (MEDIUM).

**What / why:** Three independent, low-effort native-SR correctness gaps that share a "one-line-each, but real" character and are cheapest shipped together. (a) **L6-19** — the SignIn modal (`ProfileScreen.tsx:826-832`) is the ONE sheet in the app missing `accessibilityViewIsModal`; the convention is proven on ~25 other surfaces, so iOS VoiceOver can wander back into the Profile behind it. One-line fix on `SignInScreen`'s root — preserves PROTECT's `accessibilityViewIsModal` discipline by completing it. (b) **L6-17** — Tasks and Home have no page heading (`ScreenHeader`'s title is `variant="display"` → no header role), so heading-rotor navigation (a primary blind-user strategy) skips the two editorial screens; and section headers double-announce on web (nested `header` role + auto-header). Add `accessibilityRole="header"` (+`aria-level`) to ScreenHeader's title; drop the container role on section headers for web. (c) **L6-21** — LegendModal's backdrop is a labeled Pressable that PARENTS the card (`LegendModal.tsx:32-43`), the same flattening mechanism as L6-04 — if iOS treats it as a leaf, the entire severity/color decoder collapses into one "Close legend" button. Fix: make the backdrop an absolute-positioned SIBLING (the HamburgerDrawer already does this correctly, `:146-148`). Bundled because each is tiny, each is native-correctness, and together they harden the SR story without any of them warranting a standalone slate slot.

**Effort:** S (three small structural/prop edits). **Tier:** quick win. **Signature:** no.
**PROTECT:** (a) completes the `accessibilityViewIsModal` discipline (PROTECT-6 family); (b)/(c) touch only a11y roles/structure, no visual/token/gesture change; (c) preserves PROTECT-5 by ensuring the legend rows stay reachable. GlassSurface untouched.
**Verification:** (b) is web-tree-verifiable now (ScreenHeader title gains `heading`; section headers stop double-announcing). (a) and (c) are the native flattening/containment class → NEEDS-SKY-DEVICE (part of the same VoiceOver device pass as access-3), but the code fixes stand on documented RN patterns.

---

## FORKS-TO-SKY (not slate entries — named per hard rails 5 & 6)

- **L6-08 / L6-10 → Canonical C (L2-1).** The white severity digit failing AA (sev1–4 = 1.57/2.15/2.78/3.61) and the RV dot-boundary melt are the SAME defect as L2-1 and its fix is the mechanical adoption of the **already-ratified** `severity[n].textOnColor` (`theme.ts:543-547`) at the un-forked sites. That proposal belongs to the design/contrast cluster's slate; this cluster's stake is only that the fix is *access-critical* (severity is the safety datum) and that its coverage MUST include the two auth-gated `RecentlyViewedRow` sites (parked item ①) so no white-on-midramp holdout survives. **Not double-counted here.**
- **L6-20 → Canonical B (L5-01).** Map single-pointer zoom-out (motor lockout) is a facet of the zoom-lockout canonical; owned by the device-integrity cluster. This cluster notes only that the NearbyFlagsModal twin removes zoom from the SR-critical path (which is why L6-20 is a motor finding, not an SR one).
- **Auto-open web-trigger honesty (L6 ★ section, related to L1-4/L3-9).** The SR auto-open fires for EVERY web user because RN-web hard-codes `isScreenReaderEnabled → true`. The *right* remedy (gate the web trigger honestly / visible-first "List" emphasis) sits inside the L1/L3 first-impression cluster's scope (Canonical E). This cluster's non-negotiable constraint on whatever they propose: **keep the native auto-open (PROTECT-1); never "fix" this by removing it.** Flagged so the two clusters don't collide.
- **Product/trust-scope items** (define & count "Verified", surface the trust ledger, guest counter-affordance = L8-2/L8-3) are backend/trust-model **Sky-decision forks** per `sky-notes.md` §5. access-2 (routing to FlagDetailModal) *incidentally* makes the ledger reachable from the map, and access-5 defines "Verified" in the legend — both are UI-only halves that stand on their own; neither presumes the scope decision. The counter-affordance ("flag this as wrong") is NOT proposed here — it forks to Sky.

## Deferred / not proposed (with reason)
- **L6-13 (onboarding exposes all 5 slides; native too), L6-18 (tab-badge meaning drift), L6-22/23/24/25/26 (LOW/POLISH).** Real but lower-leverage; L6-13's web half is covered by access-1's `aria-hidden` mechanism (the same decorative/importantForAccessibility gap), and L6-18's badge is the dedup'd MEDIUM badge-family (L8-9) owned elsewhere. Carried as facets/notes, not standalone entries, to keep the cluster's slate to its highest-leverage 7.
