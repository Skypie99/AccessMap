/**
 * HamburgerDrawer — left slide-in navigation drawer.
 *
 * Triggered from the Map screen header. Shows top-level nav links
 * (Resources, How To Help, About the App) and a sign-in/sign-out action.
 * Each menu item opens its own full-screen modal overlay.
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
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { signOut } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import ResourcesScreen from '@/screens/ResourcesScreen';
import HowToHelpScreen from '@/screens/HowToHelpScreen';
import AboutScreen from '@/screens/AboutScreen';

const DRAWER_WIDTH = 288;

type SubScreen = 'resources' | 'howToHelp' | 'about';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HamburgerDrawer({ open, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { user } = useAuth();

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [subScreen, setSubScreen] = useState<SubScreen | null>(null);

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 12,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [open, slideAnim, fadeAnim]);

  const closeDrawer = useCallback(() => {
    onClose();
  }, [onClose]);

  const navigate = useCallback(
    (screen: SubScreen) => {
      onClose();
      // Small delay so the drawer closes visually before the sub-screen appears.
      setTimeout(() => setSubScreen(screen), 220);
    },
    [onClose],
  );

  const handleSignOut = useCallback(async () => {
    closeDrawer();
    await signOut();
  }, [closeDrawer]);

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
              <Text style={styles.logoMiniText}>A</Text>
            </View>
            <Text style={styles.drawerBrand}>AccessMap</Text>
            <Pressable
              onPress={closeDrawer}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <Ionicons name="close" size={22} color={color.textSubtle} />
            </Pressable>
          </View>

          {/* Nav items */}
          <View style={styles.menuSection}>
            <DrawerItem
              icon="layers-outline"
              label="Resources"
              onPress={() => navigate('resources')}
              color={color}
            />
            <DrawerItem
              icon="heart-outline"
              label="How To Help"
              onPress={() => navigate('howToHelp')}
              color={color}
            />
            <DrawerItem
              icon="information-circle-outline"
              label="About the App"
              onPress={() => navigate('about')}
              color={color}
            />
          </View>

          <View style={styles.divider} />

          {/* Auth */}
          <View style={styles.menuSection}>
            {user ? (
              <DrawerItem
                icon="log-out-outline"
                label="Sign out"
                onPress={handleSignOut}
                color={color}
                muted
              />
            ) : (
              <DrawerItem
                icon="log-in-outline"
                label="Sign in"
                onPress={closeDrawer}
                color={color}
              />
            )}
          </View>

          {/* Footer */}
          <View style={styles.drawerFooter}>
            <Text style={styles.footerText}>AccessMap · Made with ♥ in Canada</Text>
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
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: ColorTheme;
  muted?: boolean;
}

function DrawerItem({ icon, label, onPress, color, muted = false }: ItemProps) {
  const styles = makeItemStyles(color);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={icon}
          size={20}
          color={muted ? color.textSubtle : color.brand}
        />
      </View>
      <Text style={[styles.label, muted && styles.labelMuted]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={color.textSubtle} />
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
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255,255,255,0.1)',
      gap: spacing.sm,
    },
    logoMini: {
      width: 32,
      height: 32,
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
      color: '#f0f6ff',
      letterSpacing: -0.3,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    menuSection: {
      paddingVertical: spacing.sm,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: color.border,
      marginHorizontal: spacing.lg,
      marginVertical: spacing.xs,
    },
    drawerFooter: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 36 : 20,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.lg,
    },
    footerText: {
      fontSize: font.size.xs,
      color: color.textSubtle,
    },
  });

const makeItemStyles = (color: ColorTheme) =>
  StyleSheet.create({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
      minHeight: 52,
    },
    itemPressed: {
      backgroundColor: color.surfaceMuted,
    },
    iconWrap: {
      width: 28,
      alignItems: 'center',
    },
    label: {
      flex: 1,
      fontSize: font.size.md,
      fontWeight: font.weight.medium,
      color: color.textStrong,
    },
    labelMuted: {
      color: color.textSubtle,
    },
  });
