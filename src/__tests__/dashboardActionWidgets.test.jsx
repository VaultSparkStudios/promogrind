/** @vitest-environment happy-dom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";

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
  enableDailyBriefPush: vi.fn(),
  isDailyBriefEnabled: vi.fn(() => false),
}));

import { PushEnableBtn, WeeklyDecisionReview } from "../app/DashboardActionWidgets.jsx";
import { AppDataCtx, ToastCtx } from "../contexts.jsx";
import { FEATURE_FLAGS } from "../launchState.js";
import { enableDailyBriefPush, isDailyBriefEnabled } from "../sw-register.js";

describe("PushEnableBtn", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    FEATURE_FLAGS.pushAlerts = false;
    vi.clearAllMocks();
  });

  it("renders the Pro push beta state without requiring push runtime globals", () => {
    render(<PushEnableBtn proStatus={{ status: "trial" }} />);

    expect(screen.getByText(/Push alerts · coming soon/i)).toBeTruthy();
  });

  it("stays hidden for free users", () => {
    const { container } = render(<PushEnableBtn proStatus={{ status: "free" }} />);

    expect(container.textContent).toBe("");
  });

  it("does not mistake browser permission or a failed save for enabled alerts", async () => {
    FEATURE_FLAGS.pushAlerts = true;
    vi.stubGlobal('Notification', {permission:'granted'});
    isDailyBriefEnabled.mockReturnValue(false);
    enableDailyBriefPush.mockResolvedValue({ok:false,reason:'save_failed'});
    render(<PushEnableBtn proStatus={{status:'trial'}} />);
    fireEvent.click(screen.getByRole('button',{name:/Enable Push Alerts/i}));
    await waitFor(()=>expect(enableDailyBriefPush).toHaveBeenCalledOnce());
    await waitFor(()=>expect(screen.getByRole('button',{name:/Enable Push Alerts/i}).disabled).toBe(false));
    expect(screen.queryByText(/Push on/i)).toBeNull();
  });

  it("does not confirm a review copy when clipboard access fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    const toast = vi.fn();
    vi.stubGlobal('navigator', {clipboard:{writeText}});
    render(<ToastCtx.Provider value={toast}><AppDataCtx.Provider value={{appData:{ledger:[],resultFeedback:[]}}}><WeeklyDecisionReview /></AppDataCtx.Provider></ToastCtx.Provider>);
    fireEvent.click(screen.getByRole('button',{name:'Build Review'}));
    fireEvent.click(screen.getByRole('button',{name:/Copy Report/}));
    await waitFor(()=>expect(writeText).toHaveBeenCalledOnce());
    await waitFor(()=>expect(toast).toHaveBeenCalledWith(expect.stringContaining('Could not copy'),expect.any(String)));
    expect(screen.queryByText(/Copied!/)).toBeNull();
    expect(screen.getByRole('button',{name:/Copy Report/})).toBeTruthy();
  });
});
