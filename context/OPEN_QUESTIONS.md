# Open Questions

## Active

### What states require an affiliate license to operate sportsbook affiliate links?

- Raised: 2026-03-24
- Context: Some states require a gaming affiliate license before you can legally operate as a sportsbook affiliate. The personal "Refer a Friend" links are exempt — they're a standard user feature, not affiliate marketing.
- Owner: Studio (legal/compliance check)
- Unblock path: Check state gaming commission websites; or join an affiliate network (Income Access, Gambling.com Group) that handles compliance. Alternatively, use only personal referral links initially.

### When should the Supabase shared odds cache be built?

- Raised: 2026-03-26
- Context: Each VaultSparked user currently makes their own Odds API calls. At 10+ concurrent users the cost becomes meaningful and rate limits become a concern.
- Owner: Studio
- Unblock path: Build a simple `odds_cache` table in Supabase. Edge Function writes to it every 5 min; all scanner clients read from it instead of calling The Odds API directly. Implement before marketing push that could spike concurrent users.

### Should push notification daily briefing use VAPID web-push (server-sent) or just in-browser Notification API?

- Raised: 2026-03-26
- Context: Session 9 added daily briefing via `new Notification(...)` which only works when the browser/tab is open. True scheduled push (even when app is closed) requires VAPID keys + a push service + service worker push event handler.
- Owner: Studio
- Unblock path: For v1 (current), in-browser notification is fine. For v2, add VAPID key generation, store subscription in Supabase `push_subscriptions` table, send via web-push from a Supabase Edge Function cron at 9am.

## Resolved

### Which deploy target is primary — Vercel or GitHub Pages?

- Resolved: 2026-03-25
- Decision: GitHub Pages. App is live at vaultsparkstudios.com/promogrind/. Auto-deploys on push to main via GitHub Actions.

### What is the target domain?

- Resolved: 2026-03-25
- Decision: No separate domain. PromoGrind stays permanently at vaultsparkstudios.com/promogrind/. SEO equity concentrates on the studio domain.
