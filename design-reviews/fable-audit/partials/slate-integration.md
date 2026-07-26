# Fable Audit — AccessMap — Part 3: Integration (phasing · Sky-decision forks · device list)

**Subject:** AccessMap @ `main` `82e738bc177f8a0b14ca0aa978c6ffb92bc5c54b`. **Date:** 2026-07-04.
**Source of record.** Proposals frozen in `partials/slate-proposals.v2.md`; ranking in `partials/slate-ranking.md`; forks seeded by `partials/sky-notes.md` + `partials/dispositions.md`. This file turns the ranked slate into (1) mockup-able phases, (2) the crisp either/or decisions only Sky can make, and (3) the ONE consolidated on-device list. **Read-only synthesis** — it plans, it does not edit code, build, or touch the DB. Every color/floor proposal still routes through `contrast-check.mjs` at build time; nothing here pre-empts the arbiter.

**Grouping principle.** The phases below **follow the ranked slate, not the reverse** — the ranking (`slate-ranking.md`) decides *priority*; the phases decide *what can be mocked-up, arbitrated, and built as one coherent unit* without re-touching the same file twice. Where a lower-ranked proposal shares a surface with a higher-ranked one (the map renderer, the Report sheet, the header family), it is pulled into the same phase so the surface is rebuilt **once**. A phase is the build-unit; the rank is the reason.

---

## 1. MOCKUP-GATED PHASES

Six phases. Each is mockup-able as a unit. Phases 0–1 and 3–5 carry **no color-token change** → no arbiter gate (verification is a11y-tree / render-state / guard-test). **Phase 2 is the only arbiter-gated phase** and runs the full GLASS §9 rollout recipe (mockup → `contrast-check.mjs` → staged build → report) for every surface that composites app ink over live map tiles.

### Phase 0 — Copy & mechanical honesty (no arbiter, no mockup-compile)
*Pure string / label / link / logic-parity edits the app already contradicts itself on elsewhere. Shippable first, independently, lowest risk. No GLASS surface touched.*

| ID | rank | what it is | note |
|---|---|---|---|
| **S15** | 16 | First-run honesty copy sweep (noun canon, false "need an account", onboarding photo/tap promise, submit-moment line) | copy-only; coordinate noun canon with S1 (Home `STATUS_LABELS`) + S20 (casing) |
| **S20** | 20 | Trust-fallback surfaces (Help FAQ accuracy, stale changelog, About anchors, casing sweep) | copy/link-only; About "logged, visible" claim cashes after **S3** (or soften) |
| **S19** | 19 | Location consent "Not now" + de-theater the web permission button | UI-control + copy; extends the slide-4 "Maybe later" pattern eight lines away |
| **S5** | 8 | **CRITICAL** — Report pill kicks a location read (Home-pill ↔ FAB parity) + disabled-submit reason + in-sheet retry | logic-parity, no color; the highest-leverage fix in its cluster. *Placed in Phase 0 as a mechanical parity fix, but it is a CRITICAL — do not defer it behind the cosmetic legs.* |
| **S18** ①② | 9 | **CRITICAL** — "Submit report" label + aligned 2.5.3 a11y name + banner word-wrap guards | label + reflow legs (①②) are S8-independent; item ③ (header collision) moves to Phase 2 with S8 |

*Phase-0 exit:* render-state read in light/dark + a11y-tree confirms the corrected strings; S5's fresh-web-context manual (pill → sheet resolves → submit enables); S18's 200%-zoom SC test for the label + banner-wrap.

### Phase 1 — Access CRITICALs (no arbiter — a11y-tree / DOM / device)
*The must-ship WCAG breaches on the surface guests actually use. The mission-floor phase.*

| ID | rank | what it is | CRITICAL / finding | gate |
|---|---|---|---|---|
| **S9** | 2 | Mount the a11y engine on web (flat `aria-*` state, the `aria-live` announce-shim, `aria-hidden` decorative, per-Modal `aria-label`) + bundled native-correctness (header role, SignIn `accessibilityViewIsModal`, legend backdrop sibling) | **L6-01 CRITICAL** (+ L6-02/11/16/17/19/21) | shipped-DOM attribute dump; native VoiceOver = device |
| **S13** | 11 | Free the Tasks card actions from the accessible-parent trap (sibling row or `accessible={false}` + summary node) | **L6-04 HIGH** — "the #1 VoiceOver device-check in the audit" | web nested-button fix in-harness; **iOS VoiceOver = the device gate** |
| **S4** | 4 | Honest arrival — kill "N flags nearby", surface the denied-location banner (gated on raw `status==='denied'` only; first-run `undetermined` stays honest) | **L3-2 CRITICAL** (+ L7-03/L3-13/L3-8) | denied/undetermined guard test; native first-run *feel* = device |

