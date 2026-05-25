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
import {
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  photoUrl: string | null;
  /** Optional caption — e.g., the flag's category label + status. */
  caption?: string;
  onClose: () => void;
}

export default function PhotoLightboxModal({
  visible,
  photoUrl,
  caption,
  onClose,
}: Props) {
  // Defensive: still render the modal frame if photoUrl is null so the
  // close button is reachable, but show a friendly fallback.
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      // statusBarTranslucent on Android lets the backdrop cover the
      // status bar so the dim effect feels full-screen.
      statusBarTranslucent
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="rgba(0,0,0,0.95)"
      />
      <View style={styles.backdrop} accessibilityViewIsModal>
        {/* Tap-anywhere-to-dismiss pressable layer. Hidden from the a11y
            tree so screen-reader users land on the photo first (the actual
            content) instead of a generic "Dismiss photo" hit-target. The
            labeled close button below is their dismiss path. QA Pass-2 #1. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />

        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.image}
            resizeMode="contain"
            accessible={true}
            accessibilityLabel={caption ?? 'Flag photo'}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No photo to show.</Text>
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
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.captionText} numberOfLines={2}>
              {caption}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={onClose}
          hitSlop={16}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && styles.closeBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
        >
          <Text
            style={styles.closeBtnText}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            ✕
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
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
    padding: 32,
  },
  emptyText: { color: '#fff', fontSize: 16 },
  captionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  captionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: { backgroundColor: 'rgba(255,255,255,0.3)' },
  closeBtnText: { fontSize: 18, color: '#fff', fontWeight: '700' },
});
