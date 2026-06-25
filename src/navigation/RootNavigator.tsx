import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppText } from '@/components/ui/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home as HomeIcon,
  ListChecks as TasksIcon,
  Menu as MenuIcon,
  User as ProfileIcon,
  type LucideIcon,
} from 'lucide-react-native';
import HamburgerDrawer from '@/components/HamburgerDrawer';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/lib/auth';
import { FlagsProvider, useFlags } from '@/lib/flagsStore';
import { SharedModalsProvider, useSharedModals } from '@/lib/sharedModalsContext';
import { DrawerProvider, useDrawer } from '@/lib/drawerContext';
import { font, icon, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useReduceTransparency } from '@/lib/accessibility';
import FeedbackModal from '@/components/FeedbackModal';
import HelpModal from '@/components/HelpModal';
import ChangelogModal from '@/components/ChangelogModal';
import MyFeedbackModal from '@/components/MyFeedbackModal';
import { useIsAdmin } from '@/lib/admin';
import HomeScreen from '@/screens/HomeScreen';
import MapScreen from '@/screens/MapScreen';
import TasksScreen from '@/screens/TasksScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import AdminScreen from '@/screens/AdminScreen';
import ErrorBoundary from '@/components/ErrorBoundary';
import { createLinking, type TakePendingUrl } from './linking';

export type RootTabParamList = {
  // Home is the editorial landing surface (Phase 7a). It renders HomeScreen
  // with its own in-screen header (headerShown:false). The full interactive
  // map lives at the hidden `FullMap` route below.
  Home: undefined;
  // FullMap renders MapScreen — the full interactive map. Hidden from the tab
  // bar (tabBarButton:()=>null) and reached from Home ("Open full map"), from
  // in-app focus-flag links (Tasks/Profile rows), and from the
  // accessmap://flag/{id} share/push deep-link. Carries the focus params that
  // used to live on the old `Map` route.
  FullMap:
    | {
        focusFlag?: { id: string; lat: number; lng: number };
        ts?: number;
        // Deep-link path parameter: when the OS hands us an
        // accessmap://flag/{id} URL, React Navigation parses {id} into
        // this field. MapScreen fetches the flag's lat/lng on the fly
        // and animates to it — different from `focusFlag` which is
        // passed in-app and already has the coordinates.
        flagId?: string;
        // Phase 7a: Home's "Report" pill sets this so MapScreen opens its
        // report sheet on arrival (then clears the param).
        openReport?: boolean;
      }
    | undefined;
  Tasks: undefined;
  Profile: undefined;
  // Settings + Admin are no longer tab-bar items (Phase 7a 3-tab layout) —
  // they're hidden routes reached from the hamburger drawer via
  // navigationRef.navigate(...). Kept in the param list so navigation +
  // DefaultTab (lib/preferences) stay type-safe.
  Settings: undefined;
  // Admin is only registered when is_admin = true. The screen enforces the
  // gate independently as defense-in-depth.
  Admin: undefined;
};

// Deep-link config (accessmap://flag/{id}) lives in ./linking.ts —
// createLinking(takePendingUrl) so the Gate in App.tsx can hand us a deep
// link it captured while the user was still signed out (L8).

const Tab = createBottomTabNavigator<RootTabParamList>();

// Container-level nav ref so the hamburger drawer (rendered as the Map header's
// headerLeft, above the navigator) can switch tabs — used by the guest/web
// "Sign in" item to jump to the Profile tab, which hosts the sign-in modal.
const navigationRef = createNavigationContainerRef<RootTabParamList>();

const tabIcon =
  (Icon: LucideIcon) =>
  function TabIcon({ color: tintColor, size }: { color: string; size: number }) {
    return <Icon size={size} color={tintColor} strokeWidth={2.2} />;
  };

/**
 * Frosted-glass background for the bottom tab bar (native only — Phase 7a).
 * Rendered behind the bar's buttons via screenOptions.tabBarBackground. The
 * bar is positioned absolute + transparent on native so this blur shows the
 * content scrolling underneath. Honors Reduce Transparency (opaque fallback,
 * no blur) — mirrors GlassSurface's accessibility contract.
 */
