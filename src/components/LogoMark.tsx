/**
 * LogoMark — the Flagstone brand mark: a Wayfinder-Blue map pin carrying a
 * white "striding figure" (accessibility + wayfinding). It doubles as the
 * you-are-here / accessibility pin across the app and map. Rendered from the
 * design SVG via react-native-svg.
 *
 *   color — blue pin, white figure (default; for light backgrounds)
 *   white — solid white knockout (for dark or photo backgrounds)
 *   mono  — single-color pin via `tint`, white figure
 *
 * Source: assets/brand/logo-mark.svg. Design system 2026-06-01 (replaces the
 * earlier three-variant gradient "A" placeholder).
 */

import React from 'react';
import Svg, { Circle, Mask, Path, Rect } from 'react-native-svg';
import { color as staticColor } from '@/theme';

interface Props {
  /** Height in px; width scales to the 96×120 artboard. */
  size?: number;
  variant?: 'color' | 'white' | 'mono';
  /** Pin color for the 'mono' variant. */
  tint?: string;
}

const PIN =
  'M48 4 C24 4 8 22 8 46 C8 79 40 108 46.2 113.6 C47.2 114.5 48.8 114.5 49.8 113.6 C56 108 88 79 88 46 C88 22 72 4 48 4 Z';
const SPINE = 'M48 47 L48 74';
const LEGS = 'M31 66 L48 48 L65 66';
const HEAD = { cx: 48, cy: 33, r: 7.5 };

export default function LogoMark({ size = 96, variant = 'color', tint }: Props) {
  const width = size * (96 / 120);

  if (variant === 'white') {
    return (
      <Svg width={width} height={size} viewBox="0 0 96 120" accessibilityLabel="Flagstone">
        <Mask id="amLogoCut">
          <Rect width={96} height={120} fill="#fff" />
          <Circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill="#000" />
          <Path d={SPINE} stroke="#000" strokeWidth={9} strokeLinecap="round" />
          <Path d={LEGS} stroke="#000" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Mask>
        <Path d={PIN} fill="#fff" mask="url(#amLogoCut)" />
      </Svg>
    );
  }

  const pinFill = variant === 'mono' ? tint ?? staticColor.textStrong : staticColor.brand;
  return (
    <Svg width={width} height={size} viewBox="0 0 96 120" accessibilityLabel="Flagstone">
      <Path d={PIN} fill={pinFill} />
      <Circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill="#fff" />
      <Path d={SPINE} stroke="#fff" strokeWidth={9} strokeLinecap="round" />
      <Path d={LEGS} stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
