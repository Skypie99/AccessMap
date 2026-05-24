import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { openDirections } from '@/lib/directions';
import { errorMessage } from '@/lib/errors';
import { formatFlagShareText } from '@/lib/shareFlag';
import {
  addWatched,
  loadWatched,
  removeWatched,
} from '@/lib/watchedFlags';
import {
  CATEGORY_LABELS,
  deleteFlag,
  severityColor,
  STATUS_COLORS,
  STATUS_LABELS,
  updateFlagStatus,
} from '@/lib/flags';
import type { FlagRow, FlagStatus } from '@/types/database';
import PhotoLightboxModal from './PhotoLightboxModal';

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
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  // Watched state — null while we're loading the per-user list, true/false
  // once known. Hidden button until we know, so we never render a stale
  // "Watch" that flips to "Unwatch" 100ms after the modal opens.
  const [watched, setWatched] = useState<boolean | null>(null);
  const [watchSaving, setWatchSaving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Cache the last flag so the slide-out animation still has content to render
  // after the parent clears `flag` on close. Without this the card briefly
  // turns blank as it animates away.
  const [shownFlag, setShownFlag] = useState<FlagRow | null>(flag);
  useEffect(() => {
    if (flag) setShownFlag(flag);
  }, [flag]);

  // Reset the lightbox whenever the parent modal closes OR the flag swaps.
  // Without this, the sibling lightbox stays mounted with the cached photo
  // and can pop back over the next flag's details (QA Pass-3 #1) — or stick
  // on screen after Verify/Resolve/Delete fired `onClose` while the lightbox
  // was open (QA Pass-1 #2).
  useEffect(() => {
    if (!visible) setLightboxOpen(false);
  }, [visible]);
  useEffect(() => {
    setLightboxOpen(false);
  }, [flag?.id]);

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

  if (!shownFlag) {
    return (
      <Modal visible={false} transparent onRequestClose={onClose} />
    );
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
  const statusPalette = STATUS_COLORS[status];

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

  // Share the flag via the OS share sheet. The message is built by the
  // pure `formatFlagShareText` helper (src/lib/shareFlag.ts) so the exact
  // shape is unit-tested and reusable from anywhere else we want a
  // human-readable summary of a flag (Tasks list, notifications, etc.).
  //
  // A user-cancel on the share sheet throws (RN convention); we swallow
  // it so the action feels silent. Real errors still surface as an alert.
  const handleShare = async () => {
    if (busy) return;
    const message = formatFlagShareText(
      shownFlag,
      (cat) => CATEGORY_LABELS[cat],
    );
    try {
      await Share.share({ message });
    } catch (e) {
      const msg = errorMessage(e);
      if (/cancel|dismiss/i.test(msg)) return;
      Alert.alert("Couldn't share flag", msg);
    }
  };

  const handleDelete = () => {
    if (busy) return;
    Alert.alert(
      'Delete this flag?',
      'This permanently removes your report. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
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
          },
        },
      ],
    );
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
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
            {shownFlag.photo_url ? (
              <Pressable
                onPress={() => setLightboxOpen(true)}
                style={({ pressed }) => [
                  styles.photo,
                  pressed && styles.photoPressed,
                ]}
                accessibilityRole="imagebutton"
                accessibilityLabel={`Photo of the reported ${CATEGORY_LABELS[shownFlag.category]}`}
                accessibilityHint="Tap to view full screen"
              >
                <Image
                  source={{ uri: shownFlag.photo_url }}
                  style={styles.photoInner}
                  resizeMode="cover"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </Pressable>
            ) : (
              <View
                style={[styles.photo, styles.photoPlaceholder]}
                accessible
                accessibilityLabel="No photo available"
              >
                <Text style={styles.photoPlaceholderText}>No photo</Text>
              </View>
            )}

            <View style={styles.metaRow}>
              <View
                style={[
                  styles.severityChip,
                  { backgroundColor: severityColor(shownFlag.severity) },
                ]}
                accessible
                accessibilityLabel={`Severity ${shownFlag.severity} out of 5`}
              >
                <Text style={styles.severityChipText}>
                  Severity {shownFlag.severity}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusPalette.bg },
                ]}
                accessible
                accessibilityLabel={`Status: ${STATUS_LABELS[status]}`}
              >
                <Text style={[styles.statusBadgeText, { color: statusPalette.fg }]}>
                  {STATUS_LABELS[status]}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>
              {shownFlag.description?.trim()
                ? shownFlag.description
                : 'No description provided.'}
            </Text>

            <Text style={styles.sectionLabel}>Reported by</Text>
            <Text style={styles.metaValue}>
              {isOwn ? 'You' : 'Another community member'}
            </Text>

            <Text style={styles.sectionLabel}>Date</Text>
            <Text
              style={styles.metaValue}
              accessibilityLabel={`Reported on ${formattedDate}`}
            >
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
                accessibilityLabel={
                  watched ? 'Stop watching this flag' : 'Watch this flag'
                }
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
                <Text
                  style={styles.watchBtnGlyph}
                  accessibilityElementsHidden
                >
                  {watched ? '★' : '☆'}
                </Text>
                <Text
                  style={[
                    styles.watchBtnText,
                    watched && styles.watchBtnTextActive,
                  ]}
                >
                  {watched ? 'Watching' : 'Watch'}
                </Text>
              </Pressable>
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
                onPress={() =>
                  openDirections(
                    shownFlag.lat,
                    shownFlag.lng,
                    `AccessMap: ${CATEGORY_LABELS[shownFlag.category]}`,
                  )
                }
                disabled={busy}
                style={[styles.actionBtn, styles.directionsBtn]}
                accessibilityRole="button"
                accessibilityLabel="Get walking directions"
                accessibilityHint="Opens your maps app with walking directions to this flag"
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
                  <ActivityIndicator color="#fff" />
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
                  <ActivityIndicator color="#fff" />
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
                  <ActivityIndicator color="#333" />
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
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteText}>Delete</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
    <PhotoLightboxModal
      visible={lightboxOpen}
      photoUrl={shownFlag?.photo_url ?? null}
      caption={
        shownFlag
          ? `${CATEGORY_LABELS[shownFlag.category]} · ${STATUS_LABELS[shownFlag.status]}`
          : undefined
      }
      onClose={() => setLightboxOpen(false)}
    />
    </>
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
    paddingBottom: 20,
    gap: 12,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '700', flex: 1, color: '#222' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef1f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16, color: '#333', fontWeight: '700' },
  body: { flexShrink: 1 },
  bodyContent: { gap: 8, paddingBottom: 4 },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: '#eef1f5',
    overflow: 'hidden',
  },
  photoInner: { width: '100%', height: '100%' },
  photoPressed: { opacity: 0.85 },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: { color: '#666', fontSize: 14, fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  severityChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  severityChipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: { fontWeight: '700', fontSize: 12 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  description: { fontSize: 15, color: '#222', lineHeight: 21 },
  metaValue: { fontSize: 14, color: '#333' },
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
  coordsCopyGlyph: { fontSize: 16, color: '#2f80ed' },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: 100,
  },
  verifyBtn: { backgroundColor: '#2f80ed' },
  verifyText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resolveBtn: { backgroundColor: '#27ae60' },
  resolveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtn: { backgroundColor: '#eef1f5' },
  rejectText: { color: '#333', fontWeight: '700', fontSize: 14 },
  deleteBtn: { backgroundColor: '#e74c3c' },
  deleteText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  viewMapBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2f80ed',
  },
  viewMapBtnText: { color: '#2f80ed', fontWeight: '700', fontSize: 14 },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  shareBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2f80ed',
  },
  shareBtnText: { color: '#2f80ed', fontWeight: '700', fontSize: 14 },
  // Directions sits between View on Map and Share in the secondary row.
  // Filled brand-blue (not outlined) so it reads as the primary action of
  // the trio — getting somewhere is usually what the user wants more than
  // re-centering the map or sharing.
  directionsBtn: { backgroundColor: '#2f80ed' },
  directionsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#bbb',
    marginTop: 10,
  },
  watchBtnActive: {
    borderColor: '#f1a520',
    backgroundColor: '#fff8e7',
  },
  watchBtnPressed: {
    opacity: 0.7,
  },
  watchBtnGlyph: {
    fontSize: 16,
    color: '#888',
  },
  watchBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  watchBtnTextActive: {
    color: '#b07800',
  },
});
