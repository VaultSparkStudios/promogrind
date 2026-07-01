<!-- generated-by: scripts/render-ai-usage-ledger.mjs -->
<!-- generated-at: 2026-07-01T17:10:10.410Z -->

# AI Usage Ledger

Source: Supabase vault_events since 2026-06-17T17:10:09.046Z

- Window: 14 days
- Total AI feature events: 0
- Model-backed calls: 0
- Rule-engine wins: 0 (0%)
- Estimated input tokens: 0
- Estimated output tokens: 0
- Estimated tokens saved: 0

| Feature | Calls | Model | Rule | Input tok | Output tok | Saved tok |
|---|---:|---:|---:|---:|---:|---:|

## Measurement Plan

- Treat rule-engine wins as avoided model calls only when metadata includes `analysis_source=rule_engine`.
- Track cache hits client-side as trust receipts and server-side where the feature function records cache metadata.
- Target: grow rule-engine/cache-resolved Promo Advisor responses to at least 50% of recognizable offers without reducing confidence or calculator-routing quality.
