# Flagstone Onboarding Content Spec

**Audience:** First-time users, just signed up  
**Goal:** Teach the 3 core actions in under 2 minutes  
**Style:** Friendly, short, actionable — no walls of text

---

## Onboarding Flow (5 steps)

### Step 1: Welcome screen (shown once on first launch)

**Headline:** "Welcome to Flagstone"  
**Body:** "Your community is mapping accessibility barriers. Add yours. Verify others. Make change happen."  
**Button:** "Get Started"  
**Skip link:** "Skip intro"

**When:** First app launch after sign-in, before Map renders  
**Intent:** Set expectations — this is collaborative, not a complaint app  

---

### Step 2: Map coach mark (points to the map)

**Tooltip text:** "This is your community map. Blue pins are open issues. Green pins are verified. Tap any pin to see details."  
**Pointer:** → Map (center of viewport)  
**Button:** "Got it"

**When:** Immediately after "Get Started" button  
**Intent:** Show that the map is the hub; explain pin colors at a glance  
**Note:** Assumes map has loaded. If loading, show tooltip on first non-empty render.

---

### Step 3: Report button coach mark (points to the FAB / report button)

**Tooltip text:** "Spot a barrier? Tap here to report it. Takes under 60 seconds."  
**Pointer:** → Report FAB button (bottom-right)  
**Button:** "Got it"

**When:** After "Got it" on Step 2  
**Intent:** Announce the easiest way to contribute; lower friction with "60 seconds"  

---

### Step 4: Tasks tab coach mark (points to the Tasks tab)

**Tooltip text:** "The Tasks tab shows all reported barriers nearby. Tap 'Verify' if you've seen one yourself — it helps the community."  
**Pointer:** → Tasks tab (bottom nav)  
**Button:** "Got it"

**When:** After "Got it" on Step 3  
**Intent:** Teach the main way to earn points; frame verification as peer action  

---

### Step 5: Points intro (shown after first action — report OR verify)

**Headline:** "You earned points! 🎉"  
**Body:** "Every report earns 5 points. Every verification earns 2 points. Points show your contribution to the community."  
**Button:** "See my profile"

**When:** After user completes their first `createFlag()` or `updateFlagStatus('verified')` call  
**Intent:** Reward the first action; explain points system; prompt them to check Profile  
**Note:** If they tap "See my profile," navigate to ProfileScreen. If they dismiss, close the modal.

---

## Empty State Copy

Shown when the user has completed onboarding but there's no content to display:

### Map empty state (no flags in viewport)

**Text:** "No accessibility reports in this area yet. Be the first to add one — tap the + button."  
**Visual:** Icon + gray text below map, or centered in viewport if map bounds are unknown

**When:** Map loads with zero flags in visible region  
**Intent:** Encourage the first report without making them feel lost

---

### Tasks empty state (no flags nearby)

**Text:** "No reports here yet. Explore a different area, or add a new report."  
**Button link:** "View all" → expands to show flags beyond user's location  

**When:** TasksScreen loads with zero items (either no flags at all, or no flags within ~5 km)  
**Intent:** Offer alternatives (expand scope or create new) so they don't get stuck

---

## Error States

### Location permission denied

**Title:** "Location access requested"  
**Text:** "Location access lets you see nearby barriers. You can still browse the full map without it."  
**Button A:** "Enable Location" → opens device Settings for location permission  
**Button B:** "Browse Map" → closes modal and lets them continue without location  

**When:** MapScreen loads and location permission is not granted  
**Intent:** Explain the benefit without forcing it; preserve access for privacy-conscious users

---

### Network error (flag not created or updated)

**Title:** "Can't connect right now"  
**Text:** "Your report is saved. It'll upload when you're back online."  
**Button:** "Dismiss"

**When:** `createFlag()` or `updateFlagStatus()` fails with a network error  
**Intent:** Reassure that data isn't lost; manage expectations about sync delay  
**Note:** Triggered on `error.message.includes('network')` or offline indicator

