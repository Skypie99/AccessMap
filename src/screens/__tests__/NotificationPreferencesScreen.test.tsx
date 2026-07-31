/**
 * Component tests for NotificationPreferencesScreen.
 *
 * Strategy: mock `useNotificationPreferences` at the module level so each
 * test can control the full preferences / loading / setPreference surface
 * without hitting AsyncStorage or React hook internals (those are exercised
 * in src/hooks/__tests__/useNotificationPreferences.test.ts, which already
 * has 11 passing tests).
 *
 * Also mock `useAuth` and `useColor` so the screen can render without a
 * full React-Native provider tree.
 *
 * Toggle row labels (as rendered and as accessibilityLabel):
 *   - 'Flag status updates'
 *   - 'Nearby flags'
 *   - 'Watched flag updates'
 *   - 'Bulk watch alerts'
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Pull the mock reference for per-test reconfiguration.
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

// ---------------------------------------------------------------------------
// Import the component under test (after all mocks are registered).
// ---------------------------------------------------------------------------

import NotificationPreferencesScreen from '../NotificationPreferencesScreen';

// ---------------------------------------------------------------------------
// Mock: useNotificationPreferences
// ---------------------------------------------------------------------------

const mockSetPreference = jest.fn();

const mockPreferences = {
  flagStatusUpdates: true,
  nearbyFlags: true,
  watchedFlagUpdates: true,
  bulkWatchAlerts: true,
};

jest.mock('@/hooks/useNotificationPreferences', () => ({
  useNotificationPreferences: jest.fn(() => ({
    preferences: mockPreferences,
    setPreference: mockSetPreference,
    loading: false,
  })),
}));
const mockUseNotificationPreferences = useNotificationPreferences as jest.MockedFunction<
  typeof useNotificationPreferences
>;

// ---------------------------------------------------------------------------
// Mock: useAuth — return a signed-in user by default so the "sign in" notice
// is hidden and the toggle rows are shown.
// ---------------------------------------------------------------------------

jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'test-user-id' } })),
}));

// ---------------------------------------------------------------------------
// Mock: useColor — return a minimal color theme so StyleSheet.create doesn't
// choke on missing tokens. Only the keys used by NotificationPreferencesScreen
// need to be present; others can be empty strings.
// ---------------------------------------------------------------------------

jest.mock('@/theme/ThemeContext', () => ({
  useColor: jest.fn(() => ({
    scrim: 'rgba(0,0,0,0.4)',
    surface: '#fff',
    surfaceMuted: '#f7f9fc',
    surfaceNeutral: '#eef1f5',
    textStrong: '#222',
    text: '#333',
    textMuted: '#666',
    textMutedAlt: '#9ca3af',
    brand: '#2f80ed',
    warningBg: '#fff3cd',
    warningFg: '#856404',
    accentOrange: '#f1a520',
    shadow: '#000',
  })),
}));
// Note: the screens/__tests__ directory is one level above screens/, so the
// relative import goes up one directory (../) to reach NotificationPreferencesScreen.tsx

// ---------------------------------------------------------------------------
// Shared render helper — always opens the modal (visible=true).
// ---------------------------------------------------------------------------

function renderScreen(onClose = jest.fn()) {
  return render(<NotificationPreferencesScreen visible onClose={onClose} />);
}

// ---------------------------------------------------------------------------
// Reset mocks between tests so state doesn't bleed.
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  // Restore default (all-true, not loading, signed-in).
  mockUseNotificationPreferences.mockReturnValue({
    preferences: { ...mockPreferences },
    setPreference: mockSetPreference,
    loading: false,
  });
});

// ===========================================================================
// 1. Render — screen renders with all 4 toggle rows visible
// ===========================================================================

describe('render', () => {
  it('renders all 4 toggle rows', () => {
    const { getByText } = renderScreen();

    expect(getByText('Flag status updates')).toBeTruthy();
    expect(getByText('Nearby flags')).toBeTruthy();
    expect(getByText('Watched flag updates')).toBeTruthy();
    expect(getByText('Bulk watch alerts')).toBeTruthy();
  });
});

// ===========================================================================
// 2. Labels — each row has correct accessibilityLabel
// ===========================================================================

describe('accessibility labels', () => {
  it('each toggle row carries the correct accessibilityLabel', () => {
    const { getByLabelText } = renderScreen();

    expect(getByLabelText('Flag status updates')).toBeTruthy();
    expect(getByLabelText('Nearby flags')).toBeTruthy();
    expect(getByLabelText('Watched flag updates')).toBeTruthy();
    expect(getByLabelText('Bulk watch alerts')).toBeTruthy();
  });
});

// ===========================================================================
// 3. Default state — all 4 switches are ON by default
// ===========================================================================

describe('default state', () => {
  it('all 4 toggle rows have accessibilityState checked=true by default', () => {
    const { getByLabelText } = renderScreen();

    const labels = [
      'Flag status updates',
      'Nearby flags',
      'Watched flag updates',
      'Bulk watch alerts',
    ];

    for (const label of labels) {
      const row = getByLabelText(label);
      expect(row.props.accessibilityState).toEqual({ checked: true });
    }
  });
});

// ===========================================================================
// 4. Toggle interaction — operating the ACCESSIBLE element works (A11Y-212)
//
// The element a screen reader lands on (found by its accessible label) must be
// the element that actually toggles the preference. The old version of this
// block found the hidden inner Switch by type-index and fired valueChange on it
// directly — which passed even though the accessible wrapper had no handler at
// all, entrenching the "announces as a switch, double-tap does nothing" defect.
// These tests now operate the control exactly the way AT reaches it: by label.
// ===========================================================================

describe('toggle interaction (via the accessible element)', () => {
  const cases: [string, string][] = [
    ['Flag status updates', 'flagStatusUpdates'],
    ['Nearby flags', 'nearbyFlags'],
    ['Watched flag updates', 'watchedFlagUpdates'],
    ['Bulk watch alerts', 'bulkWatchAlerts'],
  ];

  it.each(cases)('operating "%s" by its accessible label calls setPreference("%s", false)', (label, key) => {
    const { getByLabelText } = renderScreen();
    fireEvent(getByLabelText(label), 'valueChange', false);
    expect(mockSetPreference).toHaveBeenCalledWith(key, false);
  });
});

// ===========================================================================
// 4b. A11Y-212 guard — accessible identity and operability live on the SAME
// element, and that element is not hidden from assistive tech.
//
// The defect this pins: role="switch" + label + state sat on a wrapper View
// with no press handler, while the real Switch was AT-hidden
// (accessibilityElementsHidden + no-hide-descendants). VoiceOver/TalkBack
// announced a switch and double-tap did nothing, on all four rows. A guard is
// only as true as its assertions — so this one asserts the coupling itself.
// ===========================================================================

describe('A11Y-212 guard — the announced element is the operable element', () => {
  const labels = [
    'Flag status updates',
    'Nearby flags',
    'Watched flag updates',
    'Bulk watch alerts',
  ];

  it.each(labels)('"%s": switch role, operability, and AT visibility are co-located', (label) => {
    const { getByLabelText } = renderScreen();
    const el = getByLabelText(label);

    // Identity: the labelled element announces as a switch with state.
    expect(el.props.accessibilityRole).toBe('switch');
    expect(el.props.accessibilityState).toEqual({ checked: true });

    // Operability: dispatching the toggle gesture AT the labelled element
    // reaches a live handler. (RN's Switch consumes onValueChange at the JS
    // layer, so the prop is not inspectable on the labelled host element —
    // but under the old defect the labelled wrapper View had no handler
    // anywhere in its chain, so this dispatch called nothing. Behavioral
    // dispatch is the assertion that actually pins the defect.)
    fireEvent(el, 'valueChange', false);
    expect(mockSetPreference).toHaveBeenCalledTimes(1);

    // AT visibility: the operable control must not be hidden from AT.
    expect(el.props.accessibilityElementsHidden).toBeFalsy();
    expect(el.props.importantForAccessibility).not.toBe('no-hide-descendants');
  });
});

// ===========================================================================
// 5. Switch state reflects preference — false preference → checked=false
// ===========================================================================

describe('switch state reflects preference value', () => {
  it('renders nearbyFlags row as unchecked when preference is false', () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: { ...mockPreferences, nearbyFlags: false },
      setPreference: mockSetPreference,
      loading: false,
    });

    const { getByLabelText } = renderScreen();
    const row = getByLabelText('Nearby flags');
    expect(row.props.accessibilityState).toEqual({ checked: false });
  });

  it('renders bulkWatchAlerts row as unchecked when preference is false', () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: { ...mockPreferences, bulkWatchAlerts: false },
      setPreference: mockSetPreference,
      loading: false,
    });

    const { getByLabelText } = renderScreen();
    const row = getByLabelText('Bulk watch alerts');
    expect(row.props.accessibilityState).toEqual({ checked: false });
  });
});

// ===========================================================================
// 6. Accessibility roles — each toggle row has accessibilityRole="switch"
// ===========================================================================

describe('accessibility roles', () => {
  it('each toggle row has accessibilityRole="switch"', () => {
    const { getAllByRole } = renderScreen();
    // The modal screen renders 4 switch rows.
    const switchRoles = getAllByRole('switch');
    expect(switchRoles.length).toBe(4);
  });
});

// ===========================================================================
// 7. Accessibility state — checked/unchecked matches preference value
// ===========================================================================

describe('accessibility state', () => {
  it('all rows are checked when all prefs are true', () => {
    const { getAllByRole } = renderScreen();
    const switchRows = getAllByRole('switch');
    for (const row of switchRows) {
      expect(row.props.accessibilityState.checked).toBe(true);
    }
  });

  it('flagStatusUpdates row is unchecked when that pref is false', () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: { ...mockPreferences, flagStatusUpdates: false },
      setPreference: mockSetPreference,
      loading: false,
    });

    const { getByLabelText } = renderScreen();
    expect(getByLabelText('Flag status updates').props.accessibilityState).toEqual({
      checked: false,
    });
  });
});

// ===========================================================================
// 8. Loading state — ActivityIndicator shown, no crash, no toggle rows
// ===========================================================================

describe('loading state', () => {
  it('does not crash while hook is loading', () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: { ...mockPreferences },
      setPreference: mockSetPreference,
      loading: true,
    });

    // Should render without throwing.
    expect(() => renderScreen()).not.toThrow();
  });

  it('does not render toggle rows while loading', () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: { ...mockPreferences },
      setPreference: mockSetPreference,
      loading: true,
    });

    const { queryByLabelText } = renderScreen();
    // Toggle rows should be absent during the loading phase.
    expect(queryByLabelText('Flag status updates')).toBeNull();
    expect(queryByLabelText('Nearby flags')).toBeNull();
  });
});

// ===========================================================================
// 9. All 4 toggles are independent — toggling one does not affect others
// ===========================================================================

describe('toggle independence', () => {
  it('only the toggled preference key is passed to setPreference, not sibling keys', () => {
    const { getByLabelText } = renderScreen();

    // Operate only the "Watched flag updates" row, by its accessible label.
    fireEvent(getByLabelText('Watched flag updates'), 'valueChange', false);

    // setPreference is called exactly once, for the right key only.
    expect(mockSetPreference).toHaveBeenCalledTimes(1);
    expect(mockSetPreference).toHaveBeenCalledWith('watchedFlagUpdates', false);
    // Siblings must not have been touched.
    expect(mockSetPreference).not.toHaveBeenCalledWith('flagStatusUpdates', expect.anything());
    expect(mockSetPreference).not.toHaveBeenCalledWith('nearbyFlags', expect.anything());
    expect(mockSetPreference).not.toHaveBeenCalledWith('bulkWatchAlerts', expect.anything());
  });
});
