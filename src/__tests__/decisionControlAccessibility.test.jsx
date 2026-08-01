// @vitest-environment happy-dom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppDataCtx, ToastCtx } from "../contexts.jsx";
import BetTracker from "../components/BetTracker.jsx";
import Ledger from "../components/Ledger.jsx";

vi.mock("../analytics.js", () => ({ trackEvent: vi.fn() }));

function renderWithData(ui, appData) {
  const syncAppData = vi.fn();
  render(
    <ToastCtx.Provider value={vi.fn()}>
      <AppDataCtx.Provider value={{ appData, syncAppData, syncDiagnostics: {}, syncStatus: "idle", isOnline: true }}>
        {ui}
      </AppDataCtx.Provider>
    </ToastCtx.Provider>,
  );
  return { syncAppData };
}

describe("decision-control accessibility", () => {
  it("binds Bet Tracker fields to visible names and exposes row actions as buttons", () => {
    const appData = {
      bets: [{ id: "bet-1", date: "2026-08-01", book: "DraftKings", type: "Moneyline", odds: "+110", stake: "10", toWin: "11", status: "open" }],
    };
    renderWithData(<BetTracker />, appData);

    expect(screen.getByLabelText("Date").id).toBe("bet-tracker-date");
    expect(screen.getByLabelText("Book").id).toBe("bet-tracker-book");
    expect(screen.getByLabelText("Bet Type").id).toBe("bet-tracker-type");
    expect(screen.getByRole("combobox", { name: "Status for DraftKings Moneyline" })).toBeTruthy();

    const remove = screen.getByRole("button", { name: "Delete DraftKings Moneyline bet" });
    expect(remove.tagName).toBe("BUTTON");
    fireEvent.click(remove);
  });

  it("binds Ledger fields and gives icon actions stable accessible names", () => {
    const appData = {
      ledger: [{ id: "ledger-1", date: "2026-08-01", book: "FanDuel", type: "Profit Boost", bonus: "", hedge: "10", profit: "3", notes: "" }],
      bets: [],
    };
    renderWithData(<Ledger />, appData);

    expect(screen.getByLabelText("Date").id).toBe("ledger-date");
    expect(screen.getByLabelText("Book").id).toBe("ledger-book");
    expect(screen.getByLabelText("Type").id).toBe("ledger-type");
    expect(screen.getByRole("button", { name: "Edit FanDuel ledger entry" }).tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: "Delete FanDuel ledger entry" }).tagName).toBe("BUTTON");
  });
});
