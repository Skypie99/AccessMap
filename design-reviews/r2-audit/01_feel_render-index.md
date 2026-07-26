# Fable Audit ROUND 2 — Part 1: Feel render index

One row per banked capture, appended the moment it lands (append-only; the LAST row per
filename wins; FAILED rows stay as honest history). Serve mode: the static export on
`:8082` unless the note says otherwise — see `01_feel_orientation.md` §0. All captures
Chromium DPR-2; geolocation seeded to the wave coords unless the state says denied/hang.

| file | screen | theme | width | state | tag | note |
|---|---|---|---|---|---|---|
| press/tabbar__light__390__rest.png | tabbar | light | 390 | rest | web-approximated | tab bar rest — pair with pressed |
| base/home__light__390__at-rest.png | home | light | 390 | at-rest | web-approximated |  |
| press/tabbar__light__390__pressed.png | tabbar | light | 390 | pressed | web-approximated | held pointer-down on the Tasks tab |
| base/home__light__375__at-rest.png | home | light | 375 | at-rest | web-approximated |  |
| press/home-pill__light__390__pressed.png | home-pill | light | 390 | pressed | web-approximated | primary CTA held — PressableScale/pressed-style evidence |
| base/home__light__430__at-rest.png | home | light | 430 | at-rest | web-approximated |  |
| press/home-pill__light__390__hover.png | home-pill | light | 390 | hover | web-approximated | web hover parity check |
| base/home__dark__390__at-rest.png | home | dark | 390 | at-rest | web-approximated |  |
| press/map-zoomin__light__390__pressed.png | map-zoomin | light | 390 | pressed | web-approximated | S6 zoom button held — new control since R1 |
| base/map__light__390__at-rest.png | map | light | 390 | at-rest | web-approximated | S7 light Positron tiles + S6 zoom buttons + S8 MAP/Explore chip — all new since R1 |
| base/map__light__375__at-rest.png | map | light | 375 | at-rest | web-approximated | S7 light Positron tiles + S6 zoom buttons + S8 MAP/Explore chip — all new since R1 |
| base/map__light__430__at-rest.png | map | light | 430 | at-rest | web-approximated | S7 light Positron tiles + S6 zoom buttons + S8 MAP/Explore chip — all new since R1 |
| press/map-actionbar__light__390__pressed.png | map-actionbar | light | 390 | pressed | web-approximated | action-bar tool held (legend button) |
| press/report-category__light__390__pressed.png | report-category | light | 390 | pressed | web-approximated |  |
| base/map__dark__390__at-rest.png | map | dark | 390 | at-rest | web-approximated |  |
| press/report-severity__light__390__pressed.png | report-severity | light | 390 | pressed | web-approximated | severity button held — the signature control |
| base/map__light__390__first-arrival-auto-list.png | map | light | 390 | first-arrival-auto-list | web-approximated | SR-true-on-web auto-open — app truth; doubles as NearbyFlagsModal base (B4e glass) |
| press/tasks-card__light__390__pressed.png | tasks-card | light | 390 | pressed | web-approximated | card held — press sheen territory (RM-gated wash) |
| press/tasks-card__dark__390__pressed.png | tasks-card | dark | 390 | pressed | web-approximated |  |
| base/map__dark__390__first-arrival-auto-list.png | map | dark | 390 | first-arrival-auto-list | web-approximated |  |
| press/tasks-card__light__390__hover.png | tasks-card | light | 390 | hover | web-approximated |  |
| base/tasks__light__390__at-rest.png | tasks | light | 390 | at-rest | web-approximated |  |
| press/tasks-verify__light__390__pressed.png | tasks-verify | light | 390 | pressed | web-approximated | triage action held (guest render — RLS would refuse the write; never released into a mutation? release happens on ctx close without pointer-up over the button after screenshot — no click event fires) |
| base/tasks__light__375__at-rest.png | tasks | light | 375 | at-rest | web-approximated |  |
| press/drawer-row__light__390__pressed.png | drawer-row | light | 390 | pressed | web-approximated |  |
| base/tasks__dark__390__at-rest.png | tasks | dark | 390 | at-rest | web-approximated |  |
| press/filter-chip__light__390__pressed.png | filter-chip | light | 390 | pressed | web-approximated |  |
| base/tasks__light__390__select-bulk.png | tasks | light | 390 | select-bulk | web-approximated |  |
| base/profile-signedout__light__390__at-rest.png | profile-signedout | light | 390 | at-rest | web-approximated | S8 editorial header + HeaderActions — new since R1 |
| base/profile-signedout__dark__390__at-rest.png | profile-signedout | dark | 390 | at-rest | web-approximated |  |
| base/settings__light__390__at-rest.png | settings | light | 390 | at-rest | web-approximated |  |
| base/settings__dark__390__at-rest.png | settings | dark | 390 | at-rest | web-approximated |  |
| base/drawer-open__light__390__at-rest.png | drawer-open | light | 390 | at-rest | web-approximated | B3 white LogoMark in the blue tile — new since R1 |
| base/drawer-open__dark__390__at-rest.png | drawer-open | dark | 390 | at-rest | web-approximated |  |
| base/report__light__390__open.png | report | light | 390 | open | web-approximated | S5 retry row · S18 Submit report · S15 submit-moment sentence · B4d bulk glass · B2-ii CategoryIcon chips |
| base/report__light__375__open.png | report | light | 375 | open | web-approximated | S5 retry row · S18 Submit report · S15 submit-moment sentence · B4d bulk glass · B2-ii CategoryIcon chips |
| base/report__dark__390__open.png | report | dark | 390 | open | web-approximated |  |
| press/clear-all__light__390__pressed.png | clear-all | light | 390 | pressed | FAILED | locator.boundingBox: Timeout 30000ms exceeded. Call log:   - waiting for getByLabel('Clear all filters').first()  |
| press/focus-home__light__390__tab3.png | focus-home | light | 390 | tab3 | web-approximated | keyboard focus-visible after 3 Tabs — focus ring evidence |
| press/focus-report__light__390__tab2.png | focus-report | light | 390 | tab2 | web-approximated |  |
| base/legend-modal__light__390__at-rest.png | legend-modal | light | 390 | at-rest | web-approximated | S1 Status block + anon-ring + resolved-check entries · S2 digit ink · B4c bulk glass |
| press/tasks-card__light__390__rm-pressed.png | tasks-card | light | 390 | rm-pressed | web-approximated | RM-honesty: sheen unmounted, acknowledgment must survive |
| transitions/report__light__390__opening-t150.png | report | light | 390 | opening-t150 | web-approximated | mid-slide frame of the sheet presentation |
| transitions/report__light__390__opening-t400.png | report | light | 390 | opening-t400 | web-approximated |  |
| base/legend-modal__dark__390__at-rest.png | legend-modal | dark | 390 | at-rest | web-approximated |  |
| transitions/report__light__390__open-settled.png | report | light | 390 | open-settled | web-approximated |  |
| transitions/report__light__390__closing-t150.png | report | light | 390 | closing-t150 | web-approximated |  |
| transitions/drawer__light__390__opening-t120.png | drawer | light | 390 | opening-t120 | web-approximated | drawer Modal is animationType none — slide is hand-animated; catch the mid-frame |
| base/map__light__390__filter-open.png | map | light | 390 | filter-open | web-approximated | the ONE Map frost moment (true blur i=12); S16 Clear-all + B11-B ctaFill + B11-C 500-weight hints |
| transitions/drawer__light__390__subswap-t120.png | drawer | light | 390 | subswap-t120 | web-approximated | inside the 220ms sub-screen delay gate — the designed pause |
| transitions/drawer__light__390__subswap-t400.png | drawer | light | 390 | subswap-t400 | web-approximated | post-delay — sub-screen swapped |
| base/map__dark__390__filter-open.png | map | dark | 390 | filter-open | web-approximated |  |
| transitions/nearby__light__390__opening-t150.png | nearby | light | 390 | opening-t150 | web-approximated |  |
| transitions/legend__light__390__opening-t150.png | legend | light | 390 | opening-t150 | web-approximated |  |
| base/map__light__390__pin-callout.png | map | light | 390 | pin-callout | web-approximated | S3 freshness line + Open details button; S1 grammar meta |
| transitions/tabswitch__light__390__t100.png | tabswitch | light | 390 | t100 | web-approximated | tabs have no animation (motion inventory #23) — confirm the silence |
| transitions/detail__light__390__opening-t150.png | detail | light | 390 | opening-t150 | web-approximated | S3 doorway presentation — the new trust transition |
| base/map__dark__390__pin-callout.png | map | dark | 390 | pin-callout | web-approximated |  |
| transitions/report__light__390__rm-opening-t150.png | report | light | 390 | rm-opening-t150 | web-approximated | RM: animationType none — the sheet must be fully present at t150 (designed stillness) |
| transitions/drawer__light__390__rm-subswap-t120.png | drawer | light | 390 | rm-subswap-t120 | web-approximated | B5: the 220ms gate is 0 under RM — swap must already be done at t120 |
| transitions/nearby__light__390__rm-opening-t150.png | nearby | light | 390 | rm-opening-t150 | web-approximated |  |
| base/flagdetail__light__390__from-map.png | flagdetail | light | 390 | from-map | web-approximated | S3 — FlagDetailModal newly reachable from the Map; R1 could not capture this |
| voice/report-footer__light__390__crop.png | report-footer | light | 390 | crop | web-approximated | F4 set: anon banner + submit-moment sentence + Submit report + severity definition line |
| base/flagdetail__dark__390__from-map.png | flagdetail | dark | 390 | from-map | web-approximated |  |
| voice/map-pill__light__390__crop.png | map-pill | light | 390 | crop | web-approximated | F4 set: 'Showing N flags' pill + MAP/Explore chip |
| base/nearby-modal__light__390__reopened.png | nearby-modal | light | 390 | reopened | web-approximated | S1 meta line 'Severity N of 5 · word · Status · time' + S2 digit ink + B4e glass |
| voice/denied-banner__light__390__crop.png | denied-banner | light | 390 | crop | web-approximated | F4 set: S4 denied-arrival copy |
| base/nearby-modal__dark__390__reopened.png | nearby-modal | dark | 390 | reopened | web-approximated |  |
| voice/legend-status__light__390__crop.png | legend-status | light | 390 | crop | web-approximated | F4 set: S1 Status block — where 'verified' is defined |
| base/address-search__light__390__at-rest.png | address-search | light | 390 | at-rest | web-approximated | B2-i Lucide icons + B4c bulk glass |
| voice/callout__light__390__crop.png | callout | light | 390 | crop | web-approximated | F4 set: S3 freshness line + Open details + S1 grammar meta |
| base/feedback-modal__light__390__at-rest.png | feedback-modal | light | 390 | at-rest | web-approximated | B2-i Lucide category chips |
| voice/nearby-rows__light__390__crop.png | nearby-rows | light | 390 | crop | web-approximated | F4 set: S1 meta line grammar on the accessible twin |
| base/help-modal__light__390__at-rest.png | help-modal | light | 390 | at-rest | web-approximated | S20 fact-checked FAQ + B4b bulk glass |
| voice/home-recent__light__390__crop.png | home-recent | light | 390 | crop | web-approximated | F4 set: 'Most recent barriers' + severity number + STATUS_LABELS rows |
| base/help-modal__dark__390__at-rest.png | help-modal | dark | 390 | at-rest | web-approximated |  |
| voice/empty-filters__light__390__crop.png | empty-filters | light | 390 | crop | web-approximated | F4 set: the PROTECT-2 card copy — the voice bar |
| voice/load-error__light__390__crop.png | load-error | light | 390 | crop | web-approximated | F4 set: failure-state register |
| voice/heat-caveat__light__390__crop.png | heat-caveat | light | 390 | crop | web-approximated | F4 set: k>=3 privacy caveat + B7a companion line if it fires |
| base/changelog-modal__light__390__at-rest.png | changelog-modal | light | 390 | at-rest | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('What\'s new', { exact: true }).first()  |
| glassmode/tasks__light__390__clite.png | tasks | light | 390 | clite | web-approximated | C-lite — rows engineered; pair with base tasks at-rest |
| glassmode/tasks__dark__390__clite.png | tasks | dark | 390 | clite | web-approximated |  |
| base/myfeedback-modal__light__390__at-rest.png | myfeedback-modal | light | 390 | at-rest | web-approximated | B2-i Lucide empty states + B4b bulk glass |
| glassmode/profile__light__390__clite.png | profile | light | 390 | clite | web-approximated |  |
| glassmode/profile__dark__390__clite.png | profile | dark | 390 | clite | web-approximated |  |
| base/map__light__390__heatmap-on.png | map | light | 390 | heatmap-on | web-approximated | B7a companion line territory — note whether zones qualify or the no-zones line shows |
| glassmode/report__light__390__clite.png | report | light | 390 | clite | web-approximated | B4d sheet under C-lite — bulk keeps blur by law (GLASS §4); verify visually |
| base/map__dark__390__heatmap-on.png | map | dark | 390 | heatmap-on | web-approximated |  |
| glassmode/legend__light__390__clite.png | legend | light | 390 | clite | web-approximated |  |
| base/onboarding__light__390__slide1.png | onboarding | light | 390 | slide1 | web-approximated | B3 LogoMark replaces the Compass — new since R1 |
| base/onboarding__dark__390__slide1.png | onboarding | dark | 390 | slide1 | web-approximated |  |
| base/onboarding__light__390__slide2.png | onboarding | light | 390 | slide2 | web-approximated | S15 rewritten copy |
| glassmode/map__light__390__clite-filter-open.png | map | light | 390 | clite-filter-open | web-approximated | the ONE Map frost drops to engineered under C-lite (threads forceEngineered) |
| base/onboarding__light__390__slide3-consent.png | onboarding | light | 390 | slide3-consent | web-approximated | S19 'Continue' CTA + 'Not now' decline — the consent moment |
| base/onboarding__light__390__slide4.png | onboarding | light | 390 | slide4 | web-approximated | optional "Not now" not visible — skipped |
| glassmode/map__dark__390__clite-filter-open.png | map | dark | 390 | clite-filter-open | web-approximated |  |
| base/onboarding__light__390__slide5.png | onboarding | light | 390 | slide5 | web-approximated | optional "Not now" not visible — skipped; optional "Maybe later" not visible — skipped; optional "Next" not visible — skipped |
| a11y-tree/home__light__390.txt | home | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| base/onboarding-replay__light__390__at-rest.png | onboarding-replay | light | 390 | at-rest | web-approximated | B3 LogoMark on replay slide 1 |
| states/map__light__390__empty-filters.png | map | light | 390 | empty-filters | web-approximated | PROTECT-2 recovery card — the bar every state is judged against |
| states/map__dark__390__empty-filters.png | map | dark | 390 | empty-filters | web-approximated |  |
| states/home__light__390__load-error.png | home | light | 390 | load-error | web-approximated | real data-load failure (supabase aborted) |
| states/home__dark__390__load-error.png | home | dark | 390 | load-error | web-approximated |  |
| press/clear-all__light__390__pressed.png | clear-all | light | 390 | pressed | web-approximated | S16 target — renders only when filtersActive; visible text is Clear |
| states/map__light__390__offline-refresh.png | map | light | 390 | offline-refresh | web-approximated | refresh failure while data on screen |
| states/map__light__390__permission-denied.png | map | light | 390 | permission-denied | web-approximated | S4 honest arrival — denied banner + 'Showing N flags' pill |
| states/map__dark__390__permission-denied.png | map | dark | 390 | permission-denied | web-approximated |  |
| states/map__light__390__locating-hang.png | map | light | 390 | locating-hang | web-approximated | PROTECT-6 regression watch — spinner must not hang forever |
| states/tasks__light__390__skeletons-slowdata.png | tasks | light | 390 | skeletons-slowdata | web-approximated | content-shaped skeletons mid-load |
| states/tasks__dark__390__skeletons-slowdata.png | tasks | dark | 390 | skeletons-slowdata | web-approximated |  |
| states/tasks__light__390__rm-skeletons.png | tasks | light | 390 | rm-skeletons | web-approximated | skeleton must be STATIC at 0.5 under RM — designed stillness |
| states/tasks__light__390__empty-search.png | tasks | light | 390 | empty-search | web-approximated |  |
| states/tasks__dark__390__empty-search.png | tasks | dark | 390 | empty-search | web-approximated |  |
| states/report__light__390__ready-submit.png | report | light | 390 | ready-submit | web-approximated | submit-ENABLED boundary — NEVER pressed (fence) |
| states/report__light__390__zoom200.png | report | light | 390 | zoom200 | web-approximated | S18 reflow proof — label inside pill, banner word-wraps [web-approximated zoom proxy] |
| states/app__light__390__still-trying.png | app | light | 390 | still-trying | web-approximated | S11 12s read-escalation via LiveStatusRegion — reads stall, never abort |
| a11y-tree/map-auto-list__light__390.txt | map-auto-list | light | 390 | undefined | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Open the full map').first()  |
| states/map__light__390__locate-failure.png | map | light | 390 | locate-failure | web-approximated | B10 web locate-failure → LiveStatusRegion with Retry |
| states/app__light__390__loading-cold.png | app | light | 390 | loading-cold | web-approximated | S11 cold-load copy ('Loading flags…' vs 'Updating…' split — the Updating half is code-read) |
| a11y-tree/map-at-rest__light__390.txt | map-at-rest | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| states/home__light__390__zoom130.png | home | light | 390 | zoom130 | web-approximated | DT layout proxy [web-approximated] — real DT is device-only |
| a11y-tree/map-callout__light__390.txt | map-callout | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| states/tasks__light__390__zoom130.png | tasks | light | 390 | zoom130 | web-approximated |  |
| a11y-tree/tasks__light__390.txt | tasks | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| states/map__light__390__zoom130.png | map | light | 390 | zoom130 | web-approximated | S8 MAP/Explore chip + S6 zoom buttons under text stress |
| a11y-tree/report-open__light__390.txt | report-open | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| states/nearby__light__390__zoom200.png | nearby | light | 390 | zoom200 | web-approximated | meta-line grammar at 200% — does the one-breath row survive magnification |
| states/home__light__390__zoom200.png | home | light | 390 | zoom200 | web-approximated |  |
| a11y-tree/legend__light__390.txt | legend | light | 390 | undefined | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Map legend').first()  |
| a11y-tree/flagdetail__light__390.txt | flagdetail | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| states/map__light__390__empty-filters.png | map | light | 390 | empty-filters | web-approximated | CORRECTION: filters active but NOT empty — live data now has 3 sev-5 flags (3 of 9 shown); the PROTECT-2 card is in empty-filters-true |
| states/map__dark__390__empty-filters.png | map | dark | 390 | empty-filters | web-approximated | CORRECTION: filters active but NOT empty — see empty-filters-true |
| a11y-tree/profile__light__390.txt | profile | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| a11y-tree/settings__light__390.txt | settings | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| a11y-tree/drawer__light__390.txt | drawer | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| states/map__light__390__empty-filters-true.png | map | light | 390 | empty-filters-true | web-approximated | PROTECT-2 recovery card — true zero-result via the 0-count category (Broken sidewalk) |
| a11y-tree/onboarding-slide1__light__390.txt | onboarding-slide1 | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| a11y-tree/denied-map__light__390.txt | denied-map | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| states/map__dark__390__empty-filters-true.png | map | dark | 390 | empty-filters-true | web-approximated | PROTECT-2 recovery card — true zero-result via the 0-count category (Broken sidewalk) |
| base/changelog-modal__light__390__at-rest.png | changelog-modal | light | 390 | at-rest | web-approximated | B4a first glass Sheet consumer |
| a11y-tree/map-auto-list__light__390.txt | map-auto-list | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| a11y-tree/legend__light__390.txt | legend | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
VERIFY1 2026-07-10
expected=136 indexed=136 on-disk=136
missing=0 failed=0 orphan=0 unindexed=0

VERIFY1 PASS — 2026-07-10: 0 missing / 0 failed / 0 orphan; expected(136) == on-disk(match) == indexed
| voice/empty-filters-true__light__390__crop.png | empty-filters-true | light | 390 | crop | web-approximated | CRITIC #1 — the REAL PROTECT-2 card crop (0-count category recipe); supersedes voice/empty-filters crop |
| states/map__light__390__filters-active-nonempty.png | map | light | 390 | filters-active-nonempty | web-approximated | CRITIC #2 — honest name for the min-sev-5 state (3 of 9 shown); the old empty-filters files are historical |
| states/map__dark__390__filters-active-nonempty.png | map | dark | 390 | filters-active-nonempty | web-approximated |  |
| base/signin__light__390__at-rest.png | signin | light | 390 | at-rest | web-approximated | CRITIC #3 — the account entrance (modal variant; web has no root sign-in) |
| base/signin__dark__390__at-rest.png | signin | dark | 390 | at-rest | web-approximated |  |
| base/resources__light__390__at-rest.png | resources | light | 390 | at-rest | web-approximated | CRITIC #4 |
| base/resources__dark__390__at-rest.png | resources | dark | 390 | at-rest | web-approximated |  |
| base/address-search__dark__390__at-rest.png | address-search | dark | 390 | at-rest | web-approximated | CRITIC #5 — dark quartet |
| base/feedback-modal__dark__390__at-rest.png | feedback-modal | dark | 390 | at-rest | web-approximated |  |
| base/changelog-modal__dark__390__at-rest.png | changelog-modal | dark | 390 | at-rest | web-approximated |  |
| base/myfeedback-modal__dark__390__at-rest.png | myfeedback-modal | dark | 390 | at-rest | web-approximated |  |
| glassmode/report__dark__390__clite.png | report | dark | 390 | clite | web-approximated | CRITIC #6 — sheet-in-dark C-lite |
| glassmode/legend__dark__390__clite.png | legend | dark | 390 | clite | web-approximated |  |
| base/onboarding__dark__390__slide3-consent.png | onboarding | dark | 390 | slide3-consent | web-approximated | CRITIC #7 — the consent moment in dark |
| base/onboarding__light__390__slide4-true.png | onboarding | light | 390 | slide4-true | web-approximated | CRITIC #7 — true slide 4 via the S19 Continue CTA (non-exact match) |
| base/onboarding__light__390__slide5-true.png | onboarding | light | 390 | slide5-true | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Maybe later').first()  |
| transitions/detail__light__390__rm-opening-t150.png | detail | light | 390 | rm-opening-t150 | web-approximated | CRITIC #8 — the S3 trust transition under RM |
| transitions/report__light__390__rm-closing-t150.png | report | light | 390 | rm-closing-t150 | web-approximated |  |
| transitions/drawer__light__390__rm-opening-t120.png | drawer | light | 390 | rm-opening-t120 | web-approximated |  |
| transitions/tabswitch__light__390__rm-t100.png | tabswitch | light | 390 | rm-t100 | web-approximated |  |
| transitions/nearby__light__390__open-settled.png | nearby | light | 390 | open-settled | web-approximated | CRITIC #9 — after-frames |
| transitions/legend__light__390__open-settled.png | legend | light | 390 | open-settled | web-approximated |  |
| transitions/detail__light__390__open-settled.png | detail | light | 390 | open-settled | web-approximated |  |
| transitions/tabswitch__light__390__t0-before.png | tabswitch | light | 390 | t0-before | web-approximated | CRITIC #9 — before/after pair proving the no-animation cut |
| transitions/tabswitch__light__390__t400-after.png | tabswitch | light | 390 | t400-after | web-approximated |  |
| a11y-tree/filter-open__light__390.txt | filter-open | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| a11y-tree/onboarding-slide3__light__390.txt | onboarding-slide3 | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| a11y-tree/help-modal__light__390.txt | help-modal | light | 390 | undefined | web-approximated | RN-web ARIA snapshot |
| states/map__dark__390__offline-refresh.png | map | dark | 390 | offline-refresh | web-approximated | CRITIC #11 |
| states/report__dark__390__ready-submit.png | report | dark | 390 | ready-submit | web-approximated | CRITIC #11 — submit-ENABLED boundary, dark; NEVER pressed |
| press/clear-all__light__390__rest.png | clear-all | light | 390 | rest | web-approximated | CRITIC #12 — the missing rest twin (Clear visible, unpressed) |
| press/report-severity__light__390__rm-pressed.png | report-severity | light | 390 | rm-pressed | web-approximated | critic THIN — the signature control pressed under RM |
| press/report-severity__dark__390__pressed.png | report-severity | dark | 390 | pressed | web-approximated |  |
| press/focus-map__light__390__tab4.png | focus-map | light | 390 | tab4 | web-approximated | critic THIN — focus-visible on map controls |
| base/onboarding__light__390__slide5-true.png | onboarding | light | 390 | slide5-true | web-approximated | CRITIC #7 — true slide 5; web permission slides advance via Continue (the Not-now/Maybe-later declines are NATIVE-ONLY by design, OnboardingCards.tsx:222) |

**Index hygiene corrections (from the completeness critique):**
| voice/empty-filters__light__390__crop.png | empty-filters | light | 390 | crop | web-approximated | SUPERSEDED — shows the min-sev-5 filtered-NOT-empty state; the real PROTECT-2 card crop is voice/empty-filters-true__light__390__crop.png |
| base/onboarding__light__390__slide4.png | onboarding | light | 390 | slide4 | web-approximated | SUPERSEDED by slide4-true — the clickOpt declines never fired (they are NATIVE-ONLY by design, OnboardingCards.tsx:222); this frame duplicates slide3-consent |
| base/onboarding__light__390__slide5.png | onboarding | light | 390 | slide5 | web-approximated | SUPERSEDED by slide5-true — same cause; web permission slides advance via Continue |
| press/tasks-verify__light__390__pressed.png | tasks-verify | light | 390 | pressed | web-approximated | NOTE RESOLVED: the held pointer was never released — RN Pressable fires onPress on RELEASE only, so no triage mutation was ever attempted; the zero-writes fence held (code-fact, Pressable semantics) |

*Hygiene note: every a11y-tree row's state column reads "undefined" — trees are stateless
snapshots; a harness cosmetic, not missing data. The completeness critique's "success-register
moment" suggestion is unreachable BY LAW (submit affordances fenced) — orientation §4.8.*

**COMPLETENESS CRITIQUE PASS — 2026-07-10.** All 12 top-up items executed (34 captures: signin +
resources both themes · dark quartet (address-search/feedback/changelog/myfeedback) · dark
C-lite report+legend · dark slide3-consent + true slide4/5 · RM transitions (detail/report-close/
drawer-open/tabswitch) · settled after-frames (nearby/legend/detail + tabswitch pair) · 3 new
a11y trees (filter-open/onboarding-slide3/help-modal) · dark offline-refresh + ready-submit ·
clear-all rest twin · severity-press RM + dark · focus-map) plus the two naming corrections above.
The one unexecutable item is the fenced success moment (§4.8).
VERIFY1 2026-07-10
expected=170 indexed=170 on-disk=170
missing=0 failed=0 orphan=0 unindexed=0

VERIFY1 PASS — 2026-07-10: 0 missing / 0 failed / 0 orphan; expected(170) == on-disk(match) == indexed

**Lens-stage evidence corrections (from F1's press census — wrong-element holds):**
| press/tasks-card__light__390__pressed.png | tasks-card | light | 390 | pressed | web-approximated | CORRECTION (F1): getByText first-match held the Tasks CATEGORY CHIP, not the card — what this frame proves is that the filter chips are press-dead; the card's own static pressed dim is code-read (TasksScreen.tsx:1597) |
| press/tasks-card__dark__390__pressed.png | tasks-card | dark | 390 | pressed | web-approximated | CORRECTION (F1): same wrong-element hold as the light twin |
| press/tasks-card__light__390__rm-pressed.png | tasks-card | light | 390 | rm-pressed | web-approximated | CORRECTION (F1): same wrong-element hold — R7/R4's "no feedback" reads on THIS frame describe the chip, not the card |
| press/tasks-verify__light__390__pressed.png | tasks-verify | light | 390 | pressed | web-approximated | CORRECTION (F1): held the static header subtitle "Verify and resolve reports", not the Verify button; Verify's press state is code-read (PressableScale via renderAction TasksScreen.tsx:1576) |
| annotated/F2-01__callout-under-chrome.png | map | light | 390 | annotated | web-approximated | F2-01 annotated evidence |
| annotated/F1-01__report-press-dead.png | report-severity | light | 390 | annotated | web-approximated | F1-01 annotated evidence |
| annotated/F1-02__pressablescale-whisper.png | map-zoomin | light | 390 | annotated | web-approximated | F1-02 annotated evidence |
| annotated/F1-04__focus-ring-unreached.png | focus-report | light | 390 | annotated | web-approximated | F1-04 annotated evidence |
| annotated/F2-02__home-headline-200.png | home | light | 390 | annotated | web-approximated | F2-02 annotated evidence |
| annotated/F2-03__liveregion-collision.png | app | light | 390 | annotated | web-approximated | F2-03 annotated evidence |
| annotated/F2-04__profile-void.png | profile-signedout | light | 390 | annotated | web-approximated | F2-04 annotated evidence |
| annotated/F3-01__drawer-void.png | drawer | light | 390 | annotated | web-approximated | F3-01 annotated evidence |
| annotated/F4-03__arrival-voice.png | map | light | 390 | annotated | web-approximated | F4-03 annotated evidence |
| annotated/F5-02__loading-emdash.png | app | light | 390 | annotated | web-approximated | F5-02 annotated evidence |
| annotated/F5-03__sf-default-region.png | map | light | 390 | annotated | web-approximated | F5-03 annotated evidence |
| annotated/F6-01__detail-grammar-quiet.png | flagdetail | light | 390 | annotated | web-approximated | F6-01 annotated evidence |
| annotated/F5-02__loading-emdash.png | home | light | 390 | annotated | web-approximated | F5-02 RE-SOURCED to states/home load-error (the first annotation pass used the map loading-cold frame by mistake — the em-dash headline + skeletons live on Home); this row supersedes the earlier F5-02 row |
| assets-note | map | light | 390 | permission-denied | web-approximated | F4-03 ANNOTATION CAVEAT: the banked light permission-denied frame contains NO denied banner (confirmed vs a11y-tree/denied-map txt) — the banner exists in voice/denied-banner crop; whether the arrival banner renders-then-clears or requires a state this reach missed is an open question fed to Part 2/3 (S4 regression-watch adjacent) |
VERIFY1 2026-07-10
expected=170 indexed=183 on-disk=182
missing=0 failed=0 orphan=0 unindexed=0

VERIFY1 PASS — 2026-07-10: 0 missing / 0 failed / 0 orphan; expected(170) == on-disk(match) == indexed
