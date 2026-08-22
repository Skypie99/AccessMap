/**
 * Design-system UI primitives — barrel export.
 * Import from '@/components/ui' to get all primitives at once.
 */

export { AppText } from './AppText';
export type { AppTextVariant } from './AppText';

// T3 — Dynamic Type caps by container (2026-08-21).
export { TypeBlock, TYPE_BLOCK, useTypeBlock } from './TypeBlock';
export type { TypeBlockValue } from './TypeBlock';

export { Button } from './Button';
export type { ButtonKind, ButtonSize } from './Button';

export { Card } from './Card';

// F1 — one drawing of a flag, at two densities (2026-08-21, art-direction Phase 2a).
export { FlagCard, MonoDistance, flagCardA11yLabel } from './FlagCard';
export type { FlagCardDensity, FlagCardFlag, FlagCardHeaderA11y, FlagCardProps } from './FlagCard';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Skeleton, SkeletonRow, SkeletonCard } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { Sheet, SheetHeader } from './Sheet';
export type { SheetProps, SheetHeaderProps } from './Sheet';

export { GlassSurface } from './GlassSurface';

export { OverflowFade } from './OverflowFade';
export type { OverflowFadeProps } from './OverflowFade';

// Added to the barrel in the pre-ship polish (2026-08-01) — these were
// direct-path-only. Existing direct imports keep working.
export { ScreenStage } from './ScreenStage';
export { ScreenHeader, EYEBROW_TRACKING } from './ScreenHeader';
export { HeaderActions } from './HeaderActions';
export { PressableScale } from './PressableScale';
export { RemoteImage } from './RemoteImage';
