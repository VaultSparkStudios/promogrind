import { FEATURE_FLAGS } from '../launchState.js';

const feature = (label, note, capability = null) => ({ label, note, capability });

export const PLAN_DEFINITIONS = Object.freeze([
  {
    id: 'free', name: 'Free Agent', tagline: 'Calculate and track locally. No account required.', color: '#64748b',
    monthly: 0, annual: 0, badge: null, trial: false,
    features: [
      feature('29 calculators', 'Compare offers and model outcomes for free'),
      feature('Promo Calendar', 'Review operator offers and verify terms at the source'),
      feature('Knowledge Base', 'Educational workflow guides'),
      feature('Local tracking', 'Ledger data stored on this device'),
      feature('Promo Advisor', 'Availability is shown below', 'promoAdvisor'),
      feature('PromoChat', 'Availability is shown below', 'promoChat'),
    ],
  },
  {
    id: 'scout', name: 'Scout', tagline: 'A planned cloud workspace for multi-device review.', color: '#06b6d4',
    monthly: 9.99, annual: 79, badge: null, planIds: { monthly: 'scout_monthly', annual: 'scout_annual' }, trial: true,
    features: [
      feature('Everything in Free Agent'),
      feature('Cloud sync', 'Available to signed-in workspace users'),
      feature('PromoChat', 'Ask questions about an offer', 'promoChat'),
      feature('Promo Advisor', 'Review an offer before placing a bet', 'promoAdvisor'),
      feature('Data export', 'CSV and JSON exports from your ledger'),
      feature('Push notifications', 'Daily brief alerts in supported browsers', 'pushAlerts'),
    ],
  },
  {
    id: 'runner', name: 'Runner', tagline: 'A planned guided workflow for recurring promo review.', color: '#f59e0b',
    monthly: 19.99, annual: 149, badge: 'PLANNED', planIds: { monthly: 'runner_monthly', annual: 'runner_annual' }, trial: true,
    features: [
      feature('Everything in Scout'),
      feature('PromoChat', 'Ask questions about an offer', 'promoChat'),
      feature('Promo Advisor', 'Review an offer before placing a bet', 'promoAdvisor'),
      feature('AI Action Plan', 'Organize the next steps for an offer', 'aiActionPlan'),
      feature('Stack Builder', 'Compare compatible promotions', 'stackBuilder'),
    ],
  },
  {
    id: 'closer', name: 'Closer', tagline: 'Planned tools for reviewing live odds and offers.', color: '#22c55e',
    monthly: 34.99, annual: 249, badge: 'PLANNED', planIds: { monthly: 'closer_monthly', annual: 'closer_annual' }, trial: true,
    features: [
      feature('Everything in Runner'),
      feature('Live Arb Scanner', 'Find differences between sportsbook odds', 'liveScanner'),
      feature('Live +EV Scanner', 'Compare offered odds with estimated fair odds', 'liveScanner'),
      feature('Stack Builder', 'Compare compatible promotions', 'stackBuilder'),
    ],
  },
  {
    id: 'house', name: 'The House', tagline: 'A future business integration surface; contact us to discuss fit.', color: '#a855f7',
    monthly: 149, annual: null, badge: 'DISCOVERY', trial: false, contact: true,
    features: [
      feature('Calculator-suite integration', 'Scope and availability are confirmed during discovery'),
      feature('Brand and domain options', 'Subject to a written implementation scope'),
      feature('API access', 'Contact us to discuss availability and your needs'),
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
      scope: 'The trial unlocks account workspace access. Tools marked coming soon remain unavailable during a trial.',
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
