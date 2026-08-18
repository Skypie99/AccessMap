# Flagstone Code Patterns

Reference guide for common patterns in Flagstone. Use these when adding features.

---

## Pattern 1: Adding a New Screen

**Goal:** Add a new tab or modal screen.

### File Structure

```
src/screens/MyScreen.tsx          ← Your new screen
src/navigation/RootNavigator.tsx  ← Update this to register the screen
```

### Step 1: Create the Screen

Create `src/screens/MyScreen.tsx`:

```typescript
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useAuth } from '@/lib/auth';
import { spacing, font } from '@/theme';

export default function MyScreen() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Text>Sign in to view this screen.</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello, {user.email}!</Text>
      {/* Your content here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    marginBottom: spacing.md,
  },
});
```

### Step 2: Register in Navigator

Edit `src/navigation/RootNavigator.tsx`:

```typescript
// Step 1: Add to the param list
export type RootTabParamList = {
  Map: /* ... */ ;
  Tasks: /* ... */ ;
  Profile: /* ... */ ;
  MyNewScreen: undefined;  // ← Add this
  Settings: undefined;
};

// Step 2: Add to the navigator
<Tab.Screen
  name="MyNewScreen"
  component={MyScreen}
  options={{
    tabBarIcon: tabIcon('star-outline'),  // Pick an icon
    headerTitle: 'My New Screen',
  }}
/>
```

### Step 3: Verify

```bash
npm run typecheck
npm start
```

---

## Pattern 2: Making a Supabase Query

**Goal:** Fetch or mutate data in the database.

### File Structure

```
src/lib/myFeature.ts      ← Queries and helpers
src/screens/MyScreen.tsx  ← Use the queries here
```

### Example: List Flags by Category

Create `src/lib/flagsByCategory.ts`:

```typescript
import { supabase } from './supabase';
import type { FlagRow, FlagCategory } from '@/types/database';

/**
 * Fetch all flags with a specific category.
 * Throws on DB error (caller must catch + surface to user).
 */
export async function getFlagsByCategory(
  category: FlagCategory,
): Promise<FlagRow[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch flags: ${error.message}`);
  }

  return data || [];
}

/**
 * Count open flags across all categories.
 */
export async function countOpenFlags(): Promise<number> {
  const { count, error } = await supabase
    .from('flags')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');

  if (error) {
    throw new Error(`Failed to count flags: ${error.message}`);
  }

  return count || 0;
}
```

### Use in a Screen

```typescript
import { View, Text, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { getFlagsByCategory } from '@/lib/flagsByCategory';
import type { FlagRow } from '@/types/database';

export default function CategoryScreen() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await getFlagsByCategory('no_ramp');
        if (!cancelled) setFlags(data);
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Error', `Failed to load flags: ${errorMessage(e)}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true; // Cleanup: ignore results if unmounted
    };
  }, []);

  if (loading) return <ActivityIndicator />;

  return (
    <FlatList
      data={flags}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Text>{item.category} — {item.severity}/5</Text>
      )}
    />
  );
}

// Helper to extract user-friendly error messages
function errorMessage(e: any): string {
  return e?.message || 'Unknown error';
}
```

### Key Points

- Always handle errors with `if (error) throw error;`.
- Use cleanup functions in useEffect to avoid race conditions.
- Use type imports: `import type { FlagRow }` (not runtime).

---

## Pattern 3: Adding a Form with Validation

**Goal:** Create a form that collects user input and submits it.

### Example: Report a Flag

Create `src/screens/ReportFlagModal.tsx`:

```typescript
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { createFlag } from '@/lib/flags';
import { useAuth } from '@/lib/auth';
import { spacing, font } from '@/theme';
import type { FlagCategory, FlagSeverity } from '@/types/database';

interface Props {
  lat: number;
  lng: number;
  onSuccess: (flagId: string) => void;
  onCancel: () => void;
}

