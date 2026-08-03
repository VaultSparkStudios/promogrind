import React from 'react';
import { K } from '../lib/shared.js';
import { S, Tl, Nt } from '../ui.jsx';
import { COMMERCE_CATALOG } from '../data/commerceCatalog.js';

const rows = [
  ['Calculator route contract', '53 routes', 'Verify current documentation'],
  ['Paid checkout', COMMERCE_CATALOG.checkout.enabled ? 'Available' : 'Not live', 'Verify current pricing and terms'],
  ['Provider-backed features', 'Explicit launch-state labels', 'Verify current data sources and coverage'],
  ['Outcome evidence', 'User-recorded realized outcomes', 'Test with the same representative workflow'],
  ['Legal and operator eligibility', 'User verifies jurisdiction and terms', 'Verify with operator and local authority'],
];

const CompetitorComparison = () => (
  <div style={S.card}>
    <Tl t="Evaluate the Alternatives" badge="EVIDENCE FIRST" bc={K.gn} />
    <Nt c={K.gn}>Third-party features and prices change. PromoGrind does not reproduce them as timeless facts; compare current primary documentation and run the same workflow in each product.</Nt>
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr>{['Decision criterion', 'PromoGrind evidence', 'External-provider check'].map((heading, index) => <th key={heading} style={{ textAlign: 'left', padding: '9px 10px', borderBottom: `1px solid ${K.bd2}`, color: index === 1 ? K.gn : K.mt, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>{heading}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row[0]}>{row.map((value, index) => <td key={value} style={{ padding: '9px 10px', borderBottom: `1px solid ${K.bd}`, color: index === 1 ? K.gn : K.dm, fontWeight: index === 0 ? 700 : 400 }}>{value}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <div style={{ marginTop: 16, padding: 14, background: K.s2, borderRadius: 8, border: `1px solid ${K.bd}`, color: K.dm, fontSize: 12, lineHeight: 1.7 }}>
      Choose from measured fit: correctness, provenance, workflow time, accessibility, current terms, and the features you can actually verify—not an undated price table.
    </div>
  </div>
);

export default CompetitorComparison;
