# Studio Ops Scripts

## Unified entry point (recommended)

```bash
node scripts/ops.mjs help           # full command list with flags
node scripts/ops.mjs <command>      # run any script by name
```

All scripts are still directly runnable as `node scripts/<name>.mjs` — ops.mjs is a thin router.

---

## v3.1 additions (session 73)

| Need | ops.mjs shortcut | Direct command |
|---|---|---|
| Check capability credentials | `ops.mjs check-secrets --for <cap>` | `node scripts/check-secrets.mjs --for <cap>` |
| Closeout autopilot | `ops.mjs closeout [--dry-run]` | `node scripts/closeout-autopilot.mjs` |
| Detect session mode | `ops.mjs session-mode --explain` | `node scripts/detect-session-mode.mjs --explain` |
| Studio Pulse (once / watch) | `ops.mjs pulse --once` | `node scripts/studio-pulse.mjs --once` |
| Daily studio narrative | `ops.mjs narrator` | `node scripts/studio-narrator.mjs` |
| Founder Queue render | `ops.mjs founder-queue` | `node scripts/render-founder-queue.mjs` |
| Testability matrix | `ops.mjs testability --probe` | `node scripts/render-testability.mjs --probe` |
| Compact handoff (Haiku, cached) | `ops.mjs compact-handoff` | `node scripts/compact-handoff.mjs` |
| Generate SparkFunnel magnet | `ops.mjs lead-magnet --project <slug>` | `node scripts/generate-lead-magnet.mjs --project <slug>` |

The studio-ops MCP server is at `studio-ops-mcp/server.mjs` and exposes 15 of these tools to any MCP client. Register in `.claude/mcp.json`. See `studio-ops-mcp/README.md`.

---

## v3.2 foundation additions (session 75)

| Need | ops.mjs shortcut | Direct command |
|---|---|---|
| Validate current repo manifest | `ops.mjs manifest-check` | `node scripts/validate-studio-manifest.mjs` |
| Compile portfolio truth/integration fabric | `ops.mjs fabric` | `node scripts/compile-studio-fabric.mjs` |
| Generate current repo contracts | `ops.mjs contracts` | `node scripts/generate-project-contracts.mjs` |

Outputs now include:

- `portfolio/compiled/PROJECT_CAPABILITIES.json`
- `portfolio/compiled/INTEGRATION_STATUS.json`
- `portfolio/compiled/TRUTH_GRAPH.json`
- `portfolio/compiled/LIVE_SURFACES.json`
- `portfolio/compiled/PUBLIC_SURFACES.json`
- `portfolio/compiled/LISTING_METADATA.json`

These are the first machine-readable contract artifacts for the autonomy roadmap: canonical live/test lookup, synthesized manifest fallback for repos that have not adopted `context/STUDIO_MANIFEST.json` yet, portfolio-wide integration completeness, and per-project `context/contracts/*.json` payloads for downstream consumers.

---

## v3.2 execution additions (session 76)

| Need | ops.mjs shortcut | Direct command |
|---|---|---|
| Generate runtime pack | `ops.mjs runtime-pack --project <slug> --write` | `node scripts/runtime-pack.mjs --project <slug> --write` |
| Bootstrap/adopt/repair a repo | `ops.mjs onboard --project <slug> --write` | `node scripts/ops-onboard.mjs --project <slug> --write` |
| Append portfolio event | `ops.mjs emit-event --type <type> --slug <slug>` | `node scripts/emit-studio-event.mjs --type <type> --slug <slug>` |
| Compile automation queue from decisions + events | `ops.mjs automation-queue` | `node scripts/compile-automation-queue.mjs` |

The execution layer now has an append-only event bus at `portfolio/events.ndjson`, a compiled automation queue at `portfolio/AUTOMATION_QUEUE.json`, runtime-pack generators for per-project onboarding, and a manifest-backed `LISTING_METADATA.json` artifact for downstream consumers.

---

## v3.2 control-plane additions (session 77)

| Need | ops.mjs shortcut | Direct command |
|---|---|---|
| Evaluate public-release readiness | `ops.mjs release-gate` | `node scripts/check-release-gate.mjs` |
| Compile provider pressure / capacity plan | `ops.mjs capacity-planner` | `node scripts/render-capacity-planner.mjs` |
| Measure rollout adoption | `ops.mjs rollout-scoreboard` | `node scripts/render-rollout-scoreboard.mjs` |
| Summarize feedback-loop health | `ops.mjs feedback-dashboard` | `node scripts/render-feedback-loop-dashboard.mjs` |

New outputs now include:

- `portfolio/compiled/RELEASE_GATES.json`
- `portfolio/compiled/CAPACITY_PLAN.json`
- `portfolio/compiled/ROLLOUT_SCOREBOARD.json`
- `portfolio/compiled/FEEDBACK_LOOP_DASHBOARD.json`
- `docs/RELEASE_GATES.md`
- `docs/CAPACITY_PLANNER.md`
- `docs/ROLLOUT_SCOREBOARD.md`
- `docs/FEEDBACK_LOOP_DASHBOARD.md`

These surfaces turn the autonomy roadmap into a real control plane: release safety, platform headroom, adoption progress, and feedback-loop quality now have dedicated canonical outputs.

---

## High-signal session commands

