// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../lib/shared.js", () => ({
  K: {
    bg: "#0f172a", gn: "#4ade80", mt: "#475569", tx: "#f1f5f9",
    bd: "#1e293b", bd2: "#334155", pp: "#a855f7",
  },
  font: "sans-serif",
  fontD: "monospace",
}));

import { MobileNavDrawer } from "../app/MobileNavDrawer.jsx";

const TABS = [
  { group: "Home", items: [
    { n: "Dashboard", slug: "dashboard" },
    { n: "Daily Brief", slug: "daily-brief" },
  ]},
  { group: "Convert", items: [
    { n: "Bonus Bet", slug: "bonus-bet" },
    { n: "Profit Boost", slug: "profit-boost" },
  ]},
  { group: "Live", items: [
    { n: "Arb Scanner", slug: "arb-scanner", pro: true },
  ]},
];

describe("MobileNavDrawer — CANON-041 100dvh mobile nav", () => {
  it("renders an accessible dialog with all group sections and item buttons", () => {
    render(
      <MobileNavDrawer tabs={TABS} gi={0} ti={0} navigate={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("ALL TOOLS")).toBeTruthy();
    expect(screen.getByTestId("nav-item-dashboard")).toBeTruthy();
    expect(screen.getByTestId("nav-item-bonus-bet")).toBeTruthy();
    expect(screen.getByTestId("nav-item-arb-scanner")).toBeTruthy();
  });

  it("calls navigate and onClose when an item is tapped", () => {
    const navigate = vi.fn();
    const onClose = vi.fn();
    render(
      <MobileNavDrawer tabs={TABS} gi={0} ti={0} navigate={navigate} onClose={onClose} />
    );
    fireEvent.click(screen.getByTestId("nav-item-bonus-bet"));
    expect(navigate).toHaveBeenCalledWith("/bonus-bet");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when ESC is pressed", () => {
    const onClose = vi.fn();
    render(
      <MobileNavDrawer tabs={TABS} gi={0} ti={0} navigate={vi.fn()} onClose={onClose} />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <MobileNavDrawer tabs={TABS} gi={0} ti={0} navigate={vi.fn()} onClose={onClose} />
    );
    fireEvent.click(screen.getByTestId("mobile-nav-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("highlights the active group item and shows PRO badge on gated tools", () => {
    render(
      <MobileNavDrawer tabs={TABS} gi={1} ti={0} navigate={vi.fn()} onClose={vi.fn()} />
    );
    const activeBtn = screen.getByTestId("nav-item-bonus-bet");
    expect(activeBtn.style.color).toBe("#4ade80");
    expect(activeBtn.style.fontWeight).toBe("600");
    expect(screen.getByText("PRO")).toBeTruthy();
  });
});
