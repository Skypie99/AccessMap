# BANKED QUESTIONS — Sky rules, nothing was guessed

Unattended-mode bank. Each carries a recommendation; none blocked the spec. **Q3 is the load-bearing one** — it is the formal sign-off the guard law requires.

---

**Q1 · Zoom clamps on the map?** Pinch is native and unclamped today (no `minZoomLevel`/`maxZoomLevel`).
→ **Recommend: add `minZoomLevel={3}` only** (stops the disorienting zoom-out-to-space where all pins merge into one cluster dot); skip a max clamp (Apple Maps' own ceiling behaves). Web twin gets `minZoom={3}` for parity. One-prop change per platform, or zero if you'd rather leave it wholly native.

**Q2 · Keep two-finger rotate + pitch (tilt)?** Both are ON today (platform defaults; iOS shows its native compass to re-north after a rotate).
→ **Recommend: KEEP** — it's how every iOS map behaves, and this app shouldn't be the one that removes standard map gestures. If the device pass finds rotation disorienting in practice, the off-switch is two props (`rotateEnabled={false}` `pitchEnabled={false}`). Rule after feeling it on hardware.

**Q3 · THE MECHANISM RULING (this is the law-F sign-off).** Guard law F currently bans all custom gesture code ("swipe stays UIKit-only"). Three lawful paths for the half-sheets:
   - **A (recommended): amend law F** to a single-file exception (`SheetPull.tsx`, RNGH `PanGestureHandler` + core Animated) with its own guard — SPEC §3.2/§3.4. Real finger-tracking pull-to-dismiss on Report and the other half-sheets, the ban keeps its teeth everywhere else.
   - **B (zero-amendment): Tier 1 only** — native swipe on the pageSheets (Nearby now, Resources/HowToHelp optionally), half-sheets keep buttons-only. Smallest possible change; Report gets no gesture.
   - **C (rejected, for the record): convert half-sheets to pageSheets** for free UIKit swipe — destroys the designed half-height glass sheets. Named only so the road not taken is visible.
→ **Approving this spec with option A is the "deliberate amendment with Sky's sign-off" the sibling run's hard warning demands.** Option B is a legitimate cheaper ruling — say the word and the build shrinks to commits G0(partial)+G1.

**Q4 · Haptic tick when a drag first crosses the commit threshold?** (`hapticSelection()` — the same tick the glass flip uses; fires once per crossing, not on spring-back.)
→ **Recommend: ON.** It teaches the threshold invisibly. Pure taste — flip to OFF costs one constant.

**Q5 · Ride the Tier-1 prop onto the other pageSheets (Resources, How to help)?** Same one-line `allowSwipeDismissal={true}`, same mechanics, keeps every close button.
→ **Recommend: YES** — one gesture grammar app-wide; a sheet that drags on Explore but resists in Resources would feel broken.

**Q6 · Drawer swipe-to-close (horizontal)?** The analogous gesture for the hamburger drawer. Law H freezes its Modal tag, so it needs its own deliberate amendment + wiring.
→ **Recommend: DEFER** — separate small run after the sheet gestures prove out on device. Not in this build.

**Q7 · `keyboardDismissMode="on-drag"` on Report's form scroll?** With the pan disabled while the keyboard is up (the safe rule), this makes drag #1 drop the keyboard, drag #2 dismiss the sheet — no dead-feeling drags.
→ **Recommend: YES** (native both platforms; zero risk to the KAV/inset math — it only dismisses the keyboard).

**Q8 · Pull-to-dismiss on the web build?** RNGH-web could do it, but desktop pointers don't sheet-drag anywhere, and the web half-sheets already have X/scrim/Escape.
→ **Recommend: NO for v1** — `SheetPull` passes children through on web. Revisit only if mobile-web usage shows demand.

**Q9 · Tier-2 v1 scope?** The primitive can adopt into six half-sheets plus the `Sheet` primitive (which rides into the Tasks filter sheet + Changelog — the device-tune-owned surface, same recorded-ride-along discipline as the G3 grabber).
→ **Recommend: v1 = Report + FlagDetail + Legend** (the three sheets users actually live in), device-pass, THEN the remaining three + the `Sheet` primitive as a follow-up slice with the ride-along noted to the device-tune ledger. Ship the pattern before the estate.
