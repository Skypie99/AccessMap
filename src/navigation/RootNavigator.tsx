import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FlagsProvider } from '@/lib/flagsStore';
import { color, font, radius, spacing } from '@/theme';
import FeedbackModal from '@/components/FeedbackModal';
import MapScreen from '@/screens/MapScreen';
import TasksScreen from '@/screens/TasksScreen';
import ProfileScreen from '@/screens/ProfileScreen';

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
  // Feedback modal state lives at root so the header button (rendered
  // inside every tab's screenOptions) can open it regardless of which
  // tab is on screen. The modal renders sibling to the navigator so it
  // floats above all tab content.
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const renderHeaderRight = () => (
    <Pressable
      onPress={() => setFeedbackOpen(true)}
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
    <NavigationContainer linking={linking}>
      <FlagsProvider>
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
        </Tab.Navigator>
        <FeedbackModal
          visible={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
        />
      </FlagsProvider>
    </NavigationContainer>
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
