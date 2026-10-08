#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from './lib/safe-spawn.mjs';
import {getSecret} from './lib/secrets.mjs';
import {boundedFetch} from './lib/bounded-fetch.mjs';
import {verifyReleaseProof,signReleaseProof,proofHash} from './lib/release-proof.mjs';
import {releaseCandidateVerdict} from './lib/release-candidate.mjs';
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log('Usage: node scripts/check-release-candidate.mjs [--project <path>] [--sha <commit>] [--target staging|production] [--record] [--identity-change] [--json]'); process.exit(0); }
const value = flag => {const i=args.indexOf(flag); if(i<0)return null; if(!args[i+1] || args[i+1].startsWith('--'))throw new Error('missing value: '+flag); return args[i+1];};
for(let i=0;i<args.length;i++) {if(['--project','--sha','--target'].includes(args[i])) {value(args[i]);i++;} else if(!['--json','--record','--identity-change'].includes(args[i])) throw new Error('unknown argument: '+args[i]);}
const root = path.resolve(value('--project') || path.join(import.meta.dirname,'..'));
const target=value('--target')||'production';
if(!['staging','production'].includes(target))throw Error('Unknown release target');
const git = argv => {const r=spawnSync('git',argv,{cwd:root,encoding:'utf8',windowsHide:true,timeout:30000}); if(r.status!==0)throw new Error('candidate Git identity unavailable');return r.stdout.trim();};
try {
  const sha=git(['rev-parse',value('--sha') || 'HEAD']);
  const remote=git(['remote','get-url','origin']);
  const match=remote.match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  if(!match)throw new Error('GitHub repository identity unavailable');
  const repo=match[1];
  const contractFile=path.join(root,'.github/RELEASE_CHECKS.json');
  const contract=fs.existsSync(contractFile)?JSON.parse(fs.readFileSync(contractFile,'utf8')):null;
  const requiredWorkflows=contract?.requiredWorkflows;
  if(!Array.isArray(requiredWorkflows) || !requiredWorkflows.length || requiredWorkflows.some(w=>!/^\.github\/workflows\/[a-zA-Z0-9_.-]+\.ya?ml$/.test(w)))throw new Error('declare .github/RELEASE_CHECKS.json requiredWorkflows before release');
  let independentProof={ok:false, expectedSha:sha};
  const policyFile=path.join(root,'portfolio/RELEASE_PROOF_POLICY.json'), ledger=path.join(root,'portfolio/ops/release-proofs.ndjson');
  if(fs.existsSync(policyFile) && fs.existsSync(ledger)) {
    const policy=JSON.parse(fs.readFileSync(policyFile,'utf8'));
    const receipt=fs.readFileSync(ledger,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse).findLast(r=>r.source?.sha===sha);
    independentProof={...verifyReleaseProof(receipt,{key:getSecret('STUDIO_ARK_KEY','studio.ark'), expectedSha:sha,policy}),expectedSha:sha};
    if(independentProof.ok){
      independentProof={...independentProof,completedAt:receipt.completedAt,expiresAt:new Date(Date.parse(receipt.completedAt)+Number(policy.maximumAgeHours||24)*3600000).toISOString(),policySha256:proofHash(policy),receiptSha256:proofHash(receipt)};
    }
  }
  const token=getSecret('GITHUB_TOKEN','github.api') || getSecret('GH_TOKEN','github.api');
  if(!token)throw new Error('GitHub observation unavailable; candidate failures must be observed, not assumed absent');
  const get=async endpoint => {const r=await boundedFetch(`https://api.github.com/repos/${repo}${endpoint}`,{timeoutMs:30000,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});if(!r.ok)throw new Error('GitHub observation HTTP '+r.status);return r.json();};
  const runs=[];
  for(const workflow of requiredWorkflows) {
    const history=await get(`/actions/workflows/${encodeURIComponent(path.posix.basename(workflow))}/runs?head_sha=${sha}&per_page=100`);
    const latest=history.workflow_runs?.filter(r=>r.head_sha===sha).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at) || b.run_attempt-a.run_attempt)[0];
    if(!latest)continue;
    const run={id:latest.id,workflow,headSha:latest.head_sha,createdAt:latest.created_at,attempt:latest.run_attempt,status:latest.status,conclusion:latest.conclusion};
    if(run.status==='completed' && run.conclusion!=='success') {
      const jobs=await get(`/actions/runs/${run.id}/attempts/${latest.run_attempt}/jobs?per_page=100`);
      if(jobs.total_count>jobs.jobs.length)throw new Error('candidate job observation truncated');
      run.zeroStep=jobs.jobs.length>0 && jobs.jobs.every(j=>(j.steps || []).length===0);
      if(run.zeroStep && latest.check_suite_id) {
        const checks=await get(`/check-suites/${latest.check_suite_id}/check-runs?per_page=100`);
        if(checks.total_count>checks.check_runs.length)throw new Error('candidate check observation truncated');
        const annotations=(await Promise.all(checks.check_runs.map(c=>get(`/check-runs/${c.id}/annotations?per_page=100`)))).flat();
        run.budgetRejection=annotations.some(a=>/Actions budget is preventing|spending limit|billing.*prevent|payment.*required/i.test(a.message || ''));
      }
    }
    runs.push(run);
  }
  const verdict=releaseCandidateVerdict({sha,requiredWorkflows,runs,independentProof});
  const report={...verdict,sourceCommit:sha,repository:repo,checkedAt:new Date().toISOString(),independentProof};
  if(args.includes('--record')){
    // Recording stays local to the invoked project. It never writes sibling trees.
    const slug=repo.split('/').at(-1),consoleProject=slug==='vaultspark-studio-ops';
    const observation={schemaVersion:'release-candidate-observation/v1',slug,target,repository:repo,sourceCommit:sha,checkedAt:report.checkedAt,policySha256:proofHash(contract),runs,independentProof,action:args.includes('--identity-change')?'identity-change':'promote',identityChanged:args.includes('--identity-change'),protectedSurface:consoleProject,deploymentProjects:consoleProject?{staging:'vaultspark-studio-console-staging',production:'vaultspark-studio-console'}:{}};
    observation.sig=signReleaseProof(observation,getSecret('STUDIO_ARK_KEY','studio.ark'));
    const dir=path.join(root,'portfolio/ops');fs.mkdirSync(dir,{recursive:true});
    fs.appendFileSync(path.join(dir,'release-candidates.ndjson'),JSON.stringify(observation)+'\n');
  }
  console.log(args.includes('--json')?JSON.stringify(report,null,2):`${verdict.ok?'✓':'⛔'} candidate ${sha.slice(0,12)} · ${verdict.lane || verdict.findings.join('; ')}`);
  process.exitCode=verdict.ok?0:1;
} catch(error) {console.error('release candidate unverified: '+error.message);process.exitCode=1;}
