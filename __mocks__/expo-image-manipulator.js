// Manual mock for expo-image-manipulator (flags.ts uses it for EXIF strip).
// Any test that imports flags.ts transitively gets this stub automatically
// via jest.config.js moduleNameMapper, avoiding "Cannot find module" errors.
module.exports = {
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'mocked-uri' }),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
};
