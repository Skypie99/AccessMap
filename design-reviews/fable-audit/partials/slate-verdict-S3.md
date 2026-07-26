# Adversarial Skeptic Verdict — S3

**Proposal:** S3 — "The map pin becomes a doorway: surface the trust ledger where trust is spent" · ★ SIGNATURE
**Resolves:** L3-12, L6-05, L8-2 (read-half), L8-3 (read-side) · Effort L · Tier Signature
**Verdict: KEEP**

---

## One-line

Clean. Every cited finding is real, CONFIRMED HIGH, and genuinely resolved by the exact mechanism the findings themselves prescribe; every code claim in the proposal verified against source and is if anything understated; the write-side product/privacy half is correctly forked to Sky (note #5). No rail violated.

## Per-rail (all 7 TRUE)

| Rail | Verdict | Evidence |
|---|---|---|
| tracesToFinding | ✅ | L3-12 / L6-05 / L8-2 / L8-3 all present in `02_findings.md` at HIGH. **L6-05's fix-shape is verbatim S3**: line 1190 — "Fix shape: route `onSelectFlag` into FlagDetailModal (or keep the map fly-to for sighted users and open details when `screenReaderOn`)." L3-12 (`:589-594`): callout has no created-at, no action, `alt` falsely promises "Open for details." L8-2 (`:1494-1499`): FlagDetailModal built + SR-complete but reachable only via Tasks/Profile, never from the map — an IA problem, not a build problem. L8-3 (`:1501-1506`): read-side surfacing in scope, "report this looks wrong" write-side is the acknowledged product/privacy judgment call. |
| wcagFloorHeld | ✅ (improved) | Routes the accessible list into a focus-managed Modal (`FlagDetailModal.tsx:125` `useFocusOnOpen`, `:729` `accessibilityViewIsModal`, `:837` `severityA11y`) replacing a focus-nowhere dead-end. It is a rendered Modal, **not** an `announceForAccessibility` call — cross-platform, no web no-op trap. WCAG 2.4.3 / 4.1.2 advanced. |
| glassLawHeld | ✅ | No color/floor/ink token touched (FlagDetailModal carries its own arbitrated inks; the "Open details" affordance is a label/Pressable). No BlurView added → blur budget untouched (still 12/24 elsewhere). `box-none` untouched — the affordance lives **inside the callout**, not the overlay (`MapScreen.tsx:1259` overlay + its "box-none is mandatory" comment left alone). `GlassSurface.tsx` not edited/forked. Virtualization untouched. |
| protectPreserved | ✅ (verified, not trusted) | **PROTECT-1** (Nearby accessible twin): row content is NOT touched. The one-breath `accessibilityLabel` (`NearbyFlagsModal.tsx:135`) and the visible row line `Severity … · status · relativeTime(created_at)` (`:167`) are untouched; S3 re-routes `onSelectFlag` at the **parent call site** (`MapScreen.tsx:2168`), i.e. the endpoint — exactly the "fixes touch its *trigger* or *endpoints* — never this content" clause (protect-merged item 1 / `02_findings.md:1875`). **PROTECT-3** unaffected. box-none gesture law preserved (above). |
| rnExpoFeasible | ✅ | No web-announcement dependency. The `screenReaderOn` signal S3 relies on **already exists**: `MapScreen.tsx:347` `const screenReaderOn = useScreenReader();`, already used to gate behavior at `:353`. `relativeTime` helper exists (`src/lib/relativeTime.ts`) to feed the callout date from `flag.created_at`. FlagDetailModal is `export default`, React.lazy-loadable, stable `Props` interface (`:60-74`), with a working wiring template in `TasksScreen.tsx:1403-1410` (`onChanged`/`onEdited`/`onDeleted`/`onViewOnMap`). MapScreen already owns the store + a fly-to (`mapRef.current?.animateTo`) to satisfy `onViewOnMap`. Real, feasible integration — the proposal's "MapScreen does not currently import FlagDetailModal — a real integration, not a one-liner" is accurate (confirmed: not imported in MapScreen). |
| accessNotTradedForPolish | ✅ | Net access GAIN (focus-nowhere dead-end → focus-managed detail sheet on the accessible path). No hidden regression dressed as polish. |
| arbiterReRunPresent | ✅ (n/a) | Touches no color/floor/severity value; S3 correctly states "No arbiter (no color)." Rail set true per the no-color clause. (The anon-pin severity-erasure at `PlatformMap.web.tsx:362-363` / `PlatformMap.tsx:242` is correctly owned by S1/S14, NOT S3.) |

## Attacks attempted (and why they failed)

1. **"Fabricated code claims / FlagDetailModal isn't actually reachable-as-described."** Refuted. All line refs check out: web callout `PlatformMap.web.tsx:377-409` shows category + "Severity N · status · Anonymous" + photo + description with **no date, no action** (matches L3-12 exactly); `alt` "Open for details." at `:371`. Native `PlatformMap.tsx:239-277` mirrors it with "Tap to view details." at `:237`. FlagDetailModal really is imported only by TasksScreen/ProfileScreen (grep), never MapScreen.
2. **"The SR-routing mechanism doesn't exist → infeasible RN trick."** Refuted. `useScreenReader()` is already imported and live in MapScreen (`:347`), already gating the auto-open-list at `:353`. S3 reuses the exact signal the file already trusts.
3. **"It regresses PROTECT-1 by touching the crown-jewel Nearby row."** Refuted. The re-route is at the MapScreen `onSelectFlag` handler (the endpoint), not inside the row; row a11y content untouched.
4. **"The write-side (flag-as-wrong / verifier count) sneaks a backend decision into a UI slate."** Refuted. S3 explicitly forks both to Sky-note #5 (verified present in `sky-notes.md:42-47`) and scopes only the read side. Correctly drawn.
5. **"'No arbiter' hides a color change."** Refuted. The doorway affordance and date line introduce no severity/floor token; FlagDetailModal owns its own inks. The anon-pin color fix is a *different* proposal's scope.

## Minor scoping observation (NOT a fix-condition, does not gate KEEP)

Effort is honestly tagged **L**: S3 bundles (a) a new MapScreen import of FlagDetailModal with ~5 handler wirings, (b) the callout "Open details" affordance + date line on both `PlatformMap` variants, and (c) the SR-branched `onSelectFlag` re-route. All three are sound and share the same integration, but the assembler should be aware this is a real multi-file map-renderer + MapScreen change and must be sequenced in the single coordinated map-renderer pass the proposal already names (with S1/S7/S14/S17 on the callout; S4/S5/S6/S16 on MapScreen). No condition required — every rail holds as written.

## fixConditions

None. KEEP as written.
