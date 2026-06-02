/**
 * TierIcon — renders a reputation tier's badge as a Lucide icon in the tier's
 * color (Medal for bronze/silver/gold, Gem for platinum). Replaces the emoji
 * badges across the trust-score UI (Profile tier pill + list, Leaderboard).
 *
 * Decorative by default — callers carry the tier label/name in their own
 * accessibility labels, so the icon is hidden from screen readers.
 *
 * Design system 2026-06-01.
 */

import React from 'react';
import { Gem, Medal } from 'lucide-react-native';
import type { ReputationTier } from '@/lib/reputationTier';

const ICON = { medal: Medal, gem: Gem } as const;

interface Props {
  tier: ReputationTier;
  size?: number;
  /** Override the tier's default color. */
  color?: string;
}

export default function TierIcon({ tier, size = 20, color }: Props) {
  const Icon = ICON[tier.icon];
  return <Icon size={size} color={color ?? tier.color} strokeWidth={2.2} />;
}
