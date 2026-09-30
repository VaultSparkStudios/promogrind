// Explicit activation of the reviewed daily stats producer. No default side effects.
import { getSecret } from './lib/secrets.mjs';
import { assertTargetManagementProject, PROMOGRIND_PROJECT_REF as target } from './lib/supabase-deploy-plan.mjs';
const schedule = '17 6 * * *';
const job = 'promogrind-public-stats-daily';
const endpoint = `https://${target}.supabase.co/functions/v1/publish-public-stats`;
const secretName = 'promogrind_public_stats_service_role';
const apply = process.argv.includes('--apply');
if (!apply) {
  console.log(JSON.stringify({ mode: 'dry-run', target, schedule: '06:17 UTC daily', job, endpoint, vaultSecret: secretName, actions: ['Verify target and deployed producer', 'Match existing project service authority to publisher guard', 'Invoke initial publication', 'Verify public artifact', 'Reuse matched key in Vault and create or update only the named daily job'], rollback: `cron.unschedule('${job}')` }, null, 2));
  process.exit(0);
}
const token = getSecret('SUPABASE_ACCESS_TOKEN', 'supabase.management');
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function management(path, body) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${target}${path}`, { method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Management request failed (${r.status}); response withheld`);
  return r.json();
}
try {
  assertTargetManagementProject(await management(''), target);
  const functions = await management('/functions');
  if (!functions.some(f => f.slug === 'publish-public-stats' && f.status === 'ACTIVE')) throw new Error('Publisher must be deployed first');
  const keys = await management('/api-keys?reveal=true');
  // Projects can expose a modern secret key in the runtime's service-role slot.
  // Match the deployed guard with a GET (405, no effects) before publication.
  let key;
  for (const candidate of keys.filter(k => k.type === 'secret' || k.name === 'service_role')) {
    const value = candidate.api_key;
    if (!value || !/^(sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.test(value)) continue;
    const probe = await fetch(endpoint, { method: 'GET', headers: { Authorization: `Bearer ${value}` }, signal: AbortSignal.timeout(15000) });
    if (probe.status === 405 && probe.headers.get('allow') === 'POST') { key = value; break; }
  }
  if (!key) throw new Error('No pinned project authority matches the publisher guard');
  const literal = value => `'${String(value).replaceAll("'", "''")}'`;
  // The key is sent only over TLS into encrypted Vault. Never print query or API response.
  const query = `begin;
    create extension if not exists pg_cron;
    create extension if not exists pg_net with schema extensions;
    do $vault$ declare sid uuid; begin
      select id into sid from vault.secrets where name = '${secretName}';
      if sid is null then perform vault.create_secret(${literal(key)}, '${secretName}');
      else perform vault.update_secret(sid, ${literal(key)}); end if;
    end $vault$;
    select cron.schedule('${job}', '${schedule}', $job$select net.http_post(
      url := '${endpoint}', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = '${secretName}')),
      body := '{}'::jsonb, timeout_milliseconds := 30000);$job$);
    commit;`;
  const publish = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(45000) });
  if (!publish.ok) throw new Error(`Initial publication failed (${publish.status}); schedule not activated`);
  const receipt = await publish.json();
  const artifact = await fetch(`https://${target}.supabase.co/storage/v1/object/public/public-stats/stats.json?verify=${Date.now()}`, { signal: AbortSignal.timeout(15000) });
  const feed = artifact.ok ? await artifact.json() : null;
  if (feed?.generatedAt !== receipt.generatedAt || feed?.feedVersion !== 'analytica-feed-v1') throw new Error('Published artifact verification failed; schedule not activated');
  await management('/database/query', { query });
  const jobs = await management('/database/query', { query: `select jobname, schedule, active from cron.job where jobname = '${job}'`, read_only: true });
  if (jobs.length !== 1 || !jobs[0].active || jobs[0].schedule !== schedule) throw new Error('Schedule verification failed');
  console.log(JSON.stringify({ ok: true, target, job, schedule, generatedAt: receipt.generatedAt, artifactVerified: true }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
