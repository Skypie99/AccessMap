/**
 * UpdateBanner — shows when one or more of the user's tracked flags
 * (own reports + watched) have changed status since their last visit.
 *
 * Pure presentation: the parent computes the count, decides when to
 * render the banner, and handles the dismiss / view actions. The banner
 * is dismissible (✕) and tappable (View). Both actions tell the parent
 * to mark all tracked flags as "seen" so the banner doesn't re-appear
 * for the same changes.
 *
 * Accessibility: a POLITE live region (Android) paired with an explicit
 * announce (iOS), so the count is spoken when the banner first appears
 * without interrupting other speech.
 *
 * ⚠ Deliberately NOT `accessibilityRole="alert"`, and this docblock used to
 * say it was. An alert is semantically ASSERTIVE; pairing it with a polite
 * region asked the platform for two contradictory urgencies at once, and QA #8
 * dropped the role. The note at the call site recorded that; this one did not,
 * and a docblock is what a reader trusts first.
 */
import React from 'react';
import { AccessibilityInfo, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme';
import { Bell, X } from 'lucide-react-native';
import { decorativeProps } from '@/lib/accessibility';

interface Props {
  count: number;
  /** Tap on the main "View" pill — usually opens the Activity Feed. */
  onView: () => void;
  /** Tap the ✕ — hides the banner and marks all as seen. */
  onDismiss: () => void;
}

export default function UpdateBanner({ count, onView, onDismiss }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // Announce the count once when the banner mounts so screen-reader users
  // hear it even if they aren't focused on the top of the screen.
  React.useEffect(() => {
    if (count <= 0) return;
    const message =
      count === 1
        ? '1 of your flags has a status update since your last visit.'
        : `${count} of your flags have status updates since your last visit.`;
    // The announce call is best-effort — if TalkBack/VoiceOver isn't
    // running it's a no-op.
    AccessibilityInfo.announceForAccessibility(message);
  }, [count]);

  if (count <= 0) return null;

  const label =
    count === 1 ? '1 update since your last visit' : `${count} updates since your last visit`;

  return (
    <GlassSurface
      variant="banner"
      forceEngineered
      borderRadius={radius.md}
      style={styles.banner}
      // Use a polite live region on Android (announces non-intrusively)
      // and the explicit announceForAccessibility above on iOS. Dropped
      // accessibilityRole="alert" because alerts are semantically
      // assertive — combining with polite was contradictory (QA #8).
      accessibilityLiveRegion="polite"
    >
      {/* Decorative bell — the count is announced via the live region + the
          "View" label carries the semantics, so the glyph is SR-hidden. Lucide
          Bell (not an emoji) completes the app-wide house style; tinted with the
          banner's existing brandOnSoft ink — no new colour pair. */}
      <Bell
        size={18}
        color={color.brandOnSoft}
        strokeWidth={2.2} {...decorativeProps}
      />
      <AppText variant="label" style={styles.text}>{label}</AppText>
      <Pressable
        onPress={onView}
        style={({ pressed }) => [styles.viewBtn, pressed && styles.viewBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel={`View ${count} ${count === 1 ? 'update' : 'updates'}`}
        accessibilityHint="Opens the Activity Feed and marks these updates as seen"
      >
        <AppText variant="label" style={styles.viewBtnText}>View</AppText>
      </Pressable>
      <Pressable
        onPress={onDismiss}
        hitSlop={10}
        style={({ pressed }) => [styles.dismissBtn, pressed && styles.dismissBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Dismiss updates banner"
        accessibilityHint="Hides the banner and marks all updates as seen"
      >
        <X size={18} color={color.brandOnSoft} strokeWidth={2.2} />
      </Pressable>
    </GlassSurface>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    banner: {
      // GlassSurface variant="banner" (forceEngineered) supplies the fill,
      // brand edge, and specular — keep only layout + radius + margin here.
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      marginBottom: spacing.md,
    },
    // brandOnSoft (blue-200) reads AA on the banner's dark brand wash / blur.
    text: { flex: 1, fontSize: font.size.base, color: color.brandOnSoft, fontWeight: font.weight.semibold },
    viewBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      // ctaFill (mode-independent Wayfinder Blue) — color.brand was 3.42:1 in
      // dark, passing only by the large-text allowance; ctaFill is 5.24 both.
      backgroundColor: color.ctaFill,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewBtnPressed: { opacity: 0.85 },
    viewBtnText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.base },
    dismissBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dismissBtnPressed: { backgroundColor: color.brandSoft },
  });
