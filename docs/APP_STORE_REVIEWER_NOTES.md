# App Store Reviewer Notes

## Test Account

| Field    | Value                    |
|----------|--------------------------|
| Email    | reviewer@accessmap.app   |
| Password | AccessMap2026!           |

The account has a contributor profile with 25 points and 5 pre-seeded accessibility flags in downtown Vancouver so the map is populated on first launch.

---

## What to Test

1. **Sign in** — tap "Sign in", enter the credentials above.
2. **Map** — the map opens centered on your device location; pan to Vancouver (or use any location) to see the pre-seeded flags.
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
