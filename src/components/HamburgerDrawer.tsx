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
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
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
import { useReducedMotion, useReduceTransparency } from '@/lib/accessibility';
import { confirm } from '@/lib/confirm';
import { signOut } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useIsAdmin } from '@/lib/admin';
import ResourcesScreen from '@/screens/ResourcesScreen';
import HowToHelpScreen from '@/screens/HowToHelpScreen';
import AboutScreen from '@/screens/AboutScreen';

const DRAWER_WIDTH = 288;

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
  const styles = useMemo(() => makeStyles(color, reduceTransparency), [color, reduceTransparency]);
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

  const presentPendingSubScreen = useCallback(() => {
    const pending = pendingSubScreen.current;
    if (pending) {
      pendingSubScreen.current = null;
      setSubScreen(pending);
    }
  }, []);

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
      onClose();
    },
    [onClose],
  );

  const handleSignOut = useCallback(async () => {
    // Parity with the Settings row (SettingsScreen.handleSignOutPress): this
    // was the only sign-out path in the app that skipped confirm(). Dialog
    // strings are byte-identical to the shipped Settings dialog (BP16 copy
    // gate — no new copy on drawer surfaces). Confirm BEFORE closing: a
    // cancel leaves the drawer open, exactly where the user was.
    const ok = await confirm('Sign out?', 'Are you sure you want to sign out?', 'Sign out', true);
    if (!ok) return;
    closeDrawer();
    // Pass userId so signOut() can clear the offline flag cache, tile cache,
    // and push token. Steve condition: never pass undefined when user is
    // known — user.id is always a non-empty string for authenticated users.
    // Fire-and-forget like every other caller — the AuthProvider listener
    // routes back to SignInScreen.
    void signOut(user?.id);
  }, [closeDrawer, user]);

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
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} accessibilityLabel="Close menu" />
        </Animated.View>

        {/* Panel */}
        <Animated.View
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
          accessibilityViewIsModal
        >
          {/* Inner light lip just inside the cool right edge (glassChromeLip dark).
              The panel fill IS the near-opaque dark bulk-Lite tone (styles.drawer
              bg) rather than a LinearGradient child: a gradient reads as the
              material only over a TRANSPARENT panel bg, and a transparent bg
              suppresses the iOS drop shadow (shadow.e3 — an invariant here). The
              bulk-Lite gradient is ~3% alpha on identical RGB, so the solid fill
              is visually equivalent while keeping the shadow. NO GlassSurface/
              BlurView by design (this surface is not a GlassSurface variant). */}
          <View style={styles.drawerLip} pointerEvents="none" />
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.logoMini}>
              <LogoMark variant="white" size={24} />
            </View>
            <AppText variant="heading" style={styles.drawerBrand}>AccessMap</AppText>
            <Pressable
              onPress={closeDrawer}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <X size={22} color="rgba(255,255,255,0.7)" strokeWidth={2.2} />
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
                onPress={() => onNavigate('Settings')}              />
            )}
            {onNavigate && isAdmin === true && (
              <DrawerItem
                icon={AdminIcon}
                label="Admin"
                onPress={() => onNavigate('Admin')}              />
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
                onPress={onSignIn ?? closeDrawer}              />
            )}
          </View>

          {/* Footer */}
          <View style={styles.drawerFooter}>
            <AppText variant="body" style={styles.footerText}>AccessMap · Made with ♥ in Canada</AppText>
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
  const styles = makeItemStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
    >
      <View style={styles.iconWrap}>
        <Icon
          size={20}
          // Always-dark drawer: hardcode light-readable colors (the panel is a
          // hardcoded near-black, so theme tokens would go invisible in light
          // mode). #4E89EF is the theme's dark-palette brand — reads on dark.
          color={muted ? 'rgba(255,255,255,0.7)' : '#4E89EF'}
          strokeWidth={2.2}
        />
      </View>
      <AppText variant="label" style={[styles.label, muted && styles.labelMuted]}>{label}</AppText>
      <ChevronRight size={16} color="rgba(255,255,255,0.7)" strokeWidth={2.2} />
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (color: ColorTheme, reduceTransparency: boolean) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    drawer: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      // Deep-field dark OVERLAY material as a near-opaque solid (the spec's
      // blessed bulk-Lite fallback: ~3% alpha apart on identical RGB, so a solid
      // reads the same and keeps the iOS shadow). Non-RT: rgba(13,18,32,0.94)
      // (>=0.9 alpha, no see-through, lets the web backdropFilter show faintly).
      // RT: fully opaque #0D1220 (the flattened tone). ALWAYS-DARK literals
      // (never tokens — 271e8ec's re-tokenize broke light mode and was reverted).
      backgroundColor: reduceTransparency ? '#0D1220' : 'rgba(13,18,32,0.94)',
      borderRightWidth: 1,
      // Cool #A8C0E0-family hairline (dark chrome edge) in place of white-alpha.
      borderRightColor: 'rgba(168,192,224,0.18)',
      // Overlay shadow analog — KEPT deliberately. Deep-field dark rows/chrome
      // retire drop shadows, but this slide-in overlay needs separation from the
      // dimmed backdrop (flagged, not a regression).
      ...shadow.e3,
      paddingTop: Platform.OS === 'ios' ? 52 : 24,
      ...(Platform.OS === 'web' && !reduceTransparency
        ? { backdropFilter: 'blur(20px) saturate(160%)' } as object
        : {}),
    },
    // 1px inner light lip just inside the right edge (glassChromeLip dark).
    drawerLip: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 1,
      width: 1,
      backgroundColor: 'rgba(168,192,224,0.14)',
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.08)',
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
      // Always-dark drawer — hardcode light text (matches the hardcoded
      // white-alpha dividers); theme tokens would be unreadable in light mode.
      color: '#f5f5f5',
      letterSpacing: -0.4,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuSection: {
      paddingVertical: spacing.xs,
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.07)',
      marginHorizontal: spacing.lg,
      marginVertical: spacing.sm,
    },
    drawerFooter: {
      // In flow (not absolute) so it can never overlap the Sign-out row on
      // short devices at large type (sweep M22); marginTop:'auto' pushes it to
      // the panel bottom, paddingBottom keeps the old home-indicator clearance.
      marginTop: 'auto',
      paddingBottom: Platform.OS === 'ios' ? 36 : 20,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.06)',
    },
    footerText: {
      fontSize: font.size.xs,
      // Arbiter-forced fork: 0.30 composites to 2.67:1 over the worst-case panel
      // bg (FAIL); 0.55 = 6.17:1 PASS. Stays a hardcoded dark-panel literal.
      color: 'rgba(255,255,255,0.55)',
      letterSpacing: 0.2,
    },
  });

const makeItemStyles = () =>
  StyleSheet.create({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
      minHeight: 56,
    },
    itemPressed: {
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    iconWrap: {
      width: 30,
      alignItems: 'center',
    },
    label: {
      flex: 1,
      fontSize: font.size.md,
      fontWeight: font.weight.semibold,
      // Always-dark drawer — hardcode light text (see drawerBrand note).
      color: '#f5f5f5',
      letterSpacing: 0.1,
    },
    labelMuted: {
      // Margin fork: 0.45 = 4.51:1 (knife-edge, 0.01 over the 4.5 floor) ->
      // 0.48 = 4.97:1 so anti-aliasing/rounding never dips it under.
      color: 'rgba(255,255,255,0.48)',
      fontWeight: font.weight.regular,
    },
  });
