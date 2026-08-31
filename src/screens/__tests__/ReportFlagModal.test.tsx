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
import { AccessibilityInfo, Alert, Modal, StyleSheet, Text, View } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
// Mocked below — jest.mock calls are hoisted above all imports, so this
// resolves to the mock module. Imported here (not mid-file) to keep
// import/first happy.
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth';
import { TYPE_BLOCK } from '@/components/ui/TypeBlock';

const mockConfirm = jest.fn().mockResolvedValue(true);

jest.mock('@/lib/confirm', () => ({
  ...jest.requireActual('@/lib/confirm'),
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));

// ---------------------------------------------------------------------------
// Import component (after all mocks are registered)
// ---------------------------------------------------------------------------
import ReportFlagModal from '../ReportFlagModal';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { SheetPull } from '@/components/ui/SheetPull';
import { takeReportDraft } from '@/lib/reportDraft';
import { validReportTemplates } from '@/lib/reportTemplates';
import { font } from '@/theme';
import useWindowDimensions from 'react-native/Libraries/Utilities/useWindowDimensions';

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
// D1F4: uploads have durable server-created intents. A failed report asks the
// server to resolve that intent; the client never treats local cleanup as proof.
const mockUploadFlagPhoto = jest.fn();
const mockCancelFlagPhotoUpload = jest.fn();

jest.mock('@/lib/flags', () => ({
  createAnonFlag: (...args: unknown[]) => mockCreateAnonFlag(...args),
  createFlag: (...args: unknown[]) => mockCreateFlag(...args),
  uploadFlagPhoto: (...args: unknown[]) => mockUploadFlagPhoto(...args),
  cancelFlagPhotoUpload: (...args: unknown[]) => mockCancelFlagPhotoUpload(...args),
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
  SEASONAL_TAGS: ['icy_winter'],
  SEASONAL_TAG_LABELS: { icy_winter: 'Icy in winter' },
  MAX_CONTEXT_TAGS: 5,
  toggleTag: jest.fn((curr: string[], tag: string) => (
    curr.includes(tag) ? curr.filter((value) => value !== tag) : [...curr, tag]
  )),
  isSeasonalTag: jest.fn((tag: string) => tag === 'icy_winter'),
  isDisabilityTag: jest.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/reportTemplates
// ---------------------------------------------------------------------------
jest.mock('@/lib/reportTemplates', () => ({ validReportTemplates: jest.fn(() => []) }));

// ---------------------------------------------------------------------------
// Mock: useWindowDimensions — pin the DEFAULT text size for this suite.
//
// RN's jest environment reports fontScale 2, which is past the F4 recomposition
// threshold, so without this every test below would silently be walking the
// LARGE-TYPE composition while describing the compact one. Mocking the hook
// module (not the whole of react-native) keeps every other RN export real.
// The recomposition itself is tested in ReportFlagModal.dynamicType.test.tsx.
// ---------------------------------------------------------------------------
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 3, fontScale: 1 })),
}));

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
  // A11Y-234: spread FIRST so every real export (notably `decorativeProps`,
  // which this sheet now spreads onto its decorative icons) exists — a partial
  // mock silently made `{...decorativeProps}` spread nothing, and the tick's
  // hidden-from-AT assertion below then measured the mock, not the component.
  ...jest.requireActual('@/lib/accessibility'),
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

/**
 * Q5 — the form no longer arrives pre-rated.
 *
 * `useState<FlagSeverity>(3)` became `useState<FlagSeverity | null>(null)`: a
 * default on a judgment scale biased the data and skipped the moment the user
 * is asked to rate. Every test below that walks the form to SUBMIT needs the
 * report to be filable, which now takes a tap it used to get for free — so the
 * render helpers do explicitly what the component used to do implicitly, and
 * the assertions past this point are unchanged.
 *
 * Pass `severity: null` to stay unrated; that is what the Q5 block itself does.
 */
/** Drive the F4 recomposition threshold (the suite is pinned to 1 — see the
 *  useWindowDimensions mock above). */
const mockWindow = useWindowDimensions as unknown as jest.Mock;
const setFontScale = (fontScale: number) =>
  mockWindow.mockReturnValue({ width: 390, height: 844, scale: 3, fontScale });

function expectUncappedText(node: {
  props: { maxFontSizeMultiplier?: number; allowFontScaling?: boolean };
}) {
  expect(node.props.maxFontSizeMultiplier).toBeUndefined();
  expect(node.props.allowFontScaling).not.toBe(false);
}

function rate(utils: ReturnType<typeof render>, level: number) {
  // The live meaning line's own label also starts "Severity 3:" once a level is
  // chosen, so match the DISC by its role rather than by prefix alone.
  const disc = utils
    .getAllByLabelText(new RegExp(`^Severity ${level}:`))
    .find((el) => ['button', 'radio'].includes(el.props.accessibilityRole));
  if (!disc) throw new Error(`no severity ${level} control`);
  fireEvent.press(disc);
}

function renderAnon(
  props: Partial<{
    visible: boolean;
    location: typeof LOCATION | null;
    onClose: () => void;
    severity: number | null;
  }> = {},
) {
  mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
  const utils = render(
    withProvider(
      <ReportFlagModal
        visible={props.visible ?? true}
        location={props.location ?? LOCATION}
        onClose={props.onClose ?? jest.fn()}
        onCreated={jest.fn()}
      />,
    ),
  );
  const level = props.severity === undefined ? 3 : props.severity;
  if (level !== null) rate(utils, level);
  return utils;
}

