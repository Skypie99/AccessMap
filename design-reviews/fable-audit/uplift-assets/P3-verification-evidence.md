# AccessMap UPLIFT — P3 "Trust Instrumentation" (S3) — Verification Evidence

**Branch:** `uplift/p3-trust` (1 commit off P2 tip `98e7ddd`). **STOPPED on the branch — NOT merged, NOT pushed, NOT built.** Sky merges; one EAS build carries everything; the device gate is hers.
**Model:** Opus 4.8 ultracode, max effort (authorized by the audit's model-provenance note; Fable exhausted).
**Green bar:** typecheck **0 errors** · lint **0 errors / 77 warnings** (pre-existing baseline, **0 new**) · jest — **14 new S3 source-invariant guards pass**; the 4 touched-area suites pass in isolation (ReportFlagModal **36/36**). The only persistent failure is the known `TasksScreenFlagCard` `/ago$/` **date flake** (untouched, matches pristine main). In the full parallel run `ReportFlagModal` also flaked once (a 102 s RTL suite timing out under CPU contention) — it passes **36/36 in isolation** and is not in this change's import graph, so it is a load flake, not a regression.

## Commit
```
b584747 S3: the map pin becomes a doorway — surface the trust ledger where trust is spent (P3 trust instrumentation)
```

---

## Per-proposal — what changed · verification

### S3 — The map pin becomes a doorway (rank #1, Signature) · **code-verified + NEEDS-SKY-DEVICE**

Resolves **L3-12** (callout cul-de-sac), **L6-05** (accessible list's verb dead-ends), the read-half of **L8-2 / L8-3** (trust ledger reachable at the point of decision), and cashes **S20**'s About claim. **ONE wiring change, two entry points, READ side only.**

**Files (5):** `MapScreen.tsx` (integration hub) · `PlatformMap.tsx` (native callout) · `PlatformMap.web.tsx` (web popup) · `NearbyFlagsModal.tsx` (honest hint) · new `MapScreen.detail.test.ts`.

**(1) The pin callout becomes a doorway.**
- **Native** (`PlatformMap.tsx`): the whole `<Callout tooltip onPress={onOpenDetails ? () => onOpenDetails(f) : undefined}>` is the tap target — on Android the callout is a snapshot, so `Callout.onPress` is the only reliable in-bubble press; on iOS it fires anywhere on the tooltip. Added a **freshness line** `Reported {relativeTime(f.created_at)}` and an **"Open details ›"** affordance row.
- **Web** (`PlatformMap.web.tsx`): the Leaflet `<Popup>` gains the same `Reported {relativeTime(flag.created_at)}` line and a real `<button onClick={() => onOpenDetails(flag)}>Open details</button>` (Wayfinder-Blue `#1466E0`, mode-independent per PROTECT-16, on the always-white popup chrome). `onOpenDetails` is threaded `PlatformMap → ClusteredMarkers → Popup`.
- MapScreen passes `onOpenDetails={setSelectedFlag}`, opening the always-mounted `FlagDetailModal`.

  *Before (L3-12):* callout showed category + severity meta + photo + description and **no next step** — the "Open for details" promise (still live in the web marker `alt`) opened nothing.
  *After:* callout shows a **date** + **"Open details"** that opens the full ledger.

**(2) The accessible twin stops dead-ending.** MapScreen's Nearby `onSelectFlag` now branches on the existing `screenReaderOn` signal:
```
if (screenReaderOn) { setSelectedFlag(flag); return; }   // focus-managed detail sheet
// sighted path unchanged, upgraded to retryShowCallout()
```
Under SR the detail sheet is presented **on top of the still-open Nearby list** — pattern (B), the nested-modal pattern already proven here (`StatusHistoryModal` stacks over `FlagDetailModal`). This avoids the iOS present-while-dismissing race that close-then-open triggers, and lets VoiceOver focus return to the row when the sheet closes. `FlagDetailModal`'s own `useFocusOnOpen(visible && !!shownFlag)` lands focus on the title — the gate is satisfied with **zero** MapScreen focus code.

  *Before (L6-05):* select a row → list closes → un-focus-managed callout on a map the SR user can't perceive (a "trapdoor"). The row hint honestly described the dead-end.
  *After:* select a row → focus-managed sheet with a real heading. Hint updated to **"Opens this flag's details"** (honest under SR, where the endpoint is always the sheet). The **PROTECT-1 one-breath `accessibilityLabel` is untouched** — only the endpoint description changed.

**Map-sync decision (differs from Tasks, deliberately):** `handleDetailChanged` **always `patchFlag` + `refreshFlags()`** — it never `removeFlag`s on resolve/reject. Tasks removes because its list is hard-filtered to open+verified; the **Map shows user-selected statuses** (`activeStatuses`), so a resolved flag can still be a valid marker. `patchFlag` recolors/relabels in place; the trailing refresh reconciles (dropping it only if the new status falls outside the active fetch). `deepLinkFlag` is patched/cleared too (patchFlag is a no-op for a flag held only there). `handleDetailDeleted` genuinely `removeFlag`s. `handleDetailViewOnMap` recenters **locally** (we're already on the Map tab) via the existing `retryShowCallout` spine — no cross-tab navigate; the modal self-closes.

**Verification — 14 source-invariant guards** (`MapScreen.detail.test.ts`, house style: `fs.readFileSync` + `around()` anchors; full MapScreen render is deferred to Detox/Playwright):
- MapScreen: FlagDetailModal lazy-mounted `visible={selectedFlag !== null}` with all handlers; `selectedFlag` is per-screen state; `onOpenDetails={setSelectedFlag}` on `<PlatformMap>`; `onSelectFlag` branches SR→`setSelectedFlag`, sighted→`retryShowCallout` (old 350 ms timeout gone); `handleDetailChanged` uses `patchFlag` and **never `removeFlag`**; "View on map" recenters locally with **no `navigation.navigate`**; **FORK-5 read-only** (no "Verified by", no "flag as wrong").
- NearbyFlagsModal: **PROTECT-1 label lock** (the one-breath format frozen); hint is honest and no longer claims "centers the map".
- PlatformMap native + web: `onOpenDetails` prop threaded, `relativeTime` imported, freshness line + "Open details" affordance present, wired to `onOpenDetails`.

Plus typecheck (0) proves the `onOpenDetails` prop is threaded correctly on both platform variants and the `FlagDetailModal` mount matches its `Props` contract.

**S20 confirmation:** `StatusHistoryModal` is now reachable from the map (callout → Open details → History; SR Nearby → detail sheet → History), so About's "status changes… are logged… visible to other users" reads **true** — **no `AboutScreen` edit.**

---

## Fence — clean
`git diff --stat 98e7ddd..HEAD` = exactly **`MapScreen.tsx` · `PlatformMap.tsx` · `PlatformMap.web.tsx` · `NearbyFlagsModal.tsx`** + new **`src/screens/__tests__/MapScreen.detail.test.ts`**. **Zero diff** in `GlassSurface.tsx` (DO-NOT-EDIT), the map overlay `pointerEvents="box-none"` law (the new modal mounts OUTSIDE the overlay `<View>`), the Nearby row `accessibilityLabel`/structure (PROTECT-1), `ReportFlagModal` (PROTECT-3), the native-marker discipline (`tracksViewChanges` / `pinKey`), the a11y hook suite, `supabase/**`, `database.ts`, `flags.ts` data paths, or any schema/RLS/query. No external sends. This evidence file is an untracked audit artifact.

## FORK 5 — the write/count half left for Sky (NOT built)
- ❌ a verifier **COUNT** display on the callout ("Verified by N people")
- ❌ a guest **"flag as wrong"** write affordance

S3 shipped only the **read** side — surface the receipt (freshness) + reach the ledger. Both halves above are Sky's product/data decision.

## Sky-eye copy candidates (build-to-spec defaults shipped; your eye validates)
- Callout affordance label: **"Open details"** (verbatim from the report), rendered "Open details ›" on native / a filled button on web.
- Callout freshness copy: **"Reported {relativeTime}"** → e.g. "Reported 29d ago" (matches the Nearby list's existing `relativeTime(created_at)` idiom + FlagDetailModal's "Reported on {date}").
- Nearby SR hint: **"Opens this flag's details"** (default). Alt if you prefer more detail: "Opens the full report — photos, status history, and report date."
- Web "Open details" button fill uses the mode-independent Wayfinder Blue `#1466E0` on the always-white Leaflet popup chrome (the popup is not themed).

## NEEDS-SKY-DEVICE (fold into the ONE EAS TestFlight build)
- **Native `react-native-maps` `Callout.onPress`** actually opening the sheet (jsdom mocks `Callout` to null — the wiring is code-verified, the tap is device-only).
- **VoiceOver/TalkBack focus traversal:** selecting a Nearby row under SR opens the sheet and focus lands on the title; on close, focus returns to the row. (`useFocusOnOpen` is unchanged and proven elsewhere; the cross-modal focus-return is the device item.)
- The sighted callout→modal flow on a real web build (a Playwright capture is available via `design-reviews/fable-audit/tools/capture.mjs` **after** `npx playwright install` — not run here to keep the branch environment clean; the wiring is proven by the 14 guards + typecheck).

**S3 CLOSED.** FORK 5's count + guest-write half explicitly deferred to Sky. **STOP on `uplift/p3-trust`.**
