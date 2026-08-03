import { FEATURE_FLAGS } from '../launchState.js';

const feature = (label, note, capability = null) => ({ label, note, capability });

export const PLAN_DEFINITIONS = Object.freeze([
  {
    id: 'free', name: 'Free Agent', tagline: 'Calculate and track locally. No account required.', color: '#64748b',
    monthly: 0, annual: 0, badge: null, trial: false,
    features: [
      feature('53 calculator routes', 'Math tools stay available without paid checkout'),
      feature('Promo Calendar', 'Review operator offers and verify terms at the source'),
      feature('Knowledge Base', 'Educational workflow guides'),
      feature('Local tracking', 'Ledger data stored on this device'),
      feature('Promo Advisor', 'Requires an enabled AI provider path', 'promoAdvisor'),
      feature('PromoChat', 'Requires an enabled AI provider path', 'promoChat'),
    ],
  },
  {
    id: 'scout', name: 'Scout', tagline: 'A planned cloud workspace for multi-device review.', color: '#06b6d4',
    monthly: 9.99, annual: 79, badge: null, planIds: { monthly: 'scout_monthly', annual: 'scout_annual' }, trial: true,
    features: [
      feature('Everything in Free Agent'),
      feature('Cloud sync', 'Available to signed-in workspace users'),
      feature('PromoChat', 'Requires an enabled AI provider path', 'promoChat'),
      feature('Promo Advisor', 'Requires an enabled AI provider path', 'promoAdvisor'),
      feature('Data export', 'CSV and JSON exports from your ledger'),
      feature('Push notifications', 'Requires an enabled browser push path', 'pushAlerts'),
    ],
  },
  {
    id: 'runner', name: 'Runner', tagline: 'A planned guided workflow for recurring promo review.', color: '#f59e0b',
    monthly: 19.99, annual: 149, badge: 'PLANNED', planIds: { monthly: 'runner_monthly', annual: 'runner_annual' }, trial: true,
    features: [
      feature('Everything in Scout'),
      feature('PromoChat', 'Requires an enabled AI provider path', 'promoChat'),
      feature('Promo Advisor', 'Requires an enabled AI provider path', 'promoAdvisor'),
      feature('AI Action Plan', 'Requires an enabled AI provider path', 'aiActionPlan'),
      feature('Stack Builder', 'Requires an enabled AI provider path', 'stackBuilder'),
    ],
  },
  {
    id: 'closer', name: 'Closer', tagline: 'Planned live-data workflows, gated until their feeds are proven.', color: '#22c55e',
    monthly: 34.99, annual: 249, badge: 'PLANNED', planIds: { monthly: 'closer_monthly', annual: 'closer_annual' }, trial: true,
    features: [
      feature('Everything in Runner'),
      feature('Live Arb Scanner', 'Requires enabled and verified live-odds infrastructure', 'liveScanner'),
      feature('Live +EV Scanner', 'Requires enabled and verified live-odds infrastructure', 'liveScanner'),
      feature('Stack Builder', 'Requires an enabled AI provider path', 'stackBuilder'),
    ],
  },
  {
    id: 'house', name: 'The House', tagline: 'A future business integration surface; contact us to discuss fit.', color: '#a855f7',
    monthly: 149, annual: null, badge: 'DISCOVERY', trial: false, contact: true,
    features: [
      feature('Calculator-suite integration', 'Scope and availability are confirmed during discovery'),
      feature('Brand and domain options', 'Subject to a written implementation scope'),
      feature('API access', 'Not generally available; architecture review required'),
    ],
  },
]);

export function buildCommerceCatalog(flags = FEATURE_FLAGS) {
  const checkoutEnabled = Boolean(flags.paidCheckout);
  return {
    checkout: {
      enabled: checkoutEnabled,
      label: checkoutEnabled ? 'Checkout available' : 'Planned pricing — checkout is not live',
    },
    trial: {
      enabled: true,
      label: '7-day workspace trial',
      scope: 'The trial unlocks account workspace access; provider-gated features remain unavailable unless their launch flag is enabled.',
    },
    plans: PLAN_DEFINITIONS.map((plan) => ({
      ...plan,
      commerciallyAvailable: plan.id === 'free' || plan.contact || checkoutEnabled,
      features: plan.features.map((item) => ({
        ...item,
        available: item.capability ? Boolean(flags[item.capability]) : true,
        status: item.capability
          ? (flags[item.capability] ? 'available' : 'not live')
          : 'available',
      })),
    })),
  };
}

export const COMMERCE_CATALOG = buildCommerceCatalog();

export const COMMERCE_PROOF_CARDS = Object.freeze([
  { value: '53', label: 'calculator routes', detail: 'Counted in the repository route contract' },
  { value: '0', label: 'paid checkouts live', detail: 'Checkout remains disabled in the current launch state' },
  { value: '8', label: 'feature flags', detail: 'Every provider-backed capability is explicit and inspectable' },
  { value: '7 days', label: 'workspace trial', detail: 'Provider-gated features still follow their launch flags' },
]);
