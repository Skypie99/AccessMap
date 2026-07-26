# FlagCard Redesign — PROMPT 2: DIRECTION (read-only)

**Date:** 2026-06-27 · **Component:** the inline `FlagCard` in `src/screens/TasksScreen.tsx` (render L1294–1528, styles L1718–1785) · **Pass:** 2 of N — DIRECTION (propose + show; **no build**) · **Repo:** `~/AccessMap` (HEAD `8a7cce5`, `main`)

> **What this is:** the second focused pass of the FlagCard redesign recipe. It turns Discovery's §8 brief into concrete, choosable redesign directions, shows them as token-faithful mockups, and locks the one Sky's eye picked — **before any build credit is spent.** It proposes; it does **not** build. Strictly read-only on app code. The **BUILD is a separate later pass.**
>
> **Mockups:** rendered inline in the session, and saved here as standalone openable files:
> - [`assets/2026-06-27_flagcard/options-A-B-C.html`](assets/2026-06-27_flagcard/options-A-B-C.html) — today's card → Option A / B / C, phone-framed.
> - [`assets/2026-06-27_flagcard/action-row-resilience.html`](assets/2026-06-27_flagcard/action-row-resilience.html) — the headline fix: today's wrap vs the tiered equal-share layout at 375 / 320 / large type.

---

## Context — why this pass exists

Discovery (`qa-reports/2026-06-26_FlagCard_Discovery.md`) measured *why* the Tasks barrier card feels cheap and busy: **~8–10 competing elements, no clear primary, an over-elevated `shadow.e2` slab, a buried "Severity N", a redundant italic hint, and an action row of four content-sized pills that just barely fits at 375pt (6px headroom) and wraps raggedly everywhere narrower or at large type.** Sky is validating a redesign *recipe* on this one component. Discovery diagnosed; this pass turns its §8 brief into directions Sky chooses between.

The card's **job** is triage: *"Is this report real and worth acting on — Verify / Resolved / Reject / open Details?"* Every element earns its place against that.

