import { describe, expect, it } from "vitest";
import { createTelemetryBuffer } from "../lib/telemetryBuffer.js";

describe("pre-init telemetry buffer", () => {
  it("keeps a bounded FIFO of boot exceptions and flushes once telemetry is ready", () => {
    const buffer = createTelemetryBuffer(2);
    buffer.push(new Error("old"), { componentStack: "x".repeat(700) });
    buffer.push(new Error("middle"), { phase: "boot" });
    buffer.push(new Error("new"), { phase: "render" });
    expect(buffer.size).toBe(2);
    const messages = [];
    expect(buffer.drain((error, context) => messages.push([error.message, context]))).toBe(2);
    expect(messages.map(([message]) => message)).toEqual(["middle", "new"]);
    expect(buffer.size).toBe(0);
  });

  it("retains a failed delivery for the next drain", () => {
    const buffer = createTelemetryBuffer(2);
    buffer.push(new Error("retry"));
    buffer.drain(() => { throw new Error("transport unavailable"); });
    expect(buffer.size).toBe(1);
    const delivered = [];
    buffer.drain((error) => delivered.push(error.message));
    expect(delivered).toEqual(["retry"]);
  });
});
