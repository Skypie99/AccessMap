# Cowork prompt — fix the "delete your account in Settings" error in the Terms

Copy everything in the fenced block below into a fresh Cowork / Claude Code session on `~/AccessMap`.

**Why this is a separate prompt and not just done for you:** the string lives in your *ratified* Terms document, and `terms.guard.test.ts` pins the in-app copy to that document verbatim. House rule S-8 says agents never author ratified copy — so an agent may propagate a wording you ratified, but may not decide a new one. This prompt hands the decision to you and the edit to the agent.

---

```
AccessMap — correct a false statement about account deletion in the Terms.

THE FACT: "Delete Account" lives on the PROFILE screen. SettingsScreen has
no such control at all — verify this yourself before changing anything:

  grep -rn "deleteAccountOpen" ~/AccessMap/src/screens/
  grep -c "Delete Account\|deleteAccount" ~/AccessMap/src/screens/SettingsScreen.tsx

The first should show ProfileScreen only. The second should print 0.

THE ERROR, in two places that must change together:

  1. design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md line 27
     ("Your account." — says "any time in Settings")
  2. src/lib/copy.ts, the TERMS_SECTIONS entry with heading "Your account."
     (same sentence, pinned verbatim to the doc above)

terms.guard.test.ts compares the two byte-for-byte. Change one and it fails.
That is the guard working, not a problem to route around.

THE FIX: change "in Settings" to "from your Profile" in BOTH, so the sentence
reads:

  "You can delete your account any time from your Profile. Anything you've
  contributed may stay in the app, with your name removed, so the community's
  record of barriers stays whole."

This matches the wording already RATIFIED in the privacy policy
(15_PRIVACY_POLICY_v1.md §SKY-9), so it is propagation, not new copy.

DO NOT change anything else in either file. Do not reword the second sentence.

THEN VERIFY:
  cd ~/AccessMap && npx jest src/__tests__/terms.guard.test.ts src/__tests__/privacy.guard.test.ts --ci -w 2
  npm run typecheck

Both must pass. Commit on a branch, do not push, and tell me the branch name.

CONTEXT: this is finding C-2 from the 2026-07-31 accessibility audit. The
hosted privacy page carried the same error and is already fixed
(commit ddc39ed). This is the last copy of it.
```

---

## While you're in there — one more thing to decide (not in the prompt above)

The hosted privacy page discloses:

> **Crash reports** — via Sentry, for debugging (device OS, app version, error stack trace; no personal data)

But `src/lib/sentry.ts` is a no-op stub — no crash reporter ships (SR-006, and `App.tsx` says so in a comment). So the policy names a third-party processor that receives nothing.

This is **over-disclosure**, which is the safe direction legally — you're not hiding a collection, you're claiming one that doesn't happen. But it's still untrue, and it's the kind of thing a privacy reviewer notices.

Two options, both yours:

- **Remove the bullet** — accurate today, and you'd need to re-add it when Sentry actually lands in Phase 6.
- **Leave it and ship Sentry** — the policy becomes true instead of the product becoming smaller.

I didn't touch it: removing a disclosure from a privacy policy is a call for you (and Jordan), not for an agent.
