import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { initialExpanded } from '@/lib/changelogExpanded';
import { a11yToggle, decorativeProps } from '@/lib/accessibility';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { AppText, Sheet } from '@/components/ui';
import { ChevronDown, ChevronRight } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface ReleaseNote {
  // Human-readable date label shown in the modal — keep it short.
  date: string;
  // 1-line headline; longer detail goes in `items`.
  title: string;
  // Bullet list, one line each. Each one is a single shipped change.
  items: string[];
}

// Inline release notes — append new dated entries at the TOP (newest first)
// when a fresh batch ships. Keeping the list in code means no fetch / no
// CMS / no markdown parser to drag in for a 30-line feature.
const RELEASES: ReleaseNote[] = [
  {
    // S20 (L8-13): the changelog had gone three visual eras stale (one 2026-05-23
    // entry). This v3 entry is drafted from what shipped; SKY-EDITABLE — confirm
    // the bullet list and adjust the date to the actual public release.
    date: '2026-07-04',
    title: 'v3.0.0 — Deep Field, an editorial Home, and an accessibility pass',
    items: [
      'A new "Deep Field" look across Tasks, Profile, and the Map — layered glass surfaces with a calmer, more legible palette',
      'Reduce Transparency support: the glass flattens to solid, high-contrast surfaces when your device asks for it',
      'A redesigned, more editorial Home screen',
      'A refreshed onboarding walkthrough for a clearer first run',
      'Dark mode that follows your device, plus a manual toggle in Settings',
      'A map heatmap view and a cleaner, grouped map toolbar',
      'A consistent severity scale (number + word + color) everywhere severity is shown, contrast-checked against WCAG AA',
      'For screen-reader users, the full map opens an accessible list of nearby flags automatically',
    ],
  },
  {
    date: '2026-05-23',
    title: 'Visual polish, pages, and feedback flow',
    items: [
      'Branded header on every tab with a Feedback button always at the top',
      'Profile got a hero card with points + a progress bar to the next milestone',
      'Map top-row buttons are now one grouped action bar (cleaner than four floating circles)',
      'New "About AccessMap" page in Profile with version + maker note',
      'New "Help & FAQ" page in Profile — 7 collapsible answers to common questions',
      'New "My Feedback" page in Profile to see messages you\'ve sent',
      'Feedback supports categories (Bug / Idea / Love / Other) so it triages itself',
      'Empty-state card on the Map when filters hide every flag (with one-tap reset)',
      "Quick severity cycle button in the Map's top row",
      'Collapsible filter panel — saves a lot of vertical space',
      'Share a flag from its detail card — opens your share sheet',
      'Tap any accessmap:// link → app opens to that flag with the callout popped',
      'Set one of your saved filter sets as the default on launch',
    ],
  },
];

/**
 * What's New / Changelog modal — accessed from a Profile row. A user-
 * facing complement to LEARNINGS.md (which is dev-facing). Each release
 * is a dated section with a one-line headline + a bulleted list of
 * concrete user-visible changes. Sections are collapsible: the newest
 * release opens by default, the rest start collapsed. State is reset on
 * each modal open (no persistence — keeps the storage surface tiny).
 *
 * Adding a new release: prepend a new object to RELEASES. Newest at the
 * top is the convention — the modal renders them in array order.
 */
export default function ChangelogModal({ visible, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // Local UI state — not persisted. Each time the modal opens we reset so
  // the newest release is expanded and the rest collapsed. That keeps the
  // modal scannable on every open without a storage layer.
  const initial = useMemo(() => initialExpanded(RELEASES), []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initial);

  useEffect(() => {
    if (visible) setExpanded(initialExpanded(RELEASES));
  }, [visible]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="What's New"
      glass
      testID="changelogModal-backdrop"
    >
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
            {RELEASES.map((release, i) => {
              const key = `${release.date}-${i}`;
              const isOpen = expanded[key] ?? false;
              const itemCount = release.items.length;
              return (
                <View key={key} style={styles.releaseCard}>
                  <Pressable
                    onPress={() => setExpanded((prev) => ({ ...prev, [key]: !isOpen }))}
                    style={styles.releaseHeader}
                    accessibilityRole="button"
                    {...a11yToggle({ expanded: isOpen })}
                    accessibilityLabel={`${release.title}, ${itemCount} item${
                      itemCount === 1 ? '' : 's'
                    }`}
                    accessibilityHint={isOpen ? 'Tap to collapse' : 'Tap to expand'}
                  >
                    <View style={styles.releaseHeaderText}>
                      <AppText variant="label" style={styles.dateBadge}>{release.date}</AppText>
                      <AppText variant="label" style={styles.releaseTitle}>{release.title}</AppText>
                    </View>
                    <AppText
                      variant="label"
                      style={styles.chevron} {...decorativeProps}
                    >
                      {isOpen ? (
                        <ChevronDown size={16} color={color.brand} strokeWidth={2.2} />
                      ) : (
                        <ChevronRight size={16} color={color.brand} strokeWidth={2.2} />
                      )}
                    </AppText>
                  </Pressable>
                  {isOpen &&
                    release.items.map((item, j) => (
                      <View key={j} style={styles.bulletRow}>
                        <AppText variant="body" style={styles.bulletGlyph} accessibilityElementsHidden>
                          •
                        </AppText>
                        <AppText variant="body" style={styles.bulletText}>{item}</AppText>
                      </View>
                    ))}
                </View>
              );
            })}
      </ScrollView>
    </Sheet>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    body: { flexShrink: 1 },
    bodyContent: {
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.lg,
    },
    releaseCard: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.xs,
      ...shadow.e1,
    },
    releaseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 44,
    },
    releaseHeaderText: {
      flex: 1,
      gap: spacing.xs,
    },
    dateBadge: {
      alignSelf: 'flex-start',
      backgroundColor: color.brandSoft,
      color: color.brandOnSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.tight,
      borderRadius: radius.full,
      fontSize: font.size.xs,
      fontWeight: font.weight.bold,
      letterSpacing: 0.3,
      overflow: 'hidden',
    },
    releaseTitle: {
      fontSize: font.size.md,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    chevron: {
      fontSize: font.size.sm,
      color: color.brand,
      fontWeight: font.weight.bold,
    },
    bulletRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'flex-start',
    },
    bulletGlyph: {
      fontSize: font.size.md,
      color: color.brand,
      lineHeight: 20,
      width: 12,
    },
    bulletText: {
      flex: 1,
      fontSize: font.size.sm,
      color: color.text,
      lineHeight: 20,
    },
  });
