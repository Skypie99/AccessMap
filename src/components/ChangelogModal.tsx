import React, { useEffect, useMemo, useState , useRef} from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { initialExpanded } from '@/lib/changelogExpanded';
import { a11yToggle, decorativeProps } from '@/lib/accessibility';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { AppText, Sheet } from '@/components/ui';
import { useAtTop } from '@/components/ui/SheetPull';
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
    // v4.1.1 — written from what actually shipped in the Flagstone
    // art-direction series (build phases 00-07) and the sim-walk waves.
    // WORDING DELEGATED BY SKY 2026-08-23 ("make it whatever you think").
    // Recorded as delegated, not as ratified — she chose not to write these
    // herself, which is a different thing from having approved each line.
    // Every bullet describes something that really shipped; anything that
    // could not be stated plainly was left out rather than softened.
    // `date` is the entry's public release date — move it if the App Store
    // release slips. The version string itself comes from app.json.
    date: '2026-08-23',
    title: 'v4.1.1 — One flag, read the same way everywhere',
    items: [
      'One consistent flag card across Home, Nearby and Tasks, so a barrier reads the same wherever you meet it',
      'A rebuilt barrier detail sheet: severity, what it means, and the description come first, with one clear main action instead of a wall of buttons',
      'Large text sizes are properly supported throughout — headings stay above body text, descriptions stop clipping, and the report form shows severity as a readable list instead of five small circles',
      'Sheets across the app now behave the same way, and can be pulled down to dismiss',
      'A clearer report form, with the submit button staying disabled until you have picked a severity',
      'Better VoiceOver support: screens announce when they have finished loading, and actions announce their outcome',
      'Reduce Motion and Reduce Transparency are respected across the app — sheets go solid and still look like the same app',
      'A refreshed onboarding walkthrough that matches the rest of the app',
      'Clearer empty states that tell you what to do next instead of just saying there is nothing here',
      'Sheets that used to ghost with whatever was behind them are now legible in both light and dark mode',
    ],
  },
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
      'New "About Flagstone" page in Profile with version + maker note',
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
  // The pull gesture must not fight the body's own scroll: `useAtTop`
  // disables it whenever the content is scrolled away from its top, so a
  // downward drag scrolls back up instead of dismissing (SheetPull's `atTop`).
  const { atTop, onScroll, scrollEventThrottle } = useAtTop();
  const scrollRef = useRef(null);
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
      atTop={atTop}
      scrollRef={scrollRef}
      testID="changelogModal-backdrop"
    >
      <ScrollView
        style={styles.body}
              ref={scrollRef}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
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
                    // B2 — the date is rendered in a badge beside the title,
                    // and the badge is inside this Pressable, so a screen
                    // reader that collapses the row never speaks it. Every row
                    // therefore sounded like "What's fixed, 4 items" with no
                    // way to tell one release from the next. The visible row
                    // and the spoken row now carry the same three facts.
                    accessibilityLabel={`${release.title}, ${release.date}, ${itemCount} item${
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
                        <AppText variant="body" style={styles.bulletGlyph} {...decorativeProps}>
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
