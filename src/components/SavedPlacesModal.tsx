/**
 * SavedPlacesModal — manage the user's saved-locations list (Home, Work,
 * Mom's, etc.) and tap any place to jump the Map there.
 *
 * Flows:
 *   • Tap a place row → calls `onJumpToPlace(place)` and closes the modal.
 *     The parent (MapScreen) animates the map.
 *   • Tap "+ Add this spot" → if user's GPS location is available, prompts
 *     for a name and saves at `currentLocation`. If GPS is unavailable, the
 *     button is disabled with a hint explaining why.
 *   • Tap × on a row → removes the place after a confirmation.
 *
 * Sign-in gate: saved places live in per-user AsyncStorage, so an empty
 * state with a "Sign in to save places" hint shows when there's no user.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { useReducedMotion } from '@/lib/accessibility';
import { AppText } from '@/components/ui/AppText';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import {
  addPlace,
  loadPlaces,
  MAX_NAME_LENGTH,
  MAX_PLACES,
  removePlace,
  SavedPlacesError,
  type SavedPlace,
} from '@/lib/savedPlaces';
import type { LatLng } from '@/lib/distance';
import { font, radius, spacing } from '@/theme';
import { MapPin, X } from 'lucide-react-native';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Current GPS coords if available; null means "no fix yet / denied." */
  currentLocation: LatLng | null;
  /** Parent animates the Map to this place's coords. */
  onJumpToPlace: (place: SavedPlace) => void;
  /**
   * Optional — fired after a successful add or remove so the parent
   * (MapScreen) can refresh its chip row immediately without waiting
   * for the modal to close. (QA E12)
   */
  onListChanged?: () => void;
}

