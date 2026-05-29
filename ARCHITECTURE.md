# AccessMap Architecture

## What Is AccessMap?

AccessMap is a crowdsourced accessibility-flagging mobile app where users drop pins at locations with accessibility issues (no ramp, broken sidewalk, etc.), and other users verify, resolve, or reject those reports. It teaches you TypeScript + React Native + Supabase by building a real app that learns by doing.

**Live platforms:** iOS, Android (via Expo), Web (via react-leaflet).

---

## System Layers

### 1. Presentation (React Native UI)

- **Platform wrappers** — `PlatformMap.tsx` (native) and `PlatformMap.web.tsx` (web) handle iOS/Android maps via react-native-maps, and web maps via react-leaflet + OpenStreetMap tiles.
- **Screens** — each tab content (`MapScreen`, `TasksScreen`, `ProfileScreen`, `SettingsScreen`).
- **Modals** — shared modals (Help, Feedback, Changelog) live in a context pool; forms use plain `useState` + validation.
- **Components** — UI primitives (buttons, cards, cards) and domain components (FlagDetailModal, ReportFlagModal, FilterPanel).

**Styling:** Inline `StyleSheet.create()` per file; hex colors + theme tokens from `src/theme.ts`.

### 2. State Management

- **AuthProvider** (`lib/auth.tsx`) — wraps the app, holds the Supabase session. `useAuth()` gives you `{ session, user, loading }`.
- **FlagsProvider** (`lib/flagsStore.tsx`) — client-side flags cache (in-memory), scoped per user. Loads on boot, subscribes to Supabase Realtime for live updates. Exposes `{ flags, loading, error, refetch }`.
- **Theme** — dark/light mode via `ThemeContext` and theme tokens in `src/theme.ts`.
- **Shared Modals Context** (`lib/sharedModalsContext.tsx`) — coordinates which Help/Changelog/Feedback modal is open.
- **Preferences & Points** — AsyncStorage for saved preferences (default tab, notifications on/off), and "last seen points" watermark to celebrate when a user earns points while away.

### 3. Data Layer (Supabase)

