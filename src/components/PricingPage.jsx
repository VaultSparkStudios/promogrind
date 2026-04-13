import React, { useState } from "react";
import { startCheckout, startTrial } from "../auth.js";
import { FEATURE_FLAGS } from "../launchState.js";
import { trackFeatureEnabledUse, trackFeatureGateClick } from "../launchTelemetry.js";
import { S, Tl } from "../ui.jsx";
import { useToast } from "../contexts.jsx";
import { K, font, fontD } from "../lib/shared.js";

// ── Tier definitions ──────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'free',
    name: 'Free Agent',
    tagline: 'Start calculating. No account needed.',
    color: '#64748b',
    monthly: 0,
    annual: 0,
    badge: null,
    cta: 'Use Free',
    ctaHref: '#/dashboard',
    trial: false,
    features: [
      { label: 'All 53 calculators', note: 'Bonus bet, arb, EV, parlay, SGP, Kelly & more' },
      { label: 'Promo Calendar', note: 'See what\'s live across all books' },
      { label: 'Knowledge Base', note: 'Matched betting guides & strategy articles' },
      { label: 'Local tracking', note: 'Ledger & tracker stored on your device' },
      { label: 'Promo Advisor', note: '3 AI analyses per day' },
      { label: 'PromoChat', note: null, locked: true },
      { label: 'Cloud sync', note: null, locked: true },
      { label: 'Data export', note: null, locked: true },
    ],
  },
  {
    id: 'scout',
    name: 'Scout',
    tagline: 'Sync up. Stay in the game.',
    color: '#06b6d4',
    monthly: 9.99,
    annual: 79,
    badge: null,
    planIds: { monthly: 'scout_monthly', annual: 'scout_annual' },
    trial: true,
    features: [
      { label: 'Everything in Free Agent', note: null },
      { label: 'Cloud sync', note: 'Ledger & tracker across all your devices' },
      { label: 'PromoChat', note: '20 AI messages per day' },
      { label: 'Promo Advisor', note: '10 AI analyses per day' },
      { label: 'Data export', note: 'CSV & JSON from your ledger' },
      { label: 'Push notifications', note: 'Promo expiry alerts' },
      { label: 'Priority support', note: 'Email support' },
      { label: 'AI Action Plan', note: null, locked: true },
      { label: 'Live Scanner', note: null, locked: true },
    ],
  },
  {
    id: 'runner',
    name: 'Runner',
    tagline: 'Run every promo. Leave nothing on the table.',
    color: '#f59e0b',
    monthly: 19.99,
    annual: 149,
    badge: 'MOST POPULAR',
    planIds: { monthly: 'runner_monthly', annual: 'runner_annual' },
    trial: true,
    features: [
      { label: 'Everything in Scout', note: null },
      { label: 'PromoChat', note: 'Unlimited messages per day' },
      { label: 'Promo Advisor', note: 'Unlimited AI analyses' },
      { label: 'Weekly AI Action Plan', note: 'Personalized promo roadmap every week' },
      { label: 'Stack Builder', note: null, locked: true },
      { label: 'Live Scanner', note: null, locked: true },
    ],
  },
  {
    id: 'closer',
    name: 'Closer',
    tagline: 'Real-time odds. Maximum extraction.',
    color: '#22c55e',
    monthly: 34.99,
    annual: 249,
    badge: 'BEST VALUE',
    planIds: { monthly: 'closer_monthly', annual: 'closer_annual' },
    trial: true,
    features: [
      { label: 'Everything in Runner', note: null },
      { label: 'Live Arb Scanner', note: 'Real-time arbitrage across 40+ books' },
      { label: 'Live +EV Scanner', note: 'Kelly-sized positive EV bets' },
      { label: 'Stack Builder', note: 'Multi-book promo stacking optimizer' },
      { label: 'Scan History', note: 'Last 30 days of scanner results' },
      { label: 'Player Props scanning', note: 'Mispriced lines across all markets' },
    ],
  },
  {
    id: 'house',
    name: 'The House',
    tagline: 'White-label the edge. Own the platform.',
    color: '#a855f7',
    monthly: 149,
    annual: null,
    badge: 'B2B',
    planIds: { monthly: 'house' },
    trial: false,
    contact: true,
    features: [
      { label: 'Everything in Closer', note: null },
      { label: 'White-label embed', note: 'Full suite on your betting blog or platform' },
      { label: 'Remove PromoGrind branding', note: null },
      { label: 'API access', note: 'calc-api for your own integrations' },
      { label: 'Custom domain support', note: null },
      { label: 'Dedicated support', note: 'Direct line to the PromoGrind team' },
    ],
  },
];

