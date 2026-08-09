// @vitest-environment happy-dom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

vi.mock("../lib/shared.js", () => ({
  K: { s1: "#1a1a1a", s2: "#141414", s3: "#222", bg: "#0d0d0d", bd: "#2a2a2a", bd2: "#333",
    tx: "#e0e0e0", mt: "#666", dm: "#999", gn: "#4ade80", ac: "#6366f1", pp: "#a855f7",
    yl: "#fbbf24", rd: "#f87171", ink: "#000" },
  font: "monospace",
  fontD: "serif",
  S: { input: {} },
}));

vi.mock("../app/responsive.js", () => ({
  MOBILE_NAV_RESPONSIVE_CSS: "",
}));

vi.mock("../app/appText.js", () => ({
  SEARCH_UI: { calculatorPlaceholder: "Search calculators…" },
}));

const MOCK_TABS = [
  { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Pricing", slug: "pricing" }] },
  { group: "Convert", items: [{ n: "Bonus Bet", slug: "bonus-bet" }, { n: "Profit Boost", slug: "profit-boost" }] },
  { group: "Calculate", items: [{ n: "No-Vig", slug: "no-vig" }] },
  { group: "Track", items: [{ n: "Ledger", slug: "ledger" }] },
  { group: "Live", items: [{ n: "Scanner", slug: "arb-scanner", pro: true }] },
  { group: "Learn", items: [{ n: "Knowledge Base", slug: "knowledge-base" }] },
];

function renderNav(gi = 0, ti = 0, goTo = vi.fn()) {
  render(
    <MobileBottomNav
      gi={gi}
      ti={ti}
      goTo={goTo}
      tabs={MOCK_TABS}
      groupItems={MOCK_TABS[gi].items}
    />
  );
  return { goTo };
}

describe("MobileBottomNav", () => {
  it("renders a button for each tab group with accessible label", () => {
    renderNav();
    for (const tab of MOCK_TABS) {
      expect(screen.getByRole("button", { name: `${tab.group} navigation` })).toBeTruthy();
    }
  });

  it("marks the active group with aria-current=page", () => {
    renderNav(1);
    const activeBtn = screen.getByRole("button", { name: "Convert navigation" });
    expect(activeBtn.getAttribute("aria-current")).toBe("page");
    const inactiveBtn = screen.getByRole("button", { name: "Home navigation" });
    expect(inactiveBtn.getAttribute("aria-current")).toBeNull();
  });

  it("calls goTo when a different group is tapped", () => {
    const goTo = vi.fn();
    renderNav(0, 0, goTo);
    fireEvent.click(screen.getByRole("button", { name: "Convert navigation" }));
    expect(goTo).toHaveBeenCalledWith(1, 0);
  });

  it("opens the sub-nav sheet when the active group is tapped", () => {
    renderNav(0, 0);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Home navigation" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-label")).toBe("Home navigation");
  });

  it("sheet lists all items in the active group", () => {
    renderNav(0, 0);
    fireEvent.click(screen.getByRole("button", { name: "Home navigation" }));
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Pricing")).toBeTruthy();
  });

  it("sheet closes via the close button", () => {
    renderNav(0, 0);
    fireEvent.click(screen.getByRole("button", { name: "Home navigation" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("selecting a sheet item calls goTo with the correct sub-index", () => {
    const goTo = vi.fn();
    renderNav(0, 0, goTo);
    fireEvent.click(screen.getByRole("button", { name: "Home navigation" }));
    // Pricing is item index 1 in Home group
    fireEvent.click(screen.getByText("Pricing"));
    expect(goTo).toHaveBeenCalledWith(0, 1);
  });

  it("sheet closes after selecting an item", () => {
    renderNav(0, 0);
    fireEvent.click(screen.getByRole("button", { name: "Home navigation" }));
    fireEvent.click(screen.getByText("Dashboard"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("PRO badge appears for pro-gated items", () => {
    renderNav(4, 0); // Live group
    fireEvent.click(screen.getByRole("button", { name: "Live navigation" }));
    expect(screen.getByText("PRO")).toBeTruthy();
  });

  it("renders SVG icons — one per group tab", () => {
    const { container } = render(
      <MobileBottomNav gi={0} ti={0} goTo={vi.fn()} tabs={MOCK_TABS} groupItems={MOCK_TABS[0].items} />
    );
    const svgs = container.querySelectorAll(".pg-mobile-nav svg");
    expect(svgs.length).toBe(MOCK_TABS.length);
  });
});
