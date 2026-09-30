#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const workflow = fs.readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
const ordered = ['denoland/setup-deno@v2', 'npm run verify:launch-local', 'npm run build:pages', "prepareCloudflareArtifact('dist')", '--environment staging --apply', 'verify:web-live -- --url https://staging.promogrind.bet', '--environment production --apply', 'verify:web-live -- --url https://promogrind.bet'];
let prior = -1;
for (const step of ordered) {
  const index = workflow.indexOf(step);
  assert.ok(index > prior, `release step must exist in order: ${step}`);
  prior = index;
}
assert.match(workflow, /--staging-receipt "\$RECEIPT"/);
assert.equal((workflow.match(/npm run build:pages/g) || []).length, 1, 'promote the same build');
assert.equal((workflow.match(/--commit "\$GITHUB_SHA"/g) || []).length, 2, 'both origins bind to the triggering commit');
assert.match(workflow, /cancel-in-progress: false/, 'never cancel between staging and promotion');
assert.doesNotMatch(workflow, /actions\/deploy-pages@|pages: write|continue-on-error: true/);
assert.doesNotMatch(workflow, /cat > \.env|SUPABASE_SERVICE_ROLE_KEY/, 'static release needs no admin database credential');
assert.match(workflow, /if: always\(\)[\s\S]*actions\/upload-artifact@/);
console.log('release workflow regression passed · one build, verified stable staging, exact Cloudflare promotion');
