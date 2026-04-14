// PromoGrind Extension — Content Script
// Injects a floating sidebar trigger on sportsbook pages

(function () {
  'use strict';

  const APP_BASE = 'https://promogrind.bet/';

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

  // Auto-fill state: detected stake/odds from active bet slip
  var autoFill = { stake: null, odds: null };

  function makeEl(tag, options) {
    const el = document.createElement(tag);
    if (!options) return el;
    if (options.id) el.id = options.id;
    if (options.className) el.className = options.className;
    if (options.text) el.textContent = options.text;
    if (options.style) el.style.cssText = options.style;
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => el.setAttribute(key, value));
    }
    return el;
  }

  function detectBetSlip() {
    var stakeEl = (
      document.querySelector('[data-testid="bet-slip-wager-input"]') ||
      document.querySelector('[aria-label*="Bet Amount" i]') ||
      document.querySelector('input[placeholder*="Wager" i]') ||
      document.querySelector('input[placeholder*="amount" i][type="number"]') ||
      document.querySelector('.betslip-stake input') ||
      document.querySelector('[class*="betslip" i] input[type="number"]')
    );
    var oddsEl = (
      document.querySelector('[data-testid="outcome-odds"]') ||
      document.querySelector('[class*="odds-value" i]') ||
      document.querySelector('[class*="outcomeOdds" i]') ||
      document.querySelector('[aria-label*="odds" i]')
    );

    var stake = stakeEl ? stakeEl.value || stakeEl.textContent || null : null;
    var oddsText = oddsEl ? (oddsEl.value || oddsEl.textContent || '').trim() : '';
    // Validate odds format: +150, -110, etc.
    var oddsMatch = oddsText.match(/[+-]\d{3,4}/);
    var odds = oddsMatch ? oddsMatch[0] : null;

    var changed = stake !== autoFill.stake || odds !== autoFill.odds;
    autoFill.stake = stake || null;
    autoFill.odds = odds || null;

    if (changed && panel) {
      var indicator = panel.querySelector('#__pg_autofill');
      if (autoFill.stake || autoFill.odds) {
        if (!indicator) {
          var hdr = panel.querySelector('#__pg_close');
          if (hdr) {
            indicator = document.createElement('span');
            indicator.id = '__pg_autofill';
            indicator.style.cssText = 'font-size:9px;color:#4ade80;font-weight:700;padding:2px 6px;background:#1e3a2f;border-radius:4px;';
            indicator.textContent = '⚡ Auto-fill ready';
            hdr.parentNode.insertBefore(indicator, hdr);
          }
        }
      } else if (indicator) {
        indicator.remove();
      }
    }
  }

  function openCalc(slug) {
    var params = [];
    if (autoFill.stake) params.push('sz=' + encodeURIComponent(autoFill.stake));
    if (autoFill.odds) params.push('bo=' + encodeURIComponent(autoFill.odds));
    var query = params.length ? '?' + params.join('&') : '';
    window.open(APP_BASE + query + '#/' + slug, '_blank', 'noopener');
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

    const header = makeEl('div', {
      style: 'background:#0a0e17;padding:12px 14px;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;',
    });
    const brandWrap = makeEl('div', { style: 'display:flex;align-items:center;gap:8px;' });
    const brand = makeEl('span', {
      text: '⚡ PromoGrind',
      style: 'font-size:14px;font-weight:700;color:#4ade80;letter-spacing:-0.5px;',
    });
    const badge = makeEl('span', {
      text: book.name,
      style: `font-size:9px;padding:2px 6px;background:#53d76915;border:1px solid #53d76930;border-radius:50px;color:${book.color};font-weight:700;`,
    });
    const close = makeEl('button', {
      id: '__pg_close',
      text: '✕',
      style: 'background:none;border:none;color:#64748b;cursor:pointer;font-size:14px;padding:0;line-height:1;',
    });
    brandWrap.appendChild(brand);
    brandWrap.appendChild(badge);
    header.appendChild(brandWrap);
    header.appendChild(close);

    const body = makeEl('div', { style: 'padding:10px;' });
    body.appendChild(makeEl('div', {
      text: 'Quick Calculators',
      style: 'font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;',
    }));

    CALCULATORS.forEach((calc) => {
      const button = makeEl('button', {
        className: '__pg_calc_btn',
        style: "display:flex;align-items:center;justify-content:space-between;width:100%;padding:9px 10px;margin-bottom:4px;background:#161d2a;border:1px solid #1e293b;border-radius:6px;color:#e2e8f0;cursor:pointer;text-align:left;font-family:'SF Mono','Fira Code',monospace;transition:border-color 0.15s,background 0.15s;",
        attrs: { 'data-slug': calc.slug },
      });
      button.appendChild(makeEl('span', {
        text: calc.label,
        style: 'font-size:11px;font-weight:600;',
      }));
      button.appendChild(makeEl('span', {
        text: '→',
        style: 'font-size:9px;color:#64748b;',
      }));
      body.appendChild(button);
    });

    body.appendChild(makeEl('div', { style: 'height:1px;background:#1e293b;margin:10px 0;' }));
    body.appendChild(makeEl('button', {
      id: '__pg_open_full',
      text: 'Open Full PromoGrind →',
      style: "width:100%;padding:10px;background:#4ade8015;border:1px solid #4ade8030;border-radius:6px;color:#4ade80;font-size:11px;font-weight:700;cursor:pointer;font-family:'SF Mono','Fira Code',monospace;letter-spacing:0.5px;",
    }));
    body.appendChild(makeEl('div', {
      text: 'Free calculator · No ads · 27 tools',
      style: 'margin-top:8px;font-size:9px;color:#334155;text-align:center;line-height:1.5;',
    }));

    panel.appendChild(header);
    panel.appendChild(body);

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
    trigger.appendChild(makeEl('span', { text: '⚡', style: 'font-size:13px;' }));
    trigger.appendChild(makeEl('span', {
      text: 'PG',
      style: 'font-size:7px;font-weight:700;color:#4ade80;letter-spacing:0.5px;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);',
    }));
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

    // Poll for bet slip data every 2s
    setInterval(detectBetSlip, 2000);

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