function renderAuth(
  user: User = { id: 'user-abc' },
  props: Partial<{
    visible: boolean;
    severity: number | null;
    location: typeof LOCATION | null;
    locationSource: 'gps' | 'pin';
    locationDenied: boolean;
    onClose: () => void;
    onRequestLocation: () => void;
    onPlaceOnMap: () => void;
  }> = {},
) {
  mockUseAuth.mockReturnValue({ user } as ReturnType<typeof useAuth>);
  const location = props.location === undefined ? LOCATION : props.location;
  const utils = render(
    withProvider(
      <ReportFlagModal
        visible={props.visible ?? true}
        location={location}
        locationSource={props.locationSource}
        locationDenied={props.locationDenied}
        onClose={props.onClose ?? jest.fn()}
        onCreated={jest.fn()}
        onRequestLocation={props.onRequestLocation}
        onPlaceOnMap={props.onPlaceOnMap}
      />,
    ),
  );
  const level = props.severity === undefined ? 3 : props.severity;
  if (level !== null) rate(utils, level);
  return utils;
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
  // clearAllMocks preserves queued mockResolvedValueOnce results. Reset this
  // local confirmation mock as well so a prior simulated Cancel cannot alter
  // the next dismissal contract case in the full suite.
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(true);
  setFontScale(1);
  mockCheckAnonRateLimit.mockResolvedValue(undefined);
  mockCreateAnonFlag.mockResolvedValue(SAMPLE_ANON_ROW);
  mockCreateFlag.mockResolvedValue({ row: SAMPLE_AUTH_ROW, tagsAccepted: true });
  mockSubscribeContextTagsCapability.mockReturnValue(() => {});
  // Default upload: every result carries a durable intent reference.
  mockUploadFlagPhoto.mockImplementation((_userId: unknown, uri: unknown) => {
    const name = String(uri).split('/').pop() ?? 'photo.jpg';
    return Promise.resolve({
      intentId: `intent-${name}`,
      url: `http://example.com/${name}`,
      path: `user-abc/${name}`,
    });
  });
  mockCancelFlagPhotoUpload.mockResolvedValue(undefined);
  mockBatchInsertFlagPhotos.mockResolvedValue(undefined);
  (validReportTemplates as jest.Mock).mockReturnValue([]);
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

  // D11 (2026-08-21, art-direction Phase 0 item 0.4). "Sign in" was a nested
  // <Text onPress> inside that sentence — a 13pt inline span far under the
  // project's 44pt floor, and nested text can take neither hitSlop nor padding
  // without overlapping the lines around it. The whole nudge is the control now.
  it('the sign-in nudge is one link with a real 44pt frame (D11)', () => {
    const { getByRole } = renderAnon();
    const links = getByRole('link', { name: /to add a photo/i });
    const box = StyleSheet.flatten(
      typeof links.props.style === 'function' ? links.props.style({ pressed: false }) : links.props.style,
    );
    expect(box.minHeight).toBeGreaterThanOrEqual(44);
    expect(box.justifyContent).toBe('center');
  });

  it('the nudge keeps the guest\'s typed report instead of throwing it away', () => {
    // Signing in unmounts the guest tree. The banner link above already stashed
    // the draft (A11Y-226); this path called onClose bare, so a guest who took
    // the invitation lost everything they had typed.
    const onClose = jest.fn();
    const { getByRole, getByPlaceholderText } = renderAnon({ onClose });
    fireEvent.changeText(
      getByPlaceholderText(/Describe the barrier/i),
      'Bollard spacing is too narrow for a mobility scooter.',
    );
    fireEvent.press(getByRole('link', { name: /to add a photo/i }));

    expect(onClose).toHaveBeenCalled();
    expect(takeReportDraft()?.description).toBe(
      'Bollard spacing is too narrow for a mobility scooter.',
    );
  });

  it('does NOT show "Report a flag" title header', () => {
    const { getAllByRole } = renderAnon();
    const headers = getAllByRole('header');
    const flagTitle = headers.find((el) => el.props.children === 'Report a flag');
    expect(flagTitle).toBeUndefined();
  });

  it('Q6: the visible word and the spoken name are one string (was two)', () => {
    // S18 used to be satisfied the other way round — the visible label read
    // "Submit report" while only the accessible name said "anonymously", so the
    // contract was restated to screen-reader users and to nobody else. Q6 makes
    // them the same string, which is the only shape that keeps WCAG 2.5.3 once
    // the visible word changes at all.
    const { getByLabelText, getByText, queryByLabelText } = renderAnon();
    expect(getByLabelText('Submit anonymously')).toBeTruthy();
    expect(getByText('Submit anonymously')).toBeTruthy();
    expect(queryByLabelText('Submit report anonymously')).toBeNull();
  });

  it('does NOT show "Report a flag" title header', () => {
    const { getAllByRole } = renderAnon();
    const headers = getAllByRole('header');
    const flagTitle = headers.find((el) => el.props.children === 'Report a flag');
    expect(flagTitle).toBeUndefined();
  });

  it('the guest button restates the contract, and the title still does too', () => {
    const { getByText, getAllByText, queryByText } = renderAnon();
    // S18 (L5-03) kept the button verb-forward; Q6 keeps that and puts the
    // contract back on it, where the store dossier thought it already was.
    // The title and the anon banner still say it as well — the button is the
    // third place, not the only one.
    expect(getByText('Submit anonymously')).toBeTruthy();
    expect(queryByText('Submit report')).toBeNull();
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
    fireEvent.press(getByLabelText('Submit anonymously'));

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
    fireEvent.press(getByLabelText('Submit anonymously'));

    await waitFor(() => {
      expect(mockRecordAnonSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('does NOT call createFlag on an anon submit', async () => {
    const { getByLabelText } = renderAnon();
    fireEvent.press(getByLabelText('Submit anonymously'));

    await waitFor(() => {
      expect(mockCreateAnonFlag).toHaveBeenCalled();
    });
    expect(mockCreateFlag).not.toHaveBeenCalled();
  });

  it('sends the correct lat/lng/category/severity to createAnonFlag', async () => {
    const { getByLabelText } = renderAnon();
    fireEvent.press(getByLabelText('Submit anonymously'));

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
    fireEvent.press(getByLabelText('Submit anonymously'));

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
// Photos receive a durable PREPARED intent before direct upload. If report
// creation fails, the client asks the server to resolve the same intent. Once
// the flag exists, client cleanup must not undo it even when linking fails.
// ===========================================================================

describe('uncommitted photo intent handling on failed submit (auth path)', () => {
  it('cancels the already-prepared intent and skips createFlag when an upload fails mid-loop', async () => {
    const utils = renderAuth();
    await addPhoto(utils, 'file:///p1.jpg');
    await addPhoto(utils, 'file:///p2.jpg');

    mockUploadFlagPhoto
      .mockResolvedValueOnce({ intentId: 'intent-p1', url: 'http://example.com/p1.jpg', path: 'user-abc/p1.jpg' })
      .mockRejectedValueOnce(new Error('upload failed'));

    fireEvent.press(utils.getByLabelText('Submit report'));

    await waitFor(() => {
      expect(mockCancelFlagPhotoUpload).toHaveBeenCalledTimes(1);
    });
    expect(mockCancelFlagPhotoUpload).toHaveBeenCalledWith('intent-p1');
    // The flag insert never ran — the intent remains server-visible.
    expect(mockCreateFlag).not.toHaveBeenCalled();
  });

  it('cancels ALL prepared intents when createFlag itself fails', async () => {
    const utils = renderAuth();
    await addPhoto(utils, 'file:///p1.jpg');
    await addPhoto(utils, 'file:///p2.jpg');

    mockCreateFlag.mockRejectedValueOnce(new Error('insert failed'));

    fireEvent.press(utils.getByLabelText('Submit report'));

    await waitFor(() => {
      expect(mockCancelFlagPhotoUpload).toHaveBeenCalledTimes(2);
    });
    expect(mockCancelFlagPhotoUpload).toHaveBeenNthCalledWith(1, 'intent-p1.jpg');
    expect(mockCancelFlagPhotoUpload).toHaveBeenNthCalledWith(2, 'intent-p2.jpg');
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

  it('performs NO cancellation on a fully successful submit', async () => {
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
    expect(mockCancelFlagPhotoUpload).not.toHaveBeenCalled();
  });

  it('performs NO cancellation when only the junction insert fails after createFlag succeeded (F57)', async () => {
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
    // The flag exists; client cleanup must not roll it back.
    expect(mockCancelFlagPhotoUpload).not.toHaveBeenCalled();
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

    rate(utils, 3); // Q5 — a report is not filable until it is rated
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

    rate(utils, 3); // Q5 — a report is not filable until it is rated
    fireEvent.press(utils.getByLabelText('Submit anonymously'));

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

    fireEvent.press(utils.getByLabelText('Submit anonymously'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Daily limit reached',
        expect.any(String),
        expect.any(Array),
      );
    });

    // The catch path must reset BOTH the F3 ref and the submitting state.
    expect(
      utils.getByLabelText('Submit anonymously').props.accessibilityState,
    ).toMatchObject({ disabled: false, busy: false });
    expect(
      utils.getByLabelText('Description of the accessibility issue').props.editable,
    ).toBe(true);

    // Functional proof: a second tap goes through (rate limit passes now —
    // the rejection above was mockRejectedValueOnce).
    fireEvent.press(utils.getByLabelText('Submit anonymously'));
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

    rate(utils, 3); // Q5 — a report is not filable until it is rated
    fireEvent.press(utils.getByLabelText('Submit anonymously'));

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

      rate(utils, 3); // Q5 — a report is not filable until it is rated
      fireEvent.press(utils.getByLabelText('Submit anonymously'));
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

    rate(utils, 3); // Q5 — a report is not filable until it is rated
    fireEvent.press(utils.getByLabelText('Submit anonymously'));

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

    rate(utils, 3); // Q5 — a report is not filable until it is rated
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

    rate(utils, 3); // Q5 — a report is not filable until it is rated
    fireEvent.press(utils.getByLabelText('Submit anonymously'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Couldn't submit your report", 'insert failed');
    });
    expect(mockSetLiveStatus).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// A11Y-226 — the guest→sign-in handoff keeps the draft (WCAG 3.3.7)
//
// Signing in swaps the guest tree for SignedInArea (App.tsx Gate), unmounting
// this modal and destroying its component-state draft. The anon banner's
// "Sign in" press stashes the draft in the in-memory consume-once module
// (src/lib/reportDraft.ts); the next mount of the form takes and restores it.
// The unmount+remount below is exactly the tree-swap seam.
// ---------------------------------------------------------------------------

describe('A11Y-226 — guest draft survives the sign-in handoff', () => {
  it('press "Sign in" → draft stashed + announced + closed; a fresh mount restores, announces, and protects it', async () => {
    const announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});

    const first = renderAnon();
    fireEvent.changeText(
      first.getByLabelText('Description of the accessibility issue'),
      'Broken curb cut at 5th and Main',
    );
    fireEvent.press(first.getByLabelText('Sign in'));

    expect(announceSpy).toHaveBeenCalledWith(
      expect.stringContaining('Draft saved'),
    );

    // The tree-swap seam: guest tree unmounts…
    first.unmount();
    announceSpy.mockClear();

    // …and the form's next mount (signed-in world) restores the draft.
    const onClose = jest.fn();
    const second = renderAuth({ id: 'user-abc' }, { onClose });
    expect(
      second.getByDisplayValue('Broken curb cut at 5th and Main'),
    ).toBeTruthy();
    expect(announceSpy).toHaveBeenCalledWith(
      expect.stringContaining('draft was restored'),
    );

    mockConfirm.mockResolvedValueOnce(false);
    fireEvent.press(second.getByLabelText('Cancel and close'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith(
      'Discard report?',
      'Your unsent report will be lost.',
      'Discard',
      true,
    ));
    expect(second.getByDisplayValue('Broken curb cut at 5th and Main')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    second.unmount();
    announceSpy.mockRestore();
  });

  it('restore is consume-once: the mount after a restore starts clean', () => {
    const first = renderAnon();
    fireEvent.changeText(
      first.getByLabelText('Description of the accessibility issue'),
      'One-shot draft',
    );
    fireEvent.press(first.getByLabelText('Sign in'));
    first.unmount();

    const second = renderAuth();
    expect(second.getByDisplayValue('One-shot draft')).toBeTruthy();
    second.unmount();

    const third = renderAuth();
    expect(third.queryByDisplayValue('One-shot draft')).toBeNull();
    third.unmount();
  });
});

/**
 * SW-37 / SW-11 — the no-location dead-end.
 *
 * ─── THE BUG THESE PIN ────────────────────────────────────────────────────
 * Deny location and the report flow simply ended. The header read "Waiting for
 * location…" forever — a sentence that is true while the request is in flight
 * and false the moment the user says no — and Submit stayed disabled no matter
 * how completely the form was filled. The app's core action was closed to
 * anyone who won't share their position, with no explanation and no way out.
 * Confirmed auth-independent in the A-2 pass: signed in WITH location, the same
 * form completes to the edge, so nothing about this was about accounts.
 *
 * Manual placement already existed — a long-press on the map drops a report pin
 * — but nothing anywhere pointed at it, so from inside the sheet it may as well
 * not have existed. The fix is an affordance for the path already there.
 */
describe('SW-11 — a denied permission stops claiming it is still waiting', () => {
  // These render raw (not via renderAnon/renderAuth) because the props under
  // test are the point, so the auth mock has to be set explicitly — the shared
  // beforeEach clears calls but leaves whatever return value ran last.
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
  });

  it('says the location is off, not that it is coming', () => {
    const { getByText, queryByText } = render(
      withProvider(
        <ReportFlagModal
          visible
          location={null}
          locationDenied
          onClose={jest.fn()}
          onCreated={jest.fn()}
        />,
      ),
    );
    expect(getByText('Location is off for Flagstone')).toBeTruthy();
    expect(queryByText('Waiting for location…')).toBeNull();
  });

  it('still says "waiting" while the answer is genuinely outstanding', () => {
    // Non-vacuity: the honest in-flight state must survive. Replacing it
    // unconditionally would trade one wrong sentence for another.
    const { getByText } = render(
      withProvider(
        <ReportFlagModal visible location={null} onClose={jest.fn()} onCreated={jest.fn()} />,
      ),
    );
    expect(getByText('Waiting for location…')).toBeTruthy();
  });
});

describe('SW-37 — there is a way out of the dead-end', () => {
  // These render raw (not via renderAnon/renderAuth) because the props under
  // test are the point, so the auth mock has to be set explicitly — the shared
  // beforeEach clears calls but leaves whatever return value ran last.
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
  });

  const PLACE = 'Place the pin on the map';

  it('offers manual placement when there is no location and the host allows it', () => {
    const onPlaceOnMap = jest.fn();
    const { getByLabelText } = render(
      withProvider(
        <ReportFlagModal
          visible
          location={null}
          onPlaceOnMap={onPlaceOnMap}
          onClose={jest.fn()}
          onCreated={jest.fn()}
        />,
      ),
    );
    fireEvent.press(getByLabelText(PLACE));
    expect(onPlaceOnMap).toHaveBeenCalledTimes(1);
  });

  it('does NOT offer it once a location exists', () => {
    // It is a recovery control, not a relocation control — the long-press path
    // is still how you move a report you can already file.
    const { queryByLabelText } = render(
      withProvider(
        <ReportFlagModal
          visible
          location={LOCATION}
          onPlaceOnMap={jest.fn()}
          onClose={jest.fn()}
          onCreated={jest.fn()}
        />,
      ),
    );
    expect(queryByLabelText(PLACE)).toBeNull();
  });

  it('does NOT offer it when the host withholds it (the guest gate)', () => {
    // MapScreen passes onPlaceOnMap only when signed in, mirroring
    // handleMapLongPress' existing `if (!authUser) return`. The sheet must not
    // invent the control for itself.
    const { queryByLabelText } = render(
      withProvider(
        <ReportFlagModal visible location={null} onClose={jest.fn()} onCreated={jest.fn()} />,
      ),
    );
    expect(queryByLabelText(PLACE)).toBeNull();
  });

  it('the blocked Submit points at a control that can actually help', () => {
    const { getByLabelText } = render(
      withProvider(
        <ReportFlagModal
          visible
          location={null}
          locationDenied
          onPlaceOnMap={jest.fn()}
          onClose={jest.fn()}
          onCreated={jest.fn()}
        />,
      ),
    );
    // Under a denial, "Use my location" only re-asks a question the OS has
    // already answered, so the hint must name the other way out too.
    const submit = getByLabelText('Submit anonymously');
    expect(submit.props.accessibilityHint).toContain(PLACE);
  });
});

/**
 * SW-52 — a cancelled report's photo was published with the NEXT report.
 *
 * ─── THE BUG THESE PIN ────────────────────────────────────────────────────
 * This modal is a persistent `visible`-prop component: it never unmounts, so
 * every field survives a close. `reset()` only ran after a SUCCESSFUL submit —
 * its own comment said so — which meant cancelling left the entire form loaded
 * for the next session, photos included.
 *
 * Proven live on 2026-08-20: a library photo was attached, the report was
 * cancelled, and a later, unrelated report submitted without the picker ever
 * being opened carried that photo onto the public map. The points feed
 * corroborated it independently, awarding "Earned 3 points: Added a photo" for
 * a report in which no photo was ever chosen.
 *
 * A user can attach something personal, think better of it, cancel — and have
 * it published anyway, attached to a report they filed somewhere else entirely.
 * EXIF is stripped on upload so coordinates do not leak; the image does.
 *
 * Surfaced to Sky before any edit (Const. hard prohibition #5) and approved by
 * her on 2026-08-20: full reset on cancel, not photos alone.
 *
 * ─── WHAT MUST NOT BREAK ──────────────────────────────────────────────────
 * Two other paths hide this sheet and both MUST keep the draft — a FAILED
 * submit (so the user can retry without re-picking) and the "Sign in" handoff
 * (which saves the draft explicitly and announces that it kept it; covered by
 * the restore tests above). The SW-37 pin round trip is the third, and it never
 * calls onClose at all.
 */
describe('SW-52 — cancelling a report actually discards it', () => {
  it('does NOT carry a cancelled photo into the next report', async () => {
    // The live repro, in order.
    const utils = renderAuth();
    await addPhoto(utils, 'file:///abandoned.jpg');
    expect(mockUploadFlagPhoto).not.toHaveBeenCalled(); // still only a draft

    fireEvent.press(utils.getByLabelText('Cancel and close'));

    await waitFor(() => {
      expect(utils.getByText('Choose how hard this makes the path to use.')).toBeTruthy();
    });

    // The sheet never unmounted — this is the same component, reopened. Q5: the
    // reset clears the RATING too, so the next report has to be rated again
    // before it is filable. That is the point of the reset, not a wrinkle in it.
    rate(utils, 3);
    fireEvent.press(utils.getByLabelText('Submit report'));
    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalledTimes(1);
    });
    // The whole finding in one assertion: nothing was uploaded, because there
    // was nothing left to upload.
    expect(mockUploadFlagPhoto).not.toHaveBeenCalled();
  });

  it('clears the rating too, so the next report is re-judged (Q5)', async () => {
    const utils = renderAuth({ id: 'user-abc' }, { severity: 4 });
    // Rated: the ask is gone and Submit is live.
    expect(utils.queryByText('Choose how hard this makes the path to use.')).toBeNull();
    expect(
      utils.getByLabelText('Submit report').props.accessibilityState.disabled,
    ).toBe(false);

    fireEvent.press(utils.getByLabelText('Cancel and close'));

    // Back to the ask, and Submit is inert again.
    await waitFor(() => {
      expect(utils.getByText('Choose how hard this makes the path to use.')).toBeTruthy();
      expect(
        utils.getByLabelText('Submit report').props.accessibilityState.disabled,
      ).toBe(true);
    });
  });

  it('clears the typed description too', async () => {
    // Sky chose the full reset over photos-only, so the rest of the draft goes
    // with it — a cancel means cancel.
    const utils = renderAuth();
    fireEvent.changeText(
      utils.getByLabelText('Description of the accessibility issue'),
      'Abandoned draft',
    );
    expect(utils.getByDisplayValue('Abandoned draft')).toBeTruthy();

    mockConfirm.mockResolvedValue(true);
    fireEvent.press(utils.getByLabelText('Cancel and close'));

    await waitFor(() => {
      expect(
        utils.getByLabelText('Description of the accessibility issue').props.value,
      ).toBe('');
    });
  });

  it('a FAILED submit still keeps the draft (this must not regress)', async () => {
    // The deliberate behaviour reset() was written around: a failure is not a
    // cancel, and re-picking photos after a network blip would be its own bug.
    mockCreateFlag.mockRejectedValueOnce(new Error('network'));
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const utils = renderAuth();
    fireEvent.changeText(
      utils.getByLabelText('Description of the accessibility issue'),
      'Survives a failure',
    );
    fireEvent.press(utils.getByLabelText('Submit report'));

    await waitFor(() => {
      expect(mockCreateFlag).toHaveBeenCalled();
    });
    expect(utils.getByDisplayValue('Survives a failure')).toBeTruthy();
  });
});

describe('R2-F3 — a meaningful Report draft is protected before dismissal', () => {
  it('closes an untouched form without prompting; the default category is not dirty', () => {
    const onClose = jest.fn();
    const utils = renderAuth({ id: 'user-abc' }, { severity: null, onClose });

    fireEvent.press(utils.getByLabelText('Cancel and close'));

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('treats whitespace-only description as clean but protects meaningful description', async () => {
    const cleanClose = jest.fn();
    const clean = renderAuth({ id: 'user-abc' }, { severity: null, onClose: cleanClose });
    fireEvent.changeText(clean.getByLabelText('Description of the accessibility issue'), '  \n ');
    fireEvent.press(clean.getByLabelText('Cancel and close'));
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(cleanClose).toHaveBeenCalledTimes(1);

    const onClose = jest.fn();
    mockConfirm.mockResolvedValueOnce(false);
    const dirty = renderAuth({ id: 'user-abc' }, { severity: null, onClose });
    fireEvent.changeText(dirty.getByLabelText('Description of the accessibility issue'), 'Keep this report');
    fireEvent.press(dirty.getByLabelText('Cancel and close'));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        'Discard report?',
        'Your unsent report will be lost.',
        'Discard',
        true,
      );
    });
    expect(dirty.getByDisplayValue('Keep this report')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockCreateFlag).not.toHaveBeenCalled();
  });

  it('returns to clean when the only editable change is reverted', () => {
    const onClose = jest.fn();
    const utils = renderAuth({ id: 'user-abc' }, { severity: null, onClose });
    const description = utils.getByLabelText('Description of the accessibility issue');

    fireEvent.changeText(description, 'Temporary wording');
    fireEvent.changeText(description, '');
    fireEvent.press(utils.getByLabelText('Cancel and close'));

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('protects category, severity, seasonal context, staged photos, and quick-fill changes', async () => {
    const utils = renderAuth({ id: 'user-abc' }, { severity: null });
    fireEvent.press(utils.getByLabelText('Category: Broken sidewalk'));
    rate(utils, 4);
    fireEvent.press(utils.getByLabelText('Icy in winter'));
    await addPhoto(utils, 'file:///staged.jpg');
    fireEvent.changeText(
      utils.getByLabelText('Photo description for screen reader users'),
      'A raised edge blocks the curb ramp.',
    );

    fireEvent.press(utils.getByLabelText('Cancel and close'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());

    const templates = validReportTemplates as unknown as jest.Mock;
    templates.mockReturnValueOnce([
      {
        id: 'winter-ramp',
        label: 'Winter ramp',
        category: 'no_ramp',
        severity: 3,
        description: 'Template text',
      },
    ]);
    const quickFill = renderAuth({ id: 'user-abc' }, { severity: null });
    fireEvent.press(quickFill.getByLabelText('Apply template: Winter ramp'));
    fireEvent.press(quickFill.getByLabelText('Cancel and close'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(2));
  });

  it('routes request-close, accessibility escape, and pull dismissal through the guard', async () => {
    const routes = [
      {
        name: 'request-close',
        invoke: (utils: ReturnType<typeof render>) =>
          utils.UNSAFE_getByType(Modal).props.onRequestClose(),
      },
      {
        name: 'accessibility escape',
        invoke: (utils: ReturnType<typeof render>) =>
          utils.UNSAFE_getByType(GlassSurface).props.onAccessibilityEscape(),
      },
      {
        name: 'pull dismissal',
        invoke: (utils: ReturnType<typeof render>) =>
          utils.UNSAFE_getByType(SheetPull).props.onDismiss(),
      },
    ];

    for (const route of routes) {
      const onClose = jest.fn();
      mockConfirm.mockResolvedValueOnce(false);
      const utils = renderAuth({ id: 'user-abc' }, { severity: null, onClose });
      fireEvent.changeText(
        utils.getByLabelText('Description of the accessibility issue'),
        `Keep this report after ${route.name}`,
      );

      route.invoke(utils);

      await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
      expect(onClose).not.toHaveBeenCalled();
      expect(
        utils.getByDisplayValue(`Keep this report after ${route.name}`),
      ).toBeTruthy();
      utils.unmount();
      mockConfirm.mockClear();
    }
  });

  it('protects an explicitly requested location replacement', async () => {
    const onClose = jest.fn();
    mockConfirm.mockResolvedValueOnce(false);
    mockUseAuth.mockReturnValue({ user: { id: 'user-abc' } } as ReturnType<typeof useAuth>);

    function LocationHarness() {
      const [location, setLocation] = React.useState<typeof LOCATION | null>(null);
      return (
        <SharedModalsProvider>
          <ReportFlagModal
            visible
            location={location}
            onClose={onClose}
            onCreated={jest.fn()}
            onRequestLocation={() => setLocation(LOCATION)}
          />
        </SharedModalsProvider>
      );
    }

    const utils = render(<LocationHarness />);
    fireEvent.press(utils.getByLabelText('Use my location'));
    fireEvent.press(utils.getByLabelText('Cancel and close'));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps passive GPS arrival in the opening state', () => {
    const onClose = jest.fn();
    mockUseAuth.mockReturnValue({ user: { id: 'user-abc' } } as ReturnType<typeof useAuth>);

    function PassiveLocationHarness() {
      const [location, setLocation] = React.useState<typeof LOCATION | null>(null);
      React.useEffect(() => setLocation(LOCATION), []);
      return (
        <SharedModalsProvider>
          <ReportFlagModal
            visible
            location={location}
            onClose={onClose}
            onCreated={jest.fn()}
          />
        </SharedModalsProvider>
      );
    }

    const utils = render(<PassiveLocationHarness />);
    fireEvent.press(utils.getByLabelText('Cancel and close'));

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the product body role for the location warning and keeps coordinates monospace', () => {
    const utils = renderAuth(
      { id: 'user-abc' },
      { location: null, severity: null },
    );
    expect(utils.getByText('Waiting for location…').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontFamily: font.family.bodyMedium })]),
    );

    const withLocation = renderAuth();
    fireEvent.press(withLocation.getByLabelText('Show coordinates'));
    expect(withLocation.getByText('49.28000, -123.12000').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontFamily: font.family.mono })]),
    );
  });
});

/**
 * SW-37, the guest half — a dead end you can at least understand.
 *
 * Manual placement is deliberately NOT open to guests (see handleMapLongPress:
 * with GPS you can only report where you ARE, and the anon rate limit caps
 * volume, not location). That is a defensible product line, but it left the
 * users the finding was actually about — anonymous ones — staring at a disabled
 * Submit with the sentence "Waiting for your location", which after a denial is
 * false AND points at the one control that cannot help.
 *
 * So the constraint gets said out loud, in the same words, in two places: on
 * screen for everyone, and in Submit's accessibilityHint for screen-reader
 * users, who never see the note.
 */
describe('SW-37 (guest half) — the block is explained, not just enforced', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
  });

  const ANON_LINE =
    'Anonymous reports can only be filed where you are. Turn on location above, or sign in to place the pin yourself.';

  it('a guest denied location is told why, and where to go', () => {
    const { getByText } = render(
      withProvider(
        <ReportFlagModal
          visible
          location={null}
          locationDenied
          onClose={jest.fn()}
          onCreated={jest.fn()}
        />,
      ),
    );
    expect(getByText(ANON_LINE)).toBeTruthy();
  });

  it("Submit's hint stops pointing at the control that cannot help", () => {
    const { getByLabelText } = render(
      withProvider(
        <ReportFlagModal
          visible
          location={null}
          locationDenied
          onClose={jest.fn()}
          onCreated={jest.fn()}
        />,
      ),
    );
    const hint = getByLabelText('Submit anonymously').props.accessibilityHint as string;
    expect(hint).toContain('can only be filed where you are');
    // The whole point: after a denial, "Use my location" re-asks a settled question.
    expect(hint).not.toContain('Use my location');
  });

  it('says nothing extra while the answer is still outstanding', () => {
    // Non-vacuity: the note is about a DENIAL, not about every no-location state.
    const { queryByText } = render(
      withProvider(
        <ReportFlagModal visible location={null} onClose={jest.fn()} onCreated={jest.fn()} />,
      ),
    );
    expect(queryByText(ANON_LINE)).toBeNull();
  });

  it('does not claim "anonymous" at a signed-in user who simply has location off', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-abc' } } as ReturnType<typeof useAuth>);
    const { getByText, queryByText } = render(
      withProvider(
        <ReportFlagModal
          visible
          location={null}
          locationDenied
          onClose={jest.fn()}
          onCreated={jest.fn()}
        />,
      ),
    );
    expect(queryByText(ANON_LINE)).toBeNull();
    expect(getByText('Location is off for Flagstone. Turn it on above to file this report.')).toBeTruthy();
  });

  it('stays quiet for a host that CAN place manually (the signed-in map path)', () => {
    // There the recovery is a button, not a sentence — see the SW-37 suite above.
    const { queryByText } = render(
      withProvider(
        <ReportFlagModal
          visible
          location={null}
          locationDenied
          onPlaceOnMap={jest.fn()}
          onClose={jest.fn()}
          onCreated={jest.fn()}
        />,
      ),
    );
    expect(queryByText(ANON_LINE)).toBeNull();
  });
});

