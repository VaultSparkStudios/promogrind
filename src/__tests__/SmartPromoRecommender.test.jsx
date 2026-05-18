// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../data/promoSchedule.js", () => ({
  PROMO_SCHED: [
    {
      day: "Daily",
      book: "DraftKings",
      promo: "Profit Boost",
      value: "+$25",
      grade: "A",
      complexity: "Easy",
      timeMin: 5,
      expires: null,
      terms: "boost up to $25 on any same-game parlay",
    },
  ],
}));

vi.mock("../dashboard/today.js", () => ({
  getDashboardSnapshot: () => ({
    adaptivePlan: {
      headline: "Run hot lane",
      detail: "DK profit boost is your highest EV today",
      topPromos: [
        {
          book: "DraftKings",
          promo: "Profit Boost",
          value: "+$25",
          grade: "A",
          complexity: "Easy",
          timeMin: 5,
          score: 6,
          reasons: ["hot lane"],
          baselineRank: 1,
          whyRanked: [
            { label: "settled hot", delta: 4 },
            { label: "low complexity", delta: 2 },
          ],
          memorySignal: { direction: "up", label: "settled streak", detail: "4 of 5 closed positive" },
          terms: "boost up to $25 on any same-game parlay",
          expires: null,
        },
      ],
    },
  }),
}));

vi.mock("../lib/shared.js", () => ({ K: {
  gn: "#0f0", yl: "#ff0", rd: "#f00", ac: "#0ff", mt: "#888", dm: "#aaa", tx: "#fff", bd: "#333", s1: "#111", s2: "#222",
} }));

vi.mock("../ui.jsx", () => ({
  S: {
    card: {},
    tag: (c) => ({ background: c, fontSize: 10 }),
  },
}));

import SmartPromoRecommender from "../components/dashboard/SmartPromoRecommender.jsx";

describe("SmartPromoRecommender — ExplainerDrawer", () => {
  beforeEach(() => {
    try {
      window.localStorage.clear();
    } catch {
      // noop
    }
  });

  const data = {
    bookStatus: { DraftKings: "active" },
    done: {},
    bets: [],
  };

  it("renders the recommender row with a closed details toggle by default", () => {
    render(<SmartPromoRecommender data={data} />);
    const toggle = screen.getByTestId("explainer-toggle-0");
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/Terms drift/i)).toBeNull();
  });

  it("opens the drawer with 5 weight rows when toggled", () => {
    render(<SmartPromoRecommender data={data} />);
    fireEvent.click(screen.getByTestId("explainer-toggle-0"));
    expect(screen.getByText(/Terms drift/i)).toBeTruthy();
    expect(screen.getByText(/Edge decay/i)).toBeTruthy();
    expect(screen.getByText(/Execution deadline/i)).toBeTruthy();
    expect(screen.getByText(/Outcome memory/i)).toBeTruthy();
    expect(screen.getByText(/Rank weights/i)).toBeTruthy();
  });

  it("collapses the drawer on second click", () => {
    render(<SmartPromoRecommender data={data} />);
    const toggle = screen.getByTestId("explainer-toggle-0");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/Terms drift/i)).toBeNull();
  });
});
