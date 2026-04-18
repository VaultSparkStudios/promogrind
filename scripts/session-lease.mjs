#!/usr/bin/env node

import path from 'path';
import {
  readLease,
  acquireLease,
  heartbeatLease,
  releaseLease,
  leaseHealth,
} from './lib/session-lease.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith('--') ? args[0] : 'status';
const json = args.includes('--json');

const options = {
  agent: getArg('--agent'),
  owner: getArg('--owner'),
  note: getArg('--note'),
  ttlMinutes: getArg('--ttl-min') ?? getArg('--ttlMinutes'),
};

let lease;
switch (command) {
  case 'acquire':
    lease = acquireLease(ROOT, options);
    break;
  case 'heartbeat':
    lease = heartbeatLease(ROOT, options);
    break;
  case 'release':
    lease = releaseLease(ROOT, options);
    break;
  case 'status':
    lease = readLease(ROOT);
    break;
  default:
    console.error(`Unknown session-lease command: ${command}`);
    process.exit(1);
}

const output = {
  command,
  lease,
  health: leaseHealth(lease),
};

if (json) {
  console.log(JSON.stringify(output, null, 2));
} else if (!lease) {
  console.log('No session lease present.');
} else {
  console.log(`Session lease: ${lease.status} · ${lease.agent} · ${lease.owner}`);
  console.log(`Lease id: ${lease.leaseId}`);
  console.log(`Heartbeat: ${lease.heartbeatAt}`);
  console.log(`Expires: ${lease.expiresAt}`);
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}
