/**
 * FV-1/FV-3/FV-4 source contracts that layout-only Jest cannot measure.
 *
 * Behavior of the shared focus helper is covered in its hook suite. These
 * assertions pin each bounded consumer to the mechanism and keep the large-
 * type recomposition local instead of drifting into a global typography rule.
 */
import fs from 'fs';
import path from 'path';

import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const read = (relativePath: string) =>
  stripComments(fs.readFileSync(path.join(SRC, relativePath), 'utf8'));

describe('FV-1 — focused fields stay in their owning scroller', () => {
  it('Address Search scrolls the full body, including its focused input', () => {
    const src = read('components/AddressSearchModal.tsx');

    expect(src).toMatch(
      /<ScrollView[\s\S]*?ref=\{bodyScrollRef\}[\s\S]*?<TextInput[\s\S]*?onFocus=\{searchReveal\.onFocus\}[\s\S]*?\{results\.map/,
    );
    expect(src).not.toContain('<FlatList');
    expect(src).toMatch(
      /body:\s*\{[^}]*flexGrow:\s*1[^}]*flexShrink:\s*1[^}]*minHeight:\s*0/,
    );
    expect(src).toContain('accessibilityLabel="Address search"');
  });

  it('Feedback wires both fields without replacing existing focus cues', () => {
    const src = read('components/FeedbackModal.tsx');

    expect(src).toContain('bodyReveal.onFocus();');
    expect(src).toContain('contactReveal.onFocus();');
    expect(src).toContain('setBodyFocused(true);');
    expect(src).toContain('setContactFocused(true);');
    expect(src).toMatch(
      /body:\s*\{[^}]*flexGrow:\s*1[^}]*flexShrink:\s*1[^}]*minHeight:\s*0/,
    );
    expect(src).toContain('accessibilityLabel="Feedback message"');
    expect(src).toContain('accessibilityLabel="Reply email"');
  });

  it('Report reveals the description and keeps the body shrink-scrollable', () => {
    const src = read('screens/ReportFlagModal.tsx');

    expect(src).toMatch(
      /accessibilityRole="header">Description \(optional\)<\/AppText>[\s\S]*?<TextInput[\s\S]*?onFocus=\{descriptionReveal\.onFocus\}/,
    );
    expect(src).toMatch(
      /scrollContent:\s*\{[^}]*flexGrow:\s*0[^}]*flexShrink:\s*1[^}]*minHeight:\s*0/,
    );
    expect(src).toContain('accessibilityLabel="Description of the accessibility issue"');
  });
});

describe('FV-3 — local Dynamic Type hierarchy and recomposition', () => {
  it('Profile gives each navigation group one uncapped content policy and scales its glyphs modestly', () => {
    const src = read('screens/ProfileScreen.tsx');

    expect(src.match(/<TypeBlock cap=\{TYPE_BLOCK\.content\}>/g)).toHaveLength(2);
    expect(src).toMatch(
      /const navChevronSize = Math\.round\([\s\S]*?Math\.max\(1, Math\.min\(fontScale, TYPE_BLOCK\.header\)\)/,
    );
    expect(src).toContain('size={navChevronSize}');
  });

  it('Leaderboard moves points below the name at the accessibility recompose threshold', () => {
    const src = read('screens/LeaderboardScreen.tsx');

    expect(src).toContain('const axRecompose = isAxRecompose(fontScale);');
    expect(src).toMatch(
      /rowContentAx:\s*\{[^}]*flexDirection:\s*'column'[^}]*alignItems:\s*'stretch'/,
    );
    expect(src).toMatch(/nameWrapAx:\s*\{[^}]*flex:\s*0[^}]*alignSelf:\s*'stretch'/);
    expect(src).toMatch(/pointsAx:\s*\{[^}]*minWidth:\s*0[^}]*textAlign:\s*'left'/);
    expect(src).toMatch(
      /AVATAR_SIZE \* Math\.max\(1, Math\.min\(fontScale, TYPE_BLOCK\.chrome\)\)/,
    );
  });

  it('caps only the bounded helper and input chrome in the keyboard forms', () => {
    const address = read('components/AddressSearchModal.tsx');
    const feedback = read('components/FeedbackModal.tsx');
    const report = read('screens/ReportFlagModal.tsx');

    expect(address.match(/maxFontSizeMultiplier=\{TYPE_BLOCK\.header\}/g)).toHaveLength(2);
    expect(feedback).toMatch(
      /style=\{styles\.subtitle\}[\s\S]*?maxFontSizeMultiplier=\{TYPE_BLOCK\.header\}/,
    );
    expect(report).toMatch(
      /<TypeBlock cap=\{TYPE_BLOCK\.chrome\}>\s*\{!location && onRequestLocation/,
    );
  });
});
