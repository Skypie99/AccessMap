import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Image,
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
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  createFlag,
  type ContextTagsCapability,
  severityColor,
  SEVERITY_DESCRIPTIONS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  subscribeContextTagsCapability,
  uploadFlagPhoto,
} from '@/lib/flags';
import {
  CONTEXT_TAGS,
  CONTEXT_TAG_LABELS,
  MAX_CONTEXT_TAGS,
  toggleTag,
  type ContextTag,
} from '@/lib/contextTags';
import {
  validReportTemplates,
  type ReportTemplate,
} from '@/lib/reportTemplates';
import type { FlagCategory, FlagSeverity } from '@/types/database';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { radius } from '@/theme';

interface Props {
  visible: boolean;
  location: { lat: number; lng: number } | null;
  onClose: () => void;
  onCreated: () => void;
}

export default function ReportFlagModal({
  visible,
  location,
  onClose,
  onCreated,
}: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { user } = useAuth();
  const [category, setCategory] = useState<FlagCategory>('no_ramp');
  const [severity, setSeverity] = useState<FlagSeverity>(3);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [contextTags, setContextTags] = useState<ContextTag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Web-only: hidden <input type="file"> used as the image picker substitute.
  const webFileInputRef = useRef<HTMLInputElement | null>(null);
  // Mirror of the module-level capability flag in src/lib/flags.ts. When
  // it flips to 'unavailable' (the propose-only migration isn't on this
  // backend yet) we disable the chip picker and surface a "coming soon"
  // hint instead of letting the user pick tags that get silently dropped.
  const [tagsCapability, setTagsCapability] =
    useState<ContextTagsCapability>('unknown');
  useEffect(() => subscribeContextTagsCapability(setTagsCapability), []);
  const tagsDisabled = tagsCapability === 'unavailable';

  // When severity crosses into "high" territory (≥4) and the user hasn't
  // attached a photo yet, announce a nudge to screen readers via
  // AccessibilityInfo (iOS VoiceOver — Android uses accessibilityLiveRegion
  // on the rendered hint element). Only fires on severity change, not on
  // every render, and never fires if a photo is already attached.
  const prevHighRef = useRef(false);
  useEffect(() => {
    const isHigh = severity >= 4 && !photoUri;
    if (isHigh && !prevHighRef.current) {
      void AccessibilityInfo.announceForAccessibility(
        `Tip: adding a photo helps verify this ${severity === 5 ? 'severe' : 'major'} barrier without a site visit.`,
      );
    }
    prevHighRef.current = isHigh;
  }, [severity, photoUri]);

  const reset = () => {
    setCategory('no_ramp');
    setSeverity(3);
    setDescription('');
    setPhotoUri(null);
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
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(
    null,
  );

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
            setPhotoUri(URL.createObjectURL(file));
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
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Could not pick photo', errorMessage(e));
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Sign in to report a flag.');
      return;
    }
    if (!location) {
      Alert.alert('No location', 'We need your location to place the flag.');
      return;
    }
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadFlagPhoto(user.id, photoUri);
      }
      const result = await createFlag(user.id, {
        lat: location.lat,
        lng: location.lng,
        category,
        severity,
        description: description.trim() ? description.trim() : null,
        photo_url: photoUrl,
        // Only send the field when the user actually picked tags. Empty
        // array means "no context"; createFlag still tries the column path
        // so it stays exercised, but skipping it keeps the legacy insert
        // path cheap (one round-trip) when no tags are selected.
        context_tags: contextTags.length > 0 ? [...contextTags] : undefined,
      });
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">Report a flag</Text>
          <Text style={styles.location}>
            {location
              ? `at ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
              : 'Waiting for location…'}
          </Text>

          {/* Quick-fill templates — appears above the manual Category /
              Severity rows so a reporter who just wants "the obvious one"
              can tap a chip and submit without scrolling. Each chip
              applies a curated (category + severity + suggested
              description) triple. Description is only seeded when the
              textbox is empty so we don't trample text a user already
              wrote. Tapping a second template overrides the previous
              chip's selection (driven by appliedTemplateId state). */}
          {templates.length > 0 && (
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
                      style={[
                        styles.templateChip,
                        active && styles.templateChipActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        active
                          ? `Template applied: ${t.label}. Tap to re-apply.`
                          : `Apply template: ${t.label}`
                      }
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[
                          styles.templateChipGlyph,
                          active && styles.templateChipGlyphActive,
                        ]}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        {t.glyph}
                      </Text>
                      <Text
                        style={[
                          styles.templateChipText,
                          active && styles.templateChipTextActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>Category</Text>
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

          <Text style={styles.label}>Severity</Text>
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
                  accessibilityLabel={`Severity ${s}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.sevText, active && styles.sevTextActive]}>
                    {s}
                  </Text>
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

          <Text style={styles.label}>Description (optional)</Text>
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
                description.length >= 1800 &&
                  description.length < 1960 &&
                  styles.charCounterAmber,
              ]}
              accessibilityLabel={`${description.length} of 2000 characters used`}
            >
              {description.length} / 2000
            </Text>
          )}

          <Text style={styles.label}>Photo (optional)</Text>

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
          {severity >= 4 && !photoUri && (
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

          {photoUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image
                source={{ uri: photoUri }}
                style={styles.photoPreview}
                accessible
                accessibilityLabel="Selected photo of the accessibility issue"
              />
              <Pressable
                onPress={() => setPhotoUri(null)}
                style={styles.photoClear}
                // hitSlop expands the 26pt visual target to ~46pt so the
                // tiny corner-X clears the 44pt touch-target floor without
                // resizing the visible chrome.
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <Text style={styles.photoClearText}>✕</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.row}>
              <Pressable
                onPress={() => pickPhoto('camera')}
                style={[styles.photoBtn]}
                accessibilityRole="button"
                accessibilityLabel="Take a photo with the camera"
              >
                <Text style={styles.photoBtnText}>📷 Take photo</Text>
              </Pressable>
              <Pressable
                onPress={() => pickPhoto('library')}
                style={[styles.photoBtn]}
                accessibilityRole="button"
                accessibilityLabel="Choose a photo from the library"
              >
                <Text style={styles.photoBtnText}>🖼 Choose from library</Text>
              </Pressable>
            </View>
          )}

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
                    tagsDisabled
                      ? 'Context tags will be available soon.'
                      : undefined
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
              accessibilityLabel="Submit flag report"
              accessibilityState={{ disabled: submitting || !location, busy: submitting }}
            >
              {submitting ? (
                <ActivityIndicator color={color.textOnBrand} />
              ) : (
                <Text style={styles.submitText}>Report</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.scrim,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: color.surface,
    padding: 20,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: color.textStrong,
    letterSpacing: -0.3,
  },
  location: { fontSize: 12, color: color.textMuted },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: color.textStrong,
    marginTop: 4,
  },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.circle,
    backgroundColor: color.surfaceNeutral,
    // 44pt is the AccessMap baseline touch target (Apple HIG + WCAG 2.5.5).
    minHeight: 44,
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: color.brand },
  pillText: { color: color.text, fontSize: 13 },
  pillTextActive: { color: color.textOnBrand, fontWeight: '600' },
  sevBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.surfaceNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevBtnActive: {},
  sevText: { fontSize: 16, color: color.text, fontWeight: '600' },
  sevTextActive: { color: color.textOnBrand },
  input: {
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.md,
    padding: 12,
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
  photoBtn: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: color.surfaceNeutral,
    alignItems: 'center',
    // 44pt baseline touch target.
    minHeight: 44,
    justifyContent: 'center',
  },
  photoBtnText: { color: color.text, fontWeight: '600', fontSize: 13 },
  // High-severity photo nudge card — amber-tinted, appears between the
  // "Photo" label and picker when severity ≥ 4 and no photo is attached.
  // warningBg (#fff7e6) / warningFg (#714b00): 8.3:1 contrast, WCAG AA.
  photoNudge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: color.warningBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  photoNudgeIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  photoNudgeBody: {
    flex: 1,
    fontSize: 12,
    color: color.warningFg,
    lineHeight: 17,
  },
  photoNudgeBold: {
    fontWeight: '700',
    color: color.warningFg,
  },
  photoPreviewWrap: { position: 'relative', alignSelf: 'flex-start' },
  photoPreview: { width: 140, height: 140, borderRadius: 10 },
  photoClear: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: color.backdropStrong,
    width: 26,
    height: 26,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoClearText: {
    color: color.textOnBrand,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 14,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: { backgroundColor: color.surfaceNeutral },
  cancelText: { color: color.text, fontWeight: '600' },
  submitBtn: { backgroundColor: color.brand },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: color.textOnBrand, fontWeight: '700' },
  // Context-tag chips. Three visual states matching accessibilityState:
  //   - unselected → outline (white bg, dark-blue border + text)  → 7.6:1 text/bg
  //   - selected   → solid dark-blue fill, white text              → 7.6:1 text/bg
  //   - disabled   → muted gray border + text on white             → 4.6:1 text/bg
  // The active fill uses #1c4f99 (Cycle C floor, AA-large 4.5:1+ on 13pt-600
  // and AA-large on white-text 7.6:1). This literal WILL switch to the
  // `color.brandText` token CL2 added to src/theme.ts once the C4 and CL2
  // branches both land — the Cycle C cleanup pass will reconcile. Don't
  // import from CL2 yet (it isn't merged into this worktree).
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
    fontSize: 13,
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: color.textOnBrand,
  },
  tagChipTextDisabled: {
    color: color.textMutedAlt, // AA pass: on #f4f6f8 = 4.6:1
  },
  tagHelper: {
    fontSize: 12,
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
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
    fontSize: 13,
    fontWeight: '600',
  },
  templateChipTextActive: {
    color: color.textOnBrand,
  },
});
