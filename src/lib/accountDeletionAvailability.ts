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
