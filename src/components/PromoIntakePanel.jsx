import React, { useMemo, useState } from "react";
import { K, font, fontD } from "../lib/shared.js";
import { parsePromoText } from "../intake/parse.js";

/**
 * Paste-and-normalize UI for the Promo Intake Pipeline.
 *
 * User drops freeform promo text (e.g. copied from a sportsbook banner or
 * email) → we parse it into a normalized PromoCard showing the detected
 * book, promo type, headline bonus, and a one-click link to the right
 * calculator. No AI calls, no network: pure client-side regex.
 *
 * Props:
 *   onOpenCalculator(slug) — optional navigation hook; receives calculator
 *                            slug on "Open calculator →" click.
 *   initialText            — seed text (used by the extension capture hook).
 */
export default function PromoIntakePanel({ onOpenCalculator, initialText = "" }) {
  const [text, setText] = useState(initialText);
  const card = useMemo(() => (text.trim().length >= 6 ? parsePromoText(text) : null), [text]);

  const tone =
    card?.confidence === "high"
      ? K.gn
      : card?.confidence === "medium"
      ? K.ac
      : card?.confidence === "low"
      ? K.yl
      : K.mt;

  return (
    <div
      style={{
        padding: 16,
        background: K.s1,
        border: `1px solid ${K.bd}`,
        borderRadius: 12,
        fontFamily: font,
        color: K.tx,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: fontD, letterSpacing: "-0.3px" }}>
          Promo intake
        </div>
        <div style={{ fontSize: 11, color: K.mt }}>
          Paste a promo → we detect the book, promo type, and open the right calculator.
        </div>
      </div>

      <label htmlFor="promo-intake-text" style={{ display: "block", fontSize: 11, color: K.mt, marginBottom: 4 }}>
        Paste promo text
      </label>
      <textarea
        id="promo-intake-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        placeholder="Ex: DraftKings — Bet $5, get $200 in Bonus Bets. Min odds -200. Expires 04/30/2026."
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 10,
          border: `1px solid ${K.bd}`,
          background: K.s2,
          color: K.tx,
          fontFamily: font,
          fontSize: 13,
          boxSizing: "border-box",
          resize: "vertical",
          outline: "none",
        }}
      />

      {!card ? (
        <div style={{ marginTop: 10, fontSize: 11, color: K.mt, lineHeight: 1.6 }}>
          Waiting for at least 6 characters of promo text…
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${tone}40`,
            background: `${tone}0d`,
            color: K.tx,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
                color: tone,
              }}
            >
              {card.confidence} confidence
            </span>
            {card.book && (
              <span style={tagStyle}>{card.book}</span>
            )}
            {card.promoType !== "other" && (
              <span style={tagStyle}>{card.promoType.replace(/_/g, " ")}</span>
            )}
            {card.bonusAmount != null && (
              <span style={tagStyle}>${card.bonusAmount}</span>
            )}
            {card.boostPct != null && (
              <span style={tagStyle}>{card.boostPct}% boost</span>
            )}
            {card.minOdds && (
              <span style={tagStyle}>min odds {card.minOdds}</span>
            )}
            {card.expiry && (
              <span style={tagStyle}>expires {card.expiry}</span>
            )}
          </div>

          {card.calculator ? (
            <button
              type="button"
              onClick={() => onOpenCalculator?.(card.calculator)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: K.gn,
                color: "#081018",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Open {card.calculator} calculator →
            </button>
          ) : (
            <div style={{ fontSize: 11, color: K.mt }}>
              Couldn't match this to a specific calculator. Try adding the promo type (e.g. "bonus bet", "profit boost").
            </div>
          )}

          {card.matches.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 10, color: K.mt, lineHeight: 1.6 }}>
              Signals: {card.matches.join(" · ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const tagStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(96,165,250,0.12)",
  color: "#93c5fd",
  fontSize: 10,
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  fontWeight: 700,
};
