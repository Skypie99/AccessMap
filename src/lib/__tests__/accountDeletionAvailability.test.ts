import { accountDeletionStartAvailability } from '../accountDeletionAvailability';

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
