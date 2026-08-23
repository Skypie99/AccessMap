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
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type Text,
  type ViewStyle,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useColor } from '@/theme/ThemeContext';
import { decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { bulkGlassShadow, font, radius, shadow, spacing } from '@/theme';
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
  /** Optional node rendered BESIDE the close button, before it. The refresh
   *  circles the list sheets carry (A11Y-222) are this, not `right` — they sit
   *  next to Close, they do not replace it. */
  accessory?: React.ReactNode;
  /** Second line under the title, inside the header block (T3: one container,
   *  one multiplier). Achievements' "N of M earned" is this. */
  subtitle?: string;
  /** Spoken form of `subtitle` when the written one is abbreviated. */
  subtitleLabel?: string;
  /** Hint on the close button, for the sheets whose siblings carry one. */
  closeHint?: string;
  /** Drop the header's own horizontal gutter, because the CARD owns it.
   *  `Sheet padded` sets this; a standalone caller normally does not. */
  flush?: boolean;
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

export function SheetHeader({
  title,
  onClose,
  showHandle = true,
  closeLabel,
  closeHint,
  right,
  accessory,
  subtitle,
  subtitleLabel,
  flush,
  titleRef,
}: SheetHeaderProps) {
  const color = useColor();
  return (
    <>
      {showHandle ? <SheetGrabber /> : null}
      <View style={[styles.headerRow, flush && styles.headerRowFlush]}>
        <View style={styles.titleWrap}>
          <AppText
            ref={titleRef}
            variant="heading"
            size={font.size.xl}
            color={color.textStrong}
            style={styles.title}
            accessibilityRole="header"
            // T4 — a sheet title shrinks to 0.8 and then WRAPS. It never
            // clamps to one line, which is what the Leaderboard's own header
            // did before it moved in here (D: title numberOfLines).
            adjustsFontSizeToFit
            numberOfLines={2}
            minimumFontScale={0.8}
          >
            {title}
          </AppText>
          {subtitle ? (
            <AppText
              variant="body"
              size={font.size.sm}
              color={color.inkGlassMuted}
              accessibilityLabel={subtitleLabel}
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {accessory}
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
            accessibilityHint={closeHint}
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
  /** Optional control BESIDE Close (the list sheets' Refresh circle). */
  headerAccessory?: React.ReactNode;
  /** Second header line, and its spoken form. */
  subtitle?: string;
  subtitleLabel?: string;
  /** Close button label + hint, when the default `Close {title}` is not the
   *  wording the surface already ships. */
  closeLabel?: string;
  closeHint?: string;
  /** Render the card as bulk-glass (the ratified modal material) instead of an
   *  opaque surface. Default false — the opaque path is byte-identical to prior
   *  behavior, so every non-glass consumer is unchanged (B4, GLASS.md). */
  glass?: boolean;
  /** Forward `forceEngineered` to the bulk GlassSurface — the engineered
   *  micro-gradient instead of a true BlurView on iOS.
   *
   *  ⚠ THIS IS A MATERIAL CHOICE, NOT A STYLE ONE, and it is per-adopter on
   *  purpose. Ten of the sheets that moved in here (2026-08-22) shipped
   *  engineered and three shipped true blur; flattening either way would have
   *  changed how the estate reads on device, and the bulk floor is an open
   *  NEEDS-DEVICE row (D8). So each adopter keeps exactly what it had, and this
   *  prop is the seam that lets it. Do not default it.
   */
  engineered?: boolean;
  /** The CARD owns the gutter: paddingHorizontal `xl` + `gap md`, and the
   *  header drops its own horizontal padding so the two do not stack.
   *
   *  Every sheet that moved in here was already built this way — its body
   *  children carry no padding of their own and rely on the card's. `padded`
   *  is what let those bodies transplant unchanged. */
  padded?: boolean;
  /** Wrap the card in a KeyboardAvoidingView (the input-hosting sheets).
   *
   *  ⚠ WHERE THE CAP LIVES (G6/SR-099). A percentage height resolves only
   *  against a parent with a DEFINITE height. The backdrop's `flex:1` is the
   *  only definite one in the stack, so with a KAV present the cap has to sit
   *  ON THE KAV — a maxHeight below it is inert. `shrinkStyle` therefore lands
   *  on whichever node is the definite-height child: the KAV when there is one,
   *  the shadow wrapper when there is not. */
  keyboardAvoiding?: boolean;
  /** Extra style for that definite-height node — a different cap, or the SW-42
   *  floor (`minHeight`) the two list sheets carry. */
  shrinkStyle?: ViewStyle;
  /** Let the card FILL the height the floor reserves instead of sitting at the
   *  top of it (SW-42 follow-up: without this a height floor becomes a gap). */
  fill?: boolean;
  /** Floor for the card's bottom pad, before the safe-area inset is compared
   *  against it. Default `spacing.sm`.
   *
   *  This is a PROP and not a `cardStyle` override on purpose: the pad is
   *  `Math.max(floor, insets.bottom)`, so a flat paddingBottom in cardStyle
   *  would silently drop the inset and put content under the home indicator on
   *  every inset device. */
  minBottomPad?: number;
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
  headerAccessory,
  subtitle,
  subtitleLabel,
  closeLabel,
  closeHint,
  glass = false,
  engineered = false,
  padded = false,
  keyboardAvoiding = false,
  shrinkStyle,
  fill = false,
  minBottomPad = spacing.sm,
  showHandle = true,
  testID,
}: SheetProps) {
  const color = useColor();
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const reducedMotion = useReducedMotion();
  // WCAG 2.4.3: when the sheet opens, move the screen-reader cursor onto its
  // title so it doesn't stay on the control behind the sheet.
  const titleRef = useFocusOnOpen<Text>(visible);
  const inner = (
    <>
      <SheetHeader
        title={title}
        onClose={onClose}
        showHandle={showHandle}
        right={headerRight}
        accessory={headerAccessory}
        subtitle={subtitle}
        subtitleLabel={subtitleLabel}
        closeLabel={closeLabel}
        closeHint={closeHint}
        flush={padded}
        titleRef={titleRef}
      />
      {children}
    </>
  );
  const padPair = [
    padded && styles.cardPadded,
    fill && styles.cardFill,
    { paddingBottom: Math.max(minBottomPad, insets.bottom) },
    cardStyle,
  ];
  const card = glass ? (
    // Bulk-glass card: the variant owns the surface, and overflow:hidden
    // clips it to the rounded top — so (per GlassSurface's contract) the
    // up-shadow lives on the outer wrapper, since an overflow:hidden view
    // clips its own shadow. Recipe identical to FeedbackModal/AboutScreen.
    <View
      style={[
        styles.cardShadow,
        bulkGlassShadow(color),
        fill && styles.cardFill,
        // With a KAV present the cap belongs to the KAV, not here.
        keyboardAvoiding ? null : shrinkStyle,
      ]}
    >
      <GlassSurface
        variant="bulk"
        borderRadius={0}
        forceEngineered={engineered}
        // Inset pad sits BEFORE cardStyle so a caller's documented
        // paddingBottom override still wins (sweep finding #4).
        style={[styles.card, styles.cardGlass, ...padPair]}
      >
        {inner}
      </GlassSurface>
    </View>
  ) : (
    <View
      style={[
        styles.card,
        { backgroundColor: color.surface },
        shadow.e3,
        ...padPair,
        keyboardAvoiding ? null : shrinkStyle,
      ]}
    >
      {inner}
    </View>
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
        {keyboardAvoiding ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.kav, shrinkStyle]}
          >
            {card}
          </KeyboardAvoidingView>
        ) : (
          card
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
  },
  // The KAV is the definite-height child when it is present, so it — not the
  // shadow wrapper — carries the cap (and the SW-42 floor, when a caller
  // passes one through `shrinkStyle`). See the prop's docblock.
  kav: { width: '100%', maxHeight: '90%', flexShrink: 1 },
  // `padded`: the CARD owns the gutter and the inter-child rhythm, so a
  // transplanted body keeps the geometry it was written against.
  cardPadded: { paddingHorizontal: spacing.xl, gap: spacing.md },
  // SW-42 follow-up: fill the height a floor reserves rather than sitting at
  // the top of it, which would turn a height floor into a gap.
  cardFill: { flexGrow: 1 },
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
  titleWrap: { flex: 1, gap: 2 },
  title: { flex: 1 },
  // `padded` case: the card already supplies the gutter, so the header must
  // not add a second one.
  headerRowFlush: { paddingHorizontal: 0 },
  closeBtn: {
    // 44 — the app's circle-button visual standard (HeaderActions,
    // SearchInputRow, UpdateBanner are all 44). This was the one shared
    // primitive below it (BP-6); hitSlop already made the TARGET compliant,
    // this aligns the visible box.
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