*Why S9 + S13 + S4 together:* all three are the "the app lies to / locks out the disabled user on arrival" floor. S9 and S13 share the same RN flattening/a11y-tree model (coordinate the restructure); S4's honest-arrival copy rides the persistent pill live region that S9 makes reliable on web. S18's label-in-name leg (Phase 0) and S9's per-Modal labels are the same 4.1.2 family — verify together. **S4/S5/S18 are the copy-visible CRITICALs; S9/S13 are the structural ones — Phase 0 ships the strings, Phase 1 ships the engine.**

### Phase 2 — Material cohesion (GLASS §9 recipe — mockup → **arbiter** → staged build → report)
*The one arbiter-gated phase. Every surface here composites app-owned ink over live map tiles (or unifies the chrome that frames them), so each runs the full recipe and each color/ring choice is proven by `contrast-check.mjs` + `tools/audit-stacks.json` — never eye-tuned. Mock the whole material system as one board so the pins, tiles, zoom chrome, and header read as one product.*

| ID | rank | what it is | arbiter obligation |
|---|---|---|---|
| **S1** | 3 | Severity grammar everywhere (word beside number, Home enum→`STATUS_LABELS`, **anon-pin ring** replacing the gray swap, legend Status block) | **required** — anon-pin ring vs the 5 tile bases + red heat cell → exit 0 |
| **S2** | 6 | **CRITICAL** — adopt `severity[n].textOnColor` ink at the six un-forked digit sites | **required** — per-site disc/chip/radio over each fill → exit 0 (ships *before* S1) |
| **S6** | 5 | **CRITICAL** — app-styled opaque 44pt zoom buttons in the overlay bottom + repair the pointer-dead `topRow` | **required (reconciled)** — LIVE-BACKDROP: button edge vs tile extremes (1.4.11) + glyph vs fill (1.4.3) → exit 0 |
| **S7** | 7 | Theme the map tiles on `color.scheme`, restyle (never delete) the attribution; drop the Leaflet-zoom restyle S6 supersedes | **required (reconciled)** — light CARTO tile family as a base regime: white pin ring / fills / anon fill / cluster+heat boundaries → exit 0; adopt the ratified light+dark ring UNION if the white ring fails |
| **S14** | 14 | Ratified 1px `#0F1B2D` pin hairline (web = parity add; **native = custom teardrop marker rebuild**) | **required** — pin ring/fill boundary ≥3:1 on light tiles; native marker carries `tracksViewChanges={false}` + content-derived key |
| **S8** | 12 | One editorial header family across every tab (migrate Profile/FullMap/Settings onto `ScreenHeader`, `headerShown:false`, unify drawer trigger + Feedback; constrained L2-15 close-affordance convergence) | **no arbiter** (both header inks already pass) — but it belongs to the *cohesion mockup*; unblocks S18 item ③ (header collision) |
| **S18** ③ | 9 | Header title × Feedback-pill collision guard (hard dependency on S8, or a direct nav-header shrink) | rides S8's migration |

**One coordinated map-renderer pass (critical sequencing).** S1 (anon ring) + S2 (digit ink) + S6 (zoom chrome + `topRow`) + S7 (tiles + attribution) + S14 (pin hairline) + S17 (Home-peek instance, Phase 5) **all touch `PlatformMap.tsx` / `PlatformMap.web.tsx` / the MapScreen overlay.** The native pin is rebuilt as a custom teardrop **once** (S14) and the anon ring (S1) composes onto that same rebuild — no second native rewrite. S6 removes the Leaflet zoom control, so S7 drops its redundant `.leaflet-control-zoom` restyle. **Order inside Phase 2:** S2 (ink) → S1 (word + ring) → S14 (hairline, native rebuild) → S6/S7 (zoom chrome + tiles) → one arbiter run over the composed board → staged commits → one rollout report. S8 (chrome) can mock alongside but builds on its own files (`RootNavigator`, `ScreenHeader`, screen bodies).

