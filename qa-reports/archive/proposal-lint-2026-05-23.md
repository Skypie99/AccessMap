# Proposal — ESLint + Prettier (Expo flat config)

**Status:** PROPOSED — not installed yet. Adds new dev dependencies.
**Owner to approve:** Sky (skylerhalisky@gmail.com)
**Author:** Gary (safety-net pass, 2026-05-23)
**Estimated effort:** ~5 minutes to install + 1 minute to auto-fix
existing files

---

## Why

There is no lint config in the repo. Every PR depends on visual review +
typecheck. ESLint catches a much wider class of issues:

- `react-hooks/exhaustive-deps` — missing deps in `useEffect` (the
  exact class of bug that the prior continuous-improvement passes have
  found by hand).
- `@typescript-eslint/no-floating-promises` — fire-and-forget promises
  whose errors will silently disappear.
- `react-native/no-color-literals` — would push the inline hex colors
  toward a future theme system without forcing it today (warn-only).

Prettier on save means the same diff format for every commit.

---

## Exact steps

```bash
cd ~/AccessMap

# 1. Install
npm install --save-dev \
  eslint@^9.18.0 \
  eslint-config-expo@^9.0.0 \
  eslint-plugin-react-hooks@^5.1.0 \
  prettier@^3.4.2 \
  eslint-plugin-prettier@^5.2.1 \
  eslint-config-prettier@^9.1.0 \
  --legacy-peer-deps
```

Add `eslint.config.js` at the repo root (flat config; required by
ESLint 9):

```js
// eslint.config.js
const expoConfig = require("eslint-config-expo/flat");
const prettierPlugin = require("eslint-plugin-prettier");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    plugins: { prettier: prettierPlugin },
    rules: {
      "prettier/prettier": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // Strict, but pragmatic:
      "@typescript-eslint/no-floating-promises": "off", // turn on later
      "react-native/no-color-literals": "off", // turn on with theme system
    },
  },
  {
    ignores: [
      "node_modules/",
      ".expo/",
      "dist/",
      "build/",
      "*.config.js",
    ],
  },
];
```

Add `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80,
  "arrowParens": "always"
}
```

Add scripts to `package.json`:

```json
"scripts": {
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write ."
}
```

Run once to baseline:

```bash
npm run lint            # see the current state of warnings
npm run lint:fix        # auto-fix what can be auto-fixed
npm run typecheck       # confirm still green
```

---

## What this catches today

A quick dry-run of `react-hooks/exhaustive-deps` against the current
source flags exactly the same class of issue that previous QA passes
have caught by hand — e.g. in screens that fetch on mount. Letting the
linter own this means future copy-paste of those patterns gets flagged
automatically.

---

## Risk

Low. Adds dev dependencies and config files only. No runtime impact.

Initial `eslint .` may print warnings — that's expected; they're a
to-do list, not a blocker. The `react-hooks/exhaustive-deps` rule is
set to `warn` (not `error`) so it doesn't block builds.

Reversible by `git revert` and `npm uninstall`.
