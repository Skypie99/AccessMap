/**
 * DECORATIVE-HIDING guard (A11Y-234 / F-22 — 1.3.1 + 4.1.2 on the web surface).
 *
 * THE FACT THIS EXISTS FOR: `accessibilityElementsHidden` and
 * `importantForAccessibility` DO NOTHING in react-native-web. Neither is
 * translated to anything; the element stays in the browser's accessibility
 * tree exactly as it was. Only `aria-hidden` covers all three platforms — and
 * `decorativeProps` (src/lib/accessibility.ts) is the one spelling that
 * carries all three, which is why the fix is "adopt the helper", not "add
 * another prop".
 *
 * The ledger proved this the hard way: a shipped "Sort:" label carrying both
 * native props still appeared in the web ARIA tree. Before this train, 125
 * sites used the native-only pair and just 8 used the helper — so most
 * "hidden" decoration was hidden on iOS and Android and leaked to every web
 * screen-reader user, who are also the only cohort a guest can be.
 *
 * WHAT THIS GUARD ENFORCES: no NEW site may hide decoration with the
 * native-only pair. It scans the source, not a list, so the next one fails
 * here rather than in the next audit.
 *
 * THE REMAINING ALLOWANCE, stated honestly: sites using
 * `importantForAccessibility="no"` (hides the element but NOT its subtree) are
 * a genuinely different semantic from decorativeProps' "no-hide-descendants",
 * so this train did not rewrite them by machine. They are counted, capped, and
 * listed below so the number can only go down.
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

interface Site {
  rel: string;
  line: number;
  tagName: string;
  variant: 'no-hide-descendants' | 'no' | 'lone';
}

function scan(): { sites: Site[]; helperUses: number } {
  const sites: Site[] = [];
  let helperUses = 0;

  for (const file of walkTsx(SRC)) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const rel = path.relative(SRC, file);
    helperUses += (src.match(/\{\.\.\.decorativeProps\}/g) ?? []).length;

    const tagRe = /<([A-Z][\w.]*)\b/g;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(src))) {
      const tagName = m[1];
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
      if (!/\baccessibilityElementsHidden\b/.test(tag)) continue;
      const variant: Site['variant'] = /importantForAccessibility="no-hide-descendants"/.test(tag)
        ? 'no-hide-descendants'
        : /importantForAccessibility="no"(?!-)/.test(tag)
          ? 'no'
          : 'lone';
      sites.push({ rel, line: src.slice(0, start).split('\n').length, tagName, variant });
    }
  }
  return { sites, helperUses };
}

describe('A11Y-234 — decorative content is hidden on the WEB too, not just on native', () => {
  const { sites, helperUses } = scan();

  it('the helper is broadly adopted (it was 8 sites before this train)', () => {
    expect(helperUses).toBeGreaterThanOrEqual(60);
  });

  it('no site hides decoration with the exact native-only pair the helper replaces', () => {
    const offenders = sites.filter((s) => s.variant === 'no-hide-descendants');
    if (offenders.length) {
      const report = offenders.map((o) => `${o.rel}:${o.line}  <${o.tagName}>`).join('\n');
      throw new Error(
        `${offenders.length} site(s) hide decoration with accessibilityElementsHidden +\n` +
          `importantForAccessibility="no-hide-descendants". BOTH are no-ops in\n` +
          `react-native-web, so this content still reaches web screen readers.\n\n` +
          `${report}\n\nFix: spread {...decorativeProps} instead — it carries both\n` +
          `native props AND aria-hidden, which is the only one the web honours.`,
      );
    }
    expect(offenders).toHaveLength(0);
  });

  it('the "no" variant is capped and can only shrink', () => {
    // These hide the element but NOT its subtree — a different semantic from
    // the helper, so this train left them to human judgement rather than
    // rewriting them by machine. 13 at adoption time (2026-07-31).
    const remaining = sites.filter((s) => s.variant === 'no' || s.variant === 'lone');
    expect(remaining.length).toBeLessThanOrEqual(15);
  });
});
