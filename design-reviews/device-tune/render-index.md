# Device-Tune — capture render index

One row per banked capture, appended the moment it lands (append-only; the LAST row per
filename wins; FAILED rows stay as honest history). Serve mode: the branch's STATIC
EXPORT on `:8082` — the expo-web DEV server crashes Map/Tasks on the lucide lazy
boundary (DECISIONS §F F-7). All captures Chromium DPR-2; geolocation seeded to the wave
coords unless the state says otherwise.

**The bundle is BAKED into the export.** Every candidate variant needs its own fresh
`expo export` before its captures mean anything — a capture taken against a stale export
is a lie about the code it claims to show.

Honesty tags: `verified` (proved on the real target) · `web-approximated` (Chromium
proxy — directional only, no claim about native feel) · `code-inferred` · `NEEDS-SKY-DEVICE`.

| file | screen | theme | width | state | tag | note |
|---|---|---|---|---|---|---|
| phase2/before/drawer-over-map__light__390__open.png | drawer-over-map | light | 390 | open | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Open navigation menu').first()     - locator resolved to <but |
| phase2/before/drawer-over-map__dark__390__open.png | drawer-over-map | dark | 390 | open | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Open navigation menu').first()     - locator resolved to <but |
| phase2/before/drawer-over-home__light__390__open.png | drawer-over-home | light | 390 | open | web-approximated | designed-backdrop case — the drawer against the Deep Field stage it should belong to |
| phase2/before/drawer-over-home__dark__390__open.png | drawer-over-home | dark | 390 | open | web-approximated |  |
| phase2/before/resources__light__390__at-rest.png | resources | light | 390 | at-rest | web-approximated | C5 destination — expected ALREADY glassed (ScreenStage + chrome pane + row glass) |
| phase2/before/resources__dark__390__at-rest.png | resources | dark | 390 | at-rest | web-approximated |  |
| phase2/before/howtohelp__light__390__at-rest.png | howtohelp | light | 390 | at-rest | web-approximated |  |
| phase2/before/howtohelp__dark__390__at-rest.png | howtohelp | dark | 390 | at-rest | web-approximated |  |
| phase2/before/about__light__390__at-rest.png | about | light | 390 | at-rest | web-approximated | C5 destination — variant="bulk" bottom sheet (the B9 sibling-grammar observation lives here) |
| phase2/before/about__dark__390__at-rest.png | about | dark | 390 | at-rest | web-approximated |  |
| phase2/before/settings__light__390__at-rest.png | settings | light | 390 | at-rest | web-approximated |  |
| phase2/before/settings__dark__390__at-rest.png | settings | dark | 390 | at-rest | web-approximated |  |
| a11y-tree/drawer__light__390.txt | drawer | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| phase2/before/drawer-over-map__light__390__open.png | drawer-over-map | light | 390 | open | web-approximated | THE bug Sky reported: a dark drawer over the LIGHT app, worst case — over live map tiles |
| phase2/before/drawer-over-map__dark__390__open.png | drawer-over-map | dark | 390 | open | web-approximated | dark-mode control — the rebind must leave this essentially byte-stable |
| phase2/after/drawer-over-map__light__390__open.png | drawer-over-map | light | 390 | open | web-approximated | CANDIDATE A (as C2/C3 ship it) — THE bug Sky reported: a dark drawer over the LIGHT app, worst case — over live map tiles |
| phase2/after/drawer-over-map__dark__390__open.png | drawer-over-map | dark | 390 | open | web-approximated | CANDIDATE A (as C2/C3 ship it) — dark-mode control — the rebind must leave this essentially byte-stable |
| phase2/after/drawer-over-home__light__390__open.png | drawer-over-home | light | 390 | open | web-approximated | CANDIDATE A (as C2/C3 ship it) — designed-backdrop case — the drawer against the Deep Field stage it should belong to |
| phase2/after/drawer-over-home__dark__390__open.png | drawer-over-home | dark | 390 | open | web-approximated | CANDIDATE A (as C2/C3 ship it) |
| phase2/after/resources__light__390__at-rest.png | resources | light | 390 | at-rest | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Resources', { exact: true }).first()  |
| phase2/after/resources__dark__390__at-rest.png | resources | dark | 390 | at-rest | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Resources', { exact: true }).first()  |
| phase2/after/howtohelp__light__390__at-rest.png | howtohelp | light | 390 | at-rest | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('How To Help', { exact: true }).first()  |
| phase2/after/howtohelp__dark__390__at-rest.png | howtohelp | dark | 390 | at-rest | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('How To Help', { exact: true }).first()  |
| phase2/after/about__light__390__at-rest.png | about | light | 390 | at-rest | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('About the App', { exact: true }).first()  |
| phase2/after/about__dark__390__at-rest.png | about | dark | 390 | at-rest | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('About the App', { exact: true }).first()  |
| phase2/after/settings__light__390__at-rest.png | settings | light | 390 | at-rest | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Settings', { exact: true }).first()  |
| phase2/after/settings__dark__390__at-rest.png | settings | dark | 390 | at-rest | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Settings', { exact: true }).first()  |
| phase2/after/drawer-over-map__light__390__open.png | drawer-over-map | light | 390 | open | web-approximated | CANDIDATE A (as C2/C3 ship it) — THE bug Sky reported: a dark drawer over the LIGHT app, worst case — over live map tiles |
| phase2/after/drawer-over-map__dark__390__open.png | drawer-over-map | dark | 390 | open | web-approximated | CANDIDATE A (as C2/C3 ship it) — dark-mode control — the rebind must leave this essentially byte-stable |
| phase2/after/drawer-over-home__light__390__open.png | drawer-over-home | light | 390 | open | web-approximated | CANDIDATE A (as C2/C3 ship it) — designed-backdrop case — the drawer against the Deep Field stage it should belong to |
| phase2/after/drawer-over-home__dark__390__open.png | drawer-over-home | dark | 390 | open | web-approximated | CANDIDATE A (as C2/C3 ship it) |
| phase2/after/resources__light__390__at-rest.png | resources | light | 390 | at-rest | web-approximated | CANDIDATE A (as C2/C3 ship it) — C5 destination — expected ALREADY glassed (ScreenStage + chrome pane + row glass) |
| phase2/after/resources__dark__390__at-rest.png | resources | dark | 390 | at-rest | web-approximated | CANDIDATE A (as C2/C3 ship it) |
| phase2/after/howtohelp__light__390__at-rest.png | howtohelp | light | 390 | at-rest | web-approximated | CANDIDATE A (as C2/C3 ship it) |
| phase2/after/howtohelp__dark__390__at-rest.png | howtohelp | dark | 390 | at-rest | web-approximated | CANDIDATE A (as C2/C3 ship it) |
| phase2/after/about__light__390__at-rest.png | about | light | 390 | at-rest | web-approximated | CANDIDATE A (as C2/C3 ship it) — C5 destination — variant="bulk" bottom sheet (the B9 sibling-grammar observation lives here) |
| phase2/after/about__dark__390__at-rest.png | about | dark | 390 | at-rest | web-approximated | CANDIDATE A (as C2/C3 ship it) |
| phase2/after/settings__light__390__at-rest.png | settings | light | 390 | at-rest | web-approximated | CANDIDATE A (as C2/C3 ship it) |
| phase2/after/settings__dark__390__at-rest.png | settings | dark | 390 | at-rest | web-approximated | CANDIDATE A (as C2/C3 ship it) |
| a11y-tree/drawer-after__light__390.txt | drawer-after | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| phase2/candidates/drawer-B__light__390__open-over-map.png | drawer-B | light | 390 | open-over-map | web-approximated | CANDIDATE B — live glass (GlassSurface variant="bulk" + the Sheet outer-shadow recipe). WORKING TREE ONLY, never committed before Sky's pick. |
| phase2/candidates/drawer-B__dark__390__open-over-map.png | drawer-B | dark | 390 | open-over-map | web-approximated |  |
| phase2/candidates/drawer-B-home__light__390__open-over-home.png | drawer-B-home | light | 390 | open-over-home | web-approximated |  |
| phase2/candidates/drawer-B-home__dark__390__open-over-home.png | drawer-B-home | dark | 390 | open-over-home | web-approximated |  |
| phase3/before/tasks__light__390__rest.png | tasks | light | 390 | rest | web-approximated | D3 BEFORE at rest — the header Sky says eats half the screen. NB (F-16): this is a SIGNED-OUT frame, so the 60pt mine/All row is structurally absent; the device header is 60pt taller than this. |
| phase3/before/tasks__dark__390__rest.png | tasks | dark | 390 | rest | web-approximated | D3 BEFORE at rest, dark scheme |
| phase3/before/tasks__light__390__scrolled.png | tasks | light | 390 | scrolled | web-approximated | D3 BEFORE scrolled — the absolute chrome pane never yields, so scrolling buys only the gap above the first card |
| phase3/before/tasks__dark__390__scrolled.png | tasks | dark | 390 | scrolled | web-approximated | D3 BEFORE scrolled, dark scheme |
| phase3/before/tasks__light__390__rest-zoom13.png | tasks | light | 390 | rest-zoom13 | web-approximated | D3 BEFORE at 130% — the Dynamic Type proxy every candidate must survive without truncating |
| a11y-tree/tasks__light__390.txt | tasks | light | 390 | rest | web-approximated | RN-web ARIA snapshot |
| phase3/before/home-peek__light__390__peek-default.png | home-peek | light | 390 | peek-default | web-approximated | D4 BEFORE — the peek on its San Francisco fallback. On web the probe is gated behind the explicit tap (HomeScreen.tsx:119), so this is also the honest signed-out/undetermined frame. |
| phase3/before/home-peek__dark__390__peek-default.png | home-peek | dark | 390 | peek-default | web-approximated | D4 BEFORE default peek, dark scheme |
| phase3/before/home-peek__light__390__peek-located.png | home-peek | light | 390 | peek-located | web-approximated | D4 BEFORE — THE DEFECT. Location is granted and resolved (the list re-sorts to NEARBY/CLOSEST), yet the peek stays on San Francisco: initialRegion is mount-only (PlatformMap.tsx:288) and the probe resolves after mount. |
| phase3/before/home-peek__dark__390__peek-located.png | home-peek | dark | 390 | peek-located | web-approximated | D4 BEFORE defect, dark scheme |
| a11y-tree/home-peek__light__390.txt | home-peek | light | 390 | peek-located | web-approximated | RN-web ARIA snapshot |
| phase3/after-d4/home-peek__light__390__peek-located.png | home-peek | light | 390 | peek-located | web-approximated | D4 AFTER — the fix. Same granted location as the BEFORE frame; the peek is now centred where the user actually is, and the local flags are in frame. |
| phase3/after-d4/home-peek__dark__390__peek-located.png | home-peek | dark | 390 | peek-located | web-approximated | D4 AFTER, dark scheme |
| phase3/after-d4/home-peek__light__390__peek-empty-local.png | home-peek | light | 390 | peek-empty-local | web-approximated | D4/C3 candidate A — standing in Penticton, ~50 km from every reported flag and far outside the peek's 0.05-degree window. The correctly-centred map is genuinely empty; the caption invites rather than reading as broken. |
| phase3/after-d4/home-peek__dark__390__peek-empty-local.png | home-peek | dark | 390 | peek-empty-local | web-approximated | D4/C3 candidate A, dark scheme |
| phase3/after-d4/home-peek__light__390__peek-empty-local-zoom13.png | home-peek | light | 390 | peek-empty-local-zoom13 | web-approximated | D4/C3 at 130% — the caption must wrap, never truncate (maxFontSizeMultiplier 1.4, no fixed height) |
| phase3/after-d4/home-peek__light__390__peek-locating.png | home-peek | light | 390 | peek-locating | web-approximated | D4/C2 — the read hangs, so it is still in flight past the 300 ms reveal and HAS earned the words. Shipped MapScreen wording reused byte-for-byte. |
| phase3/after-d4/home-peek__light__390__peek-denied.png | home-peek | light | 390 | peek-denied | web-approximated | D4/C2 honesty case — permission denied. The peek stays on its default region and the caption says NOTHING: no false 'Finding your location…', no error tone for a choice the user made. |
| a11y-tree/home-peek-empty__light__390.txt | home-peek-empty | light | 390 | peek-empty-local | web-approximated | RN-web ARIA snapshot |
| phase3/c1/tasks__light__390__rest.png | tasks | light | 390 | rest | web-approximated | D3/C1 only — the select-multiple row is gone; measured pane 344 -> 292 web (-52 exactly) |
| phase3/c1/tasks__dark__390__rest.png | tasks | dark | 390 | rest | web-approximated | D3/C1 only, dark scheme |
| phase3/c1/tasks__light__390__scrolled.png | tasks | light | 390 | scrolled | web-approximated | D3/C1 only, scrolled |
| phase3/c1/tasks__light__390__rest-zoom13.png | tasks | light | 390 | rest-zoom13 | web-approximated | D3/C1 at 130% — THE named taste cost: the input has ~224pt at 390 and its placeholder ellipsizes. Sky sees it here before she picks. |
| phase3/c1/tasks__light__390__selection-entered.png | tasks | light | 390 | selection-entered | web-approximated | D3/C1 reachability proof — the relocated control still enters selection mode, and correctly disappears from the row once it has (the !selection.active gate) |
| a11y-tree/tasks-c1__light__390.txt | tasks-c1 | light | 390 | rest | web-approximated | RN-web ARIA snapshot |
| phase3/candC/tasks-C__light__390__rest.png | tasks-C | light | 390 | rest | web-approximated | D3 candidate C (density pass) on top of C1: eyebrow dropped, header padBottom 12->8, inter-row rhythm 8->4. All 44pt targets intact. |
| phase3/candC/tasks-C__dark__390__rest.png | tasks-C | dark | 390 | rest | web-approximated | D3 candidate C (density pass) on top of C1: eyebrow dropped, header padBottom 12->8, inter-row rhythm 8->4. All 44pt targets intact. |
| phase3/candC/tasks-C__light__390__scrolled.png | tasks-C | light | 390 | scrolled | web-approximated | D3 candidate C (density pass) on top of C1: eyebrow dropped, header padBottom 12->8, inter-row rhythm 8->4. All 44pt targets intact. |
| phase3/candC/tasks-C__dark__390__scrolled.png | tasks-C | dark | 390 | scrolled | web-approximated | D3 candidate C (density pass) on top of C1: eyebrow dropped, header padBottom 12->8, inter-row rhythm 8->4. All 44pt targets intact. |
| phase3/candC/tasks-C__light__390__rest-zoom13.png | tasks-C | light | 390 | rest-zoom13 | web-approximated | D3 candidate C (density pass) on top of C1: eyebrow dropped, header padBottom 12->8, inter-row rhythm 8->4. All 44pt targets intact. — 130% Dynamic Type proxy: compaction must never truncate |
| a11y-tree/tasks-C__light__390.txt | tasks-C | light | 390 | rest | web-approximated | RN-web ARIA snapshot |
| phase3/candB/tasks-B__light__390__rest.png | tasks-B | light | 390 | rest | web-approximated | D3 candidate B (consolidated control row) on top of C1: eyebrow+subtitle retire, the three filter rows move into an opaque house Sheet behind one trigger, banner slims to one line. |
| phase3/candB/tasks-B__dark__390__rest.png | tasks-B | dark | 390 | rest | web-approximated | D3 candidate B (consolidated control row) on top of C1: eyebrow+subtitle retire, the three filter rows move into an opaque house Sheet behind one trigger, banner slims to one line. |
| phase3/candB/tasks-B__light__390__scrolled.png | tasks-B | light | 390 | scrolled | web-approximated | D3 candidate B (consolidated control row) on top of C1: eyebrow+subtitle retire, the three filter rows move into an opaque house Sheet behind one trigger, banner slims to one line. |
| phase3/candB/tasks-B__dark__390__scrolled.png | tasks-B | dark | 390 | scrolled | web-approximated | D3 candidate B (consolidated control row) on top of C1: eyebrow+subtitle retire, the three filter rows move into an opaque house Sheet behind one trigger, banner slims to one line. |
| phase3/candB/tasks-B__light__390__sheet-open.png | tasks-B | light | 390 | sheet-open | web-approximated | D3 candidate B (consolidated control row) on top of C1: eyebrow+subtitle retire, the three filter rows move into an opaque house Sheet behind one trigger, banner slims to one line. — the sheet itself: every handler and label byte-identical to the rows it replaced; chips take the shipped SOLID pair because a translucent fill over an opaque card would be an un-arbitrated composite |
| phase3/candB/tasks-B__dark__390__sheet-open.png | tasks-B | dark | 390 | sheet-open | web-approximated | D3 candidate B (consolidated control row) on top of C1: eyebrow+subtitle retire, the three filter rows move into an opaque house Sheet behind one trigger, banner slims to one line. — sheet, dark scheme |
| phase3/candB/tasks-B__light__390__filters-active.png | tasks-B | light | 390 | filters-active | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('No ramp').first()     - locator resolved to <button tabindex= |
| phase3/candB/tasks-B__light__390__rest-zoom13.png | tasks-B | light | 390 | rest-zoom13 | web-approximated | D3 candidate B (consolidated control row) on top of C1: eyebrow+subtitle retire, the three filter rows move into an opaque house Sheet behind one trigger, banner slims to one line. — 130% Dynamic Type proxy |
| a11y-tree/tasks-B__light__390.txt | tasks-B | light | 390 | rest | web-approximated | RN-web ARIA snapshot |
| a11y-tree/tasks-B-sheet__light__390.txt | tasks-B-sheet | light | 390 | sheet-open | web-approximated | RN-web ARIA snapshot |
| phase3/candB/tasks-B__light__390__filters-active.png | tasks-B | light | 390 | filters-active | web-approximated | D3 candidate B (consolidated control row) on top of C1: eyebrow+subtitle retire, the three filter rows move into an opaque house Sheet behind one trigger, banner slims to one line. — THE floor that matters: with a filter on, the trigger takes the ratified active grammar AND a Clear filters chip appears, so active state is never hidden behind the sheet |
| phase3/candB/tasks-B__light__390__filters-active.png | tasks-B | light | 390 | filters-active | web-approximated | D3 candidate B (consolidated control row) on top of C1: eyebrow+subtitle retire, the three filter rows move into an opaque house Sheet behind one trigger, banner slims to one line. — THE floor that matters: with a filter active (search text), the trigger takes the ratified active grammar AND a Clear filters chip appears, so active state is never hidden behind the sheet |
| phase3/final/tasks-final__light__390__rest.png | tasks-final | light | 390 | rest | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. |
| phase3/final/tasks-final__dark__390__rest.png | tasks-final | dark | 390 | rest | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. |
| phase3/final/tasks-final__light__390__scrolled.png | tasks-final | light | 390 | scrolled | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. |
| phase3/final/tasks-final__dark__390__scrolled.png | tasks-final | dark | 390 | scrolled | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. |
| phase3/final/tasks-final__light__390__rest-zoom13.png | tasks-final | light | 390 | rest-zoom13 | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. 130% Dynamic Type proxy. |
| phase3/final/tasks-final__light__390__sheet-open.png | tasks-final | light | 390 | sheet-open | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. The sheet: all 7 categories visible at once (the old strip showed ~3). |
| phase3/final/tasks-final__dark__390__sheet-open.png | tasks-final | dark | 390 | sheet-open | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. The sheet: all 7 categories visible at once (the old strip showed ~3). |
| phase3/final/tasks-final__light__390__filters-active.png | tasks-final | light | 390 | filters-active | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. Filter picked FROM INSIDE the sheet: list 9 -> 5, trigger goes brand-blue, Clear filters chip appears. Active state can never hide behind a shut sheet. |
| a11y-tree/tasks-final__light__390.txt | tasks-final | light | 390 | rest | web-approximated | RN-web ARIA snapshot |
| a11y-tree/tasks-final-sheet__light__390.txt | tasks-final-sheet | light | 390 | sheet-open | web-approximated | RN-web ARIA snapshot |
| phase3/final/tasks-final__light__390__rest.png | tasks-final | light | 390 | rest | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. |
| phase3/final/tasks-final__dark__390__rest.png | tasks-final | dark | 390 | rest | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. |
| phase3/final/tasks-final__light__390__scrolled.png | tasks-final | light | 390 | scrolled | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. |
| phase3/final/tasks-final__dark__390__scrolled.png | tasks-final | dark | 390 | scrolled | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. |
| phase3/final/tasks-final__light__390__rest-zoom13.png | tasks-final | light | 390 | rest-zoom13 | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. 130% Dynamic Type proxy. |
| phase3/final/tasks-final__light__390__sheet-open.png | tasks-final | light | 390 | sheet-open | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. The sheet: all 7 categories visible at once (the old strip showed ~3). |
| phase3/final/tasks-final__dark__390__sheet-open.png | tasks-final | dark | 390 | sheet-open | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. The sheet: all 7 categories visible at once (the old strip showed ~3). |
| phase3/final/tasks-final__light__390__filters-active.png | tasks-final | light | 390 | filters-active | web-approximated | D3 SHIPPED (Sky's A-4 pick: candidate B with the TASKS eyebrow kept). Chrome 451 -> 257pt device; 1.36 -> 2.76 cards at rest. Filter picked FROM INSIDE the sheet: list 9 -> 5, trigger goes brand-blue, Clear filters chip appears. Active state can never hide behind a shut sheet. |
| a11y-tree/tasks-final__light__390.txt | tasks-final | light | 390 | rest | web-approximated | RN-web ARIA snapshot |
| a11y-tree/tasks-final-sheet__light__390.txt | tasks-final-sheet | light | 390 | sheet-open | web-approximated | RN-web ARIA snapshot |
