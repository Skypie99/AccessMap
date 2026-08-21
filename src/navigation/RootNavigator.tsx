import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppText } from '@/components/ui/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home as HomeIcon,
  ListChecks as TasksIcon,
  User as ProfileIcon,
  type LucideIcon,
} from 'lucide-react-native';
import HamburgerDrawer from '@/components/HamburgerDrawer';
import { NavigationContainer, createNavigationContainerRef, useIsFocused } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/lib/auth';
import { FlagsProvider, useFlags } from '@/lib/flagsStore';
import { SharedModalsProvider, useSharedModals } from '@/lib/sharedModalsContext';
import { DrawerProvider, useDrawer } from '@/lib/drawerContext';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useReduceTransparency } from '@/lib/accessibility';
import { TabBarButton } from './TabBarButton';
import FeedbackModal from '@/components/FeedbackModal';
import HelpModal from '@/components/HelpModal';
import ChangelogModal from '@/components/ChangelogModal';
import MyFeedbackModal from '@/components/MyFeedbackModal';
import TermsScreen from '@/screens/TermsScreen';
import PrivacyScreen from '@/screens/PrivacyScreen';
import { useIsAdmin } from '@/lib/admin';
import HomeScreen from '@/screens/HomeScreen';
import MapScreen from '@/screens/MapScreen';
import TasksScreen from '@/screens/TasksScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import ErrorBoundary from '@/components/ErrorBoundary';
import { computeTasksBadge, applySceneInert } from '@/navigation/perceptionHelpers';
import { createLinking, type TakePendingUrl } from './linking';
import { ScreenFallback } from './ScreenFallback';

// Settings + Admin are reached ONLY from the hamburger drawer (Admin is also
// gated by is_admin), so they never appear on first paint. Code-split them out
// of the initial bundle with React.lazy — on web Metro emits a separate async
// chunk for each (loaded on demand when the user opens the screen); on native
// they load from the packaged bundle the same way. Keeps the heavy SettingsScreen
// (nested About/Onboarding/NotificationPrefs) out of the main chunk.
const SettingsScreen = React.lazy(() => import('@/screens/SettingsScreen'));
const AdminScreen = React.lazy(() => import('@/screens/AdminScreen'));

// React Navigation's `component` prop wants a plain component, not a lazy ref.
// Wrap each lazy screen so navigation/route props are forwarded and a Suspense
// boundary catches the async load.
function lazyScreen<P extends object>(LazyComponent: React.ComponentType<P>) {
  return function LazyScreenWrapper(props: P) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

const SettingsScreenLazy = lazyScreen(SettingsScreen);
const AdminScreenLazy = lazyScreen(AdminScreen);

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

/**
 * SW-13 / SW-38 — the tabs that actually have a button in the bar.
 *
 * @react-navigation/bottom-tabs builds each tab's iOS accessibilityLabel itself,
 * as `${label}, tab, ${index + 1} of ${routes.length}` (BottomTabBar), and
 * `routes.length` counts EVERY registered screen. This navigator registers three
 * hidden ones — FullMap, Settings, Admin — with `tabBarButton: () => null`, so a
 * three-tab bar announced "Home, tab, 1 of 5".
 *
 * Worse, `Admin` is conditional on `useIsAdmin()`, which resolves async from
 * `null`. So the count went 5 -> 6 mid-session for an admin and stayed 5 for
 * everyone else: the number was a role oracle a listener could hear.
 *
 * Deriving the labels from this one list means the count cannot drift from the
 * bar again — adding a visible tab means adding it here, and a hidden route
 * cannot accidentally join the count.
 */
const VISIBLE_TABS = ['Home', 'Tasks', 'Profile'] as const;

/**
 * The library only generates that string on iOS (elsewhere it leaves the label
 * undefined and the child text is announced), so we override on iOS only —
 * matching existing behaviour on Android and web rather than inventing new
 * announcements there.
 */
function tabLabel(name: (typeof VISIBLE_TABS)[number]): string | undefined {
  if (Platform.OS !== 'ios') return undefined;
  return `${name}, tab, ${VISIBLE_TABS.indexOf(name) + 1} of ${VISIBLE_TABS.length}`;
}

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
          {/* ⚠ ORDER IS LOAD-BEARING ON WEB, and only on web.
              react-native-web renders every <Modal> as a fixed div with the
              SAME z-index (9999), so when two are open at once the LATER
              SIBLING WINS.

              ⚑ THIS COMMENT USED TO SAY "Native does not care: a pageSheet is
              its own UIKit scene and the last-presented modal is on top
              regardless of tree position." THAT WAS FALSE, and it cost a whole
              investigation on 2026-08-19. Native cares enormously — just about
              a different thing. iOS refuses to present a modal from a view
              controller that is ALREADY presenting one, so these two sheets
              (which present from the ROOT) can never open over a surface that
              is itself a Modal. The tap does nothing, silently. Ordering does
              not help; nothing here can. Any surface that is itself a Modal
              mounts its own copy via useLegalSheets() — see
              src/components/LegalSheets.tsx. What lives here serves the TAB
              screens, where the root VC is free.

              Found live in the web export, Run 2: the drawer's About sat over
              the terms sheet opened FROM it, and the terms rendered underneath
              — readable only as text bleeding past the card's bottom edge.
              DrawerHost now mounts FIRST so SharedModalsHost is last and its
              modals always win, which is also the right relationship on its own
              terms: a shared modal opened from the drawer belongs above it.

              If you add a third host, it goes ABOVE this line unless you mean
              it to outrank the shared modals. */}
          <DrawerHost />
          <SharedModalsHost />
        </DrawerProvider>
      </SharedModalsProvider>
    </FlagsProvider>
  );
}

