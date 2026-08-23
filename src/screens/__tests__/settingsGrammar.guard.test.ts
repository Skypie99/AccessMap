/**
 * BOARD 07 — the Settings grammar, pinned.
 *
 * ─── WHAT THE CRITIC PASS SAW (02_critic_pass1.md §12, §12b, X10) ─────────
 * Four separate incoherences on one screen, none of them bugs:
 *
 *   1. Eleven rows, eleven glass cards, eleven shadows — while the Home list
 *      one tab away stacks its rows INSIDE one card with hairline separators.
 *      Two grammars for "a list of rows", a tap apart.
 *   2. Two of eleven rows carried a leading icon (Replay tutorial, Export my
 *      data). Either icons mean something and every row gets one, or they do
 *      not and none does. I4 rules: the drawer carries icons, Settings carries
 *      explanations.
 *   3. A GUEST was offered "Sign out". The drawer, one tap earlier, offered
 *      "Sign in" (dossier COULD-9).
 *   4. The eyebrow said "SETTINGS" over a title reading "Settings" — the one
 *      screen where the pair had nothing to add.
 *
 * ─── SOURCE-SCAN IDIOM, deliberately ──────────────────────────────────────
 * SettingsScreen needs a tab navigator, Supabase, auth, the drawer and the
 * shared-modal host to mount. What is protected here is COMPOSITION — which
 * component wraps which, and that no row re-grows its own card — which is
 * exactly what a source scan can see and a render test would need the whole
 * provider stack to reach. Same idiom as inertControlVisual.guard.test.ts,
 * which pins the neighbouring rules on this same file.
 *
 * The strings themselves are not pinned here: `onboardingCoherence.guard`
 * already owns the Replay-tutorial row, and the section names on this screen
 * are PLACEHOLDERS awaiting Sky (build/COPY_LEDGER.md).
 */
import fs from 'fs';
import path from 'path';
import { size } from '@/theme';
import { stripComments } from '../../__tests__/support/stripComments';

const raw = fs.readFileSync(
  path.join(__dirname, '..', 'SettingsScreen.tsx'),
  'utf8',
);
const src = stripComments(raw);

describe('board 07 — the card is the section, not the row', () => {
  it('every SettingsRow is inside a SettingsGroup', () => {
    // Walk the render, tracking group depth. A row at depth 0 is a row that
    // grew its own card back.
    let depth = 0;
    let orphans = 0;
    let rows = 0;
    for (const line of src.split('\n')) {
      if (line.includes('<SettingsGroup>')) depth += 1;
      else if (line.includes('</SettingsGroup>')) depth -= 1;
      else if (line.includes('<SettingsRow')) {
        rows += 1;
        if (depth === 0) orphans += 1;
      }
    }
    expect(rows).toBeGreaterThanOrEqual(11); // the scan is not vacuous
    expect(orphans).toBe(0);
    expect(depth).toBe(0); // balanced
  });

  it('the row itself carries no material — only the group does', () => {
    // The GlassSurface moved up. A `variant="row"` inside SettingsRow would be
    // the eleven-cards regression coming back.
    const rowComponent = src.slice(
      src.indexOf('function SettingsRow('),
      src.indexOf('function AppearanceControl('),
    );
    expect(rowComponent).not.toContain('GlassSurface');
    expect(src.slice(src.indexOf('function SettingsGroup('))).toContain(
      '<GlassSurface variant="row" style={styles.group}>',
    );
  });

  it('the separator is a hairline, indented like the Home list', () => {
    expect(src).toMatch(/groupSep: \{\s*height: StyleSheet\.hairlineWidth/);
  });
});

describe('I4 — Settings rows carry no leading icons', () => {
  it('no row passes one', () => {
    expect(src).not.toMatch(/\bicon=\{/);
  });

  it('the two glyphs that used to are not even imported', () => {
    // PlayCircle (Replay tutorial) and ClipboardCopy (Export my data).
    expect(src).not.toContain('PlayCircle');
    expect(src).not.toContain('ClipboardCopy');
  });

  it('the drawer keeps ITS icons — this is a Settings rule, not a purge', () => {
    const drawer = fs.readFileSync(
      path.join(__dirname, '..', '..', 'components', 'HamburgerDrawer.tsx'),
      'utf8',
    );
    expect(drawer).toContain('icon={');
  });
});

describe('S6 — one row height, shared with the drawer', () => {
  it('Settings reads the token instead of its own constant', () => {
    expect(src).not.toContain('SETTINGS_ROW_HEIGHT');
    expect(src).toMatch(/minHeight: size\.row/);
  });

  it('the drawer reads the same one', () => {
    const drawer = stripComments(
      fs.readFileSync(
        path.join(__dirname, '..', '..', 'components', 'HamburgerDrawer.tsx'),
        'utf8',
      ),
    );
    expect(drawer).toMatch(/minHeight: size\.row/);
  });

  it('and the token is the 64 that holds a two-line row above the 44pt floor', () => {
    expect(size.row).toBe(64);
    expect(size.row).toBeGreaterThanOrEqual(44);
  });
});

describe('Q15 — the ACCOUNT row answers whoever is actually here', () => {
  it('a member sees Sign out, still destructive', () => {
    expect(src).toMatch(/title="Sign out"[\s\S]{0,500}?\n\s+destructive\n/);
  });

  it('a guest sees Sign in, on the drawer’s own route', () => {
    expect(src).toMatch(/title="Sign in"/);
    expect(src).toContain("navigation.navigate('Profile')");
  });

  it('the two are exclusive — nobody is offered both', () => {
    expect(src).toMatch(/\{user \? \(\s*<SettingsRow\s+title="Sign out"/);
  });
});

describe('board 07 — the eyebrow stops repeating the title', () => {
  it('does not say SETTINGS over "Settings"', () => {
    expect(src).not.toContain('eyebrow="SETTINGS"');
    expect(src).toMatch(/eyebrow="[A-Z]+"/);
    expect(src).toContain('title="Settings"');
  });
});

describe('board 07 — moderation is its own section', () => {
  it('the two moderation rows sit under their own heading, not under Feedback', () => {
    // Positions of the RENDER sites, not the import list at the top of the file.
    const moderationAt = src.indexOf('\n          Moderation\n');
    const hiddenAt = src.indexOf('title={HIDDEN_COMMENTS_TITLE}');
    const blockedAt = src.indexOf('title={BLOCKED_PEOPLE_ROW_TITLE}');
    const feedbackHeadingAt = src.indexOf('\n          Feedback\n');
    expect(moderationAt).toBeGreaterThan(-1);
    expect(feedbackHeadingAt).toBeGreaterThan(-1);
    // Both rows come after the Moderation heading, which comes after Feedback's.
    expect(moderationAt).toBeGreaterThan(feedbackHeadingAt);
    expect(hiddenAt).toBeGreaterThan(moderationAt);
    expect(blockedAt).toBeGreaterThan(moderationAt);
  });
});

describe('one busy idiom', () => {
  it('the push row goes through SettingsRow like every other row', () => {
    expect(src).not.toContain('styles.pushRow');
    expect(src).not.toContain('pushTextWrap');
    expect(src).toMatch(/title="Push notifications"[\s\S]{0,900}?control=\{/);
  });

  it('the spinner swap lives in ONE place, and takes the measured colour', () => {
    const spinners = src.match(/<ActivityIndicator/g) ?? [];
    expect(spinners).toHaveLength(1);
    expect(src).toMatch(/style=\{styles\.rowSpinner\}\s*color=\{color\.text\}/);
  });
});
