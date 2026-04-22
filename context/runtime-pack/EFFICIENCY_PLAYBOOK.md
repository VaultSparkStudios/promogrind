# Efficiency Playbook

- Project: PromoGrind (`promogrind`)

## Defaults

- Use scripts/lib/model-router.mjs as the single Claude/Anthropic chokepoint.
- Prefer Haiku-first escalation, long-cache blocks, and semantic cache helpers before direct model calls.
- Reuse generated contracts and compiled fabric outputs instead of scraping multiple Markdown sources.
- Use ops-level commands before inventing repo-local variants when Studio Ops already owns the workflow.
- This project declares AI capability: install the Anthropic wrapper template before adding any new AI entrypoint.
- Treat generated telemetry, cache ledgers, and event files as append-only operational data, not ad hoc scratch files.
