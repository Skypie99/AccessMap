import { sortWatchedFlags, type WatchedSort } from '../MyWatchedModal';
import type { FlagRow } from '@/types/database';

function makeFlag(o: { id?: string; status?: FlagRow['status']; severity?: number; created_at?: string } = {}): FlagRow {
  return { id: o.id ?? 'id-' + Math.random().toString(36).slice(2), status: o.status ?? 'open', severity: o.severity ?? 3, created_at: o.created_at ?? new Date().toISOString(), lat: 49.28, lng: -123.12, category: 'missing_ramp', description: 't', photo_url: null, user_id: 'u' } as FlagRow;
}

const OLD = '2024-01-01T00:00:00Z', MID = '2024-06-15T00:00:00Z', NEW = '2025-01-01T00:00:00Z';

describe('sortWatchedFlags', () => {
  describe("mode: 'newest'", () => {
    it('returns newest first', () => {
      const f = [makeFlag({id:'a',created_at:OLD}),makeFlag({id:'b',created_at:NEW}),makeFlag({id:'c',created_at:MID})];
      expect(sortWatchedFlags(f,'newest').map(x=>x.id)).toEqual(['b','c','a']);
    });
    it('handles a single flag', () => {
      expect(sortWatchedFlags([makeFlag({id:'x'})],'newest')[0]!.id).toBe('x');
    });
    it('does not mutate the input array', () => {
      const f=[makeFlag({created_at:OLD}),makeFlag({created_at:NEW})]; const o=[...f];
      sortWatchedFlags(f,'newest'); expect(f).toEqual(o);
    });
  });
  describe("mode: 'oldest'", () => {
    it('returns oldest first', () => {
      const f=[makeFlag({id:'a',created_at:NEW}),makeFlag({id:'b',created_at:OLD}),makeFlag({id:'c',created_at:MID})];
      expect(sortWatchedFlags(f,'oldest').map(x=>x.id)).toEqual(['b','c','a']);
    });
    it('is reverse of newest', () => {
      const f=[makeFlag({id:'p',created_at:OLD}),makeFlag({id:'q',created_at:MID}),makeFlag({id:'r',created_at:NEW})];
      const n=sortWatchedFlags(f,'newest').map(x=>x.id);
      expect(sortWatchedFlags(f,'oldest').map(x=>x.id)).toEqual([...n].reverse());
    });
  });
  describe("mode: 'severity'", () => {
    it('sev 5 before sev 1', () => {
      const f=[makeFlag({id:'lo',severity:1,created_at:NEW}),makeFlag({id:'hi',severity:5,created_at:OLD}),makeFlag({id:'md',severity:3,created_at:MID})];
      expect(sortWatchedFlags(f,'severity').map(x=>x.id)).toEqual(['hi','md','lo']);
    });
    it('newest tiebreaker', () => {
      const f=[makeFlag({id:'o',severity:3,created_at:OLD}),makeFlag({id:'n',severity:3,created_at:NEW})];
      expect(sortWatchedFlags(f,'severity')[0]!.id).toBe('n');
    });
    it('falls back to date when severity equal', () => {
      const f=[makeFlag({id:'a',severity:4,created_at:OLD}),makeFlag({id:'b',severity:4,created_at:NEW})];
      expect(sortWatchedFlags(f,'severity')[0]!.id).toBe('b');
    });
  });
  describe("mode: 'status'", () => {
    it('open before verified before resolved before rejected', () => {
      const f=[makeFlag({id:'r',status:'rejected'}),makeFlag({id:'s',status:'resolved'}),makeFlag({id:'v',status:'verified'}),makeFlag({id:'o',status:'open'})];
      expect(sortWatchedFlags(f,'status').map(x=>x.id)).toEqual(['o','v','s','r']);
    });
    it('newest first within same status', () => {
      const f=[makeFlag({id:'oo',status:'open',created_at:OLD}),makeFlag({id:'on',status:'open',created_at:NEW}),makeFlag({id:'v',status:'verified',created_at:MID})];
      expect(sortWatchedFlags(f,'status').map(x=>x.id)).toEqual(['on','oo','v']);
    });
    it('default — open before resolved', () => {
      const f=[makeFlag({id:'r',status:'resolved'}),makeFlag({id:'o',status:'open'})];
      expect(sortWatchedFlags(f,'status' as WatchedSort)[0]!.id).toBe('o');
    });
  });
  describe('edge cases', () => {
    const modes: WatchedSort[] = ['status','newest','oldest','severity'];
    it.each(modes)('empty input in %s mode', m => { expect(sortWatchedFlags([],m)).toEqual([]); });
    it.each(modes)('single flag in %s mode', m => { expect(sortWatchedFlags([makeFlag({id:'x'})],m)[0]!.id).toBe('x'); });
  });
});
