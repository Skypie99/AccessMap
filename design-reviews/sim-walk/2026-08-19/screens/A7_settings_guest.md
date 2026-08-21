# A7 — SettingsScreen (guest) + B1/B2/B4/D1/D2/C13-D3/C18/C19 children · BANKED
Build: sim-release @ bc91789 · Pro Max · light (dark toggle exercised) · guest

## Elements exercised / found: 17/17 rows + segmented control
Appearance Light/Dark/System (each 125×44 ✓) — **Dark flips whole surface coherently ✓, System restores ✓** (left on System for the OS-driven dark pass) · Help & FAQ (B1): searchable accordion — answer expand verified (copy matches DB trigger +10/+15 ✓), search-miss fallback "Didn't find what you needed?" ✓, Close 44×45 ✓ · What's New (B2): v3.0.0 entry with composite label "…8 items" ✓ · About Flagstone (C15 2nd parent) open/close ✓ · Privacy + Terms rows (pool) open/close ✓ · Replay tutorial (D2): **a 3-step "introduction" modal — different surface from the 5-card first-launch onboarding** (Skip the introduction 62×44 ✓, steps 1→3 walked, Back appears from step 2 ✓) · My feedback history (B4): guest empty state "No feedback yet…" ✓ · Hidden comments (D1): "Nothing hidden" ✓ · Blocked people (C18): disabled row, enabled='0' exposed to AT + inline explainer "You haven't blocked anyone on this device." — CORRECT pattern ✓ · Export my data (C19): guest gate alert "Please sign in to export your data." ✓ · Sign out: confirm() dialog "Are you sure…" + Cancel honored ✓ (as guest = designed exit from guest mode; not a defect) · Update banner preferences → opens the compact Notifications sheet (= D3 surface) with guest notice "Sign in to save notification preferences" ✓; backdrop-dismiss works ✓ · Push notifications switch: see SW-20

## New ledger rows
- **SW-20 [Med]** Push notifications switch is DISABLED for guests (enabled='0') but carries NO visual dimming or explainer — normal-looking row + switch silently ignores taps. Inconsistent with the app's own gating patterns (Export=alert, Blocked=grey+subtitle). Repro: guest → Settings → tap switch. Evidence: A7 censuses, G3_push_after.png
- SW-16 [Low, PLAUSIBLE] Replay-intro steps expose their copy ONLY as 1×1pt StaticText elements ("Welcome to Flagstone. Drop a pin…" rect [0,0,1,1]) — likely an announcement pattern; VO reading order/duplication needs device check (DEVICE-ONLY verify) + Phase B code read of OnboardingModal.tsx
- SW-17 [Low] Replay finisher labeled "Open the map" returns to Settings instead (label-vs-behavior)
- SW-19 [Obs] Two divergent onboarding surfaces exist (5-card first-launch vs 3-step replay); replay row subtitle "3-card welcome intro" matches replay only
- SW-21 [Low] 'Update banner preferences' row subtitle ("in-app updates banner") vs its sheet's purpose line ("surface on your Profile") wording mismatch
- SW-14 [Obs] GuestProfile = single CTA on an otherwise empty screen (could surface community content)
- (Retracted candidates: Blocked-people inertness — correctly disabled+explained; guest Sign out — designed exit with confirm)

## G-nodes
- G3 OS notification dialog: NOT reachable as guest (switch disabled) → moves to SKY-QUEUE (authed walk) — honest gap
- G1 location: fully walked on Home (deny + silent-retap SW-11 + grant)

## Method notes
- eltap on rows below y≈956 = off-viewport no-op → ALWAYS scroll-into-view first
- Alert/dialog taps during settle can silently miss → verify dialog-gone after every Cancel/OK
- The A5 sign-in sheet exit is 'Go back without signing in' (72×44 ✓); its consent line bottom-clips 3pt (SW-01 family)

Shots: A7_settings_top/dark/system, B1_help, B2_changelog, D2_onboarding_replay/_step1/_exit, B4_myfeedback_guest, D1_hiddencomments_guest, C18_blocked_guest, C19_export_guest, G3_push_after, C13_bannerprefs, A5_guestprofile, A5_signin_sheet
