import React, { useState } from 'react';
import { startCheckout, startTrial } from '../auth.js';
import { FEATURE_FLAGS } from '../launchState.js';
import { trackFeatureEnabledUse, trackFeatureGateClick } from '../launchTelemetry.js';
import { COMMERCE_CATALOG, COMMERCE_PROOF_CARDS } from '../data/commerceCatalog.js';
import { S } from '../ui.jsx';
import { useToast } from '../contexts.jsx';
import { K, font, fontD } from '../lib/shared.js';

function TierCard({ tier, billing, upgrading, trialStarting, trialStarted, onUpgrade, onTrial }) {
  const isFree = tier.id === 'free';
  const price = billing === 'annual' && tier.annual !== null ? tier.annual : tier.monthly;
  const perMonth = billing === 'annual' && tier.annual ? (tier.annual / 12).toFixed(2) : null;
  const selectedPlan = tier.planIds?.[billing] ?? tier.planIds?.monthly;
  const canSubscribe = COMMERCE_CATALOG.checkout.enabled && Boolean(selectedPlan);

  return (
    <section aria-labelledby={`plan-${tier.id}`} style={{
      flex: '1 1 220px', minWidth: 220, maxWidth: 300, display: 'flex', flexDirection: 'column',
      padding: '22px 20px 20px', background: K.s2, border: `1px solid ${tier.badge ? tier.color : K.bd}`,
      borderRadius: 14, position: 'relative', boxShadow: tier.badge ? `0 0 28px ${tier.color}16` : 'none',
    }}>
      {tier.badge && <div style={{ position: 'absolute', top: -11, left: 18, padding: '3px 10px', borderRadius: 30, background: tier.color, color: '#081018', fontSize: 9, fontWeight: 900, letterSpacing: '1.2px' }}>{tier.badge}</div>}
      <div id={`plan-${tier.id}`} style={{ marginTop: tier.badge ? 6 : 0, color: tier.color, fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>{tier.name}</div>
      <p style={{ minHeight: 44, margin: '7px 0 16px', color: K.mt, fontSize: 12, lineHeight: 1.55 }}>{tier.tagline}</p>

      {isFree ? (
        <div style={{ fontFamily: fontD, color: K.tx, fontSize: 30, fontWeight: 800 }}>Free</div>
      ) : tier.contact ? (
        <div style={{ fontFamily: fontD, color: tier.color, fontSize: 26, fontWeight: 800 }}>Scoped with you</div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: fontD, color: tier.color, fontSize: 30, fontWeight: 800 }}>${perMonth ?? price}</span>
            <span style={{ color: K.mt, fontSize: 12 }}>/mo</span>
          </div>
          <div style={{ minHeight: 18, color: K.mt, fontSize: 10 }}>
            {billing === 'annual' && tier.annual ? `${tier.annual}/year · planned price` : 'planned price'}
          </div>
        </div>
      )}

      <div style={{ height: 1, background: K.bd, margin: '14px 0' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
        {tier.features.map((item) => (
          <div key={`${tier.id}-${item.label}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span aria-hidden="true" style={{ color: item.available ? tier.color : K.mt, fontWeight: 800 }}>{item.available ? '✓' : '○'}</span>
            <div>
              <div style={{ color: item.available ? K.tx : K.mt, fontSize: 11, fontWeight: 700 }}>{item.label}{!item.available ? ' · not live' : ''}</div>
              {item.note && <div style={{ marginTop: 2, color: K.dm, fontSize: 10, lineHeight: 1.45 }}>{item.note}</div>}
            </div>
          </div>
        ))}
      </div>

      {isFree ? (
        <a href="#/dashboard" style={{ padding: 11, border: `1px solid ${K.bd}`, borderRadius: 8, color: K.tx, textAlign: 'center', textDecoration: 'none', fontSize: 12, fontWeight: 800 }}>Open the free workspace →</a>
      ) : tier.contact ? (
        <a href="mailto:contact@promogrind.bet?subject=PromoGrind business integration" style={{ padding: 11, borderRadius: 8, background: tier.color, color: '#fff', textAlign: 'center', textDecoration: 'none', fontSize: 12, fontWeight: 800 }}>Discuss an integration →</a>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tier.trial && (
            <button onClick={onTrial} disabled={trialStarting || trialStarted} style={{ padding: 11, border: 0, borderRadius: 8, background: trialStarted ? K.s1 : tier.color, color: trialStarted ? K.gn : '#081018', fontFamily: font, fontWeight: 800, cursor: trialStarted ? 'default' : 'pointer' }}>
              {trialStarted ? '✓ Workspace trial active' : trialStarting ? 'Starting…' : 'Start workspace trial'}
            </button>
          )}
          <button onClick={() => onUpgrade(selectedPlan)} disabled={upgrading || !canSubscribe} style={{ padding: 9, border: `1px solid ${tier.color}`, borderRadius: 8, background: 'transparent', color: canSubscribe ? tier.color : K.mt, fontFamily: font, fontWeight: 700, cursor: canSubscribe ? 'pointer' : 'not-allowed', opacity: canSubscribe ? 1 : 0.7 }}>
            {!canSubscribe ? 'Checkout not live' : upgrading ? 'Processing…' : 'Continue to checkout'}
          </button>
        </div>
      )}
    </section>
  );
}

function EvidencePanel() {
  return (
    <section aria-labelledby="commerce-evidence" style={{ ...S.card }}>
      <div id="commerce-evidence" style={{ color: K.ac, fontSize: 11, fontWeight: 800, letterSpacing: '1.7px', textTransform: 'uppercase' }}>Evidence you can inspect</div>
      <p style={{ color: K.dm, fontSize: 12, lineHeight: 1.65, margin: '8px 0 16px' }}>These are repository facts, not customer earnings, simulated activity, or comparisons to another provider's changeable pricing.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        {COMMERCE_PROOF_CARDS.map((card) => (
          <div key={card.label} style={{ padding: 14, border: `1px solid ${K.bd}`, borderRadius: 10, background: K.s1 }}>
            <div style={{ color: K.gn, fontFamily: fontD, fontSize: 22, fontWeight: 800 }}>{card.value}</div>
            <div style={{ color: K.tx, fontSize: 11, fontWeight: 800, marginTop: 3 }}>{card.label}</div>
            <div style={{ color: K.mt, fontSize: 10, lineHeight: 1.5, marginTop: 4 }}>{card.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export const PricingPage = () => {
  const [billing, setBilling] = useState('annual');
  const [upgrading, setUpgrading] = useState(false);
  const [trialStarting, setTrialStarting] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);
  const toast = useToast();

  const handleUpgrade = async (planId) => {
    if (!planId || !FEATURE_FLAGS.paidCheckout) {
      trackFeatureGateClick('paidCheckout', planId || 'pricing');
      return;
    }
    setUpgrading(true);
    try {
      window.plausible?.('upgrade_click', { props: { plan: planId } });
      trackFeatureEnabledUse('paidCheckout', planId);
      await startCheckout(planId);
    } catch (error) {
      toast?.(`Checkout failed: ${error.message}`, K.rd);
    } finally {
      setUpgrading(false);
    }
  };

  const handleTrial = async () => {
    setTrialStarting(true);
    try {
      const ok = await startTrial();
      if (ok) {
        setTrialStarted(true);
        window.plausible?.('trial_start');
        toast?.('Workspace trial started. Feature availability still follows the launch controls shown here.', K.gn);
      } else {
        toast?.('Could not start the workspace trial. Sign in and try again.', K.rd);
      }
    } finally {
      setTrialStarting(false);
    }
  };

  return (
    <main data-pricing-surface="capability-derived" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <header style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{ color: K.ac, fontSize: 11, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase' }}>Pricing & availability</div>
        <h1 style={{ margin: '9px 0 10px', color: K.tx, fontFamily: fontD, fontSize: 28 }}>See what works now—and what is still planned.</h1>
        <p style={{ maxWidth: 650, margin: '0 auto 18px', color: K.mt, fontSize: 13, lineHeight: 1.7 }}>The calculator workspace is free. Paid plan prices are a preview while checkout remains disabled, and every provider-backed feature below follows the current launch flags.</p>
        <div role="group" aria-label="Billing cadence" style={{ display: 'inline-flex', padding: 3, border: `1px solid ${K.bd}`, borderRadius: 50, background: K.s2 }}>
          {['monthly', 'annual'].map((value) => (
            <button key={value} onClick={() => setBilling(value)} aria-pressed={billing === value} style={{ padding: '7px 20px', border: 0, borderRadius: 50, background: billing === value ? K.ac : 'transparent', color: billing === value ? '#081018' : K.mt, fontFamily: font, fontSize: 11, fontWeight: 800, cursor: 'pointer', textTransform: 'capitalize' }}>{value}</button>
          ))}
        </div>
      </header>

      {!COMMERCE_CATALOG.checkout.enabled && <div role="status" style={{ ...S.note(K.yl), textAlign: 'center' }}><strong>{COMMERCE_CATALOG.checkout.label}.</strong> No subscription can be purchased from this build.</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
        {COMMERCE_CATALOG.plans.map((tier) => <TierCard key={tier.id} tier={tier} billing={billing} upgrading={upgrading} trialStarting={trialStarting} trialStarted={trialStarted} onUpgrade={handleUpgrade} onTrial={handleTrial} />)}
      </div>

      <EvidencePanel />

      <section aria-labelledby="pricing-faq" style={{ ...S.card }}>
        <div id="pricing-faq" style={{ color: K.ac, fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 14 }}>Important details</div>
        {[
          ['What does the trial include?', COMMERCE_CATALOG.trial.scope],
          ['Can I subscribe today?', COMMERCE_CATALOG.checkout.enabled ? 'Yes. Checkout is enabled in this build.' : 'No. The prices are a product preview and checkout is disabled.'],
          ['Does PromoGrind determine whether I may use a sportsbook offer?', 'No. Eligibility, operator terms, and local law vary. Verify them with the operator and an appropriate local authority before acting. PromoGrind supplies educational calculations and workflow tools, not legal advice.'],
          ['What happens to local data?', 'Calculator and locally tracked data remain in your browser unless you clear it. Signed-in synchronization and retention depend on the account workspace state described in the product.'],
        ].map(([question, answer], index) => (
          <div key={question} style={{ padding: '12px 0', borderTop: index ? `1px solid ${K.bd}` : 0 }}>
            <div style={{ color: K.tx, fontSize: 12, fontWeight: 800 }}>{question}</div>
            <div style={{ color: K.dm, fontSize: 12, lineHeight: 1.65, marginTop: 5 }}>{answer}</div>
          </div>
        ))}
      </section>

      <div style={{ padding: '24px', border: `1px solid ${K.bd}`, borderRadius: 14, background: K.s2, textAlign: 'center' }}>
        <div style={{ color: K.tx, fontFamily: fontD, fontSize: 21, fontWeight: 800 }}>Start with the math, then earn trust in every next layer.</div>
        <p style={{ color: K.mt, fontSize: 12, lineHeight: 1.65 }}>Open the free calculator workspace now. Provider-backed tools will identify themselves as unavailable until their launch controls and evidence are green.</p>
        <a href="#/dashboard" style={{ display: 'inline-block', padding: '11px 24px', borderRadius: 8, background: K.gn, color: K.ink, textDecoration: 'none', fontWeight: 900, fontSize: 12 }}>Open free workspace →</a>
      </div>
    </main>
  );
};
