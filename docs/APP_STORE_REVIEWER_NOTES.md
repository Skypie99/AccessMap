# App Store Reviewer Notes

## Test Account

| Field    | Value                    |
|----------|--------------------------|
| Email    | [PROVIDED IN APP STORE CONNECT REVIEW NOTES] |
| Password | [PROVIDED IN APP STORE CONNECT REVIEW NOTES] |

The account is a normal contributor account. It carries no special privileges.

**Where the reports are:** Flagstone is a community map, so what you see depends on where you
look. Reports are concentrated around **Kelowna, British Columbia**. If the map opens on your own
location and appears empty, that is the app working correctly — an area with no reports yet shows an
empty state inviting you to add the first one. To see populated data, search or pan to Kelowna, BC.

You can also **browse the entire map without an account** — tap **Skip** on the sign-in screen. Signing
in is only needed to report, verify, or comment.

---

## What to Test

1. **Sign in** — tap "Sign in", enter the credentials above.
2. **Map** — the map opens centered on your device location. Pan or search to **Kelowna, BC** to see reports; an empty map elsewhere is the correct empty state, not an error.
3. **Flag detail** — tap any map pin to see the category, severity badge, description, and status.
4. **Report a barrier** — tap the **+** button (bottom-right) to fill in a new report. Location, category, severity, and description are required; photo is optional.
5. **Tasks tab** — shows open and verified flags as a list. Tap a card to jump back to that flag on the map.
6. **Profile tab** — shows your display name, total points earned, and counts of flags reported/resolved.

---

## Permissions

| Permission         | Required? | Why                                          |
|--------------------|-----------|----------------------------------------------|
| Location           | Yes       | Centers the map and pre-fills report location |
| Camera / Photos    | Optional  | Attach a photo when reporting a barrier       |
| Push Notifications | Optional  | Alerts when a reported flag is verified       |

---

## Platform Notes

- Requires iOS 16+.
- All user data is stored in Supabase (PostgreSQL + Row-Level Security). No data is shared with third parties.
- The test account is a real account — actions taken during review (new flags, status changes) will persist. You are welcome to leave them; they will not affect other users' experiences.
