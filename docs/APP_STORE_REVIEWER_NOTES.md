# App Store Reviewer Notes

## Test Account

| Field    | Value                    |
|----------|--------------------------|
| Email    | [PROVIDED IN APP STORE CONNECT REVIEW NOTES] |
| Password | [PROVIDED IN APP STORE CONNECT REVIEW NOTES] |

The account is a normal contributor account. It carries no special privileges.

**Where the reports are:** Flagstone is a community map, so what you see depends on where you
look. Reports are concentrated around **Kelowna, British Columbia**. If the map opens on your own
location and appears empty, that is the app working correctly; an area with no reports yet shows an
empty state inviting you to add the first one. To see populated data, search or pan to Kelowna, BC.

You can also **browse the entire map without an account**: tap **"Browse without an account →"** on the
sign-in screen. Reporting a barrier works without an account too: from the **Home** tab, tap **Report**.
Signing in is only needed to verify or resolve someone else's report, to comment, and to earn points.

---

## What to Test

1. **Sign in:** tap "Sign in", enter the credentials above.
2. **Map:** the map opens centered on your device location. Pan or search to **Kelowna, BC** to see reports; an empty map elsewhere is the correct empty state, not an error.
3. **Flag detail:** tap any map pin to see the category, severity badge, description, and status.
4. **Report a barrier:** signed in, tap the **+** button (bottom-right of the map). Browsing without an account, use the **Report** button on the **Home** tab instead; the **+** is shown only to signed-in users. Location, category, severity, and description are required; photo is optional.
   - **Report objectionable content:** open any flag's detail sheet and scroll to **Report**; reporting a flag works without an account. Comments (and their per-comment **Report** controls) are visible once signed in; use the test account above to review comment reporting and the block-user control.
5. **Tasks tab:** shows open and verified flags as a list. Tap a card to jump back to that flag on the map.
6. **Profile tab:** shows your display name, total points earned, and counts of flags reported/resolved.

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
- All user data is stored in Supabase (PostgreSQL + Row-Level Security). The one other recipient is OpenStreetMap's Nominatim service, which receives the text typed into the address-search field in order to look it up; nothing else leaves Supabase, and there are no advertisers, analytics, or trackers.
- Photos have their EXIF metadata, including GPS, stripped before upload, and the strip fails closed: if it cannot be verified, the upload is refused rather than sent.
- The test account is a real account; actions taken during review (new flags, status changes) will persist. You are welcome to leave them; they will not affect other users' experiences.
