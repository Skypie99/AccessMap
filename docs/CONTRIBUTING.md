# Flagstone Contributing Guide

Welcome! This guide covers the development workflow, local setup, testing, and shipping process for Flagstone.

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/skypie99/AccessMap.git
cd Flagstone
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Your `.env` file should look like:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Get these from [Supabase Dashboard](https://app.supabase.com) → Settings → API.

### 3. Database Setup (One-time)

If the Supabase project is new, run the schema:

1. Open **Supabase SQL Editor**.
2. Copy the contents of `supabase/schema.sql`.
3. Paste and run.

Existing projects already have the schema, so skip this step.

### 4. Run Locally

**iOS Simulator:**
```bash
npm start
# In the Expo CLI, press 'i' to open iOS simulator
```

**Android Emulator:**
```bash
npm run android
```

**Web Browser:**
```bash
npm run web
```

**Expo Go (bare device):**
```bash
npm start
# Scan the QR code with Expo Go app (iOS) or built-in camera (Android)
```

---

## Development Workflow

### Branch Naming

```
<type>/<short-description>

Examples:
  feature/filter-panel
  fix/exif-metadata-leak
  docs/architecture-guide
  test/map-screen-unit-tests
```

### Create a Feature

1. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes** — follow the patterns in `docs/PATTERNS.md`.

3. **Type-check:**
   ```bash
   npm run typecheck
   ```
   Must pass before committing.

4. **Format & lint:**
   ```bash
   npm run lint:fix
   npm run format
   ```

5. **Test locally:**
   - Run the app: `npm start` or `npm run web`.
   - Tap through your feature.
   - Check for errors in the console.

6. **Commit:**
   ```bash
   git add .
   git commit -m "feat: add filter panel for categories"
   ```
   Prefix with `feat:`, `fix:`, `docs:`, `test:`, `chore:`.

7. **Push & open PR:**
   ```bash
   git push origin feature/your-feature-name
   # Then open a PR on GitHub
   ```

### Review & Merge

- All PRs must pass `npm run typecheck` (checked via CI).
- Assign a reviewer (usually Shamus or Sky).
- Address review comments.
- Once approved, merge to `main` (only Sky can push to main).

---

## Running Tests

### Jest

Currently, the project has Jest configured but no tests written. To add tests:

```bash
npm test                 # Run all tests once
npm run test:watch      # Run in watch mode
npm run test:ci         # Run with coverage (for CI)
```

**Test file locations:** `src/**/__tests__/*.test.tsx` (co-located with source).

### Type Checking

```bash
npm run typecheck
```

This is your **primary safety net** — it catches type mismatches before runtime. Always run before shipping.

### Linting & Formatting

```bash
npm run lint            # Check for lint errors
npm run lint:fix        # Auto-fix lint errors
npm run format:check    # Check formatting
npm run format          # Auto-format
```

---

## Common Tasks

### Adding a New Screen

1. Create `src/screens/YourScreen.tsx`.
2. Export a function component.
3. Open `src/navigation/RootNavigator.tsx`:
   - Add to `RootTabParamList` type.
   - Add `<Tab.Screen>` in the navigator.
4. Import an icon from `@expo/vector-icons/Ionicons`.
5. Run `npm run typecheck` to verify.

**Example:**
```typescript
// src/screens/YourScreen.tsx
import { View, Text } from 'react-native';
import { useAuth } from '@/lib/auth';

export default function YourScreen() {
  const { user } = useAuth();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Hello, {user?.email}!</Text>
    </View>
  );
}
```

### Making a Supabase Query

1. Create a function in `src/lib/` (e.g., `src/lib/yourFeature.ts`).
2. Use the typed Supabase client from `src/lib/supabase.ts`.
3. Always handle errors explicitly.

**Example:**
```typescript
import { supabase } from './supabase';
import type { FlagRow } from '@/types/database';

export async function getFlagsByCategory(category: string): Promise<FlagRow[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
```

### Adding a Form

Use plain `useState` + validation:

```typescript
import { useState } from 'react';
import { View, TextInput, Pressable, Text, Alert } from 'react-native';

export function MyForm() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!value.trim()) {
      Alert.alert('Error', 'Field is required');
      return;
    }
    setLoading(true);
    try {
      // Do something
      await submitToDatabase(value);
      Alert.alert('Success', 'Submitted!');
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Enter text"
      />
      <Pressable onPress={handleSubmit} disabled={loading}>
        <Text>{loading ? 'Submitting...' : 'Submit'}</Text>
      </Pressable>
    </View>
  );
}
```

### Adding a Modal

Modals are screens that appear on top of the navigation stack. Use React Native's `Modal` component or build a custom overlay:

```typescript
import { Modal, View, Pressable, Text } from 'react-native';

export function MyModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 8 }}>
            <Text>Modal content</Text>
            <Pressable onPress={onClose}>
              <Text>Close</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
```

### Handling Authentication

Always check the auth state before displaying sensitive content:

```typescript
import { useAuth } from '@/lib/auth';

export function ProtectedFeature() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Text>Sign in to access this feature.</Text>;

  return <YourContent />;
}
```

---

## Database Migrations

To add a new table or column:

1. **Create a migration file:**
   ```bash
   supabase migration new add_new_table
   ```
   This creates `supabase/migrations/<timestamp>_add_new_table.sql`.

2. **Write SQL (idempotent):**
   ```sql
   -- Use CREATE TABLE IF NOT EXISTS, DROP IF EXISTS, etc.
   CREATE TABLE IF NOT EXISTS public.my_table (
     id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
     ...
   );
   ```

3. **Test locally:**
   ```bash
   supabase start
   supabase db push
   ```

4. **Update TS types:**
   Add to `src/types/database.ts`:
   ```typescript
   export type MyTableRow = {
     id: string;
     // ... columns
   };
   ```

5. **Commit migration + types together.**

---

## Environment Variables

All env vars must start with `EXPO_PUBLIC_` to be accessible in the app:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Non-public vars (e.g., API keys for build servers) go in `.env.local` and are **never** committed.

---

## Common Gotchas

### TypeScript Errors

**Problem:** `"argument not assignable to type 'never'"` in `.insert()` or `.update()`.

**Fix:** Check `src/types/database.ts` — all table types must use `type`, not `interface`.

### React Navigation Type Errors

**Problem:** `Property 'X' does not exist on type RootTabParamList`.

**Fix:** Make sure you added the screen to the `RootTabParamList` type definition in `RootNavigator.tsx`.

### Supabase Realtime Not Working

**Problem:** FlagsProvider loads flags but doesn't update when other users change statuses.

**Checklist:**
- Is the user signed in? (Realtime requires auth).
- Is the subscription mounted? (Check browser devtools → Network).
- Did the flag status actually change in the database? (Check Supabase dashboard).

**Fallback:** Call `refetch()` to manually refresh.

### Photos Not Uploading

**Problem:** `uploadFlagPhoto()` fails silently or throws.

**Checklist:**
- Is the file URI valid? (e.g., does `file://` exist on the device?).
- Is the photo < 10 MB? (See `MAX_PHOTO_BYTES` in `src/lib/flags.ts`).
- Is the extension in `ALLOWED_PHOTO_EXTS`?
- Is the user authenticated? (Storage RLS requires auth).

### Map Not Showing Markers

**Problem:** Flags load but don't appear on the map.

**Fix:** Check that lat/lng are valid WGS84 coordinates (e.g., -90 ≤ lat ≤ 90, -180 ≤ lng ≤ 180).

---

## Shipping to Production

### Build & Submit (iOS only, for now)

```bash
# Build for TestFlight
npm run deploy:testflight

# Build for App Store
npm run deploy:appstore
```

These commands:
1. Build the app via EAS Build (Expo's cloud builder).
2. Submit to App Store / TestFlight.

**Requirements:**
- Apple Developer account.
- Certs + provisioning profiles in Expo.
- `.env` with valid Supabase keys.

### Pre-Shipping Checklist

- [ ] All TypeScript checks pass: `npm run typecheck`.
- [ ] No ESLint errors: `npm run lint`.
- [ ] Manual testing on iOS, Android, and web.
- [ ] DB migrations applied (if any).
- [ ] `.env` points to production Supabase (not a dev project).
- [ ] Version bumped in `package.json` and `app.json`.
- [ ] Changelog updated.
- [ ] PR reviewed and approved.

---

## Getting Help

- **Architecture questions?** Read `ARCHITECTURE.md`.
- **Database questions?** Read `docs/DATABASE.md`.
- **Code patterns?** Read `docs/PATTERNS.md`.
- **Stuck?** Ask in issues or PRs — the codebase is meant to teach.

---

## Code Style

- **TypeScript:** Strict mode. No `any` unless unavoidable.
- **Naming:** camelCase for variables/functions, PascalCase for components.
- **Files:** One component per file (or one helper file per feature).
- **Imports:** Use path alias `@/lib`, `@/components`, etc. (defined in `tsconfig.json`).
- **Comments:** Explain *why*, not *what*. The code shows the what.

---

## Testing Your Changes

### On Device/Simulator

```bash
npm start
# Press 'i' (iOS) or 'a' (Android)
# Tap through your feature
# Check for console errors
```

### On Web

```bash
npm run web
# Browser opens at localhost
# Tap through your feature
# Check browser devtools for errors
```

### Performance

If the app feels slow:
- Profile with React DevTools (web) or Xcode (iOS).
- Check FlagsProvider for unnecessary re-renders (it holds a large array).
- Memoize expensive components with `React.memo()`.

---

## Next Steps

1. Pick a task from the GitHub issues.
2. Create a branch: `feature/issue-name`.
3. Follow the patterns in `docs/PATTERNS.md`.
4. Run `npm run typecheck` before committing.
5. Open a PR.

Welcome to the Flagstone team! 🗺️
