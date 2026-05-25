/**
 * Tests for src/lib/accessibility.ts
 *
 * Pins the decorativeProps constant added in Item 2 (E1 carry-forward).
 * decorativeProps is the canonical triple that suppresses a purely decorative
 * element (glyph, dot, icon) from the accessibility tree on both iOS
 * (accessibilityElementsHidden) and Android (importantForAccessibility).
 *
 * If any of these values drift, decorative glyphs would re-enter the
 * screen-reader tree and VoiceOver / TalkBack would announce them aloud —
 * WCAG 1.1.1 failure.
 */

import { decorativeProps } from '../accessibility';

describe('decorativeProps', () => {
  it('exists as a constant object', () => {
    expect(decorativeProps).toBeDefined();
    expect(typeof decorativeProps).toBe('object');
  });

  it('sets accessible to false (suppresses the element from a11y tree)', () => {
    // accessible={false} is the primary mechanism on iOS to hide an element.
    expect(decorativeProps.accessible).toBe(false);
  });

  it('sets importantForAccessibility to "no-hide-descendants" (Android)', () => {
    // "no-hide-descendants" hides the element AND its subtree on Android.
    // "no" alone only hides the element itself — subtree glyph children
    // would still be announced.
    expect(decorativeProps.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('sets accessibilityElementsHidden to true (iOS subtree suppression)', () => {
    // accessibilityElementsHidden=true hides the subtree on iOS (equivalent
    // to Android's importantForAccessibility="no-hide-descendants").
    expect(decorativeProps.accessibilityElementsHidden).toBe(true);
  });

  it('has exactly the three expected properties (no extras)', () => {
    const keys = Object.keys(decorativeProps);
    expect(keys).toHaveLength(3);
    expect(keys).toContain('accessible');
    expect(keys).toContain('importantForAccessibility');
    expect(keys).toContain('accessibilityElementsHidden');
  });
});
