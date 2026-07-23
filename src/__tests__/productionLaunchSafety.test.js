import { describe, expect, it } from "vitest";
import {
  describeAuthError,
  describeFunctionResponse,
} from "../../scripts/verify-production-launch.mjs";

describe("production launch verification safety", () => {
  it("turns object-valued auth messages into useful bounded diagnostics", () => {
    expect(describeAuthError({
      name: "AuthApiError",
      status: 429,
      code: "over_email_send_rate_limit",
      message: { message: "Email rate limit exceeded" },
    })).toBe("Email rate limit exceeded — AuthApiError, status 429, code over_email_send_rate_limit");
  });

  it("never copies live checkout credentials or URLs into CI artifacts", () => {
    const raw = JSON.stringify({
      checkout_url: "https://checkout.stripe.com/c/pay/cs_live_secret",
      session_id: "cs_live_secret",
    });
    const detail = describeFunctionResponse("create-checkout", 200, raw);

    expect(detail).toBe("checkout session created");
    expect(detail).not.toContain("stripe.com");
    expect(detail).not.toContain("cs_live");
  });

  it("reports expected missing portal state without echoing provider data", () => {
    expect(describeFunctionResponse(
      "customer-portal",
      404,
      JSON.stringify({ error: "No billing profile for user secret-id" }),
    )).toBe("no billing record for disposable probe user (expected)");
  });
});
