import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

// Web: RNGH's web root view is only a context provider around a flex:1 View,
// and RNGH reads that context off web only (createHandler and GestureDetector
// skip the check when Platform.OS === 'web'). Rendering the View directly keeps
// the gesture-handler package (and its hammer.js dependency) out of the
// first-launch bundle. Screens that use gestures import RNGH themselves.
// (Measured: what leaves the entry is react-native-gesture-handler itself
// (~192 KB raw) and hammer.js (~26 KB) — the react-native-web list components
// stay, because react-native-web's own Animated imports Animated.FlatList.)
export default function GestureRoot({ style, ...rest }: ViewProps) {
  return <View style={style ?? styles.container} {...rest} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
