// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

const TABS_FIXTURE = [
  {
    group: "Home",
    items: [
      { n: "Dashboard", slug: "dashboard" },
      { n: "Daily Brief", slug: "daily-brief" },
      { n: "Pricing", slug: "pricing" },
    ],
  },
  {
    group: "Calculate",
    items: [
      { n: "No-Vig", slug: "no-vig", subcat: "Value & EV" },
      { n: "2-Way Arb", slug: "arb-2way", subcat: "Arbitrage" },
      { n: "+EV", slug: "ev", subcat: "Value & EV" },
      { n: "Kelly", slug: "kelly", subcat: "Value & EV" },
      { n: "Rollover", slug: "rollover", subcat: "Advanced" },
      { n: "Deposit Optimizer", slug: "deposit-optimizer", subcat: "Promo" },
      { n: "Hold Calc", slug: "hold-calc", subcat: "Value & EV" },
    ],
  },
];

// Fixed-position elements require { hidden: true } in happy-dom
function getNavBtn(name) {
  return screen.getByRole("button", { name, hidden: true });
}

afterEach(() => { vi.restoreAllMocks(); });

describe("MobileBottomNav", () => {
  it("renders a button for each tab group", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS_FIXTURE} />);
    expect(getNavBtn(/open home navigation/i)).toBeTruthy();
    expect(getNavBtn(/open calculate navigation/i)).toBeTruthy();
  });

  it("opens drawer when a group tab is clicked", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS_FIXTURE} />);
    fireEvent.click(getNavBtn(/open home navigation/i));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("drawer lists all items for the selected group", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS_FIXTURE} />);
    fireEvent.click(getNavBtn(/open home navigation/i));
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Daily Brief" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pricing" })).toBeTruthy();
  });

  it("calls goTo and closes drawer when a drawer item is clicked", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS_FIXTURE} />);
    fireEvent.click(getNavBtn(/open home navigation/i));
    fireEvent.click(screen.getByRole("button", { name: "Daily Brief" }));
    expect(goTo).toHaveBeenCalledWith(0, 1);
    // Drawer should be gone after navigation
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows subcat groupings for Calculate items", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={1} ti={0} goTo={goTo} tabs={TABS_FIXTURE} />);
    fireEvent.click(getNavBtn(/open calculate navigation/i));
    // At least one subcat label should appear in the drawer
    expect(screen.getByText("Value & EV")).toBeTruthy();
    expect(screen.getByText("Arbitrage")).toBeTruthy();
  });

  it("search filter narrows Calculate items", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={1} ti={0} goTo={goTo} tabs={TABS_FIXTURE} />);
    fireEvent.click(getNavBtn(/open calculate navigation/i));
    const input = screen.getByPlaceholderText(/search calculate/i);
    fireEvent.change(input, { target: { value: "Kelly" } });
    expect(screen.getByRole("button", { name: "Kelly" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "No-Vig" })).toBeNull();
  });

  it("active item is visually marked in the drawer", () => {
    const goTo = vi.fn();
    // ti=2 → "+EV" is the active item in Calculate
    render(<MobileBottomNav gi={1} ti={2} goTo={goTo} tabs={TABS_FIXTURE} />);
    fireEvent.click(getNavBtn(/open calculate navigation/i));
    const activeBtn = screen.getByRole("button", { name: "+EV" });
    expect(activeBtn).toBeTruthy();
    // Active button has the green border-left style
    expect(activeBtn.style.borderLeft).toMatch(/3px solid/);
  });

  it("close button dismisses the drawer", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS_FIXTURE} />);
    fireEvent.click(getNavBtn(/open home navigation/i));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /close navigation/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("single-item group navigates directly without opening a drawer", () => {
    const singleItemTabs = [
      { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }] },
    ];
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={singleItemTabs} />);
    fireEvent.click(getNavBtn(/open home navigation/i));
    expect(goTo).toHaveBeenCalledWith(0, 0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
