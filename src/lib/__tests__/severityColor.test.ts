/**
 * Tests for the pure `severityColor` helper in src/lib/flags.ts.
 *
 * Pinning these values matters because two other pieces of UI depend on them:
 *   - the marker tint on the map
 *   - the severity-bar fill in flag callouts and Tasks cards
 * If a future refactor changes a hex by accident, the visual hierarchy of the
 * app changes silently. Lock the contract.
 *
 * Uses Jest globals (describe/it/expect) — see
 * qa-reports/proposal-testing-2026-05-23.md for the runner setup. Once jest is
 * installed these run alongside the existing flags.test.ts tests.
 */

import { severityColor } from '../flags';
import { color } from '@/theme';
import type { FlagSeverity } from '@/types/database';

jest.mock('../supabase', () => ({ supabase: {} }));

describe('severityColor', () => {
  // Claude Design severity ramp (yellow→red) — sourced from theme.ts `severity`.
  it('returns yellow for severity 1 (minor barrier)', () => {
    expect(severityColor(1)).toBe('#F7C948');
  });

  it('returns amber for severity 2', () => {
    expect(severityColor(2)).toBe('#F0A030');
  });

  it('returns orange for severity 3 (middle of the scale)', () => {
    expect(severityColor(3)).toBe('#F2792B');
  });

  it('returns deep orange for severity 4', () => {
    expect(severityColor(4)).toBe('#E85638');
  });

  it('returns red for severity 5 (blocking barrier)', () => {
    expect(severityColor(5)).toBe('#D92D20');
  });

  it('returns a defensive neutral gray for unexpected severities', () => {
    // The signature accepts only 1–5, but if a dirty row ever carries a
    // different number we want the marker to still render, not crash and
    // not return `undefined`.
    expect(severityColor(0 as unknown as FlagSeverity)).toBe(color.textSubtle);
    expect(severityColor(6 as unknown as FlagSeverity)).toBe(color.textSubtle);
    expect(severityColor(-1 as unknown as FlagSeverity)).toBe(color.textSubtle);
    expect(severityColor(NaN as unknown as FlagSeverity)).toBe(color.textSubtle);
  });

  it('hues are monotonically distinct across the 1-5 scale', () => {
    // Loose sanity check: no two adjacent severities share the same hex.
    // Catches an accidental copy-paste in the switch.
    const colors = ([1, 2, 3, 4, 5] as FlagSeverity[]).map(severityColor);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
