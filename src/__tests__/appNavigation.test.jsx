// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomNav, MobileSubNavSheet } from "../app/AppNavigation.jsx";

const MOCK_TABS = [
  { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Promo Intake", slug: "promo-intake" }] },
  { group: "Convert", items: [{ n: "Bonus Bet", slug: "bonus-bet" }, { n: "Profit Boost", slug: "profit-boost" }] },
  { group: "Calculate", items: [{ n: "No-Vig", slug: "no-vig" }] },
  { group: "Track", items: [{ n: "Edge", slug: "edge-dashboard" }] },
  { group: "Live", items: [{ n: "Arb Scanner", slug: "arb-scanner", pro: true }] },
  { group: "Learn", items: [{ n: "Knowledge Base", slug: "knowledge-base" }] },
];

describe("MobileBottomNav", () => {
  it("renders all tab groups with aria-label", () => {
    render(<MobileBottomNav gi={0} goTo={vi.fn()} tabs={MOCK_TABS} />);
    for (const tab of MOCK_TABS) {
      // hidden:true because the pg-mobile-nav has a media-query display:none at wide viewports
      expect(screen.getByRole("button", { name: tab.group, hidden: true })).toBeTruthy();
    }
  });

  it("marks the active tab with aria-pressed=true", () => {
    render(<MobileBottomNav gi={1} goTo={vi.fn()} tabs={MOCK_TABS} />);
    const activeBtn = screen.getByRole("button", { name: "Convert", hidden: true });
    expect(activeBtn.getAttribute("aria-pressed")).toBe("true");
    const inactiveBtn = screen.getByRole("button", { name: "Home", hidden: true });
    expect(inactiveBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onNavTap with the tab index when provided", () => {
    const onNavTap = vi.fn();
    render(<MobileBottomNav gi={0} goTo={vi.fn()} tabs={MOCK_TABS} onNavTap={onNavTap} />);
    fireEvent.click(screen.getByRole("button", { name: "Track", hidden: true }));
    expect(onNavTap).toHaveBeenCalledWith(3);
  });

  it("falls back to goTo when onNavTap is not provided", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} goTo={goTo} tabs={MOCK_TABS} />);
    fireEvent.click(screen.getByRole("button", { name: "Live", hidden: true }));
    expect(goTo).toHaveBeenCalledWith(4, 0);
  });

  it("renders SVG icons inside each button", () => {
    const { container } = render(<MobileBottomNav gi={0} goTo={vi.fn()} tabs={MOCK_TABS} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(MOCK_TABS.length);
  });
});

describe("MobileSubNavSheet", () => {
  const group = MOCK_TABS[0];

  it("renders nothing when open=false", () => {
    const { container } = render(
      <MobileSubNavSheet open={false} group={group} gi={0} ti={0} goTo={vi.fn()} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders all sub-items when open=true", () => {
    render(<MobileSubNavSheet open={true} group={group} gi={0} ti={0} goTo={vi.fn()} onClose={vi.fn()} />);
    for (const item of group.items) {
      expect(screen.getByText(item.n)).toBeTruthy();
    }
  });

  it("highlights the current sub-item with aria-current=page", () => {
    render(<MobileSubNavSheet open={true} group={group} gi={0} ti={1} goTo={vi.fn()} onClose={vi.fn()} />);
    const activeBtn = screen.getByText("Promo Intake").closest("button");
    expect(activeBtn?.getAttribute("aria-current")).toBe("page");
    const inactiveBtn = screen.getByText("Dashboard").closest("button");
    expect(inactiveBtn?.getAttribute("aria-current")).toBeNull();
  });

  it("calls goTo and onClose when a sub-item is tapped", () => {
    const goTo = vi.fn();
    const onClose = vi.fn();
    render(<MobileSubNavSheet open={true} group={group} gi={0} ti={0} goTo={goTo} onClose={onClose} />);
    fireEvent.click(screen.getByText("Promo Intake"));
    expect(goTo).toHaveBeenCalledWith(0, 1);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Done is tapped", () => {
    const onClose = vi.fn();
    render(<MobileSubNavSheet open={true} group={group} gi={0} ti={0} goTo={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows Pro badge for pro-gated items", () => {
    const liveGroup = MOCK_TABS[4];
    render(<MobileSubNavSheet open={true} group={liveGroup} gi={4} ti={0} goTo={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Pro")).toBeTruthy();
  });

  it("has a dialog role and aria-label", () => {
    render(<MobileSubNavSheet open={true} group={group} gi={0} ti={0} goTo={vi.fn()} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-label")).toBe("Home navigation");
  });
});
