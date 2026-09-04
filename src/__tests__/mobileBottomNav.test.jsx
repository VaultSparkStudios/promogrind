// @vitest-environment happy-dom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

const TABS = [
  { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Daily Brief", slug: "daily-brief" }] },
  { group: "Convert", items: [{ n: "Bonus Bet", slug: "bonus-bet" }, { n: "First Bet", slug: "first-bet" }] },
  { group: "Calculate", items: [{ n: "No-Vig", slug: "no-vig" }, { n: "2-Way Arb", slug: "arb-2way" }] },
  { group: "Track", items: [{ n: "Edge", slug: "edge-dashboard" }] },
  { group: "Live", items: [{ n: "Arb Scanner", slug: "arb-scanner", pro: true }, { n: "+EV Scanner", slug: "ev-scanner", pro: true }] },
  { group: "Learn", items: [{ n: "Knowledge Base", slug: "knowledge-base" }] },
];

describe("MobileBottomNav — CANON-041 mobile parity", () => {
  it("renders a button for every tab group", () => {
    render(<MobileBottomNav gi={0} ti={0} goTo={vi.fn()} tabs={TABS} />);
    for (const tab of TABS) {
      const label = tab.group === "Calculate" ? "Calc" : tab.group;
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it("opens the sub-nav sheet when the active tab is tapped again", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS} />);
    const homeBtn = screen.getByLabelText("Home");
    fireEvent.click(homeBtn);
    // Sheet is conditionally rendered; use { hidden: true } because CSS media query hides it
    expect(screen.getByRole("dialog", { hidden: true })).toBeTruthy();
    expect(screen.getByText("Dashboard", { hidden: true })).toBeTruthy();
    expect(screen.getByText("Daily Brief", { hidden: true })).toBeTruthy();
  });

  it("navigates and opens sheet when switching to a new tab", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS} />);
    const convertBtn = screen.getByLabelText("Convert");
    fireEvent.click(convertBtn);
    expect(goTo).toHaveBeenCalledWith(1, 0);
    expect(screen.getByRole("dialog", { hidden: true })).toBeTruthy();
    expect(screen.getByText("Bonus Bet", { hidden: true })).toBeTruthy();
  });

  it("navigates to a sub-item and closes the sheet", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("Home"));
    fireEvent.click(screen.getByText("Daily Brief", { hidden: true }));
    expect(goTo).toHaveBeenCalledWith(0, 1);
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });

  it("closes the sheet when the backdrop is clicked", () => {
    render(<MobileBottomNav gi={0} ti={0} goTo={vi.fn()} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("Home"));
    const backdrop = screen.getByRole("dialog", { hidden: true });
    fireEvent.click(backdrop);
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });

  it("closes the sheet when the close button is pressed", () => {
    render(<MobileBottomNav gi={0} ti={0} goTo={vi.fn()} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("Home"));
    fireEvent.click(screen.getByLabelText("Close navigation", { hidden: true }));
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });

  it("marks non-active Pro items with a label in the sub-nav sheet", () => {
    // gi=4 ti=0 (Arb Scanner active), but "+EV Scanner" is also pro and not active → shows badge
    render(<MobileBottomNav gi={4} ti={0} goTo={vi.fn()} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("Live"));
    const evScanner = screen.getByText("+EV Scanner", { hidden: true });
    expect(evScanner).toBeTruthy();
    const proLabel = evScanner.closest("button").querySelector("span:last-child");
    expect(proLabel).toBeTruthy();
    expect(proLabel.textContent).toBe("Pro");
  });

  it("highlights the active sub-item inside the sheet", () => {
    render(<MobileBottomNav gi={1} ti={1} goTo={vi.fn()} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("Convert"));
    const firstBet = screen.getByText("First Bet", { hidden: true });
    expect(firstBet.closest("button").style.fontWeight).toBe("700");
  });

  it("does not render the sheet before any interaction", () => {
    render(<MobileBottomNav gi={0} ti={0} goTo={vi.fn()} tabs={TABS} />);
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });
});
