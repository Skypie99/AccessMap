# Fable Audit — AccessMap — Part 1 render index

One row per banked capture, appended the moment it lands (last row per filename wins).
Groups live under `assets/<group>/`. Tags: `web-approximated` (default — expo web in
Chromium; RN-web ≠ iOS/Android) · `code-inferred` · `test-inferred` · `arbiter-measured` ·
`lab-mockup` · `NEEDS-SKY-DEVICE` · `FAILED` (capture error — superseded by any later
success row for the same filename).

| file | screen | theme | width | state | tag | note |
|---|---|---|---|---|---|---|
| base/home__light__375__at-rest.png | home | light | 375 | at-rest | web-approximated |  |
| base/home__light__390__at-rest.png | home | light | 390 | at-rest | web-approximated |  |
| base/home__light__430__at-rest.png | home | light | 430 | at-rest | web-approximated |  |
| base/home__light__834__at-rest.png | home | light | 834 | at-rest | web-approximated |  |
| flows/report__light__375__ready-submit.png | report | light | 375 | ready-submit | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Report a flag here').first()  |
| flows/report__light__390__ready-submit.png | report | light | 390 | ready-submit | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Report a flag here').first()  |
| flows/report__light__430__ready-submit.png | report | light | 430 | ready-submit | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Report a flag here').first()  |
| flows/report__light__834__ready-submit.png | report | light | 834 | ready-submit | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Report a flag here').first()  |
| flows/map__light__375__pin-callout.png | map | light | 375 | pin-callout | FAILED | locator.click: Timeout 30000ms exceeded. Call log:   - waiting for locator('.accessmap-pin').first()     - locator resolved to <div tabindex |
| flows/map__light__390__pin-callout.png | map | light | 390 | pin-callout | FAILED | locator.click: Timeout 30000ms exceeded. Call log:   - waiting for locator('.accessmap-pin').first()     - locator resolved to <div tabindex |
| flows/map__light__430__pin-callout.png | map | light | 430 | pin-callout | FAILED | locator.click: Timeout 30000ms exceeded. Call log:   - waiting for locator('.accessmap-pin').first()     - locator resolved to <div tabindex |
| flows/map__light__834__pin-callout.png | map | light | 834 | pin-callout | FAILED | locator.click: Timeout 30000ms exceeded. Call log:   - waiting for locator('.accessmap-pin').first()     - locator resolved to <div tabindex |
| flows/report__light__375__ready-submit.png | report | light | 375 | ready-submit | web-approximated | ENABLED submit affordance visible — NEVER pressed (audit boundary); no file chooser fired — captured trigger state |
| flows/report__light__390__ready-submit.png | report | light | 390 | ready-submit | web-approximated | ENABLED submit affordance visible — NEVER pressed (audit boundary); no file chooser fired — captured trigger state |
| flows/report__light__430__ready-submit.png | report | light | 430 | ready-submit | web-approximated | ENABLED submit affordance visible — NEVER pressed (audit boundary); no file chooser fired — captured trigger state |
| flows/report__light__834__ready-submit.png | report | light | 834 | ready-submit | web-approximated | ENABLED submit affordance visible — NEVER pressed (audit boundary); no file chooser fired — captured trigger state |
| flows/map__light__375__pin-callout.png | map | light | 375 | pin-callout | web-approximated | expands a cluster first if needed |
| flows/map__light__390__pin-callout.png | map | light | 390 | pin-callout | web-approximated | expands a cluster first if needed |
| flows/map__light__430__pin-callout.png | map | light | 430 | pin-callout | web-approximated | expands a cluster first if needed |
| flows/map__light__834__pin-callout.png | map | light | 834 | pin-callout | web-approximated | expands a cluster first if needed |
| flows/map__light__375__pin-callout.png | map | light | 375 | pin-callout | web-approximated | expands a cluster first if needed |
| flows/map__light__390__pin-callout.png | map | light | 390 | pin-callout | web-approximated | expands a cluster first if needed |
| flows/map__light__430__pin-callout.png | map | light | 430 | pin-callout | web-approximated | expands a cluster first if needed |
| flows/map__light__834__pin-callout.png | map | light | 834 | pin-callout | web-approximated | expands a cluster first if needed |
| base/map__light__375__at-rest.png | map | light | 375 | at-rest | web-approximated | tiles = CartoDB dark_all always on web; nearby-list auto-open closed first (see map first-arrival state) |
| base/map__light__390__at-rest.png | map | light | 390 | at-rest | web-approximated | tiles = CartoDB dark_all always on web; nearby-list auto-open closed first (see map first-arrival state) |
| base/map__light__430__at-rest.png | map | light | 430 | at-rest | web-approximated | tiles = CartoDB dark_all always on web; nearby-list auto-open closed first (see map first-arrival state) |
| base/map__light__834__at-rest.png | map | light | 834 | at-rest | web-approximated | tiles = CartoDB dark_all always on web; nearby-list auto-open closed first (see map first-arrival state) |
| base/map__light__375__first-arrival-auto-list.png | map | light | 375 | first-arrival-auto-list | web-approximated | PROBED: RN-web reports screen-reader=true for ALL web users → NearbyFlagsModal auto-opens over the map on every web arrival (MapScreen.tsx:355) |
| base/map__light__390__first-arrival-auto-list.png | map | light | 390 | first-arrival-auto-list | web-approximated | PROBED: RN-web reports screen-reader=true for ALL web users → NearbyFlagsModal auto-opens over the map on every web arrival (MapScreen.tsx:355) |
| base/map__light__430__first-arrival-auto-list.png | map | light | 430 | first-arrival-auto-list | web-approximated | PROBED: RN-web reports screen-reader=true for ALL web users → NearbyFlagsModal auto-opens over the map on every web arrival (MapScreen.tsx:355) |
| base/map__light__834__first-arrival-auto-list.png | map | light | 834 | first-arrival-auto-list | web-approximated | PROBED: RN-web reports screen-reader=true for ALL web users → NearbyFlagsModal auto-opens over the map on every web arrival (MapScreen.tsx:355) |
| base/map__dark__375__at-rest.png | map | dark | 375 | at-rest | web-approximated | tiles = CartoDB dark_all always on web; nearby-list auto-open closed first (see map first-arrival state) |
| base/map__dark__390__at-rest.png | map | dark | 390 | at-rest | web-approximated | tiles = CartoDB dark_all always on web; nearby-list auto-open closed first (see map first-arrival state) |
| base/map__dark__430__at-rest.png | map | dark | 430 | at-rest | web-approximated | tiles = CartoDB dark_all always on web; nearby-list auto-open closed first (see map first-arrival state) |
| base/map__dark__834__at-rest.png | map | dark | 834 | at-rest | web-approximated | tiles = CartoDB dark_all always on web; nearby-list auto-open closed first (see map first-arrival state) |
| base/map__dark__375__first-arrival-auto-list.png | map | dark | 375 | first-arrival-auto-list | web-approximated | PROBED: RN-web reports screen-reader=true for ALL web users → NearbyFlagsModal auto-opens over the map on every web arrival (MapScreen.tsx:355) |
| base/map__dark__390__first-arrival-auto-list.png | map | dark | 390 | first-arrival-auto-list | web-approximated | PROBED: RN-web reports screen-reader=true for ALL web users → NearbyFlagsModal auto-opens over the map on every web arrival (MapScreen.tsx:355) |
| base/map__dark__430__first-arrival-auto-list.png | map | dark | 430 | first-arrival-auto-list | web-approximated | PROBED: RN-web reports screen-reader=true for ALL web users → NearbyFlagsModal auto-opens over the map on every web arrival (MapScreen.tsx:355) |
| base/map__dark__834__first-arrival-auto-list.png | map | dark | 834 | first-arrival-auto-list | web-approximated | PROBED: RN-web reports screen-reader=true for ALL web users → NearbyFlagsModal auto-opens over the map on every web arrival (MapScreen.tsx:355) |
| base/tasks__light__375__at-rest.png | tasks | light | 375 | at-rest | web-approximated |  |
| base/tasks__light__390__at-rest.png | tasks | light | 390 | at-rest | web-approximated |  |
| base/tasks__light__430__at-rest.png | tasks | light | 430 | at-rest | web-approximated |  |
| base/tasks__light__834__at-rest.png | tasks | light | 834 | at-rest | web-approximated |  |
| base/profile-signedout__light__375__at-rest.png | profile-signedout | light | 375 | at-rest | web-approximated | web guest = the signed-out Profile branch (ProfileScreen.tsx:812) |
| base/profile-signedout__light__390__at-rest.png | profile-signedout | light | 390 | at-rest | web-approximated | web guest = the signed-out Profile branch (ProfileScreen.tsx:812) |
| base/profile-signedout__light__430__at-rest.png | profile-signedout | light | 430 | at-rest | web-approximated | web guest = the signed-out Profile branch (ProfileScreen.tsx:812) |
| base/profile-signedout__light__834__at-rest.png | profile-signedout | light | 834 | at-rest | web-approximated | web guest = the signed-out Profile branch (ProfileScreen.tsx:812) |
| base/drawer-open__light__375__at-rest.png | drawer-open | light | 375 | at-rest | web-approximated |  |
| base/drawer-open__light__390__at-rest.png | drawer-open | light | 390 | at-rest | web-approximated |  |
| base/drawer-open__light__430__at-rest.png | drawer-open | light | 430 | at-rest | web-approximated |  |
| base/drawer-open__light__834__at-rest.png | drawer-open | light | 834 | at-rest | web-approximated |  |
| base/settings__light__375__at-rest.png | settings | light | 375 | at-rest | web-approximated |  |
| base/settings__light__390__at-rest.png | settings | light | 390 | at-rest | web-approximated |  |
| base/settings__light__430__at-rest.png | settings | light | 430 | at-rest | web-approximated |  |
| base/settings__light__834__at-rest.png | settings | light | 834 | at-rest | web-approximated |  |
| base/about__light__375__at-rest.png | about | light | 375 | at-rest | web-approximated |  |
| base/about__light__390__at-rest.png | about | light | 390 | at-rest | web-approximated |  |
| base/about__light__430__at-rest.png | about | light | 430 | at-rest | web-approximated |  |
| base/about__light__834__at-rest.png | about | light | 834 | at-rest | web-approximated |  |
| base/howtohelp__light__375__at-rest.png | howtohelp | light | 375 | at-rest | web-approximated |  |
| base/howtohelp__light__390__at-rest.png | howtohelp | light | 390 | at-rest | web-approximated |  |
| base/howtohelp__light__430__at-rest.png | howtohelp | light | 430 | at-rest | web-approximated |  |
| base/howtohelp__light__834__at-rest.png | howtohelp | light | 834 | at-rest | web-approximated |  |
| base/resources__light__375__at-rest.png | resources | light | 375 | at-rest | web-approximated |  |
| base/resources__light__390__at-rest.png | resources | light | 390 | at-rest | web-approximated |  |
| base/resources__light__430__at-rest.png | resources | light | 430 | at-rest | web-approximated |  |
| base/resources__light__834__at-rest.png | resources | light | 834 | at-rest | web-approximated |  |
| base/signin-modal__light__375__at-rest.png | signin-modal | light | 375 | at-rest | web-approximated | modal variant — no guest affordance by design (onClose only) |
| base/signin-modal__light__390__at-rest.png | signin-modal | light | 390 | at-rest | web-approximated | modal variant — no guest affordance by design (onClose only) |
| base/signin-modal__light__430__at-rest.png | signin-modal | light | 430 | at-rest | web-approximated | modal variant — no guest affordance by design (onClose only) |
| base/signin-modal__light__834__at-rest.png | signin-modal | light | 834 | at-rest | web-approximated | modal variant — no guest affordance by design (onClose only) |
| base/feedback-modal__light__375__at-rest.png | feedback-modal | light | 375 | at-rest | web-approximated |  |
| base/feedback-modal__light__390__at-rest.png | feedback-modal | light | 390 | at-rest | web-approximated |  |
| base/feedback-modal__light__430__at-rest.png | feedback-modal | light | 430 | at-rest | web-approximated |  |
| base/feedback-modal__light__834__at-rest.png | feedback-modal | light | 834 | at-rest | web-approximated |  |
| base/help-modal__light__375__at-rest.png | help-modal | light | 375 | at-rest | web-approximated |  |
| base/help-modal__light__390__at-rest.png | help-modal | light | 390 | at-rest | web-approximated |  |
| base/help-modal__light__430__at-rest.png | help-modal | light | 430 | at-rest | web-approximated |  |
| base/help-modal__light__834__at-rest.png | help-modal | light | 834 | at-rest | web-approximated |  |
| base/changelog-modal__light__375__at-rest.png | changelog-modal | light | 375 | at-rest | web-approximated |  |
| base/changelog-modal__light__390__at-rest.png | changelog-modal | light | 390 | at-rest | web-approximated |  |
| base/changelog-modal__light__430__at-rest.png | changelog-modal | light | 430 | at-rest | web-approximated |  |
| base/changelog-modal__light__834__at-rest.png | changelog-modal | light | 834 | at-rest | web-approximated |  |
| base/myfeedback-modal__light__375__at-rest.png | myfeedback-modal | light | 375 | at-rest | web-approximated |  |
| base/myfeedback-modal__light__390__at-rest.png | myfeedback-modal | light | 390 | at-rest | web-approximated |  |
| base/myfeedback-modal__light__430__at-rest.png | myfeedback-modal | light | 430 | at-rest | web-approximated |  |
| base/myfeedback-modal__light__834__at-rest.png | myfeedback-modal | light | 834 | at-rest | web-approximated |  |
| base/onboarding-replay__light__375__at-rest.png | onboarding-replay | light | 375 | at-rest | web-approximated | screens/OnboardingModal.tsx — the 3-card post-sign-in intro via Settings replay |
| base/onboarding-replay__light__390__at-rest.png | onboarding-replay | light | 390 | at-rest | web-approximated | screens/OnboardingModal.tsx — the 3-card post-sign-in intro via Settings replay |
| base/onboarding-replay__light__430__at-rest.png | onboarding-replay | light | 430 | at-rest | web-approximated | screens/OnboardingModal.tsx — the 3-card post-sign-in intro via Settings replay |
| base/onboarding-replay__light__834__at-rest.png | onboarding-replay | light | 834 | at-rest | web-approximated | screens/OnboardingModal.tsx — the 3-card post-sign-in intro via Settings replay |
| base/home__dark__375__at-rest.png | home | dark | 375 | at-rest | web-approximated |  |
| base/home__dark__390__at-rest.png | home | dark | 390 | at-rest | web-approximated |  |
| base/home__dark__430__at-rest.png | home | dark | 430 | at-rest | web-approximated |  |
| base/home__dark__834__at-rest.png | home | dark | 834 | at-rest | web-approximated |  |
| base/tasks__dark__375__at-rest.png | tasks | dark | 375 | at-rest | web-approximated |  |
| base/tasks__dark__390__at-rest.png | tasks | dark | 390 | at-rest | web-approximated |  |
| base/tasks__dark__430__at-rest.png | tasks | dark | 430 | at-rest | web-approximated |  |
| base/tasks__dark__834__at-rest.png | tasks | dark | 834 | at-rest | web-approximated |  |
| base/profile-signedout__dark__375__at-rest.png | profile-signedout | dark | 375 | at-rest | web-approximated | web guest = the signed-out Profile branch (ProfileScreen.tsx:812) |
| base/profile-signedout__dark__390__at-rest.png | profile-signedout | dark | 390 | at-rest | web-approximated | web guest = the signed-out Profile branch (ProfileScreen.tsx:812) |
| base/profile-signedout__dark__430__at-rest.png | profile-signedout | dark | 430 | at-rest | web-approximated | web guest = the signed-out Profile branch (ProfileScreen.tsx:812) |
| base/profile-signedout__dark__834__at-rest.png | profile-signedout | dark | 834 | at-rest | web-approximated | web guest = the signed-out Profile branch (ProfileScreen.tsx:812) |
| base/drawer-open__dark__375__at-rest.png | drawer-open | dark | 375 | at-rest | web-approximated |  |
| base/drawer-open__dark__390__at-rest.png | drawer-open | dark | 390 | at-rest | web-approximated |  |
| base/drawer-open__dark__430__at-rest.png | drawer-open | dark | 430 | at-rest | web-approximated |  |
| base/drawer-open__dark__834__at-rest.png | drawer-open | dark | 834 | at-rest | web-approximated |  |
| base/settings__dark__375__at-rest.png | settings | dark | 375 | at-rest | web-approximated |  |
| base/settings__dark__390__at-rest.png | settings | dark | 390 | at-rest | web-approximated |  |
| base/settings__dark__430__at-rest.png | settings | dark | 430 | at-rest | web-approximated |  |
| base/settings__dark__834__at-rest.png | settings | dark | 834 | at-rest | web-approximated |  |
| base/about__dark__375__at-rest.png | about | dark | 375 | at-rest | web-approximated |  |
| base/about__dark__390__at-rest.png | about | dark | 390 | at-rest | web-approximated |  |
| base/about__dark__430__at-rest.png | about | dark | 430 | at-rest | web-approximated |  |
| base/about__dark__834__at-rest.png | about | dark | 834 | at-rest | web-approximated |  |
| base/howtohelp__dark__375__at-rest.png | howtohelp | dark | 375 | at-rest | web-approximated |  |
| base/howtohelp__dark__390__at-rest.png | howtohelp | dark | 390 | at-rest | web-approximated |  |
| base/howtohelp__dark__430__at-rest.png | howtohelp | dark | 430 | at-rest | web-approximated |  |
| base/howtohelp__dark__834__at-rest.png | howtohelp | dark | 834 | at-rest | web-approximated |  |
| base/resources__dark__375__at-rest.png | resources | dark | 375 | at-rest | web-approximated |  |
| base/resources__dark__390__at-rest.png | resources | dark | 390 | at-rest | web-approximated |  |
| base/resources__dark__430__at-rest.png | resources | dark | 430 | at-rest | web-approximated |  |
| base/resources__dark__834__at-rest.png | resources | dark | 834 | at-rest | web-approximated |  |
| base/signin-modal__dark__375__at-rest.png | signin-modal | dark | 375 | at-rest | web-approximated | modal variant — no guest affordance by design (onClose only) |
| base/signin-modal__dark__390__at-rest.png | signin-modal | dark | 390 | at-rest | web-approximated | modal variant — no guest affordance by design (onClose only) |
| base/signin-modal__dark__430__at-rest.png | signin-modal | dark | 430 | at-rest | web-approximated | modal variant — no guest affordance by design (onClose only) |
| base/signin-modal__dark__834__at-rest.png | signin-modal | dark | 834 | at-rest | web-approximated | modal variant — no guest affordance by design (onClose only) |
| base/feedback-modal__dark__375__at-rest.png | feedback-modal | dark | 375 | at-rest | web-approximated |  |
| base/feedback-modal__dark__390__at-rest.png | feedback-modal | dark | 390 | at-rest | web-approximated |  |
| base/feedback-modal__dark__430__at-rest.png | feedback-modal | dark | 430 | at-rest | web-approximated |  |
| base/feedback-modal__dark__834__at-rest.png | feedback-modal | dark | 834 | at-rest | web-approximated |  |
| base/help-modal__dark__375__at-rest.png | help-modal | dark | 375 | at-rest | web-approximated |  |
| base/help-modal__dark__390__at-rest.png | help-modal | dark | 390 | at-rest | web-approximated |  |
| base/help-modal__dark__430__at-rest.png | help-modal | dark | 430 | at-rest | web-approximated |  |
| base/help-modal__dark__834__at-rest.png | help-modal | dark | 834 | at-rest | web-approximated |  |
| base/changelog-modal__dark__375__at-rest.png | changelog-modal | dark | 375 | at-rest | web-approximated |  |
| base/changelog-modal__dark__390__at-rest.png | changelog-modal | dark | 390 | at-rest | web-approximated |  |
| base/changelog-modal__dark__430__at-rest.png | changelog-modal | dark | 430 | at-rest | web-approximated |  |
| base/changelog-modal__dark__834__at-rest.png | changelog-modal | dark | 834 | at-rest | web-approximated |  |
| base/myfeedback-modal__dark__375__at-rest.png | myfeedback-modal | dark | 375 | at-rest | web-approximated |  |
| base/myfeedback-modal__dark__390__at-rest.png | myfeedback-modal | dark | 390 | at-rest | web-approximated |  |
| base/myfeedback-modal__dark__430__at-rest.png | myfeedback-modal | dark | 430 | at-rest | web-approximated |  |
| base/myfeedback-modal__dark__834__at-rest.png | myfeedback-modal | dark | 834 | at-rest | web-approximated |  |
| base/onboarding-replay__dark__375__at-rest.png | onboarding-replay | dark | 375 | at-rest | web-approximated | screens/OnboardingModal.tsx — the 3-card post-sign-in intro via Settings replay |
| base/onboarding-replay__dark__390__at-rest.png | onboarding-replay | dark | 390 | at-rest | web-approximated | screens/OnboardingModal.tsx — the 3-card post-sign-in intro via Settings replay |
| base/onboarding-replay__dark__430__at-rest.png | onboarding-replay | dark | 430 | at-rest | web-approximated | screens/OnboardingModal.tsx — the 3-card post-sign-in intro via Settings replay |
| base/onboarding-replay__dark__834__at-rest.png | onboarding-replay | dark | 834 | at-rest | web-approximated | screens/OnboardingModal.tsx — the 3-card post-sign-in intro via Settings replay |
| flows/map__light__375__filter-open.png | map | light | 375 | filter-open | web-approximated |  |
| flows/map__light__390__filter-open.png | map | light | 390 | filter-open | web-approximated |  |
| flows/map__light__430__filter-open.png | map | light | 430 | filter-open | web-approximated |  |
| flows/map__light__834__filter-open.png | map | light | 834 | filter-open | web-approximated |  |
| flows/map__light__375__filter-active.png | map | light | 375 | filter-active | web-approximated |  |
| flows/map__light__390__filter-active.png | map | light | 390 | filter-active | web-approximated |  |
| flows/map__light__430__filter-active.png | map | light | 430 | filter-active | web-approximated |  |
| flows/map__light__834__filter-active.png | map | light | 834 | filter-active | web-approximated |  |
| flows/map__light__375__nearby-modal.png | map | light | 375 | nearby-modal | web-approximated |  |
| flows/map__light__390__nearby-modal.png | map | light | 390 | nearby-modal | web-approximated |  |
| flows/map__light__430__nearby-modal.png | map | light | 430 | nearby-modal | web-approximated |  |
| flows/map__light__834__nearby-modal.png | map | light | 834 | nearby-modal | web-approximated |  |
| flows/map__light__375__legend-modal.png | map | light | 375 | legend-modal | web-approximated |  |
| flows/map__light__390__legend-modal.png | map | light | 390 | legend-modal | web-approximated |  |
| flows/map__light__430__legend-modal.png | map | light | 430 | legend-modal | web-approximated |  |
| flows/map__light__834__legend-modal.png | map | light | 834 | legend-modal | web-approximated |  |
| flows/map__light__375__saved-places-modal.png | map | light | 375 | saved-places-modal | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Save a place').first()  |
| flows/map__light__390__saved-places-modal.png | map | light | 390 | saved-places-modal | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Save a place').first()  |
| flows/map__light__430__saved-places-modal.png | map | light | 430 | saved-places-modal | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Save a place').first()  |
| flows/map__light__834__saved-places-modal.png | map | light | 834 | saved-places-modal | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Save a place').first()  |
| flows/map__light__375__address-search.png | map | light | 375 | address-search | web-approximated |  |
| flows/map__light__390__address-search.png | map | light | 390 | address-search | web-approximated |  |
| flows/map__light__430__address-search.png | map | light | 430 | address-search | web-approximated |  |
| flows/map__light__834__address-search.png | map | light | 834 | address-search | web-approximated |  |
| flows/report__light__375__open.png | report | light | 375 | open | web-approximated | guest ⇒ "Report anonymously" + anon banner |
| flows/report__light__390__open.png | report | light | 390 | open | web-approximated | guest ⇒ "Report anonymously" + anon banner |
| flows/report__light__430__open.png | report | light | 430 | open | web-approximated | guest ⇒ "Report anonymously" + anon banner |
| flows/report__light__834__open.png | report | light | 834 | open | web-approximated | guest ⇒ "Report anonymously" + anon banner |
| flows/report__light__375__category-chosen.png | report | light | 375 | category-chosen | web-approximated |  |
| flows/report__light__390__category-chosen.png | report | light | 390 | category-chosen | web-approximated |  |
| flows/report__light__430__category-chosen.png | report | light | 430 | category-chosen | web-approximated |  |
| flows/report__light__834__category-chosen.png | report | light | 834 | category-chosen | web-approximated |  |
| flows/report__light__375__severity-chosen.png | report | light | 375 | severity-chosen | web-approximated |  |
| flows/report__light__390__severity-chosen.png | report | light | 390 | severity-chosen | web-approximated |  |
| flows/report__light__430__severity-chosen.png | report | light | 430 | severity-chosen | web-approximated |  |
| flows/report__light__834__severity-chosen.png | report | light | 834 | severity-chosen | web-approximated |  |
| flows/report__light__375__description-filled.png | report | light | 375 | description-filled | web-approximated | neutral audit text |
| flows/report__light__390__description-filled.png | report | light | 390 | description-filled | web-approximated | neutral audit text |
| flows/report__light__430__description-filled.png | report | light | 430 | description-filled | web-approximated | neutral audit text |
| flows/report__light__834__description-filled.png | report | light | 834 | description-filled | web-approximated | neutral audit text |
| flows/report__light__375__photo-step.png | report | light | 375 | photo-step | web-approximated | neutral generated PNG via file chooser, or trigger state; no file chooser fired — captured trigger state |
| flows/report__light__390__photo-step.png | report | light | 390 | photo-step | web-approximated | neutral generated PNG via file chooser, or trigger state; no file chooser fired — captured trigger state |
| flows/report__light__430__photo-step.png | report | light | 430 | photo-step | web-approximated | neutral generated PNG via file chooser, or trigger state; no file chooser fired — captured trigger state |
| flows/report__light__834__photo-step.png | report | light | 834 | photo-step | web-approximated | neutral generated PNG via file chooser, or trigger state; no file chooser fired — captured trigger state |
| flows/map__dark__375__filter-open.png | map | dark | 375 | filter-open | web-approximated |  |
| flows/map__dark__390__filter-open.png | map | dark | 390 | filter-open | web-approximated |  |
| flows/map__dark__430__filter-open.png | map | dark | 430 | filter-open | web-approximated |  |
| flows/map__dark__834__filter-open.png | map | dark | 834 | filter-open | web-approximated |  |
| flows/map__dark__375__filter-active.png | map | dark | 375 | filter-active | web-approximated |  |
| flows/map__dark__390__filter-active.png | map | dark | 390 | filter-active | web-approximated |  |
| flows/map__dark__430__filter-active.png | map | dark | 430 | filter-active | web-approximated |  |
| flows/map__dark__834__filter-active.png | map | dark | 834 | filter-active | web-approximated |  |
| flows/map__dark__375__pin-callout.png | map | dark | 375 | pin-callout | web-approximated | expands a cluster first if needed |
| flows/map__dark__390__pin-callout.png | map | dark | 390 | pin-callout | web-approximated | expands a cluster first if needed |
| flows/map__dark__430__pin-callout.png | map | dark | 430 | pin-callout | web-approximated | expands a cluster first if needed |
| flows/map__dark__834__pin-callout.png | map | dark | 834 | pin-callout | web-approximated | expands a cluster first if needed |
| flows/map__dark__375__nearby-modal.png | map | dark | 375 | nearby-modal | web-approximated |  |
| flows/map__dark__390__nearby-modal.png | map | dark | 390 | nearby-modal | web-approximated |  |
| flows/map__dark__430__nearby-modal.png | map | dark | 430 | nearby-modal | web-approximated |  |
| flows/map__dark__834__nearby-modal.png | map | dark | 834 | nearby-modal | web-approximated |  |
| flows/map__dark__375__legend-modal.png | map | dark | 375 | legend-modal | web-approximated |  |
| flows/map__dark__390__legend-modal.png | map | dark | 390 | legend-modal | web-approximated |  |
| flows/map__dark__430__legend-modal.png | map | dark | 430 | legend-modal | web-approximated |  |
| flows/map__dark__834__legend-modal.png | map | dark | 834 | legend-modal | web-approximated |  |
| flows/map__dark__375__saved-places-modal.png | map | dark | 375 | saved-places-modal | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Save a place').first()  |
| flows/map__dark__390__saved-places-modal.png | map | dark | 390 | saved-places-modal | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Save a place').first()  |
| flows/map__dark__430__saved-places-modal.png | map | dark | 430 | saved-places-modal | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Save a place').first()  |
| flows/map__dark__834__saved-places-modal.png | map | dark | 834 | saved-places-modal | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByLabel('Save a place').first()  |
| flows/map__dark__375__address-search.png | map | dark | 375 | address-search | web-approximated |  |
| flows/map__dark__390__address-search.png | map | dark | 390 | address-search | web-approximated |  |
| flows/map__dark__430__address-search.png | map | dark | 430 | address-search | web-approximated |  |
| flows/map__dark__834__address-search.png | map | dark | 834 | address-search | web-approximated |  |
| flows/report__dark__375__open.png | report | dark | 375 | open | web-approximated | guest ⇒ "Report anonymously" + anon banner |
| flows/report__dark__390__open.png | report | dark | 390 | open | web-approximated | guest ⇒ "Report anonymously" + anon banner |
| flows/report__dark__430__open.png | report | dark | 430 | open | web-approximated | guest ⇒ "Report anonymously" + anon banner |
| flows/report__dark__834__open.png | report | dark | 834 | open | web-approximated | guest ⇒ "Report anonymously" + anon banner |
| flows/report__dark__375__category-chosen.png | report | dark | 375 | category-chosen | web-approximated |  |
| flows/report__dark__390__category-chosen.png | report | dark | 390 | category-chosen | web-approximated |  |
| flows/report__dark__430__category-chosen.png | report | dark | 430 | category-chosen | web-approximated |  |
| flows/report__dark__834__category-chosen.png | report | dark | 834 | category-chosen | web-approximated |  |
| flows/report__dark__375__severity-chosen.png | report | dark | 375 | severity-chosen | web-approximated |  |
| flows/report__dark__390__severity-chosen.png | report | dark | 390 | severity-chosen | web-approximated |  |
| flows/report__dark__430__severity-chosen.png | report | dark | 430 | severity-chosen | web-approximated |  |
| flows/report__dark__834__severity-chosen.png | report | dark | 834 | severity-chosen | web-approximated |  |
| flows/report__dark__375__description-filled.png | report | dark | 375 | description-filled | web-approximated | neutral audit text |
| flows/report__dark__390__description-filled.png | report | dark | 390 | description-filled | web-approximated | neutral audit text |
| flows/report__dark__430__description-filled.png | report | dark | 430 | description-filled | web-approximated | neutral audit text |
| flows/report__dark__834__description-filled.png | report | dark | 834 | description-filled | web-approximated | neutral audit text |
| flows/report__dark__375__photo-step.png | report | dark | 375 | photo-step | web-approximated | neutral generated PNG via file chooser, or trigger state; no file chooser fired — captured trigger state |
| flows/report__dark__390__photo-step.png | report | dark | 390 | photo-step | web-approximated | neutral generated PNG via file chooser, or trigger state; no file chooser fired — captured trigger state |
| flows/report__dark__430__photo-step.png | report | dark | 430 | photo-step | web-approximated | neutral generated PNG via file chooser, or trigger state; no file chooser fired — captured trigger state |
| flows/report__dark__834__photo-step.png | report | dark | 834 | photo-step | web-approximated | neutral generated PNG via file chooser, or trigger state; no file chooser fired — captured trigger state |
| flows/report__dark__375__ready-submit.png | report | dark | 375 | ready-submit | web-approximated | ENABLED submit affordance visible — NEVER pressed (audit boundary); no file chooser fired — captured trigger state |
| flows/report__dark__390__ready-submit.png | report | dark | 390 | ready-submit | web-approximated | ENABLED submit affordance visible — NEVER pressed (audit boundary); no file chooser fired — captured trigger state |
| flows/report__dark__430__ready-submit.png | report | dark | 430 | ready-submit | web-approximated | ENABLED submit affordance visible — NEVER pressed (audit boundary); no file chooser fired — captured trigger state |
| flows/report__dark__834__ready-submit.png | report | dark | 834 | ready-submit | web-approximated | ENABLED submit affordance visible — NEVER pressed (audit boundary); no file chooser fired — captured trigger state |
| flows/onboarding__light__375__slide1-welcome.png | onboarding | light | 375 | slide1-welcome | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__390__slide1-welcome.png | onboarding | light | 390 | slide1-welcome | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__430__slide1-welcome.png | onboarding | light | 430 | slide1-welcome | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__834__slide1-welcome.png | onboarding | light | 834 | slide1-welcome | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__375__slide2-how-it-works.png | onboarding | light | 375 | slide2-how-it-works | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__390__slide2-how-it-works.png | onboarding | light | 390 | slide2-how-it-works | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__430__slide2-how-it-works.png | onboarding | light | 430 | slide2-how-it-works | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__834__slide2-how-it-works.png | onboarding | light | 834 | slide2-how-it-works | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__375__slide3-location.png | onboarding | light | 375 | slide3-location | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__390__slide3-location.png | onboarding | light | 390 | slide3-location | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__430__slide3-location.png | onboarding | light | 430 | slide3-location | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__834__slide3-location.png | onboarding | light | 834 | slide3-location | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__375__slide4-notifications.png | onboarding | light | 375 | slide4-notifications | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__390__slide4-notifications.png | onboarding | light | 390 | slide4-notifications | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__430__slide4-notifications.png | onboarding | light | 430 | slide4-notifications | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__834__slide4-notifications.png | onboarding | light | 834 | slide4-notifications | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__375__slide5-ready.png | onboarding | light | 375 | slide5-ready | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__390__slide5-ready.png | onboarding | light | 390 | slide5-ready | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__430__slide5-ready.png | onboarding | light | 430 | slide5-ready | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__light__834__slide5-ready.png | onboarding | light | 834 | slide5-ready | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__375__slide1-welcome.png | onboarding | dark | 375 | slide1-welcome | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__390__slide1-welcome.png | onboarding | dark | 390 | slide1-welcome | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__430__slide1-welcome.png | onboarding | dark | 430 | slide1-welcome | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__834__slide1-welcome.png | onboarding | dark | 834 | slide1-welcome | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__375__slide2-how-it-works.png | onboarding | dark | 375 | slide2-how-it-works | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__390__slide2-how-it-works.png | onboarding | dark | 390 | slide2-how-it-works | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__430__slide2-how-it-works.png | onboarding | dark | 430 | slide2-how-it-works | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__834__slide2-how-it-works.png | onboarding | dark | 834 | slide2-how-it-works | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__375__slide3-location.png | onboarding | dark | 375 | slide3-location | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__390__slide3-location.png | onboarding | dark | 390 | slide3-location | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__430__slide3-location.png | onboarding | dark | 430 | slide3-location | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__834__slide3-location.png | onboarding | dark | 834 | slide3-location | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__375__slide4-notifications.png | onboarding | dark | 375 | slide4-notifications | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__390__slide4-notifications.png | onboarding | dark | 390 | slide4-notifications | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__430__slide4-notifications.png | onboarding | dark | 430 | slide4-notifications | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__834__slide4-notifications.png | onboarding | dark | 834 | slide4-notifications | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__375__slide5-ready.png | onboarding | dark | 375 | slide5-ready | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__390__slide5-ready.png | onboarding | dark | 390 | slide5-ready | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__430__slide5-ready.png | onboarding | dark | 430 | slide5-ready | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| flows/onboarding__dark__834__slide5-ready.png | onboarding | dark | 834 | slide5-ready | web-approximated | first-launch carousel (components/OnboardingCards.tsx); forced-dark gradient by design |
| states/tasks__light__375__mid-scroll.png | tasks | light | 375 | mid-scroll | web-approximated | frost-under-chrome moment |
| states/tasks__light__390__mid-scroll.png | tasks | light | 390 | mid-scroll | web-approximated | frost-under-chrome moment |
| states/tasks__light__430__mid-scroll.png | tasks | light | 430 | mid-scroll | web-approximated | frost-under-chrome moment |
| states/tasks__light__834__mid-scroll.png | tasks | light | 834 | mid-scroll | web-approximated | frost-under-chrome moment |
| states/tasks__light__375__empty-search.png | tasks | light | 375 | empty-search | web-approximated |  |
| states/tasks__light__390__empty-search.png | tasks | light | 390 | empty-search | web-approximated |  |
| states/tasks__light__430__empty-search.png | tasks | light | 430 | empty-search | web-approximated |  |
| states/tasks__light__834__empty-search.png | tasks | light | 834 | empty-search | web-approximated |  |
| states/tasks__light__375__select-bulk.png | tasks | light | 375 | select-bulk | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Blocked path').first()     - locator resolved to <div dir="aut |
| states/tasks__light__390__select-bulk.png | tasks | light | 390 | select-bulk | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Blocked path').first()     - locator resolved to <div dir="aut |
| states/tasks__light__430__select-bulk.png | tasks | light | 430 | select-bulk | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Blocked path').first()     - locator resolved to <div dir="aut |
| states/tasks__light__834__select-bulk.png | tasks | light | 834 | select-bulk | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Blocked path').first()     - locator resolved to <div dir="aut |
| states/map__light__375__empty-filters.png | map | light | 375 | empty-filters | web-approximated | aiming for zero matches; verify the empty-state card rendered |
| states/map__light__390__empty-filters.png | map | light | 390 | empty-filters | web-approximated | aiming for zero matches; verify the empty-state card rendered |
| states/map__light__430__empty-filters.png | map | light | 430 | empty-filters | web-approximated | aiming for zero matches; verify the empty-state card rendered |
| states/map__light__834__empty-filters.png | map | light | 834 | empty-filters | web-approximated | aiming for zero matches; verify the empty-state card rendered |
| states/home__light__375__load-error.png | home | light | 375 | load-error | web-approximated | Supabase traffic aborted (Metro reachable) — the real data-load failure state; true cold-offline is un-emulatable on a dev server (ledger) |
| states/home__light__390__load-error.png | home | light | 390 | load-error | web-approximated | Supabase traffic aborted (Metro reachable) — the real data-load failure state; true cold-offline is un-emulatable on a dev server (ledger) |
| states/home__light__430__load-error.png | home | light | 430 | load-error | web-approximated | Supabase traffic aborted (Metro reachable) — the real data-load failure state; true cold-offline is un-emulatable on a dev server (ledger) |
| states/home__light__834__load-error.png | home | light | 834 | load-error | web-approximated | Supabase traffic aborted (Metro reachable) — the real data-load failure state; true cold-offline is un-emulatable on a dev server (ledger) |
| states/map__light__375__offline-refresh.png | map | light | 375 | offline-refresh | web-approximated | CDP offline, then refresh |
| states/map__light__390__offline-refresh.png | map | light | 390 | offline-refresh | web-approximated | CDP offline, then refresh |
| states/map__light__430__offline-refresh.png | map | light | 430 | offline-refresh | web-approximated | CDP offline, then refresh |
| states/map__light__834__offline-refresh.png | map | light | 834 | offline-refresh | web-approximated | CDP offline, then refresh |
| states/map__light__375__permission-denied.png | map | light | 375 | permission-denied | web-approximated | the 82e738b initialLocationAction fix territory |
| states/map__light__390__permission-denied.png | map | light | 390 | permission-denied | web-approximated | the 82e738b initialLocationAction fix territory |
| states/map__light__430__permission-denied.png | map | light | 430 | permission-denied | web-approximated | the 82e738b initialLocationAction fix territory |
| states/map__light__834__permission-denied.png | map | light | 834 | permission-denied | web-approximated | the 82e738b initialLocationAction fix territory |
| states/tasks__dark__375__mid-scroll.png | tasks | dark | 375 | mid-scroll | web-approximated | frost-under-chrome moment |
| states/tasks__dark__390__mid-scroll.png | tasks | dark | 390 | mid-scroll | web-approximated | frost-under-chrome moment |
| states/tasks__dark__430__mid-scroll.png | tasks | dark | 430 | mid-scroll | web-approximated | frost-under-chrome moment |
| states/tasks__dark__834__mid-scroll.png | tasks | dark | 834 | mid-scroll | web-approximated | frost-under-chrome moment |
| states/tasks__dark__375__empty-search.png | tasks | dark | 375 | empty-search | web-approximated |  |
| states/tasks__dark__390__empty-search.png | tasks | dark | 390 | empty-search | web-approximated |  |
| states/tasks__dark__430__empty-search.png | tasks | dark | 430 | empty-search | web-approximated |  |
| states/tasks__dark__834__empty-search.png | tasks | dark | 834 | empty-search | web-approximated |  |
| states/tasks__dark__375__select-bulk.png | tasks | dark | 375 | select-bulk | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Blocked path').first()     - locator resolved to <div dir="aut |
| states/tasks__dark__390__select-bulk.png | tasks | dark | 390 | select-bulk | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Blocked path').first()     - locator resolved to <div dir="aut |
| states/tasks__dark__430__select-bulk.png | tasks | dark | 430 | select-bulk | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Blocked path').first()     - locator resolved to <div dir="aut |
| states/tasks__dark__834__select-bulk.png | tasks | dark | 834 | select-bulk | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for getByText('Blocked path').first()     - locator resolved to <div dir="aut |
| states/map__dark__375__empty-filters.png | map | dark | 375 | empty-filters | web-approximated | aiming for zero matches; verify the empty-state card rendered |
| states/map__dark__390__empty-filters.png | map | dark | 390 | empty-filters | web-approximated | aiming for zero matches; verify the empty-state card rendered |
| states/map__dark__430__empty-filters.png | map | dark | 430 | empty-filters | web-approximated | aiming for zero matches; verify the empty-state card rendered |
| states/map__dark__834__empty-filters.png | map | dark | 834 | empty-filters | web-approximated | aiming for zero matches; verify the empty-state card rendered |
| states/home__dark__375__load-error.png | home | dark | 375 | load-error | web-approximated | Supabase traffic aborted (Metro reachable) — the real data-load failure state; true cold-offline is un-emulatable on a dev server (ledger) |
| states/home__dark__390__load-error.png | home | dark | 390 | load-error | web-approximated | Supabase traffic aborted (Metro reachable) — the real data-load failure state; true cold-offline is un-emulatable on a dev server (ledger) |
| states/home__dark__430__load-error.png | home | dark | 430 | load-error | web-approximated | Supabase traffic aborted (Metro reachable) — the real data-load failure state; true cold-offline is un-emulatable on a dev server (ledger) |
| states/home__dark__834__load-error.png | home | dark | 834 | load-error | web-approximated | Supabase traffic aborted (Metro reachable) — the real data-load failure state; true cold-offline is un-emulatable on a dev server (ledger) |
| states/map__dark__375__offline-refresh.png | map | dark | 375 | offline-refresh | web-approximated | CDP offline, then refresh |
| states/map__dark__390__offline-refresh.png | map | dark | 390 | offline-refresh | web-approximated | CDP offline, then refresh |
| states/map__dark__430__offline-refresh.png | map | dark | 430 | offline-refresh | web-approximated | CDP offline, then refresh |
| states/map__dark__834__offline-refresh.png | map | dark | 834 | offline-refresh | web-approximated | CDP offline, then refresh |
| states/map__dark__375__permission-denied.png | map | dark | 375 | permission-denied | web-approximated | the 82e738b initialLocationAction fix territory |
| states/map__dark__390__permission-denied.png | map | dark | 390 | permission-denied | web-approximated | the 82e738b initialLocationAction fix territory |
| states/map__dark__430__permission-denied.png | map | dark | 430 | permission-denied | web-approximated | the 82e738b initialLocationAction fix territory |
| states/map__dark__834__permission-denied.png | map | dark | 834 | permission-denied | web-approximated | the 82e738b initialLocationAction fix territory |
| states/map__light__390__locating-transient.png | map | light | 390 | locating-transient | web-approximated | transient hunt — honest miss noted if not caught; transient "Finding your location" not caught |
| states/tasks__light__390__first-load-skeleton.png | tasks | light | 390 | first-load-skeleton | web-approximated | best-effort transient — skeletons race the fetch |
| states/map__dark__390__locating-transient.png | map | dark | 390 | locating-transient | web-approximated | transient hunt — honest miss noted if not caught; transient "Finding your location" not caught |
| states/tasks__dark__390__first-load-skeleton.png | tasks | dark | 390 | first-load-skeleton | web-approximated | best-effort transient — skeletons race the fetch |
| dt/tasks__light__390__dt-zoom-1.3.png | tasks | light | 390 | dt-zoom-1.3 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/map__light__390__dt-zoom-1.3.png | map | light | 390 | dt-zoom-1.3 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/report__light__390__dt-zoom-1.3.png | report | light | 390 | dt-zoom-1.3 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/profile-signedout__light__390__dt-zoom-1.3.png | profile-signedout | light | 390 | dt-zoom-1.3 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/tasks__light__390__dt-zoom-2.png | tasks | light | 390 | dt-zoom-2 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/map__light__390__dt-zoom-2.png | map | light | 390 | dt-zoom-2 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/report__light__390__dt-zoom-2.png | report | light | 390 | dt-zoom-2 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/profile-signedout__light__390__dt-zoom-2.png | profile-signedout | light | 390 | dt-zoom-2 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/tasks__dark__390__dt-zoom-1.3.png | tasks | dark | 390 | dt-zoom-1.3 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/map__dark__390__dt-zoom-1.3.png | map | dark | 390 | dt-zoom-1.3 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/report__dark__390__dt-zoom-1.3.png | report | dark | 390 | dt-zoom-1.3 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/profile-signedout__dark__390__dt-zoom-1.3.png | profile-signedout | dark | 390 | dt-zoom-1.3 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/tasks__dark__390__dt-zoom-2.png | tasks | dark | 390 | dt-zoom-2 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/map__dark__390__dt-zoom-2.png | map | dark | 390 | dt-zoom-2 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/report__dark__390__dt-zoom-2.png | report | dark | 390 | dt-zoom-2 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| dt/profile-signedout__dark__390__dt-zoom-2.png | profile-signedout | dark | 390 | dt-zoom-2 | web-approximated | browser-zoom layout proxy; true Dynamic Type = code-read + NEEDS-SKY-DEVICE |
| rm/onboarding__light__390__rm-slide2.png | onboarding | light | 390 | rm-slide2 | web-approximated | RM emulated; gating is also code-read (useReducedMotion) + test-inferred |
| rm/drawer-open__light__390__rm-open.png | drawer-open | light | 390 | rm-open | web-approximated | RM emulated; gating is also code-read (useReducedMotion) + test-inferred |
| rm/tasks__light__390__rm-at-rest.png | tasks | light | 390 | rm-at-rest | web-approximated | RM emulated; gating is also code-read (useReducedMotion) + test-inferred; skeleton pulse + press sheen are RM-gated in code |
| rm/map__light__390__rm-at-rest.png | map | light | 390 | rm-at-rest | web-approximated | RM emulated; gating is also code-read (useReducedMotion) + test-inferred; map fly-to duration 0 under RM |
| rm/onboarding__dark__390__rm-slide2.png | onboarding | dark | 390 | rm-slide2 | web-approximated | RM emulated; gating is also code-read (useReducedMotion) + test-inferred |
| rm/drawer-open__dark__390__rm-open.png | drawer-open | dark | 390 | rm-open | web-approximated | RM emulated; gating is also code-read (useReducedMotion) + test-inferred |
| rm/tasks__dark__390__rm-at-rest.png | tasks | dark | 390 | rm-at-rest | web-approximated | RM emulated; gating is also code-read (useReducedMotion) + test-inferred; skeleton pulse + press sheen are RM-gated in code |
| rm/map__dark__390__rm-at-rest.png | map | dark | 390 | rm-at-rest | web-approximated | RM emulated; gating is also code-read (useReducedMotion) + test-inferred; map fly-to duration 0 under RM |
| glassmode/tasks__light__390__clite.png | tasks | light | 390 | clite | web-approximated | C-lite seeded via @accessmap/glass_mode_v1=lite; rows engineered, chrome/bulk keep blur |
| glassmode/tasks__light__390__clite-mid-scroll.png | tasks | light | 390 | clite-mid-scroll | web-approximated | C-lite seeded via @accessmap/glass_mode_v1=lite; rows engineered, chrome/bulk keep blur |
| glassmode/settings__light__390__clite.png | settings | light | 390 | clite | web-approximated | C-lite seeded via @accessmap/glass_mode_v1=lite; rows engineered, chrome/bulk keep blur |
| glassmode/profile-signedout__light__390__clite.png | profile-signedout | light | 390 | clite | web-approximated | C-lite seeded via @accessmap/glass_mode_v1=lite; rows engineered, chrome/bulk keep blur |
| glassmode/map__light__390__clite-filter-open.png | map | light | 390 | clite-filter-open | web-approximated | the filter panel is Map’s one blur moment — engineered under C-lite |
| glassmode/tasks__dark__390__clite.png | tasks | dark | 390 | clite | web-approximated | C-lite seeded via @accessmap/glass_mode_v1=lite; rows engineered, chrome/bulk keep blur |
| glassmode/tasks__dark__390__clite-mid-scroll.png | tasks | dark | 390 | clite-mid-scroll | web-approximated | C-lite seeded via @accessmap/glass_mode_v1=lite; rows engineered, chrome/bulk keep blur |
| glassmode/settings__dark__390__clite.png | settings | dark | 390 | clite | FAILED | locator.waitFor: Timeout 90000ms exceeded. Call log:   - waiting for getByText('Appearance').first() to be visible  |
| glassmode/profile-signedout__dark__390__clite.png | profile-signedout | dark | 390 | clite | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| glassmode/map__dark__390__clite-filter-open.png | map | dark | 390 | clite-filter-open | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__light__390__heatmap-on.png | map | light | 390 | heatmap-on | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__light__430__heatmap-on.png | map | light | 430 | heatmap-on | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__light__390__zoomed-out-clusters.png | map | light | 390 | zoomed-out-clusters | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__light__430__zoomed-out-clusters.png | map | light | 430 | zoomed-out-clusters | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__light__390__chips-over-tiles-closeup.png | map | light | 390 | chips-over-tiles-closeup | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__light__430__chips-over-tiles-closeup.png | map | light | 430 | chips-over-tiles-closeup | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__dark__390__heatmap-on.png | map | dark | 390 | heatmap-on | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__dark__430__heatmap-on.png | map | dark | 430 | heatmap-on | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__dark__390__zoomed-out-clusters.png | map | dark | 390 | zoomed-out-clusters | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__dark__430__zoomed-out-clusters.png | map | dark | 430 | zoomed-out-clusters | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__dark__390__chips-over-tiles-closeup.png | map | dark | 390 | chips-over-tiles-closeup | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| map/map__dark__430__chips-over-tiles-closeup.png | map | dark | 430 | chips-over-tiles-closeup | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| parked/tasks__light__390__pool-bottom.png | tasks | light | 390 | pool-bottom | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| parked/tasks__light__834__pool-bottom.png | tasks | light | 834 | pool-bottom | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| parked/tasks__dark__390__pool-bottom.png | tasks | dark | 390 | pool-bottom | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| parked/tasks__dark__834__pool-bottom.png | tasks | dark | 834 | pool-bottom | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/map__light__390.txt | map | light | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/map-first-arrival__light__390.txt | map-first-arrival | light | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/tasks__light__390.txt | tasks | light | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/report__light__390.txt | report | light | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/profile-signedout__light__390.txt | profile-signedout | light | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/signin-modal__light__390.txt | signin-modal | light | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/onboarding__light__390.txt | onboarding | light | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/map__dark__390.txt | map | dark | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/map-first-arrival__dark__390.txt | map-first-arrival | dark | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/tasks__dark__390.txt | tasks | dark | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/report__dark__390.txt | report | dark | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/profile-signedout__dark__390.txt | profile-signedout | dark | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/signin-modal__dark__390.txt | signin-modal | dark | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| a11y-tree/onboarding__dark__390.txt | onboarding | dark | 390 | tree | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/recentlyviewed-probe__light__mock__sevdots.png | recentlyviewed-probe | light | mock | sevdots | lab-mockup | PARKED-ITEM: auth-gated live row (ProfileScreen.tsx:1319); exact shipped styles reproduced; white digit on all severities (RecentlyViewedRow.tsx:139,202) |
| probes/recentlyviewed-probe__dark__mock__sevdots.png | recentlyviewed-probe | dark | mock | sevdots | lab-mockup | PARKED-ITEM: auth-gated live row (ProfileScreen.tsx:1319); exact shipped styles reproduced; white digit on all severities (RecentlyViewedRow.tsx:139,202) |
| states/tasks__light__375__select-bulk.png | tasks | light | 375 | select-bulk | web-approximated | bulk bar = the conditional i=24 pane; first card selected via its "Open" status pill (force — Pressable overlay intercepts hit-test) |
| states/tasks__light__390__select-bulk.png | tasks | light | 390 | select-bulk | web-approximated | bulk bar = the conditional i=24 pane; first card selected via its "Open" status pill (force — Pressable overlay intercepts hit-test) |
| states/tasks__light__430__select-bulk.png | tasks | light | 430 | select-bulk | web-approximated | bulk bar = the conditional i=24 pane; first card selected via its "Open" status pill (force — Pressable overlay intercepts hit-test) |
| states/tasks__light__834__select-bulk.png | tasks | light | 834 | select-bulk | web-approximated | bulk bar = the conditional i=24 pane; first card selected via its "Open" status pill (force — Pressable overlay intercepts hit-test) |
| states/tasks__dark__375__select-bulk.png | tasks | dark | 375 | select-bulk | web-approximated | bulk bar = the conditional i=24 pane; first card selected via its "Open" status pill (force — Pressable overlay intercepts hit-test) |
| states/tasks__dark__390__select-bulk.png | tasks | dark | 390 | select-bulk | web-approximated | bulk bar = the conditional i=24 pane; first card selected via its "Open" status pill (force — Pressable overlay intercepts hit-test) |
| states/tasks__dark__430__select-bulk.png | tasks | dark | 430 | select-bulk | web-approximated | bulk bar = the conditional i=24 pane; first card selected via its "Open" status pill (force — Pressable overlay intercepts hit-test) |
| states/tasks__dark__834__select-bulk.png | tasks | dark | 834 | select-bulk | web-approximated | bulk bar = the conditional i=24 pane; first card selected via its "Open" status pill (force — Pressable overlay intercepts hit-test) |
| glassmode/settings__dark__390__clite.png | settings | dark | 390 | clite | web-approximated | C-lite seeded via @accessmap/glass_mode_v1=lite; rows engineered, chrome/bulk keep blur |
| glassmode/profile-signedout__dark__390__clite.png | profile-signedout | dark | 390 | clite | web-approximated | C-lite seeded via @accessmap/glass_mode_v1=lite; rows engineered, chrome/bulk keep blur |
| glassmode/map__dark__390__clite-filter-open.png | map | dark | 390 | clite-filter-open | web-approximated | the filter panel is Map’s one blur moment — engineered under C-lite |
| map/map__light__390__heatmap-on.png | map | light | 390 | heatmap-on | web-approximated | heat cells + always-light legend over dark web tiles |
| map/map__light__430__heatmap-on.png | map | light | 430 | heatmap-on | web-approximated | heat cells + always-light legend over dark web tiles |
| map/map__light__390__zoomed-out-clusters.png | map | light | 390 | zoomed-out-clusters | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for locator('a.leaflet-control-zoom-out').first()     - locator resolved to < |
| map/map__light__430__zoomed-out-clusters.png | map | light | 430 | zoomed-out-clusters | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for locator('a.leaflet-control-zoom-out').first()     - locator resolved to < |
| map/map__light__390__chips-over-tiles-closeup.png | map | light | 390 | chips-over-tiles-closeup | web-approximated | PARKED-ITEM context: pill + action bar over live tiles. Saved-place CHIPS are auth-gated (MapScreen.tsx:1440) — absent for guests; chip evidence = code-read + arbiter (map-stacks.json); light-tile family NEEDS-SKY-DEVICE |
| map/map__light__430__chips-over-tiles-closeup.png | map | light | 430 | chips-over-tiles-closeup | web-approximated | PARKED-ITEM context: pill + action bar over live tiles. Saved-place CHIPS are auth-gated (MapScreen.tsx:1440) — absent for guests; chip evidence = code-read + arbiter (map-stacks.json); light-tile family NEEDS-SKY-DEVICE |
| map/map__dark__390__heatmap-on.png | map | dark | 390 | heatmap-on | web-approximated | heat cells + always-light legend over dark web tiles |
| map/map__dark__430__heatmap-on.png | map | dark | 430 | heatmap-on | web-approximated | heat cells + always-light legend over dark web tiles |
| map/map__dark__390__zoomed-out-clusters.png | map | dark | 390 | zoomed-out-clusters | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for locator('a.leaflet-control-zoom-out').first()     - locator resolved to < |
| map/map__dark__430__zoomed-out-clusters.png | map | dark | 430 | zoomed-out-clusters | FAILED | locator.click: Timeout 20000ms exceeded. Call log:   - waiting for locator('a.leaflet-control-zoom-out').first()     - locator resolved to < |
| map/map__dark__390__chips-over-tiles-closeup.png | map | dark | 390 | chips-over-tiles-closeup | web-approximated | PARKED-ITEM context: pill + action bar over live tiles. Saved-place CHIPS are auth-gated (MapScreen.tsx:1440) — absent for guests; chip evidence = code-read + arbiter (map-stacks.json); light-tile family NEEDS-SKY-DEVICE |
| map/map__dark__430__chips-over-tiles-closeup.png | map | dark | 430 | chips-over-tiles-closeup | web-approximated | PARKED-ITEM context: pill + action bar over live tiles. Saved-place CHIPS are auth-gated (MapScreen.tsx:1440) — absent for guests; chip evidence = code-read + arbiter (map-stacks.json); light-tile family NEEDS-SKY-DEVICE |
| parked/tasks__light__390__pool-bottom.png | tasks | light | 390 | pool-bottom | web-approximated | PARKED-ITEM: the stage’s lower-right light pool (stagePoolB — light only; dark has none by design). Sky’s pending taste call. |
| parked/tasks__light__834__pool-bottom.png | tasks | light | 834 | pool-bottom | web-approximated | PARKED-ITEM: the stage’s lower-right light pool (stagePoolB — light only; dark has none by design). Sky’s pending taste call. |
| parked/tasks__dark__390__pool-bottom.png | tasks | dark | 390 | pool-bottom | web-approximated | PARKED-ITEM: the stage’s lower-right light pool (stagePoolB — light only; dark has none by design). Sky’s pending taste call. |
| parked/tasks__dark__834__pool-bottom.png | tasks | dark | 834 | pool-bottom | web-approximated | PARKED-ITEM: the stage’s lower-right light pool (stagePoolB — light only; dark has none by design). Sky’s pending taste call. |
| a11y-tree/map__light__390.txt | map | light | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/map-first-arrival__light__390.txt | map-first-arrival | light | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/tasks__light__390.txt | tasks | light | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/report__light__390.txt | report | light | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/profile-signedout__light__390.txt | profile-signedout | light | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/signin-modal__light__390.txt | signin-modal | light | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/onboarding__light__390.txt | onboarding | light | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/map__dark__390.txt | map | dark | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/map-first-arrival__dark__390.txt | map-first-arrival | dark | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/tasks__dark__390.txt | tasks | dark | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/report__dark__390.txt | report | dark | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/profile-signedout__dark__390.txt | profile-signedout | dark | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/signin-modal__dark__390.txt | signin-modal | dark | 390 | tree | web-approximated | RN-web ARIA snapshot |
| a11y-tree/onboarding__dark__390.txt | onboarding | dark | 390 | tree | web-approximated | RN-web ARIA snapshot |
| — | map | both | — | saved-places-UNREACHABLE | code-inferred | whole chip row is auth-gated (MapScreen.tsx:1440 {authUser && …}); guests have no saved-places UI; evidence = code-read + arbiter map-stacks.json; the 8 FAILED saved-places-modal rows above are this de-scoped state |
| map/map__light__390__zoomed-out-clusters.png | map | light | 390 | zoomed-out-clusters | web-approximated | cluster bubbles at low zoom |
| map/map__light__430__zoomed-out-clusters.png | map | light | 430 | zoomed-out-clusters | web-approximated | cluster bubbles at low zoom |
| map/map__dark__390__zoomed-out-clusters.png | map | dark | 390 | zoomed-out-clusters | web-approximated | cluster bubbles at low zoom |
| map/map__dark__430__zoomed-out-clusters.png | map | dark | 430 | zoomed-out-clusters | web-approximated | cluster bubbles at low zoom |

