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
import { ScrollView, StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GuestProfile } from '@/screens/GuestProfile';
import { useDrawer } from '@/lib/drawerContext';
import { useSharedModals } from '@/lib/sharedModalsContext';
import { MISSION_STATEMENT } from '@/lib/copy';
import { getFloatingTabBarContentInset } from '@/navigation/tabBarGeometry';
import { spacing } from '@/theme';

// HeaderActions also reads useDrawerTrigger (D2/C3 focus return). This module
// stub replaces the whole module, so it has to carry both — a bare
// `{ useDrawer }` leaves the trigger hook undefined at call time.
jest.mock('@/lib/drawerContext', () => ({
  useDrawer: jest.fn(),
  useDrawerTrigger: () => ({ ref: { current: null }, register: jest.fn() }),
}));
jest.mock('@/lib/sharedModalsContext', () => ({ useSharedModals: jest.fn() }));

const mockSetDrawerOpen = jest.fn();
const mockSetSharedModal = jest.fn();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const TAB_BAR_HEIGHT = 102;

function renderGuest(onSignInPress: () => void = jest.fn()) {
  (useDrawer as jest.Mock).mockReturnValue({ open: false, setOpen: mockSetDrawerOpen });
  (useSharedModals as jest.Mock).mockReturnValue({ open: null, setOpen: mockSetSharedModal });
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <BottomTabBarHeightContext.Provider value={TAB_BAR_HEIGHT}>
        <GuestProfile onSignInPress={onSignInPress} />
      </BottomTabBarHeightContext.Provider>
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

  it('keeps the status inset outside the scroll and clears the floating tab bar', () => {
    const { UNSAFE_getByType } = renderGuest();
    const scroll = UNSAFE_getByType(ScrollView);
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toMatchObject({
      paddingTop: spacing.sm,
      paddingBottom: getFloatingTabBarContentInset(TAB_BAR_HEIGHT, METRICS.insets.bottom),
    });
  });
});

describe('board 08 — the wall gets something to say (Q11)', () => {
  it('carries the mission statement verbatim, from the one exported constant', () => {
    const { getByText } = renderGuest();
    expect(getByText(MISSION_STATEMENT)).toBeTruthy();
    // Non-vacuity: this is the same text About renders and mission.guard pins.
    expect(MISSION_STATEMENT.length).toBeGreaterThan(80);
  });

  it('says what an account adds, in three lines', () => {
    const { getByLabelText } = renderGuest();
    expect(getByLabelText('Add photos to your reports')).toBeTruthy();
    expect(getByLabelText('Verify and resolve barriers near you')).toBeTruthy();
    expect(getByLabelText('Earn points and badges')).toBeTruthy();
  });

  it('the three are statements, not controls — only Sign in is pressable', () => {
    const { getByLabelText, queryAllByRole } = renderGuest();
    expect(getByLabelText('Add photos to your reports').props.accessibilityRole).toBeUndefined();
    // One button on the screen besides the two header actions.
    const buttons = queryAllByRole('button').map((b) => b.props.accessibilityLabel);
    expect(buttons).toContain('Sign in to your account');
    expect(buttons).not.toContain('Earn points and badges');
  });

  it('the lone brand mark is gone — it led nowhere and lives on About', () => {
    const { queryByLabelText } = renderGuest();
    expect(queryByLabelText('Flagstone')).toBeNull();
  });

  it('the header family survives the rebuild', () => {
    const { getByText } = renderGuest();
    expect(getByText('PROFILE')).toBeTruthy();
    expect(getByText('Your profile')).toBeTruthy();
    expect(getByText('Sign in to see your stats, badges, and reports.')).toBeTruthy();
  });
});
