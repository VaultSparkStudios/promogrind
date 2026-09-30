export const REFRESH_SECONDS = 86400;
export const SMALL_COUNT_THRESHOLD = 10;
type Week = { start: string; end: string; contributors: number; workflows: number; outcomes: number; outcomeContributors: number };
type Source = { computedAt: string; weeks: Week[] };
const DAY = 86400000;
const definitions = {
  'workflow-contributors': 'Distinct signed-in accounts with a synced workflow whose recorded creation time falls in this UTC week. Creation time is supplied by the app and may precede sync. This is not total accounts, visitors, or all calculator users.',
  'workflows-saved': 'Synced workflow rows grouped by their app-supplied creation timestamp during this UTC week. Deleted rows are absent. Local-only and guest calculations are not included.',
  'outcomes-recorded': 'Distinct account/workflow pairs with a settled history record whose creation timestamp falls in this UTC week. The database normally assigns that timestamp when synced, but account owners can change it. Repeated settled events in one week count once. These are self-reported records, not verified bets or profits.',
};

function publicCount(count: number, contributors: number) {
  if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(contributors) || contributors < 0 || contributors > count) throw new Error('Invalid aggregate count');
  if (count === 0 && contributors === 0) return { value: 0, format: 'integer', smallCountOk: true, available: true };
  if (contributors < SMALL_COUNT_THRESHOLD) return { available: false, unavailableReason: 'Withheld for privacy: fewer than 10 contributing accounts.', privacySuppressed: true };
  const floor = Math.floor(count / 10) * 10;
  return { value: `${floor}–${floor + 9}`, format: 'text', banded: true, available: true };
}

/** Allowlist output: no raw counts, account IDs, free-text labels, or source extras are copied. */
export function buildPublicStats(source: Source, now = new Date()) {
  const computed = Date.parse(source?.computedAt);
  if (!Number.isFinite(computed) || computed > now.getTime() + 60000 || now.getTime() - computed > 300000) throw new Error('Source must be freshly computed');
  if (!Array.isArray(source.weeks) || source.weeks.length !== 4) throw new Error('Four complete weeks required');
  const thisMonday = new Date(now);
  thisMonday.setUTCHours(0, 0, 0, 0);
  thisMonday.setUTCDate(thisMonday.getUTCDate() - (thisMonday.getUTCDay() + 6) % 7);
  const weeks = source.weeks.map((week, index) => {
    const end = thisMonday.getTime() - index * 7 * DAY;
    if (Date.parse(week.start) !== end - 7 * DAY || Date.parse(week.end) !== end) throw new Error('Weeks must be complete, ordered and non-overlapping');
    const counts = [
      publicCount(week.contributors, week.contributors),
      publicCount(week.workflows, week.contributors),
      publicCount(week.outcomes, week.outcomeContributors),
    ];
    const labels = ['Workflow contributors', 'Workflows saved', 'Outcomes recorded'];
    return {
      start: new Date(end - 7 * DAY).toISOString(), end: new Date(end).toISOString(),
      metrics: Object.entries(definitions).map(([id, definition], i) => ({
        id, label: labels[i], ...counts[i],
        period: `${new Date(end - 7 * DAY).toISOString().slice(0, 10)} / ${new Date(end).toISOString().slice(0, 10)} (UTC, end exclusive)`,
        computedAt: new Date(computed).toISOString(),
        unitOrDenominator: definition, category: 'saved-workflows', public: true,
        interpretation: i === 2
          ? 'A recorded outcome means someone closed the feedback loop. It says nothing about whether they made money; no winnings, losses or returns are published.'
          : i === 0 ? 'This is a subset of product use: people who saved work to an account. Anonymous calculator use is absent, so this cannot estimate total reach.'
            : 'A saved workflow records intent to work through an offer, not proof that a bet was placed. More records do not imply better results.',
      })),
    };
  });
  return {
    feedVersion: 'analytica-feed-v1',
    project: { slug: 'promogrind', name: 'PromoGrind', type: 'app', audience: 'public-app', url: 'https://promogrind.bet' },
    generatedAt: now.toISOString(), refreshSeconds: REFRESH_SECONDS, refreshMechanism: 'poll', precomputed: true, transport: 'http',
    showcase: Object.keys(definitions), privacy: { aggregateOnly: true, smallCountThreshold: SMALL_COUNT_THRESHOLD, countBandWidth: 10 },
    metrics: weeks[0].metrics, history: weeks.slice(1), definitions,
    methodology: 'Four complete, non-overlapping UTC weeks. Each count needs at least 10 contributing accounts; publishable nonzero counts use ranges of 10. Zero means no records were observed. No amounts, identities, locations or per-account activity are published. Counts are not evidence of gambling success.',
  };
}
