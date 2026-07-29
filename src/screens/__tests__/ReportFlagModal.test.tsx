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
import { SharedModalsProvider } from '@/lib/sharedModalsContext';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
// Mocked below — jest.mock calls are hoisted above all imports, so this
// resolves to the mock module. Imported here (not mid-file) to keep
// import/first happy.
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Import component (after all mocks are registered)
// ---------------------------------------------------------------------------
import ReportFlagModal from '../ReportFlagModal';

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
// Mock: @/lib/liveStatus — S10 fires the "Report filed" confirmation through it.
// ---------------------------------------------------------------------------
const mockSetLiveStatus = jest.fn();
jest.mock('@/lib/liveStatus', () => ({
  __esModule: true,
  setLiveStatus: (...args: unknown[]) => mockSetLiveStatus(...args),
  clearLiveStatus: jest.fn(),
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
// Renders the add-photo trigger plus a remove-first-photo trigger so tests
// can drive both the photo-pick flow (see the addPhoto helper below) and the
// removeUri path (L7 blob-release tests) without the native gallery internals.
// ---------------------------------------------------------------------------
jest.mock('@/components/PhotoGallery', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onAddPhoto,
      onRemovePhoto,
    }: {
      onAddPhoto?: () => void;
      onRemovePhoto?: (index: number) => void;
    }) =>
      ReactActual.createElement(
        View,
        null,
        ReactActual.createElement(Pressable, {
          testID: 'photo-gallery-add',
          onPress: onAddPhoto,
        }),
        ReactActual.createElement(Pressable, {
          testID: 'photo-gallery-remove-first',
          onPress: onRemovePhoto ? () => onRemovePhoto(0) : undefined,
        }),
      ),
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
  // The card now wears GlassSurface (bulk glass, B4); it reads this hook to pick
  // blur vs the opaque Reduce-Transparency state. Default false → the blur path,
  // matching production default (see GlassSurface.test.tsx).
  useReduceTransparency: jest.fn(() => false),
  // The modal moves screen-reader focus to its title on open; in tests the hook
  // just needs to exist and hand back a ref (focus is a native no-op here).
  useFocusOnOpen: jest.fn(() => ({ current: null })),
  // S9: real helper — emits accessibilityState + flat aria-* (the chips call it).
  a11yToggle: jest.requireActual('@/lib/accessibility').a11yToggle,
}));

// Haptics are no-ops in tests — avoids loading expo-haptics during the async
// submit tests (the require perturbed their timing under parallel workers).
jest.mock('@/lib/haptics', () => ({
  hapticSelection: jest.fn(),
  hapticImpact: jest.fn(),
  hapticNotify: jest.fn(),
}));

/**
 * §SKY-7: the submit path now routes a filter rejection to the community
 * guidelines, and the terms are a SHARED modal — so the sheet reads
 * `useSharedModals()`, which throws outside a provider by design (a missing
 * provider should surface immediately, not silently no-op). In the app
 * RootNavigator supplies it; here it has to be supplied explicitly. Same
 * helper, same reasoning, as `ReportContentModal.test.tsx`.
 */
