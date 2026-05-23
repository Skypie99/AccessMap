import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { color, font, radius, shadow, spacing } from '@/theme';
import { useAuth } from '@/lib/auth';
import { FEEDBACK_EMAIL, sendFeedback } from '@/lib/feedback';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Lightweight feedback modal — accessible from the global header on every
 * tab. The form collects free-text feedback and an optional contact email
 * (auto-filled from the signed-in user when available), then opens the
 * native mail composer via mailto:.
 *
 * Why mailto (vs. a Supabase table):
 *  - Zero new schema, zero new RLS, zero new dependencies.
 *  - The user sees what they're sending and can edit it in their own
 *    mail client — no surprise messages on their behalf.
 *  - Easy to upgrade later: swap the body-builder for an HTTP POST
 *    without changing the UI.
 *
 * When the OS doesn't have a mail client (web Firefox, headless), we
 * surface the email address inline so the user can copy it manually.
 */
export default function FeedbackModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);

  // Re-prefill contact whenever the modal opens — covers sign-out/sign-in
  // edge case. Body is preserved so the user doesn't lose what they typed
  // if they close and reopen.
  useEffect(() => {
    if (visible) {
      setContact(user?.email ?? '');
    }
  }, [visible, user?.email]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const canSend = body.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    const result = await sendFeedback({
      body,
      contactEmail: contact.trim() || undefined,
    });
    if (!mountedRef.current) return;
    setSending(false);

    if (result.status === 'opened') {
      AccessibilityInfo.announceForAccessibility('Opening your email app.');
      setBody('');
      onClose();
      return;
    }
    if (result.status === 'unavailable') {
      Alert.alert(
        'No email app found',
        `Send your feedback to:\n\n${FEEDBACK_EMAIL}\n\n(We tried to open your mail app but nothing responded.)`,
      );
      return;
    }
    Alert.alert("Couldn't open email", result.message);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!sending) onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text
              style={styles.title}
              accessibilityRole="header"
            >
              Send feedback
            </Text>
            <Pressable
              onPress={onClose}
              disabled={sending}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close feedback"
              accessibilityState={{ disabled: sending }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Tell us what's working, what isn't, or what you wish AccessMap did.
            Tapping Send opens your email app with the message prefilled.
          </Text>

          <Text style={styles.label}>Your feedback</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={6}
            placeholder="What's on your mind?"
            placeholderTextColor={color.textSubtle}
            style={styles.bodyInput}
            editable={!sending}
            textAlignVertical="top"
            accessibilityLabel="Feedback message"
            accessibilityHint="Type the feedback you'd like to send."
          />

          <Text style={styles.label}>Reply email (optional)</Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="you@example.com"
            placeholderTextColor={color.textSubtle}
            style={styles.contactInput}
            editable={!sending}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            accessibilityLabel="Reply email"
            accessibilityHint="Optional — leave blank to send anonymously."
          />

          <View style={styles.actionsRow}>
            <Pressable
              onPress={onClose}
              disabled={sending}
              style={[styles.btn, styles.btnCancel]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityState={{ disabled: sending }}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={[
                styles.btn,
                styles.btnSend,
                !canSend && styles.btnSendDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Send feedback"
              accessibilityHint="Opens your email app with the message prefilled."
              accessibilityState={{
                disabled: !canSend,
                busy: sending,
              }}
            >
              {sending ? (
                <ActivityIndicator color={color.textOnBrand} />
              ) : (
                <Text style={styles.btnSendText}>Send</Text>
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
    gap: spacing.sm,
    ...shadow.e3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    color: color.textStrong,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: color.surfaceNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: font.size.lg,
    color: color.text,
    fontWeight: font.weight.bold,
  },
  subtitle: {
    fontSize: font.size.sm,
    color: color.textMuted,
    lineHeight: 18,
  },
  label: {
    fontSize: font.size.xs,
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: font.weight.semibold,
    marginTop: spacing.sm,
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: color.borderSubtle,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.size.md,
    color: color.text,
    minHeight: 120,
  },
  contactInput: {
    borderWidth: 1,
    borderColor: color.borderSubtle,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.size.md,
    color: color.text,
    minHeight: 44,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnCancel: { backgroundColor: color.surfaceNeutral },
  btnCancelText: {
    color: color.text,
    fontWeight: font.weight.semibold,
    fontSize: font.size.base,
  },
  btnSend: { backgroundColor: color.brand },
  btnSendDisabled: { opacity: 0.4 },
  btnSendText: {
    color: color.textOnBrand,
    fontWeight: font.weight.bold,
    fontSize: font.size.base,
  },
});