export default function SavedPlacesModal({
  visible,
  onClose,
  currentLocation,
  onJumpToPlace,
  onListChanged,
}: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Inline add-place form state.
  const [adding, setAdding] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      setPlaces([]);
      return;
    }
    if (mountedRef.current) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const list = await loadPlaces(user.id);
      if (mountedRef.current) setPlaces(list);
    } catch (e) {
      if (mountedRef.current) {
        setLoadError(errorMessage(e, 'Could not load saved places.'));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // Reload whenever the modal opens.
  useEffect(() => {
    if (visible) {
      load();
      // Reset the inline form so it doesn't leak state across opens.
      setAdding(false);
      setNameInput('');
    }
  }, [visible, load]);

  const handleAddSubmit = useCallback(async () => {
    if (!user || !currentLocation) return;
    // Early-return on an empty name instead of relying on the thrown-error path
    // (Alert.alert is a web no-op). Mirrors FilterPresetsModal.handleCreate.
    const trimmed = nameInput.trim();
    if (trimmed.length === 0) return;
    setSaving(true);
    try {
      const created = await addPlace(user.id, {
        name: trimmed,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
      });
      if (!mountedRef.current) return;
      setPlaces((prev) => [...prev, created]);
      setNameInput('');
      setAdding(false);
      onListChanged?.();
    } catch (e) {
      // Show friendly copy keyed on the error code, falling back to the
      // generic errorMessage formatter otherwise.
      const msg =
        e instanceof SavedPlacesError ? e.message : errorMessage(e, 'Could not save place.');
      Alert.alert('Could not save place', msg);
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [user, currentLocation, nameInput, onListChanged]);

  const handleRemove = useCallback(
    async (place: SavedPlace) => {
      if (!user) return;
      // confirm() falls back to window.confirm on web — Alert.alert is a
      // no-op there and would silently swallow the destructive prompt.
      const ok = await confirm(
        'Remove this place?',
        `"${place.name}" will be removed from your saved places.`,
        'Remove',
        true,
      );
      if (!ok) return;
      // Optimistic: drop from state immediately, snapshotting the prior list
      // (via the updater so we read the freshest value, not a stale closure)
      // so we can roll back if the persisted delete fails.
      let restore: SavedPlace[] | null = null;
      setPlaces((prev) => {
        restore = prev;
        return prev.filter((p) => p.id !== place.id);
      });
      try {
        await removePlace(user.id, place.id);
        onListChanged?.();
      } catch (e) {
        // F14: removePlace() re-throws on AsyncStorage write failure (per the
        // error policy). Don't swallow it — restore the entry (otherwise it
        // reappears on next open as a "ghost") and tell the user.
        if (mountedRef.current && restore) setPlaces(restore);
        Alert.alert('Could not remove place', errorMessage(e, 'Please try again.'));
      }
    },
    [user, onListChanged],
  );

  const handleJump = useCallback(
    (place: SavedPlace) => {
      onJumpToPlace(place);
      onClose();
    },
    [onJumpToPlace, onClose],
  );

  const limitReached = places.length >= MAX_PLACES;
  const canShowAddForm = !!user && !!currentLocation && !limitReached;

  // Row renderer for the saved-places FlatList. Extracted from the old
  // inline .map() so the list virtualizes and scrolls inside the 85%-height
  // card (G8) — previously a plain View that overflowed once the list grew.
  const renderItem = useCallback(
    ({ item: place }: { item: SavedPlace }) => (
      <View style={styles.row}>
        <Pressable
          onPress={() => handleJump(place)}
          style={({ pressed }) => [styles.rowMain, pressed && styles.rowMainPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Jump map to ${place.name}`}
          accessibilityHint="Closes this list and centers the Map on this place"
        >
          <MapPin size={18} color={color.brand} strokeWidth={2.2} />
          <View style={styles.rowText}>
            <AppText variant="label" style={styles.rowName}>
              {place.name}
            </AppText>
            <AppText
              variant="body"
              style={styles.rowCoords}
              // QA A5: the Pressable's a11yLabel already covers
              // "Jump map to {name}"; the raw decimals would be
              // read as "47 point 6 0 6 2 negative 122 point…"
              // which adds no value for SR users.
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
            </AppText>
          </View>
        </Pressable>
        <Pressable
          onPress={() => handleRemove(place)}
          hitSlop={10}
          style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${place.name}`}
          accessibilityHint="Asks you to confirm before removing this saved place"
        >
          <X
            size={18}
            color={color.error}
            strokeWidth={2.2}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </Pressable>
      </View>
    ),
    [handleJump, handleRemove, styles, color],
  );

  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <AppText variant="heading" style={styles.title} accessibilityRole="header">
              Saved Places
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close saved places"
            >
              <X
                size={18}
                color={color.text}
                strokeWidth={2.2}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            </Pressable>
          </View>

          {!user ? (
            <View style={styles.notice}>
              <AppText variant="body" style={styles.noticeText}>
                Sign in to save your favorite spots and jump back to them in one tap.
              </AppText>
            </View>
          ) : null}

          {loadError ? (
            <View style={styles.errorBanner}>
              <AppText variant="body" style={styles.errorText}>{loadError}</AppText>
              <Pressable
                onPress={load}
                style={styles.retryBtn}
                accessibilityRole="button"
                accessibilityLabel="Retry loading saved places"
              >
                <AppText variant="label" style={styles.retryText}>Retry</AppText>
              </Pressable>
            </View>
          ) : null}

          {user && !adding && (
            <Pressable
              onPress={() => {
                if (!canShowAddForm) {
                  if (limitReached) {
                    Alert.alert(
                      `Limit reached`,
                      `You can save up to ${MAX_PLACES} places. Remove one to add another.`,
                    );
                  } else if (!currentLocation) {
                    Alert.alert(
                      'Waiting for location',
                      'Allow location access from the Map screen so we know where to save.',
                    );
                  }
                  return;
                }
                setAdding(true);
              }}
              style={[styles.addBtn, !canShowAddForm && styles.addBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={
                canShowAddForm
                  ? 'Save your current location as a place'
                  : limitReached
                    ? 'Save place limit reached'
                    : 'Save place — waiting for current location'
              }
              accessibilityState={{ disabled: !canShowAddForm }}
            >
              <MapPin size={18} color={color.brand} strokeWidth={2.2} />
              <AppText variant="label" style={styles.addBtnText}>Save my current location</AppText>
            </Pressable>
          )}

          {user && adding && (
            <View style={styles.addForm}>
              <AppText variant="label" style={styles.addFormLabel}>Name this place</AppText>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="e.g. Home, Work, Mom's"
                placeholderTextColor={color.textMuted}
                maxLength={MAX_NAME_LENGTH}
                style={styles.input}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddSubmit}
                accessibilityLabel="Place name"
                accessibilityHint={`Required. Up to ${MAX_NAME_LENGTH} characters.`}
              />
              <View style={styles.addFormActions}>
                <Pressable
                  onPress={() => {
                    setAdding(false);
                    setNameInput('');
                  }}
                  disabled={saving}
                  style={[styles.formBtn, styles.cancelBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel adding place"
                  accessibilityState={{ disabled: saving }}
                >
                  <AppText variant="label" style={styles.cancelBtnText}>Cancel</AppText>
                </Pressable>
                <Pressable
                  onPress={handleAddSubmit}
                  disabled={saving || nameInput.trim().length === 0}
                  style={[
                    styles.formBtn,
                    styles.saveBtn,
                    (saving || nameInput.trim().length === 0) && styles.saveBtnDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save place"
                  accessibilityState={{
                    disabled: saving || nameInput.trim().length === 0,
                    busy: saving,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color={color.textOnBrand} />
                  ) : (
                    <AppText variant="label" style={styles.saveBtnText}>Save</AppText>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {loading && places.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <AppText variant="body" style={styles.subtitle}>Loading saved places…</AppText>
            </View>
          ) : places.length === 0 && user ? (
            <View style={styles.emptyWrap}>
              <AppText variant="label" style={styles.emptyTitle}>No saved places yet</AppText>
              <AppText variant="body" style={styles.emptyBody}>
                Save spots you check often — your home, work, or anywhere you want to jump back to
                in one tap.
              </AppText>
            </View>
          ) : (
            <FlatList
              data={places}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              removeClippedSubviews
              initialNumToRender={10}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: color.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
      maxHeight: '85%',
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    title: {
      fontSize: font.size.xxl,
      fontWeight: font.weight.bold,
      flex: 1,
      color: color.textStrong,
      letterSpacing: -0.3,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: font.size.xl,
      color: color.text,
      fontWeight: font.weight.bold,
      lineHeight: font.size.xl + 2,
    },
    notice: {
      backgroundColor: color.warningBg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderLeftWidth: 3,
      borderLeftColor: color.accentOrange,
    },
    noticeText: {
      color: color.warningFg,
      fontSize: font.size.sm,
      lineHeight: 18,
    },
    errorBanner: {
      backgroundColor: color.errorBg,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    errorText: {
      color: color.errorFg,
      flex: 1,
      fontSize: font.size.sm,
      lineHeight: 18,
    },
    retryBtn: {
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
      backgroundColor: color.error,
      minHeight: 44,
      justifyContent: 'center',
    },
    retryText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.sm,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm + 2,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: color.brandSofter,
      borderRadius: radius.md,
      minHeight: 48,
      borderWidth: 1,
      borderColor: color.brandSoft,
    },
    addBtnDisabled: { opacity: 0.55 },
    addBtnGlyph: { fontSize: font.size.xl },
    addBtnText: {
      fontSize: font.size.base,
      color: color.brandTextAlt,
      fontWeight: font.weight.bold,
    },
    addForm: {
      backgroundColor: color.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.sm + 2,
    },
    addFormLabel: {
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    input: {
      borderWidth: 1,
      borderColor: color.borderStrong,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      minHeight: 44,
      backgroundColor: color.surface,
      fontSize: font.size.base,
      color: color.textStrong,
    },
    addFormActions: { flexDirection: 'row', gap: spacing.sm + 2 },
    formBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtn: { backgroundColor: color.surfaceNeutral },
    cancelBtnText: { color: color.text, fontWeight: font.weight.semibold },
    saveBtn: { backgroundColor: color.brand },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: color.textOnBrand, fontWeight: font.weight.bold },
    center: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
    subtitle: { fontSize: font.size.sm, color: color.textMuted },
    emptyWrap: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.lg,
    },
    emptyTitle: {
      fontSize: font.size.xl,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
    },
    emptyBody: {
      fontSize: font.size.base,
      color: color.textMutedAlt,
      textAlign: 'center',
      lineHeight: 20,
    },
    listContent: { paddingVertical: spacing.tight },
    separator: { height: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    rowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: color.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: color.borderSubtle,
      minHeight: 56,
    },
    rowMainPressed: {
      backgroundColor: color.surfaceMuted,
      opacity: 0.92,
    },
    rowGlyph: { fontSize: 22 },
    rowText: { flex: 1, gap: 2 },
    rowName: {
      fontSize: font.size.lg,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
    },
    rowCoords: { fontSize: font.size.xs, color: color.textSubtle },
    removeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.errorBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeBtnPressed: { opacity: 0.7 },
    removeBtnText: {
      fontSize: font.size.lg,
      color: color.error,
      fontWeight: font.weight.bold,
    },
  });
