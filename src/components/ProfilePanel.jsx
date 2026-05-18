import React, { useMemo, useContext } from "react";
import { signOut, startCheckout, getTierName } from "../auth.js";
import { K, font, fontD } from "../lib/shared.js";
import { FX, AppDataCtx } from "../contexts.jsx";
import { ACHIEVEMENTS, loadEarned, ACHIEVEMENT_MAP } from "../lib/achievements.js";
import { computeMastery, MASTERY_COLOR, GLOBAL_RANKS } from "../lib/mastery.js";
import { readTrustReceipts, summarizeTrustReceipt } from "../lib/trustReceipts.js";
import { buildLocalDataExport, clearLocalPromoGrindData, describeDataControlState } from "../lib/dataControls.js";
import { buildReplayInsights } from "../lib/replayLedger.js";
import { exportPassport } from "../lib/operatorPassport.js";

function PassportExportSection() {
  const ctx = useContext(AppDataCtx);
  const [shareUrl, setShareUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  async function handleExport() {
    setBusy(true);
    try {
      const token = await exportPassport(ctx?.appData || {});
      const url = `${window.location.origin}/passport/#${token}`;
      setShareUrl(url);
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage("Passport URL copied — paste it anywhere to share. Zero PII, signed locally.");
      } else {
        setMessage("Passport URL ready below.");
      }
    } catch (err) {
      setMessage("Could not generate passport. WebCrypto required.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${K.bd}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: K.dm, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>
        Operator Passport
      </div>
      <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5, marginBottom: 10 }}>
        Share a verifiable snapshot of your discipline score, lane mastery, and settled-loop ratio. Signed locally. No bet history, no stake amounts, no sportsbook account info — ever.
      </div>
      <button
        onClick={handleExport}
        disabled={busy}
        style={{
          padding: '8px 14px', borderRadius: 6, cursor: busy ? 'wait' : 'pointer',
          background: `${K.gn}15`, border: `1px solid ${K.gn}40`,
          color: K.gn, fontSize: 11, fontWeight: 700, fontFamily: font,
        }}
      >
        {busy ? 'Generating…' : 'Export & copy passport URL'}
      </button>
      {message && <div style={{ fontSize: 10, color: K.dm, marginTop: 8, lineHeight: 1.5 }}>{message}</div>}
      {shareUrl && (
        <div style={{ marginTop: 8, padding: '8px 10px', background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 6, fontSize: 9, color: K.mt, wordBreak: 'break-all', fontFamily: 'monospace' }}>
          {shareUrl}
        </div>
      )}
    </div>
  );
}

function ReplayInsightSection() {
  const ctx = useContext(AppDataCtx);
  const replay = useMemo(() => buildReplayInsights(ctx?.appData || {}), [ctx?.appData]);
  if (!replay.hasEnoughHistory) return null;
  return (
    <div style={{ padding: '14px 20px', borderTop: `1px solid ${K.bd}` }}>
      <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8, fontWeight: 800 }}>
        Replay insights (14-day lag)
      </div>
      {replay.insights.length === 0 && (
        <div style={{ fontSize: 11, color: K.mt }}>Not enough closed loops in the last 14 days to surface a counterfactual.</div>
      )}
      {replay.insights.map((insight) => {
        const tone = insight.tone === "watch" ? K.yl : K.gn;
        return (
          <div key={insight.key} style={{ marginBottom: 8, padding: "10px 12px", background: `${tone}08`, border: `1px solid ${tone}30`, borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: K.tx, fontWeight: 700, marginBottom: 3 }}>{insight.headline}</div>
            <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>{insight.detail}</div>
          </div>
        );
      })}
    </div>
  );
}

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

