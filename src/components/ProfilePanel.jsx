import React from "react";
import { signOut, startCheckout, getTierName } from "../auth.js";
import { K, font, fontD } from "../lib/shared.js";
import { FX } from "../contexts.jsx";

const TIER_COLOR = (name) => ({
  Scout: '#06b6d4',
  Runner: '#f59e0b',
  Closer: '#a855f7',
  'The House': '#f59e0b',
}[name] ?? K.dm);

const UPGRADE_NEXT = {
  'Free Agent': { planId: 'scout_monthly', label: 'Upgrade to Scout', price: '$9.99/mo' },
  Scout:        { planId: 'runner_monthly', label: 'Upgrade to Runner', price: '$19.99/mo' },
  Runner:       { planId: 'closer_monthly', label: 'Upgrade to Closer', price: '$34.99/mo' },
};

export default function ProfilePanel({
  user, proStatus, darkMode, toggleTheme,
  compactMode, toggleCompact, currency, setCurrency, onClose,
}) {
  const email = user?.email ?? 'Guest';
  const initials = email.slice(0, 2).toUpperCase();
  const plan = proStatus?.plan ?? null;
  const tierName = getTierName(plan);
  const isOnTrial = proStatus?.status === 'trial';
  const trialDaysLeft = proStatus?.trial_days_left ?? 0;
  const isActive = proStatus?.status === 'active';
  const renewalDate = proStatus?.current_period_end
    ? new Date(proStatus.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const tc = TIER_COLOR(tierName);
  const upgrade = UPGRADE_NEXT[tierName] ?? null;

  const row = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  };
  const label12 = { fontSize: 12, color: K.tx };
  const sub10 = { fontSize: 10, color: K.dm, marginTop: 2 };
  const toggleBtn = (active, activeColor) => ({
    padding: '5px 14px', borderRadius: 6, cursor: 'pointer',
    background: active ? `${activeColor}18` : 'transparent',
    border: `1px solid ${active ? activeColor : K.bd2}`,
    color: active ? activeColor : K.dm,
    fontSize: 11, fontWeight: 600, fontFamily: font,
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 9000,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 300,
        background: K.s1, borderLeft: `1px solid ${K.bd}`,
        zIndex: 9001, overflowY: 'auto', fontFamily: font,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 40px rgba(0,0,0,0.35)',
      }}>

        {/* ── Identity header ─────────────────────────────────────── */}
        <div style={{
          padding: '18px 20px 16px',
          borderBottom: `1px solid ${K.bd}`,
          background: `linear-gradient(135deg, ${K.s2}, ${K.s3})`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: fontD, fontSize: 11, fontWeight: 700, color: K.dm, textTransform: 'uppercase', letterSpacing: '2px' }}>
              My Account
            </span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: K.dm, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Avatar + email + tier */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${K.gn}25, ${K.ac}25)`,
              border: `2px solid ${K.gn}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: K.gn, fontFamily: fontD,
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: K.tx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: tc,
                  background: `${tc}18`, padding: '2px 9px', borderRadius: 50,
                  letterSpacing: '0.5px', border: `1px solid ${tc}30`,
                }}>
                  {tierName}
                </span>
                {isOnTrial && (
                  <span style={{ fontSize: 10, color: K.yl, fontWeight: 600 }}>
                    {trialDaysLeft}d trial
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Subscription ─────────────────────────────────────────── */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${K.bd}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: K.dm, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>
            Subscription
          </div>

          {isActive && renewalDate && (
            <div style={{ fontSize: 11, color: K.dm, marginBottom: 10 }}>
              Renews <span style={{ color: K.tx, fontWeight: 600 }}>{renewalDate}</span>
            </div>
          )}

          {upgrade ? (
            <button
              onClick={() => { onClose(); startCheckout(upgrade.planId); }}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 8,
                background: `linear-gradient(135deg, ${K.gn}18, ${K.ac}15)`,
                border: `1px solid ${K.gn}40`, color: K.gn,
                fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: font,
                textAlign: 'center',
              }}
            >
              ↑ {upgrade.label} — {upgrade.price}
            </button>
          ) : (
            <div style={{ fontSize: 11, color: K.gn }}>✓ Top tier — all features unlocked</div>
          )}

          <a
            href="https://vaultsparkstudios.com/vault-member/"
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', marginTop: 10, fontSize: 10, color: K.ac, textDecoration: 'none' }}
          >
            Manage account on VaultSpark →
          </a>
        </div>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${K.bd}`, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: K.dm, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>
            Preferences
          </div>

          {/* Theme */}
          <div style={row}>
            <span style={label12}>Theme</span>
            <button onClick={toggleTheme} style={toggleBtn(darkMode, K.yl)}>
              {darkMode ? '☀ Light' : '🌙 Dark'}
            </button>
          </div>

          {/* Compact mode */}
          <div style={row}>
            <div>
              <div style={label12}>Compact Mode</div>
              <div style={sub10}>Hide help text</div>
            </div>
            <button onClick={toggleCompact} style={toggleBtn(compactMode, K.ac)}>
              {compactMode ? 'On' : 'Off'}
            </button>
          </div>

          {/* Currency */}
          <div style={row}>
            <div>
              <div style={label12}>Currency</div>
              <div style={sub10}>Display estimates only</div>
            </div>
            <select
              value={currency}
              onChange={e => { setCurrency(e.target.value); try { localStorage.setItem('pg_currency', e.target.value); } catch {} }}
              style={{
                padding: '5px 8px', background: K.s2, border: `1px solid ${K.bd2}`,
                borderRadius: 6, color: K.tx, fontFamily: font, fontSize: 11, cursor: 'pointer',
              }}
            >
              {Object.entries(FX).map(([code, { sym }]) => (
                <option key={code} value={code}>{code} ({sym})</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Footer actions ───────────────────────────────────────── */}
        <div style={{ padding: '14px 20px' }}>
          <button
            onClick={() => signOut()}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 6,
              background: `${K.rd}12`, border: `1px solid ${K.rd}35`,
              color: K.rd, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: font,
              marginBottom: 12,
            }}
          >
            Sign Out
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
            {[['Compliance', '/compliance/'], ['About', '/about/'], ['Privacy', '/privacy/']].map(([label, href]) => (
              <a key={label} href={href} style={{ fontSize: 10, color: K.dm, textDecoration: 'none' }}>{label}</a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