*Phase-2 exit:* `contrast-check.mjs` exit 0 over the composed light+dark tile board (all pins/rings/boundaries); the four existing glass proof-sets stay exit-0 (no regression); render-states in both modes; **one** `<date>_DesignCompile_<feature>.md` if the Design Compiler runs (Const. Art. 2.4 — Dani's judgment, not a background cycle).

### Phase 3 — Trust instrumentation (no arbiter — routing / a11y-tree)
*Make the trust the app already built reachable at the point of decision. Depends on Phase 1's a11y model.*

| ID | rank | what it is | note |
|---|---|---|---|
| **S3** | 1 | The map pin becomes a doorway — wire the SR-complete `FlagDetailModal` to the callout + Nearby row; callout gains freshness date; SR-branch routes the list's dead-end verb to the focus-managed sheet | **read-side only**; the verifier-count + guest-flag-content halves FORK to Sky (§2 fork 5) |

*Why its own phase though it ranks #1:* S3 is a real MapScreen↔FlagDetailModal integration (MapScreen does not import it today), and it *reads best* once S9's a11y model is mounted (shared `screenReaderOn` signal) and once S1's severity grammar is on the callout it links from. Ranked #1, built after the a11y floor and the material board it decorates — the ranking sets its priority; the dependency sets its slot. S20's About "logged, visible to other users" claim cashes here.

### Phase 4 — Motion parity (no arbiter — RM guard test)
*Bring the last surface that escaped the app's reduce-motion discipline up to the native standard.*

| ID | rank | what it is | gate |
|---|---|---|---|
| **S12** | 15 | Web map camera RM parity — pass Leaflet `{ animate:false }` under RM (kill the falsy-zero `duration:0` trap), thread `reducedMotion` into `ClusteredMarkers`, `zoomAnimation/fadeAnimation:false` + popup `autoPan:false`; fix the two seeding doc-comments | **guard test required** (this is *how the trap shipped*): mock `useReducedMotion`, assert `flyTo` called with `animate:false`; on-device *feel* = device |

*Standalone phase* because it is a self-contained correctness fix (a confirmed WCAG 2.3.3 failure) with its own guard test; it coordinates with S17 (both touch `PlatformMap.web.tsx` config) but does not depend on it.

### Phase 5 — Felt-performance & resilience (no arbiter — guard test / render-state / device)
*The danger-path honesty and device-integrity hygiene: stop "stalled" reading as "empty", confirm the submit, harden the worst targets, contain the Home peek.*

| ID | rank | what it is | gate |
|---|---|---|---|
| **S11** | 10 | Data-layer timeout + "still trying" escalation — **read half may hard-abort; write half escalates via overlay (never aborts a possibly-committed insert)**; friendly `errors.ts` copy; "Loading" vs "Updating" split | two guard tests: read races timeout; write-after-threshold does **not** double-insert; poor-signal ceiling = device |
| **S10** | 13 | Visible + **persistent-mounted** live success banner on the CONTRIBUTE finish line — lifted **above the session branch** so the guest path renders it; optional camera-center RM-gated | DOM: `aria-live` wrapper mounted-empty then text-mutates, in the guest branch; VoiceOver timing = device |
| **S16** | 17 | Fix the two worst map touch targets — 44pt "Clear" (+`hitSlop`) and a visible action-bar overflow affordance so Recenter stops vanishing | 44pt via inspector; DT 1.3×/2.0× + ~320pt affordance; Split View / true-320pt = device |
| **S17** | 18 | Contain the Home map peek — `pointerEvents="none"` over the tile region so only the parent button fires; peek-instance `zoomControl={false}` + suppress attribution (full map untouched) | web wheel/scroll + tap manual; native tap-swallow resolution = device |

*Why grouped:* S11 + S10 are the temporal-honesty + finish-line pair and **share the persistent-mounted `aria-live` mechanism** (establish it once — the always-mounted node the severity echo line proves, NOT the conditionally-unmounting FlashBanner). S16 + S17 are device-integrity hygiene on the same MapScreen/Home surfaces. S17 inherits S7's light tiles + suppressed attribution and coordinates with S12 on `PlatformMap.web.tsx` config.

**Phase dependency spine (one line):** `0 (copy/parity)  →  1 (a11y floor)  →  2 (material board, arbiter)  →  3 (trust routing, needs 1+2)  →  4 (motion) ∥ 5 (resilience)`. Phases 4 and 5 are parallelizable after 1; Phase 3 needs both 1 and 2. The 6 CRITICALs are spread 0 (S5, S18) / 1 (S4, S9) / 2 (S2, S6) — front-loaded, exactly as the ranking floats them.

---

## 2. SKY-DECISION TASTE / SCOPE FORKS

Each is a crisp **either/or** only Sky can settle — the UI proposals scope only their own half and *cannot* resolve these. Sources: `sky-notes.md` (7 fenced decisions) + parked ②③⑤ (`dispositions.md`). Framed, never prescribed.

**Fork 1 — Proximity architecture** *(behind S4 · L3-2 CRITICAL, L7-03)*
Every flag fetch is a global most-recent page with no `lat/lng` predicate and no `onRegionChange` re-scope (`flags.ts:606-615/:652-671`).
- **(A) Build the geo query** — add bounded / `ST_DWithin`-style spatial queries **+** a region-change re-fetch, and keep the word "nearby." *Cost:* a data-layer feature (migration + fetch rework, Sky-applied); *win:* the FIND promise becomes literally true.
- **(B) Stop claiming "nearby"** — ship S4's UI-only honesty ("N reports loaded" / "Showing most recent") and defer the spatial query. *Cost:* the map stays global-recent, not proximity-true; *win:* zero backend risk now, honest immediately.
- *Stakes:* at 5 flags invisible; **at real scale, pin-absence reads as barrier-absence — the mission's dangerous failure mode.** S4 ships (B)'s UI half regardless; (A) is the larger data call.

**Fork 2 — Points-economy honesty** *(behind bench B1 · L3-4 HIGH)*
The actor-bonus trigger `auth.uid() <> NEW.user_id` is SQL-NULL (not TRUE) for anon flags, so triaging an anon report awards 0 while the UI flashes "+3/+7" (`schema.sql:163-165`, `TasksScreen.tsx:760`).
- **(A) Fix the trigger** — one-line `IS DISTINCT FROM` **DB migration, Sky-applied, never auto-run**; the flash becomes true. *Also fold in:* correct the CLAUDE.md "Database" section, which still teaches the OLD 5/2/10/5 values while the live trigger + UI use 10/3/15/7 (`schema.sql:112` carries an unresolved "DECISION PENDING (Sky)") — the doc drift is a latent regression of the honesty chain even though the shipped UI is currently truthful.
- **(B) Suppress the UI** — promote B1's clean **S** flash-suppression (hide the actor-flash when `item.user_id === null`); leave the trigger. *Cost:* actors genuinely earn 0 on anon triage (arguably correct); *win:* no migration.
- *Either way, resolve the CLAUDE.md doc drift* so a future edit can't regress the honesty chain.

**Fork 3 — Auth-wall & guest contract** *(behind S5 · L3-1 CRITICAL; S15/S19; L8-4/L1-2)*
The product ships three silently-different guest cliffs (no FAB, no photo, no saved places, no quick-fill) **and** docs that contradict the gates (guests told to use auth-only affordances; guests shown Verify/Resolve/Reject buttons the RLS deterministically refuses, with a fabricated "changed by someone else" error).
- **(A) Web build openly requests location + exposes a real sign-in path** — commit to web-as-first-class-guest-mode; document the contract; hide the RLS-refused triage buttons from guests. *Win:* the guest story becomes coherent and honest.
- **(B) Keep web deliberately minimal** — no location request at onboarding, no sign-in surface; scope the guest to view+report only. *Win:* smaller surface, fewer honesty debts.
- *S5's location-kick, S15's corrected copy, and S19's "Not now" all follow from this decision; they cannot precede it.* The question is a **product** one, not a UI fix.

**Fork 4 — K-anonymity / cache-scope ratification** *(behind bench B9 · L7-02; Jordan Condition 2)*
The heatmap `k>=3` protection + the user-scoped offline cache are sound and were not undermined.
- **(A) Ratify guests-get-no-offline-resilience as a conscious privacy choice** — document it; keep the cache auth-scoped. *Win:* the privacy posture is deliberate, not accidental.
- **(B) Extend a scoped/anonymized offline cache to guests** — a privacy-vs-utility trade. *Cost:* new privacy surface to reason about.
- *Independently:* the "Show saved data" banner never states data AGE (B9's UI half) and the k-anonymity caveat copy is terse — both are copy/UI, shippable under either branch.

**Fork 5 — Trust-model scope** *(behind S3 · L8-2, L8-3 HIGH)*
"Verified" is never defined at a decision point, never shows a verifier count, and the built ledger (`flag_verifications`, `flag_status_history`, `StatusHistoryModal`) is unreachable from the map. Untrusted content ("BUMBAKLOT · verified · sev 5") wears full institutional confidence with no in-place counter-affordance.
- **(A) Expose the ledger fully** — S3 surfaces the receipt **and** a verifier COUNT rides the callout, **and** guests can flag-content-as-wrong. *Win:* maximal provenance + moderation reach; *cost:* a guest-write surface + count semantics to design.
- **(B) Expose the receipt only** — S3 surfaces the status *history* (already shipped) with **no raw count** and **no guest counter-affordance**. *Win:* the ledger becomes reachable with zero new write surface.
- *S3 scopes only the read side (B by default); the count and the guest-flag-content write side are this fork.*

**Fork 6 — Product-name collision** *(behind L8-18, text-inferred)*
"AccessMap" collides with the established UW Taskar Center product (**accessmap.io**) in the same sidewalk-accessibility niche.
- **(A) Rename / differentiate** the product for distinctiveness + discoverability.
- **(B) Keep the name** and accept the collision.
- *A naming/brand-strategy call outside this audit's scope; flagged because it affects distinctiveness. Not in bench B3 (that is the Wayfinder mark asset-swap only).*

**Fork 7 — `stagePoolB` pool keep/kill** *(parked ② · `theme.ts:202`, GLASS §2 Stage)*
The lower-right light pool `rgba(15,83,190,0.06)` is sub-perceptual at 390 (the card stack covers most of its footprint; 0.06 alpha reads as at most a faint cool deepening); dark correctly has none.
- **(A) Keep it** — serves restraint, costs nothing legible.
- **(B) Kill it** — imperceptible at phone widths either way.
- *A judgment offered, not a finding — the call is Sky's; not a slate entry.*

**Fork 8 — Dark saved-place-chips** *(parked ③ · chips over live tiles, GLASS §8+§12)*
The chip row is auth-gated (guests never see it; no live capture exists). The SHIPPED always-light chips are AA-by-construction (arbiter exit 0).
- **(A) Keep the ratified always-light chips** pinned over tiles.
- **(B) Build the deferred dark-over-dark-tiles variant** — unbuilt; its "over LIGHT Apple tiles" read is device-only.
- *No audit evidence forces the decision either way.* NEEDS-SKY-DEVICE for the light-tile visual (see §3).

**Fork 9 — `ui/Button` adopt-or-remove** *(parked ⑤ · zero call sites, GLASS §11)*
Grep at HEAD: **zero `<Button` call sites** app-wide — only the barrel re-export (`src/components/ui/index.ts:9-10`).
- **(A) Adopt it** per the lab's recommendation — migrate the ad-hoc CTAs onto the primitive.
- **(B) Delete it** — remove the dead component + barrel export.
- *Not a defect — a standing housekeeping decision. A one-line Sky call, carried forward so it is not lost; no finding drives a UI change.*

---

## 3. CONSOLIDATED NEEDS-SKY-DEVICE LIST

**One deduped list.** Every proposal's device flag + parked ④ + parked ⑥ + the standing device truths, folded into the single set that can only be settled on **Sky's iPhone**. The audit is READ-ONLY and never built; **the build remains Sky's, as does every merge** (sky-note 7). All of the below converge on the same gate: **the ONE EAS TestFlight build.**

### The gate
- **D0 — The ONE EAS TestFlight build** *(sky-note 7 — context, not a request).* Every glass wave + this audit converge here. The command is Sky's to run: `cd ~/AccessMap && npx eas-cli build --platform ios --profile testflight --non-interactive`. **Sky's build, Sky's merge — never auto-run.** Everything below is what that one build lets Sky settle.

### Native VoiceOver / a11y-tree (the load-bearing checks)
- **D1 — L6-04 Tasks-card-action flattening (S13)** — *the single most important VoiceOver device-check in the audit.* Are Verify / Resolve / Reject / Details independently focusable from a Tasks card, or does the `accessible` parent collapse them to one leaf? Confirms the trust engine is not sighted-only. (Parked ④.)
- **D2 — L6-19 SignInScreen `accessibilityViewIsModal` (S9)** — does the lone SignIn modal root now contain VoiceOver focus? (Code fix lands in S9; the native containment is device-confirmed.)
- **D3 — Native VoiceOver truth broadly (S9)** — the ~30 state sites, the announce dual-wiring, the legend backdrop sibling (L6-21), and every RN-web-artifact caveat R2 raised — confirm the native leg is unregressed (unchanged by construction, but device-verified). (Parked ④.)

### EXIF / privacy on device
- **D4 — EXIF-strip GPS removal (parked ④)** — the audit CODE-CONFIRMS the strip-by-re-encode exists (`manipulateAsync(uri, [], {compress:0.9})`, `flags.ts:108-111`, empty actions → EXIF dropped) but **cannot verify on-device GPS removal** (auth-only photo path, inside the never-signed-in fence). Confirm a real photo's GPS is gone after upload. (B8's resize preserves this contract.)

### Reduce-motion / Dynamic Type / transparency (the felt truths the harness can't render)
- **D5 — L4 native reduce-motion traces (S12, and the native camera baseline)** — the *felt* result: an instant cut vs a swooping arc on the FIND payoff. Correctness is probe-proven; the **feel** is device. Confirm Reduce Motion genuinely lands instant on device.
- **D6 — Reduce Transparency posture** — the glass surfaces' C-lite fallback under iOS Reduce Transparency (standing glass-wave device truth).
- **D7 — Real Dynamic Type** — the native per-variant DT caps (~1.5–1.6): does the header collide at the capped size (S18 item ③)? do the on-glass ≥500-weight deferrals read as haze (D9)? Confirm the reflow at real device DT, not web-proxy 200%.

### iOS light Apple tiles (the map's device-only visual regime)
- **D8 — iOS light Apple-tile pin/ring visuals (S1 anon ring · S14 pin hairline · L6-07/L8-7)** — iOS uses Apple tiles that follow the OS; the arbiter gates contrast in-harness, but the **on-device Apple-light-tile visual** (do low-severity pins stay visible? does the anon ring read? does the `#0F1B2D` hairline hold?) is device-only. (Also the deferred dark-chips-over-light-Apple-tiles read, Fork 8 / parked ③.)

### On-glass material haze (device-only feel, not a contrast breach)
- **D9 — `bodyMedium` ≥500-weight-on-glass haze (parked ⑥)** — every ink already passes the arbiter; this is the GLASS §2 material-haze *feel*, not a floor breach. The disclosed Map deferral (`savedEmptyText` `MapScreen.tsx:1566` + `statusHint`×4) **and** the undisclosed Tasks `emptyBody` sibling (`TasksScreen.tsx:1221`) — does 400-weight text read as haze on the row-glass? B11 carries the mechanical ≥500 bump; the **feel** is device.

### True-blur & device-integrity feel
- **D10 — L2-6 true-blur feel (bench B6)** — do the high-contrast backdrop shapes ghost through About/Feedback body text over busy backdrops? Perception defect; every ink passes the arbiter. Any floor change MUST re-run `contrast-check.mjs` (never eye-tune).
- **D11 — Real-tile / runtime states (RT states) on device** — S6 iOS single-pointer zoom-out + pinch/VoiceOver map story; S16 Split View / true-320pt pane widths (does the action-bar overflow eat Recenter?); S17 react-native-maps tap-swallow (is the peek's tap-to-open a dead button on device?); S10 on-device VoiceOver announcement timing; S11 poor-signal minute-plus ceiling; S3 native focus traversal into `FlagDetailModal`; S4 native first-run deny→arrival feel; S13 the web-tree fix is in-harness but its native counterpart rides D1.

**One-line summary of the device list:** D1 (Tasks-card flattening) is the highest-stakes single check; D4 (EXIF GPS) is the privacy gate; D8 (iOS light tiles) is the map's visual regime; D5–D7/D9–D10 are the felt truths (motion, transparency, DT, haze, blur) the harness cannot render; D11 folds every per-proposal runtime-state device leg. **All of them wait on D0 — the one TestFlight build Sky owns.**

---

*Integration is read-only and advisory. Phases are build-units; the ranking (`slate-ranking.md`) sets priority; the forks are Sky's alone; the device list waits on Sky's one build. No code was edited, no build run, no database touched in producing this file.*