function TabBarGlass() {
  const color = useColor();
  const reduceTransparency = useReduceTransparency();
  if (reduceTransparency) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: color.tabBarBg }]} />;
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView intensity={24} tint={color.tabBarBlurTint as 'light' | 'dark'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color.tabBarGlassFloor }]} />
    </View>
  );
}

interface Props {
  // Which tab to open on first render. Used by App.tsx to honor the user's
  // saved default-tab preference. Defaults to 'Home' (the editorial landing
  // surface) when no preference has been set.
  initialRouteName?: keyof RootTabParamList;
  // L8: consume-once getter for a warm deep link the Gate captured while the
  // user was signed out (no NavigationContainer mounted to receive it).
  // Threaded into createLinking's getInitialURL below. Optional — omitted in
  // tests and anywhere the Gate isn't involved.
  takePendingUrl?: TakePendingUrl;
}

export default function RootNavigator({ initialRouteName = 'Home', takePendingUrl }: Props) {
  // Built ONCE per mount via the lazy useState initializer —
  // NavigationContainer reads `linking` on mount only, and a fresh object
  // every render would be wasted work (and a re-subscribe footgun if React
  // Navigation ever starts diffing it).
  const [linking] = useState(() => createLinking(takePendingUrl));
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
        {/* DrawerProvider holds the single "is the hamburger drawer open"
            slot so the menu button can live in multiple headers (the
            editorial Home header + Tasks/Profile/FullMap) without mounting
            several <HamburgerDrawer> copies. The drawer itself mounts ONCE
            in <DrawerHost />, mirroring <SharedModalsHost />. */}
        <DrawerProvider>
          <NavInner initialRouteName={initialRouteName} />
          <SharedModalsHost />
          <DrawerHost />
        </DrawerProvider>
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
  const drawer = useDrawer();
  const color = useColor();
  const styles = makeStyles(color);
  const insets = useSafeAreaInsets();
  const isAdmin = useIsAdmin();

  const { flags } = useFlags();
  const openCount = flags.filter((f) => f.status === 'open').length;
  const tasksBadge: number | undefined = openCount > 0 ? Math.min(openCount, 99) : undefined;

  // Just the menu button — the drawer itself is mounted once in <DrawerHost />.
  // Used as headerLeft on every dark-header screen; Home renders its own copy
  // inside the editorial header (it has headerShown:false).
  const renderMenuButton = () => (
    <Pressable
      onPress={() => drawer.setOpen(true)}
      style={({ pressed }) => [styles.hamburgerBtn, pressed && styles.hamburgerBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel="Open navigation menu"
      hitSlop={8}
    >
      <MenuIcon size={icon.lg} color={color.headerFg} strokeWidth={2.2} />
    </Pressable>
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
          backgroundColor: color.headerBg,
          borderBottomWidth: 1,
          borderBottomColor: color.headerBorder,
          // Soft editorial lift (was a heavy #000/0.4 drop tuned for the old
          // dark navy bar — too heavy under the clean light header).
          shadowColor: '#0F1B2D',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        headerTitleStyle: {
          color: color.headerFg,
          fontWeight: font.weight.bold,
          fontSize: font.size.lg,
          letterSpacing: 0.2,
        },
        headerTintColor: color.headerFg,
        headerTitleAlign: 'center',
        headerRight: renderHeaderRight,
        tabBarActiveTintColor: color.tabBarActiveTint,
        tabBarInactiveTintColor: color.tabBarInactiveTint,
        // Native: a frosted-glass background behind the bar (Phase 7a). On web
        // we keep the CSS backdropFilter path in tabBarStyle instead.
        tabBarBackground: Platform.OS === 'web' ? undefined : () => <TabBarGlass />,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: color.navBorder,
          // Grow by the bottom safe-area inset so the home indicator never
          // overlaps the tab labels.
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
          ...(Platform.OS === 'web'
            ? {
                backgroundColor: color.tabBarBg,
                backdropFilter: 'blur(20px) saturate(160%)',
              } as object
            : {
                // Transparent + absolute so the frosted TabBarGlass shows the
                // map/content scrolling underneath. Screens add bottom padding
                // (useBottomTabBarHeight) so nothing hides behind the bar.
                position: 'absolute',
                backgroundColor: 'transparent',
              }),
        },
        tabBarLabelStyle: {
          fontSize: font.size.xs,
          fontWeight: font.weight.semibold,
          marginTop: 2,
          letterSpacing: 0.2,
        },
      }}
    >
      {/* Visible tabs: Home · Tasks · Profile (Phase 7a 3-tab layout). */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        // Home owns its own editorial header (menu + Feedback folded in), so
        // the dark nav header is hidden here.
        options={{ tabBarIcon: tabIcon(HomeIcon), headerShown: false }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        // Headerless — Tasks renders its own editorial header (menu + Feedback
        // folded in), matching Home.
        options={{ tabBarIcon: tabIcon(TasksIcon), tabBarBadge: tasksBadge, headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: tabIcon(ProfileIcon), headerLeft: renderMenuButton }}
      />
      {/* Hidden routes — registered + navigable, but no tab-bar button. The
          full map is reached from Home / focus-flag links / the deep link;
          Settings + Admin are reached from the hamburger drawer. */}
      <Tab.Screen
        name="FullMap"
        component={MapScreen}
        options={{
          title: 'Map',
          headerLeft: renderMenuButton,
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerLeft: renderMenuButton,
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      {isAdmin === true && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            headerLeft: renderMenuButton,
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
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

// Run a navigation action once the container is ready. A drawer menu tap can
// fire before NavigationContainer has mounted (very early taps, or during a
// remount), and navigationRef.navigate() is a silent no-op until isReady().
// Rather than dropping the intent, retry on the next frame — bounded so it can
// never loop forever if the container somehow never mounts.
function navigateWhenReady(action: () => void, attempts = 10): void {
  if (navigationRef.isReady()) {
    action();
    return;
  }
  if (attempts <= 0) return;
  requestAnimationFrame(() => navigateWhenReady(action, attempts - 1));
}

/**
 * Single mount-point for the hamburger drawer (Phase 7a). Reads the open flag
 * from DrawerContext and routes its menu actions through the container-level
 * navigationRef so items can reach the hidden tab routes (Settings / Admin)
 * and the Profile sign-in — exactly the pattern the old inline onSignIn used.
 */
function DrawerHost() {
  const { open, setOpen } = useDrawer();
  return (
    <HamburgerDrawer
      open={open}
      onClose={() => setOpen(false)}
      // F11: guest/web "Sign in" jumps to the Profile tab, which hosts the
      // sign-in modal.
      onSignIn={() => {
        setOpen(false);
        navigateWhenReady(() => navigationRef.navigate('Profile'));
      }}
      // Phase 7a: Settings + Admin moved off the tab bar into the drawer.
      // They're hidden tab routes, still reachable via navigationRef.
      onNavigate={(tab) => {
        setOpen(false);
        navigateWhenReady(() => navigationRef.navigate(tab));
      }}
    />
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    hamburgerBtn: {
      marginLeft: spacing.md,
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: color.headerBtnBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hamburgerBtnPressed: { backgroundColor: color.headerBtnBgPressed },
    feedbackBtn: {
      marginRight: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      backgroundColor: color.headerBtnBg,
      minHeight: 44, // WCAG 2.1 AA touch target minimum (was 32)
      justifyContent: 'center',
    },
    feedbackBtnPressed: { backgroundColor: color.headerBtnBgPressed },
    feedbackBtnText: {
      color: color.headerFg,
      fontWeight: font.weight.bold,
      fontSize: font.size.sm,
      letterSpacing: 0.3,
    },
  });
