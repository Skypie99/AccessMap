/**
 * ReportContentModal — the Apple 1.2(b) abuse-report sheet. ONE surface, both
 * targets (a flag, or somebody else's comment).
 *
 * WHOSE DESIGN THIS IS. Sky, DECISIONS.md §SKY-3g: Option B, encode-in-body via
 * the existing feedback pipeline. `src/lib/reports.ts` owns the envelope and the
 * error discipline; this file is only the surface over it.
 *
 * ONE SHEET, NOT TWO. A flag report and a comment report differ by one uuid in
 * the header line. Two components would be two copies of the same submit ladder
 * and two chances for them to drift; `ReportTarget` carries the difference.
 *
 * WHY IT MOUNTS AS A SIBLING INSIDE FlagDetailModal, NOT IN SharedModalsHost.
 * `SharedModalKey` is a payload-free union — it can say "open the report sheet"
 * but not "…about comment 9f3c". Its own JSDoc excludes per-screen-state modals
 * by name. StatusHistoryModal is the shipped precedent for a payload-carrying
 * sibling stacked over the detail sheet, and this copies it.
 *
 * NOT WIRED YET, ON PURPOSE. This commit lands the surface with no entry point,
 * so the dismissal census (src/__tests__/dismissalStandard.guard.test.ts) enrols
 * it and proves A/B/B2/C/D/E/F BEFORE any control can open it. A surface that
 * arrives already reachable gets its first census run and its first real user on
 * the same day.
 *
 * THE HONESTY FENCE. Every visible string here comes from `src/lib/copy.ts`
 * marked PROPOSED or RATIFIED, or is a byte-identical reuse of an
 * already-shipped literal (Cancel / Send / Close). Nothing in this file states
 * a policy, a review cadence, a response time, or an outcome ON ITS OWN
 * AUTHORITY — where it now states one, the words are Sky's, ratified.
 *
 * ⚑ UPDATED 2026-07-27. This note used to end: "there is deliberately NO
 * report-category picker — that taxonomy is Sky's copy (05 §3 ⑯), so the reason
 * is free text." That was correct until she wrote the taxonomy herself in
 * `14_MODERATION_TEXTS_v1.md` §3. The picker below renders HER five, and D-1
 * (§SKY-5) chose SUPPLEMENT — it sits alongside the free-text reason rather
 * than replacing it, and either alone is enough to send. The fence did not
 * lapse; it was satisfied.
 *
 * NO accessibilityHint ON THE MODERATION CONTROLS. Every hint that would
 * actually help on a report control ("we'll review this", "the comment will be
 * removed") is a moderation promise, and authoring one is a fence breach. A
 * missing hint is NOT a WCAG failure — the accessible NAME carries the meaning.
 * The dismissal chrome (Close/Cancel) is not a moderation control and would be
 * free to carry one; it doesn't need one either.
 *
 * DISMISSAL. `onAccessibilityEscape` and `accessibilityViewIsModal` are SILENT
 * NO-OPS on a <Modal> tag — RN 0.81.5 forwards an explicit allowlist to
 * RCTModalHostView and neither prop is in it. Both therefore ride the backdrop,
 * the modal's containment child, and the escape expression is byte-identical to
 * `onRequestClose` so a scrub and the Android back button cannot diverge.
 *
 * VISUAL TREATMENT IS MOCKUP-GATED. The layout stack, the tokens, and the
 * sheet's chrome are lifted from FeedbackModal — the arbitrated bulk-glass sheet
 * recipe — so this introduces NO new ink/fill pair and needs no contrast-arbiter
 * run. Anything beyond "it matches its siblings" is Sky's call, not this file's.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
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
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { bulkGlassShadow, font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { a11yToggle, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/confirm';
import { FEEDBACK_EMAIL, sendFeedback } from '@/lib/feedback';
import {
  MAX_REPORT_REASON_CHARS,
  buildReportBody,
  submitContentReport,
  type ReportTarget,
} from '@/lib/reports';
import {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_LABEL,
  REPORT_CONTROL_LABEL,
  REPORT_FAILED_TITLE,
  REPORT_REASON_LABEL,
  REPORT_SENT_BODY,
  REPORT_SENT_TITLE,
  TERMS_LINK_HINT,
  TERMS_LINK_LABEL,
  type ReportCategoryId,
  reportFailedBody,
} from '@/lib/copy';
import { useSharedModals } from '@/lib/sharedModalsContext';

interface Props {
  visible: boolean;
  /** What is being reported. `null` keeps the sheet unpresented. */
  target: ReportTarget | null;
  onClose: () => void;
}

