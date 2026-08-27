import fs from 'fs';
import path from 'path';

function source(relative: string) {
  return fs.readFileSync(path.join(__dirname, '..', '..', relative), 'utf8');
}

describe('Wave 2 — expanded modal adoption', () => {
  const history = source('components/StatusHistoryModal.tsx');
  const report = source('components/ReportContentModal.tsx');
  const detail = source('components/FlagDetailModal.tsx');

  it('adopts shared expanded presentation for History and Report without their old local caps', () => {
    expect(history).toContain('presentation="expanded"');
    expect(history).not.toContain('shrinkStyle={styles.cap}');
    expect(report).toContain('presentation="expanded"');
    expect(report).not.toContain('shrinkStyle={styles.kav}');
  });

  it('keeps Flag Detail hand-built and gives it expanded safe-area geometry', () => {
    expect(detail).toContain('<Modal aria-label={`Flag details:');
    expect(detail).not.toContain('<Sheet\n      visible={visible}');
    expect(detail).toContain('marginTop: insets.top + spacing.sm');
    expect(detail).toContain("maxHeight: '100%'");
    expect(detail).toContain('style={styles.pullExpanded}');
    expect(detail).toContain('<StatusHistoryModal');
    expect(detail).toContain('<ReportContentModal');
  });
});

describe('Wave 2 — top spacing and Tasks field ownership', () => {
  const home = source('screens/HomeScreen.tsx');
  const tasks = source('screens/TasksScreen.tsx');
  const profile = source('screens/ProfileScreen.tsx');
  const guest = source('screens/GuestProfile.tsx');

  it('sets only the approved per-screen safe-area top spacing', () => {
    expect(home).toContain('paddingTop: insets.top, paddingBottom: bottomInset + 108');
    expect(tasks).toContain('style={[styles.chromePane, { paddingTop: insets.top }]}');
    expect(profile).toContain('paddingTop: insets.top + spacing.sm, paddingBottom: tabBarHeight + 16');
    expect(guest).toContain('paddingTop: insets.top + spacing.sm, paddingBottom: tabBarHeight + spacing.xl');
  });

  it('makes the search field, not its TextInput, own normal-flow visual geometry', () => {
    expect(tasks).toContain('<View style={styles.searchField}>');
    expect(tasks).toContain('searchField: {');
    expect(tasks).toContain('flexDirection: \'row\'');
    expect(tasks).toContain('minHeight: a11y.minTargetSize + 2');
    expect(tasks).not.toContain('searchIcon: {');
    expect(tasks).toContain('accessibilityLabel="Clear search"');
  });
});
