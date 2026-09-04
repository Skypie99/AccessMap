import React from 'react';
import { InteractionManager, Platform } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import type { FlagRow } from '@/types/database';
import TasksScreen from '../TasksScreen';

type AuthUser = { id: string } | null;
type DetailProps = {
  visible: boolean;
  flag: FlagRow | null;
  onDismiss: () => void;
  onSignInToReview: () => void;
};

type QueuedInteraction = {
  callback: () => void;
  cancel: jest.Mock;
  flush: () => void;
};

let mockAuthUser: AuthUser = null;
let mockDetailProps: DetailProps | null = null;
const mockNavigate = jest.fn();
const mockInteractionTasks: QueuedInteraction[] = [];

const mockFlag: FlagRow = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: 'someone-else',
  category: 'blocked_path',
  severity: 4,
  status: 'open',
  description: 'Construction barriers fully block the sidewalk.',
  lat: 49.888,
  lng: -119.496,
  photo_url: null,
  photo_alt: null,
  created_at: '2026-08-25T12:00:00.000Z',
} as FlagRow;

// Jest's current CommonJS runner cannot execute the screen's dynamic import.
// Keep React itself real, but make this screen's single lazy leaf synchronous
// so the production host and every callback it passes remain under test.
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  const MockLazyLeaf = (props: DetailProps) => {
    mockDetailProps = props;
    return props.visible
      ? actual.createElement(RNView, { testID: 'task-detail-modal' })
      : null;
  };
  return { ...actual, lazy: () => MockLazyLeaf };
});

jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactActual.useEffect(effect, [effect]);
    },
  };
});

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => 0,
}));

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

jest.mock('@/lib/flagsStore', () => ({
  useFlags: () => ({
    flags: [mockFlag],
    flagsMap: new Map([[mockFlag.id, mockFlag]]),
    loading: false,
    error: null,
    refresh: jest.fn().mockResolvedValue(undefined),
    loadMore: jest.fn().mockResolvedValue(undefined),
    loadingMore: false,
    hasMore: false,
    patchFlag: jest.fn(),
    removeFlag: jest.fn(),
    isOfflineCache: false,
    offlineCachedAt: null,
  }),
}));

jest.mock('@/lib/location', () => ({
  useUserLocation: () => ({ location: null }),
}));

jest.mock('@/lib/tasksSort', () => {
  const actual = jest.requireActual('@/lib/tasksSort');
  return {
    ...actual,
    loadTasksSort: jest.fn().mockResolvedValue(actual.DEFAULT_TASKS_SORT),
    saveTasksSort: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('@/lib/tasksScope', () => ({
  loadScope: jest.fn().mockResolvedValue(false),
  saveScope: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/confirm', () => ({
  confirm: jest.fn().mockResolvedValue(false),
  notify: jest.fn(),
}));

jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));
jest.mock('@/lib/haptics', () => ({
  hapticImpact: jest.fn(),
  hapticNotify: jest.fn(),
  hapticSelection: jest.fn(),
}));
jest.mock('@/lib/watchedFlags', () => ({ addWatchedBulk: jest.fn() }));

jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});

jest.mock('@/lib/accessibility', () => {
  const actual = jest.requireActual('@/lib/accessibility');
  return {
    a11yToggle: actual.a11yToggle,
    decorativeProps: actual.decorativeProps,
    isAxRecompose: actual.isAxRecompose,
    useReducedMotion: () => true,
    useReduceTransparency: () => false,
  };
});

jest.mock('@/lib/drawerContext', () => ({
  useDrawer: () => ({ open: jest.fn() }),
  useDrawerTrigger: () => ({ ref: { current: null }, register: jest.fn() }),
}));

jest.mock('@/lib/sharedModalsContext', () => ({
  useSharedModals: () => ({ setOpen: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

jest.mock('@/components/ui/AppText', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    AppText: ({ children, ...props }: Record<string, unknown>) =>
      ReactActual.createElement(RNText, props, children),
  };
});

jest.mock('@/components/ui/FlagCard', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText, View: RNView } = jest.requireActual('react-native');
  return {
    FlagCard: ({ actions }: { actions?: unknown }) =>
      ReactActual.createElement(RNView, null, actions),
    MonoDistance: ({ children }: { children?: unknown }) =>
      ReactActual.createElement(RNText, null, children),
  };
});

jest.mock('@/components/ui/PressableScale', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable: RNPressable } = jest.requireActual('react-native');
  return {
    PressableScale: ReactActual.forwardRef(
      (
        {
          children,
          haptic: _haptic,
          pressedTint: _pressedTint,
          dimOnPress: _dimOnPress,
          ...props
        }: Record<string, unknown>,
        ref: React.Ref<unknown>,
      ) => ReactActual.createElement(RNPressable, { ...props, ref }, children),
    ),
  };
});

