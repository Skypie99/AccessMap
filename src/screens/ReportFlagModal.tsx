import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth';
import { track } from '@/lib/analytics';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
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
import type { FlagCategory, FlagSeverity } from '@/types/database';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme';
import { useReducedMotion } from '@/lib/accessibility';

/** Emoji icon prefix for each disability tag — adds visual distinction without
 *  adding a dependency. Describes the BARRIER type, not any person's identity. */
const DISABILITY_TAG_ICONS: Readonly<Record<DisabilityTag, string>> = {
  mobility_barrier: '♿',
  vision_hazard: '👁',
  hearing_concern: '🦻',
  cognitive_load: '🧠',
  temporary_closure: '🚧',
};

interface Props {
  visible: boolean;
  location: { lat: number; lng: number } | null;
  onClose: () => void;
  onCreated: () => void;
}

export default function ReportFlagModal({ visible, location, onClose, onCreated }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { user } = useAuth();
  const isAnon = !user;
  const reducedMotion = useReducedMotion();
  const [category, setCategory] = useState<FlagCategory>('no_ramp');
  const [severity, setSeverity] = useState<FlagSeverity>(3);
  const [description, setDescription] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [contextTags, setContextTags] = useState<ContextTag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Web-only: hidden <input type="file"> used as the image picker substitute.
  const webFileInputRef = useRef<HTMLInputElement | null>(null);
  // Mirror of the module-level capability flag in src/lib/flags.ts. When
  // it flips to 'unavailable' (the propose-only migration isn't on this
  // backend yet) we disable the chip picker and surface a "coming soon"
  // hint instead of letting the user pick tags that get silently dropped.
  const [tagsCapability, setTagsCapability] = useState<ContextTagsCapability>('unknown');
  useEffect(() => subscribeContextTagsCapability(setTagsCapability), []);
  const tagsDisabled = tagsCapability === 'unavailable';

  // When severity crosses into "high" territory (≥4) and the user hasn't
  // attached a photo yet, announce a nudge to screen readers via
  // AccessibilityInfo (iOS VoiceOver — Android uses accessibilityLiveRegion
  // on the rendered hint element). Only fires on severity change, not on
  // every render, and never fires if a photo is already attached.
  const prevHighRef = useRef(false);
  useEffect(() => {
    const isHigh = severity >= 4 && photoUris.length === 0;
    if (isHigh && !prevHighRef.current) {
      void AccessibilityInfo.announceForAccessibility(
        `Tip: adding a photo helps verify this ${severity === 5 ? 'severe' : 'major'} barrier without a site visit.`,
      );
    }
    prevHighRef.current = isHigh;
  }, [severity, photoUris]);

  const reset = () => {
    setCategory('no_ramp');
    setSeverity(3);
    setDescription('');
    setPhotoUris([]);
    setContextTags([]);
    setAppliedTemplateId(null);
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
    if (description.trim() === '') {
      setDescription(t.description ?? '');
    }
    setAppliedTemplateId(t.id);
    // Screen-reader users don't see the chip-tint change; announce so
    // they know the form jumped.
    AccessibilityInfo.announceForAccessibility(
      `Template applied: ${t.label}. Category, severity${
        t.description ? ', and a starter description' : ''
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
        Alert.alert(
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
        addUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Could not pick photo', errorMessage(e));
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
    if (!location) {
      Alert.alert('No location', 'We need your location to place the flag.');
      return;
    }

    // Anonymous submission path — no photo upload, no context tags.
    if (isAnon) {
      try {
        await checkAnonRateLimit();
      } catch {
        Alert.alert(
          'Daily limit reached',
          "You've reported 5 barriers today — thanks for contributing! Sign in to report more.",
          [
            { text: 'Sign In', onPress: onClose },
            { text: 'OK', style: 'cancel' },
          ],
        );
        return;
      }
      setSubmitting(true);
      try {
        await createAnonFlag({
          lat: location.lat,
          lng: location.lng,
          category,
          severity,
          description: description.trim() || undefined,
        });
        await recordAnonSubmit();
        track('flag_created', { category, severity, hasPhoto: false });
        reset();
        onCreated();
        onClose();
      } catch (e) {
        Alert.alert('Could not report flag', errorMessage(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Authenticated submission path — full feature set.
    setSubmitting(true);
    try {
      // Upload all picked photos. First URL doubles as the legacy photo_url
      // field for backwards-compat with clients that haven't migrated to
      // the flag_photos junction table yet.
      const photoUrls: string[] = [];
      for (const uri of photoUris) {
        const url = await uploadFlagPhoto(user.id, uri);
        photoUrls.push(url);
      }

      const result = await createFlag(user.id, {
        lat: location.lat,
        lng: location.lng,
        category,
        severity,
        description: description.trim() ? description.trim() : null,
        photo_url: photoUrls[0] ?? null,
        // Only send the field when the user actually picked tags. Empty
        // array means "no context"; createFlag still tries the column path
        // so it stays exercised, but skipping it keeps the legacy insert
        // path cheap (one round-trip) when no tags are selected.
        context_tags: contextTags.length > 0 ? [...contextTags] : undefined,
      });

      // Insert junction rows for all uploaded photos. Silent no-op if the
      // flag_photos migration hasn't been applied yet.
      await batchInsertFlagPhotos(result.row.id, photoUrls);
      // If we asked the server to store tags but the column isn't there
      // yet (capability flipped to 'unavailable' inside createFlag), tell
      // the user — they shouldn't think their picks were saved when they
      // weren't. Non-blocking alert: the report itself DID land.
      if (!result.tagsAccepted && contextTags.length > 0) {
        Alert.alert(
          'Flag saved without context tags',
          'Your report was filed, but the context tags you picked could not be stored yet (server update pending). The picker will be re-enabled automatically once it is.',
        );
      }
      track('flag_created', { category, severity, hasPhoto: photoUrls.length > 0 });
      reset();
      onCreated();
      onClose();
    } catch (e) {
      Alert.alert('Could not report flag', errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // WCAG 2.3.3 (Animation from Interactions): skip the slide animation
    // when the user has requested reduced motion.
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          {/* WCAG 1.4.4: card capped at 88% so Dynamic Type XXL content
              scrolls; Cancel/Report buttons stay pinned as sticky footer. */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <Text style={styles.title} accessibilityRole="header">
            {isAnon ? 'Report anonymously' : 'Report a flag'}
          </Text>
          <Text style={styles.location}>
            {location
              ? `at ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
              : 'Waiting for location…'}
          </Text>

          {/* Anonymous mode banner — shown when user is not signed in.
              accessibilityRole="alert" makes VoiceOver announce it on iOS;
              accessibilityLiveRegion="assertive" does the same on Android. */}
          {isAnon && (
            <View
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              accessibilityLabel="Reporting anonymously. Your identity is not stored."
              style={styles.anonBanner}
            >
              <Text style={styles.anonBannerIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">🔒</Text>
              <View style={styles.anonBannerBody}>
                <Text style={styles.anonBannerTitle}>Reporting anonymously — your identity is not stored.</Text>
              </View>
              <Pressable
                onPress={onClose}
                style={styles.anonBannerLink}
                accessibilityRole="link"
                accessibilityLabel="Sign in"
                accessibilityHint="Closes this form so you can sign in"
              >
                <Text style={styles.anonBannerLinkText}>Sign in</Text>
              </Pressable>
            </View>
          )}

          {/* Quick-fill templates — auth only; hidden in anon mode to keep
              the simplified form focused on the three core fields. */}
          {!isAnon && templates.length > 0 && (
            <>
              <Text style={styles.label} accessibilityRole="header">
                Quick-fill templates (optional)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
                accessibilityHint="A row of common-scenario templates that pre-fill the form. Tap one to seed category, severity, and a description; edit any field before submitting."
              >
                {templates.map((t) => {
                  const active = t.id === appliedTemplateId;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => applyTemplate(t)}
                      style={[styles.templateChip, active && styles.templateChipActive]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        active
                          ? `Template applied: ${t.label}. Tap to re-apply.`
                          : `Apply template: ${t.label}`
                      }
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[styles.templateChipGlyph, active && styles.templateChipGlyphActive]}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        {t.glyph}
                      </Text>
                      <Text
                        style={[styles.templateChipText, active && styles.templateChipTextActive]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          <Text style={styles.label} accessibilityRole="header">Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            {CATEGORY_ORDER.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    setCategory(c);
                    // Manual edit invalidates the "this template is
                    // currently applied" claim — clear so the chip
                    // visuals stay truthful.
                    setAppliedTemplateId(null);
                  }}
                  style={[styles.pill, active && styles.pillActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Category: ${CATEGORY_LABELS[c]}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {CATEGORY_LABELS[c]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label} accessibilityRole="header">Severity</Text>
          <View style={styles.row}>
            {SEVERITY_ORDER.map((s) => {
              const active = s === severity;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    setSeverity(s);
                    // Same pattern as Category — manual edit clears the
                    // applied-template chip so its selected state stays
                    // consistent with the live form.
                    setAppliedTemplateId(null);
                  }}
                  style={[
                    styles.sevBtn,
                    active && styles.sevBtnActive,
                    active && { backgroundColor: severityColor(s) },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Severity ${s}: ${SEVERITY_LABELS[s]} — ${SEVERITY_DESCRIPTIONS[s]}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.sevText, active && styles.sevTextActive]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Inline hint: updates as the user taps a severity level so
              they know what each number means before submitting. */}
          <Text
            style={styles.sevHint}
            accessibilityLabel={`Severity ${severity}: ${SEVERITY_DESCRIPTIONS[severity]}`}
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.sevHintLabel}>{SEVERITY_LABELS[severity]}</Text>
            {'  '}
            {SEVERITY_DESCRIPTIONS[severity]}
          </Text>

          <Text style={styles.label} accessibilityRole="header">Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What's going on here?"
            placeholderTextColor={color.textMuted}
            multiline
            // Mirror the DB check constraint
            // (flags_description_length_chk in
            // supabase/migrations/2026-05-23_data_layer_hardening.sql).
            // Cap the input here too so the user can't paste a wall of
            // text only to get a Postgres error after upload+insert.
            maxLength={2000}
            style={styles.input}
            accessibilityLabel="Description of the accessibility issue"
            accessibilityHint="Optional. Up to 2000 characters."
          />
          {/* Character counter — visible once the user starts typing.
              Turns amber at 1800 chars (200 left) and red at 1960 (40 left)
              so they have clear warning before the hard limit cuts them off. */}
          {description.length > 0 && (
            <Text
              style={[
                styles.charCounter,
                description.length >= 1960 && styles.charCounterRed,
                description.length >= 1800 && description.length < 1960 && styles.charCounterAmber,
              ]}
              accessibilityLabel={`${description.length} of 2000 characters used`}
            >
              {description.length} / 2000
            </Text>
          )}

          {/* Anon-only: sign-in nudge shown where the photo section would be. */}
          {isAnon && (
            <Text style={styles.anonPhotoNudge}>
              <Text style={styles.anonPhotoNudgeLink} onPress={onClose} accessibilityRole="link">
                Sign in
              </Text>
              {' to attach a photo.'}
            </Text>
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
              <Text style={styles.label} accessibilityRole="header">
                Seasonal (optional) — does this change with the seasons?
              </Text>
              <View style={styles.row}>
                {SEASONAL_TAGS.map((tag) => {
                  const active = contextTags.includes(tag);
                  const label = SEASONAL_TAG_LABELS[tag];
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => {
                        if (tagsDisabled) return;
                        setContextTags((curr) => toggleTag(curr, tag));
                      }}
                      disabled={tagsDisabled}
                      style={[
                        styles.tagChip,
                        active && styles.tagChipActive,
                        tagsDisabled && styles.tagChipDisabled,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityLabel={label}
                      accessibilityState={{ checked: active, disabled: tagsDisabled }}
                      accessibilityHint={
                        tagsDisabled ? 'Seasonal tags will be available soon.' : undefined
                      }
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          active && styles.tagChipTextActive,
                          tagsDisabled && styles.tagChipTextDisabled,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.tagHelper}>
                {tagsDisabled
                  ? 'Seasonal tags will be available soon (server update pending).'
                  : `For barriers that aren't year-round. Counts toward the same 5-tag limit.`}
              </Text>

              {/* Disability tags (Sprint 3) — a multi-select chip picker for WHO a
                  barrier affects, so users filtering the map by access need can
                  find it. These describe the BARRIER ("this is a mobility
                  barrier"), not the reporter — see DISABILITY_TAGS. Shares the same
                  `contextTags` state, toggleTag cap, and capability gate as the
                  seasonal/general chips — disability tags are just another subset
                  of context_tags. */}
              <View style={styles.disabilitySectionHeader}>
                <Text style={[styles.label, styles.disabilityLabel]} accessibilityRole="header">
                  Who does this affect? (optional)
                </Text>
              </View>
              <View style={styles.row}>
                {DISABILITY_TAGS.map((tag) => {
                  const active = contextTags.includes(tag);
                  const label = DISABILITY_TAG_LABELS[tag];
                  const icon = DISABILITY_TAG_ICONS[tag];
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => {
                        if (tagsDisabled) return;
                        setContextTags((curr) => toggleTag(curr, tag));
                      }}
                      disabled={tagsDisabled}
                      style={[
                        styles.tagChip,
                        styles.disabilityTagChip,
                        active && styles.disabilityTagChipActive,
                        tagsDisabled && styles.tagChipDisabled,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityLabel={label}
                      accessibilityState={{ checked: active, disabled: tagsDisabled }}
                      accessibilityHint={
                        tagsDisabled ? 'Accessibility tags will be available soon.' : undefined
                      }
                    >
                      <Text
                        style={styles.disabilityTagIcon}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        {icon}
                      </Text>
                      <Text
                        style={[
                          styles.tagChipText,
                          active && styles.tagChipTextActive,
                          tagsDisabled && styles.tagChipTextDisabled,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.tagHelper}>
                {tagsDisabled
                  ? 'Accessibility tags will be available soon (server update pending).'
                  : 'Helps people filter the map to barriers that affect them. Counts toward the same 5-tag limit.'}
              </Text>

              <Text style={styles.label} accessibilityRole="header">Photo (optional)</Text>

              {/* High-severity photo nudge — only shown when severity ≥ 4 and
                  no photo has been selected. At severity 4–5, a photo is the
                  single biggest factor that lets verifiers act without visiting
                  in person, so surfacing this tip here (rather than in help
                  text buried elsewhere) meaningfully improves flag quality.
                  Once a photo is attached the nudge disappears — no clutter.

                  accessible + accessibilityLabel: the whole card is one a11y
                  node; the emoji is decorative and screened out. The
                  accessibilityLiveRegion triggers the Android AT announcement;
                  iOS is handled by the useEffect above. */}
              {severity >= 4 && photoUris.length === 0 && (
                <View
                  style={styles.photoNudge}
                  accessible
                  accessibilityLabel={`Tip: adding a photo helps verify this ${severity === 5 ? 'severe' : 'major'} barrier without a site visit.`}
                  accessibilityLiveRegion="polite"
                >
                  <Text
                    style={styles.photoNudgeIcon}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    📸
                  </Text>
                  <Text style={styles.photoNudgeBody}>
                    {'A photo helps verify this '}
                    <Text style={styles.photoNudgeBold}>
                      {severity === 5 ? 'severe' : 'major'} barrier
                    </Text>
                    {' without a site visit.'}
                  </Text>
                </View>
              )}

              <PhotoGallery
                photos={photoUris.map((url, i) => ({ url, position: i }))}
                onAddPhoto={pickPhotoForGallery}
                onRemovePhoto={removeUri}
                maxPhotos={MAX_PHOTOS}
              />

              {/* Context tags — multi-select chip picker. Optional metadata
                  about WHEN / UNDER WHAT CONDITIONS this flag is most relevant
                  (e.g. "morning_rush", "high_tide"). The values flow into
                  createFlag → flags.context_tags (text[] column). Until the
                  2026-05-24_flag_context_tags.sql migration is applied, the
                  column is missing server-side and the helper silently retries
                  the insert without the field — the user can still file the
                  report, the tags are just dropped. See flags.ts → createFlag. */}
              <Text style={styles.label} accessibilityRole="header">
                Context (optional) — when is this most relevant?
              </Text>
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
                        if (tagsDisabled) return;
                        setContextTags((curr) => toggleTag(curr, tag));
                      }}
                      disabled={tagsDisabled}
                      style={[
                        styles.tagChip,
                        active && styles.tagChipActive,
                        tagsDisabled && styles.tagChipDisabled,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityLabel={label}
                      accessibilityState={{ checked: active, disabled: tagsDisabled }}
                      accessibilityHint={
                        tagsDisabled ? 'Context tags will be available soon.' : undefined
                      }
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          active && styles.tagChipTextActive,
                          tagsDisabled && styles.tagChipTextDisabled,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.tagHelper}>
                {tagsDisabled
                  ? 'Context tags will be available soon (server update pending).'
                  : `Tap any that apply. Up to ${MAX_CONTEXT_TAGS}. Leave empty if none.`}
              </Text>
            </>
          )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={submitting}
              style={[styles.actionBtn, styles.cancelBtn]}
              accessibilityRole="button"
              accessibilityLabel="Cancel and close"
              accessibilityState={{ disabled: submitting }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting || !location}
              style={[
                styles.actionBtn,
                styles.submitBtn,
                (submitting || !location) && styles.submitBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isAnon ? 'Submit anonymous flag report' : 'Submit flag report'}
              accessibilityState={{ disabled: submitting || !location, busy: submitting }}
            >
              {submitting ? (
                <ActivityIndicator color={color.textOnBrand} />
              ) : (
                <Text style={styles.submitText}>{isAnon ? 'Report anonymously' : 'Report'}</Text>
              )}
            </Pressable>
          </View>
        </View>
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
      flex: 1,
      backgroundColor: color.surface,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: 0,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      // WCAG 1.4.4: cap height so content scrolls at Dynamic Type XXL and
      // the Submit button is never pushed off screen.
      maxHeight: '88%',
    },
    scrollContent: { flex: 1 },
    scrollContentContainer: { gap: spacing.md, paddingBottom: spacing.tight },
    title: {
      fontSize: font.size.xxl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      letterSpacing: -0.3,
    },
    location: { fontSize: font.size.xs, color: color.textMuted },
    label: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
      marginTop: spacing.tight,
    },
    row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    pill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      // 44pt is the AccessMap baseline touch target (Apple HIG + WCAG 2.5.5).
      minHeight: 44,
      justifyContent: 'center',
    },
    pillActive: { backgroundColor: color.brand },
    pillText: { color: color.text, fontSize: font.size.sm },
    pillTextActive: { color: color.textOnBrand, fontWeight: font.weight.semibold },
    sevBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sevBtnActive: {},
    sevText: { fontSize: font.size.lg, color: color.text, fontWeight: font.weight.semibold },
    sevTextActive: { color: color.textOnBrand },
    input: {
      borderWidth: 1,
      borderColor: color.borderStrong,
      borderRadius: radius.md,
      padding: spacing.md,
      minHeight: 80,
      textAlignVertical: 'top',
      color: color.text,
      backgroundColor: color.surface,
      fontSize: 14,
      lineHeight: 19,
    },
    sevHint: {
      fontSize: 13,
      color: color.text,
      lineHeight: 18,
      marginTop: -4,
    },
    sevHintLabel: { fontWeight: '700', color: color.textStrong },
    charCounter: {
      fontSize: 12,
      color: color.textSubtle,
      textAlign: 'right',
      marginTop: 2,
    },
    charCounterAmber: { color: color.warningHint, fontWeight: '600' },
    charCounterRed: { color: color.error, fontWeight: '700' },
    // High-severity photo nudge card — amber-tinted, appears between the
    // "Photo" label and picker when severity ≥ 4 and no photo is attached.
    // warningBg (#fff7e6) / warningFg (#714b00): 8.3:1 contrast, WCAG AA.
    photoNudge: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: color.warningBg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
    },
    photoNudgeIcon: {
      fontSize: font.size.xl,
      lineHeight: 22,
    },
    photoNudgeBody: {
      flex: 1,
      fontSize: font.size.xs,
      color: color.warningFg,
      lineHeight: 17,
    },
    photoNudgeBold: {
      fontWeight: font.weight.bold,
      color: color.warningFg,
    },
    // Anonymous mode banner — tinted info strip shown at the top of the
    // form when the user is not signed in.
    // brandSofter/brandOnSoft: 7.6:1 contrast, WCAG AA.
    anonBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: color.brandSofter,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    anonBannerIcon: { fontSize: 16 },
    anonBannerBody: { flex: 1 },
    anonBannerTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: color.brandOnSoft,
    },
    anonBannerLink: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      minHeight: 44,
      justifyContent: 'center',
    },
    anonBannerLinkText: {
      fontSize: 13,
      fontWeight: '700',
      color: color.brandOnSoft,
      textDecorationLine: 'underline',
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
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
      minHeight: 44,
      justifyContent: 'center',
    },
    anonPhotoNudge: {
      fontSize: 13,
      color: color.textMuted,
      marginTop: 4,
    },
    anonPhotoNudgeLink: {
      color: color.brandText,
      fontWeight: '600',
    },
    cancelBtn: { backgroundColor: color.surfaceNeutral },
    cancelText: { color: color.text, fontWeight: font.weight.semibold },
    submitBtn: { backgroundColor: color.brand },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: { color: color.textOnBrand, fontWeight: font.weight.bold },
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
      minHeight: 44,
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
      minHeight: 44,
    },
    templateChipActive: {
      backgroundColor: color.brandText,
      borderColor: color.brandText,
    },
    templateChipGlyph: {
      fontSize: 16,
      color: color.brandText,
    },
    templateChipGlyphActive: {
      color: color.textOnBrand,
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
    disabilityTagIcon: {
      fontSize: font.size.md,
      lineHeight: 19,
    },
  });
