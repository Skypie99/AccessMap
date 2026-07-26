# AccessMap — Case Study DRAFT (for Sky's voice-approval)

**Status: DRAFT — nothing wired live.** This is recruiter-facing copy in your public voice, so it's
yours to approve/edit before it goes anywhere. Drafted by Morgan, 2026-06-19, off the verified code
state (`main == origin == 4ebd824`). Honest on ship status: **live web demo + iOS in TestFlight (active dev)** — not "on the App Store."

Purpose: AccessMap is your most technically impressive build, but a recruiter who clicks the live demo
just sees "a map." This makes the depth (privacy engineering + real WCAG-AA) legible in a 30-second skim.

---

## 1. README top section (drop in above "What's in v0.2.0")  — ~190 words

> **AccessMap — crowdsourced accessibility mapping**
> *Solo build · Expo / React Native + Supabase · native + web from one codebase*
>
> AccessMap lets people flag accessibility barriers — a broken curb ramp, a missing tactile path — and
> pin them to a real city map so others can route around them.
>
> The part I'm proudest of is the **privacy engineering**. A photo of a barrier carries GPS EXIF that can
> pinpoint where a disabled person was standing. So every upload runs through a **fail-closed strip
> pipeline**: it re-encodes the image, structurally verifies that no metadata survived, and **aborts the
> upload entirely** rather than ever risk leaking a location. The app also honors the **right to deletion**
> end-to-end (anonymize, then cascade-delete) and scopes every database row with Postgres **row-level security**.
>
> Accessibility is treated as the spec, not a coat of paint: **1,000+ accessibility annotations**, color is
> never the sole signal, and reduced-motion + dynamic-type are supported throughout — all backed by a
> CI-gated test suite.
>
> **Live web demo:** [accessmap.skypistudio.com](https://accessmap.skypistudio.com) · **iOS:** in TestFlight (active development).

---

## 2. Portfolio card `summary` (deliverables.json, ≤160 chars) — proposed swap

**Current:** *"Mobile app for flagging accessibility barriers — broken ramps, missing tactile paths — pinned to a real city map. Privacy-first: no tracking, no data sold."*

**Proposed (leads with the differentiating hook):**
> *"Crowdsourced map of accessibility barriers. Photo uploads are GPS-stripped fail-closed, so a barrier report can never leak someone's location. Native + web."*  (152 chars)

Keep the existing GitHub + "Live demo" links as-is. Optionally relabel the demo link "Live web demo" so a
recruiter doesn't expect a mobile app to open.

---

## 3. The 2–3 sentence interview pitch (say-it-out-loud version)

> "AccessMap is a crowdsourced accessibility-mapping app I built solo — Expo/React Native + Supabase,
> native and web from one codebase. The part I'm proudest of is the privacy engineering: a barrier photo
> carries GPS that pinpoints where a disabled person was, so I built a fail-closed strip pipeline that
> re-encodes the image, verifies no metadata survived, and *aborts* the upload rather than risk a leak —
> and it honors right-to-deletion end to end. It's WCAG-AA throughout, with 1,000+ accessibility annotations."

Optional honesty beat that lands well: *"The one thing I'd flag is I've verified the strip in tests but
not yet on a physical device with a real GPS photo — and knowing the difference between 'tests pass' and
'verified on the device' is kind of the point."*

---

## 4. Notes before this goes live (your call)

- **Verified proof points** (safe to claim): fail-closed EXIF strip + structural verify + abort
  (`src/lib/flags.ts`); right-to-deletion edge function; path-scoped Postgres RLS; native + web one codebase;
  1,000+ accessibility annotations (1,038 counted).
- **Number to confirm — sources disagree, so I kept the copy conservative ("CI-gated test suite", no count):**
  the README says **1,120 tests**, the live grep counts **~1,640**, old memory said 1,564. Pick the real
  number and you can say "1,600+ tests" — until then I left an exact count out rather than overstate.
- **README drift to fix in the same pass** (the case study sits above these, so reconcile them): "+5 verified,
  +10 resolved" → live is **10/15 reporter, 3/7 actor** (matches the CLAUDE.md fix you just merged); "1,120
  automated tests" → confirmed count; "WCAG **2.1** AA" → you target **2.2 AA** elsewhere; "**App Store ready**
  … signed release builds" → honest is **"in TestFlight (active dev)"**, not shipped to the store.
- **Do not claim** "on the App Store" or a device-verified privacy guarantee until the on-device EXIF check is run.

**To wire it in:** I can put this on an `feat/accessmap-case-study-2026-06-19` branch (README + the
deliverables.json summary swap) for you to review + merge — say the word. Both are public surfaces, so
they stay branch-only until you approve the voice.
