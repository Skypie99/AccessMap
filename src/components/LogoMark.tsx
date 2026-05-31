/**
 * LogoMark — three variants for Sky to choose from.
 *
 * Variant A: "Pin" — map-pin silhouette with "A" inside (brand + map identity)
 * Variant B: "Badge" — rounded-square gradient badge (app-icon style, versatile)
 * Variant C: "Ring" — circle with gradient ring + initial (clean, modern)
 *
 * Usage:
 *   <LogoMark variant="pin"  size={64} />
 *   <LogoMark variant="badge" size={48} />
 *   <LogoMark variant="ring"  size={40} />
 */
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  variant?: 'pin' | 'badge' | 'ring';
  size?: number;
}

// ── shared gradient stops — Wayfinder Blue (design system 2026-05-30) ───────
const GRAD_START = '#0E4499'; // blue-700
const GRAD_END = '#1466E0';   // blue-500 "Wayfinder Blue" — primary brand color

export default function LogoMark({ variant = 'badge', size = 64 }: Props) {
  switch (variant) {
    case 'pin':
      return <PinVariant size={size} />;
    case 'ring':
      return <RingVariant size={size} />;
    default:
      return <BadgeVariant size={size} />;
  }
}

// ── Variant A: Pin ────────────────────────────────────────────────────────────
// Map-pin silhouette: circle head + pointed teardrop bottom.
function PinVariant({ size }: { size: number }) {
  const headSize = size * 0.78;
  const stemW = size * 0.22;
  const stemH = size * 0.28;
  const letterSize = headSize * 0.48;

  return (
    <View style={{ width: size, height: size + stemH, alignItems: 'center' }}>
      {/* Pin head */}
      <LinearGradient
        colors={[GRAD_START, GRAD_END]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[styles.pinHead, { width: headSize, height: headSize, borderRadius: headSize / 2 }]}
      >
        {/* Glass highlight */}
        <View style={[styles.pinHighlight, { width: headSize * 0.45, height: headSize * 0.25, borderRadius: headSize * 0.12 }]} />
        <Text style={[styles.letter, { fontSize: letterSize, lineHeight: letterSize + 2 }]}>A</Text>
      </LinearGradient>
      {/* Pin stem — a small triangle via borders */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: stemW / 2,
          borderRightWidth: stemW / 2,
          borderTopWidth: stemH,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: GRAD_END,
          marginTop: -1,
        }}
      />
    </View>
  );
}

// ── Variant B: Badge ──────────────────────────────────────────────────────────
// Rounded-square — the app-icon shape. Works at all sizes.
function BadgeVariant({ size }: { size: number }) {
  const r = size * 0.26; // corner radius — generous iOS-style
  const letterSize = size * 0.46;

  return (
    <LinearGradient
      colors={[GRAD_START, '#0F53BE', GRAD_END]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.badge, { width: size, height: size, borderRadius: r }]}
    >
      {/* Top-left specular highlight — the "glass" effect */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.06,
          left: size * 0.06,
          width: size * 0.5,
          height: size * 0.28,
          borderRadius: size * 0.08,
          backgroundColor: 'rgba(255,255,255,0.18)',
          transform: [{ rotate: '-12deg' }],
        }}
      />
      <Text
        style={[styles.letter, { fontSize: letterSize, lineHeight: letterSize + 2 }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        A
      </Text>
    </LinearGradient>
  );
}

// ── Variant C: Ring ───────────────────────────────────────────────────────────
// Circle with a gradient border ring — clean, symbol-like.
function RingVariant({ size }: { size: number }) {
  const ring = size * 0.11; // ring thickness
  const innerSize = size - ring * 2;
  const letterSize = innerSize * 0.48;

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, padding: ring, overflow: 'hidden' }}>
      <LinearGradient
        colors={[GRAD_START, GRAD_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Inner circle — the "fill" of the ring */}
      <View
        style={{
          flex: 1,
          borderRadius: innerSize / 2,
          backgroundColor: '#0a0e1a',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[styles.letter, { fontSize: letterSize, lineHeight: letterSize + 2, color: GRAD_END }]}>
          A
        </Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  pinHead: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pinHighlight: {
    position: 'absolute',
    top: '12%',
    left: '12%',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  letter: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
    // Prevent the letter from affecting the pin/badge layout
    includeFontPadding: false,
  },
});