function AchievementsSection() {
  const earned = useMemo(() => loadEarned(), []);
  const earnedIds = new Set(earned.map(e => e.id));
  const earnedCount = earnedIds.size;
  const [expanded, setExpanded] = React.useState(false);

  const categories = [
    { key: 'profit',   label: 'Profit'   },
    { key: 'books',    label: 'Books'    },
    { key: 'streak',   label: 'Streak'   },
    { key: 'mastery',  label: 'Mastery'  },
    { key: 'engage',   label: 'Activity' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'start',    label: 'Start'    },
    { key: 'missions', label: 'Missions' },
  ];

  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${K.bd}` }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: K.dm, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Achievements
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: K.yl, fontWeight: 700 }}>{earnedCount}/{ACHIEVEMENTS.length}</span>
          <span style={{ fontSize: 10, color: K.mt }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {!expanded && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ACHIEVEMENTS.filter(a => earnedIds.has(a.id)).slice(0, 8).map(a => (
            <span key={a.id} title={a.label} style={{ fontSize: 18, animation: 'pgBadgeIn 0.35s ease backwards' }}>{a.icon}</span>
          ))}
          {earnedCount === 0 && <span style={{ fontSize: 10, color: K.mt }}>Complete actions to earn badges</span>}
        </div>
      )}

      {expanded && categories.map(cat => {
        const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat.key);
        if (catAchievements.length === 0) return null;
        return (
          <div key={cat.key} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{cat.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {catAchievements.map(a => {
                const unlocked = earnedIds.has(a.id);
                return (
                  <div
                    key={a.id}
                    title={`${a.label}: ${a.desc}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 6,
                      background: unlocked ? `${K.yl}12` : `${K.s3}`,
                      border: `1px solid ${unlocked ? K.yl + '40' : K.bd}`,
                      opacity: unlocked ? 1 : 0.45,
                      animation: unlocked ? 'pgBadgeIn 0.3s ease' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{a.icon}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: unlocked ? K.tx : K.mt, fontFamily: font }}>{a.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MasterySection() {
  const ctx = useContext(AppDataCtx);
  const mastery = useMemo(() => ctx?.appData ? computeMastery(ctx.appData) : null, [ctx?.appData]);
  if (!mastery) return null;

  const { globalRank, perType } = mastery;
  const activeLanes = Object.entries(perType).filter(([, d]) => d.xp > 0).sort(([, a], [, b]) => b.xp - a.xp);

  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${K.bd}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: K.dm, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>
        Operator Mastery
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: globalRank.color, background: `${globalRank.color}18`, border: `1px solid ${globalRank.color}35`, padding: '3px 12px', borderRadius: 99, fontFamily: font }}>
          {globalRank.name}
        </span>
        <span style={{ fontSize: 10, color: K.mt }}>Global Rank</span>
      </div>
      {activeLanes.length === 0 && (
        <div style={{ fontSize: 10, color: K.mt }}>Settle bets to build lane mastery</div>
      )}
      {activeLanes.map(([key, d]) => {
        const color = MASTERY_COLOR[d.level] || K.mt;
        return (
          <div key={key} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: K.tx }}>{d.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color }}>{d.level} · {d.xp} XP</span>
            </div>
            <div style={{ height: 4, background: K.s3, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: 4, background: color, borderRadius: 2, width: `${d.levelPct}%`, transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrustReceiptsSection() {
  const [expanded, setExpanded] = React.useState(false);
  const receipts = useMemo(() => readTrustReceipts(), [expanded]);
  const recent = receipts.slice(0, expanded ? 8 : 3);

  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${K.bd}` }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: K.dm, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Trust Receipts
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: receipts.length ? K.ac : K.mt, fontWeight: 700 }}>{receipts.length}</span>
          <span style={{ fontSize: 10, color: K.mt }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {recent.length === 0 && (
        <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6 }}>
          Account, billing, AI, push, and sync activity will leave concise receipts here.
        </div>
      )}

      {recent.map((receipt) => (
        <div key={receipt.id} style={{ padding: '9px 10px', background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, marginBottom: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: K.tx, fontWeight: 700 }}>{receipt.title}</div>
            <span style={{ fontSize: 9, color: K.ac, textTransform: 'uppercase', fontWeight: 800 }}>{receipt.type}</span>
          </div>
          <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>{summarizeTrustReceipt(receipt)}</div>
          <div style={{ fontSize: 9, color: K.mt, marginTop: 5 }}>
            {receipt.createdAt ? new Date(receipt.createdAt).toLocaleString() : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

function DataControlsSection() {
  const [state, setState] = React.useState(() => describeDataControlState());
  const [message, setMessage] = React.useState("");

  const refresh = () => setState(describeDataControlState());

  function handleExport() {
    const payload = buildLocalDataExport();
    try {
      const text = JSON.stringify(payload, null, 2);
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
        setMessage(`Export copied: ${payload.summary.itemCount} item${payload.summary.itemCount === 1 ? "" : "s"}.`);
      } else {
        setMessage(`Export ready: ${payload.summary.itemCount} item${payload.summary.itemCount === 1 ? "" : "s"}.`);
      }
    } catch {
      setMessage("Export unavailable in this browser.");
    }
  }

  function handleClear() {
    const confirmed = window.confirm("Clear local PromoGrind operator data on this device? Preferences stay in place.");
    if (!confirmed) return;
    const result = clearLocalPromoGrindData(undefined, { includePreferences: false });
    refresh();
    setMessage(`Cleared ${result.cleared.length} item${result.cleared.length === 1 ? "" : "s"}; kept preferences.`);
  }

  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${K.bd}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: K.dm, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>
        Data Controls
      </div>
      <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5, marginBottom: 10 }}>
        {state.label} · {state.totalBytes} bytes on this device
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleExport}
          disabled={!state.hasData}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 6, cursor: state.hasData ? 'pointer' : 'not-allowed',
            background: state.hasData ? `${K.ac}12` : K.s2,
            border: `1px solid ${state.hasData ? K.ac + '40' : K.bd}`,
            color: state.hasData ? K.ac : K.mt, fontSize: 10, fontWeight: 700, fontFamily: font,
          }}
        >
          Export
        </button>
        <button
          onClick={handleClear}
          disabled={!state.hasData}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 6, cursor: state.hasData ? 'pointer' : 'not-allowed',
            background: state.hasData ? `${K.rd}10` : K.s2,
            border: `1px solid ${state.hasData ? K.rd + '35' : K.bd}`,
            color: state.hasData ? K.rd : K.mt, fontSize: 10, fontWeight: 700, fontFamily: font,
          }}
        >
          Clear Local
        </button>
      </div>
      {message && <div style={{ fontSize: 9, color: K.dm, marginTop: 8, lineHeight: 1.5 }}>{message}</div>}
    </div>
  );
}

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
            href="mailto:support@vaultsparkstudios.com?subject=PromoGrind%20account%20help"
            style={{ display: 'block', marginTop: 10, fontSize: 10, color: K.ac, textDecoration: 'none' }}
          >
            PromoGrind account help →
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

        {/* ── Mastery ──────────────────────────────────────────────── */}
        <MasterySection />

        {/* ── Trust receipts ───────────────────────────────────────── */}
        <TrustReceiptsSection />

        {/* ── Replay insights ──────────────────────────────────────── */}
        <ReplayInsightSection />

        {/* ── Data controls ────────────────────────────────────────── */}
        <DataControlsSection />

        {/* ── Operator passport ────────────────────────────────────── */}
        <PassportExportSection />

        {/* ── Achievements ─────────────────────────────────────────── */}
        <AchievementsSection />

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
