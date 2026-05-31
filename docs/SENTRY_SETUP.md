# Sentry Error Tracking Setup

Sentry is wired into the app — it just needs a DSN to activate. Without a DSN it
silently no-ops, so local dev works without any Sentry account.

## One-time setup

### 1. Create a Sentry project

1. Go to [sentry.io](https://sentry.io) and sign in (free tier is fine).
2. **Create a new project** → choose **React Native**.
3. Give it a name (e.g. `accessmap-ios`).
4. Copy the **DSN** from the project settings page. It looks like:
   ```
   https://abc123@o123456.ingest.sentry.io/789012
   ```

### 2. Store the DSN as an EAS secret

Run this once (the value is stored server-side, never committed to git):

```sh
npx eas secret:create \
  --scope project \
  --name EXPO_PUBLIC_SENTRY_DSN \
  --value "https://YOUR_DSN_HERE@oXXXXXX.ingest.sentry.io/XXXXXXX"
```

You can verify it was saved:

```sh
npx eas secret:list
```

### 3. (Optional) Store the auth token for source map uploads

Source maps let Sentry show readable stack traces instead of minified code.
Without this step errors still appear — you just see minified line numbers.

1. In Sentry: **Settings → Auth Tokens → Create New Token** (scope: `project:releases`).
2. Store it:
   ```sh
   npx eas secret:create \
     --scope project \
     --name SENTRY_AUTH_TOKEN \
     --value "sntrys_..."
   ```
3. In `ios/sentry.properties`, fill in your org slug and project slug:
   ```properties
   defaults.org=your-org-slug
   defaults.project=accessmap-ios
   ```
4. Remove `SENTRY_DISABLE_AUTO_UPLOAD=true` from the `preview` profile in
   `eas.json` once the auth token is in place.

### 4. Rebuild

```sh
npx eas build --profile preview --platform ios
```

The new build will pick up the secret from EAS and Sentry will start receiving
events automatically.

---

## How it works

| File | What it does |
|---|---|
| `src/lib/sentry.ts` | Initialises Sentry if `EXPO_PUBLIC_SENTRY_DSN` is set; no-ops otherwise |
| `App.tsx` | Calls `initSentry()` before anything renders; exports `Sentry.wrap(App)` to catch JS crashes |
| `app.json` | Includes `@sentry/react-native/expo` plugin (adds native crash reporting) |
| `eas.json` | Has `EXPO_PUBLIC_SENTRY_DSN: ""` placeholder in each profile; real value injected from EAS secret |

## Sample rates

- **Development** (`__DEV__ = true`): 100% of traces captured.
- **Production/Preview**: 20% of traces sampled (reduces quota usage).

## Testing Sentry locally

Add a DSN to `.env`:

```
EXPO_PUBLIC_SENTRY_DSN=https://YOUR_DSN@oXXXX.ingest.sentry.io/XXXX
```

Then trigger a test error from a screen:

```ts
import { Sentry } from '@/lib/sentry';
Sentry.captureException(new Error('Sentry test'));
```

Check the Sentry dashboard — the event should appear within ~30 seconds.
