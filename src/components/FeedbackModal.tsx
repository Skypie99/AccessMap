import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
// RNGH ScrollView, not react-native's — its ref exposes .handlerTag, which
// SheetPull's simultaneousHandlers={scrollRef} needs to coexist with
// pull-to-dismiss on native. Full mechanism: LegendModal.tsx.
import { ScrollView } from 'react-native-gesture-handler';
import { a11y, font, radius, spacing } from '@/theme';
import { a11yToggle, decorativeProps, useReduceTransparency } from '@/lib/accessibility';
import { AppText } from '@/components/ui/AppText';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { confirm } from '@/lib/confirm';
import { Sheet } from '@/components/ui/Sheet';
import { useAtTop } from '@/components/ui/SheetPull';
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
  // BP-6 focus cue: border swaps to brand while focused (width unchanged —
  // no layout shift). The Input primitive's treatment on these raw fields.
  const [bodyFocused, setBodyFocused] = useState(false);
  const [contactFocused, setContactFocused] = useState(false);
  // 'idea' is the lowest-friction default — most users have an idea
  // before they've isolated a bug, and "Idea" doesn't suggest the message
  // is going into a tracker.
  const [category, setCategory] = useState<FeedbackCategory>('idea');
  const [sending, setSending] = useState(false);
  const initialContactRef = useRef('');
  const scrollRef = useRef<ScrollView>(null);
  const { atTop, onScroll, scrollEventThrottle } = useAtTop();

  // Re-prefill contact whenever the modal opens — covers sign-out/sign-in
  // edge case. Body and category are preserved so the user doesn't lose
  // what they typed/picked if they close and reopen.
  useEffect(() => {
    if (visible) {
      const initialContact = user?.email ?? '';
      initialContactRef.current = initialContact;
      setContact(initialContact);
    }
  }, [visible, user?.email]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Bug-3 (2026-08-13, build 27): the sheet DOES lift above the keyboard, but at
  // its full height the lower content (the reply-email field) was squeezed out of
  // view. Reclaim the space the keyboard now covers — the bottom safe-area inset
  // and a shorter writing box — but ONLY while the keyboard is up, so the card
  // gets SHORTER, never taller. That means it can never push the close-X off the
  // top (the G6/SR-099 / 9235e3b cap this must not fight) — the fix is purely
  // additive to the keyboard-open case. keyboardDidShow/Hide covers both platforms.
  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    return () => {
      show.remove();
      hide.remove();
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
  const dirty = body.trim().length > 0 || contact !== initialContactRef.current;

  const requestClose = async () => {
    if (sending) return;
    if (!dirty) {
      onClose();
      return;
    }
    const discard = await confirm(
      'Discard feedback?',
      'Your unsent feedback will be lost.',
      'Discard',
      true,
    );
    if (!discard) return;
    setBody('');
    setContact(initialContactRef.current);
    onClose();
  };

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

  return (
    <Sheet
      visible={visible}
      onClose={() => void requestClose()}
      title="Send feedback"
      closeLabel="Close feedback"
      presentation="expanded"
      glass
      padded
      keyboardAvoiding
      minBottomPad={kbVisible ? spacing.md : spacing.xl}
      pullEnabled={!sending}
      atTop={atTop}
      scrollRef={scrollRef}
      testID="feedbackModal-backdrop"
      headerRight={
        <Pressable
          onPress={() => void requestClose()}
          disabled={sending}
          hitSlop={12}
          style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.borderPressed }]}
          accessibilityRole="button"
          accessibilityLabel="Close feedback"
          {...a11yToggle({ disabled: sending })}
        >
          <X size={18} color={color.text} strokeWidth={2.2} />
        </Pressable>
      }
    >
      {/* Sheet owns containment, focus-on-open, safe-area geometry, keyboard
          lift, and the pull gesture. The body and action row stay local so the
          feedback form keeps its pinned send controls. */}
            <ScrollView
              style={styles.body}
              ref={scrollRef}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              <AppText variant="bodyMedium" style={styles.subtitle}>
                Tell us what&apos;s working, what isn&apos;t, or what you wish Flagstone did. Tapping Send opens
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
                onFocus={() => setBodyFocused(true)}
                onBlur={() => setBodyFocused(false)}
                style={[styles.bodyInput, bodyFocused && { borderColor: color.brand }, kbVisible && styles.bodyInputKbUp]}
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
                onFocus={() => setContactFocused(true)}
                onBlur={() => setContactFocused(false)}
                style={[styles.contactInput, contactFocused && { borderColor: color.brand }]}
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
                onPress={() => void requestClose()}
                disabled={sending}
                style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && { backgroundColor: color.borderPressed }]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                {...a11yToggle({ disabled: sending })}
              >
                <AppText variant="label" style={styles.btnCancelText}>Cancel</AppText>
              </Pressable>
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                style={({ pressed }) => [styles.btn, styles.btnSend, !canSend && styles.btnSendDisabled, pressed && { backgroundColor: color.ctaFillPressed }]}
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
    </Sheet>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // Scrollable body between the pinned header and actions. flexShrink lets it
    // give up height so the card honors maxHeight and the body scrolls (G9).
    body: {
      flexShrink: 1,
    },
    bodyContent: {
      gap: spacing.sm,
      paddingBottom: spacing.tight,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
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
      letterSpacing: font.tracking.section,
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
    // Bug-3: shrink the writing box only while the keyboard is up so the reply-
    // email field + Cancel/Send stay visible above the keyboard on small phones.
    // Still ~4 lines, and the field is a scroll container so long text isn't lost.
    bodyInputKbUp: { minHeight: 88 },
    contactInput: {
      borderWidth: 1,
      borderColor: color.borderSubtle,
      backgroundColor: color.surfaceSoft,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: font.size.md,
      color: color.text,
      // Measured on device 2026-08-20 (Wave 3): a BORDERED TextInput reports an
      // accessibility frame INSIDE its own border, because iOS insets the native
      // field within the RN view. minHeight 44 measured 42 here and 43 on
      // TasksScreen's search fieldthis field — so no 44 written on a bordered input can
      // ever satisfy a 44 census. The + 2 is 2 x borderWidth below, not a fudge:
      // remove the border and it should come off with it. (Plain Views are
      // unaffected — the row titles fixed in this same wave land on 44 exactly.)
      minHeight: a11y.minTargetSize + 2,
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
