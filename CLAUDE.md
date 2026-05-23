# AccessMap — project context

A crowdsourced accessibility-flagging mobile app. Users drop pins at locations where there's an accessibility issue (no ramp, broken sidewalk, etc.), and other users verify, resolve, or reject those reports. Built so I (a beginner coder) could learn by doing — keep explanations friendly and avoid over-engineering.

**Live local path:** `~/AccessMap`
**Owner:** skylerhalisky@gmail.com

---

## Stack

- **Expo SDK 54** + **React Native 0.81** + **React 19.1**
- **TypeScript strict**
- **Supabase** — auth + Postgres + RLS + Storage
- **react-native-maps** (native) / **react-leaflet 5** (web)
- **expo-location**, **expo-image-picker**
- **@react-navigation/bottom-tabs**

Path alias: `@/*` → `src/*`

---

## File map

```
App.tsx                              auth gate → SignInScreen or RootNavigator
src/lib/
  supabase.ts                        typed Supabase client + sign in/up/out helpers
  auth.tsx                           AuthProvider / useAuth hook
  flags.ts                           listFlags, createFlag, updateFlagStatus,
                                       uploadFlagPhoto, CATEGORY_LABELS, etc.
src/navigation/
  RootNavigator.tsx                  bottom tabs (Map / Tasks / Profile).
                                       Map route takes { focusFlag, ts } params.
src/components/
  PlatformMap.tsx                    native map wrapper (react-native-maps)
  PlatformMap.web.tsx                web map wrapper (react-leaflet + OSM tiles)
src/screens/
  SignInScreen.tsx                   email/password
  MapScreen.tsx                      <PlatformMap />, filter panel, Report FAB
  ReportFlagModal.tsx                bottom-sheet form w/ photo capture.
                                       Also exports severityColor(s).
  TasksScreen.tsx                    FlatList of open/verified flags.
                                       Cards are tappable → opens that flag on Map.
                                       Flash banner shows "+points" on action.
  ProfileScreen.tsx                  points + reported/resolved counts.
                                       Auto-refreshes on tab focus.
src/types/
  database.ts                        Supabase typed schema (FlagRow, UserRow, ...)
supabase/
  schema.sql                         tables, triggers, RLS, Storage bucket + RLS
```

---

## Database (Supabase)

Two tables:

- `public.users` — mirrors `auth.users` + `points`, `display_name`, `avatar_url`.
  Auto-populated by `handle_new_user` trigger on `auth.users` insert.
- `public.flags` — `lat`, `lng`, `category` (6 enum-ish values), `severity` (1–5),
  `description`, `photo_url`, `status` (open / verified / resolved / rejected),
  `user_id`, `created_at`.

**Points trigger** (`handle_flag_status_change`, security definer):
- Reporter: +5 on `open → verified`, +10 on `open/verified → resolved`.
- Actor (the verifier/resolver, if NOT the reporter): +2 verified, +5 resolved.
- Forward-only — reverting or rejecting awards nothing.

**Storage bucket** `flag-photos`:
- Public read.
- Authenticated upload, but path must start with the user's own UUID
  (e.g. `<auth.uid>/1700000000000.jpg`).
- Owner-only delete.

All DDL in `supabase/schema.sql` is idempotent — safe to re-run.

---

## Setup

`.env` must contain:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Then:
```
npm install
# (apply supabase/schema.sql in the Supabase SQL editor)
npm start          # iOS sim / Expo Go
npm run web        # browser (uses react-leaflet)
npm run typecheck  # tsc --noEmit, must pass before shipping
```

---

## Gotchas (the load-bearing ones)

### 1. Database type must use `type`, not `interface`

In `src/types/database.ts`, the `Row`/`Insert`/`Update` shapes for each table
**must** be declared with `type` (not `interface`). Same for `Relationships` —
use the `EmptyRelationships` alias, not a plain `[]`.

If you ignore this, postgrest-js infers `Schema = never` and every `.insert()`
or `.update()` call breaks with "argument not assignable to type 'never'".

`npm run typecheck` is the canary.

When adding a table, follow the existing `flags` / `users` pattern.

### 2. react-leaflet 5 installs with `--legacy-peer-deps`

react-leaflet 5 wants React `^19.2.6`. Expo SDK 54 pins React 19.1.0. It still
works fine on 19.1; we just install with `--legacy-peer-deps`. If you bump
deps, keep that flag.

### 3. Map markers are platform-specific

Don't reach into `react-native-maps` from `MapScreen` directly. Go through
`PlatformMap` so the web bundle keeps working. Both variants expose the same
imperative handle: `{ animateTo, showCallout }`.

### 4. Photo uploads need authenticated user

`uploadFlagPhoto(userId, localUri)` puts files at `<userId>/<timestamp>.<ext>`.
The Storage RLS policy enforces that the first path segment matches `auth.uid()`,
so don't change the path scheme without updating the policy.

---

## Conventions

- TypeScript strict — no `any` if you can help it. Existing code uses `any` in
  `catch (e: any)` blocks, that's fine.
- Style: inline `StyleSheet.create` at the bottom of each component file.
- Colors live as hex literals in styles for now (no theme system yet).
- Forms use plain `useState` + `Pressable` — no form library.
- No tests yet. `tsc --noEmit` is the safety net.
- Don't add new features that weren't asked for. Beginner-friendly = small,
  understandable diffs.

---

## Recent features (May 2026)

All of these shipped together; if something seems wrong, this is recent code:

- **Tap a Tasks card → centers Map on that flag** with the callout open.
- **Filter panel** on the map (category chips + min severity).
- **Points trigger** awards points to reporter + actor on verify/resolve.
- **Photo upload** via camera or library; photos render in map callouts and
  Tasks card thumbnails.
- **Web build** works via react-leaflet + OpenStreetMap tiles.

## Recent QA pass (2026-05-22)

The repo was first committed to git on 2026-05-22, immediately followed by an
overnight QA pass on branch `qa/auto-2026-05-22` (10 fix commits + this note).
Full breakdown — including 9 propose-only items (RLS tightening, pagination,
clustering, lint/CI setup, etc.) — in `qa-reports/qa-2026-05-22.md`.

Flash-banner points in TasksScreen are now coupled to the trigger in
`supabase/schema.sql` (handle_flag_status_change). If the trigger values
ever change, update the +5/+10/+2/+5 strings in `setStatus` to match.

---

## When the user asks for changes

- The user is learning. Explain what you're doing at key moments — terse, but
  in plain language, not jargon-soup.
- Prefer editing existing files over adding new ones.
- Always run `npm run typecheck` before declaring something done.
- If a change requires the user to do something on the Supabase dashboard
  (run SQL, flip a setting, etc.), spell out the exact steps as a numbered list.
