// Babel plugin: rewrite lucide-react-native barrel imports → per-icon deep imports.
//
// Why: lucide-react-native@1.x's `exports` map is barrel-only (`.` and `./icons`
// both point at an index that statically re-exports EVERY icon). Metro doesn't
// tree-shake, so a single `import { Flag } from 'lucide-react-native'` drags the
// whole ~1.3 MB icon set into the bundle. This plugin turns:
//
//   import { Flag, Home as HomeIcon, type LucideIcon } from 'lucide-react-native';
//     ->
//   import Flag from 'lucide-react-native/icons/flag';
//   import HomeIcon from 'lucide-react-native/icons/house';
//   import type { LucideIcon } from 'lucide-react-native';   // (elided by TS)
//
// so Metro only bundles the icons actually used. The `lucide-react-native/icons/*`
// deep specifier is made resolvable by a resolver shim in metro.config.js (Metro)
// and a moduleNameMapper in jest.config.js (tests).
//
// The Name -> icon-file map is parsed from lucide's OWN root manifest
// (dist/esm/lucide-react-native.mjs), so it includes every deprecated alias
// (Home->house, HelpCircle->circle-question-mark, CheckCircle2->circle-check, ...)
// and the Lucide*/`*Icon` variants, and can never drift from the installed
// version. A name that isn't in the manifest is a LOUD build error — never a
// silent wrong/missing icon.

const fs = require('fs');
const path = require('path');

const PKG = 'lucide-react-native';

// Parse the manifest ONCE per process and cache it.
let ICON_MAP = null;
function getIconMap() {
  if (ICON_MAP) return ICON_MAP;
  const manifest = path.join(
    __dirname,
    '..',
    'node_modules',
    PKG,
    'dist',
    'esm',
    'lucide-react-native.mjs',
  );
  const src = fs.readFileSync(manifest, 'utf8');
  const map = Object.create(null);
  // Each icon export line looks like:
  //   export { default as Home, default as HomeIcon, ... } from './icons/house.mjs';
  // (non-icon re-exports such as ./Icon.mjs or ./createLucideIcon.mjs don't match
  // the ./icons/ path and are intentionally excluded.)
  const lineRe = /export\s*\{([^}]*)\}\s*from\s*['"]\.\/icons\/([a-z0-9-]+)\.mjs['"]/g;
  let line;
  while ((line = lineRe.exec(src))) {
    const names = line[1];
    const file = line[2];
    const nameRe = /default as ([A-Za-z0-9_]+)/g;
    let name;
    while ((name = nameRe.exec(names))) {
      map[name[1]] = file;
    }
  }
  if (Object.keys(map).length === 0) {
    throw new Error(
      `[lucide-deep-imports] Parsed 0 icons from ${manifest} — the lucide-react-native ` +
        `package layout may have changed. Refusing to silently no-op.`,
    );
  }
  ICON_MAP = map;
  return map;
}

module.exports = function lucideDeepImports({ types: t }) {
  return {
    name: 'lucide-deep-imports',
    visitor: {
      ImportDeclaration(p) {
        if (p.node.source.value !== PKG) return;
        // A fully type-only import (`import type { LucideIcon } from '...'`) has
        // no runtime effect and is elided by the TS transform — leave it, and
        // skip on re-traversal (prevents an infinite replace loop).
        if (p.node.importKind === 'type') return;

        const map = getIconMap();
        const deepImports = [];
        const keptTypeSpecifiers = [];

        for (const spec of p.node.specifiers) {
          // A default/namespace import of the barrel would pull everything in —
          // the very thing we're avoiding. Fail loudly.
          if (!t.isImportSpecifier(spec)) {
            throw p.buildCodeFrameError(
              `[lucide-deep-imports] Only named icon imports of '${PKG}' are supported ` +
                `(found a default or namespace import).`,
            );
          }
          // Preserve inline type specifiers (e.g. `type LucideIcon`).
          if (spec.importKind === 'type') {
            spec.importKind = null;
            keptTypeSpecifiers.push(spec);
            continue;
          }
          const importedName = t.isIdentifier(spec.imported)
            ? spec.imported.name
            : spec.imported.value;
          const file = map[importedName];
          if (!file) {
            throw p.buildCodeFrameError(
              `[lucide-deep-imports] '${importedName}' is not a known ${PKG} icon ` +
                `(not in the package manifest). Check the name/casing.`,
            );
          }
          deepImports.push(
            t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier(spec.local.name))],
              t.stringLiteral(`${PKG}/icons/${file}`),
            ),
          );
        }

        const replacement = deepImports;
        if (keptTypeSpecifiers.length > 0) {
          const typeDecl = t.importDeclaration(keptTypeSpecifiers, t.stringLiteral(PKG));
          typeDecl.importKind = 'type';
          replacement.push(typeDecl);
        }
        // If a bare `import 'lucide-react-native'` (no specifiers) ever appears,
        // replacement is empty and the side-effect-only import is dropped.
        p.replaceWithMultiple(replacement);
      },
    },
  };
};
