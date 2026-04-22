const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";

export function readDailyUsage(prefix, date = new Date()) {
  const key = `${prefix}_${date.toISOString().slice(0, 10)}`;
  try {
    return Number.parseInt(localStorage.getItem(key) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function writeDailyUsage(prefix, value, date = new Date()) {
  const key = `${prefix}_${date.toISOString().slice(0, 10)}`;
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore storage failures
  }
}

export function incrementDailyUsage(prefix, date = new Date()) {
  const next = readDailyUsage(prefix, date) + 1;
  writeDailyUsage(prefix, next, date);
  return next;
}

export function readJsonCache(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJsonCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

export async function invokeProjectFunction(supabase, functionName, { session = null, body = {} } = {}) {
  const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  const { data, error } = await supabase.functions.invoke(functionName, {
    headers,
    body,
  });
  if (error) throw error;
  return data;
}

export async function streamProjectFunction(functionName, {
  session,
  body = {},
  onDelta = () => {},
  onDone = () => {},
} = {}) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson?.error || `HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = JSON.parse(line.slice(6));
      if (payload.type === "delta") onDelta(payload);
      if (payload.type === "done") onDone(payload);
    }
  }
}

export function hasStreamingGateway() {
  return Boolean(SUPABASE_URL);
}

