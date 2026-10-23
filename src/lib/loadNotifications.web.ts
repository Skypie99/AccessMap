// An async import keeps native compatibility shims out of the web entry chunk.
export function loadNotifications(): Promise<unknown> {
  return import('expo-notifications');
}
