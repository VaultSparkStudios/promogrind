╔══════════════════════════════════════════════════════════════════╗
║  STARTUP BRIEF  ·  PromoGrind                                  ║
║  2026-04-15  ·  Session 50  ·  BUILDER MODE                    ║
║  C — Returning  ·  deployed/public-unlaunched  ·  VaultSpark   ║
╚══════════════════════════════════════════════════════════════════╝

╔══ SCORE ════════════════════════════════════════════════════════╗
║                                                                ║
║  474/500   ███████████████████████░   95%                      ║
║  Trend  ▆ ▆ ▇ ▆ █  ↑  ·  Avg3: 459.7  ·  Days since: 0         ║
║                                                                ║
╚══════════════════════════════════════════════════════════════════╝

╔══ STATUS ═══════════════════════════════════════════════════════╗
║ Health: green  ·  Truth audit: green  ·  Version: 24.6.0       ║
║ Build/tests: passing  ·  168/168 tests green                   ║
║ Domain: promogrind.bet live on Cloudflare                      ║
║ Billing: live Stripe preflight reaches hosted Checkout         ║
╚══════════════════════════════════════════════════════════════════╝

╔══ PRIORITIES ═══════════════════════════════════════════════════╗
║ 1. Human-required launch blockers still gate public proof.     ║
║ 2. Best next repo-side tranche: finer-grained conflict         ║
║    handling plus stronger recommendation scoring.              ║
╚══════════════════════════════════════════════════════════════════╝

╔══ HUMAN ACTION REQUIRED ════════════════════════════════════════╗
║ - Apply `scripts/migration-workflow-history.sql` in Supabase   ║
║ - Apply `scripts/migration-entity-sync.sql` in Supabase        ║
║ - Set `VITE_VAPID_PUBLIC_KEY` in production                    ║
║ - Run the real Stripe smoke flow end-to-end                    ║
║ - Secure real links/approvals for BetMGM, bet365, BetRivers    ║
║ - Do one friend-facing account/calculator/browser pass         ║
╚══════════════════════════════════════════════════════════════════╝

╔══ NOW / NEXT ═══════════════════════════════════════════════════╗
║ Now: Workflow inbox lifecycle                                  ║
║ Now: Personalized action ranking                               ║
║ Next: Conflict-aware entity sync · workflow history UI         ║
╚══════════════════════════════════════════════════════════════════╝

╔══ NOTES ════════════════════════════════════════════════════════╗
║ - Public-safe repo context is intentionally thin; detailed     ║
║   operator reasoning stays private.                            ║
║ - Sync now spans `promogrind_data` plus workflow/ledger/       ║
║   tracker entity tables as a compatibility bridge.             ║
║ - Bundle budget remains green, but headroom is now tighter.    ║
╚══════════════════════════════════════════════════════════════════╝
