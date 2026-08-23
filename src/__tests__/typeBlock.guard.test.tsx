/**
 * T3 GUARD — Dynamic Type caps belong to containers, not to roles.
 *
 * ─── THE INVERSION THIS PINS SHUT ─────────────────────────────────────────
 * AppText caps per VARIANT: display 1.3 · heading 1.5 · label 1.6 · body
 * uncapped. Each call site looks careful; the SCREEN inverts. A 15pt heading
 * capped at 1.5x stops at 22.5pt while the 14pt body under it, uncapped, passes
 * it at ~1.6x and keeps going to 3.1x. Between those sizes every capped heading
 * in the app is drawn SMALLER than the body it labels — measured on the 17e at
 * accessibility-extra-large on Home, the Legend, Settings, Nearby and the report
 * form (design-reviews/art-direction/2026-08-21/sections/02_critic_pass1.md,
 * blocks X2/X6/X7/X8/X10).
 *
 * Three things have to stay true for the fix to hold, and each is a describe
 * block below:
 *   1. text OUTSIDE a block still resolves the variant table, byte-identical —
 *      otherwise adopting a block on one screen would silently re-type the other
 *      thirty-nine;
 *   2. text INSIDE a block shares the block's cap whatever its variant — that is
 *      the whole rule;
 *   3. no call site inside a block hands back a SMALLER explicit cap, which
 *      would re-create the inversion one prop at a time.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { AppText, type AppTextVariant, VARIANT_MAX_FONT_MULTIPLIER } from '@/components/ui/AppText';
import { TypeBlock, TYPE_BLOCK } from '@/components/ui/TypeBlock';

const SRC = path.join(__dirname, '..');

const VARIANTS: AppTextVariant[] = [
  'display', 'heading', 'body', 'bodyMedium', 'label', 'mono', 'monoMedium', 'monoBold',
];

const capOf = (ui: React.ReactElement) => {
  const { UNSAFE_getAllByType } = render(ui);
  return UNSAFE_getAllByType(Text)[0].props.maxFontSizeMultiplier;
};

describe('(1) outside a block — the variant table is untouched', () => {
  // This is the compatibility contract. If it ever fails, every screen that has
  // NOT adopted a block has been re-typed by accident.
  it.each(VARIANTS)('%s resolves its historical cap', (variant) => {
    expect(capOf(<AppText variant={variant}>x</AppText>)).toBe(
      VARIANT_MAX_FONT_MULTIPLIER[variant],
    );
  });

  it('the table itself still holds the shipped numbers', () => {
    expect(VARIANT_MAX_FONT_MULTIPLIER).toEqual({
      display: 1.3, heading: 1.5, body: undefined, bodyMedium: undefined,
      label: 1.6, mono: 1.4, monoMedium: 1.4, monoBold: 1.4,
    });
  });
});

describe('(2) inside a block — one container, one multiplier', () => {
  it.each(VARIANTS)('header block caps %s at 1.6', (variant) => {
    expect(
      capOf(<TypeBlock cap={TYPE_BLOCK.header}><AppText variant={variant}>x</AppText></TypeBlock>),
    ).toBe(1.6);
  });

  it.each(VARIANTS)('chrome block caps %s at 1.3', (variant) => {
    expect(
      capOf(<TypeBlock cap={TYPE_BLOCK.chrome}><AppText variant={variant}>x</AppText></TypeBlock>),
    ).toBe(1.3);
  });

  it.each(VARIANTS)('content block leaves %s uncapped, overriding the variant table', (variant) => {
    // The half that a plain `??` chain would get wrong: a `label` inside a card
    // must scale with the body beside it, so the block's `undefined` has to BEAT
    // the variant's 1.6 rather than fall through to it.
    expect(
      capOf(<TypeBlock cap={TYPE_BLOCK.content}><AppText variant={variant}>x</AppText></TypeBlock>),
    ).toBeUndefined();
  });

  it('a heading is never capped below the body it labels (the inversion, directly)', () => {
    const { UNSAFE_getAllByType } = render(
      <TypeBlock cap={TYPE_BLOCK.header}>
        <AppText variant="display" size={40}>Title</AppText>
        <AppText variant="body">subtitle</AppText>
      </TypeBlock>,
    );
    const [title, subtitle] = UNSAFE_getAllByType(Text);
    const t = title.props.maxFontSizeMultiplier ?? Infinity;
    const s = subtitle.props.maxFontSizeMultiplier ?? Infinity;
    expect(t).toBeGreaterThanOrEqual(s);
  });

  it('an explicit prop still wins over the block (fixed boxes keep their own cap)', () => {
    expect(
      capOf(
        <TypeBlock cap={TYPE_BLOCK.content}>
          <AppText variant="body" maxFontSizeMultiplier={1.2}>7</AppText>
        </TypeBlock>,
      ),
    ).toBe(1.2);
  });

  it('the nearest block wins when blocks nest', () => {
    expect(
      capOf(
        <TypeBlock cap={TYPE_BLOCK.header}>
          <TypeBlock cap={TYPE_BLOCK.chrome}><AppText variant="body">x</AppText></TypeBlock>
        </TypeBlock>,
      ),
    ).toBe(1.3);
  });

  it('TypeBlock renders no view of its own (adopting one cannot move a pixel)', () => {
    // Shape, not props: the cap is SUPPOSED to differ. What must not differ is
    // the host tree — if TypeBlock ever rendered a View, wrapping an existing
    // layout in one would change flex behaviour on forty screens at once.
    const shape = (tree: unknown): unknown => {
      if (Array.isArray(tree)) return tree.map(shape);
      if (tree && typeof tree === 'object') {
        const t = tree as { type?: unknown; props?: { style?: unknown }; children?: unknown };
        return { type: t.type, style: t.props?.style, children: shape(t.children) };
      }
      return tree;
    };
    const withBlock = render(
      <TypeBlock cap={TYPE_BLOCK.header}><AppText>x</AppText></TypeBlock>,
    ).toJSON();
    const without = render(<AppText>x</AppText>).toJSON();
    expect(shape(withBlock)).toEqual(shape(without));
  });
});

describe('(3) adoption — the blocks are actually mounted, and nothing shrinks inside one', () => {
  const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

  it('ScreenHeader wraps eyebrow + title + subtitle in ONE header block', () => {
    const src = read('components/ui/ScreenHeader.tsx');
    expect(src).toContain('<TypeBlock cap={TYPE_BLOCK.header}>');
    // One block, not three.
    expect(src.split('<TypeBlock').length - 1).toBe(1);
    // ...and it encloses all three texts: the block opens before the eyebrow and
    // closes after the subtitle.
    const open = src.indexOf('<TypeBlock');
    const close = src.indexOf('</TypeBlock>');
    for (const anchor of ['styles.eyebrow', 'styles.title', 'styles.subtitle']) {
      const at = src.indexOf(anchor);
      expect(`${anchor} inside the block: ${at > open && at < close}`).toBe(
        `${anchor} inside the block: true`,
      );
    }
  });

  it("ScreenHeader's title auto-fit estimates at the cap it actually renders at", () => {
    // The coupling that would have broken silently: the width estimate used the
    // display variant's 1.3, but the header block now renders the title at 1.6.
    const src = read('components/ui/ScreenHeader.tsx');
    expect(src).toContain('const DISPLAY_MAX_FONT_SCALE = TYPE_BLOCK.header;');
    expect(src).not.toMatch(/const DISPLAY_MAX_FONT_SCALE = 1\.3/);
  });

  it('no AppText inside a TypeBlock hands back a SMALLER explicit cap', () => {
    // A smaller explicit cap inside a block re-creates the inversion one prop at
    // a time. Explicit caps stay legal for FIXED BOXES (discs, badges) — those
    // are sized by their circle, not by their container — so they must sit
    // OUTSIDE a block or be listed here by name and reviewed.
    //
    // The scan tracks nesting properly rather than slicing first-open to
    // last-close: the naive version flagged ReportFlagModal's severity-digit cap
    // (a fixed box, genuinely outside both of that file's blocks) simply because
    // it sat between them.
    const FIXED_BOX_EXEMPT = new Set<string>();
    const offenders: string[] = [];

    for (const file of adopters()) {
      const src = fs.readFileSync(file, 'utf8');
      const rel = path.relative(SRC, file);

      // Token stream of the three things that matter, in source order.
      const tokens = [
        ...src.matchAll(/<TypeBlock cap=\{TYPE_BLOCK\.(\w+)\}/g),
        ...src.matchAll(/<\/TypeBlock>/g),
        ...src.matchAll(/maxFontSizeMultiplier=\{([\d.]+)\}/g),
      ].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

      const stack: (number | undefined)[] = [];
      for (const t of tokens) {
        if (t[0].startsWith('</')) {
          stack.pop();
        } else if (t[0].startsWith('<TypeBlock')) {
          const name = t[1] as 'header' | 'chrome' | 'content';
          stack.push({ header: 1.6, chrome: 1.3, content: undefined }[name]);
        } else {
          const cap = stack[stack.length - 1];
          if (stack.length === 0) continue;          // not in a block at all
          if (cap === undefined) continue;           // content block: see the note below
          if (Number(t[1]) < cap && !FIXED_BOX_EXEMPT.has(`${rel}:${t[1]}`)) {
            offenders.push(`${rel} caps at ${t[1]} inside a block capped ${cap}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('inside a CONTENT block, an explicit cap is a fixed box and is listed', () => {
    // A content block caps nothing, so every explicit cap under one is
    // numerically "smaller" and the rule above cannot judge it. The ones that
    // exist are enumerated here instead, so a new one has to be argued for.
    const found: string[] = [];
    for (const file of adopters()) {
      const src = fs.readFileSync(file, 'utf8');
      if (!src.includes('TYPE_BLOCK.content')) continue;
      for (const m of src.matchAll(/maxFontSizeMultiplier=\{([\d.]+)\}/g)) {
        found.push(`${path.relative(SRC, file)}:${m[1]}`);
      }
    }
    // SeverityDisc pins its own cap in its own file (DISC_MAX_FONT_SCALE), which
    // is why the discs inside the Legend and Nearby content blocks do not appear
    // here — a fixed box should carry its cap with it, not at every call site.
    //
    // RE-PINNED (GSP-06). ReportFlagModal joined this list when its large-type
    // severity picker gained a content block (the Legend's rows, made
    // selectable). The 1.3 it carries is NOT on anything inside that block: it
    // is on the COMPACT picker's digit, in the other branch of the same
    // ternary, which is a hand-rolled fixed 44x44 circle rather than a
    // SeverityDisc — so it is precisely the fixed-box case this list exists to
    // enumerate, and its rationale has been stated at that call site since the
    // XXL review. The two branches are never mounted together.
    expect(found).toEqual(['screens/ReportFlagModal.tsx:1.3']);
  });
});

/**
 * Every file that MOUNTS a block. The two primitive files are excluded by name:
 * TypeBlock.tsx and AppText.tsx both spell the element out in their doc comments,
 * which is documentation, not adoption.
 */
function PRIMITIVES() {
  return ['components/ui/TypeBlock.tsx', 'components/ui/AppText.tsx'];
}

function adopters(): string[] {
  const files = walk(SRC)
    .filter((f) => f.endsWith('.tsx') && !f.includes('__tests__'))
    .filter((f) => !PRIMITIVES().includes(path.relative(SRC, f)))
    .filter((f) => fs.readFileSync(f, 'utf8').includes('<TypeBlock cap={TYPE_BLOCK.'));
  // Non-vacuity for the whole describe: if adoption is ever reverted wholesale,
  // both scans above would pass against an empty list and say nothing.
  expect(files.length).toBeGreaterThanOrEqual(5);
  return files;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