| Need | ops.mjs shortcut | Direct command |
|---|---|---|
| Pre-load session priorities | `ops.mjs preload` | `node scripts/preload-taskboard.mjs` |
| Render live ops cockpit | `ops.mjs cockpit` | `node scripts/render-ops-cockpit.mjs` |
| Rolling Claude cache + spend ledger | `ops.mjs cache-ledger` | `node scripts/render-cache-ledger.mjs` |
| Pre-render startup brief (closeout) | `ops.mjs startup-brief` | `node scripts/render-startup-brief.mjs` |
| Audit Claude skills + commands | `ops.mjs skill-doctor` | `node scripts/skill-doctor.mjs` |
| Manage session lease state | `ops.mjs session-lease acquire --agent codex --owner founder` | `node scripts/session-lease.mjs acquire --agent codex --owner founder` |
| Founder-scale runtime/router view | `ops.mjs orchestrator` | `node scripts/render-studio-orchestrator.mjs` |
| Verify Claude ↔ Codex hot-swap parity | `ops.mjs hot-swap-test` | `node scripts/test-hot-swap.mjs` |
| Validate semantic compliance | `ops.mjs validate --project studio-ops` | `node scripts/validate-compliance.mjs --project studio-ops` |
| Validate (machine-readable) | `ops.mjs validate --json` | `node scripts/validate-compliance.mjs --json` |
| Track compliance velocity | `ops.mjs compliance-velocity` | `node scripts/track-compliance-velocity.mjs` |
| Scan public repos for sanitization | `ops.mjs sanitize-scan --summary --only-problematic` | `node scripts/check-public-repo-sanitization.mjs --summary --only-problematic` |
| Regenerate sanitization packets | `ops.mjs sanitize-scan --summary --only-problematic --write-report audits/sanitization/latest` | *(same)* |
| Check sanitization ratchet | `ops.mjs sanitize-ratchet --report-dir audits/sanitization/latest` | `node scripts/check-sanitization-ratchet.mjs --report-dir audits/sanitization/latest` |
| Render sanitization status | `ops.mjs sanitize-status --refresh` | `node scripts/render-sanitization-status.mjs --refresh` |
| Render all founder surfaces | `ops.mjs surfaces` | `node scripts/render-all-surfaces.mjs` |
| Regenerate project registry markdown | `ops.mjs registry` | `node scripts/render-project-registry.mjs` |
| Check launch readiness | `ops.mjs launch-check --sparked` | `node scripts/check-launch-ready.mjs --sparked` |
| Check canon rollout | `ops.mjs canon-check --strict` | `node scripts/check-canon-compliance.mjs --strict` |
| Propagate templates | `ops.mjs propagate --apply --commit --push` | `bash scripts/propagate-templates.sh --apply --commit --push` |
| Install git secret-scan hook | `ops.mjs install-hooks` | `node scripts/install-hooks.mjs` |

---

## Model-provider chokepoint

`scripts/lib/model-router.mjs` is the **single allowed file** in `scripts/` that may reference provider endpoints, provider SDK package names, or hardcoded provider model IDs. All other scripts must route through its exports (`callClaude`, `selectModel`, `withCache`, `buildThinkingConfig`, `logMetrics`, `submitBatch`, `pollBatch`, `PRICING_PER_MTOK`).

A CI step in `.github/workflows/studio-os-enforcer.yml` greps `scripts/` on every run for these patterns and fails the build on any violation outside the chokepoint:

The enforcement expressions intentionally live in the hook and router rather than being duplicated in this documentation, which is itself inside the scanned `scripts/` tree.

To add a new Claude-using script:

```js
import { callClaude, selectModel, withCache, logMetrics, MODELS } from './lib/model-router.mjs';
// ... build messages, call callClaude, then logMetrics({ script, model, usage }) after.
```

### Cache + cost telemetry

Every `callClaude` site should follow up with `logMetrics({ script, model, usage })`. Entries land in `docs/cache-ledger.ndjson` (gitignored, ephemeral) and `scripts/render-cache-ledger.mjs` aggregates them into `docs/CACHE_LEDGER.md` + a 7-day snapshot line embedded in `docs/OPS_COCKPIT.md`.

Override the log path per-run with `OPS_CACHE_LEDGER=/path/to/log.ndjson`.

## Security

All scripts that accept `--project`, `--repo`, `--date`, or `--dir` arguments validate inputs via `scripts/lib/validate.mjs`. Invalid inputs exit 1 with a clear error before any file I/O.

Pre-push hook: `node scripts/ops.mjs install-hooks` installs `scripts/git-hooks/pre-push` into `.git/hooks/`. It blocks both secret leaks and Anthropic/router references outside `scripts/lib/model-router.mjs`.

---

Project-specific cleanup belongs in each project repo unless the Studio Owner explicitly asks Studio Ops to perform a cross-repo rollout. Run `scripts/check-repo-lock.sh <repo-path>` before any cross-repo write.
# Security history scan

Run a bounded full-history scan with stable JSON output:

```bash
node scripts/scan-git-history.mjs --since 2026-07-01 --timeout-ms 30000 --json
```

# Launch proof quorum

Migrate or verify the criterion-level launch-proof contract:

```bash
node scripts/migrate-launch-proof-quorum.mjs --apply --rebuild-criteria
```

Record one redacted criterion receipt (status is always derived):

```bash
node scripts/update-launch-proof.mjs --proof authEmailSmoke --criterion confirmation-email-delivered --source human-observation --target https://promogrind.bet --verifier operator --evidence "Confirmation delivered"
```

# Target-bound launch capabilities

Probe provider identity and required scope through the secrets gateway without mutation or key output:

```bash
node scripts/check-launch-capabilities.mjs --write
node scripts/check-launch-capabilities.mjs --offline --json
```

Plan Brevo sender-domain authentication, then apply only provider-returned DNS records when approved:

```bash
node scripts/configure-brevo-domain.mjs
node scripts/configure-brevo-domain.mjs --apply
```
