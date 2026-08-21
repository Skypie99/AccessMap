# A2 — SignInScreen (gate) · BANKED to the edge (Pro Max; dark-designed surface)
Build: sim-release @ bc91789 · Device: iPhone 17 Pro Max 440×956 · LIVE backend — submits NEVER pressed

## Elements exercised / found (10/12)
Email field (focus, typing, email-keyboard ✓) · Password field (focus via clean tap ✓, typing ✓) · Show/Hide password (both directions; tree type flips SecureTextField↔TextField ✓) · Terms consent button (opens sheet ✓) · Privacy Policy button (opens sheet ✓) · 'Close terms' ✓ · 'Close privacy policy' ✓ · scroll ✓ · keyboard contract ✓ · Browse without an account (exercised → guest entry, see A3)
**NOT exercised (2, by law):** 'Sign in' = submit('in') and 'Create account' = submit('up') — BOTH are live-backend auth submits (SignInScreen.tsx:254/:285). Edge verified: fields fill, buttons enabled. Full submit behavior (incl. client-side validation messaging) = SKY-QUEUE/TestFlight.

## Measured (SIZING LENS)
- Email 348×49 ✓ · Password 348×49 ✓ · Show password 44×51 ✓ (at floor) · Sign in 350×57 ✓ · Create account 350×57 ✓ · Browse 228×45 ✓ · Privacy 392×45 · Terms consent 392×45 · Close buttons 44×44 ✓ (at floor)
- **SW-01 [HIGH]: Terms consent line below the fold at rest** — rect y 948..993 on a 956pt screen (≈8pt peeking, under the home indicator). The Apple-1.2 consent ("By creating an account you agree to the Terms & Community Guidelines") is INVISIBLE at rest on the LARGEST iPhone — the code's own comment (:339) says it "must be visible where the account is created". Will be worse on 17e. Privacy button also ends y 929 (7pt into the 922 safe-area boundary).
- Keyboard contract: email keyboard has @ key (correct type); field + Sign in stay visible above keyboard (KAV working) — evidence A2_signin_keyboard_email.png

## Outcomes verified
- Legal sheets from the SignIn surface work (今日's modal-ordering fix class regression-checked here): Terms opens, scrolls full-length, closes; Privacy opens after close. **Both documents read FLAGSTONE throughout (0 'AccessMap' hits in either full tree) — BQ-1 wording is RESOLVED on main; the memory line "in-app Terms/Privacy still say AccessMap" is STALE.** Terms: Effective 2026-07-27 v1.0 · Privacy: Effective 2026-07-29 v1.0.
- No 'Forgot password' path exists on the surface (census-complete) → recorded as an observation for Sky (SW-07, product choice not a defect).

## Method notes (for successors)
- Detect sheets by their OWN title/close elements — the underlying screen stays in the WDA tree and can read as "visible".
- Element-targeted ops added to driver (eltap/clear/settext by NSPredicate). Typing throttled to frequency 12 after a dropped-char artifact.
- Field junk left behind ('SalkFake1!'/'x') is local state only; wiped on guest entry; never submitted.

Shots: A2_signin_light.png · A2_signin_keyboard_email.png · A2_signin_showpw.png · A2_signin_filled_edge.png · A2_terms_sheet.png · A2_terms_bottom.png · A2_privacy_sheet.png · census A2_signin_census.json
