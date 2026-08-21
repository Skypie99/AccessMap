/**
 * The guards' comment stripper must not mistake a string for a comment.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * Fifteen source-scanning guard suites each carried their own copy of
 *
 *     src.replace(/\/\*[\s\S]*?\*\//g, blank)
 *
 * Three files in this app set the web file picker's MIME filter, and that
 * value's last two characters are a slash and a star. The regex read it as an
 * unclosed comment and swallowed everything up to the next closing pair
 * ANYWHERE in the file.
 *
 * It fired three times before it was fixed. Twice while `handleDispute` was
 * being written, and again on 2026-08-20, when a doc block added below the MIME
 * line blanked ~1,900 lines of FlagDetailModal and took FOUR unrelated guards
 * red at once — every `<Modal>` tag had vanished from their view.
 *
 * The workaround was a rule written into one file's comments: below that line,
 * never use a doc block. This replaces the rule with a scanner that is simply
 * correct, which is what that warning said the real fix was.
 *
 * ─── WHAT THIS ENFORCES ───────────────────────────────────────────────────
 * The first test is the exact shape of the live bug. The rest are the
 * properties the fifteen callers depend on: line numbers survive, string
 * CONTENT survives (the guards assert on labels constantly), and the awkward
 * cases degrade to "not a string" rather than eating the file.
 */
import { stripComments } from './support/stripComments';

describe('the live bug', () => {
  it('a slash-star inside a string does not open a comment', () => {
    const src = [
      "      input.accept = 'image/*';",
      "      const keep = 'me';",
      '      /** a doc block added later */',
      '      <Modal visible={x}>',
    ].join('\n');

    const out = stripComments(src);

    // Before the fix, the doc block's closing pair paired with the MIME
    // string's opening one and everything between them was blanked.
    expect(out).toContain("input.accept = 'image/*';");
    expect(out).toContain("const keep = 'me';");
    expect(out).toContain('<Modal visible={x}>');
    expect(out).not.toContain('a doc block added later');
  });

  it('the real FlagDetailModal survives a doc block below its MIME line', () => {
    // Not a fixture — the actual file, which now carries doc blocks below that
    // line again. If this drops to zero the landmine is back.
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'FlagDetailModal.tsx'),
      'utf8',
    );
    expect(src).toContain("input.accept = 'image/*';");
    const modals = stripComments(src).match(/<Modal[\s>/]/g) ?? [];
    expect(modals.length).toBeGreaterThanOrEqual(2);
  });
});

describe('the properties the callers depend on', () => {
  it('preserves line numbers', () => {
    const src = 'a\n/* two\nlines */\nb';
    const out = stripComments(src);
    expect(out.split('\n')).toHaveLength(src.split('\n').length);
    expect(out.split('\n')[3]).toBe('b');
  });

  it('preserves string contents byte-for-byte', () => {
    // Guards assert on these constantly, e.g. accessibilityLabel="Clear search".
    const src = 'accessibilityLabel="Clear search" // note';
    expect(stripComments(src)).toContain('accessibilityLabel="Clear search"');
  });

  it('blanks a JSX comment together with its braces', () => {
    // The braces matter: the previous implementation took them, and two guards
    // brace-balance across the result to find a tag's extent.
    const src = '<View>{/* hi */}</View>';
    const out = stripComments(src);
    expect(out).toHaveLength(src.length);
    expect(out).toBe('<View>' + ' '.repeat('{/* hi */}'.length) + '</View>');
  });

  it('strips line and block comments, keeping the file the same length', () => {
    expect(stripComments('x // gone').trim()).toBe('x');
    const src = 'x /* gone */ y';
    const out = stripComments(src);
    expect(out).toHaveLength(src.length);
    expect(out.replace(/ +/g, ' ')).toBe('x y');
  });

  it('does not treat an apostrophe in prose as a string', () => {
    // "don't" would otherwise open a quote that runs to the next apostrophe,
    // hiding whatever sits between them.
    const src = "// don't do this\nconst real = 1;\n// it's fine";
    const out = stripComments(src);
    expect(out).toContain('const real = 1;');
    expect(out).not.toContain('do this');
  });

  it('does not let a quote inside a regex literal swallow the file', () => {
    const src = "const re = /['\"]/g;\nconst after = 2;";
    expect(stripComments(src)).toContain('const after = 2;');
  });

  it('skips template literals, including multi-line ones', () => {
    const src = 'const t = `a /* not a comment\nstill not */ b`;\nconst after = 3;';
    const out = stripComments(src);
    expect(out).toContain('not a comment');
    expect(out).toContain('const after = 3;');
  });

  it('handles an escaped quote inside a string', () => {
    const src = "const s = 'it\\'s here'; /* gone */\nconst after = 4;";
    const out = stripComments(src);
    expect(out).toContain("it\\'s here");
    expect(out).not.toContain('gone');
    expect(out).toContain('const after = 4;');
  });

  it('an unterminated block comment blanks to end of file rather than throwing', () => {
    expect(() => stripComments('a\n/* never closed\nb')).not.toThrow();
  });
});