export default function ReportContentModal({ visible, target, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  // The terms sheet is mounted at the navigator, not here — this sheet is
  // itself inside the flag sheet, and a third modal nested in the second would
  // be trapped beneath it. Raising the shared flag lets it present on top.
  const { setOpen } = useSharedModals();

  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<ReportCategoryId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // This sheet opens OVER the flag-detail sheet, so without this the
  // screen-reader cursor stays on the control behind it and the user never
  // learns the report form appeared (WCAG 2.4.3).
  const titleRef = useFocusOnOpen<Text>(visible && !!target);

  // The next open must be a blank form, not the last one's leftovers — a
  // half-typed reason about comment A must never be pre-loaded onto comment B.
  // Resetting on CLOSE (rather than on open) also clears the acknowledgement,
  // so a reopened sheet shows the form and not a stale "Report sent".
  useEffect(() => {
    if (!visible) {
      setReason('');
      // Same reasoning as the reason field: a category picked about comment A
      // must never arrive pre-selected on comment B.
      setCategory(null);
      setSubmitting(false);
      setSent(false);
    }
  }, [visible]);

  // The submit ladder awaits twice; the parent can unmount this sheet in
  // between (closing the detail sheet closes its siblings). Same guard as
  // FeedbackModal.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // D-1 (§SKY-5): SUPPLEMENT. A category alone is a complete report — one tap
  // is the fastest and most accessible path through this sheet — and a typed
  // reason alone still works exactly as it did before the picker existed.
  // Requiring BOTH would add friction to an abuse-reporting flow, which is
  // where friction does the most harm.
  //
  // ⚠ This must stay in step with the same gate in `submitContentReport`
  // (reports.ts). A UI that enables Send for a state the submitter rejects
  // fails AFTER the user commits, which reads as the app losing their report.
  const canSend = (category !== null || reason.trim().length > 0) && !submitting;

  const handleSend = async () => {
    if (!canSend || !target) return;
    setSubmitting(true);

    // RUNG 1 — the DB insert. This IS the channel, so unlike FeedbackModal we
    // cannot fire-and-forget it: `submitContentReport` maps feedbackStore's
    // 'skipped' to `failed` precisely so a rate-limited or unmigrated insert
    // falls through to the next rung instead of reading as success.
    const result = await submitContentReport({ target, reason, category, userId: user?.id });

    if (result.status === 'submitted') {
      if (!mountedRef.current) return;
      setSubmitting(false);
      setSent(true);
      // The acknowledgement below renders inside an `accessibilityLiveRegion`,
      // which React Native implements on ANDROID ONLY. On iOS VoiceOver the
      // swap was therefore silent: the sheet visually confirmed the send and
      // said nothing to the user who most needs to hear it. Named HIGH in
      // `13_B1_VERIFY_LEDGER.md`; the house pattern is to pair the region with
      // an explicit announce (ProfileScreen, SignInScreen, NearbyFlagsModal).
      //
      // iOS-only on purpose — on Android the live region already announces, and
      // firing both is the double-announce ReportFlagModal retired at S10.
      //
      // Announces Sky's RATIFIED string rather than a new one: an announcement
      // is user-facing copy, and inventing a second "sent" sentence here would
      // be exactly the agent-authored policy text the B-1 fence exists to stop.
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(REPORT_SENT_BODY);
      }
      return;
    }

    // DIAGNOSTIC ONLY — never rendered. `result.reason` can carry raw PostgREST
    // text; the copy the user sees is a separate string in copy.ts.
    console.warn('[report] insert failed:', result.reason);

    // RUNG 2 — the mailto half of the SAME pipeline, carrying the SAME
    // envelope, so a report that arrives by email parses with the very same
    // `parseReportBody` as one that arrived by insert.
    //
    // ⚠ NO `category` HERE, deliberately, and it is not an oversight to "fix":
    // buildMailtoUrl prepends `Category: <Label>\n\n` whenever one is passed
    // (feedback.ts), which would push the body to
    // `Category: Other\n\n[REPORT] v1 …` and take the sentinel off byte 0 of the
    // mail Sky triages. This rung fires exactly when the DB insert FAILED — the
    // C-7 anon throttle is 30/h global and shared with ordinary feedback — so it
    // is the path where a report is most at risk of being missed, and the one
    // where the marker has to be the first thing in the message.
    // The DB half still carries category 'other' (submitContentReport passes
    // it), so the recorded backfill —
    // `UPDATE feedback SET category='report' WHERE body LIKE '[REPORT]%'` —
    // is unaffected. Cost, accepted: the mail subject is the plain
    // "Flagstone feedback" rather than "…: Other". Naming it "Report" in the
    // subject would be new copy, which is Sky's.
    const mail = await sendFeedback({
      // The SAME envelope as rung 1, category included — a report that arrives
      // by email must parse with the very same `parseReportBody` as one that
      // arrived by insert. Dropping `category` here would make the two halves
      // disagree exactly on the triage axis the picker exists to provide.
      body: buildReportBody(target, reason, category),
    });

    if (!mountedRef.current) return;
    setSubmitting(false);

    if (mail.status === 'opened') {
      // Byte-identical reuse of FeedbackModal's shipped announcement. It says
      // what happened (a composer opened) and claims nothing about delivery —
      // the user still presses send in their own mail app, which is why this
      // does NOT show the "Report sent" acknowledgement.
      AccessibilityInfo.announceForAccessibility('Opening your email app.');
      onClose();
      return;
    }

    // RUNG 3 — name the address so the report is still deliverable by hand.
    // `notify`, not Alert.alert: Alert is a silent no-op on react-native-web,
    // and a failed submission is exactly the class of message the error tiers
    // say the user must see on web too (F46).
    notify(REPORT_FAILED_TITLE, reportFailedBody(FEEDBACK_EMAIL));
    // The sheet stays open on purpose: the reason the user typed is still in
    // the field, so they can retry or copy it out.
  };

  return (
    <Modal
      aria-label={REPORT_CONTROL_LABEL}
      visible={visible && !!target}
      animationType={reducedMotion ? 'none' : 'slide'}
      transparent
      onRequestClose={() => {
        if (!submitting) onClose();
      }}
    >
      {/* The containment child. accessibilityViewIsModal makes the flag-detail
          sheet underneath inert to VoiceOver, and the escape handler lives here
          because RN drops it on the <Modal> tag. The `!submitting` guard is the
          same one the visible Cancel carries, so a scrub mid-send no-ops the
          way the disabled button does (G1). */}
      <View
        style={styles.backdrop}
        accessibilityViewIsModal
        onAccessibilityEscape={() => {
          if (!submitting) onClose();
        }}
        testID="reportContentModal-backdrop"
      >
        {/* J2-5 / G6: the percentage cap lives on the KAV, whose parent (the
            flex:1 backdrop) is the only node with a DEFINITE height. cardWrap
            and card just need permission to shrink into it — a maxHeight on
            them alone never resolves. FeedbackModal's stack, verbatim. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <View style={styles.cardWrap}>
            <GlassSurface variant="bulk" borderRadius={0} style={[styles.card, { paddingBottom: Math.max(spacing.xl, insets.bottom) }]}>
              <View style={styles.headerRow}>
                <AppText
                  ref={titleRef}
                  variant="heading"
                  style={styles.title}
                  accessibilityRole="header"
                >
                  {REPORT_CONTROL_LABEL}
                </AppText>
                {/* The house pattern names the surface ("Close feedback",
                    "Close status history"). "Close report" would be a NEW
                    user-facing string, and new strings route through copy.ts
                    and Sky's §A pass — this commit ships none. So the bare
                    shipped literal is reused; BP16 can promote it. Sharing the
                    name with the acknowledgement's Close button is correct
                    rather than ambiguous: same name, same action (WCAG 3.2.4). */}
                <Pressable
                  onPress={onClose}
                  disabled={submitting}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.closeBtn,
                    pressed && { backgroundColor: color.borderPressed },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  {...a11yToggle({ disabled: submitting })}
                >
                  <X size={18} color={color.text} strokeWidth={2.2} />
                </Pressable>
              </View>

              {sent ? (
                // The live region is what tells a screen-reader user the send
                // landed — the visual swap is invisible to them, and there is
                // no toast on this surface.
                <View style={styles.sentWrap} accessibilityLiveRegion="polite">
                  <AppText variant="heading" style={styles.sentTitle}>
                    {REPORT_SENT_TITLE}
                  </AppText>
                  <AppText variant="body" style={styles.sentBody}>
                    {REPORT_SENT_BODY}
                  </AppText>
                </View>
              ) : (
                // Scrolls under the 90% cap so the field stays reachable at
                // large dynamic type with the keyboard up (WCAG 1.4.4). Header
                // and actions stay pinned.
                <ScrollView
                  style={styles.body}
                  contentContainerStyle={styles.bodyContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Sky's five, §3. Radio semantics rather than buttons: a
                      screen reader must hear "2 of 5, selected", and a row of
                      plain buttons announces neither the set nor the state.
                      Vertical rows, not chips — label 4 is a full sentence and
                      would truncate or reflow badly in a chip at large type. */}
                  <AppText variant="label" style={styles.label} nativeID="reportCategoryLabel">
                    {REPORT_CATEGORY_LABEL}
                  </AppText>
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabelledBy="reportCategoryLabel"
                    accessibilityLabel={REPORT_CATEGORY_LABEL}
                    style={styles.categoryGroup}
                  >
                    {REPORT_CATEGORIES.map((c) => {
                      const selected = category === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setCategory(selected ? null : c.id)}
                          disabled={submitting}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected, disabled: submitting }}
                          accessibilityLabel={c.label}
                          style={[styles.categoryRow, selected && styles.categoryRowSelected]}
                          testID={`reportContentModal-category-${c.id}`}
                        >
                          {/* Selection is carried by more than colour (WCAG
                              1.4.1): the dot fills AND the row's border and
                              background change. */}
                          <View style={[styles.radio, selected && styles.radioSelected]}>
                            {selected ? <View style={styles.radioDot} /> : null}
                          </View>
                          <AppText variant="body" style={styles.categoryText}>
                            {c.label}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>

                  <AppText variant="label" style={styles.label}>
                    {REPORT_REASON_LABEL}
                  </AppText>
                  {/* D-1 (§SKY-5) chose SUPPLEMENT: the picker above does NOT
                      replace this field. The earlier note here said a fixed
                      category list would be authored moderation policy — true
                      when written, and the fence held until Sky authored the
                      list herself in §3. Both now ship; either alone can send.
                      maxLength is the module's constant, not a local number, so
                      the field cannot accept text `submitContentReport` would
                      silently clamp. */}
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={5}
                    maxLength={MAX_REPORT_REASON_CHARS}
                    style={styles.reasonInput}
                    editable={!submitting}
                    textAlignVertical="top"
                    accessibilityLabel={REPORT_REASON_LABEL}
                    testID="reportContentModal-reason"
                  />

                  {/* §SKY-6 / §SKY-6a. This sheet asks someone to judge content
                      against community guidelines that, until now, existed
                      nowhere they could read them. The link is the whole fix —
                      no explanatory sentence above it, deliberately: any
                      sentence introducing it would be an agent authoring
                      moderation copy, which is the one thing the B-1 fence
                      forbids. A labelled route to Sky's own words says more
                      than a paragraph about them would.

                      ⚠ RESIDUAL, recorded in §SKY-6a: the OTHER surface that
                      cites the guidelines — CONTENT_BLOCKED_MESSAGE, the
                      submit-time filter rejection — is an Alert and still
                      carries no route. Sky ruled that out of scope for Run 2. */}
                  <Pressable
                    onPress={() => setOpen('terms')}
                    disabled={submitting}
                    style={({ pressed }) => [
                      styles.termsLinkRow,
                      pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={TERMS_LINK_LABEL}
                    accessibilityHint={TERMS_LINK_HINT}
                    {...a11yToggle({ disabled: submitting })}
                    testID="reportContentModal-terms"
                  >
                    <AppText variant="bodyMedium" style={styles.termsLinkText}>
                      {TERMS_LINK_LABEL}
                    </AppText>
                  </Pressable>
                </ScrollView>
              )}

              <View style={styles.actionsRow}>
                {sent ? (
                  <Pressable
                    onPress={onClose}
                    style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { backgroundColor: color.ctaFillPressed }]}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <AppText variant="label" style={styles.btnPrimaryText}>
                      Close
                    </AppText>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={onClose}
                      disabled={submitting}
                      style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && { backgroundColor: color.borderPressed }]}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel"
                      {...a11yToggle({ disabled: submitting })}
                    >
                      <AppText variant="label" style={styles.btnCancelText}>
                        Cancel
                      </AppText>
                    </Pressable>
                    <Pressable
                      onPress={handleSend}
                      disabled={!canSend}
                      style={({ pressed }) => [styles.btn, styles.btnPrimary, !canSend && styles.btnPrimaryDisabled, pressed && { backgroundColor: color.ctaFillPressed }]}
                      accessibilityRole="button"
                      accessibilityLabel="Send"
                      testID="reportContentModal-send"
                      {...a11yToggle({ disabled: !canSend, busy: submitting })}
                    >
                      {submitting ? (
                        <ActivityIndicator color={color.textOnBrand} />
                      ) : (
                        <AppText variant="label" style={styles.btnPrimaryText}>
                          Send
                        </AppText>
                      )}
                    </Pressable>
                  </>
                )}
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
    // The cap that actually resolves — see the J2-5 note at the call site.
    kav: {
      width: '100%',
      maxHeight: '90%',
      flexShrink: 1,
    },
    // The up-shadow rides the OUTER wrapper; the card's overflow:'hidden' would
    // clip it. Dark keeps the one sanctioned Deep Field dark shadow.
    cardWrap: {
      flexShrink: 1,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      ...bulkGlassShadow(color),
    },
    // Bulk-glass sheet material lives on the GlassSurface variant; no
    // backgroundColor here. Same recipe as FeedbackModal.
    card: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      overflow: 'hidden',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
      maxHeight: '90%',
      flexShrink: 1,
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
    body: {
      flexShrink: 1,
    },
    bodyContent: {
      gap: spacing.sm,
      paddingBottom: spacing.tight,
    },
    label: {
      fontSize: font.size.xs,
      // inkGlassMuted, not textMuted: #666 is 4.06:1 on the light bulk sheet
      // (FAIL). Same arbitrated pair FeedbackModal uses on this material.
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
      fontWeight: font.weight.semibold,
      marginTop: spacing.sm,
    },
    categoryGroup: {
      marginTop: spacing.xs,
      gap: spacing.xs,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      // 44pt is the WCAG 2.5.8 / HIG floor. paddingVertical alone would shrink
      // below it at the smallest dynamic type, so the minHeight is the guard.
      minHeight: 44,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: color.borderSubtle,
      backgroundColor: 'transparent',
    },
    categoryRowSelected: {
      borderColor: color.brand,
      backgroundColor: color.brandSoft,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: color.inkGlassMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: color.brand,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: color.brand,
    },
    categoryText: {
      // flex so a long label (category 4 is a full sentence) wraps inside the
      // row instead of pushing the row wider than the sheet.
      flex: 1,
      fontSize: font.size.sm,
      color: color.text,
    },
    reasonInput: {
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
    // §SKY-6 terms link. This began as a byte-identical reuse of AboutScreen's
    // shipped link treatment (color.brand + underline) on the same BULK
    // material — and the G3 proof set then measured it at 3.70:1 light /
    // 3.56:1 dark against a 4.5 body-text floor. "Already shipped elsewhere" is
    // an argument, not a measurement, and this is what the arbiter is for.
    // brandOnSoft is the arbitrated brand-on-glass ink: 4.95/5.58 light,
    // 7.66/9.65 dark. minHeight (not height) keeps the 44pt target while
    // letting the label grow at large dynamic type.
    termsLinkRow: {
      minHeight: 44,
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    termsLinkText: {
      fontSize: font.size.base,
      color: color.brandOnSoft,
      textDecorationLine: 'underline',
      lineHeight: 22,
    },
    sentWrap: {
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    sentTitle: {
      fontSize: font.size.md,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    sentBody: {
      fontSize: font.size.base,
      color: color.inkGlassMuted,
      lineHeight: font.lineHeight.base,
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
    // ctaFill (mode-independent #1466E0), not color.brand: dark brand + white
    // is 3.4:1 (FAIL). Matches every other primary CTA in the glass system.
    btnPrimary: { backgroundColor: color.ctaFill },
    btnPrimaryDisabled: { opacity: 0.4 },
    btnPrimaryText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.base,
    },
  });
