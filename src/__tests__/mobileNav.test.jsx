// @vitest-environment happy-dom
// CANON-041: MobileBottomNav — icon rendering, drawer open/close, item navigation
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// Minimal mock tabs matching the real TABS shape
const MOCK_TABS = [
  { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Pricing", slug: "pricing" }] },
  { group: "Convert", items: [{ n: "Bonus Bet", slug: "bonus-bet" }, { n: "First Bet", slug: "first-bet" }] },
  { group: "Calculate", items: [{ n: "No-Vig", slug: "no-vig" }, { n: "Arb", slug: "arb-2way" }] },
  { group: "Track", items: [{ n: "Edge", slug: "edge-dashboard" }] },
  { group: "Live", items: [{ n: "Arb Scanner", slug: "arb-scanner", pro: true }] },
  { group: "Learn", items: [{ n: "Knowledge Base", slug: "knowledge-base" }] },
];

import { MobileBottomNav } from "../app/AppNavigation.jsx";

// Query helper: nav is CSS-hidden at wide viewports; use hidden:true to reach it
const btn = (name) => screen.getByRole("button", { name, hidden: true });
const queryDialog = () => screen.queryByRole("dialog", { hidden: true });

describe("MobileBottomNav — CANON-041 mobile nav", () => {
  let goTo;

  beforeEach(() => {
    goTo = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (cb) => { cb(); return 1; });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders one button per tab group", () => {
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    MOCK_TABS.forEach((tab) => {
      expect(btn(tab.group)).toBeTruthy();
    });
  });

  it("marks the active group with aria-pressed=true", () => {
    render(<MobileBottomNav gi={1} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    expect(btn("Convert").getAttribute("aria-pressed")).toBe("true");
    expect(btn("Home").getAttribute("aria-pressed")).toBe("false");
  });

  it("calls goTo when tapping an inactive group tab", () => {
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(btn("Convert"));
    expect(goTo).toHaveBeenCalledWith(1, 0);
  });

  it("opens the drawer when tapping the active group tab", () => {
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(btn("Home"));
    expect(queryDialog()).toBeTruthy();
    expect(btn("Home").getAttribute("aria-expanded")).toBe("true");
  });

  it("closes the drawer on second tap of active tab", () => {
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    const homeBtn = btn("Home");
    fireEvent.click(homeBtn); // open
    expect(queryDialog()).toBeTruthy();
    fireEvent.click(homeBtn); // close
    expect(queryDialog()).toBeNull();
  });

  it("shows all items for the active group inside the drawer", () => {
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(btn("Home"));
    expect(screen.getByText("Dashboard", { selector: "span" })).toBeTruthy();
    expect(screen.getByText("Pricing", { selector: "span" })).toBeTruthy();
  });

  it("highlights the active item inside the drawer", () => {
    render(<MobileBottomNav gi={1} ti={1} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(btn("Convert"));
    // First Bet (ti=1) is active — button should exist and have a colored left border
    const firstBetBtn = screen.getByText("First Bet").closest("button");
    expect(firstBetBtn).toBeTruthy();
    expect(firstBetBtn.style.borderLeft).toMatch(/3px solid/);
  });

  it("badges Pro items in the drawer", () => {
    render(<MobileBottomNav gi={4} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(btn("Live"));
    expect(screen.getByText("Pro")).toBeTruthy();
  });

  it("calls goTo with correct group+item when drawer item is clicked", () => {
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(btn("Home"));
    fireEvent.click(screen.getByText("Pricing").closest("button"));
    expect(goTo).toHaveBeenCalledWith(0, 1);
  });
});
