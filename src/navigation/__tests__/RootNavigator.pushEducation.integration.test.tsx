import React from 'react';
import { AppState, InteractionManager } from 'react-native';
import { act, render } from '@testing-library/react-native';
import RootNavigator from '../RootNavigator';

interface CapturedNavigatorProps {
  children?: React.ReactNode;
  screenListeners?: {
    tabPress?: () => void;
  };
}

interface ControlledInteractionTask {
  cancel: jest.Mock;
  flush: () => void;
}

let mockNavigatorProps: CapturedNavigatorProps | null = null;
let mockPushEducationPending = true;
let mockSharedModalOpen: null | 'feedback' = null;
let mockDrawerOpen = false;
const mockConsumePendingPushEducation = jest.fn(async () => {});
const mockSetSharedModalOpen = jest.fn();
const mockSetDrawerOpen = jest.fn();
const mockNavigationRef = {
  isReady: jest.fn(() => true),
  navigate: jest.fn(),
};
const mockInteractionTasks: ControlledInteractionTask[] = [];
const originalAppStateDescriptor = Object.getOwnPropertyDescriptor(AppState, 'currentState');

jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  return {
    NavigationContainer: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    createNavigationContainerRef: () => mockNavigationRef,
    useIsFocused: () => true,
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const ReactActual = jest.requireActual('react');
  return {
    createBottomTabNavigator: () => ({
      Navigator: (props: CapturedNavigatorProps) => {
        mockNavigatorProps = props;
        return ReactActual.createElement(ReactActual.Fragment, null, props.children);
      },
      Screen: () => null,
    }),
  };
});

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    pushEducationPending: mockPushEducationPending,
    consumePendingPushEducation: mockConsumePendingPushEducation,
  }),
}));

jest.mock('@/lib/flagsStore', () => {
  const ReactActual = jest.requireActual('react');
  return {
    FlagsProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    useFlags: () => ({ flags: [] }),
  };
});

jest.mock('@/lib/sharedModalsContext', () => {
  const ReactActual = jest.requireActual('react');
  return {
    SharedModalsProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    useSharedModals: () => ({
      open: mockSharedModalOpen,
      setOpen: mockSetSharedModalOpen,
    }),
  };
});

jest.mock('@/lib/drawerContext', () => {
  const ReactActual = jest.requireActual('react');
  return {
    DrawerProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    useDrawer: () => ({ open: mockDrawerOpen, setOpen: mockSetDrawerOpen }),
  };
});

jest.mock('@/lib/admin', () => ({ useIsAdmin: () => false }));
jest.mock('@/lib/accessibility', () => ({ useReduceTransparency: () => false }));
jest.mock('@/navigation/perceptionHelpers', () => ({
  computeTasksBadge: () => undefined,
  applySceneInert: jest.fn(),
}));
jest.mock('../linking', () => ({ createLinking: () => ({}) }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});

jest.mock('@/components/HamburgerDrawer', () => () => null);
jest.mock('@/components/FeedbackModal', () => () => null);
jest.mock('@/components/HelpModal', () => () => null);
jest.mock('@/components/ChangelogModal', () => () => null);
jest.mock('@/components/MyFeedbackModal', () => () => null);
jest.mock('@/components/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
});
jest.mock('@/components/ui/AppText', () => ({ AppText: () => null }));
jest.mock('@/screens/HomeScreen', () => () => null);
jest.mock('@/screens/MapScreen', () => () => null);
jest.mock('@/screens/TasksScreen', () => () => null);
jest.mock('@/screens/ProfileScreen', () => () => null);
jest.mock('@/screens/SettingsScreen', () => () => null);
jest.mock('@/screens/AdminScreen', () => () => null);
jest.mock('@/screens/TermsScreen', () => () => null);
jest.mock('@/screens/PrivacyScreen', () => () => null);
jest.mock('../TabBarButton', () => ({ TabBarButton: () => null }));
jest.mock('../TabBarGlass', () => ({
  TabBarGlass: () => null,
  liquidTabInk: () => ({ active: '#000', inactive: '#666' }),
}));
jest.mock('../ScreenFallback', () => ({ ScreenFallback: () => null }));

function tabPressListener(): () => void {
  const listener = mockNavigatorProps?.screenListeners?.tabPress;
  if (!listener) throw new Error('RootNavigator did not register a tabPress listener');
  return listener;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigatorProps = null;
  mockPushEducationPending = true;
  mockSharedModalOpen = null;
  mockDrawerOpen = false;
  mockInteractionTasks.length = 0;
  // React Native's Jest stub exposes currentState as a jest.fn even though the
  // runtime API is a string property. Shape it like the runtime for this real
  // navigator integration test, then restore the original descriptor below.
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'active',
  });
  jest
    .spyOn(InteractionManager, 'runAfterInteractions')
    .mockImplementation(((callback: () => void) => {
      let cancelled = false;
      const cancel = jest.fn(() => {
        cancelled = true;
      });
      mockInteractionTasks.push({
        cancel,
        flush: () => {
          if (!cancelled) callback();
        },
      });
      return { cancel };
    }) as typeof InteractionManager.runAfterInteractions);
});

afterEach(() => {
  jest.restoreAllMocks();
  if (originalAppStateDescriptor) {
    Object.defineProperty(AppState, 'currentState', originalAppStateDescriptor);
  }
});

describe('RootNavigator — real post-sign-in education listener wiring', () => {
  it('registers tabPress work and consumes only after interactions settle', () => {
    render(<RootNavigator />);

    act(() => tabPressListener()());

    expect(InteractionManager.runAfterInteractions).toHaveBeenCalledTimes(1);
    expect(mockConsumePendingPushEducation).not.toHaveBeenCalled();

    act(() => mockInteractionTasks[0]?.flush());

    expect(mockConsumePendingPushEducation).toHaveBeenCalledTimes(1);
  });

  it('rechecks the live auth cycle before a queued callback consumes', () => {
    const screen = render(<RootNavigator />);
    act(() => tabPressListener()());
    expect(mockInteractionTasks).toHaveLength(1);

    mockPushEducationPending = false;
    screen.rerender(<RootNavigator />);
    act(() => mockInteractionTasks[0]?.flush());

    expect(mockConsumePendingPushEducation).not.toHaveBeenCalled();
  });

  it('rechecks competing focus owners before a queued callback consumes', () => {
    const screen = render(<RootNavigator />);
    act(() => tabPressListener()());

    mockSharedModalOpen = 'feedback';
    mockDrawerOpen = true;
    screen.rerender(<RootNavigator />);
    act(() => mockInteractionTasks[0]?.flush());

    expect(mockConsumePendingPushEducation).not.toHaveBeenCalled();
  });

  it('cancels every queued interaction on unmount and prevents stale callbacks', () => {
    const screen = render(<RootNavigator />);
    act(() => {
      tabPressListener()();
      tabPressListener()();
    });
    expect(mockInteractionTasks).toHaveLength(2);

    screen.unmount();

    for (const task of mockInteractionTasks) {
      expect(task.cancel).toHaveBeenCalledTimes(1);
      act(() => task.flush());
    }
    expect(mockConsumePendingPushEducation).not.toHaveBeenCalled();
  });
});
