// HeatmapLayer.tsx — gradient density layer (D5: gradient YES, map A)
// Privacy: aggregated density only, no individual point coords exposed
// Art. 7 gate: Jordan privacy review required before showing user data
import React from 'react';
import { View } from 'react-native';

// Placeholder — Jordan privacy review pending before implementation
// This file establishes the component contract
export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number; // density weight 0-1
}

export interface HeatmapLayerProps {
  points: HeatmapPoint[];
  visible: boolean;
  opacity?: number; // 0-1
}

export function HeatmapLayer({ points, visible, opacity = 0.7 }: HeatmapLayerProps) {
  // TODO: implement gradient heatmap once Jordan Art. 7 review passes
  // Points aggregated server-side before reaching this component (privacy requirement)
  if (!visible || points.length === 0) return null;
  return <View />;
}
