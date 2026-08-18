# Flagstone Web — Browser Compatibility

## Supported Browsers

| Browser | Version | Map | Flags | Heatmap | Tile Cache | Service Worker | PWA Install |
|---|---|---|---|---|---|---|---|
| Chrome | 90+ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Firefox | 88+ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Limited |
| Safari | 15+ | ✅ | ✅ | ✅ | ⚠️ Partial | ⚠️ Partial | ⚠️ Add to Home |
| Edge | 90+ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mobile Chrome | 90+ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mobile Safari | 15+ | ✅ | ✅ | ✅ | ⚠️ Partial | ⚠️ Partial | ⚠️ |
| Samsung Internet | 14+ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Feature Notes

### Map (react-leaflet)
Works in all modern browsers. Requires JavaScript enabled.
Minimum: any browser from 2020+.

### Tile Caching (Cache API)
Requires Cache API support. Chrome/Firefox/Edge: full support.
Safari 15+: partial support (size limits differ). Safari 14: no support.

### Service Worker (offline support)
Chrome/Firefox/Edge: full support.
Safari 15+: basic support (background sync not available).
iOS Safari: limited — tiles may not persist across app restarts.

### PWA Installation
Chrome/Edge: native install prompt appears automatically.
Firefox: "Add to Home Screen" via menu (no native prompt).
Safari (macOS): not supported.
Safari (iOS): "Add to Home Screen" via Share menu — installs as PWA.

### Web Share API
Chrome 61+, Edge 79+, Safari 12.1+: native share sheet.
Firefox: clipboard fallback (no native share).

## Minimum Requirements

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Core app | 80 | 78 | 14 | 80 |
| Tile caching | 40 | 44 | 15 | 40 |
| Service Worker | 45 | 44 | 15 | 45 |
| Web Share | 61 | N/A (fallback) | 12.1 | 79 |

## Testing Priority

1. **Chrome (primary)** — largest user base, full feature support
2. **Mobile Safari (iOS)** — second largest, Service Worker limitations
3. **Firefox** — good support, test Share API fallback
4. **Samsung Internet** — significant Android market share

## Known Issues

- **iOS Safari + Service Worker**: Tiles may not persist after browser is closed. Users must re-visit areas to re-cache. This is a platform limitation, not a bug.
- **Firefox PWA**: No install prompt — users must manually "Add to Home Screen"
- **Safari macOS**: Cannot install as PWA (Apple limitation)
