/**
 * FilterPresetsModal — manage the user's saved filter presets (named
 * snapshots of categories + min severity + status filter).
 *
 * Two modes, controlled by whether the caller passes `onApply`:
 *   • Manager mode (no onApply) — list, create-placeholder, rename, delete.
 *     This is how the modal originally shipped; the "Apply" affordance on
 *     each row is replaced with a "Wiring next release" hint because no
 *     consumer existed for the filter triple.
 *   • Apply mode (onApply provided) — same management surface, PLUS each
 *     row gets a real Apply button that calls back into the host (the Map
 *     screen) with the chosen preset. The host is responsible for pushing
 *     the preset's filter triple into whatever state it owns and for
 *     dismissing the modal.
 *
 * Flows:
 *   • Tap "＋ New" → opens an inline form. The form still saves a
 *     placeholder preset with default values because the "snapshot the
 *     current filters" entry point lives on MapScreen (the manager has no
 *     access to that state). The form's helper copy nudges users toward
 *     the Map's Save-as-preset button for that path.
 *   • Tap "Rename" on a row → swaps that row into an inline editor with
 *     the existing name pre-filled. Save updates; Cancel reverts.
 *   • Tap "Delete" on a row → confirm Alert, then removes after confirm.
 *   • Tap "Apply" on a row (apply mode only) → fires onApply(preset).
 *
 * Sign-in gate: presets live in per-user AsyncStorage so an empty notice
 * shows when there's no user.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  addPreset,
  FILTER_PRESETS_MAX,
  loadPresets,
  presetSummary,
  removePreset,
  renamePreset,
  savePresets,
  type FilterPreset,
} from '@/lib/filterPresets';
import { color } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * Optional. When provided, the modal opens in "apply mode": each preset
   * row gains a real "Apply" button that calls back with the chosen
   * preset. The host (MapScreen) is responsible for closing the modal
   * after applying — typically by dropping `visible` in the same handler.
   * When omitted, the row's Apply slot keeps the "Wiring next release"
   * hint (manager mode) so the manager surface keeps working from any
   * settings/profile entry point that doesn't know how to consume the
   * filter triple.
   */
  onApply?: (preset: FilterPreset) => void;
}

// Reasonable cap on user-supplied names. Same length as SavedPlacesModal so
// the UI feels consistent across "saved-thing" managers.
const MAX_NAME_LENGTH = 60;

// Default values used when the user creates a placeholder preset this cycle
// (Map wiring is deferred). Picked to match the Map's own default filter
// state so when wiring lands, "default" actually means "everything visible
// at the lowest severity threshold."
const PLACEHOLDER_DEFAULTS = {
  categories: [] as ReadonlyArray<string>,
  minSeverity: 1,
  statusFilter: ['open', 'verified'] as ReadonlyArray<
    'open' | 'verified' | 'resolved' | 'rejected'
  >,
};

