# Flagstone Push Notification Strategy

**Last Updated:** 2026-06-01
**Status:** Draft — iOS only (Expo Notifications, APNs). Android push planned for Sprint 4.

---

## Principles

- **Warm, not clinical.** Copy celebrates the user's contribution — never system-speak.
- **Actionable or celebratory only.** We don't send notifications that don't serve the user.
- **Quiet by default.** Users opt in to notification categories. Default: tier milestones only.
- **No PII in payload.** Push payloads are server-generated; no location or disability data travels through APNs.

---

## Tier Milestone Notifications

Sent when a user crosses a tier threshold for the first time. Triggered server-side by the `handle_flag_status_change` point trigger after the `points` column is updated.

Each notification fires once per tier — crossing back down and up again does not re-fire (guarded by a `tier_milestone_sent` column or equivalent dedup on the server).

| Transition | Title | Body |
|---|---|---|
| Bronze → Silver | **You've levelled up!** | You're a trusted contributor now 🥈 Keep mapping barriers for your community. |
| Silver → Gold | **Gold status unlocked!** | Gold status unlocked 🥇 Your reports carry extra weight now. |
| Gold → Platinum | **You've reached Platinum!** | You've reached Platinum 💎 You're one of Flagstone's most trusted voices. |

### Full payloads (APNs format)

**Bronze → Silver**
```json
{
  "title": "You've levelled up!",
  "body": "You're a trusted contributor now 🥈 Keep mapping barriers for your community.",
  "sound": "default",
  "data": { "type": "tier_milestone", "tier": "silver" }
}
```

**Silver → Gold**
```json
{
  "title": "Gold status unlocked!",
  "body": "Gold status unlocked 🥇 Your reports carry extra weight now.",
  "sound": "default",
  "data": { "type": "tier_milestone", "tier": "gold" }
}
```

**Gold → Platinum**
```json
{
  "title": "You've reached Platinum!",
  "body": "You've reached Platinum 💎 You're one of Flagstone's most trusted voices.",
  "sound": "default",
  "data": { "type": "tier_milestone", "tier": "platinum" }
}
```

The `data.type` field lets the app route the tap to the user's profile/tier badge. The `data.tier` field lets the client show the right tier color/emoji without a round-trip.

---

## Flag Status Notifications

Sent to the flag reporter when their flag's status changes.

| Event | Title | Body |
|---|---|---|
| open → verified | **Your report was verified** | The community confirmed your accessibility report. +5 points added. |
| open/verified → resolved | **Report resolved** | An issue you reported has been resolved. +10 points added. |
| open → rejected | **Report update** | Your accessibility report was reviewed and closed. |

---

## Comment Notifications

| Event | Title | Body |
|---|---|---|
| New comment on user's flag | **New comment** | Someone commented on your accessibility report. |
| Comment upvoted | **Thumbs-up** | Your comment got a thumbs-up from the community. |

---

## Delivery Notes

- **Token storage:** `public.users.push_token` (set on sign-in from `expo-notifications`).
- **Rate limiting:** max 3 notifications per user per 24h (non-milestone categories).
- **Dedup:** tier milestone notifications carry a server-side dedup key; the same tier fires at most once per user lifetime.
- **Deep link:** tapping any notification opens the app to the relevant screen — tier milestones → Profile, flag events → that flag on the map, comments → FlagDetailModal.
