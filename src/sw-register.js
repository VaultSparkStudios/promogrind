export function registerSW() {
  if ('serviceWorker' in navigator) {
    const base = import.meta.env.VITE_APP_BASE_PATH || '/';
    const swUrl = base.endsWith('/') ? base + 'sw.js' : base + '/sw.js';
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl, { scope: base })
        .catch(() => {}); // silently fail — app still works without SW
    });
  }
}
