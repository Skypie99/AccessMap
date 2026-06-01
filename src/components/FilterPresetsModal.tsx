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
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { Plus, X } from 'lucide-react-native';

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

export default function FilterPresetsModal({ visible, onClose, onApply }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
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
      Alert.alert('Could not save preset', errorMessage(e, 'Storage error.'));
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
        Alert.alert('Could not rename preset', errorMessage(e, 'Storage error.'));
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
        Alert.alert('Could not delete preset', errorMessage(e, 'Storage error.'));
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
                placeholderTextColor={color.textMuted}
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
                {!onApply && <Text style={styles.rowApplyHint}>Wiring next release</Text>}
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
              accessibilityLabel={limitReached ? 'Preset limit reached' : 'Add new filter preset'}
              accessibilityState={{
                disabled: !user || limitReached || adding,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Plus size={15} color={color.brandTextAlt} strokeWidth={2.6} />
                <Text style={styles.newBtnText}>New</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close filter presets"
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
              <Text style={styles.noticeText}>Sign in to save named filter presets.</Text>
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
                placeholderTextColor={color.textMuted}
                maxLength={MAX_NAME_LENGTH}
                style={styles.input}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
                accessibilityLabel="Preset name"
                accessibilityHint={`Required. Up to ${MAX_NAME_LENGTH} characters.`}
              />
              <Text style={styles.addFormHint}>
                Creates a preset with default filters. To save your current map filters as a preset,
                use the “Save as preset” button on the Map screen.
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
                    (saving || newName.trim().length === 0) && styles.saveBtnDisabled,
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
      backgroundColor: 'rgba(0,0,0,0.4)',
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    title: {
      fontSize: font.size.xxl,
      fontWeight: font.weight.bold,
      flex: 1,
      color: color.textStrong,
      letterSpacing: -0.3,
    },
    newBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: color.brandSofter,
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: color.brandSoft,
    },
    newBtnDisabled: { opacity: 0.5 },
    newBtnPressed: { opacity: 0.85 },
    newBtnText: {
      color: color.brandTextAlt,
      fontWeight: font.weight.bold,
      fontSize: font.size.base,
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
    addFormHint: {
      fontSize: font.size.xs,
      color: color.textMutedAlt,
      lineHeight: 16,
      fontStyle: 'italic',
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
    cancelBtnText: {
      color: color.text,
      fontWeight: font.weight.semibold,
    },
    saveBtn: { backgroundColor: color.brand },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
    },
    center: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
    subtitle: {
      fontSize: font.size.sm,
      color: color.textMuted,
    },
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
    row: {
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
    rowText: { flex: 1, gap: 2 },
    rowName: {
      fontSize: font.size.md,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
    },
    rowSummary: {
      fontSize: font.size.xs,
      color: color.textMutedAlt,
      lineHeight: 16,
    },
    rowApplyHint: {
      fontSize: font.size.caption,
      color: color.textSubtle,
      fontStyle: 'italic',
    },
    rowActions: {
      flexDirection: 'row',
      gap: spacing.xs,
      alignItems: 'center',
    },
    actionBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    renameBtn: { backgroundColor: color.surfaceNeutral },
    renameBtnPressed: { backgroundColor: color.borderPressed },
    renameBtnText: {
      color: color.text,
      fontWeight: font.weight.semibold,
      fontSize: font.size.sm,
    },
    deleteBtn: { backgroundColor: color.errorBg },
    deleteBtnPressed: { opacity: 0.7 },
    deleteBtnText: {
      color: color.error,
      fontWeight: font.weight.bold,
      fontSize: font.size.sm,
    },
    applyBtn: { backgroundColor: color.brand },
    applyBtnPressed: { opacity: 0.85 },
    applyBtnText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.base,
    },
    renameRow: { flex: 1, gap: spacing.sm + 2 },
    renameActions: { flexDirection: 'row', gap: spacing.sm },
    smallBtn: {
      flex: 1,
      minHeight: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
  });
