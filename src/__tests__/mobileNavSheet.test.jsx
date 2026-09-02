/** @vitest-environment happy-dom */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomNav } from "../app/AppNavigation.jsx";

const MOCK_TABS = [
  { group: "Home", items: [{ n: "Dashboard", slug: "dashboard" }, { n: "Daily Brief", slug: "daily-brief" }] },
  { group: "Convert", items: [{ n: "Bonus Bet", slug: "bonus-bet" }, { n: "Profit Boost", slug: "profit-boost" }] },
  { group: "Calculate", items: [{ n: "No-Vig", slug: "no-vig" }, { n: "Arb", slug: "arb-2way" }] },
  { group: "Track", items: [{ n: "Edge", slug: "edge-dashboard" }] },
  { group: "Live", items: [{ n: "Arb Scanner", slug: "arb-scanner", pro: true }] },
  { group: "Learn", items: [{ n: "Knowledge Base", slug: "knowledge-base" }] },
];

function renderNav(props = {}) {
  const goTo = vi.fn();
  const { container } = render(
    <MobileBottomNav gi={0} ti={0} goTo={goTo} tabs={MOCK_TABS} {...props} />
  );
  return { goTo, container };
}

describe("MobileBottomNav — bottom tab bar", () => {
  it("renders a button for every group with the pg-mobile-nav class", () => {
    const { container } = renderNav();
    const nav = container.querySelector(".pg-mobile-nav");
    expect(nav).not.toBeNull();
    const btns = nav.querySelectorAll("button");
    expect(btns.length).toBe(MOCK_TABS.length);
  });

  it("shows 'Calc' label for the Calculate group to fit the narrow tab", () => {
    renderNav();
    expect(screen.getByText("Calc")).toBeTruthy();
  });

  it("calls goTo with the clicked group index on a non-active tab", () => {
    const { goTo } = renderNav({ gi: 0 });
    fireEvent.click(screen.getByText("Convert"));
    expect(goTo).toHaveBeenCalledWith(1, 0);
  });

  it("does NOT immediately call goTo when tapping the active group tab (opens sheet instead)", () => {
    const { goTo } = renderNav({ gi: 0 });
    fireEvent.click(screen.getByText("Home"));
    expect(goTo).not.toHaveBeenCalled();
  });
});

describe("MobileBottomNav — 100dvh scrollable nav sheet", () => {
  it("opens the sheet when the active group tab is tapped", () => {
    renderNav({ gi: 1 });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText("Convert"));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    // Sheet lists sub-items for Convert group
    expect(screen.getByText("Bonus Bet")).toBeTruthy();
    expect(screen.getByText("Profit Boost")).toBeTruthy();
  });

  it("shows a PRO badge on pro-gated items in the sheet", () => {
    renderNav({ gi: 4 });
    fireEvent.click(screen.getByText("Live"));
    expect(screen.getByText("PRO")).toBeTruthy();
  });

  it("calls goTo and closes the sheet when an item is selected", () => {
    const { goTo } = renderNav({ gi: 1, ti: 0 });
    fireEvent.click(screen.getByText("Convert"));
    // Click the second item in the sheet
    fireEvent.click(screen.getByText("Profit Boost"));
    expect(goTo).toHaveBeenCalledWith(1, 1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the sheet when the backdrop is clicked", () => {
    renderNav({ gi: 0 });
    fireEvent.click(screen.getByText("Home"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    // The backdrop is the dialog element itself
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the sheet on Escape key", () => {
    renderNav({ gi: 0 });
    fireEvent.click(screen.getByText("Home"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the sheet and navigates when a different group tab is tapped while sheet is open", () => {
    const { goTo } = renderNav({ gi: 0 });
    fireEvent.click(screen.getByText("Home")); // open sheet for Home
    fireEvent.click(screen.getByText("Convert")); // tap Convert while sheet is open
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(goTo).toHaveBeenCalledWith(1, 0);
  });

  it("highlights the currently active item in the sheet with aria contrast", () => {
    const { container } = renderNav({ gi: 0, ti: 0 });
    fireEvent.click(screen.getByText("Home"));
    // The first item should be visually highlighted (green border-left in style)
    const itemBtns = container.querySelectorAll('[role="dialog"] button');
    // First visible item button (not the close button)
    const navItems = Array.from(itemBtns).filter((b) => !b.getAttribute("aria-label"));
    expect(navItems[0].style.borderLeft).toContain("3px solid");
  });

  it("sheet has aria-modal and accessible label", () => {
    renderNav({ gi: 2 });
    fireEvent.click(screen.getByText("Calc"));
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toContain("Calculate");
  });
});
