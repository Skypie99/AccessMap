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
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
// Mocked below — jest.mock calls are hoisted above all imports, so this
// resolves to the mock module. Imported here (not mid-file) to keep
// import/first happy.
import * as ImagePicker from 'expo-image-picker';

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
const mockRequestMediaLibPerm =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLaunchImageLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;

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
// FIX B (storage orphan cleanup): uploadFlagPhoto returns { url, path };
// removeUploadedFlagPhotos is the best-effort cleanup the submit catch fires.
// Both hoisted so tests can stage per-call results and assert calls.
const mockUploadFlagPhoto = jest.fn();
const mockRemoveUploadedFlagPhotos = jest.fn();

jest.mock('@/lib/flags', () => ({
  createAnonFlag: (...args: unknown[]) => mockCreateAnonFlag(...args),
  createFlag: (...args: unknown[]) => mockCreateFlag(...args),
  uploadFlagPhoto: (...args: unknown[]) => mockUploadFlagPhoto(...args),
  removeUploadedFlagPhotos: (...args: unknown[]) => mockRemoveUploadedFlagPhotos(...args),
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
// Mock: @/lib/photos — hoisted so the F57 (junction insert) path can be staged
// ---------------------------------------------------------------------------
const mockBatchInsertFlagPhotos = jest.fn();
jest.mock('@/lib/photos', () => ({
  batchInsertFlagPhotos: (...args: unknown[]) => mockBatchInsertFlagPhotos(...args),
}));

// ---------------------------------------------------------------------------
// Mock: @/components/PhotoGallery — stub so we don't need native image modules.
// Renders just the add-photo trigger so tests can drive the photo-pick flow
// (see the addPhoto helper below) without the native gallery internals.
// ---------------------------------------------------------------------------
jest.mock('@/components/PhotoGallery', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onAddPhoto }: { onAddPhoto?: () => void }) =>
      ReactActual.createElement(Pressable, {
        testID: 'photo-gallery-add',
        onPress: onAddPhoto,
      }),
  };
});

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
// Use the real design tokens instead of a hand-maintained partial mock — it had
// drifted (stale radius/size values) and lacked newer keys like font.tracking,
// which crashed AppText's tracking logic. theme.ts is pure data (no runtime
// imports), so requireActual is safe and the mock can never drift again.
jest.mock('@/theme', () => jest.requireActual('@/theme'));

// ---------------------------------------------------------------------------
// Mock: @/lib/accessibility
// ---------------------------------------------------------------------------
jest.mock('@/lib/accessibility', () => ({
  useReducedMotion: jest.fn(() => false),
}));

