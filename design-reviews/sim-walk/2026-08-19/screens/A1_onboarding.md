# A1 — OnboardingCards · BANKED (Pro Max, light-set; surface is dark-designed)
Build: sim-release @ bc91789 · Device: iPhone 17 Pro Max 440×956

## Elements exercised / found
Cards traversed 1→5 by Next/CTAs; Back verified (enabled state + labels); Skip NOT tapped here (reserved for the 17e repeat so both exits get exercised). Elements: 5 cards, Skip, Back, Next (mutating label), per-card CTAs (location: Allow location access / Not now · notifications: Turn on notifications / Maybe later), page dots. **Exercised 9/10 unique interactive nodes** (Skip deferred by design to 17e run).

## Measured (SIZING LENS)
- Skip 'Skip the tutorial' 62×44 ✓ · Back 65×45 ✓ (disabled on card 1 with label "Back. Disabled on first card." — exemplary) · Next 85×51 ✓ ("Next. Card N of 5." — position announced)
- Location card: Allow location access 159×51 ✓ · Not now 88×44 ✓ BUT y 884–928 → bottom 6pt inside the 34pt home-indicator inset (boundary y=922) → LEDGER SW-02
- Notifications card: Turn on notifications 205×51 ✓ · Maybe later 112×44, same y-band → same intrusion class
- Severity image has proper alt: 'Severity scale — 1 Minor to 5 Severe' ✓

## Outcomes verified
- Next card1→2: Next label mutated to "Card 2 of 5", Back enabled+relabeled (THE verified-tap proof)
- 'Not now' (location) → advanced to card 4 WITHOUT firing the OS location dialog ✓ (privacy gate honored — deny-first strategy; OS dialog reserved for Map's user-initiated ask)
- 'Maybe later' (notifications) → advanced to card 5 without OS dialog ✓
- 'Open the map' → onboarding completes → Gate → SignInScreen ✓ (fresh install, signed out)
- Copy check: "Welcome to Flagstone" ✓ rename-consistent; 5 titles as designed

## Observations (not defects unless promoted)
- Tree exposes duplicated 'Horizontal scroll bar, 1 page' + 'Vertical scroll bar, 5 pages' accessible elements on a HORIZONTAL pager → possible VoiceOver noise; device-VO check owns the verdict → LEDGER SW-03 (DEVICE-ONLY verify)
- Card-5 CTA visible text vs a11y label case ('Open the map' label) — cosmetic consistency check for Phase B code read → SW-06 (Low)

Shots: A1_onboarding_1_light.png (card1, post-alert), _2..(card2), _3_location, _4_notifs, _5_allset. Census JSON: A1_onboarding_p1_census.json.
Stray-state note: a Fitness notification dialog (from the springboard tap proof) was dismissed with Don't Allow before the card-1 shot; Flagstone state untouched.