describe('Q17 — the location line says a human thing, the numbers are one tap away', () => {
  // Raw renders: the location props are the thing under test, so the auth mock
  // has to be set explicitly (the shared beforeEach clears calls, not returns).
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
  });

  const LOC = { lat: 49.888, lng: -119.496 };

  it('names the place in words, and does not print the coordinate by default', () => {
    const { getByText, queryByText } = render(
      withProvider(
        <ReportFlagModal visible location={LOC} onClose={jest.fn()} onCreated={jest.fn()} />,
      ),
    );
    expect(getByText('At your current location')).toBeTruthy();
    // The regression this closes: the coordinate WAS the second line of the sheet.
    expect(queryByText('49.88800, -119.49600')).toBeNull();
  });

  it('says which answer it is when the user placed the pin themselves', () => {
    const { getByText } = render(
      withProvider(
        <ReportFlagModal
          visible
          location={LOC}
          locationSource="pin"
          onClose={jest.fn()}
          onCreated={jest.fn()}
        />,
      ),
    );
    expect(getByText('At the pin you placed')).toBeTruthy();
  });

  it('Show reveals the coordinate and a copy path; Hide puts it away', () => {
    const { getByLabelText, getByText, queryByText } = render(
      withProvider(
        <ReportFlagModal visible location={LOC} onClose={jest.fn()} onCreated={jest.fn()} />,
      ),
    );
    fireEvent.press(getByLabelText('Show coordinates'));
    expect(getByText('49.88800, -119.49600')).toBeTruthy();
    expect(
      getByLabelText('Copy coordinates 49.88800 latitude, -119.49600 longitude'),
    ).toBeTruthy();
    fireEvent.press(getByLabelText('Hide coordinates'));
    expect(queryByText('49.88800, -119.49600')).toBeNull();
  });

  it('WCAG 2.5.3: the toggle’s accessible name contains its visible word', () => {
    const { getByLabelText, getByText } = render(
      withProvider(
        <ReportFlagModal visible location={LOC} onClose={jest.fn()} onCreated={jest.fn()} />,
      ),
    );
    expect(getByText('Show')).toBeTruthy();
    expect(getByLabelText('Show coordinates')).toBeTruthy();
  });

  it('offers no disclosure at all while there is no location to disclose', () => {
    const { queryByLabelText } = render(
      withProvider(
        <ReportFlagModal visible location={null} onClose={jest.fn()} onCreated={jest.fn()} />,
      ),
    );
    expect(queryByLabelText('Show coordinates')).toBeNull();
  });
});

