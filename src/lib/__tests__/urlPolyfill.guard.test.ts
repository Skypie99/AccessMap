/**
 * The URL polyfill is native-only.
 *
 * supabase.ts used to import `react-native-url-polyfill/auto` directly. That
 * entry already installs nothing on web (`if (Platform.OS !== 'web')`), but the
 * import still bundled and evaluated its whatwg-url implementation (47,743 B raw
 * of the web entry, measured) on the first-launch page. supabase.ts now imports
 * ./urlPolyfill:
 * native resolves urlPolyfill.ts (the same polyfill import, still first), web
 * resolves the empty urlPolyfill.web.ts.
 *
 * These checks pin both halves of that equivalence, including the package's
 * own web guard: if a future version starts installing itself on web, the web
 * split would change behaviour, and this suite says so before anyone ships it.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from '@/__tests__/support/stripComments';

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const importsOf = (src: string) =>
  [...stripComments(src).matchAll(/^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);

test('supabase.ts installs the polyfill module before anything else loads', () => {
  expect(importsOf(read('src/lib/supabase.ts'))[0]).toBe('./urlPolyfill');
});

test('native resolves the real polyfill and installs it', () => {
  expect(importsOf(read('src/lib/urlPolyfill.ts'))).toEqual(['react-native-url-polyfill/auto']);
  const g = globalThis as { REACT_NATIVE_URL_POLYFILL?: string };
  delete g.REACT_NATIVE_URL_POLYFILL;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../urlPolyfill');
  });
  expect(g.REACT_NATIVE_URL_POLYFILL).toMatch(/^react-native-url-polyfill@/);
});

test('web resolves a module that imports nothing', () => {
  const web = stripComments(read('src/lib/urlPolyfill.web.ts'));
  expect(importsOf(web)).toEqual([]);
  expect(web).not.toMatch(/\brequire\s*\(/);
});

test("the package's auto entry still installs nothing on web", () => {
  const auto = stripComments(read('node_modules/react-native-url-polyfill/auto.js'));
  expect(auto).toMatch(/if\s*\(\s*Platform\.OS\s*!==\s*['"]web['"]\s*\)\s*\{\s*setupURLPolyfill\(\);?\s*\}/);
});
