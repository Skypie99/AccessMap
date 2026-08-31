/**
 * P1 — ReportFlagModal dynamic type regression guard.
 *
 * Live XXXL QA proved that tokenized font sizes alone are not a scaling guard:
 * AppText can still deliver a finite maxFontSizeMultiplier to native Text.
 * Rendered cap behavior is covered in ReportFlagModal.test.tsx; this narrow
 * source guard locks the local TypeBlock boundaries and wrap-safe geometry.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../__tests__/support/stripComments';

const read = (rel: string) => stripComments(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

const FILE = 'ReportFlagModal.tsx';

describe('P1 — ReportFlagModal respects intended Dynamic Type text scaling', () => {
  it('scales the XXXL severity digits and keeps the selected caption uncapped', () => {
    const src = read(FILE);
    const severityStart = src.indexOf('>Severity</AppText>');
    const severityEnd = src.indexOf('>Description (optional)</AppText>', severityStart);
    const severitySection = src.slice(severityStart, severityEnd);
    const largePicker = severitySection.match(/\{axRecompose \? \(([\s\S]*?)\) : \(/)?.[1] ?? '';

    expect(severityStart).toBeGreaterThanOrEqual(0);
    expect(severityEnd).toBeGreaterThan(severityStart);
    expect(largePicker).toMatch(/<SeverityDisc[\s\S]*?scaleWithType/);
    expect(largePicker).not.toMatch(/maxFontSizeMultiplier/);
    expect(severitySection).toMatch(
      /<TypeBlock cap=\{TYPE_BLOCK\.content\}>\s*\{severity === null \? \(/,
    );
    expect(severitySection).not.toMatch(
      /<TypeBlock cap=\{TYPE_BLOCK\.header\}>\s*\{severity === null \? \(/,
    );
  });

  it('keeps reading content uncapped and bounded location actions on the chrome contract', () => {
    const src = read(FILE);

    expect(src).toMatch(
      /<TypeBlock cap=\{TYPE_BLOCK\.content\}>\s*<AppText ref=\{titleRef\}[\s\S]*?Location is off for Flagstone[\s\S]*?<\/TypeBlock>/,
    );
    expect(src).toMatch(
      /<TypeBlock cap=\{TYPE_BLOCK\.chrome\}>\s*\{!location && onRequestLocation[\s\S]*?Use my location[\s\S]*?Place the pin on the map[\s\S]*?<\/TypeBlock>/,
    );
    expect(src).toMatch(
      /<TypeBlock cap=\{TYPE_BLOCK\.content\}>\s*\{!isAnon && templates\.length[\s\S]*?styles\.templateChipText[\s\S]*?styles\.pillText[\s\S]*?<\/TypeBlock>/,
    );
    expect(src).not.toMatch(
      /<TypeBlock cap=\{TYPE_BLOCK\.header\}>\s*<AppText ref=\{titleRef\}/,
    );
  });

  it('gives the long location action room to wrap instead of clipping', () => {
    const src = read(FILE);
    const button = src.match(/useLocationBtn:\s*\{([\s\S]*?)\n\s*\},/)?.[1] ?? '';
    const label = src.match(/useLocationText:\s*\{([\s\S]*?)\n\s*\},/)?.[1] ?? '';

    expect(button).toMatch(/maxWidth:\s*'100%'/);
    expect(button).not.toMatch(/height:/);
    expect(label).toMatch(/flexShrink:\s*1/);
    expect(label).not.toMatch(/numberOfLines/);
  });

  it('keeps modal body helper copy on tokenized app text sizes', () => {
    const src = read(FILE);
    expect(src).toMatch(/sevHint:\s*\{[\s\S]*fontSize:\s*font\.size\.sm/);
    expect(src).toMatch(/charCounter:\s*\{[\s\S]*fontSize:\s*font\.size\.xs/);
    expect(src).toMatch(/anonBannerTitle:\s*\{[\s\S]*fontSize:\s*font\.size\.sm/);
    expect(src).toMatch(/anonBannerLinkText:\s*\{[\s\S]*fontSize:\s*font\.size\.sm/);
    expect(src).toMatch(/anonPhotoNudgeText:\s*\{[\s\S]*fontSize:\s*font\.size\.sm/);
  });

  it('does not keep old fixed numeric small sizes in those modal text styles', () => {
    const src = read(FILE);
    expect(src).not.toMatch(/sevHint:\s*\{[\s\S]*fontSize:\s*13/);
    expect(src).not.toMatch(/charCounter:\s*\{[\s\S]*fontSize:\s*12/);
    expect(src).not.toMatch(/anonBannerTitle:\s*\{[\s\S]*fontSize:\s*13/);
    expect(src).not.toMatch(/anonBannerLinkText:\s*\{[\s\S]*fontSize:\s*13/);
    expect(src).not.toMatch(/anonPhotoNudgeText:\s*\{[\s\S]*fontSize:\s*13/);
  });
});
