# LAND EVERYTHING — 2026-05-23

A single handoff to land four fast-loop branches + a pending feature branch + two propose-only Supabase migrations, in order, with verification. Designed to be pasted into Cowork (or run yourself) once the orchestrator (PID 68349) is stopped and its worktrees released.

**What this lands:**
- `feat/default-filter-set-2026-05-23` — saved filter set as launch default
- `fastloop/auto-2026-05-23` (v1) — empty state, collapse panel, severity cycle, share flag, 7 tests, briefing
- `fastloop/auto-2026-05-23-v2` — branded headers + Feedback flow, About page, Profile hero, Map top-row grouped, 7 tests, briefing
- `fastloop/auto-2026-05-23-v3` — feedback categories, Supabase feedback table (propose-only), My Feedback page, Help/FAQ page, 13 tests, briefing
- `fastloop/auto-2026-05-23-v4` — jest config ignore `/.claude/`, accessmap:// deep link wired end-to-end
- Two Supabase migrations: `supabase/realtime.sql` (carryover) and `supabase/migrations/2026-05-23_feedback_table.sql` (new)

**What this does NOT touch:**
- The orchestrator (PID 68349) — stop it yourself or let it finish.
- Any remote (`git push` not run).
- The Supabase production data (only DDL migrations, both idempotent + reversible).

---

## STEP 0 — Stop the orchestrator first

If `ps aux | grep -i orchestrator` shows PID 68349 (or any agent process) running, stop it first. Until it exits, the locked worktrees can't be removed and `main` can't be checked out in the primary repo. If you'd rather let it finish, you can wait — none of this work is time-sensitive.

```bash
# Optional — only if you want to stop it now:
kill 68349
```

---

## STEP 1 — Clean up the orchestrator's leftover worktrees

```bash
cd ~/AccessMap

# Remove all .claude/worktrees/* — these were the orchestrator's
# isolated working trees. Once it's stopped, none are needed.
# Use --force on any that complain about being locked or modified.
git worktree remove .claude/worktrees/pm-merges --force
git worktree remove .claude/worktrees/agent-a31117016067fc579 --force
git worktree remove .claude/worktrees/agent-ad415901d487506a9 --force
git worktree remove .claude/worktrees/agent-a2c46d49fb83a6fd8 --force
git worktree remove .claude/worktrees/cycle-pm --force
git worktree remove .claude/worktrees/goofy-newton-8cc5e9 --force
git worktree remove .claude/worktrees/magical-noether-a262aa --force
git worktree remove .claude/worktrees/musing-poitras-1160c1 --force

# Verify they're all gone:
git worktree list
# Should show only: /Users/skypie/AccessMap  <sha>  [fastloop/auto-2026-05-23-v4]
```

---

## STEP 2 — Switch primary to main and merge in order

```bash
cd ~/AccessMap

# Verify the working tree is clean before switching.
git status -sb
# Expect: ## fastloop/auto-2026-05-23-v4

# Move to main. Worktrees should now be released, so this will succeed.
git switch main
git status -sb
# Expect: ## main
```

### Merge 1: `feat/default-filter-set-2026-05-23` (clean, no conflicts)

```bash
git merge --no-ff feat/default-filter-set-2026-05-23 \
  -m "Merge feat/default-filter-set-2026-05-23 — saved filter set as launch default"

npm test 2>&1 | tail -3
npx tsc --noEmit && echo "TC: green" || echo "TC: RED"
# Expect: 9/9 suites passing, 119 tests, TC green
```

### Merge 2: `fastloop/auto-2026-05-23` (v1, clean — different files / different lines)

```bash
git merge --no-ff fastloop/auto-2026-05-23 \
  -m "Merge fastloop v1 — empty state, collapse panel, severity cycle, share flag"

npm test 2>&1 | tail -3
npx tsc --noEmit && echo "TC: green" || echo "TC: RED"
# Expect: 10/10 suites, 126 tests, TC green
```

### Merge 3: `fastloop/auto-2026-05-23-v2` (expected conflict in MapScreen.tsx top row)

