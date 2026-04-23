import fs from 'fs';
import path from 'path';

export function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

export function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

export function readProjectText(root, relPath, fallback = '') {
  return readText(path.join(root, relPath)) || fallback;
}

export function readProjectJson(root, relPath, fallback = {}) {
  return readJson(path.join(root, relPath), fallback);
}

export function extractSection(content, heading) {
  const parts = String(content || '').split(/^## /m);
  const match = parts.find((part) => part.startsWith(heading));
  if (!match) return '';
  const newline = match.indexOf('\n');
  return newline === -1 ? '' : match.slice(newline + 1);
}

export function extractBetween(content, start, end) {
  const source = String(content || '');
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return '';
  return source.slice(startIndex + start.length, endIndex).trim();
}

export function parseSessionLock(content) {
  const out = {};
  for (const raw of String(content || '').split(/\r?\n/)) {
    const line = raw.trim();
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

export function readSessionLock(root, relPath = 'context/.session-lock') {
  return parseSessionLock(readProjectText(root, relPath));
}

export function extractRollingStatusHeader(content, limit = 7) {
  const m = String(content || '').match(/<!-- rolling-status-start -->([\s\S]*?)<!-- rolling-status-end -->/);
  return (m?.[1] || '').trim().split(/\r?\n/).filter(Boolean).slice(0, limit);
}
