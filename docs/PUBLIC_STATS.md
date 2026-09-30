# Community statistics

The homepage summary and `/stats` read the same Analytica Feed v1 artifact through `/stats.json`. The detailed page adds four complete UTC weeks, definitions, coverage limits, and interpretation. It makes no betting-performance claims.

The source counts saved workflows and settled history records. These measurements exclude guest calculator use, local-only activity, and deleted records. Each weekly interval is complete at publication and comparison time; the start is inclusive and the end is exclusive. Saved workflows use their app-supplied creation timestamp, which can precede sync. History uses record creation timestamps, normally assigned by the database when synced but editable by account owners. These dates are not independently verified; delayed sync, edits and deletions can change earlier weeks.

Nonzero counts require at least ten distinct contributing accounts. Publishable counts use ranges of ten. A single prolific account cannot overcome suppression. Observed zero, privacy suppression, and an unavailable source remain distinct. No identities, locations, betting amounts, or per-account activity enter the feed. Ranges and suppression are not a formal differential-privacy guarantee; no totals, percentages, or cross-segment arithmetic are published.

The producer authenticates an exact service-role POST before reading the aggregate-only SQL function. Browser roles cannot execute it. Successful refreshes replace one public JSON object in storage; failures preserve the previous dated object. Visitors read that object rather than querying account tables. The page revalidates every five minutes and marks a report stale after 24 hours. The service worker bypasses its asset cache for this feed.

The publisher and its initial public report were verified on 2026-09-30. The daily 06:17 UTC schedule is active. Initial publication and schedule configuration are observed; a recurring execution has not yet been observed. Activation verifies the pinned project and matches its existing service authority to the deployed guard before publication and scheduling. Disabling the single named job stops future refreshes; the last report then ages visibly. No notification or payment flow is involved.

Validation includes real aggregate source execution, producer authorization and failure tests, client privacy/freshness tests, and desktop/mobile rendered states in dark and light themes. The source observation is evidence for the query, not proof that a recurring schedule has run. See `visual-qa/s132-review.json` for image evidence.
