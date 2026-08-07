// PromoGrind — Email Capture Interstitial
// Usage: set window.PG_REDIRECT_URL before including this script.
// window.PG_SOURCE is optional (e.g. 'seo-bonus-bet') for tracking.
(function () {
  'use strict';

  const SUPABASE_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  function getSupabaseAnonKey() {
    var meta = document.querySelector('meta[name="pg-supabase-anon-key"]');
    var key = window.PG_SUPABASE_ANON_KEY || (meta && meta.content) || '';
    return key && !/placeholder/i.test(key) ? key : '';
  }
  const ANON_KEY = getSupabaseAnonKey();
  const REDIRECT_URL = window.PG_REDIRECT_URL || 'https://promogrind.bet/';

  // Skip on return visits
  try {
    if (localStorage.getItem('pg_email_captured')) {
      setTimeout(function () { window.location.href = REDIRECT_URL; }, 80);
      return;
    }
  } catch (e) {}

  var countdown = 5;
  var timer;

  var style = document.createElement('style');
  style.textContent = [
    '#pg-cap{position:fixed;inset:0;background:rgba(10,14,23,0.96);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:"SF Mono","Fira Code",monospace;padding:16px}',
    '#pg-box{background:#0f1520;border:1px solid #1e293b;border-radius:12px;padding:32px;max-width:420px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.6)}',
    '#pg-box h2{font-family:"Space Grotesk","SF Pro Display",sans-serif;font-size:20px;font-weight:700;color:#e2e8f0;margin:0 0 8px}',
    '#pg-box p{font-size:12px;color:#64748b;line-height:1.6;margin:0 0 20px}',
    '#pg-logo{font-size:11px;color:#4ade80;font-weight:700;letter-spacing:-0.5px;margin-bottom:16px}',
    '#pg-inp{width:100%;padding:10px 12px;background:#0a0e17;border:1px solid #1e293b;border-radius:6px;color:#e2e8f0;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:10px}',
    '#pg-btn{width:100%;padding:12px;background:#4ade80;border:none;border-radius:6px;color:#0a0e17;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;margin-bottom:12px}',
    '#pg-btn:disabled{opacity:0.7;cursor:not-allowed}',
    '#pg-skip{display:block;text-align:center;font-size:11px;color:#334155;cursor:pointer;background:none;border:none;font-family:inherit;width:100%}',
    '#pg-skip:hover{color:#64748b}',
    '#pg-ok{text-align:center;padding:20px 0;color:#4ade80;font-weight:700;font-size:14px}',
  ].join('');
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.id = 'pg-cap';
  overlay.innerHTML = [
    '<div id="pg-box">',
    '<div id="pg-logo">⚡ PromoGrind</div>',
    '<h2>Get free weekly promo tips</h2>',
    '<p>The best bonus bet opportunities, arb alerts, and promo strategies — straight to your inbox. No spam, unsubscribe anytime.</p>',
    '<input id="pg-inp" type="email" placeholder="your@email.com" autocomplete="email"/>',
    '<button id="pg-btn">Subscribe &amp; Continue →</button>',
    '<button id="pg-skip">Skip — continue in <span id="pg-cd">5</span>s</button>',
    '</div>',
  ].join('');
  document.body.appendChild(overlay);

  function redirect() {
    clearInterval(timer);
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s';
    setTimeout(function () { window.location.href = REDIRECT_URL; }, 200);
  }

  function subscribe() {
    if (!ANON_KEY) { redirect(); return; }
    var email = document.getElementById('pg-inp').value.trim();
    if (!email.includes('@')) return;
    var btn = document.getElementById('pg-btn');
    btn.textContent = 'Subscribing\u2026';
    btn.disabled = true;
    fetch(SUPABASE_URL + '/rest/v1/newsletter_subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ email: email, source: window.PG_SOURCE || 'seo', created_at: new Date().toISOString() }),
    }).then(function (response) {
      if (!response.ok) throw new Error('capture request failed');
      try { localStorage.setItem('pg_email_captured', '1'); } catch (e) {}
      var box = document.getElementById('pg-box');
      box.innerHTML = '<div id="pg-ok">\u2713 You\'re in! Taking you to PromoGrind\u2026</div>';
      setTimeout(redirect, 1200);
    }).catch(function () {
      btn.textContent = 'Try again';
      btn.disabled = false;
      var copy = document.querySelector('#pg-box p');
      if (copy) copy.textContent = 'Signup could not be confirmed. Check your connection and try again.';
    });
  }

  if (!ANON_KEY) {
    var disabledBtn = document.getElementById('pg-btn');
    disabledBtn.textContent = 'Email signup unavailable';
    disabledBtn.disabled = true;
  }

  document.getElementById('pg-btn').addEventListener('click', subscribe);
  document.getElementById('pg-skip').addEventListener('click', redirect);
  document.getElementById('pg-inp').addEventListener('keydown', function (e) { if (e.key === 'Enter') subscribe(); });

  timer = setInterval(function () {
    countdown--;
    var el = document.getElementById('pg-cd');
    if (el) el.textContent = countdown;
    if (countdown <= 0) redirect();
  }, 1000);
})();
