// PromoGrind Extension — Service Worker (Manifest V3)

const APP_BASE = 'https://vaultsparkstudios.com/promogrind/';

const CALC_URLS = {
  'bonus-bet':    APP_BASE + '#/bonus-bet',
  'profit-boost': APP_BASE + '#/profit-boost',
  'first-bet':    APP_BASE + '#/first-bet',
  'no-vig':       APP_BASE + '#/no-vig',
  'ev':           APP_BASE + '#/ev',
  'arb-2way':     APP_BASE + '#/arb-2way',
  'kelly':        APP_BASE + '#/kelly',
  'parlay':       APP_BASE + '#/parlay-builder',
};

// Detect which book the user is on
function detectBook(url) {
  if (url.includes('draftkings.com'))     return { name: 'DraftKings',  color: '#53d769', promos: ['bonus-bet', 'profit-boost'] };
  if (url.includes('fanduel.com'))        return { name: 'FanDuel',     color: '#1493ff', promos: ['first-bet', 'profit-boost'] };
  if (url.includes('betmgm.com'))         return { name: 'BetMGM',      color: '#c4a44a', promos: ['first-bet', 'bonus-bet'] };
  if (url.includes('caesars.com'))        return { name: 'Caesars',     color: '#2d9b4e', promos: ['profit-boost', 'bonus-bet'] };
  if (url.includes('bet365.com'))         return { name: 'bet365',      color: '#027b5b', promos: ['bonus-bet', 'ev'] };
  if (url.includes('espnbet.com'))        return { name: 'ESPN BET',    color: '#d00',    promos: ['profit-boost', 'bonus-bet'] };
  if (url.includes('fanaticssportsbook')) return { name: 'Fanatics',    color: '#e44d26', promos: ['bonus-bet', 'profit-boost'] };
  if (url.includes('betrivers.com'))      return { name: 'BetRivers',   color: '#0066cc', promos: ['first-bet', 'bonus-bet'] };
  if (url.includes('williamhill.com'))    return { name: 'William Hill',color: '#6b2d8b', promos: ['bonus-bet', 'ev'] };
  if (url.includes('paddypower.com'))     return { name: 'Paddy Power', color: '#009a44', promos: ['bonus-bet', 'ev'] };
  if (url.includes('skybet.com'))         return { name: 'Sky Bet',     color: '#00aaff', promos: ['bonus-bet', 'profit-boost'] };
  if (url.includes('betway.com'))         return { name: 'Betway',      color: '#00a651', promos: ['bonus-bet', 'ev'] };
  return null;
}

// Handle messages from content script / popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_CALC') {
    const url = CALC_URLS[msg.calc] || APP_BASE;
    chrome.tabs.create({ url });
    sendResponse({ ok: true });
  }
  if (msg.type === 'DETECT_BOOK') {
    const book = detectBook(msg.url);
    sendResponse({ book });
  }
  if (msg.type === 'OPEN_APP') {
    chrome.tabs.create({ url: APP_BASE });
    sendResponse({ ok: true });
  }
  return true; // keep channel open for async
});

// On install: set badge
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '⚡' });
  chrome.action.setBadgeBackgroundColor({ color: '#4ade80' });
});
