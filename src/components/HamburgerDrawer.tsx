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
  const [subScreen, setSubScreen] = useState<SubScreen | null>(null);
  // Holds the pending navigate() timer so we can cancel it on unmount — avoids a
  // setState-after-unmount warning if the drawer goes away during the 220ms delay.
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const slideTo = open ? 0 : -DRAWER_WIDTH;
    const fadeTo = open ? 1 : 0;
    // Mount immediately on open so the panel can spring in; on close we keep the
    // Modal mounted (via `rendered`) until the exit animation finishes below.
    if (open) setRendered(true);
    // WCAG 2.3.3 — snap into place instead of sliding/fading under reduced motion.
    if (reducedMotion) {
      slideAnim.setValue(slideTo);
      fadeAnim.setValue(fadeTo);
      // Snap-closed same-tick: there's no exit animation to wait for, so unmount
      // now (no timers — the RM designed-stillness contract is preserved).
      if (!open) setRendered(false);
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
    ]).start(({ finished }) => {
      // Welded departure: flip the Modal closed only after the panel slide +
      // backdrop fade have actually played (finished === true). A close
      // interrupted by a reopen leaves `rendered` true (open is true again, so
      // this no-ops), and the panel springs back from wherever it is; a completed
      // exit leaves slideAnim at -DRAWER_WIDTH, so the next open starts off-screen.
      if (!open && finished) setRendered(false);
    });
  }, [open, reducedMotion, slideAnim, fadeAnim]);

  const closeDrawer = useCallback(() => {
    onClose();
  }, [onClose]);

  const navigate = useCallback(
    (screen: SubScreen) => {
      onClose();
      // Wait for the drawer's real close slide before the sub-screen appears.
      // T12: now that the exit animation actually plays (the `rendered` latch
      // above), this delay is bound to that slide's own duration —
      // motion.duration.base — so it earns its premise instead of being an
      // off-scale literal (retires the transition layer's last raw 220, per B5's
      // pulse-documentation standard). B5 (L4-11): under reduce motion the drawer
      // snaps closed instantly (see the useEffect above), so the wait is dead
      // time for exactly the users who asked for snappier UI — gate it to 0.
      // setTimeout(fn, 0) is a genuine next-tick, NOT a falsy-default API, so no
      // falsy-zero trap here.
      if (navTimer.current) clearTimeout(navTimer.current);
      navTimer.current = setTimeout(() => setSubScreen(screen), reducedMotion ? 0 : motion.duration.base);
    },
    [onClose, reducedMotion],
  );

  // Cancel any pending navigate() timer when the drawer unmounts.
  useEffect(
    () => () => {
      if (navTimer.current) clearTimeout(navTimer.current);
    },
    [],
  );

  const handleSignOut = useCallback(async () => {
    closeDrawer();
    // Pass userId so signOut() can clear the offline flag cache, tile cache,
    // and push token. Steve condition: never pass undefined when user is
    // known — user.id is always a non-empty string for authenticated users.
    await signOut(user?.id);
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
}

function DrawerItem({ icon: Icon, label, onPress, muted = false }: ItemProps) {
  const styles = makeItemStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
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