export default function ReportFlagModal({ lat, lng, onSuccess, onCancel }: Props) {
  const { user } = useAuth();
  const [category, setCategory] = useState<FlagCategory>('other');
  const [severity, setSeverity] = useState<FlagSeverity>(3);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Validation
  const canSubmit = description.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;

    // Quick validation
    if (description.trim().length < 3) {
      Alert.alert('Error', 'Description must be at least 3 characters.');
      return;
    }

    setLoading(true);
    try {
      const flagId = await createFlag({
        user_id: user.id,
        lat,
        lng,
        category,
        severity,
        description: description.trim(),
        photo_url: null,
      });

      Alert.alert('Success', 'Flag reported! Thank you for helping.');
      onSuccess(flagId);
    } catch (e) {
      Alert.alert('Error', `Failed to report flag: ${errorMessage(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Report an Issue</Text>

      {/* Description input */}
      <Text style={styles.label}>What's the issue?</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="e.g., No wheelchair ramp at entrance"
        placeholderTextColor="#999"
        multiline
        numberOfLines={4}
        editable={!loading}
        style={styles.input}
      />

      {/* Category picker (simplified) */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {['no_ramp', 'broken_sidewalk', 'other'].map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setCategory(cat as FlagCategory)}
            style={[
              styles.categoryBtn,
              category === cat && styles.categoryBtnActive,
            ]}
            disabled={loading}
          >
            <Text>{cat}</Text>
          </Pressable>
        ))}
      </View>

      {/* Severity slider (simplified) */}
      <Text style={styles.label}>Severity: {severity}/5</Text>
      <View style={styles.severityRow}>
        {[1, 2, 3, 4, 5].map((level) => (
          <Pressable
            key={level}
            onPress={() => setSeverity(level as FlagSeverity)}
            style={[
              styles.severityBtn,
              severity === level && styles.severityBtnActive,
            ]}
            disabled={loading}
          >
            <Text>{level}</Text>
          </Pressable>
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          onPress={onCancel}
          disabled={loading}
          style={[styles.button, styles.buttonSecondary]}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Report</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, backgroundColor: '#fff' },
  title: { fontSize: font.size.lg, fontWeight: font.weight.bold, marginBottom: spacing.md },
  label: { fontSize: font.size.sm, fontWeight: font.weight.semibold, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
    minHeight: 80,
  },
  categoryRow: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.xs },
  categoryBtn: {
    flex: 1,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  categoryBtnActive: { backgroundColor: '#0d1829', borderColor: '#0d1829' },
  severityRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  severityBtn: {
    flex: 1,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
  },
  severityBtnActive: { backgroundColor: '#60a5fa', borderColor: '#60a5fa' },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: { backgroundColor: '#e5e7eb', borderColor: '#ccc', borderWidth: 1 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontWeight: font.weight.bold, color: '#fff' },
});

function errorMessage(e: any): string {
  return e?.message || 'Unknown error';
}
```

### Key Points

- Always validate **before** submitting.
- Disable the submit button if validation fails or already loading.
- Use `try/catch` and `Alert.alert()` for errors.
- Cleanup: Use `if (!cancelled)` checks in useEffect.

---

## Pattern 4: Adding a Test

**Goal:** Test a screen or utility function.

### Example: Test Flag Creation

Create `src/screens/__tests__/ReportFlagModal.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ReportFlagModal from '../ReportFlagModal';
import * as flagsLib from '@/lib/flags';

// Mock the flags library
jest.mock('@/lib/flags');

describe('ReportFlagModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables submit button if description is empty', () => {
    const { getByText, getByPlaceholderText } = render(
      <ReportFlagModal
        lat={49.28}
        lng={-123.12}
        onSuccess={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const input = getByPlaceholderText('e.g., No wheelchair ramp at entrance');
    expect(input.props.editable).toBe(true);

    const submitBtn = getByText('Report');
    expect(submitBtn.props.disabled).toBe(true);
  });

  it('submits a flag with valid input', async () => {
    const onSuccess = jest.fn();
    const mockFlagId = 'test-flag-123';

    // Mock createFlag to return a flag ID
    (flagsLib.createFlag as jest.Mock).mockResolvedValue(mockFlagId);

    const { getByText, getByPlaceholderText } = render(
      <ReportFlagModal
        lat={49.28}
        lng={-123.12}
        onSuccess={onSuccess}
        onCancel={jest.fn()}
      />,
    );

    // Fill in the form
    const input = getByPlaceholderText('e.g., No wheelchair ramp at entrance');
    fireEvent.changeText(input, 'Missing ramp here');

    // Submit
    const submitBtn = getByText('Report');
    fireEvent.press(submitBtn);

    // Wait for async operation
    await waitFor(() => {
      expect(flagsLib.createFlag).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: 49.28,
          lng: -123.12,
          description: 'Missing ramp here',
        }),
      );
      expect(onSuccess).toHaveBeenCalledWith(mockFlagId);
    });
  });
});
```

### Run Tests

```bash
npm test
npm run test:watch      # For development
npm run test:ci         # For CI/CD
```

---

## Pattern 5: Using the Auth Hook

**Goal:** Access the current user's session.

### Basic Usage

```typescript
import { useAuth } from '@/lib/auth';

export function MyComponent() {
  const { user, session, loading } = useAuth();

  if (loading) return null; // Wait for auth to load
  if (!user) return <Text>Sign in to continue.</Text>;

  return <Text>Logged in as {user.email}</Text>;
}
```

### Protecting a Feature

```typescript
import { useAuth } from '@/lib/auth';
import { Alert } from 'react-native';

export function ProtectedAction() {
  const { user } = useAuth();

  const handleAction = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to perform this action.');
      return;
    }

    // Proceed with action
    doSomethingAsUser(user.id);
  };

  return <Pressable onPress={handleAction}>...</Pressable>;
}
```

---

## Pattern 6: Styling with Theme

**Goal:** Use consistent colors, spacing, and typography.

### Available Tokens

All tokens are in `src/theme.ts`:

```typescript
import { spacing, font, color } from '@/theme';

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,           // 16px
    marginBottom: spacing.lg,       // 24px
    backgroundColor: color.bg.primary,
  },
  title: {
    fontSize: font.size.lg,         // 18px
    fontWeight: font.weight.bold,   // '700'
  },
});
```

### Common Values

```typescript
// Spacing
spacing.xs    // 8px
spacing.sm    // 12px
spacing.md    // 16px
spacing.lg    // 24px
spacing.xl    // 32px

// Font sizes
font.size.xs  // 12px
font.size.sm  // 14px
font.size.md  // 16px
font.size.lg  // 18px
font.size.xl  // 20px

// Font weights
font.weight.normal    // 400
font.weight.semibold  // 600
font.weight.bold      // 700

// Colors (dark theme)
color.bg.primary      // Dark background
color.text.primary    // White text
color.accent.blue     // Brand blue
```

---

## Quick Reference

| Task | File Location | Hook/Import |
|------|---------------|------------|
| Add a screen | `src/screens/YourScreen.tsx` | Update `RootNavigator.tsx` |
| Query the database | `src/lib/yourFeature.ts` | `import { supabase }` |
| Use auth state | Any component | `import { useAuth }` |
| Use theme | Any component | `import { spacing, font }` |
| Add a test | `src/__tests__/*.test.tsx` | `import { render, fireEvent }` |
| Handle forms | Your screen | Plain `useState` + validation |
| Show errors | Your component | `import { Alert }` |

---

## Best Practices

1. **Type everything** — use `type` (not `interface`) for database shapes.
2. **Handle errors** — never silently fail; always catch and alert.
3. **Cleanup effects** — use `useEffect` return function to cancel async work.
4. **Validate early** — check user input before submission.
5. **Use path aliases** — `@/lib` not `../../../lib`.
6. **Keep components small** — one per file unless it's a modal hierarchy.
7. **Avoid prop drilling** — use Context for globals (auth, theme, flags).

---

## Still Stuck?

- **Architecture questions?** See `ARCHITECTURE.md`.
- **Database schema?** See `docs/DATABASE.md`.
- **Dev workflow?** See `docs/CONTRIBUTING.md`.
- **Codebase tour?** Look at existing screens like `MapScreen.tsx` and `TasksScreen.tsx`.

Happy coding! 🚀
