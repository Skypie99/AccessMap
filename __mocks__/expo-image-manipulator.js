// Manual mock for expo-image-manipulator. Tests that import flags.ts
// (which calls stripExifNative) need this stub to avoid "Cannot find module".
module.exports = {
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'mocked-uri' }),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
};
