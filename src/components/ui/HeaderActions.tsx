/**
 * HeaderActions — the ONE menu + Feedback control cluster for the editorial
 * ScreenHeader (S8). Two 44×44 circle buttons, lifted verbatim from HomeScreen
 * so every tab wears one shape (the drawer trigger) and one treatment (Feedback
 * as a MessageSquare icon; the word "Feedback" lives in the accessible name).
 *
 * This is why S18③'s 200%-zoom "MapFeedback" collision dissolves — the visible
 * word "Feedback" is gone from the header, so nothing can grow into the title.
 *
 * Presentation only — no data, no app logic. Home/Tasks keep their own inline
 * copies (Tasks' sits on glass with a different fill); this powers the screens
 * that newly join the family: Profile / Settings / the FullMap overlay title.
 */
import React from 'react';
import { Pressable, StyleSheet, type View } from 'react-native';
import { Menu, MessageSquare } from 'lucide-react-native';
import { radius } from '@/theme';
import { useColor } from '@/theme/ThemeContext';
import { useDrawerTrigger } from '@/lib/drawerContext';
import { hapticSelection } from '@/lib/haptics';

interface Props {
  onMenu: () => void;
  onFeedback: () => void;
  /** Icon (stroke) color — pass the screen's arbitrated ink for its circle fill. */
  iconColor: string;
  /** Circle fill. Defaults to color.surface (the Home idiom). */
  fillColor?: string;
}

export function HeaderActions({ onMenu, onFeedback, iconColor, fillColor }: Props) {
  const color = useColor();
  const bg = fillColor ?? color.surface;
  // D2/C3: register this button as the drawer's focus-return target, so a
  // screen reader lands back here when the drawer plainly closes. Registering
  // here covers every screen that adopted this cluster in one place. No-ops
  // outside a <DrawerProvider>.
  const menuTrigger = useDrawerTrigger<View>();
  return (
    <>
      <Pressable
        ref={menuTrigger.ref}
        onPress={() => {
          // Same light tick the tab bar gives every press (TabBarButton) — the
          // header cluster was the one silent nav control (BP-4).
          hapticSelection();
          menuTrigger.register();
          onMenu();
        }}
        style={({ pressed }) => [styles.btn, { backgroundColor: pressed ? color.surfaceNeutral : bg }]}
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
        hitSlop={8}
      >
        <Menu size={22} color={iconColor} strokeWidth={2.2} />
      </Pressable>
      <Pressable
        onPress={() => {
          hapticSelection();
          onFeedback();
        }}
        style={({ pressed }) => [styles.btn, { backgroundColor: pressed ? color.surfaceNeutral : bg }]}
        accessibilityRole="button"
        accessibilityLabel="Send feedback"
        accessibilityHint="Opens a form to email feedback to the AccessMap owner"
        hitSlop={8}
      >
        <MessageSquare size={20} color={iconColor} strokeWidth={2.2} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
