import fs from 'fs';
import path from 'path';

export function eventsPath(root) {
  return path.join(root, 'portfolio', 'events.ndjson');
}

export function readEvents(root) {
  const filePath = eventsPath(root);
  try {
    return fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

export function appendEvent(root, event) {
  const filePath = eventsPath(root);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload = {
    ts: new Date().toISOString(),
    schemaVersion: '1.0',
    ...event
  };
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`);
  return payload;
}

export function latestEvents(root, days = 30) {
  const cutoff = Date.now() - days * 86400_000;
  return readEvents(root).filter((event) => {
    const ts = new Date(event.ts || 0).getTime();
    return Number.isFinite(ts) && ts >= cutoff;
  });
}