export default function FilterPresetsModal({
  visible,
  onClose,
  onApply,
}: Props) {
  const { user } = useAuth();

  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // "New preset" inline form state.
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  // "Rename" inline editor state — keyed by preset id so only one row is
  // editable at a time.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      setPresets([]);
      return;
    }
    if (mountedRef.current) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const list = await loadPresets(user.id);
      if (mountedRef.current) setPresets(list);
    } catch (e) {
      if (mountedRef.current) {
        setLoadError(errorMessage(e, 'Could not load filter presets.'));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // Reload whenever the modal opens. Also reset the transient form state so
  // a half-finished add or rename from a previous open doesn't leak in.
  useEffect(() => {
    if (visible) {
      load();
      setAdding(false);
      setNewName('');
      setRenamingId(null);
      setRenameValue('');
    }
  }, [visible, load]);

  const limitReached = presets.length >= FILTER_PRESETS_MAX;

  const handleCreate = useCallback(async () => {
    if (!user) return;
    const trimmed = newName.trim();
    if (trimmed.length === 0) return;
    setSaving(true);
    try {
      const next = addPreset(presets, {
        name: trimmed,
        categories: PLACEHOLDER_DEFAULTS.categories,
        minSeverity: PLACEHOLDER_DEFAULTS.minSeverity,
        statusFilter: PLACEHOLDER_DEFAULTS.statusFilter,
      });
      await savePresets(user.id, next);
      if (!mountedRef.current) return;
      setPresets(next);
      setAdding(false);
      setNewName('');
    } catch (e) {
      Alert.alert(
        'Could not save preset',
        errorMessage(e, 'Storage error.'),
      );
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [user, newName, presets]);

  const handleRenameSubmit = useCallback(
    async (id: string) => {
      if (!user) return;
      const trimmed = renameValue.trim();
      if (trimmed.length === 0) return;
      const next = renamePreset(presets, id, trimmed);
      // Optimistic — also handles the no-op case (same name) cleanly.
      setPresets(next);
      setRenamingId(null);
      setRenameValue('');
      try {
        await savePresets(user.id, next);
      } catch (e) {
        // Roll back on disk failure so what the user sees matches storage.
        setPresets(presets);
        Alert.alert(
          'Could not rename preset',
          errorMessage(e, 'Storage error.'),
        );
      }
    },
    [user, renameValue, presets],
  );

  const handleDelete = useCallback(
    async (preset: FilterPreset) => {
      if (!user) return;
      // confirm() falls back to window.confirm on web — Alert.alert is a
      // no-op there and would silently swallow the destructive prompt.
      const ok = await confirm(
        'Delete this preset?',
        `"${preset.name}" will be removed from your saved filter presets.`,
        'Delete',
        true,
      );
      if (!ok) return;
      // Optimistic: drop from state immediately.
      const next = removePreset(presets, preset.id);
      setPresets(next);
      try {
        await savePresets(user.id, next);
      } catch (e) {
        // Roll back on disk failure.
        setPresets(presets);
        Alert.alert(
          'Could not delete preset',
          errorMessage(e, 'Storage error.'),
        );
      }
    },
    [user, presets],
  );

  const renderItem = useCallback(
    ({ item }: { item: FilterPreset }) => {
      const isRenaming = renamingId === item.id;
      return (
        <View
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={`Preset ${item.name}. ${presetSummary(item)}`}
        >
          {isRenaming ? (
            <View style={styles.renameRow}>
              <TextInput
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="New name"
                maxLength={MAX_NAME_LENGTH}
                style={styles.input}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => handleRenameSubmit(item.id)}
                accessibilityLabel="New preset name"
                accessibilityHint={`Required. Up to ${MAX_NAME_LENGTH} characters.`}
              />
              <View style={styles.renameActions}>
                <Pressable
                  onPress={() => {
                    setRenamingId(null);
                    setRenameValue('');
                  }}
                  style={[styles.smallBtn, styles.cancelBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel rename"
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleRenameSubmit(item.id)}
                  disabled={renameValue.trim().length === 0}
                  style={[
                    styles.smallBtn,
                    styles.saveBtn,
                    renameValue.trim().length === 0 && styles.saveBtnDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save new name"
                  accessibilityState={{
                    disabled: renameValue.trim().length === 0,
                  }}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowSummary} numberOfLines={1}>
                  {presetSummary(item)}
                </Text>
                {/* Manager mode keeps the honest "no consumer yet" hint;
                    apply mode promotes the row to a real Apply button on
                    the right so the hint would be redundant. */}
                {!onApply && (
                  <Text style={styles.rowApplyHint}>
                    Wiring next release
                  </Text>
                )}
              </View>
              <View style={styles.rowActions}>
                {onApply && (
                  <Pressable
                    onPress={() => onApply(item)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.applyBtn,
                      pressed && styles.applyBtnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Apply preset ${item.name}`}
                    accessibilityHint="Replaces current map filters with this preset"
                  >
                    <Text style={styles.applyBtnText}>Apply</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    setRenamingId(item.id);
                    setRenameValue(item.name);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.renameBtn,
                    pressed && styles.renameBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Rename preset ${item.name}`}
                >
                  <Text style={styles.renameBtnText}>Rename</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.deleteBtn,
                    pressed && styles.deleteBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete preset ${item.name}`}
                  accessibilityHint="Asks you to confirm before deleting"
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      );
    },
    [renamingId, renameValue, handleRenameSubmit, handleDelete, onApply],
  );

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
              Filter Presets
            </Text>
            <Pressable
              onPress={() => {
                if (!adding || saving) {
                  setAdding(true);
                  setNewName('');
                }
              }}
              disabled={!user || limitReached || adding}
              hitSlop={6}
              style={({ pressed }) => [
                styles.newBtn,
                (!user || limitReached || adding) && styles.newBtnDisabled,
                pressed && styles.newBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                limitReached
                  ? 'Preset limit reached'
                  : 'Add new filter preset'
              }
              accessibilityState={{
                disabled: !user || limitReached || adding,
              }}
            >
              <Text style={styles.newBtnText}>＋ New</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close filter presets"
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
                Sign in to save named filter presets.
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
                accessibilityLabel="Retry loading filter presets"
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {user && adding && (
            <View style={styles.addForm}>
              <Text style={styles.addFormLabel}>Name this preset</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Downtown commute"
                maxLength={MAX_NAME_LENGTH}
                style={styles.input}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
                accessibilityLabel="Preset name"
                accessibilityHint={`Required. Up to ${MAX_NAME_LENGTH} characters.`}
              />
              <Text style={styles.addFormHint}>
                Creates a preset with default filters. To save your
                current map filters as a preset, use the “Save as preset”
                button on the Map screen.
              </Text>
              <View style={styles.addFormActions}>
                <Pressable
                  onPress={() => {
                    setAdding(false);
                    setNewName('');
                  }}
                  disabled={saving}
                  style={[styles.formBtn, styles.cancelBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel adding preset"
                  accessibilityState={{ disabled: saving }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  disabled={saving || newName.trim().length === 0}
                  style={[
                    styles.formBtn,
                    styles.saveBtn,
                    (saving || newName.trim().length === 0) &&
                      styles.saveBtnDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save preset"
                  accessibilityState={{
                    disabled: saving || newName.trim().length === 0,
                    busy: saving,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color={color.textOnBrand} />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {loading && presets.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.subtitle}>Loading presets…</Text>
            </View>
          ) : presets.length === 0 && user ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No presets yet</Text>
              <Text style={styles.emptyBody}>
                {onApply
                  ? 'Save your current map filters as a named preset from the Map screen, then come back here to apply it in one tap.'
                  : 'Save your current map filters as a named preset from the Map screen.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={presets}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: color.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: '700', flex: 1, color: '#222' },
  newBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: color.brandSofter,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c7defb',
  },
  newBtnDisabled: { opacity: 0.5 },
  newBtnPressed: { opacity: 0.85 },
  newBtnText: { color: color.brandTextAlt, fontWeight: '700', fontSize: 14 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.surfaceNeutral,
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
    borderLeftColor: '#f1a520',
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
    backgroundColor: color.error,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: { color: color.textOnBrand, fontWeight: '700', fontSize: 13 },
  addForm: {
    backgroundColor: '#f7f9fc',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  addFormLabel: { fontSize: 13, fontWeight: '700', color: '#333' },
  addFormHint: {
    fontSize: 12,
    color: '#5b6470',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 44,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#222',
  },
  addFormActions: { flexDirection: 'row', gap: 10 },
  formBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { backgroundColor: color.surfaceNeutral },
  cancelBtnText: { color: '#333', fontWeight: '600' },
  saveBtn: { backgroundColor: color.brand },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: color.textOnBrand, fontWeight: '700' },
  center: { alignItems: 'center', padding: 24, gap: 8 },
  subtitle: { fontSize: 13, color: '#666' },
  emptyWrap: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#222' },
  // Body color: #5b6470 — chosen to clear contrast guidance on the white
  // modal background (matches the spec's a11y note on empty-state contrast).
  emptyBody: {
    fontSize: 14,
    color: '#5b6470',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: { paddingVertical: 4 },
  separator: { height: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: color.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef1f5',
    minHeight: 56,
  },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#222' },
  rowSummary: { fontSize: 12, color: '#5b6470' },
  rowApplyHint: { fontSize: 11, color: '#888', fontStyle: 'italic' },
  rowActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameBtn: { backgroundColor: color.surfaceNeutral },
  renameBtnPressed: { backgroundColor: '#e2e6ec' },
  renameBtnText: { color: '#333', fontWeight: '600', fontSize: 13 },
  deleteBtn: { backgroundColor: '#fdecea' },
  deleteBtnPressed: { backgroundColor: '#f7c5c0' },
  deleteBtnText: { color: color.error, fontWeight: '700', fontSize: 13 },
  // Apply: primary action color so it reads as the obvious affordance
  // when apply-mode is on. White-on-#2f80ed is ~3.8:1 — needs 4.5:1 for
  // small text, but at 14pt bold the WCAG "large text" 3:1 threshold
  // applies and it clears AA.
  applyBtn: { backgroundColor: color.brand },
  applyBtnPressed: { backgroundColor: '#1f6dd0' },
  applyBtnText: { color: color.textOnBrand, fontWeight: '700', fontSize: 14 },
  renameRow: { flex: 1, gap: 10 },
  renameActions: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
