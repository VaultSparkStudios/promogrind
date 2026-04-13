import React, { useState } from "react";

const STORAGE_KEY = "pg_age_verified";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function isAgeVerified() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (!val) return false;
    const ts = parseInt(val, 10);
    return !isNaN(ts) && Date.now() - ts < EXPIRY_MS;
  } catch {
    return false;
  }
}

export default function AgeGate({ onVerified }) {
  const [declined, setDeclined] = useState(false);

  const handleConfirm = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    onVerified();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0a0e17",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{
        maxWidth: 440, width: "100%",
        border: "1px solid #1e293b", borderRadius: 14,
        padding: "36px 32px", textAlign: "center",
        background: "#101826",
      }}>
        {declined ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>
              Age Restriction
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, marginBottom: 16 }}>
              You must be 21 or older to use PromoGrind (18+ in jurisdictions where permitted).
              Sportsbook promotions are only available to adults of legal gambling age.
            </p>
            <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
              If gambling is causing problems for you or someone you know, help is available 24/7:{" "}
              <a href="tel:1-800-426-2537" style={{ color: "#ef4444", textDecoration: "none", fontWeight: 600 }}>
                1-800-GAMBLER
              </a>
            </p>
          </>
        ) : (
          <>
            <div style={{
              display: "inline-block",
              background: "#4ade8015",
              border: "1px solid #4ade8030",
              borderRadius: 6, padding: "5px 12px",
              fontSize: 10, color: "#4ade80",
              letterSpacing: "1.5px", textTransform: "uppercase",
              fontWeight: 600, marginBottom: 20,
            }}>
              Age Verification Required
            </div>

            <div style={{
              fontSize: 56, fontWeight: 700, color: "#4ade80",
              lineHeight: 1, marginBottom: 12,
              fontFamily: "monospace",
            }}>
              21+
            </div>

            <h1 style={{
              fontSize: 20, fontWeight: 700, color: "#e2e8f0",
              marginBottom: 10, letterSpacing: "1px",
            }}>
              PROMOGRIND
            </h1>

            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, marginBottom: 24 }}>
              PromoGrind is a free sportsbook promo calculator for adults.
              You must be{" "}
              <strong style={{ color: "#e2e8f0" }}>21 or older</strong>{" "}
              to continue (18+ where permitted by state law).
            </p>

            <button
              onClick={handleConfirm}
              style={{
                display: "block", width: "100%",
                padding: "14px 20px",
                background: "#4ade80", color: "#0a0e17",
                border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                letterSpacing: "0.5px", marginBottom: 10,
              }}
            >
              I am 21 or older — Enter
            </button>

            <button
              onClick={() => setDeclined(true)}
              style={{
                display: "block", width: "100%",
                padding: "10px 20px",
                background: "transparent", color: "#64748b",
                border: "1px solid #1e293b", borderRadius: 8,
                fontSize: 12, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              I am under 21 — Exit
            </button>

            <p style={{ marginTop: 16, fontSize: 11, color: "#475569", lineHeight: 1.6 }}>
              By entering you confirm you are of legal gambling age in your jurisdiction.
              Sports betting is only legal in states where it is authorized.{" "}
              <a href="/responsible-gambling/" style={{ color: "#64748b", textDecoration: "none" }}>
                Responsible Gambling
              </a>
              {" · "}
              <a href="/terms/" style={{ color: "#64748b", textDecoration: "none" }}>
                Terms
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
