function decimalOdds(american) {
  const value = Number(american);
  if (!Number.isFinite(value) || value === 0) return null;
  return value > 0 ? 1 + value / 100 : 1 + 100 / Math.abs(value);
}

function sameNumber(left, right) {
  if (left == null && right == null) return true;
  return Number.isFinite(Number(left)) && Number.isFinite(Number(right))
    && Math.abs(Number(left) - Number(right)) < 0.001;
}

function lineOutcomes(market, candidate) {
  const outcomes = Array.isArray(market?.outcomes) ? market.outcomes : [];
  if (market?.key === "h2h") return outcomes;
  if (market?.key === "spreads") {
    return outcomes.filter((outcome) => Number.isFinite(Number(outcome.point))
      && Math.abs(Math.abs(Number(outcome.point)) - Math.abs(Number(candidate.point))) < 0.001);
  }
  return outcomes.filter((outcome) => sameNumber(outcome.point, candidate.point));
}

function normalizedProbability(market, candidate) {
  const outcomes = lineOutcomes(market, candidate);
  const matching = outcomes.find((outcome) => outcome.name === candidate.name && sameNumber(outcome.point, candidate.point));
  if (!matching || outcomes.length < 2) return null;
  const probabilities = outcomes.map((outcome) => {
    const decimal = decimalOdds(outcome.price);
    return decimal && decimal > 1 ? 1 / decimal : null;
  });
  if (probabilities.some((value) => value == null)) return null;
  const overround = probabilities.reduce((sum, value) => sum + value, 0);
  const matchingDecimal = decimalOdds(matching.price);
  if (!matchingDecimal || overround <= 0) return null;
  return (1 / matchingDecimal) / overround;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function timestampFor(bookmaker, market) {
  const value = bookmaker?.last_update || market?.last_update;
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : null;
}

export function evaluateQuoteCandidate(game, targetBook, targetMarket, candidate, options = {}) {
  const nowMs = options.now instanceof Date ? options.now.getTime() : Number(options.now || Date.now());
  const maxAgeMs = Number.isFinite(options.maxAgeMs) ? options.maxAgeMs : 10 * 60 * 1000;
  const minSources = Number.isFinite(options.minSources) ? options.minSources : 2;
  const targetDecimal = decimalOdds(candidate?.price);
  const base = {
    supported: false,
    reason: "invalid-target-quote",
    sourceCount: 0,
    sourceBooks: [],
    targetBook: targetBook?.title || null,
    targetExcluded: true,
    vigRemoved: true,
  };
  if (!targetDecimal || targetDecimal <= 1) return base;

  const targetUpdatedAt = timestampFor(targetBook, targetMarket);
  if (targetUpdatedAt == null || nowMs - targetUpdatedAt > maxAgeMs || targetUpdatedAt - nowMs > 60_000) {
    return { ...base, reason: "target-freshness-unproved" };
  }

  const samplesByBook = new Map();
  for (const bookmaker of game?.bookmakers || []) {
    if (bookmaker === targetBook || bookmaker?.title === targetBook?.title) continue;
    const market = (bookmaker?.markets || []).find((entry) => entry.key === targetMarket?.key);
    if (!market) continue;
    const updatedAt = timestampFor(bookmaker, market);
    if (updatedAt == null || nowMs - updatedAt > maxAgeMs || updatedAt - nowMs > 60_000) continue;
    const probability = normalizedProbability(market, candidate);
    if (probability == null) continue;
    const sourceBook = bookmaker.title || "unknown";
    if (!samplesByBook.has(sourceBook)) {
      samplesByBook.set(sourceBook, { book: sourceBook, probability, updatedAt });
    }
  }

  const samples = [...samplesByBook.values()];

  if (samples.length < minSources) {
    return { ...base, reason: "insufficient-independent-sources", sourceCount: samples.length, sourceBooks: samples.map((sample) => sample.book) };
  }

  const fairProbability = median(samples.map((sample) => sample.probability));
  const evPct = (fairProbability * targetDecimal - 1) * 100;
  const oldestAgeMs = Math.max(...samples.map((sample) => nowMs - sample.updatedAt), nowMs - targetUpdatedAt);
  return {
    ...base,
    supported: true,
    reason: "target-excluded-no-vig-consensus",
    sourceCount: samples.length,
    sourceBooks: samples.map((sample) => sample.book),
    fairProbability,
    bookProbability: 1 / targetDecimal,
    evPct,
    oldestAgeMs,
    grade: samples.length >= 4 ? "strong" : samples.length >= 3 ? "good" : "minimum",
  };
}

export function analyzeEvOpportunities(games = [], options = {}) {
  const thresholdPct = Number.isFinite(options.thresholdPct) ? options.thresholdPct : 2;
  const opportunities = [];
  let candidates = 0;
  let unsupported = 0;

  for (const game of Array.isArray(games) ? games : []) {
    for (const bookmaker of game?.bookmakers || []) {
      for (const market of bookmaker?.markets || []) {
        for (const outcome of market?.outcomes || []) {
          candidates += 1;
          const evidence = evaluateQuoteCandidate(game, bookmaker, market, outcome, options);
          if (!evidence.supported) {
            unsupported += 1;
            continue;
          }
          if (!(evidence.evPct > thresholdPct)) continue;
          const point = outcome.point == null ? "" : ` ${Number(outcome.point) > 0 ? "+" : ""}${outcome.point}`;
          opportunities.push({
            game: `${game.home_team || "Home"} vs ${game.away_team || "Away"}`,
            sport: game.sport_title || game.sport_key || "Unknown sport",
            start: game.commence_time,
            outcome: `${outcome.name}${point}`,
            book: bookmaker.title,
            price: outcome.price,
            fairPct: (evidence.fairProbability * 100).toFixed(1),
            bookPct: (evidence.bookProbability * 100).toFixed(1),
            ev: evidence.evPct.toFixed(1),
            evidence,
          });
        }
      }
    }
  }

  opportunities.sort((left, right) => Number(right.ev) - Number(left.ev));
  return {
    opportunities: opportunities.slice(0, 50),
    diagnostics: { games: Array.isArray(games) ? games.length : 0, candidates, unsupported, surfaced: Math.min(opportunities.length, 50) },
  };
}
