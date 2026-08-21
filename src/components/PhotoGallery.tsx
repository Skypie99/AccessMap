import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  FlatList,  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AppText } from '@/components/ui/AppText';
import { a11yToggle, decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { a11y, font, radius, shadow, spacing } from '@/theme';
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react-native';

// alt_text: uploader-written VoiceOver description (photo_alt feature,
// 2026-08-19). When present it replaces the positional "Photo N of M" label.
export type GalleryPhoto = { url: string; position: number; alt_text?: string | null };

type AddSentinel = { _type: 'add' };
type ListItem = GalleryPhoto | AddSentinel;

function isAdd(item: ListItem): item is AddSentinel {
  return '_type' in item;
}

const THUMB = 96;

interface Props {
  photos: GalleryPhoto[];
  onAddPhoto?: () => void;
  /** Maximum photos allowed; add button hidden once reached. Default 5. */
  maxPhotos?: number;
  /**
   * When provided, each thumbnail shows a ✕ remove button (pre-submission
   * use only — e.g. ReportFlagModal). Called with the photo's index. Omit
   * for read-only galleries like FlagDetailModal where photos are already
   * uploaded.
   */
  onRemovePhoto?: (index: number) => void;
}

function PhotoGalleryInner({ photos, onAddPhoto, maxPhotos = 5, onRemovePhoto }: Props) {
  const color = useColor();
  const styles = useMemo(() => makeStyles(color), [color]);
  const reducedMotion = useReducedMotion();
  // Non-throwing context read — render tests mount without a provider (the
  // M15 family recipe; see MyWatchedModal).
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  // Live window size — read inside the component (not once at module load) so
  // the lightbox paging width, contentOffset, and page math follow device
  // rotation instead of freezing at the launch orientation.
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const canAdd = !!onAddPhoto && photos.length < maxPhotos;

  // Lightbox state: startPage = which photo opened the lightbox (drives
  // ScrollView key + contentOffset). currentPage = live page as user swipes.
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartPage, setLightboxStartPage] = useState(0);
  const [lightboxPage, setLightboxPage] = useState(0);
  // A11Y-201 (2.4.3): move the SR cursor onto the photo the lightbox opened on
  // (the labeled page View — "land on the photo first" is this file's own
  // convention, QA Pass-2 #1).
  const lightboxPhotoRef = useFocusOnOpen<View>(lightboxOpen);
  const lightboxScrollRef = useRef<ScrollView | null>(null);

  // A11Y-221 (2.5.7): the single-pointer, non-drag paging path. The swipe
  // pager stays; these buttons are the guaranteed alternative. Announced per
  // page (the counter pill is decorative), RM-gated scroll animation. If the
  // animated scroll's momentum-end also fires, it sets the same page — a
  // no-op, so the two paths never fight.
  const goToLightboxPage = useCallback(
    (next: number, total: number) => {
      if (next < 0 || next > total - 1) return;
      setLightboxPage(next);
      lightboxScrollRef.current?.scrollTo({ x: next * screenWidth, animated: !reducedMotion });
      AccessibilityInfo.announceForAccessibility(`Photo ${next + 1} of ${total}`);
    },
    [screenWidth, reducedMotion],
  );

  const data: ListItem[] = useMemo(
    () => [...photos, ...(canAdd ? [{ _type: 'add' } as AddSentinel] : [])],
    [photos, canAdd],
  );

  const openLightbox = useCallback((photoIndex: number) => {
    setLightboxStartPage(photoIndex);
    setLightboxPage(photoIndex);
    setLightboxOpen(true);
  }, []);

  const renderItem = useCallback(({ item, index }: { item: ListItem; index: number }) => {
    if (isAdd(item)) {
      return (
        <Pressable
          onPress={onAddPhoto}
          style={({ pressed }) => [styles.thumb, styles.addThumb, pressed && styles.thumbPressed]}
          accessibilityRole="button"
          accessibilityLabel="Add photo"
          accessibilityHint={`${photos.length} of ${maxPhotos} photos added. Tap to add more.`}
        >
          <AppText variant="label" style={styles.addIcon} {...decorativeProps}>
            +
          </AppText>
          <AppText variant="label" style={styles.addLabel} {...decorativeProps}>
            Add photo
          </AppText>
        </Pressable>
      );
    }

    const total = photos.length;
    return (
      // SW-50: Remove is a SIBLING of the thumbnail, not a child of it. As a
      // child it sat inside the lightbox's own tap area, so a miss on the badge
      // opened the photo full-screen instead of removing it — and `thumb` sets
      // overflow:'hidden', which clips the badge's hitSlop on Android. This
      // wrapper does not clip, and the badge now owns a real 44pt corner.
      <View style={styles.thumbWrap}>
        <Pressable
          onPress={() => openLightbox(index)}
          style={({ pressed }) => [styles.thumb, pressed && styles.thumbPressed]}
          // A11Y-214 (S13 pattern): the thumb is NOT one accessible leaf — that
          // swallowed the "Remove photo" button on iOS. The image below carries
          // the imagebutton identity; activation falls through to this Pressable;
          // Remove stays an independent element.
          accessible={false}
        >
          <RemoteImage
            uri={item.url}
            style={styles.thumbImage}
            resizeMode="cover"
            accessible
            accessibilityRole="imagebutton"
            accessibilityLabel={
              item.alt_text
                ? `Photo ${index + 1} of ${total}: ${item.alt_text}`
                : `Photo ${index + 1} of ${total}`
            }
            accessibilityHint="Tap to view full screen"
          />
        </Pressable>
        {onRemovePhoto && (
          <Pressable
            onPress={() => onRemovePhoto(index)}
            style={styles.removeBtn}
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${index + 1}`}
            accessibilityHint="Removes this photo before you submit"
          >
            {({ pressed }) => (
              <View style={[styles.removeDisc, pressed && styles.removeDiscPressed]}>
                <X
                  size={18}
                  color={color.textOnBrand}
                  strokeWidth={2.2} {...decorativeProps}
                />
              </View>
            )}
          </Pressable>
        )}
      </View>
    );
  }, [openLightbox, photos, onAddPhoto, maxPhotos, styles]);

  const EmptyPlaceholder = (
    <View
      style={styles.emptyPlaceholder}
      accessible
      accessibilityLabel="No photos attached"
    >
      <Camera size={28} color={color.textSubtle} strokeWidth={2} />
      {/* 1.4 cap: bodyMedium is uncapped and the placeholder box is a fixed
          96×96 thumb-match — uncapped text squeezes/clips at AX sizes (M21). */}
      <AppText variant="bodyMedium" style={styles.emptyLabel} maxFontSizeMultiplier={1.4}>No photos</AppText>
    </View>
  );

  return (
    <>
      <FlatList
        horizontal
        style={styles.galleryList}
        data={data}
        keyExtractor={(item, i) => (isAdd(item) ? 'add' : `${(item as GalleryPhoto).position}-${i}`)}
        renderItem={renderItem}
        ListEmptyComponent={EmptyPlaceholder}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Full-screen lightbox — sibling Modal pattern (same as PhotoLightboxModal).
          Using ScrollView with pagingEnabled so the user can swipe between photos.
          key=lightboxStartPage remounts the ScrollView when opening at a different
          initial page, allowing contentOffset to position correctly on first render. */}
      <Modal
        aria-label="Photo viewer"
        visible={lightboxOpen}
        transparent
        animationType={reducedMotion ? 'none' : 'fade'}
        onRequestClose={() => setLightboxOpen(false)}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.lightboxBackdrop} accessibilityViewIsModal onAccessibilityEscape={() => setLightboxOpen(false)}>
          {/* Tap-anywhere dismiss. Hidden from a11y — the labeled close button
              below is the screen-reader dismiss path (same convention as
              PhotoLightboxModal QA Pass-2 #1). */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setLightboxOpen(false)}
            // A11Y-234: the two native props below are NO-OPS on
            // react-native-web, so this tap-anywhere layer leaked into the web
            // tree as an UNLABELED interactive element. decorativeProps is barred
            // on Pressables by its own docblock, so aria-hidden is added directly.
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />

          <ScrollView
            // Remount when opening at a different page OR when the width
            // changes (rotation) so contentOffset re-applies at the new size,
            // keeping the user on the photo they were viewing.
            key={`${lightboxStartPage}-${screenWidth}`}
            ref={lightboxScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: lightboxPage * screenWidth, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setLightboxPage(page);
            }}
            style={StyleSheet.absoluteFill}
            scrollEventThrottle={16}
          >
            {photos.map((photo, i) => (
              <View
                key={photo.position}
                ref={i === lightboxPage ? lightboxPhotoRef : undefined}
                style={[styles.lightboxPage, { width: screenWidth, height: screenHeight }]}
                accessible
                accessibilityLabel={
                  photo.alt_text
                    ? `Photo ${i + 1} of ${photos.length}: ${photo.alt_text}`
                    : `Photo ${i + 1} of ${photos.length}`
                }
              >
                <RemoteImage
                  uri={photo.url}
                  style={{ width: screenWidth, height: screenHeight }}
                  resizeMode="contain" {...decorativeProps}
                />
              </View>
            ))}
          </ScrollView>

          {/* A11Y-221 (2.5.7): Previous/Next — the non-drag paging path.
              Disabled (not hidden) at the ends so the pair stays spatially
              stable; mirrors the close button's overlay-chip recipe. */}
          {photos.length > 1 && (
            <>
              <Pressable
                onPress={() => goToLightboxPage(lightboxPage - 1, photos.length)}
                disabled={lightboxPage === 0}
                style={({ pressed }) => [
                  styles.lightboxNav,
                  styles.lightboxNavLeft,
                  pressed && styles.lightboxNavPressed,
                  lightboxPage === 0 && styles.lightboxNavDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Previous photo"
                {...a11yToggle({ disabled: lightboxPage === 0 })}
              >
                <ChevronLeft size={28} color={color.textOnBrand} strokeWidth={2.2} {...decorativeProps} />
              </Pressable>
              <Pressable
                onPress={() => goToLightboxPage(lightboxPage + 1, photos.length)}
                disabled={lightboxPage === photos.length - 1}
                style={({ pressed }) => [
                  styles.lightboxNav,
                  styles.lightboxNavRight,
                  pressed && styles.lightboxNavPressed,
                  lightboxPage === photos.length - 1 && styles.lightboxNavDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Next photo"
                {...a11yToggle({ disabled: lightboxPage === photos.length - 1 })}
              >
                <ChevronRight size={28} color={color.textOnBrand} strokeWidth={2.2} {...decorativeProps} />
              </Pressable>
            </>
          )}

          {/* Page counter */}
          {photos.length > 1 && (
            <View
              // Clears the home indicator on notched devices (BP-5); 48 stays
              // the floor on square screens so nothing moves there.
              style={[styles.lightboxCounter, { bottom: Math.max(48, insets.bottom + spacing.xxl) }]}
              pointerEvents="none" {...decorativeProps}
            >
              <AppText variant="label" style={styles.lightboxCounterText}>
                {lightboxPage + 1} / {photos.length}
              </AppText>
            </View>
          )}

          <Pressable
            onPress={() => setLightboxOpen(false)}
            hitSlop={spacing.lg}
            style={({ pressed }) => [styles.lightboxClose, pressed && styles.lightboxClosePressed]}
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
    </>
  );
}

export default React.memo(PhotoGalleryInner);

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // Pattern B hardening: pin the list's size so it can't be shrunk if it ever
    // becomes a child of a bounded flex column.
    galleryList: { flexGrow: 0, flexShrink: 0 },
    list: {
      paddingVertical: 4,
      minWidth: '100%',
    },
    separator: { width: 8 },
    thumbWrap: { width: THUMB, height: THUMB },
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: color.surfaceNeutral,
      ...shadow.e1,
    },
    thumbPressed: { opacity: 0.75 },
    thumbImage: { width: '100%', height: '100%' },
    // ✕ remove badge — top-right corner of a pre-submission thumbnail.
    // SW-50: measured 28x29 and OVERLAPPING its own 96x97 thumbnail, so a miss
    // opened the lightbox instead of removing. The old "28 + hitSlop 8 = 44
    // effective" math also lost its top/right edge to the thumbnail's
    // overflow:'hidden'. The touch box is now a real 44 and lives outside that
    // clip; the visible disc below is still 28 and still exactly where it was
    // (flex-end/flex-start + 4pt pad reproduces the old top:4/right:4).
    removeBtn: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: a11y.minTargetSize,
      height: a11y.minTargetSize,
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      padding: 4,
    },
    // Dark scrim disc keeps the white glyph legible over any photo.
    removeDisc: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeDiscPressed: { backgroundColor: 'rgba(0,0,0,0.82)' },
    removeIcon: {
      color: color.textOnBrand,
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      lineHeight: 15,
    },
    addThumb: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: color.brand,
      borderStyle: 'dashed',
      backgroundColor: color.brandSofter,
      borderRadius: radius.lg,
    },
    addIcon: {
      fontSize: 24,
      color: color.brand,
      // 29 ≥ 24 × 1.18 (Public Sans's real line box) — 28 was a 1.17 ratio,
      // the guard's last lineHeight allowlist entry besides the hero figure.
      lineHeight: 29,
    },
    addLabel: {
      fontSize: font.size.xs,
      fontWeight: '600',
      color: color.brandText,
      marginTop: 2,
    },
    emptyPlaceholder: {
      width: THUMB,
      height: THUMB,
      borderRadius: radius.lg,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    emptyIcon: { fontSize: 22 },
    emptyLabel: {
      fontSize: font.size.xs,
      color: color.textMuted,
      fontWeight: '500',
    },
    lightboxBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lightboxPage: {
      // width/height applied inline from useWindowDimensions (rotation-safe).
      alignItems: 'center',
      justifyContent: 'center',
    },
    lightboxCounter: {
      position: 'absolute',
      // bottom is applied inline — Math.max(48, insets.bottom + spacing.xxl).
      alignSelf: 'center',
      backgroundColor: color.backdropCaption,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: radius.circle,
    },
    // A11Y-221: the paging pair — the close button's 44pt overlay-chip recipe,
    // vertically centered on the photo's edges.
    lightboxNav: {
      position: 'absolute',
      top: '50%',
      marginTop: -22,
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.overlayBtn,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lightboxNavLeft: { left: spacing.lg },
    lightboxNavRight: { right: spacing.lg },
    lightboxNavPressed: { opacity: 0.7 },
    // Disabled ends stay visible for spatial stability; 1.4.11 exempts
    // disabled controls from the 3:1 floor, so the dim is legal by spec.
    lightboxNavDisabled: { opacity: 0.35 },
    lightboxCounterText: {
      color: color.textOnBrand,
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
    },
    lightboxClose: {
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
    lightboxClosePressed: { backgroundColor: color.overlayBtnPressed },
    lightboxCloseText: { fontSize: font.size.xl, color: color.textOnBrand, fontWeight: font.weight.bold },
  });
