import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, shadow, spacing } from '@/theme';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { getDirectionsUrl } from '@/lib/directionsLink';
import { errorMessage } from '@/lib/errors';
import { formatFlagShareText } from '@/lib/shareFlag';
import { addWatched, loadWatched, removeWatched } from '@/lib/watchedFlags';
import { recordView } from '@/lib/recentlyViewed';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  deleteFlag,
  severityColor,
  updateFlagContent,
  updateFlagStatus,
  type FlagContentPatch,
} from '@/lib/flags';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import { isDisabilityTag, isSeasonalTag, isValidTag, tagLabel } from '@/lib/contextTags';
import { addFlagPhoto, listFlagPhotos } from '@/lib/photos';
import { MAX_COMMENT_LENGTH } from '@/lib/comments';
import { useComments } from '@/hooks/useComments';
import type { FlagCategory, FlagRow, FlagSeverity, FlagStatus } from '@/types/database';
import PhotoGallery, { type GalleryPhoto } from './PhotoGallery';
import StatusHistoryModal from './StatusHistoryModal';
import { StatusBadge } from './StatusBadge';
import { CommentBubble } from './CommentBubble';
import { useReducedMotion } from '@/lib/accessibility';

export type DetailAction = 'verify' | 'resolve' | 'reject';

interface Props {
  visible: boolean;
  flag: FlagRow | null;
  onClose: () => void;
  // Called after the status changes succeed; isOwn lets the parent show the
  // right "+points" flash banner (reporter vs. actor bonus).
  onChanged: (updated: FlagRow, action: DetailAction, isOwn: boolean) => void;
  onDeleted: (deletedId: string) => void;
  onViewOnMap: (flag: FlagRow) => void;
}

