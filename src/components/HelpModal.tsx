import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, type Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { bulkGlassShadow, font, radius, shadow, spacing } from '@/theme';
import { a11yToggle, decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { ChevronDown, ChevronRight, X } from 'lucide-react-native';
import { openFeedbackComposer } from '@/lib/feedback';
import { filterFaqs } from '@/lib/helpSearch';
import { POINTS } from '@/lib/points';
import SearchInputRow from '@/components/SearchInputRow';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface FaqItem {
  q: string;
  // Plain string for now — if we ever want links / bold / lists, switch
  // to a structured shape (paragraphs + inline links). Keep simple
  // for the fast loop.
  a: string;
}

// Seed FAQ list. New questions go here, not in markdown anywhere else —
// keeping them inline means the modal renders without a network or file
// fetch, and the answers can use app-specific terminology that wouldn't
// translate to generic docs.
const FAQS: FaqItem[] = [
  {
    q: 'How do I report a place that needs attention?',
    a: 'From the Home screen, tap the "Report" button — or open the full map and press and hold (long-press) the spot. Pick a category (broken sidewalk, missing ramp, blocked path, etc.), set how severe it is from 1 to 5, and add a short description. Signed-in users can also attach a photo.',
  },
  {
    q: 'How do points work?',
    a: `You earn ${POINTS.reporter.verify} points when one of your reports gets verified by someone else, and another ${POINTS.reporter.resolve} when it's marked resolved. You also earn ${POINTS.actor.verify} points for verifying someone else's report and ${POINTS.actor.resolve} points for marking one resolved. Rejecting a report awards no points.`,
  },
  {
    q: 'What\'s the difference between "verified" and "resolved"?',
    a: 'Verified means another person checked the spot and confirmed the issue is real. Resolved means the issue has been fixed (the ramp was added, the path was cleared, etc.). Resolved flags stay on the map, keep their severity color, and are marked with a checkmark.',
  },
  {
    q: 'Are my photos and location private?',
    a: "Photos and the flag location are public — they're visible to everyone using the app, which is the whole point of a community map. Your email is never attached to a flag's public view. Your display name can be \u2014 it appears on the leaderboard and alongside comments, and other signed-in people can tell which reports are yours. Avoid including faces or identifying info in your photos.",
  },
  {
    q: 'I use a screen reader — what should I know?',
    a: "The full map automatically opens an accessible list of nearby flags when it detects a screen reader, so you can browse without the visual map. Every button is labeled, status changes are announced, and color is always paired with text. If something doesn't announce or focus correctly, please send feedback.",
  },
  {
    q: 'How do I delete one of my reports?',
    a: 'Profile → My Reports → tap the report → "Delete" at the bottom of the detail card. This removes the flag permanently and can\'t be undone.',
  },
  {
    q: "Why can't I see flags I expected to see?",
    a: 'You probably have a filter active. Open the full map and tap the filters icon (the sliders) at the top → check Categories, Minimum severity, and Status. The "Clear" link in the filter panel header resets everything. (The magnifying glass searches for an address — it doesn\'t filter.)',
  },
];

/**
 * Help & FAQ — a collapsible list of common questions. Designed to grow:
 * add entries to the FAQS array. Each item is independently expandable,
 * with the open/closed state tracked locally (resets when the modal
 * closes — fine for a small list).
 *
 * Accessed from a "Help & FAQ" row in Profile, sibling to About.
 */
export default function HelpModal({ visible, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  // Tracks which FAQ is expanded by question text (not index) — using
  // text means the "expanded" state survives filtering. If we keyed on
  // array index instead, filtering the list down would shift items and
  // a previously-open answer would either close or, worse, leak to the
  // wrong question.
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Reset both search query and expanded-state whenever the modal closes
  // so it always reopens to a clean view. Cheap to run; only fires on
  // visibility changes, not every keystroke.
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setOpenQuestion(null);
    }
  }, [visible]);

  // Memoize the filtered FAQ list so we don't re-walk FAQS on unrelated
  // re-renders (e.g. when only openQuestion changes).
  const filteredFaqs = useMemo(() => filterFaqs(FAQS, query), [query]);
  const showEmpty = query.trim().length > 0 && filteredFaqs.length === 0;
  // WCAG 2.3.3: snap (no slide) when the user prefers reduced motion.
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);

  return (
    <Modal
      aria-label="Help & FAQ"
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      transparent
      onRequestClose={onClose}
    >
      {/* accessibilityViewIsModal tells iOS VoiceOver that everything
          behind this view is inert while the modal is up — focus can't
          wander out of the modal and read the underlying screen. Alex P5.
          (We intentionally don't set importantForAccessibility on the
          backdrop itself — "no-hide-descendants" would hide the modal's
          own contents from TalkBack. Android relies on RN Modal's own
          focus trap and the elevation/z-index of the backdrop.) */}
      <View style={styles.backdrop} accessibilityViewIsModal onAccessibilityEscape={onClose} testID="helpModal-backdrop">
        <View style={styles.cardWrap}>
        <GlassSurface variant="bulk" borderRadius={0} style={styles.card}>
          <View style={styles.headerRow}>
            <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
              Help & FAQ
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close help"
            >
              <X size={18} color={color.text} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Search row — sits between the header and the scrollable FAQ
              list. Extracted to SearchInputRow for reuse across modals. */}
          <SearchInputRow
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Search…"
            accessibilityLabel="Search FAQ"
            wrapStyle={{ marginHorizontal: 20 }}
          />

          <ScrollView
            style={styles.body}
            contentContainerStyle={[styles.bodyContent, { paddingBottom: Math.max(spacing.lg, insets.bottom) }]}
            showsVerticalScrollIndicator={false}
          >
            {showEmpty && (
              <AppText variant="body" style={styles.emptyResults} accessibilityLiveRegion="polite">
                No FAQ matches that search. Try a different term.
              </AppText>
            )}

            {filteredFaqs.map((item) => {
              const expanded = openQuestion === item.q;
              return (
                <View key={item.q} style={styles.faqCard}>
                  <Pressable
                    onPress={() => setOpenQuestion(expanded ? null : item.q)}
                    style={styles.faqHeader}
                    accessibilityRole="button"
                    accessibilityLabel={item.q}
                    {...a11yToggle({ expanded })}
                    accessibilityHint={
                      expanded ? 'Tap to collapse the answer' : 'Tap to expand the answer'
                    }
                  >
                    <AppText variant="label" style={styles.faqQuestion}>{item.q}</AppText>
                    <AppText variant="label" style={styles.faqChevron} {...decorativeProps}>
                      {expanded ? (
                        <ChevronDown size={16} color={color.brand} strokeWidth={2.2} />
                      ) : (
                        <ChevronRight size={16} color={color.brand} strokeWidth={2.2} />
                      )}
                    </AppText>
                  </Pressable>
                  {expanded && <AppText variant="body" style={styles.faqAnswer}>{item.a}</AppText>}
                </View>
              );
            })}

            <View style={styles.afterCard}>
              <AppText variant="label" style={styles.afterTitle}>Didn&apos;t find what you needed?</AppText>
              <AppText variant="body" style={styles.afterBody}>
                Send a message and we&apos;ll try to help. The Feedback button at the top of any screen
                prefills the form; this button goes straight to your mail app.
              </AppText>
              <Pressable
                onPress={() => openFeedbackComposer()}
                style={({ pressed }) => [styles.feedbackBtn, pressed && styles.feedbackBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Email us"
                accessibilityHint="Opens your email app with the maintainer's address"
              >
                <AppText variant="label" style={styles.feedbackBtnText}>Email us</AppText>
              </Pressable>
            </View>
          </ScrollView>
        </GlassSurface>
        </View>
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
    card: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      maxHeight: '90%',
      // G6/SR-099: shrink into the wrapper's cap. Without this the card sizes
      // to content and pushes its own header off-screen (see cardWrap).
      flexShrink: 1,
      // The bulk variant owns the surface; overflow:hidden clips it to the
      // rounded top (the up-shadow moves to cardWrap — GlassSurface contract).
      overflow: 'hidden',
    },
    // Bulk-glass up-shadow on the outer wrapper (an overflow:hidden view clips
    // its own shadow). Mode tint identical to FeedbackModal/AboutScreen.
    cardWrap: {
      // G6/SR-099 — THE CAP LIVES HERE, not on the card. A percentage
      // maxHeight resolves against the parent's *definite* height; this
      // wrapper is content-sized, so the card's own `maxHeight:'90%'` never
      // resolved and the card grew unbounded. With `justifyContent:'flex-end'`
      // on the backdrop that pins the bottom and lifts the 44pt close X clean
      // off the top of the viewport (measured: Help y=-53, About y=-65) — and
      // since the backdrop is a plain View with no scrim-tap, touch web was
      // left with NO pointer path to dismiss at all. The backdrop is `flex:1`,
      // so the cap resolves correctly here.
      maxHeight: '90%',
      flexShrink: 1,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      ...bulkGlassShadow(color),
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: font.size.lg,
      color: color.text,
      fontWeight: font.weight.bold,
    },
    body: { flexShrink: 1 },
    bodyContent: {
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.lg,
    },

    emptyResults: {
      // On the bulk-glass sheet the worst-case backdrop is ~#D9D9D9, not white,
      // so textMuted (#666) no longer clears AA — use the arbitrated on-glass
      // muted ink + the ≥500 on-glass body weight (GLASS §2). Italic + padding
      // still differentiate this helper from a real FAQ card.
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      fontSize: font.size.sm,
      fontStyle: 'italic',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      lineHeight: 20,
    },
    faqCard: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      ...shadow.e1,
    },
    faqHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
    },
    faqQuestion: {
      flex: 1,
      fontSize: font.size.base,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      lineHeight: 20,
    },
    faqChevron: {
      fontSize: font.size.sm,
      color: color.brand,
      fontWeight: font.weight.bold,
    },
    faqAnswer: {
      marginTop: spacing.sm,
      fontSize: font.size.sm,
      color: color.text,
      lineHeight: 20,
    },
    afterCard: {
      marginTop: spacing.md,
      padding: spacing.lg,
      backgroundColor: color.brandSoft,
      borderRadius: radius.lg,
      gap: spacing.sm,
    },
    afterTitle: {
      fontSize: font.size.md,
      fontWeight: font.weight.bold,
      color: color.brandOnSoft,
    },
    afterBody: {
      fontSize: font.size.sm,
      color: color.brandOnSoft,
      lineHeight: 19,
    },
    feedbackBtn: {
      marginTop: spacing.xs,
      alignSelf: 'flex-start',
      backgroundColor: color.brand,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      minHeight: 44,
      justifyContent: 'center',
    },
    feedbackBtnPressed: { opacity: 0.85 },
    feedbackBtnText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.sm,
    },
  });
