// @vitest-environment happy-dom
// MobileBottomNav drawer — CANON-041 scrollable 100dvh mobile nav parity
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

vi.mock("../lib/shared.js", () => ({
  K: { s1: "#0f1520", s2: "#161d2a", bg: "#0a0e17", bd: "#1e293b", bd2: "#334155", gn: "#4ade80", mt: "#7a8fa8", tx: "#e2e8f0", dm: "#94a3b8", pp: "#c084fc", ac: "#60a5fa" },
  font: "monospace",
  fontD: "serif",
  S: {},
}));
vi.mock("../app/responsive.js", () => ({
  MOBILE_NAV_RESPONSIVE_CSS: "@media (max-width: 768px) { .pg-mobile-nav { display:flex; } .pg-main-content { padding-bottom: 88px; } }",
}));
vi.mock("../app/appText.js", () => ({ SEARCH_UI: {} }));

const TABS = [
  { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Daily Brief", slug: "daily-brief" }] },
  { group: "Convert", items: [{ n: "Bonus Bet", slug: "bonus-bet" }, { n: "Profit Boost", slug: "profit-boost" }, { n: "First Bet", slug: "first-bet" }] },
  { group: "Calculate", items: [{ n: "No-Vig", slug: "no-vig" }, { n: "+EV", slug: "ev", pro: true }] },
  { group: "Track", items: [{ n: "Edge", slug: "edge-dashboard" }] },
  { group: "Live", items: [{ n: "Arb Scanner", slug: "arb-scanner", pro: true }] },
  { group: "Learn", items: [{ n: "Knowledge Base", slug: "knowledge-base" }] },
];

describe("MobileBottomNav — CANON-041 100dvh drawer", () => {
  it("renders one button per group in the bottom bar", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS} />);
    for (const tab of TABS) {
      expect(screen.getAllByText(tab.group.slice(0, 4), { exact: false }).length).toBeGreaterThan(0);
    }
  });

  it("drawer is initially hidden (translateY 100%)", () => {
    const { container } = render(<MobileBottomNav gi={0} ti={0} goTo={vi.fn()} tabs={TABS} />);
    const drawer = container.querySelector('[role="dialog"]');
    expect(drawer).toBeTruthy();
    expect(drawer.style.transform).toBe("translateY(100%)");
  });

  it("tapping the active tab opens the drawer and shows sub-items", () => {
    const { container } = render(<MobileBottomNav gi={0} ti={0} goTo={vi.fn()} tabs={TABS} />);
    const drawer = container.querySelector('[role="dialog"]');
    const homeBtn = screen.getAllByRole("button").find((b) => b.getAttribute("aria-expanded") !== null);
    expect(homeBtn).toBeTruthy();
    fireEvent.click(homeBtn);
    expect(drawer.style.transform).toBe("translateY(0)");
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Daily Brief").length).toBeGreaterThan(0);
  });

  it("tapping an inactive tab calls goTo and does not open drawer", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={TABS} />);
    const drawer = container.querySelector('[role="dialog"]');
    const allButtons = screen.getAllByRole("button");
    const convertBtn = allButtons.find((b) => b.getAttribute("aria-label") === "Convert");
    expect(convertBtn).toBeTruthy();
    fireEvent.click(convertBtn);
    expect(goTo).toHaveBeenCalledWith(1, 0);
    expect(drawer.style.transform).toBe("translateY(100%)");
  });

  it("selecting a sub-item calls goTo with correct indices and closes the drawer", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={1} ti={0} goTo={goTo} tabs={TABS} />);
    const drawer = container.querySelector('[role="dialog"]');
    const activeTabBtn = screen.getAllByRole("button").find((b) => b.getAttribute("aria-expanded") !== null);
    fireEvent.click(activeTabBtn);
    expect(drawer.style.transform).toBe("translateY(0)");
    fireEvent.click(screen.getByText("Profit Boost"));
    expect(goTo).toHaveBeenCalledWith(1, 1);
    expect(drawer.style.transform).toBe("translateY(100%)");
  });

  it("active sub-item is visually distinguished in the drawer", () => {
    const { container } = render(<MobileBottomNav gi={1} ti={2} goTo={vi.fn()} tabs={TABS} />);
    const activeTabBtn = screen.getAllByRole("button").find((b) => b.getAttribute("aria-expanded") !== null);
    fireEvent.click(activeTabBtn);
    const firstBetBtn = screen.getByText("First Bet").closest("button");
    expect(firstBetBtn.style.fontWeight).toBe("700");
  });

  it("backdrop click closes the drawer", () => {
    const { container } = render(<MobileBottomNav gi={0} ti={0} goTo={vi.fn()} tabs={TABS} />);
    const drawer = container.querySelector('[role="dialog"]');
    const activeTabBtn = screen.getAllByRole("button").find((b) => b.getAttribute("aria-expanded") !== null);
    fireEvent.click(activeTabBtn);
    expect(drawer.style.transform).toBe("translateY(0)");
    const backdrop = container.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop);
    expect(drawer.style.transform).toBe("translateY(100%)");
  });

  it("pro badge is shown for pro-gated items", () => {
    const { container } = render(<MobileBottomNav gi={2} ti={0} goTo={vi.fn()} tabs={TABS} />);
    const activeTabBtn = screen.getAllByRole("button").find((b) => b.getAttribute("aria-expanded") !== null);
    fireEvent.click(activeTabBtn);
    expect(screen.getAllByText("PRO").length).toBeGreaterThan(0);
  });

  it("drawer label shows the active group name as header", () => {
    const { container } = render(<MobileBottomNav gi={1} ti={0} goTo={vi.fn()} tabs={TABS} />);
    const activeTabBtn = screen.getAllByRole("button").find((b) => b.getAttribute("aria-expanded") !== null);
    fireEvent.click(activeTabBtn);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain("Convert");
  });
});
