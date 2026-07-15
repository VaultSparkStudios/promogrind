// @vitest-environment happy-dom
// Tests for the CANON-041 scrollable 100dvh mobile nav drawer (S115).
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileNavDrawer, MobileBottomNav } from "../app/AppNavigation.jsx";

vi.mock("../lib/shared.js", () => ({
  K: { s1: "#0f1520", s2: "#161d2a", bd: "#1e293b", bd2: "#334155", ac: "#60a5fa", gn: "#4ade80", mt: "#7a8fa8", tx: "#e2e8f0", dm: "#94a3b8", pp: "#c084fc", bg: "#0a0e17", yl: "#fbbf24" },
  font: "monospace",
  fontD: "sans-serif",
}));
vi.mock("../app/responsive.js", () => ({
  MOBILE_NAV_RESPONSIVE_CSS: "",
}));
vi.mock("../app/appText.js", () => ({
  SEARCH_UI: { calculatorPlaceholder: "Search calculators…" },
}));

const MOCK_TABS = [
  { group: "Home", items: [
    { n: "Dashboard", slug: "dashboard" },
    { n: "Daily Brief", slug: "daily-brief" },
    { n: "Pricing", slug: "pricing" },
  ]},
  { group: "Calculate", items: [
    { n: "No-Vig", slug: "no-vig", subcat: "Value & EV" },
    { n: "Kelly", slug: "kelly", subcat: "Value & EV" },
    { n: "2-Way Arb", slug: "arb-2way", subcat: "Arbitrage" },
    { n: "3-Way Arb", slug: "arb-3way", subcat: "Arbitrage" },
    { n: "Scanner", slug: "scanner", subcat: "Advanced", pro: true },
  ]},
  { group: "Track", items: [
    { n: "Edge", slug: "edge-dashboard" },
    { n: "Ledger", slug: "ledger" },
  ]},
];

describe("MobileNavDrawer", () => {
  it("renders as hidden when isOpen=false", () => {
    const { container } = render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={1} currentTi={0} goTo={vi.fn()} isOpen={false} onClose={vi.fn()} />,
    );
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.style.transform).toBe("translateY(100%)");
  });

  it("renders as visible when isOpen=true", () => {
    const { container } = render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={1} currentTi={0} goTo={vi.fn()} isOpen={true} onClose={vi.fn()} />,
    );
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog.style.transform).toBe("translateY(0)");
  });

  it("shows the current group name and item count", () => {
    render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={1} currentTi={0} goTo={vi.fn()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText("Calculate")).toBeTruthy();
    expect(screen.getByText("5 tools")).toBeTruthy();
  });

  it("lists all items for the current group", () => {
    render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={1} currentTi={0} goTo={vi.fn()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText("No-Vig")).toBeTruthy();
    expect(screen.getByText("Kelly")).toBeTruthy();
    expect(screen.getByText("2-Way Arb")).toBeTruthy();
    expect(screen.getByText("Scanner")).toBeTruthy();
  });

  it("groups items by subcat when subcats are present", () => {
    render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={1} currentTi={0} goTo={vi.fn()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText("Value & EV")).toBeTruthy();
    expect(screen.getByText("Arbitrage")).toBeTruthy();
    expect(screen.getByText("Advanced")).toBeTruthy();
  });

  it("marks Pro items with a badge", () => {
    render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={1} currentTi={0} goTo={vi.fn()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText("Pro")).toBeTruthy();
  });

  it("calls goTo and onClose when an item is selected", () => {
    const goTo = vi.fn();
    const onClose = vi.fn();
    render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={1} currentTi={0} goTo={goTo} isOpen={true} onClose={onClose} />,
    );
    fireEvent.click(screen.getByText("2-Way Arb"));
    expect(goTo).toHaveBeenCalledWith(1, 2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is pressed", () => {
    const onClose = vi.fn();
    render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={1} currentTi={0} goTo={vi.fn()} isOpen={true} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={1} currentTi={0} goTo={vi.fn()} isOpen={true} onClose={onClose} />,
    );
    const backdrop = container.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={0} currentTi={0} goTo={vi.fn()} isOpen={true} onClose={onClose} />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns null when gi references an invalid group", () => {
    const { container } = render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={99} currentTi={0} goTo={vi.fn()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders items without subcat grouping for groups with no subcats", () => {
    render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={2} currentTi={0} goTo={vi.fn()} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByText("Edge")).toBeTruthy();
    expect(screen.getByText("Ledger")).toBeTruthy();
    expect(screen.queryByText("Value & EV")).toBeNull();
  });

  it("highlights the currently active item with a distinct left border", () => {
    const { container } = render(
      <MobileNavDrawer tabs={MOCK_TABS} gi={1} currentTi={2} goTo={vi.fn()} isOpen={true} onClose={vi.fn()} />,
    );
    const allButtons = container.querySelectorAll('button');
    const activeButton = Array.from(allButtons).find((b) => b.textContent.trim() === "2-Way Arb");
    expect(activeButton).toBeTruthy();
    expect(activeButton.style.borderLeft).toContain("3px solid");
  });
});

describe("MobileBottomNav", () => {
  it("renders one button per tab group", () => {
    render(
      <MobileBottomNav gi={0} goTo={vi.fn()} tabs={MOCK_TABS} onDrawerOpen={vi.fn()} />,
    );
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Calculate")).toBeTruthy();
    expect(screen.getByText("Track")).toBeTruthy();
  });

  it("calls onDrawerOpen when the active tab is tapped", () => {
    const onDrawerOpen = vi.fn();
    const goTo = vi.fn();
    render(
      <MobileBottomNav gi={1} goTo={goTo} tabs={MOCK_TABS} onDrawerOpen={onDrawerOpen} />,
    );
    fireEvent.click(screen.getByText("Calculate"));
    expect(onDrawerOpen).toHaveBeenCalledTimes(1);
    expect(goTo).not.toHaveBeenCalled();
  });

  it("calls goTo when a different tab is tapped", () => {
    const onDrawerOpen = vi.fn();
    const goTo = vi.fn();
    render(
      <MobileBottomNav gi={0} goTo={goTo} tabs={MOCK_TABS} onDrawerOpen={onDrawerOpen} />,
    );
    fireEvent.click(screen.getByText("Calculate"));
    expect(goTo).toHaveBeenCalledWith(1, 0);
    expect(onDrawerOpen).not.toHaveBeenCalled();
  });
});
