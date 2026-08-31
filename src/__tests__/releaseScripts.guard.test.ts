import fs from 'fs';
import path from 'path';

type BuildProfile = {
  distribution?: string;
  environment?: string;
  env?: Record<string, string>;
  ios?: {
    buildConfiguration?: string;
    simulator?: boolean;
  };
};

type EasConfig = {
  build?: Record<string, BuildProfile>;
  submit?: Record<string, { ios?: Record<string, unknown> }>;
};

const REPO = path.join(__dirname, '..', '..');
const scripts = (
  JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  }
).scripts;
const eas = JSON.parse(fs.readFileSync(path.join(REPO, 'eas.json'), 'utf8')) as EasConfig;
const workflowSource = fs.readFileSync(
  path.join(REPO, '.github', 'workflows', 'eas-testflight-submit.yml'),
  'utf8',
);

function stripYamlComments(source: string): string {
  return source
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .map((line) => line.replace(/\s+#.*$/, ''))
    .join('\n');
}

function extractRunShell(source: string): string {
  const lines = source.split('\n');
  const shellLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const runStart = /^(\s*)run:\s*\|\s*$/.exec(lines[index]);
    if (!runStart) continue;

    const runIndent = runStart[1].length;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      if (line.trim() === '') {
        shellLines.push('');
        continue;
      }

      const lineIndent = /^\s*/.exec(line)?.[0].length ?? 0;
      if (lineIndent <= runIndent) break;
      shellLines.push(line.slice(runIndent + 2));
      index = cursor;
    }
  }

  return shellLines.join('\n');
}

const activeWorkflow = stripYamlComments(workflowSource);
const runShell = extractRunShell(activeWorkflow);
const dispatchInputs = activeWorkflow.slice(
  activeWorkflow.indexOf('    inputs:'),
  activeWorkflow.indexOf('\npermissions:'),
);
const candidateCommand =
  'eas build --platform ios --profile testflight --auto-submit-with-profile=production --wait --non-interactive';

function stepBlock(marker: string): string {
  const lines = activeWorkflow.split('\n');
  const start = lines.findIndex((line) => line.includes(marker));
  if (start < 0) return '';

  const startIndent = /^\s*/.exec(lines[start])?.[0].length ?? 0;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const lineIndent = /^\s*/.exec(line)?.[0].length ?? 0;
    if (line.trim() !== '' && lineIndent <= startIndent && /^\s*-\s/.test(line)) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join('\n');
}

function sourceIndex(marker: string): number {
  const index = activeWorkflow.indexOf(marker);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe('Release R1 profile immutability', () => {
  it('hard-codes testflight as the only canonical build profile', () => {
    expect(dispatchInputs).not.toMatch(/^\s+profile:/m);
    expect(dispatchInputs).not.toMatch(/\bpreview(?:2|3)?\b/);

    const easBuildCommands = runShell
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('eas build '));

    expect(easBuildCommands).toHaveLength(1);
    expect(easBuildCommands[0]).toContain('--profile testflight');
    expect(easBuildCommands[0]).toContain('--auto-submit-with-profile=production');
    expect(easBuildCommands[0]).not.toMatch(
      /--profile\s+(?:preview|preview2|preview3|production)(?:\s|$)/,
    );
  });

  it('pins the store, production, Release, non-simulator EAS profile truth', () => {
    const testflight = eas.build?.testflight;

    expect(testflight).toBeDefined();
    expect(testflight?.distribution).toBe('store');
    expect(testflight?.environment).toBe('production');
    expect(testflight?.env?.APP_ENV).toBe('production');
    expect(testflight?.ios?.buildConfiguration).toBe('Release');
    expect(testflight?.ios?.simulator).toBe(false);
    expect(eas.submit?.production).toBeDefined();
    expect(eas.submit?.production?.ios).toBeDefined();
  });
});

