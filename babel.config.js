const path = require('path');

module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo@56 defaults to 'hermes-v1' which assumes native private
    // class field support. Expo SDK 54 ships an older Hermes that requires the
    // transforms — pin to 'hermes-v0' until this project upgrades to SDK 56.
    presets: [['babel-preset-expo', { unstable_transformProfile: 'hermes-v0' }]],
    plugins: [
      // Rewrite lucide-react-native barrel imports → per-icon deep imports so
      // Metro only bundles the icons we use (the package's exports map is
      // barrel-only). Pairs with the resolver shim in metro.config.js and the
      // moduleNameMapper in jest.config.js. Absolute path so it resolves
      // regardless of cwd.
      path.resolve(__dirname, 'babel-plugins/lucide-deep-imports.js'),
    ],
  };
};
