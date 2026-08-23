// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

const STUB_TABS = [
  { group: "Home" },
  { group: "Convert" },
  { group: "Calculate" },
  { group: "Track" },
  { group: "Live" },
  { group: "Learn" },
];

function renderNav(gi = 0, goTo = vi.fn()) {
  return render(<MobileBottomNav gi={gi} goTo={goTo} tabs={STUB_TABS} />);
}

// Nav is hidden via responsive CSS at default test window width (>768px),
// so we query the DOM directly rather than via accessibility tree.
describe("MobileBottomNav CANON-041 compliance", () => {
  it("renders a button for every tab group", () => {
    const { container } = renderNav();
    expect(container.querySelectorAll(".pg-nav-btn")).toHaveLength(STUB_TABS.length);
  });

  it("marks only the active tab as aria-selected=true", () => {
    const { container } = renderNav(2);
    const btns = [...container.querySelectorAll(".pg-nav-btn")];
    btns.forEach((btn, i) => {
      expect(btn.getAttribute("aria-selected")).toBe(i === 2 ? "true" : "false");
    });
  });

  it("calls goTo with correct group index and 0 on click", () => {
    const goTo = vi.fn();
    const { container } = renderNav(0, goTo);
    // Click the 4th button (Track, index=3)
    const btns = [...container.querySelectorAll(".pg-nav-btn")];
    fireEvent.click(btns[3]);
    expect(goTo).toHaveBeenCalledWith(3, 0);
  });

  it("every button satisfies the ≥44px tap-target height (minHeight)", () => {
    const { container } = renderNav();
    [...container.querySelectorAll(".pg-nav-btn")].forEach((btn) => {
      const minH = parseInt(btn.style.minHeight || "0", 10);
      expect(minH).toBeGreaterThanOrEqual(44);
    });
  });

  it("renders an SVG icon inside each button", () => {
    const { container } = renderNav();
    [...container.querySelectorAll(".pg-nav-btn")].forEach((btn) => {
      expect(btn.querySelector("svg")).toBeTruthy();
    });
  });

  it("sliding indicator is present with GPU-composited translateX", () => {
    const { container } = renderNav(2);
    const indicator = container.querySelector(".pg-nav-indicator");
    expect(indicator).toBeTruthy();
    // 6 tabs, active=2 → translateX(200%)
    expect(indicator.style.transform).toBe("translateX(200%)");
  });

  it("indicator shifts position when the active tab changes", () => {
    const { container, rerender } = renderNav(0);
    expect(container.querySelector(".pg-nav-indicator").style.transform).toBe("translateX(0%)");
    rerender(<MobileBottomNav gi={4} goTo={vi.fn()} tabs={STUB_TABS} />);
    expect(container.querySelector(".pg-nav-indicator").style.transform).toBe("translateX(400%)");
  });

  it("active button shows green color and inactive buttons show muted color", () => {
    const { container } = renderNav(1);
    const btns = [...container.querySelectorAll(".pg-nav-btn")];
    // Inline styles keep hex values in happy-dom
    expect(btns[1].style.color).toBe("#4ade80");
    expect(btns[0].style.color).toBe("#7a8fa8");
  });

  it("all buttons have role=tab and aria-label set", () => {
    const { container } = renderNav();
    [...container.querySelectorAll(".pg-nav-btn")].forEach((btn) => {
      expect(btn.getAttribute("role")).toBe("tab");
      expect(btn.getAttribute("aria-label")).toBeTruthy();
    });
  });

  it("nav has an accessible name and tablist structure", () => {
    const { container } = renderNav();
    const nav = container.querySelector("nav.pg-mobile-nav");
    expect(nav.getAttribute("aria-label")).toBe("Primary navigation");
    expect(container.querySelector("[role=tablist]")).toBeTruthy();
  });

  it("buttons suppress tap highlight for native mobile feel", () => {
    const { container } = renderNav();
    [...container.querySelectorAll(".pg-nav-btn")].forEach((btn) => {
      expect(btn.style.WebkitTapHighlightColor).toBe("transparent");
    });
  });

  it("indicator glows with a box-shadow on the active pill", () => {
    const { container } = renderNav(0);
    const pill = container.querySelector(".pg-nav-indicator > div");
    expect(pill.style.boxShadow).toContain("4ade80");
  });
});
