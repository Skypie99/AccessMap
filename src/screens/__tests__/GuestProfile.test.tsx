/**
 * GuestProfile — the signed-out Profile's editorial guest state (T10 / F2-04).
 *
 * Guards that the guest branch renders the S8 header family (eyebrow / title /
 * subtitle nodes) + the HeaderActions menu + feedback pair, and that they wire to
 * the drawer, the feedback modal, and the sign-in CTA. Renders the extracted
 * component directly so the whole ProfileScreen provider/effect surface is not
 * needed — the a11y-tree re-walk (eyebrow/title/menu/feedback nodes) is the
 * text/label presence below.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GuestProfile } from '@/screens/GuestProfile';
import { useDrawer } from '@/lib/drawerContext';
import { useSharedModals } from '@/lib/sharedModalsContext';

jest.mock('@/lib/drawerContext', () => ({ useDrawer: jest.fn() }));
jest.mock('@/lib/sharedModalsContext', () => ({ useSharedModals: jest.fn() }));

const mockSetDrawerOpen = jest.fn();
const mockSetSharedModal = jest.fn();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderGuest(onSignInPress: () => void = jest.fn()) {
  (useDrawer as jest.Mock).mockReturnValue({ open: false, setOpen: mockSetDrawerOpen });
  (useSharedModals as jest.Mock).mockReturnValue({ open: null, setOpen: mockSetSharedModal });
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <GuestProfile onSignInPress={onSignInPress} />
    </SafeAreaProvider>,
  );
}

afterEach(() => jest.clearAllMocks());

describe('GuestProfile — the signed-out editorial family (T10 / F2-04)', () => {
  it('renders the S8 header family nodes: eyebrow PROFILE, title, subtitle', () => {
    const { getByText } = renderGuest();
    expect(getByText('PROFILE')).toBeTruthy();
    expect(getByText('Your profile')).toBeTruthy();
    expect(getByText('Sign in to see your stats, badges, and reports.')).toBeTruthy();
  });

  it('restores the HeaderActions menu + feedback pair to the guest tab', () => {
    const { getByLabelText } = renderGuest();
    expect(getByLabelText('Open navigation menu')).toBeTruthy();
    expect(getByLabelText('Send feedback')).toBeTruthy();
  });

  it('the menu action opens the drawer', () => {
    const { getByLabelText } = renderGuest();
    fireEvent.press(getByLabelText('Open navigation menu'));
    expect(mockSetDrawerOpen).toHaveBeenCalledWith(true);
  });

  it('the feedback action opens the feedback modal', () => {
    const { getByLabelText } = renderGuest();
    fireEvent.press(getByLabelText('Send feedback'));
    expect(mockSetSharedModal).toHaveBeenCalledWith('feedback');
  });

  it('the sign-in CTA delegates to the caller (Fork 3 untouched — same button)', () => {
    const onSignInPress = jest.fn();
    const { getByLabelText } = renderGuest(onSignInPress);
    fireEvent.press(getByLabelText('Sign in to your account'));
    expect(onSignInPress).toHaveBeenCalledTimes(1);
  });
});
