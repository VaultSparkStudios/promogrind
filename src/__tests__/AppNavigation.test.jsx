// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

const FAKE_TABS = [
  { group: "Home" },
  { group: "Convert" },
  { group: "Calculate" },
  { group: "Track" },
  { group: "Live" },
  { group: "Learn" },
];

describe("MobileBottomNav", () => {
  it("renders one button per tab", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} goTo={goTo} tabs={FAKE_TABS} />);
    expect(container.querySelectorAll("button").length).toBe(FAKE_TABS.length);
  });

  it("marks the active tab with aria-current=page", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={2} goTo={goTo} tabs={FAKE_TABS} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons[2].getAttribute("aria-current")).toBe("page");
    expect(buttons[0].getAttribute("aria-current")).toBeNull();
  });

  it("does not set aria-current on inactive tabs", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} goTo={goTo} tabs={FAKE_TABS} />);
    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn, i) => {
      if (i === 0) expect(btn.getAttribute("aria-current")).toBe("page");
      else expect(btn.getAttribute("aria-current")).toBeNull();
    });
  });

  it("calls goTo with correct group index on click", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} goTo={goTo} tabs={FAKE_TABS} />);
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[3]);
    expect(goTo).toHaveBeenCalledWith(3, 0);
  });

  it("renders SVG icons (not plain text icons) inside each button", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} goTo={goTo} tabs={FAKE_TABS} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(FAKE_TABS.length);
  });

  it("sets aria-label on each button for screen readers", () => {
    const goTo = vi.fn();
    const { container } = render(<MobileBottomNav gi={0} goTo={goTo} tabs={FAKE_TABS} />);
    const buttons = container.querySelectorAll("button");
    const labels = Array.from(buttons).map((b) => b.getAttribute("aria-label"));
    expect(labels).toEqual(["Home", "Convert", "Calc", "Track", "Live", "Learn"]);
  });
});
