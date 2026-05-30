# GitHub Pages Setup — App Store Web Pages

Two-minute setup to get the privacy policy and support page live.

## Steps

1. Go to your repo on GitHub → **Settings** → **Pages** (left sidebar)
2. Under **Build and deployment → Source**, select **Deploy from a branch**
3. Branch: **`main`** · Folder: **`/docs`** → click **Save**
4. Wait ~60 seconds. GitHub will show: "Your site is live at …"

## Your URLs

Once deployed, these are your permanent URLs:

| Page | URL |
|---|---|
| Privacy Policy | `https://skypie911.github.io/accessmap/privacy-policy` |
| Support | `https://skypie911.github.io/accessmap/support` |
| Root | `https://skypie911.github.io/accessmap/` |

> **Note:** GitHub Pages serves `.html` files without the extension by default, so
> `/privacy-policy` resolves to `privacy-policy.html` automatically.

## Entering URLs in App Store Connect

In App Store Connect → your app → **App Information**:

- **Privacy Policy URL:** `https://skypie911.github.io/accessmap/privacy-policy`
- **Support URL:** `https://skypie911.github.io/accessmap/support`

## Before You Go Live

Both pages have `[contact email]` placeholders (highlighted in orange). Replace every instance with your actual support email before submitting to App Store Connect:

```
# In docs/privacy-policy.html — search for:
[contact email]

# In docs/support.html — search for:
[contact email]
# and also update the mailto: href on the Email Support button
```

The privacy policy also has one placeholder for your Supabase server region:
```
[region — Sky specifies before launch]
```
You can find this in your Supabase project dashboard under **Settings → General**.
