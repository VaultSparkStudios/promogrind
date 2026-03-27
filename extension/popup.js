// PromoGrind Extension — Popup Script

const APP_BASE = 'https://vaultsparkstudios.com/promogrind/';

const BOOK_MAP = {
  'draftkings.com':      { name: 'DraftKings',   color: '#53d769', calcs: ['bonus-bet', 'profit-boost'] },
  'fanduel.com':         { name: 'FanDuel',      color: '#1493ff', calcs: ['first-bet', 'profit-boost'] },
  'betmgm.com':          { name: 'BetMGM',       color: '#c4a44a', calcs: ['first-bet', 'bonus-bet'] },
  'caesars.com':         { name: 'Caesars',      color: '#2d9b4e', calcs: ['profit-boost', 'bonus-bet'] },
  'bet365.com':          { name: 'bet365',       color: '#027b5b', calcs: ['bonus-bet', 'ev'] },
  'espnbet.com':         { name: 'ESPN BET',     color: '#cc0000', calcs: ['profit-boost', 'bonus-bet'] },
  'fanaticssportsbook':  { name: 'Fanatics',     color: '#e44d26', calcs: ['bonus-bet', 'profit-boost'] },
  'betrivers.com':       { name: 'BetRivers',    color: '#0066cc', calcs: ['first-bet', 'bonus-bet'] },
  'williamhill.com':     { name: 'William Hill', color: '#6b2d8b', calcs: ['bonus-bet', 'ev'] },
  'paddypower.com':      { name: 'Paddy Power',  color: '#009a44', calcs: ['bonus-bet', 'ev'] },
  'skybet.com':          { name: 'Sky Bet',      color: '#00aaff', calcs: ['bonus-bet', 'profit-boost'] },
  'betway.com':          { name: 'Betway',       color: '#00a651', calcs: ['bonus-bet', 'ev'] },
};

const CALC_LABELS = {
  'bonus-bet':    '🎫 Bonus Bet Converter',
  'profit-boost': '🚀 Profit Boost',
  'first-bet':    '🛡️ First Bet Safety Net',
  'no-vig':       '📐 No-Vig Fair Odds',
  'ev':           '📈 +EV Calculator',
  'arb-2way':     '⚖️ Arbitrage',
};

function openCalc(slug) {
  chrome.tabs.create({ url: APP_BASE + '#/' + slug });
  window.close();
}

function detectBookFromUrl(url) {
  for (const [domain, data] of Object.entries(BOOK_MAP)) {
    if (url.includes(domain)) return data;
  }
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  // Open full app button
  document.getElementById('open-full').addEventListener('click', () => {
    chrome.tabs.create({ url: APP_BASE });
    window.close();
  });

  // All calc buttons
  document.querySelectorAll('.calc-btn[data-calc]').forEach(btn => {
    btn.addEventListener('click', () => openCalc(btn.dataset.calc));
  });

  // Detect current tab's book
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const url = tabs[0].url || '';
    const book = detectBookFromUrl(url);

    if (book) {
      const bookSection = document.getElementById('book-section');
      const bookBadge = document.getElementById('book-badge');
      const suggestedCalcs = document.getElementById('suggested-calcs');

      bookSection.style.display = 'block';
      bookBadge.textContent = book.name;
      bookBadge.style.color = book.color;
      bookBadge.style.borderColor = book.color + '50';
      bookBadge.style.background = book.color + '12';

      // Show suggested calculators for this book
      suggestedCalcs.innerHTML = book.calcs.map(slug => `
        <button class="calc-btn" data-calc="${slug}" style="background:#0f1520;border-color:${book.color}30;">
          <div>
            <div style="color:${book.color};">${CALC_LABELS[slug] || slug}</div>
          </div>
          <span class="arrow" style="color:${book.color}60;">→</span>
        </button>
      `).join('');

      suggestedCalcs.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('click', () => openCalc(btn.dataset.calc));
      });
    }
  });
});
