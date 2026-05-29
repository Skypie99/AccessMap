# AccessMap

Expo + React Native + TypeScript app for crowdsourced accessibility flags, backed by Supabase.

## What's in v0.2.0

- **Accessibility flag reporting** — drop pins with location, photo, description, and category (6 types)
- **Community map** — react-native-maps on iOS/Android, react-leaflet on web
- **Marker clustering** — groups nearby flags to keep the map readable
- **Heatmap density view** — shows accessibility hot spots (privacy-safe k≥3 minimum)
- **Realtime flag updates** — Supabase Realtime keeps all users in sync
- **Push notifications** — iOS push support for flag status changes
- **Web tile caching** — offline-capable map tiles via react-leaflet
- **Points + achievements** — gamified reporting: +5 verified, +10 resolved
- **Edit profile** — avatar upload, custom display name
- **Context tags** — categorize flags by type (no ramp, broken sidewalk, etc.)
- **Dark mode** — consistent throughout the app
- **WCAG 2.1 AA** — fully accessible from signup to reporting
- **GitHub Actions CI** — 1,120 automated tests on every push
- **EAS build profiles** — App Store ready, signed release builds

## Setup

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm start
```

## Supabase

1. Create a project at https://supabase.com.
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
3. In **Authentication → Providers**, enable Email/Password.
4. Copy the project URL and anon key into `.env` as
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

The schema creates:

- **`users`** — mirror of `auth.users` with `display_name`, `avatar_url`, and `points`.
  Auto-populated by a trigger on `auth.users` insert.
- **`flags`** — accessibility issues with `lat`/`lng`, `category`, `description`,
  `severity` (1–5), `photo_url`, and `status` (`open` / `verified` / `resolved` / `rejected`).

Row-level security:

- Any authenticated user can read all rows.
- Users can only insert/update/delete their **own** flags and profile.

## Structure

```
App.tsx                          # Auth gate → SignIn or RootNavigator
src/
  lib/
    supabase.ts                  # Supabase client + auth helpers
    auth.tsx                     # AuthProvider / useAuth hook
    flags.ts                     # listFlags / createFlag / updateFlagStatus
                                 #   + uploadFlagPhoto + CATEGORY_LABELS
  navigation/
    RootNavigator.tsx            # Bottom tabs: Map / Tasks / Profile
  components/
    PlatformMap.tsx              # Native map (react-native-maps)
    PlatformMap.web.tsx          # Web map (react-leaflet + OSM tiles)
  screens/
    MapScreen.tsx                # <PlatformMap />, filters, Report FAB
    TasksScreen.tsx              # FlatList of open/verified flags
    ProfileScreen.tsx            # Points + counts + sign out
    SignInScreen.tsx             # Email/password
    ReportFlagModal.tsx          # Bottom-sheet form (also exports
                                 #   severityColor())
  types/
    database.ts                  # Typed Database for supabase-js
supabase/
  schema.sql                     # Tables, triggers, RLS policies
```

### Web build

`npm run web` runs the app in a browser via react-leaflet + OpenStreetMap
tiles. The map wrapper is platform-split — see `src/components/PlatformMap.*`.
Don't import `react-native-maps` outside that wrapper or the web bundle breaks.

### Listing flags

`listFlags(...)` in `src/lib/flags.ts` caps results at 500 rows by design —
it's the floor that keeps the Map and Tasks screens responsive on early data
volumes. See proposal **P1** in `qa-reports/qa-2026-05-22.md` for the
cursor-based-pagination follow-up.
