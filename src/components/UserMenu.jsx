/**
 * UserMenu — PromoGrind
 *
 * Auth-aware header widget.
 * Logged out → Sign In + Create Free Account buttons.
 * Logged in  → Avatar + display name + tier badge + animated dropdown.
 *
 * Dropdown includes: avatar picker, editable display name, theme,
 * compact mode, currency, subscription/upgrade, session summary, sign out.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { signOut, startCheckout, manageBilling, getTierName, redeemBetaCode } from '../auth.js';
import { K, font, fontD } from '../lib/shared.js';
import { FX } from '../contexts.jsx';
import { FREE_VAULT_MEMBERSHIP_URL } from '../launchState.js';

// ── Avatar catalogue ──────────────────────────────────────────────────────────

const AVATARS = [
  { emoji: '🎯', label: 'Sharpshooter' },
  { emoji: '🎲', label: 'High Roller'  },
  { emoji: '🃏', label: 'Card Shark'   },
  { emoji: '🏈', label: 'Football Pro' },
  { emoji: '🏀', label: 'Baller'       },
  { emoji: '⚽', label: 'Soccer Star'  },
  { emoji: '🎰', label: 'Slots King'   },
  { emoji: '💰', label: 'Money Maker'  },
  { emoji: '🦅', label: 'Eagle Eye'    },
  { emoji: '🏆', label: 'Champion'     },
  { emoji: '🐂', label: 'Bull Run'     },
  { emoji: '🎳', label: 'Striker'      },
];

// ── Tier helpers ──────────────────────────────────────────────────────────────

const TIER_COLOR = (name) => ({
  Scout:       '#06b6d4',
  Runner:      '#f59e0b',
  Closer:      '#a855f7',
  'The House': '#eab308',
}[name] ?? '#60a5fa');

const UPGRADE_NEXT = {
  'Free Agent': { planId: 'scout_monthly',  label: 'Upgrade to Scout',  price: '$9.99/mo',  desc: 'Cloud sync · PromoChat 20/day'    },
  Scout:        { planId: 'runner_monthly', label: 'Upgrade to Runner', price: '$19.99/mo', desc: 'Unlimited AI · Action Plan'        },
  Runner:       { planId: 'closer_monthly', label: 'Upgrade to Closer', price: '$34.99/mo', desc: 'Live Scanner · Stack Builder'      },
};

// ── Shared micro-styles ───────────────────────────────────────────────────────

const sectionLabel = {
  fontSize: 9, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10,
};

const prefRow = {
  display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', marginBottom: 10,
};

const pillBtn = (active, color) => ({
  padding: '5px 14px', borderRadius: 6, cursor: 'pointer',
  fontFamily: font, fontSize: 11, fontWeight: 600,
  background: active ? `${color}18` : 'transparent',
  border: `1px solid ${active ? color + '60' : K.bd2}`,
  color: active ? color : K.dm,
  transition: 'all 0.15s',
});

// ── Main component ────────────────────────────────────────────────────────────

export default function UserMenu({
  user, proStatus, darkMode, toggleTheme,
  compactMode, toggleCompact, currency, setCurrency,
  syncStatus, onSessionClick,
}) {
  const [open,          setOpen]          = useState(false);
  const [dropPos,       setDropPos]       = useState({ top: 56, right: 16 });
  const [dropWidth,     setDropWidth]     = useState(304);
  const [avatarPicking, setAvatarPicking] = useState(false);
  const [avatar,        setAvatar]        = useState(() => {
    try { return localStorage.getItem('pg_avatar') || AVATARS[0].emoji; } catch { return AVATARS[0].emoji; }
  });
  const [displayName, setDisplayName] = useState(() => {
    try { return localStorage.getItem('pg_display_name') || ''; } catch { return ''; }
  });
  const [editingName,   setEditingName]   = useState(false);
  const [nameInput,     setNameInput]     = useState('');
  const [betaCodeOpen,  setBetaCodeOpen]  = useState(false);
  const [betaCodeInput, setBetaCodeInput] = useState('');
  const [betaCodeState, setBetaCodeState] = useState(null); // null | 'loading' | 'success' | 'error'
  const [betaCodeMsg,   setBetaCodeMsg]   = useState('');

  const triggerRef = useRef(null);
  const dropRef    = useRef(null);

  // Compute dropdown position from trigger bounding rect
  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw   = window.innerWidth;
    if (vw < 640) {
      setDropPos({ top: rect.bottom + 8, right: 8 });
      setDropWidth(vw - 16);
    } else {
      setDropPos({ top: rect.bottom + 8, right: vw - rect.right });
      setDropWidth(308);
    }
  }, []);

  const openMenu = () => { calcPos(); setOpen(true); };

  // Reposition on resize while open
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', calcPos, { passive: true });
    return () => window.removeEventListener('resize', calcPos);
  }, [open, calcPos]);

  // Close on outside interaction
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        dropRef.current    && !dropRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
        setAvatarPicking(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    document.addEventListener('touchstart', handler, true);
    return () => {
      document.removeEventListener('mousedown', handler, true);
      document.removeEventListener('touchstart', handler, true);
    };
  }, [open]);

  // Close on scroll (prevents stale positioning)
  useEffect(() => {
    if (!open) return;
    const handler = () => { setOpen(false); setAvatarPicking(false); };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [open]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const saveAvatar = (emoji) => {
    setAvatar(emoji);
    try { localStorage.setItem('pg_avatar', emoji); } catch {}
    setAvatarPicking(false);
  };

  const startEditName = () => {
    const base = displayName || (user?.email ? user.email.split('@')[0] : '');
    setNameInput(base);
    setEditingName(true);
  };

  const saveName = () => {
    const name = nameInput.trim().slice(0, 24);
    setDisplayName(name);
    try { localStorage.setItem('pg_display_name', name); } catch {}
    setEditingName(false);
  };

  const submitBetaCode = async () => {
    const code = betaCodeInput.trim().toUpperCase();
    if (!code) return;
    setBetaCodeState('loading');
    const result = await redeemBetaCode(code);
    if (result?.success) {
      setBetaCodeState('success');
      setBetaCodeMsg(result.message ?? 'Beta access activated!');
      setBetaCodeInput('');
      // Reload page after brief delay so proStatus refreshes
      setTimeout(() => window.location.reload(), 1800);
    } else {
      setBetaCodeState('error');
      setBetaCodeMsg(result?.error ?? 'Invalid code');
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const derivedName   = displayName || (user?.email ? user.email.split('@')[0] : 'Grinder');
  const tierName      = getTierName(proStatus?.plan ?? null);
  const tc            = TIER_COLOR(tierName);
  const upgrade       = UPGRADE_NEXT[tierName] ?? null;
  const isOnTrial     = proStatus?.status === 'trial';
  const trialDaysLeft = proStatus?.trial_days_left ?? 0;
  const renewalDate   = proStatus?.current_period_end
    ? new Date(proStatus.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  // ── LOGGED OUT ─────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <a
          href={FREE_VAULT_MEMBERSHIP_URL}
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '8px 16px', borderRadius: 8, minHeight: 36,
            background: 'transparent', border: `1px solid ${K.bd2}`,
            color: K.dm, fontSize: 12, fontWeight: 600, fontFamily: font,
            textDecoration: 'none', whiteSpace: 'nowrap',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = K.ac; e.currentTarget.style.color = K.ac; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = K.bd2; e.currentTarget.style.color = K.dm; }}
        >
          Sign In
        </a>
        <a
          href={FREE_VAULT_MEMBERSHIP_URL}
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '8px 18px', borderRadius: 8, minHeight: 36,
            background: K.gn, border: 'none',
            color: '#0a0e17', fontSize: 12, fontWeight: 700, fontFamily: font,
            textDecoration: 'none', whiteSpace: 'nowrap',
            boxShadow: `0 0 20px ${K.gn}35`,
            transition: 'opacity 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.boxShadow = `0 0 28px ${K.gn}55`; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.boxShadow = `0 0 20px ${K.gn}35`; }}
        >
          Create Free Account →
        </a>
      </div>
    );
  }

  // ── LOGGED IN — trigger button ─────────────────────────────────────────────

  return (
    <div style={{ position: 'relative' }}>
      {/* CSS animation — injected once */}
      <style>{`
        @keyframes pgDropIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .pg-drop-item:hover { background: rgba(96,165,250,0.08) !important; }
      `}</style>

      <button
        ref={triggerRef}
        onClick={() => open ? (setOpen(false), setAvatarPicking(false)) : openMenu()}
        title={user.email}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 10px 4px 4px', minHeight: 44,
          background: open ? `${K.gn}10` : 'transparent',
          border: `1px solid ${open ? K.gn + '55' : K.bd2}`,
          borderRadius: 28, cursor: 'pointer', fontFamily: font,
          transition: 'all 0.2s ease',
        }}
      >
        {/* Avatar circle */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${K.gn}18, ${K.ac}10)`,
          border: `2px solid ${open ? K.gn + '60' : K.gn + '28'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, lineHeight: 1, position: 'relative',
          transition: 'border-color 0.2s',
        }}>
          {avatar}
          {/* Sync indicator dot */}
          {syncStatus && (
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 9, height: 9, borderRadius: '50%',
              background: syncStatus === 'syncing' ? K.yl : K.gn,
              border: `1.5px solid ${K.bg}`,
              transition: 'background 0.3s',
            }}/>
          )}
        </div>

        {/* Name + tier */}
        <div style={{ textAlign: 'left', lineHeight: 1.3, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: K.tx,
            maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {derivedName}
          </div>
          <div style={{ fontSize: 10, color: tc, fontWeight: 700, letterSpacing: '0.3px' }}>
            {tierName}{isOnTrial ? ` · ${trialDaysLeft}d trial` : ''}
          </div>
        </div>

        {/* Chevron */}
        <span style={{
          fontSize: 9, color: K.dm, marginLeft: 2, flexShrink: 0,
          transition: 'transform 0.2s',
          display: 'block',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▾</span>
      </button>

      {/* ── DROPDOWN ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={dropRef}
          role="menu"
          style={{
            position: 'fixed',
            top: dropPos.top,
            right: dropPos.right,
            width: dropWidth,
            zIndex: 9999,
            background: K.s1,
            border: `1px solid ${K.bd}`,
            borderRadius: 16,
            boxShadow: '0 12px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            animation: 'pgDropIn 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >

          {/* ── Identity header ──────────────────────────────────────── */}
          <div style={{
            padding: '16px 18px 14px',
            background: `linear-gradient(135deg, ${K.s2}, ${K.s3})`,
            borderBottom: `1px solid ${K.bd}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

              {/* Avatar — click to pick */}
              <button
                onClick={() => setAvatarPicking(v => !v)}
                title="Change avatar"
                style={{
                  width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${K.gn}18, ${K.ac}10)`,
                  border: `2px solid ${avatarPicking ? K.gn + '80' : K.gn + '30'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, cursor: 'pointer', position: 'relative',
                  transition: 'border-color 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.borderColor = K.gn + '70'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.borderColor = avatarPicking ? K.gn + '80' : K.gn + '30'; }}
              >
                {avatar}
                <span style={{
                  position: 'absolute', bottom: 1, right: 1,
                  width: 18, height: 18, borderRadius: '50%',
                  background: K.s1, border: `1px solid ${K.bd2}`,
                  fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: K.dm,
                }}>✎</span>
              </button>

              {/* Name + email + tier */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingName ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                      maxLength={24}
                      placeholder="Display name"
                      style={{
                        flex: 1, padding: '5px 9px', background: K.s2,
                        border: `1px solid ${K.ac}`, borderRadius: 7,
                        color: K.tx, fontFamily: font, fontSize: 12, outline: 'none',
                      }}
                    />
                    <button
                      onClick={saveName}
                      style={{
                        padding: '5px 10px', background: K.gn, border: 'none',
                        borderRadius: 7, color: '#0a0e17', fontSize: 11,
                        fontWeight: 700, cursor: 'pointer', fontFamily: font,
                      }}
                    >✓</button>
                    <button
                      onClick={() => setEditingName(false)}
                      style={{
                        padding: '5px 8px', background: 'transparent',
                        border: `1px solid ${K.bd2}`, borderRadius: 7,
                        color: K.dm, fontSize: 11, cursor: 'pointer', fontFamily: font,
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={startEditName}
                    title="Edit display name"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 0, marginBottom: 3,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: K.tx, fontFamily: fontD }}>{derivedName}</span>
                    <span style={{ fontSize: 9, color: K.dm }}>✎</span>
                  </button>
                )}

                <div style={{
                  fontSize: 10, color: K.dm, marginBottom: 7,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user.email}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: tc,
                    background: `${tc}18`, padding: '2px 10px',
                    borderRadius: 50, letterSpacing: '0.5px',
                    border: `1px solid ${tc}28`,
                  }}>
                    {tierName}
                  </span>
                  {isOnTrial && (
                    <span style={{ fontSize: 10, color: K.yl, fontWeight: 600 }}>
                      {trialDaysLeft}d trial remaining
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Avatar picker grid */}
            {avatarPicking && (
              <div style={{
                marginTop: 14,
                display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6,
              }}>
                {AVATARS.map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    onClick={() => saveAvatar(emoji)}
                    title={label}
                    style={{
                      aspectRatio: '1', borderRadius: 10,
                      background: avatar === emoji ? `${K.gn}20` : K.s2,
                      border: `1.5px solid ${avatar === emoji ? K.gn + '70' : K.bd}`,
                      fontSize: 20, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => {
                      if (avatar !== emoji) {
                        e.currentTarget.style.background = `${K.ac}15`;
                        e.currentTarget.style.borderColor = K.ac + '60';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (avatar !== emoji) {
                        e.currentTarget.style.background = K.s2;
                        e.currentTarget.style.borderColor = K.bd;
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    {emoji}
                  </button>
                ))}
                <div style={{ gridColumn: '1 / -1', fontSize: 9, color: K.dm, textAlign: 'center', marginTop: 2 }}>
                  Tap to select your avatar
                </div>
              </div>
            )}
          </div>

          {/* ── Subscription ─────────────────────────────────────────── */}
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${K.bd}` }}>
            <div style={sectionLabel}>Subscription</div>

            {renewalDate && (
              <div style={{ fontSize: 11, color: K.dm, marginBottom: 9 }}>
                Renews <span style={{ color: K.tx, fontWeight: 600 }}>{renewalDate}</span>
              </div>
            )}

            {upgrade ? (
              <button
                onClick={() => { setOpen(false); startCheckout(upgrade.planId); }}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                  fontFamily: font, display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  background: `linear-gradient(135deg, ${K.gn}12, ${K.ac}08)`,
                  border: `1px solid ${K.gn}35`,
                  transition: 'background 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${K.gn}20, ${K.ac}14)`; e.currentTarget.style.boxShadow = `0 2px 12px ${K.gn}18`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${K.gn}12, ${K.ac}08)`; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: K.gn }}>↑ {upgrade.label}</div>
                  <div style={{ fontSize: 10, color: K.dm, marginTop: 2 }}>{upgrade.desc}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: K.gn, flexShrink: 0, marginLeft: 10 }}>
                  {upgrade.price}
                </div>
              </button>
            ) : (
              <div style={{ fontSize: 11, color: K.gn }}>✓ Top tier — all features unlocked</div>
            )}

            {/* Beta invite code — only shown to Free Agent */}
            {tierName === 'Free Agent' && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => { setBetaCodeOpen(v => !v); setBetaCodeState(null); setBetaCodeMsg(''); }}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 10, color: K.dm, fontFamily: font,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = K.tx}
                  onMouseLeave={e => e.currentTarget.style.color = K.dm}
                >
                  Have a beta invite code? {betaCodeOpen ? '▲' : '▼'}
                </button>
                {betaCodeOpen && (
                  <div style={{ marginTop: 8 }}>
                    {betaCodeState === 'success' ? (
                      <div style={{ fontSize: 11, color: K.gn, fontWeight: 600 }}>✓ {betaCodeMsg}</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            value={betaCodeInput}
                            onChange={e => { setBetaCodeInput(e.target.value.toUpperCase()); setBetaCodeState(null); }}
                            onKeyDown={e => { if (e.key === 'Enter') submitBetaCode(); }}
                            placeholder="PGBETA-XXXX"
                            maxLength={16}
                            style={{
                              flex: 1, padding: '6px 10px', borderRadius: 7, fontSize: 11,
                              fontFamily: font, background: K.bg2 ?? K.bg,
                              border: `1px solid ${betaCodeState === 'error' ? '#ef4444' : K.bd}`,
                              color: K.tx, outline: 'none',
                            }}
                          />
                          <button
                            onClick={submitBetaCode}
                            disabled={betaCodeState === 'loading' || !betaCodeInput.trim()}
                            style={{
                              padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
                              fontFamily: font, fontSize: 11, fontWeight: 700,
                              background: K.gn + '20', border: `1px solid ${K.gn}50`,
                              color: K.gn, opacity: betaCodeState === 'loading' ? 0.6 : 1,
                            }}
                          >
                            {betaCodeState === 'loading' ? '...' : 'Apply'}
                          </button>
                        </div>
                        {betaCodeState === 'error' && (
                          <div style={{ fontSize: 10, color: '#ef4444', marginTop: 5 }}>{betaCodeMsg}</div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => { setOpen(false); manageBilling(); }}
              style={{
                display: 'block', marginTop: 9, fontSize: 10, color: K.ac,
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: font, textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >
              Manage billing →
            </button>
          </div>

          {/* ── Preferences ──────────────────────────────────────────── */}
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${K.bd}` }}>
            <div style={sectionLabel}>Preferences</div>

            {/* Theme */}
            <div style={prefRow}>
              <span style={{ fontSize: 12, color: K.tx }}>Theme</span>
              <button onClick={toggleTheme} style={pillBtn(true, darkMode ? K.yl : K.ac)}>
                {darkMode ? '☀ Light' : '🌙 Dark'}
              </button>
            </div>

            {/* Compact */}
            <div style={prefRow}>
              <div>
                <div style={{ fontSize: 12, color: K.tx }}>Compact Mode</div>
                <div style={{ fontSize: 10, color: K.dm, marginTop: 1 }}>Hide help & explainers</div>
              </div>
              <button onClick={toggleCompact} style={pillBtn(compactMode, K.ac)}>
                {compactMode ? 'On' : 'Off'}
              </button>
            </div>

            {/* Currency */}
            <div style={{ ...prefRow, marginBottom: 0 }}>
              <div>
                <div style={{ fontSize: 12, color: K.tx }}>Currency</div>
                <div style={{ fontSize: 10, color: K.dm, marginTop: 1 }}>Display estimates only</div>
              </div>
              <select
                value={currency}
                onChange={e => {
                  setCurrency(e.target.value);
                  try { localStorage.setItem('pg_currency', e.target.value); } catch {}
                }}
                style={{
                  padding: '5px 8px', background: K.s2,
                  border: `1px solid ${K.bd2}`, borderRadius: 6,
                  color: K.tx, fontFamily: font, fontSize: 11, cursor: 'pointer',
                }}
              >
                {Object.entries(FX).map(([code, { sym }]) => (
                  <option key={code} value={code}>{code} ({sym})</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Tools ────────────────────────────────────────────────── */}
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${K.bd}` }}>
            <button
              className="pg-drop-item"
              onClick={() => { setOpen(false); onSessionClick?.(); }}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                background: 'transparent', border: `1px solid ${K.bd2}`,
                color: K.dm, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: font,
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                transition: 'background 0.12s',
              }}
            >
              <span>📊</span>
              <span>Session Summary</span>
            </button>
          </div>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <div style={{ padding: '13px 18px' }}>
            <button
              onClick={() => { setOpen(false); signOut(); }}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 8,
                background: `${K.rd}10`, border: `1px solid ${K.rd}30`,
                color: K.rd, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: font, marginBottom: 12,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${K.rd}1e`}
              onMouseLeave={e => e.currentTarget.style.background = `${K.rd}10`}
            >
              Sign Out
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
              {[['Compliance', '/compliance/'], ['About', '/about/'], ['Privacy', '/privacy/']].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  style={{ fontSize: 10, color: K.dm, textDecoration: 'none', transition: 'color 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.color = K.ac}
                  onMouseLeave={e => e.currentTarget.style.color = K.dm}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
