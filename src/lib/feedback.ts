import { Alert, Linking, Platform } from 'react-native';
import { errorMessage } from './errors';

/**
 * Where user feedback goes. Single source of truth — change here if the
 * owner email ever moves.
 */
export const FEEDBACK_EMAIL = 'skylerhalisky@gmail.com';

/**
 * Feedback categories. The user picks one in the modal; we tag the
 * subject line with it so the maintainer's inbox can triage at a glance
 * ("AccessMap feedback: Bug" vs ". Idea" vs ". Love"). Default is
 * 'idea' — the lowest-friction starting point.
 */
export const FEEDBACK_CATEGORIES = ['bug', 'idea', 'love', 'other'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  idea: 'Idea',
  love: 'Love',
  other: 'Other',
};

// Emoji glyphs that pair with the labels in the UI. Decorative only —
// the label is always read aloud, never the emoji.
export const FEEDBACK_CATEGORY_GLYPHS: Record<FeedbackCategory, string> = {
  bug: '🐛',
  idea: '💡',
  love: '❤️',
  other: '💬',
};

const SUBJECT_BASE = 'AccessMap feedback';

// Mailto URLs have practical length limits (~2000 chars in many clients,
// older Outlook chokes around 1000). Trim early so we never hand the OS
// a URL it will silently drop.
const MAX_BODY_CHARS = 1800;

interface ComposeOptions {
  body: string;
  contactEmail?: string;
  category?: FeedbackCategory;
}

/**
 * Build the mailto: URL we'll hand to Linking.openURL. Encodes the body
 * appropriately and prepends the user's contact email (if any) so the
 * owner can reply even when the platform's mail client strips the
 * From address. Exported for testing.
 */
export function buildMailtoUrl({ body, contactEmail, category }: ComposeOptions): string {
  const trimmed = body.trim().slice(0, MAX_BODY_CHARS);
  const categoryLabel = category ? FEEDBACK_CATEGORY_LABELS[category] : null;
  // Subject gets the category appended after a colon so the maintainer's
  // inbox can sort by it. Falls back to the plain subject when the caller
  // doesn't pass a category (programmatic uses like About → "Send feedback"
  // skip the category prompt).
  const subjectText = categoryLabel ? `${SUBJECT_BASE}: ${categoryLabel}` : SUBJECT_BASE;
  const replyPrefix = contactEmail ? `Reply to: ${contactEmail}\n` : '';
  const categoryPrefix = categoryLabel ? `Category: ${categoryLabel}\n` : '';
  const prefix = replyPrefix || categoryPrefix ? `${replyPrefix}${categoryPrefix}\n` : '';
  const footer = `\n\n---\nSent from AccessMap on ${Platform.OS}`;
  const fullBody = `${prefix}${trimmed}${footer}`;
  // encodeURIComponent escapes everything mailto cares about; the OS / mail
  // client will decode it back. Use %20 for spaces in subject — some
  // clients are picky about the "+" form.
  const subject = encodeURIComponent(subjectText);
  const bodyParam = encodeURIComponent(fullBody);
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${bodyParam}`;
}

/**
 * Open the user's email composer with the feedback prefilled. Returns
 * a result discriminator the caller can use to drive UI feedback:
 *
 *  - 'opened'  → the platform accepted the mailto URL (we trust it
 *                actually surfaced a composer). The caller closes the
 *                modal and shows a thanks toast.
 *  - 'unavailable' → Linking.canOpenURL returned false. The caller
 *                should fall back (copy text to clipboard, show the
 *                address). Most common on web with no default email
 *                client configured.
 *  - 'error'   → openURL threw. The caller should show the message.
 */
export type SendFeedbackResult =
  | { status: 'opened' }
  | { status: 'unavailable'; url: string }
  | { status: 'error'; message: string };

export async function sendFeedback(options: ComposeOptions): Promise<SendFeedbackResult> {
  const url = buildMailtoUrl(options);
  try {
    // Web Safari sometimes returns false from canOpenURL for mailto
    // even when it would work — skip the precheck there and let the
    // browser handle it. Native (iOS/Android) returns true when a mail
    // client is installed.
    if (Platform.OS !== 'web') {
      const can = await Linking.canOpenURL(url);
      if (!can) return { status: 'unavailable', url };
    }
    await Linking.openURL(url);
    return { status: 'opened' };
  } catch (e) {
    return { status: 'error', message: errorMessage(e, 'Could not open email.') };
  }
}

/**
 * Convenience for callers that don't need fine-grained result handling —
 * just show a fallback Alert with the email address copied in. Used by
 * About and other entry points that don't have a modal to close.
 */
export async function openFeedbackComposer(): Promise<void> {
  const result = await sendFeedback({ body: '' });
  if (result.status === 'opened') return;
  Alert.alert(
    'Email AccessMap',
    `Couldn't open your email app. Send your feedback to:\n\n${FEEDBACK_EMAIL}`,
  );
}
