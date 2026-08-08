// @vitest-environment happy-dom
// Regression guard for the elite mobile nav icon contract (CANON-041).
// Note: getByRole queries use { hidden: true } because the responsive CSS
// hides .pg-mobile-nav above 768px; happy-dom defaults to a wide viewport.
import React from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

afterEach(cleanup);

const TABS = [
  { group: "Home" },
  { group: "Convert" },
  { group: "Calculate" },
  { group: "Track" },
  { group: "Live" },
  { group: "Learn" },
];

describe("MobileBottomNav icon contract", () => {
  it("renders one button per tab with an accessible label", () => {
    render(<MobileBottomNav gi={0} goTo={vi.fn()} tabs={TABS} />);
    // Use { hidden: true } because the responsive CSS hides .pg-mobile-nav
    // above 768px and happy-dom runs at a wider default viewport.
    expect(screen.getByRole("button", { name: "Home", hidden: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Convert", hidden: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Calc", hidden: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Track", hidden: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Live", hidden: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Learn", hidden: true })).toBeTruthy();
  });

  it("marks the active tab with aria-pressed", () => {
    render(<MobileBottomNav gi={2} goTo={vi.fn()} tabs={TABS} />);
    const calcBtn = screen.getByRole("button", { name: "Calc", hidden: true });
    expect(calcBtn.getAttribute("aria-pressed")).toBe("true");
    const homeBtn = screen.getByRole("button", { name: "Home", hidden: true });
    expect(homeBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls goTo with the tab index on click", () => {
    const goTo = vi.fn();
    render(<MobileBottomNav gi={0} goTo={goTo} tabs={TABS} />);
    fireEvent.click(screen.getByRole("button", { name: "Track", hidden: true }));
    expect(goTo).toHaveBeenCalledWith(3, 0);
  });

  it("renders SVG icons — one per tab, no duplicate text per button", () => {
    const { container } = render(<MobileBottomNav gi={0} goTo={vi.fn()} tabs={TABS} />);
    const svgs = container.querySelectorAll("svg");
    // One SVG icon per tab
    expect(svgs.length).toBe(TABS.length);

    // No button should show the same visible text string more than once.
    // Old pattern used identical text strings as both "icon" and "label".
    container.querySelectorAll("button").forEach((btn) => {
      const visibleSpans = Array.from(btn.querySelectorAll("span")).filter(
        (s) => s.getAttribute("aria-hidden") !== "true"
      );
      const texts = visibleSpans.map((s) => s.textContent.trim().toLowerCase()).filter(Boolean);
      const unique = new Set(texts);
      expect(unique.size).toBe(texts.length);
    });
  });
});
