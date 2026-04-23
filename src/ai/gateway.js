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

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableSort(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function buildCacheKey(prefix, payload = {}) {
  return `${prefix}:${JSON.stringify(stableSort(payload))}`;
}

export function readTimedCache(key, maxAgeMs, fallback = null) {
  const cached = readJsonCache(key, null);
  if (!cached || typeof cached !== "object") return fallback;
  if (!cached.cachedAt || Date.now() - cached.cachedAt > maxAgeMs) return fallback;
  return cached.value ?? fallback;
}

export function writeTimedCache(key, value) {
  writeJsonCache(key, {
    cachedAt: Date.now(),
    value,
  });
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

const RETRY_DELAYS = [1000, 3000];

export async function streamProjectFunction(functionName, {
  session,
  body = {},
  signal = null,
  onDelta = () => {},
  onDone = () => {},
} = {}) {
  let attempt = 0;

  while (true) {
    if (signal?.aborted) return;

    let response;
    try {
      response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      if (attempt < RETRY_DELAYS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt++]));
        continue;
      }
      throw err;
    }

    if (!response.ok || !response.body) {
      const errJson = await response.json().catch(() => ({}));
      const err = new Error(errJson?.error || `HTTP ${response.status}`);
      if (response.status >= 500 && attempt < RETRY_DELAYS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt++]));
        continue;
      }
      throw err;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
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
    } catch (err) {
      if (err.name === "AbortError") return;
      throw err;
    }

    return;
  }
}

export function hasStreamingGateway() {
  return Boolean(SUPABASE_URL);
}
