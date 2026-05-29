/**
 * WatchedFlagsSearch — tests for the search bar and filter UX in the
 * Watched Flags flow.
 *
 * Coverage strategy:
 *  - SearchInputRow (the reusable component behind the search bar) is tested
 *    directly here. It's a pure React Native component with no Supabase or
 *    native-device dependencies, so all cases can be fully exercised.
 *  - filterWatchedFlags / filterWatchedFlagsByStatus (the filter logic) are
 *    tested exhaustively in src/lib/__tests__/watchedFlagsFilter.test.ts.
 *    This file does not duplicate that coverage.
 *  - MyWatchedModal integration tests (mounting the full modal, loading flags
 *    from storage, async state changes) are marked todo — they require a live
 *    Supabase mock and a react-navigation fixture that is out of scope here.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SearchInputRow from '@/components/SearchInputRow';

// SearchInputRow calls useColor() which calls useColorScheme() from RN.
// Mock the whole ThemeContext module so the hook returns a minimal palette
// without touching the native appearance bridge.
jest.mock('@/theme/ThemeContext', () => ({
  useColor: () => ({
    surfaceSoft: '#f5f5f5',
    borderSubtle: '#ccc',
    textStrong: '#111',
    textMuted: '#888',
    placeholderText: '#aaa',
  }),
}));

// decorativeProps marks glyph Views as non-accessible. We only need the
// shape (an object), not the real implementation, in these tests.
jest.mock('@/lib/accessibility', () => ({
  decorativeProps: { accessible: false, importantForAccessibility: 'no' },
}));

// ---------------------------------------------------------------------------
// Controlled wrapper — lets tests drive value/onChangeText/onClear via state
// ---------------------------------------------------------------------------
function Controlled({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <SearchInputRow
      value={value}
      onChangeText={setValue}
      onClear={() => setValue('')}
      placeholder="Search watched flags…"
      accessibilityLabel="Search watched flags"
    />
  );
}

// ---------------------------------------------------------------------------
describe('SearchInputRow — renders search bar', () => {
  it('renders the TextInput with the supplied placeholder', () => {
    render(<Controlled />);
    expect(screen.getByPlaceholderText('Search watched flags…')).toBeTruthy();
  });

  it('exposes the correct accessibilityLabel on the TextInput', () => {
    render(<Controlled />);
    expect(screen.getByLabelText('Search watched flags')).toBeTruthy();
  });

  it('does NOT render the clear button when the value is empty', () => {
    render(<Controlled initial="" />);
    expect(screen.queryByLabelText('Clear search')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('SearchInputRow — filters by text', () => {
  it('reflects typed text back in the input', () => {
    render(<Controlled />);
    const input = screen.getByLabelText('Search watched flags');
    fireEvent.changeText(input, 'broken');
    expect(input.props.value).toBe('broken');
  });

  it('shows the clear button once text is present', () => {
    render(<Controlled initial="broken" />);
    expect(screen.getByLabelText('Clear search')).toBeTruthy();
  });

  it('the clear button carries accessibilityRole="button"', () => {
    render(<Controlled initial="some text" />);
    const clearBtn = screen.getByLabelText('Clear search');
    expect(clearBtn.props.accessibilityRole).toBe('button');
  });
});

// ---------------------------------------------------------------------------
describe('SearchInputRow — clears filter', () => {
  it('hides the clear button after pressing it', () => {
    render(<Controlled initial="hello" />);
    const clearBtn = screen.getByLabelText('Clear search');
    fireEvent.press(clearBtn);
    expect(screen.queryByLabelText('Clear search')).toBeNull();
  });

  it('resets the input value to empty after clear', () => {
    render(<Controlled initial="hello" />);
    fireEvent.press(screen.getByLabelText('Clear search'));
    const input = screen.getByLabelText('Search watched flags');
    expect(input.props.value).toBe('');
  });
});

// ---------------------------------------------------------------------------
describe('SearchInputRow — shows empty state (integration stubs)', () => {
  it.todo(
    'MyWatchedModal shows "No watched flags match" when search yields no results',
  );

  it.todo(
    'MyWatchedModal shows all flags again after clearing an active search',
  );
});

// ---------------------------------------------------------------------------
describe('WatchedFlags status filter (integration stubs)', () => {
  it.todo('status chip "Open" filters list to only open flags');
  it.todo('status chip "Resolved" filters list to only resolved flags');
  it.todo('"All" chip returns the full unfiltered list');
  it.todo('combining a text query with a status chip narrows results further');
});
