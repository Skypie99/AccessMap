/**
 * PhotoLightboxModal — full-screen view of a single flag photo. Tap
 * anywhere on the dim backdrop to dismiss, or use the labeled close
 * button at the top-right.
 *
 * Pure presentation: parent owns the {visible, photoUrl, caption} state.
 * Designed to be reused from any thumbnail (FlagDetailModal,
 * MyReportsModal, ActivityFeedModal, NearbyFlagsModal).
 *
 * v1 keeps it tap-to-dismiss with `resizeMode="contain"`. Pinch-zoom
 * + pan would need react-native-gesture-handler (already installed)
 * but is deferred to a polish loop to keep the surface tight.
 */
import React from 'react';
import { Modal, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AppText } from '@/components/ui/AppText';
import { decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  photoUrl: string | null;
  /** Optional caption — e.g., the flag's category label + status. */
  caption?: string;
  onClose: () => void;
}

export default function PhotoLightboxModal({ visible, photoUrl, caption, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): land the SR cursor on the labeled close button on open
  // (RemoteImage takes no ref; the photo stays one swipe away, first in order).
  const closeRef = useFocusOnOpen<View>(visible);
  // Defensive: still render the modal frame if photoUrl is null so the
  // close button is reachable, but show a friendly fallback.
  return (
    <Modal
      aria-label="Photo viewer"
      visible={visible}
      animationType={reducedMotion ? 'none' : 'fade'}
      transparent
      onRequestClose={onClose}
      // statusBarTranslucent on Android lets the backdrop cover the
      // status bar so the dim effect feels full-screen.
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor={color.backdropStrong} />
      <View style={styles.backdrop} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        {/* Tap-anywhere-to-dismiss pressable layer. Hidden from the a11y
            tree so screen-reader users land on the photo first (the actual
            content) instead of a generic "Dismiss photo" hit-target. The
            labeled close button below is their dismiss path. QA Pass-2 #1. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          // A11Y-234: the two native props below are NO-OPS on
          // react-native-web, so this tap-anywhere layer leaked into the web
          // tree as an UNLABELED interactive element. decorativeProps is barred
          // on Pressables by its own docblock, so aria-hidden is added directly.
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />

        {photoUrl ? (
          <RemoteImage
            uri={photoUrl}
            style={styles.image}
            resizeMode="contain"
            accessible={true}
            accessibilityLabel={caption ?? 'Flag photo'}
          />
        ) : (
          <View style={styles.empty}>
            <AppText variant="body" style={styles.emptyText}>No photo to show.</AppText>
          </View>
        )}

        {caption ? (
          // pointerEvents=none so it doesn't intercept the backdrop tap.
          // Hidden from a11y because the Image above already announces
          // the same caption via accessibilityLabel — a screen reader
          // would otherwise read it twice. The visual caption is for
          // sighted users who don't get the SR label. QA Pass-2 #6.
          <View
            style={styles.captionBar}
            pointerEvents="none" {...decorativeProps}
          >
            <AppText variant="label" style={styles.captionText} numberOfLines={3}>
              {caption}
            </AppText>
          </View>
        ) : null}

        <Pressable
          ref={closeRef}
          onPress={onClose}
          hitSlop={spacing.lg}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
        >
          <X
            size={18}
            color={color.textOnBrand}
            strokeWidth={2.2} {...decorativeProps}
          />
        </Pressable>
      </View>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.backdropStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  // textOnBrand (#fff, mode-independent) over the dark backdrop — color.surface
  // rendered ~1.3:1 (near-invisible) in dark mode. Same fix for the caption + X.
  emptyText: { color: color.textOnBrand, fontSize: font.size.lg },
  captionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    // 34 clears the iOS home-indicator band (spacing.xxxl = 32 was 2pt shy).
    paddingBottom: 34,
    backgroundColor: color.backdropCaption,
  },
  captionText: { color: color.textOnBrand, fontSize: font.size.base, fontWeight: '600' },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: radius.circle,
    backgroundColor: color.overlayBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: { backgroundColor: color.overlayBtnPressed },
  closeBtnText: { fontSize: font.size.xl, color: color.surface, fontWeight: '700' },
});
