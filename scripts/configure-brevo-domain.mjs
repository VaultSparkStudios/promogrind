#!/usr/bin/env node
import { getSecret, redact } from './lib/secrets.mjs';

const APPLY = process.argv.includes('--apply');
if (process.argv.includes('--help')) {
  console.log('Usage: node scripts/configure-brevo-domain.mjs [--apply]\nPlans or applies only Brevo-provided authentication DNS records for promogrind.bet. Never deletes records or prints record values.');
  process.exit(0);
}
const DOMAIN = 'promogrind.bet';
const brevoKey = getSecret('BREVO_API_KEY', 'brevo');
const cfToken = getSecret('CLOUDFLARE_STUDIO_TOKEN', 'cloudflare.studio') || getSecret('CLOUDFLARE_ZONE_SETTINGS_TOKEN', 'cloudflare');
if (!brevoKey || !cfToken) { console.error('configure-brevo-domain: required gateway capability missing'); process.exit(2); }
const fetchTimed = (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
const brevoHeaders = { 'api-key': brevoKey, accept: 'application/json', 'content-type': 'application/json' };
const cfHeaders = { Authorization: `Bearer ${cfToken}`, 'content-type': 'application/json' };

async function brevoDomain() {
  let response = await fetchTimed(`https://api.brevo.com/v3/senders/domains/${DOMAIN}`, { headers: brevoHeaders });
  if (response.status === 404 && !APPLY) return { absent: true };
  if (response.status === 404 && APPLY) response = await fetchTimed('https://api.brevo.com/v3/senders/domains', { method: 'POST', headers: brevoHeaders, body: JSON.stringify({ name: DOMAIN }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Brevo domain ${response.status}: ${body.message || 'unavailable'}`);
  return body;
}

function recordsFrom(config) {
  const records = config.dns_records || config.dnsRecords || {};
  return Object.values(records).filter((row) => row && row.type && row.host_name && row.value).map((row) => ({ type: String(row.type).toUpperCase(), name: row.host_name === '@' ? DOMAIN : row.host_name.endsWith(DOMAIN) ? row.host_name : `${row.host_name}.${DOMAIN}`, content: row.value, ttl: 3600 }));
}

async function zoneId() {
  const response = await fetchTimed(`https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}`, { headers: cfHeaders }); const body = await response.json();
  if (!response.ok || !body.result?.[0]?.id) throw new Error(`Cloudflare target zone unavailable (${response.status})`); return body.result[0].id;
}

async function applyRecord(zone, record) {
  const query = new URLSearchParams({ type: record.type, name: record.name });
  const found = await fetchTimed(`https://api.cloudflare.com/client/v4/zones/${zone}/dns_records?${query}`, { headers: cfHeaders }); const foundBody = await found.json();
  if (!found.ok) throw new Error(`Cloudflare DNS read denied (${found.status})`);
  const existing = foundBody.result?.[0];
  if (existing?.content === record.content) return 'unchanged';
  const method = existing ? 'PUT' : 'POST'; const url = existing ? `https://api.cloudflare.com/client/v4/zones/${zone}/dns_records/${existing.id}` : `https://api.cloudflare.com/client/v4/zones/${zone}/dns_records`;
  const response = await fetchTimed(url, { method, headers: cfHeaders, body: JSON.stringify({ ...record, proxied: false }) });
  if (!response.ok) throw new Error(`Cloudflare DNS ${method} denied (${response.status})`); return existing ? 'updated' : 'created';
}

try {
  const config = await brevoDomain(); const records = recordsFrom(config);
  console.log(`configure-brevo-domain: target=${DOMAIN} domainVisible=${config.absent ? 'no' : 'yes'} authenticated=${config.authenticated === true} records=${records.length} mode=${APPLY ? 'apply' : 'plan'}`);
  if (!APPLY) { console.log(config.absent ? 'Re-run with --apply to create the target domain and apply only its returned authentication records.' : records.length ? 'Re-run with --apply to create/update only the returned authentication records.' : 'No authentication records were returned; no mutation is available.'); process.exit(0); }
  const zone = await zoneId(); const outcomes = [];
  for (const record of records) outcomes.push(await applyRecord(zone, record));
  const verify = await fetchTimed(`https://api.brevo.com/v3/senders/domains/${DOMAIN}/authenticate`, { method: 'PUT', headers: brevoHeaders });
  console.log(redact(`configure-brevo-domain: DNS outcomes=${outcomes.join(',') || 'none'} authentication-request=${verify.status}`));
} catch (error) { console.error(redact(`configure-brevo-domain: ${error.message}`)); process.exit(1); }