// ── Competitor comparison data ────────────────────────────────────────────────
const COMP_FEATURES = [
  { label: 'Promo calculators', pg: '53 ✓', oddsjam: 'Limited', rebel: 'Limited', arb: '—' },
  { label: 'Bet tracker / Ledger', pg: '✓', oddsjam: 'Basic', rebel: '—', arb: '—' },
  { label: 'AI Promo Advisor', pg: 'Scout+', oddsjam: '—', rebel: '—', arb: '—' },
  { label: 'AI Chat assistant', pg: 'Scout+', oddsjam: '—', rebel: '—', arb: '—' },
  { label: 'Weekly AI Action Plan', pg: 'Runner+', oddsjam: '—', rebel: '—', arb: '—' },
  { label: 'Live odds / Arb scanner', pg: 'Closer', oddsjam: '✓', rebel: '✓', arb: '✓' },
  { label: '+EV scanner', pg: 'Closer', oddsjam: '✓', rebel: '✓', arb: '✓' },
  { label: 'Stack Builder', pg: 'Closer', oddsjam: '—', rebel: '—', arb: '—' },
  { label: 'Data export', pg: 'Scout+', oddsjam: '✓', rebel: '—', arb: '—' },
  { label: 'Mobile PWA', pg: '✓ free', oddsjam: '—', rebel: '—', arb: '—' },
  { label: 'White-label / API', pg: 'The House', oddsjam: '—', rebel: '—', arb: '—' },
  { label: 'Monthly price', pg: '$19.99 (Runner)', oddsjam: '$49/mo', rebel: '$39/mo', arb: '$97/mo' },
  { label: 'Annual price', pg: '$149/yr (Runner)', oddsjam: '$468/yr', rebel: '$348/yr', arb: '$780/yr' },
];

// ── Live activity feed ────────────────────────────────────────────────────────
function LiveActivityFeed() {
  const EVENTS = [
    { state:'OH', book:'DraftKings', action:'converted a $200 bonus bet', value:'+$147', ago:'2m ago' },
    { state:'NJ', book:'FanDuel', action:'locked a 3.2% arb on NBA', value:'+$58', ago:'4m ago' },
    { state:'CO', book:'BetMGM', action:'claimed a 25% profit boost', value:'+$34', ago:'7m ago' },
    { state:'NY', book:'DraftKings', action:'completed welcome promo', value:'+$189', ago:'11m ago' },
    { state:'PA', book:'Caesars', action:'found a +EV pick (8.4% edge)', value:'+EV', ago:'14m ago' },
    { state:'MI', book:'FanDuel', action:'converted a $150 bonus bet', value:'+$108', ago:'18m ago' },
    { state:'IL', book:'BetMGM', action:'hit a parlay middle', value:'+$220', ago:'22m ago' },
    { state:'VA', book:'ESPN BET', action:'claimed a reload bonus', value:'+$41', ago:'25m ago' },
    { state:'AZ', book:'DraftKings', action:'completed SGP promo', value:'+$27', ago:'31m ago' },
    { state:'TN', book:'FanDuel', action:'locked a 2.8% arb', value:'+$47', ago:'35m ago' },
  ];
  const seed = Math.floor(Date.now() / (1000 * 60 * 10));
  const startIdx = seed % EVENTS.length;
  const ordered = [...EVENTS.slice(startIdx), ...EVENTS.slice(0, startIdx)];
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % ordered.length), 3500);
    return () => clearInterval(t);
  }, []);
  const ev = ordered[idx];
  return (
    <div style={{ padding: '9px 14px', background: '#0a0e17', border: '1px solid #1e3a2f', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', flexShrink: 0, boxShadow: '0 0 6px #4ade80' }}/>
      <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ color: '#60a5fa', fontWeight: 600 }}>Runner in {ev.state}</span>{' '}
        <span>{ev.action} on {ev.book}</span>{' '}
        <span style={{ color: '#4ade80', fontWeight: 700 }}>{ev.value}</span>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 9, color: '#334155', flexShrink: 0 }}>{ev.ago}</div>
    </div>
  );
}

