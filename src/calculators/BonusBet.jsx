import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import { calcBonus, sensitivityBonus, K, font, fontD, f, toD, toA } from "../lib/shared.js";
import { S, In, RR, Tl, Nt, Help, useCalcMemory } from "../ui.jsx";
import { CANONICAL_APP_URL, FEATURE_FLAGS } from "../launchState.js";
import { AppDataCtx } from "../contexts.jsx";
import { supabase } from "../auth.js";
import SensitivityChip from "../components/SensitivityChip.jsx";
import ResultFeedbackCard from "../components/ResultFeedbackCard.jsx";
import CalculatorTrustBadge from "../components/CalculatorTrustBadge.jsx";
import BookCTA from "../components/BookCTA.jsx";
import ShareCard from "../components/ShareCard.jsx";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import CalcNextStep from "../components/CalcNextStep.jsx";

function parseNL(text) {
  const dollars = text.match(/\$(\d+(?:\.\d+)?)/);
  const posOdds = text.match(/\+(\d+)/);
  const negOdds = text.match(/-(\d+)/);
  return {
    sz: dollars ? dollars[1] : null,
    bo: posOdds ? "+" + posOdds[1] : null,
    ho: negOdds ? "-" + negOdds[1] : null,
  };
}

export default function BonusBet() {
  const { appData: bbAppData, syncAppData: bbSyncAppData } = useContext(AppDataCtx) || {};
  const [mem, setMem] = useCalcMemory("bonus-bet", { sz: "200", bo: "+300", ho: "-350" });
  const { sz, bo, ho } = mem;
  const setSz = (v) => setMem("sz", v);
  const setBo = (v) => setMem("bo", v);
  const setHo = (v) => setMem("ho", v);
  const r = useMemo(() => calcBonus(parseFloat(sz), bo, ho), [sz, bo, ho]);
  const sens = useMemo(() => sensitivityBonus(parseFloat(sz), bo, ho), [sz, bo, ho]);
  const [showHist, setShowHist] = useState(false);
  const [hist, setHist] = useState(() => { try { return JSON.parse(localStorage.getItem("pg_hist_bonus-bet") || "[]"); } catch { return []; } });
  useEffect(() => {
    if (!r || !parseFloat(r.g)) return;
    const entry = { ts: Date.now(), sz, bo, ho, profit: r.g, hs: r.hs, rate: r.r };
    setHist((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      try { localStorage.setItem("pg_hist_bonus-bet", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [r?.g, r?.hs]);
  const [nlText, setNlText] = useState("");
  const [nlPreview, setNlPreview] = useState(null);
  const [demoMode, setDemoMode] = useState(() => new URLSearchParams(window.location.search).has("demo"));
  const [bbUpsellDismissed, setBbUpsellDismissed] = useState(() => { try { return !!localStorage.getItem("pg_upsell_bb_dismissed"); } catch { return true; } });
  const [rCopied, setRCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const fileInputRef = useRef(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const bbCount = useMemo(() => { try { return parseInt(localStorage.getItem("pg_upsell_bb_count") || "0"); } catch { return 0; } }, [r]);
  const applyNL = () => {
    const p = parseNL(nlText);
    if (p.sz) setSz(p.sz);
    if (p.bo) setBo(p.bo);
    if (p.ho) setHo(p.ho);
    setNlPreview(p);
  };
  const applyDemo = () => { setSz("200"); setBo("+330"); setHo("-380"); setDemoMode(true); };
  useMemo(() => {
    if (r && parseFloat(r.g) > 0) { try { const c = parseInt(localStorage.getItem("pg_upsell_bb_count") || "0") + 1; localStorage.setItem("pg_upsell_bb_count", String(c)); } catch {} }
  }, [r?.g]);
  const scanBetSlip = async (file) => {
    setScanLoading(true); setScanResult(null);
    try {
      const toBase64 = (fl) => new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result.split(",")[1]); rd.onerror = rej; rd.readAsDataURL(fl); });
      const base64 = await toBase64(file);
      const { data: { session } } = await supabase.auth.getSession();
      const { data: parsed, error } = await supabase.functions.invoke("parse-bet-slip", {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: { imageBase64: base64, mimeType: file.type },
      });
      if (error) throw error;
      if (parsed) {
        if (parsed.stake) setSz(String(parsed.stake));
        if (parsed.odds) setBo(String(parsed.odds));
        if (parsed.hedgeOdds) setHo(String(parsed.hedgeOdds));
        setScanResult(parsed);
      }
    } catch (e) { console.error("[BetSlipScan]", e); setScanResult({ error: true }); }
    finally { setScanLoading(false); }
  };
  const copyResult = () => {
    if (!r) return;
    const text = `📊 Bonus Bet Converter — PromoGrind\nBonus Size: $${sz} | Bonus Odds: ${bo} | Hedge Odds: ${ho}\nHedge Stake: $${r.hs}\nGuaranteed Profit: $${r.g} (${r.r}% conversion)\n${CANONICAL_APP_URL}`;
    try { navigator.clipboard.writeText(text); } catch {}
    setRCopied(true); setTimeout(() => setRCopied(false), 1500);
  };
  return (
    <div>
      <div style={S.card}>
        <Tl t="Bonus Bet Converter" badge="STAKE NOT RETURNED" bc={K.gn} shareable getParams={() => ({ sz, bo, ho })} />
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Quick Input (natural language)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <textarea value={nlText} onChange={(e) => { setNlText(e.target.value); setNlPreview(parseNL(e.target.value)); }} placeholder='Try: "I have a $200 bonus bet at +350, hedge at -400"' style={{ ...S.input, height: 48, resize: "none", flex: 1, lineHeight: 1.5, fontSize: 12 }} />
            <button onClick={applyNL} style={{ padding: "8px 14px", background: `${K.ac}15`, border: `1px solid ${K.ac}30`, borderRadius: 4, color: K.ac, fontSize: 10, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}>Parse</button>
            {FEATURE_FLAGS.aiScan ? (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) scanBetSlip(e.target.files[0]); e.target.value = ""; }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={scanLoading} title="Upload a bet slip screenshot — Claude AI will auto-fill the fields" style={{ padding: "8px 12px", background: scanLoading ? `${K.mt}15` : `${K.pp}15`, border: `1px solid ${scanLoading ? K.mt : K.pp}30`, borderRadius: 4, color: scanLoading ? K.mt : K.pp, fontSize: 10, cursor: scanLoading ? "not-allowed" : "pointer", fontFamily: font, whiteSpace: "nowrap" }}>{scanLoading ? "Scanning…" : "📷 Scan"}</button>
              </>
            ) : (
              <div style={{ padding: "8px 12px", background: `${K.yl}10`, border: `1px solid ${K.yl}30`, borderRadius: 4, color: K.yl, fontSize: 10, fontFamily: font, whiteSpace: "nowrap" }}>📷 Scan in beta</div>
            )}
          </div>
          {!FEATURE_FLAGS.aiScan && <div style={{ fontSize: 10, color: K.mt, marginTop: 4 }}>Bet slip scan will appear here once the AI backend is activated.</div>}
          {scanResult && !scanResult.error && <div style={{ fontSize: 10, color: K.gn, marginTop: 4 }}>✓ Scanned: {[scanResult.book, scanResult.betType?.replace(/_/g, " "), scanResult.odds && `${scanResult.odds} odds`, scanResult.stake && `$${scanResult.stake} stake`].filter(Boolean).join(" · ")}</div>}
          {scanResult && !scanResult.error && bbSyncAppData && (
            <button
              onClick={() => {
                const newBet = { id: Date.now(), date: new Date().toISOString().split("T")[0], book: scanResult.book || "", sport: "", description: scanResult.promoName || scanResult.betType || "Scanned bet", betType: scanResult.betType || "straight", stake: parseFloat(scanResult.stake) || 0, odds: scanResult.odds || "", result: "pending", payout: 0, profit: 0, notes: "Added via AI scan", tags: ["scanned"] };
                const updatedBets = [...(bbAppData?.bets || []), newBet];
                bbSyncAppData({ ...bbAppData, bets: updatedBets });
                alert("Bet added to Tracker!");
              }}
              style={{ marginTop: 8, padding: "6px 14px", background: "#1e3a2f", border: "1px solid #4ade80", color: "#4ade80", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
            >➕ Add to Tracker</button>
          )}
          {scanResult?.error && <div style={{ fontSize: 10, color: K.rd, marginTop: 4 }}>⚠ Scan failed — try entering manually or use a clearer screenshot</div>}
          {nlPreview && (nlPreview.sz || nlPreview.bo || nlPreview.ho) && <div style={{ fontSize: 10, color: K.gn, marginTop: 4 }}>Detected: {[nlPreview.sz && `$${nlPreview.sz} bonus`, nlPreview.bo && `${nlPreview.bo} odds`, nlPreview.ho && `${nlPreview.ho} hedge`].filter(Boolean).join(", ")}</div>}
        </div>
        <div style={S.row}><In l="Bonus Bet Size" v={sz} set={setSz} pre="$" ph="200" /><In l="Bonus Bet Odds" v={bo} set={setBo} ph="+300" /><In l="Hedge Odds" v={ho} set={setHo} ph="-350" /></div>
        <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => { setSz("200"); setBo("+350"); setHo("-400"); }} style={{ padding: "4px 10px", background: `${K.ac}10`, border: `1px solid ${K.ac}30`, borderRadius: 4, color: K.ac, fontSize: 10, cursor: "pointer", fontFamily: font, letterSpacing: "0.5px" }}>★ Show Example</button>
          <button onClick={() => demoMode ? setDemoMode(false) : applyDemo()} style={{ padding: "4px 10px", background: demoMode ? `${K.gn}15` : `${K.gn}08`, border: `1px solid ${demoMode ? K.gn : K.gn + "30"}`, borderRadius: 4, color: K.gn, fontSize: 10, cursor: "pointer", fontFamily: font, letterSpacing: "0.5px" }}>▶ Demo</button>
          <span style={{ fontSize: 10, color: K.mt }}>$200 bonus bet at +350, hedge at -400 — DraftKings → FanDuel</span>
        </div>
        {demoMode && (
          <div style={{ ...S.note(K.ac), marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Step-by-step demo</div>
            <div>Step 1: You received a $200 bonus bet.</div>
            <div>Step 2: We found Warriors +330 vs Lakers tonight.</div>
            <div>Step 3: Hedge ${r ? r.hs : "~"} at -380 on FanDuel.</div>
            <div>Step 4: Collect ~${r ? r.g : "~"} guaranteed.</div>
            <button onClick={() => setDemoMode(false)} style={{ marginTop: 6, background: "transparent", border: "none", color: K.mt, cursor: "pointer", fontSize: 10, padding: 0, textDecoration: "underline" }}>✕ Exit Demo</button>
          </div>
        )}
        {bo && toD(bo) > 1 && (() => {
          const a = toD(bo) > 1 ? Math.round((toD(bo) - 1) * 100) : 0;
          const zones = [{ min: 0, max: 199, c: K.rd, l: "Too Low" }, { min: 200, max: 249, c: K.yl, l: "OK" }, { min: 250, max: 400, c: K.gn, l: "Sweet Spot" }, { min: 401, max: 500, c: K.yl, l: "Harder to Hedge" }, { min: 501, max: 9999, c: K.rd, l: "Too High" }];
          const zone = zones.find((z) => a >= z.min && a <= z.max) || zones[4];
          const pct = Math.min(100, Math.max(0, (a - 0) / 700 * 100));
          return (
            <div style={{ marginBottom: 12, padding: "10px 12px", background: K.s2, borderRadius: 6, border: `1px solid ${K.bd}` }}>
              <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6 }}>Bonus Bet Odds Sweet Spot</div>
              <div style={{ position: "relative", height: 8, background: K.s3, borderRadius: 4, marginBottom: 4 }}>
                <div style={{ position: "absolute", left: 0, width: "29%", height: "100%", background: `${K.rd}40`, borderRadius: "4px 0 0 4px" }} />
                <div style={{ position: "absolute", left: "29%", width: "7%", height: "100%", background: `${K.yl}40` }} />
                <div style={{ position: "absolute", left: "36%", width: "22%", height: "100%", background: `${K.gn}40` }} />
                <div style={{ position: "absolute", left: "58%", width: "14%", height: "100%", background: `${K.yl}40` }} />
                <div style={{ position: "absolute", left: "72%", width: "28%", height: "100%", background: `${K.rd}40`, borderRadius: "0 4px 4px 0" }} />
                <div style={{ position: "absolute", left: `calc(${pct}% - 3px)`, top: -2, width: 6, height: 12, background: zone.c, borderRadius: 2, border: `1px solid ${zone.c}` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: K.mt }}>
                <span>+100</span><span style={{ color: K.gn, fontWeight: 600 }}>+250–+400 ideal</span><span>+700</span>
              </div>
              <div style={{ fontSize: 10, color: zone.c, fontWeight: 600, marginTop: 4 }}>{toA(toD(bo))} — {zone.l}</div>
            </div>
          );
        })()}
        {hist.length > 0 && <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}><button onClick={() => setShowHist((h) => !h)} style={{ padding: "3px 10px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.dm, fontSize: 9, cursor: "pointer", fontFamily: font }}>🕐 History ({hist.length})</button></div>}
        {showHist && hist.length > 0 && (
          <div style={{ marginBottom: 12, padding: 10, background: K.s2, borderRadius: 6, border: `1px solid ${K.bd}`, maxHeight: 180, overflowY: "auto" }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Last {hist.length} Calculations</div>
            {hist.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: K.dm, padding: "3px 0", borderBottom: i < hist.length - 1 ? `1px solid ${K.bd}` : "none" }}>
                <span>${h.sz} @ {h.bo} → {h.ho}</span>
                <span style={{ color: K.gn, fontWeight: 600 }}>+${h.profit} ({h.rate}%)</span>
                <span style={{ color: K.mt }}>{new Date(h.ts).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
        {r && (
          <div style={S.res(parseFloat(r.g) > 0)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(parseFloat(r.g) > 0 ? K.gn : K.rd)}>${r.g}</span>
              <span style={{ fontSize: 12, color: K.dm }}>guaranteed profit</span>
              <button onClick={copyResult} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: rCopied ? K.gn : K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📋 {rCopied ? "Copied!" : "Copy"}</button>
              <button onClick={() => setShowReceipt(true)} style={{ padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="Hedge Bet Amount (real cash)" v={`$${r.hs}`} c={K.ac} b /><RR l="If Bonus Bet Wins" v={`+$${r.pBW}`} c={K.gn} /><RR l="If Hedge Bet Wins" v={`+$${r.pHW}`} c={K.gn} /><RR l="Conversion Rate" v={`${r.r}%`} c={parseFloat(r.r) >= 70 ? K.gn : K.yl} b />
            {S.meter(parseFloat(r.r), parseFloat(r.r) >= 70 ? K.gn : parseFloat(r.r) >= 50 ? K.yl : K.rd)}
            <BookCTA promoType="bonus" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <CalculatorTrustBadge calculatorKey="bonus-bet" promoType="bonus_bet" />
              <SensitivityChip summary={sens} />
            </div>
            {parseFloat(r.g) > 0 && (
              <ResultFeedbackCard calculatorKey="bonus-bet" calculatorLabel="Bonus Bet Converter" promoType="bonus_bet" expectedProfit={r.g} />
            )}
            {parseFloat(r.g) > 0 && bbCount >= 3 && !bbUpsellDismissed && (
              <div style={{ marginTop: 14, padding: 12, background: `${K.pp}08`, border: `1px solid ${K.pp}30`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: K.pp }}>⚡ Track this win + get live arb alerts</div><div style={{ fontSize: 10, color: K.mt }}>VaultSparked — $24.99/mo · First 7 days free</div></div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { window.location.hash = "#/upgrade"; }} style={{ padding: "4px 10px", background: K.pp, border: "none", borderRadius: 4, color: K.bg, fontWeight: 700, fontSize: 10, cursor: "pointer", fontFamily: font }}>Upgrade →</button>
                  <button onClick={() => { try { localStorage.setItem("pg_upsell_bb_dismissed", "1"); } catch {} setBbUpsellDismissed(true); }} style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 10, cursor: "pointer", fontFamily: font }}>Dismiss</button>
                </div>
              </div>
            )}
            {parseFloat(r.g) > 0 && !showShareCard && (
              <button onClick={() => setShowShareCard(true)} style={{ marginTop: 8, width: "100%", padding: "7px 0", background: "transparent", border: "1px dashed #4ade80", color: "#4ade80", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                🎉 Share your win
              </button>
            )}
            {showShareCard && parseFloat(r.g) > 0 && (
              <ShareCard title="Bonus Bet Converter" profit={`$${r.g}`} onClose={() => setShowShareCard(false)} />
            )}
            {showReceipt && r && (
              <CalculatorReceipt
                calcName="Bonus Bet Converter"
                inputs={[
                  { label: "Bonus Bet Size", value: `$${sz}` },
                  { label: "Bonus Bet Odds", value: bo },
                  { label: "Hedge Odds", value: ho },
                ]}
                outputs={[
                  { label: "Hedge Stake", value: `$${r.hs}` },
                  { label: "If Bonus Wins", value: `+$${r.pBW}` },
                  { label: "If Hedge Wins", value: `+$${r.pHW}` },
                  { label: "Conversion Rate", value: `${r.r}%` },
                  { label: "Guaranteed Profit", value: `$${r.g}`, highlight: true },
                ]}
                onClose={() => setShowReceipt(false)}
              />
            )}
          </div>
        )}
        {r && <CalcNextStep calcKey="bonus-bet" />}
      </div>
      <Help entries={[
        ["Bonus Bet", "A free bet credit given by a sportsbook. If it wins, you only get the PROFIT — the original bonus amount is NOT returned. For example, a $200 bonus bet at +300 odds that wins pays you $600 in profit, but the $200 credit disappears."],
        ["Underdog / Favorite", "The underdog is the team expected to lose (shown with + odds like +300). The favorite is expected to win (shown with - odds like -350). For conversions, you always place your bonus on the underdog and hedge with cash on the favorite."],
        ["Hedge", "A second bet on the opposite outcome at a DIFFERENT sportsbook. By betting both sides, you guarantee profit regardless of who wins."],
        ["Conversion Rate", "The percentage of the bonus you extract as real cash. 70%+ is considered excellent — meaning a $200 bonus bet becomes $140+ in your pocket. The wider the odds gap, the better the conversion."],
        ["Why +250 to +400 odds?", "Higher + odds on the bonus side means more potential profit to hedge against. Below +200, conversion rates drop below 60%. Above +500, finding close hedge lines becomes harder."],
        ["Step-by-Step", "1) Get your bonus bets from a sportsbook promo. 2) Find a game with an underdog at +250 to +400. 3) Place your bonus bet on the underdog at Book A. 4) Use this calculator to find the hedge amount. 5) Place a CASH bet for that amount on the favorite at Book B. 6) No matter who wins, you profit."],
      ]} />
    </div>
  );
}
