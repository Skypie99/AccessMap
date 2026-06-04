/**
 * HowToHelpScreen — modal overlay.
 *
 * A step-by-step guide to contributing to AccessMap:
 * report flags, verify flags, and spread the word.
 */
import React from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { CheckCircle2, Flag, Heart, Star, Users, X } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Flag,
    number: '1',
    title: 'Report a problem',
    body: "Tap + Report on the map wherever you see a broken sidewalk, missing ramp, blocked path, missing signal, or steep grade. Add a photo and severity — a few seconds from you could save someone a real headache.",
  },
  {
    icon: CheckCircle2,
    number: '2',
    title: 'Verify flags near you',
    body: "Head to the Tasks tab to see open reports from the community. Confirm the issue is still there — or mark it resolved if it's been fixed. Verifying earns you points and keeps the map accurate.",
  },
  {
    icon: Users,
    number: '3',
    title: 'Spread the word',
    body: 'Share AccessMap with neighbours, local disability organisations, city councillors, and anyone who wants a more navigable community. The map only works if the community keeps it current.',
  },
  {
    icon: Star,
    number: '4',
    title: 'Earn points',
    body: "Every report and verification earns points on your profile. It's a small token — but it reflects real value your contributions add to the community.",
  },
];

// Accent colors for each step icon — derived from theme tokens so they
// respond to dark mode. Semantics: report=error, verify=success, spread=brand, earn=amber.
function useStepColors() {
  const color = useColor();
  return [color.errorStrong, color.success, color.brand, color.accentOrange];
}

export default function HowToHelpScreen({ visible, onClose }: Props) {
  const color = useColor();
  const stepColors = useStepColors();
  const styles = makeStyles(color);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="heading" style={styles.title} accessibilityRole="header">How To Help</AppText>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close how to help"
          >
            <X size={24} color={color.textSubtle} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="body" style={styles.intro}>
            AccessMap is built by people like you, one flag at a time. Here's how
            to make the biggest impact.
          </AppText>

          {STEPS.map((step, i) => (
            <View
              key={step.number}
              style={styles.stepCard}
              accessible
              accessibilityLabel={`Step ${step.number}: ${step.title}. ${step.body}`}
            >
              <View
                style={[styles.stepIcon, { backgroundColor: stepColors[i] + '18' }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <step.icon size={28} color={stepColors[i]} strokeWidth={2} />
              </View>
              <View style={styles.stepText}>
                <AppText variant="label" style={styles.stepTitle}>{step.title}</AppText>
                <AppText variant="body" style={styles.stepBody}>{step.body}</AppText>
              </View>
            </View>
          ))}

          <View
            style={styles.callout}
            accessible
            accessibilityLabel="Every contribution — big or small — makes the world more accessible for people with mobility disabilities. Thank you."
          >
            <Heart
              size={18}
              color={color.brand}
              strokeWidth={2}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <AppText variant="body" style={styles.calloutText}>
              Every contribution — big or small — makes the world more accessible
              for people with mobility disabilities. Thank you.
            </AppText>
          </View>
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
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      gap: spacing.md,
    },
    intro: {
      fontSize: font.size.base,
      color: color.textMuted,
      lineHeight: 22,
      marginBottom: spacing.sm,
    },
    stepCard: {
      flexDirection: 'row',
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    stepIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    stepText: {
      flex: 1,
      gap: spacing.xs,
    },
    stepTitle: {
      fontSize: font.size.md,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    stepBody: {
      fontSize: font.size.sm,
      color: color.textMuted,
      lineHeight: 20,
    },
    callout: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: color.brandSofter,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    calloutText: {
      flex: 1,
      fontSize: font.size.sm,
      color: color.brandText,
      lineHeight: 20,
    },
  });
