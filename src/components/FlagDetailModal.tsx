import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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
  type Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { Star, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, shadow, spacing } from '@/theme';
import { useAuth } from '@/lib/auth';
import { confirm, notify } from '@/lib/confirm';
import { getDirectionsUrl } from '@/lib/directionsLink';
import { errorMessage } from '@/lib/errors';
import { formatFlagShareText } from '@/lib/shareFlag';
import { webShare } from '@/lib/webShare';
import { addWatched, loadWatched, removeWatched } from '@/lib/watchedFlags';
import { recordView } from '@/lib/recentlyViewed';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  deleteFlag,
  FlagStatusConflictError,
  requestFlagReopen,
  severityColor,
  updateFlagContent,
  updateFlagStatus,
  type FlagContentPatch,
} from '@/lib/flags';
import { hasRequestedReopen, recordReopenRequest } from '@/lib/reopenRequests';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import { isDisabilityTag, isSeasonalTag, isValidTag, tagLabel } from '@/lib/contextTags';
import { addFlagPhoto, listFlagPhotos } from '@/lib/photos';
import { MAX_COMMENT_LENGTH } from '@/lib/comments';
import { useComments } from '@/hooks/useComments';
import { getTier } from '@/lib/reputationTier';
import type { FlagCategory, FlagRow, FlagSeverity, FlagStatus } from '@/types/database';
import PhotoGallery, { type GalleryPhoto } from './PhotoGallery';
import StatusHistoryModal from './StatusHistoryModal';
import { StatusBadge } from './StatusBadge';
import { CommentBubble } from './CommentBubble';
import { useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';

export type DetailAction = 'verify' | 'resolve' | 'reject';

interface Props {
  visible: boolean;
  flag: FlagRow | null;
  onClose: () => void;
  // Called after the status changes succeed; isOwn lets the parent show the
  // right "+points" flash banner (reporter vs. actor bonus).
  onChanged: (updated: FlagRow, action: DetailAction, isOwn: boolean) => void;
  onDeleted: (deletedId: string) => void;
  // F58 (re-sweep): fired after a successful content edit (description /
  // category / severity) so the parent can patch the shared store — without
  // it the Tasks card, the map pin color, and a re-opened modal all kept
  // showing pre-edit values and the owner believed the save was lost.
  onEdited?: (updated: FlagRow) => void;
  onViewOnMap: (flag: FlagRow) => void;
}

export default function FlagDetailModal({
  visible,
  flag,
  onClose,
  onChanged,
  onDeleted,
  onEdited,
  onViewOnMap,
}: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
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

  // Reopen request flow — F10 (Riley). Only shown when status === 'resolved'
  // and the current user is NOT the reporter. Tapping opens an inline form;
  // submitting either reopens the flag (threshold met) or shows a "N more
  // needed" message (threshold not yet met). No user_id stored — Jordan gate.
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenText, setReopenText] = useState('');
  const [reopenBusy, setReopenBusy] = useState(false);
  // Inline feedback message after a reopen submit (non-status-change path).
  const [reopenMessage, setReopenMessage] = useState<string | null>(null);

  // Cache the last flag so the slide-out animation still has content to render
  // after the parent clears `flag` on close. Without this the card briefly
  // turns blank as it animates away.
  const [shownFlag, setShownFlag] = useState<FlagRow | null>(flag);

  // WCAG 2.4.3: move the screen-reader cursor onto the title when the modal
  // opens with a flag to show (the early-return path renders no title).
  const titleRef = useFocusOnOpen<Text>(visible && !!shownFlag);

  // Comments — pass shownFlag?.id so the hook tracks the currently-visible
  // flag even while the parent is animating the next one in.
  const {
    comments,
    loading: commentsLoading,
    error: commentsError,
    tableNotReady: commentsTableNotReady,
    addComment,
    deleteComment: deleteCommentById,
    refetch: refetchComments,
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

  // Reset reopen form state + the comment draft whenever the modal closes or a
  // different flag is shown. F16: without clearing commentText on a flag swap,
  // a draft typed for flag A could be submitted against flag B (the modal is
  // never unmounted — the parent toggles `visible` and swaps the flag prop).
  useEffect(() => {
    if (!visible) {
      setShowReopenForm(false);
      setReopenText('');
      setReopenMessage(null);
      setCommentText('');
      setCommentSubmitting(false);
    }
  }, [visible]);
  useEffect(() => {
    setShowReopenForm(false);
    setReopenText('');
    setReopenMessage(null);
    setCommentText('');
    setCommentSubmitting(false);
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
    } catch (e) {
      // F43: a failed save means the Watch/Unwatch did NOT stick — say so
      // (per the user-data write tier in CLAUDE.md). State was only flipped
      // after a successful save, so no rollback is needed here.
      notify("Couldn't update your watched list", errorMessage(e));
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
      // F25: clean up the DOM element and the blob URL on every exit path —
      // previously each tap left a hidden <input> in the DOM and an
      // unreleased Blob URL, accumulating for the page session.
      const cleanup = () => {
        input.remove();
      };
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          cleanup();
          return;
        }
        const localUri = URL.createObjectURL(file);
        try {
          await addFlagPhoto(shownFlag.id, localUri);
          const updated = await listFlagPhotos(shownFlag.id);
          setFlagPhotos(updated);
        } catch (e) {
          // F46: this is the WEB branch — Alert.alert is a no-op here, which
          // made a failed (e.g. fail-closed HEIC) upload a silent dead-end.
          notify('Could not upload photo', errorMessage(e));
        } finally {
          URL.revokeObjectURL(localUri);
          cleanup();
        }
      };
      // Fired when the user dismisses the file picker without choosing — without
      // this the hidden input would linger in the DOM (modern browsers only;
      // a no-op elsewhere, which is still no worse than before).
      input.oncancel = cleanup;
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

  // UX #5 — Before/after resolution photos (presentation only). Mirrors the
  // gallery's own add-photo gating (PhotoGallery shows its add sentinel only
  // when onAddPhoto is provided, which is `isOwn && !busy` below). The tip and
  // the add button reuse that exact same handleAddPhoto handler + addFlagPhoto
  // path — no new upload route, no schema/RLS/storage change. The before/after
  // is purely display labels + a recency heuristic over the existing photos.
  const isResolved = status === 'resolved';
  const canAddPhoto = isOwn && !busy;
  // "After" = the most-recent extra photo. flagPhotos is ordered ascending by
  // position (listFlagPhotos), so the last entry is the highest position — the
  // "last photo = the resolution" heuristic.
  const originalPhotoUrl = shownFlag.photo_url?.trim() ? shownFlag.photo_url : null;
  const afterPhoto = flagPhotos.length > 0 ? flagPhotos[flagPhotos.length - 1] : null;
  const showBeforeAfter = isResolved && !!originalPhotoUrl && afterPhoto !== null;

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
      onEdited?.(updated); // F58: propagate to the shared store/list
      setIsEditing(false);
    } catch (e) {
      notify('Could not save changes', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const runStatusChange = async (next: FlagStatus, action: DetailAction) => {
    if (busy) return;
    setBusy(true);
    try {
      // F53: compare-and-set against the status THIS modal is showing — a
      // stale snapshot must not silently overwrite a concurrent change
      // (e.g. reverting another user's resolution to 'verified').
      const updated = await updateFlagStatus(shownFlag.id, next, shownFlag.status);
      onChanged(updated, action, isOwn);
      // A11y: the modal closes on success (visual confirmation for sighted
      // users). Announce the outcome too so VoiceOver/TalkBack users hear it —
      // mirrors the comment-post / reopen announcements already in this file.
      AccessibilityInfo.announceForAccessibility(
        next === 'verified'
          ? 'Flag marked verified'
          : next === 'resolved'
            ? 'Flag marked resolved'
            : 'Flag rejected',
      );
      onClose();
    } catch (e) {
      if (e instanceof FlagStatusConflictError) {
        notify(
          'This flag changed',
          'It was updated (or removed) while you had it open — closing so you can see the latest.',
        );
        // F64: don't strand the user on a stale snapshot with live buttons.
        onClose();
      } else {
        notify('Could not update flag', errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  // Reject is destructive (marks the report invalid + removes it from the
  // queue), so gate it behind a confirm — same tier as Delete above and the
  // Tasks card. confirm() is web-safe (window.confirm on web).
  const handleReject = async () => {
    if (busy) return;
    const ok = await confirm(
      'Reject this flag?',
      'This marks the report as invalid or spam and removes it from the queue.',
      'Reject',
      true,
    );
    if (!ok) return;
    await runStatusChange('rejected', 'reject');
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

  // L2 (re-sweep): the coords copy button used a bare inline Share.share —
  // on web browsers without the Web Share API (Firefox desktop) that's an
  // unhandled promise rejection and the button silently does nothing. Web
  // now routes through the tested webShare helper (navigator.share →
  // clipboard), with a last-ditch window.alert showing the coords so the
  // button always does SOMETHING. Native mirrors handleShare's try/catch
  // (user-cancel stays silent; real errors surface).
  const handleCopyCoords = async () => {
    if (Platform.OS === 'web') {
      try {
        // webShare's contract: `true` = shared or copied; `false` + share API
        // present = user cancelled; `false` + no share API = clipboard
        // failed/unavailable. Capture availability BEFORE the call so we can
        // tell those apart.
        const shareAvailable =
          typeof navigator !== 'undefined' &&
          typeof (navigator as Navigator).share === 'function';
        const ok = await webShare({ title: 'Flag coordinates', text: formattedCoords });
        if (ok) {
          // The clipboard path has no UI of its own — confirm so the user
          // knows the tap landed. (navigator.share shows its own sheet.)
          if (!shareAvailable && typeof window !== 'undefined' && typeof window.alert === 'function') {
            window.alert('Coordinates copied to your clipboard.');
          }
          return;
        }
        // Share API existed and returned false → user cancelled. Stay silent.
        if (shareAvailable) return;
        // No share API and the clipboard write failed — show the coords so
        // the user can copy them manually.
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(formattedCoords);
        }
      } catch (e) {
        const msg = errorMessage(e);
        if (/cancel|dismiss|abort/i.test(msg)) return;
        // Alert.alert is a no-op on web — use window.alert for real errors.
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(`Couldn't copy coordinates: ${msg}`);
        }
      }
      return;
    }

    // Native: OS share sheet — mirrors handleShare (user-cancel is silent).
    try {
      await Share.share({ message: formattedCoords, title: 'Flag coordinates' });
    } catch (e) {
      const msg = errorMessage(e);
      if (/cancel|dismiss/i.test(msg)) return;
      Alert.alert("Couldn't copy coordinates", msg);
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
      // WCAG 4.1.3: the new comment bubble appears silently for screen-reader
      // users — announce so they know the post landed.
      AccessibilityInfo.announceForAccessibility('Comment posted');
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

  // F10 — Reopen threshold logic.
  // Threshold by reputation tier (Quinn product decision):
  //   Bronze (default) = 3 reopen requests needed
  //   Silver           = 2
  //   Gold / Platinum  = 1
  //
  // TODO: once Dana's migration (flag_reopen_count on flags table + flag_reopen_log
  //       for session-level dedup) is applied, replace the `(shownFlag as any)`
  //       pattern below with the typed column. The `any` cast is intentional
  //       scaffolding until the migration lands. (F10 scaffolding — Wave C)
  const handleReopenSubmit = async () => {
    if (!user || !shownFlag || reopenBusy) return;
    const text = reopenText.trim();
    if (!text) {
      Alert.alert('Description required', 'Please describe what is still wrong (up to 280 characters).');
      return;
    }
    setReopenBusy(true);
    try {
      // Threshold by reputation tier. getTier(null) currently always resolves
      // to Bronze because public.users.points isn't threaded into this
      // component yet — the conservative (highest) threshold, which is the safe
      // default. Threading real points (so Gold/Platinum get the 1-vote path)
      // is a proposed refinement — see DECISIONS FOR SKY in the deep audit.
      const tier = getTier(null);
      const threshold =
        tier.name === 'gold' || tier.name === 'platinum' ? 1
        : tier.name === 'silver' ? 2
        : 3; // bronze (default)

      // Per-device dedup (F8): the server stores no user_id, so without this a
      // single user could reopen any flag by voting repeatedly. One vote per
      // flag per user on this device.
      if (await hasRequestedReopen(user.id, shownFlag.id)) {
        const msg = "You've already requested a reopen for this flag.";
        setReopenMessage(msg);
        AccessibilityInfo.announceForAccessibility(msg);
        setShowReopenForm(false);
        setReopenText('');
        return;
      }

      // Persist the vote and get the authoritative running count (F8: this was
      // never wired before — the count was computed locally from an undefined
      // field, so it never advanced and the flag could never reopen).
      const newCount = await requestFlagReopen(shownFlag.id);
      if (newCount === null) {
        // RPC unavailable on this backend (migration not applied) — be honest
        // rather than show a fake running tally.
        const msg = 'Thanks — your reopen request was sent for review.';
        setReopenMessage(msg);
        AccessibilityInfo.announceForAccessibility(msg);
        setShowReopenForm(false);
        setReopenText('');
        return;
      }
      if (newCount === 0) {
        // F37 (re-sweep): the RPC only increments while the flag is still
        // 'resolved' — 0 means the server DISCARDED the vote (someone reopened
        // or changed the flag while this modal showed a stale snapshot).
        // Don't record the per-device dedup (that would silently burn this
        // device's one vote on a no-op), and don't claim "request noted".
        const msg =
          'This flag changed while you had it open, so a reopen request is no longer needed. Close and reopen it to see the latest.';
        setReopenMessage(msg);
        AccessibilityInfo.announceForAccessibility(msg);
        setShowReopenForm(false);
        setReopenText('');
        return;
      }
      await recordReopenRequest(user.id, shownFlag.id);

      if (newCount >= threshold) {
        // Threshold met — reopen the flag.
        const updated = await updateFlagStatus(shownFlag.id, 'open', 'resolved');
        onChanged(updated, 'verify', isOwn);
        onClose();
      } else {
        // Not yet — show inline message, keep modal open.
        const remaining = Math.max(1, threshold - newCount);
        const noted = `Reopen request noted. ${remaining} more ${remaining === 1 ? 'request' : 'requests'} needed.`;
        setReopenMessage(noted);
        // WCAG 4.1.3: the inline confirmation is otherwise silent for AT users.
        AccessibilityInfo.announceForAccessibility(noted);
        setShowReopenForm(false);
        setReopenText('');
      }
    } catch (e) {
      // F64 (second sweep): when two deciding reopen votes race, the CAS
      // loser's vote DID count and the flag IS being reopened — a hard
      // 'could not submit' error is wrong (and Alert.alert renders nothing on
      // web). Treat the conflict as benign and close so the user re-opens
      // fresh state.
      if (e instanceof FlagStatusConflictError) {
        notify('Flag updated', 'This flag was just reopened or changed — your request was counted.');
        onClose();
      } else {
        notify('Could not submit reopen request', errorMessage(e));
      }
    } finally {
      setReopenBusy(false);
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
          <View style={[styles.card, { paddingBottom: Math.max(spacing.xl, insets.bottom) }]} accessibilityViewIsModal>
            <View style={styles.headerRow}>
              <AppText
                ref={titleRef}
                variant="heading"
                style={styles.title}
                accessibilityRole="header"
                accessibilityLabel={`Flag details: ${CATEGORY_LABELS[shownFlag.category]}`}
              >
                {CATEGORY_LABELS[shownFlag.category]}
              </AppText>
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
                <X size={18} color={color.text} strokeWidth={2.2} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* UX #5 — Before/after framing. Only when the flag is resolved
                  AND has both an original report photo and ≥1 extra photo. The
                  full PhotoGallery (all community photos) still renders below —
                  this is an additional labeled pair, not a replacement. */}
              {showBeforeAfter && originalPhotoUrl && afterPhoto && (
                <View
                  style={styles.beforeAfterRow}
                  accessibilityRole="summary"
                  accessibilityLabel="Before and after the fix"
                >
                  <View style={styles.beforeAfterItem}>
                    <AppText variant="label" style={styles.beforeAfterCaption}>Before</AppText>
                    <RemoteImage
                      uri={originalPhotoUrl}
                      style={styles.beforeAfterImage}
                      resizeMode="cover"
                      accessibilityLabel="Before: the originally reported barrier"
                    />
                  </View>
                  <View
                    style={styles.beforeAfterArrow}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    <AppText variant="label" style={styles.beforeAfterArrowGlyph}>→</AppText>
                  </View>
                  <View style={styles.beforeAfterItem}>
                    <AppText variant="label" style={styles.beforeAfterCaption}>After — the fix</AppText>
                    <RemoteImage
                      uri={afterPhoto.url}
                      style={styles.beforeAfterImage}
                      resizeMode="cover"
                      accessibilityLabel="After: the resolved fix"
                    />
                  </View>
                </View>
              )}

              {/* UX #5 — Resolve-time nudge. A gentle info-toned tip (not a
                  warning) inviting the owner to add an "after" photo so others
                  can see the barrier was fixed. The button reuses the SAME
                  handleAddPhoto handler the gallery's add sentinel uses — no new
                  upload path. Shown only when resolved AND the user could add a
                  photo (mirrors the gallery's onAddPhoto gating). */}
              {isResolved && canAddPhoto && (
                <View
                  style={styles.afterTip}
                  accessible
                  accessibilityLabel="Show the fix — add an after photo so others can see this barrier was resolved"
                >
                  <AppText variant="body" style={styles.afterTipText}>
                    Show the fix — add an &ldquo;after&rdquo; photo so others can see this barrier was resolved.
                  </AppText>
                  <Pressable
                    onPress={handleAddPhoto}
                    style={({ pressed }) => [styles.afterTipBtn, pressed && styles.afterTipBtnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Add an after photo"
                    accessibilityHint="Opens the camera or photo library to attach a photo of the fix"
                  >
                    <AppText variant="label" style={styles.afterTipBtnText}>Add after photo</AppText>
                  </Pressable>
                </View>
              )}

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
                  <AppText variant="label" style={styles.severityChipText}>Severity {shownFlag.severity}</AppText>
                </View>
                <StatusBadge status={status} accessibilityLabel={statusA11y(status)} />
              </View>

              <AppText variant="label" style={styles.sectionLabel}>Description</AppText>
              <AppText variant="body" style={styles.description}>
                {shownFlag.description?.trim() ? shownFlag.description : 'No description provided.'}
              </AppText>

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
                    <AppText
                      variant="label"
                      style={[
                        styles.sectionLabel,
                        key === 'disability' && styles.sectionLabelDisability,
                      ]}
                    >
                      {heading}
                    </AppText>
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
                          <AppText
                            variant="label"
                            style={[
                              styles.contextChipText,
                              key === 'disability' && styles.disabilityChipText,
                            ]}
                          >
                            {tagLabel(tag)}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </React.Fragment>
                ) : null,
              )}

              <AppText variant="label" style={styles.sectionLabel}>Reported by</AppText>
              {shownFlag.user_id === null ? (
                <View
                  accessible
                  accessibilityLabel="Reported anonymously"
                  style={styles.anonBadge}
                >
                  <AppText
                    variant="label"
                    style={styles.anonBadgeText}
                    importantForAccessibility="no"
                    accessibilityElementsHidden
                  >
                    Anonymous
                  </AppText>
                </View>
              ) : (
                <AppText variant="body" style={styles.metaValue}>
                  {isOwn ? 'You' : 'Another community member'}
                </AppText>
              )}

              <AppText variant="label" style={styles.sectionLabel}>Date</AppText>
              <AppText variant="body" style={styles.metaValue} accessibilityLabel={`Reported on ${formattedDate}`}>
                {formattedDate}
              </AppText>

              <AppText variant="label" style={styles.sectionLabel}>Location</AppText>
              {/* Row: selectable coords + copy button. selectable lets users
                long-press to get the native "Copy" context menu — the copy
                button goes through handleCopyCoords: OS share sheet on
                iOS/Android, webShare → clipboard → alert fallback on web (L2). */}
              <View style={styles.coordsRow}>
                <AppText
                  variant="mono"
                  style={[styles.metaValue, styles.coordsText]}
                  accessibilityLabel={coordsA11y}
                  accessibilityHint="Long press to select and copy these coordinates"
                  selectable
                >
                  {formattedCoords}
                </AppText>
                <Pressable
                  onPress={handleCopyCoords}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.coordsCopyBtn,
                    pressed && styles.coordsCopyBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Copy coordinates"
                  accessibilityHint="Opens share/copy options for these coordinates"
                >
                  <AppText variant="label" style={styles.coordsCopyGlyph}>⧉</AppText>
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
                  <Star
                    size={16}
                    color={color.accentOrange}
                    fill={watched ? color.accentOrange : 'none'}
                    strokeWidth={2.2}
                    accessibilityElementsHidden
                  />
                  <AppText variant="label" style={[styles.watchBtnText, watched && styles.watchBtnTextActive]}>
                    {watched ? 'Watching' : 'Watch'}
                  </AppText>
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
                  <AppText variant="label" style={styles.editBtnText}>Edit</AppText>
                </Pressable>
              )}

              {isEditing && (
                <View style={styles.editForm}>
                  <AppText variant="label" style={styles.editLabel}>Description</AppText>
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
                  <AppText variant="label" style={styles.editLabel}>Category</AppText>
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
                        <AppText
                          variant="label"
                          style={[
                            styles.categoryChipText,
                            editCategory === cat && styles.categoryChipTextActive,
                          ]}
                        >
                          {CATEGORY_LABELS[cat]}
                        </AppText>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <AppText variant="label" style={styles.editLabel}>Severity</AppText>
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
                        <AppText
                          variant="monoBold"
                          style={[
                            styles.severityBtnText,
                            editSeverity === s && styles.severityBtnTextActive,
                          ]}
                        >
                          {s}
                        </AppText>
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
                      <AppText variant="label" style={styles.cancelBtnText}>Cancel</AppText>
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
                        <AppText variant="label" style={styles.saveBtnText}>Save</AppText>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* F10 — Reopen request. Only shown when status is 'resolved'
                  and the current user is NOT the reporter. Jordan gate: no
                  user_id is stored — only an anonymous aggregate count. */}
              {status === 'resolved' && !isOwn && (
                <>
                  {reopenMessage !== null && (
                    <AppText variant="body" style={styles.reopenMessage}>{reopenMessage}</AppText>
                  )}
                  {!showReopenForm && reopenMessage === null && (
                    <Pressable
                      onPress={() => setShowReopenForm(true)}
                      disabled={busy}
                      style={[styles.actionBtn, styles.reopenBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="Request flag reopen"
                      accessibilityHint="Opens a form to explain why this barrier is still present"
                      accessibilityState={{ disabled: busy }}
                    >
                      <AppText variant="label" style={styles.reopenBtnText}>Still broken? Request reopen</AppText>
                    </Pressable>
                  )}
                  {showReopenForm && (
                    <View style={styles.reopenForm}>
                      <AppText variant="label" style={styles.reopenFormLabel}>What&apos;s still wrong?</AppText>
                      <TextInput
                        value={reopenText}
                        onChangeText={setReopenText}
                        placeholder="Describe why this barrier is still present…"
                        placeholderTextColor={color.textMuted}
                        multiline
                        maxLength={280}
                        style={styles.reopenInput}
                        accessibilityLabel="Reopen request description"
                        accessibilityHint="Up to 280 characters. Required."
                      />
                      {reopenText.length > 0 && (
                        <AppText variant="mono" style={styles.reopenCharCounter}>
                          {reopenText.length} / 280
                        </AppText>
                      )}
                      <View style={styles.reopenActions}>
                        <Pressable
                          onPress={() => {
                            setShowReopenForm(false);
                            setReopenText('');
                          }}
                          disabled={reopenBusy}
                          style={[styles.actionBtn, styles.cancelBtn]}
                          accessibilityRole="button"
                          accessibilityLabel="Cancel reopen request"
                          accessibilityState={{ disabled: reopenBusy }}
                        >
                          <AppText variant="label" style={styles.cancelBtnText}>Cancel</AppText>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleReopenSubmit()}
                          disabled={reopenBusy || !reopenText.trim()}
                          style={[
                            styles.actionBtn,
                            styles.reopenSubmitBtn,
                            (reopenBusy || !reopenText.trim()) && styles.reopenSubmitBtnDisabled,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Submit reopen request"
                          accessibilityState={{ busy: reopenBusy, disabled: reopenBusy || !reopenText.trim() }}
                        >
                          {reopenBusy ? (
                            <ActivityIndicator size="small" color={color.textOnBrand} />
                          ) : (
                            <AppText variant="label" style={styles.reopenSubmitText}>Submit reopen request</AppText>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  )}
                </>
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
                  <AppText variant="label" style={styles.viewMapBtnText}>View on Map</AppText>
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
                  <AppText variant="label" style={styles.directionsBtnText}>Directions</AppText>
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
                  <AppText variant="label" style={styles.shareBtnText}>Share</AppText>
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
                  <AppText variant="label" style={styles.historyBtnText}>History</AppText>
                </Pressable>
              </View>

              {/* ── Comments ─────────────────────────────────────────── */}
              <View style={styles.commentsSection}>
                <AppText variant="label" style={styles.sectionLabel}>Comments</AppText>

                {commentsTableNotReady ? (
                  <AppText variant="body" style={styles.commentsSoonText}>Comments aren&apos;t available here yet.</AppText>
                ) : commentsError && comments.length === 0 ? (
                  // M1: full error state ONLY when there is nothing to show.
                  <View style={styles.commentsErrorBanner}>
                    <AppText variant="body" style={styles.commentsErrorText}>Couldn&apos;t load comments. Check your connection and try again.</AppText>
                    <Pressable
                      onPress={() => void refetchComments()}
                      style={styles.commentsRetryBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Retry loading comments"
                    >
                      <AppText variant="label" style={styles.commentsRetryText}>Retry</AppText>
                    </Pressable>
                  </View>
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
                    <AppText
                      variant="body"
                      style={styles.commentsEmptyIcon}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      💬
                    </AppText>
                    <AppText variant="body" style={styles.commentsEmptyLabel}>
                      No comments yet — share what you know.
                    </AppText>
                  </View>
                ) : (
                  <>
                    {/* M1: a refetch failure must NOT wipe the loaded thread —
                        keep the comments visible and show a non-destructive
                        banner with a Retry instead. */}
                    {commentsError ? (
                      <View style={styles.commentsErrorBanner}>
                        <AppText variant="body" style={styles.commentsErrorText}>Couldn&apos;t refresh comments.</AppText>
                        <Pressable
                          onPress={() => void refetchComments()}
                          style={styles.commentsRetryBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Retry refreshing comments"
                        >
                          <AppText variant="label" style={styles.commentsRetryText}>Retry</AppText>
                        </Pressable>
                      </View>
                    ) : null}
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
                                    void deleteCommentById(c.id)
                                      // WCAG 4.1.3: the bubble vanishes silently otherwise.
                                      .then(() =>
                                        AccessibilityInfo.announceForAccessibility('Comment deleted'),
                                      )
                                      .catch((e: unknown) => {
                                        Alert.alert('Could not delete comment', errorMessage(e));
                                      });
                                  });
                                }
                              : undefined
                          }
                        />
                      ))}
                    </View>
                  </>
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
                        <AppText variant="label" style={styles.commentSendBtnText}>Send</AppText>
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
                    <AppText variant="label" style={styles.verifyText}>Verify</AppText>
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
                    <AppText variant="label" style={styles.resolveText}>Resolved</AppText>
                  )}
                </Pressable>
              )}
              {canReject && (
                <Pressable
                  onPress={handleReject}
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
                    <AppText variant="label" style={styles.rejectText}>Reject</AppText>
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
                    <AppText variant="label" style={styles.deleteText}>Delete</AppText>
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
      backgroundColor: color.scrim,
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
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: { fontSize: font.size.lg, color: color.text, fontWeight: font.weight.bold },
    body: { flexShrink: 1 },
    bodyContent: { gap: spacing.sm, paddingBottom: spacing.tight },
    // ── UX #5 Before/after resolution photos ─────────────────────────────────
    beforeAfterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.tight,
    },
    beforeAfterItem: {
      flex: 1,
      gap: spacing.tight,
    },
    beforeAfterCaption: {
      fontSize: font.size.xs,
      fontWeight: font.weight.semibold,
      color: color.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    beforeAfterImage: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: radius.lg,
      backgroundColor: color.surfaceNeutral,
    },
    beforeAfterArrow: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: spacing.lg,
    },
    beforeAfterArrowGlyph: {
      fontSize: font.size.xl,
      color: color.textMuted,
      fontWeight: font.weight.bold,
    },
    // Resolve-time nudge — info-toned (NOT warning amber). infoFg on infoBg
    // clears AA at any size (see theme tokens).
    afterTip: {
      backgroundColor: color.infoBg,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      marginTop: spacing.tight,
    },
    afterTipText: {
      fontSize: font.size.sm,
      color: color.infoFg,
      lineHeight: 19,
    },
    afterTipBtn: {
      alignSelf: 'flex-start',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: color.infoFg,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: spacing.sm,
      minHeight: 44,
      minWidth: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    afterTipBtnPressed: { opacity: 0.7 },
    afterTipBtnText: {
      color: color.infoFg,
      fontWeight: font.weight.bold,
      fontSize: font.size.base,
    },
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
    anonBadge: {
      alignSelf: 'flex-start',
      backgroundColor: color.textMuted,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    anonBadgeText: {
      fontSize: 12,
      color: color.textOnBrand,
      fontWeight: '600',
    },
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
    // (#1c4f99 ≈ 7.6:1) instead of color.brand (#1466E0 ≈ 3.3:1) so it
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
    categoryRow: { flexGrow: 0, flexShrink: 0 },
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
    // M1: error banner + Retry, matching the MyReportsModal errorBanner pattern.
    commentsErrorBanner: {
      backgroundColor: color.errorBg,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    commentsErrorText: {
      flex: 1,
      fontSize: font.size.sm,
      color: color.errorFg,
    },
    commentsRetryBtn: {
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
      backgroundColor: color.error,
      minHeight: 44,
      justifyContent: 'center',
    },
    commentsRetryText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.sm,
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
      marginHorizontal: -spacing.xl,
    },
    commentInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      marginTop: spacing.sm,
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
    // ── F10 Reopen request ───────────────────────────────────────────────────
    reopenBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: color.accentOrange,
    },
    reopenBtnText: {
      color: color.accentOrange,
      fontWeight: font.weight.semibold,
      fontSize: font.size.base,
    },
    reopenMessage: {
      fontSize: font.size.sm,
      color: color.textMuted,
      lineHeight: 18,
      fontStyle: 'italic',
      marginTop: spacing.xs,
    },
    reopenForm: {
      gap: spacing.sm,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    reopenFormLabel: {
      fontSize: font.size.xs,
      fontWeight: font.weight.bold,
      color: color.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    reopenInput: {
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: radius.lg,
      padding: spacing.sm,
      fontSize: font.size.base,
      color: color.text,
      backgroundColor: color.surface,
      minHeight: 72,
      textAlignVertical: 'top',
    },
    reopenCharCounter: {
      fontSize: font.size.xs,
      color: color.textSubtle,
      textAlign: 'right',
    },
    reopenActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    reopenSubmitBtn: {
      flex: 2,
      backgroundColor: color.accentOrange,
    },
    reopenSubmitBtnDisabled: {
      opacity: 0.5,
    },
    reopenSubmitText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.sm,
    },
  });
