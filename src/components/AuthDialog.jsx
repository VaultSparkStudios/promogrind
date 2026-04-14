import React, { useEffect, useMemo, useState } from "react";
import { createPromoGrindAccount, signInToPromoGrind } from "../auth.js";
import { K, font, fontD } from "../lib/shared.js";

const panel = {
  width: "100%",
  maxWidth: 460,
  background: K.s1,
  border: `1px solid ${K.bd}`,
  borderRadius: 18,
  boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
  overflow: "hidden",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: `1px solid ${K.bd}`,
  background: K.s2,
  color: K.tx,
  fontFamily: font,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

export default function AuthDialog({ mode = "signup", open, onClose, onModeChange }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setInfo("");
    setPassword("");
  }, [open, mode]);

  const isSignup = mode !== "signin";
  const heading = isSignup ? "Create your PromoGrind account" : "Sign in to PromoGrind";
  const subheading = isSignup
    ? "Use one account for PromoGrind now, and the same identity will work across VaultSpark projects."
    : "Your PromoGrind account is backed by the shared Vault identity system, so the same login works across projects.";

  const submitLabel = useMemo(() => {
    if (submitting) return isSignup ? "Creating account..." : "Signing in...";
    return isSignup ? "Create account" : "Sign in";
  }, [isSignup, submitting]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (isSignup) {
      if (displayName.trim().length < 2) {
        setError("Enter a display name with at least 2 characters.");
        return;
      }
    }

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignup) {
        const data = await createPromoGrindAccount({
          email,
          password,
          displayName,
          marketingOptIn,
        });
        if (data?.session) {
          onClose?.();
        } else {
          setInfo("Account created. Check your email to confirm the login if confirmation is enabled.");
        }
      } else {
        await signInToPromoGrind({ email, password });
        onClose?.();
      }
    } catch (err) {
      setError(err?.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        background: "rgba(3, 7, 18, 0.72)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={panel} onClick={(event) => event.stopPropagation()}>
        <div
          style={{
            padding: "18px 20px 16px",
            background: `linear-gradient(135deg, ${K.s2}, ${K.s3})`,
            borderBottom: `1px solid ${K.bd}`,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: K.gn, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 6 }}>
              PromoGrind Account
            </div>
            <div style={{ fontSize: 24, color: K.tx, fontWeight: 800, fontFamily: fontD, letterSpacing: "-0.5px", marginBottom: 8 }}>
              {heading}
            </div>
            <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.7, maxWidth: 340 }}>
              {subheading}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close account dialog"
            style={{ background: "none", border: "none", color: K.mt, cursor: "pointer", fontSize: 18, padding: 0 }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {[
              ["signup", "Create account"],
              ["signin", "Sign in"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onModeChange?.(value)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${mode === value ? K.gn : K.bd}`,
                  background: mode === value ? `${K.gn}18` : K.s2,
                  color: mode === value ? K.gn : K.dm,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: font,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {isSignup && (
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>
                  Shared display name
                </span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="SharpScout"
                  maxLength={24}
                  style={inputStyle}
                />
                <span style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>
                  This becomes your shared name across PromoGrind and future VaultSpark projects.
                </span>
              </label>
            )}

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 11, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 11, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignup ? "Create a password" : "Enter your password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                style={inputStyle}
              />
            </label>
          </div>

          {isSignup && (
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14 }}>
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(event) => setMarketingOptIn(event.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span style={{ fontSize: 11, color: K.dm, lineHeight: 1.6 }}>
                Keep me on the free Vault membership list for updates, launch notes, and relevant product offers.
              </span>
            </label>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, border: `1px solid ${K.rd}40`, background: `${K.rd}12`, color: K.rd, fontSize: 11, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {info && (
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, border: `1px solid ${K.ac}40`, background: `${K.ac}12`, color: K.ac, fontSize: 11, lineHeight: 1.5 }}>
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: K.gn,
              color: "#081018",
              fontSize: 13,
              fontWeight: 800,
              cursor: submitting ? "default" : "pointer",
              fontFamily: font,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitLabel} →
          </button>

          <div style={{ marginTop: 14, fontSize: 11, color: K.mt, lineHeight: 1.7, textAlign: "center" }}>
            {isSignup ? "Already have a shared account?" : "Need a new PromoGrind account?"}{" "}
            <button
              type="button"
              onClick={() => onModeChange?.(isSignup ? "signin" : "signup")}
              style={{ background: "none", border: "none", padding: 0, color: K.ac, cursor: "pointer", font: "inherit" }}
            >
              {isSignup ? "Sign in here." : "Create one here."}
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 10, color: K.mt, lineHeight: 1.6, textAlign: "center" }}>
            Account support and billing still route through the shared Vault membership backend when needed.
          </div>
        </form>
      </div>
    </div>
  );
}
