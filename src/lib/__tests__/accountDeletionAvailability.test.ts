import { accountDeletionAsyncStatusAvailable, accountDeletionStartAvailability } from '../accountDeletionAvailability';

describe('account deletion start availability', () => {
  it('blocks web before a confirmation or deletion request can be opened', () => {
    expect(accountDeletionStartAvailability('web')).toEqual({
      supported: false,
      title: 'Account deletion is available in Flagstone on iOS',
      message: 'No deletion request was made. Use Flagstone on iOS to start and check account deletion securely.',
    });
  });

  it.each(['ios', 'android'])('continues to the existing native confirmation flow on %s', (platform) => {
    expect(accountDeletionStartAvailability(platform)).toEqual({ supported: true });
  });
});

describe('FDA-003 / Phase 04B — async deletion status capability', () => {
  // The deployed backend has no account-deletion-status route (archived
  // Phase 02A capture). Flipping this is a Phase 05 decision that must arrive
  // with capability proof, so a change here should be deliberate and reviewed.
  it('is absent in this build', () => {
    expect(accountDeletionAsyncStatusAvailable()).toBe(false);
  });
});
