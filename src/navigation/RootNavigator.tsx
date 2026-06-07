import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ListChecks as TasksIcon,
  Map as MapIcon,
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Shield as AdminIcon,
  User as ProfileIcon,
  type LucideIcon,
} from 'lucide-react-native';
import HamburgerDrawer from '@/components/HamburgerDrawer';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/lib/auth';
import { FlagsProvider, useFlags } from '@/lib/flagsStore';
import { SharedModalsProvider, useSharedModals } from '@/lib/sharedModalsContext';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import FeedbackModal from '@/components/FeedbackModal';
import HelpModal from '@/components/HelpModal';
import ChangelogModal from '@/components/ChangelogModal';
import MyFeedbackModal from '@/components/MyFeedbackModal';
import { useIsAdmin } from '@/lib/admin';
import MapScreen from '@/screens/MapScreen';
import TasksScreen from '@/screens/TasksScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import AdminScreen from '@/screens/AdminScreen';
import ErrorBoundary from '@/components/ErrorBoundary';

export type RootTabParamList = {
  Map:
    | {
        focusFlag?: { id: string; lat: number; lng: number };
        ts?: number;
        // Deep-link path parameter: when the OS hands us an
        // accessmap://flag/{id} URL, React Navigation parses {id} into
        // this field. MapScreen fetches the flag's lat/lng on the fly
        // and animates to it — different from `focusFlag` which is
        // passed in-app (Tasks → Map) and already has the coordinates.
        flagId?: string;
      }
    | undefined;
  Tasks: undefined;
  Profile: undefined;
  // Settings is the 4th tab — a hub for app-level meta (notifications,
  // help, what's new, feedback, about, sign out). Adding it to the param
  // list keeps DefaultTab (in lib/preferences) type-safe; existing stored
  // values for Map / Tasks / Profile continue to round-trip unchanged.
  Settings: undefined;
  // Admin tab is only rendered when the current user has is_admin = true.
  // The screen enforces the gate independently as defense-in-depth.
  Admin: undefined;
};

// Deep-link config. Registers accessmap://flag/{id} (matches the URL the
// Share-flag button on FlagDetailModal emits, and the scheme is already
// declared in app.json). React Navigation's built-in `linking` uses RN's
// own Linking API, so no expo-linking dependency needed.
const linking = {
  prefixes: ['accessmap://'],
  config: {
    screens: {
      // The :flagId path segment maps to params.flagId on the Map screen.
      // MapScreen reads it and runs fetchFlagById + animateTo + showCallout.
      Map: 'flag/:flagId',
    },
  },
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// Container-level nav ref so the hamburger drawer (rendered as the Map header's
// headerLeft, above the navigator) can switch tabs — used by the guest/web
// "Sign in" item to jump to the Profile tab, which hosts the sign-in modal.
const navigationRef = createNavigationContainerRef<RootTabParamList>();

const tabIcon =
  (Icon: LucideIcon) =>
  ({ color: tintColor, size }: { color: string; size: number }) => (
    <Icon size={size} color={tintColor} strokeWidth={2.2} />
  );

interface Props {
  // Which tab to open on first render. Used by App.tsx to honor the user's
  // saved default-tab preference. Defaults to 'Map' to preserve the original
  // behavior when no preference has been set.
  initialRouteName?: keyof RootTabParamList;
}

export default function RootNavigator({ initialRouteName = 'Map' }: Props) {
  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <FlagsProviderWithAuth initialRouteName={initialRouteName} />
    </NavigationContainer>
  );
}

/**
 * Inner wrapper that reads the current userId from AuthContext and passes it
 * to FlagsProvider so the offline cache can be scoped per user (Jordan
 * Condition 2). Must live inside NavigationContainer (for the linking config)
 * and also inside AuthProvider (which wraps the whole App in App.tsx).
 */
function FlagsProviderWithAuth({ initialRouteName }: { initialRouteName: keyof RootTabParamList }) {
  const { user } = useAuth();
  return (
    <FlagsProvider userId={user?.id ?? null}>
      {/* SharedModalsProvider owns the "which shared modal is open"
          slot. All four pooled modals (Help, Changelog, Feedback,
          MyFeedback) are mounted ONCE inside <SharedModalsHost />
          below; ProfileScreen and SettingsScreen call setOpen()
          from the context instead of mounting their own copies.
          See src/lib/sharedModalsContext.tsx for the rationale +
          which modals were intentionally left per-screen. */}
      <SharedModalsProvider>
        <NavInner initialRouteName={initialRouteName} />
        <SharedModalsHost />
      </SharedModalsProvider>
    </FlagsProvider>
  );
}

/**
 * The tab navigator + its branded header. Split out so the header's
 * "Feedback" button can call `useSharedModals()` from inside the
 * provider tree (hooks can't run on the same component that renders
 * the provider — useSharedModals would see no context).
 */
