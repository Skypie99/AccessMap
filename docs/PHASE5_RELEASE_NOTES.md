# AccessMap Phase 5 — TestFlight "What to Test" Release Notes

_For testers who haven't used the app since v0.2 (or are brand new)._

---

## What's New

Phase 5 ships three big things: **anonymous reporting**, a **community trust tier system**, and a **new first-launch onboarding flow** — plus a full visual refresh across every screen. You can now report an accessibility barrier without your username attached to it, which matters for sensitive locations. Your contribution history earns you a tier (Bronze → Silver → Gold → Platinum) that's visible on your profile and the community leaderboard. And the map filter now lets you narrow by who a barrier actually affects — wheelchair users, people with low vision, and so on — instead of just category. On top of that, the whole app switched to the Wayfinder Blue colour palette, Plus Jakarta Sans typography, and full dark mode support.

---

## What to Test

**First-launch onboarding**
- Delete the app and reinstall. Five slides should appear before you reach the map: Welcome → How it works → Location → Notifications → You're ready.
- On the Location slide, tap "Allow Location" and confirm the OS permission dialog appears, then the carousel advances.
- On the Notifications slide, try "Maybe later" — you should land on the map normally with notifications ungranted.
- Tap "Skip" on any early slide and confirm you go straight to the map with no crash.

**Anonymous reporting**
- Sign out, then tap the report FAB on the map.
- Fill in a flag and submit. Your display name should **not** appear on the flag card or flag detail — it should read "Anonymous" instead.
- Confirm the pin on the map looks slightly faded compared to a signed-in flag.
- Sign out, report 5 flags, then try a 6th. You should see a "Daily limit reached" message, not a crash.

**Trust score / reputation tiers**
- Open your Profile tab. Your tier badge (Bronze / Silver / Gold / Platinum) should show next to your name.
- Scroll to "Recent point activity" — it should list your last few contribution events with a label (e.g. "Flag verified") and a point delta in green.
- If your total points are 0–99 you're Bronze, 100–499 Silver, 500–1499 Gold, 1500+ Platinum. Check that the badge matches.

**Leaderboard with tier emojis**
- From Profile, tap "Community Leaderboard."
- The top-10 list should load with tier emojis next to each name (e.g. 🥈 for Silver).
- Your own row should be highlighted in blue with a "you" badge.
- Tap the ✕ to dismiss — confirm no underlying screen state was lost.

**Disability / who-it-affects filter tags**
- On the map, open the filter panel and look for a "Who does this affect?" row of chips (Wheelchair/walker/scooter · Blind or low vision · Deaf or hard of hearing · Confusing layout or signage · Temporarily closed).
- Select one or two chips. Flags that don't match should disappear from the map.
- Tap "Clear" — all flags should come back.

**Reporting with context tags**
- Open the report form. Below the category and severity fields you should see both a seasonal tag section and a "Who does this affect?" section.
- Pick a couple of disability tags and submit.
- Find your new flag on the map, open the detail — the tags should appear under "Who this affects."

**Dark mode**
- On your iPhone, go to Settings → Display & Brightness → Dark.
- Open AccessMap. Every screen — Map, Tasks, Profile, flag detail, onboarding, leaderboard — should render in dark mode. No screen should show a solid white background or unreadable text.
- Flip back to Light mode and confirm the app follows.

**Multi-photo gallery**
- Open a flag detail that has at least one photo. Swipe horizontally through the gallery.
- If you own a flag, tap the "+" icon on the gallery and add a second photo. Confirm it appears without replacing the first.

**Typography**
- Every screen should use Plus Jakarta Sans (a slightly rounded sans-serif). If any screen or modal still shows the default system font, flag it with a screenshot.

---

_Questions or weird behaviour → tap Feedback (top-right on any screen) or email skylerhalisky@gmail.com._
