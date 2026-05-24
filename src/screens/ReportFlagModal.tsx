import React, { useState } from 'react';
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
  severityColor,
  SEVERITY_DESCRIPTIONS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  uploadFlagPhoto,
} from '@/lib/flags';
import type { FlagCategory, FlagSeverity } from '@/types/database';

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
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategory('no_ramp');
    setSeverity(3);
    setDescription('');
    setPhotoUri(null);
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
      await createFlag(user.id, {
        lat: location.lat,
        lng: location.lng,
        category,
        severity,
        description: description.trim() ? description.trim() : null,
        photo_url: photoUrl,
      });
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
});