**Two gates, both must hold for any direction:**
- **Gate 1 — CLEAN:** decluttered, one clear primary, real hierarchy, breathing room (toward Home's restraint; away from the four candy pills).
- **Gate 2 — ACCESSIBLE:** AA both themes; severity/status never color-alone; no ragged wrap / unbounded growth at ≥×1.6 Dynamic Type down to 320pt; every target ≥44×44 with spacing + `hitSlop` so adjacent constructive/destructive actions can't mis-tap; SR labels/roles/states preserved (+ add the two missing button hints).

---

## Recap the target

**Keep** (triage essentials): category icon + title, a *legible* severity, status (Open/Verified — it gates which actions apply), photo evidence when present, all four actions reachable, quiet distance + time. **Cut / shrink:** the italic "tap to view on map" hint (redundant with the card's a11y hint) → **drop**; the unbounded description → **clamp to 2 lines**; the bare "Severity N" in muted meta → **promote to a `SeverityBadge`**; `shadow.e2` "Floating" → **flatten / restrain**; four equal candy pills → **tier into one primary + quieter rest.** The headline fix is the **action row**.

**Vocabulary to extend (no from-scratch aesthetic):** Home's flat `listCard` (hairline border, no shadow — `HomeScreen.tsx:453`); the proven non-wrapping action pattern is the bulk bar's `bulkBtn { flexGrow:1, flexBasis:0 }` (`TasksScreen.tsx:1973`); reuse `SeverityBadge` (number always shown — `src/components/SeverityBadge.tsx`), `StatusBadge`, `PressableScale`, `GlassSurface`, `Card` (role-based elevation), `AppText`; tokens from `src/theme.ts` (severity ramp, spacing 4-grid, `radius`, `shadow.e1/e2`, status pairings).

---

## The three directions

All three **share the same content recomposition** — `SeverityBadge` + title + `StatusBadge` in the header, photo + 2-line-clamped description + one quiet meta line in the body, hint removed. They differ on **material** and **action layout**.

### Option A — "Calm editorial row" (FLAT)
- **Material:** Flat. Hairline border, **no shadow** — reads like Home's list. Depth is a whisper: the `PressableScale` press-spring + the colored `SeverityBadge`. Most restrained, most editorial, most on-pattern with the DESIGN.md flat-list rule.
- **Action layout — Pattern 1 (tiered single row):** `[ Verify — filled brand, flexGrow:2 ] [ Resolved ] [ Reject ] [ Details ]` — the three secondaries are quiet ghost/neutral buttons at `flexGrow:1, flexBasis:0`. One filled primary, three calm equals. All flex → the row **cannot wrap raggedly**; below a width/type threshold it reflows to a **deliberate 2-row stack** (primary on top).
- **Tradeoffs:** optimizes calm + legibility + Home-consistency + lowest risk. Gives up the lush glass depth Sky loves (this is the most minimal). Both gates met. **Build:** LOW — reuses `SeverityBadge` + the `bulkBtn` flex pattern; no new primitives.

### Option B — "Restrained material card" (SUBTLE LIFT / GLASS)
- **Material:** Where Sky's beloved depth lives, with restraint — **one notch of elevation (`shadow.e1` "Lifted", not e2)** + hairline, or a subtle `GlassSurface` tint (its `overlayGlass` 0.82 floor keeps text AA). One calm card per row, never a busy floating slab. Depth as **accent**, not every row a box.
- **Action layout — Pattern 2 (primary + docked footer):** a hairline-separated footer bar; row 1 = `Verify` filled full-width; row 2 = `Resolved / Reject / Details` equal-share ghost. Reads like a deliberate docked action bar (echoes the bulk bar). Reflows to a 2×2 at the largest type.
- **Tradeoffs:** optimizes Sky's material/depth taste + a polished card-object feel. Departs from Home's bone-flat list (defensible — these are *action* surfaces, not nav rows). Both gates met (glass AA via `overlayGlass`). **Build:** MEDIUM — elevation/glass tuning + the footer; glass feel is NEEDS-SKY-DEVICE.

### Option C — "One hero action + overflow" (MAX DECLUTTER)
- **Material:** flat (A) or lifted (B) — orthogonal.
- **Action layout — Pattern 3:** exactly one filled `Verify` + a single `⋯` overflow (44×44) opening a small sheet/menu with Resolved / Reject / Details (Details already contains every action). The cleanest hierarchy and the **most resilient** (one wide button + one icon button literally cannot wrap or cramp at any width/type).
- **Tradeoffs:** maximal calm + resilience, but Resolved/Reject become **2 taps deep** — a real cost in a fast triage queue. Both gates met (menu items get full-width 44px targets; needs an accessible menu). **Build:** MEDIUM — needs an accessible action menu (a `Sheet` primitive exists).

---

## The action-row solution in focus (the headline fix)

Root cause (Discovery §5): `actionBtn` has **no `flex`/`minWidth`** — pills are content-sized in a `flexWrap:'wrap'` row, so the row can only wrap; at 375pt it fits with 6px to spare, and wraps at 360/320pt and at ×1.6 type. The fix in all options is the **proven equal-share flex** (`flexGrow`/`flexBasis:0`, as `bulkBtn` already does) plus a **width floor** and a **deliberate reflow**, so the row distributes instead of wrapping ragged.

**Chosen = Pattern 1 (tiered single row):** Verify carries `flexGrow:2` (visually primary), the three secondaries `flexGrow:1, flexBasis:0`. Resilience (see the resilience mockup):
- **375pt / default:** one tidy row, one clear primary.
- **320pt / default:** reflows to a **deliberate 2-row** stack (primary full-width on top, three equal below) — controlled, never ragged.
- **×1.6 Dynamic Type:** the same controlled 2-row, just larger; no stranded pill.
- **Mis-tap killed:** Reject is a quiet ghost set apart from the filled primary; every target keeps `minHeight:44` + a width floor + `hitSlop`, so a destructive tap can't sit flush against a constructive one.

(Patterns 2 and 3 are even more trivially resilient — a full-width primary + a footer / a single icon button can't wrap at all.)

---

## Recommendation (what was offered)

The recommendation going in was **Option A's composition + Pattern 1 action row**, with the material as the one open call — a *whisper* of `shadow.e1` lift over bone-flat (depth as a restrained accent, per Discovery §8 and Sky's "depth used with restraint"): lowest build risk, all four actions one tap away. Option B was offered for stronger signature depth; Option C only if Resolved/Reject could go a tap deeper. **Framed so Sky chose — her picks are below.**

---

## ✅ Locked direction (Sky's choices — 2026-06-27)

Sky chose, by her eye, from the mockups:

| Axis | Choice | Means for the build |
|---|---|---|
| **Material** | **Restrained glass** | The card body is a restrained `GlassSurface` (its `overlayGlass` 0.82 floor keeps text AA), paired with a soft `shadow.e1` lift so the depth still reads on a scrolling list where there's little texture to blur. No return to `shadow.e2`; depth is the accent, not a busy slab. |
| **Actions** | **All four visible, tiered** (Pattern 1) | `[ Verify — filled brand, flexGrow:2 ] [ Resolved ] [ Reject ] [ Details ]` with the three secondaries quiet ghost at `flexGrow:1, flexBasis:0`; deliberate 2-row reflow at narrow / large type. |
| **Description** | **2-line clamp** | `numberOfLines={2}` with ellipsis; full text in Details. |
| **Severity** | **`SeverityBadge` "3 · Moderate"** (number + word) | `<SeverityBadge level={…} showLabel size="sm" />` in the header; replaces the bare "Severity N" in the meta line. |

**Build target = a restrained-glass FlagCard (`e1` lift) · header = SeverityBadge + title + StatusBadge · body = photo + 2-line description + one quiet meta line (hint removed) · tiered single-row action layout that reflows deliberately.**

> **Glass caveat (NEEDS-SKY-DEVICE):** the card sits in the Tasks list over the screen wash (not the map), so the *blur* itself reads subtly — most of the "material" comes from the tint + the `e1` lift. Confirm the feel on a real iOS device in the verify pass; if the blur reads muddy, the fallback is tint + `e1` without heavy `intensity`.

---

## Felt-target → checkable criteria (the BUILD pass's contract — LOCKED)

The build must prove:
1. **≤ ~6 distinct elements** in the common open+photo state (down from 8–10); the italic "tap to view on map" hint removed.
2. **One clear primary** (`Verify`, filled brand); primary → secondary → tertiary hierarchy visible at a glance; the three secondaries quiet (ghost), with `Reject` set apart from the primary.
3. **Action row holds 320pt → 375pt AND at ≥×1.6 Dynamic Type**, both themes — one tidy row or a *deliberate* 2-row stack, **never a ragged wrap**; every target ≥44×44 with spacing + `hitSlop`; no constructive/destructive mis-tap adjacency. (Use the `bulkBtn` `flexGrow/flexBasis:0` pattern.)
4. **Severity** = `SeverityBadge` "3 · Moderate" (number + word + color, never color-alone); **status** stays a `StatusBadge` (dot + word).
5. **Description** = `numberOfLines={2}` clamp — no unbounded card growth (today: 1612px on a long note).
6. **Material** = restrained `GlassSurface` + `shadow.e1` lift; **never** `shadow.e2`.
7. **AA both themes**; SR labels/roles/states preserved; the two missing `accessibilityHint`s added (Verify / Resolved / Reject).
8. **Feels** calm / clear / expensive — not busy / shouting / lopsided.

---

## Coverage + device flags

**Web-mockable (shown):** layout, hierarchy, type, color, the wrap/reflow behavior of every action pattern, both the action-row failure + fix — via token-faithful reconstructions (same method as Discovery; RN-web compiles the same flexbox).
**NEEDS-SKY-DEVICE (build/verify pass):** real iOS **blur/glass feel**, real **Safari/WebKit** layout, **VoiceOver/TalkBack** reading order, and real **touch mis-tap** on the reflowed 2-row at large type.

---

*Direction proposed, seen, chosen. No app code touched. The BUILD pass builds the locked direction against the contract above.*
