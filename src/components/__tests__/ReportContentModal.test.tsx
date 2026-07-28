/**
 * ReportContentModal — the submit ladder, rung by rung.
 *
 * WHY THIS SUITE EXISTS EVEN THOUGH src/components/** IS COVERAGE-EXCLUDED.
 * The ladder is the only part of the B-1 report path that jest can see end to
 * end: `reports.ts` proves the envelope, and the dismissal census proves the
 * chrome, but NOTHING else proves that a failed insert actually falls through
 * to the mailto half carrying the SAME envelope — or, more importantly, that a
 * failure never renders as success. `submitContentReport` maps 'skipped' to
 * `failed` precisely so the surface can branch on it; a surface that ignored
 * that mapping would be green everywhere and silently drop reports under the
 * live rate-limit trigger.
 *
 * It also pins the honesty fence at the render layer: the diagnostic reason is
 * DIAGNOSTIC ONLY, so a raw PostgREST string must be logged and never drawn.
 *
 * Strategy: stub only the two I/O edges (`submitContentReport`, `sendFeedback`)
 * and `notify`. `buildReportBody`, `REPORT_FEEDBACK_CATEGORY` and the copy
 * strings stay REAL, so the rung-2 assertion compares against the production
 * envelope rather than against a fixture that could drift from it.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ReportContentModal from '../ReportContentModal';
import { buildReportBody, type ReportTarget, type SubmitReportResult } from '@/lib/reports';
import type { SendFeedbackResult } from '@/lib/feedback';
import {
  REPORT_FAILED_TITLE,
  REPORT_SENT_BODY,
  REPORT_SENT_TITLE,
  reportFailedBody,
} from '@/lib/copy';

// ---------------------------------------------------------------------------
// Mock: @/lib/reports — only the network edge. buildReportBody and the
// constants stay real so the envelope assertion is a real round trip.
// ---------------------------------------------------------------------------
const mockSubmitContentReport = jest.fn<Promise<SubmitReportResult>, [unknown]>();
jest.mock('@/lib/reports', () => {
  const actual = jest.requireActual('@/lib/reports');
  return {
    ...actual,
    submitContentReport: (...args: [unknown]) => mockSubmitContentReport(...args),
  };
});

// ---------------------------------------------------------------------------
// Mock: @/lib/feedback — only sendFeedback. FEEDBACK_EMAIL stays real so the
// rung-3 message is compared against the address the app really ships.
// ---------------------------------------------------------------------------
const mockSendFeedback = jest.fn<Promise<SendFeedbackResult>, [unknown]>();
jest.mock('@/lib/feedback', () => {
  const actual = jest.requireActual('@/lib/feedback');
  return {
    ...actual,
    sendFeedback: (...args: [unknown]) => mockSendFeedback(...args),
  };
});

const mockNotify = jest.fn();
jest.mock('@/lib/confirm', () => ({ notify: (...a: unknown[]) => mockNotify(...a) }));

jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));

jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});
jest.mock('@/theme', () => jest.requireActual('@/theme'));

jest.mock('@/lib/accessibility', () => ({
  useReducedMotion: jest.fn(() => false),
  // GlassSurface reads this to pick blur vs the Reduce-Transparency state.
  useReduceTransparency: jest.fn(() => false),
  // Focus is a native no-op here; the hook only has to hand back a ref.
  useFocusOnOpen: jest.fn(() => ({ current: null })),
  a11yToggle: jest.requireActual('@/lib/accessibility').a11yToggle,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const COMMENT_TARGET: ReportTarget = {
  kind: 'comment',
  id: '11111111-1111-4111-8111-111111111111',
  flagId: '22222222-2222-4222-8222-222222222222',
};
const REASON = 'This comment is abusive.';
/** Raw provider text — diagnostic only, must never reach the screen. */
const DIAGNOSTIC = 'PGRST301: rate limit exceeded';

function renderSheet(overrides: Partial<React.ComponentProps<typeof ReportContentModal>> = {}) {
  const onClose = jest.fn();
  const utils = render(
    <ReportContentModal visible target={COMMENT_TARGET} onClose={onClose} {...overrides} />,
  );
  return { ...utils, onClose };
}

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  // The ladder logs the diagnostic on every failed rung. Silenced so the run
  // stays readable, and asserted where it matters.
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('ReportContentModal — presentation', () => {
  it('does not present until it has a target', () => {
    const { queryByTestId } = renderSheet({ target: null });
    expect(queryByTestId('reportContentModal-backdrop')).toBeNull();
  });

  it('presents once a target arrives', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('reportContentModal-backdrop')).toBeTruthy();
  });

  it('offers no report-category picker — the taxonomy is not ours to author', () => {
    const { queryByText } = renderSheet();
    for (const word of ['Spam', 'Harassment', 'Hate speech', 'Nudity', 'Violence']) {
      expect(queryByText(word)).toBeNull();
    }
  });
});

