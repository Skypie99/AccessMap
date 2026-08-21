# RUN — PHASE B **WAVE 4 of 4**: THE LOW FINDINGS (15) + FINAL CLOSE-OUT

Paste this whole file into a fresh window. This is **polish work** — small, low-risk, high-per-edit value. Model: Opus (Sky-initiated only).
**Prerequisite:** Waves 1–3 committed. Full context: `PHASE_B_MASTER_PLAN.md` · findings: `LEDGER.md` **and** `screens/` (most Low findings live only in the screen banks).

---

## RAILS
- **Never touch `main`.** Branch off the Wave 3 tip. One commit per cluster. Sky merges — nobody else.
- **STEP 0 — you run this, before editing. Sky does nothing.** Pin the gate: `npm run typecheck` · `npx jest --ci -w 3` · `npm run lint`.
- 🔴 **Never `prettier --write src`** — breaks 5 source-pinning guard tests (PROTECT-11 / §SKY-6). This matters most in *this* wave, where the temptation to bulk-format copy changes is highest.
- PROTECTED identifiers: `com.accessmap.app`, slug/scheme `accessmap`.

---

## ⚠ TWO OF THESE ARE NOT YOURS TO FIX — verify on a real device first
- **SW-03** — the paged onboarding carousel exposes duplicated scroll-bar a11y nodes, including *"Vertical scroll bar, 5 pages"* on a **horizontal** pager. Marked **PLAUSIBLE**: this may be a WebDriverAgent representation artifact rather than what VoiceOver actually announces.
- **SW-16** — replay-intro steps expose their copy **only as 1×1pt StaticText** elements ("Welcome to Flagstone. Drop a pin…", rect `[0,0,1,1]`). Likely a deliberate announcement pattern.
**For both: the AX tree is a proxy, not a screen reader. Do not write a fix from simulator evidence.** Read `OnboardingModal.tsx` / `OnboardingCards.tsx` to understand the intent, report what you find, and leave the change to a device-verified pass.

---

## CLUSTER 1 — safe-area · **SW-02**
Bottom-anchored secondary controls intrude into the 34pt home-indicator inset: onboarding cards 3+4 ("Not now" / "Maybe later") at **y884–928**, 6pt past the 922 boundary; SignIn's Privacy link at **929**, 7pt past.
**If Wave 2 fixed SW-01 properly, this is likely already fixed** — same root cause, one bottom-inset treatment. **Verify first; only edit if it survived.**

## CLUSTER 2 — copy / label-vs-behaviour · 4 IDs, one pass
- **SW-06** — card-5 CTA a11y label reads "Open the map" vs rendered text capitalization ("Open the Map"). **WCAG 2.5.3 label-in-name**: the visible label must be contained in the accessible name. Check the copy source.
- **SW-17** — the replay finisher is labelled **"Open the map"** but **returns to Settings**. Either make the label honest or make the behaviour match it.
- **SW-21** — the "Update banner preferences" row subtitle says *"in-app updates banner"*; the sheet it opens says *"surface on your Profile"*. Two names for one feature. Pick one.
- **SW-34** — reporter attribution drifts between **"Another community member"** and **"Anonymous"** for the same anonymized case, across different flags. Pick one string.

## CLUSTER 3 — Dynamic Type wrapping · **SW-36 + SW-51** · one text treatment
At `accessibility-extra-large`, text breaks **mid-word**: Tasks shows "Broken sidewal / k" beside the Open badge (SW-36), and the Profile BY CATEGORY / BY SEVERITY lists show "Broken sidewal / k", "Modera / te", and a clipped "Signific…" (SW-51).
Everything else at that size reflows correctly — Profile rows grow 67 → 145–266pt, buttons 44 → 51pt, no clipping or overlap — so this is specifically a word-breaking treatment, not a layout failure.
**Fix once** (shared text component / `numberOfLines` / break strategy), then re-check both surfaces.
**Verify:** `xcrun simctl ui <udid> content_size accessibility-extra-large`, then census Tasks and Profile.

## CLUSTER 4 — onboarding coherence · **SW-19**
Two divergent onboarding surfaces exist: the **5-card first-launch** flow and a **3-step replay** modal. The Settings row subtitle says *"Re-show the 3-card welcome intro"* — which matches **neither** exactly (replay is 3 **steps**; first-launch is 5 **cards**).
**Sky's decision (#6):** converge them, or keep both and make the copy honest about which one the row opens.

## CLUSTER 5 — misc singles
- **SW-27** — "**3351 min walk**" rendered for a barrier **279km** away. Walking-time is meaningless past a threshold; suppress it or switch units beyond some distance.
- **SW-41** — Profile shows two stacked progress bars that read as one bar drawn twice: "Bronze tier, 90 of 100 points to Silver" and "Progress toward Engaged badge, 90 of 100 points", both ~90%, 46pt apart. **Honest caveat: the thresholds genuinely coincide at 100 for that tier** (confirmed: Engaged = 100 pts, Silver = 100 pts; the next badge, Dedicated, is 500). **Check whether the two tracks can ever diverge** before collapsing them — if they rarely do, one bar with two markers is the better shape.
- **SW-29** — map markers **38×40**, judged *acceptable* (map-marker convention). **Sky's decision (#4)** — accept or raise to 44. Don't change it unilaterally.
- **SW-07 (OBS)** — no "Forgot password" anywhere on the auth surface (census-complete). **Product choice, not a defect** — Sky's decision (#5).
- **SW-14 (OBS)** — GuestProfile is a single CTA on an otherwise empty screen; could surface community content. **Product choice** — Sky's decision (#5).

---

## FINAL CLOSE-OUT (this wave owns it)
This is the last wave, so close the whole programme out:
1. **Conservation check** — account for **all 48 IDs**: fixed / deliberately-not-fixed / deferred-to-Sky / device-only. Nothing may be silently dropped. (An earlier rollup lost SW-10 and SW-13 by accident — don't repeat it.)
2. **Gate**: baseline vs final, all three commands.
3. **Full re-walk** of the simulator across both devices, both appearances, confirming the Wave 1–2 blockers and the sheet geometry are genuinely fixed.
4. **Restate the DEVICE-ONLY remainder** that no amount of Phase B can close: real VoiceOver (SW-23, SW-03, SW-16), camera + real EXIF, push delivery and the OS notification dialog (needs a fresh install), real GPS, release-binary performance, force-rotate, and **a normal non-admin signed-in user's view** (the authed walk ran on an admin account).
5. **List what still needs Sky**: the 6 decisions in `PHASE_B_MASTER_PLAN.md`, plus the merge itself.

**Do not merge.**
