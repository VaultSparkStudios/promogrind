// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppDataCtx } from "../contexts.jsx";
import BonusBet from "../calculators/BonusBet.jsx";
import ProfitBoost from "../calculators/ProfitBoost.jsx";
import FirstBet from "../calculators/FirstBet.jsx";
import KellyCriterion from "../calculators/KellyCriterion.jsx";
import Arb2Way from "../calculators/Arb2Way.jsx";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";

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
    <MemoryRouter>
      <AppDataCtx.Provider value={{ appData, syncAppData: vi.fn() }}>
        {ui}
      </AppDataCtx.Provider>
    </MemoryRouter>
  );
}

// ── BonusBet ───────────────────────────────────────────────────────────────

describe("BonusBet calculator", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the calculator title", () => {
    wrap(<BonusBet />);
    expect(screen.getByText("Bonus Bet Converter")).toBeDefined();
  });

  it("shows modeled profit result with valid default inputs", () => {
    wrap(<BonusBet />);
    // Default: sz=200, bo=+300, ho=-350 → calcBonus should yield positive profit
    const profitEl = screen.getByText("modeled profit");
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
    expect(screen.getByText("modeled profit")).toBeDefined();
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

// ── ProfitBoost ────────────────────────────────────────────────────────────

describe("ProfitBoost calculator", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the calculator title", () => {
    wrap(<ProfitBoost />);
    expect(screen.getByText("Profit Boost Converter")).toBeDefined();
  });

  it("shows modeled profit result with default inputs", () => {
    wrap(<ProfitBoost />);
    expect(screen.getByText("modeled profit")).toBeDefined();
  });

  it("shows demo step-by-step block when Demo button is clicked", () => {
    wrap(<ProfitBoost />);
    fireEvent.click(screen.getByText("▶ Demo"));
    expect(screen.getByText("Step-by-step demo")).toBeDefined();
  });

  it("exits demo mode when Exit Demo is clicked", () => {
    wrap(<ProfitBoost />);
    fireEvent.click(screen.getByText("▶ Demo"));
    fireEvent.click(screen.getByText("✕ Exit Demo"));
    expect(screen.queryByText("Step-by-step demo")).toBeNull();
  });

  it("Example button presets inputs and shows result", () => {
    wrap(<ProfitBoost />);
    fireEvent.click(screen.getByText("★ Show Example"));
    expect(screen.getByText("modeled profit")).toBeDefined();
  });

  it("shows help section with Profit Boost term", () => {
    wrap(<ProfitBoost />);
    expect(screen.getByText("Profit Boost:")).toBeDefined();
  });
});

// ── FirstBet ───────────────────────────────────────────────────────────────

describe("FirstBet calculator", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the calculator title", () => {
    wrap(<FirstBet />);
    expect(screen.getByText("First Bet Safety Net Hedge")).toBeDefined();
  });

  it("shows Hedge Amount result row with default inputs", () => {
    wrap(<FirstBet />);
    expect(screen.getByText("Hedge Amount")).toBeDefined();
  });

  it("shows demo step-by-step block when Demo button is clicked", () => {
    wrap(<FirstBet />);
    fireEvent.click(screen.getByText("▶ Demo"));
    expect(screen.getByText("Step-by-step demo")).toBeDefined();
  });

  it("exits demo mode when Exit Demo is clicked", () => {
    wrap(<FirstBet />);
    fireEvent.click(screen.getByText("▶ Demo"));
    fireEvent.click(screen.getByText("✕ Exit Demo"));
    expect(screen.queryByText("Step-by-step demo")).toBeNull();
  });

  it("Example button updates inputs and shows result", () => {
    wrap(<FirstBet />);
    fireEvent.click(screen.getByText("★ Show Example"));
    expect(screen.getByText("Hedge Amount")).toBeDefined();
  });

  it("shows help section with Safety Net Promo term", () => {
    wrap(<FirstBet />);
    expect(screen.getByText("Safety Net Promo:")).toBeDefined();
  });
});

// ── KellyCriterion ─────────────────────────────────────────────────────────

