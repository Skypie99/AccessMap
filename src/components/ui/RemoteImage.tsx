/**
 * RemoteImage — an <Image> for network/user-supplied URLs that fails safe.
 *
 * A raw `<Image source={{ uri }}>` renders nothing visible when the URL is
 * null, dead, or fails to load — leaving a blank gap in the layout, with no
 * signal to the user. RemoteImage instead renders a neutral fallback (a muted
 * "broken image" box, or a caller-supplied node such as avatar initials) on a
 * null URI or an `onError`, so a bad or unreachable photo degrades gracefully
 * instead of leaving a hole or silently failing.
 *
 * Use it for any remote image whose URL comes from the database or a user
 * (flag photos, avatars). Local bundled assets don't need it.
 *
 * Security/robustness pass — 2026-06-01.
 */

import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageProps,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ImageOff } from 'lucide-react-native';
import { useColor } from '@/theme/ThemeContext';
import { isAllowedImageUrl } from '@/lib/remoteImageUrl';

export interface RemoteImageProps extends Omit<ImageProps, 'source' | 'style'> {
  /** Remote image URL. Null/undefined renders the fallback. */
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  /** Rendered on a null URI or a load error. Defaults to a muted broken-image box. */
  fallback?: React.ReactNode;
  /** Icon size for the default fallback box. */
  fallbackIconSize?: number;
}

export function RemoteImage({
  uri,
  style,
  fallback,
  fallbackIconSize = 20,
  accessibilityElementsHidden,
  importantForAccessibility,
  ...rest
}: RemoteImageProps) {
  const color = useColor();
  const [failed, setFailed] = useState(false);

  // Reset the error flag when the URL changes — without this, a recycled
  // FlatList row that once failed would keep showing the fallback for a new,
  // valid URL. (React's documented "adjust state during render" pattern.)
  const [prevUri, setPrevUri] = useState(uri);
  if (uri !== prevUri) {
    setPrevUri(uri);
    setFailed(false);
  }

  // TB-3/IO-3/IO-1 (security audit 2026-07-31): `photo_url` and `avatar_url`
  // are unconstrained text columns, so a hostile row can point this <Image> at
  // any server and harvest the viewer's IP. Reject anything that is not this
  // project's Storage origin or a local just-picked file; a rejected URL is
  // treated exactly like a dead one and lands in the fallback below. See
  // `@/lib/remoteImageUrl` for why the client check is only half the fix.
  if (!uri || failed || !isAllowedImageUrl(uri)) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <View
        style={[styles.fallback, { backgroundColor: color.surfaceNeutral }, style as StyleProp<ViewStyle>]}
        accessibilityElementsHidden={accessibilityElementsHidden}
        importantForAccessibility={importantForAccessibility ?? 'no-hide-descendants'}
        // A11Y-234: mirror the caller's hide intent onto aria-hidden. Both
        // props above are NO-OPS in react-native-web, so a caller that passes
        // only the native prop got a fallback that still reached web screen
        // readers. (`{...rest}` already forwards an explicit aria-hidden, e.g.
        // from a decorativeProps spread; this covers everyone else.)
        aria-hidden={accessibilityElementsHidden}
      >
        <ImageOff size={fallbackIconSize} color={color.textSubtle} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      onError={() => setFailed(true)}
      accessibilityElementsHidden={accessibilityElementsHidden}
      importantForAccessibility={importantForAccessibility}
      // A11Y-234: see the fallback branch above — same mirror, same reason.
      // `{...rest}` stays LAST so an explicit caller aria-hidden still wins.
      aria-hidden={accessibilityElementsHidden}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
