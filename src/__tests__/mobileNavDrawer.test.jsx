/** @vitest-environment happy-dom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MobileBottomNav, MobileNavDrawer } from "../app/AppNavigation.jsx";

const TABS = [
  { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Pricing", slug: "pricing" }] },
  { group: "Convert", items: [{ n: "Bonus Bet", slug: "bonus-bet" }, { n: "Profit Boost", slug: "profit-boost" }] },
  { group: "Live", items: [{ n: "Arb Scanner", slug: "arb-scanner", pro: true }] },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MobileNavDrawer", () => {
  it("is not visible when open=false", () => {
    render(
      <MobileNavDrawer open={false} onClose={vi.fn()} tabs={TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog.style.transform).toBe("translateY(100%)");
  });

  it("is visible and shows all groups when open=true", () => {
    render(
      <MobileNavDrawer open={true} onClose={vi.fn()} tabs={TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Convert")).toBeTruthy();
    expect(screen.getByText("Live")).toBeTruthy();
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Bonus Bet")).toBeTruthy();
  });

  it("shows PRO badge on pro-gated items", () => {
    render(
      <MobileNavDrawer open={true} onClose={vi.fn()} tabs={TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    expect(screen.getByText("PRO")).toBeTruthy();
  });

  it("calls goTo and onClose when an item is clicked", () => {
    const goTo = vi.fn();
    const onClose = vi.fn();
    render(
      <MobileNavDrawer open={true} onClose={onClose} tabs={TABS} gi={0} ti={0} goTo={goTo} />
    );
    fireEvent.click(screen.getByText("Profit Boost"));
    expect(goTo).toHaveBeenCalledWith(1, 1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <MobileNavDrawer open={true} onClose={onClose} tabs={TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /close navigation/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("highlights the active item", () => {
    render(
      <MobileNavDrawer open={true} onClose={vi.fn()} tabs={TABS} gi={1} ti={0} goTo={vi.fn()} />
    );
    const bonusBetBtn = screen.getByRole("button", { name: "Bonus Bet" });
    expect(bonusBetBtn.style.fontWeight).toBe("700");
  });
});

describe("MobileBottomNav", () => {
  it("renders icons and labels for each tab group", () => {
    render(<MobileBottomNav gi={0} goTo={vi.fn()} tabs={TABS} onOpenDrawer={vi.fn()} />);
    expect(screen.getByLabelText("Home")).toBeTruthy();
    expect(screen.getByLabelText("Convert")).toBeTruthy();
    expect(screen.getByLabelText("Live")).toBeTruthy();
  });

  it("renders SVG icons instead of text characters for each tab", () => {
    const { container } = render(<MobileBottomNav gi={0} goTo={vi.fn()} tabs={TABS} onOpenDrawer={vi.fn()} />);
    const svgs = container.querySelectorAll("svg[aria-hidden='true']");
    expect(svgs.length).toBeGreaterThanOrEqual(TABS.length);
  });

  it("calls goTo when an inactive tab is tapped", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} goTo={goTo} tabs={TABS} onOpenDrawer={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Convert"));
    expect(goTo).toHaveBeenCalledWith(1, 0);
  });

  it("calls onOpenDrawer when the active tab is tapped", () => {
    const goTo = vi.fn();
    const onOpenDrawer = vi.fn();
    render(<MobileBottomNav gi={0} goTo={goTo} tabs={TABS} onOpenDrawer={onOpenDrawer} />);
    fireEvent.click(screen.getByLabelText("Home"));
    expect(onOpenDrawer).toHaveBeenCalledTimes(1);
    expect(goTo).not.toHaveBeenCalled();
  });
});

describe("MobileNavDrawer body-scroll lock", () => {
  it("locks body scroll when open and restores it on close", () => {
    const { rerender } = render(
      <MobileNavDrawer open={false} onClose={vi.fn()} tabs={TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    expect(document.body.style.overflow).toBe("");
    rerender(
      <MobileNavDrawer open={true} onClose={vi.fn()} tabs={TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <MobileNavDrawer open={false} onClose={vi.fn()} tabs={TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("renders SVG icons next to group headers in the drawer", () => {
    const { container } = render(
      <MobileNavDrawer open={true} onClose={vi.fn()} tabs={TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    const svgs = container.querySelectorAll("svg[aria-hidden='true']");
    expect(svgs.length).toBeGreaterThanOrEqual(TABS.length);
  });

  it("calls onClose when Escape is pressed while open", () => {
    const onClose = vi.fn();
    render(
      <MobileNavDrawer open={true} onClose={onClose} tabs={TABS} gi={0} ti={0} goTo={vi.fn()} />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
