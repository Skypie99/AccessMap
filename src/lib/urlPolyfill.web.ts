// Web: browsers ship URL and URLSearchParams, and react-native-url-polyfill's
// `auto` entry already installs nothing when Platform.OS === 'web'. Importing it
// still bundled and evaluated its whatwg-url + buffer implementation (~70 KB) on
// the first-launch page for no effect, so web resolves this empty module instead.
export {};
