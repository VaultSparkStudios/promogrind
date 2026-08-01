function parseDollar(value: string): number | null {
  const parsed = Number.parseFloat(String(value || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  return `$${Math.round(value)}`;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean))] as string[];
}

function extractAmounts(text: string) {
  return [...text.matchAll(/\$\s?(\d[\d,]*(?:\.\d{1,2})?)/g)]
    .map((match) => parseDollar(match[0]))
    .filter((value): value is number => value !== null);
}

function extractPercentages(text: string) {
  return [...text.matchAll(/(\d{1,3})\s?%/g)]
    .map((match) => Number.parseInt(match[1], 10))
    .filter((value) => Number.isFinite(value));
}

function extractExpiryDays(text: string) {
  const normalized = String(text || "").toLowerCase();
  const matches = [
    normalized.match(/expires?\s+(?:in\s+)?(\d+)\s+days?/),
    normalized.match(/(\d+)\s+days?\s+to\s+use/),
    normalized.match(/valid\s+for\s+(\d+)\s+days?/),
    normalized.match(/within\s+(\d+)\s+days?/),
  ].filter(Boolean);
  const parsed = Number.parseInt(matches[0]?.[1] || "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractBook(text: string) {
  const normalized = text.toLowerCase();
  const knownBooks = [
    "DraftKings",
    "FanDuel",
    "Caesars",
    "BetMGM",
    "bet365",
    "BetRivers",
    "ESPN BET",
    "theScore BET",
    "Fanatics",
  ];
  return knownBooks.find((book) => normalized.includes(book.toLowerCase())) || null;
}

function scoreTypeSignals(normalized: string) {
  return {
    safety_net: (/(first bet loses|lose your first bet|get it back if your first|stake back as bonus bet|second chance bet)/.test(normalized) ? 4 : 0)
      + (/(refund|stake back|bonus back)/.test(normalized) ? 2 : 0),
    bonus_bet: (/(bonus bet|bonus bets|free bet|free bets)/.test(normalized) ? 3 : 0)
      + (/(wager|bet)\s+\$\d/.test(normalized) ? 1 : 0),
    profit_boost: (/(profit boost|odds boost|boosted odds|odds profit boost|profit% boost)/.test(normalized) ? 4 : 0)
      + (/\d{1,3}\s?%/.test(normalized) ? 1 : 0),
    deposit_match: (/(deposit match|match your deposit|deposit bonus|deposit and get)/.test(normalized) ? 4 : 0)
      + (/deposit/.test(normalized) ? 1 : 0),
    insurance: (/(insurance|insured|parlay insurance|sgp insurance|refund if .* loses|no sweat)/.test(normalized) ? 4 : 0)
      + (/(parlay|sgp)/.test(normalized) ? 1 : 0),
    parlay: (/same game parlay|sgp|parlay/.test(normalized) ? 2 : 0),
    arb: (/arbitrage|arb\b/.test(normalized) ? 4 : 0),
  };
}

function calculatorForType(type: string) {
  return {
    bonus_bet: "bonus-bet",
    profit_boost: "profit-boost",
    safety_net: "first-bet",
    deposit_match: "deposit-match",
    insurance: "insurance",
    parlay: "parlay",
    arb: "arb-2way",
    other: "hedge",
  }[type] || "hedge";
}

function explanationForType(type: string, amount: number | null, percentage: number | null, expiryDays: number | null) {
  const amountText = formatMoney(amount);
  const expiryText = expiryDays ? ` It appears to expire in about ${expiryDays} day${expiryDays === 1 ? "" : "s"}, so speed matters.` : "";
  switch (type) {
    case "bonus_bet":
      return `${amountText || "This bonus bet"} is usually worth roughly 65-75% of face value after hedging. Route it through the bonus bet converter and price the hedge quickly.${expiryText}`;
    case "profit_boost":
      return `${percentage ? `${percentage}%` : "This"} boost is strongest when used on a longshot line with a clean hedge. Treat it as boosted-edge inventory, not a generic bet.${expiryText}`;
    case "safety_net":
      return `${amountText || "This first-bet safety net"} behaves like downside protection, not a guaranteed bonus. The value depends on refund format and the fallback hedge after a loss.${expiryText}`;
    case "deposit_match":
      return `${amountText || "This deposit match"} can be excellent, but only if rollover and minimum-odds terms stay sane. Treat the unlock path as a bankroll allocation problem first.${expiryText}`;
    case "insurance":
      return `Insurance promos are only valuable when the protected scenario is worth the friction and the hedge path is clean. Prioritize this if the refund is bonus cash and the qualifying line is efficient.${expiryText}`;
    case "parlay":
      return `Parlay promos are usually only worth touching when the boost or insurance materially offsets parlay hold. Route it through the parlay tools before staking.${expiryText}`;
    default:
      return `This promo is recognizable, but the exact value still depends on the fine print. Use the recommended calculator and confirm the hedge path before placing anything.${expiryText}`;
  }
}

function actionForType(type: string, amount: number | null, percentage: number | null) {
  switch (type) {
    case "bonus_bet":
      return `Run Bonus Bet Converter with ${formatMoney(amount) || "the bonus amount"} and hedge the longest efficient line you can still match cleanly.`;
    case "profit_boost":
      return `Use Profit Boost Calculator on a ${percentage ? `${percentage}% boosted` : "boosted"} longshot and compare hedge price before committing.`;
    case "safety_net":
      return `Model both win and loss branches in First Bet Converter before placing the qualifying wager.`;
    case "deposit_match":
      return `Check rollover math and break the deposit match into staged bankroll-safe steps before funding.`;
    case "insurance":
      return `Run the Insurance calculator and only place this if the protected downside still leaves a clean positive path.`;
    default:
      return `Open the mapped calculator and validate the cash conversion before acting.`;
  }
}

export function parsePromoTextHeuristic(text = "") {
  const raw = String(text || "");
  const normalized = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const amounts = extractAmounts(raw);
  const percentages = extractPercentages(raw);
  const expiryDays = extractExpiryDays(raw);
  const book = extractBook(raw);
  const scores = scoreTypeSignals(normalized);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topType = "other", topScore = 0] = ranked[0] || [];
  const secondScore = ranked[1]?.[1] || 0;
  const amount = amounts[0] || null;
  const percentage = percentages[0] || null;
  const clearWinner = topScore >= 4 && topScore >= secondScore + 2;
  const confidence = clearWinner ? "high" : topScore >= 3 ? "medium" : "low";
  const rating =
    topType === "deposit_match" && /rollover|playthrough|1x|2x|3x|5x|10x/.test(normalized) ? "good" :
    topType === "bonus_bet" || topType === "profit_boost" ? "excellent" :
    topType === "safety_net" || topType === "insurance" ? "good" :
    topType === "deposit_match" ? "fair" :
    topType === "parlay" ? "fair" :
    "fair";
  const riskFlags = unique([
    expiryDays && expiryDays <= 7 ? `expires in ${expiryDays}d` : null,
    /rollover|playthrough/.test(normalized) ? "rollover terms" : null,
    /min(?:imum)? odds/.test(normalized) ? "minimum odds constraint" : null,
    /parlay/.test(normalized) && topType !== "parlay" ? "parlay leg risk" : null,
  ]).slice(0, 3);
  const opportunityScore = Math.max(
    35,
    Math.min(
      94,
      50 +
        (topType === "bonus_bet" ? 22 : 0) +
        (topType === "profit_boost" ? 18 : 0) +
        (topType === "safety_net" ? 12 : 0) +
        (topType === "deposit_match" ? 10 : 0) +
        (amount ? Math.min(12, Math.round(amount / 40)) : 0) +
        (percentage ? Math.min(8, Math.round(percentage / 20)) : 0) -
        (riskFlags.length * 3),
    ),
  );
  const calculatorSlug = calculatorForType(topType);

  return {
    type: topType,
    confidence,
    score: topScore,
    clearWinner,
    amount,
    percentage,
    expiryDays,
    book,
    result: {
      verdict:
        topType === "bonus_bet" ? "Strong bonus-bet conversion spot" :
        topType === "profit_boost" ? "Likely profitable boost spot" :
        topType === "safety_net" ? "Useful safety-net offer if hedged cleanly" :
        topType === "deposit_match" ? "Potentially high-value deposit match" :
        topType === "insurance" ? "Viable insurance angle if terms are clean" :
        "Promo recognized — verify terms before staking",
      rating,
      confidence,
      promoType: topType,
      calculatorSlug,
      explanation: explanationForType(topType, amount, percentage, expiryDays),
      ev:
        topType === "bonus_bet" && amount ? `~${formatMoney(amount * 0.7)} modeled value before execution risk` :
        topType === "profit_boost" && percentage ? `${percentage}% boost — validate hedge spread` :
        topType === "deposit_match" && amount ? `${formatMoney(amount)} match cap before rollover drag` :
        null,
      action: actionForType(topType, amount, percentage),
      hedge: ["bonus_bet", "profit_boost", "safety_net", "insurance"].includes(topType)
        ? "Price the hedge immediately on the best opposing book before placing the qualifying leg."
        : null,
      nextStep: `Open ${calculatorSlug === "first-bet" ? "First Bet Converter" : calculatorSlug.replace(/-/g, " ")} and model the conversion.`,
      riskFlags,
      opportunityScore,
      opsTags: unique([
        book ? book.toLowerCase().replace(/\s+/g, "_") : null,
        topType,
        expiryDays ? "time_sensitive" : null,
        /rollover|playthrough/.test(normalized) ? "terms_check" : "conversion_ready",
      ]).slice(0, 4),
      assumptions: unique([
        amount ? `Face value appears to be about ${formatMoney(amount)}.` : null,
        percentage ? `Boost appears to be about ${percentage}%.` : null,
        book ? `Offer appears to be from ${book}.` : null,
      ]).slice(0, 3),
      missingInputs: unique([
        !amount ? "Maximum eligible stake or reward value was not found." : null,
        !expiryDays ? "Offer expiry was not found." : null,
        !/min(?:imum)? odds/.test(normalized) ? "Minimum qualifying odds were not found." : null,
      ]).slice(0, 3),
      sensitivityTriggers: unique([
        "Re-run if the eligible stake, reward cap, or conversion odds change.",
        "Re-run if rollover, minimum-odds, or expiry terms differ from the pasted text.",
        ["bonus_bet", "profit_boost", "safety_net", "insurance"].includes(topType)
          ? "Re-price if the best opposing hedge line moves materially."
          : null,
      ]).slice(0, 3),
      evidenceGrade: amount && expiryDays ? "complete" : "partial",
      analysisSource: "rule_engine",
    },
  };
}
