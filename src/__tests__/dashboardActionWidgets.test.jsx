/** @vitest-environment happy-dom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("../auth.js", () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(() => ({ upsert: vi.fn() })),
  },
}));

vi.mock("../launchState.js", () => ({
  CANONICAL_APP_URL: "https://promogrind.bet/",
  FEATURE_FLAGS: { pushAlerts: false },
}));

vi.mock("../sw-register.js", () => ({
  subscribeToPush: vi.fn(),
}));

import { PushEnableBtn } from "../app/DashboardActionWidgets.jsx";

describe("PushEnableBtn", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the Pro push beta state without requiring push runtime globals", () => {
    render(<PushEnableBtn proStatus={{ status: "trial" }} />);

    expect(screen.getByText(/Push beta/i)).toBeTruthy();
  });

  it("stays hidden for free users", () => {
    const { container } = render(<PushEnableBtn proStatus={{ status: "free" }} />);

    expect(container.textContent).toBe("");
  });
});