import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { K, font, fontD } from "../lib/shared.js";
import { CANONICAL_APP_URL } from "../launchState.js";
import { trackEvent } from "../analytics.js";

const CALCULATOR_PRESETS = {
  "bonus-bet": { name: "Bonus Bet Converter", slug: "bonus-bet", desc: "Convert your bonus bets into guaranteed cash profit." },
  "profit-boost": { name: "Profit Boost Calculator", slug: "profit-boost", desc: "Lock in profit from sportsbook profit boost promos." },
  "first-bet": { name: "First Bet Safety Net", slug: "first-bet", desc: "Extract value from first-bet insurance offers." },
  "arb": { name: "Arbitrage Calculator", slug: "arb-2way", desc: "Find risk-free profit from mismatched sportsbook odds." },
  "kelly": { name: "Kelly Criterion Sizer", slug: "kelly", desc: "Size bets optimally using your real edge." },
  "ev": { name: "+EV Calculator", slug: "ev", desc: "Know exactly when you have a positive edge." },
};

const FEATURES = [
  { icon: "🧮", label: "16 free calculators", desc: "Bonus bets, profit boosts, arb, Kelly, SGP, and more" },
  { icon: "📊", label: "Track your P/L", desc: "Log settlements and see your real hit rate by promo type" },
  { icon: "🤖", label: "AI Promo Advisor", desc: "Paste any promo text and get an instant EV verdict" },
  { icon: "🔥", label: "Hot lane signals", desc: "See which promo types are running hot in the last 48h" },
];

export default function LandingRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  // Extract creator from /land/:creator
  const creator = location.pathname.replace(/^\/land\//, "").split("/")[0] || "promo";

  const utmSource = searchParams.get("utm_source") || creator;
  const utmMedium = searchParams.get("utm_medium") || "referral";
  const utmCampaign = searchParams.get("utm_campaign") || creator;
  const calcPreset = searchParams.get("calc") || null;

  const displayName = creator.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const preset = calcPreset && CALCULATOR_PRESETS[calcPreset] ? CALCULATOR_PRESETS[calcPreset] : null;

  // Store UTM attribution and fire landing page view event
  useEffect(() => {
    try {
      localStorage.setItem("pg_ref", creator);
      localStorage.setItem("pg_utm_source", utmSource);
      localStorage.setItem("pg_utm_medium", utmMedium);
      localStorage.setItem("pg_utm_campaign", utmCampaign);
    } catch {}
    trackEvent("landing_page_view", {
      creator,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      calc_preset: calcPreset || null,
    });
  }, [creator, utmSource, utmMedium, utmCampaign, calcPreset]);

  const signupUrl = `${CANONICAL_APP_URL}?ref=${encodeURIComponent(creator)}&utm_source=${encodeURIComponent(utmSource)}&utm_medium=${encodeURIComponent(utmMedium)}&utm_campaign=${encodeURIComponent(utmCampaign)}`;

  const goToCalc = () => {
    const target = preset ? preset.slug : "bonus-bet";
    navigate(`/${target}`);
  };

  return (
    <div style={{
      fontFamily: font,
      fontSize: 14,
      color: K.tx,
      background: K.bg,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "32px 16px",
      maxWidth: 520,
      margin: "0 auto",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 700, color: K.gn, letterSpacing: "-0.5px", marginBottom: 4 }}>
          PROMOGRIND
        </div>
        <div style={{ fontSize: 11, color: K.mt, letterSpacing: "1.5px", textTransform: "uppercase" }}>
          Free sportsbook promo tools
        </div>
      </div>

      {/* Creator attribution */}
      <div style={{
        width: "100%", marginBottom: 24, padding: "14px 18px",
        background: `${K.gn}10`, border: `1px solid ${K.gn}30`,
        borderRadius: 12, textAlign: "center",
      }}>
        <div style={{ fontSize: 11, color: K.mt, marginBottom: 4 }}>Referred by</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: K.gn }}>{displayName}</div>
        {preset && (
          <div style={{ fontSize: 11, color: K.dm, marginTop: 6 }}>
            Recommended: <span style={{ color: K.ac, fontWeight: 600 }}>{preset.name}</span>
          </div>
        )}
      </div>

      {/* Hero */}
      <div style={{ width: "100%", marginBottom: 28, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: K.tx, fontFamily: fontD, lineHeight: 1.3, marginBottom: 10 }}>
          Extract guaranteed profit<br />from sportsbook promos
        </div>
        <div style={{ fontSize: 13, color: K.dm, lineHeight: 1.6 }}>
          {preset
            ? preset.desc + " Free, no credit card required."
            : "16 free calculators to convert bonus bets, profit boosts, arbitrage, and more into real cash. No credit card required."}
        </div>
      </div>

      {/* CTA buttons */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        <button
          onClick={goToCalc}
          style={{
            padding: "14px 0", background: K.gn, border: "none", borderRadius: 10,
            color: "#0a0e17", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: font,
          }}
        >
          {preset ? `Open ${preset.name} →` : "Start with Bonus Bet Converter →"}
        </button>
        <a
          href={signupUrl}
          style={{
            display: "block", padding: "12px 0", background: "transparent",
            border: `1px solid ${K.bd2}`, borderRadius: 10,
            color: K.dm, fontSize: 13, fontWeight: 600, cursor: "pointer",
            textDecoration: "none", textAlign: "center", fontFamily: font,
          }}
        >
          Create free account for full access →
        </a>
      </div>

      {/* Features */}
      <div style={{ width: "100%", marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>
          What you get for free
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FEATURES.map(({ icon, label, desc }) => (
            <div key={label} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "10px 14px", background: K.s2, borderRadius: 8, border: `1px solid ${K.bd}`,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: K.tx, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: K.mt }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calculator presets grid */}
      <div style={{ width: "100%", marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>
          Jump to a calculator
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {Object.values(CALCULATOR_PRESETS).map(({ name, slug }) => (
            <button
              key={slug}
              onClick={() => navigate(`/${slug}`)}
              style={{
                padding: "10px 12px", background: K.s2, border: `1px solid ${K.bd2}`,
                borderRadius: 8, color: K.dm, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: font, textAlign: "left",
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ fontSize: 10, color: K.dm, textAlign: "center", lineHeight: 1.7 }}>
        <a href={CANONICAL_APP_URL} style={{ color: K.gn, textDecoration: "none", fontWeight: 600 }}>promogrind.bet</a>
        {" "}— Free sportsbook promo calculator suite
        <br />
        <span style={{ color: K.mt }}>Results are estimates. Verify all odds before placing bets. Must be 21+ and in a legal jurisdiction.</span>
      </div>
    </div>
  );
}
