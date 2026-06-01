# Copy Sweep — Phase 5 (2026-06-01)

**Author:** Will (Technical Writer)
**Branch:** `feat/phase5-copy-sweep`
**Typecheck:** clean (`npx tsc --noEmit` passes)

---

## Voice direction

Every string was evaluated against a single question: **does this sound like a knowledgeable friend explaining accessibility, or a corporate app?**

Changes favour warm, direct, human language. Generic placeholders and robotic error titles were rewritten. Empty states now suggest a next step instead of dead-ending.

---

## Changelog — every copy change

### SignInScreen
| Before | After |
|---|---|
| "Flag the world. Make it more accessible — together." | "Spot barriers. Share them. Make your community more accessible." |
| `Alert.alert('Auth error', ...)` | `Alert.alert("Couldn't sign you in", ...)` |
| "Location is only used when reporting a flag." | "Your location is only used when you place a flag." |
| "Continue as guest →" | "Browse without an account →" |
| "Read-only · can't report or verify flags" | "You can look around, but you'll need an account to report or verify" |

### OnboardingCards (5 slides)
| Slide | Before | After |
|---|---|---|
| 1 — Welcome | "AccessMap helps you find and report accessibility barriers in your community." | "See an accessibility barrier — a missing ramp, a broken sidewalk, a blocked path? Put it on the map so others know, and so it gets fixed." |
| 2 — How it works | "How it works" / "Tap the map to report a barrier. Add a photo, rate how severe it is, and help others navigate safely." | "Here's how it works" / "Tap where the barrier is, snap a photo if you can, and rate how bad it is. Other people verify your report or mark it resolved once the issue is fixed." |
| 3 — Location | "We use your location to show nearby accessibility flags..." | "We'll use your location to show nearby barriers and place your reports accurately. It's only used while the app is open — never tracked or stored on our servers." |
| 4 — Notifications | "Get notified when flags near you are updated or resolved. This is optional..." | "Get a heads-up when flags near you are verified or resolved. Totally optional — you can turn this on later in Settings." |
| 5 — Ready | "You're ready" / "Start exploring your community and help make it more accessible for everyone." | "You're all set" / "Go explore your neighbourhood. Every barrier you flag helps someone navigate the world a little easier." |

### MapScreen
| Before | After |
|---|---|
| `Alert.alert('Could not get location', ...)` | `Alert.alert("Couldn't find your location", ...)` |
| "Report a flag here?" / "Drop a new accessibility report at..." | "Report a barrier here?" / "Place a new flag at..." |
| "No flags match your filters" | "Nothing here right now" |
| "Try broadening your filters, or reset to see all nearby flags." | "Your filters are hiding everything. Try widening them, or reset to see all nearby flags." |
| "Location permission denied. Enable it in Settings to report a flag." | "Location access is off. Turn it on in your device Settings to report barriers near you." |
| "Distance filter needs your location. It will activate once location is shared." | "Distance filter needs your location to work. It'll kick in once you share it." |
| "Save your current filter as a named set to quickly switch later." | "No saved filters yet. Save your current view to switch back to it quickly." |
| "Pick at least one status to see flags." | "Pick at least one status — otherwise nothing will show up." |

### TasksScreen
| Before | After |
|---|---|
| "No flags to triage right now. New community reports will land here as they're added — pull to refresh anytime." | "You're all caught up — nice work! New reports show up here as the community adds them. Pull down to refresh anytime." |
| "You've seen all flags nearby ✓" | "That's everything nearby — you're up to date ✓" |
| "Showing offline data — connect to refresh" | "Showing saved data — connect to the internet for the latest" |
| `Alert.alert('Could not update flag', ...)` | `Alert.alert("Couldn't update this flag", ...)` |
| `Alert.alert('Could not update watched list', ...)` | `Alert.alert("Couldn't update your watched list", ...)` |
| "Search description or category" (placeholder) | "Search by description or category…" |

### ProfileScreen
| Before | After |
|---|---|
| "Not signed in." | "Sign in to see your stats, badges, and reports." |
| `Alert.alert('Could not load profile', ...)` | `Alert.alert("Couldn't load your profile", ...)` |
| `Alert.alert('Could not save name', ...)` | `Alert.alert("Couldn't save your name", ...)` |
| `Alert.alert('Could not update photo', ...)` | `Alert.alert("Couldn't update your photo", ...)` |
| `Alert.alert('Could not pick photo', ...)` | `Alert.alert("Couldn't pick a photo", ...)` |
| `Alert.alert('Could not save preference')` | `Alert.alert("Couldn't save that preference")` |
| "Allow photo library access to set a profile photo." | "Allow photo access so you can choose a profile picture." |
| "See your reports here once you submit one." | "You haven't reported any barriers yet — your first one will show up here." |
| "View every flag you've submitted." | "Every barrier you've reported, in one place." |
| "Track flags you care about and see when their status changes." | "Keep an eye on barriers you care about and get notified when something changes." |
| "See what's been reported and triaged across the community, newest first." | "What the community has been up to — newest first." |
| "Earn badges by reporting, triaging, and showing up." | "Start reporting and verifying to earn your first badge." |
| "You've earned every badge — legend status." | "You've earned every single badge. Legend." |
| "Top 20 contributors ranked by points." | "See who's making the biggest impact in the community." |
| "Choose which flag status changes surface as updates." | "Pick which changes you want to hear about." |
| "View the feedback messages you've sent." | "See the messages you've sent to the team." |
| "Common questions about reports, points, and accessibility." | "Answers to the questions people ask most." |
| "Recent features added to AccessMap." | "See what we shipped recently." |
| "What it is, who built it, and how to get in touch." | "The story behind AccessMap and how to reach us." |
| "The name shown next to your reports. Leave empty to use your email." | "This shows next to your reports. Leave it blank and we'll use your email instead." |
| "The app opens to this tab when you sign in." | "AccessMap will open to this tab each time you launch the app." |
| "Map updates automatically when flags change." | "The map refreshes on its own as flags are added or triaged — no pulling to refresh." |
| "Want to remove your reports too? Contact support." | "If you also want your reports removed, get in touch with support and we'll take care of it." |
| "Earn points by reporting flags and helping verify or resolve them. Each tier reflects how much you've contributed." | "Earn points every time you report a barrier or help verify and resolve one. Each tier shows how much you've given back to the community." |

### ReportFlagModal
| Before | After |
|---|---|
| `Alert.alert('Could not pick photo', ...)` | `Alert.alert("Couldn't pick a photo", ...)` |
| `Alert.alert('Could not report flag', ...)` | `Alert.alert("Couldn't submit your report", ...)` |
| placeholder: "What's going on here?" | "Describe the barrier — e.g. broken curb cut on Main St" |

---

## Patterns applied

1. **Error titles**: `"Could not X"` → `"Couldn't X"` — contractions sound human, not robotic.
2. **Empty states**: Every empty state now tells the user *why* it's empty and *what to do next*.
3. **Onboarding**: Concrete examples ("a missing ramp, a broken sidewalk") instead of abstract categories.
4. **Button labels**: Action verbs that name the result, not the mechanism.
5. **Permission prompts**: Explain the *benefit*, not the *mechanism* ("show barriers near you" vs "use your location").
6. **Consistent vocabulary**: "barrier" for what the user sees, "flag" for the data object, "report" for the action.
