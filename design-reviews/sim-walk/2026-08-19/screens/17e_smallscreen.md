# 17e — SMALL-SCREEN TOP-FLOW REPEAT · BANKED
Device: iPhone 17e 390×844pt (1170×2532@3x) — the runtime's SMALLEST (no true SE-class 375×667 exists in iOS 26.5; recorded as matrix limit). Build: sim-release @ bc91789. WDA port 8101.

## Flows repeated: Onboarding (Skip exit) → SignIn (edge) → guest Home → Report modal (edge, no-location)

## ★ SW-01 CONFIRMED MATERIALLY WORSE (upgrade evidence)
On 844pt SignIn at rest, MEASURED from tree: Privacy Policy button y869–914 and the **Apple-1.2 consent line ("By creating an account you agree to the Terms & Community Guidelines") y933–978 are BOTH entirely BELOW the 844pt screen** — fully off-screen, not merely clipped. On Pro Max (956pt) the consent peeked ~8pt; on 17e it is invisible without scrolling. This is the store-review-relevant finding, now confirmed to degrade with screen size. (SignIn is dark-designed in both modes — expected, not a defect.)

## ★ SW-37 [HIGH — new, 17e-surfaced]: anonymous Report dead-ends without location
Report modal (Home 'Report a barrier' → FullMap openReport) on a device that has NOT granted location: shows "Waiting for location…" persistently after the OS dialog is denied; **'Submit report anonymously' is DISABLED (enabled=0)** even with category (No ramp) + severity (3) filled. 'Use my location' re-tap can't re-prompt post-deny (iOS). No manual "tap the map to place the pin" fallback is surfaced from this state → the app's CORE value flow is blocked for a privacy-conscious guest. Same root as SW-11 (no graceful location-denied degradation). Filled to edge; Cancel used; NOTHING submitted. Evidence: C7_report_17e.png, C7_report_nolocation.png

## Confirmed-on-small-screen (transfer from Pro Max)
- SW-12 Report FAB 105×**42**pt (under 44 floor) — identical on 17e
- SW-08 first-run default map card = San Francisco while data is Kelowna (269km) — reproduced on fresh 17e guest
- Onboarding (Skip 62×44 ✓, Next 85×51 ✓, title wraps 2 lines cleanly), Home tab bar (130×53 each, labels intact, no clip), search/Use-my-location fit — all PASS at 390pt

## No NEW small-screen-only layout deaths beyond SW-01 upgrade + SW-37
The app scales down to 390pt without clipping/overlap on the walked surfaces; the bottom-inset intrusion family (SW-01/02) is the consistent small-screen weakness.

Shots: A2_signin_17e, A3_home_17e, C7_report_17e, C7_report_nolocation
