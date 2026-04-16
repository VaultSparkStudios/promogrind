╔══════════════════════════════════════════════════════════════════╗
║  STARTUP BRIEF  ·  PromoGrind                                  ║
║  2026-04-16  ·  Session 54  ·  BUILDER MODE                    ║
║  C — Returning  ·  deployed/public-unlaunched  ·  VaultSpark   ║
╚══════════════════════════════════════════════════════════════════╝

╔══ SCORE ════════════════════════════════════════════════════════╗
║                                                                ║
║  468/500   ███████████████████████░   94%                      ║
║  Trend  ▇ ▆ ▇ █ ▇  ↑  ·  Avg3: 470.7  ·  Days since: 0         ║
║                                                                ║
╚══════════════════════════════════════════════════════════════════╝

╔══ STATUS ═══════════════════════════════════════════════════════╗
║ Health: green  ·  Truth audit: green  ·  Version: 24.8.0       ║
║ Build/tests: passing  ·  178/178 tests green                   ║
║ Domain: promogrind.bet live on Cloudflare                      ║
║ Billing: live Stripe preflight reaches hosted Checkout         ║
╚══════════════════════════════════════════════════════════════════╝

╔══ PRIORITIES ═══════════════════════════════════════════════════╗
║ 1. Human-required launch blockers still gate public proof.     ║
║ 2. Best next repo-side tranche: finish entity-aware sync       ║
║    beyond ledger/workflow/history into the legacy blob exit.   ║
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
║ Now: Entity-aware sync continuation                            ║
║ Now: Canonical Promo Operating Graph                           ║
║ Next: Offline-first ledger queue · playbooks · observability   ║
╚══════════════════════════════════════════════════════════════════╝

╔══ NOTES ════════════════════════════════════════════════════════╗
║ - Sync now preserves per-record ledger/workflow/history        ║
║   changes across devices instead of whole-array overwrite.     ║
║ - Promo Walkthroughs are lazy-loaded, restoring bundle         ║
║   headroom to ~415.9KB under the 420KB cap.                    ║
║ - Public-safe repo context remains intentionally thin.         ║
╚══════════════════════════════════════════════════════════════════╝
