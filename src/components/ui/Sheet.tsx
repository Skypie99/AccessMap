/**
 * Sheet — design-system bottom-sheet modal scaffold.
 *
 * ~20 modals across the app each hand-roll the same structure: a slide-up
 * Modal, a scrim backdrop, a rounded top card, and a header row with a title +
 * close button. `Sheet` unifies that (and adds a premium drag-handle pill),
 * while `SheetHeader` can be dropped into a custom card on its own.
 *
 * Reduced-motion aware (no slide when the user prefers reduced motion), themed
 * via useColor(), and a11y-correct (accessibilityViewIsModal, header role,
 * labelled close). Incrementally adoptable — content passes through as children.
 *
 * Design system 2026-06-01.
 */

import React from 'react';
import { Modal, Pressable, StyleSheet, View, type Text, type ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { useColor } from '@/theme/ThemeContext';
import { useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { font, radius, shadow, spacing } from '@/theme';
import { AppText } from './AppText';
import { GlassSurface } from './GlassSurface';

export interface SheetHeaderProps {
  title: string;
  onClose: () => void;
  /** Show the drag-handle pill above the title row. Default true. */
  showHandle?: boolean;
  /** Accessibility label for the close button. Default `Close {title}`. */
  closeLabel?: string;
  /** Optional node rendered in place of the close button (e.g. an action). */
  right?: React.ReactNode;
  /** When set, screen-reader focus moves to the title on open (WCAG 2.4.3).
   *  `Sheet` wires this automatically; standalone callers can pass their own. */
  titleRef?: React.Ref<Text>;
}

export function SheetHeader({ title, onClose, showHandle = true, closeLabel, right, titleRef }: SheetHeaderProps) {
  const color = useColor();
  return (
    <>
      {showHandle ? (
        <View
          style={styles.handleWrap}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={[styles.handle, { backgroundColor: color.borderStrong }]} />
        </View>
      ) : null}
      <View style={styles.headerRow}>
        <AppText
          ref={titleRef}
          variant="heading"
          size={font.size.xl}
          color={color.textStrong}
          style={styles.title}
          accessibilityRole="header"
        >
          {title}
        </AppText>
        {right ?? (
          <Pressable
            onPress={onClose}
            hitSlop={spacing.sm}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: pressed ? color.borderPressed : color.surfaceNeutral },
            ]}
            accessibilityRole="button"
            accessibilityLabel={closeLabel ?? `Close ${title}`}
          >
            <X size={18} color={color.text} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>
    </>
  );
}

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Override the card style (e.g. a different surface or paddingTop). */
  cardStyle?: ViewStyle;
  /** Optional right-side header accessory (replaces the close button). */
  headerRight?: React.ReactNode;
  /** Render the card as bulk-glass (the ratified modal material) instead of an
   *  opaque surface. Default false — the opaque path is byte-identical to prior
   *  behavior, so every non-glass consumer is unchanged (B4, GLASS.md). */
  glass?: boolean;
  showHandle?: boolean;
  testID?: string;
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
  cardStyle,
  headerRight,
  glass = false,
  showHandle = true,
  testID,
}: SheetProps) {
  const color = useColor();
  const reducedMotion = useReducedMotion();
  // WCAG 2.4.3: when the sheet opens, move the screen-reader cursor onto its
  // title so it doesn't stay on the control behind the sheet.
  const titleRef = useFocusOnOpen<Text>(visible);
  const inner = (
    <>
      <SheetHeader title={title} onClose={onClose} showHandle={showHandle} right={headerRight} titleRef={titleRef} />
      {children}
    </>
  );
  return (
    <Modal
      aria-label={title}
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: color.scrim }]} accessibilityViewIsModal testID={testID}>
        {glass ? (
          // Bulk-glass card: the variant owns the surface, and overflow:hidden
          // clips it to the rounded top — so (per GlassSurface's contract) the
          // up-shadow lives on the outer wrapper, since an overflow:hidden view
          // clips its own shadow. Recipe identical to FeedbackModal/AboutScreen.
          <View
            style={[
              styles.cardShadow,
              color.scheme === 'dark'
                ? { shadowColor: '#000', shadowOpacity: 0.35 }
                : { shadowColor: color.shadowTint, shadowOpacity: 0.12 },
            ]}
          >
            <GlassSurface variant="bulk" borderRadius={0} style={[styles.card, styles.cardGlass, cardStyle]}>
              {inner}
            </GlassSurface>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: color.surface }, shadow.e3, cardStyle]}>
            {inner}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  card: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.sm,
    // Resolves on the NON-glass path (the card is a direct child of the
    // `flex:1` backdrop there). On the glass path the real cap is cardShadow's
    // — see G6/SR-099 below — and flexShrink is what lets the card obey it.
    maxHeight: '90%',
    flexShrink: 1,
  },
  // Glass path only: clip the bulk material to the rounded top.
  cardGlass: { overflow: 'hidden' },
  // Glass path only: the up-shadow the clipped card can't cast itself. Mode
  // tint + opacity applied inline (see the render). Matches FeedbackModal.
  cardShadow: {
    // G6/SR-099 — THE CAP LIVES HERE on the glass path. The primitive carries
    // the same recipe as the four hand-rolled sheets (its own comment above
    // says so), so it carried the same latent bug: a percentage maxHeight
    // resolves only against a parent with a *definite* height, and this
    // wrapper is content-sized, so the card's cap never resolved. Fixing the
    // primitive covers both consumers and every future adopter.
    maxHeight: '90%',
    flexShrink: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 5,
  },
  handleWrap: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.tight },
  handle: { width: 36, height: 4, borderRadius: radius.full },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  title: { flex: 1 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
