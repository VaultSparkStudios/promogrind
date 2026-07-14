/** @vitest-environment happy-dom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

const MOCK_TABS = [
  { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Get Started", slug: "get-started" }] },
  { group: "Convert", items: [{ n: "Bonus Bet", slug: "bonus-bet" }, { n: "Profit Boost", slug: "profit-boost" }] },
  { group: "Calculate", items: [{ n: "No-Vig", slug: "no-vig" }, { n: "Arb", slug: "arb-2way" }] },
  { group: "Track", items: [{ n: "Edge", slug: "edge-dashboard" }] },
  { group: "Live", items: [{ n: "Arb Scanner", slug: "arb-scanner", pro: true }] },
  { group: "Learn", items: [{ n: "Knowledge Base", slug: "knowledge-base" }] },
];

// Helper: find nav buttons by aria-label (the nav may be CSS-hidden in test env)
const getNavBtn = (name) => screen.getByRole("button", { name, hidden: true });
const getAllNavBtns = () => screen.getAllByRole("button", { hidden: true });

describe("MobileBottomNav", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders a button for each tab group", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    expect(getNavBtn("Home")).toBeTruthy();
    expect(getNavBtn("Convert")).toBeTruthy();
    expect(getNavBtn("Calculate")).toBeTruthy();
    expect(getNavBtn("Track")).toBeTruthy();
    expect(getNavBtn("Live")).toBeTruthy();
    expect(getNavBtn("Learn")).toBeTruthy();
  });

  it("calls goTo(index, 0) when a non-active tab is pressed", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(getNavBtn("Convert"));
    expect(goTo).toHaveBeenCalledWith(1, 0);
  });

  it("opens the group drawer when the active tab is pressed", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(getNavBtn("Home"));
    // Drawer should be open — a dialog role appears
    expect(screen.getByRole("dialog", { hidden: true })).toBeTruthy();
  });

  it("lists all group items in the drawer", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(getNavBtn("Home"));
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Get Started")).toBeTruthy();
  });

  it("calls goTo with the item index and closes drawer on item select", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    // Open drawer
    fireEvent.click(getNavBtn("Home"));
    // Click second item
    fireEvent.click(screen.getByText("Get Started"));
    expect(goTo).toHaveBeenCalledWith(0, 1);
    // Drawer should be closed
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the drawer when backdrop is clicked", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(getNavBtn("Home"));
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toBeTruthy();
    // The backdrop is the first child of the dialog — click it
    fireEvent.click(dialog.firstChild);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Pro badge on pro items in the drawer", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={4} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(getNavBtn("Live"));
    expect(screen.getByText("Pro")).toBeTruthy();
  });

  it("toggles drawer closed when active tab is pressed again", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    const homeBtn = getNavBtn("Home");
    fireEvent.click(homeBtn); // open
    expect(screen.getByRole("dialog", { hidden: true })).toBeTruthy();
    fireEvent.click(homeBtn); // close
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not call goTo when toggling the active tab drawer", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(getNavBtn("Home"));
    expect(goTo).not.toHaveBeenCalled();
  });
});