function withProvider(node: React.ReactElement) {
  return <SharedModalsProvider>{node}</SharedModalsProvider>;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const LOCATION = { lat: 49.28, lng: -123.12 };

type User = { id: string };

function renderAnon(props: Partial<{ visible: boolean; location: typeof LOCATION | null }> = {}) {
  mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
  return render(
    withProvider(
      <ReportFlagModal
        visible={props.visible ?? true}
        location={props.location ?? LOCATION}
        onClose={jest.fn()}
        onCreated={jest.fn()}
      />,
    ),
  );
}

function renderAuth(user: User = { id: 'user-abc' }, props: Partial<{ visible: boolean }> = {}) {
  mockUseAuth.mockReturnValue({ user } as ReturnType<typeof useAuth>);
  return render(
    withProvider(
      <ReportFlagModal
        visible={props.visible ?? true}
        location={LOCATION}
        onClose={jest.fn()}
        onCreated={jest.fn()}
      />,
    ),
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

  it('shows the anon sign-in-to-add-a-photo note instead of the photo section', () => {
    // The note is a nested-Text structure: outer Text contains the lead-in
    // "Your anonymous report still counts.", an inner "Sign in" link Text, and
    // the suffix " to add a photo and help verifiers act faster." Matched via
    // regex on the concatenated outer element.
    const { getByText } = renderAnon();
    expect(getByText(/to add a photo/i)).toBeTruthy();
  });

  it('does NOT show "Report a flag" title header', () => {
    const { getAllByRole } = renderAnon();
    const headers = getAllByRole('header');
    const flagTitle = headers.find((el) => el.props.children === 'Report a flag');
    expect(flagTitle).toBeUndefined();
  });

  it('submit button accessibilityLabel is "Submit report anonymously" (S18: contains the visible "Submit report")', () => {
    const { getByLabelText } = renderAnon();
    expect(getByLabelText('Submit report anonymously')).toBeTruthy();
  });

  it('submit button says "Submit report" while the title still states anonymity', () => {
    const { getByText, getAllByText } = renderAnon();
    // S18 (L5-03 / WCAG 2.5.3): the action button is the verb-forward
    // "Submit report" (was the 19-char "Report anonymously"), and its
    // accessible name CONTAINS that visible text. Anonymity is still stated
    // by the title and the anon banner — not the button.
    expect(getByText('Submit report')).toBeTruthy();
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

  it('submit button accessibilityLabel is "Submit report" (auth form)', () => {
    const { getByLabelText } = renderAuth();
    expect(getByLabelText('Submit report')).toBeTruthy();
  });

  it('submit button text is "Submit report" (auth form, not the anon label)', () => {
    const { getByText, queryByText } = renderAuth();
    expect(getByText('Submit report')).toBeTruthy();
    expect(queryByText('Report anonymously')).toBeNull();
  });
});

// ===========================================================================
// 3. Submit routing — anon path calls checkAnonRateLimit + createAnonFlag
// ===========================================================================

describe('submit routing — anon path', () => {
  it('calls checkAnonRateLimit before createAnonFlag on anon submit', async () => {
    const { getByLabelText } = renderAnon();
    fireEvent.press(getByLabelText('Submit report anonymously'));

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
    fireEvent.press(getByLabelText('Submit report anonymously'));

    await waitFor(() => {
      expect(mockRecordAnonSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('does NOT call createFlag on an anon submit', async () => {
    const { getByLabelText } = renderAnon();
    fireEvent.press(getByLabelText('Submit report anonymously'));

    await waitFor(() => {
      expect(mockCreateAnonFlag).toHaveBeenCalled();
    });
    expect(mockCreateFlag).not.toHaveBeenCalled();
  });

  it('sends the correct lat/lng/category/severity to createAnonFlag', async () => {
    const { getByLabelText } = renderAnon();
    fireEvent.press(getByLabelText('Submit report anonymously'));

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
    fireEvent.press(getByLabelText('Submit report anonymously'));

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
    fireEvent.press(getByLabelText('Submit report'));

    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateAnonFlag).not.toHaveBeenCalled();
  });

  it('passes the user id to createFlag', async () => {
    const { getByLabelText } = renderAuth({ id: 'user-xyz' });
    fireEvent.press(getByLabelText('Submit report'));

    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalledWith('user-xyz', expect.any(Object));
    });
  });

  it('does NOT call checkAnonRateLimit on authenticated submit', async () => {
    const { getByLabelText } = renderAuth();
    fireEvent.press(getByLabelText('Submit report'));

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

    fireEvent.press(utils.getByLabelText('Submit report'));

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

    fireEvent.press(utils.getByLabelText('Submit report'));

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

    fireEvent.press(utils.getByLabelText('Submit report'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Couldn't submit your report", 'insert failed');
    });
    alertSpy.mockRestore();
  });

  it('performs NO cleanup on a fully successful submit', async () => {
    const utils = renderAuth();
    await addPhoto(utils, 'file:///p1.jpg');
    await addPhoto(utils, 'file:///p2.jpg');

    fireEvent.press(utils.getByLabelText('Submit report'));

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

    fireEvent.press(utils.getByLabelText('Submit report'));

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
      withProvider(<ReportFlagModal visible location={STALE} onClose={onClose} onCreated={onCreated} />),
    );

    // The fresh GPS fix resolves while the form is open — MapScreen calls
    // setLocation, which re-renders the modal with the new prop.
    utils.rerender(
      withProvider(<ReportFlagModal visible location={FRESH} onClose={onClose} onCreated={onCreated} />),
    );

    fireEvent.press(utils.getByLabelText('Submit report'));

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
      withProvider(<ReportFlagModal visible location={STALE} onClose={onClose} onCreated={onCreated} />),
    );

    utils.rerender(
      withProvider(<ReportFlagModal visible location={FRESH} onClose={onClose} onCreated={onCreated} />),
    );

    fireEvent.press(utils.getByLabelText('Submit report anonymously'));

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

// ===========================================================================
// 7.5 Blob URL release — L7 (web resilience trio)
//
// Web photo picks create object URLs (URL.createObjectURL) that pin the File
// bytes in memory until revoked. releaseUri() revokes them at exactly two
// post-settle moments: removeUri (user discards a pick) and reset() (after a
// SUCCESSFUL submit). A failed submit must NOT revoke — the draft previews
// stay alive so the user can retry without re-picking. Native file:// URIs
// are never revoked (blob:-prefix guard).
// ===========================================================================

describe('blob URL release — L7', () => {
  const BLOB_URI = 'blob:http://localhost/draft-photo-1';
  // The node test env's URL may not implement revokeObjectURL — install a
  // jest.fn() and restore whatever was there after the block.
  const urlGlobal = URL as unknown as { revokeObjectURL?: (u: string) => void };
  const originalRevoke = urlGlobal.revokeObjectURL;
  let revokeSpy: jest.Mock;

  beforeEach(() => {
    revokeSpy = jest.fn();
    urlGlobal.revokeObjectURL = revokeSpy;
  });

  afterAll(() => {
    urlGlobal.revokeObjectURL = originalRevoke;
  });

  it('revokes a blob: draft URL when the user removes the pick (removeUri)', async () => {
    const utils = renderAuth();
    await addPhoto(utils, BLOB_URI);

    fireEvent.press(utils.getByTestId('photo-gallery-remove-first'));

    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith(BLOB_URI);
  });

  it('does NOT revoke a native file:// URI on remove (blob:-prefix guard)', async () => {
    const utils = renderAuth();
    await addPhoto(utils, 'file:///p1.jpg');

    fireEvent.press(utils.getByTestId('photo-gallery-remove-first'));

    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('revokes blob: draft URLs after a SUCCESSFUL submit (reset)', async () => {
    const utils = renderAuth();
    await addPhoto(utils, BLOB_URI);

    fireEvent.press(utils.getByLabelText('Submit report'));

    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalledTimes(1);
    });
    // Drain the async tail (junction insert → reset → close).
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(revokeSpy).toHaveBeenCalledWith(BLOB_URI);
  });

  it('keeps blob: draft URLs ALIVE when the submit fails (retry must work)', async () => {
    const utils = renderAuth();
    await addPhoto(utils, BLOB_URI);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockCreateFlag.mockRejectedValueOnce(new Error('insert failed'));

    fireEvent.press(utils.getByLabelText('Submit report'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Couldn't submit your report", 'insert failed');
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    // The preview must still be usable for a retry — nothing revoked.
    expect(revokeSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

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

    fireEvent.press(utils.getByLabelText('Submit report'));

    // createFlag is pending — the WHOLE form must be locked.
    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalledTimes(1);
    });
    expect(
      utils.getByLabelText('Submit report').props.accessibilityState,
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

    fireEvent.press(utils.getByLabelText('Submit report anonymously'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Daily limit reached',
        expect.any(String),
        expect.any(Array),
      );
    });

    // The catch path must reset BOTH the F3 ref and the submitting state.
    expect(
      utils.getByLabelText('Submit report anonymously').props.accessibilityState,
    ).toMatchObject({ disabled: false, busy: false });
    expect(
      utils.getByLabelText('Description of the accessibility issue').props.editable,
    ).toBe(true);

    // Functional proof: a second tap goes through (rate limit passes now —
    // the rejection above was mockRejectedValueOnce).
    fireEvent.press(utils.getByLabelText('Submit report anonymously'));
    await waitFor(() => {
      expect(mockCreateAnonFlag).toHaveBeenCalledTimes(1);
    });
    alertSpy.mockRestore();
  });
});

// ===========================================================================
// 8. Active-severity cue — 2026-06-17 overhaul (WCAG 1.4.1 use-of-color)
//
// The selected severity button must signal selection with NON-color cues, not
// just the severity-color fill: a decorative Check tick + a bold number +
// accessibilityState.selected. These tests pin that exactly ONE severity is
// selected at a time, that the Check tick rides ONLY the selected button (and
// is hidden from assistive tech), and that tapping a new severity moves the
// whole cue. If a refactor drops the redundant non-color cue, color becomes
// the sole signal and these trip.
// ===========================================================================

describe('active-severity cue (WCAG 1.4.1 — non-color selection signal)', () => {
  // The lucide Check renders as an RNSVG node; find it among a button's
  // descendants to prove the decorative tick is present on the active button.
  const hasCheckTick = (btn: { findAll: (p: (n: { type: unknown }) => boolean) => unknown[] }) =>
    btn.findAll((n) => typeof n.type === 'string' && /svg/i.test(String(n.type))).length > 0;

  // The severity Pressable's label is `Severity N: <label> — <desc>` (the
  // em-dash distinguishes it from the live-region hint, whose label is just
  // `Severity N: <desc>` with no em-dash). Grab the BUTTON for a given level.
  const sevButton = (utils: ReturnType<typeof renderAuth>, n: number) =>
    utils.getByLabelText(new RegExp(`^Severity ${n}:.*\\u2014`));

  it('selects severity 3 by default and marks exactly one severity button selected', () => {
    const utils = renderAuth();
    const selectedCount = [1, 2, 3, 4, 5].filter(
      (s) => sevButton(utils, s).props.accessibilityState.selected,
    ).length;
    expect(selectedCount).toBe(1);
    // The default severity is 3.
    expect(sevButton(utils, 3).props.accessibilityState.selected).toBe(true);
  });

  it('shows the decorative Check tick on the selected button only', () => {
    const utils = renderAuth();
    expect(hasCheckTick(sevButton(utils, 3))).toBe(true);
    expect(hasCheckTick(sevButton(utils, 1))).toBe(false);
  });

  it('keeps the Check tick hidden from assistive tech (purely redundant cue)', () => {
    const utils = renderAuth();
    const active = sevButton(utils, 3);
    const svg = active.findAll(
      (n: { type: unknown }) => typeof n.type === 'string' && /svg/i.test(String(n.type)),
    )[0] as { props: Record<string, unknown> };
    expect(svg).toBeTruthy();
    // Hidden on both iOS (accessibilityElementsHidden) and Android
    // (importantForAccessibility) so VoiceOver/TalkBack never announce it.
    expect(svg.props.accessibilityElementsHidden).toBe(true);
    expect(svg.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('moves the selected state + Check tick when a new severity is tapped', () => {
    const utils = renderAuth();
    // Tap Severity 5.
    fireEvent.press(sevButton(utils, 5));

    // Selection moved: 5 is now selected, 3 is not.
    expect(sevButton(utils, 5).props.accessibilityState.selected).toBe(true);
    expect(sevButton(utils, 3).props.accessibilityState.selected).toBe(false);

    // The Check tick rode along to the new button.
    expect(hasCheckTick(sevButton(utils, 5))).toBe(true);
    expect(hasCheckTick(sevButton(utils, 3))).toBe(false);

    // Still exactly one selected.
    const selectedCount = [1, 2, 3, 4, 5].filter(
      (s) => sevButton(utils, s).props.accessibilityState.selected,
    ).length;
    expect(selectedCount).toBe(1);
  });
});

// ===========================================================================
// 9. S11 — slow-write escalation (never abort → never double-insert)
//
// A WRITE that outruns the threshold is escalated with an in-sheet "still
// trying" overlay while the insert CONTINUES. It is never aborted: aborting a
// possibly-committed insert then re-submitting would create a DUPLICATE flag
// the anon 5/day limit punishes. These pin exactly-one-insert on a slow write
// (the write must actually COMPLETE — a test that passes because the write did
// nothing is invalid) and that the overlay appears without touching the insert.
// ===========================================================================

describe('S11 — slow write escalates, never aborts (no double-insert)', () => {
  it('a slow anon submit lands EXACTLY ONE flag and is never re-inserted', async () => {
    let resolveInsert!: (row: typeof SAMPLE_ANON_ROW) => void;
    mockCreateAnonFlag.mockImplementationOnce(
      () => new Promise((resolve) => { resolveInsert = resolve; }),
    );
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    const onCreated = jest.fn();
    const utils = render(
      withProvider(<ReportFlagModal visible location={LOCATION} onClose={jest.fn()} onCreated={onCreated} />),
    );

    fireEvent.press(utils.getByLabelText('Submit report anonymously'));

    // The insert is in flight and awaited (not aborted) — exactly one call.
    await waitFor(() => expect(mockCreateAnonFlag).toHaveBeenCalledTimes(1));
    expect(onCreated).not.toHaveBeenCalled();

    // Resolve the slow insert: the write COMPLETES (so the test can't pass by
    // the write doing nothing) and lands exactly ONE flag — no resubmit.
    await act(async () => {
      resolveInsert(SAMPLE_ANON_ROW);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(mockCreateAnonFlag).toHaveBeenCalledTimes(1);
  });

  it('shows the "still trying" overlay past the threshold while the insert continues untouched', async () => {
    jest.useFakeTimers();
    try {
      let resolveInsert!: (row: typeof SAMPLE_ANON_ROW) => void;
      mockCreateAnonFlag.mockImplementationOnce(
        () => new Promise((resolve) => { resolveInsert = resolve; }),
      );
      mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
      const onCreated = jest.fn();
      const utils = render(
        withProvider(<ReportFlagModal visible location={LOCATION} onClose={jest.fn()} onCreated={onCreated} />),
      );

      fireEvent.press(utils.getByLabelText('Submit report anonymously'));
      // Flush the resolved rate-limit check so the insert is in flight.
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockCreateAnonFlag).toHaveBeenCalledTimes(1);
      expect(utils.queryByText(/Still trying/)).toBeNull();

      // Cross the 12s threshold: the overlay appears; the insert is NOT re-run.
      act(() => {
        jest.advanceTimersByTime(12_000);
      });
      expect(utils.getByText('Still trying — check your signal')).toBeTruthy();
      expect(mockCreateAnonFlag).toHaveBeenCalledTimes(1);

      // Resolve — exactly one flag lands and the overlay clears.
      await act(async () => {
        resolveInsert(SAMPLE_ANON_ROW);
        await Promise.resolve();
      });
      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(mockCreateAnonFlag).toHaveBeenCalledTimes(1);
      expect(utils.queryByText(/Still trying/)).toBeNull();
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });
});

// ===========================================================================
// 10. S10 — confirm the submit (visible + live "Report filed" for everyone)
//
// The CONTRIBUTE flow used to end by silently closing the sheet (dead-silent
// for the web-anon cohort). S10 fires a persistent-mounted, guest-reachable
// success confirmation via setLiveStatus, and hands the created flag back to
// onCreated so the host can recenter on the new pin. The failure branch must
// NOT fire the confirmation.
// ===========================================================================

describe('S10 — confirm the submit', () => {
  it('anon submit fires the "Report filed" confirmation and passes the created flag to onCreated', async () => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    const onCreated = jest.fn();
    const utils = render(
      withProvider(<ReportFlagModal visible location={LOCATION} onClose={jest.fn()} onCreated={onCreated} />),
    );

    fireEvent.press(utils.getByLabelText('Submit report anonymously'));

    await waitFor(() => {
      expect(mockSetLiveStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/Report filed — thanks for flagging this barrier/),
          tone: 'success',
        }),
      );
    });
    // The created flag is threaded back so the host can recenter (S10 pin move).
    expect(onCreated).toHaveBeenCalledWith(SAMPLE_ANON_ROW);
  });

  it('auth submit fires the confirmation with the created flag', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-abc' } } as ReturnType<typeof useAuth>);
    const onCreated = jest.fn();
    const utils = render(
      withProvider(<ReportFlagModal visible location={LOCATION} onClose={jest.fn()} onCreated={onCreated} />),
    );

    fireEvent.press(utils.getByLabelText('Submit report'));

    await waitFor(() => {
      expect(mockSetLiveStatus).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/Report filed/), tone: 'success' }),
      );
    });
    expect(onCreated).toHaveBeenCalledWith(SAMPLE_AUTH_ROW);
  });

  it('does NOT fire the confirmation when the submit fails', async () => {
    mockCreateAnonFlag.mockRejectedValueOnce(new Error('insert failed'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    const utils = render(
      withProvider(<ReportFlagModal visible location={LOCATION} onClose={jest.fn()} onCreated={jest.fn()} />),
    );

    fireEvent.press(utils.getByLabelText('Submit report anonymously'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Couldn't submit your report", 'insert failed');
    });
    expect(mockSetLiveStatus).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
