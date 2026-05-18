import React, { Component, Suspense } from "react";
import { K, font } from "../lib/shared.js";
import { S, LoadingState } from "../ui.jsx";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(e) {
    return { error: e };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, textAlign: "center", color: K.rd }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: K.rd, marginBottom: 8 }}>This calculator hit an error</div>
          <div style={{ fontSize: 12, color: K.mt, marginBottom: 12 }}>The rest of PromoGrind is still available.</div>
          {import.meta.env.DEV && (
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 12, textAlign: "left", padding: "8px", background: "#0a0e17", borderRadius: 4, wordBreak: "break-all" }}>
              {this.state.error.message}
            </div>
          )}
          <button onClick={() => this.setState({ error: null })} style={{ padding: "8px 20px", background: "#60a5fa", border: "none", borderRadius: 6, color: "#0a0e17", fontWeight: 700, cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppCalculatorRouter({
  slug,
  item,
  isLiveTool,
  proStatus,
  compareMode,
  calcGroupIndex,
  groupIndex,
  group,
  isDesktop,
  compareSlug,
  setCompareSlug,
  DailyDashboard,
  navigate,
}) {
  const Comp = item?.c || (() => null);
  return (
    <ErrorBoundary>
      <Suspense fallback={<div style={{ padding: 32, textAlign: "center" }}><LoadingState /></div>}>
        {slug === "dashboard"
          ? <DailyDashboard navigate={navigate} proStatus={proStatus} />
          : compareMode && groupIndex === calcGroupIndex
            ? (
              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, fontFamily: font }}>Primary - {item?.n}</div>
                  {isLiveTool ? <Comp proStatus={proStatus} mode={slug} /> : <Comp />}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1px", fontFamily: font }}>Compare -</span>
                    <select value={compareSlug} onChange={(e) => setCompareSlug(e.target.value)} style={{ ...S.input, width: "auto", padding: "3px 8px", fontSize: 10 }}>
                      <option value="">Pick a calculator...</option>
                      {group.items.filter((it) => it.slug !== slug).map((it) => <option key={it.slug} value={it.slug}>{it.n}</option>)}
                    </select>
                  </div>
                  {compareSlug
                    ? (() => {
                      const compareItem = group.items.find((it) => it.slug === compareSlug);
                      const CompareComp = compareItem?.c;
                      return CompareComp ? <Suspense fallback={null}><CompareComp /></Suspense> : <div style={{ color: K.mt, fontSize: 11 }}>Not found.</div>;
                    })()
                    : <div style={{ ...S.card, color: K.mt, fontSize: 11, textAlign: "center", padding: "32px 16px" }}>Select a calculator above to compare side by side.</div>}
                </div>
              </div>
            )
            : isLiveTool ? <Comp proStatus={proStatus} mode={slug} /> : <Comp />}
      </Suspense>
    </ErrorBoundary>
  );
}
