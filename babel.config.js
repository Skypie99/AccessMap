module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo@56 defaults to 'hermes-v1' which assumes native private
    // class field support. Expo SDK 54 ships an older Hermes that requires the
    // transforms — pin to 'hermes-v0' until this project upgrades to SDK 56.
    presets: [['babel-preset-expo', { unstable_transformProfile: 'hermes-v0' }]],
  };
};
