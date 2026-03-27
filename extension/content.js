// PromoGrind Extension — Content Script
// Injects a floating sidebar trigger on sportsbook pages

(function () {
  'use strict';

  const APP_BASE = 'https://vaultsparkstudios.com/promogrind/';

  // Detect book from current URL
  function getBook() {
    const u = window.location.href;
    if (u.includes('draftkings.com'))     return { name: 'DraftKings',  color: '#53d769', slug: 'DK' };
    if (u.includes('fanduel.com'))        return { name: 'FanDuel',     color: '#1493ff', slug: 'FD' };
    if (u.includes('betmgm.com'))         return { name: 'BetMGM',      color: '#c4a44a', slug: 'MGM' };
    if (u.includes('caesars.com'))        return { name: 'Caesars',     color: '#2d9b4e', slug: 'CZR' };
    if (u.includes('bet365.com'))         return { name: 'bet365',      color: '#027b5b', slug: '365' };
    if (u.includes('espnbet.com'))        return { name: 'ESPN BET',    color: '#cc0000', slug: 'ESPN' };
    if (u.includes('fanaticssportsbook')) return { name: 'Fanatics',    color: '#e44d26', slug: 'FAN' };
    if (u.includes('betrivers.com'))      return { name: 'BetRivers',   color: '#0066cc', slug: 'BR' };
    if (u.includes('williamhill.com'))    return { name: 'William Hill',color: '#6b2d8b', slug: 'WH' };
    if (u.includes('paddypower.com'))     return { name: 'Paddy Power', color: '#009a44', slug: 'PP' };
    if (u.includes('skybet.com'))         return { name: 'Sky Bet',     color: '#00aaff', slug: 'SB' };
    if (u.includes('betway.com'))         return { name: 'Betway',      color: '#00a651', slug: 'BW' };
    return { name: 'Sportsbook', color: '#60a5fa', slug: 'PG' };
  }

  const CALCULATORS = [
    { id: 'bonus-bet',    label: '🎫 Bonus Bet Converter',  slug: 'bonus-bet',    desc: 'Convert free bets to cash' },
    { id: 'profit-boost', label: '🚀 Profit Boost',          slug: 'profit-boost', desc: 'Lock in boosted odds profit' },
    { id: 'first-bet',    label: '🛡️ First Bet Safety Net',  slug: 'first-bet',    desc: 'Hedge your insurance bet' },
    { id: 'no-vig',       label: '📐 No-Vig Fair Odds',      slug: 'no-vig',       desc: 'Remove the juice' },
    { id: 'ev',           label: '📈 +EV Calculator',        slug: 'ev',           desc: 'Find positive expected value' },
    { id: 'arb-2way',     label: '⚖️ Arbitrage',              slug: 'arb-2way',     desc: 'Lock in guaranteed profit' },
  ];

  function openCalc(slug) {
    window.open(APP_BASE + '#/' + slug, '_blank', 'noopener');
  }

  function buildPanel(book) {
    const panel = document.createElement('div');
    panel.id = '__promogrind_panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 0;
      width: 280px;
      background: #0f1520;
      border: 1px solid #1e293b;
      border-right: none;
      border-radius: 10px 0 0 10px;
      box-shadow: -4px 0 24px rgba(0,0,0,0.5);
      font-family: 'SF Mono', 'Fira Code', monospace;
      z-index: 2147483646;
      transform: translateX(100%);
      transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
      overflow: hidden;
    `;

    panel.innerHTML = `
      <div style="background:#0a0e17;padding:12px 14px;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:14px;font-weight:700;color:#4ade80;letter-spacing:-0.5px;">⚡ PromoGrind</span>
          <span style="font-size:9px;padding:2px 6px;background:#53d76915;border:1px solid #53d76930;border-radius:50px;color:${book.color};font-weight:700;">${book.name}</span>
        </div>
        <button id="__pg_close" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:14px;padding:0;line-height:1;">✕</button>
      </div>
      <div style="padding:10px;">
        <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Quick Calculators</div>
        ${CALCULATORS.map(c => `
          <button data-slug="${c.slug}" class="__pg_calc_btn" style="
            display:flex;align-items:center;justify-content:space-between;
            width:100%;padding:9px 10px;margin-bottom:4px;
            background:#161d2a;border:1px solid #1e293b;border-radius:6px;
            color:#e2e8f0;cursor:pointer;text-align:left;
            font-family:'SF Mono','Fira Code',monospace;
            transition:border-color 0.15s,background 0.15s;
          ">
            <span style="font-size:11px;font-weight:600;">${c.label}</span>
            <span style="font-size:9px;color:#64748b;">→</span>
          </button>
        `).join('')}
        <div style="height:1px;background:#1e293b;margin:10px 0;"></div>
        <button id="__pg_open_full" style="
          width:100%;padding:10px;
          background:#4ade8015;border:1px solid #4ade8030;border-radius:6px;
          color:#4ade80;font-size:11px;font-weight:700;cursor:pointer;
          font-family:'SF Mono','Fira Code',monospace;letter-spacing:0.5px;
        ">Open Full PromoGrind →</button>
        <div style="margin-top:8px;font-size:9px;color:#334155;text-align:center;line-height:1.5;">
          Free calculator · No ads · 27 tools
        </div>
      </div>
    `;

    // Events
    panel.querySelector('#__pg_close').onclick = () => hidePanel();
    panel.querySelector('#__pg_open_full').onclick = () => window.open(APP_BASE, '_blank', 'noopener');
    panel.querySelectorAll('.__pg_calc_btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#1c2536';
        btn.style.borderColor = '#334155';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#161d2a';
        btn.style.borderColor = '#1e293b';
      });
      btn.onclick = () => {
        openCalc(btn.dataset.slug);
        hidePanel();
      };
    });

    return panel;
  }

  function buildTrigger(book) {
    const trigger = document.createElement('button');
    trigger.id = '__promogrind_trigger';
    trigger.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 0;
      width: 36px;
      height: 64px;
      background: #0f1520;
      border: 1px solid #1e293b;
      border-right: none;
      border-radius: 8px 0 0 8px;
      color: #4ade80;
      cursor: pointer;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      box-shadow: -2px 0 12px rgba(0,0,0,0.4);
      transition: width 0.15s;
      font-family: 'SF Mono', monospace;
    `;
    trigger.innerHTML = `
      <span style="font-size:13px;">⚡</span>
      <span style="font-size:7px;font-weight:700;color:#4ade80;letter-spacing:0.5px;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);">PG</span>
    `;
    trigger.title = 'PromoGrind Calculator';
    return trigger;
  }

  let panelOpen = false;
  let panel = null;
  let trigger = null;

  function showPanel() {
    if (panel) {
      panel.style.transform = 'translateX(0)';
      trigger.style.display = 'none';
      panelOpen = true;
    }
  }

  function hidePanel() {
    if (panel) {
      panel.style.transform = 'translateX(100%)';
      trigger.style.display = 'flex';
      panelOpen = false;
    }
  }

  function init() {
    if (document.getElementById('__promogrind_trigger')) return;

    const book = getBook();
    trigger = buildTrigger(book);
    panel = buildPanel(book);

    document.body.appendChild(panel);
    document.body.appendChild(trigger);

    trigger.onclick = showPanel;

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (panelOpen && !panel.contains(e.target) && e.target !== trigger) {
        hidePanel();
      }
    });
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay so the page's own UI loads first
    setTimeout(init, 1200);
  }
})();
