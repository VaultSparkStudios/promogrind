# Runtime Pack

- Project: PromoGrind (`promogrind`)
- Generated: 2026-04-22T01:47:20.640Z
- Required files: 15/15
- Manifest: present
- Hub-ready baseline: yes

## Runtime Assets

- Prompts: prompts/start.md, prompts/closeout.md
- Skills: none
- Hooks: pre-push
- MCP/local settings template: .claude/settings.local.json

## Repair Actions

- No immediate repair actions detected.

## Efficiency Playbook

- Use scripts/lib/model-router.mjs as the single Claude/Anthropic chokepoint.
- Prefer Haiku-first escalation, long-cache blocks, and semantic cache helpers before direct model calls.
- Reuse generated contracts and compiled fabric outputs instead of scraping multiple Markdown sources.
- Use ops-level commands before inventing repo-local variants when Studio Ops already owns the workflow.
- This project declares AI capability: install the Anthropic wrapper template before adding any new AI entrypoint.
- Treat generated telemetry, cache ledgers, and event files as append-only operational data, not ad hoc scratch files.

## Integrations

- studioHub: enabled · ready · Hub requires PROJECT_STATUS.json and baseline Studio OS files.
- website: enabled · ready · Website listing should read manifest-backed listing metadata and public surfaces.
- socialDashboard: enabled · ready · Social Dashboard should consume manifest-backed listing and growth metadata.
- sparkFunnel: enabled · ready · SparkFunnel should consume canonical summary, CTA, and funnel metadata.
- ignis: enabled · ready · IGNIS should read contract-backed project metrics and capabilities.
