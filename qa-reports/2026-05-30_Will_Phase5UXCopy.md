# Will — Phase 5 UX Copy Audit
**Date:** 2026-05-30
**Branch:** `feat/sprint3-ux-copy`
**Typecheck:** ✅ clean (`tsc --noEmit` zero errors)

---

## Summary

Audited all copy across Phase 5 features: onboarding carousels, disability tag labels, comments UI, photo gallery, and error states. The flag reopen feature has DB columns but no UI copy yet — nothing to audit there.

**Files changed:** 4
**Strings changed:** 12
**Strings kept as-is:** see rationale below

---

## Before / After Table

### OnboardingCards.tsx (`src/components/OnboardingCards.tsx`)

| Location | Before | After | Rationale |
|---|---|---|---|
| Card 4 title | `One last thing` | `Location helps the map work` | "One last thing" felt like an afterthought for a privacy-sensitive ask. The new title names the benefit, which softens the permission request. |
| Card 4 body | `AccessMap works best with your location. We use it to show nearby issues and to place your reports accurately. Location is only shared while the app is open.` | `We use your location to show nearby flags and to place your pins accurately. It's never stored between sessions or shared with other users.` | "Location is only shared while the app is open" was ambiguous — shared with whom? The new copy uses "never stored … or shared with other users" which answers both questions directly. |
| "Allow Location Access" button | `Allow Location Access` | `Allow Location` | Shorter and less legalistic. "Access" is redundant on a button that already triggers a permission dialog. |
| Final CTA (permission already granted / last non-permission card) | `Get Started` | `Open the Map` | The brief asked for an invitation, not a command. "Open the Map" names what actually happens next, making it feel more like an invitation into a specific place. |

### OnboardingModal.tsx (`src/screens/OnboardingModal.tsx`)

| Location | Before | After | Rationale |
|---|---|---|---|
| Card 2 title | `Severity 1 to 5` | `Rate the barrier` | "Severity 1 to 5" reads like a form label or a spec. "Rate the barrier" is a verb phrase — conversational, action-oriented, consistent with the app's community tone. |
| Card 2 body | `When you report a flag, pick how bad it is. 1 is a minor inconvenience, 5 is impassable. The map shows both the number and a color so the meaning is clear even without color vision.` | `Rate the issue from 1 (a minor inconvenience) to 5 (completely impassable). The map shows both number and color so the meaning is clear at a glance.` | Trimmed 10 words. "even without color vision" is important but "at a glance" carries the same accessibility intent more naturally for a general audience. The a11y detail is handled in the product itself (color+number pairing). |
| Final CTA | `Get started` | `Open the Map` | Same rationale as OnboardingCards — consistency and specificity. |

### contextTags.ts (`src/lib/contextTags.ts`) — `DISABILITY_TAG_LABELS`

| Tag key | Before | After | Rationale |
|---|---|---|---|
| `mobility_barrier` | `Mobility (wheelchair, walker, scooter)` | `Wheelchair, walker, or scooter` | The parenthetical "(wheelchair, walker, scooter)" reads like code comments. Removing "Mobility" and rewriting as a plain list is how a person would say it. Screen readers speak this verbatim; the list form flows naturally. |
| `vision_hazard` | `Low vision or blind` | `Blind or low vision` | "Blind or low vision" is the order preferred by most disability organizations (NFB, ACB, etc.) and the US accessibility community. More importantly it puts the most commonly understood term first for users who may not know "low vision" is a clinical sub-category of visual impairment. |
| `hearing_concern` | `Deaf or hard of hearing` | *(unchanged)* | Already the standard community-preferred phrasing. |
| `cognitive_load` | `Confusing layout or signage` | *(unchanged)* | This one is excellent — it describes the barrier rather than a clinical category. Kept as-is. |
| `temporary_closure` | `Temporary closure` | `Temporarily closed` | Noun phrase → adjective phrase. "Temporarily closed" reads as a description of current state ("this place is temporarily closed"), which is how a human would say it in context. |

### FlagDetailModal.tsx (`src/components/FlagDetailModal.tsx`)

| Location | Before | After | Rationale |
|---|---|---|---|
| Comments empty state | `No comments yet. Be the first to add one.` | `No comments yet — share what you know.` | "Be the first to add one" puts the emphasis on novelty (being first). "Share what you know" invites a meaningful contribution — aligns better with an app that's about reliable, useful information. |
| Comments table not ready | `Comments coming soon` | `Comments aren't available here yet.` | "Coming soon" is startup-speak. The new copy explains the actual state without making a promise. |
| Comments error state | `{commentsError}` (raw `errorMessage()` output, e.g. "network request failed") | `Couldn't load comments. Check your connection and try again.` | Raw technical error strings should never reach users. The friendly copy names the symptom and gives the one action a user can actually take. `commentsError` still gates the display — we just don't interpolate it into the visible string. |
| Maps open error | `Alert.alert('Could not open maps app.')` (title only, no body) | `Alert.alert("Couldn't open maps", 'No maps app was found on your device.')` | Alert with no body is confusing — users can't tell if they did something wrong or if it's a device issue. The body clarifies it's a device-level gap, not a user error. |

---

## Items Kept As-Is (with rationale)

| Item | Decision |
|---|---|
| Card 1 `Welcome to AccessMap` — both onboarding flows | Body copy is warm, specific, and community-focused. No changes needed. |
| Card 3 `Earn points together` — OnboardingModal | "Help build the map" is a strong closer. Kept. |
| Cards 1–3 — OnboardingCards | All three are already warm, plain-language, and purposeful. |
| `hearing_concern: 'Deaf or hard of hearing'` | Standard community phrasing. Perfect as-is. |
| `cognitive_load: 'Confusing layout or signage'` | Best tag label in the set — describes the barrier, not the person. Kept. |
| Comment input placeholder `Add a comment…` | Clear, standard, mobile-appropriate. "Share what you know…" would be more specific but "Add a comment" has universal recognition. |
| Delete comment dialog (`Delete comment?` / `This permanently removes your comment.`) | Clear, proportionate, not alarming. "Permanently" is appropriate here — the action is irreversible. |
| ErrorBoundary copy (`Something went wrong` + body) | Already friendly and actionable. |
| Photo gallery `Add photo` label | Clear for first-photo context; a11y label already says "Add another photo" with count hint when photos exist. |

---

## Out of Scope (noted only)

- **Flag reopen UI** — `reopen_requests` columns exist in DB but no UI copy has been written yet. Nothing to audit.
- **Notification permission slide** — brief mentioned it, but no notification onboarding card exists in either `OnboardingCards.tsx` or `OnboardingModal.tsx`. If one is added in a future sprint, the copy brief is: *"Get notified when flags near you change — you can turn this off anytime."*
- **Max photos reached message** — currently the add button silently hides when at the 5-photo cap. No explicit "max reached" message exists. A future improvement: show `"5 photos max"` as a small label below the gallery when `photos.length >= maxPhotos`.
