import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  type Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
// RNGH ScrollView, not react-native's — its ref exposes .handlerTag, which
// SheetPull's simultaneousHandlers={bodyScrollRef} needs to coexist with
// pull-to-dismiss on native. Full mechanism: LegendModal.tsx.
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { SheetGrabber } from '@/components/ui/Sheet';
import { SheetPull, useAtTop, type SheetPullHandle, useSheetPullDismissLifecycle } from '@/components/ui/SheetPull';
import { TYPE_BLOCK, TypeBlock } from '@/components/ui/TypeBlock';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import {
  AlertTriangle,
  Copy,
  History,
  Map as MapIcon,
  MessageCircle,
  Navigation,
  Pencil,
  Share2,
  Star,
  Trash2,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { a11y, BULK_FLOOR_CANDIDATE, font, radius, severity, shadow, spacing } from '@/theme';
import { useIsAdmin } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { confirm, notify } from '@/lib/confirm';
import { isContentBlockedError, showBlockedContentAlert } from '@/lib/blockedContent';
import { useLegalSheets } from '@/components/LegalSheets';
import { getDirectionsUrl } from '@/lib/directionsLink';
import { formatDistance, formatWalkingEta, speakDistance } from '@/lib/distance';
import { relativeTime } from '@/lib/relativeTime';
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
  STATUS_LABELS,
  updateFlagContent,
  updateFlagStatus,
  type FlagContentPatch,
} from '@/lib/flags';
import { hasRequestedReopen, recordReopenRequest } from '@/lib/reopenRequests';
import { hasRequestedDispute, recordDisputeRequest } from '@/lib/disputeRequests';
import { DISPUTE_ENABLED, requestFlagDispute } from '@/lib/disputes';
import {
  filterBlockedAuthors,
  filterHidden,
  hideContent,
  loadHidden,
} from '@/lib/hiddenContent';
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
  AUTHOR_BLOCKED_ANNOUNCEMENT,
  BLOCK_CONFIRM_ACTION,
  BLOCK_CONFIRM_BODY,
  BLOCK_CONTROL_LABEL,
  BLOCK_FAILED_TITLE,
  COMMENT_HIDDEN_ANNOUNCEMENT,
  DISPUTE_ALREADY_RECORDED_MESSAGE,
  DISPUTE_CONTROL_LABEL,
  DISPUTE_FAILED_TITLE,
  DISPUTE_RECORDED_MESSAGE,
  DISPUTE_STALE_MESSAGE,
  GALLERY_LOAD_FAILED_TEXT,
  HIDE_FAILED_TITLE,
  REPORT_CONTROL_LABEL,
} from '@/lib/copy';
import { CommentBubble } from './CommentBubble';
import {
  a11yToggle,
  decorativeProps,
  isAxRecompose,
  useFocusOnOpen,
} from '@/lib/accessibility';

// 'reopen' = community threshold met, resolved→open. It is its own action
// because the points trigger awards NOTHING for it — callers must not show
// the "+N points" flash they show for verify/resolve.
// 'restore' = MOD1 admin-only rejected→open, moderator-error recovery. Kept
// distinct from 'reopen' even though both land on 'open': 'reopen' is a
// community threshold vote off a RESOLVED flag; 'restore' is a direct
// admin write off a REJECTED one. Conflating them would let a caller's
// reopen-specific copy ("+N more requests needed") leak onto a restore.
export type DetailAction = 'verify' | 'resolve' | 'reject' | 'reopen' | 'restore';

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
  /** Host-owned route to the canonical Profile sign-in entry for guest review. */
  onSignInToReview?: () => void;
  // SW-28: the dismissal-COMPLETE event, not the close INTENT. RN core fires a
  // Modal's onDismiss on iOS ONLY — which is exactly the platform that needs it,
  // because only there does presenting this sheet detach the presenter's view.
  // Same idiom LegendModal / NearbyFlagsModal already use for focus restore.
  onDismiss?: () => void;
  /**
   * Which persona this sheet serves FIRST (Q2 = C, art-direction 2026-08-21).
   *
   *   'triage'  opened from the Tasks queue. The community verb leads, and the
   *             sibling verbs pin to the sheet's foot so they stay in reach
   *             however long the body runs (the behaviour X4 banked at AXL).
   *   'read'    opened from the map or Home. Directions leads and the three
   *             community verbs sit together, equal and quiet, under a label.
   *
   * Default 'read', because every entry point that is not the triage queue is
   * somebody trying to get somewhere.
   */
  primaryIntent?: 'triage' | 'read';
  /**
   * How far the reader is from this flag, in km — or null/undefined when the
   * caller does not know. PASSED IN, never measured here: this sheet holds no
   * location permission of its own and must not acquire one to decorate a meta
   * line. Absent, the line simply omits the distance.
   */
  distanceKm?: number | null;
}

