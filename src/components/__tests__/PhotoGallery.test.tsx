/**
 * PhotoGallery component tests — Gary, Phase 4 multi-photo coverage.
 *
 * PhotoGallery renders a horizontal strip of photo thumbnails with an optional
 * "add" tile and a full-screen swipeable lightbox. Tests cover:
 *
 *   1. Thumbnails       — one imagebutton per photo, correct a11y labels
 *   2. Empty state      — placeholder shows when there are no photos & no adder
 *   3. Add button       — shown only when onAddPhoto given AND count < maxPhotos
 *   4. maxPhotos        — default 5 and custom values gate the add button
 *   5. Interaction      — add button fires onAddPhoto; thumbnail opens lightbox
 *
 * Mock notes:
 *   - useColor is mocked to the static light palette so no ThemeProvider is
 *     needed (same convention as FlagCard.test.tsx).
 *   - PhotoGallery is purely presentational — no supabase mock required.
 */

import React from 'react';
import { Modal } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import PhotoGallery, { type GalleryPhoto } from '../PhotoGallery';

// useColor → static light palette so render() works without a provider.
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return {
    useColor: () => color,
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function photos(n: number): GalleryPhoto[] {
  return Array.from({ length: n }, (_, i) => ({
    url: `https://cdn/photo-${i}.jpg`,
    position: i,
  }));
}

// ---------------------------------------------------------------------------
// 1. Thumbnails
// ---------------------------------------------------------------------------

describe('PhotoGallery — thumbnails', () => {
  it('renders one imagebutton thumbnail per photo', () => {
    const { getAllByRole } = render(<PhotoGallery photos={photos(3)} />);
    // Thumbnails use accessibilityRole="imagebutton"; the add tile (absent in
    // read-only mode) would be role="button", so this counts thumbnails only.
    expect(getAllByRole('imagebutton')).toHaveLength(3);
  });

  it('labels each thumbnail "Photo N of total"', () => {
    const { getByLabelText } = render(<PhotoGallery photos={photos(2)} />);
    expect(getByLabelText('Photo 1 of 2')).toBeTruthy();
    expect(getByLabelText('Photo 2 of 2')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. Empty state
// ---------------------------------------------------------------------------

describe('PhotoGallery — empty state', () => {
  it('shows the "No photos" placeholder when there are no photos and no adder', () => {
    const { getByText, getByLabelText, queryAllByRole } = render(
      <PhotoGallery photos={[]} />,
    );
    expect(getByText('No photos')).toBeTruthy();
    expect(getByLabelText('No photos attached')).toBeTruthy();
    expect(queryAllByRole('imagebutton')).toHaveLength(0);
  });

  it('does NOT show the empty placeholder when an add tile is available', () => {
    // photos=[] but onAddPhoto present → the add tile fills the list, so the
    // ListEmptyComponent must not render.
    const { queryByText, getByLabelText } = render(
      <PhotoGallery photos={[]} onAddPhoto={() => {}} />,
    );
    expect(queryByText('No photos')).toBeNull();
    expect(getByLabelText('Add another photo')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 3. Add button visibility
// ---------------------------------------------------------------------------

describe('PhotoGallery — add button', () => {
  it('shows the add tile when onAddPhoto is provided and count < maxPhotos', () => {
    const { getByLabelText } = render(
      <PhotoGallery photos={photos(2)} onAddPhoto={() => {}} />,
    );
    expect(getByLabelText('Add another photo')).toBeTruthy();
  });

  it('hides the add tile when onAddPhoto is omitted (read-only mode)', () => {
    const { queryByLabelText } = render(<PhotoGallery photos={photos(2)} />);
    expect(queryByLabelText('Add another photo')).toBeNull();
  });

  it('hides the add tile once the default max (5) is reached', () => {
    const { queryByLabelText, getAllByRole } = render(
      <PhotoGallery photos={photos(5)} onAddPhoto={() => {}} />,
    );
    expect(getAllByRole('imagebutton')).toHaveLength(5);
    expect(queryByLabelText('Add another photo')).toBeNull();
  });

  it('exposes "N of max" progress in the add tile hint', () => {
    const { getByLabelText } = render(
      <PhotoGallery photos={photos(2)} onAddPhoto={() => {}} />,
    );
    const addTile = getByLabelText('Add another photo');
    expect(addTile.props.accessibilityHint).toContain('2 of 5');
  });
});

// ---------------------------------------------------------------------------
// 4. Custom maxPhotos
// ---------------------------------------------------------------------------

describe('PhotoGallery — custom maxPhotos', () => {
  it('still shows the add tile below a custom max', () => {
    const { getByLabelText } = render(
      <PhotoGallery photos={photos(1)} onAddPhoto={() => {}} maxPhotos={2} />,
    );
    expect(getByLabelText('Add another photo')).toBeTruthy();
  });

  it('hides the add tile at a custom max', () => {
    const { queryByLabelText } = render(
      <PhotoGallery photos={photos(2)} onAddPhoto={() => {}} maxPhotos={2} />,
    );
    expect(queryByLabelText('Add another photo')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Interaction
// ---------------------------------------------------------------------------

describe('PhotoGallery — interaction', () => {
  it('calls onAddPhoto when the add tile is pressed', () => {
    const onAddPhoto = jest.fn();
    const { getByLabelText } = render(
      <PhotoGallery photos={photos(1)} onAddPhoto={onAddPhoto} />,
    );
    fireEvent.press(getByLabelText('Add another photo'));
    expect(onAddPhoto).toHaveBeenCalledTimes(1);
  });

  it('opens the lightbox modal when a thumbnail is tapped', () => {
    const { getByLabelText, UNSAFE_getByType } = render(
      <PhotoGallery photos={photos(2)} />,
    );
    // Lightbox Modal starts hidden.
    expect(UNSAFE_getByType(Modal).props.visible).toBe(false);

    fireEvent.press(getByLabelText('Photo 1 of 2'));

    // Tapping a thumbnail flips the Modal to visible.
    expect(UNSAFE_getByType(Modal).props.visible).toBe(true);
  });
});