describe('Q5 — no default severity, so every report is a judgment', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
  });

  it('arrives with nothing chosen — the five discs all read unselected', () => {
    const utils = renderAnon({ severity: null });
    for (const n of [1, 2, 3, 4, 5]) {
      const disc = utils
        .getAllByLabelText(new RegExp(`^Severity ${n}:`))
        .find((el) => el.props.accessibilityRole === 'button');
      expect(disc?.props.accessibilityState).toMatchObject({ selected: false });
    }
  });

  it('the meaning line asks instead of stating a meaning nobody chose', () => {
    const utils = renderAnon({ severity: null });
    expect(utils.getByText('Choose how hard this makes the path to use.')).toBeTruthy();
  });

  it('Submit is inert until a disc is chosen, and says why', () => {
    const utils = renderAnon({ severity: null });
    const submit = utils.getByLabelText('Submit anonymously');
    expect(submit.props.accessibilityState.disabled).toBe(true);
    expect(submit.props.accessibilityHint).toBe(
      'Choose a severity from 1 to 5 to submit this report.',
    );
  });

  it('pressing an unrated form’s Submit files nothing', async () => {
    const utils = renderAnon({ severity: null });
    fireEvent.press(utils.getByLabelText('Submit anonymously'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockCreateAnonFlag).not.toHaveBeenCalled();
  });

  it('choosing a disc lights Submit, drops the hint, and states the meaning', () => {
    const utils = renderAnon({ severity: null });
    rate(utils, 4);
    const submit = utils.getByLabelText('Submit anonymously');
    expect(submit.props.accessibilityState.disabled).toBe(false);
    expect(submit.props.accessibilityHint).toBeUndefined();
    expect(utils.queryByText('Choose how hard this makes the path to use.')).toBeNull();
    // The live region now carries the chosen level, spoken the same way it reads.
    expect(
      utils.getAllByLabelText(/^Severity 4:/).some((el) => el.props.accessibilityRole !== 'button'),
    ).toBe(true);
  });

  it('the location block still wins the hint when there is no location either', () => {
    const utils = render(
      withProvider(
        <ReportFlagModal visible location={null} onClose={jest.fn()} onCreated={jest.fn()} />,
      ),
    );
    expect(utils.getByLabelText('Submit anonymously').props.accessibilityHint).toMatch(
      /Waiting for your location/,
    );
  });

  it('a template still fills the rating in one tap (the shortcut is unaffected)', () => {
    // The suite mocks the template list to empty by default; give this one a
    // real template so the shortcut path is actually exercised.
    (validReportTemplates as jest.Mock).mockReturnValueOnce([
      { id: 't1', label: 'Snow-blocked ramp', category: 'no_ramp', severity: 4 },
    ]);
    const utils = renderAuth({ id: 'user-abc' }, { severity: null });
    expect(utils.getByLabelText('Submit report').props.accessibilityState.disabled).toBe(true);
    fireEvent.press(utils.getByLabelText('Apply template: Snow-blocked ramp'));
    expect(utils.getByLabelText('Submit report').props.accessibilityState.disabled).toBe(false);
  });
});

