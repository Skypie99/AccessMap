# VoiceOver test script — before declaring Accessibility Nutrition Labels

Run this on the TestFlight build, on a real iPhone. It maps 1:1 to Apple's
[VoiceOver evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/voiceover-evaluation-criteria).
If all four tasks pass, you can honestly check **VoiceOver** (plus the other
five features already verified in code) in App Store Connect → App
Accessibility → Get Started.

## Setup (2 min)

1. Settings → Accessibility → VoiceOver → **on**. (Faster: tell Siri
   "turn on VoiceOver". Triple-click side button toggles it if you set
   Accessibility Shortcut.)
2. Gesture cheat sheet — this is all you need:
   - **Swipe right/left** — next / previous element
   - **Double-tap** — activate the focused element
   - **Three-finger swipe** — scroll
   - **Two-finger scrub (Z shape)** — go back / dismiss a sheet
3. Turn the screen curtain on if you want the honest test (three-finger
   triple-tap): screen goes black, ears only.

## Task 1 — Browse the map as a guest

- [ ] Open the app signed out. Every onboarding card control announces a
      label and "button", and the cards can be finished by swipe + double-tap alone.
- [ ] On Home: the search field, "Use my location", map peek, and each
      Nearby row announce sensibly (severity is spoken as words+number, not color).
- [ ] Open a flag from Nearby: category, severity, status, description all
      spoken. The photo (seeded flags have none — add one from your own
      account to test) announces either your description or "Photo N of M".
- [ ] Comments area announces "Sign in to see and add comments." — not
      "No comments yet".

## Task 2 — Sign in

- [ ] Email and password fields announce their labels and hints.
- [ ] The new **Show password** eye announces "Show password, button" and
      toggles to "Hide password".
- [ ] The terms line reads "By creating an account you agree to the
      Terms & Community Guidelines." and opens the sheet on double-tap.
- [ ] A failed sign-in announces the error (live region), not silence.

## Task 3 — Report a barrier (the alt-text feature)

- [ ] Every form control (category chips, severity, description, context
      tags) is reachable by swiping and operable by double-tap.
- [ ] Attach a photo. A new field appears: "Describe the photo for screen
      reader users (optional)" — type e.g. "Steps with no ramp at the door".
- [ ] Submit. Confirmation is announced.
- [ ] Reopen your flag: the gallery thumbnail now announces
      "Photo 1 of 1: Steps with no ramp at the door" — your words, not a
      generic label. Same in the full-screen lightbox.
- [ ] From the flag detail sheet (your own flag), add a second photo: the
      picker now parks the photo in a describe-then-attach row. Add a
      description, hit Attach, confirm "Photo attached." is announced.

## Task 4 — Triage from Tasks

- [ ] Each card announces category, severity, status, and its actions.
- [ ] Verify someone else's flag: the "+3 points" flash is announced.
- [ ] A card thumbnail with a described photo speaks the description.
- [ ] Open a flag from a card → detail sheet focus lands inside the sheet;
      two-finger scrub closes it and focus returns sanely.

## While you're in there (other label criteria, already code-verified)

- **Larger Text**: Settings → Accessibility → Display & Text Size → Larger
  Text → drag to max. Nothing should clip or overlap (cluster counts and
  heat badges cap deliberately).
- **Dark Interface**: flip appearance in Settings — the app follows.
- **Reduced Motion**: Settings → Accessibility → Motion → Reduce Motion —
  map animations and sheet springs should calm down.

## Then declare

App Store Connect → your app → **App Accessibility** → Get Started. Check:
VoiceOver, Larger Text, Dark Interface, Sufficient Contrast, Differentiate
Without Color Alone, Reduced Motion. Leave Voice Control unchecked until
you've tested it separately (Settings → Accessibility → Voice Control →
try "Tap Report" etc.). Captions/Audio Descriptions: not applicable — no
audio/video content.

If any checkbox above fails, tell Claude which step — each maps to a
specific control we can fix before the final build.
