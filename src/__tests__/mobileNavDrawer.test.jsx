// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

const MOCK_TABS = [
  {
    group: "Home",
    items: [
      { n: "Dashboard", slug: "dashboard" },
      { n: "Promo Intake", slug: "promo-intake" },
    ],
  },
  {
    group: "Calculate",
    items: [
      { n: "Bonus Bet", slug: "bonus-bet" },
      { n: "2-Way Arb", slug: "arb-2way" },
      { n: "Kelly", slug: "kelly", pro: false },
      { n: "Arb Scanner", slug: "arb-scanner", pro: true },
    ],
  },
  {
    group: "Track",
    items: [
      { n: "Edge", slug: "edge-dashboard" },
      { n: "P/L Ledger", slug: "ledger" },
    ],
  },
];

describe("MobileBottomNav — drawer", () => {
  let goTo;

  beforeEach(() => {
    goTo = vi.fn();
  });

  function renderNav(gi = 0) {
    return render(<MobileBottomNav gi={gi} goTo={goTo} tabs={MOCK_TABS} />);
  }

  it("renders a tab button for each group", () => {
    renderNav();
    expect(screen.getByRole("button", { name: /Home/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Track/i })).toBeTruthy();
  });

  it("opens drawer with group items when a tab is tapped", () => {
    renderNav();
    const calcTab = screen.getByRole("button", { name: /Calculate — 4 tools/i });
    fireEvent.click(calcTab);
    expect(screen.getByRole("dialog", { name: /Calculate navigation/i })).toBeTruthy();
    expect(screen.getByText("Bonus Bet")).toBeTruthy();
    expect(screen.getByText("2-Way Arb")).toBeTruthy();
    expect(screen.getByText("Kelly")).toBeTruthy();
  });

  it("shows PRO badge on gated items in the drawer", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: /Calculate — 4 tools/i }));
    const proBadges = screen.getAllByText("PRO");
    expect(proBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("closes drawer when the same tab is tapped again", () => {
    renderNav();
    const calcTab = screen.getByRole("button", { name: /Calculate — 4 tools/i });
    fireEvent.click(calcTab);
    expect(screen.queryByRole("dialog")).toBeTruthy();
    fireEvent.click(calcTab);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("calls goTo and closes drawer when a sub-item is tapped", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: /Calculate — 4 tools/i }));
    fireEvent.click(screen.getByText("Bonus Bet"));
    expect(goTo).toHaveBeenCalledWith(1, 0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes drawer when the backdrop overlay is tapped", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: /Calculate — 4 tools/i }));
    const overlay = document.querySelector(".pg-mobile-nav-drawer-overlay");
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes drawer via the close button", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: /Calculate — 4 tools/i }));
    fireEvent.click(screen.getByRole("button", { name: /Close navigation drawer/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("switches drawer to a new group when a different tab is tapped", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: /Calculate — 4 tools/i }));
    fireEvent.click(screen.getByRole("button", { name: /Track — 2 tools/i }));
    expect(screen.getByRole("dialog", { name: /Track navigation/i })).toBeTruthy();
    expect(screen.getByText("Edge")).toBeTruthy();
    expect(screen.queryByText("Bonus Bet")).toBeNull();
  });

  it("marks the currently active item with aria-current=page", () => {
    renderNav(1);
    fireEvent.click(screen.getByRole("button", { name: /Calculate — 4 tools/i }));
    const activeItem = screen.getByRole("button", { name: "Bonus Bet" });
    expect(activeItem.getAttribute("aria-current")).toBe("page");
  });
});
