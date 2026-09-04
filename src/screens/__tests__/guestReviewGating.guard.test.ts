import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

function ordered(source: string, before: string, after: string): boolean {
  const first = source.indexOf(before);
  const second = source.indexOf(after);
  return first >= 0 && second > first;
}

describe('guest review gating — presentation plus defense in depth', () => {
  const tasks = read('screens/TasksScreen.tsx');
  const detail = read('components/FlagDetailModal.tsx');
  const map = read('screens/MapScreen.tsx');

  it('keeps both pre-write auth guards ahead of production status mutation', () => {
    const taskHandler = tasks.slice(
      tasks.indexOf('const setStatus = useCallback('),
      tasks.indexOf('const handleViewOnMap = useCallback('),
    );
    const detailHandler = detail.slice(
      detail.indexOf('const runStatusChange = async'),
      detail.indexOf('const handleReject = async'),
    );

    expect(ordered(taskHandler, 'if (!user)', 'updateFlagStatus(')).toBe(true);
    expect(ordered(detailHandler, 'if (!user)', 'updateFlagStatus(')).toBe(true);
  });

  it('removes every guest entry into Tasks selection mode', () => {
    expect(tasks).toContain('onLongPress={user ? handleCardLongPress : undefined}');
    expect(tasks).toContain('{!!user && !selection.active && (');
    expect(tasks).toContain('{!!user && selection.active && (');
    expect(tasks).toContain('if (user) return;');
    expect(tasks).toContain('exitSelection();');
  });

  it('gates review controls explicitly instead of inferring auth inside TaskCard', () => {
    expect(tasks).toContain('canReview={!!user}');
    expect(tasks).toContain("key: 'sign-in'");
    expect(tasks).toContain("label: 'Sign in to review'");
    expect(tasks).toContain('const reviewSelectionActive = canReview && selectionActive;');
  });

  it('Tasks and Map close their detail target before the Profile handoff', () => {
    const tasksHandoff = tasks.slice(
      tasks.indexOf('const handleDetailSignInToReview = useCallback('),
      tasks.indexOf('// Stable tap handler'),
    );
    const mapHandoff = map.slice(
      map.indexOf('const handleDetailSignInToReview = useCallback('),
      map.indexOf('const handleDetailViewOnMap = useCallback('),
    );

    expect(tasksHandoff).toContain('setSelectedFlag(null);');
    expect(tasksHandoff).toContain('InteractionManager.runAfterInteractions');
    expect(mapHandoff).toContain('setSelectedFlag(null);');
    expect(mapHandoff).toContain('InteractionManager.runAfterInteractions');
    expect(tasks).toContain('onDismiss={completeDetailSignIn}');
    expect(map).toContain('onDismiss={handleDetailDismissed}');
  });

  it('FlagDetailModal offers guest review only through its host callback', () => {
    expect(detail).toContain('onSignInToReview?: () => void;');
    expect(detail).toContain("const primaryIsGuestSignIn = !user && primaryIntent === 'triage';");
    expect(detail).toContain("const guestReviewBoundary = !user && primaryIntent === 'read'");
    expect(detail).toContain('show: !!user && canResolve');
    expect(detail).toContain('show: !!user && canReject');
  });
});
