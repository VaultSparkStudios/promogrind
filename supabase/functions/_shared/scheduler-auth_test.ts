import { withSchedulerAuthorization } from "./scheduler-auth.ts";

const schedulerKey = "scheduler-test-admin-authority";

Deno.test("scheduled dispatch rejects untrusted callers before database or delivery work", async () => {
  let effects = 0;
  const handler = withSchedulerAuthorization(schedulerKey, () => {
    effects += 1;
    return new Response("sent");
  });
  const invalidHeaders: HeadersInit[] = [
    {},
    { Authorization: "Bearer arbitrary-user-token" },
    { Authorization: `Bearer prefix-${schedulerKey}-suffix` },
    { Authorization: `Basic ${schedulerKey}` },
    { "x-cron-key": "anything" },
    { "x-cron-key": schedulerKey },
    { Authorization: "Bearer arbitrary-user-token", "x-cron-key": "anything" },
  ];
  for (const headers of invalidHeaders) {
    const response = await handler(new Request("https://example.test/scheduled", { method: "POST", headers }));
    if (response.status !== 401) throw new Error("Unauthorized request reached the scheduler");
  }
  if (effects !== 0) throw new Error("Unauthorized request caused a side effect");
});

Deno.test("missing scheduler authority fails closed even with a cron header", async () => {
  let effects = 0;
  const handler = withSchedulerAuthorization("", () => {
    effects += 1;
    return new Response("sent");
  });
  const invalidHeaders: HeadersInit[] = [{}, { Authorization: "Bearer arbitrary-token" }, { "x-cron-key": "anything" }];
  for (const headers of invalidHeaders) {
    const response = await handler(new Request("https://example.test/scheduled", { method: "POST", headers }));
    if (response.status !== 401) throw new Error("Missing configuration accepted a scheduler caller");
  }
  if (effects !== 0) throw new Error("Missing authority caused a side effect");
});

Deno.test("exact scheduler authority forwards one POST with its body intact", async () => {
  let effects = 0;
  const handler = withSchedulerAuthorization(schedulerKey, async (request) => {
    effects += 1;
    const payload = await request.json();
    if (payload.freq !== "weekly") throw new Error("Scheduler body changed");
    return new Response(JSON.stringify({ sent: 0 }), { status: 202 });
  });
  const response = await handler(new Request("https://example.test/scheduled", {
    method: "POST",
    headers: { authorization: `Bearer ${schedulerKey}` },
    body: JSON.stringify({ freq: "weekly" }),
  }));
  if (response.status !== 202 || effects !== 1) throw new Error("Authorized scheduler request was not forwarded exactly once");
});

Deno.test("authenticated non-POST requests cannot trigger a scheduled dispatch", async () => {
  let effects = 0;
  const handler = withSchedulerAuthorization(schedulerKey, () => {
    effects += 1;
    return new Response("sent");
  });
  const response = await handler(new Request("https://example.test/scheduled", {
    headers: { Authorization: `Bearer ${schedulerKey}` },
  }));
  if (response.status !== 405 || response.headers.get("allow") !== "POST" || effects !== 0) {
    throw new Error("Non-POST scheduler request caused a side effect");
  }
});
