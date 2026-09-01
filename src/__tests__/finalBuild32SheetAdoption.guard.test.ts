/**
 * Build 32 bounded stabilization census. These source guards keep the affected
 * surfaces on the one shared Sheet/SheetPull lifecycle instead of silently
 * drifting back to compact hand-rolled Modals.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');
const read = (relativePath: string) =>
  fs.readFileSync(path.join(SRC, relativePath), 'utf8');

describe('Build 32 affected-sheet adoption', () => {
  const expandedSheets = [
    'components/MyReportsModal.tsx',
    'components/ActivityFeedModal.tsx',
    'components/MyFeedbackModal.tsx',
    'components/HelpModal.tsx',
    'components/ChangelogModal.tsx',
    'components/SavedPlacesModal.tsx',
    'components/AddressSearchModal.tsx',
  ];

  it.each(expandedSheets)('%s uses the shared expanded presentation', (file) => {
    const source = read(file);
    expect(source).toContain('<Sheet');
    expect(source).toContain('presentation="expanded"');
  });

  it.each([
    'components/MyFeedbackModal.tsx',
    'components/HelpModal.tsx',
    'components/AddressSearchModal.tsx',
  ])('%s no longer owns a competing hand-rolled Modal', (file) => {
    expect(read(file)).not.toContain('<Modal');
  });

  it('Filter flags uses the shared expanded, scroll-aware sheet', () => {
    const source = read('screens/MapScreen.tsx');
    expect(source).toContain('testID="mapFilterSheet"');
    expect(source).toContain('presentation="expanded"');
    expect(source).toContain('<GestureScrollView');
    expect(source).toContain('atTop={filterAtTop}');
  });

  it('Saved Places and text-entry sheets disarm pull while the keyboard is visible', () => {
    for (const file of [
      'components/SavedPlacesModal.tsx',
      'components/MyFeedbackModal.tsx',
      'components/HelpModal.tsx',
      'components/AddressSearchModal.tsx',
    ]) {
      expect(read(file)).toContain('pullEnabled={!');
      expect(read(file)).toContain('keyboardVisible');
    }
  });

  it('Address Search helper uses a scalable line-height token', () => {
    const source = read('components/AddressSearchModal.tsx');
    expect(source).toContain('Type at least 3 characters. Results come from OpenStreetMap.');
    expect(source).toContain('lineHeight: font.lineHeight.sm');
  });

  it('About Flagstone remains the native page-sheet reference control', () => {
    const source = read('screens/AboutScreen.tsx');
    expect(source).toContain('presentationStyle="pageSheet"');
    expect(source).toContain('allowSwipeDismissal');
  });
});
