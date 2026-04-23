import React from "react";
import { K, S } from "../lib/shared.js";
import { APP_CHROME_COPY } from "./appText.js";

export const TrustStrip = () => (
  <div style={{ background: `${K.gn}08`, borderBottom: `1px solid ${K.bd}`, padding: "8px 20px" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 14, flexWrap: "wrap", fontSize: 10, color: K.dm, letterSpacing: "0.4px" }}>
      <span><strong style={{ color: K.gn }}>Free PromoGrind account</strong> unlocks sync and access across all devices.</span>
      {APP_CHROME_COPY.trustStrip.slice(1).map((item) => <span key={item}>{item}</span>)}
    </div>
  </div>
);

export const MembershipBanner = () => (
  <div style={{ ...S.note(K.ac), marginBottom: 12 }}>
    {APP_CHROME_COPY.membershipBanner}
  </div>
);

export const AppFooter = () => (
  <div style={{ borderTop: `1px solid ${K.bd}`, padding: "28px 20px", marginTop: 8 }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <p style={{ fontSize: 11, color: K.mt, lineHeight: 1.9, marginBottom: 8 }}>
        <span style={{ color: K.dm, fontWeight: 600 }}>Affiliate Disclosure:</span> {APP_CHROME_COPY.footerAffiliate}
      </p>
      <p style={{ fontSize: 11, color: K.mt, lineHeight: 1.9, marginBottom: 8 }}>
        <span style={{ color: K.dm, fontWeight: 600 }}>Access:</span> {APP_CHROME_COPY.footerAccess}
      </p>
      <p style={{ fontSize: 11, color: K.mt, lineHeight: 1.9, marginBottom: 8 }}>
        {APP_CHROME_COPY.footerDisclaimer.replace("1-800-GAMBLER", "")}
        <span style={{ color: K.rd, fontWeight: 600 }}>1-800-GAMBLER</span>.
      </p>
      <p style={{ fontSize: 10, color: K.bd2, marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span>&copy; {new Date().getFullYear()} | <a href="https://vaultsparkstudios.com/" rel="author" target="_blank" style={{ color: "inherit", textDecoration: "none" }}>VaultSpark Studios</a> | {APP_CHROME_COPY.footerLegal}</span>
        <a href="/privacy/" style={{ color: K.mt, textDecoration: "none" }}>Privacy</a>
        <a href="/terms/" style={{ color: K.mt, textDecoration: "none" }}>Terms</a>
        <a href="/responsible-gambling/" style={{ color: K.mt, textDecoration: "none" }}>Responsible Gambling</a>
        <a href="/affiliate-disclosure/" style={{ color: K.mt, textDecoration: "none" }}>Affiliate Disclosure</a>
        <a href="/disclaimer/" style={{ color: K.mt, textDecoration: "none" }}>Disclaimer</a>
        <a href="/dmca/" style={{ color: K.mt, textDecoration: "none" }}>DMCA / IP</a>
        <a href="/data-policy/" style={{ color: K.mt, textDecoration: "none" }}>Data Policy</a>
        <a href="/about/" style={{ color: K.mt, textDecoration: "none" }}>About</a>
        <a href="/compliance/" style={{ color: K.mt, textDecoration: "none" }}>Compliance</a>
      </p>
    </div>
  </div>
);