describe('ReportContentModal — canSend', () => {
  it('blocks send until the reason has non-whitespace content', () => {
    const { getByTestId } = renderSheet();
    const send = getByTestId('reportContentModal-send');
    expect(send.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(getByTestId('reportContentModal-reason'), '     ');
    expect(send.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(getByTestId('reportContentModal-reason'), REASON);
    expect(send.props.accessibilityState.disabled).toBe(false);
  });
});

describe('ReportContentModal — the submit ladder', () => {
  it('rung 1: a submitted insert shows the acknowledgement and stops there', async () => {
    mockSubmitContentReport.mockResolvedValue({ status: 'submitted' });
    const { getByTestId, getByText } = renderSheet();

    fireEvent.changeText(getByTestId('reportContentModal-reason'), REASON);
    fireEvent.press(getByTestId('reportContentModal-send'));

    await waitFor(() => expect(getByText(REPORT_SENT_TITLE)).toBeTruthy());
    expect(getByText(REPORT_SENT_BODY)).toBeTruthy();
    expect(mockSubmitContentReport).toHaveBeenCalledWith({
      target: COMMENT_TARGET,
      reason: REASON,
      userId: 'user-1',
    });
    // The mailto rung is a FALLBACK, not a dual-write: a landed insert must not
    // also open the user's mail composer.
    expect(mockSendFeedback).not.toHaveBeenCalled();
  });

  it('rung 2: a failed insert falls through to the mailto half with the SAME envelope', async () => {
    mockSubmitContentReport.mockResolvedValue({ status: 'failed', reason: DIAGNOSTIC });
    mockSendFeedback.mockResolvedValue({ status: 'opened' });
    const { getByTestId, onClose } = renderSheet();

    fireEvent.changeText(getByTestId('reportContentModal-reason'), REASON);
    fireEvent.press(getByTestId('reportContentModal-send'));

    await waitFor(() => expect(mockSendFeedback).toHaveBeenCalled());
    // EXACTLY the body, and NOTHING else. This assertion used to include
    // `category: 'other'` and was pinning a defect: buildMailtoUrl prepends
    // `Category: <Label>\n\n` whenever a category is passed, so the email began
    // `Category: Other\n\n[REPORT] v1 …` and the sentinel Sky triages on was no
    // longer the first thing in the message. This rung only ever runs when the
    // insert already failed — most plausibly the C-7 anon throttle, 30/h global
    // and shared with ordinary feedback — so it is the path where a report is
    // most likely to be missed and the marker has to lead. The DB half still
    // carries category 'other'; only the mail drops it.
    expect(mockSendFeedback).toHaveBeenCalledWith({
      body: buildReportBody(COMMENT_TARGET, REASON),
    });
    // The composer opened; the user still has to press send in their mail app,
    // so this rung must NOT claim the report was sent.
    expect(onClose).toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('rung 3: both rungs fail — the address is named, the sheet stays open, the reason survives', async () => {
    mockSubmitContentReport.mockResolvedValue({ status: 'failed', reason: DIAGNOSTIC });
    mockSendFeedback.mockResolvedValue({ status: 'unavailable', url: 'mailto:x' });
    const { getByTestId, onClose } = renderSheet();

    fireEvent.changeText(getByTestId('reportContentModal-reason'), REASON);
    fireEvent.press(getByTestId('reportContentModal-send'));

    await waitFor(() => expect(mockNotify).toHaveBeenCalled());
    expect(mockNotify).toHaveBeenCalledWith(
      REPORT_FAILED_TITLE,
      reportFailedBody('skylerhalisky@gmail.com'),
    );
    // Staying open is the point: the typed reason is still recoverable.
    expect(onClose).not.toHaveBeenCalled();
    expect(getByTestId('reportContentModal-reason').props.value).toBe(REASON);
  });

  it('logs the provider diagnostic and never renders it', async () => {
    mockSubmitContentReport.mockResolvedValue({ status: 'failed', reason: DIAGNOSTIC });
    mockSendFeedback.mockResolvedValue({ status: 'unavailable', url: 'mailto:x' });
    const { getByTestId, queryByText } = renderSheet();

    fireEvent.changeText(getByTestId('reportContentModal-reason'), REASON);
    fireEvent.press(getByTestId('reportContentModal-send'));

    await waitFor(() => expect(mockNotify).toHaveBeenCalled());
    expect(warnSpy).toHaveBeenCalledWith('[report] insert failed:', DIAGNOSTIC);
    expect(queryByText(DIAGNOSTIC)).toBeNull();
    expect(queryByText(new RegExp('PGRST'))).toBeNull();
  });
});

describe('ReportContentModal — reset', () => {
  it('clears the reason and the acknowledgement when the sheet closes', async () => {
    mockSubmitContentReport.mockResolvedValue({ status: 'submitted' });
    const onClose = jest.fn();
    const { getByTestId, getByText, queryByText, rerender } = render(
      <ReportContentModal visible target={COMMENT_TARGET} onClose={onClose} />,
    );

    fireEvent.changeText(getByTestId('reportContentModal-reason'), REASON);
    fireEvent.press(getByTestId('reportContentModal-send'));
    await waitFor(() => expect(getByText(REPORT_SENT_TITLE)).toBeTruthy());

    rerender(<ReportContentModal visible={false} target={COMMENT_TARGET} onClose={onClose} />);
    rerender(<ReportContentModal visible target={COMMENT_TARGET} onClose={onClose} />);

    // A blank form, not the last report's leftovers.
    expect(queryByText(REPORT_SENT_TITLE)).toBeNull();
    expect(getByTestId('reportContentModal-reason').props.value).toBe('');
    expect(getByTestId('reportContentModal-send').props.accessibilityState.disabled).toBe(true);
  });
});