/**
 * Web keyboard-focus isolation (WCAG 2.4.3 Focus Order).
 * React Navigation marks inactive tab scenes `aria-hidden` but leaves them in
 * the DOM tab order — on web, react-native-screens does not `display:none` the
 * inactive tab siblings here, so a keyboard user on the Map can Tab straight
 * into the visually-occluded Home controls (verified: the whole Home scene —
 * "Open the full map", the barrier cards — stayed tabbable behind the map).
 * `aria-hidden` alone does NOT remove tab stops; `inert` does. ScreenInertLayer
 * mirrors each scene's focus → `inert` (via applySceneInert), so only the active
 * screen is keyboard-reachable. Web-only + additive: native focus is OS-drawn and
 * unaffected; nothing visual changes (the occluded Home simply stops catching
 * Tab). Wraps `screenLayout`, so it applies uniformly to every tab scene.
 */
const sceneFillStyle = { flex: 1 } as const;

function ScreenInertLayer({ children }: { children: React.ReactNode }) {
  const isFocused = useIsFocused();
  const ref = useRef<View>(null);
  useEffect(() => {
    applySceneInert(ref.current as unknown as HTMLElement | null, isFocused);
  }, [isFocused]);
  return (
    <View ref={ref} style={sceneFillStyle}>
      {children}
    </View>
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
  const isAdmin = useIsAdmin();

  const { flags } = useFlags();
  const tasksBadge = computeTasksBadge(flags);

  const renderHeaderRight = () => (
    <Pressable
      onPress={() => setOpen('feedback')}
      style={({ pressed }) => [styles.feedbackBtn, pressed && styles.feedbackBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel="Send feedback"
      accessibilityHint="Opens a form to email feedback to the Flagstone owner"
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
      screenLayout={({ children }) => (
        <ScreenInertLayer>
          <ErrorBoundary variant="screen">{children}</ErrorBoundary>
        </ScreenInertLayer>
      )}
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
        // BP11 / T3: every tab answers the hand — selection haptic + the
        // nav-chrome pressed dim, a11y props forwarded. Hidden routes override
        // this per-screen with `tabBarButton: () => null`.
        tabBarButton: (props) => <TabBarButton {...props} />,
        // Native: a frosted-glass background behind the bar (Phase 7a). On web
        // we keep the CSS backdropFilter path in tabBarStyle instead.
        tabBarBackground: Platform.OS === 'web' ? undefined : () => <TabBarGlass />,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: color.navBorder,
          // Grow by the bottom safe-area inset so the home indicator never
          // overlaps the tab labels. 68 (was 62) gives the label's real line
          // box room — at 62 the shrinkable label wrapper was squeezed to ~7px
          // and clipped "Home / Tasks / Profile" in half.
          height: 68 + insets.bottom,
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
        // Cap label scaling: a fixed-height bar can't grow with the OS font
        // size, so unbounded scaling would drive the label into the icon.
        tabBarAllowFontScaling: false,
        tabBarLabelStyle: {
          fontSize: font.size.xs,
          // Explicit line box (12 × 1.33). The label wrapper is shrinkable with
          // overflow:hidden, so without this it collapses below the glyph box.
          lineHeight: 16,
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
        options={{
          tabBarIcon: tabIcon(HomeIcon),
          headerShown: false,
          tabBarAccessibilityLabel: tabLabel('Home'),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        // Headerless — Tasks renders its own editorial header (menu + Feedback
        // folded in), matching Home.
        options={{
          tabBarIcon: tabIcon(TasksIcon),
          tabBarBadge: tasksBadge,
          headerShown: false,
          tabBarAccessibilityLabel: tabLabel('Tasks'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        // S8: Profile wears the editorial ScreenHeader (menu + Feedback folded
        // in), so the dark nav header is hidden — this kills the "Profile over
        // PROFILE" double title (L2-2) and removes the 200%-zoom header collision.
        options={{
          tabBarIcon: tabIcon(ProfileIcon),
          headerShown: false,
          tabBarAccessibilityLabel: tabLabel('Profile'),
        }}
      />
      {/* Hidden routes — registered + navigable, but no tab-bar button. The
          full map is reached from Home / focus-flag links / the deep link;
          Settings + Admin are reached from the hamburger drawer. */}
      <Tab.Screen
        name="FullMap"
        component={MapScreen}
        // S8: the map wears a compact editorial title inside its own box-none
        // overlay (menu + Feedback folded in), so the dark nav header is hidden —
        // no scrolling display header ever lands on the live map canvas.
        options={{
          headerShown: false,
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreenLazy}
        // S8: Settings wears the editorial ScreenHeader (menu + Feedback folded
        // in), so the dark nav header is hidden — one header family across tabs.
        options={{
          headerShown: false,
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      {isAdmin === true && (
        <Tab.Screen
          name="Admin"
          component={AdminScreenLazy}
          options={{
            headerShown: false,
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
      {/* §SKY-6: the terms live in the shared pool rather than per-screen
          precisely BECAUSE two of its three entry points are themselves
          modals — About and the report sheet. Mounted here, it presents over
          them; mounted inside either, it would be trapped under the surface
          that opened it. The same modal-over-modal shape the report sheet
          already uses over the flag sheet (device row D-B18). */}
      <TermsScreen visible={open === 'terms'} onClose={close} />
      {/* B-3 / §SKY-8: the privacy policy joins the pool for the same reason
          the terms did, and one more. Two of ITS three entry points are also
          surfaces it must present over — About, and the sign-in cover, which
          is not even inside the tab navigator. Mounted here it clears both. */}
      <PrivacyScreen visible={open === 'privacy'} onClose={close} />
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
  const isAdmin = useIsAdmin();
  // T12 (F3-01) WARM: the moment the drawer opens, fire the Settings (and Admin,
  // for admins) lazy-chunk import fire-and-forget, so by the time the user taps
  // the row the chunk is usually already resolved and the dressed ScreenFallback
  // never shows except on a cold, slow network. This extends the shipped
  // Suspense-fallback-null warm-chunk pattern (MapScreen/Tasks/Profile) to the nav
  // layer. .catch(() => {}) swallows a cold-network reject — the real Suspense
  // boundary re-attempts the load on navigation. The dynamic import is cached, so
  // repeat opens are no-ops; the Admin chunk is gated on isAdmin so guests never
  // fetch it (isAdmin is boolean | null — null while loading, hence === true).
  useEffect(() => {
    if (!open) return;
    import('@/screens/SettingsScreen').catch(() => {});
    if (isAdmin === true) import('@/screens/AdminScreen').catch(() => {});
  }, [open, isAdmin]);
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
