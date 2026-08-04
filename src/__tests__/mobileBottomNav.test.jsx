/** @vitest-environment happy-dom */
// CANON-041: MobileBottomNav — SVG icons, active indicator, sub-nav drawer
import React from "react";
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

// Simulate a phone-width viewport so the responsive CSS doesn't hide the nav
beforeAll(() => { Object.defineProperty(window, "innerWidth", { value: 390, writable: true }); });
afterEach(cleanup);

const MOCK_TABS = [
  { group: "Home",      items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Brief", slug: "daily-brief" }] },
  { group: "Convert",   items: [{ n: "Bonus Bet", slug: "bonus-bet" }, { n: "Boost", slug: "profit-boost" }] },
  { group: "Calculate", items: [{ n: "No-Vig", slug: "no-vig" }, { n: "+EV", slug: "ev" }] },
  { group: "Track",     items: [{ n: "Edge", slug: "edge-dashboard" }] },
  { group: "Live",      items: [{ n: "Scanner", slug: "arb-scanner", pro: true }] },
  { group: "Learn",     items: [{ n: "Knowledge", slug: "knowledge-base" }] },
];

// Buttons are inside a media-query-hidden container in happy-dom; use hidden:true
function getTabBtn(name) { return screen.getByRole("button", { name, hidden: true }); }
function queryDialog() { return screen.queryByRole("dialog"); }

function renderNav(gi = 0, ti = 0, goTo = vi.fn()) {
  return render(<MobileBottomNav gi={gi} ti={ti} goTo={goTo} tabs={MOCK_TABS} />);
}

describe("MobileBottomNav", () => {
  it("renders a button for each tab group", () => {
    renderNav();
    MOCK_TABS.forEach((tab) => {
      expect(getTabBtn(tab.group)).toBeTruthy();
    });
  });

  it("marks the active tab with aria-current=page", () => {
    renderNav(1);
    expect(getTabBtn("Convert").getAttribute("aria-current")).toBe("page");
    expect(getTabBtn("Home").getAttribute("aria-current")).toBeNull();
  });

  it("calls goTo with group index 0 when tapping an inactive tab", () => {
    const goTo = vi.fn();
    renderNav(0, 0, goTo);
    fireEvent.click(getTabBtn("Convert"));
    expect(goTo).toHaveBeenCalledWith(1, 0);
  });

  it("does NOT call goTo when tapping the already-active tab — opens drawer instead", () => {
    const goTo = vi.fn();
    renderNav(0, 0, goTo);
    fireEvent.click(getTabBtn("Home"));
    expect(goTo).not.toHaveBeenCalled();
    expect(queryDialog()).toBeTruthy();
  });

  it("drawer lists all sub-items for the active group", () => {
    renderNav(0, 0);
    fireEvent.click(getTabBtn("Home"));
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Brief")).toBeTruthy();
  });

  it("drawer marks the current sub-item with aria-current=page", () => {
    renderNav(0, 1);
    fireEvent.click(getTabBtn("Home"));
    const drawerBtns = screen.getAllByRole("button");
    const briefBtn = drawerBtns.find((b) => b.textContent.trim() === "Brief");
    expect(briefBtn?.getAttribute("aria-current")).toBe("page");
  });

  it("navigates to a sub-item and closes the drawer", () => {
    const goTo = vi.fn();
    renderNav(0, 0, goTo);
    fireEvent.click(getTabBtn("Home"));
    const briefBtn = screen.getAllByRole("button").find((b) => b.textContent.trim() === "Brief");
    fireEvent.click(briefBtn);
    expect(goTo).toHaveBeenCalledWith(0, 1);
    expect(queryDialog()).toBeNull();
  });

  it("closes the drawer when the backdrop is clicked", () => {
    renderNav(0, 0);
    fireEvent.click(getTabBtn("Home"));
    expect(queryDialog()).toBeTruthy();
    const backdrop = document.querySelector('div[aria-hidden="true"]');
    fireEvent.click(backdrop);
    expect(queryDialog()).toBeNull();
  });

  it("closes the drawer when × button is pressed", () => {
    renderNav(0, 0);
    fireEvent.click(getTabBtn("Home"));
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(queryDialog()).toBeNull();
  });

  it("shows Pro badge on beta items in the drawer", () => {
    renderNav(4, 0);
    fireEvent.click(getTabBtn("Live"));
    expect(screen.getByText("Pro")).toBeTruthy();
  });
});
