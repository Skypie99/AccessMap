import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { CATEGORY_LABELS, deleteFlag, updateFlagStatus } from '@/lib/flags';
import type { FlagRow, FlagStatus } from '@/types/database';
import { severityColor } from '@/screens/ReportFlagModal';

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

const STATUS_LABEL: Record<FlagStatus, string> = {
  open: 'Open',
  verified: 'Verified',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

// Badge palettes are tinted backgrounds with darker foreground text so the
// foreground/background contrast stays above WCAG AA 4.5:1.
const STATUS_COLORS: Record<FlagStatus, { bg: string; fg: string }> = {
  open: { bg: '#fdebd0', fg: '#8a4b00' },
  verified: { bg: '#d6e6f9', fg: '#1c4f99' },
  resolved: { bg: '#d4ecdb', fg: '#1b6b34' },
  rejected: { bg: '#e5e5e5', fg: '#3a3a3a' },
};

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

  // Cache the last flag so the slide-out animation still has content to render
  // after the parent clears `flag` on close. Without this the card briefly
  // turns blank as it animates away.
  const [shownFlag, setShownFlag] = useState<FlagRow | null>(flag);
  useEffect(() => {
    if (flag) setShownFlag(flag);
  }, [flag]);

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
    } catch (e: any) {
      Alert.alert('Could not update flag', e?.message ?? 'Unknown error.');
    } finally {
      setBusy(false);
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
            } catch (e: any) {
              Alert.alert('Could not delete flag', e?.message ?? 'Unknown error.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
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
              <Image
                source={{ uri: shownFlag.photo_url }}
                style={styles.photo}
                resizeMode="cover"
                accessible
                accessibilityLabel={`Photo of the reported ${CATEGORY_LABELS[shownFlag.category]}`}
              />
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
                accessibilityLabel={`Status: ${STATUS_LABEL[status]}`}
              >
                <Text style={[styles.statusBadgeText, { color: statusPalette.fg }]}>
                  {STATUS_LABEL[status]}
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
            <Text style={styles.metaValue} accessibilityLabel={coordsA11y}>
              {formattedCoords}
            </Text>

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
  },
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
    marginTop: 8,
  },
  viewMapBtnText: { color: '#2f80ed', fontWeight: '700', fontSize: 14 },
});
