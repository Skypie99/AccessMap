import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
// RNGH ScrollView, not react-native's — its ref exposes .handlerTag, which
// SheetPull's simultaneousHandlers={scrollRef} needs to coexist with
// pull-to-dismiss on native. Full mechanism: LegendModal.tsx.
import { ScrollView } from 'react-native-gesture-handler';
import { AppText } from '@/components/ui/AppText';
import { TypeBlock, TYPE_BLOCK } from '@/components/ui/TypeBlock';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { OverflowFade } from '@/components/ui/OverflowFade';
import { SheetGrabber } from '@/components/ui/Sheet';
import { SheetPull, useAtTop } from '@/components/ui/SheetPull';
import { useHorizontalOverflowFade } from '@/hooks/useOverflowFade';
import { useFocusedInputScroll } from '@/hooks/useFocusedInputScroll';
import { SeverityDisc } from '@/components/SeverityDisc';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { hapticNotify, hapticSelection } from '@/lib/haptics';
import { Accessibility, Brain, Camera, Check, Construction, Ear, Eye, Lock, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth';
import { track } from '@/lib/analytics';
import { errorMessage } from '@/lib/errors';
import { webShare } from '@/lib/webShare';
import { confirm, notify } from '@/lib/confirm';
import { isContentBlockedError, showBlockedContentAlert } from '@/lib/blockedContent';
import { useLegalSheets } from '@/components/LegalSheets';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  cancelFlagPhotoUpload,
  createAnonFlag,
  createFlag,
  type ContextTagsCapability,
  severityColor,
  SEVERITY_DESCRIPTIONS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  subscribeContextTagsCapability,
  uploadFlagPhoto,
} from '@/lib/flags';
import { checkAnonRateLimit, recordAnonSubmit } from '@/lib/anonRateLimit';
import { batchInsertFlagPhotos } from '@/lib/photos';
import PhotoGallery from '@/components/PhotoGallery';
import CategoryIcon from '@/components/CategoryIcon';
import {
  CONTEXT_TAGS,
  CONTEXT_TAG_LABELS,
  DISABILITY_TAGS,
  DISABILITY_TAG_LABELS,
  MAX_CONTEXT_TAGS,
  SEASONAL_TAGS,
  SEASONAL_TAG_LABELS,
  toggleTag,
  type ContextTag,
  type DisabilityTag,
} from '@/lib/contextTags';
import { validReportTemplates, type ReportTemplate } from '@/lib/reportTemplates';
import { stashReportDraft, takeReportDraft } from '@/lib/reportDraft';
import {
  REPORT_DRAFT_KEPT_ANNOUNCEMENT,
  REPORT_DRAFT_RESTORED_ANNOUNCEMENT,
  REPORT_SIGN_IN_HINT,
} from '@/lib/copy';
import type { FlagCategory, FlagRow, FlagSeverity } from '@/types/database';
import { setLiveStatus } from '@/lib/liveStatus';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { a11y, font, gradient, radius, severity as severityRamp, shadow, spacing } from '@/theme';
import { a11yToggle, decorativeProps, isAxRecompose, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

/** Lucide icon for each disability tag — adds visual distinction (no emoji, per
 *  the brand icon rule). Describes the BARRIER type, not any person's identity. */
type DisabilityIconCmp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const DISABILITY_TAG_ICONS: Readonly<Record<DisabilityTag, DisabilityIconCmp>> = {
  mobility_barrier: Accessibility,
  vision_hazard: Eye,
  hearing_concern: Ear,
  cognitive_load: Brain,
  temporary_closure: Construction,
};

/**
 * Q6 — the button says what it does, out loud and on the glass.
 *
 * The contract used to be restated to screen-reader users only: the visible
 * word was "Submit report" while the accessibleLabel said "Submit report
 * anonymously". The store dossier (2026-08-05) praised that restatement — it
 * was praising a label sighted users never got. One string now serves both
 * channels, which is also the only shape that satisfies WCAG 2.5.3 once the
 * visible word changes at all.
 *
 * PLACEHOLDER COPY: logged in build/COPY_LEDGER.md as SKY-WORDS-REQUIRED.
 */
const SUBMIT_LABEL_ANON = 'Submit anonymously';
const SUBMIT_LABEL = 'Submit report';

interface Props {
  visible: boolean;
  location: { lat: number; lng: number } | null;
  onClose: () => void;
  /** Called on a successful submit with the created flag, so the host can
   *  refresh and (S10) optionally recenter the map on the new pin. */
  onCreated: (flag?: FlagRow) => void;
  /** S5: re-run the host screen's locating spine from inside the sheet (the
   *  "Use my location" retry). Optional so callers that always pass a location
   *  can omit it — the retry control only renders when both this and a null
   *  location are present. */
  onRequestLocation?: () => void;
  /**
   * G5: fired when the surface has ACTUALLY left the screen (iOS onDismiss;
   * elsewhere the opener's `release()` stands in). The opener uses it to hand
   * the screen-reader cursor back to the control that opened this surface.
   * Optional — an opener with no trigger to return to passes nothing.
   */
  onDismiss?: () => void;
  /** SW-11: the host knows whether the OS permission was actually DENIED, as
   *  opposed to still resolving. Without it this sheet can only say "Waiting
   *  for location…", which is a lie once the user has said no — and it said it
   *  forever. */
  locationDenied?: boolean;
  /** SW-37: the way out of the no-location dead-end — hand the map back so the
   *  user can place the pin themselves. Optional, and the host passes it only
   *  where manual placement is permitted, so this sheet never has to know the
   *  rule (it mirrors the long-press gate; see MapScreen). The control renders
   *  only when this and a null location are both present. */
  onPlaceOnMap?: () => void;
  /** Q17: which answer the coordinate is. The sheet cannot work this out for
   *  itself — the host passes either the user's GPS fix or the pin they placed,
   *  and both arrive as the same `location` object. Without it the location line
   *  would have to say "at 49.88800, -119.49600" (the engineer's answer to a
   *  human question) or guess. Defaults to 'gps', which is what the FAB path is
   *  and what every existing caller means. */
  locationSource?: 'gps' | 'pin';
}

interface ReportDraftBaseline {
  category: FlagCategory;
  severity: FlagSeverity | null;
  description: string;
  photoUris: string[];
  photoAlts: Record<string, string>;
  contextTags: ContextTag[];
  location: Props['location'];
  locationSource: NonNullable<Props['locationSource']>;
}

function normalizePhotoAlts(photoUris: readonly string[], photoAlts: Record<string, string>) {
  return Object.fromEntries(
    photoUris.map((uri) => [uri, photoAlts[uri]?.trim() ?? '']),
  );
}

function sameStringArray(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function samePhotoAlts(a: Record<string, string>, b: Record<string, string>) {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  return sameStringArray(aKeys, bKeys) && aKeys.every((key) => a[key] === b[key]);
}

function sameLocation(a: Props['location'], b: Props['location']) {
  if (a === null || b === null) return a === b;
  return a.lat === b.lat && a.lng === b.lng;
}

export default function ReportFlagModal({ visible, location, onClose, onCreated, onRequestLocation, onDismiss, locationDenied, onPlaceOnMap, locationSource = 'gps' }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // T14 (F2-07): the templates + category chip rails earn the overflow scent.
  const templatesFade = useHorizontalOverflowFade();
  const categoriesFade = useHorizontalOverflowFade();
  // F4: one threshold for the whole app's recomposition — the same one Home,
  // Tasks, SignIn, FlagCard and the map bar change shape on.
  const { fontScale } = useWindowDimensions();
  const axRecompose = isAxRecompose(fontScale);
  const { user } = useAuth();
  const isAnon = !user;

  /**
   * Q17 — the coordinate, on demand.
   *
   * The visible line answers "where is this?" in words; this is the escape
   * hatch for the user who wants the numbers (to check them, or to send them
   * somewhere). Mirrors FlagDetailModal's "Copy coordinates" link: the OS
   * share sheet on native, the Web Share API with a clipboard fallback on web.
   * A user cancel is silent on both, because a cancel is not an error.
   */
  const formattedCoords = location
    ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
    : '';
  const handleCopyCoords = async () => {
    if (!location) return;
    if (Platform.OS === 'web') {
      try {
        await webShare({ title: 'Report location', text: formattedCoords });
      } catch (e) {
        const msg = errorMessage(e);
        if (/cancel|dismiss|abort/i.test(msg)) return;
        notify("Couldn't copy coordinates", msg);
      }
      return;
    }
    try {
      await Share.share({ message: formattedCoords, title: 'Report location' });
    } catch (e) {
      const msg = errorMessage(e);
      if (/cancel|dismiss/i.test(msg)) return;
      notify("Couldn't copy coordinates", msg);
    }
  };

  const reducedMotion = useReducedMotion();
  // Pull-to-dismiss gating (map-gestures SPEC §2.6). `atTop` is the half of the
  // rule that keeps this form usable: mid-scroll, a downward drag belongs to the
  // ScrollView, never to the dismissal. `keyboardVisible` is the other gate —
  // while typing, a drag means "put the keyboard away", not "throw my report
  // away". SW-52 raised the stakes on both gates rather than lowering them: a
  // dismissal now DOES clear the draft (it has to — a cancelled photo was being
  // published with the next report), so an accidental one costs the user their
  // work instead of nothing. The "Sign in" handoff and the SW-37 pin round trip
  // are the two exits that still keep everything.
  const { atTop, onScroll, scrollEventThrottle } = useAtTop();
  const keyboardVisible = useKeyboardVisible();
  const scrollRef = useRef<ScrollView>(null);
  const descriptionReveal = useFocusedInputScroll(scrollRef, keyboardVisible, spacing.lg);
  // Non-throwing context read — render tests mount without a provider (the
  // M15 family recipe; see MyWatchedModal).
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  // §SKY-7 — the blocked-content alert's route to the guidelines. This modal
  // mounts from MapScreen, inside <SharedModalsProvider>; TermsScreen's single
  // mount in SharedModalsHost is what lets it present over this sheet.
  // This surface is itself a Modal, so the shared navigator-level host
  // cannot present over it — iOS refuses a second presentation from an
  // already-presenting VC and the link silently does nothing. Mounted
  // locally it presents from THIS modal's VC. See LegalSheets.tsx.
  const legal = useLegalSheets();
  // WCAG 2.4.3: move the screen-reader cursor onto the title when the modal opens.
  const titleRef = useFocusOnOpen<Text>(visible);
  const [category, setCategory] = useState<FlagCategory>('no_ramp');
  /**
   * Q5 — no default severity.
   *
   * This was `useState<FlagSeverity>(3)`: three of five, pre-chosen, on a
   * judgment scale. A default on a judgment scale biases the data (every hurried
   * report becomes a 3) and quietly removes the moment where the user is asked
   * to RATE — the one act that makes the severity ramp mean anything. Null until
   * they choose; Submit does not light until they have.
   */
  const [severity, setSeverity] = useState<FlagSeverity | null>(null);
  // Q17: the coordinates are the answer to a question nobody asked on this
  // form. They stay one tap away rather than being the second line of the
  // sheet — the place where, at accessibility sizes, the screen's least useful
  // information was rendered at its most legible (X7). Reset with the form.
  const [coordsShown, setCoordsShown] = useState(false);

  /**
   * SW-11 / SW-37 — why Submit is blocked, said out loud.
   *
   * Three different states used to share one sentence ("Waiting for your
   * location…"), and for a guest who had DENIED location that sentence was both
   * false and a dead end: it pointed at "Use my location", the one control that
   * cannot help, because the OS has already answered. Guests are the case the
   * finding was actually about, and manual placement is deliberately not open to
   * them (see handleMapLongPress) — so the honest answer names the constraint
   * and the way out of it, rather than leaving them to guess.
   */
  const blockedReason = (): string | undefined => {
    // Q5: a rated report is now a precondition, so the hint has to be able to
    // say so. Location comes first because a report with no place cannot be
    // filed at all, while an unrated one is one tap from being filable.
    // PLACEHOLDER COPY (SKY-WORDS-REQUIRED).
    if (location) {
      return severity === null
        ? 'Choose a severity from 1 to 5 to submit this report.'
        : undefined;
    }
    if (onPlaceOnMap) {
      return "This report needs a location. Tap 'Use my location' or 'Place the pin on the map' above.";
    }
    if (locationDenied) {
      return isAnon
        ? 'Anonymous reports can only be filed where you are. Turn on location, or sign in to place the pin yourself.'
        : 'Location is off for Flagstone. Turn it on to file this report.';
    }
    return "Waiting for your location. Tap 'Use my location' above to try again.";
  };

  /**
   * Q5 — Submit is not a live control until the report is filable.
   *
   * Two preconditions now, not one: a place (unchanged) and a rating. Kept
   * separate from `submitting` because they are different states wearing
   * different clothes — blocked is inert and soft-tinted, busy is working and
   * still brand-filled.
   */
  const submitBlocked = !location || severity === null;
  const [description, setDescription] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  // Per-photo VoiceOver descriptions, keyed by local uri. Optional; trimmed
  // and capped at 200 on submit. Keyed by uri (not index) so removals can't
  // shift a description onto the wrong photo.
  const [photoAlts, setPhotoAlts] = useState<Record<string, string>>({});
  const [contextTags, setContextTags] = useState<ContextTag[]>([]);
  // A persistent modal can temporarily hide for pin placement, so the baseline
  // belongs to a report session rather than every visible prop transition.
  const baselineRef = useRef<ReportDraftBaseline | null>(null);
  const reportSessionActiveRef = useRef(false);
  const locationChangeRequestedRef = useRef(false);
  const confirmingCloseRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  // S11: a WRITE that outruns this threshold surfaces an in-sheet "still
  // trying" overlay while the insert CONTINUES (never aborted — a
  // committed-but-slow write + a false failure would invite a duplicate the
  // anon 5/day limit then punishes).
  const [submitStalled, setSubmitStalled] = useState(false);
  // Synchronous re-entry guard. The Submit button's `disabled` reads the
  // `submitting` STATE, which doesn't flip until React re-renders — so a
  // rapid second tap before the re-render lands could start a duplicate
  // submit (F3). This ref is set synchronously at the top of handleSubmit
  // (right before setSubmitting(true), see L4) so the second tap bails.
  const submittingRef = useRef(false);
  // Web-only: hidden <input type="file"> used as the image picker substitute.
  const webFileInputRef = useRef<HTMLInputElement | null>(null);
  // B8 (L7-05): picker-reported dimensions per picked uri, used to drive the
  // downscale-on-ingest at upload time. Kept out of `photoUris` (which stays a
  // plain string[]) so the sheet's photo state and PhotoGallery mapping are
  // untouched. Web picks carry no dims — stripExifWeb self-measures the canvas.
  const photoDimsRef = useRef<Record<string, { width: number; height: number }>>({});
  // Mirror of the module-level capability flag in src/lib/flags.ts. When
  // it flips to 'unavailable' (the propose-only migration isn't on this
  // backend yet) we disable the chip picker and surface a "coming soon"
  // hint instead of letting the user pick tags that get silently dropped.
  const [tagsCapability, setTagsCapability] = useState<ContextTagsCapability>('unknown');
  useEffect(() => subscribeContextTagsCapability(setTagsCapability), []);

  // Capture defaults before the consume-once sign-in draft restores below. A
  // restored draft is user-authored work and must therefore still be protected.
  useEffect(() => {
    if (!visible || reportSessionActiveRef.current) return;
    reportSessionActiveRef.current = true;
    baselineRef.current = {
      category,
      severity,
      description: description.trim(),
      photoUris: [...photoUris],
      photoAlts: normalizePhotoAlts(photoUris, photoAlts),
      contextTags: [...contextTags],
      location,
      locationSource,
    };
  }, [category, contextTags, description, location, locationSource, photoAlts, photoUris, severity, visible]);

  // A11Y-226 (WCAG 3.3.7): rehydrate a stashed guest draft when the form
  // opens. The stash is written by the anon banner's "Sign in" press below —
  // signing in unmounts the whole guest tree (App.tsx Gate swap), which is
  // why the draft has to live outside this component. Consume-once, so a
  // stale draft can't resurrect into a later unrelated session.
  useEffect(() => {
    if (!visible) return;
    const draft = takeReportDraft();
    if (!draft) return;
    setCategory(draft.category);
    setSeverity(draft.severity);
    setDescription(draft.description);
    setPhotoUris(draft.photoUris);
    setContextTags(draft.contextTags);
    photoDimsRef.current = { ...draft.photoDims };
    setPhotoAlts({ ...draft.photoAlts });
    AccessibilityInfo.announceForAccessibility(REPORT_DRAFT_RESTORED_ANNOUNCEMENT);
  }, [visible]);
  const tagsDisabled = tagsCapability === 'unavailable';

  // When severity crosses into "high" territory (≥4) and the user hasn't
  // attached a photo yet, announce a nudge to screen readers via
  // AccessibilityInfo (iOS VoiceOver — Android uses accessibilityLiveRegion
  // on the rendered hint element). Only fires on severity change, not on
  // every render, and never fires if a photo is already attached.
  const prevHighRef = useRef(false);
  useEffect(() => {
    const isHigh = severity !== null && severity >= 4 && photoUris.length === 0;
    if (isHigh && severity !== null && !prevHighRef.current) {
      void AccessibilityInfo.announceForAccessibility(
        `Tip: adding a photo helps verify this ${SEVERITY_LABELS[severity].toLowerCase()} barrier without a site visit.`,
      );
    }
    prevHighRef.current = isHigh;
  }, [severity, photoUris]);

  // L7: release a draft photo's blob URL once it can never be shown again.
  // Web picks create object URLs (URL.createObjectURL in pickPhoto) that pin
  // the underlying File in memory until explicitly revoked — same leak class
  // as F25 in FlagDetailModal. Native file:// URIs fail the blob: check and
  // pass through untouched. Called ONLY post-settle — from removeUri (the
  // user discards a pick) and reset() (after a successful submit). A FAILED
  // submit must NOT revoke: the draft previews stay alive so the user can
  // retry without re-picking.
  const releaseUri = (uri: string) => {
    if (!uri.startsWith('blob:')) return;
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(uri);
    }
  };

  const reset = () => {
    setCategory('no_ramp');
    setSeverity(null);
    setDescription('');
    setCoordsShown(false);
    // L7: the drafts are gone for good once the form resets — release their
    // blob URLs. (SW-52: reset now also runs on an explicit CANCEL, not only
    // after a successful submit. A FAILED submit still does not reset, so the
    // no-revoke-on-failure rule above is untouched.)
    photoUris.forEach(releaseUri);
    setPhotoUris([]);
    setPhotoAlts({});
    setContextTags([]);
    setAppliedTemplateId(null);
    baselineRef.current = null;
    reportSessionActiveRef.current = false;
    locationChangeRequestedRef.current = false;
  };

  /**
   * R2-F3 — every explicit close path asks before it discards meaningful work.
   *
   * The baseline is scoped to the current report session. Background GPS
   * resolution stays clean; only an explicit location replacement can make the
   * effective location part of the draft. Sign-in and pin-placement continue to
   * use their intentional preservation paths without calling this guard.
   */
  const requestClose = async () => {
    if (submittingRef.current || confirmingCloseRef.current) return;
    const baseline = baselineRef.current;
    const dirty =
      baseline !== null &&
      (
        category !== baseline.category ||
        severity !== baseline.severity ||
        description.trim() !== baseline.description ||
        !sameStringArray(photoUris, baseline.photoUris) ||
        !samePhotoAlts(normalizePhotoAlts(photoUris, photoAlts), baseline.photoAlts) ||
        !sameStringArray(contextTags, baseline.contextTags) ||
        (
          locationChangeRequestedRef.current &&
          (!sameLocation(location, baseline.location) || locationSource !== baseline.locationSource)
        )
      );

    if (dirty) {
      confirmingCloseRef.current = true;
      const discard = await confirm(
        'Discard report?',
        'Your unsent report will be lost.',
        'Discard',
        true,
      );
      confirmingCloseRef.current = false;
      if (!discard) return;
    }

    reset();
    onClose();
  };

  // Templates list — computed once per render. validReportTemplates filters
  // out any whose category/severity drifted out of the enum, so a future
  // category rename can't leak a broken chip into the picker.
  const templates = validReportTemplates();

  // Track which template the user last applied so the chip can render in
  // a selected/active style. Cleared when the user manually changes any
  // field that the template populated, so the chip doesn't lie about
  // matching the live form.
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);

  const applyTemplate = (t: ReportTemplate) => {
    setCategory(t.category);
    setSeverity(t.severity);
    // Only overwrite description if it's empty OR was clearly placed by a
    // previous template tap (we can't distinguish from typed text after
    // the fact, but a fresh form / re-tap is the common case). Erring on
    // the side of overwriting keeps the chip useful — the user can always
    // edit the textbox after.
    // F62 (re-sweep): only claim a description was pre-filled when it
    // actually was — with a non-empty draft the announcement lied to SR users.
    const seededDescription = description.trim() === '' && !!t.description;
    if (description.trim() === '') {
      setDescription(t.description ?? '');
    }
    setAppliedTemplateId(t.id);
    // Screen-reader users don't see the chip-tint change; announce so
    // they know the form jumped.
    AccessibilityInfo.announceForAccessibility(
      `Template applied: ${t.label}. Category, severity${
        seededDescription ? ', and a starter description' : ''
      } pre-filled. Edit any field before submitting.`,
    );
  };

  const MAX_PHOTOS = 5;

  const addUri = (uri: string) => {
    setPhotoUris((curr) => (curr.length < MAX_PHOTOS ? [...curr, uri] : curr));
  };

  // Drop a picked-but-not-yet-submitted photo by index. Lets the user undo a
  // mistaken pick before filing the report (the photos aren't uploaded until
  // handleSubmit, so this is purely local state).
  const removeUri = (index: number) => {
    // L7: revoke the blob URL before dropping the pick — once filtered out
    // the preview can never render again, but without the revoke the object
    // URL would keep the File bytes alive for the whole page session.
    const removed = photoUris[index];
    if (removed !== undefined) {
      releaseUri(removed);
      delete photoDimsRef.current[removed];
      // Drop the removed photo's description too — keyed by uri, so this
      // can't orphan or shift onto a different photo.
      setPhotoAlts((curr) => {
        if (!(removed in curr)) return curr;
        const next = { ...curr };
        delete next[removed];
        return next;
      });
    }
    setPhotoUris((curr) => curr.filter((_, i) => i !== index));
  };

  const pickPhoto = async (_source: 'camera' | 'library') => {
    // Web path — use a hidden <input type="file"> instead of expo-image-picker,
    // which is native-only. The input is programmatically clicked; the selected
    // file is converted to a blob URL so the rest of the upload path (which
    // just needs a URI string) works unchanged.
    if (Platform.OS === 'web') {
      if (!webFileInputRef.current) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.onchange = () => {
          const file = input.files?.[0];
          if (file) {
            addUri(URL.createObjectURL(file));
          }
        };
        document.body.appendChild(input);
        webFileInputRef.current = input;
      }
      webFileInputRef.current.click();
      return;
    }

    // Native path — expo-image-picker.
    try {
      const perm =
        _source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notify(
          'Permission needed',
          `Allow ${_source === 'camera' ? 'camera' : 'photo library'} access to attach a photo.`,
        );
        return;
      }
      const result =
        _source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
            });
      if (!result.canceled && result.assets[0]?.uri) {
        const asset = result.assets[0];
        if (typeof asset.width === 'number' && typeof asset.height === 'number') {
          photoDimsRef.current[asset.uri] = { width: asset.width, height: asset.height };
        }
        addUri(asset.uri);
      }
    } catch (e) {
      notify("Couldn't pick a photo", errorMessage(e));
    }
  };

  // Unified add-photo handler passed to PhotoGallery's onAddPhoto prop.
  // On native shows an action sheet to choose camera vs library; on web
  // triggers the hidden file input.
  const pickPhotoForGallery = () => {
    if (Platform.OS === 'web') {
      void pickPhoto('library');
      return;
    }
    Alert.alert('Add photo', undefined, [
      { text: 'Take photo', onPress: () => void pickPhoto('camera') },
      { text: 'Choose from library', onPress: () => void pickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    // F3: bail on a rapid second tap. Set synchronously (before any await) so
    // it closes the window the state-based button `disabled` can't.
    if (submittingRef.current) return;
    if (!location) {
      notify('No location', 'We need your location to place the flag.');
      return;
    }
    // Q5: the button is already disabled while nothing is chosen. This is the
    // same belt-and-braces the location check above is — and it is what narrows
    // `severity` to FlagSeverity for the two create calls below.
    if (severity === null) return;
    submittingRef.current = true;
    // L4: flip the STATE here too (not after the awaits below) so the whole
    // form — chips, pills, text input, photo gallery — disables for the
    // entire in-flight window, including the anon rate-limit check.
    setSubmitting(true);

    // S11: a slow WRITE is escalated, never aborted. After a threshold, show an
    // in-sheet "still trying" overlay while the insert continues; aborting a
    // possibly-committed write would invite a duplicate the anon 5/day limit
    // punishes. `endStall()` is called on every exit path so the timer can't
    // fire after the submit settles.
    setSubmitStalled(false);
    const stallTimer = setTimeout(() => setSubmitStalled(true), 12_000);
    const endStall = () => {
      clearTimeout(stallTimer);
      setSubmitStalled(false);
    };

    // Anonymous submission path — no photo upload, no context tags.
    if (isAnon) {
      try {
        await checkAnonRateLimit();
      } catch {
        submittingRef.current = false;
        setSubmitting(false);
        endStall();
        // F46: Alert.alert with buttons is a silent no-op on web — the anon
        // rate limit MUST be visible there (anon reporting is a web flow).
        if (Platform.OS === 'web') {
          notify(
            'Daily limit reached',
            "You've reported 5 barriers today — thanks for contributing! Sign in to report more.",
          );
        } else {
          Alert.alert(
            'Daily limit reached',
            "You've reported 5 barriers today — thanks for contributing! Sign in to report more.",
            [
              { text: 'Sign In', onPress: onClose },
              { text: 'OK', style: 'cancel' },
            ],
          );
        }
        return;
      }
      try {
        const created = await createAnonFlag({
          lat: location.lat,
          lng: location.lng,
          category,
          severity,
          description: description.trim() || undefined,
        });
        await recordAnonSubmit();
        track('flag_created', { category, severity, hasPhoto: false });
        hapticNotify('success');
        reset();
        onCreated(created);
        onClose();
        // S10: confirm the submit for EVERYONE — including the otherwise-silent
        // web-anonymous cohort — via the persistent-mounted, guest-reachable
        // live region (visible + announced). Fires after onClose (PROTECT-3).
        setLiveStatus({
          message: 'Report filed — thanks for flagging this barrier',
          tone: 'success',
          autoDismissMs: 4000,
        });
      } catch (e) {
        notify("Couldn't submit your report", errorMessage(e));
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
        endStall();
      }
      return;
    }

    // Authenticated path. Every photo gets a durable intent before direct
    // Storage receives bytes; a failed submit preserves that uncertainty for
    // server reconciliation rather than deleting based on client timing.
    const preparedPhotos: { intentId: string; url: string; path: string }[] = [];
    try {
      for (const uri of photoUris) {
        const dims = photoDimsRef.current[uri];
        preparedPhotos.push(await uploadFlagPhoto(user.id, uri, dims?.width, dims?.height));
      }

      const result = await createFlag(user.id, {
        lat: location.lat,
        lng: location.lng,
        category,
        severity,
        description: description.trim() ? description.trim() : null,
        // Only the commit RPC writes canonical photo provenance after exact
        // bucket/key/owner verification. Direct report creation is photo-free.
        photo_url: null,
        photo_alt: null,
        // Only send the field when the user actually picked tags. Empty
        // array means "no context"; createFlag still tries the column path
        // so it stays exercised, but skipping it keeps the legacy insert
        // path cheap (one round-trip) when no tags are selected.
        context_tags: contextTags.length > 0 ? [...contextTags] : undefined,
      });
      // The server, not a client success report, creates photo metadata.
      // F57 (re-sweep): a junction-row failure AFTER createFlag succeeded used
      // to reject the whole submit — the user was told it failed, retried, and
      // created a DUPLICATE public flag. The report exists; say photos didn't
      // attach and finish the flow normally.
      try {
        await batchInsertFlagPhotos(
          result.row.id,
          preparedPhotos.map((photo, i) => ({
            intentId: photo.intentId,
            alt: photoUris[i] ? photoAlts[photoUris[i]] || null : null,
          })),
        );
      } catch (photoLinkErr) {
        console.warn('[report] photo link insert failed:', photoLinkErr);
        if (preparedPhotos.length > 0) {
          notify(
            'Report filed — photos not attached',
            'Your report was saved, but its photos could not be attached. You can add photos again from the flag details.',
          );
        }
      }
      // If we asked the server to store tags but the column isn't there
      // yet (capability flipped to 'unavailable' inside createFlag), tell
      // the user — they shouldn't think their picks were saved when they
      // weren't. Non-blocking alert: the report itself DID land.
      if (!result.tagsAccepted && contextTags.length > 0) {
        notify(
          'Flag saved without context tags',
          'Your report was filed, but the context tags you picked could not be stored yet (server update pending). The picker will be re-enabled automatically once it is.',
        );
      }
      track('flag_created', { category, severity, hasPhoto: preparedPhotos.length > 0 });
      hapticNotify('success');
      reset();
      onCreated(result.row);
      onClose();
      // S10: visible + live success confirmation via the persistent-mounted
      // region (it owns the native announce, so the standalone
      // announceForAccessibility here is retired — no double-announce). On the
      // photo path we keep the truthful post-EXIF-strip line: a resolved
      // uploadFlagPhoto above PROVES the fail-closed strip+verify passed
      // (flags.ts throws otherwise), so the GPS-removal claim is honest
      // (PROTECT-8). Presentation-only — no change to flags.ts or the upload.
      setLiveStatus({
        message:
          preparedPhotos.length > 0
            ? 'Report filed — thanks for flagging this barrier. Location data was removed from your photos.'
            : 'Report filed — thanks for flagging this barrier',
        tone: 'success',
        autoDismissMs: 4000,
      });
    } catch (e) {
      // Server cancellation records AMBIGUOUS, never client-inferred absence.
      // The operation can later be reviewed on the same deletion request.
      if (preparedPhotos.length > 0) {
        void Promise.all(preparedPhotos.map((photo) => cancelFlagPhotoUpload(photo.intentId))).catch(() => undefined);
      }
      // §SKY-7: same coherence fix as the comment path — a description
      // rejected by the filter now offers the guidelines it was judged
      // against. Every other failure keeps notify() unchanged, so the three
      // two-argument assertions in ReportFlagModal.test.tsx still hold.
      if (isContentBlockedError(e)) {
        showBlockedContentAlert("Couldn't submit your report", legal.openTerms);
      } else {
        notify("Couldn't submit your report", errorMessage(e));
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      endStall();
    }
  };

  // A sticky action row is useful at normal text, but at AX it subtracts a
  // fixed block from an already keyboard-reduced viewport. Keep one action
  // drawing and move it into the form scroller only for the large-text
  // composition, where it remains reachable without covering form content.
  const actionsInScroll = axRecompose;
  const actions = (
    <View style={[styles.actions, { paddingBottom: Math.max(spacing.xxl, insets.bottom) }]}>
      <Pressable
        onPress={() => void requestClose()}
        disabled={submitting}
        style={({ pressed }) => [styles.actionBtn, styles.cancelBtn, pressed && styles.chipPressed]}
        accessibilityRole="button"
        accessibilityLabel="Cancel and close"
        {...a11yToggle({ disabled: submitting })}
      >
        <AppText variant="label" style={styles.cancelText}>Cancel</AppText>
      </Pressable>
      <Pressable
        onPress={handleSubmit}
        disabled={submitting || submitBlocked}
        style={[
          styles.actionBtn,
          styles.submitBtn,
          // C5: ONE disabled grammar. A blocked fill wears the soft-tint
          // pair (brandSoft/brandOnSoft) — the same grammar the rest of
          // the estate's inert fills use — instead of a glowing brand
          // gradient held at 0.6 opacity, which reads as a live button
          // somebody dimmed. The BUSY state is not this: it keeps the
          // gradient and the white ink, because a button mid-flight is
          // working, not inert.
          submitBlocked && styles.submitBtnBlocked,
          submitting && styles.submitBtnDisabled,
        ]}
        accessibilityRole="button"
        // Q6: one label, seen and spoken. The visible word and the
        // accessible name are the SAME string now — see the label below.
        accessibilityLabel={isAnon ? SUBMIT_LABEL_ANON : SUBMIT_LABEL}
        // SW-37: never point a blocked user at the ONE control that cannot
        // help them. Under a denial "Use my location" only re-asks a
        // question the OS has already answered.
        accessibilityHint={blockedReason()}
        {...a11yToggle({ disabled: submitting || submitBlocked, busy: submitting })}
      >
        {({ pressed }) => (
          <>
            {!submitBlocked && (
            <LinearGradient
              colors={gradient.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]}
              pointerEvents="none"
            />
            )}
            {/* T4: pressed scrim ABOVE the gradient, BELOW the label — the
                brand CTA answers the finger without dimming its white text. */}
            {pressed && (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.submitPressedScrim]} />
            )}
            {submitting ? (
              // T9 (F5-09): keep WORDS beside the spinner — a silent spinner
              // makes the wait wordless; "Filing your report…" says what's happening.
              <View style={styles.submitBusyRow}>
                <ActivityIndicator color={color.textOnBrand} />
                <AppText variant="label" style={styles.submitText}>Filing your report…</AppText>
              </View>
            ) : (
              <AppText
                variant="label"
                style={[styles.submitText, submitBlocked && styles.submitTextBlocked]}
              >
                {isAnon ? SUBMIT_LABEL_ANON : SUBMIT_LABEL}
              </AppText>
            )}
          </>
        )}
      </Pressable>
    </View>
  );

  return (
    // WCAG 2.3.3 (Animation from Interactions): skip the slide animation
    // when the user has requested reduced motion.
    // G9/SR-068: `onRequestClose` was the ONLY dismissal path on this surface
    // without a mid-flight guard. The visible Cancel at :1073 is already
    // `disabled={submitting}`, so Android back / web Escape could close the
    // sheet out from under an in-flight createFlag while the button that does
    // the same thing was correctly inert. S11 escalates-never-aborts, so the
    // insert continues after the close and a re-filled resubmit duplicates it.
    // This removes the asymmetry; it does not invent a new trap.
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={() => void requestClose()} onDismiss={onDismiss} aria-label={isAnon ? 'Report anonymously' : 'Report a flag'}>
      <View style={styles.backdrop}>
        {/* KAV wraps the WHOLE card from the backdrop (the FeedbackModal /
            AddressSearchModal recipe): rooted here its keyboard-overlap math
            uses screen coordinates, so the normal sticky footer and the AX
            body scroller both end above the keyboard. Nesting it inside the
            card measured parent-relative frames and under-lifted
            (adversarial-review finding). The 88% normal cap lives on the KAV
            so the percentage resolves against the full-height backdrop. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.kav, (axRecompose || keyboardVisible) && styles.kavExpanded]}
        >
        {/* Pull-down-to-dismiss. The card is the drag target; the containment
            node and escape handler are unchanged. SheetPull only adds a
            transform wrapper, with an expanded viewport at XXXL or while the
            keyboard is visible. `onDismiss={requestClose}`
            is the same guard the Cancel button and onRequestClose use, so the
            swipe inherits the focus-return contract instead of forking a second
            dismissal path. Guarded by !submitting exactly like Cancel: the
            gesture must never be the one door that closes a submitting sheet. */}
        <SheetPull
          onDismiss={() => void requestClose()}
          enabled={!submitting && !keyboardVisible}
          atTop={atTop}
          simultaneousHandlers={scrollRef}
          style={(axRecompose || keyboardVisible) ? styles.pullExpanded : undefined}
        >
        <GlassSurface
          variant="bulk"
          borderRadius={0}
          style={[
            styles.card,
            (axRecompose || keyboardVisible) && styles.cardExpanded,
            (axRecompose || keyboardVisible) && { marginTop: insets.top + spacing.sm },
          ]}
          accessibilityViewIsModal
          // G1 + G9: the same `!submitting` guard the visible Cancel and
          // onRequestClose use. This is the LIVE containment node — RN's Modal
          // forwards an explicit prop allowlist and accessibilityViewIsModal
          // is not in it, so an AVM on the <Modal> tag does nothing. There
          // used to be one there anyway (SR-116 / A11Y-209), with this comment
          // pointing at a line number that had since drifted; the dead prop is
          // now gone rather than annotated.
          onAccessibilityEscape={() => void requestClose()}
        >
          {/* The drag affordance. Every other sheet wearing this pill now backs
              it with a real gesture; this one had no pill at all. AT-hidden by
              the primitive — the labelled Cancel is the screen-reader door. */}
          <SheetGrabber />
          {/* WCAG 1.4.4: content scrolls within the available viewport. Normal
              actions stay pinned; AX actions join this scroller so the footer
              cannot consume the editor's keyboard-safe reveal space. */}
          <ScrollView
            ref={scrollRef}
            style={[
              styles.scrollContent,
              (axRecompose || keyboardVisible) && styles.scrollContentExpanded,
            ]}
            contentContainerStyle={styles.scrollContentContainer}
            onLayout={descriptionReveal.onViewportLayout}
            keyboardShouldPersistTaps="handled"
            // Drag #1 puts the keyboard away (the pull is gated off while it is
            // up); drag #2, from the top, dismisses the sheet. Without this the
            // first drag with a keyboard open would feel dead.
            keyboardDismissMode="on-drag"
            onScroll={onScroll}
            scrollEventThrottle={scrollEventThrottle}
            showsVerticalScrollIndicator={false}
            // iOS: inset the scroll content so the focused description input
            // isn't hidden behind the keyboard. iOS-only prop; false elsewhere.
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
          {/* P1: the report title and location prompt are reading content inside
              a scrollable sheet, not fixed chrome. Keep the pair on one uncapped
              multiplier so both visibly follow accessibility Dynamic Type. */}
          <TypeBlock cap={TYPE_BLOCK.content}>
          <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
            {isAnon ? 'Report anonymously' : 'Report a flag'}
          </AppText>
          {/* Q17: the location line says a human thing. It used to read "at
              49.88800, -119.49600" — the coordinate as the SECOND LINE of the
              form, on the one screen where the user most needs to feel "yes,
              that is the place", and (X7) the least useful information on the
              sheet rendered at its most legible size. The numbers are one tap
              away instead, behind Show, with the copy path beside them.
              PLACEHOLDER COPY: "At your current location" / "At the pin you
              placed" / "Show" / "Hide" / "Copy" are logged in
              build/COPY_LEDGER.md as SKY-WORDS-REQUIRED. */}
          {/* One block, so the ScrollView's own row gap cannot open between the
              sentence and the coordinate it reveals — on the device the pair
              read as two unrelated lines. */}
          <View style={styles.locationBlock}>
          <View style={styles.locationRow}>
            <MapPin size={13} color={color.textMuted} strokeWidth={2} {...decorativeProps} />
            {/* T1: mono is for numerals that are data. A sentence is not, so
                the human line moved off the mono face; the coordinate below
                keeps it. */}
            <AppText variant="bodyMedium" style={styles.location}>
              {location
                ? locationSource === 'pin'
                  ? 'At the pin you placed'
                  : 'At your current location'
                // SW-11: "Waiting for location…" is true while the request is in
                // flight and false the moment the user denies it — at which point
                // it waited forever and never said why. A denial is a settled
                // answer, so say so and let the controls below carry the recovery.
                : locationDenied
                  ? 'Location is off for Flagstone'
                  : 'Waiting for location…'}
            </AppText>
            {location && (
              <Pressable
                onPress={() => setCoordsShown((v) => !v)}
                style={({ pressed }) => [styles.coordsToggle, pressed && styles.chipPressed]}
                accessibilityRole="button"
                // WCAG 2.5.3: the name leads with the visible word, so a
                // voice-control user saying "tap Show" reaches it.
                accessibilityLabel={coordsShown ? 'Hide coordinates' : 'Show coordinates'}
                {...a11yToggle({ expanded: coordsShown })}
              >
                <AppText variant="label" style={styles.coordsToggleText}>
                  {coordsShown ? 'Hide' : 'Show'}
                </AppText>
              </Pressable>
            )}
          </View>
          {location && coordsShown && (
            <View style={styles.coordsRow}>
              <AppText
                variant="mono"
                style={styles.coordsValue}
                accessibilityLabel={`${location.lat.toFixed(5)} latitude, ${location.lng.toFixed(5)} longitude`}
              >
                {formattedCoords}
              </AppText>
              <Pressable
                onPress={handleCopyCoords}
                style={({ pressed }) => [styles.coordsToggle, pressed && styles.chipPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Copy coordinates ${location.lat.toFixed(5)} latitude, ${location.lng.toFixed(5)} longitude`}
                accessibilityHint="Opens share and copy options for these coordinates"
              >
                <AppText variant="label" style={styles.coordsToggleText}>Copy</AppText>
              </Pressable>
            </View>
          )}
          </View>
          </TypeBlock>
          {/* S5 (L3-1): when no location has resolved yet — the common
              first-time web-guest case, where nothing was ever in flight — give
              an in-sheet retry so recovery doesn't mean abandoning the flow.
              requestLocation announces its own outcome (found / permission
              denied), so this one control drives the whole recover loop. */}
          {/* These bounded recovery controls use the shared chrome multiplier:
              their labels still scale, while the fixed MapPin glyphs and the
              lower form remain proportionate at accessibility sizes. */}
          <TypeBlock cap={TYPE_BLOCK.chrome}>
          {!location && onRequestLocation && (
            <Pressable
              onPress={() => {
                locationChangeRequestedRef.current = true;
                onRequestLocation();
              }}
              style={({ pressed }) => [styles.useLocationBtn, pressed && styles.chipPressed]}
              accessibilityRole="button"
              accessibilityLabel="Use my location"
              accessibilityHint="Finds your current location so you can submit this report"
            >
              <MapPin size={14} color={color.brandOnSoft} strokeWidth={2.4} {...decorativeProps} />
              <AppText variant="label" style={styles.useLocationText}>Use my location</AppText>
            </Pressable>
          )}

          {/* SW-37: the fix for the dead-end. Deny location and every other route
              to a coordinate was invisible — Submit stayed disabled no matter how
              completely the form was filled, so the app's core action was closed
              to anyone who won't share their position. Manual placement already
              existed as a LONG-PRESS on the map, with no affordance anywhere
              pointing at it; this is that same path, made findable from the one
              screen where the user is actually stuck. */}
          {!location && onPlaceOnMap && (
            <Pressable
              onPress={() => {
                locationChangeRequestedRef.current = true;
                onPlaceOnMap();
              }}
              style={({ pressed }) => [styles.useLocationBtn, pressed && styles.chipPressed]}
              accessibilityRole="button"
              accessibilityLabel="Place the pin on the map"
              accessibilityHint="Hides this form so you can move the map to the barrier, then brings it back with that spot filled in. Nothing you have typed is lost."
            >
              <MapPin size={14} color={color.brandOnSoft} strokeWidth={2.4} {...decorativeProps} />
              <AppText variant="label" style={styles.useLocationText}>Place the pin on the map</AppText>
            </Pressable>
          )}
          </TypeBlock>

          {/* SW-37 (guest half): the dead end, explained. A guest with location
              denied has no manual-placement route by design, so leaving them
              with a disabled Submit and no reason was the actual defect. The
              "Sign in" link in the banner directly below is the second half of
              this sentence. */}
          {!location && !onPlaceOnMap && locationDenied && (
            <AppText variant="body" style={styles.blockedNote}>
              {isAnon
                ? 'Anonymous reports can only be filed where you are. Turn on location above, or sign in to place the pin yourself.'
                : 'Location is off for Flagstone. Turn it on above to file this report.'}
            </AppText>
          )}

          {/* Anonymous mode banner — shown when user is not signed in.
              accessibilityRole="alert" makes VoiceOver announce it on iOS;
              accessibilityLiveRegion="assertive" does the same on Android.
              WCAG 4.1.2: the info portion is the accessible alert element;
              the "Sign in" Pressable sits OUTSIDE that element so VoiceOver
              can independently focus and activate it. */}
          {isAnon && (
            <View style={styles.anonBanner}>
              <View
                accessible
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                accessibilityLabel="Reporting anonymously. Your identity is not stored."
                style={styles.anonBannerInfo}
              >
                <Lock size={15} color={color.brandOnSoft} strokeWidth={2.2} {...decorativeProps} />
                <View style={styles.anonBannerBody}>
                  <AppText variant="label" style={styles.anonBannerTitle}>Reporting anonymously — your identity is not stored.</AppText>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  // A11Y-226 (3.3.7): signing in unmounts the guest tree —
                  // stash the draft (in-memory, consume-once) so the form's
                  // next open restores it instead of re-asking everything.
                  stashReportDraft({
                    category,
                    severity,
                    description,
                    photoUris,
                    contextTags,
                    photoDims: { ...photoDimsRef.current },
                    photoAlts: { ...photoAlts },
                  });
                  AccessibilityInfo.announceForAccessibility(REPORT_DRAFT_KEPT_ANNOUNCEMENT);
                  onClose();
                }}
                style={({ pressed }) => [styles.anonBannerLink, pressed && styles.chipPressed]}
                accessibilityRole="link"
                accessibilityLabel="Sign in"
                accessibilityHint={REPORT_SIGN_IN_HINT}
              >
                <AppText variant="label" style={styles.anonBannerLinkText}>Sign in</AppText>
              </Pressable>
            </View>
          )}

          {/* Quick-fill templates — auth only; hidden in anon mode to keep
              the simplified form focused on the three core fields. */}
          {/* P1: quick-fill and category controls live in scrollable rails, so
              their labels can grow without the default label multiplier cap. */}
          <TypeBlock cap={TYPE_BLOCK.content}>
          {!isAnon && templates.length > 0 && (
            <>
              <AppText variant="label" style={styles.label} accessibilityRole="header">
                Quick-fill templates (optional)
              </AppText>
              <View style={styles.overflowFadeWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.row}
                accessibilityHint="A row of common-scenario templates that pre-fill the form. Tap one to seed category, severity, and a description; edit any field before submitting."
                {...templatesFade.scrollHandlers}
              >
                {templates.map((t) => {
                  const active = t.id === appliedTemplateId;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => applyTemplate(t)}
                      disabled={submitting}
                      style={({ pressed }) => [styles.templateChip, active && styles.templateChipActive, !active && pressed && styles.chipPressed, submitting && styles.chipDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        active
                          ? `Template applied: ${t.label}. Tap to re-apply.`
                          : `Apply template: ${t.label}`
                      }
                      {...a11yToggle({ pressed: active, disabled: submitting })}
                    >
                      <CategoryIcon
                        category={t.category}
                        size={18}
                        color={active ? color.textOnBrand : color.brandText}
                        decorative
                      />
                      <AppText
                        variant="label"
                        style={[styles.templateChipText, active && styles.templateChipTextActive]}
                      >
                        {t.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <OverflowFade visible={templatesFade.hasMore} />
              </View>
            </>
          )}

          <AppText variant="label" style={styles.label} accessibilityRole="header">Category</AppText>
          <View style={styles.overflowFadeWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.row}
            {...categoriesFade.scrollHandlers}
          >
            {CATEGORY_ORDER.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  // T4 (F1-08): selection tick moves to finger-DOWN so the
                  // signature pickers answer the press, not the release.
                  onPressIn={() => hapticSelection()}
                  onPress={() => {
                    setCategory(c);
                    // Manual edit invalidates the "this template is
                    // currently applied" claim — clear so the chip
                    // visuals stay truthful.
                    setAppliedTemplateId(null);
                  }}
                  disabled={submitting}
                  style={({ pressed }) => [styles.pill, active && styles.pillActive, !active && pressed && styles.chipPressed, submitting && styles.chipDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={`Category: ${CATEGORY_LABELS[c]}`}
                  {...a11yToggle({ pressed: active, disabled: submitting })}
                >
                  <AppText variant="label" style={[styles.pillText, active && styles.pillTextActive]}>
                    {CATEGORY_LABELS[c]}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
          <OverflowFade visible={categoriesFade.hasMore} />
          </View>
          </TypeBlock>

          <AppText variant="label" style={styles.label} accessibilityRole="header">Severity</AppText>
          {/* F4 / X7 — at >=1.5x the five-across picker becomes the Legend's rows.
              Five 44pt circles beside 40pt type read as a row of bullets: the
              targets are at the floor rather than at the fit, and the one
              distinctive asset in the app shrinks RELATIVE to the text that
              explains it, at exactly the size where it should be biggest. The
              Legend already draws the severity scale as disc 32 + word + meaning,
              and a user who has met that surface meets the same object here — so
              this is the same rhythm, made selectable, not a second grammar.
              Announced as a radio group, because that is what a one-of-five
              choice is; the compact row keeps its shipped button/toggle wiring so
              nothing changes at default size. */}
          {axRecompose ? (
            <View
              style={styles.sevList}
              accessibilityRole="radiogroup"
              accessibilityLabel="Severity"
            >
              {SEVERITY_ORDER.map((s) => {
                const active = s === severity;
                return (
                  <Pressable
                    key={s}
                    onPressIn={() => hapticSelection()}
                    onPress={() => {
                      setSeverity(s);
                      setAppliedTemplateId(null);
                    }}
                    disabled={submitting}
                    style={({ pressed }) => [
                      styles.sevListRow,
                      active && styles.sevListRowActive,
                      !active && pressed && styles.chipPressed,
                      submitting && styles.chipDisabled,
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel={`Severity ${s}: ${SEVERITY_LABELS[s]} — ${SEVERITY_DESCRIPTIONS[s]}`}
                    {...a11yToggle({ checked: active, disabled: submitting })}
                  >
                    {/* The Legend's atom, at the Legend's size. Decorative — the
                        row above carries the whole authored label. */}
                    <SeverityDisc
                      severity={s}
                      size={32}
                      digitSize={font.size.base}
                      scaleWithType
                    />
                    {/* T3, and the device caught this one. The word sat on
                        `label` (cap 1.6) over a meaning on uncapped `body`, so
                        at accessibility sizes "Minor" was drawn SMALLER than
                        "Inconvenient but usable." — X6's inversion, reproduced
                        inside the control built to fix X7. One content block
                        over the pair, exactly as the Legend does it, so the
                        word stays the word at every size. */}
                    <TypeBlock cap={TYPE_BLOCK.content}>
                    <View style={styles.sevListText}>
                      <AppText variant="label" style={styles.sevListTitle}>
                        {SEVERITY_LABELS[s]}
                      </AppText>
                      <AppText variant="body" style={styles.sevListDesc}>
                        {SEVERITY_DESCRIPTIONS[s]}
                      </AppText>
                    </View>
                    </TypeBlock>
                    {/* WCAG 1.4.1: the selected row is signalled by the tint AND
                        the ring AND this tick — the same three-signal selection
                        the compact discs carry, kept rather than traded away. */}
                    {active && (
                      <Check
                        size={18}
                        color={color.inkSelect}
                        strokeWidth={3} {...decorativeProps}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : (
          <View style={styles.row}>
            {SEVERITY_ORDER.map((s) => {
              const active = s === severity;
              return (
                <Pressable
                  key={s}
                  // T4 (F1-08): the severity picker is the signature control —
                  // the selection tick lands on finger-down like the drawer row.
                  onPressIn={() => hapticSelection()}
                  onPress={() => {
                    setSeverity(s);
                    // Same pattern as Category — manual edit clears the
                    // applied-template chip so its selected state stays
                    // consistent with the live form.
                    setAppliedTemplateId(null);
                  }}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.sevBtn,
                    active && styles.sevBtnActive,
                    active && { backgroundColor: severityColor(s) },
                    !active && pressed && styles.chipPressed,
                    submitting && styles.chipDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Severity ${s}: ${SEVERITY_LABELS[s]} — ${SEVERITY_DESCRIPTIONS[s]}`}
                  {...a11yToggle({ pressed: active, disabled: submitting })}
                >
                  {/* WCAG 1.4.1 (Use of Color): the active button is signalled by
                      the severity-color fill — but color must not be the SOLE
                      cue. Add non-color cues so selection is perceivable without
                      color: a small Check tick above the number, a bolder number,
                      and the thicker ring on .sevBtnActive. The tick is purely
                      redundant (the number + accessibilityState already carry the
                      meaning), so it's hidden from assistive tech. */}
                  {active && (
                    <Check
                      size={11}
                      color={severityRamp[s].textOnColor}
                      strokeWidth={3}
                      style={styles.sevCheck} {...decorativeProps}
                    />
                  )}
                  {/* Cap the single digit's scaling so the number + the active
                      Check tick stay inside the 44pt circle at XXL text (review
                      MED). The full severity word is in the live hint below, so
                      the digit itself need not scale unbounded. */}
                  <AppText
                    variant="label"
                    maxFontSizeMultiplier={1.3}
                    style={[styles.sevText, active && styles.sevTextActive, active && { color: severityRamp[s].textOnColor }]}
                  >
                    {s}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          )}

          {/* Inline hint: updates as the user taps a severity level so
              they know what each number means before submitting. It is the
              readable meaning of the selected value, so it follows the same
              uncapped content contract as the large-type severity rows. */}
          {/* Q5: with nothing chosen there is no meaning to state, so the line
              carries the ASK instead of a meaning nobody selected. The live
              region is the same one — a screen-reader user hears the instruction
              become the answer the moment they rate.
              PLACEHOLDER COPY (SKY-WORDS-REQUIRED): the instruction sentence. */}
          <TypeBlock cap={TYPE_BLOCK.content}>
          {severity === null ? (
            <AppText
              variant="body"
              style={styles.sevHint}
              accessibilityLiveRegion="polite"
            >
              Choose how hard this makes the path to use.
            </AppText>
          ) : (
            <AppText
              variant="body"
              style={styles.sevHint}
              accessibilityLabel={`Severity ${severity}: ${SEVERITY_DESCRIPTIONS[severity]}`}
              accessibilityLiveRegion="polite"
            >
              <AppText variant="bodyMedium" style={styles.sevHintLabel}>{SEVERITY_LABELS[severity]}</AppText>
              {'  '}
              {SEVERITY_DESCRIPTIONS[severity]}
            </AppText>
          )}
          </TypeBlock>

          <AppText
            variant="label"
            style={styles.label}
            accessibilityRole="header"
            onLayout={descriptionReveal.onLayout}
          >
            Description (optional)
          </AppText>
          <TextInput
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              // F62: a manual edit means the form no longer matches the
              // template — stop showing its chip as 'applied'.
              if (appliedTemplateId) setAppliedTemplateId(null);
            }}
            placeholder="Describe the barrier — e.g. broken curb cut on Main St"
            placeholderTextColor={color.placeholderText}
            multiline
            // Mirror the DB check constraint
            // (flags_description_length_chk in
            // supabase/migrations/2026-05-23_data_layer_hardening.sql).
            // Cap the input here too so the user can't paste a wall of
            // text only to get a Postgres error after upload+insert.
            maxLength={2000}
            onFocus={descriptionReveal.onFocus}
            onBlur={descriptionReveal.onBlur}
            // L4: TextInput has no `disabled` prop — editable={false} is the
            // RN way to lock it while the submit is in flight.
            editable={!submitting}
            style={styles.input}
            accessibilityLabel="Description of the accessibility issue"
            accessibilityHint="Optional. Up to 2000 characters."
          />
          {/* Character counter — visible once the user starts typing.
              Turns amber at 1800 chars (200 left) and red at 1960 (40 left)
              so they have clear warning before the hard limit cuts them off. */}
          {description.length > 0 && (
            <AppText
              variant="body"
              style={[
                styles.charCounter,
                description.length >= 1960 && styles.charCounterRed,
                description.length >= 1800 && description.length < 1960 && styles.charCounterAmber,
              ]}
              accessibilityLabel={`${description.length} of 2000 characters used`}
            >
              {description.length} / 2000
            </AppText>
          )}

          {/* Anon-only: sign-in nudge shown where the photo section would be.
              D11: the "Sign in" words used to be a nested <Text onPress> — a
              13pt inline span, roughly 40x17, well under the 44pt floor, and
              nested text cannot take hitSlop or padding without overlapping the
              lines around it. So the CONTROL is now the whole nudge (the same
              move the anon banner makes above: one padded Pressable, minHeight
              44, the sentence as its accessible name). The words are unchanged
              and "Sign in" keeps its brand ink, so it still reads as the link.

              It also adopts the rest of that pattern, not just its geometry:
              signing in unmounts the guest tree, so the draft is stashed and
              announced first (A11Y-226 / 3.3.7). This path called onClose bare,
              which threw away whatever the guest had typed — enlarging the
              target without fixing that would only have made the data loss
              easier to hit. */}
          {isAnon && (
            <Pressable
              onPress={() => {
                stashReportDraft({
                  category,
                  severity,
                  description,
                  photoUris,
                  contextTags,
                  photoDims: { ...photoDimsRef.current },
                  photoAlts: { ...photoAlts },
                });
                AccessibilityInfo.announceForAccessibility(REPORT_DRAFT_KEPT_ANNOUNCEMENT);
                onClose();
              }}
              style={({ pressed }) => [styles.anonPhotoNudge, pressed && styles.chipPressed]}
              accessibilityRole="link"
              accessibilityHint={REPORT_SIGN_IN_HINT}
            >
              <AppText variant="body" style={styles.anonPhotoNudgeText}>
                {'Your anonymous report still counts. '}
                <AppText variant="label" style={styles.anonPhotoNudgeLink}>
                  Sign in
                </AppText>
                {' to add a photo and help verifiers act faster.'}
              </AppText>
            </Pressable>
          )}

          {/* Auth-only sections: seasonal tags, disability tags, photo picker,
              context tags. Hidden in anon mode — only category/severity/
              description are shown to keep the anonymous form simple. */}
          {!isAnon && (
            <>
              {/* Seasonal tags (W6-5) — a multi-select chip picker for time-of-year
                  context (icy in winter, flooded in spring, a construction detour
                  that clears in fall, etc.). Sits right after the description so
                  the reporter adds the "when in the year" angle while the issue is
                  fresh in mind. Shares the same `contextTags` state, the same
                  toggleTag cap, and the same capability gate as the general
                  context chips below — seasonal tags are just a subset of
                  context_tags. */}
              <AppText variant="label" style={styles.label} accessibilityRole="header">
                Seasonal (optional) — does this change with the seasons?
              </AppText>
              <View style={styles.row}>
                {SEASONAL_TAGS.map((tag) => {
                  const active = contextTags.includes(tag);
                  const label = SEASONAL_TAG_LABELS[tag];
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => {
                        if (tagsDisabled || submitting) return;
                        setContextTags((curr) => toggleTag(curr, tag));
                      }}
                      disabled={tagsDisabled || submitting}
                      style={({ pressed }) => [
                        styles.tagChip,
                        active && styles.tagChipActive,
                        tagsDisabled && styles.tagChipDisabled,
                        !active && !tagsDisabled && pressed && styles.chipPressed,
                        submitting && styles.chipDisabled,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityLabel={label}
                      {...a11yToggle({ checked: active, disabled: tagsDisabled || submitting })}
                      accessibilityHint={
                        tagsDisabled ? 'Seasonal tags will be available soon.' : undefined
                      }
                    >
                      <AppText
                        variant="label"
                        style={[
                          styles.tagChipText,
                          active && styles.tagChipTextActive,
                          tagsDisabled && styles.tagChipTextDisabled,
                        ]}
                      >
                        {label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              <AppText variant="body" style={styles.tagHelper}>
                {tagsDisabled
                  ? 'Seasonal tags will be available soon (server update pending).'
                  : `For barriers that aren't year-round. Counts toward the same 5-tag limit.`}
              </AppText>

              {/* Disability tags (Sprint 3) — a multi-select chip picker for WHO a
                  barrier affects, so users filtering the map by access need can
                  find it. These describe the BARRIER ("this is a mobility
                  barrier"), not the reporter — see DISABILITY_TAGS. Shares the same
                  `contextTags` state, toggleTag cap, and capability gate as the
                  seasonal/general chips — disability tags are just another subset
                  of context_tags. */}
              <View style={styles.disabilitySectionHeader}>
                <AppText variant="label" style={[styles.label, styles.disabilityLabel]} accessibilityRole="header">
                  Who does this affect? (optional)
                </AppText>
              </View>
              <View style={styles.row}>
                {DISABILITY_TAGS.map((tag) => {
                  const active = contextTags.includes(tag);
                  const label = DISABILITY_TAG_LABELS[tag];
                  const TagIcon = DISABILITY_TAG_ICONS[tag];
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => {
                        if (tagsDisabled || submitting) return;
                        setContextTags((curr) => toggleTag(curr, tag));
                      }}
                      disabled={tagsDisabled || submitting}
                      style={({ pressed }) => [
                        styles.tagChip,
                        styles.disabilityTagChip,
                        active && styles.disabilityTagChipActive,
                        tagsDisabled && styles.tagChipDisabled,
                        !active && !tagsDisabled && pressed && styles.chipPressed,
                        submitting && styles.chipDisabled,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityLabel={label}
                      {...a11yToggle({ checked: active, disabled: tagsDisabled || submitting })}
                      accessibilityHint={
                        tagsDisabled ? 'Accessibility tags will be available soon.' : undefined
                      }
                    >
                      <TagIcon
                        size={16}
                        color={
                          active
                            ? color.textOnBrand
                            : tagsDisabled
                              ? color.textSubtle
                              : color.brandText
                        }
                        strokeWidth={2.2}
                      />
                      <AppText
                        variant="label"
                        style={[
                          styles.tagChipText,
                          active && styles.tagChipTextActive,
                          tagsDisabled && styles.tagChipTextDisabled,
                        ]}
                      >
                        {label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              <AppText variant="body" style={styles.tagHelper}>
                {tagsDisabled
                  ? 'Accessibility tags will be available soon (server update pending).'
                  : 'Helps people filter the map to barriers that affect them. Counts toward the same 5-tag limit.'}
              </AppText>

              <AppText variant="label" style={styles.label} accessibilityRole="header">Photo (optional)</AppText>

              {/* Privacy reassurance — proactively surface the senior-grade,
                  fail-closed EXIF/GPS stripping (flags.ts uploadFlagPhoto) so a
                  privacy-conscious reporter knows a photo of a barrier won't leak
                  where they live. Calm + always visible, BEFORE any pick or
                  failure. One a11y node; the lock icon is decorative. The
                  stripping logic itself is untouched. */}
              <View
                style={styles.photoPrivacy}
                accessible
                accessibilityLabel="Location data is automatically removed from your photos before they are uploaded."
              >
                <Lock size={14} color={color.textMutedAlt} strokeWidth={2} />
                <AppText variant="body" style={styles.photoPrivacyText}>
                  Location is removed from your photos automatically.
                </AppText>
              </View>

              {/* High-severity photo nudge — only shown when severity ≥ 4 and
                  no photo has been selected. At severity 4–5, a photo is the
                  single biggest factor that lets verifiers act without visiting
                  in person, so surfacing this tip here (rather than in help
                  text buried elsewhere) meaningfully improves flag quality.
                  Once a photo is attached the nudge disappears — no clutter.

                  accessible + accessibilityLabel: the whole card is one a11y
                  node; the icon is decorative and screened out. The
                  accessibilityLiveRegion triggers the Android AT announcement;
                  iOS is handled by the useEffect above. */}
              {severity !== null && severity >= 4 && photoUris.length === 0 && (
                <View
                  style={styles.photoNudge}
                  accessible
                  accessibilityLabel={`Tip: adding a photo helps verify this ${SEVERITY_LABELS[severity].toLowerCase()} barrier without a site visit.`}
                  accessibilityLiveRegion="polite"
                >
                  <Camera size={18} color={color.infoFg} strokeWidth={2} />
                  <AppText variant="body" style={styles.photoNudgeBody}>
                    {'A photo helps verify this '}
                    <AppText variant="bodyMedium" style={styles.photoNudgeBold}>
                      {SEVERITY_LABELS[severity].toLowerCase()} barrier
                    </AppText>
                    {' without a site visit.'}
                  </AppText>
                </View>
              )}

              {/* L4: both handlers are optional — passing undefined while the
                  submit is in flight hides the add tile (canAdd checks
                  !!onAddPhoto) and the per-photo remove buttons, so the photo
                  set can't change under an in-progress upload loop. */}
              <PhotoGallery
                photos={photoUris.map((url, i) => ({
                  url,
                  position: i,
                  alt_text: photoAlts[url] || null,
                }))}
                onAddPhoto={submitting ? undefined : pickPhotoForGallery}
                onRemovePhoto={submitting ? undefined : removeUri}
                maxPhotos={MAX_PHOTOS}
              />

              {/* Photo descriptions (photo_alt, 2026-08-19): Apple's VoiceOver
                  criteria require a way to describe uploaded media. One field
                  per attached photo, keyed by uri; optional, 200 chars, stored
                  in flags.photo_alt (first photo) + flag_photos.alt_text. */}
              {photoUris.map((uri, i) => (
                <View key={uri}>
                  <AppText variant="label" style={styles.label} accessibilityRole="header">
                    {photoUris.length === 1
                      ? 'Describe the photo for screen reader users (optional)'
                      : `Describe photo ${i + 1} for screen reader users (optional)`}
                  </AppText>
                  <TextInput
                    value={photoAlts[uri] ?? ''}
                    onChangeText={(text) =>
                      setPhotoAlts((curr) => ({ ...curr, [uri]: text }))
                    }
                    placeholder="e.g. Curb with a broken concrete ramp, gap about 10cm"
                    placeholderTextColor={color.placeholderText}
                    maxLength={200}
                    editable={!submitting}
                    style={styles.input}
                    accessibilityLabel={
                      photoUris.length === 1
                        ? 'Photo description for screen reader users'
                        : `Description for photo ${i + 1}`
                    }
                    accessibilityHint="Optional. Spoken by screen readers instead of the image. Up to 200 characters."
                  />
                </View>
              ))}

              {/* Context tags — multi-select chip picker. Optional metadata
                  about WHEN / UNDER WHAT CONDITIONS this flag is most relevant
                  (e.g. "morning_rush", "high_tide"). The values flow into
                  createFlag → flags.context_tags (text[] column). Until the
                  2026-05-24_flag_context_tags.sql migration is applied, the
                  column is missing server-side and the helper silently retries
                  the insert without the field — the user can still file the
                  report, the tags are just dropped. See flags.ts → createFlag. */}
              <AppText variant="label" style={styles.label} accessibilityRole="header">
                Context (optional) — when is this most relevant?
              </AppText>
              <View style={styles.row}>
                {CONTEXT_TAGS.map((tag) => {
                  const active = contextTags.includes(tag);
                  const label = CONTEXT_TAG_LABELS[tag];
                  // Disable each chip when the capability gate says the
                  // server can't store tags yet. The Pressable still renders
                  // (so screen-reader users know what's coming) but won't
                  // toggle, and gets the muted style.
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => {
                        if (tagsDisabled || submitting) return;
                        setContextTags((curr) => toggleTag(curr, tag));
                      }}
                      disabled={tagsDisabled || submitting}
                      style={({ pressed }) => [
                        styles.tagChip,
                        active && styles.tagChipActive,
                        tagsDisabled && styles.tagChipDisabled,
                        !active && !tagsDisabled && pressed && styles.chipPressed,
                        submitting && styles.chipDisabled,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityLabel={label}
                      {...a11yToggle({ checked: active, disabled: tagsDisabled || submitting })}
                      accessibilityHint={
                        tagsDisabled ? 'Context tags will be available soon.' : undefined
                      }
                    >
                      <AppText
                        variant="label"
                        style={[
                          styles.tagChipText,
                          active && styles.tagChipTextActive,
                          tagsDisabled && styles.tagChipTextDisabled,
                        ]}
                      >
                        {label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              <AppText variant="body" style={styles.tagHelper}>
                {tagsDisabled
                  ? 'Context tags will be available soon (server update pending).'
                  : `Tap any that apply. Up to ${MAX_CONTEXT_TAGS}. Leave empty if none.`}
              </AppText>
            </>
          )}
          {/* S15 (L8-14): the submit moment states what publishing does — the
              "black box" R6 named. Honest about the community-verify loop and
              the city non-relationship. The finish-line success banner is
              S10 (P5); this is the pre-click sentence. */}
          <AppText variant="body" style={styles.submitMoment}>
            Your report appears on the map right away for everyone; neighbours can verify it. Flagstone doesn&apos;t notify the city — see Resources.
          </AppText>
          {actionsInScroll ? actions : null}
          </ScrollView>

          {/* S11: in-sheet "still trying" overlay for a slow WRITE. The insert
              keeps running (never aborted); this only tells the user we're
              still working so a slow submit doesn't read as a failure. */}
          {submitStalled && submitting ? (
            <View style={styles.submitStall} accessibilityLiveRegion="polite">
              <AppText variant="label" style={styles.submitStallText}>
                Still trying — check your signal
              </AppText>
            </View>
          ) : null}

          {/* BP-5: normal text keeps the sticky house footer. At AX the same
              action row is the final item in the body scroller above. */}
          {actionsInScroll ? null : actions}
        </GlassSurface>
        </SheetPull>
        </KeyboardAvoidingView>
      </View>
      {/* Inside this Modal on purpose — see LegalSheets.tsx. */}
      {legal.sheets}
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
    // Normal text preserves the content-hugging 88% presentation. Keyboard and
    // accessibility layouts opt into the expanded chain below; at AX the action
    // row also joins the body scroller instead of reserving a fixed footer.
    kav: { width: '100%', maxHeight: '88%' },
    kavExpanded: { maxHeight: '100%', flexGrow: 1 },
    pullExpanded: { width: '100%', flexGrow: 1 },
    card: {
      // No flex:1 — the sheet sizes to its content (the 3-field anonymous form
      // used to be stretched to 88% with a blank band; sweep minor) and only
      // grows until the KAV's 88% cap bounds it for the tall signed-in form,
      // at which point flexShrink lets the body ScrollView take over.
      flexShrink: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: 0,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      // The bulk variant owns the surface; clip it to the rounded top. Footer
      // placement is chosen at render time; the material remains unchanged.
      overflow: 'hidden',
    },
    cardExpanded: { maxHeight: '100%', flexGrow: 1 },
    // Shrink-to-cap, never grow: the body yields inside the 88% card so the
    // long form still scrolls, while a short form hugs its content.
    scrollContent: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
    scrollContentExpanded: { flexGrow: 1 },
    scrollContentContainer: { gap: spacing.md, paddingBottom: spacing.tight },
    title: {
      fontSize: font.size.xxl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      letterSpacing: font.tracking.heading,
    },
    locationBlock: { marginTop: -spacing.xs },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.tight },
    location: { fontSize: font.size.xs, color: color.inkGlassMuted, flexShrink: 1 },
    // Q17: the Show/Hide disclosure and the Copy link beside the revealed
    // coordinate. Same shape as FlagDetailModal's copyCoordsLink — an inkSelect
    // text link carrying the 44pt box itself, never a bare glyph.
    coordsToggle: {
      minHeight: a11y.minTargetSize,
      minWidth: a11y.minTargetSize,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xs,
    },
    coordsToggleText: {
      fontSize: font.size.xs,
      fontWeight: font.weight.semibold,
      color: color.inkSelect,
      textDecorationLine: 'underline',
    },
    coordsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.tight,
      flexWrap: 'wrap',
    },
    coordsValue: { fontSize: font.size.xs, color: color.inkGlassMuted },
    // S5: in-sheet "Use my location" retry — 44pt, brand-soft tint mirroring the
    // anon banner; only rendered when no location has resolved.
    // SW-37: the muted explain-the-block line. Same ink as the other quiet
    // captions on this sheet; it informs, it is not an alert.
    blockedNote: {
      fontSize: font.size.xs,
      color: color.inkGlassMuted,
      lineHeight: 17,
      marginBottom: spacing.sm,
    },
    useLocationBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      maxWidth: '100%',
      gap: spacing.tight,
      minHeight: a11y.minTargetSize,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: color.brandSofter,
      marginBottom: spacing.sm,
    },
    useLocationText: {
      fontSize: font.size.xs,
      fontWeight: font.weight.bold,
      color: color.brandOnSoft,
      flexShrink: 1,
    },
    // S15: submit-moment caption — small muted line before the action row.
    submitMoment: {
      fontSize: font.size.xs,
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      lineHeight: 17,
      marginTop: spacing.md,
    },
    label: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
      marginTop: spacing.tight,
    },
    // Pattern B: `chipScroll` pins the horizontal template/category strips
    // (style prop); `row` stays the shared content-row layout.
    // Horizontal chip strip. overflow-y is hidden on web, which clips the
    // keyboard :focus-visible ring (2px outline + 2px offset) to two vertical
    // slivers. The active chip fill is brand blue = the ring colour, so the
    // ring can't move INSIDE the chip (it would vanish) — instead give the
    // outside halo 4px of vertical headroom and cancel it with a matching
    // negative margin, so the ring renders whole at zero net layout cost.
    chipScroll: { flexGrow: 0, flexShrink: 0, paddingVertical: 4, marginVertical: -4 },
    row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    // T14 (F2-07): position:relative wrapper so the absolute OverflowFade pins to
    // the chip rail's right edge (required on web; harmless on native).
    overflowFadeWrap: { position: 'relative' },
    pill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      // 44pt is the Flagstone baseline touch target (Apple HIG + WCAG 2.5.5).
      minHeight: a11y.minTargetSize,
      justifyContent: 'center',
    },
    // A11Y-229 (M-52 grammar): small white pill labels — ctaFill, 5.24 both
    // themes (dark brand is 3.42, large-text-only). Light is byte-identical.
    pillActive: { backgroundColor: color.ctaFill },
    pillText: { color: color.text, fontSize: font.size.sm },
    pillTextActive: { color: color.textOnBrand, fontWeight: font.weight.semibold },
    sevBtn: {
      width: a11y.minTargetSize,
      height: a11y.minTargetSize,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
      // Transparent base ring so the active ring (below) can thicken without
      // resizing the button or nudging the row layout.
      borderWidth: 2,
      borderColor: 'transparent',
    },
    // WCAG 1.4.1 non-color cue: a stronger ring around the selected button so
    // selection reads without relying on the fill color alone.
    sevBtnActive: { borderColor: color.textStrong },
    // The redundant tick sits just above the number inside the 44pt circle.
    sevCheck: { marginBottom: -2 },
    sevText: { fontSize: font.size.lg, color: color.text, fontWeight: font.weight.semibold },
    // F4 / X7 — the large-type picker: the Legend's row rhythm, made selectable.
    sevList: { gap: spacing.tight },
    sevListRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      // The whole row is the target: 32pt disc + two lines of type clears 56pt
      // at every size this branch renders at, and the floor is pinned anyway.
      minHeight: a11y.minTargetSize,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    sevListRowActive: {
      backgroundColor: color.glassSelectedTint,
      borderColor: color.textStrong,
    },
    sevListText: { flex: 1 },
    sevListTitle: {
      fontSize: font.size.base,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
    },
    sevListDesc: {
      fontSize: font.size.xs,
      color: color.text,
      fontFamily: font.family.bodyMedium,
      marginTop: 1,
    },
    // Bolder number when active — a second non-color weight cue on top of the
    // tick and ring (and legible white-on-fill, matching textOnBrand).
    sevTextActive: { color: color.textOnBrand, fontWeight: font.weight.bold },
    input: {
      borderWidth: 1,
      borderColor: color.borderStrong,
      borderRadius: radius.md,
      padding: spacing.md,
      minHeight: 80,
      textAlignVertical: 'top',
      color: color.text,
      backgroundColor: color.surface,
      // Both were written out: 14 IS font.size.base, and 19 was a x1.36
      // that the token rounds to 20.
      fontSize: font.size.base,
      lineHeight: font.lineHeight.base,
    },
    sevHint: {
      fontSize: font.size.sm,
      color: color.text,
      fontFamily: font.family.bodyMedium,
      lineHeight: font.lineHeight.sm,
      marginTop: -4,
    },
    sevHintLabel: { fontWeight: font.weight.bold, color: color.textStrong },
    charCounter: {
      fontSize: font.size.xs,
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      textAlign: 'right',
      marginTop: 2,
    },
    charCounterAmber: { color: color.warningHint, fontWeight: font.weight.semibold },
    charCounterRed: { color: color.error, fontWeight: font.weight.bold },
    // High-severity photo nudge card — appears between the "Photo" label and
    // picker when severity ≥ 4 and no photo is attached.
    //
    // Helpful tip, not a warning, so it takes the INFO palette rather than the
    // amber one (more-expressive pass 2026-06-03) — infoBg/infoFg, measured
    // 7.9:1 light and 6.2:1 dark, AA at any size either way.
    //
    // ⚠ This comment used to quote warningBg #fff7e6 / warningFg #714b00 at
    // 8.3:1. Those were the colours BEFORE the palette moved, and the numbers
    // were still here describing a card that had not used either token for
    // months. A contrast figure that names the wrong pair is worse than none:
    // it is the thing a reviewer checks instead of measuring.
    photoNudge: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: color.infoBg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: color.brandSofter,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
    },
    photoNudgeBody: {
      flex: 1,
      fontSize: font.size.xs,
      color: color.infoFg,
      lineHeight: 17,
    },
    photoNudgeBold: {
      fontWeight: font.weight.bold,
      color: color.infoFg,
    },
    // Privacy reassurance line under the Photo label — calm + muted (NOT an
    // alert box like photoNudge): a small lock icon + one muted sentence.
    photoPrivacy: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.tight,
      marginTop: spacing.tight,
      marginBottom: spacing.sm,
    },
    photoPrivacyText: {
      flex: 1,
      fontSize: font.size.xs,
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      lineHeight: 17,
    },
    // Anonymous mode banner — tinted info strip shown at the top of the
    // form when the user is not signed in.
    // brandSofter/brandOnSoft: 7.6:1 contrast, WCAG AA.
    anonBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      // S18 (L5-03): wrap when cramped (200% browser zoom / narrow reflow) so
      // the "Sign in" link drops to its own line and the sentence keeps
      // word-boundary wrapping instead of shredding mid-word. PROTECT-8: the
      // link stays a separate sibling node outside the alert.
      flexWrap: 'wrap',
      rowGap: spacing.tight,
      backgroundColor: color.brandSofter,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    // WCAG 4.1.2: inner accessible alert element (icon + text only).
    // The "Sign in" Pressable is a sibling so VoiceOver can focus it separately.
    anonBannerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      // S18: claim most of the row so at normal width the "Sign in" link sits
      // beside the text; under reflow pressure flexBasis + the parent's
      // flexWrap push the link to the next line and this block expands to the
      // full width, letting the sentence wrap on word boundaries.
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '60%',
    },
    anonBannerBody: { flex: 1 },
    anonBannerTitle: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.brandOnSoft,
    },
    anonBannerLink: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      minHeight: a11y.minTargetSize,
      justifyContent: 'center',
    },
    anonBannerLinkText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      color: color.brandOnSoft,
      textDecorationLine: 'underline',
    },
    // S11: calm in-sheet "still trying" strip for a slow write. Info wash +
    // infoFg (7.9:1 AAA) — reuses the existing tokens, no new colour.
    submitStall: {
      backgroundColor: color.infoBg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
      alignItems: 'center',
    },
    submitStallText: {
      color: color.infoFg,
      fontWeight: font.weight.semibold,
      fontSize: font.size.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
      // Full-bleed divider: cancel the card's horizontal padding, then restore
      // it as our own — buttons align with the form fields (24pt inset, was a
      // doubled 48pt) and the hairline spans edge-to-edge instead of floating
      // inset (sweep seam minor). Invariant: |neg margin| == own padding (G7).
      marginHorizontal: -spacing.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.borderSubtle,
      backgroundColor: color.surface,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      minHeight: a11y.minTargetSize,
      justifyContent: 'center',
    },
    // D11: the nudge IS the control now, so it carries the 44pt floor — the
    // same padded, height-floored box the anonBannerLink uses above.
    anonPhotoNudge: {
      marginTop: 4,
      paddingVertical: 6,
      minHeight: a11y.minTargetSize,
      justifyContent: 'center',
    },
    anonPhotoNudgeText: {
      fontSize: font.size.sm,
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
    },
    anonPhotoNudgeLink: {
      color: color.brandText,
      fontWeight: font.weight.semibold,
    },
    cancelBtn: { backgroundColor: color.surfaceNeutral },
    cancelText: { color: color.text, fontWeight: font.weight.semibold },
    submitBtn: { backgroundColor: color.brand, overflow: 'visible', ...shadow.glowBrand },
    // Busy, not inert: the gradient and the white ink stay, the whole control
    // just softens while the write is in flight.
    submitBtnDisabled: { opacity: 0.6 },
    /**
     * C5: the one disabled-fill grammar — the soft-tint pair, no gradient
     * beneath it (the render skips it), and no brand glow, because a glowing
     * inert button is a lie.
     *
     * THE OUTLINE IS NOT DECORATION, and the device is what found this.
     * Measured off the 17e in both schemes:
     *
     *   light  inert #D9E7FD vs live #1F68DA  = 4.15:1   the fill carries it
     *   dark   inert #0E4499 vs live #1F68DA  = 1.76:1   the fill does NOT
     *
     * A dark palette's "soft brand" is a dark blue, so it can never sit far in
     * luminance from a mid brand blue: in dark the inert Submit read as an
     * ordinary live button, which is the exact class SW-49 exists to stop ("an
     * enabled-LOOKING control must never answer a tap with nothing"). Colour
     * alone cannot carry the state there, so the state gets a second channel —
     * the same 1.4.1 move the severity disc makes with its fill + tick + ring.
     *
     *   dark   outline #B4CFFA vs live fill  = 3.27:1   clears 1.4.11's floor
     *   light  outline #0F53BE on the tint   = 5.60:1
     *
     * So in every scheme at least one channel is above 3:1, and the grammar is
     * still one grammar. (The underlying finding — dark `brandSoft` sitting too
     * close to `ctaFill` to signal a state — is logged for the design system in
     * the build report; fixing the token itself would ripple across every chip,
     * banner and avatar that reads it.)
     */
    submitBtnBlocked: {
      backgroundColor: color.brandSoft,
      borderWidth: 1.5,
      borderColor: color.brandOnSoft,
      shadowOpacity: 0,
      elevation: 0,
    },
    submitText: { color: color.textOnBrand, fontWeight: font.weight.bold },
    submitTextBlocked: { color: color.brandOnSoft },
    // T9 (F5-09): spinner + "Filing your report…" sit side by side while pending.
    submitBusyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.tight },
    // T4 (F1-01): static pressed dim so every control in the sheet answers the
    // finger. The house idiom (color.borderPressed — FilterPresetsModal,
    // MyReportsModal, LeaderboardScreen): a fill-COMPOSITED swap that leaves the
    // label ink at full opacity. NEVER a group opacity on a text-bearing control
    // (it collapses label-vs-fill contrast below AA). Applied to the
    // neutral/inactive state; an active brand-filled chip isn't dimmed (white
    // label on the light pressed grey would fail AA — the arbiter proves this).
    chipPressed: { backgroundColor: color.borderPressed },
    /**
     * SW-49 class. Every control on this form is disabled while `submitting`
     * and every one of them looked live while a report uploaded — the five
     * severity discs stayed at full saturation, the category pills and template
     * chips too. The walk hit this shape three times across the app; the rule
     * it settles on is that an enabled-looking control must never answer with
     * nothing.
     *
     * A dim rather than a spinner: these are a row of selections, not an action
     * with a result, and the Submit button below them already carries the
     * progress. `tagChipDisabled` stays separate — it means "not available
     * yet", which is a different and permanent statement.
     */
    chipDisabled: { opacity: 0.5 },
    // Submit carries a LinearGradient over its fill, so a backgroundColor swap
    // wouldn't show. Instead composite a translucent scrim ABOVE the gradient
    // and BELOW the label — the label stays full opacity over a darkened brand
    // (contrast only improves). borderRadius matches the button.
    submitPressedScrim: { backgroundColor: 'rgba(0,0,0,0.14)', borderRadius: radius.md },
    // Context-tag chips. Three visual states matching accessibilityState:
    //   - unselected → outline (white bg, dark-blue border + text)  → 7.6:1 text/bg
    //   - selected   → solid dark-blue fill, white text              → 7.6:1 text/bg
    //   - disabled   → muted gray border + text on white             → 4.6:1 text/bg
    // Active fill uses color.brandText (#1c4f99): AA on 13pt-600 (4.5:1+) and
    // AA on white text (7.6:1). Cycle C cleanup — now uses token directly.
    // Touch target: paddingVertical 10 + line-height ~17 + minHeight 44 keeps
    // every chip at least 44pt tall regardless of dynamic-type scaling.
    tagChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.circle,
      backgroundColor: color.surface,
      borderWidth: 1,
      borderColor: color.brandText,
      minHeight: a11y.minTargetSize,
      justifyContent: 'center',
    },
    tagChipActive: {
      backgroundColor: color.brandText,
      borderColor: color.brandText,
    },
    tagChipDisabled: {
      borderColor: color.borderStrong,
      backgroundColor: color.surfaceSoft,
    },
    tagChipText: {
      color: color.brandText,
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
    },
    tagChipTextActive: {
      color: color.textOnBrand,
    },
    tagChipTextDisabled: {
      color: color.textMutedAlt, // AA pass: on #f4f6f8 = 4.6:1
    },
    tagHelper: {
      fontSize: font.size.xs,
      color: color.textMutedAlt,
      marginTop: -4,
    },
    // Template chip — taller than .pill because it carries a glyph + label
    // and needs the 44pt touch-target floor. We use the same brand-accent
    // active fill the context-tag chip uses so the two row patterns feel
    // related; the inactive state is a soft outline so the row reads as
    // "secondary" relative to the required Category row below.
    templateChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: radius.full,
      backgroundColor: color.surface,
      borderWidth: 1,
      borderColor: color.brandText,
      minHeight: a11y.minTargetSize,
    },
    templateChipActive: {
      backgroundColor: color.brandText,
      borderColor: color.brandText,
    },
    templateChipText: {
      color: color.brandText,
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
    },
    templateChipTextActive: {
      color: color.textOnBrand,
    },
    // "Who does this affect?" section — visual separator to signal this group
    // is distinct from the general/seasonal context chips above.
    disabilitySectionHeader: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.borderSubtle,
      paddingTop: spacing.md,
      marginTop: spacing.tight,
    },
    disabilityLabel: {
      color: color.brandText,
    },
    // Disability chips use row layout (icon + text) and a brand-softer fill to
    // visually separate them from the plain text seasonal/context chips.
    disabilityTagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: color.brandSofter,
      borderColor: color.brand,
    },
    disabilityTagChipActive: {
      backgroundColor: color.brandText,
      borderColor: color.brandText,
    },
  });
