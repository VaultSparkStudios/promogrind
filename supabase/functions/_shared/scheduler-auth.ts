/** Scheduled dispatchers run with admin authority and must authenticate before any side effect. */
export function withSchedulerAuthorization(
  serviceRoleKey: string,
  handler: (request: Request) => Response | Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    // No arbitrary JWT, substring match, or caller-supplied cron header grants admin authority.
    if (!serviceRoleKey || request.headers.get("authorization") !== `Bearer ${serviceRoleKey}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
    }
    return await handler(request);
  };
}