// Haptics are no-ops in tests — avoids loading expo-haptics during the async
// submit tests (the require perturbed their timing under parallel workers).
jest.mock('@/lib/haptics', () => ({
  hapticSelection: jest.fn(),
  hapticImpact: jest.fn(),
  hapticNotify: jest.fn(),
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

/**
 * Drive the photo-pick flow end to end: press the PhotoGallery stub's add
 * trigger, auto-press "Choose from library" in the native action sheet, and
 * resolve the mocked ImagePicker with the given uri. Leaves the uri in the
 * modal's photoUris state, ready for submit.
 */
async function addPhoto(utils: ReturnType<typeof render>, uri: string) {
  mockRequestMediaLibPerm.mockResolvedValueOnce({ granted: true });
  mockLaunchImageLibrary.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
  // Native path: onAddPhoto opens an Alert action sheet — auto-press the
  // library option, then restore so later asserts can spy Alert.alert fresh.
  const alertSpy = jest
    .spyOn(Alert, 'alert')
    .mockImplementationOnce((_title, _message, buttons) => {
      const lib = (buttons ?? []).find((b) => b.text === 'Choose from library');
      lib?.onPress?.();
    });
  fireEvent.press(utils.getByTestId('photo-gallery-add'));
  // Flush pickPhoto's async chain (permission → picker → setPhotoUris).
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  alertSpy.mockRestore();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckAnonRateLimit.mockResolvedValue(undefined);
  mockCreateAnonFlag.mockResolvedValue(SAMPLE_ANON_ROW);
  mockCreateFlag.mockResolvedValue({ row: SAMPLE_AUTH_ROW, tagsAccepted: true });
  mockSubscribeContextTagsCapability.mockReturnValue(() => {});
  // Default upload: derive { url, path } from the picked uri so multi-photo
  // tests get distinct, recognizable storage paths.
  mockUploadFlagPhoto.mockImplementation((_userId: unknown, uri: unknown) => {
    const name = String(uri).split('/').pop() ?? 'photo.jpg';
    return Promise.resolve({
      url: `http://example.com/${name}`,
      path: `user-abc/${name}`,
    });
  });
  mockRemoveUploadedFlagPhotos.mockResolvedValue(undefined);
  mockBatchInsertFlagPhotos.mockResolvedValue(undefined);
});

// handleSubmit keeps running after a test's `waitFor` resolves
// (createFlag → onCreated → onClose → setSubmitting(false)). That trailing
// state update could fire after the test ended → "update not wrapped in act"
// and an intermittent failure under parallel jest workers. Drain the async tail
// within act after every test so nothing leaks past it. Makes the suite
// deterministic in parallel (it was already 100% green serially).
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
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

// ===========================================================================
// 5. Storage orphan cleanup — FIX B (Decision 5, Option A)
//
// Photos upload BEFORE createFlag. If anything fails between the first
// upload and createFlag resolving, the already-uploaded blobs are orphans
// and the catch must hand their storage paths to removeUploadedFlagPhotos.
// Once createFlag resolves, the photos are referenced by the new flag and
// must NEVER be cleaned up — even when the junction insert (F57) fails.
// ===========================================================================

describe('storage orphan cleanup on failed submit (auth path)', () => {
  it('cleans up the already-uploaded path and skips createFlag when an upload fails mid-loop', async () => {
    const utils = renderAuth();
    await addPhoto(utils, 'file:///p1.jpg');
    await addPhoto(utils, 'file:///p2.jpg');

    mockUploadFlagPhoto
      .mockResolvedValueOnce({ url: 'http://example.com/p1.jpg', path: 'user-abc/p1.jpg' })
      .mockRejectedValueOnce(new Error('upload failed'));

    fireEvent.press(utils.getByLabelText('Submit flag report'));

    await waitFor(() => {
      expect(mockRemoveUploadedFlagPhotos).toHaveBeenCalledTimes(1);
    });
    // Only the photo that actually reached Storage gets cleaned up.
    expect(mockRemoveUploadedFlagPhotos).toHaveBeenCalledWith(['user-abc/p1.jpg']);
    // The flag insert never ran — the blobs were pure orphans.
    expect(mockCreateFlag).not.toHaveBeenCalled();
  });

  it('cleans up ALL uploaded paths when createFlag itself fails', async () => {
    const utils = renderAuth();
    await addPhoto(utils, 'file:///p1.jpg');
    await addPhoto(utils, 'file:///p2.jpg');

    mockCreateFlag.mockRejectedValueOnce(new Error('insert failed'));

    fireEvent.press(utils.getByLabelText('Submit flag report'));

    await waitFor(() => {
      expect(mockRemoveUploadedFlagPhotos).toHaveBeenCalledTimes(1);
    });
    expect(mockRemoveUploadedFlagPhotos).toHaveBeenCalledWith([
      'user-abc/p1.jpg',
      'user-abc/p2.jpg',
    ]);
  });

  it('still surfaces the original submit error to the user after cleanup', async () => {
    const utils = renderAuth();
    await addPhoto(utils, 'file:///p1.jpg');
    // Spy AFTER addPhoto so its scoped action-sheet spy has been restored.
    const alertSpy = jest.spyOn(Alert, 'alert');

    mockCreateFlag.mockRejectedValueOnce(new Error('insert failed'));

    fireEvent.press(utils.getByLabelText('Submit flag report'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Couldn't submit your report", 'insert failed');
    });
    alertSpy.mockRestore();
  });

  it('performs NO cleanup on a fully successful submit', async () => {
    const utils = renderAuth();
    await addPhoto(utils, 'file:///p1.jpg');
    await addPhoto(utils, 'file:///p2.jpg');

    fireEvent.press(utils.getByLabelText('Submit flag report'));

    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalledTimes(1);
    });
    // Drain the async tail (junction insert → reset → close) before asserting.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockUploadFlagPhoto).toHaveBeenCalledTimes(2);
    expect(mockRemoveUploadedFlagPhotos).not.toHaveBeenCalled();
  });

  it('performs NO cleanup when only the junction insert fails after createFlag succeeded (F57)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const utils = renderAuth();
    await addPhoto(utils, 'file:///p1.jpg');

    mockBatchInsertFlagPhotos.mockRejectedValueOnce(new Error('junction insert failed'));

    fireEvent.press(utils.getByLabelText('Submit flag report'));

    await waitFor(() => {
      expect(mockBatchInsertFlagPhotos).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    // The flag exists and references the photos — they are NOT orphans.
    expect(mockRemoveUploadedFlagPhotos).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ===========================================================================
// 6. Live location prop — FIX C (Decision 6, Option A)
//
// MapScreen's Report FAB fires a fire-and-forget requestLocation() right
// before opening this modal. That fresh fix only reaches the submitted flag
// if handleSubmit reads the `location` PROP at submit time — NOT a copy
// taken into state when the modal opened. These tests pin the live-prop
// behavior: rerender with new coords while the modal is open, then submit
// must use the NEW coords. If someone refactors location into open-time
// state, these trip and FIX C silently stops working.
// ===========================================================================

describe('live location prop (FIX C — fresh GPS read lands mid-form)', () => {
  const STALE = { lat: 49.28, lng: -123.12 };
  const FRESH = { lat: 49.2827, lng: -123.1207 };

  it('auth submit uses coords delivered AFTER the modal opened', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-abc' } } as ReturnType<typeof useAuth>);
    const onClose = jest.fn();
    const onCreated = jest.fn();
    const utils = render(
      <ReportFlagModal visible location={STALE} onClose={onClose} onCreated={onCreated} />,
    );

    // The fresh GPS fix resolves while the form is open — MapScreen calls
    // setLocation, which re-renders the modal with the new prop.
    utils.rerender(
      <ReportFlagModal visible location={FRESH} onClose={onClose} onCreated={onCreated} />,
    );

    fireEvent.press(utils.getByLabelText('Submit flag report'));

    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalledWith(
        'user-abc',
        expect.objectContaining({ lat: FRESH.lat, lng: FRESH.lng }),
      );
    });
  });

  it('anon submit also uses coords delivered AFTER the modal opened', async () => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    const onClose = jest.fn();
    const onCreated = jest.fn();
    const utils = render(
      <ReportFlagModal visible location={STALE} onClose={onClose} onCreated={onCreated} />,
    );

    utils.rerender(
      <ReportFlagModal visible location={FRESH} onClose={onClose} onCreated={onCreated} />,
    );

    fireEvent.press(utils.getByLabelText('Submit anonymous flag report'));

    await waitFor(() => {
      expect(mockCreateAnonFlag).toHaveBeenCalledWith(
        expect.objectContaining({ lat: FRESH.lat, lng: FRESH.lng }),
      );
    });
  });
});

// ===========================================================================
// 7. Submitting state — L4 (consistent disable sweep while submit in flight)
//
// setSubmitting(true) fires synchronously at the top of handleSubmit (right
// after the F3 re-entry ref), so EVERY control — category pills, severity
// buttons, description input, photo gallery, cancel — disables for the whole
// in-flight window. The anon rate-limit catch path must reset the state so
// the form re-enables (previously the state was set late / left the controls
// editable mid-flight).
// ===========================================================================

describe('submitting state — L4 disable sweep', () => {
  it('disables every form control while an auth submit is in flight, re-enables after', async () => {
    // Deferred createFlag — keeps the submit in flight until WE resolve it.
    let resolveCreate: (value: { row: typeof SAMPLE_AUTH_ROW; tagsAccepted: boolean }) => void =
      () => {};
    mockCreateFlag.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );

    const utils = renderAuth();

    // Sanity: before submit, the form is fully interactive.
    expect(
      utils.getByLabelText('Description of the accessibility issue').props.editable,
    ).toBe(true);
    expect(
      utils.getByLabelText('Category: No ramp').props.accessibilityState.disabled,
    ).toBe(false);

    // Spy BEFORE submit so the mid-flight gallery press can be asserted.
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    fireEvent.press(utils.getByLabelText('Submit flag report'));

    // createFlag is pending — the WHOLE form must be locked.
    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalledTimes(1);
    });
    expect(
      utils.getByLabelText('Submit flag report').props.accessibilityState,
    ).toMatchObject({ disabled: true, busy: true });
    expect(
      utils.getByLabelText('Cancel and close').props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      utils.getByLabelText('Category: No ramp').props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      utils.getByLabelText(/^Severity 5:/).props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      utils.getByLabelText('Description of the accessibility issue').props.editable,
    ).toBe(false);
    // PhotoGallery receives undefined handlers mid-flight — pressing the
    // stub's add trigger must NOT open the "Add photo" action sheet.
    fireEvent.press(utils.getByTestId('photo-gallery-add'));
    expect(alertSpy).not.toHaveBeenCalled();

    // Let the submit finish — the form re-enables.
    await act(async () => {
      resolveCreate({ row: SAMPLE_AUTH_ROW, tagsAccepted: true });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(
      utils.getByLabelText('Description of the accessibility issue').props.editable,
    ).toBe(true);
    expect(
      utils.getByLabelText('Category: No ramp').props.accessibilityState.disabled,
    ).toBe(false);
    // The gallery's add handler is live again — the action sheet opens.
    fireEvent.press(utils.getByTestId('photo-gallery-add'));
    expect(alertSpy).toHaveBeenCalledWith('Add photo', undefined, expect.any(Array));
    alertSpy.mockRestore();
  });

  it('re-enables the form when the anon rate limit rejects the submit', async () => {
    mockCheckAnonRateLimit.mockRejectedValueOnce(new Error('rate limited'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const utils = renderAnon();

    fireEvent.press(utils.getByLabelText('Submit anonymous flag report'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Daily limit reached',
        expect.any(String),
        expect.any(Array),
      );
    });

    // The catch path must reset BOTH the F3 ref and the submitting state.
    expect(
      utils.getByLabelText('Submit anonymous flag report').props.accessibilityState,
    ).toMatchObject({ disabled: false, busy: false });
    expect(
      utils.getByLabelText('Description of the accessibility issue').props.editable,
    ).toBe(true);

    // Functional proof: a second tap goes through (rate limit passes now —
    // the rejection above was mockRejectedValueOnce).
    fireEvent.press(utils.getByLabelText('Submit anonymous flag report'));
    await waitFor(() => {
      expect(mockCreateAnonFlag).toHaveBeenCalledTimes(1);
    });
    alertSpy.mockRestore();
  });
});
