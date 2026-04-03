/**
 * VaultSDK — VaultSpark Studios cross-project membership SDK
 * Version: 2026-04-03
 *
 * Self-contained browser script. No build step, no framework.
 * Exposes window.VaultSDK
 *
 * Usage:
 *   <script src="/assets/vault-sdk.js"></script>
 *   <script>
 *     VaultSDK.init('my_project_key', {
 *       requireAuth: true,
 *       onReady: function(member) { console.log(member); },
 *       onAuthRequired: function() { window.location.href = '/vault-member/?next=' + encodeURIComponent(location.href); }
 *     });
 *   </script>
 *
 *   DOM gates:
 *   <div data-vault-requires="vault_sparked" data-vault-gate-action="hide">...secret content...</div>
 *   <div data-vault-requires="vault_sparked_pro" data-vault-gate-action="blur">...pro content...</div>
 *   <div data-vault-requires="pro_cross_product" data-vault-gate-action="replace">...pro content...</div>
 */

(function (global) {
  'use strict';

  var SUPABASE_URL  = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbnB6amp5aG5wbXVuZm95Y3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MDYxOTcsImV4cCI6MjA1ODQ4MjE5N30.kCTCm73J0AeN0-hTlZ98ZEL7kdZ7YbKSnJVt35lGCeQ';

  // ── Feature gates (inline, plan-key based) ────────────────────
  // key → minimum plan key required (checked via PLAN_ORDER)
  var PLAN_ORDER = { free: 0, promogrind_pro: 1, vault_sparked: 2, vault_sparked_pro: 3 };

  var FEATURE_GATES = {
    classified_archive_full: 'vault_sparked',
    beta_priority:           'vault_sparked',
    sparked_badge:           'vault_sparked',
    promoGrind_live_tools:   'vault_sparked',
    pro_cross_product:       'vault_sparked_pro',
    pro_beta_builds:         'vault_sparked_pro',
    pro_discord_role:        'vault_sparked_pro',
    pro_founder_video:       'vault_sparked_pro',
    pro_studio_credits:      'vault_sparked_pro',
  };

  // ── Internal state ────────────────────────────────────────────
  var _client    = null;
  var _session   = null;
  var _member    = null;
  var _projectKey = null;
  var _initialized = false;

  // ── Supabase REST helpers (no SDK dependency) ─────────────────

  function _headers(token) {
    var h = {
      'apikey':         SUPABASE_ANON,
      'Content-Type':   'application/json',
    };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  }

  function _restGet(path, token) {
    return fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method: 'GET',
      headers: _headers(token),
    }).then(function (r) { return r.json(); });
  }

  function _restPost(path, body, token) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + path, {
      method: 'POST',
      headers: _headers(token),
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  function _authGetUser(token) {
    return fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: {
        'apikey':         SUPABASE_ANON,
        'Authorization':  'Bearer ' + token,
      },
    }).then(function (r) {
      if (!r.ok) return null;
      return r.json();
    }).catch(function () { return null; });
  }

  // ── Session from URL hash (vault_access token redirect) ──────

  function _extractTokensFromHash() {
    try {
      var hash = global.location.hash.replace(/^#/, '');
      if (!hash) return null;
      var params = {};
      hash.split('&').forEach(function (pair) {
        var parts = pair.split('=');
        if (parts.length === 2) params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
      });
      if (params.access_token && params.refresh_token) {
        return { access_token: params.access_token, refresh_token: params.refresh_token };
      }
    } catch (_) {}
    return null;
  }

  function _storeTokens(tokens) {
    try {
      localStorage.setItem('vs_sdk_access_token',  tokens.access_token);
      localStorage.setItem('vs_sdk_refresh_token',  tokens.refresh_token);
    } catch (_) {}
  }

  function _loadStoredTokens() {
    try {
      var access  = localStorage.getItem('vs_sdk_access_token');
      var refresh = localStorage.getItem('vs_sdk_refresh_token');
      if (access && refresh) return { access_token: access, refresh_token: refresh };
    } catch (_) {}
    return null;
  }

  function _clearStoredTokens() {
    try {
      localStorage.removeItem('vs_sdk_access_token');
      localStorage.removeItem('vs_sdk_refresh_token');
    } catch (_) {}
  }

  // If the page uses VSSupabase (portal), prefer that session
  function _getPortalSession() {
    if (global.VSSupabase && typeof global.VSSupabase.auth !== 'undefined') {
      return global.VSSupabase.auth.getSession().then(function (res) {
        return (res && res.data && res.data.session) ? res.data.session : null;
      }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  // ── Fetch vault_members row ───────────────────────────────────

  function _fetchMember(userId, token) {
    return fetch(
      SUPABASE_URL + '/rest/v1/vault_members?id=eq.' + encodeURIComponent(userId) + '&select=id,username,points,plan_key,is_sparked,vault_rank&limit=1',
      { headers: _headers(token) }
    ).then(function (r) { return r.json(); })
     .then(function (rows) {
       if (!Array.isArray(rows) || !rows.length) return null;
       return rows[0];
     });
  }

  // ── Plan comparison ───────────────────────────────────────────

  function _planMeets(userPlanKey, requiredPlanKey) {
    var userOrder     = PLAN_ORDER[userPlanKey]     !== undefined ? PLAN_ORDER[userPlanKey]     : 0;
    var requiredOrder = PLAN_ORDER[requiredPlanKey] !== undefined ? PLAN_ORDER[requiredPlanKey] : 0;
    return userOrder >= requiredOrder;
  }

  // ── Public API ────────────────────────────────────────────────

  var VaultSDK = {

    /**
     * Initialize the SDK.
     * @param {string} projectKey  — identifier for this project (used for scoped logic)
     * @param {object} options
     *   requireAuth   {boolean}  — redirect to login if no session
     *   onReady       {function} — called with member object when ready
     *   onAuthRequired {function} — called when no session and requireAuth=true (overrides default redirect)
     */
    init: function (projectKey, options) {
      _projectKey = projectKey || 'unknown';
      options = options || {};
      var self = this;

      // Try hash tokens first (vault_access redirect)
      var hashTokens = _extractTokensFromHash();
      if (hashTokens) {
        _storeTokens(hashTokens);
        // Clean hash from URL
        try { global.history.replaceState(null, '', global.location.pathname + global.location.search); } catch (_) {}
      }

      var tokens = hashTokens || _loadStoredTokens();

      Promise.resolve()
        .then(function () {
          // Prefer portal's Supabase session if available
          return _getPortalSession();
        })
        .then(function (portalSession) {
          if (portalSession) {
            _session = portalSession;
            return _fetchMember(portalSession.user.id, portalSession.access_token);
          }
          if (!tokens) return null;
          return _authGetUser(tokens.access_token).then(function (user) {
            if (!user || !user.id) {
              _clearStoredTokens();
              return null;
            }
            _session = { user: user, access_token: tokens.access_token };
            return _fetchMember(user.id, tokens.access_token);
          });
        })
        .then(function (row) {
          if (row) {
            _member = {
              id:        row.id,
              username:  row.username,
              points:    row.points    || 0,
              plan_key:  row.plan_key  || 'free',
              is_sparked: !!row.is_sparked,
              vault_rank: row.vault_rank || null,
            };
          }
          _initialized = true;

          if (!_session && options.requireAuth) {
            if (typeof options.onAuthRequired === 'function') {
              options.onAuthRequired();
            } else {
              self.redirectToLogin();
            }
            return;
          }

          if (typeof options.onReady === 'function') {
            options.onReady(_member);
          }
        })
        .catch(function (err) {
          console.warn('[VaultSDK] init error:', err);
          _initialized = true;
          if (options.requireAuth) {
            if (typeof options.onAuthRequired === 'function') {
              options.onAuthRequired();
            } else {
              self.redirectToLogin();
            }
          }
        });
    },

    /** Returns current { user, member } or null */
    getSession: function () {
      return Promise.resolve(_session ? { user: _session.user, member: _member } : null);
    },

    /** Returns current plan key */
    getPlanKey: function () {
      return (_member && _member.plan_key) ? _member.plan_key : 'free';
    },

    /**
     * Check if current user can access a feature.
     * Accepts either a feature key (looked up in FEATURE_GATES) or a plan key directly.
     */
    can: function (featureKey) {
      var planKey = this.getPlanKey();
      // First check feature gate map
      if (FEATURE_GATES.hasOwnProperty(featureKey)) {
        return _planMeets(planKey, FEATURE_GATES[featureKey]);
      }
      // Otherwise treat featureKey as a plan key directly
      return _planMeets(planKey, featureKey);
    },

    /**
     * Scan DOM for data-vault-requires / data-vault-gate-action attributes
     * and apply gating logic.
     *
     * data-vault-requires="vault_sparked"         — plan key or feature key
     * data-vault-gate-action="hide|blur|replace"  — what to do if access denied
     */
    applyGates: function () {
      var self = this;
      var elements = document.querySelectorAll('[data-vault-requires]');
      elements.forEach(function (el) {
        var required = el.getAttribute('data-vault-requires');
        var action   = el.getAttribute('data-vault-gate-action') || 'hide';
        var hasAccess = self.can(required);

        if (hasAccess) {
          // Restore any previously gated state
          el.style.filter  = '';
          el.style.pointerEvents = '';
          el.style.userSelect = '';
          if (el.style.display === 'none' && el.getAttribute('data-vault-was-visible')) {
            el.style.display = '';
          }
          return;
        }

        // Access denied — apply action
        if (action === 'hide') {
          el.setAttribute('data-vault-was-visible', '1');
          el.style.display = 'none';
        } else if (action === 'blur') {
          el.style.filter = 'blur(6px)';
          el.style.pointerEvents = 'none';
          el.style.userSelect = 'none';
        } else if (action === 'replace') {
          // Replace with upgrade prompt
          var planNeeded = FEATURE_GATES[required] || required;
          var label = planNeeded === 'vault_sparked_pro' ? 'VaultSparked Eternal' : 'VaultSparked';
          var upgradeEl = document.createElement('div');
          upgradeEl.className = 'vault-sdk-upgrade-prompt';
          upgradeEl.style.cssText = 'text-align:center;padding:1.5rem;border:1px solid rgba(255,196,0,0.2);border-radius:12px;background:rgba(255,196,0,0.04);';
          upgradeEl.innerHTML = '<p style="margin:0 0 0.75rem;color:rgba(255,255,255,0.7);font-size:0.9rem;">This content requires <strong style="color:#FFC400;">' + label + '</strong>.</p>'
            + '<a href="/vaultsparked/" style="display:inline-block;padding:0.5rem 1.2rem;background:linear-gradient(135deg,#FFC400,#FF7A00);color:#000;font-weight:700;font-size:0.85rem;border-radius:999px;text-decoration:none;">Upgrade →</a>';
          el.setAttribute('data-vault-original-display', el.style.display);
          el.style.display = 'none';
          if (el.parentNode) el.parentNode.insertBefore(upgradeEl, el.nextSibling);
        }
      });
    },

    /**
     * Award points to the current user via the award_points RPC.
     * Uses the existing auth-uid-based RPC (not the service-role one).
     */
    awardPoints: function (reason, points, label, oncePer) {
      if (!_session || !_session.access_token) {
        return Promise.resolve({ error: 'not_authenticated' });
      }
      oncePer = oncePer || 'ever';
      return fetch(SUPABASE_URL + '/rest/v1/rpc/award_points', {
        method: 'POST',
        headers: _headers(_session.access_token),
        body: JSON.stringify({
          p_reason:   reason,
          p_points:   points,
          p_label:    label || reason,
          p_once_per: oncePer,
        }),
      }).then(function (r) { return r.json(); })
        .catch(function (err) { return { error: String(err) }; });
    },

    /**
     * Fetch current member stats from vault_members.
     */
    getMemberStats: function () {
      if (!_session || !_member) return Promise.resolve(null);
      return _fetchMember(_session.user.id, _session.access_token).then(function (row) {
        if (!row) return null;
        _member.points    = row.points    || _member.points;
        _member.plan_key  = row.plan_key  || _member.plan_key;
        _member.vault_rank = row.vault_rank || _member.vault_rank;
        return {
          points:     row.points    || 0,
          plan_key:   row.plan_key  || 'free',
          vault_rank: row.vault_rank || null,
          username:   row.username  || '',
        };
      });
    },

    /** Redirect to login, preserving current URL as next param */
    redirectToLogin: function () {
      var next = encodeURIComponent(global.location.href);
      global.location.href = '/vault-member/?next=' + next;
    },

  };

  global.VaultSDK = VaultSDK;

})(globalThis);