export default function FlagDetailModal({
  visible,
  flag,
  onClose,
  onChanged,
  onDeleted,
  onViewOnMap,
}: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [flagPhotos, setFlagPhotos] = useState<GalleryPhoto[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState<FlagCategory>('steep_grade');
  const [editSeverity, setEditSeverity] = useState<FlagSeverity>(3);
  // Watched state — null while we're loading the per-user list, true/false
  // once known. Hidden button until we know, so we never render a stale
  // "Watch" that flips to "Unwatch" 100ms after the modal opens.
  const [watched, setWatched] = useState<boolean | null>(null);
  const [watchSaving, setWatchSaving] = useState(false);
  // Status-history modal — sibling Modal pattern. Closed when this modal
  // closes or the shown flag swaps, so it never lingers over the wrong flag.
  const [historyOpen, setHistoryOpen] = useState(false);

  // Cache the last flag so the slide-out animation still has content to render
  // after the parent clears `flag` on close. Without this the card briefly
  // turns blank as it animates away.
  const [shownFlag, setShownFlag] = useState<FlagRow | null>(flag);

  // Comments — pass shownFlag?.id so the hook tracks the currently-visible
  // flag even while the parent is animating the next one in.
  const {
    comments,
    loading: commentsLoading,
    error: commentsError,
    tableNotReady: commentsTableNotReady,
    addComment,
    deleteComment: deleteCommentById,
  } = useComments(shownFlag?.id);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const commentInputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (flag) {
      setShownFlag(flag);
      setIsEditing(false);
      setEditDesc(flag.description ?? '');
      setEditCategory(flag.category);
      setEditSeverity(flag.severity);
    }
  }, [flag]);

  // Close-on-parent-close / close-on-flag-swap protection for the history
  // modal. Prevents it from showing entries for the previous flag after the
  // user navigates to another one.
  useEffect(() => {
    if (!visible) setHistoryOpen(false);
  }, [visible]);
  useEffect(() => {
    setHistoryOpen(false);
  }, [flag?.id]);

  // Record a "view" the first time this modal becomes visible with a flag
  // and user. Fire-and-forget — the recently-viewed row on Profile updates
  // on its next focus; we don't want to block the modal open on storage.
  // Deduping + capping live inside recordView itself; re-opening the
  // same flag just bubbles it to the top of the list.
  useEffect(() => {
    if (!visible || !shownFlag || !user) return;
    void recordView(user.id, shownFlag.id);
  }, [visible, shownFlag, user]);

  // Load the gallery photos whenever the modal opens or the flag changes.
  // listFlagPhotos silently returns [] if the migration hasn't run yet.
  useEffect(() => {
    if (!visible || !shownFlag) {
      setFlagPhotos([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const photos = await listFlagPhotos(shownFlag.id);
      if (!cancelled) setFlagPhotos(photos);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, shownFlag?.id]);

  // Read the user's watched list to know whether THIS flag is being
  // tracked. Re-runs whenever the modal opens or the shown flag changes,
  // so opening one flag then another shows the right state immediately.
  // Fire-and-forget — a slow read just delays the button render.
  useEffect(() => {
    let cancelled = false;
    if (!visible || !shownFlag || !user) {
      setWatched(null);
      return;
    }
    (async () => {
      const list = await loadWatched(user.id);
      if (cancelled) return;
      setWatched(list.includes(shownFlag.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, shownFlag, user]);

  const handleToggleWatch = async () => {
    if (!user || !shownFlag || watched === null || watchSaving) return;
    setWatchSaving(true);
    try {
      if (watched) {
        await removeWatched(user.id, shownFlag.id);
        setWatched(false);
      } else {
        await addWatched(user.id, shownFlag.id);
        setWatched(true);
      }
    } catch {
      // Storage hiccups already get a console.warn from the helpers.
      // Nothing to surface to the user — they can retry.
    } finally {
      setWatchSaving(false);
    }
  };

  // Pick and upload a new photo for this flag (owner-only).
  const handleAddPhoto = async () => {
    if (!shownFlag || !user) return;

    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const localUri = URL.createObjectURL(file);
        try {
          await addFlagPhoto(shownFlag.id, localUri);
          const updated = await listFlagPhotos(shownFlag.id);
          setFlagPhotos(updated);
        } catch (e) {
          Alert.alert('Could not upload photo', errorMessage(e));
        }
      };
      document.body.appendChild(input);
      input.click();
      return;
    }

    Alert.alert('Add photo', 'Choose a source', [
      {
        text: 'Take photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission needed', 'Allow camera access to attach a photo.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]?.uri) {
            try {
              await addFlagPhoto(shownFlag.id, result.assets[0].uri);
              const updated = await listFlagPhotos(shownFlag.id);
              setFlagPhotos(updated);
            } catch (e) {
              Alert.alert('Could not upload photo', errorMessage(e));
            }
          }
        },
      },
      {
        text: 'Choose from library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission needed', 'Allow photo library access to attach a photo.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]?.uri) {
            try {
              await addFlagPhoto(shownFlag.id, result.assets[0].uri);
              const updated = await listFlagPhotos(shownFlag.id);
              setFlagPhotos(updated);
            } catch (e) {
              Alert.alert('Could not upload photo', errorMessage(e));
            }
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (!shownFlag) {
    return <Modal visible={false} transparent onRequestClose={onClose} />;
  }

  const isOwn = shownFlag.user_id === user?.id;
  const status = shownFlag.status;
  const canVerify = status === 'open';
  const canResolve = status === 'open' || status === 'verified';
  const canReject = status === 'open' || status === 'verified';
  const formattedDate = new Date(shownFlag.created_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const formattedCoords = `${shownFlag.lat.toFixed(5)}, ${shownFlag.lng.toFixed(5)}`;
  const coordsA11y = `Coordinates ${shownFlag.lat.toFixed(5)} latitude, ${shownFlag.lng.toFixed(5)} longitude`;
  const canEdit = isOwn && status === 'open';

  // Split the flag's stored context_tags into general "conditions", seasonal,
  // and disability groups so each renders under its own heading. isValidTag
  // scrubs any unknown/dirty values first (so a future vocabulary change can't
  // crash the render); the type guards then partition what remains. General =
  // whatever's left after pulling out the two named subsets.
  const validTags = (shownFlag.context_tags ?? []).filter(isValidTag);
  const seasonalTags = validTags.filter(isSeasonalTag);
  const disabilityTags = validTags.filter(isDisabilityTag);
  const generalTags = validTags.filter((t) => !isSeasonalTag(t) && !isDisabilityTag(t));

  const handleSaveEdit = async () => {
    if (busy || !shownFlag) return;
    setBusy(true);
    try {
      const patch: FlagContentPatch = {
        description: editDesc.trim() || null,
        category: editCategory,
        severity: editSeverity,
      };
      const updated = await updateFlagContent(shownFlag.id, patch);
      setShownFlag(updated);
      setIsEditing(false);
    } catch (e) {
      Alert.alert('Could not save changes', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const runStatusChange = async (next: FlagStatus, action: DetailAction) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await updateFlagStatus(shownFlag.id, next);
      onChanged(updated, action, isOwn);
      onClose();
    } catch (e) {
      Alert.alert('Could not update flag', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // Share the flag. The message is built by the pure `formatFlagShareText`
  // helper (src/lib/shareFlag.ts) so the exact shape is unit-tested and
  // reusable from anywhere else we want a human-readable summary of a flag
  // (Tasks list, notifications, etc.).
  //
  // Platform branch — RN Web's Share.share rejects on Firefox desktop and
  // older Safari, so on web we go through navigator.share (mobile + Safari),
  // then navigator.clipboard.writeText, then a final window.alert so the
  // user always has SOMETHING they can act on. On native we use the OS
  // share sheet via Share.share.
  //
  // A user-cancel throws (RN + Web Share API convention); we swallow it so
  // the action feels silent. Real errors still surface as an alert.
  const handleShare = async () => {
    if (busy) return;
    const message = formatFlagShareText(shownFlag, (cat) => CATEGORY_LABELS[cat]);

    if (Platform.OS === 'web') {
      try {
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        // navigator.share isn't on every browser (Firefox desktop, older
        // Safari). Fall back to writing to the clipboard so the user
        // always has SOMETHING they can paste.
        if (nav && typeof (nav as Navigator).share === 'function') {
          await (nav as Navigator).share({ text: message });
          return;
        }
        if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(message);
          // Alert.alert is a no-op on web — use window.alert so the user
          // actually sees the confirmation.
          if (typeof window !== 'undefined' && typeof window.alert === 'function') {
            window.alert('Flag details copied to your clipboard.');
          }
          return;
        }
        // No share API and no clipboard — last-ditch: show the text so
        // the user can copy it manually.
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(message);
        }
      } catch (e) {
        const msg = errorMessage(e);
        if (/cancel|dismiss|abort/i.test(msg)) return;
        // Surface real errors via window.alert (Alert.alert is no-op on web).
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(`Couldn't share flag: ${msg}`);
        }
      }
      return;
    }

    // Native: OS share sheet
    try {
      await Share.share({ message });
    } catch (e) {
      const msg = errorMessage(e);
      if (/cancel|dismiss/i.test(msg)) return;
      Alert.alert("Couldn't share flag", msg);
    }
  };

  const handleSubmitComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      await addComment(trimmed);
      setCommentText('');
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert('Could not post comment', errorMessage(e));
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    // confirm() is platform-aware: on web, Alert.alert is a no-op, so we use
    // window.confirm there. On native, it renders the OS alert with a
    // destructive-style confirm button.
    const ok = await confirm(
      'Delete this flag?',
      'This permanently removes your report. This cannot be undone.',
      'Delete',
      true,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteFlag(shownFlag.id);
      onDeleted(shownFlag.id);
      onClose();
    } catch (e) {
      Alert.alert('Could not delete flag', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          {/* accessibilityViewIsModal: tells iOS VoiceOver that everything
            outside this card is non-interactive — important because we
            render the lightbox as a sibling Modal (Android-stable pattern),
            and without this prop the focus could leak to Verify/Resolve
            buttons that are visually obscured. QA Pass-2 #2. */}
          <View style={styles.card} accessibilityViewIsModal>
            <View style={styles.headerRow}>
              <Text
                style={styles.title}
                accessibilityRole="header"
                accessibilityLabel={`Flag details: ${CATEGORY_LABELS[shownFlag.category]}`}
              >
                {CATEGORY_LABELS[shownFlag.category]}
              </Text>
              <Pressable
                onPress={onClose}
                disabled={busy}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close flag details"
                accessibilityHint="Returns to the flag list"
                accessibilityState={{ disabled: busy }}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
            >
              <PhotoGallery
                photos={flagPhotos}
                onAddPhoto={isOwn && !busy ? handleAddPhoto : undefined}
                maxPhotos={5}
              />

              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.severityChip,
                    { backgroundColor: severityColor(shownFlag.severity) },
                  ]}
                  accessible
                  accessibilityLabel={severityA11y(shownFlag.severity)}
                >
                  <Text style={styles.severityChipText}>Severity {shownFlag.severity}</Text>
                </View>
                <StatusBadge status={status} accessibilityLabel={statusA11y(status)} />
              </View>

              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.description}>
                {shownFlag.description?.trim() ? shownFlag.description : 'No description provided.'}
              </Text>

              {/* Context + seasonal tags — small chips below the description.
                  Split into two labeled groups so the seasonal "when in the
                  year" angle (W6-5) reads distinctly from general conditions.
                  Each group renders only when it has tags. The chip strip is
                  one accessibility node per group with a comma-joined label so
                  a screen reader reads "Conditions: …" / "Seasonal: …" once
                  rather than chip-by-chip. */}
              {[
                { key: 'conditions', heading: 'Conditions', tags: generalTags },
                { key: 'seasonal', heading: 'Seasonal', tags: seasonalTags },
                { key: 'disability', heading: 'Who this affects', tags: disabilityTags },
              ].map(({ key, heading, tags }) =>
                tags.length > 0 ? (
                  <React.Fragment key={key}>
                    <Text
                      style={[
                        styles.sectionLabel,
                        key === 'disability' && styles.sectionLabelDisability,
                      ]}
                    >
                      {heading}
                    </Text>
                    <View
                      style={styles.contextTagsRow}
                      accessible
                      accessibilityLabel={`${heading}: ${tags.map((t) => tagLabel(t)).join(', ')}`}
                    >
                      {tags.map((tag) => (
                        <View
                          key={tag}
                          style={[
                            styles.contextChip,
                            key === 'disability' && styles.disabilityChip,
                          ]}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        >
                          <Text
                            style={[
                              styles.contextChipText,
                              key === 'disability' && styles.disabilityChipText,
                            ]}
                          >
                            {tagLabel(tag)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </React.Fragment>
                ) : null,
              )}

              <Text style={styles.sectionLabel}>Reported by</Text>
              <Text style={styles.metaValue}>{isOwn ? 'You' : 'Another community member'}</Text>

              <Text style={styles.sectionLabel}>Date</Text>
              <Text style={styles.metaValue} accessibilityLabel={`Reported on ${formattedDate}`}>
                {formattedDate}
              </Text>

              <Text style={styles.sectionLabel}>Location</Text>
              {/* Row: selectable coords + copy button. selectable lets users
                long-press to get the native "Copy" context menu — the copy
                button triggers Share.share for a one-tap path on iOS/Android. */}
              <View style={styles.coordsRow}>
                <Text
                  style={[styles.metaValue, styles.coordsText]}
                  accessibilityLabel={coordsA11y}
                  accessibilityHint="Long press to select and copy these coordinates"
                  selectable
                >
                  {formattedCoords}
                </Text>
                <Pressable
                  onPress={() =>
                    Share.share({
                      message: formattedCoords,
                      title: 'Flag coordinates',
                    })
                  }
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.coordsCopyBtn,
                    pressed && styles.coordsCopyBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Copy coordinates"
                  accessibilityHint="Opens share/copy options for these coordinates"
                >
                  <Text style={styles.coordsCopyGlyph}>⧉</Text>
                </Pressable>
              </View>

              {watched !== null && (
                <Pressable
                  onPress={handleToggleWatch}
                  disabled={busy || watchSaving}
                  style={({ pressed }) => [
                    styles.watchBtn,
                    watched && styles.watchBtnActive,
                    pressed && styles.watchBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={watched ? 'Stop watching this flag' : 'Watch this flag'}
                  accessibilityHint={
                    watched
                      ? 'Removes this flag from your Watched list in Profile'
                      : 'Adds this flag to your Watched list in Profile so you can track its status'
                  }
                  accessibilityState={{
                    selected: watched,
                    busy: watchSaving,
                    disabled: busy || watchSaving,
                  }}
                >
                  <Text style={styles.watchBtnGlyph} accessibilityElementsHidden>
                    {watched ? '★' : '☆'}
                  </Text>
                  <Text style={[styles.watchBtnText, watched && styles.watchBtnTextActive]}>
                    {watched ? 'Watching' : 'Watch'}
                  </Text>
                </Pressable>
              )}

              {canEdit && !isEditing && (
                <Pressable
                  onPress={() => setIsEditing(true)}
                  disabled={busy}
                  style={[styles.actionBtn, styles.editBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit this flag"
                  accessibilityHint="Opens an edit form for description, category, and severity"
                  accessibilityState={{ disabled: busy }}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
              )}

              {isEditing && (
                <View style={styles.editForm}>
                  <Text style={styles.editLabel}>Description</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editDesc}
                    onChangeText={setEditDesc}
                    placeholder="Describe the accessibility issue"
                    placeholderTextColor={color.textMuted}
                    multiline
                    // Mirror ReportFlagModal + the DB
                    // flags_description_length_chk constraint (2000).
                    // Was 500 — caused silent truncation when editing a
                    // longer description that was created via the report
                    // flow.
                    maxLength={2000}
                    accessibilityLabel="Flag description"
                    accessibilityHint="Up to 2000 characters."
                  />
                  <Text style={styles.editLabel}>Category</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryRow}
                  >
                    {CATEGORY_ORDER.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => setEditCategory(cat)}
                        style={[
                          styles.categoryChip,
                          editCategory === cat && styles.categoryChipActive,
                        ]}
                        accessibilityRole="radio"
                        accessibilityLabel={CATEGORY_LABELS[cat]}
                        accessibilityState={{ checked: editCategory === cat }}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            editCategory === cat && styles.categoryChipTextActive,
                          ]}
                        >
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={styles.editLabel}>Severity</Text>
                  <View style={styles.severityRow}>
                    {([1, 2, 3, 4, 5] as FlagSeverity[]).map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => setEditSeverity(s)}
                        style={[
                          styles.severityBtn,
                          editSeverity === s && { backgroundColor: severityColor(s) },
                        ]}
                        accessibilityRole="radio"
                        accessibilityLabel={`Severity ${s} of 5`}
                        accessibilityState={{ checked: editSeverity === s }}
                      >
                        <Text
                          style={[
                            styles.severityBtnText,
                            editSeverity === s && styles.severityBtnTextActive,
                          ]}
                        >
                          {s}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.editActions}>
                    <Pressable
                      onPress={() => setIsEditing(false)}
                      disabled={busy}
                      style={[styles.actionBtn, styles.cancelBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel editing"
                      accessibilityState={{ disabled: busy }}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleSaveEdit()}
                      disabled={busy}
                      style={[styles.actionBtn, styles.saveBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="Save changes"
                      accessibilityState={{ busy, disabled: busy }}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={color.textOnBrand} />
                      ) : (
                        <Text style={styles.saveBtnText}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={styles.secondaryRow}>
                <Pressable
                  onPress={() => {
                    onViewOnMap(shownFlag);
                    onClose();
                  }}
                  disabled={busy}
                  style={[styles.actionBtn, styles.viewMapBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="View this flag on the map"
                  accessibilityHint="Switches to the Map tab and centers on this flag"
                  accessibilityState={{ disabled: busy }}
                >
                  <Text style={styles.viewMapBtnText}>View on Map</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    // Pure handoff to the user's preferred maps app via
                    // platform deep link — no on-platform routing. The URL
                    // shape is built by `getDirectionsUrl` (pure, unit-
                    // tested). openURL can reject only in the extremely
                    // rare case where the OS finds no app to handle the
                    // scheme; surface a brief alert so the user isn't
                    // left wondering why nothing happened.
                    const url = getDirectionsUrl(shownFlag.lat, shownFlag.lng);
                    try {
                      await Linking.openURL(url);
                    } catch {
                      Alert.alert("Couldn't open maps", 'No maps app was found on your device.');
                    }
                  }}
                  disabled={busy}
                  style={[styles.actionBtn, styles.directionsBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Get directions to this flag"
                  accessibilityHint="Opens your maps app with directions"
                  accessibilityState={{ disabled: busy }}
                >
                  <Text style={styles.directionsBtnText}>Directions</Text>
                </Pressable>
                <Pressable
                  onPress={handleShare}
                  disabled={busy}
                  style={[styles.actionBtn, styles.shareBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Share this flag"
                  accessibilityHint="Opens the system share sheet"
                  accessibilityState={{ disabled: busy }}
                >
                  <Text style={styles.shareBtnText}>Share</Text>
                </Pressable>
                <Pressable
                  onPress={() => setHistoryOpen(true)}
                  disabled={busy}
                  style={[styles.actionBtn, styles.historyBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="View status history"
                  accessibilityHint="Shows who changed the status of this flag and when"
                  accessibilityState={{ disabled: busy }}
                >
                  <Text style={styles.historyBtnText}>History</Text>
                </Pressable>
              </View>

              {/* ── Comments ─────────────────────────────────────────── */}
              <View style={styles.commentsSection}>
                <Text style={styles.sectionLabel}>Comments</Text>

                {commentsTableNotReady ? (
                  <Text style={styles.commentsSoonText}>Comments aren't available here yet.</Text>
                ) : commentsError ? (
                  <Text style={styles.commentsErrorText}>Couldn't load comments. Check your connection and try again.</Text>
                ) : commentsLoading && comments.length === 0 ? (
                  <ActivityIndicator
                    size="small"
                    color={color.brand}
                    style={styles.commentsSpinner}
                    accessible
                    accessibilityLabel="Loading comments"
                  />
                ) : comments.length === 0 ? (
                  <View style={styles.commentsEmptyContainer}>
                    <Text
                      style={styles.commentsEmptyIcon}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      💬
                    </Text>
                    <Text style={styles.commentsEmptyLabel}>
                      No comments yet — share what you know.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.commentsList} accessibilityRole="list">
                    {comments.map((c) => (
                      <CommentBubble
                        key={c.id}
                        author={c.display_name ?? 'Anonymous'}
                        text={c.content}
                        createdAt={new Date(c.created_at)}
                        isOwn={c.user_id === user?.id}
                        onDelete={
                          c.user_id === user?.id
                            ? () => {
                                void confirm(
                                  'Delete comment?',
                                  'This permanently removes your comment.',
                                  'Delete',
                                  true,
                                ).then((ok) => {
                                  if (!ok) return;
                                  void deleteCommentById(c.id).catch((e: unknown) => {
                                    Alert.alert('Could not delete comment', errorMessage(e));
                                  });
                                });
                              }
                            : undefined
                        }
                      />
                    ))}
                  </View>
                )}

                {!commentsTableNotReady && user && (
                  <View style={styles.commentInputRow}>
                    <TextInput
                      ref={commentInputRef}
                      style={styles.commentInput}
                      value={commentText}
                      onChangeText={setCommentText}
                      placeholder="Add a comment…"
                      placeholderTextColor={color.textMuted}
                      maxLength={MAX_COMMENT_LENGTH}
                      returnKeyType="send"
                      onSubmitEditing={() => void handleSubmitComment()}
                      blurOnSubmit={false}
                      accessibilityLabel="Comment text"
                      accessibilityHint={`Up to ${MAX_COMMENT_LENGTH} characters`}
                    />
                    <Pressable
                      onPress={() => void handleSubmitComment()}
                      disabled={commentSubmitting || commentText.trim().length === 0}
                      style={({ pressed }) => [
                        styles.commentSendBtn,
                        (commentSubmitting || commentText.trim().length === 0) && styles.commentSendBtnDisabled,
                        pressed && styles.commentSendBtnPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Send comment"
                      accessibilityState={{
                        disabled: commentSubmitting || commentText.trim().length === 0,
                        busy: commentSubmitting,
                      }}
                    >
                      {commentSubmitting ? (
                        <ActivityIndicator size="small" color={color.textOnBrand} />
                      ) : (
                        <Text style={styles.commentSendBtnText}>Send</Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.actionRow}>
              {canVerify && (
                <Pressable
                  onPress={() => runStatusChange('verified', 'verify')}
                  disabled={busy}
                  style={[styles.actionBtn, styles.verifyBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Verify this flag"
                  accessibilityHint="Marks this report as confirmed"
                  accessibilityState={{ disabled: busy, busy }}
                >
                  {busy ? (
                    <ActivityIndicator color={color.textOnBrand} />
                  ) : (
                    <Text style={styles.verifyText}>Verify</Text>
                  )}
                </Pressable>
              )}
              {canResolve && (
                <Pressable
                  onPress={() => runStatusChange('resolved', 'resolve')}
                  disabled={busy}
                  style={[styles.actionBtn, styles.resolveBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Mark this flag resolved"
                  accessibilityHint="Marks the accessibility issue as fixed"
                  accessibilityState={{ disabled: busy, busy }}
                >
                  {busy ? (
                    <ActivityIndicator color={color.textOnBrand} />
                  ) : (
                    <Text style={styles.resolveText}>Resolved</Text>
                  )}
                </Pressable>
              )}
              {canReject && (
                <Pressable
                  onPress={() => runStatusChange('rejected', 'reject')}
                  disabled={busy}
                  style={[styles.actionBtn, styles.rejectBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Reject this flag"
                  accessibilityHint="Marks this report as invalid or spam"
                  accessibilityState={{ disabled: busy, busy }}
                >
                  {busy ? (
                    <ActivityIndicator color={color.text} />
                  ) : (
                    <Text style={styles.rejectText}>Reject</Text>
                  )}
                </Pressable>
              )}
              {isOwn && (
                <Pressable
                  onPress={handleDelete}
                  disabled={busy}
                  style={[styles.actionBtn, styles.deleteBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete this flag"
                  accessibilityHint="Permanently removes your report"
                  accessibilityState={{ disabled: busy, busy }}
                >
                  {busy ? (
                    <ActivityIndicator color={color.textOnBrand} />
                  ) : (
                    <Text style={styles.deleteText}>Delete</Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
      <StatusHistoryModal
        visible={historyOpen}
        flagId={shownFlag?.id ?? null}
        onClose={() => setHistoryOpen(false)}
      />
    </>
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
      paddingBottom: spacing.xl,
      gap: spacing.md,
      maxHeight: '90%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    title: { fontSize: font.size.xxl, fontWeight: font.weight.bold, flex: 1, color: color.textStrong },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: { fontSize: font.size.lg, color: color.text, fontWeight: font.weight.bold },
    body: { flexShrink: 1 },
    bodyContent: { gap: spacing.sm, paddingBottom: spacing.tight },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.tight,
    },
    severityChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.circle,
    },
    severityChipText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.xs },
    sectionLabel: {
      fontSize: font.size.xs,
      fontWeight: font.weight.semibold,
      color: color.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.sm,
    },
    description: { fontSize: font.size.md, color: color.textStrong, lineHeight: 21 },
    contextTagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    contextChip: {
      backgroundColor: color.surfaceNeutral,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    contextChipText: {
      fontSize: font.size.xs,
      color: color.textMuted,
      fontWeight: font.weight.medium,
    },
    metaValue: { fontSize: font.size.base, color: color.text },
    coordsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    coordsText: { flex: 1 },
    coordsCopyBtn: {
      padding: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coordsCopyBtnPressed: { opacity: 0.4 },
    // Overlapping-squares glyph — universally understood as "copy"
    coordsCopyGlyph: { fontSize: 16, color: color.brand },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    actionBtn: {
      paddingHorizontal: 14,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      flexGrow: 1,
      minWidth: 100,
    },
    verifyBtn: { backgroundColor: color.brand },
    verifyText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.base },
    resolveBtn: { backgroundColor: color.success },
    resolveText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.base },
    // Reject uses a neutral surface so it reads clearly in dark mode.
    // color.surfaceNeutral adapts to dark (#2a2a2a) automatically.
    rejectBtn: { backgroundColor: color.surfaceNeutral },
    rejectText: { color: color.text, fontWeight: font.weight.bold, fontSize: font.size.base },
    deleteBtn: { backgroundColor: color.errorStrong },
    deleteText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.base },
    viewMapBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: color.brand,
    },
    // Outlined button: blue text on white card. Uses color.brandText
    // (#1c4f99 ≈ 7.6:1) instead of color.brand (#2f80ed ≈ 3.3:1) so it
    // stays AA-safe even if the font size drops below 14pt-bold.
    viewMapBtnText: { color: color.brandText, fontWeight: font.weight.bold, fontSize: font.size.base },
    secondaryRow: {
      flexDirection: 'row',
      // 4 buttons now (View on Map, Directions, Share, History) — wrap so
      // the row stays usable on narrow screens / large text sizes.
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    shareBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: color.brand,
    },
    // Outlined Share button: blue text on white card. Uses color.brandText
    // for AA-safe contrast at any size (see viewMapBtnText note above).
    shareBtnText: { color: color.brandText, fontWeight: font.weight.bold, fontSize: font.size.base },
    // History sits next to Share — same outlined-blue treatment for visual
    // consistency. Uses color.brandText for AA-safe contrast.
    historyBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: color.brand,
    },
    historyBtnText: { color: color.brandText, fontWeight: font.weight.bold, fontSize: font.size.base },
    // Directions sits between View on Map and Share in the secondary row.
    // Filled brand-blue (not outlined) so it reads as the primary action of
    // the trio — getting somewhere is usually what the user wants more than
    // re-centering the map or sharing.
    directionsBtn: { backgroundColor: color.brand },
    directionsBtnText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.base },
    // Watch button — star pill between the location section and secondaryRow.
    // Neutral outline when unset; filled amber when actively watching so the
    // state is unambiguous without relying on the star glyph alone.
    watchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.circle,
      borderWidth: 1.5,
      borderColor: color.borderStrong,
      marginTop: 10,
      minHeight: 44,
      minWidth: 80,
      justifyContent: 'center',
    },
    watchBtnActive: {
      borderColor: color.accentOrange,
      backgroundColor: color.warningBg,
    },
    watchBtnPressed: {
      opacity: 0.7,
    },
    watchBtnGlyph: {
      fontSize: font.size.lg,
      color: color.textSubtle,
    },
    watchBtnText: {
      fontSize: font.size.base,
      fontWeight: font.weight.semibold,
      color: color.text,
    },
    watchBtnTextActive: {
      color: color.warningFg,
    },
    editBtn: { backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.border },
    editBtnText: { color: color.text, fontWeight: font.weight.bold, fontSize: font.size.base },
    editForm: { gap: spacing.md, marginTop: spacing.tight, marginBottom: spacing.sm },
    editLabel: {
      fontSize: font.size.xs,
      fontWeight: font.weight.bold,
      color: color.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    editInput: {
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      fontSize: font.size.base,
      color: color.text,
      backgroundColor: color.surface,
      minHeight: 72,
      textAlignVertical: 'top',
    },
    categoryRow: { flexGrow: 0 },
    categoryChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.circle,
      borderWidth: 1.5,
      borderColor: color.border,
      marginRight: spacing.sm,
      backgroundColor: color.surface,
    },
    // Active chip: filled-brand, matching the MapScreen filter panel pattern.
    categoryChipActive: { borderColor: color.brand, backgroundColor: color.brand },
    categoryChipText: { fontSize: font.size.sm, color: color.text },
    categoryChipTextActive: { color: color.textOnBrand, fontWeight: font.weight.bold },
    severityRow: { flexDirection: 'row', gap: spacing.sm },
    severityBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: color.border,
      backgroundColor: color.surface,
    },
    severityBtnText: { fontSize: font.size.base, fontWeight: font.weight.bold, color: color.text },
    severityBtnTextActive: { color: color.textOnBrand },
    editActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.tight },
    cancelBtn: {
      flex: 1,
      backgroundColor: color.surface,
      borderWidth: 1.5,
      borderColor: color.border,
    },
    cancelBtnText: { color: color.text, fontWeight: font.weight.bold, fontSize: font.size.base },
    saveBtn: { flex: 1, backgroundColor: color.brand },
    saveBtnText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.base },
    // ── Comments ────────────────────────────────────────────────────────────
    commentsSection: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    commentsSoonText: {
      fontSize: font.size.sm,
      color: color.textMuted,
      fontStyle: 'italic',
    },
    commentsErrorText: {
      fontSize: font.size.sm,
      color: color.errorFg,
    },
    commentsSpinner: {
      marginTop: spacing.sm,
      alignSelf: 'center',
    },
    commentsEmptyText: {
      fontSize: font.size.sm,
      color: color.textMuted,
    },
    commentsList: {
      gap: spacing.tight,
      // Negative horizontal margin so CommentBubble's paddingHorizontal
      // from the CommentBubble styles controls the visual inset instead.
      marginHorizontal: -spacing.xl,
    },
    commentInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      marginTop: spacing.sm,
      // Subtle lift off the card surface — reinforces this is an interactive tray.
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.borderSubtle,
    },
    commentInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: color.borderStrong,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: font.size.base,
      color: color.text,
      backgroundColor: color.surfaceSoft,
      minHeight: 40,
      maxHeight: 100,
    },
    commentSendBtn: {
      backgroundColor: color.brand,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      // WCAG 2.5.8 / Apple HIG: 44pt minimum touch target. Was 40.
      minHeight: 44,
      minWidth: 60,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.e1,
    },
    commentSendBtnDisabled: {
      opacity: 0.4,
    },
    commentSendBtnPressed: {
      opacity: 0.75,
    },
    commentSendBtnText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.sm,
    },
    // Disability chip — distinct from general/seasonal: brand-tinted fill so
    // "Who this affects" reads with more visual weight. brandSofter bg with
    // a 1px brand border matches the report form's active tag fill treatment.
    sectionLabelDisability: {
      color: color.brandText,
    },
    disabilityChip: {
      backgroundColor: color.brandSofter,
      borderWidth: 1,
      borderColor: color.brand,
    },
    disabilityChipText: {
      color: color.brandText,
      fontWeight: font.weight.semibold,
    },
    // Comment empty state — centered so the whitespace reads intentionally.
    commentsEmptyContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    commentsEmptyIcon: {
      fontSize: font.size.xxl,
    },
    commentsEmptyLabel: {
      fontSize: font.size.base,
      color: color.textMuted,
      textAlign: 'center',
    },
  });
