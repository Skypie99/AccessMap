# LENS 5 — RESIZE / REFLOW / DYNAMIC TYPE (banked 2026-07-31)

## Verified (programmatic)

- `dynamicTypeGuard` green at HEAD: 6 rules, **empty allow-list**; `allowFontScaling={false}` = 0 occurrences in non-test src; AppText per-variant caps with **body/bodyMedium uncapped by law** (PROTECT-13).
- T13/T14 all present in tree: ScreenHeader titles wrap (numberOfLines 2) instead of tail-ellipsizing at the 0.6 floor (1.4.4); distances join value+unit with U+00A0 so "297 m" can't orphan; Settings double-inset killed; 6 chip rails carry the OverflowFade scent.
- 1.4.10 reflow: single-column mobile-first layouts; horizontal rails are supplementary (fade-scented) not content-bearing; S18's 200%-zoom guards green; web tab bar is in-flow.
- 1.4.4 / tab bar: `tabBarAllowFontScaling:false` is the app's only total suppression — structurally forced by the fixed-height bar (SR-078, known-deferred; calibrated as a documented exemption, not a violation) → device row D-A2.

## Re-surfaced known-open (reasons stand; none re-litigated, all confirmed still relevant at HEAD)

- **SR-075**: 3 SeverityDisc call sites pass no `maxFontSizeMultiplier` (ActivityFeedModal:156, LegendModal:82, NearbyFlagsModal:154) → D-A3.
- **SR-076**: 4 Tasks bulk labels rely on `adjustsFontSizeToFit` — unimplemented on rn-web → "Verif…" truncation web-side.
- **SR-081**: `SeverityBadge showLabel` pill lacks flexShrink/wrap — can push the sibling title out at 2× → D-A4.
- **SR-091**: the only two `adjustsFontSizeToFit` sites without a `minimumFontScale` floor (ProfileScreen:1293, :1993).
- **SR-045**: AddressSearchModal results list never got the M13 flexShrink.
- **B1-E** (layout half): comment footer `space-between` pushes the timestamp to the left edge at large Dynamic Type → device row D-B19.

## Notes

- **1.4.12 text spacing (web)**: AppText line-heights are multiples and layouts are minHeight-based (tolerant by construction), but no explicit override-survival check has ever run — folded into the device/browser script as a needs-browser row rather than manufactured into a finding.
- The dynamicTypeGuard's own stated blind spots (never measures overflow at 1.5/2/3×; no rule asserts a cap exists) are why D-A1..A5 stay on the device script — jest cannot prove AX5.

**FINISHED** — 0 new findings; 6 known-open re-surfaced with reasons; AX-size truth lives on the device script by design.
