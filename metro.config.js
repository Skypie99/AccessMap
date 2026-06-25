const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Make lucide-react-native per-icon deep imports resolvable.
//
// The package's `exports` map is barrel-only (no `./icons/*` subpath) and Metro
// enforces package exports by default (resolver.unstable_enablePackageExports),
// so `lucide-react-native/icons/<name>` would otherwise fail to resolve. The
// babel plugin (babel-plugins/lucide-deep-imports.js) rewrites barrel imports to
// these deep specifiers; here we map them straight to the real ESM icon files so
// Metro bundles ONLY the icons we use. This is surgical to lucide — every other
// request falls through to Metro's default resolver untouched (so packages that
// rely on their exports maps, e.g. @supabase, are unaffected).
const LUCIDE_ICONS_PREFIX = 'lucide-react-native/icons/';
const lucideIconsDir = path.join(
  __dirname,
  'node_modules',
  'lucide-react-native',
  'dist',
  'esm',
  'icons',
);

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(LUCIDE_ICONS_PREFIX)) {
    const icon = moduleName.slice(LUCIDE_ICONS_PREFIX.length);
    return {
      type: 'sourceFile',
      filePath: path.join(lucideIconsDir, `${icon}.mjs`),
    };
  }
  // Delegate everything else to the upstream/default resolver.
  return (upstreamResolveRequest || context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
