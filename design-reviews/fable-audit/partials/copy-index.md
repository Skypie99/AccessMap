## §Copy-observations index

Copy-level observations gathered by each lens (no rewrites beyond this appendix — audit rail). Grouped by lens.

### L1 — copy observations

- **One thing, four names in the first minute:** "barrier" (slides 1-2, Home) → "flags" (slide 3, map UI) → "reports" (Home subtitle) → "Tasks" (tab). Slide 3's title "Show flags near you" introduces the term with zero definition. R6's #3 friction; each rename taxes cognitive-load users.
- **Two different location-privacy contracts:** onboarding says "only used while the app is open — never tracked or stored on our servers"; the sign-in screen says "Your location is only used when you place a flag" (also understates: browsing with location computes nearby distances). Neither mentions that a submitted report publishes the chosen coordinates permanently. One canonical sentence, reused, would be stronger and truer.
- **"Open the Map" never opens the map:** final carousel CTA → Home (web) or sign-in (native); replay CTA + its a11y hint ("opens the map") → returns to Settings.
- **SignInScreen guest note/hint** ("need an account to report" / "Reporting flags requires an account") contradicts the shipped anonymous flow — the copy half of L1-2.
- **"1 / 5" position pill** announces as "one slash five"; the replay modal already uses the better "Step N of M" phrasing.
- **"Next. Card 1 of 5."** labels the current card, not the destination; "Next, to card 2 of 5" would match user expectation.
- **Stale code comment:** `MapScreen.tsx:1041` says the first-time prompt is deferred to "OnboardingCards card 4" — it's card 3.


### L2 — copy observations

