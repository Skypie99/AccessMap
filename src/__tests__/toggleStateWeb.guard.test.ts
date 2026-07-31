/**
 * TOGGLE-STATE guard (A11Y-216 — 4.1.2 on the web surface).
 *
 * Chromium DROPS `aria-selected` from the accessibility tree on
 * `role="button"`. A chip that carries `{ selected }` therefore looks selected
 * to the eye and announces NO state to a web screen reader — and web is the
 * only surface a guest has. `aria-pressed` IS honored on role=button in every
 * browser, so `a11yToggle({ pressed })` is the correct dialect there; it
 * mirrors the value into the nested `accessibilityState.selected`, so native
 * VoiceOver announces exactly what it always did. Additive, not a redesign.
 *
 * T11/BP2 migrated 9 sites in 2 files and stopped; adoption was unguarded and
 * 14 sites stayed behind. This scan is class-wide so the next chip cannot join
 * them: every `accessibilityRole="button"` in src/ is parsed out of the source
 * and checked.
 *
 * NOT flagged, correctly: genuine `tab` / `radio` / `checkbox` / `switch`
 * roles, where `selected`/`checked` is the right trait and browsers honor it.
 * The rule is about the MISMATCH between role=button and a selected trait, not
 * about the trait itself.
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

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (['__tests__', '__mocks__', 'node_modules'].includes(e.name)) continue;
      out.push(...walkTsx(path.join(dir, e.name)));
    } else if (e.name.endsWith('.tsx')) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

/** `selected` in KEY position — `pressed: selected` is the FIXED form. */
const KEY_SELECTED = /[{,]\s*selected\s*(?::|,|\})/;

interface Hit {
  rel: string;
  line: number;
  excerpt: string;
}

function scan(): { hits: Hit[]; buttons: number } {
  const hits: Hit[] = [];
  let buttons = 0;

  for (const file of walkTsx(SRC)) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const rel = path.relative(SRC, file);
    const tagRe = /<(Pressable|PressableScale|TouchableOpacity|View)\b/g;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(src))) {
      const start = m.index;
      let depth = 0;
      let j = start;
      while (j < src.length) {
        const c = src[j];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0) break;
        j++;
      }
      const tag = src.slice(start, j + 1);
      if (!/accessibilityRole="button"/.test(tag)) continue;
      buttons++;
      const bag =
        /a11yToggle\(\{([\s\S]*?)\}\)/.exec(tag) ||
        /accessibilityState=\{\{([\s\S]*?)\}\}/.exec(tag);
      if (!bag) continue;
      if (!KEY_SELECTED.test('{' + bag[1] + '}')) continue;
      hits.push({
        rel,
        line: src.slice(0, start).split('\n').length,
        excerpt: tag.replace(/\s+/g, ' ').slice(0, 120),
      });
    }
  }
  return { hits, buttons };
}

describe('A11Y-216 — role="button" never carries a `selected` trait', () => {
  const { hits, buttons } = scan();

  it('scanned a real population of buttons (scanner-rot tripwire)', () => {
    // ~150 role=button tags at adoption time. A broken parser reports zero
    // violations, which is indistinguishable from success without this.
    expect(buttons).toBeGreaterThanOrEqual(80);
  });

  it('every toggle-ish button uses `pressed` so web screen readers hear state', () => {
    if (hits.length) {
      const report = hits.map((h) => `${h.rel}:${h.line}\n     ${h.excerpt}`).join('\n\n');
      throw new Error(
        `${hits.length} button(s) announce NO state to web screen readers — Chromium ` +
          `drops aria-selected on role=button (WCAG 4.1.2):\n\n${report}\n\n` +
          `Fix: a11yToggle({ pressed: <same value> }). It emits aria-pressed for ` +
          `web AND mirrors into accessibilityState.selected, so native is unchanged. ` +
          `If the control is genuinely a tab/radio/checkbox, give it that ROLE instead.`,
      );
    }
    expect(hits).toHaveLength(0);
  });
});
