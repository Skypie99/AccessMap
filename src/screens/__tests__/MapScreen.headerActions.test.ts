/**
 * MapScreen header-actions regroup (T13 / F2-05) — source-scan guard.
 *
 * MapScreen is not cheaply mountable (heavy native-map + provider tree), so the
 * box-none pair-container regroup is pinned by a static source scan, in the idiom
 * of dynamicTypeGuard.test.ts. The felt gesture + visual proof (menu circle no
 * longer stranded mid-air; map still pannable through the pair's gap) is the
 * device gate (NEEDS-SKY-DEVICE).
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../MapScreen.tsx'), 'utf8');

describe('MapScreen header-actions regroup (T13 / F2-05)', () => {
  it('wraps HeaderActions in ONE box-none pair container (no loose sibling)', () => {
    expect(SRC).toMatch(
      /<View style=\{styles\.mapHeaderActions\}\s+pointerEvents="box-none">\s*<HeaderActions/,
    );
  });

  it('mapHeaderActions is a row grouped by the spacing.xs gap', () => {
    expect(SRC).toMatch(
      /mapHeaderActions:\s*\{[^}]*flexDirection:\s*'row'[^}]*gap:\s*spacing\.xs[^}]*\}/,
    );
  });

  it('the map header chip padding snapped off the 14 literal to spacing.md', () => {
    expect(SRC).toMatch(/mapHeaderChip:\s*\{[\s\S]*?paddingHorizontal:\s*spacing\.md/);
  });
});
