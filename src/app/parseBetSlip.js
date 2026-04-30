import { BOOKS } from "../books.js";

/**
 * Parse a free-text bet slip into structured fields.
 * Pure function — extracted from src/App.jsx S81 to reduce monolith size.
 */
export function parseBetSlip(text) {
  const result = {};
  if (typeof text !== "string" || !text) return result;

  const dollarMatch = text.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
  if (dollarMatch) result.stake = dollarMatch[1].replace(",", "");

  const americanOdds = text.match(/([+-]\d{3,4})/);
  const decimalOdds = text.match(/\b([1-9]\d?\.\d{2})\b/);
  const fractOdds = text.match(/\b(\d+\/\d+)\b/);
  if (americanOdds) result.odds = americanOdds[1];
  else if (decimalOdds) result.odds = decimalOdds[1];
  else if (fractOdds) result.odds = fractOdds[1];

  const bookNames = [
    "DraftKings", "FanDuel", "BetMGM", "Caesars", "bet365",
    "ESPN BET", "Fanatics", "BetRivers",
    "Draftkings", "Fanduel", "Betmgm",
  ];
  for (const b of bookNames) {
    if (text.toLowerCase().includes(b.toLowerCase())) {
      result.book = BOOKS.find((bk) => bk.name.toLowerCase() === b.toLowerCase())?.name || b;
      break;
    }
  }

  if (/parlay/i.test(text)) result.type = "Parlay";

  const descMatch = text.match(/([A-Z][a-z]+ (?:vs?\.?|@) [A-Z][a-z]+)/);
  if (descMatch) result.notes = descMatch[1];

  return result;
}
