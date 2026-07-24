function sanitizeContext(context = {}) {
  return Object.fromEntries(Object.entries(context || {}).slice(0, 12).map(([key, value]) => [
    String(key).slice(0, 80),
    typeof value === "string" ? value.slice(0, 500) : value,
  ]));
}

export function createTelemetryBuffer(limit = 10) {
  const capacity = Math.max(1, Number(limit) || 10);
  const queue = [];
  return {
    push(error, context = {}) {
      queue.push({ error, context: sanitizeContext(context) });
      while (queue.length > capacity) queue.shift();
      return queue.length;
    },
    drain(handler) {
      const pending = queue.splice(0);
      let delivered = 0;
      for (const item of pending) {
        try { handler(item.error, item.context); delivered += 1; }
        catch { queue.push(item); }
      }
      while (queue.length > capacity) queue.shift();
      return delivered;
    },
    get size() { return queue.length; },
  };
}
