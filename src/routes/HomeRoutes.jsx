import React from "react";
import { useNavigate } from "react-router-dom";
import { K, font, fontD } from "../lib/shared.js";
import { markOnboardingStepComplete, getOnboardingProgress } from "../onboarding.js";

function OnboardingProgressStrip() {
  const progress = React.useMemo(() => getOnboardingProgress(), []);
  if (progress.doneCount === progress.totalCount) return null;

  return (
    <div style={{ marginBottom: 20, padding: "14px 16px", background: `${K.ac}08`, border: `1px solid ${K.ac}25`, borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: K.ac, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 4 }}>
            Launch Tracker
          </div>
          <div style={{ fontSize: 13, color: K.tx, fontWeight: 700, fontFamily: fontD }}>
            {progress.doneCount}/{progress.totalCount} setup steps complete
          </div>
        </div>
        <div style={{ fontSize: 11, color: K.mt }}>
          Finish the core setup before you send people into the app.
        </div>
      </div>
      <div style={{ height: 6, background: K.s2, borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ width: `${progress.pct}%`, height: "100%", background: K.gn, borderRadius: 999 }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {progress.steps.map((step) => (
          <div
            key={step.id}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${step.done ? `${K.gn}40` : K.bd}`,
              background: step.done ? `${K.gn}10` : K.s2,
              color: step.done ? K.gn : K.dm,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {step.done ? "✓" : step.icon} {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AboutRoute() {
  const stat = (num, label) => (
    <div style={{ textAlign: "center", minWidth: 80 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: K.gn, lineHeight: 1 }}>{num}</div>
      <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: 1, marginTop: 3 }}>{label}</div>
    </div>
  );
  const fc = (icon, title, desc) => (
    <div style={{ padding: "14px 16px", border: `1px solid ${K.bd}`, borderRadius: 10, background: K.s1 }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: K.tx, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: K.mt }}>{desc}</div>
    </div>
  );
  const badge = (txt) => (
    <span style={{ padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: 600, border: `1px solid ${K.gn}30`, color: K.gn, background: `${K.gn}08` }}>✓ {txt}</span>
  );

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px", fontFamily: font }}>
      <div style={{ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 12, padding: "24px 22px", marginBottom: 24 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: K.gn, fontFamily: fontD, letterSpacing: -0.5, marginBottom: 4 }}>PROMOGRIND</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: K.gn, marginBottom: 10 }}>Free Sportsbook Promo Conversion Tools</div>
        <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.7, marginBottom: 18 }}>The free alternative to $99–199/month promo hunting subscriptions. 53+ calculators for matched betting, arbitrage, EV, promo conversion, and bankroll management.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>{stat("53+", "Calculators")}{stat("Free", "Core tools")}{stat("21+", "Age required")}{stat("Live", "On promogrind.bet")}</div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: K.tx, fontFamily: fontD, marginBottom: 10 }}>What PromoGrind Does</div>
      <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.7, marginBottom: 16 }}>PromoGrind is a math calculator for sportsbook promotional offers. You enter numbers, it outputs conversion values, EV, hedge amounts, and profit projections. It does not place bets, access sportsbook accounts, or handle money.</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginBottom: 24 }}>
        {fc("🎯", "Bonus Bet Converter", "Calculate exact cash value of any bonus bet offer")}
        {fc("⚡", "Profit Boost Calculator", "Find optimal profit boost usage and hedge amounts")}
        {fc("🔄", "Arbitrage Calculator", "2-way and 3-way arb detection and stake sizing")}
        {fc("📊", "Kelly Criterion", "Bankroll-optimal bet sizing for +EV opportunities")}
        {fc("🔍", "Expected Value", "+EV calculation with devigged fair odds")}
        {fc("📋", "P/L Ledger", "Track every bet and promo result over time")}
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: K.tx, fontFamily: fontD, marginBottom: 8 }}>Built by VaultSpark Studios</div>
      <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.7, marginBottom: 8 }}>PromoGrind is a product of <span style={{ color: K.tx, fontWeight: 600 }}>VaultSpark Studios LLC</span>, an independent software studio building owned tools for sports bettors, traders, and analysts.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {badge("Educational calculator tool")}{badge("Not a sportsbook operator")}{badge("FTC affiliate disclosure compliant")}{badge("Privacy first — no data sold")}
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: K.tx, fontFamily: fontD, marginBottom: 8 }}>How It&apos;s Free</div>
      <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.7, marginBottom: 24 }}>PromoGrind is supported by affiliate partnerships and referral programs with sportsbooks listed in the app. If you sign up through our links, we may earn compensation or bonus value. This never changes the calculator math.</div>
    </div>
  );
}

export function GetStartedRoute() {
  const navigate = useNavigate();
  const steps = [
    { num: 1, icon: "🏦", title: "Open Accounts", desc: "Open accounts at the sportsbooks you don't have yet. More accounts = more promos.", btn: "View Sportsbooks →", slug: "/sportsbooks", onboardingStep: "book" },
    { num: 2, icon: "🎯", title: "Find a Promo", desc: "Browse available promotions and pick the best offer to convert.", btn: "Open Promo Board →", slug: "/promo-board", onboardingStep: null },
    { num: 3, icon: "🧮", title: "Calculate Your Hedge", desc: "Enter the promo into the right calculator to find exact bet amounts.", btn: "Bonus Bet Calculator →", slug: "/bonus-bet", onboardingStep: "calc" },
    { num: 4, icon: "📊", title: "Place & Track", desc: "Place both sides of the bet. Log it in your Bet Tracker immediately.", btn: "Bet Tracker →", slug: "/bet-tracker", onboardingStep: "bet" },
    { num: 5, icon: "💰", title: "Check Your P/L", desc: "Every completed promo shows in your ledger. Review your running total.", btn: "P/L Ledger →", slug: "/ledger", onboardingStep: "bet" },
    { num: 6, icon: "⚡", title: "Unlock AI Tools", desc: "Upgrade to Runner for unlimited PromoAdvisor, AI Action Plan, and Stack Builder.", btn: "View Plans →", slug: "/upgrade", onboardingStep: "trial" },
  ];

  const openStep = (step) => {
    if (step.onboardingStep) markOnboardingStepComplete(step.onboardingStep);
    navigate(step.slug);
  };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px", fontFamily: font }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: K.tx, fontFamily: fontD, letterSpacing: -0.5, marginBottom: 4 }}>Get Started</div>
        <div style={{ fontSize: 13, color: K.mt, marginBottom: 12 }}>Follow these 6 steps to start converting sportsbook promos into real profit.</div>
        <OnboardingProgressStrip />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 14 }}>
        {steps.map((step) => (
          <div key={step.num} style={{ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${K.gn}15`, border: `1px solid ${K.gn}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: K.gn, flexShrink: 0, fontFamily: font }}>{step.num}</div>
              <div style={{ fontSize: 22, lineHeight: 1 }}>{step.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: K.tx, fontFamily: fontD }}>{step.title}</div>
            </div>
            <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.65, paddingLeft: 44 }}>{step.desc}</div>
            <div style={{ paddingLeft: 44 }}>
              <button onClick={() => openStep(step)} style={{ padding: "6px 14px", background: `${K.gn}15`, border: `1px solid ${K.gn}40`, borderRadius: 6, color: K.gn, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font }}>{step.btn}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WhatsNewRoute() {
  const releases = [
    {
      version: "v24.2.0", date: "2026-04-15", sprint: "S45",
      bullets: [
        "Promo Intake route now parses pasted sportsbook offers into a normalized promo card.",
        "Trust badges and sensitivity chips landed on key calculator outputs.",
        "Daily-brief push alerts and dashboard onboarding now have launch-ready wiring.",
      ],
    },
    {
      version: "v23.7.0", date: "2026-04-13", sprint: "S39",
      bullets: [
        "Beta invite codes let friends test Runner tier free for 30 days.",
        "About tab added to Home.",
        "Broken /promogrind/ links were removed from launch surfaces.",
      ],
    },
  ];

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px", fontFamily: font }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: K.tx, fontFamily: fontD, letterSpacing: -0.5, marginBottom: 4 }}>What&apos;s New</div>
        <div style={{ fontSize: 13, color: K.mt }}>Recent product changes that matter before you invite friends or post publicly.</div>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {releases.map((release) => (
          <div key={release.version} style={{ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ fontFamily: fontD, fontSize: 17, fontWeight: 700, color: K.tx }}>{release.version}</div>
              <div style={{ fontSize: 11, color: K.mt }}>{release.date} · {release.sprint}</div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {release.bullets.map((bullet) => (
                <div key={bullet} style={{ fontSize: 12, color: K.dm, lineHeight: 1.65 }}>
                  • {bullet}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
