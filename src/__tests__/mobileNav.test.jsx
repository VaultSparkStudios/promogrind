/** @vitest-environment happy-dom */
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

const TABS = [
  { group: "Home" },
  { group: "Convert" },
  { group: "Calc" },
  { group: "Track" },
  { group: "Live" },
  { group: "Learn" },
];

describe("MobileBottomNav", () => {
  afterEach(cleanup);

  it("renders 6 SVG icons — one per tab — instead of duplicated text labels", () => {
    render(<MobileBottomNav gi={0} goTo={() => {}} tabs={TABS} />);
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(6);
  });

  it("marks only the active tab with aria-current=page", () => {
    render(<MobileBottomNav gi={2} goTo={() => {}} tabs={TABS} />);
    const active = document.querySelectorAll('[aria-current="page"]');
    expect(active.length).toBe(1);
    expect(active[0].getAttribute("aria-label")).toBe("Calc");
  });

  it("updates aria-current when the active index changes", () => {
    const { rerender } = render(<MobileBottomNav gi={0} goTo={() => {}} tabs={TABS} />);
    expect(screen.getByRole("button", { name: "Home" })).toHaveProperty("ariaCurrent", "page");

    rerender(<MobileBottomNav gi={4} goTo={() => {}} tabs={TABS} />);
    expect(screen.getByRole("button", { name: "Live" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Home" }).getAttribute("aria-current")).toBeNull();
  });

  it("exposes a nav landmark with the accessible name 'Main navigation'", () => {
    render(<MobileBottomNav gi={0} goTo={() => {}} tabs={TABS} />);
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeTruthy();
  });

  it("renders all 6 expected tab labels", () => {
    render(<MobileBottomNav gi={0} goTo={() => {}} tabs={TABS} />);
    for (const label of ["Home", "Convert", "Calc", "Track", "Live", "Learn"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });
});