---
**VERIFY1 PASS — 2026-07-04: 0 missing / 0 failed / 0 orphan; expected(388) == on-disk == indexed (+2 lab-mockup probe rows). Matrix source: tools/manifests/*.json.**
| states/map__light__390__locating-hang.png | map | light | 390 | locating-hang | web-approximated | slow-GPS emulation (getCurrentPosition never resolves) — the REAL persistent "Finding your location…" state; pinned-light banner; nearby list closed fast to expose it |
| states/map__dark__390__locating-hang.png | map | dark | 390 | locating-hang | web-approximated | slow-GPS emulation (getCurrentPosition never resolves) — the REAL persistent "Finding your location…" state; pinned-light banner; nearby list closed fast to expose it |
| states/tasks__light__390__skeletons-slowdata.png | tasks | light | 390 | skeletons-slowdata | web-approximated | Supabase responses delayed 9s — loading skeletons rendered deterministically |
| states/tasks__dark__390__skeletons-slowdata.png | tasks | dark | 390 | skeletons-slowdata | web-approximated | Supabase responses delayed 9s — loading skeletons rendered deterministically |
| — | signin-fullscreen | both | — | guest-affordance-UNREACHABLE | code-inferred | CRITIC F1: the root full-screen SignIn (with "Browse without an account →" guest affordance, SignInScreen.tsx:232-245) renders ONLY on native signed-out (App.tsx Gate: web always enters guest mode directly, never this screen). The captured signin-modal variant is visually identical minus the guest block + footnote spacing. NEEDS-SKY-DEVICE for the native visual |
| — | profile-signedin | both | — | UNREACHABLE-auth-gated | code-inferred | CRITIC F2: the signed-in Profile branch (hero/points/tiers/stats/activity/achievements/RecentlyViewedRow — ProfileScreen.tsx:812 else-branch) is unreachable under the audit's never-sign-in fence. This voids the signed-in variant across base / dt / glassmode / a11y-tree axes; all profile-* rows are the signed-out branch (what every web guest sees). Code-read pointers: ProfileScreen.tsx:812,1319 |
| states/map__light__390__locating-transient.png | map | light | 390 | locating-transient | web-approximated | CRITIC F3 CORRECTION: the locating banner is NOT in this image (race missed — file shows the settled map). The state's real evidence = states/map__*__390__locating-hang.png (deterministic slow-GPS emulation). Retained as an honest miss record |
| states/map__dark__390__locating-transient.png | map | dark | 390 | locating-transient | web-approximated | CRITIC F3 CORRECTION: same as light — banner not in frame; see locating-hang rows for the real state |
| — | map-light-tile-family | both | — | light-tiles-UNCAPTURABLE-ON-WEB | NEEDS-SKY-DEVICE | CRITIC F4: web tiles are CartoDB dark_all ALWAYS (PlatformMap.web.tsx:531), so pins / heatmap legend / locating banner / saved-place chips over the LIGHT tile family (iOS light-mode Apple tiles) cannot be captured here. All always-light surfaces are AA-by-construction per the arbiter (map-stacks.json, arbiter-measured); the light-tile visual truth is device-only |
| probes/recentlyviewed-probe (both files) | recentlyviewed-probe | both | mock | sevdots | lab-mockup | CRITIC F6 NOTE: the spec's "2 sizes" axis doesn't apply to the mockup — it is a fixed-content style reproduction, not a responsive app surface; nothing in it reflows by width. The live row is auth-gated (see profile-signedin row); dot styles are width-invariant literals (RecentlyViewedRow.tsx:194-205) |
| flows/report ready-submit (all 8 files) | report | both | all | ready-submit | web-approximated | CRITIC F9b CLARIFICATION: the "no file chooser fired" clause in earlier rows is a harness artifact note, NOT missing evidence — the ANON flow has no photo affordance at all (auth-only; sign-in nudge shown instead), and the submit affordance is ENABLED WITHOUT a photo. The button was never pressed |
| states/map empty-filters (all 8 files) | map | both | all | empty-filters | web-approximated | CRITIC F8 ATTESTATION: zero matches WERE achieved — frame shows "0 of 5 shown" pill + "Nothing here right now / Your filters are hiding everything" card + All categories / Any severity / Reset all filters recovery actions, both themes |
| rm/report__light__390__rm-open.png | report | light | 390 | rm-open | web-approximated | sheet presentation under reduced motion (critic top-up); RM still — presentation motion itself is un-photographable |
| rm/report__dark__390__rm-open.png | report | dark | 390 | rm-open | web-approximated | sheet presentation under reduced motion (critic top-up); RM still — presentation motion itself is un-photographable |
| base/onboarding-replay__light__390__pane-2.png | onboarding-replay | light | 390 | pane-2 | web-approximated | critic top-up — replay card 2 (standard width per critique) |
| base/onboarding-replay__light__390__pane-3.png | onboarding-replay | light | 390 | pane-3 | web-approximated | critic top-up — replay card 3 (standard width per critique) |
| base/onboarding-replay__dark__390__pane-2.png | onboarding-replay | dark | 390 | pane-2 | web-approximated | critic top-up — replay card 2 (standard width per critique) |
| base/onboarding-replay__dark__390__pane-3.png | onboarding-replay | dark | 390 | pane-3 | web-approximated | critic top-up — replay card 3 (standard width per critique) |
| map/map__light__375__heatmap-on.png | map | light | 375 | heatmap-on | web-approximated | heat cells + always-light legend over dark web tiles |
| map/map__light__834__heatmap-on.png | map | light | 834 | heatmap-on | web-approximated | heat cells + always-light legend over dark web tiles |
| map/map__light__375__zoomed-out-clusters.png | map | light | 375 | zoomed-out-clusters | web-approximated | cluster bubbles at low zoom |
| map/map__light__834__zoomed-out-clusters.png | map | light | 834 | zoomed-out-clusters | web-approximated | cluster bubbles at low zoom |
| map/map__light__375__chips-over-tiles-closeup.png | map | light | 375 | chips-over-tiles-closeup | web-approximated | PARKED-ITEM context: pill + action bar over live tiles. Saved-place CHIPS are auth-gated (MapScreen.tsx:1440) — absent for guests; chip evidence = code-read + arbiter (map-stacks.json); light-tile family NEEDS-SKY-DEVICE |
| map/map__light__834__chips-over-tiles-closeup.png | map | light | 834 | chips-over-tiles-closeup | web-approximated | PARKED-ITEM context: pill + action bar over live tiles. Saved-place CHIPS are auth-gated (MapScreen.tsx:1440) — absent for guests; chip evidence = code-read + arbiter (map-stacks.json); light-tile family NEEDS-SKY-DEVICE |
| map/map__dark__375__heatmap-on.png | map | dark | 375 | heatmap-on | web-approximated | heat cells + always-light legend over dark web tiles |
| map/map__dark__834__heatmap-on.png | map | dark | 834 | heatmap-on | web-approximated | heat cells + always-light legend over dark web tiles |
| map/map__dark__375__zoomed-out-clusters.png | map | dark | 375 | zoomed-out-clusters | web-approximated | cluster bubbles at low zoom |
| map/map__dark__834__zoomed-out-clusters.png | map | dark | 834 | zoomed-out-clusters | web-approximated | cluster bubbles at low zoom |
| map/map__dark__375__chips-over-tiles-closeup.png | map | dark | 375 | chips-over-tiles-closeup | web-approximated | PARKED-ITEM context: pill + action bar over live tiles. Saved-place CHIPS are auth-gated (MapScreen.tsx:1440) — absent for guests; chip evidence = code-read + arbiter (map-stacks.json); light-tile family NEEDS-SKY-DEVICE |
| map/map__dark__834__chips-over-tiles-closeup.png | map | dark | 834 | chips-over-tiles-closeup | web-approximated | PARKED-ITEM context: pill + action bar over live tiles. Saved-place CHIPS are auth-gated (MapScreen.tsx:1440) — absent for guests; chip evidence = code-read + arbiter (map-stacks.json); light-tile family NEEDS-SKY-DEVICE |

---
**COMPLETENESS CRITIQUE — 2026-07-04 (full text in 01_baseline-reads.md tail):** context-free adversarial critic returned GAPS-FOUND with 10 findings. Response: F1 guest-affordance honesty row added · F2 profile-signedin de-scope row added · F3 locating SOLVED with deterministic `locating-hang` captures (slow-GPS emulation, both themes) + correction rows on the two missed-transient files · F4 light-tile-family NEEDS-SKY-DEVICE row added · F5 rm/report rm-open captured ×2 · F6 mockup size-axis note added · F7 map specifics extended to all four widths (+12 files) · F8 empty-filters zero-match attestation row added (verified in-frame) · F9 ready-submit notes clarified (anon flow has no photo affordance; submit enables without photo; button never pressed) + trailer rewording below · F10 replay panes 2–3 captured ×4. **CRITIQUE PASS after top-ups.**

**FINAL VERIFY1 PASS — 2026-07-04: 0 missing / 0 failed / 0 orphan; expected(410) == on-disk(match, +2 lab-mockup probes) == indexed.** Trailer wording per critic F9a: "0 failed" means zero unsuperseded failures within the 410 expected files; the 8 `saved-places-modal` FAILED rows belong to the de-scoped auth-gated state documented in the saved-places honesty row (last-row-wins does not apply to de-scoped filenames — they are intentionally absent from disk and from `expected`). Duplicate light pin-callout rows are recapture history (identical content, harmless under last-row-wins). Matrix source of truth: `tools/manifests/*.json`.

**ARBITER STAGE ADDITIONS — 2026-07-04** (contrast arbiter re-run + extension; full detail in `partials/arbiter.md`):

| file | group | theme | width | state | tag | note |
|---|---|---|---|---|---|---|
| arbiter/rerun-tasks.txt | arbiter | — | — | re-run of shipped tasks proof set | arbiter-measured | exit 0, 100 pairs, min ratio 4.70 (StatusBadge Verified ink) — declared==shipped re-proven |
| arbiter/rerun-w1.txt | arbiter | — | — | re-run of shipped wave1 proof set | arbiter-measured | exit 0, 56 pairs, min ratio 4.83 (inkOnStage) |
| arbiter/rerun-w2.txt | arbiter | — | — | re-run of shipped wave2 proof set | arbiter-measured | exit 0, 34 pairs, min ratio 4.83 (inkOnStage); W2 _doc prose nit on the delete-account fork (pairs match shipped errorFg both modes) |
| arbiter/rerun-map.txt | arbiter | — | — | re-run of shipped map proof set | arbiter-measured | exit 0, 70 pairs; two canaries within 0.15 of floor: heat badge sev4 ink 4.59 (+0.09), cluster ring vs #A4922E 3.12 (+0.12) |
| arbiter/audit-stacks-output.txt | arbiter | — | — | extension run over tools/audit-stacks.json (uncovered pairs) | arbiter-measured | exit 1 EXPECTED: 65 pairs, 36 PASS / 29 FAIL — RV white digit 1.57–3.61 on sev1–4, RV dot boundaries (dark sev5 2.41 NEW), legend swatches 1.01–2.47, pin boundaries vs #FFF tiles (ring 1.00); findings in partials/arbiter.md §D |
| probes/report-noperm__light__390__open.png | report-noperm | light | 390 | open | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/report-noperm__dark__390__open.png | report-noperm | dark | 390 | open | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/report-noperm__light__390__after-25s.png | report-noperm | light | 390 | after-25s | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/report-noperm__dark__390__after-25s.png | report-noperm | dark | 390 | after-25s | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/home-failure__light__390__t5.png | home-failure | light | 390 | t5 | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/home-failure__light__390__t30.png | home-failure | light | 390 | t30 | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/home-failure__light__390__t70.png | home-failure | light | 390 | t70 | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/map-refresh-fail__light__390__t5.png | map-refresh-fail | light | 390 | t5 | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/map-refresh-fail__light__390__t30.png | map-refresh-fail | light | 390 | t30 | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/map-refresh-fail__light__390__t70.png | map-refresh-fail | light | 390 | t70 | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/profile-ghost__dark__834__recheck-1.png | profile-ghost | dark | 834 | recheck-1 | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/profile-ghost__dark__834__recheck-2.png | profile-ghost | dark | 834 | recheck-2 | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/onboarding-dt__light__390__slide3-z13.png | onboarding-dt | light | 390 | slide3-z13 | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/onboarding-dt__light__390__slide3-z20.png | onboarding-dt | light | 390 | slide3-z20 | FAILED | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/ Call log:   - navigating to "http://localhost:8081/", waiting until "domcon |
| probes/report-noperm__light__390__open.png | report-noperm | light | 390 | open | web-approximated | P2 PROBE (L3-1): guest report sheet, NO location grant — expect 'Waiting for location…' + disabled submit at open |
| probes/report-noperm__dark__390__open.png | report-noperm | dark | 390 | open | web-approximated | P2 PROBE (L3-1): guest report sheet, NO location grant — expect 'Waiting for location…' + disabled submit at open |
| probes/report-noperm__light__390__after-25s.png | report-noperm | light | 390 | after-25s | web-approximated | P2 PROBE (L3-1): same sheet 25s later (past the 15s GPS timeout) — does 'Waiting for location…' EVER resolve for a guest with no grant? |
| probes/report-noperm__dark__390__after-25s.png | report-noperm | dark | 390 | after-25s | web-approximated | P2 PROBE (L3-1): same sheet 25s later (past the 15s GPS timeout) — does 'Waiting for location…' EVER resolve for a guest with no grant? |
| probes/home-failure__light__390__t5.png | home-failure | light | 390 | t5 | web-approximated | P2 PROBE (L1-12/L3-7/L7-01): Supabase aborted from cold load — Home at t≈5s; does the designed error card (HomeScreen.tsx:283) land? |
| probes/home-failure__light__390__t30.png | home-failure | light | 390 | t30 | web-approximated | P2 PROBE: Home at t≈30s after cold load with Supabase aborted |
| probes/home-failure__light__390__t70.png | home-failure | light | 390 | t70 | web-approximated | P2 PROBE: Home at t≈70s after cold load with Supabase aborted — settles the 'indefinite vs eventually-honest' question |
| probes/map-refresh-fail__light__390__t5.png | map-refresh-fail | light | 390 | t5 | web-approximated | P2 PROBE (L7-01): went offline after load, tapped Refresh flags — Map at t≈5s |
| probes/map-refresh-fail__light__390__t30.png | map-refresh-fail | light | 390 | t30 | web-approximated | P2 PROBE (L7-01): Map at t≈30s after offline Refresh |
| probes/map-refresh-fail__light__390__t70.png | map-refresh-fail | light | 390 | t70 | web-approximated | P2 PROBE (L7-01): Map at t≈70s after offline Refresh — does the loadError banner (MapScreen.tsx:1901) ever fire? |
| probes/profile-ghost__dark__834__recheck-1.png | profile-ghost | dark | 834 | recheck-1 | web-approximated | P2 PROBE (L2-14): fresh-context re-capture #1 — does the ghost 'Tasks' text bleed on profile-signedout dark 834 reproduce? |
| probes/profile-ghost__dark__834__recheck-2.png | profile-ghost | dark | 834 | recheck-2 | web-approximated | P2 PROBE (L2-14): fresh-context re-capture #2 (same spec, independent context) |
| probes/onboarding-dt__light__390__slide3-z13.png | onboarding-dt | light | 390 | slide3-z13 | web-approximated | P2 PROBE (L1): onboarding slide 3 (location permission card) at zoom 1.3 — DT layout proxy |
| probes/onboarding-dt__light__390__slide3-z20.png | onboarding-dt | light | 390 | slide3-z20 | web-approximated | P2 PROBE (L1): onboarding slide 3 at zoom 2.0 — does the first screen a low-vision user meets survive 2×? |
| probes/rm-flight__light__390__panned.png | rm-flight | light | 390 | panned | web-approximated | P2 PROBE (L4-01): RM=reduce; map panned ~3 screens away from GEO before recenter |
| probes/rm-flight__light__390__t150.png | rm-flight | light | 390 | t150 | web-approximated | P2 PROBE (L4-01): ≈150ms after Recenter tap under RM — should already be AT target if truly instant |
| probes/rm-flight__light__390__t700.png | rm-flight | light | 390 | t700 | web-approximated | P2 PROBE (L4-01): ≈700ms after Recenter under RM — an intermediate region here means Leaflet flew |
| probes/rm-flight__light__390__t1600.png | rm-flight | light | 390 | t1600 | web-approximated | P2 PROBE (L4-01): ≈1.6s after Recenter under RM — settled end state for comparison |
| probes/rm-cluster__light__390__pre.png | rm-cluster | light | 390 | pre | web-approximated | P2 PROBE (L4-02): RM=reduce, wheel-zoomed out — 1 cluster bubble(s) visible pre-click |
| probes/rm-cluster__light__390__t120.png | rm-cluster | light | 390 | t120 | web-approximated | P2 PROBE (L4-02): ≈120ms after cluster click under RM — mid-flight frame if the 0.4s flyTo ran |
| probes/rm-cluster__light__390__t620.png | rm-cluster | light | 390 | t620 | web-approximated | P2 PROBE (L4-02): ≈620ms after cluster click under RM — settled expansion state |
| probes/map-probe__light__390__zoomout-wheel.png | map-probe | light | 390 | zoomout-wheel | web-approximated | P2 PROBE (L3 probe-1): wheel-driven zoom-out (occluded +/- bypassed) — 1 cluster(s), 0 pin(s) in frame; adjudicates the R1 no-clustering claim |
| probes/map-probe__light__390__panned-empty.png | map-probe | light | 390 | panned-empty | web-approximated | P2 PROBE (L8 probe-1): panned ~4 screens west — 0 pin(s)/0 cluster(s) in viewport vs the pill's global count; the zero-data-area framing |
| probes/map-probe__dark__390__zoomout-wheel.png | map-probe | dark | 390 | zoomout-wheel | web-approximated | P2 PROBE (L3 probe-1): wheel-driven zoom-out (occluded +/- bypassed) — 1 cluster(s), 0 pin(s) in frame; adjudicates the R1 no-clustering claim |
| probes/map-probe__dark__390__panned-empty.png | map-probe | dark | 390 | panned-empty | web-approximated | P2 PROBE (L8 probe-1): panned ~4 screens west — 0 pin(s)/0 cluster(s) in viewport vs the pill's global count; the zero-data-area framing |
| probes/home-peek__light__390__pre.png | home-peek | light | 390 | pre | web-approximated | P2 PROBE (L4-06): Home at rest before peek interaction |
| probes/home-peek__light__390__wheel-after.png | home-peek | light | 390 | wheel-after | web-approximated | P2 PROBE (L4-06): after wheel over the peek — page scrollTop 0→0; if unchanged AND the peek zoomed, the peek captured the scroll |
| probes/home-peek__light__390__clustertap-after.png | home-peek | light | 390 | clustertap-after | web-approximated | P2 PROBE (L4-06): after clicking peek center (no pins inside peek) — opened FullMap (Pressable won) |
| annotated/L1-2__native-guest-funnel.png | annotated | — | — | L1-2 | annotated | Part-2 annotated capture for finding L1-2 |
| annotated/L1-3__consent-slide.png | annotated | — | — | L1-3 | annotated | Part-2 annotated capture for finding L1-3 |
| annotated/L1-4__auto-list-covers-map.png | annotated | — | — | L1-4 | annotated | Part-2 annotated capture for finding L1-4 |
| annotated/L2-1__white-digit-on-severity.png | annotated | — | — | L2-1 | annotated | Part-2 annotated capture for finding L2-1 |
| annotated/L2-2__two-header-families.png | annotated | — | — | L2-2 | annotated | Part-2 annotated capture for finding L2-2 |
| annotated/L3-10__location-personality.png | annotated | — | — | L3-10 | annotated | Part-2 annotated capture for finding L3-10 |
| annotated/L3-11__coords-only-where.png | annotated | — | — | L3-11 | annotated | Part-2 annotated capture for finding L3-11 |
| annotated/L3-12__callout-culdesac.png | annotated | — | — | L3-12 | annotated | Part-2 annotated capture for finding L3-12 |
| annotated/L3-1__guest-contribute-deadend.png | annotated | — | — | L3-1 | annotated | Part-2 annotated capture for finding L3-1 |
| annotated/L3-2__lying-arrival.png | annotated | — | — | L3-2 | annotated | Part-2 annotated capture for finding L3-2 |
| annotated/L3-4__points-flash-lies.png | annotated | — | — | L3-4 | annotated | Part-2 annotated capture for finding L3-4 |
| annotated/L3-5__silent-submit.png | annotated | — | — | L3-5 | annotated | Part-2 annotated capture for finding L3-5 |
| annotated/L3-8__sorted-distance-false.png | annotated | — | — | L3-8 | annotated | Part-2 annotated capture for finding L3-8 |
| annotated/L4-01__rm-camera-inverted.png | annotated | — | — | L4-01 | annotated | Part-2 annotated capture for finding L4-01 |
| annotated/L4-02__rm-cluster-flight.png | annotated | — | — | L4-02 | annotated | Part-2 annotated capture for finding L4-02 |
| annotated/L5-01__zoom-lockout.png | annotated | — | — | L5-01 | annotated | Part-2 annotated capture for finding L5-01 |
| annotated/L5-02__report-pill-occlusion.png | annotated | — | — | L5-02 | annotated | Part-2 annotated capture for finding L5-02 |
| annotated/L5-03__zoom200-breaks-contribute.png | annotated | — | — | L5-03 | annotated | Part-2 annotated capture for finding L5-03 |
| annotated/L5-04__clear-subtarget.png | annotated | — | — | L5-04 | annotated | Part-2 annotated capture for finding L5-04 |
| annotated/L5-05__actionbar-scroll.png | annotated | — | — | L5-05 | annotated | Part-2 annotated capture for finding L5-05 |
| annotated/L5-06__home-peek-live-map.png | annotated | — | — | L5-06 | annotated | Part-2 annotated capture for finding L5-06 |
| annotated/L5-07__dt-walls.png | annotated | — | — | L5-07 | annotated | Part-2 annotated capture for finding L5-07 |
| annotated/L6-01__rnweb-state-drop.png | annotated | — | — | L6-01 | annotated | Part-2 annotated capture for finding L6-01 |
| annotated/L6-02__announce-silent-web.png | annotated | — | — | L6-02 | annotated | Part-2 annotated capture for finding L6-02 |
| annotated/L6-04__nested-actionable.png | annotated | — | — | L6-04 | annotated | Part-2 annotated capture for finding L6-04 |
| annotated/L6-05__list-action-deadends.png | annotated | — | — | L6-05 | annotated | Part-2 annotated capture for finding L6-05 |
| annotated/L6-07__pin-boundary-light-tiles.png | annotated | — | — | L6-07 | annotated | Part-2 annotated capture for finding L6-07 |
| annotated/L7-01__no-timeout.png | annotated | — | — | L7-01 | annotated | Part-2 annotated capture for finding L7-01 |
| annotated/L7-02__offline-honesty.png | annotated | — | — | L7-02 | annotated | Part-2 annotated capture for finding L7-02 |
| annotated/L7-03__global-page-no-rescope.png | annotated | — | — | L7-03 | annotated | Part-2 annotated capture for finding L7-03 |
| annotated/L8-2__verified-undefined.png | annotated | — | — | L8-2 | annotated | Part-2 annotated capture for finding L8-2 |
| annotated/L8-3__untrusted-full-confidence.png | annotated | — | — | L8-3 | annotated | Part-2 annotated capture for finding L8-3 |
| annotated/L8-4__guest-cliff-docs.png | annotated | — | — | L8-4 | annotated | Part-2 annotated capture for finding L8-4 |
| annotated/L8-4a__fabricated-conflict.png | annotated | — | — | L8-4a | annotated | Part-2 annotated capture for finding L8-4a |
| annotated/L8-5__flagship-raw-chrome.png | annotated | — | — | L8-5 | annotated | Part-2 annotated capture for finding L8-5 |
| annotated/L8-7__anon-pins-gray.png | annotated | — | — | L8-7 | annotated | Part-2 annotated capture for finding L8-7 |
