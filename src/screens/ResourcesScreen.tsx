/**
 * ResourcesScreen — modal overlay.
 *
 * Placeholder for a curated list of accessibility resources, tools, and
 * organisations. Will be populated in a future feature cycle.
 */
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ResourcesScreen({ visible, onClose }: Props) {
  const color = useColor();
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
          <Text style={styles.title}>Resources</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close resources"
          >
            <Ionicons name="close" size={24} color={color.textSubtle} />
          </Pressable>
        </View>

        {/* Empty state */}
        <View style={styles.body}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="layers-outline" size={40} color={color.brand} />
            </View>
            <Text style={styles.emptyTitle}>Coming soon</Text>
            <Text style={styles.emptyBody}>
              We're curating a list of accessibility resources — organisations,
              tools, and guides that help make communities more navigable for
              everyone.
            </Text>
            <Text style={styles.emptyBody}>
              Check back in a future update.
            </Text>
          </View>
        </View>
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
      padding: spacing.xs,
    },
    body: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyCard: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.xxl,
      alignItems: 'center',
      gap: spacing.md,
      maxWidth: 340,
      width: '100%',
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: radius.full,
      backgroundColor: color.brandSofter,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    emptyTitle: {
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      textAlign: 'center',
    },
    emptyBody: {
      fontSize: font.size.base,
      color: color.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
