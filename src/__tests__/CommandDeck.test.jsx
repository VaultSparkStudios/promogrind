// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppDataCtx } from "../contexts.jsx";
import CommandDeck from "../components/CommandDeck.jsx";

const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

function renderDeck(appData = {}) {
  return render(
    <AppDataCtx.Provider value={{ appData }}>
      <CommandDeck />
    </AppDataCtx.Provider>,
  );
}

describe("CommandDeck", () => {
  it("renders the full module list with decision lines", () => {
    renderDeck({});
    expect(screen.getByText("Operator Command Deck")).toBeTruthy();
    const list = screen.getByRole("list", { name: /intelligence modules/i });
    expect(list).toBeTruthy();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(12);
    expect(screen.getByText("Tilt Guard")).toBeTruthy();
    expect(screen.getByText(/Should you place the next bet at all/)).toBeTruthy();
  });

  it("deep-links a module to its owning surface", () => {
    renderDeck({});
    fireEvent.click(screen.getByRole("button", { name: /open tilt guard/i }));
    expect(navigateMock).toHaveBeenCalledWith("/bet-tracker");
  });

  it("shows coach copy for idle modules instead of blank cards", () => {
    renderDeck({});
    expect(screen.getByText(/Settle more bets — replay insights unlock/i)).toBeTruthy();
  });
});