---

### Photo privacy/MIME error (upload prevented)

**Title:** "Photo privacy check"  
**Text:** "We couldn't verify this photo's privacy settings. Try a different photo, or report without a photo."  
**Button A:** "Pick another photo" → re-open photo picker  
**Button B:** "Report without photo" → submit flag with empty `photo_url`

**When:** Photo validation fails (bad EXIF, unsupported MIME, or privacy gate triggers)  
**Intent:** Respect privacy but don't block the user; they can still report without a photo  
**Implementation note:** See `src/lib/flags.ts` `validatePhotoPrivacy()` for exact triggers

---

## Tooltip Timing Rules

- **Shown once per user:** Use `AsyncStorage.getItem('onboarding_completed')` to skip repeats
- **Delay on screen load:** Wait 500ms before showing tooltip (let UI settle)
- **No stacking:** Only one tooltip visible at a time
- **Always dismissible:** "Got it" or tap outside = dismiss
- **No show during loading:** Don't overlay during map tile fetch, photo upload, etc.
- **Survive sign-out:** Reset `onboarding_completed` on `AuthProvider` `signOut()`

---

## Localization Notes

All copy should meet these standards:

- **Length:** ≤ 25 words per tooltip (keep it scannable)
- **Idioms:** Avoid metaphors that don't translate (e.g., "low-hanging fruit")
- **Terminology:** Use "tap" (mobile), "select" (neutral), never "click"
- **Punctuation:** End with period unless it's a question
- **Future languages:** Québec French and Spanish are priority; use simple present tense

---

## Implementation Notes for Shamus

### Storage & Tracking

```typescript
// Mark onboarding complete after Step 5
await AsyncStorage.setItem('onboarding_completed', JSON.stringify({
  completed_at: new Date().toISOString(),
  steps_shown: [1, 2, 3, 4, 5]
}));

// Check on app load
const onboarding = await AsyncStorage.getItem('onboarding_completed');
if (!onboarding) {
  // Show welcome modal (Step 1)
}

// Reset on sign-out
await AsyncStorage.removeItem('onboarding_completed');
```

### UI Implementation

- **Tooltips:** Use `@gorhom/bottom-sheet` overlay pattern (already in app for ReportFlagModal)
- **Coach marks:** Position overlay with absolute positioning; use `Animated` for fade-in/out
- **Modal overlay:** Semi-transparent `<View>` beneath tooltip (Z-index above map, below tooltip)
- **Accessibility:** Wrap tooltip in `<AccessibilityInfo>` with label + role="alert"

### Analytics Events

```typescript
track('onboarding_step_shown', { step: 1 });
track('onboarding_step_completed', { step: 1, action: 'got_it' | 'skip' });
track('onboarding_completed', { total_steps: 5, duration_ms: 87000 });
track('first_action_completed', { action_type: 'report' | 'verify' });
```

### Testing

To reset onboarding during development:
```bash
# In Expo Dev Tools or via console:
await AsyncStorage.removeItem('onboarding_completed');
// Reload app
```

---

## Content Approval Checklist

- [ ] Copy reviewed by Dani (UX voice + tone)
- [ ] Copy reviewed by Morgan (clarity + community framing)
- [ ] Tone matches "friendly but not condescending"
- [ ] All steps testable on both iOS sim + web (Expo Go)
- [ ] Dark mode copy readability verified
- [ ] Localization placeholders added to i18n file (if exists)
- [ ] Analytics events wired (event names match data warehouse schema)

---

## Future Enhancements

These are out-of-scope for v1 but worth noting:

- **Video tours:** Short 15-sec clips for each step (Step 3: "how to take a good report photo")
- **Conditional paths:** Different onboarding for android vs iOS (if behavior differs)
- **Re-engagement:** Show Step 5 ("Points") reminder if user hasn't acted in 7 days
- **Accessibility deep-dive:** Dedicated a11y onboarding for screen-reader users
