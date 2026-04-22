import fs from 'fs';

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
