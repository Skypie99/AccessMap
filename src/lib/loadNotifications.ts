// Keep native SDK initialization and optional-dependency errors synchronous.
export function loadNotifications(): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}
