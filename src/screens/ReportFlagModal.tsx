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
import type { FlagCategory, FlagSeverity } from '@/types/database';
import { color } from '@/theme';

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
  const { user } = useAuth();
  const [category, setCategory] = useState<FlagCategory>('no_ramp');
  const [severity, setSeverity] = useState<FlagSeverity>(3);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [contextTags, setContextTags] = useState<ContextTag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Mirror of the module-level capability flag in src/lib/flags.ts. When
  // it flips to 'unavailable' (the propose-only migration isn't on this
  // backend yet) we disable the chip picker and surface a "coming soon"
  // hint instead of letting the user pick tags that get silently dropped.
  const [tagsCapability, setTagsCapability] =
    useState<ContextTagsCapability>('unknown');
  useEffect(() => subscribeContextTagsCapability(setTagsCapability), []);
  const tagsDisabled = tagsCapability === 'unavailable';

  const reset = () => {
    setCategory('no_ramp');
    setSeverity(3);
    setDescription('');
    setPhotoUri(null);
    setContextTags([]);
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission needed',
          `Allow ${source === 'camera' ? 'camera' : 'photo library'} access to attach a photo.`,
        );
        return;
      }
      const result =
        source === 'camera'
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
        <View style={styles.card}>
          <Text style={styles.title}>Report a flag</Text>
          <Text style={styles.location}>
            {location
              ? `at ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
              : 'Waiting for location…'}
          </Text>

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
                  onPress={() => setCategory(c)}
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
                  onPress={() => setSeverity(s)}
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
            maxLength={500}
            style={styles.input}
            accessibilityLabel="Description of the accessibility issue"
            accessibilityHint="Optional. Up to 500 characters."
          />
          {/* Character counter — visible once the user starts typing.
              Turns amber at 400 chars (20% left) and red at 480 (4% left)
              so they have clear warning before the hard limit cuts them off. */}
          {description.length > 0 && (
            <Text
              style={[
                styles.charCounter,
                description.length >= 480 && styles.charCounterRed,
                description.length >= 400 &&
                  description.length < 480 &&
                  styles.charCounterAmber,
              ]}
              accessibilityLabel={`${description.length} of 500 characters used`}
            >
              {description.length} / 500
            </Text>
          )}

          <Text style={styles.label}>Photo (optional)</Text>
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
                <ActivityIndicator color="#fff" />
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  location: { fontSize: 12, color: '#666' },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#eef1f5',
  },
  pillActive: { backgroundColor: '#2f80ed' },
  pillText: { color: '#333', fontSize: 13 },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  sevBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef1f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevBtnActive: {},
  sevText: { fontSize: 16, color: '#333', fontWeight: '600' },
  sevTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  sevHint: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginTop: -4,
  },
  sevHintLabel: { fontWeight: '700', color: '#333' },
  charCounter: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginTop: 2,
  },
  charCounterAmber: { color: '#c07a00' },
  charCounterRed: { color: '#c0392b', fontWeight: '700' },
  photoBtn: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eef1f5',
    alignItems: 'center',
  },
  photoBtnText: { color: '#333', fontWeight: '600', fontSize: 13 },
  photoPreviewWrap: { position: 'relative', alignSelf: 'flex-start' },
  photoPreview: { width: 140, height: 140, borderRadius: 10 },
  photoClear: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#000',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoClearText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: { backgroundColor: '#eef1f5' },
  cancelText: { color: '#333', fontWeight: '600' },
  submitBtn: { backgroundColor: '#2f80ed' },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700' },
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
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1c4f99',
    minHeight: 44,
    justifyContent: 'center',
  },
  tagChipActive: {
    backgroundColor: '#1c4f99', // AA pass: white text 7.6:1; future: color.brandText
    borderColor: '#1c4f99',
  },
  tagChipDisabled: {
    borderColor: '#9aa3ad',
    backgroundColor: '#f4f6f8',
  },
  tagChipText: {
    color: '#1c4f99', // AA pass: on #ffffff = 7.6:1; future: color.brandText
    fontSize: 13,
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: '#ffffff',
  },
  tagChipTextDisabled: {
    color: color.textMutedAlt, // AA pass: on #f4f6f8 = 4.6:1
  },
  tagHelper: {
    fontSize: 12,
    color: color.textMutedAlt,
    marginTop: -4,
  },
});
