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
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
    rpc: (...a: unknown[]) => mockRpc(...a),
    from: (...a: unknown[]) => mockFrom(...a),
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
    jest.resetAllMocks();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('is true only when the caller-scoped RPC authorizes admin actions', async () => {
    signedInAs('admin-uid');
    mockRpc.mockResolvedValue({ data: true, error: null });
    render(<Probe />);
    expect(screen.getByTestId('v')).toHaveTextContent('null');
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('true'));
    expect(mockRpc).toHaveBeenCalledWith('current_user_can_admin');
    expect(mockFrom).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('is false for a caller without admin authority', async () => {
    signedInAs('plain-uid');
    mockRpc.mockResolvedValue({ data: false, error: null });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('false'));
    expect(warn).not.toHaveBeenCalled();
  });

  it('degrades to false and warns without backend error text when the RPC is refused', async () => {
    signedInAs('blocked-uid');
    mockRpc.mockResolvedValue({
      data: true,
      error: { code: '42501', message: 'permission denied for function current_user_can_admin' },
    });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('false'));
    // The whole point: it must not fail silently again.
    expect(warn.mock.calls).toEqual([
      ['[admin] authorization check failed, treating as non-admin.'],
    ]);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('permission denied for function current_user_can_admin');
  });

  it('is false when nobody is signed in, without querying', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('false'));
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it.each([null, undefined, 'true', 1, { is_admin: true }])(
    'fails closed for a non-boolean RPC result: %p',
    async (data) => {
      signedInAs('plain-uid');
      mockRpc.mockResolvedValue({ data, error: null });
      render(<Probe />);
      await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('false'));
      expect(mockFrom).not.toHaveBeenCalled();
    },
  );

  it('warns and fails closed when the RPC is absent, without a users fallback', async () => {
    signedInAs('plain-uid');
    mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'RPC unavailable' } });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('false'));
    expect(warn).toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('warns and fails closed when the authorization request throws', async () => {
    signedInAs('plain-uid');
    mockRpc.mockRejectedValue(new Error('network unavailable'));
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('false'));
    expect(warn).toHaveBeenCalledWith('[admin] authorization check failed, treating as non-admin.');
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
