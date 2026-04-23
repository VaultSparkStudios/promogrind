import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { K, font, fontD } from "../lib/shared.js";
import { APP_DASHBOARD_PATH, getAbsoluteAppUrl, getProjectAuthHref } from "../launchState.js";
import { trackEvent } from "../analytics.js";
import { useViewport } from "../app/responsive.js";

const CALCULATOR_PRESETS = {
  "bonus-bet": { name: "Bonus Bet Converter", slug: "bonus-bet", desc: "Convert bonus bets into guaranteed cash with the exact hedge amount." },
  "profit-boost": { name: "Profit Boost Calculator", slug: "profit-boost", desc: "Find the boosted edge and lock in the right hedge before the line moves." },
  "first-bet": { name: "First Bet Safety Net", slug: "first-bet", desc: "Turn insured first-bet offers into a controlled, high-clarity playbook." },
  "arb": { name: "Arbitrage Calculator", slug: "arb-2way", desc: "Size both sides cleanly when books drift apart and a risk-free window opens." },
  "kelly": { name: "Kelly Criterion Sizer", slug: "kelly", desc: "Know exactly how much of bankroll to allocate when you actually have an edge." },
  "ev": { name: "+EV Calculator", slug: "ev", desc: "Compare your price to fair probability and see whether the bet is worth taking." },
};

const VALUE_PILLS = [
  "16+ free calculators",
  "Track real P/L",
  "Works on every device",
  "Free account for sync",
];

const FEATURE_ROWS = [
  { icon: "🧮", title: "Calculator stack", body: "Bonus bets, boosts, arb, EV, Kelly, parlay hedge, no-vig, insurance, rollover, and more." },
  { icon: "📈", title: "Operator dashboard", body: "Log real outcomes, review weekly progress, and stop guessing where your edge is coming from." },
  { icon: "⚡", title: "Fast first action", body: "Referral pages can drop friends into the exact calculator that matches the promo they just found." },
  { icon: "🛡", title: "Trust-first framing", body: "Clear legal, age, and educational positioning without pushing people straight into a confusing tool wall." },
];

const SOCIAL_PROOF = [
  ["Free", "Core access"],
  ["53+", "Total surfaces"],
  ["21+", "Age required"],
  ["Live", "On promogrind.bet"],
];

function statCard(value, label) {
  return (
    <div
      key={label}
      style={{
        padding: "14px 16px",
        background: K.s1,
        border: `1px solid ${K.bd}`,
        borderRadius: 14,
      }}
    >
      <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color: K.gn, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginTop: 6 }}>{label}</div>
    </div>
  );
}

