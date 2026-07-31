/**
 * LABEL-IN-NAME guard (A11Y-215 — WCAG 2.5.3, Level A).
 *
 * "For user interface components with labels that include text, the name
 * contains the text that is presented visually."
 *
 * WHO THIS IS FOR. Voice-control users say what they see: "tap Try again".
 * If the button's accessible name is "Retry loading leaderboard", the command
 * does nothing and there is no feedback explaining why — the control is simply
 * inert to them. It is also a plain coherence bug: two names for one control.
 *
 * THIS IS A CLASS-WIDE SCAN, NOT A LIST OF SITES. Every labelled pressable in
 * src/ is parsed out of the source on each run and checked against the visible
 * text inside it, so a NEW mismatch fails here instead of waiting for the next
 * audit. That is the difference between fixing 16 findings and closing the
 * class.
 *
 * THE RULE, precisely: the accessible name must contain AT LEAST ONE of the
 * visible strings, compared after normalization (case-folded, `&`→`and`,
 * decorative arrows/ellipses and punctuation stripped, whitespace collapsed).
 * "At least one" is what makes a card row legal: its visible LABEL is the
 * title, and the supporting subtitle underneath is description, not label —
 * requiring the name to contain the subtitle too would manufacture failures
 * and force bloated names nobody wants to hear read aloud.
 *
 * OUT OF SCOPE, deliberately: dynamic labels (template literals — the visible
 * text is dynamic too, and the pair can only be judged at runtime) and
 * icon-only controls (no visible text to contain). Those are the device
 * script's business, not a static scanner's.
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

/** Fold both sides to the form a voice-control engine would compare. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '')
    .replace(/&/g, ' and ')
    .replace(/[→←…—–]/g, ' ')
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Violation {
  rel: string;
  line: number;
  label: string;
  visible: string[];
}

const PRESSABLES = ['Pressable', 'PressableScale', 'TouchableOpacity'];

function scan(): { violations: Violation[]; checked: number } {
  const violations: Violation[] = [];
  let checked = 0;

  for (const file of walkTsx(SRC)) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const rel = path.relative(SRC, file);

    for (const name of PRESSABLES) {
      const tagRe = new RegExp(`<${name}\\b`, 'g');
      let m: RegExpExecArray | null;
      while ((m = tagRe.exec(src))) {
        const start = m.index;
        let depth = 0;
        let j = start;
        let selfClosing = false;
        while (j < src.length) {
          const c = src[j];
          if (c === '{') depth++;
          else if (c === '}') depth--;
          else if (c === '>' && depth === 0) {
            selfClosing = src[j - 1] === '/';
            break;
          }
          j++;
        }
        if (selfClosing) continue;
        const tag = src.slice(start, j + 1);
        const lm = /accessibilityLabel="([^"]+)"/.exec(tag);
        if (!lm) continue; // dynamic or unlabelled — out of scope (see docblock)
        const label = lm[1];

        // Body = up to the matching close tag at nesting depth 0.
        const rest = src.slice(j + 1);
        const openRe = new RegExp(`<${name}\\b`, 'g');
        const closeRe = new RegExp(`</${name}>`, 'g');
        let nest = 0;
        let pos = 0;
        let end = -1;
        while (pos < rest.length) {
          openRe.lastIndex = pos;
          closeRe.lastIndex = pos;
          const o = openRe.exec(rest);
          const c = closeRe.exec(rest);
          if (!c) break;
          if (o && o.index < c.index) {
            nest++;
            pos = o.index + 1;
            continue;
          }
          if (nest === 0) {
            end = c.index;
            break;
          }
          nest--;
          pos = c.index + 1;
        }
        if (end === -1) continue;

        const body = rest.slice(0, end);
        const texts: string[] = [];
        const textRe = /<AppText\b[^>]*>([\s\S]*?)<\/AppText>/g;
        let t: RegExpExecArray | null;
        while ((t = textRe.exec(body))) {
          const inner = t[1].trim();
          if (!inner || inner.includes('{')) continue; // dynamic text
          texts.push(inner.replace(/\s+/g, ' '));
        }
        const visible = texts.map(norm).filter(Boolean);
        if (!visible.length) continue; // icon-only

        checked++;
        const nLabel = norm(label);
        if (!visible.some((v) => nLabel.includes(v))) {
          violations.push({
            rel,
            line: src.slice(0, start).split('\n').length,
            label,
            visible: texts,
          });
        }
      }
    }
  }
  return { violations, checked };
}

describe('A11Y-215 — SC 2.5.3 Label in Name', () => {
  const { violations, checked } = scan();

  it('scanned a real population of labelled controls (scanner-rot tripwire)', () => {
    // 60 static label/visible-text pairs at adoption time (2026-07-31). A sharp
    // drop means the parser broke, not that the app got smaller — and a broken
    // parser reports zero violations, which looks exactly like success.
    expect(checked).toBeGreaterThanOrEqual(40);
  });

  it('every accessible name contains its visible label', () => {
    if (violations.length) {
      const report = violations
        .map(
          (v) =>
            `${v.rel}:${v.line}\n     name:    "${v.label}"\n     visible: ${v.visible
              .map((s) => `"${s}"`)
              .join(', ')}`,
        )
        .join('\n\n');
      throw new Error(
        `${violations.length} control(s) whose accessible name does not contain the ` +
          `visible text a voice-control user would speak (WCAG 2.5.3):\n\n${report}\n\n` +
          `Fix by making the name CONTAIN the visible string — put any extra ` +
          `context after it, or in accessibilityHint.`,
      );
    }
    expect(violations).toHaveLength(0);
  });
});
