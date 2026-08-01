/**
 * FilterPresetsModal — manage the user's saved filter presets (named
 * snapshots of categories + min severity + status filter).
 *
 * Two modes, controlled by whether the caller passes `onApply`:
 *   • Manager mode (no onApply) — list, create-placeholder, rename, delete.
 *     This is how the modal originally shipped; with no consumer for the
 *     filter triple, rows simply omit the per-row Apply control. (Today every
 *     live call site passes onApply, so this mode is effectively unused.)
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
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  type Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { a11yToggle, decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
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
import { Plus, SlidersHorizontal, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * Optional. When provided, the modal opens in "apply mode": each preset
   * row gains a real "Apply" button that calls back with the chosen
   * preset. The host (MapScreen) is responsible for closing the modal
   * after applying — typically by dropping `visible` in the same handler.
   * When omitted, rows omit the per-row Apply control (manager mode) so the
   * manager surface keeps working from any settings/profile entry point that
   * doesn't know how to consume the filter triple.
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
  categories: [] as readonly string[],
  minSeverity: 1,
  statusFilter: ['open', 'verified'] as readonly (
    'open' | 'verified' | 'resolved' | 'rejected'
  )[],
};

export default function FilterPresetsModal({ visible, onClose, onApply }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);
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
                  <AppText variant="label" style={styles.cancelBtnText}>Cancel</AppText>
                </Pressable>
                <Pressable
                  onPress={() => handleRenameSubmit(item.id)}
                  disabled={renameValue.trim().length === 0}
                  style={({ pressed }) => [
                    styles.smallBtn,
                    styles.saveBtn,
                    renameValue.trim().length === 0 && styles.saveBtnDisabled,
                    pressed && renameValue.trim().length > 0 && { backgroundColor: color.ctaFillPressed },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save new name"
                  {...a11yToggle({
                    disabled: renameValue.trim().length === 0,
                  })}
                >
                  <AppText variant="label" style={styles.saveBtnText}>Save</AppText>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.rowText}>
                <AppText variant="label" style={styles.rowName}>
                  {item.name}
                </AppText>
                <AppText variant="body" style={styles.rowSummary} numberOfLines={1}>
                  {presetSummary(item)}
                </AppText>
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
                    <AppText variant="label" style={styles.applyBtnText}>Apply</AppText>
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
                  <AppText variant="label" style={styles.renameBtnText}>Rename</AppText>
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
                  <AppText variant="label" style={styles.deleteBtnText}>Delete</AppText>
                </Pressable>
              </View>
            </>
          )}
        </View>
      );
    },
    [renamingId, renameValue, handleRenameSubmit, handleDelete, onApply],
  );

  // Bottom-anchored sheet clears the home indicator (M15 family recipe).
  // Non-throwing context read — render tests mount without a provider.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };

  return (
    <Modal aria-label="Filter Presets" visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* A11Y-228: KAV lifts the sheet above the keyboard the autoFocus
            create/rename inputs open — the AddressSearchModal recipe. iOS
            'padding'; Android resizes (adjustResize default). width:100%
            (not flex:1) preserves the backdrop's flex-end anchor. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
        <GlassSurface
          variant="bulk"
          borderRadius={0}
          style={[styles.card, { paddingBottom: Math.max(spacing.xxl, insets.bottom) }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={styles.headerRow}>
            <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
              Filter Presets
            </AppText>
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
              {...a11yToggle({
                disabled: !user || limitReached || adding,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Plus size={15} color={color.brandTextAlt} strokeWidth={2.6} />
                <AppText variant="label" style={styles.newBtnText}>New</AppText>
              </View>
            </Pressable>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.borderPressed }]}
              accessibilityRole="button"
              accessibilityLabel="Close filter presets"
            >
              <X
                size={18}
                color={color.text}
                strokeWidth={2.2} {...decorativeProps}
              />
            </Pressable>
          </View>

          {!user ? (
            <View style={styles.notice}>
              <AppText variant="body" style={styles.noticeText}>Sign in to save named filter presets.</AppText>
            </View>
          ) : null}

          {loadError ? (
            <View style={styles.errorBanner}>
              <AppText variant="body" style={styles.errorText}>{loadError}</AppText>
              <Pressable
                onPress={load}
                style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
                accessibilityLabel="Retry loading filter presets"
              >
                <AppText variant="label" style={styles.retryText}>Retry</AppText>
              </Pressable>
            </View>
          ) : null}

          {user && adding && (
            <View style={styles.addForm}>
              <AppText variant="label" style={styles.addFormLabel}>Name this preset</AppText>
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
              <AppText variant="body" style={styles.addFormHint}>
                Creates a preset with default filters. To save your current map filters as a preset,
                use the “Save as preset” button on the Map screen.
              </AppText>
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
                  {...a11yToggle({ disabled: saving })}
                >
                  <AppText variant="label" style={styles.cancelBtnText}>Cancel</AppText>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  disabled={saving || newName.trim().length === 0}
                  style={({ pressed }) => [
                    styles.formBtn,
                    styles.saveBtn,
                    (saving || newName.trim().length === 0) && styles.saveBtnDisabled,
                    pressed && { backgroundColor: color.ctaFillPressed },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save preset"
                  {...a11yToggle({
                    disabled: saving || newName.trim().length === 0,
                    busy: saving,
                  })}
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

          {loading && presets.length === 0 ? (
            // Content-shaped loading (BP-3) — see MyReportsModal; same recipe.
            <View accessibilityLabel="Loading presets" accessibilityLiveRegion="polite">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </View>
          ) : presets.length === 0 && user ? (
            <View style={styles.emptyWrap}>
              <SlidersHorizontal size={32} color={color.inkGlassMuted} strokeWidth={2.2} {...decorativeProps} />
              <AppText variant="heading" style={styles.emptyTitle}>No presets yet</AppText>
              <AppText variant="body" style={styles.emptyBody}>
                {onApply
                  ? 'Save your current map filters as a named preset from the Map screen, then come back here to apply it in one tap.'
                  : 'Save your current map filters as a named preset from the Map screen.'}
              </AppText>
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
        </GlassSurface>
        </KeyboardAvoidingView>
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
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
      maxHeight: '85%',
      // The bulk variant owns the surface; clip it to the rounded top.
      overflow: 'hidden',
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
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
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
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      textAlign: 'center',
      lineHeight: 20,
    },
    listContent: { paddingVertical: spacing.tight },
    separator: { height: spacing.sm },
    row: {
      // Column layout: the name owns line 1, the 3 fixed action buttons own
      // line 2 — a single row crushed the name to a ~50pt sliver at 360pt and
      // overflowed any phone at ×1.6 (sweep M12, wrap-to-second-line option).
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: color.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: color.borderSubtle,
      minHeight: 56,
    },
    // No flex:1 — in the row's column direction that would resolve to a
    // zero flex-basis HEIGHT and collapse the name/summary (Bug-1 shape,
    // same reason renameRow lost its flex:1). Stretch supplies the width.
    rowText: { gap: 2 },
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
    rowActions: {
      flexDirection: 'row',
      gap: spacing.xs,
      alignItems: 'center',
      // At ×1.6 the three buttons alone can exceed the card — let them wrap 2+1.
      flexWrap: 'wrap',
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
    // No flex:1 — under the row's column direction that would resolve to a
    // zero flex-basis HEIGHT and collapse the rename UI (the Bug-1 shape).
    // alignItems:'stretch' on the row already gives it full width.
    renameRow: { gap: spacing.sm + 2 },
    renameActions: { flexDirection: 'row', gap: spacing.sm },
    smallBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
  });