export default function LandingRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const viewport = useViewport();
  const searchParams = new URLSearchParams(location.search);
  const creator = location.pathname.replace(/^\/land\//, "").split("/")[0] || "promo";

  const utmSource = searchParams.get("utm_source") || creator;
  const utmMedium = searchParams.get("utm_medium") || "referral";
  const utmCampaign = searchParams.get("utm_campaign") || creator;
  const calcPreset = searchParams.get("calc") || null;

  const displayName = creator.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const preset = calcPreset && CALCULATOR_PRESETS[calcPreset] ? CALCULATOR_PRESETS[calcPreset] : null;

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

  const appUrl = getAbsoluteAppUrl("dashboard");
  const signupUrl = getProjectAuthHref(
    "signup",
    `${appUrl}?ref=${encodeURIComponent(creator)}&utm_source=${encodeURIComponent(utmSource)}&utm_medium=${encodeURIComponent(utmMedium)}&utm_campaign=${encodeURIComponent(utmCampaign)}`,
  );

  const surfacePadding = viewport.isPhone ? "18px 16px 36px" : viewport.isTablet ? "28px 20px 44px" : "40px 28px 60px";

  return (
    <div
      style={{
        fontFamily: font,
        color: K.tx,
        background: `
          radial-gradient(circle at top left, ${K.gn}12, transparent 34%),
          radial-gradient(circle at 80% 20%, ${K.ac}14, transparent 28%),
          linear-gradient(180deg, ${K.bg}, ${K.s1})
        `,
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: viewport.contentMaxWidth, margin: "0 auto", padding: surfacePadding }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: viewport.landingColumns === 2 ? "minmax(0, 1.15fr) minmax(320px, 0.85fr)" : "1fr",
            gap: viewport.isPhone ? 18 : 26,
            alignItems: "start",
            marginBottom: viewport.isPhone ? 22 : 30,
          }}
        >
          <section
            style={{
              padding: viewport.isPhone ? "18px 18px 20px" : "24px 24px 26px",
              borderRadius: 24,
              background: `linear-gradient(155deg, ${K.s1}, ${K.s2})`,
              border: `1px solid ${K.bd}`,
              boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${K.gn}08, transparent 48%)`, pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {VALUE_PILLS.map((pill) => (
                  <span key={pill} style={{ padding: "5px 10px", borderRadius: 999, background: `${K.s3}90`, border: `1px solid ${K.bd2}`, color: K.dm, fontSize: 10, letterSpacing: "0.6px", textTransform: "uppercase" }}>
                    {pill}
                  </span>
                ))}
              </div>
              <div style={{ fontFamily: fontD, fontSize: viewport.isPhone ? 20 : 24, fontWeight: 800, color: K.gn, letterSpacing: "-0.6px", marginBottom: 6 }}>
                PROMOGRIND
              </div>
              <div style={{ fontSize: 11, color: K.mt, letterSpacing: "1.8px", textTransform: "uppercase", marginBottom: 16 }}>
                Free sportsbook promo operating system
              </div>

              <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 14, background: `${K.gn}10`, border: `1px solid ${K.gn}30` }}>
                <div style={{ fontSize: 11, color: K.mt, marginBottom: 4 }}>Referred by</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: K.gn }}>{displayName}</div>
                {preset && <div style={{ fontSize: 11, color: K.dm, marginTop: 6 }}>Recommended entry: <span style={{ color: K.ac, fontWeight: 700 }}>{preset.name}</span></div>}
              </div>

              <h1 style={{ fontFamily: fontD, fontSize: viewport.isPhone ? 30 : viewport.isTablet ? 40 : 52, lineHeight: 1.02, letterSpacing: "-1.6px", marginBottom: 14, maxWidth: 760 }}>
                Convert sportsbook promos into clearer, faster profit decisions.
              </h1>
              <p style={{ fontSize: viewport.isPhone ? 14 : 15, lineHeight: 1.75, color: K.dm, maxWidth: 720, marginBottom: 18 }}>
                {preset ? preset.desc : "PromoGrind gives you the calculator stack, tracking surface, and operator-style dashboard to work through bonus bets, boosts, arbitrage, EV, and bankroll decisions without a bloated subscription wall."} Create a free PromoGrind account if you want sync across devices. No credit card required.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
                <button
                  onClick={() => navigate("/dashboard")}
                  style={{ padding: "14px 18px", background: K.gn, border: "none", borderRadius: 12, color: "#0a0e17", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: font, minWidth: viewport.isPhone ? "100%" : 210 }}
                >
                  Open PromoGrind App →
                </button>
                <button
                  onClick={() => navigate(`/${preset ? preset.slug : "bonus-bet"}`)}
                  style={{ padding: "14px 18px", background: K.s2, border: `1px solid ${K.bd2}`, borderRadius: 12, color: K.tx, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: font, minWidth: viewport.isPhone ? "100%" : 220 }}
                >
                  {preset ? `Jump to ${preset.name} →` : "Start with Bonus Bet →"}
                </button>
                <a
                  href={signupUrl}
                  style={{ padding: "14px 18px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 12, color: K.dm, fontSize: 14, fontWeight: 700, textDecoration: "none", textAlign: "center", minWidth: viewport.isPhone ? "100%" : 260 }}
                >
                  Create free account for sync →
                </a>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: viewport.isPhone ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                {SOCIAL_PROOF.map(([value, label]) => statCard(value, label))}
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: viewport.isPhone ? "16px" : "18px", borderRadius: 20, background: K.s1, border: `1px solid ${K.bd}`, boxShadow: "0 14px 42px rgba(0,0,0,0.18)" }}>
              <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.3px", marginBottom: 10 }}>What you get</div>
              <div style={{ display: "grid", gap: 10 }}>
                {FEATURE_ROWS.map((item) => (
                  <div key={item.title} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 12, alignItems: "start", padding: "10px 0", borderBottom: `1px solid ${K.bd}` }}>
                    <div style={{ fontSize: 18, lineHeight: 1.2 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: K.tx, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.65 }}>{item.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: viewport.isPhone ? "16px" : "18px", borderRadius: 20, background: `linear-gradient(180deg, ${K.s1}, ${K.s2})`, border: `1px solid ${K.bd}` }}>
              <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.3px", marginBottom: 10 }}>Jump to a calculator</div>
              <div style={{ display: "grid", gridTemplateColumns: viewport.isPhone ? "1fr" : "1fr 1fr", gap: 8 }}>
                {Object.values(CALCULATOR_PRESETS).map(({ name, slug }) => (
                  <button
                    key={slug}
                    onClick={() => navigate(`/${slug}`)}
                    style={{ padding: "12px 14px", background: `${K.s3}88`, border: `1px solid ${K.bd2}`, borderRadius: 12, color: K.tx, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font, textAlign: "left" }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div style={{ fontSize: 11, color: K.dm, textAlign: "center", lineHeight: 1.8, padding: viewport.isPhone ? "0 6px" : 0 }}>
          <a href={APP_DASHBOARD_PATH} style={{ color: K.gn, textDecoration: "none", fontWeight: 700 }}>Open the app</a>
          {" "}— free PromoGrind account unlocks sync across devices. Results are estimates. Verify lines before placing bets. Must be 21+ and in a legal jurisdiction.
        </div>
      </div>
    </div>
  );
}

