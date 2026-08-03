export const STUDIO_RIGHTS_TEXT = '© 2026 VaultSpark Studios LLC. All rights reserved.';
export const STUDIO_URL = 'https://vaultsparkstudios.com/';
export const STUDIO_FOOTER_MARKUP = `<p data-vaultspark-studio-footer="2026" style="margin:.75rem 0 0;color:inherit;font-size:.8rem;opacity:.78">© 2026 <a href="${STUDIO_URL}" rel="author">VaultSpark Studios LLC</a>. All rights reserved.</p>`;

export function visibleText(html) {
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&copy;/gi, '©')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

export function inspectStudioFooter(html) {
  const text = visibleText(html);
  const occurrences = text.split(STUDIO_RIGHTS_TEXT).length - 1;
  const linked = /<a\b[^>]*href=["']https:\/\/vaultsparkstudios\.com\/?["'][^>]*>\s*VaultSpark Studios(?: LLC)?\s*<\/a>/i.test(String(html));
  return {
    ok: occurrences === 1 && linked,
    occurrences,
    linked,
    marker: /data-vaultspark-studio-footer=["']2026["']/i.test(String(html)),
  };
}

export function applyStudioFooter(html) {
  const source = String(html);
  const before = inspectStudioFooter(source);
  if (before.ok) return { html: source, changed: false, before, after: before };
  if (before.occurrences > 1) return { html: source, changed: false, refused: 'duplicate-rights-text', before, after: before };

  let next = source;
  if (before.occurrences === 1) {
    next = next.replace(
      /(?:©|&copy;)\s*2026\s+VaultSpark Studios LLC\.\s*All rights reserved\./i,
      STUDIO_FOOTER_MARKUP,
    );
  } else if (/<\/footer\s*>/i.test(next)) {
    next = next.replace(/<\/footer\s*>/i, `${STUDIO_FOOTER_MARKUP}\n</footer>`);
  } else if (/<\/body\s*>/i.test(next)) {
    next = next.replace(/<\/body\s*>/i, `<footer data-vaultspark-studio-footer-container style="max-width:1100px;margin:2rem auto;padding:1rem 1.25rem;border-top:1px solid currentColor;opacity:.78">${STUDIO_FOOTER_MARKUP}</footer>\n</body>`);
  } else {
    next += `\n<footer data-vaultspark-studio-footer-container>${STUDIO_FOOTER_MARKUP}</footer>\n`;
  }
  return { html: next, changed: next !== source, before, after: inspectStudioFooter(next) };
}
