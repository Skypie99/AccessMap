# Device-Tune Phase 3 — Reclaim the Tasks Screen, Bring the Map Home

**Branch:** `devicetune/3-header-map-polish` · base `8cded0b` → tip `fa8c0d8`
**Date:** 2026-07-26 · **Status:** STOPPED on the branch. Nothing merged, pushed, or built.
**A-4 RESOLVED + BUILT** — Sky picked candidate **B with the `TASKS` eyebrow kept**.
**Still open for Sky:** **A-5** (empty-local placement + copy) · **the F-20 banner decision** (D3/C4 built, then reverted — it breaks an a11y contract).

---

## §0 Provenance

| | |
|---|---|
| Model the phase prompt preferred | Fable 5, max effort |
| Model that actually ran | **Opus 5** (this session's model; a session cannot re-point its own model) |
| Sub-agents | **None used.** All work in the main session. |
| Re-fire instruction | If the model matters to the record, re-fire from `8cded0b` in a Fable-5 window. Every artifact here is reproducible: the manifests, the measure tool and the board generator are all committed to the working tree. |

Phase 2 carried the same deviation, for the same reason.

---

## §1 What Sky saw

Two faults from her device pass that no web gate had caught:

- **D3 — "the Tasks header eats half the screen."**
- **D4 — "the map peek ignores my location."**

Both are real. Both are now diagnosed with measurements rather than adjectives, and D4 is photographed: `phase3/before/home-peek__light__390__peek-located.png` shows the header reading **NEARBY / "Sorted by distance" / CLOSEST** with genuine distances (297 m, 639 m) computed from her actual position — above a map sitting on **Van Ness Avenue, San Francisco**. The screen knew where she was. The map didn't.

---

## §2 Diagnosis

### D3 — measured, not estimated

The phase plan carried an arithmetic row table. I replaced it with measurement before writing any D3 code (`tools/measure-header.mjs`, 390×844, live static export). The verify-first gate **fired**, and what it caught matters:

| | plan | **measured** | Δ |
|---|---|---|---|
| chrome pane (device-adj) | 453 | **451** | −2 ✓ |
| first card top | 557 | **553** | −4 ✓ |
| card pitch | 179 | **139 (range 139–175)** | **−40 ✗** |

The pane arithmetic is **confirmed** — the row table is exactly ScreenHeader 98 · select-entry 52 · search 60 · mine/All 60 · category 62 · sort 64, plus 8pt pane padding and 47pt safe area.

But **card pitch is content-dependent, not a constant.** The live list measures `139, 139, 139, 159, 159, 159, 175, 159, 159`. The plan's 179 appears nowhere, and the three cards at the top — the ones that decide what Sky sees — are 139. Every "cards visible" number in the plan was therefore quoted at the wrong pitch and is superseded (§F **F-17**).

Re-derived baseline: **1.36 cards at rest** (plan said 1.03), 2.09 scrolled. The diagnosis is unchanged and still damning in points: **451pt of chrome on an 844pt screen is 53% of the display**, and the first card starts **65% down**.

**Two structural findings came out of measuring rather than reading:**

- **F-16 — every web frame of Tasks is signed-OUT.** The row is gated on `userId = user?.id` and the rig is read-only by law, so the 60pt mine/All row is *structurally absent* from every capture ever taken of this screen. It is added back analytically and tagged `code-inferred`, never merged silently. **The header on Sky's phone is one row taller than the header in every image on the gate board**, and the board says so at the top.
- The stale `CHROME_FALLBACK_HEIGHT` comment was wrong twice — header quoted at ~112 (measured 98) and the mine/All row omitted entirely. F-16 explains why nothing ever caught it.

### D4 — a one-word bug

`initialRegion` is exactly what it says: both map halves read it **once, at construction**. Native hands it to the MapView ([PlatformMap.tsx:288](../src/components/PlatformMap.tsx)); web maps it to react-leaflet's `center`/`zoom` on `MapContainer` ([PlatformMap.web.tsx:1017](../src/components/PlatformMap.web.tsx)). Neither honors a later prop change. The location probe resolves *after* mount — so a peek that mounted on the fallback stayed there forever.

The plumbing was never the problem: `LocationProbe` + `useUserLocation({requireExistingPermission})` were already correct and fence-safe. Only the camera was deaf.

---

## §3 Treatment

| commit | what |
|---|---|
| `8c48c60` | **D4/C1** — the peek camera honors a post-mount center |
| `2d47655` | **D4/C2** — honest probe states |
| `3639eb2` | **D4/C3** — the empty-local moment (copy PROVISIONAL) |
| `b259cca` | **D4/C4** — standing geo-privacy fence |
| `c2d7a0c` | **D3/C1** — select-multiple joins the search row (S-5, pre-decided) |
| `a623235` | **D3/C2** — the header stops restating itself (subtitle retires, `TASKS` eyebrow kept) |
| `fa8c0d8` | **D3/C3** — three filter rows move behind one control |
| *(reverted)* | **D3/C4** — banner slim. Built, then reverted: see F-20. |

**Mechanism choice (D4/C1):** keyed remount, not an imperative snap. `snapToRegion` exists on both halves but silently no-ops before the map is ready, and neither half exposes a ready signal — using it would have meant editing PROTECT-adjacent `PlatformMap` code to add one. A remount honors the region at construction: race-free, identical on both platforms, and free of state loss because the peek's interior is inert. It also restored a contract Home was quietly violating — `PlatformMap` is `memo()` and asks callers to memoize `initialRegion`; the old object literal was rebuilt every render.

**Deliberate deviations from the plan:**

1. **Candidate A was designed but not rendered.** Explicitly sanctioned by the plan when budget runs short ("ship the board with B+C; an unrendered candidate is never offered"). The board states this plainly and offers it as a build-on-request, not as a pick.
2. **Polish riders: none taken.** Bounded by budget, not by finding nothing. Two candidates are named in the parking lot below rather than half-built.
3. **Two new user-facing strings on Home** (`EMPTY_LOCAL_INVITE`, and the reused `Finding your location…`). Legal: S-1 fences Settings / Resources / How To Help / About only. The first is tagged **PROVISIONAL** pending A-5; the second is an existing shipped string reused byte-for-byte from MapScreen.
4. **D3/C4 was built and then reverted rather than shipped (F-20).** The plan carried the banner slim as candidate B's last commit, deliberately isolated as "most-likely-vetoed", and the rendered B on the gate board included it. Building it showed why it must not ship: dropping the `Nearest open barrier · ` prefix leaves the row reading `No ramp · Severity 3 · 639 m`, and the shipped style comment states the contract it breaks verbatim — *"Color is never the sole signal — the 'Nearest open barrier' text states it plainly."* The `accessibilityLabel` is untouched, so **screen-reader users keep the meaning and sighted users lose it**. That is the inverse of the usual failure and easy to miss, because the a11y tree still reads correctly. Sky owes a choice; three options in F-20.
5. **Sky amended the winning candidate.** She caught that rendered-B dropped both the `TASKS` eyebrow and the subtitle, and kept the eyebrow — it is the editorial voice the whole app speaks (Home carries `NEARBY` / `LATEST`), so dropping it on Tasks alone would have made one screen a different family member. Measured cost: 18pt, 243 → 257pt chrome.
6. **`measure-header.mjs` gained a `--mine-row` flag mid-phase** after I found the addend hard-coded at 60 while candidate C tightens it to 52 and candidate B removes the row from the header entirely. Without it, B's and C's device numbers would have been wrong.

---

## §4 Arbiter declaration

**No arbiter run — and none is owed.** The rule: an arbiter run is required for a change to ink, floor, edge, or a colour pair, or for a new composite. Phase 3 ships none of those. Row removal and re-parenting on the same pane changes no pair; the D4 captions are stage ink (`inkOnStage`) on the screen's own gradient, a pairing already in the estate.

Two designed dodges kept it that way, both in candidate B (unshipped, but they are why B is arbiter-free if picked): `Clear filters` ships as a **chip** on the arbitrated `chipFill`+`inkSelect` stack rather than a bare link on chrome, and the sheet's chips take the shipped **solid** `surfaceNeutral`/`borderSubtle` pair — a translucent glass-chip fill over an opaque card would be an un-arbitrated composite.

**Pane budget:** unchanged. Tasks keeps exactly ONE chrome pane; candidate B's sheet is `glass={false}` (opaque house grammar, zero live panes). D4 adds no pane at all.

**PROTECT surfaces byte-untouched, diff-proven:** `git diff 8cded0b..HEAD -- PlatformMap.tsx PlatformMap.web.tsx GlassSurface.tsx` → **0 files changed**.

---

## §5 D4 per-path behaviour, and the privacy proof

| path | peek camera | caption | prompt? |
|---|---|---|---|
| search center picked | recenters on the result | none | no |
| location granted (cold start, native) | recenters silently on the cached/live fix | none | **no** — `getForegroundPermissionsAsync` |
| granted, but nothing reported nearby | recenters | **the empty-local invite** | no |
| denied | stays on fallback | **nothing** — no false claim, no error tone | no |
| undetermined | stays on fallback | nothing | no |
| geo hangs / times out (15s) | stays on fallback | "Finding your location…" while genuinely in flight | no |
| signed out | identical — Home's peek never depended on auth | as above | no |
| web, pre-consent | probe not mounted at all | nothing | no |

### The privacy proof (all six verified this phase, now permanently fenced by C4)

| claim | evidence |
|---|---|
| no geo predicate reaches the server | `git diff 8cded0b..HEAD -- src/lib/flags.ts src/lib/flagsStore.tsx supabase/` → **empty**. Queries filter on `status`/`user_id`, ordered by `created_at`. No `.gte/.lte` on lat/lng, no `ST_DWithin`, no `geography(`, no `<->`. |
| no new prompt site | prompt sites remain exactly `{location.ts, MapScreen, OnboardingCards}` — asserted as an exact sorted list, so a fourth cannot appear quietly. Home imports no expo-location. |
| no persistence | Home has no `AsyncStorage`; coordinates live only in component state. |
| no transmission | Home has no supabase import and no network call. |
| no watchers | `watchPositionAsync` absent repo-wide. |
| S-1 held | `git diff 8cded0b..HEAD -- Settings/Resources/HowToHelp/About` → **empty**. |

C4 is pure-additive and revert-safe in any order. It is **not falsifiable** against pre-C4 source by design (it encodes law that already held) — so it was proved to **bite** instead: injecting a real `.gte('lat', 0)` into the flags query fails it, and reverting restores green with `flags.ts` byte-identical.

---

## §6 Gates

| gate | result |
|---|---|
| typecheck | **0** |
| lint | **0 errors / 77 warnings** — baseline exact |
| jest | **158 suites · 2205 passed · 0 failed · 84 todo** |
| conservation (F-12) | base 152/2116 → tip 158/2205 = **+6 suites / +89 tests**, matching the per-commit declarations exactly (D4-C1 +1/+8 · D4-C2 +1/+17 · D4-C3 +1/+24 · D4-C4 +1/+7 · D3-C1 +1/+14 · D3-C3 +1/+19). **No pre-existing test changed state.** |
| flake handling | one full run showed `StatusHistoryModal` failing at a 15-min load average of **39.65** (run time 114 s). Isolated: **6/6 in 1.5 s**. Re-run on a quiet machine: **158/158, 23 s**. Recorded as the documented F-13 load-flake, not a regression — and confirmed by re-running, not by asserting it. |
| falsification | every new guard fails against its own pre-commit source: 4/8 · 9/10 + 7/11 · 14/15 + 9/41 · 8/14. C4 proved by injection instead. |
| arbiter | none owed (§4); 14 pre-existing stacks files untouched |
| PROTECT | 0 files changed |
| S-1 | empty diff on all four fenced surfaces |
| captures | **42 PNGs + 8 ARIA trees banked**, 1 FAILED row kept as honest history |
| working tree | clean of all candidate diffs (`git status --porcelain src/` → empty) |

### The phase's headline number

**Cards visible at rest: 1.36 → 2.76.** Chrome pane: **451pt → 257pt** — the header went from 53% of the display to 30%. First card top: 553 → 359.

Every number measured against a static export with `tools/measure-header.mjs`, not estimated.

**Functionally verified end-to-end, not just by source contract:** picking a category from inside the sheet cuts the list 9 → 5 cards, the trigger's background goes `rgba(255,255,255,0.6)` → `rgb(20,102,224)`, and the Clear-filters chip mounts 0 → 1 → 0 across filter-and-clear.

---

## §7 Verification honesty

| claim | level |
|---|---|
| all header/card measurements, all before/after frames | `web-approximated` — Chromium at 390×844 DPR2 against fresh per-candidate static exports |
| the 60pt mine/All row, the 47pt safe area, the 742pt visible band | `code-inferred` — never renderable on web (F-16) |
| D4 camera behaviour on a real GPS cold start | **NEEDS-SKY-DEVICE** |
| whether 300 ms is the right reveal delay | **NEEDS-SKY-DEVICE** |
| whether the doubled VoiceOver announcement is chatty (F-19) | **NEEDS-SKY-DEVICE** — RN-web ARIA is not iOS VoiceOver |
| candidate A's collapse physics | **not rendered** — designed only |

### Not done, and why

- **Candidate A** — designed, not built. Budget. Plan-sanctioned; not offered as a pick.
- **Polish riders** — none taken. Budget, not absence of candidates. Parking lot below.
- **Candidate B's glass-chip variant for D4** — not built; the caption costs nothing against the blur budget and B would add a live pane for one sentence.
- **Native/iOS verification of anything** — the local sim blocker (F-7) persists; everything native is on Sky's device list.

### Parking lot (described, never built)

1. **Cluster badge collides with the "Open full map" chip.** Newly *visible* because D4 put real pins in the peek (see `after-d4/…peek-located.png`, bottom edge). Not newly *caused*. Fixing it means moving the chip or suppressing clusters in the peek — both need Sky's eye, so it is out of rider bounds.
2. **The Sheet close button is 40×40 + hitSlop**, below the 44pt project standard. Pre-existing primitive debt, app-wide, surfaced by candidate B's reuse of `Sheet`. Not fixed here: it is a shared primitive and would touch ~20 modals.

---

## §8 THE CONSOLIDATED DEVICE LIST

**One TestFlight pass covering all three phases.** Use this list, not the per-phase ones.

| # | Check | From |
|---|---|---|
| 1 | Every drawer destination opens and returns — Settings, Resources, How To Help, About | P1 |
| 2 | Sign-out confirm appears and cancels cleanly | P1 |
| 3 | An interrupted drawer exit cannot strand an invisible backdrop that eats taps app-wide | P1 |
| 4 | Drawer opens reliably after a fast re-tap | P1 |
| 5 | Drawer destinations survive a backgrounded/resumed app | P1 |
| 6 | The drawer in **both themes over the live map** — the material read Sky reported | P2 |
| 7 | Live scheme switch **with the drawer open** (Settings → Appearance) | P2 |
| 8 | **Reduce Transparency ON**, drawer + all four destinations, both schemes | P2 |
| 9 | VoiceOver: containment · focus lands on "AccessMap" on open · returns to the hamburger on a plain close · does **not** return when a row hands off. Also settles F-15 (did the old scrim really double-announce?) | P2 |
| 10 | Bottom clearance without the footer, on a home-indicator device | P2 |
| 11 | Drawer frost over the live map **[D2b-B only]** + the 13-pane worst case | P2 |
| 12 | **Map comes home:** granted location, cold start → the peek centres on you with **zero prompt** | **P3** |
| 13 | **Denied** → peek stays on its default region, zero prompt, and the caption says nothing | **P3** |
| 14 | **Airplane mode** → the read times out inside 15s and falls back without hanging | **P3** |
| 15 | The **empty-local invite** at a real flagless locale — does it invite or does it read as broken? | **P3** |
| 16 | **VoiceOver on the peek:** the composed label reads the emptiness — and judge whether hearing it twice (button name + caption, F-19) is chatty. One-line fix if so. | **P3** |
| 17 | **Dynamic Type** on the Tasks header at 200% — nothing truncates, the "Select multiple" target stays ≥44pt beside the search field | **P3** |
| 18 | **The filter sheet on a real device:** open it, pick a category, close — does the trigger's blue fill + Clear-filters chip read clearly enough that you always know a filter is on? This is the one judgement the whole D3 design rests on. | **P3** |
| 19 | **VoiceOver through the filter sheet** — focus lands on the sheet title on open, every filter is reachable and announces its selected state, and focus returns sensibly on close | **P3** |
| 20 | Header collapse physics **[candidate A only, if Sky asks for it built]** | **P3** |

---

## §9 What is Sky's

1. **Open `Phase3_mockup_gate.html`** → record **A-4** and **A-5** in `design-reviews/device-tune/DECISIONS.md` §A.
2. **Open `D2b_mockup_gate.html`** → record **A-2**. Still Phase 2's only blocker; untouched by this phase.
3. **ff-merge `devicetune/3-header-map-polish`** — it contains Phases 1 and 2 as well.
4. **Merge order vs `fix/photo-privacy-sanitize` @ `64342e1`** (CRITICAL, unmerged, no file overlap) — Sky's call.
5. Build → run the §8 device list.

---

## §10 D1–D4 conservation close-out

| | state |
|---|---|
| **D1** | CLOSED pending device (P1) |
| **D2a** | CLOSED (P2) |
| **D2b** | **OPEN** — Sky's pick. Untouched by Phase 3; nothing here resolves or restates it. |
| **D3** | **CLOSED pending device.** Gate **A-4 RESOLVED** — Sky picked candidate B with the eyebrow kept, and it is built (C1 + C2 + C3). Measured 451 → 257pt chrome, 1.36 → 2.76 cards. **C4 built then reverted (F-20) and owes Sky one small decision.** |
| **D4** | **CLOSED pending device.** All four commits shipped; no gate blocks the fix. **A-5 OPEN** for placement + copy only; option 1 ships PROVISIONAL until ratified. |

Nothing silently resolved.

---

## Appendix — new findings this phase

- **F-16** — every web frame of Tasks is signed-OUT; the 60pt mine/All row is structurally absent from all captures.
- **F-17** — the plan's card-pitch constant (179) is outside the measured range; pane arithmetic confirmed, cards-visible numbers superseded. Two measurement traps recorded.
- **F-18** — a capture disproved a claim the source review had accepted: C1's VoiceOver order **does** change by one position. The guard's *name* had overclaimed what its *body* checked, and a normalizing `diff` silently dropped the one line that moved. **Third of its kind on this train** (with F-6 and F-14): a passing guard is only as true as its assertion. Read the artifact, not the checkmark.
- **F-20** — D3/C4 (the banner slim) was built, then **reverted before shipping**: dropping the `Nearest open barrier · ` prefix breaks the shipped colour-is-never-the-sole-signal contract, and does so asymmetrically — screen-reader users keep the meaning, sighted users lose it. The isolation the plan demanded is what made reverting a one-command decision. Three options for Sky in the finding.
- **F-19** — the empty-local message reaches VoiceOver twice (composed button name + caption text node). Kept deliberately, flagged for the device pass, one-line remedy documented.

Full text in `design-reviews/device-tune/DECISIONS.md` §F.
