# On-Device A11y Checklist — Pre-TestFlight (2026-06-04 build)

Run this on a real iPhone **and** a real Android once the build installs. Scoped to the screens this
build touched (Card/Pill focus rings, Profile dividers, Feedback button) **plus** the 3 locked HIGH
items from Alex's gate (`2026-06-02_Alex_PreTester_A11y_Gate.md`) that a visual pass could regress.

**Priority if short on time:** do **Part B** (the 3 HIGH items) and **C1** (largest font) first — highest value.
The focus-ring check (A1) needs a Bluetooth keyboard; if you don't have one, skip it (it's covered by code
review + tests, and touch users never see the ring anyway).

---

## One-time setup

**iPhone**
- VoiceOver: Settings → Accessibility → VoiceOver → **On**. (swipe right/left = next/previous, double-tap = activate)
- Large font: Settings → Accessibility → Display & Text Size → Larger Text → turn on **Larger Accessibility Sizes** → drag the slider to **max**.
- Reduce Motion: Settings → Accessibility → Motion → **Reduce Motion** → On.
- (Only for A1) Full Keyboard Access: Settings → Accessibility → Keyboards → **Full Keyboard Access** → On, with a Bluetooth keyboard paired. **Tab** moves focus.

**Android**
- TalkBack: Settings → Accessibility → **TalkBack** → On. (swipe right/left = next/previous, double-tap = activate)
- Large font: Settings → Accessibility → **Font size** → max; **Display size** → max.
- Reduce Motion: Settings → Accessibility → **Remove animations** → On.
- (Only for A1) pair a Bluetooth keyboard (**Tab** moves focus) or use Switch Access.

---

## Part A — What THIS build changed

### A1. Card / Pill focus rings (NEW) — needs a keyboard or Switch Control
> The blue ring appears on **keyboard / switch-control focus only** — NOT on touch or a VoiceOver/TalkBack swipe. That's by design (it's for keyboard/switch users; touch users see no change). With a paired keyboard:
- **Tasks tab** → press **Tab** to move through the flag cards. ✅ PASS: a blue ring outlines the focused card, moves card-to-card, and there's **no layout jump** when it appears.
- **Map** → open the filter panel → **Tab** through the category/severity pills. ✅ PASS: a blue **pill-shaped** ring outlines the focused pill (works on both selected and unselected pills).
- ✅ PASS: ring is clearly visible in **both light and dark mode**, and never cut off at a screen edge.
- Touch sanity (no keyboard): tap cards/pills normally → behaves exactly as before, no ring. ✅ correct.

### A2. Profile point-history dividers (NEW)
- **Profile tab** → scroll to **"Recent point activity"**.
- ✅ Visual PASS: thin hairline lines separate each row; the list scans cleanly, not cramped or run-together.
- ✅ VoiceOver/TalkBack PASS: swipe through — each row reads as **one** item, e.g. *"Earned 10 points: verified a flag, 2 days ago"*. The divider line is silent.

### A3. Feedback button (top-right header)
- Any main screen → top-right **"Feedback"** button.
- ✅ Visual PASS: renders in the **brand font** (matches the app's other labels), clearly legible on the dark header.
- ✅ VoiceOver/TalkBack PASS: reads **"Send feedback, button"** with the hint; double-tap opens the feedback form.

---

## Part B — Locked a11y floor (re-confirm these 3 HIGH items still work)

### B1. Profile "Real-time updates" switch
- Profile → the **"Real-time updates"** (show new flags in real-time) switch.
- ✅ PASS: reads its label + **"switch"** + on/off **state**; **double-tap flips it** and the announced state changes.

### B2. Settings "Push notifications" switch
- Settings → the **"Push notifications"** switch.
- ✅ PASS: reads label + switch + state; double-tap flips it. If a brief loading spinner shows, the screen reader stays on the switch (spinner is silent).

### B3. Admin Remove / Dismiss buttons *(admin account only — skip if not signed in as admin)*
- Admin screen → a report card.
- ✅ PASS: VoiceOver/TalkBack reaches the card text **and** the **Remove** and **Dismiss** buttons as **separate** elements (the card does NOT collapse into one blob). Each reads a clear label (e.g. *"Remove ramp flag" / "Dismiss ramp report"*). Severity announces as **"Severity 3"** (a number, not a color).

---

## Part C — Global passes (all touched screens)

### C1. Largest font (Dynamic Type) — highest priority
- With the largest font on, visit **Tasks, Profile, Settings, Map filter panel, Report form**.
- ✅ PASS: **no text is cut off** (a word ending in "…" mid-sentence is a FAIL); buttons/cards grow to fit; points/stats stay readable.

### C2. Reduce Motion
- With Reduce Motion on: open & close a sheet (Report form / filters), pull-to-refresh, watch the Profile progress bars and the Tasks loading placeholders.
- ✅ PASS: animations are instant/disabled — no slide, scale, or shimmer. Nothing depends on motion to be understood.

### C3. Contrast — light + dark
- Settings → Appearance → toggle **Light**, then **Dark**.
- ✅ PASS: all text readable in both; the new **blue focus ring** is clearly visible on cards/pills in both modes; dividers visible but subtle; no near-invisible text.

---

## If something fails
Jot down: **screen + step + what you saw vs. expected.**
- A1–A3 failures = this build's changes → route to me (UI). 
- B1–B3 failures = the locked floor → route to **Alex (a11y)**.
- Don't invite wider testers until **A2, A3, B1–B3, and C1** pass. (A1 is optional; C2/C3 are quick confidence checks.)