```bash
git merge --no-ff fastloop/auto-2026-05-23-v2 \
  -m "Merge fastloop v2 — branded headers, About, Profile hero, top-row grouped"
```

**Expected conflict:** `src/screens/MapScreen.tsx` around the top-row icon buttons.

v1 added a severity quick-cycle button between Filters (⌕) and Refresh (⟳). v2 wrapped the original 4 buttons in a new `<View style={styles.actionBar}>` with internal `<View style={styles.actionDivider}>` lines.

**Resolution:** Take v2's actionBar wrapper, and slot the severity button + a divider inside it between the Filters and Refresh buttons. The merged JSX in the top row should look like:

```jsx
{/* take v2's actionBar wrapper */}
<View style={styles.actionBar}>
  <Pressable onPress={() => setLegendOpen(true)} style={styles.actionBtn} ...>
    <Text style={styles.iconText}>?</Text>
  </Pressable>
  <View style={styles.actionDivider} accessibilityElementsHidden />
  <Pressable onPress={() => setFiltersOpen((v) => !v)} style={[styles.actionBtn, ...]} ...>
    <Text style={...}>⌕</Text>
  </Pressable>
  <View style={styles.actionDivider} accessibilityElementsHidden />
  {/* SLOT v1's severity quick-cycle button HERE */}
  <Pressable
    onPress={cycleSeverity}
    style={[
      styles.actionBtn,
      styles.sevQuickBtn,
      minSeverity > 1 && { backgroundColor: severityColor(minSeverity) },
    ]}
    accessibilityRole="button"
    accessibilityLabel={
      minSeverity === 1
        ? 'Minimum severity: all'
        : `Minimum severity: ${SEVERITY_LABELS[minSeverity]} and above`
    }
    accessibilityHint="Tap to cycle through minimum severity filters"
  >
    <Text
      style={[
        styles.iconText,
        styles.sevQuickText,
        minSeverity > 1 && styles.iconTextActive,
      ]}
    >
      {minSeverity}+
    </Text>
  </Pressable>
  <View style={styles.actionDivider} accessibilityElementsHidden />
  <Pressable onPress={refreshFlags} style={styles.actionBtn} ...>
    <Text style={styles.iconText}>⟳</Text>
  </Pressable>
  <View style={styles.actionDivider} accessibilityElementsHidden />
  <Pressable onPress={requestLocation} style={styles.actionBtn} ...>
    <Text style={styles.iconText}>◎</Text>
  </Pressable>
</View>
```

Then:

```bash
# Verify both halves landed:
grep -n "actionBar\|cycleSeverity" src/screens/MapScreen.tsx | head -5

# Stage the resolved file:
git add src/screens/MapScreen.tsx

# Complete the merge:
git commit  # The editor opens with the prepared merge message — just save & quit.

npm test 2>&1 | tail -3
npx tsc --noEmit && echo "TC: green" || echo "TC: RED"
# Expect: 10/10 suites, 126 tests, TC green
```

### Merge 4: `fastloop/auto-2026-05-23-v3` (clean — stacked on v2)

```bash
git merge --no-ff fastloop/auto-2026-05-23-v3 \
  -m "Merge fastloop v3 — feedback categories, Supabase table (propose), my feedback, help"

npm test 2>&1 | tail -3
npx tsc --noEmit && echo "TC: green" || echo "TC: RED"
# Expect: 11/11 suites, 140 tests, TC green
```

### Merge 5: `fastloop/auto-2026-05-23-v4` (clean — jest config + deep link)

```bash
git merge --no-ff fastloop/auto-2026-05-23-v4 \
  -m "Merge fastloop v4 — jest config ignores /.claude/, accessmap:// deep links wired"

npm test 2>&1 | tail -3
npx tsc --noEmit && echo "TC: green" || echo "TC: RED"
# Expect: 11/11 suites, 140 tests, TC green
```

### Final tree check

