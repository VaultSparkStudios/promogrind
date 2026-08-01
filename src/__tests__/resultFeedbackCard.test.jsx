// @vitest-environment happy-dom
import React, { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResultFeedbackCard from "../components/ResultFeedbackCard.jsx";
import { AppDataCtx } from "../contexts.jsx";
import { clearReceipts, readReceipts, verifyChain } from "../lib/promoProvenance.js";

const seed = {
  bets: [],
  ledger: [],
  workflowInbox: [],
  resultFeedback: [],
};

beforeEach(() => { clearReceipts(); });

function Harness({ onSync = () => {} }) {
  const [appData, setAppData] = useState(seed);
  const syncAppData = (next) => {
    onSync(next);
    setAppData(next);
  };
  return (
    <AppDataCtx.Provider value={{ appData, syncAppData }}>
      <ResultFeedbackCard
        calculatorKey="bonus-bet"
        calculatorLabel="Bonus Bet Converter"
        promoType="bonus_bet"
        expectedProfit={18.25}
      />
    </AppDataCtx.Provider>
  );
}

describe("ResultFeedbackCard outcome integrity", () => {
  it("exposes form controls and exclusive choices with accessible names and state", () => {
    render(<Harness />);

    expect(screen.getByLabelText("Sportsbook")).toBeDefined();
    expect(screen.getByLabelText("Realized profit or loss").getAttribute("inputmode")).toBe("decimal");
    expect(screen.getByLabelText("Minutes spent")).toBeDefined();
    expect(screen.getByLabelText("Notes")).toBeDefined();

    const repeatGroup = screen.getByRole("group", { name: "Would you run this again?" });
    const repeatYes = within(repeatGroup).getByRole("button", { name: "Yes" });
    expect(repeatYes.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(repeatGroup).getByRole("button", { name: "Maybe" }));
    expect(within(repeatGroup).getByRole("button", { name: "Maybe" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("fails closed when a skipped workflow has no reason", () => {
    const onSync = vi.fn();
    render(<Harness onSync={onSync} />);

    fireEvent.click(screen.getByRole("button", { name: "Skipped it" }));
    expect(screen.getByRole("alert").textContent).toMatch(/choose a skip reason/i);
    expect(document.activeElement).toBe(screen.getByRole("group", { name: "Why skip?" }));
    expect(document.activeElement.getAttribute("aria-invalid")).toBe("true");
    expect(onSync).not.toHaveBeenCalled();

    const skipGroup = screen.getByRole("group", { name: "Why skip?" });
    fireEvent.click(within(skipGroup).getByRole("button", { name: "Odds moved" }));
    fireEvent.click(screen.getByRole("button", { name: "Skipped it" }));
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync.mock.calls[0][0].resultFeedback[0]).toMatchObject({
      status: "skipped",
      skipReason: "odds_moved",
    });
  });

  it("normalizes a human-entered settlement and updates one stable record", () => {
    const onSync = vi.fn();
    render(<Harness onSync={onSync} />);

    fireEvent.click(screen.getByRole("button", { name: "Placed it" }));
    const firstId = onSync.mock.calls[0][0].resultFeedback[0].id;
    fireEvent.change(screen.getByLabelText("Realized profit or loss"), { target: { value: "$1,234.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark Settled" }));

    const settled = onSync.mock.calls.at(-1)[0].resultFeedback;
    expect(settled).toHaveLength(1);
    expect(settled[0]).toMatchObject({ id: firstId, status: "settled", actualProfit: 1234.5 });
    expect(screen.getByRole("status").textContent).toMatch(/settled result saved/i);
  });

  it("links placed and settled transitions to verifiable local evidence", async () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "private operator context" } });
    fireEvent.click(screen.getByRole("button", { name: "Placed it" }));
    await waitFor(() => expect(screen.getByText(/linked locally: self-attested/i)).toBeDefined());
    fireEvent.change(screen.getByLabelText("Realized profit or loss"), { target: { value: "12.40" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark Settled" }));
    await waitFor(() => expect(readReceipts()).toHaveLength(2));
    expect(readReceipts().map((entry) => entry.payload.eventType)).toEqual(["placed", "settled"]);
    expect(JSON.stringify(readReceipts())).not.toContain("private operator context");
    await expect(verifyChain()).resolves.toMatchObject({ ok: true, length: 2, workflows: 1 });
  });

  it("rejects incomplete numeric-looking settlement input", () => {
    const onSync = vi.fn();
    render(<Harness onSync={onSync} />);
    fireEvent.click(screen.getByRole("button", { name: "Placed it" }));
    fireEvent.change(screen.getByLabelText("Realized profit or loss"), { target: { value: "12oops" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark Settled" }));

    expect(screen.getByRole("alert").textContent).toMatch(/complete realized profit or loss/i);
    expect(document.activeElement).toBe(screen.getByLabelText("Realized profit or loss"));
    expect(document.activeElement.getAttribute("aria-invalid")).toBe("true");
    expect(onSync).toHaveBeenCalledTimes(1);
  });
});
