/** @vitest-environment happy-dom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MobileBottomNav, MobileNavDrawer } from "../app/AppNavigation.jsx";

afterEach(cleanup);

const STUB_TABS = [
  { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Brief", slug: "brief" }] },
  { group: "Convert", items: [{ n: "Bonus Bet", slug: "bonus-bet", pro: false }, { n: "Profit Boost", slug: "profit-boost", pro: false }] },
  { group: "Calc", items: [{ n: "No-Vig", slug: "no-vig" }, { n: "+EV", slug: "ev" }, { n: "2-Way Arb", slug: "arb-2way" }] },
  { group: "Track", items: [{ n: "Tracker", slug: "tracker" }] },
  { group: "Live", items: [{ n: "Scanner", slug: "live-scanner", pro: true }] },
  { group: "Learn", items: [{ n: "Knowledge Base", slug: "knowledge-base" }] },
];

describe("MobileNavDrawer", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <MobileNavDrawer isOpen={false} onClose={vi.fn()} tabs={STUB_TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the sheet dialog and section headers when open", () => {
    render(
      <MobileNavDrawer isOpen={true} onClose={vi.fn()} tabs={STUB_TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    expect(screen.getByRole("dialog", { name: /full navigation/i })).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Convert")).toBeTruthy();
    expect(screen.getByText("Calc")).toBeTruthy();
  });

  it("expands the active group on open and shows its items", () => {
    render(
      <MobileNavDrawer isOpen={true} onClose={vi.fn()} tabs={STUB_TABS} gi={1} ti={0} goTo={vi.fn()} />
    );
    // Active group (Convert) should be expanded — items visible
    expect(screen.getByText("Bonus Bet")).toBeTruthy();
    expect(screen.getByText("Profit Boost")).toBeTruthy();
  });

  it("expands a different section when its header is clicked", () => {
    render(
      <MobileNavDrawer isOpen={true} onClose={vi.fn()} tabs={STUB_TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    // Click "Calc" section header to expand it
    const calcHeader = screen.getByRole("button", { name: /calc/i });
    fireEvent.click(calcHeader);
    expect(screen.getByText("No-Vig")).toBeTruthy();
    expect(screen.getByText("+EV")).toBeTruthy();
  });

  it("calls goTo and onClose when an item is clicked", () => {
    const goTo = vi.fn();
    const onClose = vi.fn();
    render(
      <MobileNavDrawer isOpen={true} onClose={onClose} tabs={STUB_TABS} gi={0} ti={0} goTo={goTo} />
    );
    // Home group is expanded (active); click "Brief"
    fireEvent.click(screen.getByText("Brief"));
    expect(goTo).toHaveBeenCalledWith(0, 1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <MobileNavDrawer isOpen={true} onClose={onClose} tabs={STUB_TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /close navigation/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <MobileNavDrawer isOpen={true} onClose={onClose} tabs={STUB_TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    // Backdrop is the first child of the portal (aria-hidden div)
    const backdrop = container.querySelector("[aria-hidden='true']");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders Pro badge on pro items", () => {
    render(
      <MobileNavDrawer isOpen={true} onClose={vi.fn()} tabs={STUB_TABS} gi={4} ti={0} goTo={vi.fn()} />
    );
    // Live group is active; Scanner is a pro item
    expect(screen.getByText("Pro")).toBeTruthy();
  });
});

describe("MobileBottomNav", () => {
  // happy-dom treats position:fixed elements as inaccessible; use hidden:true to reach them
  it("renders up to 5 primary tabs plus a More button", () => {
    render(
      <MobileBottomNav gi={0} goTo={vi.fn()} tabs={STUB_TABS} onOpenDrawer={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /home/i, hidden: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: /convert/i, hidden: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: /browse all sections/i, hidden: true })).toBeTruthy();
  });

  it("calls goTo when a primary tab is clicked", () => {
    const goTo = vi.fn();
    render(
      <MobileBottomNav gi={0} goTo={goTo} tabs={STUB_TABS} onOpenDrawer={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /convert/i, hidden: true }));
    expect(goTo).toHaveBeenCalledWith(1, 0);
  });

  it("calls onOpenDrawer when More button is clicked", () => {
    const onOpenDrawer = vi.fn();
    render(
      <MobileBottomNav gi={0} goTo={vi.fn()} tabs={STUB_TABS} onOpenDrawer={onOpenDrawer} />
    );
    fireEvent.click(screen.getByRole("button", { name: /browse all sections/i, hidden: true }));
    expect(onOpenDrawer).toHaveBeenCalledTimes(1);
  });

  it("marks the active tab with aria-current", () => {
    render(
      <MobileBottomNav gi={2} goTo={vi.fn()} tabs={STUB_TABS} onOpenDrawer={vi.fn()} />
    );
    const calcBtn = screen.getByRole("button", { name: /calc/i, hidden: true });
    expect(calcBtn.getAttribute("aria-current")).toBe("page");
  });
});