- **Database** — Postgres tables: `users` (profile + points), `flags` (the reports), `push_tokens` (for Expo notifications), `feedback` (user-submitted feedback).
- **Auth** — Supabase Auth (email + password sign-up/sign-in); JWT stored in Supabase client.
- **Storage** — `flag-photos` bucket holds user-uploaded images. RLS enforces owner-only access (path must start with user's UUID).
- **Realtime** — subscribes to `flags` table updates (status changes broadcast to all connected clients).
- **Triggers** — `handle_new_user()` auto-creates a `public.users` row on signup. `handle_flag_status_change()` awards points when a flag is verified or resolved.

---

## Data Flow: "User Reports a Flag"

```
1. User taps "Report" FAB on MapScreen
   ↓
2. ReportFlagModal opens → setState(description, category, severity, photo)
   ↓
3. User picks or captures a photo via expo-image-picker
   ↓
4. stripExifNative() removes GPS + timestamps (privacy)
   ↓
5. User taps "Submit"
   ↓
6. uploadFlagPhoto(userId, localUri) → stored at flag-photos/<userId>/<timestamp>.jpg
   ↓
7. createFlag(lat, lng, category, ..., photo_url) → INSERT into flags table
   ↓
8. Flag appears on the map with a marker
   ↓
9. Other users see it (either immediate if they're viewing the map, or next time
    FlagsProvider refetches)
   ↓
10. Realtime broadcasts new flag to all connected clients
    ↓
11. Map updates live
```

**If a user changes the status** (e.g., from "open" to "verified"):
```
1. User taps flag marker → FlagDetailModal
   ↓
2. Taps "Verify" button
   ↓
3. setStatus('verified') → UPDATE flags SET status='verified' WHERE id=?
   ↓
4. Database trigger handle_flag_status_change() fires:
    - Reporter: +5 points
    - Verifier (if not the reporter): +2 points
   ↓
5. Realtime broadcasts updated flag (id, status) to all clients
   ↓
6. FlagsProvider sees the update → refreshes cache
   ↓
7. UI re-renders; marker color changes; TasksScreen shows fewer "open" flags
```

---

## Authentication Flow

```
App.tsx
  ↓ [no session]
  ↓
SignInScreen (email + password)
  ↓ [user submits]
  ↓
AuthProvider calls supabase.auth.signInWithPassword()
  ↓ [success: JWT token returned]
  ↓
AuthProvider stores session → Gate renders RootNavigator
  ↓ [app is now authenticated]
  ↓
FlagsProvider subscribes to Realtime
RequestExpoPushToken() registers for notifications
ProfileScreen shows points, reported/verified/resolved counts
```

**Session persistence:** Supabase client auto-restores the session from device storage on app launch. `useAuth()` sets `loading = true` during restore, then sets it to `false` once the session is known.

---

## Folder Structure

```
AccessMap/
├── App.tsx                          Entry point. Auth gate → RootNavigator or SignInScreen
├── src/
│   ├── screens/                     Tab content + dialogs
│   │   ├── MapScreen.tsx            Shows map, filter panel, "Report" FAB
│   │   ├── TasksScreen.tsx          FlatList of open/verified flags
│   │   ├── ProfileScreen.tsx        User points + stats
│   │   ├── SettingsScreen.tsx       Notifications, Help, Feedback, Logout
│   │   ├── SignInScreen.tsx         Email + password form
│   │   ├── ReportFlagModal.tsx      Form to describe + categorize a new flag
│   │   ├── OnboardingModal.tsx      First-time user intro
│   │   └── [other modals]           Screens that open as modals
│   ├── components/                  Reusable UI
│   │   ├── PlatformMap.tsx          Native map wrapper (react-native-maps)
│   │   ├── PlatformMap.web.tsx      Web map wrapper (react-leaflet)
│   │   ├── FlagDetailModal.tsx       Show a single flag, allow status changes
│   │   ├── FilterPanel.tsx           Category + severity filter UI
│   │   ├── FlashBanner.tsx           Toast-like notification (points earned)
│   │   ├── ErrorBoundary.tsx         React error boundary
│   │   └── [other components]
│   ├── lib/                         Business logic + helpers
│   │   ├── supabase.ts              Typed Supabase client
│   │   ├── auth.tsx                 AuthProvider + useAuth hook
│   │   ├── flags.ts                 listFlags, createFlag, updateFlagStatus, etc.
│   │   ├── flagsStore.tsx           Client cache of flags (Realtime-synced)
│   │   ├── points.ts                Point-tracking helpers (AsyncStorage)
│   │   ├── pushNotifications.ts      Expo notification setup
│   │   ├── preferences.ts           Saved user preferences (default tab, etc.)
│   │   └── [other utilities]
│   ├── navigation/
│   │   └── RootNavigator.tsx        Bottom tab navigator (Map, Tasks, Profile, Settings)
│   ├── types/
│   │   └── database.ts              TypeScript types for Supabase tables
│   └── theme/
│       ├── ThemeContext.tsx         Dark/light mode
│       └── theme.ts                 Color + spacing tokens
├── supabase/
│   ├── schema.sql                   All DDL (tables, triggers, RLS, storage)
│   └── migrations/                  Dated SQL files (applied via `supabase db push`)
├── package.json                     Expo SDK 54, React 19.1, TypeScript strict
├── app.json                         Expo config (bundle ID, permissions, plugins)
├── tsconfig.json                    TypeScript config (strict, path alias @/* → src/*)
└── jest.config.js                   Test runner config (no tests yet)
```

---

## Component Architecture (Tree View)

```
App.tsx
├── ErrorBoundary
│   └── SafeAreaProvider
│       └── ThemeProvider
│           └── AuthProvider
│               └── FirstLaunchGate
│                   └── Gate
│                       ├── SignInScreen
│                       │   └── [Form, SignUp link]
│                       └── RootNavigator
│                           └── NavigationContainer
│                               └── FlagsProviderWithAuth
│                                   └── FlagsProvider
│                                       └── SharedModalsProvider
│                                           └── NavInner
│                                               ├── Tab.Navigator
│                                               │   ├── MapScreen
│                                               │   │   ├── PlatformMap
│                                               │   │   ├── FilterPanel
│                                               │   │   ├── ReportFlagModal (FAB)
│                                               │   │   └── [map markers, callouts]
│                                               │   ├── TasksScreen
│                                               │   │   └── FlatList of FlagCards
│                                               │   ├── ProfileScreen
│                                               │   │   └── [Points, Stats, Modals]
│                                               │   └── SettingsScreen
│                                               │       └── [Notifications, Help, Feedback]
│                                               └── SharedModalsHost
│                                                   ├── HelpModal
│                                                   ├── ChangelogModal
│                                                   ├── FeedbackModal
│                                                   └── MyFeedbackModal
```

---

## Key Technologies

| Layer | Tools | Notes |
|-------|-------|-------|
| App Runtime | Expo SDK 54, React 19.1, React Native 0.81 | Cross-platform (iOS, Android, Web) |
| Navigation | @react-navigation (bottom-tabs) | 4 tab screens + modals |
| Maps | react-native-maps (native), react-leaflet 5 (web) | Platform-specific via `PlatformMap` |
| Auth & Data | Supabase (Postgres + Auth + Realtime) | JWT session, RLS policies, Triggers |
| Storage | Supabase Storage + expo-image-picker | EXIF stripping via native APIs |
| State | React Context + Realtime subscription | No Redux/Zustand (kept simple for learning) |
| Notifications | Expo Push Notifications | One token per user, opt-in via PIPEDA explanation |
| Language | TypeScript (strict) | No `any` unless unavoidable |
| Styling | React Native StyleSheet (inline per file) | No theme library yet |

---

## Error Handling Policy

All `try/catch` blocks follow this pattern:

| Failure Source | Policy | Example |
|---|---|---|
| Supabase query in a screen | `Alert.alert('Error', message)` | `createFlag()` catch block shows error to user |
| Destructive action | Always confirm with user | Delete, Sign out, Reset |
| AsyncStorage read | `console.warn` + return fallback | `loadPreferences()` returns defaults on error |
| AsyncStorage write (user data) | **Throw** — caller must surface it | `savePreferences()` throws to Screen |
| AsyncStorage write (ephemera) | `console.warn` + ignore | `lastViewedFilter` persistence failure |
| Push notification setup | Silent (best-effort) | Registration failure doesn't block the app |

---

## Common Patterns

### Adding a New Screen

1. Create `src/screens/YourScreen.tsx` with a `FunctionComponent`.
2. Add to `RootTabParamList` in `RootNavigator.tsx`.
3. Register in `Tab.Navigator` with `<Tab.Screen name="..." component={...} />`.
4. Import the icon from `@expo/vector-icons/Ionicons`.

### Making a Supabase Query

```typescript
import { supabase } from '@/lib/supabase';

export async function myQuery(userId: string) {
  const { data, error } = await supabase
    .from('flags')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}
```

### Handling Auth State

```typescript
import { useAuth } from '@/lib/auth';

export function MyComponent() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Text>Sign in to continue</Text>;

  return <Text>Logged in as {user.email}</Text>;
}
```

---

## Known Gotchas

### 1. Database Types Must Use `type`, Not `interface`

In `src/types/database.ts`, declare shapes as `type`, not `interface`. If you use `interface`, the PostgREST types break and `.insert()` / `.update()` fail with "argument not assignable to type 'never'".

**Fix:** Always use `type FlagRow = { ... }` and `type EmptyRelationships = [...]`.

### 2. react-leaflet 5 Needs `--legacy-peer-deps`

The web build uses react-leaflet 5, which expects React ^19.2.6. Expo pins React 19.1.0. Install with `npm install --legacy-peer-deps` to silence warnings; it works fine at 19.1.

### 3. Map Markers Are Platform-Specific

Don't call react-native-maps from `MapScreen` directly. Use `PlatformMap` so the web bundle keeps working. Both variants expose the same imperative handle: `{ animateTo, showCallout }`.

### 4. Photo Upload Path Scheme Matters

`uploadFlagPhoto(userId, localUri)` puts files at `<userId>/<timestamp>.<ext>`. Storage RLS enforces that the first path segment matches `auth.uid()`. Don't change the path scheme without updating the policy.

### 5. Realtime Subscription Broadcasts Only `{id, status}`

The flags Realtime subscription only sends updated `id` and `status` to reduce bandwidth. If you need other fields, call `refetch()` or query directly.

---

## Testing & Quality

- **TypeScript:** `npm run typecheck` must pass before shipping. No `any` unless unavoidable.
- **Linting:** `npm run lint` + `npm run format`.
- **Testing:** Jest config is in place but no tests yet. Add tests via `npm test`.
- **Pre-commit:** The project uses ESLint and Prettier but no pre-commit hooks yet.

---

## Next Steps for Contributors

1. **Clone & install:** `git clone ... && cd AccessMap && npm install`.
2. **Env setup:** Copy `.env.example` to `.env` and fill in Supabase keys.
3. **Run locally:** `npm start` (iOS simulator), `npm run android`, or `npm run web`.
4. **Read CONTRIBUTING.md** for the full developer workflow (branching, testing, PR process).

See **docs/DATABASE.md** for the complete data model and RLS policies.
See **docs/PATTERNS.md** for code examples for common tasks.
See **docs/CONTRIBUTING.md** for the development workflow.
