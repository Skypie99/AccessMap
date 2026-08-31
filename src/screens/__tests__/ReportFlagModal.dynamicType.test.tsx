/**
 * P1 — ReportFlagModal dynamic type regression guard.
 *
 * The existing form copy must keep the same Dynamic Type behavior as the rest
 * of Flagstone screens. This suite locks in the modal’s intended text-primitives
 * (no hard-coded small-size literals in the copied callout rows).
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../__tests__/support/stripComments';

const read = (rel: string) => stripComments(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

const FILE = 'ReportFlagModal.tsx';

describe('P1 — ReportFlagModal respects intended Dynamic Type text scaling', () => {
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
