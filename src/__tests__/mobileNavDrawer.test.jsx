// @vitest-environment happy-dom
// CANON-041: scrollable 100dvh mobile nav drawer — render + interaction coverage
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MobileNavDrawer, MobileBottomNav } from "../app/AppNavigation.jsx";

const MOCK_TABS = [
  { group: "Home", items: [
    { n: "Dashboard", slug: "dashboard" },
    { n: "Pricing", slug: "pricing" },
  ]},
  { group: "Convert", items: [
    { n: "Bonus Bet", slug: "bonus-bet" },
    { n: "Profit Boost", slug: "profit-boost" },
  ]},
  { group: "Live", items: [
    { n: "Arb Scanner", slug: "arb-scanner", pro: true },
  ]},
];

describe("MobileNavDrawer (CANON-041)", () => {
  it("does not render when closed", () => {
    const { container } = render(
      <MobileNavDrawer open={false} onClose={vi.fn()} tabs={MOCK_TABS} gi={0} goTo={vi.fn()} activeSlug="dashboard" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders all group headers when open", () => {
    render(
      <MobileNavDrawer open={true} onClose={vi.fn()} tabs={MOCK_TABS} gi={0} goTo={vi.fn()} activeSlug="dashboard" />
    );
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Convert")).toBeTruthy();
    expect(screen.getByText("Live")).toBeTruthy();
  });

  it("renders the role=dialog with aria-modal", () => {
    render(
      <MobileNavDrawer open={true} onClose={vi.fn()} tabs={MOCK_TABS} gi={0} goTo={vi.fn()} activeSlug="dashboard" />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("expands the active group by default and shows its sub-items", () => {
    render(
      <MobileNavDrawer open={true} onClose={vi.fn()} tabs={MOCK_TABS} gi={0} goTo={vi.fn()} activeSlug="dashboard" />
    );
    // Active group (Home, gi=0) is expanded by default
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Pricing")).toBeTruthy();
  });

  it("calls goTo and onClose when a sub-item is clicked", () => {
    const goTo = vi.fn();
    const onClose = vi.fn();
    render(
      <MobileNavDrawer open={true} onClose={onClose} tabs={MOCK_TABS} gi={0} goTo={goTo} activeSlug="dashboard" />
    );
    fireEvent.click(screen.getByText("Pricing"));
    expect(goTo).toHaveBeenCalledWith(0, 1);
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when the ✕ button is clicked", () => {
    const onClose = vi.fn();
    render(
      <MobileNavDrawer open={true} onClose={onClose} tabs={MOCK_TABS} gi={0} goTo={vi.fn()} activeSlug="dashboard" />
    );
    fireEvent.click(screen.getByLabelText("Close navigation menu"));
    expect(onClose).toHaveBeenCalled();
  });

  it("marks PRO items with a PRO badge", () => {
    render(
      <MobileNavDrawer open={true} onClose={vi.fn()} tabs={MOCK_TABS} gi={2} goTo={vi.fn()} activeSlug="arb-scanner" />
    );
    expect(screen.getByText("PRO")).toBeTruthy();
  });

  it("renders item count chips for each group", () => {
    render(
      <MobileNavDrawer open={true} onClose={vi.fn()} tabs={MOCK_TABS} gi={0} goTo={vi.fn()} activeSlug="dashboard" />
    );
    // Home and Convert both have 2 items — both chips should be present
    const chips = screen.getAllByText("2");
    expect(chips.length).toBeGreaterThanOrEqual(1);
    // Live has 1 item
    expect(screen.getByText("1")).toBeTruthy();
  });
});

describe("MobileBottomNav (CANON-041)", () => {
  it("renders first 5 tab groups as nav buttons", () => {
    render(
      <MobileBottomNav gi={0} goTo={vi.fn()} tabs={MOCK_TABS} onOpenDrawer={vi.fn()} />
    );
    expect(screen.getByLabelText("Home")).toBeTruthy();
    expect(screen.getByLabelText("Convert")).toBeTruthy();
  });

  it("renders the All/≡ button to open the drawer", () => {
    render(
      <MobileBottomNav gi={0} goTo={vi.fn()} tabs={MOCK_TABS} onOpenDrawer={vi.fn()} />
    );
    expect(screen.getByLabelText("Open full navigation menu")).toBeTruthy();
    expect(screen.getByLabelText("Open full navigation menu").getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("calls onOpenDrawer when All button is tapped", () => {
    const onOpenDrawer = vi.fn();
    render(
      <MobileBottomNav gi={0} goTo={vi.fn()} tabs={MOCK_TABS} onOpenDrawer={onOpenDrawer} />
    );
    fireEvent.click(screen.getByLabelText("Open full navigation menu"));
    expect(onOpenDrawer).toHaveBeenCalled();
  });

  it("calls goTo when a group tab is tapped", () => {
    const goTo = vi.fn();
    render(
      <MobileBottomNav gi={0} goTo={goTo} tabs={MOCK_TABS} onOpenDrawer={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText("Convert"));
    expect(goTo).toHaveBeenCalledWith(1, 0);
  });
});
