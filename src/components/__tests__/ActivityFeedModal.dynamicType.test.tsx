/**
 * P1 — ActivityFeedModal dynamic type regression guard.
 *
 * The fixed-size banner row should never pin the Retry button over wrapped
 * text at accessibility-extra-large. Recomposition is already covered in the
 * source-guard suite; this suite guards the one layout row and text contract
 * that regressed at large type after FIX4C.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../__tests__/support/stripComments';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

const FILE = 'ActivityFeedModal.tsx';

describe('P1 — ActivityFeedModal error-banner row at large type', () => {
  it('keeps the header banner in a wrap-capable, top-aligned row', () => {
    const src = read(FILE);
    expect(src).toMatch(/errorBanner:\s*\{[\s\S]*alignItems:\s*'flex-start'/);
    expect(src).toMatch(/errorBanner:\s*\{[\s\S]*flexWrap:\s*'wrap'/);
  });

  it('lets the error text contract as the primary flex child', () => {
    const src = read(FILE);
    const textBlock = src.match(/errorText:\s*\{([\s\S]*?)\n\s*\},/)?.[1] ?? '';
    expect(textBlock).not.toEqual('');
    expect(textBlock).toMatch(/flex:\s*1/);
    expect(textBlock).toMatch(/minWidth:\s*0/);
    expect(textBlock).not.toMatch(/lineHeight:/);
  });

  it('keeps Retry off the text-flow line by design so overlap is prevented', () => {
    const src = read(FILE);
    expect(src).toMatch(/retryBtn:\s*\{[\s\S]*alignSelf:\s*'flex-start'/);
  });
});
