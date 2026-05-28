---
date: 2026-05-26
auditor: Alex
branch: feat/tasks-tab-badge-2026-05-26
status: APPROVED
---

# A11y Gate: Tasks Tab Badge

**WCAG 2.2 AA Compliance:** ✅ PASS

## Audit Summary

Tasks tab badge showing live open-flag count (0–99). Badge clears when queue is empty. Uses design-token colors (color.brand, color.textOnBrand) for proper contrast. Tab icon (✅ emoji) is text, not image. Badge properly declared via `tabBarBadge` prop (React Navigation automatically exposes count to VoiceOver/TalkBack via accessibilityLabel). Touch target for tab itself is native iOS/Android default (min 44pt / 48dp).

**Contrast:** ✅ PASS (brand color on light/dark mode verified via design tokens)  
**Touch targets:** ✅ PASS (tab hit area native minimum)  
**Focus rings:** ✅ PASS (native tab navigation)  
**Keyboard nav:** ✅ PASS (tabs keyboard-navigable by default)  
**Screen reader labels:** ✅ PASS (React Navigation auto-exposes badge count)  
**Reduced motion:** ✅ PASS (no animations in badge logic)  
**Dynamic type:** ✅ PASS (badge size scales with system font scaling)

No component regressions. UX clarity: users at a glance know flag queue status without tapping in.

**Ready to merge.** ✅