describe('Release R1 SHA binding', () => {
  it('requires a full lowercase accepted SHA through env, not shell interpolation', () => {
    expect(dispatchInputs).toMatch(
      /expected_release_sha:\n\s+description:.*FULL 40-character lowercase Git SHA.*\n\s+required: true\n\s+type: string/,
    );
    expect(activeWorkflow).toContain('EXPECTED_RELEASE_SHA: ${{ inputs.expected_release_sha }}');
    expect(runShell).not.toContain('${{ inputs.expected_release_sha }}');
    expect(runShell).toContain('^[0-9a-f]{40}$');
  });

  it('checks event identity before checkout and three-way identity after checkout', () => {
    const precheck = stepBlock('name: Validate accepted release SHA');
    const checkout = stepBlock('uses: actions/checkout@v4');
    const headCheck = stepBlock('name: Verify checked-out source identity');

    expect(precheck).toContain('"$EXPECTED_RELEASE_SHA" != "$GITHUB_SHA"');
    expect(checkout).not.toMatch(/\bref:/);
    expect(checkout).not.toContain('expected_release_sha');
    expect(headCheck).toContain('HEAD="$(git rev-parse HEAD)"');
    expect(headCheck).toContain('"$HEAD" != "$GITHUB_SHA"');
    expect(headCheck).toContain('"$HEAD" != "$EXPECTED_RELEASE_SHA"');

    expect(sourceIndex('name: Validate accepted release SHA')).toBeLessThan(
      sourceIndex('uses: actions/checkout@v4'),
    );
    expect(sourceIndex('uses: actions/checkout@v4')).toBeLessThan(
      sourceIndex('name: Verify checked-out source identity'),
    );
    expect(sourceIndex('name: Verify checked-out source identity')).toBeLessThan(
      sourceIndex('run: npm ci --legacy-peer-deps'),
    );
  });
});

describe('Release R1 D8 sequencing policy', () => {
  it('does not require D8 closure before creating the exact TestFlight candidate', () => {
    const beforeCandidate = activeWorkflow.slice(0, sourceIndex(candidateCommand));

    expect(dispatchInputs).not.toMatch(/d8_closed/i);
    expect(beforeCandidate).not.toMatch(/D8_CLOSED|d8_closed|Require D8/i);
  });

  it('keeps D8 as the later final App Store review submission gate', () => {
    const policy = 'D8 policy: closure required before separate final App Store review submission';

    expect(activeWorkflow).toContain(policy);
    expect(sourceIndex(candidateCommand)).toBeLessThan(sourceIndex(policy));
  });
});

describe('Release R1 runtime profile drift guard', () => {
  it('checks all seven fixed-profile invariants before dependency installation', () => {
    const guard = stepBlock('name: Guard fixed EAS profiles');
    const requiredInvariants = [
      'build.testflight.exists',
      'build.testflight.distribution',
      'build.testflight.environment',
      'build.testflight.env.APP_ENV',
      'build.testflight.ios.buildConfiguration',
      'build.testflight.ios.simulator',
      'submit.production.exists',
    ];

    expect(guard).toContain("node <<'NODE'");
    for (const invariant of requiredInvariants) {
      expect(guard).toContain(invariant);
    }
    expect(guard).toContain('process.exit(1)');
    expect(sourceIndex('name: Guard fixed EAS profiles')).toBeLessThan(
      sourceIndex('run: npm ci --legacy-peer-deps'),
    );
  });
});

describe('Release R1 quality-gate ordering', () => {
  it('runs dependency installation, typecheck, and tests before EAS', () => {
    const install = sourceIndex('run: npm ci --legacy-peer-deps');
    const typecheck = sourceIndex('run: npm run typecheck');
    const test = sourceIndex('run: npm test -- --passWithNoTests --forceExit');
    const easBuild = sourceIndex(candidateCommand);

    expect(install).toBeLessThan(typecheck);
    expect(typecheck).toBeLessThan(test);
    expect(test).toBeLessThan(easBuild);
    expect(activeWorkflow).not.toContain('continue-on-error');
    expect(runShell).not.toMatch(/\|\|\s*true\b/);
  });
});

describe('Release R1 candidate build and upload coupling', () => {
  it('uses one waiting, non-interactive auto-submit command with no detached submit', () => {
    expect(runShell.split(candidateCommand)).toHaveLength(2);
    expect(runShell).not.toContain('--latest');
    expect(runShell).not.toMatch(/^\s*eas submit\b/m);
    expect(activeWorkflow).toContain('id: eas_build_upload');
  });
});

