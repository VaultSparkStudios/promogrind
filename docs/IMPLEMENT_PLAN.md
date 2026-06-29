# Implement Plan — 2026-06-29

Source: `docs/AUDIT_2026-06-29.md`

## Wave Plan

1. **ignis-rescore-stale** — run `node scripts/ops.mjs rescore --stale` to update IGNIS score freshness.
2. **revenue-signals-regenerate** — run `node scripts/ops.mjs revenue-signals`.
3. **protocol-faq-refresh** — run `node scripts/ops.mjs ask --list` and refresh cached protocol FAQ metadata in `docs/PROTOCOL_FAQ.md`.
4. **command-template-hygiene** — patch generated genius command from placeholder `npx tsx cli.ts` to executable repo command.

## Verification Bundle

- `node scripts/ops.mjs rescore --stale`
- `node scripts/ops.mjs revenue-signals`
- `node scripts/ops.mjs ask --list`
- `node --check scripts/generate-genius-list.mjs`
- `node scripts/cache-genius-list.mjs --force`
- `node scripts/cache-genius-list.mjs --check`
