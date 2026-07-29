/**
 * The blocked-content rejection, and its route to the guidelines (§SKY-7).
 *
 * WHY THIS MODULE. `containsBlockedTerm` throws `CONTENT_BLOCKED_MESSAGE` from
 * two places — `comments.ts` (comment submit) and `flags.ts` (flag description)
 * — and both throws land in a generic catch that shows a generic alert. So the
 * app told a user they had broken the community guidelines and gave them no way
 * to read them. `12_READY_OR_NOT §3′.12` carried that as a named residual.
 *
 * Both call sites now route through here so they cannot drift apart.
 *
 * ─── HOW THE BLOCKED CASE IS RECOGNISED ────────────────────────────────────
 * There is no error CODE. `CONTENT_BLOCKED_MESSAGE` is thrown as a plain
 * `Error` message, so identity of the message IS the signal. That is a
 * deliberate minimum: introducing a code would mean editing the two throw
 * sites, and `blockedTerms.test.ts:185-193` asserts on their exact source text
 * precisely so nobody quietly changes what they throw. Matching on the message
 * leaves that fence untouched.
 *
 * `errorMessage(e)` rather than `e.message`: it is the same normalisation the
 * alert itself renders, so the check can never disagree with what is displayed.
 *
 * ─── WHY Alert.alert AND NOT confirm() ─────────────────────────────────────
 * `confirm()` is the house two-button primitive and it does work on web — but
 * it hardcodes 'Cancel' as the left button. This dialog is not cancelling
 * anything: the submit has already failed. 'Cancel' would be both new visible
 * copy (§SKY-7 allows exactly one new string, the button label) and the wrong
 * word for the moment. The shape used instead is the one already shipping 40
 * lines from the flag call site — the anon rate-limit alert's
 * `[{ action }, { text: 'OK', style: 'cancel' }]` — which is the same
 * "here is the problem, here is a way out" pattern.
 *
 * ─── THE WEB FORK, AND WHAT IT COSTS ───────────────────────────────────────
 * `Alert.alert` with buttons is a silent no-op on react-native-web (F46), so
 * web gets `notify` — the message, without the button. A web reader therefore
 * still has no route to the guidelines from this alert. That is a knowing,
 * recorded limitation, not an oversight: the alternative is `window.confirm`,
 * which reintroduces the 'Cancel' wording above. iOS is the submission target
 * and the guidelines remain reachable on web from Settings and About.
 */
import { Alert, Platform } from 'react-native';
import { notify } from './confirm';
import { errorMessage } from './errors';
import { CONTENT_BLOCKED_MESSAGE, VIEW_GUIDELINES_LABEL } from './copy';

/** True when `e` is the moderation filter's rejection, not a network failure. */
export function isContentBlockedError(e: unknown): boolean {
  return errorMessage(e) === CONTENT_BLOCKED_MESSAGE;
}

/**
 * Show the blocked-content rejection with a route to the guidelines.
 *
 * `onViewGuidelines` runs when the button is pressed. RN fires an Alert
 * button's `onPress` as the alert dismisses, so the callback IS the
 * after-dismiss hook — the terms sheet presents over whatever is beneath
 * without racing the alert's own teardown.
 *
 * @param title  the caller's existing alert title — unchanged, no new copy
 */
export function showBlockedContentAlert(title: string, onViewGuidelines: () => void): void {
  if (Platform.OS === 'web') {
    notify(title, CONTENT_BLOCKED_MESSAGE);
    return;
  }
  Alert.alert(title, CONTENT_BLOCKED_MESSAGE, [
    { text: VIEW_GUIDELINES_LABEL, onPress: onViewGuidelines },
    { text: 'OK', style: 'cancel' },
  ]);
}
