/**
 * useIsAdmin — the gate that decides whether the Admin tab exists.
 *
 * These tests exist because the gate failed SILENTLY in production. The hook
 * read users.is_admin, got 42501 "permission denied for table users" on every
 * call (the `authenticated` role has no SELECT grant on that column), dropped
 * the error, and resolved `false` — indistinguishable from a healthy "you are
 * not an admin". The Admin tab therefore rendered for nobody, and no signal
 * anywhere said why.
 *
 * So the third case below is the load-bearing one: an errored read must still
 * degrade to false (a gate that fails OPEN would be far worse) but must not do
 * it quietly.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useIsAdmin } from '../admin';

const mockGetUser = jest.fn();
const mockSingle = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSingle(),
        }),
      }),
    }),
  },
}));

function Probe() {
  const isAdmin = useIsAdmin();
  return <Text testID="v">{String(isAdmin)}</Text>;
}

const signedInAs = (id: string) => mockGetUser.mockResolvedValue({ data: { user: { id } } });

describe('useIsAdmin', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('is true for an account with is_admin = true', async () => {
    signedInAs('admin-uid');
    mockSingle.mockResolvedValue({ data: { is_admin: true }, error: null });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('true'));
    expect(warn).not.toHaveBeenCalled();
  });

  it('is false for an account with is_admin = false', async () => {
    signedInAs('plain-uid');
    mockSingle.mockResolvedValue({ data: { is_admin: false }, error: null });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('false'));
    expect(warn).not.toHaveBeenCalled();
  });

  it('degrades to false AND warns when the read is refused (the 42501 case)', async () => {
    signedInAs('blocked-uid');
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied for table users' },
    });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('false'));
    // The whole point: it must not fail silently again.
    expect(warn).toHaveBeenCalledWith(
      '[admin] is_admin read failed, treating as non-admin:',
      'permission denied for table users',
    );
  });

  it('is false when nobody is signed in, without querying', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('false'));
    expect(mockSingle).not.toHaveBeenCalled();
  });
});

/**
 * The other half of the gate: what the navigator does with the hook's answer.
 * Source pin rather than a navigator mount — the house idiom for this
 * (cf. drawerRoutes.guard.test.ts), and it fails the moment the contract breaks.
 */
describe('the Admin tab registration', () => {
  const navSrc = () =>
    readFileSync(join(__dirname, '..', '..', 'navigation', 'RootNavigator.tsx'), 'utf8');

  it('registers the Admin screen ONLY under a strict isAdmin === true', () => {
    const src = navSrc();
    // Strict equality matters: `isAdmin && ...` would also render the tab
    // during the null loading window, flashing an admin surface at everyone.
    expect(src).toMatch(/\{isAdmin === true && \(/);
    expect(src).not.toMatch(/\{isAdmin && \(/);
  });

  it('has exactly one registration site for the Admin screen', () => {
    const sites = [...navSrc().matchAll(/name="Admin"/g)];
    expect(sites).toHaveLength(1);
  });
});
