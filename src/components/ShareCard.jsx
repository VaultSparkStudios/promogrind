import React, { useState } from "react";
import { CANONICAL_APP_URL } from "../launchState.js";

export default function ShareCard({ title, profit, onClose }) {
  const appUrl = CANONICAL_APP_URL;
  const text = `🎉 Just locked in ${profit} in modeled profit using ${title} on PromoGrind.\n\nFree account, free calculator suite:\n${appUrl}`;
  const tweetText = `🎉 Just locked in ${profit} modeled profit from a sportsbook promo using @PromoGrind — free account, free calculator suite\n${appUrl}`;
  const [copyLabel, setCopyLabel] = useState("📋 Copy text");

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopyLabel("✓ Copied!");
    setTimeout(() => setCopyLabel("📋 Copy text"), 2200);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `I made ${profit} with PromoGrind`, text, url: appUrl }).catch(() => {});
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, "_blank");
    }
  };

  const handleReddit = () => {
    const body = encodeURIComponent(`Used the free PromoGrind calculator and locked in ${profit} in modeled profit from ${title}. No subscription, no BS — it's completely free.\n\n${appUrl}`);
    window.open(`https://www.reddit.com/submit?title=${encodeURIComponent(`Locked in ${profit} modeled profit using PromoGrind`)}&text=${body}`, "_blank");
  };

  return (
    <div style={{ marginTop: 12, padding: 16, background: "linear-gradient(135deg,#0f2a1e,#0a0e17)", border: "2px solid #4ade80", borderRadius: 10, position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>modeled Profit Locked In</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "#4ade80", marginBottom: 2, fontFamily: "'Space Grotesk',sans-serif" }}>{profit}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>from {title} · PromoGrind</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={handleCopy} style={{ flex: 1, padding: "8px 0", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>
          {copyLabel}
        </button>
        <button onClick={handleShare} style={{ flex: 1, padding: "8px 0", background: "#4ade80", border: "none", color: "#0a0e17", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          𝕏 Tweet ↗
        </button>
        <button onClick={handleReddit} style={{ flex: 1, padding: "8px 0", background: "#ff4500", border: "none", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          Reddit ↗
        </button>
      </div>
      <div style={{ fontSize: 9, color: "#1e293b", textAlign: "center", letterSpacing: "0.5px" }}>{appUrl.replace(/^https?:\/\//, "")} — free sportsbook promo tools</div>
    </div>
  );
}
