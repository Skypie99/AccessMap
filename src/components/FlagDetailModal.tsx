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
import { GlassSurface } from '@/components/ui/GlassSurface';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { MessageCircle, Star, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, severity, shadow, spacing } from '@/theme';
import { useAuth } from '@/lib/auth';
import { confirm, notify } from '@/lib/confirm';
import { isContentBlockedError, showBlockedContentAlert } from '@/lib/blockedContent';
import { useSharedModals } from '@/lib/sharedModalsContext';
import { getDirectionsUrl } from '@/lib/directionsLink';
import { errorMessage, FEATURE_UNAVAILABLE } from '@/lib/errors';
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
  SEVERITY_DESCRIPTIONS,
  SEVERITY_LABELS,
  severityColor,
  updateFlagContent,
  updateFlagStatus,
  type FlagContentPatch,
} from '@/lib/flags';
import { hasRequestedReopen, recordReopenRequest } from '@/lib/reopenRequests';
import { hasRequestedDispute, recordDisputeRequest } from '@/lib/disputeRequests';
import { DISPUTE_ENABLED, requestFlagDispute } from '@/lib/disputes';
import { filterHidden, hideContent, loadHidden } from '@/lib/hiddenContent';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import { isDisabilityTag, isSeasonalTag, isValidTag, tagLabel } from '@/lib/contextTags';
import { addFlagPhoto, listFlagPhotos } from '@/lib/photos';
import { MAX_COMMENT_LENGTH } from '@/lib/comments';
import { useComments } from '@/hooks/useComments';
import { getTier } from '@/lib/reputationTier';
import type { FlagCategory, FlagRow, FlagSeverity, FlagStatus } from '@/types/database';
import PhotoGallery, { type GalleryPhoto } from './PhotoGallery';
import StatusHistoryModal from './StatusHistoryModal';
import ReportContentModal from './ReportContentModal';
import type { ReportTarget } from '@/lib/reports';
import {
  COMMENT_HIDDEN_ANNOUNCEMENT,
  DISPUTE_ALREADY_RECORDED_MESSAGE,
  DISPUTE_CONTROL_LABEL,
  DISPUTE_FAILED_TITLE,
  DISPUTE_RECORDED_MESSAGE,
  DISPUTE_STALE_MESSAGE,
  HIDE_FAILED_TITLE,
  REPORT_CONTROL_LABEL,
} from '@/lib/copy';
import { StatusBadge } from './StatusBadge';
import { CommentBubble } from './CommentBubble';
import { a11yToggle, decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';

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
  // §SKY-7 — the blocked-content alert's route to the guidelines. Safe here:
  // this modal always mounts inside <SharedModalsProvider> (Map, Tasks and
  // Profile each host it), and TermsScreen's single mount lives in
  // SharedModalsHost precisely so it can present OVER a sheet like this one.
  const { setOpen } = useSharedModals();
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

  // B-1 / Apple 1.2(b) — the abuse-report sheet, mounted as a sibling beside
  // StatusHistoryModal (see the mount at the bottom of the render for why it is
  // NOT in SharedModalsHost). One piece of state carries BOTH "is it open" and
  // "about what": null = closed. That is deliberate — a separate boolean could
  // drift out of step with the target and present the sheet over a stale id.
  // Cleared on close and on flag swap by the same two effects the history modal
  // uses, for the same reason.
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  // Apple 1.2(c) — the device-local hide list, scoped to COMMENTS this phase
  // (§SKY-3h), so only the comment bucket is ever read here.
  //
  // NOT cleared when the modal closes or the flag swaps, unlike the two sheets
  // above. Those hold per-flag state; this list is DEVICE-wide, so the value
  // from the last read is already the right answer for the next flag. Clearing
  // it would blank the filter for the frames before the async read lands and
  // FLASH a comment the reader has already told us they never want to see —
  // which is the exact promise `hiddenContent.ts` refuses to break.
  const [hiddenComments, setHiddenComments] = useState<string[]>([]);

  // Reopen request flow — F10 (Riley). Only shown when status === 'resolved'
  // and the current user is NOT the reporter. Tapping opens an inline form;
  // submitting either reopens the flag (threshold met) or shows a "N more
  // needed" message (threshold not yet met). No user_id stored — Jordan gate.
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenText, setReopenText] = useState('');
  const [reopenBusy, setReopenBusy] = useState(false);
  // Inline feedback message after a reopen submit (non-status-change path).
  const [reopenMessage, setReopenMessage] = useState<string | null>(null);

  // W1 — the "flag as wrong" doubt signal. It sits HERE, beside reopen, and its
  // pill sits in the TRIAGE row beside Verify / Resolved / Reject, because it is
  // an ACCURACY judgement about the report. It is not the abuse path and must
  // never be presented as a peer of Report (§SKY-3c — Sky corrected an agent for
  // collapsing the two, and the correction is on the record).
  const [disputeBusy, setDisputeBusy] = useState(false);
  // The inline answer that REPLACES the pill once the user has spoken — same
  // shape as the reopen flow above, with one addition: the message is TAGGED
  // with the flag it is about. A dispute in flight when the user swaps flags
  // would otherwise resolve and print its answer over the NEXT flag's sheet,
  // asserting something about a report the user never touched. Tagging makes
  // that impossible by construction rather than by a race the reset effect
  // usually wins.
  const [disputeMessage, setDisputeMessage] = useState<{ flagId: string; text: string } | null>(
    null,
  );

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
  // BP-6 focus cue: border swaps to brand while focused (width unchanged — no
  // layout shift). The Input primitive's treatment, applied to this raw field.
  const [commentFocused, setCommentFocused] = useState(false);
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

  // Close-on-parent-close / close-on-flag-swap protection for the sibling
  // sheets. Prevents them from showing entries for the previous flag after the
  // user navigates to another one.
  //
  // The report sheet rides the SAME two effects, and for it the stake is higher
  // than a stale list: `reportTarget` carries the uuid the report is filed
  // against, so a sheet left open across a flag swap would send a report about
  // flag A while the card behind it shows flag B. Clearing the target also
  // unpresents the sheet (visible is derived from it), which fires its own
  // reset of the half-typed reason.
  useEffect(() => {
    if (!visible) {
      setHistoryOpen(false);
      setReportTarget(null);
    }
  }, [visible]);
  useEffect(() => {
    setHistoryOpen(false);
    setReportTarget(null);
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
      setDisputeMessage(null);
    }
  }, [visible]);
  useEffect(() => {
    setShowReopenForm(false);
    setReopenText('');
    setReopenMessage(null);
    setCommentText('');
    setCommentSubmitting(false);
    setDisputeMessage(null);
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
  // listFlagPhotos returns [] only when the migration hasn't run yet; real
  // failures throw (COR-3). The gallery has no error-state UI (banked for
  // Sky), so the VIEW path degrades to warn + keep the current list — the
  // throw matters on the write path, where addFlagPhoto's position math must
  // not run against a failed read.
  useEffect(() => {
    if (!visible || !shownFlag) {
      setFlagPhotos([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const photos = await listFlagPhotos(shownFlag.id);
        if (!cancelled) setFlagPhotos(photos);
      } catch (e) {
        console.warn('[FlagDetailModal] photo gallery load failed:', e);
      }
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

  // Read the hide list once per flag open. Not per render and not per comment:
  // `filterHidden` is pure and synchronous precisely so the ids are loaded once
  // and the filtering costs nothing on the render path.
  //
  // No catch and no user-visible failure state: `loadHidden` never rejects — it
  // warns and answers "nothing hidden", which is its documented policy of
  // failing toward showing MORE rather than silently swallowing content nobody
  // asked to lose. Signed-out readers get the list too; a personal filter has
  // nothing to do with having an account.
  // The id is lifted to a local so the dependency array can be EXHAUSTIVE. The
  // photos effect above spells the same idea as `[visible, shownFlag?.id]` and
  // pays for it with a react-hooks/exhaustive-deps warning; copying that would
  // have added an 80th warning to a repo whose gate is exactly 79. Same
  // once-per-flag behaviour, no suppression, no new lint debt.
  const shownFlagId = shownFlag?.id;
  useEffect(() => {
    if (!visible || !shownFlagId) return;
    let cancelled = false;
    (async () => {
      const hidden = await loadHidden();
      if (!cancelled) setHiddenComments(hidden.comment);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, shownFlagId]);

  /**
   * Apple 1.2(c) — hide one comment, for this reader, on this device.
   *
   * `hideContent` THROWS on a write failure, deliberately: a hide that fails
   * silently has quietly ignored somebody who just said "never show me this
   * again", which is the worst outcome this feature has. So the failure is
   * surfaced with `notify` (Alert.alert is a silent no-op on web and this is a
   * message the user MUST see), and the local list only advances after the
   * write actually lands — the same ordering `handleToggleWatch` uses above,
   * which is what makes a rollback unnecessary rather than forgotten.
   */
  const handleHideComment = async (commentId: string) => {
    try {
      await hideContent('comment', commentId);
    } catch (e) {
      notify(HIDE_FAILED_TITLE, errorMessage(e));
      return;
    }
    setHiddenComments((prev) => (prev.includes(commentId) ? prev : [...prev, commentId]));
    // WCAG 4.1.3 — the bubble vanishes silently otherwise. The delete path in
    // this same thread announces its removal for exactly this reason; hide
    // makes a bubble disappear the same way and owes the same announcement.
    AccessibilityInfo.announceForAccessibility(COMMENT_HIDDEN_ANNOUNCEMENT);
  };

  const handleToggleWatch = async () => {
    if (!user || !shownFlag || watched === null || watchSaving) return;
    setWatchSaving(true);
    try {
      // A11Y-206 (WCAG 4.1.3): announce the outcome. The only other signal is
      // the button's own label flipping — and VoiceOver does not re-read a
      // focused button when its label changes, so to a screen-reader user the
      // press did nothing. The BULK watch path has announced all along; the
      // single-flag one was silent.
      if (watched) {
        await removeWatched(user.id, shownFlag.id);
        setWatched(false);
        AccessibilityInfo.announceForAccessibility('Stopped watching this flag');
      } else {
        await addWatched(user.id, shownFlag.id);
        setWatched(true);
        AccessibilityInfo.announceForAccessibility('Watching this flag');
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
              await addFlagPhoto(
                shownFlag.id,
                result.assets[0].uri,
                result.assets[0].width,
                result.assets[0].height,
              );
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
              await addFlagPhoto(
                shownFlag.id,
                result.assets[0].uri,
                result.assets[0].width,
                result.assets[0].height,
              );
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
    return <Modal aria-label="Flag details" visible={false} transparent onRequestClose={onClose} />;
  }

  const isOwn = shownFlag.user_id === user?.id;
  const status = shownFlag.status;
  const canVerify = status === 'open';
  const canResolve = status === 'open' || status === 'verified';
  const canReject = status === 'open' || status === 'verified';
  // W1 — every clause is load-bearing, and three of them are dead-control
  // prevention (SR-093), not preference:
  //   DISPUTE_ENABLED  the constant tracks live migration state; a UI that
  //                    ignored it would throw on every press if it rolled back.
  //   user             `increment_dispute_request` is granted to `authenticated`
  //                    ONLY (the W2 anon grant is explicitly gated in the
  //                    migration header), so a guest pill is a guaranteed 42501.
  //   open | verified  the RPC's UPDATE is scoped to those two statuses and
  //                    returns 0 otherwise — a resolved/rejected flag offers a
  //                    button whose every press is discarded.
  // `!isOwn` is the only judgement call: doubting your own report is what the
  // owner's Delete / edit affordances are already for.
  const canDispute =
    DISPUTE_ENABLED && !!user && !isOwn && (status === 'open' || status === 'verified');
  // The pill's answer, but only if it belongs to the flag on screen (see the
  // tagging note on `disputeMessage`). Null means "the pill is still the thing
  // to show" — for a fresh flag as much as for one never disputed.
  const disputeNotice = disputeMessage?.flagId === shownFlag.id ? disputeMessage.text : null;
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
    // R-2 / SR-093. A GUEST could tap Verify/Resolve/Reject. The write left,
    // RLS refused it, PostgREST returned ZERO ROWS — and `updateFlagStatus`
    // cannot tell "refused" from "the status moved", so it threw
    // FlagStatusConflictError and the guest was told **"This flag changed"**.
    // Nothing had changed. The app invented a concurrent edit to explain a
    // permission it had never mentioned, and did it after a pointless write to
    // production. The App Review reviewer walks this path cold, as a guest.
    //
    // Gating here rather than teaching updateFlagStatus to distinguish the two:
    // that would cost an auth round trip on every triage to answer a question
    // the caller already knows the answer to.
    if (!user) {
      notify('Sign in required', 'Please sign in to verify or resolve flags.');
      return;
    }
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
      // §SKY-7: a rejection that cites the community guidelines now carries a
      // route to them. Every other failure keeps the generic alert unchanged.
      if (isContentBlockedError(e)) {
        showBlockedContentAlert('Could not post comment', () => setOpen('terms'));
      } else {
        Alert.alert('Could not post comment', errorMessage(e));
      }
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
    // R-2 / SR-094. `!user` used to fall into the same bare `return` as the
    // real guards below, so a guest filled in the form, pressed Send, and got
    // NOTHING — no error, no message, no closed form. Indistinguishable from a
    // broken button, and the dedup below is keyed on user.id so a guest could
    // never have voted anyway. Say so instead.
    if (!user) {
      notify('Sign in required', 'Please sign in to request a reopen.');
      return;
    }
    if (!shownFlag || reopenBusy) return;
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

  // W1 — record that this user thinks the flag is wrong.
  //
  // ⚠ LINE COMMENTS, NOT A DOC BLOCK, AND NOT BY PREFERENCE. Line 377 of this
  // file sets the web file picker's MIME filter, and that string's last two
  // characters are a slash followed by a star. Several source-scanning guards
  // (the dismissal standard among them) strip comments with a regex that does
  // not know about string literals, so that pair opens a comment they never
  // close — harmless ONLY while no closing star-slash follows it anywhere in
  // this file. A doc block here supplies one and silently blanks ~500 lines
  // from those scans, taking the `<Modal visible={false}>` null-stub with it.
  // Verified twice, not theorised: the first draft of this handler used a doc
  // block and the dismissal guard's allow-list assertion dropped to 0 hits;
  // the second draft fixed that but quoted the closing pair in this very note
  // and broke it again. So: below line 377, comments stay in double-slash form
  // AND avoid writing either two-character sequence, until the scanners learn
  // to skip strings.
  //
  // A doubt counter, not a verdict: nothing here changes the flag's status, so
  // unlike the triage buttons beside it this handler never calls
  // `updateFlagStatus` and never closes the sheet.
  //
  // THE COUNT IS READ, NEVER SHOWN. `increment_dispute_request` returns the new
  // total and it is used for exactly one thing: telling a vote that LANDED from
  // one the server DISCARDED. It is not rendered and no message counts down to
  // the dispute threshold, because that threshold's documented consequence —
  // the additive `Disputed` treatment — is not shipped on any surface, so a
  // countdown would be a promise of something the user will never see.
  //
  // THREE OUTCOMES ARE NOT SUCCESS, and each is spelled separately on purpose:
  //   null  the RPC is missing from this backend's schema cache. Nothing was
  //         counted. The reopen flow's equivalent branch answers "your request
  //         was sent for review" — it is the one thing here NOT copied from it,
  //         because that sentence is untrue on a vote that never left the phone.
  //   0     the UPDATE matched no row: the flag left open/verified while this
  //         sheet held a stale snapshot, so the server threw the vote away.
  //   throw anything else — RLS, network, an expired JWT.
  // Only the first path past all three records the per-device dedup. Recording
  // it earlier would burn this device's single vote on a no-op.
  const handleDispute = async () => {
    if (!user || !shownFlag || disputeBusy) return;
    // Captured, not re-read after the awaits: every answer below is a claim
    // about THIS flag, and `shownFlag` can have moved on by the time one lands.
    const flagId = shownFlag.id;
    // The visible message and the WCAG 4.1.3 announcement are set together so
    // the sheet and the screen reader can never end up saying different things.
    // The announcement is not flag-tagged the way the message is — a spoken
    // sentence cannot be recalled once the swap has happened, and a stale
    // announcement is a far smaller harm than a stale visible claim.
    const say = (text: string) => {
      setDisputeMessage({ flagId, text });
      AccessibilityInfo.announceForAccessibility(text);
    };
    setDisputeBusy(true);
    try {
      // Dedup FIRST — the server stores no user_id (Jordan gate), so with
      // DISPUTE_THRESHOLD at 2 this check is the only thing stopping one person
      // reaching the threshold alone by reopening the sheet and pressing again.
      if (await hasRequestedDispute(user.id, flagId)) {
        say(DISPUTE_ALREADY_RECORDED_MESSAGE);
        return;
      }
      const newCount = await requestFlagDispute(flagId);
      if (newCount === null) {
        // `requestFlagDispute` returns null for exactly the codes `errorMessage`
        // words as FEATURE_UNAVAILABLE, so this reuses that shipped sentence
        // rather than authoring a second one for the same condition.
        notify(DISPUTE_FAILED_TITLE, FEATURE_UNAVAILABLE);
        return;
      }
      if (newCount === 0) {
        say(DISPUTE_STALE_MESSAGE);
        return;
      }
      await recordDisputeRequest(user.id, flagId);
      say(DISPUTE_RECORDED_MESSAGE);
    } catch (e) {
      notify(DISPUTE_FAILED_TITLE, errorMessage(e));
    } finally {
      setDisputeBusy(false);
    }
  };

  return (
    <>
      <Modal aria-label={`Flag details: ${CATEGORY_LABELS[shownFlag.category]}`} visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          {/* accessibilityViewIsModal: tells iOS VoiceOver that everything
            outside this card is non-interactive — important because we
            render the lightbox as a sibling Modal (Android-stable pattern),
            and without this prop the focus could leak to Verify/Resolve
            buttons that are visually obscured. QA Pass-2 #2. */}
          <GlassSurface
            variant="bulk"
            borderRadius={0}
            forceEngineered
            style={[styles.card, { paddingBottom: Math.max(spacing.xl, insets.bottom) }]}
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
          >
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
                style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.borderPressed }]}
                accessibilityRole="button"
                accessibilityLabel="Close flag details"
                accessibilityHint="Returns to the flag list"
                {...a11yToggle({ disabled: busy })}
              >
                <X size={18} color={color.text} strokeWidth={2.2} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              // A11Y-228: the comment box sits at the very bottom of this
              // ScrollView — without inset adjustment the iOS keyboard rises
              // over the exact input being typed into. (iOS-only prop; a KAV
              // wrap would fight the pageSheet's own layout.)
              automaticallyAdjustKeyboardInsets
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
                    style={styles.beforeAfterArrow} {...decorativeProps}
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
                <View style={styles.afterTip}>
                  {/* A11Y-213: no accessible/label on this container — on iOS
                      that flattened the tip into one VoiceOver element and made
                      "Add after photo" unreachable. The text speaks for itself;
                      the button stays an independent element. */}
                  <AppText variant="body" style={styles.afterTipText}>
                    Show the fix — add an &ldquo;after&rdquo; photo so others can see this barrier was resolved.
                  </AppText>
                  <Pressable
                    onPress={handleAddPhoto}
                    style={({ pressed }) => [styles.afterTipBtn, pressed && styles.afterTipBtnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Add after photo"
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
                  <AppText variant="label" style={[styles.severityChipText, { color: severity[shownFlag.severity].textOnColor }]}>Severity {shownFlag.severity} · {SEVERITY_LABELS[shownFlag.severity]}</AppText>
                </View>
                <StatusBadge status={status} accessibilityLabel={statusA11y(status)} />
              </View>

              {/* The stake — what a severity of this magnitude MEANS for a user.
                  Copy is SEVERITY_DESCRIPTIONS (flags.ts), the ramp-aligned stake
                  sentences (NOT derived from theme.ts). One quiet line completes
                  the grammar: number · word on the chip, then the consequence.
                  The chip's accessibilityLabel already speaks "of 5, {word}"
                  (severityA11y); this line adds the stake for the eye and,
                  as body text, is read after it by a screen reader. */}
              <AppText variant="body" style={styles.severityStake}>
                {SEVERITY_DESCRIPTIONS[shownFlag.severity]}
              </AppText>

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
                          ]} {...decorativeProps}
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
                    style={styles.anonBadgeText} {...decorativeProps}
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
                  {...a11yToggle({
                    pressed: watched,
                    busy: watchSaving,
                    disabled: busy || watchSaving,
                  })}
                >
                  <Star
                    size={16}
                    color={color.accentOrange}
                    fill={watched ? color.accentOrange : 'none'}
                    strokeWidth={2.2} {...decorativeProps}
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
                  style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && { backgroundColor: color.borderPressed }]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit this flag"
                  accessibilityHint="Opens an edit form for description, category, and severity"
                  {...a11yToggle({ disabled: busy })}
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
                    placeholderTextColor={color.placeholderText}
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
                        {...a11yToggle({ checked: editCategory === cat })}
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
                        {...a11yToggle({ checked: editSeverity === s })}
                      >
                        <AppText
                          variant="monoBold"
                          style={[
                            styles.severityBtnText,
                            editSeverity === s && styles.severityBtnTextActive,
                            editSeverity === s && { color: severity[s].textOnColor },
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
                      style={({ pressed }) => [styles.actionBtn, styles.cancelBtn, pressed && { backgroundColor: color.borderPressed }]}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel editing"
                      {...a11yToggle({ disabled: busy })}
                    >
                      <AppText variant="label" style={styles.cancelBtnText}>Cancel</AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleSaveEdit()}
                      disabled={busy}
                      style={({ pressed }) => [styles.actionBtn, styles.saveBtn, pressed && { backgroundColor: color.ctaFillPressed }]}
                      accessibilityRole="button"
                      accessibilityLabel="Save changes"
                      {...a11yToggle({ busy, disabled: busy })}
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
                      style={({ pressed }) => [styles.actionBtn, styles.reopenBtn, pressed && { backgroundColor: color.borderPressed }]}
                      accessibilityRole="button"
                      accessibilityLabel="Still broken? Request reopen"
                      accessibilityHint="Opens a form to explain why this barrier is still present"
                      {...a11yToggle({ disabled: busy })}
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
                        placeholderTextColor={color.placeholderText}
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
                          style={({ pressed }) => [styles.actionBtn, styles.cancelBtn, pressed && { backgroundColor: color.borderPressed }]}
                          accessibilityRole="button"
                          accessibilityLabel="Cancel reopen request"
                          {...a11yToggle({ disabled: reopenBusy })}
                        >
                          <AppText variant="label" style={styles.cancelBtnText}>Cancel</AppText>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleReopenSubmit()}
                          disabled={reopenBusy || !reopenText.trim()}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            styles.reopenSubmitBtn,
                            (reopenBusy || !reopenText.trim()) && styles.reopenSubmitBtnDisabled,
                            pressed && !(reopenBusy || !reopenText.trim()) && { backgroundColor: color.ctaFillPressed },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Submit reopen request"
                          {...a11yToggle({ busy: reopenBusy, disabled: reopenBusy || !reopenText.trim() })}
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
                  style={({ pressed }) => [styles.actionBtn, styles.viewMapBtn, pressed && { backgroundColor: color.borderPressed }]}
                  accessibilityRole="button"
                  accessibilityLabel="View on Map"
                  accessibilityHint="Switches to the Map tab and centers on this flag"
                  {...a11yToggle({ disabled: busy })}
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
                  style={({ pressed }) => [styles.actionBtn, styles.directionsBtn, pressed && { backgroundColor: color.ctaFillPressed }]}
                  accessibilityRole="button"
                  accessibilityLabel="Get directions to this flag"
                  accessibilityHint="Opens your maps app with directions"
                  {...a11yToggle({ disabled: busy })}
                >
                  <AppText variant="label" style={styles.directionsBtnText}>Directions</AppText>
                </Pressable>
                <Pressable
                  onPress={handleShare}
                  disabled={busy}
                  style={({ pressed }) => [styles.actionBtn, styles.shareBtn, pressed && { backgroundColor: color.borderPressed }]}
                  accessibilityRole="button"
                  accessibilityLabel="Share this flag"
                  accessibilityHint="Opens the system share sheet"
                  {...a11yToggle({ disabled: busy })}
                >
                  <AppText variant="label" style={styles.shareBtnText}>Share</AppText>
                </Pressable>
                <Pressable
                  onPress={() => setHistoryOpen(true)}
                  disabled={busy}
                  style={({ pressed }) => [styles.actionBtn, styles.historyBtn, pressed && { backgroundColor: color.borderPressed }]}
                  accessibilityRole="button"
                  accessibilityLabel="View status history"
                  accessibilityHint="Shows who changed the status of this flag and when"
                  {...a11yToggle({ disabled: busy })}
                >
                  <AppText variant="label" style={styles.historyBtnText}>History</AppText>
                </Pressable>
                {/* B-1 / Apple 1.2(b) — the abuse-report control.
                    GUEST-VISIBLE ON PURPOSE. The feedback INSERT policy carries
                    no TO clause, so its role is `public` and an anonymous
                    submit really lands; the App Review reviewer also walks this
                    app signed out, and a report path they cannot reach is a
                    path they will read as absent.
                    NOT a peer of the navigation trio: View on Map / Directions
                    / Share / History are things you DO with a flag, and this is
                    a safety valve — so it takes the recessive muted treatment
                    rather than their outlined blue. See the style note below.
                    DELIBERATELY NO accessibilityHint. Every hint that would
                    actually help here ("we'll review this", "the flag will be
                    removed") is a moderation promise, and authoring one is
                    outside what any agent may write. A missing hint is not a
                    WCAG failure — the accessible NAME carries the meaning, and
                    there is exactly one Report control on this surface, so the
                    bare label is unambiguous within it. */}
                <Pressable
                  onPress={() => {
                    // The comment composer sits further down this same sheet
                    // and may hold focus. The report sheet slides up OVER this
                    // one, so a keyboard left standing would cover its reason
                    // field on first paint.
                    Keyboard.dismiss();
                    setReportTarget({ kind: 'flag', id: shownFlag.id });
                  }}
                  disabled={busy}
                  style={({ pressed }) => [styles.actionBtn, styles.reportBtn, pressed && { backgroundColor: color.borderPressed }]}
                  accessibilityRole="button"
                  accessibilityLabel={REPORT_CONTROL_LABEL}
                  {...a11yToggle({ disabled: busy })}
                >
                  <AppText variant="label" style={styles.reportBtnText}>{REPORT_CONTROL_LABEL}</AppText>
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
                      style={({ pressed }) => [styles.commentsRetryBtn, pressed && styles.commentsRetryBtnPressed]}
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
                    <MessageCircle
                      size={32}
                      color={color.inkGlassMuted}
                      strokeWidth={2} {...decorativeProps}
                    />
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
                          style={({ pressed }) => [styles.commentsRetryBtn, pressed && styles.commentsRetryBtnPressed]}
                          accessibilityRole="button"
                          accessibilityLabel="Retry refreshing comments"
                        >
                          <AppText variant="label" style={styles.commentsRetryText}>Retry</AppText>
                        </Pressable>
                      </View>
                    ) : null}
                    {/*
                      Apple 1.2(c): the hide list is applied HERE and nowhere
                      else. Every branch above still tests the unfiltered
                      `comments` on purpose —
                        · the loading and error branches are about the FETCH, and
                          a personal filter is not a fetch result;
                        · the "No comments yet — share what you know." empty state
                          would be a LIE if the reader had simply hidden them all.
                          There ARE comments; they chose not to see them. Falling
                          through to an empty list says nothing false, and saying
                          something true about it ("you've hidden 3") is new copy
                          plus an unhide affordance, which is Sky's call and a
                          separate work item.
                    */}
                    <View style={styles.commentsList} accessibilityRole="list">
                      {filterHidden(comments, hiddenComments, (c) => c.id).map((c) => (
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
                          // B-1 / Apple 1.2(b) — Report, on OTHER people's
                          // comments only. The SAME strict predicate decides
                          // both affordances, so a row can never offer both
                          // (see src/lib/__tests__/commentAuthor.test.ts).
                          //
                          // `===`, never `==`, and never with a `?? ''`
                          // default: SR-117 made `user_id` nullable, so for a
                          // SIGNED-OUT reader looking at a comment whose author
                          // deleted their account, loose equality would compare
                          // null to undefined, claim ownership, and hand out
                          // Delete instead of Report on every orphaned row.
                          // Strictly compared, an orphan is not yours — you get
                          // Report, which is the correct outcome: a comment
                          // outliving its author is still reportable.
                          //
                          // GUEST-VISIBLE, like the flag Report control above:
                          // the feedback INSERT policy carries no TO clause, so
                          // an anonymous submit really lands, and the App Review
                          // reviewer walks this app signed out.
                          onReport={
                            c.user_id === user?.id
                              ? undefined
                              : () => {
                                  // The composer sits just below this thread and
                                  // may hold focus; the report sheet slides up
                                  // over it, so a standing keyboard would cover
                                  // its reason field on first paint.
                                  Keyboard.dismiss();
                                  setReportTarget({
                                    kind: 'comment',
                                    id: c.id,
                                    // Load-bearing: C-8 deletes by comment id,
                                    // but triage needs the parent flag for
                                    // context — and the flag id survives if the
                                    // comment is gone before Sky reads it.
                                    flagId: shownFlag.id,
                                  });
                                }
                          }
                          // Apple 1.2(c) — Hide, on the SAME rows as Report and
                          // gated by the SAME strict predicate, for the same
                          // two reasons: hiding your own comment is pointless
                          // when Delete is right there, and 1.2(c) exists so a
                          // reader can stop seeing somebody ELSE's content.
                          //
                          // An orphaned comment (SR-117: `user_id` is nullable
                          // live) is hideable for the same reason it stays
                          // reportable — `===` keeps null from reading as
                          // ownership, so a guest gets the reader's affordances
                          // rather than the author's.
                          //
                          // Guest-visible: the list is device-local
                          // AsyncStorage, so there is no account to need.
                          onHide={
                            c.user_id === user?.id
                              ? undefined
                              : () => {
                                  void handleHideComment(c.id);
                                }
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
                      style={[styles.commentInput, commentFocused && { borderColor: color.brand }]}
                      value={commentText}
                      onChangeText={setCommentText}
                      onFocus={() => setCommentFocused(true)}
                      onBlur={() => setCommentFocused(false)}
                      placeholder="Add a comment…"
                      placeholderTextColor={color.placeholderText}
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
                      {...a11yToggle({
                        disabled: commentSubmitting || commentText.trim().length === 0,
                        busy: commentSubmitting,
                      })}
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

            {/* W1 — the doubt signal's answer. It sits ABOVE the triage row
                rather than inside it because a sentence stretched by
                `actionBtn`'s flexGrow into a row of 44pt pills would read as a
                fourth, un-pressable button. Same treatment as the reopen
                message it mirrors. */}
            {disputeNotice !== null && (
              <AppText variant="body" style={styles.disputeMessage}>{disputeNotice}</AppText>
            )}

            {/* Render only when at least one action exists — an empty row left
                a ~16pt dead band on resolved non-own flags (sweep minor).
                `canDispute` is redundant TODAY (it implies canReject exactly),
                and is listed anyway: if a later edit narrows the triage gates,
                the pill must not vanish silently inside a row that stopped
                rendering. */}
            {(canVerify || canResolve || canReject || isOwn || canDispute) && (
            <View style={styles.actionRow}>
              {canVerify && (
                <Pressable
                  onPress={() => runStatusChange('verified', 'verify')}
                  disabled={busy}
                  style={({ pressed }) => [styles.actionBtn, styles.verifyBtn, pressed && { backgroundColor: color.ctaFillPressed }]}
                  accessibilityRole="button"
                  accessibilityLabel="Verify this flag"
                  accessibilityHint="Marks this report as confirmed"
                  {...a11yToggle({ disabled: busy, busy })}
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
                  style={({ pressed }) => [styles.actionBtn, styles.resolveBtn, pressed && { backgroundColor: color.successStrong }]}
                  accessibilityRole="button"
                  accessibilityLabel="Mark this flag resolved"
                  accessibilityHint="Marks the accessibility issue as fixed"
                  {...a11yToggle({ disabled: busy, busy })}
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
                  style={({ pressed }) => [styles.actionBtn, styles.rejectBtn, pressed && { backgroundColor: color.borderPressed }]}
                  accessibilityRole="button"
                  accessibilityLabel="Reject this flag"
                  accessibilityHint="Marks this report as invalid or spam"
                  {...a11yToggle({ disabled: busy, busy })}
                >
                  {busy ? (
                    <ActivityIndicator color={color.text} />
                  ) : (
                    <AppText variant="label" style={styles.rejectText}>Reject</AppText>
                  )}
                </Pressable>
              )}
              {/* W1 — "Flag as wrong". THIS ROW, deliberately: a dispute is an
                  accuracy judgement, so it belongs with Verify / Resolved /
                  Reject and NOT beside Report in the secondary row. Putting the
                  two together is the collapse §SKY-3c corrects.
                  Its own `disabled` flag as well as `busy`: a status change and
                  a doubt vote are separate in-flight operations, and neither
                  should let the other be pressed twice.
                  DELIBERATELY NO accessibilityHint, for the same reason Report
                  carries none — the useful hint here ("this marks the flag as
                  disputed") describes a visible outcome that is NOT shipped, so
                  writing it would invent the promise. The accessible NAME is
                  Sky's own phrase and is unique on this surface. */}
              {canDispute && disputeNotice === null && (
                <Pressable
                  onPress={() => void handleDispute()}
                  disabled={busy || disputeBusy}
                  style={({ pressed }) => [styles.actionBtn, styles.disputeBtn, pressed && { backgroundColor: color.borderPressed }]}
                  accessibilityRole="button"
                  accessibilityLabel={DISPUTE_CONTROL_LABEL}
                  {...a11yToggle({ disabled: busy || disputeBusy, busy: disputeBusy })}
                >
                  {disputeBusy ? (
                    <ActivityIndicator size="small" color={color.brandText} />
                  ) : (
                    <AppText variant="label" style={styles.disputeBtnText}>{DISPUTE_CONTROL_LABEL}</AppText>
                  )}
                </Pressable>
              )}
              {isOwn && (
                <Pressable
                  onPress={handleDelete}
                  disabled={busy}
                  style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && { backgroundColor: color.error }]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete this flag"
                  accessibilityHint="Permanently removes your report"
                  {...a11yToggle({ disabled: busy, busy })}
                >
                  {busy ? (
                    <ActivityIndicator color={color.textOnBrand} />
                  ) : (
                    <AppText variant="label" style={styles.deleteText}>Delete</AppText>
                  )}
                </Pressable>
              )}
            </View>
            )}
          </GlassSurface>
        </View>
      </Modal>
      <StatusHistoryModal
        visible={historyOpen}
        flagId={shownFlag?.id ?? null}
        onClose={() => setHistoryOpen(false)}
      />
      {/* Sibling, not SharedModalsHost. `SharedModalKey` is a payload-free
          union — it can say "open the report sheet" but not "…about flag 9f3c"
          — and its own JSDoc excludes per-screen-state modals by name.
          StatusHistoryModal above is the shipped precedent for a
          payload-carrying sheet stacked over this one, so this copies it.
          `visible` is DERIVED from the target rather than tracked separately,
          which is what makes "cleared target" and "closed sheet" the same
          fact. */}
      <ReportContentModal
        visible={reportTarget !== null}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
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
      // Bulk-glass sheet (MP4): <GlassSurface variant="bulk" forceEngineered> supplies
      // the material fill; no backgroundColor here (the variant owns it — drops the
      // surface wash so FlagDetail shares the one sheet material). overflow:hidden clips
      // the square material to the rounded top. No up-shadow at HEAD → no cardWrap needed.
      overflow: 'hidden',
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
      // Bottom-align the two equal-aspect image columns — with 'center' the
      // columns lost alignment whenever the "After" caption wrapped, and the
      // arrow's hand-tuned top offset mispointed (sweep minor).
      alignItems: 'flex-end',
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
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
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
      // Span the full row and center the glyph — the old hand-tuned
      // paddingTop assumed a one-line caption and mispointed on wrap.
      alignSelf: 'stretch',
    },
    beforeAfterArrowGlyph: {
      fontSize: font.size.xl,
      color: color.inkGlassMuted,
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
    afterTipBtnPressed: { backgroundColor: color.borderPressed },
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
    severityStake: { fontSize: font.size.sm, color: color.inkGlassMuted, marginTop: spacing.tight },
    sectionLabel: {
      fontSize: font.size.xs,
      fontWeight: font.weight.semibold,
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
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
    coordsCopyBtnPressed: { backgroundColor: color.borderPressed },
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
      // 5 buttons now (View on Map, Directions, Share, History, Report) — wrap
      // so the row stays usable on narrow screens / large text sizes. The wrap
      // is what lets the 5th land without squeezing the other four: actionBtn's
      // minWidth 100 + flexGrow 1 means the row reflows to 2 lines rather than
      // shrinking any pill below its 44pt target (WCAG 2.5.8).
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
    // B-1 Report — the recessive member of the row. TREATMENT AWAITS SKY
    // (mockup gate): a safety valve should be findable without competing with
    // the navigation trio, and where exactly it should sit on that scale is a
    // taste call, not an engineering one.
    //
    // NO NEW INK/FILL PAIR — every pair this pill uses is already banked, and
    // both manifests were re-run to confirm (exit 0, ALL PASS):
    //   at rest  `inkGlassMuted` on detailSheet     6.24:1 light / 6.51:1 dark
    //   pressed  `inkGlassMuted` on borderPressed   6.84:1 light / 6.09:1 dark
    // The first is the pair BP8/MP4 banked when this file re-inked ten sites to
    // inkGlassMuted; the second is one of the four completeness pairs BP11
    // added. Reused here for the label (text threshold 4.5:1) and the hairline
    // (non-text threshold 3:1) alike. No fill at rest: the bulk sheet IS the
    // background those numbers were measured against. The pressed dim is the
    // BP11 fill-swap, so it stays in the one press dialect.
    reportBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: color.inkGlassMuted,
    },
    // semibold, not bold: the trio is bold, so a step down is what makes this
    // read as subordinate without a second colour.
    reportBtnText: {
      color: color.inkGlassMuted,
      fontWeight: font.weight.semibold,
      fontSize: font.size.base,
    },
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
      backgroundColor: color.borderPressed,
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
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
    },
    editInput: {
      borderWidth: 1,
      // borderStrong — the compose-field standard; this file had a 3-way
      // border split across its own inputs (BP-6).
      borderColor: color.borderStrong,
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
      color: color.inkGlassMuted,
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
    // Error-red CTA (white label) → deepen on press; error is the darkest red
    // token, so its pressed state uses errorPressed. White stays AA (~7:1).
    commentsRetryBtnPressed: { backgroundColor: color.errorPressed },
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
      // Bleed the comment column to the card's content edge, but only by
      // spacing.md — the exact paddingHorizontal each CommentBubble row already
      // carries — so bubbles land flush with the content edge and their rounded
      // corners stay inside the body ScrollView's clip (was -spacing.xl, which
      // over-bled and pushed the corners past the clip).
      marginHorizontal: -spacing.md,
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
      // WCAG 2.5.5/2.5.8: was 40pt — the app's one remaining sub-44 input
      // (the same class TasksScreen's searchInput fixed; SR-034's gap).
      minHeight: 44,
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
      backgroundColor: color.ctaFillPressed,
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
    commentsEmptyLabel: {
      fontSize: font.size.base,
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      textAlign: 'center',
    },
    // ── F10 Reopen request ───────────────────────────────────────────────────
    reopenBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      // MP4/O-2: reopen action re-inks accentOrange -> brandText. The orange was
      // affordance flair, not severity grammar, and read 2.07:1 text-on-surface at
      // HEAD (a live AA fail, worse on the glass composite). brandText clears AA
      // (4.95 light / 5.42 dark on detailSheet — arbiter-banked). Sky-vetoable.
      borderColor: color.brandText,
    },
    reopenBtnText: {
      color: color.brandText,
      fontWeight: font.weight.semibold,
      fontSize: font.size.base,
    },
    reopenMessage: {
      fontSize: font.size.sm,
      color: color.inkGlassMuted,
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
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
    },
    reopenInput: {
      borderWidth: 1,
      borderColor: color.borderStrong, // compose-field standard (BP-6)
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
      color: color.inkGlassMuted,
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
    // ── W1 "Flag as wrong" ───────────────────────────────────────────────────
    // TREATMENT AWAITS SKY (mockup gate). Outlined among four filled pills is a
    // taste call, not an engineering one: it is here because the triage row's
    // fills read as verdicts (Verify / Resolved / Reject / Delete) and a doubt
    // signal is not a verdict — but where exactly it should sit on that scale
    // is Sky's to ratify.
    //
    // NO NEW INK/FILL PAIR, SO NO ARBITER RUN. Every value below is copied
    // token-for-token from `reopenBtn` / `reopenMessage` a few lines up, which
    // is the shipped precedent for the OTHER community signal on this same bulk
    // sheet — deliberate, not laziness: two accuracy signals speaking one
    // dialect is the point.
    //   label + hairline  `brandText` on detailSheet   4.95:1 light / 5.42:1 dark
    //   pressed           `brandText` on borderPressed — the same fill-swap the
    //                     reopen pill and the outlined secondary-row trio have
    //                     shipped with since BP11.
    //   message ink       `inkGlassMuted` on detailSheet 6.24:1 light / 6.51:1 dark
    // They are separate style keys rather than reuse so a future divergence
    // (or Sky's ratification) can move one without silently moving the other.
    disputeBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: color.brandText,
    },
    // semibold, not bold: the three verdict pills are bold, and the step down is
    // what makes this read as subordinate to them without a second colour.
    disputeBtnText: {
      color: color.brandText,
      fontWeight: font.weight.semibold,
      fontSize: font.size.base,
    },
    disputeMessage: {
      fontSize: font.size.sm,
      color: color.inkGlassMuted,
      lineHeight: 18,
      fontStyle: 'italic',
      marginTop: spacing.xs,
    },
  });
