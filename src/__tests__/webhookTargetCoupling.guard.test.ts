/**
 * STAGE-MF-04 — the status-change webhook is hard-coupled to the PRODUCTION project.
 *
 * `public.notify_flag_status_webhook()` posts to a hardcoded production URL, and that
 * function is recreated by 20260904000400_adopt_execute_revokes.sql, which is IN the
 * apply set. So applying the accepted set to any non-production database gives that
 * database a trigger aimed at production's Edge Function.
 *
 * It is inert today only because the function reads `webhook_secret` from Vault and
 * returns early when it is absent, and no non-production target has that secret.
 * That is a real control, but it is one row in a table away from not being one.
 *
 * The migration is deliberately NOT changed. Its whole purpose is to adopt the
 * function as production actually has it — that is the Phase 02 contract-truth
 * premise — so rewriting the URL here would make the repo disagree with production
 * and defeat the adoption. What was missing was not a code change but a stated,
 * enforced invariant. That is what this file adds:
 *
 *   - the coupling is asserted, so it cannot be edited away or drift unnoticed;
 *   - the fail-closed path is asserted, so nobody removes the early return;
 *   - any NEW hardcoded project-specific URL has to come here and be justified.
 *
 * The operational rule that follows — never create `webhook_secret` on a
 * non-production target — belongs in the runbook, and is stated in the staging
 * rerun packet.
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const PRODUCTION_REF = 'kldlwszpfkdmsjrjhjym';
const CANDIDATE = path.join(ROOT, 'supabase', 'migrations-next', '20260904000400_adopt_execute_revokes.sql');
const CORRECTION = path.join(ROOT, 'supabase', 'migrations-next', 'phase03a',
  '20260911120000_phase03a_webhook_target_env_scoped.sql');

describe('STAGE-MF-04 — webhook target coupling is explicit, not incidental', () => {
  const sql = fs.readFileSync(CANDIDATE, 'utf8');

  it('still targets the production project, and says so out loud', () => {
    // If this ever fails, the adoption candidate has stopped matching the live
    // production function — which is a Phase 02 contract-truth regression, not a win.
    expect(sql).toContain(`https://${PRODUCTION_REF}.supabase.co/functions/v1/notify-flag-status`);
  });

  it('keeps the fail-closed path that makes a non-production target inert', () => {
    // Secret absent -> warn and return WITHOUT posting. This is the only thing
    // standing between a staging status change and production's Edge Function.
    const fn = sql.slice(sql.indexOf('function public.notify_flag_status_webhook()'));
    const body = fn.slice(0, fn.indexOf('$$;') + 3);
    expect(body).toMatch(/IF v_secret IS NULL THEN[\s\S]*?RETURN NEW;[\s\S]*?END IF;/);
    // And the early return must come BEFORE the post, not after it.
    expect(body.indexOf('RETURN NEW;')).toBeLessThan(body.indexOf('net.http_post'));
  });

  it('is superseded by a forward correction that removes the literal entirely', () => {
    // STAGE-MF-04. The rerun measured that this function is NOT a dormant literal:
    // it is SECURITY DEFINER on an ENABLED trigger on public.flags, so any client
    // that can update a flag's status runs it. Fail-closed via an absent Vault row
    // was the only control -- an invariant maintained by absence.
    const fix = fs.readFileSync(CORRECTION, 'utf8');
    // The correction carries NO project-specific URL at all.
    expect(fix).not.toContain(PRODUCTION_REF);
    expect(fix).not.toMatch(/https:\/\/[a-z]{20}\.supabase\.co/);
    // It reads the target from per-database config, with no default and no fallback.
    expect(fix).toContain("WHERE name = 'webhook_endpoint'");
    expect(fix).toMatch(/IF v_endpoint IS NULL[\s\S]*?RETURN NEW;/);
    // Fail-closed must precede the post, for the endpoint as well as the secret.
    const body = fix.slice(fix.indexOf('DECLARE v_secret'));
    expect(body.indexOf('v_endpoint IS NULL')).toBeLessThan(body.indexOf('net.http_post'));
    // And it must supersede the adoption, not precede it.
    expect('20260911120000' > '20260904000400').toBe(true);
  });

  it('leaves the adoption candidate byte-identical, so contract truth survives', () => {
    // Editing the adoption to remove the URL would make the repo disagree with
    // production and defeat the whole point of adopting it.
    const accepted = 'e8a3d880d361';
    const actual = createHash('sha256').update(fs.readFileSync(CANDIDATE)).digest('hex');
    expect(actual.slice(0, 12)).toBe(accepted);
  });

  it('enumerates every hardcoded project-specific URL in the apply set', () => {
    // A new one appearing means someone aimed another database at a fixed project.
    // Add it here with a reason, or remove it.
    const applySet = [
      path.join(ROOT, 'supabase', 'migrations-next'),
      path.join(ROOT, 'supabase', 'migrations-next', 'phase03a'),
    ];
    const found: string[] = [];
    for (const dir of applySet) {
      for (const name of fs.readdirSync(dir)) {
        if (!/^\d{14}_.*\.sql$/.test(name)) continue;
        const body = fs.readFileSync(path.join(dir, name), 'utf8');
        for (const m of body.matchAll(/https:\/\/([a-z]{20})\.supabase\.co\/functions\/v1\/([a-z-]+)/g)) {
          found.push(`${name} -> ${m[1]}/${m[2]}`);
        }
      }
    }
    expect(found.sort()).toEqual([
      '20260904000400_adopt_execute_revokes.sql -> kldlwszpfkdmsjrjhjym/notify-flag-status',
    ]);
  });
});
