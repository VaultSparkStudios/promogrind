/** @vitest-environment happy-dom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppDataCtx, ToastCtx } from "../contexts.jsx";
import DailyDashboard from "../components/dashboard/DailyDashboard.jsx";

vi.mock("../auth.js", () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(() => ({ upsert: vi.fn(), select: vi.fn(() => ({ limit: vi.fn() })) })),
  },
}));

vi.mock("../launchState.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    FEATURE_FLAGS: {
      ...actual.FEATURE_FLAGS,
      liveScanner: false,
      promoAdvisor: false,
      pushAlerts: false,
    },
  };
});

vi.mock("../sw-register.js", () => ({
  disableDailyBriefPush: vi.fn(),
  enableDailyBriefPush: vi.fn(),
  isDailyBriefEnabled: vi.fn(() => false),
  subscribeToPush: vi.fn(),
}));

const appData = {
  bets: [],
  ledger: [],
  done: {},
  bookExpiry: {},
  bookStatus: {},
  resultFeedback: [],
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <ToastCtx.Provider value={vi.fn()}>
        <AppDataCtx.Provider value={{ appData, syncAppData: vi.fn(), syncDiagnostics: {}, syncStatus: "idle", isOnline: true }}>
          <DailyDashboard proStatus={{ status: "free" }} />
        </AppDataCtx.Provider>
      </ToastCtx.Provider>
    </MemoryRouter>,
  );
}

describe("DailyDashboard", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders as an owned route chunk without leaked App.jsx symbols", async () => {
    renderDashboard();

    expect(await screen.findByText(/Good /i)).toBeTruthy();
    expect(screen.getAllByText(/Books Done/i).length).toBeGreaterThan(0);
  });
});