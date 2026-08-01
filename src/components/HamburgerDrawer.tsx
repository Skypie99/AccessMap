/**
 * HamburgerDrawer — left slide-in navigation drawer.
 *
 * Triggered from the app headers (and the editorial Home header) via the
 * shared DrawerContext. Shows content links that open full-screen modals
 * (Resources, How To Help, About the App), navigation to the hidden tab
 * routes (Settings, and Admin for admins) via the `onNavigate` callback, and
 * a sign-in/sign-out action.
 *
 * The drawer and sub-screen modals are independent React Native Modals so
 * they float correctly above the tab navigator on both native and web.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Heart,
  Info,
  Layers,
  LogIn,
  LogOut,
  Settings as SettingsIcon,
  Shield as AdminIcon,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import LogoMark from '@/components/LogoMark';
import { font, motion, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useFocusOnOpen, useReducedMotion, useReduceTransparency } from '@/lib/accessibility';
import { useTriggerHandle } from '@/lib/drawerContext';
import { confirm } from '@/lib/confirm';
import { signOut } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useIsAdmin } from '@/lib/admin';
import { hapticSelection } from '@/lib/haptics';
import ResourcesScreen from '@/screens/ResourcesScreen';
import HowToHelpScreen from '@/screens/HowToHelpScreen';
import AboutScreen from '@/screens/AboutScreen';

const DRAWER_WIDTH = 288;
/** Floor for the panel's bottom clearance on devices with no home indicator
 *  (`insets.bottom === 0`). Inherited verbatim from the retired footer row's
 *  Android padding, so the non-indicator case keeps the spacing it shipped
 *  with; indicator devices get their real inset instead of the old 36pt guess. */
const MIN_BOTTOM_CLEARANCE = 20;

type SubScreen = 'resources' | 'howToHelp' | 'about';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Guest/web only: invoked when the "Sign in" item is tapped. When omitted
   *  the item just closes the drawer (e.g. if a future caller has no auth route). */
  onSignIn?: () => void;
  /** Phase 7a: navigate to a hidden tab route (Settings / Admin), which moved
   *  off the tab bar into this drawer. The caller closes the drawer + jumps via
   *  navigationRef. When omitted, the items are hidden. */
  onNavigate?: (tab: 'Settings' | 'Admin') => void;
}

