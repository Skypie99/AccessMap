/**
 * EmptyState — the one recipe, and the mark that replaced nine glyphs.
 *
 * The render half is real (the primitive mounts with only a theme). The
 * ADOPTION half is a source scan across the estate, because the nine surfaces
 * that used to draw their own version each need a modal, a list and a network
 * to mount — and what is being protected is that none of them kept its old
 * hand-rolled block.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';
import { AppText } from '../AppText';

const SRC = path.join(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('the recipe', () => {
  it('renders the heading alone when a surface has one honest sentence', () => {
    const { getByText, queryByText } = render(<EmptyState title="No matches" />);
    expect(getByText('No matches')).toBeTruthy();
    expect(queryByText('undefined')).toBeNull();
  });

  it('renders heading then body then action, in that order', () => {
    const { getByText } = render(
      <EmptyState
        title="No reports here yet."
        body="You could add the first."
        action={<AppText variant="label">Report a barrier</AppText>}
      />,
    );
    expect(getByText('No reports here yet.')).toBeTruthy();
    expect(getByText('You could add the first.')).toBeTruthy();
    expect(getByText('Report a barrier')).toBeTruthy();
  });

  it('the mark is decorative — it says nothing a screen reader has to hear', () => {
    const { queryByLabelText, toJSON } = render(<EmptyState title="Nothing here" />);
    expect(queryByLabelText(/stone|path|disc/i)).toBeNull();
    // Five stones are drawn, and every one of them is inside the hidden mark.
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('borderStyle');
  });

  it('announces only when the surface asks it to', () => {
    const quiet = render(<EmptyState title="Nothing here" />);
    expect(quiet.toJSON()).toBeTruthy();
    const loud = render(<EmptyState live title="No matches" />);
    expect(JSON.stringify(loud.toJSON())).toContain('polite');
  });

  it('a caller can swap the mark — the one documented exception', () => {
    const { getByText } = render(
      <EmptyState title="All caught up" mark={<AppText>SPARKLE</AppText>} />,
    );
    expect(getByText('SPARKLE')).toBeTruthy();
  });

  it('keeps the default line length unless a constrained adopter opts out', () => {
    const normal = render(<EmptyState title="Nothing here" body="Helpful explanation" />);
    expect(StyleSheet.flatten(normal.getByText('Helpful explanation').props.style)).toMatchObject({
      maxWidth: 280,
    });

    const wide = render(
      <EmptyState title="Nothing here" body="Helpful explanation" bodyStyle={{ maxWidth: '100%' }} />,
    );
    expect(StyleSheet.flatten(wide.getByText('Helpful explanation').props.style)).toMatchObject({
      maxWidth: '100%',
    });
  });
});

describe('adoption — nobody kept their own version', () => {
  const ADOPTERS = [
    'screens/HomeScreen.tsx',
    'screens/TasksScreen.tsx',
    'components/MyReportsModal.tsx',
    'components/MyWatchedModal.tsx',
    'components/ActivityFeedModal.tsx',
    'components/HiddenCommentsModal.tsx',
    'components/AchievementsModal.tsx',
    'components/ReportsBreakdownCard.tsx',
  ];

  it.each(ADOPTERS)('%s renders the shared block', (rel) => {
    expect(read(rel)).toContain('<EmptyState');
  });

  it.each(ADOPTERS)('%s kept no hand-rolled empty-state type', (rel) => {
    const src = read(rel);
    // The old per-site styles. Their absence is what proves the adoption is
    // real and not a second block added beside the first.
    expect(src).not.toMatch(/emptyTitle: \{/);
    expect(src).not.toMatch(/emptyBody: \{/);
    expect(src).not.toMatch(/emptySubtitle: \{/);
  });

  it('Achievements gained the empty state it never had', () => {
    const src = read('components/AchievementsModal.tsx');
    expect(src).toMatch(/grouped\.length === 0 \? \(\s*\n\s*<EmptyState/);
  });

  it('the breakdown card explains a failure instead of vanishing', () => {
    const src = read('components/ReportsBreakdownCard.tsx');
    expect(src).not.toMatch(/if \(error\) return null;/);
    expect(src).toMatch(/Couldn't load your breakdown/);
    expect(src).toContain('setRetryTick');
  });
});

describe('C6 — a failure is red, a notice is amber', () => {
  it('MyWatched separates the failed refresh from the removed-flags notice', () => {
    const src = read('components/MyWatchedModal.tsx');
    // The notice keeps amber…
    expect(src).toMatch(/missingBanner: \{ backgroundColor: color\.warningBg/);
    // …and the failure gets its own red banner rather than sharing it.
    expect(src).toMatch(/refreshErrorBanner: \{ backgroundColor: color\.errorBg/);
    expect(src).toMatch(/styles\.refreshErrorBanner/);
  });

  it('HiddenComments renders its failed re-read in the failure palette', () => {
    const src = read('components/HiddenCommentsModal.tsx');
    expect(src).toMatch(/noticeBanner: \{\s*\n\s*backgroundColor: color\.errorBg/);
    expect(src).toMatch(/noticeText: \{[^}]*color: color\.errorFg/);
  });

  it('the two modals that already got it right are unchanged', () => {
    expect(read('components/MyReportsModal.tsx')).toMatch(/errorBanner: \{\s*\n\s*backgroundColor: color\.errorBg/);
    expect(read('components/ActivityFeedModal.tsx')).toMatch(/errorBanner: \{\s*\n\s*backgroundColor: color\.errorBg/);
  });
});

describe('the skeleton stops lying about the size of what is coming', () => {
  it('bar heights follow the reader’s text size', () => {
    const src = read('components/ui/Skeleton.tsx');
    expect(src).toContain('PixelRatio.getFontScale()');
    expect(src).toMatch(/height=\{scaledLine\(font\.size\.base\)\}/);
    expect(src).toMatch(/height=\{scaledLine\(font\.size\.sm\)\}/);
    // Non-vacuity: the unscaled form is gone from both presets.
    expect(src).not.toMatch(/height=\{font\.size\.(base|sm)\}/);
  });
});
