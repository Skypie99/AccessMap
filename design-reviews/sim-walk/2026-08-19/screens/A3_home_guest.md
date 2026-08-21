# A3 — HomeScreen (guest) + C1 AddressSearch + G1 location + B3 Feedback edge · BANKED
Build: sim-release @ bc91789 · Pro Max · light · LIVE backend (13 real flags — read-only honored)

## Elements exercised / found: 14/16 on Home proper
Menu ✓ (drawer) · Send feedback ✓ (B3) · Search bar ✓ (C1) · Clear search ✓ · Use my location ✓ (deny + silent-retap + grant) · Map card = navigation node (A6 segment) · 6 CLOSEST/RECENT rows (labels verified; detail walk = C3 segment) · Report FAB (A6 segment) · 3 tabs (later segments). NOT yet: map-card tap, FAB (deferred to A6 by design).

## Measured (SIZING LENS)
- Menu 44×45 ✓ · Feedback 44×45 ✓ · rows 408×60 ✓ · tabs ~147×53 ✓ · Use my location 143×45 ✓ · map card 408×169 ✓
- **SW-09 [Med]: 'Clear search' X = 16×17pt** (floor 44) — micro-target on the landing surface
- **SW-10 [Low]: search bar pressable ≈ full visual bar but only ~34pt tall** (visual band ~y191–225); its ACCESSIBLE element under-reports further at 358×20 (label frame) → small VO focus/touch frame
- **SW-12 [Med]: 'Report a barrier' FAB = 105×42pt** (2pt under floor; primary CTA)
- **SW-13 [Med, a11y]: tabs announce "tab N of 5" on a 3-tab bar** (hidden FullMap/Settings routes inflate the count; Admin correctly absent for guest — signed-in admin would announce "of 6")

## Behavior verified (all outcome-checked)
- Search (C1): open via bar (both bands), OSM attribution shown, min-3-chars hint, **no-matches empty state** (accidental garbled query), real results ("Jump to …" labels 400×77 ✓), select → **whole screen transforms**: LATEST→NEARBY, subtitle = chosen place, map card recenters Vancouver, list re-sorts CLOSEST with real km, **true-zero bubble** "No reports here yet. You could add the first." ✓ · Clear search reverts fully ✓ · X-close 'Close address search' ✓
- Location (G1): OS dialog fires ONLY on user tap ✓ (privacy gate held) · **Deny → graceful silent revert (no stuck spinner)** · **SW-11 [Med]: re-tap after deny = totally silent** — no guidance, no Settings deep-link; dead-looking control · Grant (simctl) + retap → NEARBY "Sorted by distance", card centers sim location, distances consistent with geocode reference (math internally consistent ✓)
- **SW-08 [Med]: first-run default map card centers San Francisco** (Presidio/GG Park visible) while the entire live dataset sits ~269–270km from Vancouver (BC cluster) → hardcoded default region misrepresents the data on first impression; also the true-zero bubble does NOT show on that SF default card though SF has zero reports (inconsistent bubble rule). Cross-check on A6 FullMap + Phase B code read.
- Feedback (B3): opens over Home ✓ Close 44×44 ✓ chips Bug/Idea/Love 75-79×45 ✓ · TextView fills, sheet lifts above keyboard ✓ · 'Send feedback' submit [194×45] ENABLED at edge — **NOT pressed** (live send). Note: three elements share the label 'Send feedback' (header btn, sheet title, submit) — VO differentiation nit.
- iOS 'Save Password?' system sheet appeared post-SignIn-unmount → dismissed 'Not Now' (fake cred never stored)

## State for successors
Sim location set: 49.2609,-123.1139 (Vancouver City Hall) · location GRANTED to app on Pro Max · guest mode · Home in NEARBY/Sorted-by-distance state · search recents contain "Vancouver City Hall" pick
Shots: A3_home_light, A3_home_after_jump, C1_addresssearch_open/results, G1_location_dialog/denied/denied_retap(x)/granted, B3_feedback_open/edge
