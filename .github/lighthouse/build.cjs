const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Public Expo variables are baked into the bundle. Never inherit a real backend
// or a developer's .env file into this first-launch-only CI fixture.
function fixtureEnvironment(parent) {
  const env = Object.fromEntries(
    Object.entries(parent).filter(([key]) => !key.startsWith('EXPO_PUBLIC_')),
  );
  return {
    ...env,
    CI: '1',
    EXPO_NO_DOTENV: '1',
    EXPO_NO_TELEMETRY: '1',
    EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:9001',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'lighthouse-ci-not-a-credential',
  };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  const result = spawnSync(process.execPath, [
    path.join(root, 'node_modules/expo/bin/cli'),
    'export', '--platform', 'web', '--output-dir', 'dist-lighthouse',
    '--source-maps', '--max-workers', '2',
  ], { cwd: root, env: fixtureEnvironment(process.env), stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

module.exports = { fixtureEnvironment };
