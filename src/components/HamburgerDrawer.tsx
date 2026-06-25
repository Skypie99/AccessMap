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
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { font, motion, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useReducedMotion } from '@/lib/accessibility';
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
  const styles = makeStyles(color);
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const reducedMotion = useReducedMotion();

  const [slideAnim] = useState(() => new Animated.Value(-DRAWER_WIDTH));
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [subScreen, setSubScreen] = useState<SubScreen | null>(null);
  // Holds the pending navigate() timer so we can cancel it on unmount — avoids a
  // setState-after-unmount warning if the drawer goes away during the 220ms delay.
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const slideTo = open ? 0 : -DRAWER_WIDTH;
    const fadeTo = open ? 1 : 0;
    // WCAG 2.3.3 — snap into place instead of sliding/fading under reduced motion.
    if (reducedMotion) {
      slideAnim.setValue(slideTo);
      fadeAnim.setValue(fadeTo);
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
    ]).start();
  }, [open, reducedMotion, slideAnim, fadeAnim]);

  const closeDrawer = useCallback(() => {
    onClose();
  }, [onClose]);

  const navigate = useCallback(
    (screen: SubScreen) => {
      onClose();
      // Small delay so the drawer closes visually before the sub-screen appears.
      if (navTimer.current) clearTimeout(navTimer.current);
      navTimer.current = setTimeout(() => setSubScreen(screen), 220);
    },
    [onClose],
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
        visible={open}
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
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.logoMini}>
              <AppText variant="heading" style={styles.logoMiniText}>A</AppText>
            </View>
            <AppText variant="heading" style={styles.drawerBrand}>AccessMap</AppText>
            <Pressable
              onPress={closeDrawer}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <X size={22} color={color.textSubtle} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Nav items */}
          <View style={styles.menuSection}>
            <DrawerItem
              icon={Layers}
              label="Resources"
              onPress={() => navigate('resources')}
              color={color}
            />
            <DrawerItem
              icon={Heart}
              label="How To Help"
              onPress={() => navigate('howToHelp')}
              color={color}
            />
            <DrawerItem
              icon={Info}
              label="About the App"
              onPress={() => navigate('about')}
              color={color}
            />
            {/* Phase 7a: Settings + Admin live here now (off the 3-tab bar).
                These navigate to hidden tab routes rather than opening modals. */}
            {onNavigate && (
              <DrawerItem
                icon={SettingsIcon}
                label="Settings"
                onPress={() => onNavigate('Settings')}
                color={color}
              />
            )}
            {onNavigate && isAdmin === true && (
              <DrawerItem
                icon={AdminIcon}
                label="Admin"
                onPress={() => onNavigate('Admin')}
                color={color}
              />
            )}
          </View>

          <View style={styles.divider} />

          {/* Auth */}
          <View style={styles.menuSection}>
            {user ? (
              <DrawerItem
                icon={LogOut}
                label="Sign out"
                onPress={handleSignOut}
                color={color}
                muted
              />
            ) : (
              <DrawerItem
                icon={LogIn}
                label="Sign in"
                // F11: route to the sign-in entry instead of just closing the
                // drawer (which left guests with no way to reach auth).
                onPress={onSignIn ?? closeDrawer}
                color={color}
              />
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
  color: ColorTheme;
  muted?: boolean;
}

function DrawerItem({ icon: Icon, label, onPress, color, muted = false }: ItemProps) {
  const styles = makeItemStyles(color);
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
          color={muted ? color.textSubtle : color.brand}
          strokeWidth={2.2}
        />
      </View>
      <AppText variant="label" style={[styles.label, muted && styles.labelMuted]}>{label}</AppText>
      <ChevronRight size={16} color={color.textSubtle} strokeWidth={2.2} />
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (color: ColorTheme) =>
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
      backgroundColor: 'rgba(8,10,20,0.96)',
      borderRightWidth: 1,
      borderRightColor: 'rgba(255,255,255,0.1)',
      ...shadow.e3,
      paddingTop: Platform.OS === 'ios' ? 52 : 24,
      ...(Platform.OS === 'web'
        ? { backdropFilter: 'blur(30px) saturate(160%)' } as object
        : {}),
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
    logoMiniText: {
      color: color.textOnBrand,
      fontSize: font.size.md,
      fontWeight: font.weight.bold,
    },
    drawerBrand: {
      flex: 1,
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
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
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 36 : 20,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.06)',
    },
    footerText: {
      fontSize: font.size.xs,
      color: 'rgba(255,255,255,0.3)',
      letterSpacing: 0.2,
    },
  });

const makeItemStyles = (color: ColorTheme) =>
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
      color: color.textStrong,
      letterSpacing: 0.1,
    },
    labelMuted: {
      color: 'rgba(255,255,255,0.45)',
      fontWeight: font.weight.regular,
    },
  });