- **Raw status enum leaks on Home:** rows print `item.f.status` lowercase ("Minor · open", HomeScreen.tsx:333-334) while every pill uses `STATUS_LABELS` ("Open") — one surface speaks database, the rest speak product. (R6 read "open" as business hours.)
- **Casing drift:** drawer/screens "How To Help" vs "About the App" vs "Resources"; "What's New" (modal title) vs "What's new" (Settings row, `base/settings__light__390__at-rest.png`). One casing rule wanted.
- **Date grammar mix** in Nearby: "29d ago" vs "Jun 2, 2026" in the same list (`flows/map__light__390__nearby-modal.png`).
- **Tab badge semantics:** Tasks badge reads 2 on Home/Profile/Map but 5 on Tasks itself (all base captures) — whatever the mechanism, it reads as the same counter disagreeing with itself; R6/R2/R5 all tripped on it. (Data/copy seam — flagged for L5/L6.)
- **"1+" toolbar glyph** (min-severity quick chip) is opaque pre-Legend to every fresh reader (R6, R1, R4) — a label or tooltip-shaped fix, not a material one.
- **"Made with ♥ in Canada"** (HamburgerDrawer.tsx:233): a unicode heart inside prose — reads as voice, not iconography; no §10 action suggested. (Contrast with L2-9's UI-glyph emoji, which do want fixing.)


### L3 — copy observations

- **One thing, four names:** barriers (onboarding/Home) → flags (Map pill, "Nearby flags," filter panel) → reports (Home subtitle, Tasks subtitle) → tasks (tab). Each rename re-taxes R6's tired user. Pick "barrier" for people, keep "flag" as the verb ("flag a barrier").
- **"Nearby" is doing unpaid work:** `N flags nearby` (Map pill), "N flags nearby. Sorted by distance." (list announcement) are global-count/global-order claims. Say what's true: "N reports loaded" / "Showing most recent first."
- **"Open" reads as open-for-business** on first contact (R6); the legend defines it but hides behind an unlabeled "?" — first-contact surfaces never teach the status words.
- **The denied banner points the wrong way:** "Turn it on in your device Settings **to report barriers near you**" (`MapScreen.tsx:2011`) frames location as report-only while the user's blocked job is FINDING; "device Settings" is also wrong on web (it's the browser's site permission), and there's no link either way.
- **"Never tracked or stored on our servers"** (onboarding slide 3) sits one sentence from "place your reports accurately" — but every report permanently stores precise, publicly-readable coordinates. The claim is about ambient location and is true; the adjacency invites a false generalization a privacy-hurt user will remember. Suggest: "Your reports store only the pin you place."
- **The map has two names before you reach it:** "Open the Map" (onboarding, lands on Home) then "Open full map" (Home). One promise, kept once.
- **Rate-limit copy has two sources:** `anonRateLimit.ts:31-33` ("You've reached the limit of 5 anonymous reports…") is thrown but always re-skinned by the modal ("You've reported 5 barriers today — thanks for contributing!"). Fine today; a future caller of the lib string will ship the colder voice.
- **The disabled FAB explains itself only to screen readers** (`MapScreen.tsx:2078-2084` hint: "Dimmed until location is on. Use the recenter button…") — genuinely good copy that sighted users never see.
- **Callout severity speaks numbers only** ("Severity 4 · verified") while Home speaks words ("Significant · verified") and the sheet teaches both — the decoder lives everywhere except where map users decide.


### L4 — copy observations

1. `src/lib/accessibility.ts:95` — "Web/unsupported platforms quietly resolve to `false`" is factually wrong for web at this RN-web version (ledger #11) and actively dangerous (see L4-09).
2. `src/components/PlatformMap.web.tsx:625` and `:46–47` — "Instant jump when 'Reduce Motion' is on (WCAG 2.3.3)" describes intent, not behavior (L4-01). When fixed, the comment should name the falsy-zero trap so it never regresses.
3. `DESIGN.md:279` — "the bottom-sheet slide and drawer are the only longer moves" is stale: map camera (600ms/0.6s) and the tier fill (600ms) are longer moves; the law text should either list them or the code should conform.
4. `01_render-index.md:371–378` — the rm rows' "test-inferred" tag overstates the evidence: no reduced-motion test exists in the repo (L4-05). Worth a one-line correction so Part 3 doesn't lean on phantom tests.


### L5 — copy observations

- **"Report anonymously" as a button label** is 19 characters doing the work of 6; it is the direct driver of the zoom-2.0 pill overflow and the 1.3 two-line squeeze (dt/report captures). "Submit report" (title already establishes anonymity, and the a11y label "Submit anonymous flag report" already differs) would buy ~40% width headroom on the app's most important button.
- **The status pill keeps asserting "5 flags nearby" in permission-denied and stale-region states** (states/map__*__permission-denied.png) — at device-integrity level this is the pill earning its zoom-occluding position with false information; whatever Part 3 does about L5-01 should also make this copy state-aware (R1's #1 trust hit).
- **Sort labels "Newest / Oldest / Severity"** truncate to single letters on web at high zoom; one-word labels that stay distinct at 4 characters ("New / Old / Sever…") — or letting the row wrap — would keep the control legible where `adjustsFontSizeToFit` doesn't exist.



### L7 — copy observations

- **"N flags nearby"** (`MapScreen.tsx:1278-1283` status pill) — "nearby" is false-by-construction: the query is a global most-recent page (L7-03), and the pill keeps the claim over the San-Francisco fallback region (L7-04). The most load-bearing dishonest word in the app.
- **"Showing saved data — connect for the latest."** (`copy.ts:11`) — good voice; missing the one fact that changes decisions: **age** ("saved 2 h ago"). `cachedAt` already exists in storage.
- **"Loading flags…"** replaces the count in the pill during *every* refresh, including background revalidates over live data — consider reserving it for first load and using "Updating…" over data, so loading-from-nothing and refreshing-something read differently.
- **"Finding your location…"** — honest, SR-announced, now properly bounded; it has no failure-side twin on web (L7-07). Native alert copy "Couldn't find your location" + the timeout's own "Location request timed out. Check your signal and try again." are good.
- **"Location access is off. Turn it on in your device Settings to report barriers near you."** — exactly right; it just never fires on arrival (L7-04).
- **Heat disclaimer** ("Heat zones only appear where at least 3 flags…") — honest about the rule, silent about the outcome; needs the "No zones qualify in view yet" companion (L7-11).
- **Error terminal copy** is a strength: "Couldn't load reports." + Try again; "…Tap to retry"; "Couldn't refresh — pull down to update."; "Check your internet connection and try again."


### L8 — copy observations

- **Keep verbatim:** "Impassable. Needs a detour." · "Reporting anonymously — your identity is not stored." · "Your anonymous report still counts. Sign in to add a photo and help verifiers act faster." (this is the template for selling auth everywhere else) · "To protect reporters, heat zones only appear where at least 3 flags have been submitted." · "Flagging a barrier is the first step. These resources help get it fixed — and help you plan around it in the meantime."
- **The two heat-map caveats are complementary, not duplicated** — the map toast explains data quality ("coverage varies by area"), the legend explains privacy ("to protect reporters") — but only heatmap users ever see either; the coverage line deserves a home on the default map (L8-10).
- **Define "verified" in the legend in one line** — the FAQ already wrote it: "another person checked the spot and confirmed the issue is real." Move/duplicate it.
- **Noun canon needed** (L8-11): pick *barrier* (human) as the display noun and *flag* (system) as the object noun, and use them consistently; retire "reports/tasks" as display nouns. Also "open" → consider "unconfirmed"/"reported" to break the open-for-business collision.
- **Submit-moment sentence missing** (L8-14): one line under the CTA stating visibility ("appears on the map for everyone"), the verify loop, and the city non-relationship.
- **Fix in Help FAQ:** "Map tab" → real navigation; magnifier → sliders for filters; "+ Report" answer needs the guest path (Home → Report a barrier) and the auth note; "different color" for resolved → "a checkmark".
- **Stale changelog** (L8-13) — add the v3 era entries; align "What's New"/"What's new".
- **Casing sweep:** "How To Help" vs "About the App" vs "What's new"; "My Feedback" modal vs "My feedback history" row.
- **onboarding slide 2 is doing the trust-system's best teaching** ("Other people verify your report or mark it resolved once the issue is fixed") — echo that sentence at the point of verify (Tasks) and at submit.


