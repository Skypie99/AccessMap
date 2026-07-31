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
import { decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
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

/**
 * The drag-handle pill — ONE definition for every sheet in the app.
 *
 * ─── G3, and why the colour is not a taste call ───────────────────────────
 * `08_G3_GRABBER_ARBITER.md` measured five candidate inks across five surface
 * variants in both themes and both transparency states. The shipped
 * `color.borderStrong` scored **1.01–1.71:1** — it fails everywhere, including
 * on Nearby's opaque header, which Phase 2 had hoped would rescue it.
 * `color.inkGlassMuted` is the ONLY candidate clearing 3.0 on all ten
 * measurements (worst case 4.81 light / 5.43 dark), and it is already the
 * arbitrated ink for the close-X on two of the three pageSheets — so this is
 * consistency, not a new invention. Sky picked it in §SKY-6.
 *
 * ⚠ IT IS DELIBERATELY DARKER THAN THE PLATFORM. iOS's own grabber sits around
 * 1.3–1.6:1; Apple treats it as decorative. Sky chose the visible bar over the
 * conventional one. Do not "fix" this back toward the system look without a
 * fresh arbiter run and her say-so.
 *
 * Hidden from assistive tech on both platforms — the pill is a visual affordance
 * for a gesture, and every sheet carrying one also carries a labelled Close, so
 * announcing it would add a second nameless element to the tab order for no
 * gain. Both props are needed: one covers VoiceOver, the other TalkBack.
 *
 * ─── ⚠ SEAM: this primitive is shared ─────────────────────────────────────
 * G3 named three pageSheets (Resources, How to help, Nearby). They hand-roll
 * their own chrome and now import `SheetGrabber` directly. But `SheetHeader`
 * renders the same component, so **the Tasks filter sheet moved too** — and that
 * surface belongs to the **device-tune** train, not this one.
 *
 * That is a deliberate, recorded ride-along, not an accident:
 *   - the ink is arbitrated on the SAME bulk material the Tasks sheet uses
 *     (6.24:1 light / 6.51:1 dark — declared in the shipped proof set), so it is
 *     a contrast IMPROVEMENT there, from a measured 1.05–1.25:1;
 *   - a per-surface exception would have meant two inks for one affordance,
 *     which G3 evaluated as option PER-SURFACE and rejected as "not recommended";
 *   - device-tune owns that sheet's LAYOUT, and nothing about its layout changed.
 * If device-tune wants the old pill back, that is a conversation with Sky and a
 * fresh arbiter run — not a local override here.
 */
export function SheetGrabber() {
  const color = useColor();
  return (
    <View
      style={styles.handleWrap} {...decorativeProps}
    >
      <View style={[styles.handle, { backgroundColor: color.inkGlassMuted }]} />
    </View>
  );
}

export function SheetHeader({ title, onClose, showHandle = true, closeLabel, right, titleRef }: SheetHeaderProps) {
  const color = useColor();
  return (
    <>
      {showHandle ? <SheetGrabber /> : null}
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
      {/* G1/SR-063 — the VoiceOver escape gesture (two-finger Z) lands HERE,
          on the containment node, NOT on <Modal>. RN's Modal.render() forwards
          an explicit prop allowlist to RCTModalHostView and
          onAccessibilityEscape is not in it (react-native 0.81.5,
          Libraries/Modal/Modal.js:326-347), so a prop on the Modal tag would
          typecheck, satisfy any naive guard, and do absolutely nothing. On a
          View it is real: RCTView.m:447 accessibilityPerformEscape.
          One edit here covers both Sheet consumers. */}
      <View
        style={[styles.backdrop, { backgroundColor: color.scrim }]}
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
        testID={testID}
      >
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