```bash
git log --oneline -15
git branch --merged main | grep -v '\*'
# Branches now safe to delete (optional):
#   feat/default-filter-set-2026-05-23
#   fastloop/auto-2026-05-23
#   fastloop/auto-2026-05-23-v2
#   fastloop/auto-2026-05-23-v3
#   fastloop/auto-2026-05-23-v4
```

---

## STEP 3 — Apply the two Supabase migrations

Both are idempotent and reversible. Apply in any order; recommended `realtime.sql` first since it's the older carryover.

### Migration A: `supabase/realtime.sql` — realtime flag updates

1. Supabase Dashboard → Project → SQL Editor → New query.
2. Paste the entire contents of `~/AccessMap/supabase/realtime.sql`.
3. Click **Run**.
4. Verify: open AccessMap on two devices → on device 1, drop a new flag → on device 2 it appears on the map within ~1 second without tapping refresh.

Rollback (if needed): `ALTER PUBLICATION supabase_realtime DROP TABLE public.flags;`

### Migration B: `supabase/migrations/2026-05-23_feedback_table.sql` — feedback table

1. Supabase Dashboard → SQL Editor → New query.
2. Paste the entire contents of `~/AccessMap/supabase/migrations/2026-05-23_feedback_table.sql`.
3. Click **Run**.
4. Verify steps:
   - Dashboard → Database → Tables → confirm `public.feedback` exists with columns `id, user_id, category, body, contact_email, platform, created_at`.
   - Dashboard → Database → Policies → confirm 4 policies on `public.feedback`: `feedback_insert_self_or_anon`, `feedback_select_own`, `feedback_select_maintainer`, `feedback_delete_own`.
   - Open AccessMap → header → Feedback pill → pick a category, type a message, tap Send. Mail composer opens AND a row should appear in `Dashboard → Table editor → feedback`.
   - Open AccessMap → Profile → "My Feedback" row → the message you just sent should be in the list.

Rollback (if needed): `DROP TABLE public.feedback CASCADE; DROP TYPE public.feedback_category;` (then revert the `feedback` block in `src/types/database.ts`).

---

## STEP 4 — Smoke-test the merged app

After merges + migrations are done, exercise the whole shipped surface:

1. **Header on every tab** is brand blue with white title + "Feedback" pill on the right.
2. **Map top-row** is a single white pill containing 5 icon buttons (`? ⌕ {n}+ ⟳ ◎`) with thin dividers.
3. **Open the filter panel** → tap the chevron next to "Filter flags" → sections collapse and stay collapsed across an app reload.
4. **Set narrow filters** (e.g. only "broken sidewalk" + severity 5+) → if no flags match, a card appears with a "Reset filters" button that works.
5. **Tap any flag in Tasks** → tap "Share" → OS share sheet opens with the prefilled message including an `accessmap://flag/{id}` URL.
6. **Open Profile** → branded hero card with points + a progress bar to the next milestone.
7. **Profile rows**: My Reports, My Feedback (shows your sent messages once the migration is applied), Help & FAQ (7 collapsible questions), About AccessMap (version badge from `expo-constants`).
8. **Header → Feedback pill** → modal with category chips (Bug 🐛 / Idea 💡 / Love ❤️ / Other 💬), body field, optional reply email → Send opens your mail app AND inserts a row in the feedback table (visible in My Feedback after a pull-to-refresh).
9. **Open `accessmap://flag/<any-real-id>`** in Safari (`xcrun simctl openurl booted accessmap://flag/<id>` in the iOS simulator) → app launches → Map opens → animates to that flag → callout pops.

If any of those don't behave: the per-feature briefings under `qa-reports/fastloop-*.md` have "how to see it" + "refine vs. remove" notes for each one.

---

## What you DON'T need to do

- **Bumping app version** — `expo-constants` auto-reads `app.json` so the About modal stays current. Bump `version` in `app.json` when you cut a release.
- **Adding jest worktree ignore** — already in `jest.config.js` (v4 commit).
- **Deep-link app.json edits** — the `scheme: "accessmap"` was already set; nothing else to register.
- **Manually running v3's mock-prefix rename** — already in the v3 commits.
