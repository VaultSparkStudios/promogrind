// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TaxesEstimator } from '../components/TaxesEstimator.jsx';
import { PromoStacking } from '../components/TrackingTools.jsx';
afterEach(cleanup);
describe('Tax planning worksheet', () => {
  it('never substitutes ledger profit for taxable income', () => {
    render(<TaxesEstimator appData={{ledger:[{profit:2000,payout:600}]}} />);
    expect(screen.getByText(/Recorded ledger net: \$2000.00/)).toBeTruthy();
    expect(screen.getByLabelText('Amount to model ($)').value).toBe('');
    expect(screen.queryByText(/W-2G Events|Quarterly Payment|Total Tax Liability/)).toBeNull();
    expect(screen.queryByText('Illustrative amounts')).toBeNull();
  });
  it('calculates only the entered scenario and respects explicit zero', () => {
    render(<TaxesEstimator appData={{ledger:[{profit:2000}]}} />);
    fireEvent.change(screen.getByLabelText('Amount to model ($)'),{target:{value:'1000'}});
    fireEvent.change(screen.getByLabelText('Federal rate to model (%)'),{target:{value:'22'}});
    fireEvent.change(screen.getByLabelText('State rate to model (%)'),{target:{value:'5'}});
    expect(screen.getByText('Combined: $270.00')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Amount to model ($)'),{target:{value:'0'}});
    expect(screen.getByText('Combined: $0.00')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Federal rate to model (%)'),{target:{value:'101'}});
    expect(screen.queryByText('Illustrative amounts')).toBeNull();
  });
});
it('renders Promo Stacking without a missing hook exception', () => {
  const {container}=render(<PromoStacking />);
  expect(container.textContent).toMatch(/stack/i);
});
