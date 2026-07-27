/**
 * R-8b / SR-016 — dependencies that autolink into the binary must be ones the
 * app actually uses.
 *
 * `expo-media-library` sat in package.json with ZERO src imports. Expo
 * autolinks dependency plugins whether or not they are listed in `plugins[]`,
 * so it shipped a native module AND regenerated an
 * NSPhotoLibraryAddUsageDescription purpose string into Info.plist on every
 * prebuild — a privacy surface and a reviewer question for a capability that
 * does not exist.
 *
 * The trap this guard also covers: `jest.mock('<pkg>', factory)` STILL
 * RESOLVES the module path (a factory does not bypass resolution without
 * `{virtual: true}`). Two suites carried dead mocks for this package, so
 * removing the dependency alone would have broken them at load. Verified
 * empirically before the mocks were deleted.
 *
 * ANTI-SELF-MATCH: the package name is assembled at runtime and this file is
 * excluded from the scan, so the sweep cannot match the guard itself.
 */
import fs from 'fs';
import path from 'path';

const SELF = path.resolve(__filename);
const REPO = path.join(__dirname, '..', '..');
const SRC = path.join(__dirname, '..');

// Assembled, never contiguous in this file's source. Reads: expo-media-library
const DEAD = ['expo', 'media', 'library'].join('-');

const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));

function walkAll(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      out.push(...walkAll(path.join(dir, entry.name)));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

describe('R-8b (SR-016) — the dead media-library dependency stays gone', () => {
  it('is absent from dependencies and devDependencies', () => {
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain(DEAD);
    expect(Object.keys(pkg.devDependencies ?? {})).not.toContain(DEAD);
  });

  it('is imported nowhere, and mocked nowhere (a mock still resolves the path)', () => {
    const offenders: string[] = [];
    for (const file of walkAll(SRC)) {
      if (path.resolve(file) === SELF) continue;
      const src = fs.readFileSync(file, 'utf8');
      // Quoted reference = an import, a require, or a jest.mock target. All
      // three resolve the module and all three would break the build or the
      // suite. A bare mention inside a prose comment is fine.
      if (src.includes(`'${DEAD}'`) || src.includes(`"${DEAD}"`)) {
        offenders.push(path.relative(REPO, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('finds source files to scan (sanity: the walk is not vacuous)', () => {
    expect(walkAll(SRC).length).toBeGreaterThan(100);
  });
});