jest.mock('@/components/ui/GlassSurface', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    GlassSurface: ({ children }: { children?: unknown }) =>
      ReactActual.createElement(RNView, null, children),
  };
});

jest.mock('@/components/ui/Sheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    Sheet: ({ visible, children }: { visible: boolean; children?: unknown }) =>
      visible ? ReactActual.createElement(RNView, null, children) : null,
  };
});

jest.mock('@/components/ui/ScreenHeader', () => ({
  ScreenHeader: () => null,
}));
jest.mock('@/components/ui/ScreenStage', () => ({ ScreenStage: () => null }));
jest.mock('@/components/ui/Skeleton', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return { Skeleton: () => ReactActual.createElement(RNView) };
});
jest.mock('@/components/ui/EmptyState', () => ({ EmptyState: () => null }));
jest.mock('@/components/PhotoLightboxModal', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    LinearGradient: ({ children }: { children?: unknown }) =>
      ReactActual.createElement(RNView, null, children),
  };
});

function installInteractionQueue() {
  jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation((callback) => {
    const cancel = jest.fn();
    const task: QueuedInteraction = {
      callback: callback as () => void,
      cancel,
      flush: () => {
        if (!cancel.mock.calls.length) task.callback();
      },
    };
    mockInteractionTasks.push(task);
    return { cancel, then: jest.fn(), done: jest.fn() } as never;
  });
}

async function openGuestDetail(utils: ReturnType<typeof render>) {
  await waitFor(() => expect(utils.getByText('Details')).toBeTruthy());
  fireEvent.press(utils.getByText('Details'));
  await waitFor(() => {
    expect(utils.getByTestId('task-detail-modal')).toBeTruthy();
    expect(mockDetailProps?.flag?.id).toBe(mockFlag.id);
  });
}

describe('TasksScreen guest detail handoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthUser = null;
    mockDetailProps = null;
    mockInteractionTasks.splice(0);
    installInteractionQueue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('closes guest detail and waits for the iOS dismissal before navigating once', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const utils = render(<TasksScreen />);
    await openGuestDetail(utils);

    act(() => {
      mockDetailProps?.onSignInToReview();
      mockDetailProps?.onSignInToReview();
    });

    expect(utils.queryByTestId('task-detail-modal')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockInteractionTasks).toHaveLength(0);

    act(() => {
      mockDetailProps?.onDismiss();
      mockDetailProps?.onDismiss();
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('replaces the non-iOS fallback and flushes only the surviving task', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const utils = render(<TasksScreen />);
    await openGuestDetail(utils);

    act(() => {
      mockDetailProps?.onSignInToReview();
      mockDetailProps?.onSignInToReview();
    });

    expect(mockInteractionTasks).toHaveLength(2);
    expect(mockInteractionTasks[0]?.cancel).toHaveBeenCalledTimes(1);
    expect(mockInteractionTasks[1]?.cancel).not.toHaveBeenCalled();

    act(() => {
      mockInteractionTasks.forEach((task) => task.flush());
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('cancels a queued non-iOS fallback when the screen unmounts', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const utils = render(<TasksScreen />);
    await openGuestDetail(utils);

    act(() => {
      mockDetailProps?.onSignInToReview();
    });
    expect(mockInteractionTasks).toHaveLength(1);

    utils.unmount();
    expect(mockInteractionTasks[0]?.cancel).toHaveBeenCalledTimes(1);

    act(() => {
      mockInteractionTasks[0]?.flush();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clears the tool sheet and bulk-selection state when authentication is lost', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockAuthUser = { id: 'user-a' };
    const utils = render(<TasksScreen />);

    await waitFor(() => expect(utils.getByLabelText('More task tools')).toBeTruthy());
    fireEvent.press(utils.getByLabelText('More task tools'));
    await waitFor(() => expect(utils.getByText('Select multiple')).toBeTruthy());
    fireEvent.press(utils.getByText('Select multiple'));
    await waitFor(() => expect(utils.getByText('0 selected')).toBeTruthy());

    mockAuthUser = null;
    utils.rerender(<TasksScreen />);

    await waitFor(() => {
      expect(utils.queryByText('0 selected')).toBeNull();
      expect(utils.queryByText('Select multiple')).toBeNull();
      expect(utils.queryByLabelText('More task tools')).toBeNull();
    });
  });
});
