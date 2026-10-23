// Native: RNGH's root view. Every react-native-gesture-handler gesture silently
// no-ops without it, and importing the package initialises the library, which
// is why App.tsx imports this module first.
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default GestureHandlerRootView;
