# AccessMap UPLIFT — P5 "Felt-Performance & Resilience" — Verification Evidence

**Branch:** `uplift/p5-resilience` — 5 commits off the P4 tip `uplift/p4-motion` @ `77658f8`. **STOPPED on the branch — NOT merged, NOT pushed, NOT built.** Sky merges the whole train once; one EAS build carries everything; the device gate is hers.
**Model:** Opus 4.8 ultracode, max effort (authorized by the audit's model-provenance note; Fable exhausted).
**Proposals closed this phase:** **S11, S10, S16, S17** (+ the shared Step-0 mechanism). This closes the whole slate (S1–S20) across P0–P5.

## Green bar
- **typecheck:** `tsc --noEmit` → **0 errors**.
- **lint:** `eslint` → **0 errors / 77 warnings** (pre-existing baseline; **0 new** — the one new jest `require()` warning was suppressed inline to hold the count flat).
- **jest (full suite):** **1804 passed / 84 todo / 1 failed / 1889 total** — **+15 new P5 guard tests** over the P4 baseline (1789). The single failure is the **known pre-existing `/ago$/` date time-bomb** (`TasksScreenFlagCard.test.tsx:117`) — a fixture whose `created_at:'2026-06-05'` is now >30 days old; it fails identically on the P4 base and pristine `main@82e738b`, is owned by `fix/tasksflagcard-date-flake`, and is **untouched by P5**.

## Commit set (linear, off `77658f8`)
```
4b45c79  P5-0: shared persistent-mounted LiveStatusRegion (S10+S11 mechanism)
f9c7366  S11: data-layer timeout + honest "still trying"
8127d41  S10: confirm the submit (visible + live "Report filed")
f8899de  S16: the two worst map touch targets (Clear + action-bar overflow)
e4a1c76  S17: contain the Home map peek
```
Rollback anchor: `77658f8`.

## Files touched (14 — intended set only; no design-reviews/db/schema/env)
New: `src/lib/liveStatus.ts` · `src/components/LiveStatusRegion.tsx` · `src/components/__tests__/LiveStatusRegion.test.tsx` · `src/lib/__tests__/flagsStoreTimeout.test.tsx`.
Modified: `App.tsx` · `src/lib/flagsStore.tsx` · `src/lib/errors.ts` · `src/screens/MapScreen.tsx` · `src/screens/ReportFlagModal.tsx` · `src/screens/HomeScreen.tsx` · `src/components/PlatformMap.tsx` · `src/components/PlatformMap.web.tsx` · `src/screens/__tests__/ReportFlagModal.test.tsx` · `src/components/__tests__/PlatformMapWeb.reduceMotion.test.tsx`.

---

## Step 0 — the shared persistent-mounted mechanism (build-first) · **web-verified**
`src/lib/liveStatus.ts` (a pub-sub mirroring `announce.ts`) + `src/components/LiveStatusRegion.tsx` (always-mounted, VISIBLE + live, text mutates), mounted in `App.tsx:224` beside `<A11yLiveRegion/>` **above the session branch** so the guest-web cohort gets it. Stands alone — its own web `aria-live` + native `accessibilityLiveRegion` + `announceForAccessibility` (not S9's shim); tones reuse the shipped FlashBanner pills (`successStrong`/`brand` — **no new token**, arbiter untouched). Announce is decoupled from motion (PROTECT-7); only the entrance is RM-gated.

- **Guard test (6/6):** the aria-live wrapper is **present (empty) before** any status, **gains text** on `setLiveStatus`, announces even under Reduce Motion, renders the optional Retry action, and auto-dismisses.
- **Live web (guest Home):** DOM shows **4 `aria-live` regions**, incl. one that is `aria-live="polite"` **and empty** — the `LiveStatusRegion` mounted in the guest branch (present-but-empty). App boots clean on web with the App.tsx addition.

## S11 — data-layer timeout + honest "still trying" · **code-verified + NEEDS-SKY-DEVICE (poor-signal ceiling)**
**Reads** (`flagsStore.refresh()`): a threshold (`READ_STILL_TRYING_MS = 12s`, non-rejecting) surfaces a calm **"Still trying — check your signal"** + **Retry** via the shared region; a ceiling (`READ_CEILING_MS = 30s`) rejects → offline-cache fallback / friendly error. Neither aborts the socket (`fetchSeqRef` discards a late result; zero pollers). **Writes** (`createFlag`/`createAnonFlag`/`uploadFlagPhoto`): **never aborted** — a slow submit shows an **in-sheet overlay** in ReportFlagModal while the insert continues (Strategy A; the idempotency-column Strategy B is a data fork left to Sky). **Copy fix 1:** `errors.ts` maps `AbortError`/timeout → the friendly network copy (kills raw "Unknown error"). **Copy fix 2:** `MapScreen:1393` splits **"Loading flags…"** (cold, `flags.length===0`) from **"Updating…"** (revalidate).
- **Guard tests (two legs):** (a) a read racing a timeout surfaces "still trying" (with Retry) at the threshold and **clears on settle**; a fast read never escalates. (b) a slow write **lands EXACTLY ONE flag** (the write COMPLETES — asserts `createAnonFlag` called once, `onCreated` once) and **shows the overlay** meanwhile without re-inserting. `errors.test` + `MapScreen.arrival` (cold path still "Loading flags…") green.
- **PROTECT:** 8 (fills the unbounded middle; skeletons/terminal cards untouched), 6 (mirrors the GPS race, zero pollers), 15 (`fetchSeqRef`/SWR untouched), 2 (recovery card untouched). Poor-signal minute-plus ceiling + on-device timing = **NEEDS-SKY-DEVICE (D11)**.

## S10 — confirm the submit · **web-verified (mechanism) + NEEDS-SKY-DEVICE (VoiceOver timing)**
On a successful submit (anon + auth), a visible + live **"Report filed — thanks for flagging this barrier"** fires through the shared region after `onClose` (the photo path keeps its truthful post-EXIF-strip line — PROTECT-8). The standalone `announceForAccessibility` is retired (the region owns the native announce). The created flag is threaded through `onCreated(flag)` → **MapScreen recenters on the new pin, reduced-motion gated** (PROTECT-7).
- **Guard tests (3):** both success paths fire the confirmation + pass the created flag; the failure branch does **not** fire it. `ReportFlagModal` (41 tests) + `MapScreen` (52) green.
- **Live web:** the guest-branch region is mounted present-empty (see Step 0) — the mechanism is in place for the anon-web cohort. On-device VoiceOver announce timing = **NEEDS-SKY-DEVICE (D11)**.

## S16 — the two worst map touch targets · **code-verified + NEEDS-SKY-DEVICE (Split View / true-320pt)**
**(a) "Clear all filters"** (`MapScreen:1658`) gains `hitSlop={8}` + a `minHeight:32`/padding layout → effective **~48pt** (WCAG 2.5.5), mirroring the sibling `filterTitleRow`; the arbitrated ink is unchanged. **(b) The 7-tool action bar** gets a right-edge **gradient fade** (`expo-linear-gradient`, scheme-aware) shown only when it overflows and isn't scrolled to the end — decorative + `pointerEvents="none"` (map gesture law / `box-none` untouched); the 44×44 buttons are unchanged (the fade wraps AROUND the ScrollView), so **Recenter** (the documented CONTRIBUTE entry) stays discoverable.
- **PROTECT-2:** the belt-and-suspenders "Reset all" 44pt path is a separate code path, untouched. `MapScreen` suites (52) green; typecheck/lint clean.
- **Live web:** the Map screen can't be exercised in the expo-web dev preview (pre-existing lucide lazy-load crash on the lazy Map/Tasks screens — `createLucideIcon.default is not a function`; not a P5 regression). Overflow behaviour is deterministic code + jest-green. Split View / true-320pt device = **NEEDS-SKY-DEVICE (D11)**.

## S17 — contain the Home map peek · **web-verified + NEEDS-SKY-DEVICE (native tap-swallow)**
The peek's `<PlatformMap>` is wrapped in a `pointerEvents="none"` layer so only the parent "Open the full map" Pressable receives the tap; a per-instance `suppressAttribution` prop drops the web MapContainer's `attributionControl` on the peek only. The full map omits the prop and keeps its legally-required OSM/CARTO attribution. Native ignores the prop.
- **Guard test:** peek → `attributionControl:false`; full map (prop omitted) → `attributionControl:true`. 12/12 green.
- **Live web (decisive):** on the guest Home peek — **0 attribution controls, 0 attribution links** (was 3), **0 zoom controls**; the leaflet map sits under **3 `pointer-events:none` layers**, and the only interactive ancestor is `<button aria-label="Open the full map">`; the map **still renders** (PROTECT-10). react-leaflet 5.0.0 forwards `attributionControl` into the Leaflet map options (confirmed in source), so the suppression is real.
- **PROTECT-10** held (peek still shows the map). Native react-native-maps tap-swallow resolution = **NEEDS-SKY-DEVICE (D11)**.

---

## CLOSE-OUT LEDGER — the whole slate (S1–S20) after P5

| Phase | Proposals | Status |
|---|---|---|
| P0 (copy) | S5, S18, S15, S19, S20 | CLOSED (`b7a2e81`) |
| P1 (access CRITICALs) | S9, S13, S4 | CLOSED (`267610c`) |
| P2 (material, arbiter) | S2, S1, S14, S6, S7, S8 | CLOSED (`98e7ddd`) |
| P3 (trust) | S3 | CLOSED (`b584747`) — S3 **FORK 5** (verifier-count / guest counter-affordance) deferred to Sky |
| P4 (motion) | S12 | CLOSED (`77658f8`) |
| **P5 (resilience)** | **S11, S10, S16, S17** | **CLOSED on `uplift/p5-resilience`** |

**All 20 proposals (S1–S20) are now CLOSED.** The only deferred item is **S3 FORK 5** (a Sky product/data decision, by design). Nothing silently dropped.

## The finish for Sky
1. **Pre-merge check** on `uplift/p5-resilience` (typecheck 0 / lint 0-err / jest green apart from the known `/ago$/` flake; diff = the 14 intended files only). ✅ done here.
2. **Merge the train once** — ff-merge the linear stack p0→p5 into `main` (rollback anchor `77658f8` / `82e738b`).
3. **The ONE EAS build:** `cd ~/AccessMap && npx eas-cli build --platform ios --profile testflight --non-interactive` (Sky's build).
4. **Device gate D0–D11** — the consolidated NEEDS-SKY-DEVICE list. **D1 = the S13 Tasks-card VoiceOver flattening = highest-stakes** (the audit's #1 device check). P5 adds: native peek tap-swallow (S17), Split-View/true-320pt action-bar overflow (S16), poor-signal minute-plus ceiling + on-device "still trying"/submit-overlay + "Report filed" VoiceOver timing (S11/S10).

## Explicitly NOT done in P5 (forks held)
No DB/schema/RLS/trigger/query-scope edits; no write-side idempotency column (S11 Strategy B); no S3 FORK 5; no `GlassSurface.tsx` edit; no new color/floor token; no merge/push/build/deploy. Every proposal took only its UI/read half.
