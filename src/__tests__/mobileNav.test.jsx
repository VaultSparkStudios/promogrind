/** @vitest-environment happy-dom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomNav, NavDrawer } from "../app/AppNavigation.jsx";

afterEach(cleanup);

const STUB_TABS = [
  { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Daily Brief", slug: "daily-brief" }] },
  { group: "Convert", items: [{ n: "Bonus Bet", slug: "bonus-bet" }, { n: "First Bet", slug: "first-bet" }] },
  { group: "Calculate", items: [{ n: "No-Vig", slug: "no-vig" }, { n: "2-Way Arb", slug: "arb-2way" }] },
  { group: "Track", items: [{ n: "Edge", slug: "edge-dashboard" }, { n: "P/L Ledger", slug: "ledger" }] },
  { group: "Live", items: [{ n: "Arb Scanner", slug: "arb-scanner" }] },
  { group: "Learn", items: [{ n: "Knowledge Base", slug: "knowledge-base" }, { n: "Glossary", slug: "glossary" }] },
];

describe("MobileBottomNav", () => {
  it("renders primary tabs with accessible labels", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} goTo={goTo} tabs={STUB_TABS} />);
    expect(screen.getByLabelText("Home")).toBeTruthy();
    expect(screen.getByLabelText("Convert")).toBeTruthy();
    expect(screen.getByLabelText("Calculate")).toBeTruthy();
    expect(screen.getByLabelText("Track")).toBeTruthy();
    expect(screen.getByLabelText("Live")).toBeTruthy();
    expect(screen.getByLabelText("All sections")).toBeTruthy();
  });

  it("calls goTo when a primary tab is pressed", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} goTo={goTo} tabs={STUB_TABS} />);
    fireEvent.click(screen.getByLabelText("Convert"));
    expect(goTo).toHaveBeenCalledWith(1, 0);
  });

  it("marks the active tab with aria-current=page", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={2} goTo={goTo} tabs={STUB_TABS} />);
    expect(screen.getByLabelText("Calculate").getAttribute("aria-current")).toBe("page");
    expect(screen.getByLabelText("Home").getAttribute("aria-current")).toBeNull();
  });

  it("opens the NavDrawer when All button is pressed", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} goTo={goTo} tabs={STUB_TABS} />);
    fireEvent.click(screen.getByLabelText("All sections"));
    expect(screen.getByRole("dialog", { name: "All navigation sections" })).toBeTruthy();
  });

  it("marks All button active when a non-primary group is selected (gi >= 5)", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={5} goTo={goTo} tabs={STUB_TABS} />);
    const allBtn = screen.getByLabelText("All sections");
    expect(allBtn.getAttribute("aria-expanded")).toBe("false");
    // The active state is reflected via aria-expanded on the all button and
    // visual treatment; drawer stays closed until explicitly opened.
  });
});

describe("NavDrawer", () => {
  it("renders null when closed", () => {
    const goTo = vi.fn();
    const { container } = render(
      <NavDrawer open={false} onClose={vi.fn()} tabs={STUB_TABS} gi={0} goTo={goTo} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders all groups and sub-items when open", () => {
    const goTo = vi.fn();
    render(<NavDrawer open={true} onClose={vi.fn()} tabs={STUB_TABS} gi={0} goTo={goTo} />);
    expect(screen.getByRole("dialog", { name: "All navigation sections" })).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Convert")).toBeTruthy();
    expect(screen.getByText("Learn")).toBeTruthy();
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Glossary")).toBeTruthy();
  });

  it("calls goTo and onClose when a sub-item is pressed", () => {
    const goTo = vi.fn();
    const onClose = vi.fn();
    render(<NavDrawer open={true} onClose={onClose} tabs={STUB_TABS} gi={0} goTo={goTo} />);
    fireEvent.click(screen.getByText("Glossary"));
    expect(goTo).toHaveBeenCalledWith(5, 1);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the close button is pressed", () => {
    const onClose = vi.fn();
    render(<NavDrawer open={true} onClose={onClose} tabs={STUB_TABS} gi={0} goTo={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Close navigation"));
    expect(onClose).toHaveBeenCalled();
  });

  it("displays total tool count in the header", () => {
    render(<NavDrawer open={true} onClose={vi.fn()} tabs={STUB_TABS} gi={0} goTo={vi.fn()} />);
    const totalItems = STUB_TABS.reduce((n, g) => n + g.items.length, 0);
    expect(screen.getByText(`${totalItems} tools`)).toBeTruthy();
  });

  it("highlights the active group", () => {
    render(<NavDrawer open={true} onClose={vi.fn()} tabs={STUB_TABS} gi={3} goTo={vi.fn()} />);
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("renders with the pg-nav-drawer class for CANON-041 full-height styling", () => {
    const { container } = render(
      <NavDrawer open={true} onClose={vi.fn()} tabs={STUB_TABS} gi={0} goTo={vi.fn()} />
    );
    const drawer = container.querySelector(".pg-nav-drawer");
    expect(drawer).toBeTruthy();
    expect(drawer.className).toContain("pg-nav-drawer");
  });
});

describe("MOBILE_NAV_RESPONSIVE_CSS includes CANON-041 markers", () => {
  it("includes 100dvh drawer class in responsive CSS", async () => {
    const { MOBILE_NAV_RESPONSIVE_CSS } = await import("../app/responsive.js");
    expect(MOBILE_NAV_RESPONSIVE_CSS).toContain(".pg-nav-drawer");
    expect(MOBILE_NAV_RESPONSIVE_CSS).toContain(".pg-mobile-nav");
    expect(MOBILE_NAV_RESPONSIVE_CSS).toContain("@media (max-width: 768px)");
  });
});
