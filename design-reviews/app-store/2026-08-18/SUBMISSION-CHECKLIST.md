# FLAGSTONE → APP STORE — VERIFIED CHECKLIST
**2026-08-18 · every line below was checked against the repo and the live services today, not copied from the older TODO.**

---

## ⚑ FIRST — the reviewer sign-in, in order

The security half is **already done** (this corrects `APP_STORE_TODO.md` §0.1, which is stale): `docs/APP_STORE_REVIEWER_NOTES.md` now reads `[PROVIDED IN APP STORE CONNECT REVIEW NOTES]` for both email and password, and the SQL migration's password line is a comment saying it is never committed. **Nothing to purge. No history rewrite. Do not do the `git filter-repo` step that doc mentions.**

What is left is operational, and it is yours because it touches credentials:

1. **Supabase → Authentication → Users.** Find the reviewer account (the address named in `docs/APP_STORE_REVIEWER_NOTES.md` is a placeholder — the real one is whatever account you provisioned). If no reviewer account exists, create one with a real address you control.
2. **Set a fresh password on it.** Somewhere only you can see it — a password manager, not a repo file, not a note.
3. **Actually sign in to the app with that pair, once.** Rotating without testing just changes *which* credential is dead, and dead demo creds are an automatic Apple 2.1(a) rejection.
4. **Paste the pair into App Store Connect → App Review Information → Sign-In Information.** That field is the only place it belongs.
5. In the same screen's **Notes**, add a line: *"You can also browse the map without an account — tap Skip on the sign-in screen."* Reviewers reward a path that needs no login.

**Never put the new pair back into any repo file**, including the notes doc. That doc is public.

---

## 🔴 BLOCKER — the reviewer will open an empty app

`docs/APP_STORE_REVIEWER_NOTES.md` tells Apple, in writing:

> "a contributor profile with 25 points and **5 pre-seeded accessibility flags in downtown Vancouver** so the map is populated on first launch."

**Production has no flags.** The live map shows *"0 flags · No barriers reported here yet"*, and a full showcase re-capture on 2026-08-17 — with geolocation seeded to real coordinates — photographed the empty state on every data-driven screen.

Two separate problems, one cause:
- **A reviewer cannot exercise the app.** Verify, dispute, the nearest-barrier banner, the Tasks queue — all need flags to act on. An empty map invites "we were unable to review the core functionality."
- **The notes say something untrue.** That is the worse half.

**Fix before submitting — pick one:** seed the promised flags into production (and the reviewer's 25 points), **or** rewrite that sentence to describe what a reviewer will actually see. Seeding is better: it fixes the demo *and* makes the sentence true.

This is the same blocker that stops the portfolio screenshots being re-shot, so fixing it unblocks both.

---

## 🟠 Still open in the repo — verified today, all small

| | Item | Verified state |
|---|---|---|
| ☐ | **Anonymous reports skip the content filter** | `createAnonFlag` (`src/lib/flags.ts:1732`) still makes **zero** calls to the blocked-term filter; `createFlag` does. Anonymous reporting is the headline feature, so it is exactly how a reviewer will test Guideline 1.2(a). One line. **Your call — it is a moderation-policy decision, so say the word and I land it.** |
| ☐ | **The Terms contradict the app** | `src/lib/copy.ts:621` still says *"delete your account any time in **Settings**"*. The control is on **Profile** — and line 742 of the same file already says "Profile". Your live privacy policy says Profile too. Two published documents disagree, in the one Apple reads. |
| ☐ | **Version numbers disagree** | `app.json` = **3.0.0**, `package.json` = **0.2.0**. Set them the same before building so provenance is legible. `app.json` is authoritative. |

Say the word on any of these three and I'll do them — they are mechanical once you have decided.

---

## 🔵 THE HINGE — a binary has never existed

```bash
cd ~/AccessMap && npx eas-cli build --platform ios --profile testflight
```

Use **`testflight`**, not `preview` — `preview` makes an internal link, not a TestFlight build.

Nothing downstream can start until this succeeds, and **this app has never been proven to launch as a binary**. Local simulator builds are currently broken (the `fmt` pod vs Xcode), so there is no cheaper tier that would catch a launch defect. Do it early, not the night before.

⚠️ This is a **paid** cloud build — expect it to consume EAS build credits.

---

## 🟢 After the binary

| | Item | Notes |
|---|---|---|
| ☐ | **One device sitting (~1 h)** | `design-reviews/a11y-qa/2026-07-31/DEVICE-SCRIPT.md §C`. Line 4 matters most: an anonymous report end to end — the first proof the app can write to production at all. |
| ☐ | **App Store Connect forms (~90 min)** | Answers pre-written in `design-reviews/ship-ready/04_appstore_readiness.md`. Privacy nutrition labels · age rating (expect 13+; answer honestly) · EU DSA trader declaration or deselect the EU · metadata · review notes. |
| ☐ | **Accessibility Nutrition Labels (~25 min)** | Declare **only** what the device sitting verified — realistically VoiceOver, Larger Text, Dark Interface, Sufficient Contrast, Reduced Motion. Not Captions or Audio Descriptions; there is no media. |
| ☐ | **App name in Connect** | **Flagstone**. The rename is merged, deployed and live — the reason for it was the University of Washington's "AccessMap" already on the store. |

---

## ✅ Already closed — don't redo these

- **Privacy policy URL live and serving** — `https://skypie99.github.io/AccessMap/privacy/`, real policy, v1.1. This was the #1 automatic-rejection risk.
- **Reviewer credential removed from the public repo** — notes redacted, SQL line is a comment.
- **The Flagstone rename** — merged, deployed, live on both hosts and across the portfolio.
- **CI is green** — all four jobs, as of `4aa3735`.
- **The share link works for people without the app** — it now leads with an https URL.

---

## Not blocking, worth knowing

- **Universal Links** are not configured, so an https flag link opens the web build rather than the app on a phone. Needs an `apple-app-site-association` file, an `assetlinks.json`, and the associated-domains entitlement. Fine to ship without.
- **Apple's social-media questionnaire becomes mandatory for new apps in Sept 2026.**
- `accessmap.skypistudio.com` stays live permanently — the `accessmap://` scheme and every already-shared link depend on it.