export default function HamburgerDrawer({ open, onClose, onSignIn, onNavigate }: Props) {
  const color = useColor();
  const reduceTransparency = useReduceTransparency();
  // D2/C1: the retired footer row was the panel's ONLY bottom clearance (its
  // paddingBottom: 36/20). With the row gone the clearance belongs to the panel
  // itself — and as a REAL inset instead of the old hardcoded guess, so the last
  // nav row clears the home indicator on the devices that have one and doesn't
  // waste 36pt on the ones that don't. Context rather than useSafeAreaInsets():
  // the drawer's own suites render it bare, with no SafeAreaProvider above it,
  // and the hook throws there while the context simply yields null.
  // Idiom: MyReportsModal.tsx:66.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const styles = useMemo(
    () => makeStyles(color, reduceTransparency, insets.bottom),
    [color, reduceTransparency, insets.bottom],
  );
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const reducedMotion = useReducedMotion();

  const [slideAnim] = useState(() => new Animated.Value(-DRAWER_WIDTH));
  const [fadeAnim] = useState(() => new Animated.Value(0));
  // T12 (F3-02/F3-07): latch the drawer Modal mounted through its close so the
  // exit animation actually plays. `open` flips false immediately on close, but
  // the Modal (animationType="none") unmounts its children on that same render —
  // so the coded exit slide/fade never rendered ("arrives like glass, vanishes
  // like a light switch"). Drive Modal visibility off `rendered` instead: mount
  // on open, stay mounted while the exit timing runs, flip closed in the
  // animation's completion callback. Under reduce motion the snap sets it false
  // same-tick (no timers — designed stillness preserved).
  const [rendered, setRendered] = useState(open);
  // Live mirror of `open` for the exit animation's completion callback. The
  // callback closes over the `open` of the effect run that STARTED the
  // animation — stale by the time an interrupted exit reports back — and
  // gating the unmount on that stale value stranded `rendered=true`: a
  // mounted, invisible Modal whose full-screen backdrop ate every tap in the
  // app (the D1 wedge — web-reproduced 2026-07-25).
  const openRef = useRef(open);
  openRef.current = open;
  const [subScreen, setSubScreen] = useState<SubScreen | null>(null);
  // D1 (device-tune 1): the sub-screen a nav item asked for, held until the
  // drawer Modal has ACTUALLY left the screen. iOS serializes Modal
  // present/dismiss as UIKit transactions — a sibling Modal presented while
  // the drawer Modal is still dismissing is silently dropped (or torn down
  // with the dismissing controller it was presented from), so the handoff
  // must be event-driven, never a parallel clock.
  const pendingSubScreen = useRef<SubScreen | null>(null);

  // D2/C3 — screen-reader focus.
  //
  // ON OPEN: pull focus to the panel's own header, so the drawer announces
  // itself instead of leaving focus on the (now-occluded) hamburger.
  const titleRef = useFocusOnOpen<Text>(open);
  // ON CLOSE: hand focus BACK to the trigger — but only on a plain dismissal.
  // A row that hands off to another surface (a sub-screen, a tab, sign-in,
  // sign-out) must not yank focus backwards: the destination owns focus from
  // there, and it already manages its own (About is accessibilityViewIsModal;
  // the Sheet family uses useFocusOnOpen). `handedOff` is the close REASON.
  const triggerHandle = useTriggerHandle();
  const handedOff = useRef(false);
  const markHandoff = useCallback(() => {
    handedOff.current = true;
  }, []);

  // The drawer's dismissal-complete handler: it hands off any pending
  // sub-screen AND settles focus. The name is pinned by the D1 route guard,
  // which greps for `onDismiss={presentPendingSubScreen}` — so it keeps the
  // name even though it now does both jobs.
  const presentPendingSubScreen = useCallback(() => {
    const pending = pendingSubScreen.current;
    if (pending) {
      pendingSubScreen.current = null;
      setSubScreen(pending);
    }
    // The drawer has ACTUALLY left the screen — the only moment a focus return
    // is correct. Web is a no-op (setAccessibilityFocus has no RNW backend).
    if (handedOff.current) {
      handedOff.current = false;
      return;
    }
    const node = triggerHandle.current;
    if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
  }, [triggerHandle]);

  // The single latch-release point. On iOS the Modal is still presented until
  // UIKit finishes the dismissal, so the pending sub-screen is handed to the
  // Modal's onDismiss (the dismissal-complete event) instead of being
  // presented here. Android stacks dialogs and web Modals are plain portals —
  // both can present in the same commit safely.
  const releaseDrawer = useCallback(() => {
    setRendered(false);
    if (Platform.OS !== 'ios') presentPendingSubScreen();
  }, [presentPendingSubScreen]);

  useEffect(() => {
    const slideTo = open ? 0 : -DRAWER_WIDTH;
    const fadeTo = open ? 1 : 0;
    // Mount immediately on open so the panel can spring in; on close we keep the
    // Modal mounted (via `rendered`) until the exit animation finishes below.
    if (open) {
      setRendered(true);
      // A reopen before the close finished also cancels any pending
      // sub-screen handoff (mirrors the latch's interrupted-exit semantics).
      pendingSubScreen.current = null;
      // Every open starts as a plain session; a row sets this if it hands off.
      handedOff.current = false;
    }
    // WCAG 2.3.3 — snap into place instead of sliding/fading under reduced motion.
    if (reducedMotion) {
      slideAnim.setValue(slideTo);
      fadeAnim.setValue(fadeTo);
      // Snap-closed same-tick: there's no exit animation to wait for, so unmount
      // now (no timers — the RM designed-stillness contract is preserved).
      if (!open) releaseDrawer();
      return;
    }
    Animated.parallel([
      open
        ? Animated.spring(slideAnim, {
            toValue: slideTo,
            useNativeDriver: true,
            ...motion.spring.drawer,
          })
        : Animated.timing(slideAnim, {
            toValue: slideTo,
            duration: motion.duration.base,
            useNativeDriver: true,
          }),
      Animated.timing(fadeAnim, {
        toValue: fadeTo,
        duration: motion.duration.fast,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Welded departure: on a NORMAL close this fires when the panel slide +
      // backdrop fade have actually played, and the Modal flips closed. The
      // release is gated on the CURRENT open intent (openRef), never on this
      // callback's stale closure or on `finished`: an exit interrupted by
      // anything other than a reopen (animation superseded or stopped — the
      // path that used to strand an invisible, tap-eating Modal) must still
      // release the latch, just without its last frames. The one case that
      // must NOT release — a reopen in flight — is exactly the case where
      // openRef.current is true again: this no-ops and the panel springs back
      // from wherever it is.
      if (!openRef.current) releaseDrawer();
    });
  }, [open, reducedMotion, slideAnim, fadeAnim, releaseDrawer]);

  const closeDrawer = useCallback(() => {
    onClose();
  }, [onClose]);

  const navigate = useCallback(
    (screen: SubScreen) => {
      // D1: hand the sub-screen to the drawer's dismissal instead of racing
      // it. The old parallel setTimeout presented the sub-screen at
      // motion.duration.base — the same instant the T12 exit latch flips the
      // drawer Modal's visible=false — so on device the two UIKit
      // transactions landed in the same frame and the sub-screen never
      // appeared. The pending ref is consumed by the Modal's onDismiss (iOS)
      // or releaseDrawer (Android/web), so the presentation starts only once
      // the drawer is genuinely gone. Under reduce motion the drawer snaps
      // closed and the dismissal completes at once — still zero timers (B5's
      // designed-stillness contract, now with no clock at all).
      pendingSubScreen.current = screen;
      markHandoff();
      onClose();
    },
    [markHandoff, onClose],
  );

  const handleSignOut = useCallback(async () => {
    // Parity with the Settings row (SettingsScreen.handleSignOutPress): this
    // was the only sign-out path in the app that skipped confirm(). Dialog
    // strings are byte-identical to the shipped Settings dialog (BP16 copy
    // gate — no new copy on drawer surfaces). Confirm BEFORE closing: a
    // cancel leaves the drawer open, exactly where the user was.
    const ok = await confirm('Sign out?', 'Are you sure you want to sign out?', 'Sign out', true);
    if (!ok) return;
    // A handoff, not a plain close — the session ends and the trigger unmounts
    // with the whole tab tree, so there is nothing to return focus to.
    markHandoff();
    closeDrawer();
    // Pass userId so signOut() can clear the offline flag cache, tile cache,
    // and push token. Steve condition: never pass undefined when user is
    // known — user.id is always a non-empty string for authenticated users.
    // Fire-and-forget like every other caller — the AuthProvider listener
    // routes back to SignInScreen.
    void signOut(user?.id);
  }, [closeDrawer, markHandoff, user]);

  const handleSignIn = useCallback(() => {
    // Only a real auth route is a handoff; without one the row just closes the
    // drawer, which IS a plain close and should return focus.
    if (onSignIn) {
      markHandoff();
      onSignIn();
      return;
    }
    closeDrawer();
  }, [closeDrawer, markHandoff, onSignIn]);

  return (
    <>
      {/* ── Drawer ─────────────────────────────────────────────── */}
      <Modal
        aria-label="Menu"
        visible={rendered}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
        // D1: iOS fires this when the dismissal transaction completes — the
        // earliest instant a sibling Modal can present without being dropped.
        onDismiss={presentPendingSubScreen}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          {/* D2/C3: hidden from assistive tech. Tapping the scrim to dismiss is
              a sighted-pointer affordance; exposing it duplicated the literal
              label "Close menu" already carried by the 44pt X, so VoiceOver
              announced two identical buttons for one action. The screen-reader
              paths out are that X and onRequestClose (hardware back / Escape),
              and containment is the panel's accessibilityViewIsModal. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeDrawer}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
        </Animated.View>

        {/* Panel */}
        <Animated.View
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
          accessibilityViewIsModal
          // G1/SR-063 — the ONLY change this phase makes to the drawer. It
          // rides the panel (the containment node), not <Modal>, because RN
          // drops the prop on the modal host. `closeDrawer` is the same
          // handler onRequestClose uses, so the exit latch, the RM same-tick
          // snap, the sub-screen hand-off and the focus return all run exactly
          // as they do for the X and the scrim.
          onAccessibilityEscape={closeDrawer}
        >
          {/* Inner specular lip just inside the chrome edge (glassChromeLip).
              The panel fill IS the chrome-Lite tone (styles.drawer bg) rather
              than a LinearGradient child: a gradient reads as the material only
              over a TRANSPARENT panel bg, and a transparent bg suppresses the
              iOS drop shadow (shadow.e3 — an invariant here). The chrome-Lite
              gradient is ~3% alpha on identical RGB, so the solid fill is
              visually equivalent while keeping the shadow. NO GlassSurface/
              BlurView by design — this surface is not a GlassSurface variant,
              and the engineered tier costs nothing against the blur budget. */}
          <View style={styles.drawerLip} pointerEvents="none" />
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.logoMini}>
              <LogoMark variant="white" size={24} />
            </View>
            {/* Focus target on open. `variant="heading"` already resolves
                accessibilityRole="header", so this reads as the panel's
                heading without adding a prop. */}
            <AppText ref={titleRef} variant="heading" style={styles.drawerBrand}>AccessMap</AppText>
            <Pressable
              onPress={closeDrawer}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <X size={22} color={color.inkGlassMuted} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Nav items */}
          <View style={styles.menuSection}>
            <DrawerItem
              icon={Layers}
              label="Resources"
              onPress={() => navigate('resources')}            />
            <DrawerItem
              icon={Heart}
              label="How To Help"
              onPress={() => navigate('howToHelp')}            />
            <DrawerItem
              icon={Info}
              label="About the App"
              onPress={() => navigate('about')}            />
            {/* Phase 7a: Settings + Admin live here now (off the 3-tab bar).
                These navigate to hidden tab routes rather than opening modals. */}
            {onNavigate && (
              <DrawerItem
                icon={SettingsIcon}
                label="Settings"
                onPress={() => { markHandoff(); onNavigate('Settings'); }}              />
            )}
            {onNavigate && isAdmin === true && (
              <DrawerItem
                icon={AdminIcon}
                label="Admin"
                onPress={() => { markHandoff(); onNavigate('Admin'); }}              />
            )}
          </View>

          <View style={styles.divider} />

          {/* Auth */}
          <View style={styles.menuSection}>
            {user ? (
              <DrawerItem
                icon={LogOut}
                label="Sign out"
                // Verbatim the Settings row's hint (SettingsScreen.tsx) — the
                // destructive intent must be spoken, not colored.
                accessibilityHint="Destructive. Confirms before signing out."
                onPress={handleSignOut}                muted
              />
            ) : (
              <DrawerItem
                icon={LogIn}
                label="Sign in"
                // F11: route to the sign-in entry instead of just closing the
                // drawer (which left guests with no way to reach auth).
                onPress={handleSignIn}              />
            )}
          </View>
        </Animated.View>
      </Modal>

      {/* ── Sub-screen modals (independent of the drawer Modal) ── */}
      <ResourcesScreen
        visible={subScreen === 'resources'}
        onClose={() => setSubScreen(null)}
      />
      <HowToHelpScreen
        visible={subScreen === 'howToHelp'}
        onClose={() => setSubScreen(null)}
      />
      <AboutScreen
        visible={subScreen === 'about'}
        onClose={() => setSubScreen(null)}
      />
    </>
  );
}

