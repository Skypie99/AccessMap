import React from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
// RNGH ScrollView, not react-native's: SheetPull's PanGestureHandler passes
// `simultaneousHandlers={scrollRef}` so the pull-to-dismiss and the body
// scroll can both recognize the same touch. RNGH resolves that ref via
// `ref.current.handlerTag` (utils.ts `transformIntoHandlerTags`) — a field
// only `createNativeWrapper`-wrapped components (this ScrollView) set on
// their ref. A plain react-native ScrollView ref has no `.handlerTag`, so the
// relation silently resolves to an empty array on native: SheetPull's handler
// stays the sole recognizer for the gesture and the ScrollView's own native
// pan never activates — an upward swipe reports success but no pixel moves.
// Web is unaffected (SheetPull returns `children` directly there, per its own
// `Platform.OS === 'web'` branch), which is why this only showed on device.
import { ScrollView } from 'react-native-gesture-handler';
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  severityColor,
  SEVERITY_COLOR_NAMES,
  SEVERITY_DESCRIPTIONS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
} from '@/lib/flags';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { isAxRecompose, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { FLOATING_TAB_BAR_CAPSULE_HEIGHT } from '@/navigation/tabBarGeometry';
import CategoryIcon from '@/components/CategoryIcon';
import { SeverityDisc } from '@/components/SeverityDisc';
import { AppText } from '@/components/ui/AppText';
import { TypeBlock, TYPE_BLOCK } from '@/components/ui/TypeBlock';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { SheetGrabber } from '@/components/ui/Sheet';
import { SheetPull, useAtTop } from '@/components/ui/SheetPull';
import { Check, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * G5: fired when the surface has ACTUALLY left the screen (iOS onDismiss;
   * elsewhere the opener's `release()` stands in). The opener uses it to hand
   * the screen-reader cursor back to the control that opened this surface.
   * Optional — an opener with no trigger to return to passes nothing.
   */
  onDismiss?: () => void;
  /**
   * VP1 fix3: the occupied height of the floating bottom nav (MapScreen's
   * `useBottomTabBarHeight()`), so the expanded panel can stop its readable
   * content short of the nav instead of being clipped behind it. Optional —
   * defaults to the bar's own control height + this context's insets.bottom,
   * the same formula RootNavigator uses, for callers/tests with no navigator.
   */
  tabBarHeight?: number;
}

export default function LegendModal({ visible, onClose, onDismiss, tabBarHeight }: Props) {
  const color = useColor();
  const reducedMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const styles = makeStyles(color);
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const effectiveTabBarHeight = tabBarHeight ?? FLOATING_TAB_BAR_CAPSULE_HEIGHT + insets.bottom;
  // WCAG 2.4.3: move the screen-reader cursor onto the header when the modal opens.
  const titleRef = useFocusOnOpen<View>(visible);
  // Pull-to-dismiss (map-gestures SPEC §2.6). Read-only sheet, so no busy gate —
  // just the dismiss-vs-scroll rule over the severity/category list.
  const { atTop, onScroll, scrollEventThrottle } = useAtTop();
  const scrollRef = React.useRef(null);
  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose} onDismiss={onDismiss} aria-label="Map legend">
      <View style={styles.backdrop}>
        {/* S9 (L6-21): the scrim is an absolute SIBLING of the card, not its
            ancestor — a screen reader never lands on a giant "Close" button that
            wraps the whole dialog. Hidden from the a11y tree on web; SR users
            close via the in-card top-right X, the escape scrub, or the
            hardware back path. Native VoiceOver is trapped in the card
            (accessibilityViewIsModal) so tap-to-dismiss on the scrim stays a
            sighted-only affordance. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close legend"
          accessibilityRole="button"
          aria-hidden={true}
        />
        {/* Pull-down-to-dismiss — the same onClose the scrim tap, the in-card
            Close button and onRequestClose all use. The legend is read-only and
            never busy, so the gesture has no state to guard against. */}
        <SheetPull
          onDismiss={onClose}
          atTop={atTop}
          simultaneousHandlers={scrollRef}
          // FIX4F: the top margin moved here from cardShell (below), onto the
          // node SheetPull itself measures for its dismiss-distance gate. See
          // the cardShell comment for why the old placement made that gate
          // effectively undismissable. A flat object, not a style array —
          // SheetPull's own `style` prop is typed as plain `ViewStyle`.
          style={{ ...styles.pullExpanded, marginTop: insets.top + spacing.sm }}
        >
        <View
          style={styles.cardShell}
          // FIX4E: a plain View, not Pressable. Pressable claims React Native's
          // classic responder system on touch-start (to track press state) even
          // with a no-op onPress, and that responder claim sits, in the touch
          // tree, between SheetPull's PanGestureHandler above and the RNGH
          // ScrollView below — starving the ScrollView's own native pan of the
          // touch stream it needs to activate. Confirmed live at XXXL: with this
          // node as a Pressable, SheetPull's handler correctly ran
          // BEGAN→FAILED (yielding the gesture, as `activeOffsetY` intends) yet
          // the ScrollView's onScroll fired zero times across repeated real
          // upward drags against content ~9x taller than the viewport. A plain
          // View never enters the responder system, so it swallows taps by
          // ordinary paint-order hit-testing (still opaque to the sibling scrim
          // behind it) without standing in the RNGH handlers' way. Sheet.tsx's
          // own equivalent wrapper (`cardShadow`, used by every other adopter)
          // is a plain View for the same reason — this brings Legend in line
          // with the pattern everywhere else already uses.
          //
          // A11Y-214 / SR-072: a Pressable is accessible-by-default, so this
          // shell was one giant UNNAMED VoiceOver element spanning the whole
          // card — swallowing every row and the in-card "Close legend" button
          // (the designated SR dismiss path). Opting out keeps its three jobs
          // (tap-swallow, VO containment, escape) and frees the children.
          accessible={false}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          {/* FIX4F: cardShell no longer carries its own marginTop (moved onto
              SheetPull's wrapper above) — same visual position either way,
              since the margin still sits between the backdrop's top edge and
              this card's own top edge, just on the other side of the flex
              boundary. What changes is what SheetPull measures for its
              dismiss-distance gate: SheetPull's `cardHeight.current` is the
              height of the node it wraps, and that node used to be the OLD,
              margin-inclusive `pullExpanded` box — 874px on a real device
              (confirmed live), 70px (insets.top + spacing.sm) MORE than this
              card's own true 804px, because the margin lived inside the
              measured box instead of pushing its top edge down. `distanceGate
              = max(120, cardHeight * 0.3)` turned that phantom 70px into a
              real ~21px inflation of the drag distance a human has to travel
              before the grabber pull commits. Small on its own, but Legend's
              "expanded" full-height presentation (VP1 fix3, unlike the
              content-hugging `standard` sheets this threshold was tuned
              against) already puts the honest gate north of 240px — every
              phantom pixel matters when the true number is already this
              close to the edge of what a normal pull travels. Moving the
              margin here makes SheetPull measure the actual visible,
              draggable card. */}
        <GlassSurface variant="bulk" borderRadius={0} style={styles.card}>
          <SheetGrabber />
          {/* VP1 fix2 (Sky): the collapsed map pill no longer carries its own
              dismiss X — only the expanded legend closes via an X, here in the
              header's top-right corner. It's a SIBLING of the accessible title
              wrapper, not a child of it: an `accessible` View merges every
              descendant into ONE VoiceOver node (the exact A11Y-214/SR-072 bug
              already fixed once on cardShell below), which would silently
              swallow this button's own role/label.
              VP1 fix3: the redundant fixed BOTTOM "Close" button that used to
              sit below the scroll area is gone — it ate scroll real estate and
              was the direct cause of "Anonymous report" clipping against it.
              A screen-reader user who scrolls to the end still has two ways
              out without scrolling back: the VoiceOver escape scrub
              (`onAccessibilityEscape` on the card shell below, fires from
              anywhere in the modal) and `onRequestClose`/the hardware back
              gesture. Sighted users keep the backdrop tap and this X. */}
          <View style={styles.headerRow}>
            <View ref={titleRef} style={styles.titleWrap} accessible accessibilityRole="header">
              {/* accessibilityRole="none": the WRAPPER is the one header node —
                  it's `accessible` (and the focus-in target), so on iOS it is the
                  single VoiceOver element and only its role ever lands. Left
                  alone, variant="heading" would add a second header role, which
                  react-native-web renders as an <h1> INSIDE the wrapper's <h1>:
                  invalid HTML, and one title heard as two nested headings. */}
              <AppText variant="heading" style={styles.title} accessibilityRole="none">Map legend</AppText>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.headerCloseBtn, pressed && { backgroundColor: color.borderPressed }]}
              accessibilityRole="button"
              accessibilityLabel="Close legend"
              hitSlop={8}
            >
              <X size={20} color={color.textStrong} strokeWidth={2.4} />
            </Pressable>
          </View>
          {/* Board 06: the subtitle restates the title ("Map legend" / "What the
              colors and categories on the map mean"), so at the recomposition
              point it stands down and gives its two-or-three lines to the rows
              that actually teach. Below the threshold it is unchanged, and it is
              never removed from the DOM at a size where anyone reads it as the
              screen's only explanation. */}
          {!isAxRecompose(fontScale) && (
            <AppText variant="body" style={styles.subtitle}>What the colors and categories on the map mean.</AppText>
          )}

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(spacing.sm, effectiveTabBarHeight) },
            ]}
            onScroll={onScroll}
            scrollEventThrottle={scrollEventThrottle}
          >
            {/* T3 (X6): the Legend is the app's teaching surface and it taught
                the wrong hierarchy at large type — every row TITLE ("2 — Mild")
                capped at 1.6 on `label` while the meaning under it scaled
                uncapped on `body` and overtook it, and the section headings
                ("Severity", "Status", "Categories") capped tighter still at 1.5
                on `heading`. One content block over the whole sheet: headings,
                row titles and meanings share one multiplier, so the order the
                Legend exists to teach survives every text size. Per-row blocks
                would have fixed the rows and left the section headings inverted
                one level up. TypeBlock renders no view, so the layout is
                untouched at default size.
                PROTECT: the row rhythm (32pt disc + "N — Word" + consequence) and
                every string here are unchanged. */}
            <TypeBlock cap={TYPE_BLOCK.content}>
            <AppText variant="heading" style={styles.sectionLabel} accessibilityRole="header">
              Severity
            </AppText>
            {SEVERITY_ORDER.map((s) => {
              const label = SEVERITY_LABELS[s];
              const colorName = SEVERITY_COLOR_NAMES[s];
              const desc = SEVERITY_DESCRIPTIONS[s];
              return (
                <View
                  key={s}
                  style={styles.row}
                  accessible
                  accessibilityLabel={`Severity ${s}, ${label}. ${colorName}. ${desc}`}
                >
                  {/* The Legend's severity discs — the canonical grammar atom.
                      SeverityDisc keeps the digit decorative (T8 / F4-01); the
                      row View above carries the authored label. PROTECT: the
                      Legend row rhythm (32pt disc + "N — Word" + consequence). */}
                  <SeverityDisc severity={s} size={32} digitSize={font.size.base} />
                  <View style={styles.rowText}>
                    <AppText variant="label" style={styles.rowTitle}>
                      {s} — {label}
                    </AppText>
                    <AppText variant="body" style={styles.rowDesc}>{desc}</AppText>
                  </View>
                </View>
              );
            })}

            <AppText
              variant="heading"
              style={[styles.sectionLabel, styles.sectionLabelSpaced]}
              accessibilityRole="header"
            >
              Status
            </AppText>
            {/* S1: define the trust word "Verified" in one line — the first place
                any decision surface says what it means (reuses the FAQ sentence). */}
            <AppText variant="body" style={styles.rowDesc}>
              Open — reported, not yet checked. Verified — another person checked the spot and
              confirmed the issue is real. Resolved — the issue has been fixed.
            </AppText>
            {/* The two visual channels a sighted user decodes on the map itself. */}
            <View
              style={styles.row}
              accessible
              accessibilityLabel="Anonymous report. Shown with a double ring and keeps its severity colour."
            >
              <View style={styles.statusSwatch} importantForAccessibility="no" accessibilityElementsHidden>
                <View style={styles.anonRingOuter}>
                  <View style={[styles.statusDot, { backgroundColor: severityColor(3) }]} />
                </View>
              </View>
              <View style={styles.rowText}>
                <AppText variant="label" style={styles.rowTitle}>Anonymous report</AppText>
                <AppText variant="body" style={styles.rowDesc}>
                  Reported without an account. Shown with a double ring; still carries its severity colour.
                </AppText>
              </View>
            </View>
            <View
              style={styles.row}
              accessible
              accessibilityLabel="Resolved. Marked with a checkmark and keeps its severity colour."
            >
              <View style={styles.statusSwatch} importantForAccessibility="no" accessibilityElementsHidden>
                <View style={styles.hairlineRing}>
                  <View style={[styles.statusDot, { backgroundColor: severityColor(3) }]}>
                    <Check size={14} color="#fff" strokeWidth={3} />
                  </View>
                </View>
              </View>
              <View style={styles.rowText}>
                <AppText variant="label" style={styles.rowTitle}>Resolved</AppText>
                <AppText variant="body" style={styles.rowDesc}>
                  The issue has been fixed. Marked with a checkmark; keeps its severity colour.
                </AppText>
              </View>
            </View>

            <AppText
              variant="heading"
              style={[styles.sectionLabel, styles.sectionLabelSpaced]}
              accessibilityRole="header"
            >
              Categories
            </AppText>
            {CATEGORY_ORDER.map((c) => {
              const label = CATEGORY_LABELS[c];
              const desc = CATEGORY_DESCRIPTIONS[c];
              return (
                <View
                  key={c}
                  style={styles.row}
                  accessible
                  accessibilityLabel={`${label}. ${desc}`}
                >
                  <View
                    style={styles.catIconWrap}
                    importantForAccessibility="no"
                    accessibilityElementsHidden
                  >
                    <CategoryIcon category={c} size={20} color={color.brand} decorative />
                  </View>
                  <View style={styles.rowText}>
                    <AppText variant="label" style={styles.rowTitle}>{label}</AppText>
                    <AppText variant="body" style={styles.rowDesc}>{desc}</AppText>
                  </View>
                </View>
              );
            })}

            <AppText
              variant="heading"
              style={[styles.sectionLabel, styles.sectionLabelSpaced]}
              accessibilityRole="header"
            >
              Heat map
            </AppText>
            <AppText variant="body" style={styles.rowDesc}>
              When the heat map is on, neighbourhoods are tinted by their MEAN severity (using the
              1–5 scale above) and labelled with the rounded value. To protect reporters, heat zones
              only appear where at least 3 flags have been submitted.
            </AppText>

            <AppText variant="body" style={styles.footnote}>
              Reporters earn points when their flag is verified or resolved. Verifiers and resolvers
              earn points too.
            </AppText>
            </TypeBlock>
          </ScrollView>
        </GlassSurface>
        </View>
        </SheetPull>
      </View>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.scrim,
    justifyContent: 'flex-end',
  },
  // VP1 fix3: the pull wrapper must stretch (flexGrow) for cardShell's own
  // flexGrow to have a definite band to grow into — same wiring as Sheet's
  // `pullExpanded`. FIX4F: the render adds `marginTop` to THIS style (not to
  // cardShell below) — see the render's FIX4F comment for why SheetPull needs
  // to measure a box that ends exactly where the visible card ends.
  pullExpanded: { width: '100%', flexGrow: 1 },
  // Tap-swallow shell (a View — FIX4E, see the render for why not Pressable) —
  // bounds the sheet height; the bulk-glass material is its child, so the
  // backdrop-dismiss guard is preserved.
  // VP1 fix3 (Global Fix 3): grows to fill from the top margin down to the
  // backdrop's own bottom (the literal screen edge — this Modal renders above
  // the tab bar, same as every other legend/list overlay) instead of
  // content-hugging at a flat 85%, which left the panel undersized with dead
  // space below it and let the old fixed bottom Close button crowd out the
  // last rows. The nav-clearance gap moves to the ScrollView's own bottom
  // padding below (`scrollContent`), matching Sheet's `expanded` pattern.
  // FIX4F: the top margin itself now lives on `pullExpanded` above, not here
  // — this node's own height is unaffected either way, only which ancestor
  // SheetPull's dismiss-gate math measures.
  cardShell: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '100%',
    flexGrow: 1,
    flexShrink: 1,
  },
  card: {
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.sm,
    flexGrow: 1,
    flexShrink: 1,
    // The bulk variant owns the surface; clip it to the rounded top.
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleWrap: { flexShrink: 1 },
  // 32 + hitSlop 8 = an effective 48pt target (the same recipe the map
  // screen's own close controls use), while the VISIBLE circle stays a
  // compact top-right corner glyph rather than a full 44pt block.
  headerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    backgroundColor: color.surfaceNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: font.size.xxl,
    fontWeight: font.weight.bold,
    color: color.textStrong,
    letterSpacing: font.tracking.heading,
  },
  subtitle: {
    fontSize: font.size.sm,
    color: color.inkGlassMuted,
    fontFamily: font.family.bodyMedium,
    lineHeight: 18,
  },
  scroll: { marginTop: spacing.tight, flexGrow: 1, flexShrink: 1 },
  scrollContent: { paddingBottom: spacing.sm, gap: spacing.sm + 2 },
  sectionLabel: {
    fontSize: font.size.caption,
    color: color.inkGlassMuted,
    textTransform: 'uppercase',
    letterSpacing: font.tracking.section,
    marginTop: spacing.tight,
    marginBottom: 2,
    fontWeight: font.weight.bold,
  },
  sectionLabelSpaced: { marginTop: spacing.lg - 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    backgroundColor: color.surfaceNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Status legend swatches — miniature pin representations (decorative; the
  // meaning is carried by the row text). The double ring = anonymous provenance;
  // the checkmark = resolved. Both keep the severity fill (S1 / L8-7).
  statusSwatch: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: radius.circle,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hairlineRing: {
    borderRadius: radius.circle,
    borderWidth: 1.5,
    borderColor: '#0F1B2D',
  },
  anonRingOuter: {
    borderRadius: radius.circle,
    borderWidth: 1.5,
    borderColor: '#0F1B2D',
    padding: 2,
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontSize: font.size.base,
    fontWeight: font.weight.semibold,
    color: color.textStrong,
  },
  rowDesc: {
    fontSize: font.size.xs,
    color: color.text,
    // On-glass body carries the ≥500 weight (GLASS §2); color.text clears AA on
    // the bulk floor over the worst-case map backdrop (arbiter-declared).
    fontFamily: font.family.bodyMedium,
    marginTop: 1,
    lineHeight: 16,
  },
  footnote: {
    fontSize: font.size.xs,
    color: color.inkGlassMuted,
    fontFamily: font.family.bodyMedium,
    marginTop: spacing.lg - 2,
    fontStyle: 'italic',
    lineHeight: 17,
  },
});
