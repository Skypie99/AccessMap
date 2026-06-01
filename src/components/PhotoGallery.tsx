import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, shadow, spacing } from '@/theme';
import { Camera } from 'lucide-react-native';

const SCREEN = Dimensions.get('window');

export type GalleryPhoto = { url: string; position: number };

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

  const canAdd = !!onAddPhoto && photos.length < maxPhotos;

  // Lightbox state: startPage = which photo opened the lightbox (drives
  // ScrollView key + contentOffset). currentPage = live page as user swipes.
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartPage, setLightboxStartPage] = useState(0);
  const [lightboxPage, setLightboxPage] = useState(0);

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
          accessibilityLabel="Add another photo"
          accessibilityHint={`${photos.length} of ${maxPhotos} photos added. Tap to add more.`}
        >
          <Text style={styles.addIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            +
          </Text>
          <Text style={styles.addLabel} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            Add photo
          </Text>
        </Pressable>
      );
    }

    const total = photos.length;
    return (
      <Pressable
        onPress={() => openLightbox(index)}
        style={({ pressed }) => [styles.thumb, pressed && styles.thumbPressed]}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Photo ${index + 1} of ${total}`}
        accessibilityHint="Tap to view full screen"
      >
        <Image
          source={{ uri: item.url }}
          style={styles.thumbImage}
          resizeMode="cover"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        {onRemovePhoto && (
          <Pressable
            onPress={() => onRemovePhoto(index)}
            hitSlop={8}
            style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${index + 1}`}
            accessibilityHint="Removes this photo before you submit"
          >
            <Text
              style={styles.removeIcon}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              ✕
            </Text>
          </Pressable>
        )}
      </Pressable>
    );
  }, [openLightbox, photos, onAddPhoto, maxPhotos, styles]);

  const EmptyPlaceholder = (
    <View
      style={styles.emptyPlaceholder}
      accessible
      accessibilityLabel="No photos attached"
    >
      <Camera size={28} color={color.textSubtle} strokeWidth={2} />
      <Text style={styles.emptyLabel}>No photos</Text>
    </View>
  );

  return (
    <>
      <FlatList
        horizontal
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
        visible={lightboxOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxOpen(false)}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.lightboxBackdrop} accessibilityViewIsModal>
          {/* Tap-anywhere dismiss. Hidden from a11y — the labeled close button
              below is the screen-reader dismiss path (same convention as
              PhotoLightboxModal QA Pass-2 #1). */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setLightboxOpen(false)}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />

          <ScrollView
            key={lightboxStartPage}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: lightboxStartPage * SCREEN.width, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN.width);
              setLightboxPage(page);
            }}
            style={StyleSheet.absoluteFill}
            scrollEventThrottle={16}
          >
            {photos.map((photo, i) => (
              <View
                key={photo.position}
                style={styles.lightboxPage}
                accessible
                accessibilityLabel={`Photo ${i + 1} of ${photos.length}`}
              >
                <Image
                  source={{ uri: photo.url }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </View>
            ))}
          </ScrollView>

          {/* Page counter */}
          {photos.length > 1 && (
            <View
              style={styles.lightboxCounter}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={styles.lightboxCounterText}>
                {lightboxPage + 1} / {photos.length}
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => setLightboxOpen(false)}
            hitSlop={spacing.lg}
            style={({ pressed }) => [styles.lightboxClose, pressed && styles.lightboxClosePressed]}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Text
              style={styles.lightboxCloseText}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              ✕
            </Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

export default React.memo(PhotoGalleryInner);

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    list: {
      paddingVertical: 4,
      minWidth: '100%',
    },
    separator: { width: 8 },
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
    // 28x28 visible + hitSlop 8 on each side → 44pt effective target (WCAG 2.5.8).
    // Dark scrim badge keeps the white glyph legible over any photo.
    removeBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeBtnPressed: { backgroundColor: 'rgba(0,0,0,0.82)' },
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
      fontWeight: '700',
      color: color.brand,
      lineHeight: 28,
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
      width: SCREEN.width,
      height: SCREEN.height,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lightboxImage: {
      width: SCREEN.width,
      height: SCREEN.height,
    },
    lightboxCounter: {
      position: 'absolute',
      bottom: 48,
      alignSelf: 'center',
      backgroundColor: color.backdropCaption,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: radius.circle,
    },
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
