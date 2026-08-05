// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

// Minimal tab set matching the real tab groups
const TABS = [
  { group: "Home",      items: [{ slug: "dashboard" }] },
  { group: "Convert",   items: [{ slug: "bonus-bet" }] },
  { group: "Calculate", items: [{ slug: "no-vig" }] },
  { group: "Track",     items: [{ slug: "edge-dashboard" }] },
  { group: "Live",      items: [{ slug: "arb-scanner" }] },
  { group: "Learn",     items: [{ slug: "knowledge-base" }] },
];

describe("MobileBottomNav visual contract", () => {
  it("renders a <nav> with pg-mobile-nav class and aria label", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} goTo={goTo} tabs={TABS} />);
    const nav = container.querySelector("nav.pg-mobile-nav");
    expect(nav).toBeTruthy();
    expect(nav.getAttribute("aria-label")).toBe("Main navigation");
  });

  it("marks the active tab with aria-current='page'", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={2} goTo={goTo} tabs={TABS} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(6);
    // Button at index 2 is active (gi=2 = Calculate)
    expect(buttons[2].getAttribute("aria-current")).toBe("page");
    // Other buttons must NOT have aria-current
    expect(buttons[0].getAttribute("aria-current")).toBeNull();
    expect(buttons[1].getAttribute("aria-current")).toBeNull();
    expect(buttons[3].getAttribute("aria-current")).toBeNull();
  });

  it("shows a short label (Calc) for Calculate group", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} goTo={goTo} tabs={TABS} />);
    const labels = [...container.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
    expect(labels).toContain("Calculate");
    // Visible text label is abbreviated
    const calcBtn = [...container.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Calculate",
    );
    expect(calcBtn.textContent).toContain("Calc");
  });

  it("calls goTo with the correct group index on click", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} goTo={goTo} tabs={TABS} />);
    const buttons = container.querySelectorAll("button");
    // Track is index 3
    fireEvent.click(buttons[3]);
    expect(goTo).toHaveBeenCalledWith(3, 0);
  });

  it("renders SVG icons for every known tab group", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} goTo={goTo} tabs={TABS} />);
    const svgs = container.querySelectorAll("svg");
    // One SVG per tab
    expect(svgs.length).toBe(6);
    // Every SVG is aria-hidden (icons are decorative)
    svgs.forEach((svg) => {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    });
  });

  it("applies responsive CSS targeting .pg-mobile-nav and .pg-main-content", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} goTo={goTo} tabs={TABS} />);
    const styleEl = container.querySelector("style");
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain(".pg-mobile-nav");
    expect(styleEl.textContent).toContain(".pg-main-content");
  });
});
