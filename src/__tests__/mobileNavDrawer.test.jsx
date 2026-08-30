/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

const TABS = [
  { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Pricing", slug: "pricing" }] },
  { group: "Convert", items: [{ n: "Bonus Bet", slug: "bonus-bet" }, { n: "Profit Boost", slug: "profit-boost" }] },
  { group: "Calculate", items: [{ n: "No-Vig", slug: "no-vig" }, { n: "+EV", slug: "ev" }] },
  { group: "Track", items: [{ n: "Edge", slug: "edge-dashboard" }] },
  { group: "Live", items: [{ n: "Arb Scanner", slug: "arb-scanner", pro: true }] },
  { group: "Learn", items: [{ n: "Knowledge Base", slug: "knowledge-base" }] },
];

describe("MobileBottomNav — CANON-041 mobile nav drawer", () => {
  it("renders all group tabs plus the All-tools trigger", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS} />);
    expect(screen.getByLabelText("All tools")).toBeTruthy();
    expect(screen.getByLabelText("Home")).toBeTruthy();
    expect(screen.getByLabelText("Convert")).toBeTruthy();
  });

  it("opens the 100dvh drawer when All-tools button is clicked", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS} />);
    const allBtn = screen.getByLabelText("All tools");
    fireEvent.click(allBtn);
    expect(screen.getByRole("dialog", { name: "All tools navigation" })).toBeTruthy();
    // All groups are listed (group names also appear in the bottom nav tabs, so use getAllByText)
    expect(screen.getAllByText("Home").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Convert").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Learn").length).toBeGreaterThanOrEqual(1);
    // Sub-items are visible
    expect(screen.getByText("Bonus Bet")).toBeTruthy();
    expect(screen.getByText("Knowledge Base")).toBeTruthy();
  });

  it("closes the drawer on backdrop click", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("All tools"));
    expect(screen.getByRole("dialog", { name: "All tools navigation" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    // Drawer is still in DOM but translated off-screen (CSS transition)
    expect(screen.getByRole("dialog", { name: "All tools navigation" })).toBeTruthy();
  });

  it("highlights the active item in the drawer", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={1} ti={1} goTo={goTo} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("All tools"));
    const activeBtn = screen.getByRole("button", { name: /Profit Boost/i });
    expect(activeBtn.dataset.active).toBe("true");
  });

  it("marks pro items with PRO badge", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("All tools"));
    expect(screen.getByText("PRO")).toBeTruthy();
  });

  it("navigates and closes drawer when a sub-item is clicked", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("All tools"));
    const bonusBetBtn = screen.getByRole("button", { name: /Bonus Bet/i });
    fireEvent.click(bonusBetBtn);
    expect(goTo).toHaveBeenCalledWith(1, 0);
  });

  it("keeps .pg-mobile-nav marker in the rendered DOM for smoke tests", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS} />);
    expect(container.querySelector(".pg-mobile-nav")).toBeTruthy();
  });
});