function NavInner({ initialRouteName }: { initialRouteName: keyof RootTabParamList }) {
  const { setOpen } = useSharedModals();
  const color = useColor();
  const styles = makeStyles(color);
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isAdmin = useIsAdmin();

  const { flags } = useFlags();
  const openCount = flags.filter((f) => f.status === 'open').length;
  const tasksBadge: number | undefined = openCount > 0 ? Math.min(openCount, 99) : undefined;

  const renderHamburger = () => (
    <>
      <Pressable
        onPress={() => setDrawerOpen(true)}
        style={({ pressed }) => [styles.hamburgerBtn, pressed && styles.hamburgerBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
        hitSlop={8}
      >
        <MenuIcon size={24} color="#f0f6ff" strokeWidth={2.2} />
      </Pressable>
      <HamburgerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        // F11: guest/web "Sign in" jumps to the Profile tab, which hosts the
        // sign-in modal (previously the item only closed the drawer — a dead end).
        onSignIn={() => {
          setDrawerOpen(false);
          if (navigationRef.isReady()) navigationRef.navigate('Profile');
        }}
      />
    </>
  );

  const renderHeaderRight = () => (
    <Pressable
      onPress={() => setOpen('feedback')}
      style={({ pressed }) => [styles.feedbackBtn, pressed && styles.feedbackBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel="Send feedback"
      accessibilityHint="Opens a form to email feedback to the AccessMap owner"
      hitSlop={8}
    >
      <AppText variant="label" style={styles.feedbackBtnText}>Feedback</AppText>
    </Pressable>
  );

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      // Per-screen safety net: a render crash in one tab shows an in-place
      // "Try again" fallback instead of bubbling to the app-level boundary and
      // blanking the whole app. The tab bar and other tabs stay usable.
      screenLayout={({ children }) => <ErrorBoundary variant="screen">{children}</ErrorBoundary>}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0d1829',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.08)',
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 8,
        },
        headerTitleStyle: {
          color: '#f0f6ff',
          fontWeight: font.weight.bold,
          fontSize: font.size.lg,
          letterSpacing: 0.2,
        },
        headerTintColor: '#f0f6ff',
        headerTitleAlign: 'center',
        headerRight: renderHeaderRight,
        tabBarActiveTintColor: '#60a5fa',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.1)',
          backgroundColor: 'rgba(7,11,24,0.92)',
          // Grow by the bottom safe-area inset so the home indicator never
          // overlaps the tab labels. The hardcoded height had overridden
          // React Navigation's automatic inset handling.
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
          ...(Platform.OS === 'web'
            ? { backdropFilter: 'blur(20px) saturate(160%)' } as object
            : {}),
        },
        tabBarLabelStyle: {
          fontSize: font.size.xs,
          fontWeight: font.weight.semibold,
          marginTop: 2,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarIcon: tabIcon(MapIcon), headerLeft: renderHamburger }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{ tabBarIcon: tabIcon(TasksIcon), tabBarBadge: tasksBadge }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: tabIcon(ProfileIcon) }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: tabIcon(SettingsIcon) }}
      />
      {isAdmin === true && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            tabBarIcon: tabIcon(AdminIcon),
            tabBarLabel: 'Admin',
          }}
        />
      )}
    </Tab.Navigator>
  );
}

/**
 * Single mount-point for the four shared modals. Renders a sibling to
 * the tab navigator (inside the providers) so the modals float above
 * all tab content regardless of which tab is active. Each modal's
 * `visible` is derived from the same context slot — opening one
 * implicitly closes the others, which mirrors the old behavior (each
 * screen could only open one of these modals at a time anyway).
 */
function SharedModalsHost() {
  const { open, setOpen } = useSharedModals();
  const close = () => setOpen(null);
  return (
    <>
      <HelpModal visible={open === 'help'} onClose={close} />
      <ChangelogModal visible={open === 'changelog'} onClose={close} />
      <FeedbackModal visible={open === 'feedback'} onClose={close} />
      <MyFeedbackModal visible={open === 'myFeedback'} onClose={close} />
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const makeStyles = (_color: ColorTheme) =>
  StyleSheet.create({
    hamburgerBtn: {
      marginLeft: spacing.md,
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    hamburgerBtnPressed: { backgroundColor: 'rgba(255,255,255,0.22)' },
    feedbackBtn: {
      marginRight: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.14)',
      minHeight: 44, // WCAG 2.1 AA touch target minimum (was 32)
      justifyContent: 'center',
    },
    feedbackBtnPressed: { backgroundColor: 'rgba(255,255,255,0.28)' },
    feedbackBtnText: {
      color: '#f0f6ff',
      fontWeight: font.weight.bold,
      fontSize: font.size.sm,
      letterSpacing: 0.3,
    },
  });