// ===========================================================================
// P1 — the remaining Report controls genuinely inherit XXXL Dynamic Type
//
// The earlier source guard only distinguished numeric sizes from theme tokens.
// Both still scale identically in React Native; the live failure was the finite
// maxFontSizeMultiplier that reached these Text nodes. Assert the rendered
// contract instead: undefined means the system setting is not capped.
// ===========================================================================

describe('P1 — remaining Report controls preserve their XXXL hierarchy', () => {
  it('uncaps reading content and bounds the two fixed-glyph location controls', () => {
    setFontScale(3.1);
    const utils = renderAuth(
      { id: 'user-abc' },
      {
        location: null,
        locationDenied: true,
        onRequestLocation: jest.fn(),
        onPlaceOnMap: jest.fn(),
        severity: null,
      },
    );

    for (const label of ['Report a flag', 'Location is off for Flagstone']) {
      expectUncappedText(utils.getByText(label));
    }

    for (const label of ['Use my location', 'Place the pin on the map']) {
      const node = utils.getByText(label);
      expect(node.props.maxFontSizeMultiplier).toBe(TYPE_BLOCK.chrome);
      expect(node.props.allowFontScaling).not.toBe(false);
    }

    expect(StyleSheet.flatten(utils.getByText('Place the pin on the map').props.style)).toMatchObject({
      flexShrink: 1,
    });
  });

  it('uncaps quick-fill and category labels while preserving corrected lower copy', () => {
    setFontScale(3.1);
    (validReportTemplates as jest.Mock).mockReturnValue([
      { id: 'snow-ramp', label: 'Snow-blocked ramp', category: 'no_ramp', severity: 4 },
    ]);
    const utils = renderAuth({ id: 'user-abc' }, { severity: null });

    for (const label of [
      'Quick-fill templates (optional)',
      'Snow-blocked ramp',
      'Category',
      'No ramp',
      'Broken sidewalk',
      'Blocked path',
      'Missing signal',
      'Steep grade',
      'Other',
    ]) {
      expectUncappedText(utils.getByText(label));
    }

    // Already-correct lower reading copy stays uncapped as the focused wrappers
    // above change; this is the preservation seam live QA asked us to keep.
    expectUncappedText(utils.getByText('Location is removed from your photos automatically.'));
    expectUncappedText(utils.getByText(/Your report appears on the map right away/));
  });
});

