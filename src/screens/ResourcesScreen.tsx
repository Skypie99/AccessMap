/**
 * ResourcesScreen — modal overlay.
 *
 * A curated, evergreen list of accessibility resources that complement the map:
 * where to report barriers, who pushes for fixes, and how to plan around them.
 *
 * Content is intentionally URL-light: each entry is genuinely useful as guidance
 * on its own, and any entry becomes a tappable external link the moment a `url`
 * is supplied (TODO(Sky): drop in the specific links you want to point at — the
 * cards render as plain info cards until then, so nothing ever shows a dead link).
 */
import React from 'react';
import {
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  BookOpen,
  Building2,
  ExternalLink,
  Heart,
  Map as MapIcon,
  Navigation,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { useReducedMotion } from '@/lib/accessibility';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface Resource {
  icon: LucideIcon;
  title: string;
  blurb: string;
  /** Optional external link. Add one to make the card tappable. */
  url?: string;
}

// Evergreen, non-controversial categories that complement crowdsourced flagging.
// Add a `url` to any entry to turn its card into a tappable link.
const RESOURCES: Resource[] = [
  {
    icon: Building2,
    title: 'Report it to your city',
    blurb:
      'Most municipalities take sidewalk, curb-ramp, and crossing-signal requests directly — often through a 311 service or a public-works web form.',
  },
  {
    icon: Users,
    title: 'Local advocacy groups',
    blurb:
      'Disability advocacy organizations know your area’s process and help push reported barriers toward real fixes.',
  },
  {
    icon: MapIcon,
    title: 'Accessibility maps',
    blurb:
      'Community apps that rate places by step-free access complement the barriers you flag here.',
  },
  {
    icon: Navigation,
    title: 'Step-free route planners',
    blurb:
      'Transit and mapping tools that plan routes avoiding stairs and steep grades for wheels, strollers, and tired legs.',
  },
  {
    icon: BookOpen,
    title: 'Know your rights',
    blurb:
      'National disability-rights resources explain accessibility laws and how to escalate a barrier that isn’t getting fixed.',
  },
  {
    icon: Heart,
    title: 'Support & community',
    blurb:
      'Peer communities share local, lived-experience knowledge about what’s accessible and what to route around.',
  },
];

export default function ResourcesScreen({ visible, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const reducedMotion = useReducedMotion();

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="heading" style={styles.title} accessibilityRole="header">Resources</AppText>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close resources"
          >
            <X size={24} color={color.textSubtle} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <AppText variant="body" style={styles.intro}>
            Flagging a barrier is the first step. These resources help get it fixed —
            and help you plan around it in the meantime.
          </AppText>

          {RESOURCES.map((r) => {
            const Icon = r.icon;
            const linked = !!r.url;
            const inner = (
              <>
                <View
                  style={styles.cardIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <Icon size={24} color={color.brand} strokeWidth={2} />
                </View>
                <View style={styles.cardText}>
                  <View style={styles.cardTitleRow}>
                    <AppText variant="label" style={styles.cardTitle}>{r.title}</AppText>
                    {linked && (
                      <ExternalLink size={16} color={color.textMuted} strokeWidth={2} />
                    )}
                  </View>
                  <AppText variant="body" style={styles.cardBlurb}>{r.blurb}</AppText>
                </View>
              </>
            );

            return linked ? (
              <Pressable
                key={r.title}
                onPress={() => { void Linking.openURL(r.url as string); }}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                accessibilityRole="link"
                accessibilityLabel={`${r.title}. ${r.blurb}`}
                accessibilityHint="Opens in your browser"
              >
                {inner}
              </Pressable>
            ) : (
              <View
                key={r.title}
                style={styles.card}
                accessible
                accessibilityLabel={`${r.title}. ${r.blurb}`}
              >
                {inner}
              </View>
            );
          })}

          <AppText variant="body" style={styles.footnote}>
            AccessMap is community-powered — these are starting points, not endorsements.
          </AppText>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: color.surfaceMuted,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.border,
      backgroundColor: color.surface,
    },
    title: {
      flex: 1,
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    closeBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    intro: {
      fontSize: font.size.base,
      color: color.textMuted,
      lineHeight: 22,
      marginBottom: spacing.xs,
    },
    card: {
      flexDirection: 'row',
      gap: spacing.md,
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: color.border,
      padding: spacing.lg,
      minHeight: 44,
      ...shadow.e1,
    },
    cardPressed: {
      opacity: 0.92,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: color.brandSofter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: {
      flex: 1,
      gap: spacing.tight,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    cardTitle: {
      flex: 1,
      fontSize: font.size.lg,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
    },
    cardBlurb: {
      fontSize: font.size.sm,
      color: color.textMuted,
      lineHeight: 20,
    },
    footnote: {
      fontSize: font.size.xs,
      color: color.textMuted,
      textAlign: 'center',
      lineHeight: 17,
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
  });
