// Web: browsers ship URL and URLSearchParams, and react-native-url-polyfill's
// `auto` entry already installs nothing when Platform.OS === 'web'. Importing it
// still bundled and evaluated its whatwg-url implementation on the first-launch
// page for no effect, so web resolves this empty module instead (measured: the
// web entry fell 47,743 B raw; `buffer` stays, react-native-svg also uses it).
export {};
