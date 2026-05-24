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
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
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
import { color } from '@/theme';

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
    setSaving(true);
    try {
      const created = await addPlace(user.id, {
        name: nameInput,
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
        e instanceof SavedPlacesError
          ? e.message
          : errorMessage(e, 'Could not save place.');
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
      // Optimistic: drop from state immediately.
      setPlaces((prev) => prev.filter((p) => p.id !== place.id));
      try {
        await removePlace(user.id, place.id);
        onListChanged?.();
      } catch {
        // Best-effort. UI already updated.
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              Saved Places
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close saved places"
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

          {!user ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Sign in to save your favorite spots and jump back to them in
                one tap.
              </Text>
            </View>
          ) : null}

          {loadError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable
                onPress={load}
                style={styles.retryBtn}
                accessibilityRole="button"
                accessibilityLabel="Retry loading saved places"
              >
                <Text style={styles.retryText}>Retry</Text>
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
              style={[
                styles.addBtn,
                !canShowAddForm && styles.addBtnDisabled,
              ]}
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
              <Text
                style={styles.addBtnGlyph}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                📍
              </Text>
              <Text style={styles.addBtnText}>Save my current location</Text>
            </Pressable>
          )}

          {user && adding && (
            <View style={styles.addForm}>
              <Text style={styles.addFormLabel}>Name this place</Text>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="e.g. Home, Work, Mom's"
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
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleAddSubmit}
                  disabled={saving || nameInput.trim().length === 0}
                  style={[
                    styles.formBtn,
                    styles.saveBtn,
                    (saving || nameInput.trim().length === 0) &&
                      styles.saveBtnDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save place"
                  accessibilityState={{
                    disabled: saving || nameInput.trim().length === 0,
                    busy: saving,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {loading && places.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.subtitle}>Loading saved places…</Text>
            </View>
          ) : places.length === 0 && user ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No saved places yet</Text>
              <Text style={styles.emptyBody}>
                Save spots you check often — your home, work, or anywhere
                you want to jump back to in one tap.
              </Text>
            </View>
          ) : (
            <View style={styles.listWrap}>
              {places.map((place) => (
                <View key={place.id} style={styles.row}>
                  <Pressable
                    onPress={() => handleJump(place)}
                    style={({ pressed }) => [
                      styles.rowMain,
                      pressed && styles.rowMainPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Jump map to ${place.name}`}
                    accessibilityHint="Closes this list and centers the Map on this place"
                  >
                    <Text
                      style={styles.rowGlyph}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      📍
                    </Text>
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {place.name}
                      </Text>
                      <Text
                        style={styles.rowCoords}
                        // QA A5: the Pressable's a11yLabel already covers
                        // "Jump map to {name}"; the raw decimals would be
                        // read as "47 point 6 0 6 2 negative 122 point…"
                        // which adds no value for SR users.
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => handleRemove(place)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.removeBtn,
                      pressed && styles.removeBtnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${place.name}`}
                    accessibilityHint="Asks you to confirm before removing this saved place"
                  >
                    <Text
                      style={styles.removeBtnText}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      ✕
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
    maxHeight: '85%',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '700', flex: 1, color: '#222' },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef1f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 18, color: '#333', fontWeight: '700' },
  notice: {
    backgroundColor: '#fff7e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: color.accentOrange,
  },
  noticeText: { color: '#714b00', fontSize: 13 },
  errorBanner: {
    backgroundColor: '#fdecea',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: { color: '#8a1f1f', flex: 1, fontSize: 13 },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#c0392b',
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: color.brandSofter,
    borderRadius: 10,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#c7defb',
  },
  addBtnDisabled: { opacity: 0.55 },
  addBtnGlyph: { fontSize: 18 },
  addBtnText: { fontSize: 14, color: color.brandTextAlt, fontWeight: '700' },
  addForm: {
    backgroundColor: '#f7f9fc',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  addFormLabel: { fontSize: 13, fontWeight: '700', color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 44,
    backgroundColor: '#fff',
  },
  addFormActions: { flexDirection: 'row', gap: 10 },
  formBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { backgroundColor: '#eef1f5' },
  cancelBtnText: { color: '#333', fontWeight: '600' },
  saveBtn: { backgroundColor: '#2f80ed' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  center: { alignItems: 'center', padding: 24, gap: 8 },
  subtitle: { fontSize: 13, color: '#666' },
  emptyWrap: { alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#222' },
  emptyBody: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },
  listWrap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef1f5',
    minHeight: 56,
  },
  rowMainPressed: { backgroundColor: '#f7f9fc', opacity: 0.92 },
  rowGlyph: { fontSize: 22 },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontSize: 16, fontWeight: '600', color: '#222' },
  rowCoords: { fontSize: 12, color: '#888' },
  removeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fdecea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnPressed: { backgroundColor: '#f7c5c0' },
  removeBtnText: { fontSize: 16, color: '#c0392b', fontWeight: '700' },
});
