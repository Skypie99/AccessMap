/**
 * Blank out comments in a source file, WITHOUT mistaking a string for one.
 *
 * ─── WHY THIS EXISTS ──────────────────────────────────────────────────────
 * Fifteen guard suites in this repo read `.tsx` files as text and assert on
 * their structure. Every one of them carried its own copy of:
 *
 *     src.replace(/\/\*[\s\S]*?\*\//g, blank)
 *
 * which is fine until a source file contains a slash-star pair inside a STRING.
 * Three of them do — `FlagDetailModal`, `ReportFlagModal` and `ProfileScreen`
 * all set the web file picker's MIME filter, and that value's last two
 * characters are exactly that pair. The regex reads it as an unclosed comment
 * and swallows everything up to the next closing pair anywhere in the file.
 *
 * That is not theoretical. It has fired three times:
 *   - twice while `handleDispute` was being written (recorded in the warning
 *     comment above that function), and
 *   - on 2026-08-20, when a doc block added below the MIME line for SW-49's
 *     disabled-style note blanked ~1,900 lines and took FOUR unrelated guards
 *     red at once — the dismissal standard, sheet-pull, the keyboard class and
 *     the accessible-parent trap. Every `<Modal>` tag in the file had vanished
 *     from their view.
 *
 * The workaround until now was a rule written into the source: below the MIME
 * assignment, comments must be `//` form and must never spell either two-
 * character sequence. That rule worked, but it is a landmine that has to be
 * remembered by every future editor of three specific files, and the warning
 * only exists in one of them.
 *
 * So the scanners learned to skip strings instead, which is what that warning
 * said was the real fix.
 *
 * ─── CONTRACT ─────────────────────────────────────────────────────────────
 * Comments become spaces; NEWLINES ARE PRESERVED, so `line` numbers computed
 * from the result still match the file. Everything else — string contents
 * included — is returned byte-for-byte, because the guards assert on string
 * literals (`accessibilityLabel="Clear search"`) constantly.
 *
 * A `{...}` wrapper around a JSX comment is blanked with it, reproducing the
 * previous implementation's first pass exactly.
 *
 * Deliberately NOT a full parser. A regex literal containing a quote (`/['"]/`)
 * would confuse a naive scanner, so single- and double-quoted strings must
 * close ON THE SAME LINE — which real JS strings do — and an unterminated quote
 * is treated as an ordinary character rather than swallowing the rest of the
 * file. Template literals may span lines, as they must.
 */
export function stripComments(src: string): string {
  const out = src.split('');
  const n = src.length;
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
  };

  let i = 0;
  while (i < n) {
    const c = src[i];

    // ── quoted string: skip whole, so a slash-star inside it is just text ──
    if (c === "'" || c === '"') {
      const nl = src.indexOf('\n', i);
      const lineEnd = nl === -1 ? n : nl;
      let j = i + 1;
      let closed = -1;
      while (j < lineEnd) {
        if (src[j] === '\\') {
          j += 2;
          continue;
        }
        if (src[j] === c) {
          closed = j;
          break;
        }
        j++;
      }
      // Unterminated on this line: not a string (most likely an apostrophe in
      // prose, or a quote inside a regex literal). Treat it as one character.
      i = closed === -1 ? i + 1 : closed + 1;
      continue;
    }

    if (c === '`') {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') {
          j += 2;
          continue;
        }
        if (src[j] === '`') break;
        j++;
      }
      i = j >= n ? n : j + 1;
      continue;
    }

    // ── block comment ──
    if (c === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      const end = close === -1 ? n : close + 2;
      // `{/* ... */}` — take the braces too, as the previous implementation did.
      const jsxOpen = src[i - 1] === '{' ? i - 1 : i;
      const jsxClose = src[end] === '}' && jsxOpen === i - 1 ? end + 1 : end;
      blank(jsxOpen, jsxClose);
      i = jsxClose;
      continue;
    }

    // ── line comment ──
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      const end = nl === -1 ? n : nl;
      blank(i, end);
      i = end;
      continue;
    }

    i++;
  }

  return out.join('');
}
