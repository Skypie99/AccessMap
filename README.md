# AccessMap

Expo + React Native + TypeScript app for crowdsourced accessibility flags, backed by Supabase.

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
  navigation/
    RootNavigator.tsx            # Bottom tabs: Map / Tasks / Profile
  screens/
    MapScreen.tsx
    TasksScreen.tsx
    ProfileScreen.tsx
    SignInScreen.tsx
  types/
    database.ts                  # Typed Database for supabase-js
supabase/
  schema.sql                     # Tables, trigger, RLS policies
```
