// @vitest-environment happy-dom
// Smoke-level render/interaction coverage for the largest UI surfaces
// (S113 component-render-tests): TodayDashboardPanel, ProfilePanel,
// UserMenu, Ledger. Logic libs already have deep unit coverage — these
// assert the composition renders with seeded data and key flows respond.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppDataCtx, ToastCtx } from "../contexts.jsx";
import { getDashboardSnapshot } from "../dashboard/today.js";
import { PROMO_SCHED } from "../data/promoSchedule.js";

vi.mock("../auth.js", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
  signOut: vi.fn(),
  startCheckout: vi.fn(),
  manageBilling: vi.fn(),
  getTierName: (plan) => (plan ? "Pro" : "Free"),
  redeemBetaCode: vi.fn(),
  saveSharedDisplayName: vi.fn(),
}));
vi.mock("../sync.js", () => ({ onLedgerEntry: vi.fn() }));
vi.mock("../analytics.js", () => ({ trackEvent: vi.fn() }));

import TodayDashboardPanel from "../components/dashboard/TodayDashboardPanel.jsx";
import ProfilePanel from "../components/ProfilePanel.jsx";
import UserMenu from "../components/UserMenu.jsx";
import Ledger from "../components/Ledger.jsx";

const APP_DATA = {
  bets: [
    { id: "b1", status: "settled", stake: 50, odds: -110, profit: 20, placedAt: "2026-06-28T12:00:00Z", date: "2026-06-28", book: "DraftKings", promoType: "profit_boost" },
    { id: "b2", status: "open", stake: 25, odds: 120, placedAt: "2026-06-30T12:00:00Z", date: "2026-06-30", book: "FanDuel" },
  ],
  ledger: [
    { id: "l1", date: "2026-06-27", book: "DraftKings", type: "bonus_bet", bonus: 100, hedge: 80, profit: 25, notes: "" },
  ],
  done: {},
  bookStatus: { DraftKings: "active" },
  resultFeedback: [],
  workflowInbox: [],
  bankroll: "1000",
};

function wrap(ui, appData = APP_DATA) {
  return render(
    <ToastCtx.Provider value={vi.fn()}>
      <AppDataCtx.Provider value={{ appData, syncAppData: vi.fn(), syncDiagnostics: {}, syncStatus: "idle", isOnline: true }}>
        {ui}
      </AppDataCtx.Provider>
    </ToastCtx.Provider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("TodayDashboardPanel", () => {
  it("renders with a real snapshot without crashing", () => {
    const snapshot = getDashboardSnapshot(APP_DATA, PROMO_SCHED, new Date("2026-07-01T12:00:00Z"), "1000");
    const { container } = wrap(
      <TodayDashboardPanel snapshot={snapshot} navigate={vi.fn()} appData={APP_DATA} />,
    );
    expect(container.textContent.length).toBeGreaterThan(100);
  });
});

describe("ProfilePanel", () => {
  const props = {
    user: { email: "operator@promogrind.bet" },
    proStatus: null,
    darkMode: true,
    toggleTheme: vi.fn(),
    compactMode: false,
    toggleCompact: vi.fn(),
    currency: "USD",
    setCurrency: vi.fn(),
    onClose: vi.fn(),
  };

  it("renders identity and the data controls section", () => {
    wrap(<ProfilePanel {...props} />);
    expect(screen.getByText("operator@promogrind.bet")).toBeTruthy();
    expect(screen.getByText("Data Controls")).toBeTruthy();
    expect(screen.getByText("Restore")).toBeTruthy();
  });

  it("restore flow validates pasted JSON and rejects garbage", () => {
    wrap(<ProfilePanel {...props} />);
    fireEvent.click(screen.getByText("Restore"));
    const box = screen.getByLabelText(/paste promogrind export json/i);
    fireEvent.change(box, { target: { value: "not json at all" } });
    expect(screen.getByRole("status").textContent).toMatch(/not valid json/i);
  });

  it("restore flow previews and applies a valid export", () => {
    localStorage.setItem("pg_currency", "USD");
    wrap(<ProfilePanel {...props} />);
    fireEvent.click(screen.getByText("Restore"));
    const payload = {
      product: "PromoGrind",
      type: "local-data-export",
      generatedAt: "2026-07-01T00:00:00Z",
      data: { pg_missions: JSON.stringify({ streak: 3 }) },
    };
    const box = screen.getByLabelText(/paste promogrind export json/i);
    fireEvent.change(box, { target: { value: JSON.stringify(payload) } });
    expect(screen.getByRole("status").textContent).toMatch(/ready: 1 item/i);
    fireEvent.click(screen.getByText("Merge Into This Device"));
    expect(localStorage.getItem("pg_missions")).toContain("streak");
  });
});

describe("UserMenu", () => {
  const props = {
    user: { email: "operator@promogrind.bet" },
    proStatus: null,
    darkMode: true,
    toggleTheme: vi.fn(),
    compactMode: false,
    toggleCompact: vi.fn(),
    currency: "USD",
    setCurrency: vi.fn(),
    syncStatus: "idle",
    onSessionClick: vi.fn(),
  };

  it("renders the trigger and opens the menu", () => {
    const { container } = wrap(<UserMenu {...props} />);
    const trigger = container.querySelector("button");
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);
    expect(container.textContent).toMatch(/operator@promogrind.bet|Theme|Sign/i);
  });
});

describe("Ledger", () => {
  it("renders seeded entries with P/L totals", () => {
    const { container } = wrap(<Ledger />);
    expect(container.textContent).toMatch(/P\/?L|Ledger/i);
    expect(container.textContent).toContain("DraftKings");
  });

  it("toggles the P/L heatmap grid", () => {
    wrap(<Ledger />);
    const toggle = screen.getByText(/Show.*P\/L Heatmap/);
    fireEvent.click(toggle);
    expect(screen.getByText(/Hide.*P\/L Heatmap/)).toBeTruthy();
  });
});