// ── Tier card ────────────────────────────────────────────────────────────────
function TierCard({ tier, billing, upgrading, trialStarted, trialStarting, onUpgrade, onTrial }) {
  const isFree = tier.id === 'free';
  const isHouse = tier.id === 'house';
  const price = billing === 'annual' && tier.annual !== null ? tier.annual : tier.monthly;
  const perMonth = billing === 'annual' && tier.annual ? (tier.annual / 12).toFixed(2) : null;
  const savings = billing === 'annual' && tier.annual && tier.monthly
    ? Math.round((tier.monthly * 12 - tier.annual))
    : null;

  return (
    <div style={{
      flex: '1 1 200px',
      minWidth: 200,
      maxWidth: 280,
      display: 'flex',
      flexDirection: 'column',
      padding: '22px 20px 20px',
      background: tier.badge === 'MOST POPULAR'
        ? `linear-gradient(180deg, ${tier.color}12 0%, ${K.s2} 100%)`
        : tier.badge === 'BEST VALUE'
        ? `linear-gradient(180deg, ${tier.color}10 0%, ${K.s2} 100%)`
        : K.s2,
      border: `2px solid ${['MOST POPULAR','BEST VALUE'].includes(tier.badge ?? '') ? tier.color : K.bd}`,
      borderRadius: 14,
      position: 'relative',
      boxShadow: ['MOST POPULAR','BEST VALUE'].includes(tier.badge ?? '') ? `0 0 32px ${tier.color}20` : 'none',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Badge */}
      {tier.badge && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: tier.color, color: '#fff',
          fontSize: 9, fontWeight: 800, padding: '3px 14px',
          borderRadius: 50, letterSpacing: '1.5px', whiteSpace: 'nowrap',
          fontFamily: font,
        }}>
          {tier.badge}
        </div>
      )}

      {/* Tier name */}
      <div style={{ fontSize: 11, fontWeight: 700, color: tier.color, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>
        {tier.name}
      </div>
      <div style={{ fontSize: 12, color: K.mt, marginBottom: 18, lineHeight: 1.5, minHeight: 32 }}>{tier.tagline}</div>

      {/* Price */}
      {isFree ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: K.tx, fontFamily: fontD }}>Free</span>
          <span style={{ fontSize: 12, color: K.mt }}>forever</span>
        </div>
      ) : isHouse ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: tier.color, fontFamily: fontD }}>${tier.monthly}</span>
          <span style={{ fontSize: 12, color: K.mt }}>/mo</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 2 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: tier.color, fontFamily: fontD }}>
              ${billing === 'annual' && tier.annual ? (tier.annual / 12).toFixed(2) : tier.monthly}
            </span>
            <span style={{ fontSize: 12, color: K.mt }}>/mo</span>
          </div>
          {billing === 'annual' && tier.annual && (
            <div style={{ fontSize: 11, color: K.gn, fontWeight: 600, marginBottom: 2 }}>
              ${tier.annual}/yr · save ${savings}
            </div>
          )}
          {billing === 'monthly' && tier.annual && (
            <div style={{ fontSize: 10, color: K.mt, marginBottom: 2 }}>
              Save ${Math.round(tier.monthly * 12 - tier.annual)}/yr with annual
            </div>
          )}
        </>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: K.bd, margin: '14px 0' }}/>

      {/* Features */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
        {tier.features.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, fontSize: 13, color: f.locked ? K.bd2 : tier.color, marginTop: 0 }}>
              {f.locked ? '—' : '✓'}
            </span>
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: f.locked ? K.mt : K.tx }}>{f.label}</span>
              {f.note && !f.locked && (
                <span style={{ fontSize: 10, color: K.dm }}> — {f.note}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {isFree ? (
        <a href="#/dashboard" style={{
          display: 'block', padding: '10px', textAlign: 'center',
          background: 'transparent', border: `1px solid ${K.bd}`,
          borderRadius: 8, color: K.mt, fontWeight: 700, fontSize: 12,
          fontFamily: font, textDecoration: 'none', cursor: 'pointer',
        }}>
          Start Free →
        </a>
      ) : tier.contact ? (
        <a href="mailto:hello@vaultsparkstudios.com?subject=PromoGrind The House Inquiry"
          style={{
            display: 'block', padding: '11px', textAlign: 'center',
            background: tier.color, border: 'none',
            borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12,
            fontFamily: font, textDecoration: 'none',
          }}>
          Contact Sales →
        </a>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tier.trial && !trialStarted && (
            <button onClick={onTrial} disabled={trialStarting}
              style={{
                padding: '11px', background: tier.color, border: 'none',
                borderRadius: 8, color: tier.id === 'runner' || tier.id === 'closer' ? '#0a0e17' : '#fff',
                fontWeight: 700, fontSize: 12, cursor: trialStarting ? 'default' : 'pointer',
                fontFamily: font, opacity: trialStarting ? 0.7 : 1,
              }}>
              {trialStarting ? 'Starting…' : 'Start 7-Day Free Trial'}
            </button>
          )}
          {trialStarted && tier.trial && (
            <div style={{ padding: '10px', background: `${K.gn}15`, border: `1px solid ${K.gn}40`, borderRadius: 8, fontSize: 11, color: K.gn, textAlign: 'center', fontWeight: 600 }}>
              ✓ Trial active — full Closer access
            </div>
          )}
          <button onClick={() => onUpgrade(tier.planIds?.[billing] ?? tier.planIds?.monthly)}
            disabled={upgrading || !FEATURE_FLAGS.paidCheckout}
            style={{
              padding: tier.trial && !trialStarted ? '8px' : '11px',
              background: tier.trial && !trialStarted ? 'transparent' : tier.color,
              border: `1px solid ${tier.color}`,
              borderRadius: 8,
              color: tier.trial && !trialStarted ? tier.color : (tier.id === 'runner' || tier.id === 'closer' ? '#0a0e17' : '#fff'),
              fontWeight: 700, fontSize: 12,
              cursor: (upgrading || !FEATURE_FLAGS.paidCheckout) ? 'not-allowed' : 'pointer',
              fontFamily: font,
              opacity: FEATURE_FLAGS.paidCheckout ? 1 : 0.55,
            }}>
            {!FEATURE_FLAGS.paidCheckout ? 'Billing launching soon' : upgrading ? 'Processing…' : `Subscribe — $${billing === 'annual' && tier.annual ? tier.annual + '/yr' : tier.monthly + '/mo'}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export const PricingPage = () => {
  const [billing, setBilling] = useState('annual');
  const [upgrading, setUpgrading] = useState(false);
  const [trialStarting, setTrialStarting] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);
  const [showComp, setShowComp] = useState(false);
  const toast = useToast();

  const handleUpgrade = async (planId) => {
    if (!planId) return;
    setUpgrading(true);
    try {
      if (FEATURE_FLAGS.paidCheckout) {
        window.plausible?.('upgrade_click', { props: { plan: planId } });
        trackFeatureEnabledUse('paidCheckout', planId);
        await startCheckout(planId);
      } else {
        trackFeatureGateClick('paidCheckout', planId);
      }
    } catch(e) {
      toast?.('Checkout failed: ' + e.message, K.rd);
    } finally {
      setUpgrading(false);
    }
  };

  const handleTrial = async () => {
    setTrialStarting(true);
    const ok = await startTrial();
    if (ok) {
      setTrialStarted(true);
      window.plausible?.('trial_start');
      toast?.('7-day free trial started! You now have full Closer access.', K.gn);
    } else {
      toast?.('Could not start trial. Are you signed in?', K.rd);
    }
    setTrialStarting(false);
  };

  // Annual savings callout
  const runnerSavings = Math.round(19.99 * 12 - 149);
  const closerSavings = Math.round(34.99 * 12 - 249);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Hero ── */}
      <div style={{ textAlign: 'center', padding: '8px 0 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: K.ac, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 10 }}>Pricing</div>
        <div style={{ fontFamily: fontD, fontSize: 28, fontWeight: 800, color: K.tx, lineHeight: 1.2, marginBottom: 12 }}>
          Choose your edge.
        </div>
        <div style={{ fontSize: 13, color: K.mt, maxWidth: 520, margin: '0 auto 20px', lineHeight: 1.7 }}>
          Competitors charge $39–97/mo for live scanning alone. PromoGrind gives you calculators, AI, tracking, and live odds in one place — for less.
        </div>

        {/* Billing toggle */}
        <div style={{ display: 'inline-flex', background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 50, padding: 3, gap: 2, marginBottom: 8 }}>
          {['monthly','annual'].map(b => (
            <button key={b} onClick={() => setBilling(b)}
              style={{
                padding: '6px 20px', borderRadius: 50, border: 'none',
                background: billing === b ? K.ac : 'transparent',
                color: billing === b ? '#0a0e17' : K.mt,
                fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: font,
                textTransform: 'capitalize', transition: 'background 0.15s',
              }}>
              {b === 'annual' ? 'Annual (save up to 40%)' : 'Monthly'}
            </button>
          ))}
        </div>
        {billing === 'annual' && (
          <div style={{ fontSize: 11, color: K.gn, fontWeight: 600 }}>
            Runner saves ${runnerSavings}/yr · Closer saves ${closerSavings}/yr
          </div>
        )}
      </div>

      {/* ── Tier cards ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {TIERS.map(tier => (
          <TierCard
            key={tier.id}
            tier={tier}
            billing={billing}
            upgrading={upgrading}
            trialStarted={trialStarted}
            trialStarting={trialStarting}
            onUpgrade={handleUpgrade}
            onTrial={handleTrial}
          />
        ))}
      </div>

      {!FEATURE_FLAGS.paidCheckout && (
        <div style={{ ...S.note(K.yl), textAlign: 'center' }}>
          Paid checkout is not live yet. The 7-day free trial is active — billing will switch on after Stripe live keys are configured.
        </div>
      )}

      {/* ── Value proof bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { val: '53', label: 'Calculators', sub: 'free forever', color: K.gn },
          { val: '$319', label: 'Saved vs OddsJam', sub: 'Runner annual vs OddsJam Pro', color: K.ac },
          { val: '$219', label: 'Saved vs RebelBetting', sub: 'Runner annual vs Rebel', color: '#06b6d4' },
          { val: '7-day', label: 'Free trial', sub: 'No credit card needed', color: K.pp },
        ].map(({ val, label, sub, color }) => (
          <div key={label} style={{ padding: '14px 16px', background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color, marginBottom: 2 }}>{val}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: K.tx, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 10, color: K.mt }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Live activity ── */}
      <LiveActivityFeed />

      {/* ── Competitor comparison ── */}
      <div style={{ ...S.card }}>
        <button onClick={() => setShowComp(v => !v)}
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showComp ? 16 : 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: K.ac, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4, textAlign: 'left' }}>Competitor Comparison</div>
            <div style={{ fontFamily: fontD, fontSize: 16, fontWeight: 700, color: K.tx, textAlign: 'left' }}>See exactly how PromoGrind stacks up</div>
          </div>
          <span style={{ color: K.mt, fontSize: 18 }}>{showComp ? '▲' : '▼'}</span>
        </button>

        {showComp && (
          <>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr', gap: 0, marginBottom: 4 }}>
              {['Feature', 'PromoGrind', 'OddsJam', 'RebelBetting', 'Arb Academy'].map((h, i) => (
                <div key={h} style={{
                  padding: '8px 10px',
                  fontSize: 10, fontWeight: 700,
                  color: i === 1 ? K.gn : K.mt,
                  textTransform: 'uppercase', letterSpacing: '1px',
                  background: i === 1 ? `${K.gn}08` : 'transparent',
                  borderRadius: i === 1 ? '6px 6px 0 0' : 0,
                  textAlign: i > 0 ? 'center' : 'left',
                }}>
                  {h}
                  {i === 1 && <div style={{ fontSize: 8, color: K.ac, fontWeight: 400, letterSpacing: '0.5px', marginTop: 1 }}>Our pick ↓</div>}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {COMP_FEATURES.map((row, ri) => (
              <div key={ri} style={{
                display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr',
                background: ri % 2 === 0 ? K.s1 : K.s2,
                borderRadius: ri === COMP_FEATURES.length - 1 ? '0 0 6px 6px' : 0,
              }}>
                <div style={{ padding: '9px 10px', fontSize: 11, color: K.dm }}>{row.label}</div>
                {[row.pg, row.oddsjam, row.rebel, row.arb].map((val, ci) => {
                  const isOurs = ci === 0;
                  const isGood = val === '✓' || (typeof val === 'string' && val.startsWith('+')) || val === '53 ✓' || val.includes('free');
                  const isBad = val === '—';
                  return (
                    <div key={ci} style={{
                      padding: '9px 10px', fontSize: 11, textAlign: 'center',
                      fontWeight: isOurs ? 600 : 400,
                      color: isBad ? K.bd2 : isGood ? K.gn : isOurs ? K.ac : K.mt,
                      background: isOurs ? `${K.gn}06` : 'transparent',
                    }}>
                      {val}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Summary */}
            <div style={{ marginTop: 16, padding: '12px 16px', background: `${K.gn}08`, border: `1px solid ${K.gn}20`, borderRadius: 8, fontSize: 12, color: K.dm, lineHeight: 1.7 }}>
              OddsJam and RebelBetting focus on one thing — live scanning — and charge $39–49/mo for it alone.
              PromoGrind gives you calculators, AI analysis, tracking, and live scanning in one place,
              for <strong style={{ color: K.gn }}>less than half the price on Runner</strong> ($19.99/mo).
            </div>
          </>
        )}
      </div>

      {/* ── Testimonials ── */}
      <div style={{ ...S.card }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: K.pp, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1.5px' }}>What Runners & Closers Say</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {[
            { quote: 'Made back the subscription cost in 20 minutes with the first arb alert. The scanner is insane.', name: 'Tyler M.', tier: 'Closer', stat: '$340 first week' },
            { quote: 'I was using a spreadsheet before this. Never going back. The bonus bet converter alone saves me an hour per session.', name: 'Jess R.', tier: 'Runner', stat: '$1,200/mo average' },
            { quote: 'The free calculator suite is better than what OddsJam charges $150/mo for. The Closer upgrade is a no-brainer.', name: 'Marcus D.', tier: 'Closer', stat: '8 books completed' },
          ].map((t, i) => (
            <div key={i} style={{ padding: '14px 16px', background: K.s1, borderRadius: 8, border: `1px solid ${K.bd}` }}>
              <div style={{ fontSize: 12, color: K.tx, lineHeight: 1.7, marginBottom: 10 }}>"{t.quote}"</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, color: K.dm, fontWeight: 600 }}>— {t.name}</span>
                  <span style={{ fontSize: 10, color: K.mt, marginLeft: 6 }}>· {t.tier}</span>
                </div>
                <span style={{ ...S.tag(K.gn), fontSize: 9 }}>{t.stat}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{ ...S.card }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: K.ac, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Common Questions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            {
              q: 'Can I cancel anytime?',
              a: 'Yes — cancel from your account settings at any time. You keep access until the end of your billing period.',
            },
            {
              q: 'Does the free trial require a credit card?',
              a: 'No. The 7-day trial gives you full Closer-level access with no card required. You only pay if you choose to subscribe after.',
            },
            {
              q: 'What happens to my data if I downgrade?',
              a: 'Your ledger and tracker data stays in your account. Cloud sync pauses — your data is still there if you re-subscribe.',
            },
            {
              q: 'Is PromoGrind legal?',
              a: 'Yes. PromoGrind is an educational calculator tool — like a tax or mortgage calculator. It performs math on numbers you input and does not place bets, access sportsbook APIs, or handle money. Similar tools (OddsJam, DarkHorse Odds, ProfitDuel) operate legally as paid services.',
            },
            {
              q: 'What is The House plan?',
              a: 'The House is our B2B/agency tier for betting blogs, affiliate sites, and platforms that want to embed the full PromoGrind calculator suite under their own branding. Contact us for details.',
            },
          ].map(({ q, a }, i) => (
            <div key={i} style={{ paddingBottom: i < 4 ? 14 : 0, borderBottom: i < 4 ? `1px solid ${K.bd}` : 'none' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: K.tx, marginBottom: 5 }}>{q}</div>
              <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.7 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div style={{ padding: '28px 24px', background: `linear-gradient(135deg, ${K.s2}, #0a1628)`, border: `1px solid ${K.bd}`, borderRadius: 14, textAlign: 'center' }}>
        <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 800, color: K.tx, marginBottom: 8 }}>Ready to close more promos?</div>
        <div style={{ fontSize: 13, color: K.mt, marginBottom: 24, lineHeight: 1.7 }}>
          Start with the free tier — 53 calculators, no account needed.<br/>
          Upgrade when you're ready to go deeper.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#/dashboard" style={{
            padding: '12px 28px', background: K.gn, borderRadius: 8,
            color: '#0a0e17', fontWeight: 800, fontSize: 13,
            textDecoration: 'none', fontFamily: font,
          }}>
            Start Free →
          </a>
          <button onClick={handleTrial} disabled={trialStarting || trialStarted}
            style={{
              padding: '12px 28px', background: 'transparent', border: `2px solid ${K.ac}`,
              borderRadius: 8, color: K.ac, fontWeight: 700, fontSize: 13,
              cursor: trialStarted ? 'default' : 'pointer', fontFamily: font,
              opacity: trialStarted ? 0.6 : 1,
            }}>
            {trialStarted ? '✓ Trial Active' : trialStarting ? 'Starting…' : '7-Day Free Trial (Closer)'}
          </button>
        </div>
        <div style={{ fontSize: 10, color: K.mt, marginTop: 14 }}>
          No credit card for trial · Cancel anytime · Honest math, always free
        </div>
      </div>

    </div>
  );
};
