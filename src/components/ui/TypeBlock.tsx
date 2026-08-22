/**
 * TypeBlock — Dynamic Type caps belong to CONTAINERS, not to roles (rule T3).
 *
 * ─── THE BUG THIS FIXES ────────────────────────────────────────────────────
 * `AppText` caps scaling per VARIANT: display 1.3 · heading 1.5 · label 1.6 ·
 * body uncapped. Read one call site at a time that looks careful. Read a whole
 * screen and it inverts: a 15pt heading capped at 1.5x reaches 22.5pt while the
 * 14pt body under it, uncapped, sails past it at 2.3x. Between roughly 1.5x and
 * 3.1x every capped heading in the app sits SMALLER than the body it labels —
 * the Home subtitle, the Legend rows, the Settings rows, the Nearby cards, the
 * report form's meaning line
 * (design-reviews/art-direction/2026-08-21/sections/02_critic_pass1.md, X2/X6/X7/X8/X10).
 *
 * The rule that removes the whole class: every text inside one container shares
 * ONE multiplier, so a heading can never be capped below the body it labels.
 *
 * ─── THE CONTAINERS ────────────────────────────────────────────────────────
 *   header  1.6  eyebrow + title + subtitle of an editorial screen header
 *   chrome  1.3  bars, tab labels, chips, count pills — no room to grow
 *   content  --  cards, rows, sheets: uncapped, bounded by the width rule (T5)
 *   (fixed boxes — discs, badges — keep their per-site caps; they are sized by
 *    their box, not by their block.)
 *
 * ─── RESOLUTION ORDER ──────────────────────────────────────────────────────
 *   explicit `maxFontSizeMultiplier` prop  >  nearest TypeBlock  >  variant table
 *
 * The variant table stays as the default for text OUTSIDE a block, so every
 * screen that has not adopted a block renders byte-identical to before. Adoption
 * is per-container and reversible.
 *
 * `content` is deliberately `undefined`-meaning-uncapped rather than absent: a
 * `content` block must be able to OVERRIDE a variant's cap (a `label` inside a
 * card should scale with the body beside it). That is why the context carries a
 * wrapper object — `null` means "no block, use the variant table", while
 * `{ cap: undefined }` means "a block that caps nothing".
 *
 * Usage:
 *   <TypeBlock cap={TYPE_BLOCK.header}>
 *     <AppText variant="body">eyebrow</AppText>
 *     <AppText variant="display" size={40}>Title</AppText>
 *     <AppText variant="body">subtitle</AppText>
 *   </TypeBlock>
 *
 * Rule T3, the 2026-08-21 art-direction plan (§08_design_system_rules.md).
 */

import React from 'react';

/**
 * The named container caps. Keep these as the only numbers any adopter passes —
 * a raw multiplier at a call site is how the per-role drift started.
 */
export const TYPE_BLOCK = {
  /** Editorial screen header: eyebrow + title + subtitle. */
  header: 1.6,
  /** Bars, tab labels, chips, count pills — chrome with no room to grow. */
  chrome: 1.3,
  /** Cards, rows, sheets. Uncapped; the width rule (T5) bounds it instead. */
  content: undefined,
} as const;

/**
 * `null` = no enclosing block (fall through to AppText's variant table).
 * `{ cap: undefined }` = an enclosing block that caps nothing.
 */
export type TypeBlockValue = { readonly cap: number | undefined };

export const TypeBlockContext = React.createContext<TypeBlockValue | null>(null);

interface TypeBlockProps {
  /** One of TYPE_BLOCK.*. `undefined` means the block caps nothing. */
  cap: number | undefined;
  children: React.ReactNode;
}

/**
 * Supplies one Dynamic Type cap to every `AppText` beneath it.
 *
 * Renders NOTHING — no View, no layout, no style. It is a context provider only,
 * so wrapping an existing tree in it cannot move a single pixel at default text
 * size. Nesting is allowed; the nearest block wins.
 */
export function TypeBlock({ cap, children }: TypeBlockProps) {
  // Identity-stable per cap value, so adopting a block does not re-render every
  // AppText beneath it on each parent render.
  const value = React.useMemo<TypeBlockValue>(() => ({ cap }), [cap]);
  return <TypeBlockContext.Provider value={value}>{children}</TypeBlockContext.Provider>;
}

/** The nearest block's cap, or `null` when there is no enclosing block. */
export function useTypeBlock(): TypeBlockValue | null {
  return React.useContext(TypeBlockContext);
}
