# AccessMap UPLIFT — P2 "Material Cohesion" — Verification Evidence

**Branch:** `uplift/p2-material` (7 commits off P1 tip `267610c`). **STOPPED on the branch — NOT merged, NOT pushed, NOT built.** Sky merges; one EAS build carries everything; the device gate is hers.
**Model:** Opus 4.8 ultracode, max effort (authorized by the audit's model-provenance note; Fable exhausted).
**Green bar held at every commit:** typecheck **0 errors** · lint **0 errors / 77 warnings** (pre-existing baseline, 0 new) · jest **1765 passed** (1758 baseline + 7 new pinKey guards) / 84 todo / **1** known `TasksScreenFlagCard` `/ago$/` date-flake (untouched, matches pristine main).

## Commits (S2 → S1 → S14 → S6 → S7, then S8/S18③, then the guard)
```
98e7ddd test(S14): guard the content-derived teardrop marker key (PROTECT-15)
785554c S8 + S18③: one editorial header family across every tab
cf821fd S7: claim the flagship map — scheme-branched light tiles + hairline attribution
e8043a3 S6: honest zoom — app-styled 44pt zoom buttons + topRow pointer repair (CRITICAL)
c885780 S14: ratified hairline boundary + native custom teardrop rebuild
2b5703d S1: wear the severity grammar everywhere + define "verified" (Signature)
2707f82 S2: severity-keyed textOnColor ink at the seven un-forked digit sites (CRITICAL)
```

---

## The arbiter gate (the one arbiter-gated phase)

**Decision — arbiter file (Sky asked "what do you recommend?"):** I created a dedicated **`tools/p2-material-stacks.json`** (post-P2 shipped truth for the surfaces P2 changed/added) rather than editing `audit-stacks.json` in place. **This deviates from the plan's "update in place" recommendation** — and here's why: executing revealed `audit-stacks.json` also carries **non-P2 findings** P2 does not touch (the RecentlyViewedRow dot-vs-chip fill boundary; the heat-legend swatch over hot cells) that legitimately still fail. Editing it to "exit 0 in place" would have meant *deleting real findings* — laundering. The sibling file proves the P2 board exit-0 cleanly; `audit-stacks.json` stays the immutable `82e738b` findings record (a `audit-stacks.pre-p2.json` snapshot is alongside it). **Flag for Sky:** if you'd rather have one file track live shipped truth, say so and I'll fold the passing P2 rows into `audit-stacks.json` and relocate the non-P2 findings to a labeled `open-findings` block.

**P2 material board — `node contrast-check.mjs tools/p2-material-stacks.json` → exit 0, ALL PASS:**

| pair | ratio | min | before |
|---|---|---|---|
| S2 digit ink `#0F1B2D` on sev1 `#F7C948` | **11.03** | 4.5 | white 1.57 FAIL |
| S2 digit ink `#0F1B2D` on sev2 `#F0A030` | **8.05** | 4.5 | white 2.15 FAIL |
| S2 digit ink `#0F1B2D` on sev3 `#F2792B` | **6.21** | 4.5 | white 2.78 FAIL |
| S2 digit ink `#0F1B2D` on sev4 `#E85638` | **4.79** | 4.5 | white 3.61 FAIL |
| S2 digit white on sev5 `#D92D20` (unchanged) | **4.83** | 4.5 | 4.83 PASS |
| S14 pin white 2.5px ring vs dark regime (union dark-tile arm) | **3.12** | 3.0 | (naive ring 1.00 on #FFF FAIL) |
| S14 pin `#0F1B2D` hairline vs light regime (union light-tile arm; covers S7 light tiles) | **5.83** | 3.0 | — (gap) |
| S1 anon outer `#0F1B2D` ring vs light regime (double-ring outer) | **5.83** | 3.0 | (gray fill 2.54 FAIL) |
| S1 anon white gap ring vs dark regime (double-ring dark arm) | **3.12** | 3.0 | — |
| S6 zoom glyph white on ctaFill `#1466E0` | **5.24** | 4.5 | — |
| S6 zoom button edge `#1466E0` vs tile extremes `#000`/`#FFF` | **4.01** | 3.0 | — |

**Union mechanic** (mirrors the shipped cluster/heat-badge unions): the white ring covers dark backdrops, the `#0F1B2D` hairline covers light backdrops — neither spans the range alone. The **expected** S7 white-ring-over-light-tile fail is resolved *by construction* because S14's `#0F1B2D` hairline landed first (the union's light-tile arm). The `lightRegime` base includes `#FFFFFF`, which conservatively covers S7's new Positron light tiles.

**Four shipped proof-sets re-run — no regression, exit 0 (260 pairs):** `shipped-stacks.json` (100) · `wave1-stacks.json` (56) · `wave2-stacks.json` (34) · `map-stacks.json` (70).

---

## Per-proposal — what changed · verification

### S2 — textOnColor ink at the seven digit sites · CRITICAL · **web-verified + arbiter**
Per-site inline severity-keyed override (`severity[n].textOnColor`, `theme.ts:543-547`) + the paired white Check glyph in ReportFlagModal. Sites: `NearbyFlagsModal:148`, `LegendModal:78`, `ReportFlagModal:659`+Check`:645`, `ActivityFeedModal:162`, `RecentlyViewedRow:145`, `FlagDetailModal:839`(view)+`:1076`(edit). No new token, no geometry. **Web-verified:** the Nearby list discs render the digit in dark ink on sev1-4 fills and white on sev5 — legible on every disc. **Arbiter:** the four failing digit pairs flip FAIL→PASS on the same declared surface.

### S1 — wear the severity grammar + define "verified" · Signature · **web-verified (light+dark) + arbiter**
Callout (native+web) + Nearby visible meta gain `"Severity N of 5 · {word} · {Status}"`; Home Recent rows gain the number + route status through `STATUS_LABELS`; the web anon pin keeps its severity fill + a **double concentric ring** (Sky's pick) instead of the gray swap; the Legend gains a **Status block** (defines Open/Verified/Resolved, reusing `HelpModal.tsx:41`'s FAQ sentence) + anon-double-ring + resolved-checkmark entries. **Web-verified:** Home rows read "Severity 5 · Severe · Open"; Nearby rows read "Severity 5 of 5 · Severe · Open · 3h ago" / "Verified" (Title-cased) — light **and** dark. The Nearby SR label/endpoints stayed untouched (PROTECT-1). **Arbiter:** anon double-ring proven over the tile bases + red heat cell. **FORK 5 (Sky):** the verifier count + callout date ride S3 — NOT built here.

### S14 — ratified hairline + native custom teardrop rebuild · **arbiter + NEEDS-SKY-DEVICE (D8)**
Web: one-line `box-shadow:0 0 0 1px #0F1B2D` on every teardrop. Native: the bare `pinColor` marker rebuilt ONCE as a custom child-View teardrop (fill + white ring + `#0F1B2D` outer hairline + counter-rotated category/check glyph), mirroring the in-house cluster union; carries `tracksViewChanges={false}` + a content-derived key (PROTECT-15) + mode-independent literals (PROTECT-16). Focus dimming rides the native Marker `opacity` prop (no re-snapshot). **Guard:** `src/lib/pinKey.ts` + 7 tests (stable for identical content; unchanged when only `created_at` changes; changes on severity/anon/resolved/category/id). **Arbiter:** the pin ring union passes on both tile regimes. **NEEDS-SKY-DEVICE (D8):** the native Apple-light-tile teardrop visual (expo-web renders CARTO, not Apple tiles).

### S6 — honest zoom · CRITICAL · **web-verified + arbiter**
Additive `zoomBy(delta)` on **both** `PlatformMapHandle` decls+impls (native `getCamera`→`animateCamera`; web Leaflet `setZoom`), RM-gated; web `MapContainer zoomControl={false}`; two stacked **48pt** +/− buttons (opaque `ctaFill` + white glyph) at the top of the overlay bottom FAB column, in a box-none group; **topRow REPAIR** `pointerEvents="box-none"`. **Web-verified:** the + button (48×48) zooms the map in (probed tile went to z13→deeper); both buttons + menu + Feedback capture their own centres; the map surface is reachable at centre AND in the header gaps (box-none holds — no gesture theft). Handle symmetry is guaranteed by typecheck (shared interface). **NEEDS-SKY-DEVICE:** iOS single-pointer zoom-out + pinch/VoiceOver.

### S7 — claim the flagship map · **web-verified (light+dark) + arbiter**
Tile URL branched on `color.scheme` — Positron `light_all` in light, `dark_all` in dark — threaded into `CachedTileLayerWrapper` + its effect deps (live theme flip); attribution condensed to a hairline strip (kept — legally required). **Web-verified:** light mode now renders a **light** basemap (tile network request confirmed `…/light_all/13/…`); the near-black void is gone; dark mode keeps `dark_all` unchanged; the attribution is subtle. **NEEDS-SKY-DEVICE (D8):** the iOS Apple-light-tile visual.

### S8 + S18③ — one editorial header family · **web-verified + code-inferred**
New `HeaderActions` helper (the one menu + Feedback-icon treatment); `headerShown:false` on Profile/Settings/FullMap; Profile's editorial header gains the actions (kills the "Profile over PROFILE" double title); Settings gains an editorial `ScreenHeader`; **FullMap → treatment (ii), Sky's pick:** a compact `MAP / Explore` editorial chip + action circles inside the box-none overlay (content-hugging, never a full-width strip). No arbiter (both header inks pass; the map chip reuses the proven always-light overlay ink). **Web-verified:** the editorial title + unified circles render on the map (light+dark); Profile no longer shows the dark nav header; the box-none map stays pannable in the gaps. **S18③:** with the public surfaces headerless, the 200%-zoom `{title}Feedback` collision is structurally impossible. **PROTECT-1/3** modal close pills untouched (L2-15 close-convergence deliberately out of scope). **Code-inferred / NEEDS-SKY-DEVICE:** the signed-in Profile one-title state (web is guest-mode) and native VoiceOver header traversal. **Admin** (gated, non-public) keeps the nav header — flagged follow-up.

---

## Fence — clean
`git diff --name-only 267610c..HEAD` = the 7 digit-site files + `PlatformMap.tsx`/`.web.tsx` + `MapScreen.tsx` + `HomeScreen.tsx` + `LegendModal.tsx` + the S8 set (`RootNavigator.tsx`, `ProfileScreen.tsx`, `SettingsScreen.tsx`, new `HeaderActions.tsx`) + new `src/lib/pinKey.ts` + `pinKey.test.ts`. **Zero diff** in `GlassSurface.tsx`, the tab bar, the a11y hook suite, `supabase/**`, `database.ts`, `flags.ts` data paths, or any schema/RLS/query. No external sends. `tools/p2-material-stacks.json` + this evidence file are untracked audit artifacts (logged here; git does not witness them).

## Sky-eye render candidates (build-to-spec defaults shipped; your eye validates)
- **Anon double-ring** exact weight/gap · **zoom-button slot** in the bottom zone · **S7 light basemap family** (Positron `light_all` shipped vs the warmer Voyager) · whether to keep any anon opacity dim (removed — the ring now carries provenance) · **FullMap header:** treatment (ii) shipped; treatment (i) (keep a slim nav header, converge its chrome) is the calmer fallback · **FullMap title copy** ("Explore") · `HeaderActions` fill on Profile/Settings.

## NEEDS-SKY-DEVICE (fold into the ONE EAS TestFlight build, D0)
- **D8:** native Apple-light-tile pin visibility (S14/S7) — arbiter-proven ratio, unverified by eye until device.
- Native VoiceOver traversal of the new grammar + headers; iOS single-pointer zoom-out + pinch (S6); signed-in Profile one-title state; true 200%-zoom reflow of the map chip.

**All seven proposals (S2/S1/S14/S6/S7/S8/S18③) CLOSED.** FORK 5's count/date leg deferred to S3. **STOP on `uplift/p2-material`.**