// ── DrawerItem ────────────────────────────────────────────────────────────────

interface ItemProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  muted?: boolean;
  /** Spoken intent for rows whose consequence isn't in the label (e.g. the
   *  destructive Sign out row). Optional — plain nav rows need none. */
  accessibilityHint?: string;
}

function DrawerItem({ icon: Icon, label, onPress, muted = false, accessibilityHint }: ItemProps) {
  const color = useColor();
  const styles = useMemo(() => makeItemStyles(color), [color]);
  return (
    <Pressable
      onPress={() => {
        // The tab bar ticks on every press (TabBarButton); the drawer was the
        // one silent nav layer (BP-4). Same light selection haptic.
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
    >
      <View style={styles.iconWrap}>
        <Icon
          size={20}
          // D2: the row icon is the palette's own brand. It used to hardcode the
          // DARK-palette brand for BOTH schemes, twelve lines from a logo tile
          // that already read color.brand — so light mode rendered two different
          // brand blues at once (DECISIONS §F F-10). Muted rows take the
          // arbitrated on-glass muted ink, which clears the 3:1 non-text floor
          // in both schemes.
          color={muted ? color.inkGlassMuted : color.brand}
          strokeWidth={2.2}
        />
      </View>
      <AppText variant="label" style={[styles.label, muted && styles.labelMuted]}>{label}</AppText>
      <ChevronRight size={16} color={color.inkGlassMuted} strokeWidth={2.2} />
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (color: ColorTheme, reduceTransparency: boolean, bottomInset: number) => {
  // Reduce Transparency → the designed OPAQUE state (GLASS §6), never a smear.
  // DARK keeps the shipped flattened deep-field tone byte-for-byte, so dark mode
  // does not move; LIGHT takes the house RT chrome fill. The asymmetry is
  // deliberate: the dark palette's own `overlay` is a NEUTRAL near-black and
  // would shift the panel off the navy field it has always been — a regression
  // bought for nothing. Recorded in device-tune DECISIONS §A A-3, and this is
  // the ONLY raw dark literal left in this file (a guard pins it to this line).
  const rtFill = color.scheme === 'dark' ? '#0D1220' : color.overlay;
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: color.scrim,
    },
    drawer: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      // D2: the panel wears the app's OWN chrome-Lite material, bound to the
      // active scheme — one app, one palette. It ships as the engineered tier
      // (a near-opaque solid, ~3% alpha apart from the *Lite gradient on
      // identical RGB) rather than live blur: the solid reads the same, keeps
      // the iOS shadow, and costs nothing against the blur budget.
      //
      // The predecessor here was an always-dark literal, justified by a comment
      // claiming theme tokens "would go invisible in light mode". That was a
      // true observation with a wrong cause: the reverted re-tokenize bound
      // three INKS while leaving this surface hardcoded dark, so light inks
      // landed on a dark panel. Surfaces and inks are bound together now, which
      // is why the same tokens pass the arbiter 32/32 (DECISIONS §F F-8).
      backgroundColor: reduceTransparency ? rtFill : color.glassChromeLite0,
      borderRightWidth: 1,
      // The chrome tier's own edge hairline — the same token the header rule and
      // the section divider use, so the whole panel speaks one line.
      borderRightColor: color.glassChromeEdge,
      // Overlay shadow analog — KEPT deliberately. Deep-field dark rows/chrome
      // retire drop shadows, but this slide-in overlay needs separation from the
      // dimmed backdrop (flagged, not a regression).
      ...shadow.e3,
      paddingTop: Platform.OS === 'ios' ? 52 : 24,
      // D2/C1: real bottom clearance, inherited from the retired footer row.
      // (Top stays the shipped 52/24 — that guess is pre-existing and out of
      // this phase's scope.)
      paddingBottom: Math.max(bottomInset, MIN_BOTTOM_CLEARANCE),
      ...(Platform.OS === 'web' && !reduceTransparency
        ? { backdropFilter: 'blur(20px) saturate(160%)' } as object
        : {}),
    },
    // 1px inner specular lip just inside the right edge (the chrome tier's lip).
    drawerLip: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 1,
      width: 1,
      backgroundColor: color.glassChromeLip,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      // The chrome edge, not color.border: on the light panel color.border
      // measures 1.08:1 — an invisible rule. This is the hairline the chrome
      // tier is arbitrated with, and it matches the panel's right edge.
      borderBottomColor: color.glassChromeEdge,
      gap: spacing.md,
    },
    logoMini: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: color.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    drawerBrand: {
      flex: 1,
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      // The palette's strongest ink — 13.6:1 light / 16.4:1 dark on the panel.
      color: color.textStrong,
      letterSpacing: -0.4,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      // The neutral on-glass button wash: a dark wash on the light panel, a
      // luminosity lift on the dark one. One token, correct in both.
      backgroundColor: color.glassNeutralBtn,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuSection: {
      paddingVertical: spacing.xs,
    },
    divider: {
      height: 1,
      // Same hairline vocabulary as the panel edge + header rule (see above).
      backgroundColor: color.glassChromeEdge,
      marginHorizontal: spacing.lg,
      marginVertical: spacing.sm,
    },
  });
};

const makeItemStyles = (color: ColorTheme) =>
  StyleSheet.create({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
      minHeight: 56,
    },
    itemPressed: {
      // Same neutral on-glass wash as the close button — the press reads as a
      // wash in both schemes instead of a white bloom that only works on dark.
      backgroundColor: color.glassNeutralBtn,
    },
    iconWrap: {
      width: 30,
      alignItems: 'center',
    },
    label: {
      flex: 1,
      fontSize: font.size.md,
      fontWeight: font.weight.semibold,
      // The palette's strongest ink — same token as the brand wordmark.
      color: color.textStrong,
      letterSpacing: 0.1,
    },
    labelMuted: {
      // The arbitrated on-glass muted ink. Its predecessor was a white-alpha
      // fork that sat at 4.97:1 — a knife-edge half a point over the floor,
      // reached by hand-tuning alpha. This token measures 7.6–9.6:1 across
      // every panel state. The weight lifts to 500 because GLASS §2 requires
      // ≥500 for text on the glass family; the old 400 face was in breach.
      color: color.inkGlassMuted,
      fontWeight: font.weight.medium,
    },
  });
