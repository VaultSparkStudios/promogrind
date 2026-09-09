/** @vitest-environment happy-dom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// Mock shared.js color tokens so the module resolves without DOM
vi.mock("../lib/shared.js", () => ({
  K:    { s1: "#0f1520", s2: "#161d2a", bg: "#0a0e17", bd: "#1e293b", bd2: "#334155", gn: "#4ade80", ac: "#60a5fa", pp: "#c084fc", rd: "#f87171", yl: "#fbbf24", mt: "#7a8fa8", tx: "#e2e8f0", dm: "#94a3b8" },
  KD:   { s1: "#0f1520", s2: "#161d2a", bg: "#0a0e17", bd: "#1e293b", bd2: "#334155", gn: "#4ade80", ac: "#60a5fa", pp: "#c084fc", rd: "#f87171", yl: "#fbbf24", mt: "#7a8fa8", tx: "#e2e8f0", dm: "#94a3b8" },
  S:    { input: {} },
  font:  "monospace",
  fontD: "sans-serif",
}));

vi.mock("./responsive.js", () => ({
  MOBILE_NAV_RESPONSIVE_CSS: "",
}));

vi.mock("./appText.js", () => ({
  SEARCH_UI: { calculatorPlaceholder: "Search..." },
}));

import { MobileBottomNav } from "../app/AppNavigation.jsx";

const TABS = [
  { group: "Home",      items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Pricing", slug: "pricing" }] },
  { group: "Convert",   items: [{ n: "Bonus Bet", slug: "bonus-bet" }] },
  { group: "Calculate", items: [{ n: "No-Vig", slug: "no-vig" }, { n: "+EV", slug: "ev" }] },
  { group: "Track",     items: [{ n: "Edge", slug: "edge-dashboard" }] },
  { group: "Live",      items: [{ n: "Arb Scanner", slug: "arb-scanner", pro: true }] },
  { group: "Learn",     items: [{ n: "Knowledge Base", slug: "knowledge-base" }] },
];

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("MobileBottomNav", () => {
  it("renders the quick-tab bar with 5 group buttons + More", () => {
    render(<MobileBottomNav gi={0} goTo={() => {}} tabs={TABS} />);
    // First 5 groups appear as quick buttons
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Convert")).toBeTruthy();
    expect(screen.getByText("Calc")).toBeTruthy();
    expect(screen.getByText("Track")).toBeTruthy();
    expect(screen.getByText("Live")).toBeTruthy();
    // More button
    expect(screen.getByLabelText("Open full navigation menu")).toBeTruthy();
    // Drawer is not visible yet
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens drawer on More click and shows all 6 groups", () => {
    render(<MobileBottomNav gi={0} goTo={() => {}} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("Open full navigation menu"));
    const dialog = screen.getByRole("dialog", { name: "Navigation menu" });
    expect(dialog).toBeTruthy();
    // All 6 group headings visible inside drawer
    expect(screen.getAllByText("Home").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Learn")).toBeTruthy();
  });

  it("closes drawer when close button is clicked", () => {
    render(<MobileBottomNav gi={0} goTo={() => {}} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("Open full navigation menu"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Close navigation"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes drawer and navigates when a sub-item is clicked", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} goTo={goTo} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("Open full navigation menu"));
    // Click "+EV" which is tab 2 (Calculate), item 1
    fireEvent.click(screen.getByText("+EV"));
    expect(goTo).toHaveBeenCalledWith(2, 1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("prevents body scroll while drawer is open", () => {
    render(<MobileBottomNav gi={0} goTo={() => {}} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("Open full navigation menu"));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByLabelText("Close navigation"));
    expect(document.body.style.overflow).toBe("");
  });

  it("marks PRO badge on gated items", () => {
    render(<MobileBottomNav gi={0} goTo={() => {}} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("Open full navigation menu"));
    expect(screen.getByText("PRO")).toBeTruthy();
  });

  it("closes drawer when backdrop is clicked", () => {
    const { container } = render(<MobileBottomNav gi={0} goTo={() => {}} tabs={TABS} />);
    fireEvent.click(screen.getByLabelText("Open full navigation menu"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    // Backdrop is the div behind the drawer
    const backdrop = container.querySelector(".pg-nav-drawer-backdrop");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
