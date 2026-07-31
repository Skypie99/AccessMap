/**
 * KEYBOARD-AVOIDANCE guard (A11Y-228, 2.4.11-class).
 *
 * Three bottom-anchored sheets take text input with no keyboard avoidance —
 * on iOS the keyboard rises over the EXACT input being typed into (two of
 * them autoFocus, so it happens the moment the form appears). Every other
 * input surface in the app carries the AddressSearchModal KAV recipe ("KAV
 * lifts the sheet above the keyboard…"); this guard pins the three late
 * adopters so the class stays closed:
 *
 *   1. SavedPlacesModal   — add-place name input (autoFocus)
 *   2. FilterPresetsModal — create + rename inputs (both autoFocus)
 *   3. FlagDetailModal    — comment box at the very bottom of the body
 *                           ScrollView → automaticallyAdjustKeyboardInsets
 *                           (the iOS scroll-inset answer; a KAV wrap would
 *                           fight the pageSheet's own layout)
 *
 * BLIND SPOTS, stated: source-pinned presence, not runtime geometry — whether
 * the lifted input clears the keyboard on hardware is device row N-10. Android
 * Modals don't resize by default (no softwareKeyboardLayoutMode set) — known
 * caveat, iOS is the submission target.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');

function stripComments(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank);
}

const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

describe('A11Y-228 guard — text-input sheets avoid the keyboard', () => {
  it.each(['components/SavedPlacesModal.tsx', 'components/FilterPresetsModal.tsx'])(
    '%s wraps its sheet in the house KAV recipe',
    (rel) => {
      const src = read(rel);
      expect(src).toContain('<KeyboardAvoidingView');
      expect(src).toMatch(/behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
    },
  );

  it('FlagDetailModal body ScrollView adjusts its insets for the comment box', () => {
    const src = read('components/FlagDetailModal.tsx');
    expect(src).toContain('automaticallyAdjustKeyboardInsets');
  });
});
