export function escapeHtmlAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function injectCaptureMeta(html, anonKey) {
  if (!html.includes('/js/pg-capture.js') || !anonKey) return html;
  const meta = `<meta name="pg-supabase-anon-key" content="${escapeHtmlAttribute(anonKey)}">`;
  if (/<meta[^>]+name=["']pg-supabase-anon-key["']/i.test(html)) {
    return html.replace(/<meta[^>]+name=["']pg-supabase-anon-key["'][^>]*>/i, meta);
  }
  return html.includes('</head>') ? html.replace('</head>', `  ${meta}\n</head>`) : `${meta}\n${html}`;
}
