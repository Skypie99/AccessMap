import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { color, font, radius, shadow, spacing } from '@/theme';
import { openFeedbackComposer } from '@/lib/feedback';

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
    a:
      'Open the Map tab, position yourself near the spot (or tap and drag the map to it), then tap the "＋ Report" button at the bottom right. Pick a category (broken sidewalk, missing ramp, blocked path, etc.), set how severe it is from 1 to 5, add a short description, and optionally snap a photo.',
  },
  {
    q: 'How do points work?',
    a:
      'You earn 5 points when one of your reports gets verified by someone else, and another 10 when it\'s marked resolved. You also earn 2 points for verifying someone else\'s report and 5 points for marking one resolved. Rejecting a report awards no points.',
  },
  {
    q: 'What\'s the difference between "verified" and "resolved"?',
    a:
      'Verified means another person checked the spot and confirmed the issue is real. Resolved means the issue has been fixed (the ramp was added, the path was cleared, etc.). Resolved reports stay on the map but appear in a different color.',
  },
  {
    q: 'Are my photos and location private?',
    a:
      'Photos and the flag location are public — they\'re visible to everyone using the app, which is the whole point of a community map. Your email and display name are never attached to a flag\'s public view. Avoid including faces or identifying info in your photos.',
  },
  {
    q: 'I use a screen reader — what should I know?',
    a:
      'The Map tab automatically opens an accessible list of nearby flags when it detects a screen reader, so you can browse without the visual map. Every button is labeled, status changes are announced, and color is always paired with text. If something doesn\'t announce or focus correctly, please send feedback.',
  },
  {
    q: 'How do I delete one of my reports?',
    a:
      'Profile → My Reports → tap the report → "Delete" at the bottom of the detail card. This removes the flag permanently and can\'t be undone.',
  },
  {
    q: 'Why can\'t I see flags I expected to see?',
    a:
      'You probably have a filter active. Map → tap the magnifying glass icon at the top → check Categories, Minimum severity, and Status. The "Clear" link in the filter panel header resets everything.',
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
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              Help & FAQ
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close help"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {FAQS.map((item, i) => {
              const expanded = openIndex === i;
              return (
                <View key={i} style={styles.faqCard}>
                  <Pressable
                    onPress={() => setOpenIndex(expanded ? null : i)}
                    style={styles.faqHeader}
                    accessibilityRole="button"
                    accessibilityLabel={item.q}
                    accessibilityState={{ expanded }}
                    accessibilityHint={
                      expanded
                        ? 'Tap to collapse the answer'
                        : 'Tap to expand the answer'
                    }
                  >
                    <Text style={styles.faqQuestion}>{item.q}</Text>
                    <Text
                      style={styles.faqChevron}
                      accessibilityElementsHidden
                    >
                      {expanded ? '▾' : '▸'}
                    </Text>
                  </Pressable>
                  {expanded && (
                    <Text style={styles.faqAnswer}>{item.a}</Text>
                  )}
                </View>
              );
            })}

            <View style={styles.afterCard}>
              <Text style={styles.afterTitle}>
                Didn't find what you needed?
              </Text>
              <Text style={styles.afterBody}>
                Send a message and we'll try to help. The Feedback button at
                the top of any screen prefills the form; this button goes
                straight to your mail app.
              </Text>
              <Pressable
                onPress={() => openFeedbackComposer()}
                style={({ pressed }) => [
                  styles.feedbackBtn,
                  pressed && styles.feedbackBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Email the maintainer"
                accessibilityHint="Opens your email app with the maintainer's address"
              >
                <Text style={styles.feedbackBtnText}>Email us</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.scrim,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: color.surfaceMuted,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    maxHeight: '90%',
    ...shadow.e3,
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
    width: 32,
    height: 32,
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
    minHeight: 32,
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
    minHeight: 36,
    justifyContent: 'center',
  },
  feedbackBtnPressed: { opacity: 0.85 },
  feedbackBtnText: {
    color: color.textOnBrand,
    fontWeight: font.weight.bold,
    fontSize: font.size.sm,
  },
});
