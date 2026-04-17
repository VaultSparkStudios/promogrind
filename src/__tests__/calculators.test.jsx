// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppDataCtx } from "../contexts.jsx";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("../auth.js", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

vi.mock("../analytics.js", () => ({ trackEvent: vi.fn() }));
vi.mock("../launchTelemetry.js", () => ({
  trackFeatureGateSeen: vi.fn(),
  trackFeatureGateClick: vi.fn(),
}));
vi.mock("../launchState.js", () => ({
  CANONICAL_APP_URL: "https://promogrind.bet",
  FEATURE_FLAGS: { aiScan: false },
  getFeatureState: vi.fn(() => "visible"),
  getProjectAuthHref: vi.fn(() => "/signup"),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const appDataDefault = {
  bets: [],
  ledger: [],
  done: {},
  userState: "NC",
  bookStatus: {},
  workflowInbox: [],
  resultFeedback: [],
};

function wrap(ui, appData = appDataDefault) {
  return render(
    <AppDataCtx.Provider value={{ appData, syncAppData: vi.fn() }}>
      {ui}
    </AppDataCtx.Provider>
  );
}

// ── BonusBet ───────────────────────────────────────────────────────────────

describe("BonusBet calculator", () => {
  let BonusBet;

  beforeEach(async () => {
    // Reset localStorage between tests
    localStorage.clear();
    ({ default: BonusBet } = await import("../calculators/BonusBet.jsx"));
  });

  it("renders the calculator title", () => {
    wrap(<BonusBet />);
    expect(screen.getByText("Bonus Bet Converter")).toBeDefined();
  });

  it("shows guaranteed profit result with valid default inputs", () => {
    wrap(<BonusBet />);
    // Default: sz=200, bo=+300, ho=-350 → calcBonus should yield positive profit
    const profitEl = screen.getByText("guaranteed profit");
    expect(profitEl).toBeDefined();
    // The profit dollar amount should be present as a sibling span
    const card = profitEl.closest("div");
    expect(card?.textContent).toMatch(/\$\d+(\.\d+)?/);
  });

  it("shows demo step-by-step block when Demo button is clicked", () => {
    wrap(<BonusBet />);
    const demoBtn = screen.getByText("▶ Demo");
    fireEvent.click(demoBtn);
    expect(screen.getByText("Step-by-step demo")).toBeDefined();
  });

  it("exits demo mode when Exit Demo is clicked", () => {
    wrap(<BonusBet />);
    fireEvent.click(screen.getByText("▶ Demo"));
    fireEvent.click(screen.getByText("✕ Exit Demo"));
    expect(screen.queryByText("Step-by-step demo")).toBeNull();
  });

  it("shows Example button that presets inputs", () => {
    wrap(<BonusBet />);
    const exBtn = screen.getByText("★ Show Example");
    expect(exBtn).toBeDefined();
    fireEvent.click(exBtn);
    // After clicking, inputs update — result should still show
    expect(screen.getByText("guaranteed profit")).toBeDefined();
  });

  it("renders NL parse button and applies detected values", () => {
    wrap(<BonusBet />);
    const textarea = screen.getByPlaceholderText(/Try:/i);
    fireEvent.change(textarea, { target: { value: "I have a $250 bonus bet at +350, hedge at -400" } });
    fireEvent.click(screen.getByText("Parse"));
    expect(screen.getByText(/Detected:/)).toBeDefined();
  });

  it("shows scan-in-beta label when aiScan feature flag is off", () => {
    wrap(<BonusBet />);
    expect(screen.getByText("📷 Scan in beta")).toBeDefined();
  });
});

// ── KellyCriterion ─────────────────────────────────────────────────────────

describe("KellyCriterion calculator", () => {
  let KellyCriterion;

  beforeEach(async () => {
    localStorage.clear();
    ({ default: KellyCriterion } = await import("../calculators/KellyCriterion.jsx"));
  });

  it("renders the calculator title", () => {
    render(<KellyCriterion />);
    expect(screen.getByText("Kelly Criterion Bet Sizer")).toBeDefined();
  });

  it("shows recommended bet size with default edge scenario", () => {
    render(<KellyCriterion />);
    // Default: wp=55%, odds=+110, br=1000, frac=25% → positive EV → shows bet size
    expect(screen.getByText("recommended bet size")).toBeDefined();
  });

  it("shows risk optimizer when positive EV", () => {
    render(<KellyCriterion />);
    // Default inputs have edge → risk optimizer panel should appear
    expect(screen.getByText("Fraction Risk Optimizer")).toBeDefined();
  });

  it("shows skip message when win probability is too low", () => {
    render(<KellyCriterion />);
    // Change win probability to 40% (below break-even for -110 = ~52.4%)
    const wpInput = screen.getByPlaceholderText("55");
    fireEvent.change(wpInput, { target: { value: "40" } });
    expect(screen.getByText(/Kelly says skip/i)).toBeDefined();
  });

  it("copy button shows Copied! feedback on click", () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
    render(<KellyCriterion />);
    const copyBtn = screen.getByText("📋 Copy");
    fireEvent.click(copyBtn);
    expect(screen.getByText("📋 Copied!")).toBeDefined();
  });

  it("shows full help section entries", () => {
    render(<KellyCriterion />);
    // Help renders each term as "{term}:" in a span
    expect(screen.getByText("Kelly Criterion:")).toBeDefined();
    expect(screen.getByText("Fractional Kelly:")).toBeDefined();
  });
});
