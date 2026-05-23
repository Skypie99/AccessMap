import { Alert, Linking, Platform } from 'react-native';
import { errorMessage } from './errors';

/**
 * Where user feedback goes. Single source of truth — change here if the
 * owner email ever moves.
 */
export const FEEDBACK_EMAIL = 'skylerhalisky@gmail.com';

const SUBJECT = 'AccessMap feedback';

// Mailto URLs have practical length limits (~2000 chars in many clients,
// older Outlook chokes around 1000). Trim early so we never hand the OS
// a URL it will silently drop.
const MAX_BODY_CHARS = 1800;

interface ComposeOptions {
  body: string;
  contactEmail?: string;
}

/**
 * Build the mailto: URL we'll hand to Linking.openURL. Encodes the body
 * appropriately and prepends the user's contact email (if any) so the
 * owner can reply even when the platform's mail client strips the
 * From address. Exported for testing.
 */
export function buildMailtoUrl({ body, contactEmail }: ComposeOptions): string {
  const trimmed = body.trim().slice(0, MAX_BODY_CHARS);
  const prefix = contactEmail
    ? `Reply to: ${contactEmail}\n\n`
    : '';
  const footer = `\n\n---\nSent from AccessMap on ${Platform.OS}`;
  const fullBody = `${prefix}${trimmed}${footer}`;
  // encodeURIComponent escapes everything mailto cares about; the OS / mail
  // client will decode it back. Use %20 for spaces in subject — some
  // clients are picky about the "+" form.
  const subject = encodeURIComponent(SUBJECT);
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

export async function sendFeedback(
  options: ComposeOptions,
): Promise<SendFeedbackResult> {
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
