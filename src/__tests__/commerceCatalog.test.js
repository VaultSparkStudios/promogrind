import { describe, expect, it } from 'vitest';
import { buildCommerceCatalog } from '../data/commerceCatalog.js';

describe('commerce catalog', () => {
  it('fails closed when provider-backed features and checkout are disabled', () => {
    const catalog = buildCommerceCatalog({});
    expect(catalog.checkout.enabled).toBe(false);
    expect(catalog.plans.find((plan) => plan.id === 'closer').commerciallyAvailable).toBe(false);
    expect(catalog.plans.flatMap((plan) => plan.features).filter((item) => item.capability).every((item) => !item.available)).toBe(true);
  });

  it('enables only capabilities named by launch flags', () => {
    const catalog = buildCommerceCatalog({ paidCheckout: true, promoChat: true });
    expect(catalog.checkout.enabled).toBe(true);
    expect(catalog.plans.find((plan) => plan.id === 'scout').features.find((item) => item.capability === 'promoChat').available).toBe(true);
    expect(catalog.plans.find((plan) => plan.id === 'closer').features.find((item) => item.capability === 'liveScanner').available).toBe(false);
  });
});
