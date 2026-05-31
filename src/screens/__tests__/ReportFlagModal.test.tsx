/**
 * Tests for the anon/auth routing in ReportFlagModal.tsx.
 *
 * What we lock in:
 *  - ANON form (user === null): "Report anonymously" title, identity-not-stored
 *    banner, "Sign in to attach a photo" note, and submit calls the
 *    checkAnonRateLimit → createAnonFlag → recordAnonSubmit chain.
 *  - AUTH form (user !== null): "Report a flag" title, no anon banner, no
 *    photo-disabled note, and submit calls createFlag (not createAnonFlag).
 *  - Submit button label and accessibilityLabel reflect the active path.
 *
 * Strategy: mock every external dep at the module level so we can render
 * without a native bridge, Supabase, or image picker. Functional correctness
 * of createFlag / createAnonFlag / rate-limit live in src/lib/__tests__/.
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Supabase env stubs — required before any module that imports supabase.ts
// ---------------------------------------------------------------------------
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

// ---------------------------------------------------------------------------
// Mock: expo-image-picker
// ---------------------------------------------------------------------------
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/auth — configurable per-test via mockUseAuth.mockReturnValue(...)
// ---------------------------------------------------------------------------
jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));
import { useAuth } from '@/lib/auth';
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// ---------------------------------------------------------------------------
// Mock: @/lib/analytics
// ---------------------------------------------------------------------------
jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));

// ---------------------------------------------------------------------------
// Mock: @/lib/errors
// ---------------------------------------------------------------------------
jest.mock('@/lib/errors', () => ({
  errorMessage: jest.fn((e: unknown) => (e instanceof Error ? e.message : String(e))),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/anonRateLimit — spy on check/record so we can assert call order
// ---------------------------------------------------------------------------
const mockCheckAnonRateLimit = jest.fn().mockResolvedValue(undefined);
const mockRecordAnonSubmit = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/anonRateLimit', () => ({
  checkAnonRateLimit: (...args: unknown[]) => mockCheckAnonRateLimit(...args),
  recordAnonSubmit: (...args: unknown[]) => mockRecordAnonSubmit(...args),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/flags — spy on createFlag + createAnonFlag
// ---------------------------------------------------------------------------
const SAMPLE_ANON_ROW = {
  id: 'anon-flag-1',
  user_id: null,
  lat: 49.28,
  lng: -123.12,
  category: 'no_ramp',
  severity: 3,
  description: null,
  photo_url: null,
  status: 'open',
  created_at: '2026-05-30T00:00:00Z',
};

const SAMPLE_AUTH_ROW = {
  id: 'auth-flag-1',
  user_id: 'user-abc',
  lat: 49.28,
  lng: -123.12,
  category: 'no_ramp',
  severity: 3,
  description: null,
  photo_url: null,
  status: 'open',
  created_at: '2026-05-30T00:00:00Z',
};

const mockCreateAnonFlag = jest.fn().mockResolvedValue(SAMPLE_ANON_ROW);
const mockCreateFlag = jest.fn().mockResolvedValue({ row: SAMPLE_AUTH_ROW, tagsAccepted: true });
const mockSubscribeContextTagsCapability = jest.fn(() => () => {});

jest.mock('@/lib/flags', () => ({
  createAnonFlag: (...args: unknown[]) => mockCreateAnonFlag(...args),
  createFlag: (...args: unknown[]) => mockCreateFlag(...args),
  uploadFlagPhoto: jest.fn().mockResolvedValue('http://example.com/photo.jpg'),
  subscribeContextTagsCapability: (...args: unknown[]) => mockSubscribeContextTagsCapability(...args),
  getContextTagsCapability: jest.fn().mockReturnValue('unknown'),
  CATEGORY_LABELS: {
    no_ramp: 'No ramp',
    broken_sidewalk: 'Broken sidewalk',
    blocked_path: 'Blocked path',
    missing_signal: 'Missing signal',
    steep_grade: 'Steep grade',
    other: 'Other',
  },
  CATEGORY_ORDER: [
    'no_ramp', 'broken_sidewalk', 'blocked_path',
    'missing_signal', 'steep_grade', 'other',
  ],
  SEVERITY_LABELS: { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' },
  SEVERITY_ORDER: [1, 2, 3, 4, 5],
  SEVERITY_DESCRIPTIONS: { 1: '', 2: '', 3: '', 4: '', 5: '' },
  severityColor: jest.fn(() => '#888'),
  CATEGORY_DESCRIPTIONS: {
    no_ramp: '', broken_sidewalk: '', blocked_path: '',
    missing_signal: '', steep_grade: '', other: '',
  },
  CATEGORY_ICONS: {
    no_ramp: '↥', broken_sidewalk: '▦', blocked_path: '⛔',
    missing_signal: '🚦', steep_grade: '⛰', other: '•',
  },
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/photos
// ---------------------------------------------------------------------------
jest.mock('@/lib/photos', () => ({ batchInsertFlagPhotos: jest.fn().mockResolvedValue(undefined) }));

// ---------------------------------------------------------------------------
// Mock: @/components/PhotoGallery — stub so we don't need native image modules
// ---------------------------------------------------------------------------
jest.mock('@/components/PhotoGallery', () => ({ __esModule: true, default: () => null }));

// ---------------------------------------------------------------------------
// Mock: @/lib/contextTags
// ---------------------------------------------------------------------------
jest.mock('@/lib/contextTags', () => ({
  CONTEXT_TAGS: [],
  CONTEXT_TAG_LABELS: {},
  DISABILITY_TAGS: [],
  DISABILITY_TAG_LABELS: {},
  SEASONAL_TAGS: [],
  SEASONAL_TAG_LABELS: {},
  MAX_CONTEXT_TAGS: 5,
  toggleTag: jest.fn((curr: unknown[]) => curr),
  isSeasonalTag: jest.fn(() => false),
  isDisabilityTag: jest.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/reportTemplates
// ---------------------------------------------------------------------------
jest.mock('@/lib/reportTemplates', () => ({ validReportTemplates: jest.fn(() => []) }));

// ---------------------------------------------------------------------------
// Mock: @/theme/ThemeContext — minimal color stub
// ---------------------------------------------------------------------------
jest.mock('@/theme/ThemeContext', () => ({
  useColor: jest.fn(() => ({
    scrim: 'rgba(0,0,0,0.4)',
    surface: '#ffffff',
    surfaceMuted: '#f7f9fc',
    surfaceNeutral: '#eef1f5',
    surfaceSoft: '#f0f4f8',
    textStrong: '#111827',
    text: '#374151',
    textMuted: '#6b7280',
    textMutedAlt: '#9ca3af',
    textSubtle: '#d1d5db',
    textOnBrand: '#ffffff',
    brand: '#2563eb',
    brandSofter: '#dbeafe',
    brandText: '#1d4ed8',
    borderSubtle: '#e5e7eb',
    borderStrong: '#9ca3af',
    warningBg: '#fefce8',
    warningFg: '#a16207',
    warningHint: '#d97706',
    error: '#dc2626',
    accentOrange: '#f59e0b',
    shadow: '#000000',
  })),
}));

// ---------------------------------------------------------------------------
// Mock: @/theme — radius tokens
// ---------------------------------------------------------------------------
jest.mock('@/theme', () => ({
  radius: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, xxl: 24, circle: 9999 },
  font: {
    size: { xs: 11, sm: 13, md: 15, lg: 17, xl: 19, xxl: 22 },
    weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
  },
  spacing: {
    tight: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
  },
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/accessibility
// ---------------------------------------------------------------------------
jest.mock('@/lib/accessibility', () => ({
  useReducedMotion: jest.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Import component (after all mocks are registered)
// ---------------------------------------------------------------------------
import ReportFlagModal from '../ReportFlagModal';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const LOCATION = { lat: 49.28, lng: -123.12 };

type User = { id: string };

function renderAnon(props: Partial<{ visible: boolean; location: typeof LOCATION | null }> = {}) {
  mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
  return render(
    <ReportFlagModal
      visible={props.visible ?? true}
      location={props.location ?? LOCATION}
      onClose={jest.fn()}
      onCreated={jest.fn()}
    />,
  );
}

function renderAuth(user: User = { id: 'user-abc' }, props: Partial<{ visible: boolean }> = {}) {
  mockUseAuth.mockReturnValue({ user } as ReturnType<typeof useAuth>);
  return render(
    <ReportFlagModal
      visible={props.visible ?? true}
      location={LOCATION}
      onClose={jest.fn()}
      onCreated={jest.fn()}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckAnonRateLimit.mockResolvedValue(undefined);
  mockCreateAnonFlag.mockResolvedValue(SAMPLE_ANON_ROW);
  mockCreateFlag.mockResolvedValue({ row: SAMPLE_AUTH_ROW, tagsAccepted: true });
  mockSubscribeContextTagsCapability.mockReturnValue(() => {});
});

// ===========================================================================
// 1. Anon form — visual structure
// ===========================================================================

describe('anon form (user === null)', () => {
  it('renders "Report anonymously" as the modal title (accessibilityRole="header")', () => {
    const { getAllByRole } = renderAnon();
    const headers = getAllByRole('header');
    const titleHeader = headers.find((el) => el.props.children === 'Report anonymously');
    expect(titleHeader).toBeTruthy();
  });

  it('shows the identity-not-stored banner', () => {
    const { getByText } = renderAnon();
    expect(getByText('Reporting anonymously — your identity is not stored.')).toBeTruthy();
  });

  it('shows the "Sign in to attach a photo" note instead of the photo section', () => {
    // The note is a nested-Text structure: outer Text contains an inner "Sign in"
    // Text and the suffix " to attach a photo." The full concatenated text is
    // matched via regex on the outer element.
    const { getByText } = renderAnon();
    expect(getByText(/to attach a photo/i)).toBeTruthy();
  });

  it('does NOT show "Report a flag" title header', () => {
    const { getAllByRole } = renderAnon();
    const headers = getAllByRole('header');
    const flagTitle = headers.find((el) => el.props.children === 'Report a flag');
    expect(flagTitle).toBeUndefined();
  });

  it('submit button accessibilityLabel is "Submit anonymous flag report"', () => {
    const { getByLabelText } = renderAnon();
    expect(getByLabelText('Submit anonymous flag report')).toBeTruthy();
  });

  it('submit button text is "Report anonymously"', () => {
    const { getAllByText } = renderAnon();
    // Title AND button both say "Report anonymously" — we just confirm the
    // string appears at least once (the button) without crashing.
    expect(getAllByText('Report anonymously').length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// 2. Auth form — visual structure
// ===========================================================================

describe('auth form (user !== null)', () => {
  it('renders "Report a flag" as the modal title header', () => {
    const { getAllByRole } = renderAuth();
    const headers = getAllByRole('header');
    const titleHeader = headers.find((el) => el.props.children === 'Report a flag');
    expect(titleHeader).toBeTruthy();
  });

  it('does NOT show the identity-not-stored banner', () => {
    const { queryByText } = renderAuth();
    expect(queryByText('Reporting anonymously — your identity is not stored.')).toBeNull();
  });

  it('does NOT show the "Sign in to attach a photo" note', () => {
    const { queryByText } = renderAuth();
    expect(queryByText(/to attach a photo/i)).toBeNull();
  });

  it('submit button accessibilityLabel is the non-anon form', () => {
    const { getByLabelText } = renderAuth();
    expect(getByLabelText('Submit flag report')).toBeTruthy();
  });

  it('submit button text is "Report" (not "Report anonymously")', () => {
    const { getByLabelText, queryByText } = renderAuth();
    expect(getByLabelText('Submit flag report')).toBeTruthy();
    expect(queryByText('Report anonymously')).toBeNull();
  });
});

// ===========================================================================
// 3. Submit routing — anon path calls checkAnonRateLimit + createAnonFlag
// ===========================================================================

describe('submit routing — anon path', () => {
  it('calls checkAnonRateLimit before createAnonFlag on anon submit', async () => {
    const { getByLabelText } = renderAnon();
    fireEvent.press(getByLabelText('Submit anonymous flag report'));

    await waitFor(() => {
      expect(mockCheckAnonRateLimit).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateAnonFlag).toHaveBeenCalledTimes(1);
    // Verify order: check fires before insert.
    const checkOrder = mockCheckAnonRateLimit.mock.invocationCallOrder[0];
    const createOrder = mockCreateAnonFlag.mock.invocationCallOrder[0];
    expect(checkOrder).toBeLessThan(createOrder);
  });

  it('calls recordAnonSubmit after a successful createAnonFlag', async () => {
    const { getByLabelText } = renderAnon();
    fireEvent.press(getByLabelText('Submit anonymous flag report'));

    await waitFor(() => {
      expect(mockRecordAnonSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('does NOT call createFlag on an anon submit', async () => {
    const { getByLabelText } = renderAnon();
    fireEvent.press(getByLabelText('Submit anonymous flag report'));

    await waitFor(() => {
      expect(mockCreateAnonFlag).toHaveBeenCalled();
    });
    expect(mockCreateFlag).not.toHaveBeenCalled();
  });

  it('sends the correct lat/lng/category/severity to createAnonFlag', async () => {
    const { getByLabelText } = renderAnon();
    fireEvent.press(getByLabelText('Submit anonymous flag report'));

    await waitFor(() => {
      expect(mockCreateAnonFlag).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: LOCATION.lat,
          lng: LOCATION.lng,
          category: 'no_ramp',
          severity: 3,
        }),
      );
    });
  });

  it('shows "Daily limit reached" alert when rate limit throws', async () => {
    mockCheckAnonRateLimit.mockRejectedValueOnce(
      new Error('You have submitted 5 anonymous reports in the last 24 hours. Sign in to continue.'),
    );
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByLabelText } = renderAnon();
    fireEvent.press(getByLabelText('Submit anonymous flag report'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Daily limit reached',
        expect.any(String),
        expect.any(Array),
      );
    });
    // createAnonFlag must NOT be called when the rate limit blocks.
    expect(mockCreateAnonFlag).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

// ===========================================================================
// 4. Submit routing — auth path calls createFlag, not createAnonFlag
// ===========================================================================

describe('submit routing — auth path', () => {
  it('calls createFlag (not createAnonFlag) on authenticated submit', async () => {
    const { getByLabelText } = renderAuth();
    fireEvent.press(getByLabelText('Submit flag report'));

    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateAnonFlag).not.toHaveBeenCalled();
  });

  it('passes the user id to createFlag', async () => {
    const { getByLabelText } = renderAuth({ id: 'user-xyz' });
    fireEvent.press(getByLabelText('Submit flag report'));

    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalledWith('user-xyz', expect.any(Object));
    });
  });

  it('does NOT call checkAnonRateLimit on authenticated submit', async () => {
    const { getByLabelText } = renderAuth();
    fireEvent.press(getByLabelText('Submit flag report'));

    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalled();
    });
    expect(mockCheckAnonRateLimit).not.toHaveBeenCalled();
  });
});
