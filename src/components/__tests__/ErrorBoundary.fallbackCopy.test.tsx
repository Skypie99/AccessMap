/**
 * SW-31 — the crash screen must not send you somewhere that is also crashed.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * The screen-level fallback read:
 *
 *   "You can try again, or switch to another tab and come back."
 *
 * That second clause is advice to walk into the same wall. When the crashing
 * state lives ABOVE this boundary — the SW-47 realtime re-subscribe was exactly
 * that, a channel shared across every host of one flag — the other tabs are
 * already dead too. The single workaround the copy named was the one thing
 * guaranteed not to work, offered at the moment the user has least patience for
 * being wrong.
 *
 * ─── WHAT THIS DELIBERATELY DOES NOT TOUCH ────────────────────────────────
 * SW-31 originally claimed "Try again re-crashes instantly, only a full relaunch
 * recovers". SW-48 corrected that: under auth, one tap recovered cleanly to Home
 * with zero re-crash lines in the console, twice. The premise did not hold, so
 * the recovery path is left exactly as it is and this suite asserts that "Try
 * again" is still offered — the fix here is only the false half of the finding.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import ErrorBoundary from '../ErrorBoundary';

function Boom(): React.ReactElement {
  throw new Error('boom');
}

/** React logs caught render errors; the boundary logs its own line too. */
function renderCrashed(variant: 'screen' | 'app') {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    return render(
      <ErrorBoundary variant={variant}>
        <Boom />
      </ErrorBoundary>,
    );
  } finally {
    spy.mockRestore();
  }
}

describe('SW-31 — the screen-level fallback', () => {
  it('no longer offers another tab as the way out', () => {
    const { queryByText } = renderCrashed('screen');
    expect(queryByText(/switch to another tab/i)).toBeNull();
  });

  it('says the honest thing instead', () => {
    const { getByText } = renderCrashed('screen');
    expect(
      getByText('You can try again. If it keeps happening, close and reopen the app.'),
    ).toBeTruthy();
  });

  it('still offers Try again (SW-48: it works — do not remove it)', () => {
    const { getByLabelText } = renderCrashed('screen');
    expect(getByLabelText('Try again')).toBeTruthy();
  });
});

describe('SW-31 — the app-level fallback is untouched', () => {
  it('keeps its own wording, which was never the false one', () => {
    // Non-vacuity for the assertions above: only the `screen` variant carried
    // the bad advice, and the two strings must not be collapsed into one.
    const { getByText } = renderCrashed('app');
    expect(
      getByText(
        'The app hit an unexpected problem and stopped. Try again, or close and reopen the app if it keeps happening.',
      ),
    ).toBeTruthy();
  });
});
