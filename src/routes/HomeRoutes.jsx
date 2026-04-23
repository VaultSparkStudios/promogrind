import React from "react";
import { useNavigate } from "react-router-dom";
import { K, font, fontD } from "../lib/shared.js";
import { markOnboardingStepComplete, getOnboardingProgress } from "../onboarding.js";
import { useViewport } from "../app/responsive.js";

function PageWrap({ children }) {
  const viewport = useViewport();
  return (
    <div style={{ maxWidth: viewport.isDesktop ? 1080 : 860, margin: "0 auto", padding: viewport.isPhone ? "18px 14px 28px" : "24px 16px 36px", fontFamily: font }}>
      {children}
    </div>
  );
}

function Panel({ children, accent = null, compact = false }) {
  return (
    <div
      style={{
        background: accent ? `linear-gradient(180deg, ${K.s1}, ${accent}08)` : K.s1,
        border: `1px solid ${accent ? `${accent}40` : K.bd}`,
        borderRadius: 18,
        padding: compact ? "16px" : "20px",
        boxShadow: "0 14px 36px rgba(0,0,0,0.14)",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ eyebrow, title, body }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {eyebrow && <div style={{ fontSize: 10, color: K.ac, textTransform: "uppercase", letterSpacing: "1.3px", fontWeight: 700, marginBottom: 6 }}>{eyebrow}</div>}
      <div style={{ fontSize: 24, fontWeight: 800, color: K.tx, fontFamily: fontD, letterSpacing: "-0.7px", marginBottom: body ? 6 : 0 }}>{title}</div>
      {body && <div style={{ fontSize: 13, color: K.mt, lineHeight: 1.75 }}>{body}</div>}
    </div>
  );
}

function OnboardingProgressStrip() {
  const progress = React.useMemo(() => getOnboardingProgress(), []);
  if (progress.doneCount === progress.totalCount) return null;

  return (
    <Panel accent={K.ac} compact>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: K.ac, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 4 }}>
            Launch Tracker
          </div>
          <div style={{ fontSize: 15, color: K.tx, fontWeight: 800, fontFamily: fontD }}>
            {progress.doneCount}/{progress.totalCount} setup steps complete
          </div>
        </div>
        <div style={{ fontSize: 11, color: K.mt, maxWidth: 280, lineHeight: 1.6 }}>
          Finish the core setup before you send people into the app.
        </div>
      </div>
      <div style={{ height: 7, background: K.s2, borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ width: `${progress.pct}%`, height: "100%", background: K.gn, borderRadius: 999 }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {progress.steps.map((step) => (
          <div
            key={step.id}
            style={{
              padding: "7px 10px",
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
    </Panel>
  );
}

export function AboutRoute() {
  const viewport = useViewport();
  const stats = [
    ["53+", "Calculators"],
    ["Free", "Core tools"],
    ["21+", "Age required"],
    ["Live", "On promogrind.bet"],
  ];
  const features = [
    ["🎯", "Bonus Bet Converter", "Calculate the real cash value of any bonus bet offer."],
    ["⚡", "Profit Boost Calculator", "Find the cleanest boost usage and hedge sizing."],
    ["🔄", "Arbitrage Calculator", "2-way and 3-way arb detection and stake sizing."],
    ["📊", "Kelly Criterion", "Bankroll-aware bet sizing when your edge is real."],
    ["🔍", "Expected Value", "Compare your odds to fair probability at a glance."],
    ["📋", "P/L Ledger", "Track every promo result over time instead of guessing."],
  ];
  const badges = ["Educational calculator tool", "Not a sportsbook operator", "FTC affiliate disclosure compliant", "Privacy first — no data sold"];

  return (
    <PageWrap>
      <Panel accent={K.gn}>
        <div style={{ display: "grid", gridTemplateColumns: viewport.isDesktop ? "1.3fr 0.7fr" : "1fr", gap: 18, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: K.gn, fontFamily: fontD, letterSpacing: -0.6, marginBottom: 4 }}>PROMOGRIND</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: K.gn, marginBottom: 10 }}>Free Sportsbook Promo Conversion Tools</div>
            <div style={{ fontSize: 13, color: K.mt, lineHeight: 1.8, marginBottom: 16 }}>
              The free alternative to $99-199/month promo hunting subscriptions. PromoGrind is a math and workflow toolset for bonus bets, boosts, arbitrage, EV, and bankroll decisions.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {badges.map((badge) => (
                <span key={badge} style={{ padding: "5px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, border: `1px solid ${K.gn}30`, color: K.gn, background: `${K.gn}08` }}>
                  ✓ {badge}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {stats.map(([num, label]) => (
              <div key={label} style={{ padding: "16px 14px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 14 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: K.gn, lineHeight: 1, fontFamily: fontD }}>{num}</div>
                <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 6 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div style={{ height: 18 }} />

      <SectionTitle title="What PromoGrind Does" body="PromoGrind is a math calculator and operational workspace for sportsbook promotional offers. It does not place bets, access sportsbook accounts, or handle money." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 20 }}>
        {features.map(([icon, title, desc]) => (
          <Panel key={title} compact>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: K.tx, marginBottom: 5 }}>{title}</div>
            <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.7 }}>{desc}</div>
          </Panel>
        ))}
      </div>

      <Panel compact>
        <div style={{ fontSize: 15, fontWeight: 800, color: K.tx, fontFamily: fontD, marginBottom: 8 }}>Built by VaultSpark Studios</div>
        <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.8, marginBottom: 10 }}>
          PromoGrind is a product of <span style={{ color: K.tx, fontWeight: 700 }}>VaultSpark Studios LLC</span>, an independent software studio building owned tools for sports bettors, traders, and analysts.
        </div>
        <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.8 }}>
          PromoGrind is supported by affiliate partnerships and referral programs with sportsbooks listed in the app. That support never changes the calculator math.
        </div>
      </Panel>
    </PageWrap>
  );
}

export function GetStartedRoute() {
  const navigate = useNavigate();
  const viewport = useViewport();
  const steps = [
    { num: 1, icon: "🏦", title: "Open Accounts", desc: "Open the books you do not have yet. More books means more promo conversion opportunities.", btn: "View Sportsbooks →", slug: "/sportsbooks", onboardingStep: "book" },
    { num: 2, icon: "🎯", title: "Find a Promo", desc: "Browse the active offer and pick the right conversion path before odds move.", btn: "Open Promo Board →", slug: "/promo-board", onboardingStep: null },
    { num: 3, icon: "🧮", title: "Calculate Your Hedge", desc: "Use the matching calculator to get exact bet amounts instead of estimating.", btn: "Bonus Bet Calculator →", slug: "/bonus-bet", onboardingStep: "calc" },
    { num: 4, icon: "📊", title: "Place & Track", desc: "Log the bet immediately so your tracker and ledger stay truthful.", btn: "Bet Tracker →", slug: "/bet-tracker", onboardingStep: "bet" },
    { num: 5, icon: "💰", title: "Review Real P/L", desc: "Use the ledger to see what actually worked and where your edge came from.", btn: "P/L Ledger →", slug: "/ledger", onboardingStep: "bet" },
    { num: 6, icon: "⚡", title: "Unlock AI Tools", desc: "Upgrade later if you want advisor, action-plan, and stack-builder surfaces.", btn: "View Plans →", slug: "/upgrade", onboardingStep: "trial" },
  ];

  const openStep = (step) => {
    if (step.onboardingStep) markOnboardingStepComplete(step.onboardingStep);
    navigate(step.slug);
  };

  return (
    <PageWrap>
      <SectionTitle eyebrow="Onboarding" title="Get Started" body="Follow this flow to move from open promo to tracked profit with the least confusion." />
      <OnboardingProgressStrip />
      <div style={{ height: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: viewport.isDesktop ? "repeat(2,minmax(0,1fr))" : "1fr", gap: 14 }}>
        {steps.map((step) => (
          <Panel key={step.num} compact>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr", gap: 12, alignItems: "start" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${K.gn}15`, border: `1px solid ${K.gn}40`, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: K.gn }}>
                {step.num}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{step.icon}</span>
                  <div style={{ fontSize: 15, fontWeight: 800, color: K.tx, fontFamily: fontD }}>{step.title}</div>
                </div>
                <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.75, marginBottom: 12 }}>{step.desc}</div>
                <button onClick={() => openStep(step)} style={{ padding: "8px 14px", background: `${K.gn}15`, border: `1px solid ${K.gn}40`, borderRadius: 8, color: K.gn, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font }}>
                  {step.btn}
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </PageWrap>
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
    <PageWrap>
      <SectionTitle eyebrow="Release Notes" title="What’s New" body="Recent product changes that matter before you invite friends or post publicly." />
      <div style={{ display: "grid", gap: 12 }}>
        {releases.map((release) => (
          <Panel key={release.version} compact>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.tx }}>{release.version}</div>
              <div style={{ fontSize: 11, color: K.mt }}>{release.date} · {release.sprint}</div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {release.bullets.map((bullet) => (
                <div key={bullet} style={{ fontSize: 12, color: K.dm, lineHeight: 1.7 }}>
                  • {bullet}
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </PageWrap>
  );
}