export default function FlagDetailModal({
  visible,
  flag,
  onClose,
  onChanged,
  onDeleted,
  onEdited,
  onViewOnMap,
  onSignInToReview,
  onDismiss,
  primaryIntent = 'read',
  distanceKm,
}: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const { modalAnimationType, backdropOpacity, beginPullDismiss } = useSheetPullDismissLifecycle(visible);
  // F4: at 1.5x and up a fixed composition recomposes instead of squeezing —
  // here the segmented control's cells stop sharing a row and become
  // full-width rows. `useWindowDimensions` is the reactive read, so changing
  // the text size with the sheet open restacks it without a remount.
  const { fontScale } = useWindowDimensions();
  const axRecompose = isAxRecompose(fontScale);
  // §SKY-7 — the blocked-content alert's route to the guidelines. Safe here:
  // this modal always mounts inside <SharedModalsProvider> (Map, Tasks and
  // Profile each host it), and TermsScreen's single mount lives in
  // SharedModalsHost precisely so it can present OVER a sheet like this one.
  // This surface is itself a Modal, so the shared navigator-level host
  // cannot present over it — iOS refuses a second presentation from an
  // already-presenting VC and the link silently does nothing. Mounted
  // locally it presents from THIS modal's VC. See LegalSheets.tsx.
  const legal = useLegalSheets();
  const [busy, setBusy] = useState(false);
  // Pull-to-dismiss gates (map-gestures SPEC §2.6). `busy` mirrors the close
  // button's own disabled state; `keyboardVisible` covers the comment box at the
  // bottom of the body scroll. `atTop` is the dismiss-vs-scroll rule.
  const { atTop, onScroll, scrollEventThrottle } = useAtTop();
  const keyboardVisible = useKeyboardVisible();
  const bodyScrollRef = useRef(null);
  const pullRef = useRef<SheetPullHandle>(null);
  const [flagPhotos, setFlagPhotos] = useState<GalleryPhoto[]>([]);
  // Prompt B B2/Fable B-UX-002: the gallery's own loading/error state, owned
  // here (not the write-path throw COR-3 already relies on). photosRetryToken
  // is a pure re-run trigger for the Retry control — bumping it re-enters the
  // SAME effect below, so Retry is never a second, divergent loader.
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [photosRetryToken, setPhotosRetryToken] = useState(0);
  // photo_alt (2026-08-19): a picked photo parks here so the owner can add an
  // optional screen-reader description BEFORE it uploads. All three pickers
  // (web input, camera, library) feed this one attach row. isBlobUrl marks
  // web object-URLs that must be revoked on attach/cancel (L7 discipline).
  const [pendingPhoto, setPendingPhoto] = useState<{
    uri: string;
    width?: number;
    height?: number;
    isBlobUrl: boolean;
  } | null>(null);
  const [pendingPhotoAlt, setPendingPhotoAlt] = useState('');
  const [pendingPhotoBusy, setPendingPhotoBusy] = useState(false);
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
  // Apple 1.2(c) block list, loaded from the SAME read as `hiddenComments`.
  const [blockedAuthors, setBlockedAuthors] = useState<string[]>([]);

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
  } = useComments(shownFlag?.id, visible);
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

  // Load the gallery photos whenever the modal opens, the flag changes, or
  // Retry is pressed. listFlagPhotos now throws every backend error (Prompt B
  // B2/Fable B-UX-002 — a false-empty gallery on an evidence surface is an
  // active false statement). Rows and any prior error are reset SYNCHRONOUSLY
  // before the fetch starts, so a flag-to-flag switch can never leave a stale
  // photo (or a stale error) rendered under the new flag while the new load
  // is in flight; `cancelled` still rejects a stale completion arriving after
  // a further switch. Error clears only when a load for the CURRENT flag
  // actually succeeds.
  useEffect(() => {
    if (!visible || !shownFlag) {
      setFlagPhotos([]);
      setPhotosError(null);
      setPhotosLoading(false);
      return;
    }
    let cancelled = false;
    setFlagPhotos([]);
    setPhotosError(null);
    setPhotosLoading(true);
    (async () => {
      try {
        const photos = await listFlagPhotos(shownFlag.id);
        if (cancelled) return;
        setFlagPhotos(photos);
      } catch (e) {
        if (cancelled) return;
        console.warn('[FlagDetailModal] photo gallery load failed:', e);
        setPhotosError(GALLERY_LOAD_FAILED_TEXT);
      } finally {
        if (!cancelled) setPhotosLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, shownFlag?.id, photosRetryToken]);

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
      if (cancelled) return;
      setHiddenComments(hidden.comment);
      // ONE read serves both filters. Blocking shares this effect rather than
      // adding a second because it shares the storage key, the lifecycle and
      // the failure policy — a separate effect would double the reads and could
      // land the two lists a frame apart, which is visible as a comment that
      // appears and then vanishes.
      setBlockedAuthors(hidden.author);
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

  /**
   * Apple 1.2(c) — BLOCK an author, for this reader, on this device.
   *
   * This is the control that actually satisfies 1.2(c), and the difference from
   * `handleHideComment` above is direction in time: hide removes one bubble the
   * reader has already seen, block removes every bubble that account posts from
   * here on. Per-item hiding cannot satisfy the guideline precisely because the
   * blocked person can post again.
   *
   * CONFIRMED FIRST, unlike hide. Hide is trivially reversible per item and
   * scoped to one bubble; block is a standing decision about a person, and
   * `BLOCK_CONFIRM_BODY` is where the four things Jordan's Phase-0 gate
   * requires get said before it takes effect — what changes, that the other
   * person is neither told nor restricted, that it is this device only and
   * won't survive reinstall, and that Report is the lever that reaches a human.
   * `confirm()` rather than RN's alert primitive because this is a
   * Cancel/Confirm pair, and that primitive's button form is a silent no-op on
   * react-native-web (CLAUDE.md's error-handling tiers).
   *
   * Same write-then-advance ordering as hide: `hideContent` throws on a failed
   * write, and a block that silently failed would be the worst instance of that
   * class, so the local list only moves after the write lands.
   */
  const handleBlockAuthor = async (authorId: string) => {
    const ok = await confirm(
      `${BLOCK_CONTROL_LABEL}?`,
      BLOCK_CONFIRM_BODY,
      BLOCK_CONFIRM_ACTION,
      true,
    );
    if (!ok) return;
    try {
      await hideContent('author', authorId);
    } catch (e) {
      notify(BLOCK_FAILED_TITLE, errorMessage(e));
      return;
    }
    setBlockedAuthors((prev) => (prev.includes(authorId) ? prev : [...prev, authorId]));
    AccessibilityInfo.announceForAccessibility(AUTHOR_BLOCKED_ANNOUNCEMENT);
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
        // Park it for the describe-then-attach row instead of uploading
        // immediately — the object URL is revoked on attach/cancel.
        setPendingPhoto({ uri: localUri, isBlobUrl: true });
        setPendingPhotoAlt('');
        cleanup();
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
            setPendingPhoto({
              uri: result.assets[0].uri,
              width: result.assets[0].width,
              height: result.assets[0].height,
              isBlobUrl: false,
            });
            setPendingPhotoAlt('');
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
            setPendingPhoto({
              uri: result.assets[0].uri,
              width: result.assets[0].width,
              height: result.assets[0].height,
              isBlobUrl: false,
            });
            setPendingPhotoAlt('');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Upload the parked photo with its (optional) description. Kept OUT of the
  // picker callbacks so all three sources share one code path. On failure the
  // pending photo stays parked so the user can simply retry.
  const attachPendingPhoto = async () => {
    if (!pendingPhoto || pendingPhotoBusy || !shownFlag) return;
    setPendingPhotoBusy(true);
    try {
      await addFlagPhoto(
        shownFlag.id,
        pendingPhoto.uri,
        pendingPhoto.width,
        pendingPhoto.height,
        pendingPhotoAlt,
      );
      const updated = await listFlagPhotos(shownFlag.id);
      setFlagPhotos(updated);
      // WCAG 4.1.3: the row disappears on success — say why.
      AccessibilityInfo.announceForAccessibility('Photo attached.');
      if (pendingPhoto.isBlobUrl) URL.revokeObjectURL(pendingPhoto.uri);
      setPendingPhoto(null);
      setPendingPhotoAlt('');
    } catch (e) {
      notify('Could not upload photo', errorMessage(e));
    } finally {
      setPendingPhotoBusy(false);
    }
  };

  const cancelPendingPhoto = () => {
    if (!pendingPhoto || pendingPhotoBusy) return;
    if (pendingPhoto.isBlobUrl) URL.revokeObjectURL(pendingPhoto.uri);
    setPendingPhoto(null);
    setPendingPhotoAlt('');
  };

  if (!shownFlag) {
    return <Modal aria-label="Flag details" visible={false} transparent onRequestClose={onClose} />;
  }

  const isOwn = shownFlag.user_id === user?.id;
  const status = shownFlag.status;
  const canVerify = status === 'open';
  const canResolve = status === 'open' || status === 'verified';
  // MOD1: legality only — WHO may act on it is the isAdmin check at the cell's
  // `show`, same split as canDispute below (status legality here, account
  // legality there). The DB trigger enforces the admin half independently.
  const canReject = status === 'open' || status === 'verified';
  const canRestore = status === 'rejected';
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
  const canEdit = isOwn && status === 'open';

  // ── Q2 = C · the primary verb follows the entry point ────────────────────
  //
  // `canVerify` is part of the test, not just the intent: a flag that cannot be
  // verified has no community verb to lead with, whichever door you came
  // through, so the sheet falls back to the reader's verb rather than showing a
  // filled button that is not offered.
  const primaryIsVerify = !!user && primaryIntent === 'triage' && canVerify;
  const primaryIsGuestSignIn = !user && primaryIntent === 'triage';
  const primaryLeadsReview = primaryIsVerify || primaryIsGuestSignIn;
  // Pinned whenever the sheet was opened TO TRIAGE — including on a flag that
  // is already verified, where the pair is Resolved / Reject. Coming from the
  // queue, the verbs stay in reach however long the body runs.
  const pinnedVerbs = !!user && primaryIntent === 'triage';

  // ── The header's census line (F2) ────────────────────────────────────────
  //
  // One sentence in one order: severity word · status. The two pills this
  // replaces each carried a composite spoken label (severityA11y / statusA11y);
  // both are joined here so the SPOKEN sentence is unchanged even though two
  // visual objects became one line. Never let the uppercase reach the screen
  // reader — `textTransform` is presentation, and "OPEN" is read as shouting by
  // some voices, which is why the label is composed from the helpers instead.
  const censusLine = `Severity ${shownFlag.severity} of 5 · ${SEVERITY_LABELS[shownFlag.severity]} · ${STATUS_LABELS[status]}`;
  const censusA11y = `${severityA11y(shownFlag.severity)}, ${statusA11y(status)}`;

  // ── The meta sentence (who · when · where) ───────────────────────────────
  //
  // THREE attribution cases, all correct and none collapsible — SW-34 and
  // `oneNameOneThing.guard` both pin this: `user_id IS NULL` is a CHOICE
  // ("Anonymous"), a known account is either "You" or "Another community
  // member". The strings are the shipped ones, verbatim.
  const attribution =
    shownFlag.user_id === null ? 'Anonymous' : `${isOwn ? 'You' : 'Another community member'}`;
  // The spoken half says "Reported anonymously" rather than "Reported by
  // Anonymous", which is what the badge this replaces said and is the truer
  // sentence — the flag has no author, it was not written by somebody called
  // Anonymous.
  const attributionA11y =
    shownFlag.user_id === null ? 'Reported anonymously' : `Reported by ${attribution}`;
  const walkEta = distanceKm != null ? formatWalkingEta(distanceKm) : '';
  // Visible: the compact grammar the Tasks and Nearby cards already speak.
  // Spoken: the full timestamp and the unabbreviated distance, so nothing the
  // eye gets is lost to the ear (`formatDistance` renders "m" / "km", which a
  // screen reader reads as letters — `speakDistance` exists for that).
  const metaLine = [
    `Reported by ${attribution}`,
    relativeTime(shownFlag.created_at),
    distanceKm != null ? `${formatDistance(distanceKm)} away` : '',
    walkEta,
  ]
    .filter(Boolean)
    .join(' · ');
  const metaA11y = [
    attributionA11y,
    `on ${formattedDate}`,
    distanceKm != null ? `${speakDistance(distanceKm)} away` : '',
    walkEta,
  ]
    .filter(Boolean)
    .join(', ');
  const coordsA11y = `Copy coordinates ${shownFlag.lat.toFixed(5)} latitude, ${shownFlag.lng.toFixed(5)} longitude`;

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
      // §SKY-7 coherence, same as the comment path above: text rejected by the
      // 1.2(a) filter offers the guidelines it was judged against, instead of
      // a bare failure the author can't act on.
      if (isContentBlockedError(e)) {
        showBlockedContentAlert('Could not save changes', legal.openTerms);
      } else {
        notify('Could not save changes', errorMessage(e));
      }
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
            : next === 'open'
              ? 'Flag restored'
              : 'Flag rejected',
      );
      onClose();
    } catch (e) {
      if (e instanceof FlagStatusConflictError) {
        notify(
          'This flag changed',
          'It was updated (or removed) while you had it open. Closing so you can see the latest.',
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

  // MOD1 — moderator-error recovery. Not destructive (it puts the report BACK
  // in front of the community, same tier as Verify/Resolve), so no `destructive`
  // flag on the confirm.
  const handleRestore = async () => {
    if (busy) return;
    const ok = await confirm(
      'Restore this flag?',
      'This reopens the report so the community can review it again.',
      'Restore',
    );
    if (!ok) return;
    await runStatusChange('open', 'restore');
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
  // Pure handoff to the user's preferred maps app via platform deep link — no
  // on-platform routing. The URL shape is built by `getDirectionsUrl` (pure,
  // unit-tested). openURL can reject only in the extremely rare case where the
  // OS finds no app to handle the scheme; surface a brief alert so the user
  // isn't left wondering why nothing happened.
  //
  // Lifted out of the JSX because the re-rank gives it TWO call sites: it is
  // the sheet's one filled verb when the reader arrived from the map or Home,
  // and a More-row button when they arrived from the triage queue. Two inline
  // copies is how the two would drift.
  const handleDirections = async () => {
    const url = getDirectionsUrl(shownFlag.lat, shownFlag.lng);
    try {
      await Linking.openURL(url);
    } catch {
      notify("Couldn't open maps", 'No maps app was found on your device.');
    }
  };

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
        showBlockedContentAlert('Could not post comment', legal.openTerms);
      } else {
        notify('Could not post comment', errorMessage(e));
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
      notify('Could not delete flag', errorMessage(e));
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
        const msg = 'Thanks. Your reopen request was sent for review.';
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
        // Threshold met — reopen the flag. Report it as 'reopen', not
        // 'verify': the trigger awards no points for resolved→open, and the
        // Tasks flash used to claim "Verified! +3 points" for it.
        const updated = await updateFlagStatus(shownFlag.id, 'open', 'resolved');
        onChanged(updated, 'reopen', isOwn);
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
        notify('Flag updated', 'This flag was just reopened or changed, and your request was counted.');
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
  // ⚠ HISTORY, and the reason this function has a warning at all. The
  // `input.accept` assignment earlier in this file ends in a slash-star pair,
  // and the guards' shared comment stripper used to read that as an unclosed
  // comment — harmless only while no closing pair followed it in this file. A
  // doc block below it supplied one and silently blanked hundreds of lines from
  // every source-scanning guard, `<Modal>` tags included. It fired three times:
  // twice while this handler was first being written, and again on 2026-08-20,
  // when SW-49's disabled-style note took four unrelated guards red at once.
  //
  // FIXED 2026-08-21. `src/__tests__/support/stripComments.ts` is now one shared
  // stripper that skips string literals, and all fifteen guards use it. The old
  // rule — "below this line, double-slash comments only, and never spell either
  // two-character sequence" — is RETIRED; doc blocks below here are fine again,
  // and this file uses them. `stripComments.guard.test.ts` pins the behaviour,
  // including a case that reads this very file.
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

  // ── (6) THE SIBLING VERBS (F3) ───────────────────────────────────────────
  //
  // ONE ghost segmented control, defined once and rendered in one of two
  // places: pinned to the sheet's foot for a triage arrival, inline under a
  // "Community check" label for a reader. Two copies of three gated cells is
  // exactly how two placements drift apart.
  //
  // Verify appears here only when it is not already the sheet's filled primary,
  // so the same verb can never be offered twice on one screen.
  const segmentCells = [
    {
      key: 'verify',
      label: 'Verify',
      a11yLabel: 'Verify this flag',
      hint: 'Marks this report as confirmed',
      onPress: () => runStatusChange('verified', 'verify'),
      show: !!user && canVerify && !primaryIsVerify,
    },
    {
      key: 'resolve',
      label: 'Resolved',
      a11yLabel: 'Mark this flag resolved',
      hint: 'Marks the accessibility issue as fixed',
      onPress: () => runStatusChange('resolved', 'resolve'),
      show: !!user && canResolve,
    },
    {
      key: 'reject',
      label: 'Reject',
      a11yLabel: 'Reject this flag',
      hint: 'Marks this report as invalid or spam',
      onPress: handleReject,
      // MOD1: rejecting is admin-only — the DB trigger enforces this
      // independently, this just keeps the control off a non-admin's screen.
      show: !!user && canReject && isAdmin === true,
    },
    {
      key: 'restore',
      label: 'Restore',
      a11yLabel: 'Restore this flag',
      hint: 'Reopens a rejected report',
      onPress: handleRestore,
      show: !!user && canRestore && isAdmin === true,
    },
  ].filter((cell) => cell.show);

  // W1's doubt signal stays a SEPARATE control inside this cluster rather than
  // a fourth cell. Every cell here is a verdict; a dispute is not one, and
  // §SKY-3c is on the record correcting an agent for collapsing the two. It
  // keeps its own outlined treatment for the same reason.
  const showDispute = canDispute && disputeNotice === null;
  const guestReviewBoundary = !user && primaryIntent === 'read' ? (
    <View style={styles.communityCheck}>
      <AppText variant="label" style={styles.sectionLabel}>Community check</AppText>
      <Pressable
        onPress={onSignInToReview}
        disabled={busy || !onSignInToReview}
        style={({ pressed }) => [
          styles.signInReviewBtn,
          pressed && styles.signInReviewBtnPressed,
          (busy || !onSignInToReview) && styles.btnDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Sign in to review"
        accessibilityHint="Opens the Profile tab, where you can sign in"
        {...a11yToggle({ disabled: busy || !onSignInToReview })}
      >
        <AppText variant="label" style={styles.signInReviewBtnText}>Sign in to review</AppText>
      </Pressable>
    </View>
  ) : null;
  const siblingVerbs = !user ? guestReviewBoundary :
    segmentCells.length > 0 || showDispute ? (
      <View style={styles.communityCheck}>
        {/* The label belongs to the INLINE placement only. Pinned to the foot
            the control is the last thing on the sheet and needs no heading;
            inline, among a reader's other choices, it does. */}
        {!pinnedVerbs ? (
          <AppText variant="label" style={styles.sectionLabel}>Community check</AppText>
        ) : null}
        {segmentCells.length > 0 ? (
          // The control is the shared primitive now. It was BUILT here in
          // Phase 1b and lifted in Phase 3 — the ghost variant is this recipe
          // verbatim, inks included (a cell over the worst bulk backdrop reads
          // 5.22:1 light / 7.80:1 dark, build/02/gsp-bulk-arbiter.txt). F4's
          // stacking threshold stays the CALLER's, because it is a property of
          // this column, not of the control.
          <SegmentedControl
            variant="ghost"
            groupLabel="Community check"
            stacked={axRecompose}
            cells={segmentCells.map((cell) => ({
              key: cell.key,
              label: cell.label,
              a11yLabel: cell.a11yLabel,
              hint: cell.hint,
              onPress: cell.onPress,
              disabled: busy,
              busy,
            }))}
          />
        ) : null}
        {showDispute ? (
          <Pressable
            onPress={() => void handleDispute()}
            disabled={busy || disputeBusy}
            style={({ pressed }) => [styles.disputeBtn, pressed && { backgroundColor: color.borderPressed }, (busy || disputeBusy) && styles.btnDisabled]}
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
        ) : null}
      </View>
    ) : null;

  return (
    <>
      <Modal
        aria-label={`Flag details: ${CATEGORY_LABELS[shownFlag.category]}`}
        visible={visible}
        animationType={modalAnimationType}
        transparent
        onRequestClose={onClose}
        onDismiss={() => {
          pullRef.current?.resetAfterDismiss();
          onDismiss?.();
        }}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          {/* accessibilityViewIsModal: tells iOS VoiceOver that everything
            outside this card is non-interactive — important because we
            render the lightbox as a sibling Modal (Android-stable pattern),
            and without this prop the focus could leak to Verify/Resolve
            buttons that are visually obscured. QA Pass-2 #2. */}
          {/* Pull-down-to-dismiss. Same handler as the X and onRequestClose, so
              the swipe is a shortcut to the existing close, never a second path.
              Gated on !busy to match the X's own disabled state — a swipe must
              not tear the sheet down mid-verify/resolve. The nested modals
              (status history, report content, the photo lightbox) present ABOVE
              this card and swallow touches themselves, so the pan cannot fire
              underneath them. */}
          <SheetPull
            ref={pullRef}
            onDismiss={onClose}
            onDismissStart={beginPullDismiss}
            enabled={!busy && !keyboardVisible}
            atTop={atTop}
            simultaneousHandlers={bodyScrollRef}
            style={styles.pullExpanded}
            visible={visible}
          >
          <GlassSurface
            variant="bulk"
            borderRadius={0}
            // GSP-02 §2.2. This sheet has always forced the engineered material
            // (MP4/M-36), which is why the 0.85 blur FLOOR the defect row named
            // (D8) was never what ghosted here — the *Lite stops were. Under the
            // 'blur40' arm of the A/B the sheet drops to true blur so Sky can
            // judge a stronger blur against a denser gradient on the phone; the
            // other two arms keep the shipped engineered path exactly.
            forceEngineered={BULK_FLOOR_CANDIDATE !== 'blur40'}
            style={[
              styles.card,
              {
                marginTop: insets.top + spacing.sm,
                paddingBottom: Math.max(spacing.xl, insets.bottom),
              },
            ]}
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
          >
            <SheetGrabber />
            {/* THE HEADER BLOCK (F1 · the flag object at sheet density).
                The map callout is the best-designed object in this app —
                stripe · title · one census line · description · one action —
                and this is that grammar grown up. One TypeBlock (header, 1.6)
                so the title can never be capped below the census and the
                meaning sentence beneath it — the T3 inversion, closed for this
                block. The body below keeps the variant table, which is where
                the More row's 12pt labels get the cap their fixed circles
                need; a content block over the whole sheet would uncap them. */}
            <TypeBlock cap={TYPE_BLOCK.header}>
              <View style={styles.headerRow}>
                {/* C2: the severity colour appears ONCE per object. It is here,
                    as the stripe, which is why the amber pill is gone. */}
                <View
                  style={[styles.severityStripe, { backgroundColor: severityColor(shownFlag.severity) }]} {...decorativeProps}
                />
                <View style={styles.headerText}>
                  <AppText
                    ref={titleRef}
                    variant="display"
                    size={font.size.h1}
                    style={styles.title}
                    accessibilityRole="header"
                    accessibilityLabel={`Flag details: ${CATEGORY_LABELS[shownFlag.category]}`}
                  >
                    {CATEGORY_LABELS[shownFlag.category]}
                  </AppText>
                  {/* The census line replaces the severity pill AND the status
                      pill. `accessibilityLabel` carries both composites so the
                      spoken sentence is exactly what the two pills said. */}
                  <AppText variant="label" style={styles.census} accessibilityLabel={censusA11y}>
                    {censusLine}
                  </AppText>
                  {/* The stake — what a severity of this magnitude MEANS for a
                      user. Copy is SEVERITY_DESCRIPTIONS (flags.ts), the
                      ramp-aligned stake sentences. One quiet line completes the
                      grammar: number and word on the census, then the
                      consequence. */}
                  <AppText variant="bodyMedium" style={styles.severityStake}>
                    {SEVERITY_DESCRIPTIONS[shownFlag.severity]}
                  </AppText>
                </View>
                <Pressable
                  onPress={onClose}
                  disabled={busy}
                  hitSlop={12}
                  style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.borderPressed }, busy && styles.btnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Close flag details"
                  accessibilityHint="Returns to the flag list"
                  {...a11yToggle({ disabled: busy })}
                >
                  <X size={18} color={color.text} strokeWidth={2.2} />
                </Pressable>
              </View>
            </TypeBlock>

            <ScrollView
              ref={bodyScrollRef}
              style={styles.body}
              contentContainerStyle={[styles.bodyContent, pinnedVerbs && styles.bodyContentPinned]}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              // A11Y-228: the comment box sits at the very bottom of this
              // ScrollView — without inset adjustment the iOS keyboard rises
              // over the exact input being typed into. (iOS-only prop; a KAV
              // wrap would fight the pageSheet's own layout.)
              automaticallyAdjustKeyboardInsets
            >
              {/* (2) THE HUMAN SENTENCE, SECOND. It used to be the fourth
                  thing on this sheet and the smallest. It carries no section
                  label any more: after a title, a census line and a meaning
                  sentence, the paragraph in the reading position IS the
                  description, and "DESCRIPTION" over it was a form field's
                  habit, not a document's. */}
              <AppText variant="bodyMedium" size={font.size.lg} style={styles.description}>
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

              {/* (3) ONE QUIET META PARAGRAPH — who, when, how far.
                  Four tracked-caps labels and their values (REPORTED BY / DATE
                  / LOCATION) became one sentence in `inkGlassMuted`. The
                  spoken half is not the visible half: the eye gets the compact
                  grammar the Tasks and Nearby cards already speak ("2d ago",
                  "433 m"), the ear gets the full timestamp and the
                  unabbreviated distance, because `formatDistance` renders "m"
                  and "km", which a screen reader reads as letters. */}
              <AppText variant="bodyMedium" style={styles.metaLine} accessibilityLabel={metaA11y}>
                {metaLine}
              </AppText>
              {/* Q17: the raw coordinates are no longer printed. "49.87435,
                  -119.35882" was the LOCATION value on a sheet that already
                  says how far away the barrier is — an engineer's answer to a
                  human question, and the widest line on the sheet at AX sizes.
                  The copy path survives in full, as the labelled link it always
                  should have been; the copy icon is now its accessory rather
                  than a 21x24 target beside a block of monospace. */}
              <Pressable
                onPress={handleCopyCoords}
                disabled={busy}
                style={({ pressed }) => [styles.copyCoordsLink, pressed && styles.copyCoordsLinkPressed, busy && styles.btnDisabled]}
                accessibilityRole="button"
                accessibilityLabel={coordsA11y}
                accessibilityHint="Opens share/copy options for these coordinates"
                {...a11yToggle({ disabled: busy })}
              >
                <AppText variant="label" style={styles.copyCoordsText}>Copy coordinates</AppText>
                <Copy size={15} color={color.inkSelect} strokeWidth={2.2} {...decorativeProps} />
              </Pressable>

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
                      accessibilityLabel={
                        shownFlag.photo_alt
                          ? `Before: ${shownFlag.photo_alt}`
                          : 'Before: the originally reported barrier'
                      }
                    />
                  </View>
                  <View
                    style={styles.beforeAfterArrow} {...decorativeProps}
                  >
                    <AppText variant="label" style={styles.beforeAfterArrowGlyph}>→</AppText>
                  </View>
                  <View style={styles.beforeAfterItem}>
                    <AppText variant="label" style={styles.beforeAfterCaption}>After: the fix</AppText>
                    <RemoteImage
                      uri={afterPhoto.url}
                      style={styles.beforeAfterImage}
                      resizeMode="cover"
                      // D15: the uploader's own description was thrown away
                      // here and replaced with a generic sentence, on the ONE
                      // photo whose whole point is showing what changed. Same
                      // shape as the "Before" label two elements up.
                      accessibilityLabel={
                        afterPhoto.alt_text
                          ? `After: ${afterPhoto.alt_text}`
                          : 'After: the resolved fix'
                      }
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
                    Show the fix: add an &ldquo;after&rdquo; photo so others can see this barrier was resolved.
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

              {/* photo_alt: the describe-then-attach row. A picked photo parks
                  here so the owner can add an optional screen-reader
                  description before it uploads (Apple VoiceOver criteria —
                  uploaded media needs a way to carry a description). */}
              {pendingPhoto && (
                <View style={styles.pendingPhotoCard}>
                  <View style={styles.pendingPhotoRow}>
                    <RemoteImage
                      uri={pendingPhoto.uri}
                      style={styles.pendingPhotoThumb}
                      resizeMode="cover"
                      accessible
                      accessibilityLabel="Photo ready to attach"
                    />
                    <TextInput
                      value={pendingPhotoAlt}
                      onChangeText={setPendingPhotoAlt}
                      placeholder="Describe the photo for screen reader users (optional)"
                      placeholderTextColor={color.placeholderText}
                      maxLength={200}
                      multiline
                      editable={!pendingPhotoBusy}
                      style={[styles.commentInput, styles.pendingPhotoInput]}
                      accessibilityLabel="Photo description for screen reader users"
                      accessibilityHint="Optional. Spoken by screen readers instead of the image. Up to 200 characters."
                    />
                  </View>
                  <View style={styles.pendingPhotoActions}>
                    <Pressable
                      onPress={cancelPendingPhoto}
                      disabled={pendingPhotoBusy}
                      style={({ pressed }) => [styles.pendingPhotoCancel, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel photo"
                      accessibilityHint="Discards the picked photo without attaching it"
                    >
                      <AppText variant="label" style={styles.pendingPhotoCancelText}>Cancel</AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => void attachPendingPhoto()}
                      disabled={pendingPhotoBusy}
                      style={({ pressed }) => [
                        styles.commentSendBtn,
                        pendingPhotoBusy && styles.commentSendBtnDisabled,
                        pressed && styles.commentSendBtnPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Attach photo"
                      {...a11yToggle({ disabled: pendingPhotoBusy, busy: pendingPhotoBusy })}
                    >
                      {pendingPhotoBusy ? (
                        <ActivityIndicator size="small" color={color.textOnBrand} />
                      ) : (
                        <AppText variant="label" style={styles.commentSendBtnText}>Attach</AppText>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* (4) PHOTOS.
                  Prompt B B2/Fable B-UX-002: LOADING / ERROR / real content are
                  now mutually exclusive branches, so a failed load can never
                  render as the real "No photos" empty state (nor, before this
                  fix, as nothing at all). photosLoading and photosError are
                  reset synchronously on every flag change, so switching flags
                  can never show a stale prior flag's photos or a stale error
                  under the new one.
                  The real-content branch keeps its original shape: the strip
                  used to open the sheet with a 96pt grey tile saying "No
                  photos" — on most flags the first thing under the title was
                  an absence, in the sheet's prime area. The placeholder is
                  right in the REPORT form, where it is an invitation; here it
                  is a report of nothing. Rendered when there is something to
                  show, or when the owner can add something (the gallery's own
                  add sentinel fills the list, so the placeholder still cannot
                  appear). PhotoGallery itself is untouched. */}
              {photosLoading ? (
                <ActivityIndicator
                  size="small"
                  color={color.brand}
                  style={styles.photosSpinner}
                  accessible
                  accessibilityLabel="Loading photos"
                />
              ) : photosError ? (
                <Pressable
                  onPress={() => setPhotosRetryToken((t) => t + 1)}
                  style={({ pressed }) => [
                    styles.photosErrorBanner,
                    pressed && styles.photosErrorBannerPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={GALLERY_LOAD_FAILED_TEXT}
                  accessibilityHint="Tries to load photos again"
                  accessibilityLiveRegion="polite"
                >
                  <AlertTriangle
                    size={18}
                    color={color.errorFg}
                    strokeWidth={2.2} {...decorativeProps}
                  />
                  <AppText variant="body" style={styles.photosErrorText}>
                    {GALLERY_LOAD_FAILED_TEXT}
                  </AppText>
                </Pressable>
              ) : (
                (flagPhotos.length > 0 || (isOwn && !busy && !pendingPhoto)) && (
                  <PhotoGallery
                    photos={flagPhotos}
                    onAddPhoto={isOwn && !busy && !pendingPhoto ? handleAddPhoto : undefined}
                    maxPhotos={5}
                  />
                )
              )}


              {/* (5) ONE FILLED VERB (F3). Eight buttons in five styles used to
                  end this sheet, two of them filled, and the answer to "what is
                  the ONE thing to do here" was "eight things, equally". This is
                  the answer now, and which verb it is follows the door you came
                  through (Q2 = C). */}
              <Pressable
                onPress={
                  primaryIsGuestSignIn
                    ? onSignInToReview
                    : primaryIsVerify
                      ? () => runStatusChange('verified', 'verify')
                      : () => void handleDirections()
                }
                disabled={busy || (primaryIsGuestSignIn && !onSignInToReview)}
                style={({ pressed }) => [styles.primaryBtn, pressed && { backgroundColor: color.ctaFillPressed }, (busy || (primaryIsGuestSignIn && !onSignInToReview)) && styles.btnDisabled]}
                accessibilityRole="button"
                accessibilityLabel={
                  primaryIsGuestSignIn
                    ? 'Sign in to review'
                    : primaryIsVerify
                      ? 'Verify this flag'
                      : 'Get directions to this flag'
                }
                accessibilityHint={
                  primaryIsGuestSignIn
                    ? 'Opens the Profile tab, where you can sign in'
                    : primaryIsVerify
                      ? 'Marks this report as confirmed'
                      : 'Opens your maps app with directions'
                }
                {...a11yToggle({
                  disabled: busy || (primaryIsGuestSignIn && !onSignInToReview),
                  busy: busy && primaryIsVerify,
                })}
              >
                {busy && primaryIsVerify ? (
                  <ActivityIndicator color={color.textOnBrand} />
                ) : (
                  <AppText variant="label" size={font.size.lg} style={styles.primaryBtnText}>
                    {primaryIsGuestSignIn
                      ? 'Sign in to review'
                      : primaryIsVerify
                        ? 'Verify'
                        : 'Directions'}
                  </AppText>
                )}
              </Pressable>

              {/* (6) inline for a reader. From the triage queue the same
                  cluster renders in the pinned foot instead — see below. */}
              {!pinnedVerbs ? siblingVerbs : null}

              {/* (7) THE MORE ROW — everything you can DO with a flag, drawn
                  once, at one weight. Navigation, sharing and ownership were
                  five outlined-blue and dark-outlined pills competing with the
                  verbs; they are equal circles now. Directions is here only
                  when it is not already the primary. */}
              <View style={styles.moreRow}>
                <Pressable
                  onPress={() => {
                    onViewOnMap(shownFlag);
                    onClose();
                  }}
                  disabled={busy}
                  style={({ pressed }) => [styles.moreItem, styles.viewMapBtn, pressed && styles.moreItemPressed, busy && styles.btnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="View on Map"
                  accessibilityHint="Switches to the Map tab and centers on this flag"
                  {...a11yToggle({ disabled: busy })}
                >
                  <View style={styles.moreIcon} {...decorativeProps}>
                    <MapIcon size={18} color={color.textStrong} strokeWidth={2.2} />
                  </View>
                  <AppText variant="label" style={styles.moreLabel}>Map</AppText>
                </Pressable>
                {primaryLeadsReview && (
                  <Pressable
                    onPress={() => void handleDirections()}
                    disabled={busy}
                    style={({ pressed }) => [styles.moreItem, styles.directionsBtn, pressed && styles.moreItemPressed, busy && styles.btnDisabled]}
                    accessibilityRole="button"
                    accessibilityLabel="Get directions to this flag"
                    accessibilityHint="Opens your maps app with directions"
                    {...a11yToggle({ disabled: busy })}
                  >
                    <View style={styles.moreIcon} {...decorativeProps}>
                      <Navigation size={18} color={color.textStrong} strokeWidth={2.2} />
                    </View>
                    <AppText variant="label" style={styles.moreLabel}>Directions</AppText>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleShare}
                  disabled={busy}
                  style={({ pressed }) => [styles.moreItem, styles.shareBtn, pressed && styles.moreItemPressed, busy && styles.btnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Share this flag"
                  accessibilityHint="Opens the system share sheet"
                  {...a11yToggle({ disabled: busy })}
                >
                  <View style={styles.moreIcon} {...decorativeProps}>
                    <Share2 size={18} color={color.textStrong} strokeWidth={2.2} />
                  </View>
                  <AppText variant="label" style={styles.moreLabel}>Share</AppText>
                </Pressable>
                <Pressable
                  onPress={() => setHistoryOpen(true)}
                  disabled={busy}
                  style={({ pressed }) => [styles.moreItem, styles.historyBtn, pressed && styles.moreItemPressed, busy && styles.btnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="View status history"
                  accessibilityHint="Shows who changed the status of this flag and when"
                  {...a11yToggle({ disabled: busy })}
                >
                  <View style={styles.moreIcon} {...decorativeProps}>
                    <History size={18} color={color.textStrong} strokeWidth={2.2} />
                  </View>
                  <AppText variant="label" style={styles.moreLabel}>History</AppText>
                </Pressable>
                {watched !== null && (
                  <Pressable
                    onPress={handleToggleWatch}
                    disabled={busy || watchSaving}
                    style={({ pressed }) => [styles.moreItem, styles.watchBtn, pressed && styles.moreItemPressed, (busy || watchSaving) && styles.btnDisabled]}
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
                    <View style={[styles.moreIcon, watched && styles.moreIconActive]} {...decorativeProps}>
                      <Star
                        size={18}
                        color={watched ? color.warningFg : color.textStrong}
                        fill={watched ? color.accentOrange : 'none'}
                        strokeWidth={2.2}
                      />
                    </View>
                    <AppText variant="label" style={[styles.moreLabel, watched && styles.moreLabelActive]}>
                      {watched ? 'Watching' : 'Watch'}
                    </AppText>
                  </Pressable>
                )}
                {canEdit && !isEditing && (
                  <Pressable
                    onPress={() => setIsEditing(true)}
                    disabled={busy}
                    style={({ pressed }) => [styles.moreItem, styles.editBtn, pressed && styles.moreItemPressed, busy && styles.btnDisabled]}
                    accessibilityRole="button"
                    accessibilityLabel="Edit this flag"
                    accessibilityHint="Opens an edit form for description, category, and severity"
                    {...a11yToggle({ disabled: busy })}
                  >
                    <View style={styles.moreIcon} {...decorativeProps}>
                      <Pencil size={18} color={color.textStrong} strokeWidth={2.2} />
                    </View>
                    <AppText variant="label" style={styles.moreLabel}>Edit</AppText>
                  </Pressable>
                )}
                {isOwn && (
                  <Pressable
                    onPress={handleDelete}
                    disabled={busy}
                    style={({ pressed }) => [styles.moreItem, styles.deleteBtn, pressed && styles.moreItemPressed, busy && styles.btnDisabled]}
                    accessibilityRole="button"
                    accessibilityLabel="Delete this flag"
                    accessibilityHint="Permanently removes your report"
                    {...a11yToggle({ disabled: busy, busy })}
                  >
                    <View style={styles.moreIcon} {...decorativeProps}>
                      {busy ? (
                        <ActivityIndicator size="small" color={color.errorStrong} />
                      ) : (
                        <Trash2 size={18} color={color.errorStrong} strokeWidth={2.2} />
                      )}
                    </View>
                    <AppText variant="label" style={[styles.moreLabel, styles.moreLabelDestructive]}>Delete</AppText>
                  </Pressable>
                )}
              </View>


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
                      style={({ pressed }) => [styles.actionBtn, styles.cancelBtn, pressed && { backgroundColor: color.borderPressed }, busy && styles.btnDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel editing"
                      {...a11yToggle({ disabled: busy })}
                    >
                      <AppText variant="label" style={styles.cancelBtnText}>Cancel</AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleSaveEdit()}
                      disabled={busy}
                      style={({ pressed }) => [styles.actionBtn, styles.saveBtn, pressed && { backgroundColor: color.ctaFillPressed }, busy && styles.btnDisabled]}
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
                      style={({ pressed }) => [styles.actionBtn, styles.reopenBtn, pressed && { backgroundColor: color.borderPressed }, busy && styles.btnDisabled]}
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
                          style={({ pressed }) => [styles.actionBtn, styles.cancelBtn, pressed && { backgroundColor: color.borderPressed }, busy && styles.btnDisabled]}
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
                    {/* Guests get zero rows from the authenticated-only SELECT
                        policy, so "No comments yet" would be a guess presented
                        as a fact (the thread may be full). Say the true thing:
                        comments live behind sign-in. Signed-in users still get
                        the real empty-state invite. */}
                    <AppText variant="body" style={styles.commentsEmptyLabel}>
                      {user
                        ? 'No comments yet. Share what you know.'
                        : 'Sign in to see and add comments.'}
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
                      {/* THE 1.2(c) READ SIDE. Blocked authors are dropped
                          BEFORE per-item hides, so a blocked person's comments
                          never reach the second filter — order is immaterial to
                          the result but this way round reads as the stronger
                          rule first. Both filters are pure and synchronous
                          (their ids were loaded once, per flag open), so this
                          costs nothing on the render path. */}
                      {filterHidden(
                        filterBlockedAuthors(comments, blockedAuthors, (c) => c.user_id),
                        hiddenComments,
                        (c) => c.id,
                      ).map((c) => (
                        <CommentBubble
                          key={c.id}
                          author={c.display_name ?? 'Member'}
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
                                        notify('Could not delete comment', errorMessage(e));
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
                          // Apple 1.2(c) — the person-level control.
                          //
                          // TWO gates, not one, and the second is the reason
                          // this is not spelled like its siblings above: a
                          // comment whose author deleted their account comes
                          // back with `user_id: null` (the FK is ON DELETE SET
                          // NULL live — see the SR-117 drift capture). There is
                          // nobody to block on such a row, so the control is
                          // WITHHELD rather than drawn-and-inert. `c.user_id &&`
                          // also narrows the type, which is what lets the
                          // closure pass a plain string.
                          //
                          // Guest-visible for the same reason Hide is: the list
                          // is device-local AsyncStorage, so there is no account
                          // to need. An App Review reviewer walking the app
                          // signed out can exercise this.
                          onBlock={
                            c.user_id && c.user_id !== user?.id
                              ? () => {
                                  void handleBlockAuthor(c.user_id as string);
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

              {/* (9) THE ABUSE PATH, AS A SENTENCE.
                  It was an outlined pill in the navigation row, wearing a
                  darker outline than anything else on the sheet — the safety
                  valve rendered LOUDER than Share. A safety valve should be
                  findable without competing with the verbs, which is what a
                  sentence at the end of the document is.
                  STILL A LABELLED BUTTON, and still guest-visible (Apple
                  1.2(b) — the feedback INSERT policy carries no TO clause, and
                  App Review walks this app signed out). Only its drawing
                  changed. DELIBERATELY NO accessibilityHint: every hint that
                  would help here is a moderation promise, and the accessible
                  NAME carries the meaning. */}
              <View style={styles.reportSentence}>
                <AppText variant="bodyMedium" style={styles.reportSentenceText}>
                  Something wrong with this report?
                </AppText>
                <Pressable
                  onPress={() => {
                    // The comment composer sits just above and may hold focus.
                    // The report sheet slides up OVER this one, so a keyboard
                    // left standing would cover its reason field on first paint.
                    Keyboard.dismiss();
                    setReportTarget({ kind: 'flag', id: shownFlag.id });
                  }}
                  disabled={busy}
                  style={({ pressed }) => [styles.reportBtn, pressed && styles.reportBtnPressed, busy && styles.btnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={REPORT_CONTROL_LABEL}
                  {...a11yToggle({ disabled: busy })}
                >
                  <AppText variant="label" style={styles.reportBtnText}>{REPORT_CONTROL_LABEL}</AppText>
                </Pressable>
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

            {/* (6, pinned) THE SIBLING VERBS, for a triage arrival.
                X4 banked this behaviour at accessibility-extra-large — the
                verbs stay in reach however long the body runs — and it is kept.
                What changed is what is pinned: five pills in four fills became
                one ghost segmented control, because the filled verb is already
                above and Delete is a More-row action, not a verdict. */}
            {pinnedVerbs && siblingVerbs !== null ? (
              <View style={styles.pinnedFoot}>{siblingVerbs}</View>
            ) : null}
          </GlassSurface>
          </SheetPull>
        </Animated.View>
        {/* Inside this Modal on purpose — see LegalSheets.tsx. */}
      {legal.sheets}
      {/* ── EVERY sheet opened FROM this one is mounted INSIDE it ───────────
          Not a stylistic choice. iOS refuses to present a second modal from a
          view controller that is already presenting one, and this Modal IS
          that view controller while it is open. Mounted as SIBLINGS after
          `</Modal>` these two resolved to the SCREEN's VC — the occupied one —
          so History and Report were enabled, tappable, and did nothing at all,
          app-wide, for every user. One line per dead tap (iPhone 17 Pro sim,
          2026-08-20):

            [com.apple.UIKit:Presentation] Attempt to present
            <RCTModalHostViewController: 0x12f521900> on <UIViewController:
            0x1051b8c00> (from <RNSScreen: 0x127374000>) which is already
            presenting <RCTModalHostViewController: 0x1273b5e00>.

          `0x1273b5e00` is this Modal. A PRESENTED view controller may itself
          present, so mounting them here — inside — makes them present from
          THIS modal's VC, which is free. Same fix, same reason, as
          `{legal.sheets}` three lines up; see LegalSheets.tsx for the full
          write-up. That the report sheet is the Apple 1.2(b) abuse control,
          and that this file is its ONLY mount point app-wide, is what made the
          sibling arrangement a store blocker rather than a papercut.

          ⚑ The comment that used to sit here claimed StatusHistoryModal was
          "the shipped precedent for a payload-carrying sheet stacked over this
          one". It was a precedent for the ARRANGEMENT, not for it working —
          StatusHistoryModal was dead by the same mechanism, and had been since
          it shipped. Three other comments repeated the claim (MapScreen.tsx,
          StatusHistoryModal.tsx, ReportContentModal.tsx); all four are
          corrected as of 2026-08-20. Nothing about the JS is wrong, which is
          why jest, tsc and lint all stayed green over it — only the UIKit
          arrangement was, so only a simulator walk could see it.

          STILL TRUE, and the reason neither of these lives on
          SharedModalsHost: `SharedModalKey` is a payload-free union — it can
          say "open the report sheet" but not "…about flag 9f3c" — and its own
          JSDoc excludes per-screen-state modals by name. For the report sheet
          `visible` is DERIVED from the target rather than tracked separately,
          which is what makes "cleared target" and "closed sheet" one fact. */}
      <StatusHistoryModal
        visible={historyOpen}
        flagId={shownFlag?.id ?? null}
        onClose={() => setHistoryOpen(false)}
      />
      <ReportContentModal
        visible={reportTarget !== null}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
      />
    </Modal>
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
      maxHeight: '100%',
      flexGrow: 1,
      flexShrink: 1,
    },
    pullExpanded: { width: '100%', flexGrow: 1 },
    headerRow: {
      flexDirection: 'row',
      // flex-start, not center: the block is three lines tall now, and the
      // close button belongs beside the title, not beside the meaning sentence.
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    // C2 — the severity colour, ONCE per object. `alignSelf: stretch` runs it
    // the height of the text block, which is what makes it a stripe rather than
    // a dash.
    severityStripe: {
      width: 6,
      borderRadius: radius.full,
      alignSelf: 'stretch',
    },
    headerText: { flex: 1, gap: 2 },
    // No fontWeight: the `display` variant IS PlusJakartaSans_800ExtraBold, and
    // the size arrives as the `size` PROP so tracking resolves from it (T2).
    //
    // ⚠ NO `flex: 1`. It carried one for as long as the title was a ROW child
    // beside the close button; inside `headerText`, which is a COLUMN, flex
    // sizes on the CROSS axis' opposite — the title took the column's available
    // HEIGHT, which is content-driven, and resolved to zero. The sheet rendered
    // its census line and its meaning sentence under a title nobody could see,
    // and every gate stayed green over it. The simulator caught it.
    title: { color: color.textStrong },
    // F2 — the census line, in the callout's order: severity word, then status.
    // Uppercase is presentation only; the spoken label is composed from
    // severityA11y / statusA11y so a screen reader never gets the shouting.
    census: {
      fontSize: font.size.xs,
      fontWeight: font.weight.semibold,
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flexShrink: 1 },
    bodyContent: { gap: spacing.sm, paddingBottom: spacing.tight },
    // The pinned foot floats over the body's last inch. X4 banked that as
    // "scrollable, not clipped" and it still is — but a row cut in half at the
    // moment you stop scrolling READS as clipped, so the body gets enough
    // bottom padding to scroll clear of the foot instead. Only when the foot is
    // there; a reader's sheet keeps the tight tail.
    bodyContentPinned: { paddingBottom: 132 },
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
    // The meaning sentence, now inside the header block. bodyMedium (>=500) —
    // body text on glass carries the medium face; the 400 one hazes.
    severityStake: { fontSize: font.size.base, color: color.inkGlassMuted, lineHeight: 20 },
    sectionLabel: {
      fontSize: font.size.xs,
      fontWeight: font.weight.semibold,
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
      marginTop: spacing.sm,
    },
    // The size arrives as the `size` prop (T2). lineHeight is 1.4x lg.
    description: { color: color.textStrong, lineHeight: 23, marginTop: spacing.sm },
    // One quiet paragraph where four labelled rows used to be.
    metaLine: {
      fontSize: font.size.sm,
      color: color.inkGlassMuted,
      lineHeight: 19,
      marginTop: spacing.sm,
    },
    // Q17 — the coordinates live behind this link now. A real 44pt box, not a
    // 21x24 glyph propped up by slop (the SW-25 finding, answered by making the
    // control bigger rather than the target vaguer).
    copyCoordsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      minHeight: a11y.minTargetSize,
      minWidth: a11y.minTargetSize,
      paddingRight: spacing.sm,
    },
    copyCoordsLinkPressed: { backgroundColor: color.borderPressed },
    copyCoordsText: {
      color: color.inkSelect,
      fontWeight: font.weight.semibold,
      fontSize: font.size.sm,
      textDecorationLine: 'underline',
    },
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
    /**
     * SW-49 class: an enabled-LOOKING control must never no-op silently.
     *
     * `busy` is one flag shared by five handlers, and `runStatusChange` opens
     * with an early return on it. The five triage buttons were honest about
     * that — they swap in an `ActivityIndicator`. The other eleven controls on
     * this sheet, Close included, were `disabled={busy}` with NO visual change
     * at all: pixel-identical to their live state and swallowing the press.
     * Close is the sharp end — the sheet cannot be dismissed and nothing says
     * why.
     *
     * Same opacity `SettingsScreen`'s `rowDisabled` uses for the same job.
     *
     * (This comment is a doc block again, deliberately. It was the line-comment
     * form for one wave because a doc block here used to blank the file from
     * the guards — see the note above `handleDispute`. That is fixed, and this
     * is the proof: if it regresses, four guards go red on this file.)
     */
    btnDisabled: { opacity: 0.5 },
    // The form-button base. It used to carry the eight-button action grid as
    // well; after the re-rank its only consumers are the edit form's Cancel /
    // Save and the reopen flow's three controls — form buttons, not verbs, and
    // they keep the shape they shipped with.
    actionBtn: {
      paddingHorizontal: 14,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      minHeight: a11y.minTargetSize,
      alignItems: 'center',
      justifyContent: 'center',
      flexGrow: 1,
      minWidth: 100,
    },

    // ── (5) THE ONE FILLED VERB ─────────────────────────────────────────────
    // C1: white on blue is `ctaFill` (#1466E0, mode-independent), never themed
    // `brand` — dark `brand` measures 3.4:1 with white. 52pt tall, 16pt/700
    // label: the largest control on the sheet, because it is the only one
    // asking for something.
    primaryBtn: {
      backgroundColor: color.ctaFill,
      minHeight: 52,
      borderRadius: radius.circle,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
    },
    primaryBtnText: { color: color.textOnBrand, fontWeight: font.weight.bold },
    signInReviewBtn: {
      minHeight: 44,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: color.glassGhostEdge,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    signInReviewBtnPressed: { backgroundColor: color.borderPressed },
    signInReviewBtnText: {
      color: color.inkSelect,
      fontWeight: font.weight.semibold,
    },

    // ── (6) THE SIBLING VERBS ───────────────────────────────────────────────
    communityCheck: { gap: spacing.sm, marginTop: spacing.md },
    // The pinned foot for a triage arrival. A hairline, not a second material —
    // a bar inside a bulk sheet would be the third surface S2 forbids.
    pinnedFoot: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.glassChromeEdge,
      paddingTop: spacing.sm,
      marginTop: spacing.tight,
    },

    // ── (7) THE MORE ROW ────────────────────────────────────────────────────
    // Four (to seven) equal circles: everything you can DO with a flag, drawn
    // once at one weight, instead of five pills in three outline treatments
    // competing with the verbs.
    moreRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    moreItem: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      // Fixed basis, no grow: 4 x 76 + 3 x 8 = 328 inside the 342pt content
      // column, so the row is 4-up and a fifth item wraps to the LEFT under the
      // first. With flexGrow the lone fifth stretched to the full width and
      // centred itself, which reads as a mistake rather than a row.
      flexGrow: 0,
      flexBasis: 76,
      minWidth: 76,
      minHeight: a11y.minTargetSize,
      paddingVertical: spacing.tight,
      borderRadius: radius.lg,
    },
    moreItemPressed: { backgroundColor: color.borderPressed },
    moreIcon: {
      width: a11y.minTargetSize,
      height: a11y.minTargetSize,
      borderRadius: radius.circle,
      backgroundColor: color.glassNeutralBtn,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreIconActive: { backgroundColor: color.warningBg },
    moreLabel: {
      fontSize: font.size.xs,
      fontWeight: font.weight.semibold,
      color: color.inkSelect,
      textAlign: 'center',
    },
    moreLabelActive: { color: color.warningFg },
    moreLabelDestructive: { color: color.errorStrong },
    // Per-control markers on the More row. They carry no paint — the row is one
    // treatment on purpose — and exist so every control on this sheet is still
    // NAMED at its call site, which is what `inertControlVisual.guard` reads to
    // check each one shows itself going inert.
    viewMapBtn: {},
    directionsBtn: {},
    shareBtn: {},
    historyBtn: {},
    watchBtn: {},
    editBtn: {},
    deleteBtn: {},

    // ── (9) THE ABUSE PATH, AS A SENTENCE ───────────────────────────────────
    // It was an outlined pill wearing a DARKER outline than the navigation trio
    // beside it, which made the safety valve the loudest control in the row.
    // Now it is the document's last sentence, and one of only two underlines on
    // the sheet.
    //
    // NO NEW INK PAIR: `inkGlassMuted` for the sentence and `inkSelect` for the
    // link are both banked, and both were re-measured on the dense bulk floor
    // (7.38:1 light / 8.92:1 dark and 5.85:1 / 10.51:1).
    reportSentence: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    reportSentenceText: {
      fontSize: font.size.sm,
      color: color.inkGlassMuted,
      lineHeight: 19,
    },
    // Still a real 44pt box in both axes — drawing it as a sentence link is not
    // permission to shrink the target (A1).
    reportBtn: {
      minHeight: a11y.minTargetSize,
      minWidth: a11y.minTargetSize,
      justifyContent: 'center',
    },
    reportBtnPressed: { backgroundColor: color.borderPressed },
    reportBtnText: {
      color: color.inkSelect,
      fontWeight: font.weight.semibold,
      fontSize: font.size.sm,
      textDecorationLine: 'underline',
    },
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
      // D13: these measured ~28pt. 44 is the WCAG 2.5.8 / HIG floor, and
      // paddingVertical alone drops below it at the smallest dynamic type — so
      // the minHeight is the guard, not the padding. Same pattern as
      // ReportContentModal's categoryRow, and `justifyContent` is what keeps
      // the label centred once the box is taller than its text.
      minHeight: a11y.minTargetSize,
      justifyContent: 'center',
      borderRadius: radius.circle,
      borderWidth: 1.5,
      borderColor: color.border,
      marginRight: spacing.sm,
      backgroundColor: color.surface,
    },
    // Active chip: filled, and the fill is `ctaFill` — not themed `brand`.
    // C1/D7, at a site the Phase 0 sweep did not enumerate because it worked
    // from a three-name list. `categoryChipTextActive` is white at 13pt bold,
    // which needs 4.5:1; dark `brand` #4E89EF measures 3.42:1 there. Light
    // `brand` IS #1466E0, so light mode is byte-identical and only the failing
    // mode moves. (MapScreen's filter panel wears the same pattern and is that
    // train's to align — noted in build/02/BUILD_REPORT.md.)
    categoryChipActive: { borderColor: color.ctaFill, backgroundColor: color.ctaFill },
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
    saveBtn: { flex: 1, backgroundColor: color.ctaFill },
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
    // Prompt B B-UX-002: same recipe as commentsErrorBanner above (error-red
    // tappable area, visible text doubling as the accessible name) — kept as
    // its own scoped style group rather than sharing the comments-prefixed
    // one, matching this file's per-surface naming.
    photosSpinner: {
      alignSelf: 'flex-start',
    },
    photosErrorBanner: {
      backgroundColor: color.errorBg,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 44,
    },
    photosErrorBannerPressed: { backgroundColor: color.errorPressed },
    photosErrorText: {
      flex: 1,
      fontSize: font.size.sm,
      color: color.errorFg,
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
      // D14: `maxHeight: 100` clipped a long comment at AX text sizes — about
      // two lines at 2.35x — inside a sheet that already scrolls. A cap on a
      // multiline field is only ever protecting a container that cannot grow,
      // and this one can.
    },
    commentSendBtn: {
      // C1/D7 again: white "Send" at 13pt bold on themed `brand` is 3.42:1 in
      // dark. Its PRESSED state was already `ctaFillPressed`, so the press was
      // crossing the palette boundary — the exact tell D2b recorded for the
      // three verbs. Light is byte-unchanged.
      backgroundColor: color.ctaFill,
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
    // photo_alt: describe-then-attach row for a picked-but-not-uploaded photo.
    pendingPhotoCard: {
      borderWidth: 1,
      borderColor: color.borderSubtle,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: color.surfaceSoft,
      gap: spacing.sm,
    },
    pendingPhotoRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    pendingPhotoThumb: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: color.border,
    },
    pendingPhotoInput: {
      // The shared commentInput style already flexes + meets 44pt. D14: the
      // `maxHeight: 120` that used to live here clipped the photo description
      // at AX sizes — worst on the one field whose whole job is describing an
      // image for somebody who cannot see it.
    },
    pendingPhotoActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    pendingPhotoCancel: {
      minHeight: 44,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pendingPhotoCancelText: {
      color: color.textMuted,
      fontWeight: font.weight.semibold,
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
      // A pill, not a bar. Stretched to the cluster's full width it read as a
      // fourth segment cell — the collapse §SKY-3c corrects, arrived at by
      // layout instead of by wording.
      alignSelf: 'flex-start',
      borderRadius: radius.lg,
      paddingHorizontal: 14,
      minHeight: a11y.minTargetSize,
      justifyContent: 'center',
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