describe("KellyCriterion calculator", () => {
  beforeEach(() => {
    localStorage.clear();
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

// ── CalculatorReceipt ─────────────────────────────────────────────────────

describe("CalculatorReceipt component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const defaultProps = {
    calcName: "Test Calculator",
    inputs: [{ label: "Stake", value: "$200" }, { label: "Odds", value: "+300" }],
    outputs: [
      { label: "Hedge Amount", value: "$150" },
      { label: "Guaranteed Profit", value: "$42", highlight: true },
    ],
    onClose: vi.fn(),
  };

  it("renders the calculator name in the receipt header", () => {
    render(<CalculatorReceipt {...defaultProps} />);
    expect(screen.getByText("Test Calculator")).toBeDefined();
  });

  it("renders all input labels and values", () => {
    render(<CalculatorReceipt {...defaultProps} />);
    expect(screen.getByText("Stake")).toBeDefined();
    expect(screen.getByText("$200")).toBeDefined();
    expect(screen.getByText("Odds")).toBeDefined();
    expect(screen.getByText("+300")).toBeDefined();
  });

  it("renders all output rows including highlighted profit row", () => {
    render(<CalculatorReceipt {...defaultProps} />);
    expect(screen.getByText("Hedge Amount")).toBeDefined();
    expect(screen.getByText("Guaranteed Profit")).toBeDefined();
    expect(screen.getByText("$42")).toBeDefined();
  });

  it("calls onClose when the × close button is clicked", () => {
    const onClose = vi.fn();
    render(<CalculatorReceipt {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders Copy and Print buttons", () => {
    render(<CalculatorReceipt {...defaultProps} />);
    expect(screen.getByText("📋 Copy")).toBeDefined();
    expect(screen.getByText("🖨 Print / Save PDF")).toBeDefined();
  });

  it("uses custom disclaimer when provided", () => {
    render(<CalculatorReceipt {...defaultProps} disclaimer="Custom disclaimer text." />);
    expect(screen.getByText(/Custom disclaimer text/)).toBeDefined();
  });
});

// ── Receipt button integration ────────────────────────────────────────────

describe("Receipt button in ProfitBoost", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows Receipt button in result section with default inputs", () => {
    render(<ProfitBoost />);
    expect(screen.getByText("📄 Receipt")).toBeDefined();
  });

  it("opens CalculatorReceipt modal when Receipt button clicked", () => {
    render(<ProfitBoost />);
    fireEvent.click(screen.getByText("📄 Receipt"));
    // Both the calc card title and receipt header now show the name
    expect(screen.getAllByText("Profit Boost Converter").length).toBeGreaterThanOrEqual(2);
    // Print button is unique to the receipt modal
    expect(screen.getByText("🖨 Print / Save PDF")).toBeDefined();
  });
});

describe("Receipt button in Arb2Way", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows Receipt button when arb exists (both + odds)", () => {
    render(<MemoryRouter><Arb2Way /></MemoryRouter>);
    // Default inputs: o1=+110, o2=+105 → arb exists
    expect(screen.getByText("📄 Receipt")).toBeDefined();
  });
});

// ── Accessibility (S113 calculator-a11y-pass) ──────────────────────────────

describe("calculator accessibility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("announces BonusBet results through a polite live region", () => {
    wrap(<BonusBet />);
    const regions = screen.getAllByRole("status");
    const resultRegion = regions.find((el) => /modeled profit|Hedge Bet Amount/i.test(el.textContent));
    expect(resultRegion).toBeDefined();
    expect(resultRegion.getAttribute("aria-live")).toBe("polite");
  });

  it("associates BonusBet inputs with their labels via the In atom", () => {
    wrap(<BonusBet />);
    const input = screen.getByLabelText(/Bonus Bet Size/i);
    expect(input).toBeDefined();
    expect(input.tagName).toBe("INPUT");
  });

  it("announces ProfitBoost results through a polite live region", () => {
    wrap(<ProfitBoost />);
    const regions = screen.getAllByRole("status");
    expect(regions.some((el) => el.getAttribute("aria-live") === "polite")).toBe(true);
  });
});