describe('Release R1 CLI and authentication', () => {
  it('pins the CLI and fails when the canonical EXPO_TOKEN is absent', () => {
    const easStep = stepBlock('name: Build and upload linked TestFlight candidate');

    expect(runShell).toContain('npm install --global eas-cli@23.0.0');
    expect(runShell).toContain('eas --version');
    expect(activeWorkflow).not.toContain('eas-cli@latest');
    expect(easStep).toContain('EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}');
    expect(easStep).toContain('[ -z "${EXPO_TOKEN:-}" ]');
    expect(easStep).not.toMatch(/\bEAS_TOKEN\b/);

    for (const obsoleteAppleVariable of [
      'EXPO_APPLE_PASSWORD',
      'EXPO_APPLE_ID',
      'EXPO_APPLE_TEAM_ID',
    ]) {
      expect(activeWorkflow).not.toContain(obsoleteAppleVariable);
    }
  });
});

describe('Release R1 package bypass removal', () => {
  it('retains build-only helpers but exposes no local deploy or submit path', () => {
    expect(Object.keys(scripts).filter((name) => name.startsWith('deploy:'))).toEqual([]);
    expect(scripts['deploy:testflight']).toBeUndefined();
    expect(scripts['deploy:appstore']).toBeUndefined();
    expect(scripts['build:testflight']).toBe(
      'eas build --platform ios --profile testflight --non-interactive',
    );
    expect(scripts['build:production']).toBe(
      'eas build --platform ios --profile production --non-interactive',
    );

    for (const command of Object.values(scripts)) {
      expect(command).not.toMatch(/\beas submit\b/);
      expect(command).not.toContain('--latest');
    }
  });
});

describe('Release R1 approval, permissions, and release semantics', () => {
  it('keeps job-level approval with read-only contents permissions', () => {
    const permissionBlock = activeWorkflow.slice(
      activeWorkflow.indexOf('permissions:'),
      activeWorkflow.indexOf('\njobs:'),
    );

    expect(permissionBlock.trim()).toBe('permissions:\n  contents: read');
    expect(activeWorkflow.match(/environment: release-approval/g)).toHaveLength(1);
    expect(activeWorkflow).toMatch(/^    environment: release-approval$/m);
    expect(activeWorkflow).not.toContain('contents: write');
  });

  it('does not perform or claim final Apple App Review submission', () => {
    expect(activeWorkflow).toContain(
      'Final Apple App Review submission: not performed by this workflow',
    );
    expect(activeWorkflow).toContain('Destination: App Store Connect / TestFlight only');
    expect(activeWorkflow).not.toMatch(/submit_beta_review|submit for App Review|Submit to App Review/);
    expect(runShell).not.toMatch(/--groups\b|--what-to-test\b/);
  });

  it('creates no GitHub Release and writes only a non-secret outcome receipt', () => {
    expect(activeWorkflow).not.toContain('softprops/action-gh-release');
    expect(activeWorkflow).not.toContain('action-gh-release');
    expect(activeWorkflow).not.toContain('Create GitHub Release');

    const summary = stepBlock('name: Write non-secret provenance receipt');
    expect(summary).toContain('if: always()');
    expect(summary).toContain('$GITHUB_STEP_SUMMARY');
    expect(summary).toContain('Expected accepted SHA');
    expect(summary).toContain('GITHUB_SHA');
    expect(summary).toContain('Checked-out HEAD');
    expect(summary).toContain('GITHUB_REF');
    expect(summary).toContain('GITHUB_RUN_ID');
    expect(summary).toContain('GITHUB_RUN_ATTEMPT');
    expect(summary).toContain('GITHUB_WORKFLOW');
    expect(summary).toContain('Fixed build profile: testflight');
    expect(summary).toContain('Fixed submit profile: production');
    expect(summary).toContain('Pinned EAS CLI version: 23.0.0');
    expect(summary).toContain('EAS build/upload step outcome');
    expect(summary).not.toContain('TestFlight submitted');
    expect(summary).not.toContain('secrets.');
  });
});
