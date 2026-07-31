import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type Text,
  TextInput,
  View,
} from 'react-native';
import { font, radius, spacing } from '@/theme';
import { a11yToggle, decorativeProps, useFocusOnOpen, useReducedMotion, useReduceTransparency } from '@/lib/accessibility';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useAuth } from '@/lib/auth';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_EMAIL,
  sendFeedback,
  type FeedbackCategory,
} from '@/lib/feedback';
import { FEEDBACK_CATEGORY_ICONS } from '@/components/feedbackCategoryIcons';
import { submitFeedback } from '@/lib/feedbackStore';
import { MAX_BODY_CHARS } from '@/lib/feedback';
import { X } from 'lucide-react-native';

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
  const color = useColor();
  const styles = makeStyles(color);
  // Engineered chip tint (mirrors TasksScreen): the sheet blurs, the chip tints.
  // Under Reduce Transparency the chips fall back to the solid neutral pair; the
  // selected chip keeps the mode-independent CTA fill (categoryChipSelected).
  const reduceTransparency = useReduceTransparency();
  const chipFill = reduceTransparency ? color.surfaceNeutral : color.glassChipFill;
  const chipEdge = reduceTransparency ? color.borderSubtle : color.glassChipEdge;
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  // 'idea' is the lowest-friction default — most users have an idea
  // before they've isolated a bug, and "Idea" doesn't suggest the message
  // is going into a tracker.
  const [category, setCategory] = useState<FeedbackCategory>('idea');
  const [sending, setSending] = useState(false);

  // Re-prefill contact whenever the modal opens — covers sign-out/sign-in
  // edge case. Body and category are preserved so the user doesn't lose
  // what they typed/picked if they close and reopen.
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

  // Mirrors public.feedback.body check constraint (1..=5000 chars) from
  // supabase/migrations/2026-05-23_feedback_table.sql. F19: cap the input at
  // the mailto body limit (MAX_BODY_CHARS) — the email fallback is the always-
  // available channel (the Supabase feedback table is optional), and it
  // silently truncated anything past 1800 chars. Capping here guarantees the
  // user can't type more than will actually be sent, regardless of backend.
  const MAX_FEEDBACK_LEN = MAX_BODY_CHARS;
  // RFC 5321 mail-address local-part max is 64 + '@' + 255 = 320. Keeps
  // a hostile multi-KB paste from sneaking past the server email regex.
  const MAX_EMAIL_LEN = 320;
  // Defense-in-depth email validation. The DB has a regex constraint but
  // it only enforces after the migration is applied; this short check
  // catches typos and obviously-broken inputs before we round-trip.
  const isPlausibleEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const trimmedContact = contact.trim();
  const contactInvalid = trimmedContact.length > 0 && !isPlausibleEmail(trimmedContact);
  const canSend =
    body.trim().length > 0 && body.length <= MAX_FEEDBACK_LEN && !contactInvalid && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);

    // Dual-write: fire the Supabase insert in parallel with opening the
    // mail composer. The insert is best-effort — its result NEVER blocks
    // the mailto path. If the table doesn't exist yet (migration not
    // applied) submitFeedback returns {status:'skipped'} and we move on.
    const insertPromise = submitFeedback({
      body,
      category,
      contactEmail: contact.trim() || undefined,
      userId: user?.id,
    });

    const result = await sendFeedback({
      body,
      contactEmail: contact.trim() || undefined,
      category,
    });

    // Resolve (don't await for UI gating, but log if it threw so we can
    // see this in dev). Intentionally fire-and-forget.
    insertPromise.then((r) => {
      if (r.status === 'skipped') {
        console.warn('[feedback] server insert skipped:', r.reason);
      }
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

  // WCAG 2.3.3: snap (no slide) when the user prefers reduced motion.
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);

  return (
    <Modal
      aria-label="Send feedback"
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      transparent
      onRequestClose={() => {
        if (!sending) onClose();
      }}
    >
      {/* accessibilityViewIsModal — VoiceOver treats everything behind
          this view as inert while the modal is up. Same pattern as
          HelpModal; see that file for the longer comment. Alex P5. */}
      <View
        style={styles.backdrop}
        accessibilityViewIsModal
        // G1: same `!sending` guard as onRequestClose — a scrub mid-send must
        // no-op exactly like the disabled X does.
        onAccessibilityEscape={() => {
          if (!sending) onClose();
        }}
        testID="feedbackModal-backdrop"
      >
        {/* KAV nests INSIDE the backdrop — the backdrop keeps
            accessibilityViewIsModal + testID (pinned by the sharedModalsContext
            test) and the KAV lifts the card above the iOS keyboard. Same recipe
            as AddressSearchModal (G9). */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <View style={styles.cardWrap}>
          <GlassSurface variant="bulk" borderRadius={0} style={styles.card}>
            <View style={styles.headerRow}>
              <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
                Send feedback
              </AppText>
              <Pressable
                onPress={onClose}
                disabled={sending}
                hitSlop={12}
                style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.borderPressed }]}
                accessibilityRole="button"
                accessibilityLabel="Close feedback"
                {...a11yToggle({ disabled: sending })}
              >
                <X size={18} color={color.text} strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Body scrolls when the card is bound (maxHeight 90%) on short
                viewports / large type; headerRow above and actionsRow below stay
                pinned so the ✕ and Cancel/Send never scroll away (G9). */}
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              <AppText variant="bodyMedium" style={styles.subtitle}>
                Tell us what&apos;s working, what isn&apos;t, or what you wish AccessMap did. Tapping Send opens
                your email app with the message prefilled.
              </AppText>

              <AppText variant="label" style={styles.label}>Category</AppText>
              <View
                style={styles.categoryRow}
                accessibilityRole="radiogroup"
                accessibilityLabel="Feedback category"
              >
                {FEEDBACK_CATEGORIES.map((c) => {
                  const selected = c === category;
                  const Icon = FEEDBACK_CATEGORY_ICONS[c];
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCategory(c)}
                      disabled={sending}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: chipFill, borderColor: chipEdge },
                        selected && styles.categoryChipSelected,
                      ]}
                      accessibilityRole="radio"
                      accessibilityLabel={FEEDBACK_CATEGORY_LABELS[c]}
                      {...a11yToggle({
                        selected,
                        disabled: sending,
                      })}
                    >
                      <Icon
                        size={18}
                        color={selected ? color.textOnBrand : color.glassChipInk}
                        strokeWidth={2.2} {...decorativeProps}
                      />
                      <AppText
                        variant="label"
                        style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}
                      >
                        {FEEDBACK_CATEGORY_LABELS[c]}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <AppText variant="label" style={styles.label}>Your feedback</AppText>
              <TextInput
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={6}
                maxLength={MAX_FEEDBACK_LEN}
                placeholder="What's on your mind?"
                placeholderTextColor={color.placeholderText}
                style={styles.bodyInput}
                editable={!sending}
                textAlignVertical="top"
                accessibilityLabel="Feedback message"
                accessibilityHint={`Type the feedback you'd like to send. Up to ${MAX_FEEDBACK_LEN} characters.`}
              />

              <AppText variant="label" style={styles.label}>Reply email (optional)</AppText>
              <TextInput
                value={contact}
                onChangeText={setContact}
                maxLength={MAX_EMAIL_LEN}
                placeholder="you@example.com"
                placeholderTextColor={color.placeholderText}
                style={styles.contactInput}
                editable={!sending}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                // A11Y-233 (1.3.5 Identify Input Purpose): the keyboard hint
                // alone does not tell the OS what this field IS, so password
                // managers and autofill could not offer the user's own address.
                autoComplete="email"
                textContentType="emailAddress"
                accessibilityLabel="Reply email"
                accessibilityHint={
                  contactInvalid
                    ? 'Enter a valid email address or leave blank.'
                    : 'Optional — leave blank to send anonymously.'
                }
              />
              {contactInvalid ? (
                <AppText
                  variant="bodyMedium"
                  accessibilityLiveRegion="polite"
                  style={{
                    fontSize: 12,
                    // errorFg, not color.error: #c0392b = 3.84:1 light / 2.23:1
                    // dark on the bulk worst-case (FAIL both). errorFg = ~6.4:1.
                    color: color.errorFg,
                    marginTop: -4,
                  }}
                >
                  Please enter a valid email address.
                </AppText>
              ) : null}
            </ScrollView>

            <View style={styles.actionsRow}>
              <Pressable
                onPress={onClose}
                disabled={sending}
                style={[styles.btn, styles.btnCancel]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                {...a11yToggle({ disabled: sending })}
              >
                <AppText variant="label" style={styles.btnCancelText}>Cancel</AppText>
              </Pressable>
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                style={[styles.btn, styles.btnSend, !canSend && styles.btnSendDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Send feedback"
                accessibilityHint="Opens your email app with the message prefilled."
                {...a11yToggle({
                  disabled: !canSend,
                  busy: sending,
                })}
              >
                {sending ? (
                  <ActivityIndicator color={color.textOnBrand} />
                ) : (
                  <AppText variant="label" style={styles.btnSendText}>Send</AppText>
                )}
              </Pressable>
            </View>
          </GlassSurface>
          </View>
        </KeyboardAvoidingView>
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
    // Bulk-glass sheet material lives on the GlassSurface (variant="bulk" supplies
    // the floor + top edge/specular + designed RT state). No backgroundColor here
    // (the variant owns it); overflow:'hidden' + top radius round the sheet top;
    // maxHeight bounds it so the body ScrollView can shrink (G9). Shadow lives on
    // cardWrap (overflow would clip it).
    card: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      overflow: 'hidden',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
      maxHeight: '90%',
      // G6/SR-099: shrink into cardWrap's cap (see that block).
      flexShrink: 1,
    },
    // Bottom-sheet up-shadow on the OUTER wrapper — identical to AboutScreen
    // (the two sheets are siblings). Negative height casts it UP off the top
    // edge. Dark keeps the one sanctioned Deep Field dark shadow (#000@0.35);
    // light uses shadowTint@0.12. (do/don't #2 deviation — card overflow clips it.)
    // G6/SR-099 — THE CAP LIVES HERE. This surface has one more layer than its
    // siblings: backdrop → KAV → cardWrap → card. A percentage maxHeight only
    // resolves against a parent with a *definite* height, and both the KAV and
    // cardWrap are content-sized — so the card's own `maxHeight:'90%'` never
    // resolved and the card could grow unbounded, exactly as About/Help do
    // live (X measured at y=-65 / y=-53). Only the KAV's parent (the `flex:1`
    // backdrop) is definite, so the cap must sit on the KAV; cardWrap and card
    // just need permission to shrink into it. Latent rather than live here
    // only because the feedback form is short.
    kav: {
      width: '100%',
      maxHeight: '90%',
      flexShrink: 1,
    },
    cardWrap: {
      flexShrink: 1,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      ...(color.scheme === 'dark'
        ? { shadowColor: '#000', shadowOpacity: 0.35 }
        : { shadowColor: color.shadowTint, shadowOpacity: 0.12 }),
      shadowRadius: 14,
      shadowOffset: { width: 0, height: -4 },
      elevation: 5,
    },
    // Scrollable body between the pinned header and actions. flexShrink lets it
    // give up height so the card honors maxHeight and the body scrolls (G9).
    body: {
      flexShrink: 1,
    },
    bodyContent: {
      gap: spacing.sm,
      paddingBottom: spacing.tight,
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
      width: 44,
      height: 44,
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
      // inkGlassMuted, not textMuted (#666 = 4.06:1 FAIL on the light bulk sheet).
      color: color.inkGlassMuted,
      lineHeight: 18,
    },
    label: {
      fontSize: font.size.xs,
      // inkGlassMuted (same bulk-sheet fork as subtitle); variant="label" is
      // already >=500, so only the color re-arbitrates.
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: font.weight.semibold,
      marginTop: spacing.sm,
    },
    categoryRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    // Engineered chip tint — fill/edge are applied INLINE on the Pressable
    // (RT-dependent, can't be static). Selected -> ctaFill via categoryChipSelected.
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      minHeight: 44,
    },
    // Selected = mode-independent CTA fill + transparent border (chip law).
    categoryChipSelected: {
      backgroundColor: color.ctaFill,
      borderColor: 'transparent',
    },
    categoryChipText: {
      // glassChipInk on the engineered tint (11.06:1 light / 8.16:1 dark).
      color: color.glassChipInk,
      fontWeight: font.weight.semibold,
      fontSize: font.size.sm,
    },
    // Selected label rides ctaFill -> textOnBrand (white, 5.24:1 both modes).
    categoryChipTextSelected: { color: color.textOnBrand },
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
    // ctaFill (mode-independent #1466E0), not color.brand: dark brand #4E89EF +
    // white = 3.4:1 (FAIL). Matches every other primary CTA in the glass system.
    btnSend: { backgroundColor: color.ctaFill },
    btnSendDisabled: { opacity: 0.4 },
    btnSendText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.base,
    },
  });
