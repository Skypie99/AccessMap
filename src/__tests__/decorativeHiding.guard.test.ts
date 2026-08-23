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
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');


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
  variant: 'covered' | 'no' | 'lone';
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
      // THE INVARIANT: does this tag reach the web at all? Either the
      // decorativeProps spread or a literal aria-hidden supplies it.
      const coversWeb = /\{\.\.\.decorativeProps\}/.test(tag) || /\baria-hidden\b/.test(tag);
      const variant: Site['variant'] = coversWeb
        ? 'covered'
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
    expect(helperUses).toBeGreaterThanOrEqual(90);
  });

  it('every native-only hide also reaches the web (decorativeProps or aria-hidden)', () => {
    const leaks = sites.filter((s) => s.variant !== 'covered');
    // 15 remain, all CONTAINERS (View / FlatList / SectionList) or dynamic
    // conditional hides, where "no" vs "no-hide-descendants" is a real
    // semantic difference and a machine must not decide it. They can only
    // shrink from here — this cap is the ratchet.
    expect(leaks.length).toBeLessThanOrEqual(15);
  });

  it('no LEAF element hides itself with native-only props', () => {
    // Leaves have no subtree, so the variants collapse and decorativeProps is
    // exactly equivalent — there is no judgement call left to make, which is
    // why leaves are held to the strict rule and containers are not.
    const CONTAINER = /^(View|FlatList|SectionList|ScrollView|Pressable|PressableScale|TouchableOpacity|Animated\.|GlassSurface|SafeAreaView|KeyboardAvoidingView|Modal|RemoteImage)/;
    const leafLeaks = sites.filter((s) => s.variant !== 'covered' && !CONTAINER.test(s.tagName));
    if (leafLeaks.length) {
      const report = leafLeaks.map((o) => `${o.rel}:${o.line}  <${o.tagName}>`).join('\n');
      throw new Error(
        `${leafLeaks.length} decorative LEAF element(s) are hidden on native only —\n` +
          `react-native-web honours neither accessibilityElementsHidden nor\n` +
          `importantForAccessibility, so they still reach web screen readers:\n\n` +
          `${report}\n\nFix: spread {...decorativeProps}.`,
      );
    }
    expect(leafLeaks).toHaveLength(0);
  });
});

/**
 * D16 — A SPREAD WRITTEN INSIDE A COMMENT IS NOT A SPREAD.
 *
 * Two files carried `{...decorativeProps}` as the last words of an explanatory
 * comment (`PlatformMap` had one too, since fixed). Each comment correctly
 * described what should happen — "the raw decimals add no value for SR users",
 * "the card already announces loading" — and the code did none of it. The
 * elements stayed in the accessibility tree, announced exactly as the comment
 * said they should not be.
 *
 * This is the nastiest shape a defect can take in this codebase: it typechecks,
 * it passes every other guard, it reads as DONE to a reviewer skimming for the
 * helper's name, and `grep decorativeProps` finds it and reports success. The
 * only thing that distinguishes a real spread from a described one is whether
 * a comment marker sits to its left.
 *
 * So the rule is the simplest possible statement of that: comments are
 * stripped, then the helper's spread is counted. Every occurrence that
 * survives stripping is real; any that vanish were prose.
 */
describe('D16 — decorativeProps is applied, never merely described', () => {
  const SPREAD = '{...decorativeProps}';

  it('no file mentions the spread only inside a comment', () => {
    const offenders: string[] = [];
    for (const file of walkTsx(SRC)) {
      const raw = fs.readFileSync(file, 'utf8');
      if (!raw.includes(SPREAD)) continue;
      const rel = path.relative(SRC, file);
      const raws = raw.split(SPREAD).length - 1;
      const live = stripComments(raw).split(SPREAD).length - 1;
      if (live < raws) {
        offenders.push(
          `${rel} → ${raws - live} of ${raws} \`${SPREAD}\` occurrence(s) sit inside a ` +
            `comment, where they do nothing. Apply them, or delete the words.`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it('and the scan is not vacuous — the helper really is spread across the estate', () => {
    let live = 0;
    for (const file of walkTsx(SRC)) {
      live += stripComments(fs.readFileSync(file, 'utf8')).split(SPREAD).length - 1;
    }
    // 100+ at the time of writing. A collapse here means the helper was
    // renamed and this rule quietly stopped covering anything.
    expect(live).toBeGreaterThanOrEqual(60);
  });
});
