import React from "react";
import { K, S } from "../lib/shared.js";
import { APP_CHROME_COPY } from "./appText.js";

const footerLinkStyle = { color: K.mt, textDecoration: "none", minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" };

export const TrustStrip = () => (
  <div style={{ background: `${K.gn}08`, borderBottom: `1px solid ${K.bd}`, padding: "10px clamp(14px, 2vw, 20px)" }}>
    <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, color: K.dm, letterSpacing: "0.3px", lineHeight: 1.5 }}>
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
  <div style={{ borderTop: `1px solid ${K.bd}`, padding: "28px clamp(14px, 2vw, 20px)", marginTop: 8 }}>
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
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
      <p style={{ fontSize: 10, color: K.mt, marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", lineHeight: 1.8 }}>
        <span>© 2026 <a href="https://vaultsparkstudios.com/" rel="author" target="_blank" style={{ ...footerLinkStyle, color: "inherit" }}>VaultSpark Studios LLC</a>. All rights reserved.</span>
        <a href="/" style={footerLinkStyle}>Home</a>
        <a href="/#/knowledge-base" style={footerLinkStyle}>Learn</a>
        <a href="/#/upgrade" style={footerLinkStyle}>Pricing</a>
        <a href="/dashboard" style={footerLinkStyle}>Open App</a>
        <a href="/privacy/" style={footerLinkStyle}>Privacy</a>
        <a href="/terms/" style={footerLinkStyle}>Terms</a>
        <a href="/responsible-gambling/" style={footerLinkStyle}>Responsible Gambling</a>
        <a href="/affiliate-disclosure/" style={footerLinkStyle}>Affiliate Disclosure</a>
        <a href="/disclaimer/" style={footerLinkStyle}>Disclaimer</a>
        <a href="/dmca/" style={footerLinkStyle}>DMCA / IP</a>
        <a href="/data-policy/" style={footerLinkStyle}>Data Policy</a>
        <a href="/about/" style={footerLinkStyle}>About</a>
        <a href="/compliance/" style={footerLinkStyle}>Compliance</a>
        <a href="/contact/" style={footerLinkStyle}>Contact</a>
      </p>
    </div>
  </div>
);
