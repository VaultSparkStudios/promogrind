// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EdgeDecayHeatmapPanel, { buildHeatmapPromoRows } from "../components/EdgeDecayHeatmapPanel.jsx";

const NOW = new Date("2026-07-01T12:00:00Z").getTime();
const HOUR = 3600 * 1000;

describe("buildHeatmapPromoRows", () => {
  it("scopes rows to active books and attaches tracker expiry", () => {
    const rows = buildHeatmapPromoRows({
      bookStatus: { DraftKings: "active", FanDuel: "limited" },
      bookExpiry: { DraftKings: new Date(NOW + 4 * HOUR).toISOString() },
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.book === "DraftKings")).toBe(true);
    expect(rows[0].expires).toBeTruthy();
    expect(rows[0].promoType).toBeTruthy();
  });

  it("falls back to A-grade schedule lanes when no books are active", () => {
    const rows = buildHeatmapPromoRows({});
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.expires === null)).toBe(true);
  });
});

describe("EdgeDecayHeatmapPanel", () => {
  it("renders the heatmap region with tone summary and cells", () => {
    render(
      <EdgeDecayHeatmapPanel
        appData={{
          bookStatus: { DraftKings: "active" },
          bookExpiry: { DraftKings: new Date(NOW + 4 * HOUR).toISOString() },
        }}
        now={NOW}
      />,
    );
    const region = screen.getByRole("region", { name: /edge decay heatmap/i });
    expect(region).toBeTruthy();
    expect(screen.getByRole("list", { name: /decay grid by sportsbook/i })).toBeTruthy();
    // 4h horizon → critical tone must be announced on at least one cell.
    const criticalCells = screen.getAllByLabelText(/Critical/);
    expect(criticalCells.length).toBeGreaterThan(0);
  });

  it("renders the empty-state guidance when the grid has no cells", () => {
    // Active book that has no scheduled lanes yields zero cells.
    render(<EdgeDecayHeatmapPanel appData={{ bookStatus: { "No Such Book": "active" } }} now={NOW} />);
    expect(screen.getByText(/Mark books active in the Sportsbooks tracker/i)).toBeTruthy();
  });

  it("decays lanes without tracker expiry on the default daily window, not critical", () => {
    render(<EdgeDecayHeatmapPanel appData={{ bookStatus: { DraftKings: "active" } }} now={NOW} />);
    // Default daily curve → warm tone with a 24h horizon (lib design, S92).
    const warmCells = screen.getAllByLabelText(/Warm, \d+% edge remaining, 24h left/);
    expect(warmCells.length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/Critical/)).toBeNull();
  });
});
