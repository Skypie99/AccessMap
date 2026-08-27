import React from 'react';
import { InteractionManager, Platform } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

import type { FlagRow } from '@/types/database';
import MapScreen from '../MapScreen';

type DetailProps = {
  visible: boolean;
  flag: FlagRow | null;
  onClose: () => void;
  onDismiss: () => void;
  onViewOnMap: (flag: FlagRow) => void;
  onSignInToReview: () => void;
};

type MapProps = {
  onOpenDetails: (flag: FlagRow) => void;
};

type QueuedInteraction = {
  callback: () => void;
  cancel: jest.Mock;
  flush: () => void;
};

let mockDetailProps: DetailProps | null = null;
let mockMapProps: MapProps | null = null;
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockInteractionTasks: QueuedInteraction[] = [];
const mockMapHandle = {
  animateTo: jest.fn(),
  snapToRegion: jest.fn(),
  showCallout: jest.fn(),
  hideCallout: jest.fn(),
  zoomBy: jest.fn(),
  getCenter: jest.fn().mockResolvedValue(null),
};

const mockFlag: FlagRow = {
  id: '22222222-2222-4222-8222-222222222222',
  user_id: 'someone-else',
  category: 'broken_sidewalk',
  severity: 3,
  status: 'open',
  description: 'Broken pavement blocks the accessible route.',
  lat: 49.888,
  lng: -119.496,
  photo_url: null,
  photo_alt: null,
  created_at: '2026-08-25T12:00:00.000Z',
} as FlagRow;

// The Jest CommonJS runtime cannot execute MapScreen's dynamic imports. Both
// lazy leaves stay visual doubles; the detail leaf is identified by its real
// callback contract and captures the props supplied by the production host.
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  const MockLazyLeaf = (props: Record<string, unknown>) => {
    if ('onSignInToReview' in props) {
      mockDetailProps = props as DetailProps;
      return props.visible
        ? actual.createElement(RNView, { testID: 'map-detail-modal' })
        : null;
    }
    return null;
  };
  return { ...actual, lazy: () => MockLazyLeaf };
});

jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate, setParams: mockSetParams }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactActual.useEffect(effect, [effect]);
    },
  };
});

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => 0,
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  return {
    SafeAreaInsetsContext: ReactActual.createContext({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'undetermined',
    canAskAgain: true,
  }),
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'denied',
    canAskAgain: true,
  }),
  getLastKnownPositionAsync: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/location', () => {
  const actual = jest.requireActual('@/lib/location');
  return {
    ...actual,
    getCurrentPositionWithTimeout: jest.fn(),
  };
});

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock('@/lib/flagsStore', () => ({
  useFlags: () => ({
    flags: [mockFlag],
    loading: false,
    error: null,
    refresh: jest.fn().mockResolvedValue(undefined),
    refreshIfStale: jest.fn().mockResolvedValue(undefined),
    setStatuses: jest.fn(),
    setViewportGate: jest.fn(),
    isOfflineCache: false,
    offlineCachedAt: null,
    patchFlag: jest.fn(),
    removeFlag: jest.fn(),
  }),
}));

jest.mock('@/lib/flags', () => {
  const actual = jest.requireActual('@/lib/flags');
  return {
    ...actual,
    fetchFlagById: jest.fn().mockResolvedValue(null),
  };
});

