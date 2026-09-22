export type AccountDeletionStartAvailability =
  | { supported: true }
  | { supported: false; title: string; message: string };

/** Web cannot securely retain the locally scoped receipt recovery capability.
 * Keep the decision before the confirmation modal, so no web press can reach
 * the deletion request function. */
export function accountDeletionStartAvailability(platform: string): AccountDeletionStartAvailability {
  if (platform === 'web') {
    return {
      supported: false,
      title: 'Account deletion is available in Flagstone on iOS',
      message: 'No deletion request was made. Use Flagstone on iOS to start and check account deletion securely.',
    };
  }
  return { supported: true };
}

/** FDA-003 / Phase 04B capability gate for the asynchronous erasure protocol
 * (a durable REQUESTED reply followed by `account-deletion-status` polling).
 * The deployed backend has neither: the archived Phase 02A capture lists
 * `delete-account` v4, which deletes synchronously and answers
 * `status: 'deleted'`, and no `account-deletion-status` route. While this is
 * false the client never calls that route, never shows the REQUESTED/status
 * workflow, and never accepts `status: 'requested'` as an outcome. Only a
 * separately accepted Phase 05 release that proves the route is deployed may
 * change it; a local source file is not that proof. */
export function accountDeletionAsyncStatusAvailable(): boolean {
  return false;
}