// ===========================================================================
// F4 / X7 — the picker recomposes at large type
//
// Five 44pt circles beside 40pt type read as a row of bullets: targets at the
// floor rather than at the fit, and the app's one distinctive asset shrinking
// RELATIVE to the text explaining it, at exactly the size where it should be
// biggest. Past the shared threshold the picker becomes the Legend's rows —
// the same object the user has already met, made selectable.
// ===========================================================================

describe('F4 / X7 — the picker becomes the Legend at large type', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
  });

  const bySeverity = (utils: ReturnType<typeof render>, n: number, role: string) =>
    utils
      .getAllByLabelText(new RegExp(`^Severity ${n}:`))
      .find((el) => el.props.accessibilityRole === role);

  it('at the default size the five-across discs are buttons, with no radio group', () => {
    setFontScale(1);
    const utils = renderAnon({ severity: null });
    expect(bySeverity(utils, 3, 'button')).toBeTruthy();
    expect(utils.queryByLabelText('Severity')).toBeNull();
  });

  it('at 1.5x the same five become a labelled radio group', () => {
    setFontScale(1.5);
    const utils = renderAnon({ severity: null });
    const group = utils.getByLabelText('Severity');
    expect(group.props.accessibilityRole).toBe('radiogroup');
    for (const n of [1, 2, 3, 4, 5]) {
      const row = bySeverity(utils, n, 'radio');
      expect(row).toBeTruthy();
      expect(row?.props.accessibilityState).toMatchObject({ checked: false });
    }
    // The compact discs are gone, not stacked underneath.
    expect(bySeverity(utils, 3, 'button')).toBeUndefined();
  });

  it('at XXXL all five digits scale with their discs and the selected caption is uncapped', () => {
    setFontScale(3.1);
    const utils = renderAnon({ severity: null });

    for (const n of [1, 2, 3, 4, 5]) {
      const row = bySeverity(utils, n, 'radio');
      if (!row) throw new Error(`missing severity ${n} radio row`);

      const digit = row
        .findAllByType(Text)
        .find((node) => node.props.children === n);
      if (!digit) throw new Error(`missing severity ${n} numeric digit`);
      expect(StyleSheet.flatten(digit.props.style).fontSize).toBe(font.size.base * 2);
      expect(digit.props.allowFontScaling).not.toBe(false);

      const disc = row
        .findAllByType(View)
        .find((node) => node.props.accessibilityElementsHidden === true);
      if (!disc) throw new Error(`missing severity ${n} decorative disc`);
      expect(StyleSheet.flatten(disc.props.style)).toMatchObject({ width: 64, height: 64 });
    }

    fireEvent.press(bySeverity(utils, 3, 'radio')!);
    const caption = utils
      .getAllByLabelText(/^Severity 3:/)
      .find((node) => node.props.accessibilityLiveRegion === 'polite');
    if (!caption) throw new Error('missing selected-severity caption');
    expectUncappedText(caption);

    const captionLabel = caption
      .findAllByType(Text)
      .find((node) => node.props.children === '3');
    if (!captionLabel) throw new Error('missing selected-severity caption label');
    expectUncappedText(captionLabel);
    expect(bySeverity(utils, 3, 'radio')?.props.accessibilityState).toMatchObject({ checked: true });
  });

  it('a row says exactly what the disc said — the name survives the recomposition', () => {
    setFontScale(1);
    const compact = renderAnon({ severity: null });
    const discName = bySeverity(compact, 1, 'button')?.props.accessibilityLabel;
    compact.unmount();

    setFontScale(1.5);
    const large = renderAnon({ severity: null });
    // Same authored name (number, word, meaning), different composition — so a
    // screen-reader user hears the identical thing at both text sizes.
    expect(bySeverity(large, 1, 'radio')?.props.accessibilityLabel).toBe(discName);
  });

  it('the rows rate the form exactly as the discs do, and announce checked', () => {
    setFontScale(1.5);
    const utils = renderAnon({ severity: null });
    fireEvent.press(bySeverity(utils, 5, 'radio')!);
    expect(bySeverity(utils, 5, 'radio')?.props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(
      utils.getByLabelText('Submit anonymously').props.accessibilityState.disabled,
    ).toBe(false);
  });

  it('the whole form still disables while a submit is in flight', async () => {
    setFontScale(1.5);
    mockCreateAnonFlag.mockImplementationOnce(() => new Promise(() => {}));
    const utils = renderAnon({ severity: 3 });
    fireEvent.press(utils.getByLabelText('Submit anonymously'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(bySeverity(utils, 1, 'radio')?.props.accessibilityState.disabled).toBe(true);
  });
});
