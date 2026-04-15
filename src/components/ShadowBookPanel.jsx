import React, { useContext, useMemo } from "react";
import { K, font, fontD } from "../lib/shared.js";
import { BOOKS, getBookUrl } from "../books.js";
import { AppDataCtx } from "../contexts.jsx";
import { buildShadowBookProjection } from "../lib/shadow.js";

/**
 * Shadow Book Mode — quantifies the weekly + first-month cash value the user
 * is leaving on the table by not having accounts at other sportsbooks.
 *
 * Pulls `bookStatus` out of `AppDataCtx` so the projection auto-narrows to
 * the books the user hasn't marked active/limited in the Sportsbooks tab.
 * Renders nothing (silently) if every book is owned.
 */
export default function ShadowBookPanel({ compact = false }) {
  const ctx = useContext(AppDataCtx);
  const bookStatus = ctx?.appData?.bookStatus || {};

  const projection = useMemo(
    () => buildShadowBookProjection({ books: BOOKS, bookStatus }),
    [bookStatus],
  );

  if (!projection.missingBooks.length) return null;

  const { missingBooks, totalWelcomeOneTime, totalWeeklyRecurring, totalFirstMonth } = projection;

  return (
    <section
      aria-label="Shadow book mode: value of opening additional sportsbook accounts"
      style={{
        padding: compact ? 12 : 16,
        background: K.s1,
        border: `1px solid ${K.bd}`,
        borderRadius: 12,
        color: K.tx,
        fontFamily: font,
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: compact ? 14 : 16, fontWeight: 700, fontFamily: fontD, letterSpacing: "-0.3px" }}>
          Shadow book mode
        </div>
        <div style={{ fontSize: 11, color: K.mt, lineHeight: 1.5 }}>
          Cash you'd unlock by opening these accounts. Estimates use a 70% bonus conversion rate and
          conservative per-book recurring EV.
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Summary label="1st-month upside" value={`$${totalFirstMonth.toLocaleString()}`} tone={K.gn} />
        <Summary label="Welcome bonuses" value={`$${totalWelcomeOneTime.toLocaleString()}`} tone={K.ac} />
        <Summary label="Recurring / wk" value={`$${totalWeeklyRecurring.toLocaleString()}`} tone={K.yl} />
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {missingBooks.map((row) => {
          const book = BOOKS.find((candidate) => candidate.name === row.name);
          const href = book ? getBookUrl(book) : null;
          return (
            <li
              key={row.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${K.bd}`,
                background: K.s2,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: row.color || K.ac,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: K.tx }}>{row.name}</div>
                <div style={{ fontSize: 11, color: K.mt, lineHeight: 1.5 }}>
                  ~${row.welcomeOneTime} welcome + ~${row.weeklyRecurring}/wk recurring
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: K.gn }}>
                  +${row.firstMonthTotal.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: K.mt }}>first month</div>
              </div>
              {href && (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    background: K.gn,
                    color: "#081018",
                    fontSize: 11,
                    fontWeight: 800,
                    textDecoration: "none",
                    fontFamily: font,
                  }}
                >
                  Open →
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <div style={{ marginTop: 10, fontSize: 10, color: K.mt, lineHeight: 1.6 }}>
        21+. Gambling can be addictive. Only open accounts you'll actually use — this projection
        assumes consistent promo hunting. Mark books in the Sportsbooks tab once opened to refine
        the estimate.
      </div>
    </section>
  );
}

function Summary({ label, value, tone }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: `1px solid ${tone}30`,
        background: `${tone}0d`,
      }}
    >
      <div style={{ fontSize: 10, color: K.mt, letterSpacing: "0.8px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: tone, fontFamily: fontD }}>{value}</div>
    </div>
  );
}
