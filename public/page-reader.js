(() => {
  const root = document.documentElement;
  let theme = 'dark';
  try {
    const saved = localStorage.getItem('pg_theme');
    theme = saved === 'light' || saved === 'dark' ? saved : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  } catch { /* Reading a page still works when browser storage is unavailable. */ }
  root.dataset.pgTheme = theme;
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('[data-pg-theme-toggle]');
    if (!button) return;
    const updateLabel = () => {
      button.textContent = root.dataset.pgTheme === 'light' ? 'Dark theme' : 'Light theme';
      button.setAttribute('aria-label', `Switch to ${root.dataset.pgTheme === 'light' ? 'dark' : 'light'} theme`);
    };
    updateLabel();
    button.addEventListener('click', () => {
      root.dataset.pgTheme = root.dataset.pgTheme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('pg_theme', root.dataset.pgTheme); } catch { /* Theme works for this visit. */ }
      updateLabel();
    });
  });
})();
