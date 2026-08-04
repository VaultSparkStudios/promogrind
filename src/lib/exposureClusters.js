// Conservative concentration topology for open positions. This module never
// estimates correlation or net exposure: it reports gross stake groupings from
// explicit identifiers and narrowly inferred labels so users can review them.

function amount(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function clean(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function first(position, fields) {
  for (const field of fields) {
    const value = clean(position?.[field]);
    if (value && !["general", "unknown", "n a", "na"].includes(value)) return value;
  }
  return null;
}

function eventIdentity(position) {
  const explicit = first(position, ["eventId", "event_id", "gameId", "game_id", "fixtureId", "fixture_id"]);
  if (explicit) return { key: "event:" + explicit, label: explicit, confidence: "high", basis: "explicit-event" };
  const inferred = first(position, ["game", "matchup", "event", "fixture"]);
  if (inferred) return { key: "event-label:" + inferred, label: inferred, confidence: "medium", basis: "event-label" };
  return null;
}

function marketIdentity(position) {
  const explicit = first(position, ["marketId", "market_id", "marketKey", "market_key"]);
  if (explicit) return { key: explicit, label: explicit, confidence: "high" };
  const inferred = first(position, ["market", "type"]);
  if (inferred) return { key: inferred, label: inferred, confidence: "medium" };
  return null;
}

function displayLabel(value) {
  if (!value) return "Unknown";
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function declaredHedge(position, ids) {
  if (position?.isHedge === true || clean(position?.role) === "hedge") return true;
  const hedgeOf = clean(position?.hedgeOf || position?.hedge_of);
  return Boolean(hedgeOf && ids.has(hedgeOf));
}

function groupRows(rows, dimension, identityFor) {
  const groups = new Map();
  for (const row of rows) {
    const identity = identityFor(row.position);
    if (!identity) continue;
    const current = groups.get(identity.key) || {
      key: identity.key,
      dimension,
      label: displayLabel(identity.label),
      confidence: identity.confidence,
      basis: identity.basis || dimension,
      stake: 0,
      count: 0,
      positionIds: [],
      declaredHedgeCount: 0,
    };
    current.stake += row.stake;
    current.count += 1;
    if (row.id) current.positionIds.push(row.id);
    if (row.declaredHedge) current.declaredHedgeCount += 1;
    groups.set(identity.key, current);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      stake: Math.round(group.stake * 100) / 100,
      hedgePosture: group.declaredHedgeCount > 0 ? "declared-hedge-present" : "gross-unadjusted",
    }))
    .sort((a, b) => b.stake - a.stake || b.count - a.count || a.key.localeCompare(b.key));
}

export function analyzeExposureClusters(positions = []) {
  const source = Array.isArray(positions) ? positions : [];
  const ids = new Set(source.map((position) => clean(position?.id)).filter(Boolean));
  const rows = source
    .map((position, index) => ({
      position,
      id: clean(position?.id) || "position-" + index,
      stake: amount(position?.stake ?? position?.risk ?? position?.wager),
    }))
    .filter((row) => row.stake > 0)
    .map((row) => ({ ...row, declaredHedge: declaredHedge(row.position, ids) }));
  const grossExposure = rows.reduce((sum, row) => sum + row.stake, 0);
  const eventClusters = groupRows(rows, "event", eventIdentity);
  const bookClusters = groupRows(rows, "book", (position) => {
    const book = first(position, ["book", "sportsbook"]);
    return book ? { key: "book:" + book, label: book, confidence: "high", basis: "book" } : null;
  });
  const marketClusters = groupRows(rows, "event-market", (position) => {
    const event = eventIdentity(position);
    const market = marketIdentity(position);
    if (!event || !market) return null;
    return {
      key: event.key + "|market:" + market.key,
      label: event.label + " · " + market.label,
      confidence: event.confidence === "high" && market.confidence === "high" ? "high" : "medium",
      basis: "event-and-market",
    };
  });
  const identifiedEventIds = new Set(eventClusters.flatMap((cluster) => cluster.positionIds));
  const unknownEventRows = rows.filter((row) => !identifiedEventIds.has(row.id));
  const repeatedEventClusters = eventClusters.filter((cluster) => cluster.count > 1);
  const repeatedMarketClusters = marketClusters.filter((cluster) => cluster.count > 1);
  const largestCluster = repeatedMarketClusters[0] || repeatedEventClusters[0] || bookClusters.find((cluster) => cluster.count > 1) || null;
  const concentrationPct = largestCluster && grossExposure > 0
    ? Math.round((largestCluster.stake / grossExposure) * 1000) / 10
    : 0;
  const confidence = repeatedMarketClusters[0]?.confidence || repeatedEventClusters[0]?.confidence || (largestCluster ? "low" : "none");
  const hedgePairCount = rows.filter((row) => row.declaredHedge).length;

  return {
    grossExposure: Math.round(grossExposure * 100) / 100,
    positionCount: rows.length,
    eventClusters,
    marketClusters,
    bookClusters,
    largestCluster,
    concentrationPct,
    confidence,
    unknownEventCount: unknownEventRows.length,
    unknownEventStake: Math.round(unknownEventRows.reduce((sum, row) => sum + row.stake, 0) * 100) / 100,
    hedgePairCount,
    hasConcentration: Boolean(largestCluster && largestCluster.count > 1 && concentrationPct >= 35),
    disclosure: hedgePairCount
      ? "Gross stakes stay unnetted even when a position is declared as a hedge; PromoGrind does not infer independence or guaranteed protection."
      : "Clusters describe shared labels and books, not statistical correlation or independence.",
  };
}
