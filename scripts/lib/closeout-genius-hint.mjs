export function buildCloseoutGeniusHint(cache) {
  const ranked = cache?.list?.ranked;
  if (!Array.isArray(ranked)) return { state: 'missing' };
  if (ranked.length === 0) return { state: 'exhausted' };

  const top = ranked[0];
  return {
    state: 'item',
    title: top.title || top.id,
    rationale: top.rationale || '',
    cmd: top.command || null,
  };
}
