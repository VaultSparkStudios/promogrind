#!/usr/bin/env node
import { getSecret, redact } from './lib/secrets.mjs';

if (process.argv.includes('--help')) { console.log('Usage: node scripts/check-contact-route.mjs [--json]\nRead-only verification that contact@promogrind.bet forwards to the canonical founder mailbox.'); process.exit(0); }
const tokens = [
  ['cloudflare.studio', getSecret('CLOUDFLARE_STUDIO_TOKEN', 'cloudflare.studio')],
  ['cloudflare.dns', getSecret('CLOUDFLARE_DNS_TOKEN', 'cloudflare.dns')],
  ['cloudflare.deploy', getSecret('CLOUDFLARE_API_TOKEN', 'cloudflare.deploy')],
].filter(([, value]) => value);
const request = (url, token) => fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
let result = { ready: false, target: 'contact@promogrind.bet', destination: 'founder@vaultsparkstudios.com', state: tokens.length ? 'present' : 'missing', reason: 'No Cloudflare Email Routing credential is present.', httpStatus: null };
for (const [capability, token] of tokens) {
  try {
    const zoneRes = await request('https://api.cloudflare.com/client/v4/zones?name=promogrind.bet', token); const zoneBody = await zoneRes.json().catch(() => ({})); const zone = zoneBody.result?.[0];
    if (!zoneRes.ok || !zone?.id) { result = { ...result, state: zoneRes.status === 401 ? 'present' : 'authenticated', httpStatus: zoneRes.status, reason: `${capability} cannot resolve the target zone.` }; continue; }
    const rulesRes = await request(`https://api.cloudflare.com/client/v4/zones/${zone.id}/email/routing/rules`, token); const rulesBody = await rulesRes.json().catch(() => ({}));
    if (!rulesRes.ok) { result = { ...result, state: rulesRes.status === 401 ? 'present' : 'authenticated', httpStatus: rulesRes.status, reason: `${capability} authenticates to the zone but lacks Email Routing Rules Read.` }; continue; }
    const rules = Array.isArray(rulesBody.result) ? rulesBody.result : [];
    const match = rules.find((rule) => rule.enabled !== false && rule.matchers?.some((matcher) => matcher.type === 'literal' && String(matcher.value).toLowerCase() === result.target) && rule.actions?.some((action) => action.type === 'forward' && action.value?.some((value) => String(value).toLowerCase() === result.destination)));
    result = { ...result, ready: Boolean(match), state: 'authorized', httpStatus: rulesRes.status, reason: match ? 'Exact enabled forwarding route is active.' : 'Email Routing is readable, but the exact enabled route is absent.' };
    break;
  } catch (error) { result = { ...result, reason: `Probe unavailable: ${error.name || 'network error'}.` }; }
}
if (process.argv.includes('--json')) console.log(redact(JSON.stringify(result, null, 2)));
else console.log(`contact-route: ${result.ready ? 'READY' : result.state.toUpperCase()} — ${result.reason}`);
process.exitCode = result.ready ? 0 : 1;
