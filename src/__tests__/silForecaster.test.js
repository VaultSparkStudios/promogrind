import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { CATEGORIES, forecastNext, parseSilHistory } from "../../scripts/lib/sil-forecaster.mjs";

const CATS = CATEGORIES.map((name) => `| ${name} | 100 | → | verified |`).join("\n");

describe("SIL forecast source parser", () => {
  it("parses current headings with a separate total line and unnumbered rows", () => {
    const source = `## 2026-07-23 — Session 115

**Total: 1000/1000 | Velocity: 10 | Status: FORGE**

| Category | Score | Delta | Evidence |
|---|---:|---|---|
${CATS}
`;
    const sessions = parseSilHistory(source);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ session: 115, total: 1000, complete: true });
    const liveForecast = forecastNext(sessions);
    expect(liveForecast?.totalPredicted).toBeGreaterThanOrEqual(900);
    expect(liveForecast?.totalPredicted).toBeLessThanOrEqual(1000);
  });

  it("parses legacy inline totals and numbered rows", () => {
    const rows = CATEGORIES.map((name, index) => `| ${index + 1} | ${name} | 90 | → | verified |`).join("\n");
    const sessions = parseSilHistory(`## 2026-06-01 — Session 90 | Total: 900/1000\n${rows}`);
    expect(sessions[0]).toMatchObject({ session: 90, total: 900, complete: true });
  });

  it("uses complete ledger evidence without imposing a minimum project score", () => {
    const live = fs.readFileSync(new URL("../../context/SELF_IMPROVEMENT_LOOP.md", import.meta.url), "utf8");
    const sessions = parseSilHistory(live);
    expect(sessions[0].session).toBe(Math.max(...sessions.map((session) => session.session)));
    expect(sessions[0].session).toBeGreaterThanOrEqual(115);
    expect(sessions[0].complete).toBe(true);
    const liveForecast = forecastNext(sessions);
    expect(liveForecast).not.toBeNull();
    expect(Object.keys(liveForecast.categories)).toEqual(CATEGORIES);
    const predictions = Object.values(liveForecast.categories).map(({ predicted }) => predicted);
    expect(predictions.every((value) => Number.isInteger(value) && value >= 0 && value <= 100)).toBe(true);
    expect(liveForecast.totalPredicted).toBe(predictions.reduce((sum, value) => sum + value, 0));
    expect(liveForecast.basis).toBe(sessions.filter(({ complete }) => complete).length);
    // Low scores are valid evidence; only an incomplete record must be refused.
    const complete = (score) => ({ complete: true, categories: Object.fromEntries(CATEGORIES.map((name) => [name, score])) });
    expect(forecastNext([complete(40)]).totalPredicted).toBe(400);
    expect(forecastNext([complete(0)])).toMatchObject({ totalPredicted: 0, basis: 1 });
    expect(forecastNext([{ categories: { "Dev Health": 100 }, complete: false }])).toBeNull();
  });
});
