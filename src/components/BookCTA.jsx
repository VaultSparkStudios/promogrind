import React, { useMemo } from "react";
import { BOOKS, getBookLinkAnalyticsProps, getBookLinkMeta } from "../books.js";
import { trackEvent } from "../analytics.js";
import { K, font } from "../lib/shared.js";

const BookCTA = ({ promoType }) => {
  const sorted = useMemo(() => {
    if (!promoType) return BOOKS;
    const priority = {
      bonus: ["Bet & Get", "Bet Reset"],
      boost: ["Profit Boosts", "Bet & Get"],
      safety: ["Safety Net", "Choice", "Bet Reset"],
      arb: null,
    }[promoType] || null;
    if (!priority) return [...BOOKS].sort((a, b) => b.bonus - a.bonus);
    return [
      ...BOOKS.filter((b) => priority.includes(b.type)),
      ...BOOKS.filter((b) => !priority.includes(b.type)),
    ];
  }, [promoType]);
  return (
    <div style={{ marginTop: 14, padding: 12, background: `${K.gn}06`, border: `1px solid ${K.gn}20`, borderRadius: 8 }}>
      <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>Don&apos;t have these books yet? Open accounts to use this promo:</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {sorted.slice(0, 4).map((b) => {
          const linkMeta = getBookLinkMeta(b);
          return (
          <a
            key={b.name}
            href={linkMeta.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => trackEvent("sportsbook_cta_clicked", getBookLinkAnalyticsProps(b, {
              promoType: promoType || "general",
              surface: "calculator_cta",
            }))}
            style={{ padding: "4px 10px", background: `${b.color}15`, border: `1px solid ${b.color}30`, borderRadius: 4, color: b.color, fontSize: 10, fontWeight: 600, textDecoration: "none", fontFamily: font }}
          >
            {b.name} <span style={{ fontSize: 8, opacity: 0.7, fontWeight: 400 }}>21+</span> →
          </a>
        )})}
        <a
          href={getBookLinkMeta(sorted[4] || {}).url || "#"}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => {
            const book = sorted[4] || {};
            trackEvent("sportsbook_cta_clicked", getBookLinkAnalyticsProps(book, {
              book: book.name || "more",
              promoType: promoType || "general",
              surface: "calculator_cta_more",
            }));
          }}
          style={{ padding: "4px 10px", background: `${K.bd}`, border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.dm, fontSize: 10, fontWeight: 600, textDecoration: "none", fontFamily: font }}
        >
          +{BOOKS.length - 4} more →
        </a>
      </div>
    </div>
  );
};

export default BookCTA;
