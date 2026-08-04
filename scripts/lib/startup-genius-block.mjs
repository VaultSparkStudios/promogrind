export function renderStartupGeniusBlock(markdown, { top, row, blank, bot, now = Date.now() }) {
  const entries = [];
  const pattern = /##\s+([^\n]+)\n\n\*\*Tier:\*\*.*?\n\n([^\n]+)(?:\n\n```bash\n([^\n]+)\n```)?/g;
  let match;
  while ((match = pattern.exec(markdown)) !== null && entries.length < 5) {
    entries.push({ title: match[1].trim(), summary: match[2].trim(), command: match[3]?.trim() || null });
  }
  if (entries.length === 0) return '';

  const out = [top('GENIUS HIT LIST')];
  const rankMatch = markdown.match(/\*\*Rank source:\*\*\s*(\w+)/i);
  if (rankMatch) {
    const source = rankMatch[1].toLowerCase();
    const generated = markdown.match(/\*\*Generated:\*\*\s*(\S+)/)?.[1];
    const ageDays = generated ? (now - new Date(generated).getTime()) / 86_400_000 : NaN;
    const age = Number.isNaN(ageDays) ? '' : ` · ${ageDays < 1 ? '<1' : Math.round(ageDays)}d old`;
    out.push(row(`${source === 'live' ? '✓' : '⚠'} rank source: ${source}${age}`), blank());
  }
  for (const entry of entries) {
    out.push(row(entry.title), row(entry.summary));
    if (entry.command) out.push(row(`↳ ${entry.command}`));
    out.push(blank());
  }
  out.push(bot());
  return out.join('\n');
}
