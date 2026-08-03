import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createPromoGrindAccount,
  resendPromoGrindConfirmation,
  resetPromoGrindPassword,
  signInToPromoGrind,
  updatePromoGrindPassword,
} from "../auth.js";
import { useFocusTrap } from "../lib/focus-trap.js";
import { K, font, fontD } from "../lib/shared.js";
import { getIdentitySurfaceState } from '../data/identityArchitecture.js';

const getPanelStyle = () => ({
  width: "100%",
  maxWidth: 460,
  background: K.s1,
  border: `1px solid ${K.bd}`,
  borderRadius: 18,
  boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
  maxHeight: "calc(100dvh - 24px)",
  overflowX: "hidden",
  overflowY: "auto",
  overscrollBehavior: "contain",
  scrollbarGutter: "stable",
});

const getInputStyle = () => ({
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
});

export default function AuthDialog({ mode = "signup", open, onClose, onModeChange }) {
  const identityState = getIdentitySurfaceState();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [secondarySubmitting, setSecondarySubmitting] = useState(false);
  const panelRef = useRef(null);
  useFocusTrap(open, panelRef);

  useEffect(() => {
    if (!open) return;
    setError("");
    setInfo("");
    setPassword("");
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isSignup = mode === "signup";
  const isReset = mode === "reset";
  const isUpdatePassword = mode === "update-password";
  const isSignin = !isSignup && !isReset && !isUpdatePassword;
  const heading = isSignup
    ? "Create your PromoGrind account"
    : isReset
      ? "Reset your password"
      : isUpdatePassword
        ? "Choose a new password"
        : "Sign in to PromoGrind";
  const subheading = isSignup
    ? "Create a free account for PromoGrind sync, referrals, and access across devices."
    : isReset
      ? "Enter your account email and we'll send a secure reset link."
      : isUpdatePassword
        ? "Your reset link is active. Set a new password for this PromoGrind account."
        : "Sign in to sync your calculators, tracker, ledger, and account settings.";

  const submitLabel = useMemo(() => {
    if (submitting) {
      if (isSignup) return "Creating account...";
      if (isReset) return "Sending reset link...";
      if (isUpdatePassword) return "Saving password...";
      return "Signing in...";
    }
    if (isSignup) return "Create account";
    if (isReset) return "Send reset link";
    if (isUpdatePassword) return "Save new password";
    return "Sign in";
  }, [isSignup, isReset, isUpdatePassword, submitting]);

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

    if (!email.trim() && !isUpdatePassword) {
      setError("Email is required.");
      return;
    }

    if (!password && !isReset) {
      setError("Email and password are required.");
      return;
    }

    if ((isSignup || isUpdatePassword) && password.length < 8) {
      setError("Use at least 8 characters for your password.");
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
          setInfo("Account created. If your first sign-in asks for confirmation, check your inbox and spam folder, or resend the confirmation email here.");
        }
      } else if (isReset) {
        await resetPromoGrindPassword(email);
        setInfo("Password reset email sent. Check your inbox and spam folder, then use the link to set a new password.");
      } else if (isUpdatePassword) {
        await updatePromoGrindPassword(password);
        setInfo("Password updated. You can sign in with the new password now.");
        setPassword("");
        onModeChange?.("signin");
      } else {
        await signInToPromoGrind({ email, password });
        onClose?.();
      }
    } catch (err) {
      const message = err?.message || "Authentication failed.";
      if (/email.*not.*confirm/i.test(message)) {
        setError("That email still needs confirmation. Check your inbox and spam folder, or resend the confirmation email below.");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError("Enter your email first so we know where to send the confirmation.");
      return;
    }
    setSecondarySubmitting(true);
    try {
      await resendPromoGrindConfirmation(email);
      setInfo("Confirmation email resent. Check your inbox and spam folder.");
    } catch (err) {
      setError(err?.message || "Could not resend the confirmation email.");
    } finally {
      setSecondarySubmitting(false);
    }
  };

  return (
    <div
      data-backdrop-dismiss
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pg-auth-heading"
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
      <div data-click-shield ref={panelRef} style={getPanelStyle()} onClick={(event) => event.stopPropagation()}>
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
            <div id="pg-auth-heading" style={{ fontSize: 24, color: K.tx, fontWeight: 800, fontFamily: fontD, letterSpacing: "-0.5px", marginBottom: 8 }}>
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

        <div role="status" style={{ margin: '16px 20px 0', padding: '10px 12px', borderRadius: 10, border: `1px solid ${K.yl}35`, background: `${K.yl}0d`, color: K.dm, fontSize: 10, lineHeight: 1.55 }}>
          <strong style={{ color: K.yl }}>Identity architecture · {identityState.declaredArchitecture}</strong><br />
          {identityState.currentLabel}. This form uses the current compatibility authority; it is not represented as unified studio sign-in.
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
                  border: `1px solid ${(mode === value || (isReset && value === "signin") || (isUpdatePassword && value === "signin")) ? K.gn : K.bd}`,
                  background: (mode === value || (isReset && value === "signin") || (isUpdatePassword && value === "signin")) ? `${K.gn}18` : K.s2,
                  color: (mode === value || (isReset && value === "signin") || (isUpdatePassword && value === "signin")) ? K.gn : K.dm,
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
                  Display name
                </span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="SharpScout"
                  maxLength={24}
                  style={getInputStyle()}
                />
                <span style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>
                  This name appears inside PromoGrind.
                </span>
              </label>
            )}

            {!isUpdatePassword && (
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
                  style={getInputStyle()}
                />
              </label>
            )}

            {!isReset && (
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>
                  {isUpdatePassword ? "New password" : "Password"}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isSignup || isUpdatePassword ? "At least 8 characters" : "Enter your password"}
                  autoComplete={isSignup || isUpdatePassword ? "new-password" : "current-password"}
                  style={getInputStyle()}
                />
              </label>
            )}
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
                Send me occasional PromoGrind updates, launch notes, and relevant product offers.
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

          {(isSignup || isSignin) && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={secondarySubmitting}
              style={{
                width: "100%",
                marginTop: 10,
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${K.bd2}`,
                background: "transparent",
                color: K.dm,
                fontSize: 11,
                fontWeight: 700,
                cursor: secondarySubmitting ? "default" : "pointer",
                fontFamily: font,
                opacity: secondarySubmitting ? 0.7 : 1,
              }}
            >
              {secondarySubmitting ? "Resending..." : "Resend confirmation email"}
            </button>
          )}

          {isSignin && (
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <button
                type="button"
                onClick={() => onModeChange?.("reset")}
                style={{ background: "none", border: "none", padding: 0, color: K.ac, cursor: "pointer", fontSize: 11, fontFamily: font }}
              >
                Forgot your password?
              </button>
            </div>
          )}

          <div style={{ marginTop: 14, fontSize: 11, color: K.mt, lineHeight: 1.7, textAlign: "center" }}>
            {isSignup ? "Already have an account?" : "Need a new PromoGrind account?"}{" "}
            <button
              type="button"
              onClick={() => onModeChange?.(isSignup || isReset || isUpdatePassword ? "signin" : "signup")}
              style={{ background: "none", border: "none", padding: 0, color: K.ac, cursor: "pointer", font: "inherit" }}
            >
              {isSignup || isReset || isUpdatePassword ? "Sign in here." : "Create one here."}
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 10, color: K.mt, lineHeight: 1.6, textAlign: "center" }}>
            This creates a PromoGrind account only. Studio membership is separate and not required.
          </div>
        </form>
      </div>
    </div>
  );
}