jest.mock('@/lib/mapFilters', () => {
  const actual = jest.requireActual('@/lib/mapFilters');
  return {
    ...actual,
    loadMapFilters: jest.fn().mockResolvedValue(null),
    saveMapFilters: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('@/lib/filterPanelPrefs', () => ({
  loadFilterPanelCollapsed: jest.fn().mockResolvedValue(false),
  saveFilterPanelCollapsed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/heatmapPrefs', () => ({
  loadHeatmapEnabled: jest.fn().mockResolvedValue(false),
  saveHeatmapEnabled: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/filterSets', () => {
  const actual = jest.requireActual('@/lib/filterSets');
  return {
    ...actual,
    deleteSet: jest.fn().mockResolvedValue(undefined),
    getDefaultSetId: jest.fn().mockResolvedValue(null),
    listSets: jest.fn().mockResolvedValue([]),
    saveSet: jest.fn(),
    setDefaultSetId: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('@/lib/filterPresets', () => {
  const actual = jest.requireActual('@/lib/filterPresets');
  return {
    ...actual,
    loadPresets: jest.fn().mockResolvedValue([]),
    savePresets: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('@/lib/savedPlaces', () => ({
  loadPlaces: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/components/HeatmapLayer', () => ({
  useHeatCells: () => [],
}));

jest.mock('@/lib/announce', () => ({ announce: jest.fn() }));
jest.mock('@/lib/liveStatus', () => ({
  clearLiveStatusMessage: jest.fn(),
  setLiveStatus: jest.fn(),
}));
jest.mock('@/lib/confirm', () => ({
  confirm: jest.fn().mockResolvedValue(false),
  notify: jest.fn(),
}));

jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});

jest.mock('@/lib/accessibility', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual('@/lib/accessibility');
  const useSurfaceTrigger = () =>
    ReactActual.useMemo(
      () => ({
        ref: { current: null },
        register: jest.fn(),
        release: jest.fn(),
        restore: jest.fn(),
        markHandoff: jest.fn(),
      }),
      [],
    );
  return {
    a11yToggle: actual.a11yToggle,
    decorativeProps: actual.decorativeProps,
    isAxRecompose: actual.isAxRecompose,
    useScreenReader: () => false,
    useReducedMotion: () => true,
    useSurfaceTrigger,
  };
});

jest.mock('@/lib/drawerContext', () => ({
  useDrawer: () => ({ setOpen: jest.fn() }),
  useDrawerTrigger: () => ({ ref: { current: null }, register: jest.fn() }),
}));

jest.mock('@/lib/sharedModalsContext', () => ({
  useSharedModals: () => ({ setOpen: jest.fn() }),
}));

jest.mock('@/hooks/useOverflowFade', () => ({
  useHorizontalOverflowFade: () => ({
    hasMore: false,
    scrollHandlers: {},
  }),
}));

jest.mock('@/components/PlatformMap', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  const MockPlatformMap = ReactActual.forwardRef(
    (props: MapProps, ref: React.Ref<unknown>) => {
      mockMapProps = props;
      ReactActual.useImperativeHandle(ref, () => mockMapHandle, []);
      return ReactActual.createElement(RNView, { testID: 'platform-map' });
    },
  );
  return { __esModule: true, default: MockPlatformMap };
});

jest.mock('@/components/ui/AppText', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    AppText: ({ children, variant: _variant, size: _size, ...props }: Record<string, unknown>) =>
      ReactActual.createElement(RNText, props, children),
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

jest.mock('@/components/ui/OverflowFade', () => ({ OverflowFade: () => null }));
jest.mock('@/components/SeverityDisc', () => ({ SeverityDisc: () => null }));
jest.mock('../LegendModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../NearbyFlagsModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/AddressSearchModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/SavedPlacesModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/FilterPresetsModal', () => ({ __esModule: true, default: () => null }));

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

async function renderAndOpenDetail() {
  const utils = render(<MapScreen />);
  await waitFor(() => expect(mockMapProps).not.toBeNull());

  act(() => {
    mockMapProps?.onOpenDetails(mockFlag);
  });
  await waitFor(() => {
    expect(utils.getByTestId('map-detail-modal')).toBeTruthy();
    expect(mockDetailProps?.flag?.id).toBe(mockFlag.id);
  });
  return utils;
}

describe('MapScreen guest detail handoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDetailProps = null;
    mockMapProps = null;
    mockInteractionTasks.splice(0);
    mockMapHandle.getCenter.mockResolvedValue(null);
    installInteractionQueue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lets the iOS Profile intent supersede a queued camera restoration and spends it once', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const utils = await renderAndOpenDetail();

    act(() => {
      mockDetailProps?.onViewOnMap(mockFlag);
      mockDetailProps?.onSignInToReview();
      mockDetailProps?.onSignInToReview();
    });

    expect(utils.queryByTestId('map-detail-modal')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockInteractionTasks).toHaveLength(0);

    act(() => {
      mockDetailProps?.onDismiss();
      mockDetailProps?.onDismiss();
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
    expect(mockMapHandle.animateTo).not.toHaveBeenCalled();
    expect(mockMapHandle.showCallout).not.toHaveBeenCalled();
  });

  it('replaces repeated non-iOS requests and flushes one Profile navigation', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await renderAndOpenDetail();

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

  it('cancels a queued non-iOS fallback on unmount', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const utils = await renderAndOpenDetail();

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
});
