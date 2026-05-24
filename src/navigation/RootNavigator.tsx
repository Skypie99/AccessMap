import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FlagsProvider } from '@/lib/flagsStore';
import {
  SharedModalsProvider,
  useSharedModals,
} from '@/lib/sharedModalsContext';
import { color, font, radius, spacing } from '@/theme';
import FeedbackModal from '@/components/FeedbackModal';
import HelpModal from '@/components/HelpModal';
import ChangelogModal from '@/components/ChangelogModal';
import MyFeedbackModal from '@/components/MyFeedbackModal';
import MapScreen from '@/screens/MapScreen';
import TasksScreen from '@/screens/TasksScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';

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

const tabIcon = (emoji: string) => ({ color: tintColor }: { color: string }) => (
  <Text style={{ fontSize: 20, color: tintColor }}>{emoji}</Text>
);

interface Props {
  // Which tab to open on first render. Used by App.tsx to honor the user's
  // saved default-tab preference. Defaults to 'Map' to preserve the original
  // behavior when no preference has been set.
  initialRouteName?: keyof RootTabParamList;
}

export default function RootNavigator({ initialRouteName = 'Map' }: Props) {
  return (
    <NavigationContainer linking={linking}>
      <FlagsProvider>
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
    </NavigationContainer>
  );
}

/**
 * The tab navigator + its branded header. Split out so the header's
 * "Feedback" button can call `useSharedModals()` from inside the
 * provider tree (hooks can't run on the same component that renders
 * the provider — useSharedModals would see no context).
 */
function NavInner({
  initialRouteName,
}: {
  initialRouteName: keyof RootTabParamList;
}) {
  // Header "Feedback" button now routes through the shared context —
  // same FeedbackModal mount that SettingsScreen's "Send feedback" row
  // uses. Before the lift, we kept a private `feedbackOpen` state here
  // because the header lives outside the screens; now the context
  // pulls double duty.
  const { setOpen } = useSharedModals();

  const renderHeaderRight = () => (
    <Pressable
      onPress={() => setOpen('feedback')}
      style={({ pressed }) => [
        styles.feedbackBtn,
        pressed && styles.feedbackBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Send feedback"
      accessibilityHint="Opens a form to email feedback to the AccessMap owner"
      hitSlop={8}
    >
      <Text style={styles.feedbackBtnText}>Feedback</Text>
    </Pressable>
  );

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        // Branded header — replaces the default white strip with the
        // app's primary color. Same on every tab so navigation feels
        // anchored.
        headerStyle: {
          backgroundColor: color.brand,
          // Drop the default 1px border so the header reads as a
          // single brand surface, not a labelled tab strip.
          borderBottomWidth: 0,
          // Subtle elevation so the header casts a tiny shadow over
          // map / list content.
          shadowColor: color.shadow,
          shadowOpacity: 0.15,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        },
        headerTitleStyle: {
          color: color.textOnBrand,
          fontWeight: font.weight.bold,
          fontSize: font.size.lg,
        },
        headerTintColor: color.textOnBrand,
        headerTitleAlign: 'center',
        headerRight: renderHeaderRight,
        tabBarActiveTintColor: color.brand,
        tabBarInactiveTintColor: color.textSubtle,
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarIcon: tabIcon('🗺️') }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{ tabBarIcon: tabIcon('✅') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: tabIcon('👤') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: tabIcon('⚙️') }}
      />
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

const styles = StyleSheet.create({
  feedbackBtn: {
    marginRight: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    minHeight: 32,
    justifyContent: 'center',
  },
  feedbackBtnPressed: { backgroundColor: 'rgba(255,255,255,0.32)' },
  feedbackBtnText: {
    color: color.textOnBrand,
    fontWeight: font.weight.bold,
    fontSize: font.size.sm,
    letterSpacing: 0.3,
  },
});
