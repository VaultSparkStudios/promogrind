import React, { useState, useMemo, useEffect, useRef, Component } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BOOKS } from "./books.js";
import { checkAuth, getSubscription, startCheckout, supabase } from "./auth.js";
import { loadData, saveData, onCalculation, onLedgerEntry, onDailyLogin } from "./sync.js";

/*
═══════════════════════════════════════════════════════════════
  PROMO ENGINE v3 — Complete Sportsbook Profit Extraction System
  
  LEGAL STATUS:
  This is an educational calculator tool — like a tax calculator 
  or mortgage calculator. It performs math on numbers you input.
  
  - Matched betting is legal in all US states where online sports 
    betting is legal (30+ states as of March 2026)
  - This tool does not place bets, access sportsbook APIs, or 
    handle any money
  - It is a math calculator with educational content
  - Sharing it with friends is no different than sharing a 
    spreadsheet or calculator app
  - ProfitDuel, OddsJam, DarkHorse Odds, and dozens of similar 
    tools operate legally as paid subscription services
  - This tool is FREE. Affiliate links in src/books.js support development.
  
  GAMBLING DISCLAIMER:
  Must be 21+ (18+ in some states). Only bet in states where 
  sports betting is legal. All gambling winnings are taxable. 
  Gamble responsibly. If you or someone you know has a gambling 
  problem, call 1-800-GAMBLER.
═══════════════════════════════════════════════════════════════
*/

// ═══ MATH ENGINE ═══
const toD = (v) => { const s=String(v).trim(); if(!s) return 0; if(s.includes('/')) { const[n,d]=s.split('/').map(Number); return d?n/d+1:0; } const o=parseFloat(s); if(isNaN(o)||o===0) return 0; if(s.startsWith('+')||o<0) return o>0?o/100+1:100/Math.abs(o)+1; if(o>=100) return o/100+1; if(o>=1.01) return o; return 0; };
const toA = (d) => { if (d >= 2) return "+"+Math.round((d-1)*100); if (d > 1) return ""+Math.round(-100/(d-1)); return "0"; };
const toP = (d) => d > 0 ? (1/d*100) : 0;
const toF = (d) => { if (d <= 1) return "0/1"; const n = Math.round((d-1)*100), dn = 100, g = gcd(n, dn); return `${n/g}/${dn/g}`; };
const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
const f = (n, dp=2) => (typeof n === "number" ? n.toFixed(dp) : parseFloat(n||0).toFixed(dp));

const calcBonus = (sz, bO, hO) => { const bd=toD(bO), hd=toD(hO); if (bd<=1||hd<=1||!sz) return null; const wp=sz*(bd-1), hs=wp/hd, pBW=wp-hs, pHW=hs*(hd-1), g=Math.min(pBW,pHW); return {hs:f(hs),pBW:f(pBW),pHW:f(pHW),g:f(g),r:f(g/sz*100,1)}; };
const calcFirst = (s, o, hO) => { const d=toD(o), hd=toD(hO); if (d<=1||hd<=1||!s) return null; const p=s*d, hs=p/hd, pOW=p-s-hs, pHW=hs*hd-hs-s; return {hs:f(hs),pOW:f(pOW),pHW:f(pHW),g:f(Math.min(pOW,pHW))}; };
const calcBoost = (s, o, bp, mx, hO) => { const d=toD(o), hd=toD(hO), b=parseFloat(bp)/100; if (d<=1||hd<=1||!s||!b) return null; const np=s*(d-1), ba=Math.min(np*b,parseFloat(mx)||Infinity), tp=s+np+ba, ed=tp/s, hs=tp/hd, pBW=tp-s-hs, pHW=hs*hd-hs-s, g=Math.min(pBW,pHW); return {eo:toA(ed),ed2:f(ed,4),bv:f(ba),hs:f(hs),pBW:f(pBW),pHW:f(pHW),g:f(g),tp:f(tp)}; };
const calcArb2 = (o1, o2, t) => { const d1=toD(o1), d2=toD(o2); if (d1<=1||d2<=1||!t) return null; const m=1/d1+1/d2, s1=t*(1/d1)/m, s2=t*(1/d2)/m, p=s1*d1; return {ok:m<1,mg:f((1-m)*100),s1:f(s1),s2:f(s2),p:f(p),pr:f(p-t),roi:f((p-t)/t*100)}; };
const calcArb3 = (o1, o2, o3, t) => { const d1=toD(o1),d2=toD(o2),d3=toD(o3); if(d1<=1||d2<=1||d3<=1||!t) return null; const m=1/d1+1/d2+1/d3, s1=t*(1/d1)/m, s2=t*(1/d2)/m, s3=t*(1/d3)/m, p=s1*d1; return {ok:m<1,mg:f((1-m)*100),s1:f(s1),s2:f(s2),s3:f(s3),pr:f(p-t),roi:f((p-t)/t*100)}; };
const calcNV = (o1, o2) => { const d1=toD(o1), d2=toD(o2); if(d1<=1||d2<=1) return null; const p1=1/d1, p2=1/d2, t=p1+p2, v=(t-1)*100, f1=p1/t, f2=p2/t; return {v:f(v,1),ip1:f(p1*100,1),ip2:f(p2*100,1),fp1:f(f1*100,1),fp2:f(f2*100,1),fo1:toA(1/f1),fo2:toA(1/f2)}; };
const calcNV3 = (o1,o2,o3) => { const d1=toD(o1),d2=toD(o2),d3=toD(o3); if(d1<=1||d2<=1||d3<=1) return null; const p1=1/d1,p2=1/d2,p3=1/d3,t=p1+p2+p3,v=(t-1)*100,f1=p1/t,f2=p2/t,f3=p3/t; return {v:f(v,1),ip1:f(p1*100,1),ip2:f(p2*100,1),ip3:f(p3*100,1),fp1:f(f1*100,1),fp2:f(f2*100,1),fp3:f(f3*100,1),fo1:toA(1/f1),fo2:toA(1/f2),fo3:toA(1/f3)}; };
const calcEV = (yo, fo, s) => { const yd=toD(yo), fd=toD(fo); if(yd<=1||fd<=1||!s) return null; const fp=1/fd, ev=(fp*(yd-1)*s)-((1-fp)*s); return {ev:f(ev),roi:f(ev/s*100,1),fp:f(fp*100,1),edge:f((yd-fd)/fd*100,1),ok:ev>0}; };
const calcPH = (pp, hO, os) => { const hd=toD(hO); if(hd<=1||!pp||!os) return null; const hs=pp/hd, pPW=pp-os-hs, pHW=hs*hd-hs-os; return {hs:f(hs),pPW:f(pPW),pHW:f(pHW),g:f(Math.min(pPW,pHW))}; };
const calcMid = (o1, o2, l1, l2, s) => { const d1=toD(o1), d2=toD(o2); if(d1<=1||d2<=1||!s) return null; const s2=(s*d1)/d2, ts=s+s2, wc=Math.max(s*d1,s2*d2)-ts, mw=s*d1+s2*d2-ts, w=Math.abs(parseFloat(l1)-parseFloat(l2)); return {s2:f(s2),ts:f(ts),wc:f(wc),mw:f(mw),w:f(w,1)}; };
const calcRO = (b, m, v) => { const bn=parseFloat(b),mn=parseFloat(m),vn=parseFloat(v)/100; if(!bn||!mn) return null; const tw=bn*mn, ec=tw*(vn||0.045), nv=bn-ec; return {tw:f(tw),ec:f(ec),nv:f(nv),nb:Math.ceil(tw/50),ok:nv>0}; };
const calcDeposit = (dep, pct, mx, ro, vg) => { const d=parseFloat(dep),p=parseFloat(pct)/100,m=parseFloat(mx),r=parseFloat(ro),v=parseFloat(vg)/100; if(!d||!p||!m||!r) return null; const bonus=Math.min(d*p,m),tw=bonus*r,cost=tw*v,net=bonus-cost,minDep=m/p; return {bonus:f(bonus),tw:f(tw),cost:f(cost),net:f(net),ok:net>0,minDep:f(minDep,0),roi:f(net/d*100,1),fill:d>=minDep}; };
const calcKelly = (wp, odds, br, frac) => { const p=parseFloat(wp)/100,d=toD(odds),b=d-1,fr=parseFloat(frac)||1; if(!p||p<=0||p>=1||d<=1||!br) return null; const q=1-p,k=(p*b-q)/b,ak=k*fr,bet=parseFloat(br)*Math.max(0,ak); return {k:f(k*100,2),ak:f(ak*100,2),bet:f(bet),ev:f((p*b-q)*100,2),ok:k>0}; };
const calcInsurance = (stake, insPct, insMax, conv) => { const s=parseFloat(stake),ip=parseFloat(insPct)/100,im=parseFloat(insMax)||Infinity,cv=(parseFloat(conv)||70)/100; if(!s||!ip) return null; const insAmt=Math.min(s*ip,im),insVal=insAmt*cv,netCost=s-insVal; return {insAmt:f(insAmt),insVal:f(insVal),netCost:f(netCost),effPct:f(insVal/s*100,1),ok:insVal>0}; };
const calcTeaser = (legs, tOdds, winPct) => { const n=parseInt(legs),d=toD(tOdds),p=parseFloat(winPct)/100; if(!n||d<=1||!p||p<=0||p>=1) return null; const payout=d-1,combProb=Math.pow(p,n),ev=combProb*payout-(1-combProb),beProb=Math.pow(1/d,1/n); return {ev:f(ev*100,2),combProb:f(combProb*100,1),beProb:f(beProb*100,1),ok:ev>0,payout:f(payout,3)}; };
const calcRR = (pickOdds, size, stakeEach) => { const odds=pickOdds.map(toD).filter(d=>d>1); const n=odds.length,sz=parseInt(size),s=parseFloat(stakeEach); if(n<2||sz<2||sz>n||!s) return null; const combos=[]; const go=(start,cur)=>{ if(cur.length===sz){combos.push([...cur]);return;} for(let i=start;i<=n-(sz-cur.length);i++) go(i+1,[...cur,odds[i]]); }; go(0,[]); const nCombos=combos.length,totalStake=nCombos*s; const payouts=combos.map(c=>c.reduce((p,d)=>p*d,s)); const avgPayout=payouts.reduce((a,b)=>a+b,0)/nCombos; return {nCombos,totalStake:f(totalStake),avgPayout:f(avgPayout),minPayout:f(Math.min(...payouts)),maxPayout:f(Math.max(...payouts)),ev:f((avgPayout-s)/s*100,1)}; };
const bestOdds = (entries) => entries.reduce((b,e)=>toD(e)>toD(b)?e:b, entries[0]||'0');
const calcParlay = (oddsArr, stake) => { const odds=oddsArr.map(toD).filter(d=>d>1); if(odds.length<2||!stake) return null; const combined=odds.reduce((p,d)=>p*d,1); const s=parseFloat(stake); const payout=s*combined; const prob=odds.reduce((p,d)=>p*(1/d),1); const ev=(prob*(combined-1)*s)-((1-prob)*s); return {combined:f(combined,3),combA:toA(combined),payout:f(payout),profit:f(payout-s),prob:f(prob*100,2),ev:f(ev,2),ok:ev>0,impSum:f(odds.reduce((s2,d)=>s2+1/d,0)*100,1)}; };
const calcSGP = (oddsArr, sgpOdds, stake) => { const odds=oddsArr.map(toD).filter(d=>d>1); if(odds.length<2) return null; const s=parseFloat(stake)||100; const indCombined=odds.reduce((p,d)=>p*d,1); const sgpD=toD(sgpOdds); if(sgpD<=1) return null; const prob=odds.reduce((p,d)=>p*(1/d),1); const discount=(1-sgpD/indCombined)*100; const ev=(prob*(sgpD-1)*s)-((1-prob)*s); return {indOdds:toA(indCombined),indD:f(indCombined,3),sgpD:f(sgpD,3),discount:f(discount,1),ev:f(ev,2),prob:f(prob*100,2),ok:ev>0,fair:f((indCombined-1)*s+s)}; };
const calcHold = (o1, o2) => { const d1=toD(o1),d2=toD(o2); if(d1<=1||d2<=1) return null; const ip1=1/d1,ip2=1/d2,hold=(ip1+ip2-1)*100; return {hold:f(hold,2),ip1:f(ip1*100,1),ip2:f(ip2*100,1),ok:hold<5}; };

// BOOKS imported from ./books.js — edit affiliate links there

// ═══ COLORS ═══
const K = { bg:"#0a0e17", s1:"#0f1520", s2:"#161d2a", s3:"#1c2536", bd:"#1e293b", bd2:"#334155", ac:"#60a5fa", gn:"#4ade80", rd:"#f87171", yl:"#fbbf24", pp:"#c084fc", tx:"#e2e8f0", dm:"#94a3b8", mt:"#64748b", wh:"#ffffff" };

// Storage helpers are now in src/sync.js (cloud-backed)

// ═══ STYLES ═══
const font = "'JetBrains Mono','SF Mono','Fira Code',monospace";
const fontD = "'Space Grotesk','SF Pro Display',sans-serif";
const S = {
  card: { background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 10, padding: 20, marginBottom: 16 },
  label: { display:"block", fontSize:10, color:K.mt, marginBottom:4, textTransform:"uppercase", letterSpacing:"1.5px", fontWeight:600 },
  input: { width:"100%", padding:"8px 10px", background:K.s2, border:`1px solid ${K.bd2}`, borderRadius:6, color:K.tx, fontFamily:font, fontSize:13, outline:"none", boxSizing:"border-box" },
  row: { display:"flex", gap:12, flexWrap:"wrap", marginBottom:12 },
  col: { flex:1, minWidth:120 },
  res: (ok) => ({ background: ok ? `${K.gn}08` : `${K.rd}08`, border:`1px solid ${ok?K.gn:K.rd}25`, borderRadius:8, padding:16, marginTop:12 }),
  big: (c) => ({ fontSize:28, fontWeight:700, color:c||K.gn, fontFamily:fontD, lineHeight:1 }),
  tag: (c) => ({ display:"inline-block", padding:"2px 8px", borderRadius:50, fontSize:10, fontWeight:600, background:`${c}15`, color:c }),
  rr: { display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${K.bd}` },
  note: (c) => ({ marginTop:10, padding:10, background:`${c||K.yl}0d`, borderRadius:6, fontSize:12, color:c||K.yl, lineHeight:1.6 }),
  help: { fontSize:12, lineHeight:1.7, color:K.dm, marginTop:12 },
  helpH: { fontSize:14, fontWeight:600, color:K.tx, margin:"16px 0 6px", fontFamily:fontD },
  helpTerm: { color:K.ac, fontWeight:600 },
  meter: (pct, c) => (<div style={{marginTop:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:10,color:K.mt}}>QUALITY</span><span style={{fontSize:10,color:c,fontWeight:600}}>{pct>=70?"EXCELLENT":pct>=60?"GOOD":pct>=50?"FAIR":"POOR"} ({pct}%)</span></div><div style={{height:4,borderRadius:2,background:K.s3}}><div style={{height:4,borderRadius:2,background:c,width:`${Math.min(100,pct)}%`,transition:"width 0.4s"}}/></div></div>),
};

// ═══ TOAST SYSTEM ═══
const ToastCtx = React.createContext(null);
const useToast = () => React.useContext(ToastCtx);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});
  const dismiss = (id) => {
    clearTimeout(timers.current[id]);
    setToasts(t => t.filter(x => x.id !== id));
  };
  // show(msg, color?, action?)  action = { label, fn }
  const show = (msg, color, action) => {
    const id = Date.now();
    const duration = action ? 4000 : 2200;
    setToasts(t => [...t, { id, msg, color: color || '#4ade80', action }]);
    timers.current[id] = setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
    return id;
  };
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: '10px 16px', background: '#0f1520', border: `1px solid ${t.color}40`, borderRadius: 8, color: t.color, fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono','SF Mono',monospace", boxShadow: '0 4px 16px rgba(0,0,0,0.4)', animation: 'fadeIn 0.15s ease', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{t.msg}</span>
            {t.action && <button onClick={() => { t.action.fn(); dismiss(t.id); }} style={{ padding: '2px 8px', background: `${t.color}25`, border: `1px solid ${t.color}60`, borderRadius: 4, color: t.color, fontSize: 10, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: '0.5px' }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </ToastCtx.Provider>
  );
};

// ═══ COMPACT MODE CONTEXT ═══
const CompactCtx = React.createContext(false);

// ═══ APP DATA CONTEXT (shared across Track components — one loadData call) ═══
const AppDataCtx = React.createContext(null);

// ═══ CALC MEMORY HOOK ═══
const useCalcMemory = (slug, defaults) => {
  const key = `pg_calc_${slug}`;
  const stored = (() => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } })();
  // Read URL params that match default keys (for shared links)
  const urlParams = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const out = {};
      Object.keys(defaults).forEach(k => { if (p.has(k)) out[k] = p.get(k); });
      return out;
    } catch { return {}; }
  })();
  const merged = { ...defaults, ...stored, ...urlParams };
  const [vals, setVals] = useState(merged);
  const set = (k, v) => {
    setVals(prev => {
      const next = { ...prev, [k]: v };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [vals, set];
};

// ═══ UI ATOMS ═══
const In = ({l,v,set,ph,pre,err}) => {
  const isOdds = l && /odds/i.test(l);
  const oddsErr = isOdds && v && v.trim() && toD(v) <= 1 ? 'Invalid odds' : null;
  const displayErr = err || oddsErr;
  return (<div style={S.col}><label style={S.label}>{l}</label><div style={{position:"relative"}}>{pre&&<span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:K.mt,fontSize:12}}>{pre}</span>}<input style={{...S.input,...(pre?{paddingLeft:22}:{}),...(displayErr?{borderColor:K.rd}:{})}} value={v} onChange={e=>set(e.target.value)} placeholder={ph}/>{displayErr&&<div style={{fontSize:10,color:K.rd,marginTop:2}}>{displayErr}</div>}</div></div>);
};
const RR = ({l,v,c,b}) => (<div style={S.rr}><span style={{fontSize:12,color:K.dm}}>{l}</span><span style={{fontSize:13,fontWeight:b?700:500,color:c||K.tx}}>{v}</span></div>);
const Tl = ({t,badge,bc,shareable,getParams}) => {
  const [copied,setCopied]=useState(false);
  const copy=()=>{
    let url = window.location.href.split('?')[0];
    if (getParams) {
      try {
        const p = new URLSearchParams(getParams());
        url = url + '?' + p.toString();
      } catch(e) {}
    }
    try{navigator.clipboard.writeText(url);}catch(e){}
    setCopied(true); setTimeout(()=>setCopied(false),1500);
  };
  return (<div style={{fontSize:16,fontWeight:600,color:K.tx,marginBottom:14,display:"flex",alignItems:"center",gap:8,fontFamily:fontD,flexWrap:"wrap"}}>
    <span>{t}</span>
    {badge&&<span style={{...S.tag(bc||K.ac)}}>{badge}</span>}
    {shareable&&<button onClick={copy} style={{marginLeft:"auto",padding:"2px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:copied?K.gn:K.mt,fontSize:9,cursor:"pointer",fontFamily:font,letterSpacing:"1px",whiteSpace:"nowrap"}}>{copied?"✓ COPIED":"⎘ SHARE"}</button>}
  </div>);
};
const Nt = ({children,c}) => (<div style={S.note(c)}>{children}</div>);

// ═══ BOOK CTA (shown at profitable calc results) ═══
const BookCTA = () => (
  <div style={{marginTop:14,padding:12,background:`${K.gn}06`,border:`1px solid ${K.gn}20`,borderRadius:8}}>
    <div style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:8}}>Don't have these books yet? Open accounts to use this promo:</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {BOOKS.slice(0,4).map(b=>(
        <a key={b.name} href={b.link} target="_blank" rel="noopener noreferrer"
          style={{padding:"4px 10px",background:`${b.color}15`,border:`1px solid ${b.color}30`,borderRadius:4,color:b.color,fontSize:10,fontWeight:600,textDecoration:"none",fontFamily:font}}>
          {b.name} →
        </a>
      ))}
      <a href={BOOKS[4]?.link||"#"} target="_blank" rel="noopener noreferrer"
        style={{padding:"4px 10px",background:`${K.bd}`,border:`1px solid ${K.bd2}`,borderRadius:4,color:K.dm,fontSize:10,fontWeight:600,textDecoration:"none",fontFamily:font}}>
        +{BOOKS.length-4} more →
      </a>
    </div>
  </div>
);

// ═══ INLINE HELP COMPONENT ═══
const Help = ({entries}) => {
  const compact = React.useContext(CompactCtx);
  if(compact) return null;
  return (<div style={{...S.card,background:K.s2,borderColor:K.bd,marginTop:12}}><div style={{fontSize:12,fontWeight:600,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>How This Works</div><div style={S.help}>{entries.map((e,i)=><div key={i} style={{marginBottom:10}}><span style={S.helpTerm}>{e[0]}:</span> {e[1]}</div>)}</div></div>);
};

// ═══════════════════════════════════════════
// TOOL COMPONENTS
// ═══════════════════════════════════════════

const BonusBet = () => {
  const [mem, setMem] = useCalcMemory('bonus-bet', {sz:"200",bo:"+300",ho:"-350"});
  const {sz,bo,ho} = mem;
  const setSz = v => setMem('sz',v), setBo = v => setMem('bo',v), setHo = v => setMem('ho',v);
  const r = useMemo(()=>calcBonus(parseFloat(sz),bo,ho),[sz,bo,ho]);
  return (<div><div style={S.card}><Tl t="Bonus Bet Converter" badge="STAKE NOT RETURNED" bc={K.gn} shareable getParams={()=>({sz,bo,ho})}/>
    <div style={S.row}><In l="Bonus Bet Size" v={sz} set={setSz} pre="$" ph="200"/><In l="Bonus Bet Odds" v={bo} set={setBo} ph="+300"/><In l="Hedge Odds" v={ho} set={setHo} ph="-350"/></div>
    <div style={{marginBottom:10,display:"flex",gap:8,alignItems:"center"}}>
      <button onClick={()=>{setSz("200");setBo("+350");setHo("-400");}} style={{padding:"4px 10px",background:`${K.ac}10`,border:`1px solid ${K.ac}30`,borderRadius:4,color:K.ac,fontSize:10,cursor:"pointer",fontFamily:font,letterSpacing:"0.5px"}}>★ Show Example</button>
      <span style={{fontSize:10,color:K.mt}}>$200 bonus bet at +350, hedge at -400 — DraftKings → FanDuel</span>
    </div>
    {bo&&toD(bo)>1&&(()=>{
      const a=toD(bo)>1?Math.round((toD(bo)-1)*100):0;
      const zones=[{min:0,max:199,c:K.rd,l:"Too Low"},{min:200,max:249,c:K.yl,l:"OK"},{min:250,max:400,c:K.gn,l:"Sweet Spot"},{min:401,max:500,c:K.yl,l:"Harder to Hedge"},{min:501,max:9999,c:K.rd,l:"Too High"}];
      const zone=zones.find(z=>a>=z.min&&a<=z.max)||zones[4];
      const pct=Math.min(100,Math.max(0,(a-0)/(700)*100));
      return (<div style={{marginBottom:12,padding:"10px 12px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`}}>
        <div style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:6}}>Bonus Bet Odds Sweet Spot</div>
        <div style={{position:"relative",height:8,background:K.s3,borderRadius:4,marginBottom:4}}>
          <div style={{position:"absolute",left:0,width:"29%",height:"100%",background:`${K.rd}40`,borderRadius:"4px 0 0 4px"}}/>
          <div style={{position:"absolute",left:"29%",width:"7%",height:"100%",background:`${K.yl}40`}}/>
          <div style={{position:"absolute",left:"36%",width:"22%",height:"100%",background:`${K.gn}40`}}/>
          <div style={{position:"absolute",left:"58%",width:"14%",height:"100%",background:`${K.yl}40`}}/>
          <div style={{position:"absolute",left:"72%",width:"28%",height:"100%",background:`${K.rd}40`,borderRadius:"0 4px 4px 0"}}/>
          <div style={{position:"absolute",left:`calc(${pct}% - 3px)`,top:-2,width:6,height:12,background:zone.c,borderRadius:2,border:`1px solid ${zone.c}`}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:K.mt}}>
          <span>+100</span><span style={{color:K.gn,fontWeight:600}}>+250–+400 ideal</span><span>+700</span>
        </div>
        <div style={{fontSize:10,color:zone.c,fontWeight:600,marginTop:4}}>{toA(toD(bo))} — {zone.l}</div>
      </div>);
    })()}
    {r&&<div style={S.res(parseFloat(r.g)>0)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(parseFloat(r.g)>0?K.gn:K.rd)}>${r.g}</span><span style={{fontSize:12,color:K.dm}}>guaranteed profit</span></div>
      <RR l="Hedge Bet Amount (real cash)" v={`$${r.hs}`} c={K.ac} b/><RR l="If Bonus Bet Wins" v={`+$${r.pBW}`} c={K.gn}/><RR l="If Hedge Bet Wins" v={`+$${r.pHW}`} c={K.gn}/><RR l="Conversion Rate" v={`${r.r}%`} c={parseFloat(r.r)>=70?K.gn:K.yl} b/>
      {S.meter(parseFloat(r.r),parseFloat(r.r)>=70?K.gn:parseFloat(r.r)>=50?K.yl:K.rd)}
      <BookCTA/></div>}
  </div>
  <Help entries={[
    ["Bonus Bet","A free bet credit given by a sportsbook. If it wins, you only get the PROFIT — the original bonus amount is NOT returned. For example, a $200 bonus bet at +300 odds that wins pays you $600 in profit, but the $200 credit disappears."],
    ["Underdog / Favorite","The underdog is the team expected to lose (shown with + odds like +300). The favorite is expected to win (shown with - odds like -350). For conversions, you always place your bonus on the underdog and hedge with cash on the favorite."],
    ["Hedge","A second bet on the opposite outcome at a DIFFERENT sportsbook. By betting both sides, you guarantee profit regardless of who wins."],
    ["Conversion Rate","The percentage of the bonus you extract as real cash. 70%+ is considered excellent — meaning a $200 bonus bet becomes $140+ in your pocket. The wider the odds gap, the better the conversion."],
    ["Why +250 to +400 odds?","Higher + odds on the bonus side means more potential profit to hedge against. Below +200, conversion rates drop below 60%. Above +500, finding close hedge lines becomes harder."],
    ["Step-by-Step","1) Get your bonus bets from a sportsbook promo. 2) Find a game with an underdog at +250 to +400. 3) Place your bonus bet on the underdog at Book A. 4) Use this calculator to find the hedge amount. 5) Place a CASH bet for that amount on the favorite at Book B. 6) No matter who wins, you profit."],
  ]}/></div>);
};

const ProfitBoost = () => {
  const [mem, setMem] = useCalcMemory('profit-boost', {s:"50",o:"+200",bp:"50",mx:"250",ho:"-220"});
  const {s,o,bp,mx,ho} = mem;
  const setS=v=>setMem('s',v),setO=v=>setMem('o',v),setBp=v=>setMem('bp',v),setMx=v=>setMem('mx',v),setHo=v=>setMem('ho',v);
  const r = useMemo(()=>calcBoost(parseFloat(s),o,parseFloat(bp),mx,ho),[s,o,bp,mx,ho]);
  return (<div><div style={S.card}><Tl t="Profit Boost Converter" badge="DAILY RECURRING $$$" bc={K.yl} shareable getParams={()=>({s,o,bp,mx,ho})}/>
    <div style={S.row}><In l="Your Stake (cash)" v={s} set={setS} pre="$" ph="50"/><In l="Original Odds" v={o} set={setO} ph="+200"/><In l="Boost Percentage" v={bp} set={setBp} ph="50"/></div>
    <div style={S.row}><In l="Max Extra Winnings" v={mx} set={setMx} pre="$" ph="250"/><In l="Hedge Odds (other book)" v={ho} set={setHo} ph="-220"/></div>
    <div style={{marginBottom:10,display:"flex",gap:8,alignItems:"center"}}>
      <button onClick={()=>{setS("50");setO("+200");setBp("50");setMx("25");setHo("-220");}} style={{padding:"4px 10px",background:`${K.ac}10`,border:`1px solid ${K.ac}30`,borderRadius:4,color:K.ac,fontSize:10,cursor:"pointer",fontFamily:font}}>★ Show Example</button>
      <span style={{fontSize:10,color:K.mt}}>$50 stake, 50% boost capped at $25, hedge at -220</span>
    </div>
    {r&&<div style={S.res(parseFloat(r.g)>0)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(parseFloat(r.g)>0?K.gn:K.rd)}>${r.g}</span><span style={{fontSize:12,color:K.dm}}>guaranteed profit</span></div>
      <RR l="Effective Boosted Odds" v={`${r.eo} (${r.ed2} decimal)`} c={K.pp} b/><RR l="Boost Value Added" v={`+$${r.bv}`} c={K.yl}/><RR l="Total Boosted Payout (if win)" v={`$${r.tp}`}/><RR l="Hedge Amount (real cash)" v={`$${r.hs}`} c={K.ac} b/><RR l="If Boosted Bet Wins" v={`+$${r.pBW}`} c={K.gn}/><RR l="If Hedge Wins" v={`+$${r.pHW}`} c={K.gn}/>
      <Nt c={K.yl}>This is your long-term money machine. Sportsbooks offer 2-5 boosts daily. At $5-$15 profit per boost × 30 days = $300-$1,000/month recurring.</Nt>
      <BookCTA/></div>}
  </div>
  <Help entries={[
    ["Profit Boost","A sportsbook promo that adds a percentage to your winnings IF your bet wins. A 50% profit boost on a bet that would win $100 now wins $150 instead. Unlike bonus bets, you're using your OWN money — the boost just sweetens the payout."],
    ["How the math works","The boost changes your 'effective odds' — the real payout you'd get. We calculate those effective odds, then figure out the exact hedge amount at another book that locks in profit regardless of outcome."],
    ["Max Extra Winnings","Most boosts have a cap. A '50% boost, max $250 extra' means even if your normal winnings would be $600, the boost only adds up to $250. Always enter this cap — it affects the hedge calculation."],
    ["Why this is the big money","Welcome promos are one-time. But profit boosts appear DAILY. DraftKings alone offers 2-3 per day. Across 5-6 sportsbook apps, you can find 5-10 boosts daily. Even at $5 per conversion, that's $150-$300/month from one activity."],
    ["Step-by-Step","1) Check your sportsbook apps each morning for profit boosts. 2) Find the boost, note the odds, percentage, and max extra winnings. 3) Find the opposing line at another book. 4) Enter everything here. 5) Place the boosted bet at Book A. 6) Place the hedge at Book B for the calculated amount. 7) Profit either way."],
  ]}/></div>);
};

const FirstBet = () => {
  const [mem,setMem]=useCalcMemory('first-bet',{s:"500",o:"+150",ho:"-170"});
  const {s,o,ho}=mem;
  const setS=v=>setMem('s',v),setO=v=>setMem('o',v),setHo=v=>setMem('ho',v);
  const r = useMemo(()=>calcFirst(parseFloat(s),o,ho),[s,o,ho]);
  return (<div><div style={S.card}><Tl t="First Bet Safety Net Hedge" badge="CASH BET" bc={K.ac} shareable getParams={()=>({s,o,ho})}/>
    <div style={S.row}><In l="First Bet Stake" v={s} set={setS} pre="$"/><In l="Your Odds" v={o} set={setO}/><In l="Hedge Odds" v={ho} set={setHo}/></div>
    <div style={{marginBottom:10,display:"flex",gap:8,alignItems:"center"}}>
      <button onClick={()=>{setS("1000");setO("+120");setHo("-140");}} style={{padding:"4px 10px",background:`${K.ac}10`,border:`1px solid ${K.ac}30`,borderRadius:4,color:K.ac,fontSize:10,cursor:"pointer",fontFamily:font}}>★ Show Example</button>
      <span style={{fontSize:10,color:K.mt}}>$1,000 BetMGM safety net at +120, hedge at -140</span>
    </div>
    {r&&<div style={S.res(true)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.ac)}>${r.g}</span><span style={{fontSize:12,color:K.dm}}>from hedge math</span></div>
      <RR l="Hedge Amount" v={`$${r.hs}`} c={K.ac} b/><RR l="If Original Wins" v={`$${r.pOW}`} c={parseFloat(r.pOW)>=0?K.gn:K.rd}/><RR l="If Hedge Wins" v={`$${r.pHW}`} c={parseFloat(r.pHW)>=0?K.gn:K.rd}/>
      <Nt c={K.yl}>If your first bet LOSES → you get ${s} in bonus bets. Convert those at ~70% using the Bonus Bet tab = ~${f(parseFloat(s)*0.7,0)} more profit!</Nt>
      <BookCTA/></div>}
  </div>
  <Help entries={[
    ["Safety Net Promo","Books like BetMGM ($1,500), bet365 ($1,000), and BetRivers ($500) refund your first bet as bonus bets if it loses. This is different from a bonus bet — you're wagering your own real cash."],
    ["The Strategy","Place your first bet at Book A. Immediately hedge at Book B. If your bet wins: you profit from the hedge math. If it loses: you get bonus bets back, which you convert using the Bonus Bet Converter tab. Either outcome is profitable."],
    ["Why hedge immediately?","If you don't hedge, you're just gambling. The hedge locks in a small profit from the math, and MORE IMPORTANTLY, it means when you lose (and get the bonus bets), those bonus bets are pure profit to convert — you haven't actually lost anything."],
  ]}/></div>);
};

const NoVig = () => {
  const [mem,setMem]=useCalcMemory('no-vig',{o1:"-110",o2:"-110"});
  const {o1,o2}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v);
  const r = useMemo(()=>calcNV(o1,o2),[o1,o2]);
  return (<div><div style={S.card}><Tl t="No-Vig Fair Odds Calculator" badge="DEVIG" bc={K.pp} shareable/>
    <div style={S.row}><In l="Side 1 Odds" v={o1} set={setO1} ph="-110"/><In l="Side 2 Odds" v={o2} set={setO2} ph="-110"/></div>
    {r&&<div style={S.res(true)}><RR l="Sportsbook Vig (Juice)" v={`${r.v}%`} c={K.rd} b/>
      <div style={{marginTop:8,marginBottom:2,fontSize:10,color:K.mt}}>SIDE 1</div>
      <RR l="Implied Probability (with vig)" v={`${r.ip1}%`} c={K.dm}/><RR l="True Probability (no vig)" v={`${r.fp1}%`} c={K.gn}/><RR l="Fair Odds" v={r.fo1} c={K.pp} b/>
      <div style={{marginTop:8,marginBottom:2,fontSize:10,color:K.mt}}>SIDE 2</div>
      <RR l="Implied Probability (with vig)" v={`${r.ip2}%`} c={K.dm}/><RR l="True Probability (no vig)" v={`${r.fp2}%`} c={K.gn}/><RR l="Fair Odds" v={r.fo2} c={K.pp} b/>
      <Nt c={K.ac}>If any sportsbook offers BETTER than these fair odds on either side, that bet has positive expected value (+EV).</Nt></div>}
  </div>
  <Help entries={[
    ["Vig (Vigorish) / Juice","The sportsbook's built-in profit margin. It's why both sides of a coin flip aren't +100 — they're typically -110 each. That gap is the vig. Standard vig is about 4.5% (called 'the juice'). The book keeps this regardless of who wins."],
    ["Why -110/-110 doesn't add to 100%","At -110 odds, each side has an implied probability of 52.4%. That's 104.8% total — the extra 4.8% is the vig. The true probability of each side is 50/50, but the book charges you extra for the privilege of betting."],
    ["No-Vig / Fair Odds","What the odds WOULD be if the sportsbook took zero profit. These represent the 'true' probability of each outcome based on market consensus. If you can bet at odds BETTER than the fair odds, you have an edge."],
    ["How to use this","Enter odds from a sharp sportsbook (one known for accurate lines — Pinnacle, Circa, or the average of several major books). The fair odds become your benchmark. Then check other books — if any offer better odds than the fair line, use the +EV calculator."],
  ]}/></div>);
};

const NoVig3Way = () => {
  const [mem,setMem]=useCalcMemory('no-vig-3way',{o1:"+220",o2:"+250",o3:"+300"});
  const {o1,o2,o3}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v),setO3=v=>setMem('o3',v);
  const r = useMemo(()=>calcNV3(o1,o2,o3),[o1,o2,o3]);
  return (<div><div style={S.card}><Tl t="3-Way No-Vig Calculator" badge="SOCCER / HOCKEY" bc={K.pp} shareable/>
    <div style={S.row}><In l="Home Win Odds" v={o1} set={setO1} ph="+220"/><In l="Draw Odds" v={o2} set={setO2} ph="+250"/><In l="Away Win Odds" v={o3} set={setO3} ph="+300"/></div>
    {r&&<div style={S.res(true)}>
      <RR l="Total Vig (Juice)" v={`${r.v}%`} c={K.rd} b/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginTop:12}}>
        {[["Home Win",r.ip1,r.fp1,r.fo1],[" Draw",r.ip2,r.fp2,r.fo2],["Away Win",r.ip3,r.fp3,r.fo3]].map(([label,ip,fp,fo])=>(
          <div key={label} style={{padding:"10px",background:K.s3,borderRadius:6}}>
            <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",marginBottom:6}}>{label}</div>
            <div style={{fontSize:16,fontWeight:700,color:K.pp,marginBottom:4}}>{fo}</div>
            <div style={{fontSize:10,color:K.gn}}>True: {fp}%</div>
            <div style={{fontSize:10,color:K.mt}}>Book: {ip}%</div>
          </div>
        ))}
      </div>
      <Nt c={K.ac}>These are the fair odds with zero vig. If any book offers BETTER than these fair odds on any outcome, that bet is +EV.</Nt>
    </div>}
  </div>
  <Help entries={[
    ["3-Way Markets","Soccer and hockey regulation time have 3 outcomes: Home Win, Draw, Away Win. Standard No-Vig only handles 2-way markets — this version correctly removes vig from all three simultaneously."],
    ["How to use","Enter the lines from a sharp sportsbook (Pinnacle, Circa, or average of 5+ major books). The fair odds become your benchmark. Check other books for better prices."],
    ["Draw pricing","The draw is typically the hardest outcome to price accurately, creating the most +EV opportunities in 3-way markets. Sharp bettors pay particular attention to draw pricing."],
  ]}/></div>);
};

const PlusEV = () => {
  const [mem,setMem]=useCalcMemory('ev',{yo:"+120",fo:"+105",s:"100"});
  const {yo,fo,s}=mem;
  const setYo=v=>setMem('yo',v),setFo=v=>setMem('fo',v),setS=v=>setMem('s',v);
  const r = useMemo(()=>calcEV(yo,fo,parseFloat(s)),[yo,fo,s]);
  return (<div><div style={S.card}><Tl t="Expected Value Calculator" badge="+EV" bc={K.gn} shareable/>
    <div style={S.row}><In l="Sportsbook's Odds" v={yo} set={setYo} ph="+120"/><In l="Fair (No-Vig) Odds" v={fo} set={setFo} ph="+105"/><In l="Bet Size" v={s} set={setS} pre="$"/></div>
    {r&&<div style={S.res(r.ok)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?"+":""}${r.ev}</span><span style={{fontSize:12,color:K.dm}}>expected value per bet</span></div>
      <RR l="ROI per bet" v={`${r.roi}%`} c={r.ok?K.gn:K.rd} b/><RR l="True Win Probability" v={`${r.fp}%`}/><RR l="Your Edge" v={`${r.edge}%`} c={r.ok?K.gn:K.rd}/>
      <Nt c={r.ok?K.gn:K.rd}>{r.ok?"This bet is +EV. Over hundreds of bets at this edge, you WILL profit mathematically — individual bets can still lose.":"This bet is -EV. The sportsbook has the edge. Skip it."}</Nt></div>}
  </div>
  <Help entries={[
    ["Expected Value (EV)","The average profit or loss per bet if you made this exact bet thousands of times. +EV means profitable long-term. -EV means the house wins long-term. It's the single most important concept in profitable betting."],
    ["Example","Fair odds say a team has a 50% chance to win (fair odds: +100). A sportsbook offers +120 on that team. You're getting paid $120 for a $100 bet on something that's actually a coin flip. Over 100 such bets, you'd expect to win 50 of them at +120 = $6,000 in winnings, while losing 50 × $100 = $5,000. Net: +$1,000. That's +EV."],
    ["This is NOT guaranteed per bet","A +EV bet can absolutely lose TODAY. It's like a casino — the house has an edge, but sometimes the player wins. You're the house now, and your edge plays out over VOLUME. You need 100+ bets for the math to smooth out."],
    ["Where to get Fair Odds","Use the No-Vig calculator with odds from a sharp book, or use the market consensus (average of 5+ major books with the vig removed)."],
  ]}/></div>);
};

const Arb2Way = () => {
  const [mem,setMem]=useCalcMemory('arb-2way',{o1:"+110",o2:"+105",t:"500"});
  const {o1,o2,t}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v),setT=v=>setMem('t',v);
  const r = useMemo(()=>calcArb2(o1,o2,parseFloat(t)),[o1,o2,t]);
  return (<div><div style={S.card}><Tl t="2-Way Arbitrage" badge="SUREBET" bc={K.pp} shareable/>
    <div style={S.row}><In l="Outcome 1 (Book A)" v={o1} set={setO1}/><In l="Outcome 2 (Book B)" v={o2} set={setO2}/><In l="Total Stake" v={t} set={setT} pre="$"/></div>
    {r&&<div style={S.res(r.ok)}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?`ARB: +$${r.pr}`:"NO ARB"}</span>
      {r.ok&&<><RR l="Stake Side 1" v={`$${r.s1}`} c={K.ac} b/><RR l="Stake Side 2" v={`$${r.s2}`} c={K.ac} b/><RR l="ROI" v={`${r.roi}%`} c={K.gn}/></>}
      {!r.ok&&<Nt c={K.rd}>No arb exists. Both sides need + odds at different books. Typical arb margins are 1-5%. Use OddsJam or BetBurger to scan automatically.</Nt>}</div>}
  </div>
  <Help entries={[
    ["Arbitrage","Betting both sides of the same event at different sportsbooks where the combined odds guarantee a profit. It works because different books set different odds. When the gap is big enough, you can bet both sides and win no matter what."],
    ["How to spot one","You need both sides to be + odds (or the implied probabilities to add up to LESS than 100%). Example: Book A has Team 1 at +110, Book B has Team 2 at +105. Each side implies ~48.8% and ~48.8% = 97.6% total. The missing 2.4% is your profit."],
    ["Why it's rare","Books monitor each other and adjust quickly. Arb opportunities last seconds to minutes. That's why people use scanning tools — humans can't check fast enough."],
  ]}/></div>);
};

const Arb3Way = () => {
  const [mem,setMem]=useCalcMemory('arb-3way',{o1:"+180",o2:"+250",o3:"+320",t:"500"});
  const {o1,o2,o3,t}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v),setO3=v=>setMem('o3',v),setT=v=>setMem('t',v);
  const r = useMemo(()=>calcArb3(o1,o2,o3,parseFloat(t)),[o1,o2,o3,t]);
  return (<div><div style={S.card}><Tl t="3-Way Arbitrage" badge="SOCCER / HOCKEY" bc={K.pp} shareable/>
    <div style={S.row}><In l="Home Win (Book A)" v={o1} set={setO1}/><In l="Draw (Book B)" v={o2} set={setO2}/><In l="Away Win (Book C)" v={o3} set={setO3}/><In l="Total Stake" v={t} set={setT} pre="$"/></div>
    {r&&<div style={S.res(r.ok)}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?`ARB: +$${r.pr}`:"NO ARB"}</span>
      {r.ok&&<><RR l="Stake Home" v={`$${r.s1}`} c={K.ac} b/><RR l="Stake Draw" v={`$${r.s2}`} c={K.ac} b/><RR l="Stake Away" v={`$${r.s3}`} c={K.ac} b/><RR l="ROI" v={`${r.roi}%`} c={K.gn}/></>}</div>}
  </div>
  <Help entries={[
    ["3-Way Markets","Soccer and hockey (regulation time) have three possible outcomes: Home Win, Draw, Away Win. With three outcomes across multiple books, pricing inefficiencies are MORE common than 2-way markets because it's harder for books to price all three perfectly."],
    ["You need 3 sportsbooks","Each outcome should be at a different book for the best odds. Same-book arbs are essentially impossible due to correlated odds."],
  ]}/></div>);
};

const ParlayHedge = () => {
  const [mem,setMem]=useCalcMemory('parlay-hedge',{pp:"2500",ho:"+150",os:"25"});
  const {pp,ho,os}=mem;
  const setPp=v=>setMem('pp',v),setHo=v=>setMem('ho',v),setOs=v=>setMem('os',v);
  const r = useMemo(()=>calcPH(parseFloat(pp),ho,parseFloat(os)),[pp,ho,os]);
  return (<div><div style={S.card}><Tl t="Parlay Hedge" badge="LAST LEG" bc={K.yl} shareable/>
    <div style={S.row}><In l="Parlay Potential Payout" v={pp} set={setPp} pre="$"/><In l="Final Leg Opposing Odds" v={ho} set={setHo}/><In l="Original Parlay Stake" v={os} set={setOs} pre="$"/></div>
    {r&&<div style={S.res(true)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.gn)}>${r.g}</span><span style={{fontSize:12,color:K.dm}}>guaranteed minimum</span></div>
      <RR l="Hedge Amount" v={`$${r.hs}`} c={K.ac} b/><RR l="If Parlay Hits" v={`+$${r.pPW}`} c={K.gn}/><RR l="If Hedge Wins" v={`+$${r.pHW}`} c={K.gn}/></div>}
  </div>
  <Help entries={[
    ["Parlay","A bet combining multiple games where ALL must win for the bet to pay out. High risk, high reward. A 6-leg parlay at +9000 turns $25 into $2,500 — but all 6 must hit."],
    ["The Last Leg Situation","You hit 5 of 6 legs. Your parlay now depends on one final game. Instead of sweating it, hedge the other side of that game at another book. You lock in profit regardless."],
    ["Potential Payout","This is the TOTAL amount you'd receive if the parlay hits (check your bet slip). Not the profit — the full payout including your original stake."],
  ]}/></div>);
};

const MiddleBet = () => {
  const [mem,setMem]=useCalcMemory('middle',{o1:"-110",o2:"-110",l1:"220.5",l2:"200.5",s:"100"});
  const {o1,o2,l1,l2,s}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v),setL1=v=>setMem('l1',v),setL2=v=>setMem('l2',v),setS=v=>setMem('s',v);
  const r = useMemo(()=>calcMid(o1,o2,l1,l2,parseFloat(s)),[o1,o2,l1,l2,s]);
  return (<div><div style={S.card}><Tl t="Middle Bet Calculator" badge="MIDDLE" bc={K.ac} shareable/>
    <div style={S.row}><In l="Under Odds (Book A)" v={o1} set={setO1}/><In l="Line 1 (Under)" v={l1} set={setL1}/><In l="Over Odds (Book B)" v={o2} set={setO2}/><In l="Line 2 (Over)" v={l2} set={setL2}/></div>
    <div style={S.row}><In l="Stake (Side 1)" v={s} set={setS} pre="$"/></div>
    {r&&<div style={S.res(true)}><RR l="Side 2 Stake" v={`$${r.s2}`} c={K.ac} b/><RR l="Total Risked" v={`$${r.ts}`}/><RR l="Worst Case" v={`$${r.wc}`} c={parseFloat(r.wc)>=0?K.gn:K.rd}/><RR l="Middle Width" v={`${r.w} points`} c={K.pp}/><RR l="If Middle Hits (BOTH WIN)" v={`+$${r.mw}`} c={K.gn} b/></div>}
  </div>
  <Help entries={[
    ["Middle Bet","When two sportsbooks have DIFFERENT lines on the same game, you can bet opposite sides and potentially win BOTH if the result lands in the 'middle'. Example: Book A has passing yards Under 220.5, Book B has Over 200.5. If the player throws 210 yards, both bets win."],
    ["The Risk","If the result falls outside the middle, one side wins and one loses. With -110 juice, you'll lose about $5-$10 on a $100 stake. The middle itself might pay $180+. It's a risk/reward calculation."],
    ["Best for","Player props where books disagree by 5+ points. Total points/goals where books have 3+ point gaps. The wider the middle, the more likely it hits."],
  ]}/></div>);
};

const OddsConvert = () => {
  const [mem,setMem]=useCalcMemory('odds-convert',{v:"-110",mode:"american"});
  const {v,mode}=mem;
  const setV=x=>setMem('v',x),setMode=x=>setMem('mode',x);
  const dec = mode==="american"?toD(v):mode==="decimal"?parseFloat(v):(()=>{const[n,d]=v.split("/").map(Number);return d?n/d+1:0;})();
  return (<div><div style={S.card}><Tl t="Odds Format Converter" badge="UTILITY" bc={K.dm} shareable/>
    <div style={S.row}><div style={S.col}><label style={S.label}>Input Format</label><select style={S.input} value={mode} onChange={e=>setMode(e.target.value)}><option value="american">American (+/- odds)</option><option value="decimal">Decimal (e.g. 2.10)</option><option value="fractional">Fractional (e.g. 11/10)</option></select></div><In l="Enter Odds" v={v} set={setV}/></div>
    {dec>0&&<div style={{...S.res(true),display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,textAlign:"center"}}>
      {[["American",toA(dec),K.ac],["Decimal",f(dec,3),K.pp],["Fractional",toF(dec),K.yl],["Implied Prob",f(toP(dec),1)+"%",K.gn]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:10,color:K.mt,marginBottom:4}}>{l}</div><div style={{fontSize:18,fontWeight:700,color:c}}>{v}</div></div>))}
    </div>}
  </div>
  <Help entries={[
    ["American Odds","The US standard. + means underdog: +200 means bet $100 to win $200. - means favorite: -150 means bet $150 to win $100. The number always relates to $100."],
    ["Decimal Odds","Used in Europe/Australia. Your total return per $1 bet. Decimal 3.00 = bet $1, get $3 back ($2 profit + $1 stake). To convert: -150 American = 100/150 + 1 = 1.667 decimal."],
    ["Fractional Odds","Used in UK. Shows profit relative to stake. 5/1 means win $5 for every $1 bet. 1/2 means win $1 for every $2 bet."],
    ["Implied Probability","What the odds suggest about the likelihood of winning. -200 = 66.7% implied probability. +200 = 33.3%. Useful for comparing what a book thinks vs. what you think."],
  ]}/></div>);
};

const RolloverCalc = () => {
  const [mem,setMem]=useCalcMemory('rollover',{b:"500",m:"5",v:"4.5"});
  const {b,m,v}=mem;
  const setB=x=>setMem('b',x),setM=x=>setMem('m',x),setV=x=>setMem('v',x);
  const r = useMemo(()=>calcRO(b,m,v),[b,m,v]);
  return (<div><div style={S.card}><Tl t="Rollover / Playthrough Calculator" badge="DEPOSIT MATCH" bc={K.yl} shareable/>
    <div style={S.row}><In l="Bonus Amount" v={b} set={setB} pre="$"/><In l="Rollover Multiplier" v={m} set={setM} ph="5"/><In l="Average Vig %" v={v} set={setV} ph="4.5"/></div>
    {r&&<div style={S.res(r.ok)}><RR l="Total You Must Wager" v={`$${r.tw}`} b/><RR l="Expected Cost (lost to vig)" v={`-$${r.ec}`} c={K.rd}/><RR l="Net Value of This Bonus" v={`${r.ok?"+":""}$${r.nv}`} c={r.ok?K.gn:K.rd} b/><RR l="Approximate Bets Needed (~$50 avg)" v={r.nb}/>
      <Nt c={r.ok?K.gn:K.rd}>{r.ok?"Worth clearing. The bonus exceeds vig cost.":"Warning: Vig cost exceeds bonus. Lower-vig markets or skip."}</Nt></div>}
  </div>
  <Help entries={[
    ["Rollover / Playthrough","Some deposit match bonuses require you to wager a certain multiple of the bonus before you can withdraw it. A '5x playthrough' on a $500 bonus means you must bet $2,500 total before the bonus becomes real cash."],
    ["Vig Cost","Every bet you place loses a tiny amount to the sportsbook's margin (the vig). At a standard 4.5% vig, betting $2,500 total costs you about $112.50. If the bonus is $500, the net value is $500 - $112.50 = $387.50."],
    ["When to skip","If the rollover multiplier is 10x or higher, or if the vig on the required markets is above 6%, the bonus might not be worth clearing. This calculator tells you the break-even point."],
    ["How to minimize vig cost","Bet on low-vig markets: NFL/NBA spreads and totals at -110/-110 (4.5% vig). Avoid player props (8-12% vig) and parlays (compounded vig). Just bet normally on main markets until the rollover is cleared."],
  ]}/></div>);
};

const DepositMatch = () => {
  const [mem,setMem]=useCalcMemory('deposit-match',{dep:"1000",pct:"20",mx:"200",ro:"5",vg:"4.5"});
  const {dep,pct,mx,ro,vg}=mem;
  const setDep=x=>setMem('dep',x),setPct=x=>setMem('pct',x),setMx=x=>setMem('mx',x),setRo=x=>setMem('ro',x),setVg=x=>setMem('vg',x);
  const r = useMemo(()=>calcDeposit(dep,pct,mx,ro,vg),[dep,pct,mx,ro,vg]);
  return (<div><div style={S.card}><Tl t="Deposit Match Calculator" badge="RELOAD BONUS" bc={K.yl} shareable/>
    <div style={S.row}><In l="Your Deposit" v={dep} set={setDep} pre="$" ph="1000"/><In l="Match %" v={pct} set={setPct} ph="20"/><In l="Max Bonus $" v={mx} set={setMx} pre="$" ph="200"/></div>
    <div style={S.row}><In l="Rollover (x)" v={ro} set={setRo} ph="5"/><In l="Avg Vig %" v={vg} set={setVg} ph="4.5"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?"+":""}${r.net}</span><span style={{fontSize:12,color:K.dm}}>net bonus value</span></div>
      <RR l="Bonus You Receive" v={`$${r.bonus}`} c={K.yl} b/><RR l="Total Must Wager" v={`$${r.tw}`}/><RR l="Vig Cost to Clear" v={`-$${r.cost}`} c={K.rd}/><RR l="Net Bonus Value" v={`${r.ok?"+":""}$${r.net}`} c={r.ok?K.gn:K.rd} b/><RR l="ROI on Deposit" v={`${r.roi}%`} c={r.ok?K.gn:K.yl}/>
      {!r.fill&&<Nt c={K.yl}>Deposit ${r.minDep} to max this bonus — your ${f(parseFloat(dep),0)} only captures ${r.bonus} of the ${mx} max.</Nt>}
      {r.fill&&<Nt c={K.gn}>You are depositing enough to capture the full ${mx} bonus.</Nt>}
      <Nt c={r.ok?K.gn:K.rd}>{r.ok?"Worth clearing. Bet low-vig markets (spreads/totals at -110) to minimize cost.":"High rollover or vig makes this bonus unprofitable. Consider skipping."}</Nt>
    </div>}
  </div>
  <Help entries={[
    ["Deposit Match","The sportsbook adds bonus funds equal to a percentage of your deposit. A '20% match up to $200' on a $1,000 deposit gives you $200 in bonus funds."],
    ["Rollover","Before withdrawing the bonus, you must wager a multiple of it. 5x on $200 means placing $1,000 in bets total. Each bet loses a small amount to vig."],
    ["Vig Cost","At 4.5% vig, clearing $1,000 in bets costs ~$45. Minimize this by betting NFL spreads, NBA totals, and main lines at -110/-110."],
    ["Minimum deposit","To capture the full max bonus: deposit at least Max Bonus ÷ Match%. For 20% up to $200, you need to deposit $1,000."],
    ["When to skip","Rollover of 10x+ or high-vig required markets means the clearing cost likely exceeds the bonus. This calculator shows you the break-even."],
  ]}/></div>);
};

const KellyCriterion = () => {
  const [mem,setMem]=useCalcMemory('kelly',{wp:"55",odds:"+110",br:"1000",frac:"25"});
  const {wp,odds,br,frac}=mem;
  const setWp=v=>setMem('wp',v),setOdds=v=>setMem('odds',v),setBr=v=>setMem('br',v),setFrac=v=>setMem('frac',v);
  const r = useMemo(()=>calcKelly(wp,odds,parseFloat(br),parseFloat(frac)/100),[wp,odds,br,frac]);
  return (<div><div style={S.card}><Tl t="Kelly Criterion Bet Sizer" badge="+EV SIZING" bc={K.gn} shareable/>
    <div style={S.row}><In l="Win Probability %" v={wp} set={setWp} ph="55"/><In l="Odds" v={odds} set={setOdds} ph="+110"/><In l="Bankroll" v={br} set={setBr} pre="$" ph="1000"/><In l="Kelly Fraction %" v={frac} set={setFrac} ph="25"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>${r.bet}</span><span style={{fontSize:12,color:K.dm}}>recommended bet size</span></div>
      <RR l="Full Kelly %" v={`${r.k}%`} c={K.dm}/><RR l={`${frac}% Fractional Kelly`} v={`${r.ak}%`} c={K.ac} b/><RR l="Bet Size" v={`$${r.bet}`} c={r.ok?K.gn:K.rd} b/><RR l="Expected Value" v={`${r.ok?"+":""}${r.ev}%`} c={r.ok?K.gn:K.rd}/>
      {!r.ok&&<Nt c={K.rd}>Kelly says skip this bet — your win probability does not support an edge at these odds.</Nt>}
      {r.ok&&<Nt c={K.yl}>Using {frac}% fractional Kelly. Full Kelly maximizes growth but has high variance. Most pros use 20–33% Kelly.</Nt>}
    </div>}
  </div>
  <Help entries={[
    ["Kelly Criterion","A formula that tells you what percentage of your bankroll to bet given your edge. It maximizes long-term growth. Bet too little: sub-optimal growth. Bet too much: risk of ruin."],
    ["Win Probability","Your TRUE estimate of the bet winning — not the book's implied probability. Get this from the No-Vig calculator or sharp book consensus."],
    ["Fractional Kelly","Most professionals use 25–33% Kelly. Full Kelly has high variance — you can have long drawdowns even when profitable. Quarter-Kelly gives 75% of the growth with far less risk."],
    ["Edge required","If your win probability is below the book's implied probability, Kelly returns 0. Only bet when you have a genuine edge."],
    ["Bankroll","Your total allocated betting bankroll — not your life savings. Kelly only works correctly when staked against a consistent bankroll figure."],
  ]}/></div>);
};

const InsurancePromo = () => {
  const [mem,setMem]=useCalcMemory('insurance',{stake:"100",insPct:"100",insMax:"100",conv:"70"});
  const {stake,insPct,insMax,conv}=mem;
  const setStake=x=>setMem('stake',x),setInsPct=x=>setMem('insPct',x),setInsMax=x=>setMem('insMax',x),setConv=x=>setMem('conv',x);
  const r = useMemo(()=>calcInsurance(stake,insPct,insMax,conv),[stake,insPct,insMax,conv]);
  return (<div><div style={S.card}><Tl t="Promo Insurance Calculator" badge="SGP / PARLAY" bc={K.pp} shareable/>
    <div style={S.row}><In l="Your Stake" v={stake} set={setStake} pre="$" ph="100"/><In l="Insurance % of Stake" v={insPct} set={setInsPct} ph="100"/><In l="Max Insurance $" v={insMax} set={setInsMax} pre="$" ph="100"/><In l="Bonus Conversion %" v={conv} set={setConv} ph="70"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.gn)}>${r.insVal}</span><span style={{fontSize:12,color:K.dm}}>insurance value (real cash)</span></div>
      <RR l="Insurance Bonus Amount" v={`$${r.insAmt}`} c={K.pp} b/><RR l="Bonus Value After Conversion" v={`$${r.insVal}`} c={K.gn} b/><RR l="Net Cost if Bet Loses" v={`$${r.netCost}`} c={parseFloat(r.netCost)<=5?K.gn:K.yl}/><RR l="Insurance Effectiveness" v={`${r.effPct}%`} c={parseFloat(r.effPct)>=60?K.gn:K.yl}/>
      <Nt c={K.ac}>If your insured bet loses: you get ${r.insAmt} back as a bonus bet. Convert that using the Bonus Bet tab (~{conv}%) = ${r.insVal} real cash. Your net loss is only ${r.netCost}.</Nt>
    </div>}
  </div>
  <Help entries={[
    ["Insurance Promo","A sportsbook refunds part or all of your stake (as bonus bets) if your bet loses. Common forms: SGP Insurance (refund if 1 leg misses), Parlay Insurance, and Step-Up Parlays (tiered payouts by legs hit)."],
    ["Why it changes the math","Without insurance, a $100 loss costs $100. With 100% SGP insurance, you lose $100 but get $100 in bonus bets back — worth ~$70 after conversion. Net loss is only ~$30."],
    ["Insurance %","Some promos give 100% back, others give 50% or 25%. A '50% SGP insurance up to $50' on a $100 bet returns $50 as bonus if it loses."],
    ["Conversion Rate","Bonus bets are worth ~70% as real cash when converted using the Bonus Bet Calculator. Adjust if your lines are particularly good or bad."],
    ["vs. hedging","If you CAN hedge the bet, use the First Bet Hedge calculator for guaranteed profit. Insurance calcs are for bets you cannot hedge (SGPs, same-book parlays)."],
  ]}/></div>);
};

const TeaserCalc = () => {
  const [mem,setMem]=useCalcMemory('teaser',{legs:"2",tOdds:"-110",wp:"72"});
  const {legs,tOdds,wp}=mem;
  const setLegs=x=>setMem('legs',x),setTOdds=x=>setMem('tOdds',x),setWp=x=>setMem('wp',x);
  const r = useMemo(()=>calcTeaser(legs,tOdds,wp),[legs,tOdds,wp]);
  const presets = [["2-leg 6pt","-110"],["2-leg 6.5pt","-120"],["2-leg 7pt","-130"],["3-leg 6pt","+165"]];
  return (<div><div style={S.card}><Tl t="Teaser Calculator" badge="NFL / NBA" bc={K.ac} shareable/>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Legs</label><select style={S.input} value={legs} onChange={e=>setLegs(e.target.value)}>{["2","3","4","5"].map(n=><option key={n}>{n}</option>)}</select></div>
      <In l="Teaser Odds" v={tOdds} set={setTOdds} ph="-110"/>
      <In l="Win % Per Leg" v={wp} set={setWp} ph="72"/>
    </div>
    <div style={{marginBottom:12}}>
      <div style={{fontSize:10,color:K.mt,marginBottom:6,textTransform:"uppercase",letterSpacing:"1px"}}>Quick Presets</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {presets.map(([label,odds])=>(
          <button key={label} onClick={()=>{const parts=label.split(' ');setLegs(parts[0][0]);setTOdds(odds);}} style={{padding:"4px 10px",background:K.s3,border:`1px solid ${K.bd2}`,borderRadius:4,color:K.dm,fontSize:10,cursor:"pointer",fontFamily:font}}>{label} ({odds})</button>
        ))}
      </div>
    </div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?"+":""}{r.ev}%</span><span style={{fontSize:12,color:K.dm}}>expected value per $100</span></div>
      <RR l="Legs" v={legs}/><RR l="Combined Win Probability" v={`${r.combProb}%`} c={K.ac}/><RR l="Break-even Win % Per Leg" v={`${r.beProb}%`} c={K.yl}/><RR l="Payout (net odds)" v={`${r.payout}x`}/>
      {r.ok&&<Nt c={K.gn}>This teaser has positive EV at your estimated per-leg win rate. Make sure your estimate accounts for the line movement — teasers are only +EV when crossing key numbers (3 and 7 in NFL).</Nt>}
      {!r.ok&&<Nt c={K.rd}>At {wp}% per-leg win rate, this teaser is -EV. You need {r.beProb}% per leg to break even. Teasers crossing 3 and 7 in NFL can reach 72-76% per leg — otherwise avoid.</Nt>}
    </div>}
  </div>
  <Help entries={[
    ["Teaser","A parlay where you move the point spread/total in your favor by a set number of points (6, 6.5, or 7 in NFL) in exchange for worse payout odds. The extra points increase your per-leg win probability."],
    ["Key numbers in NFL","Margins of 3 and 7 are far more common than any other margin (field goal and touchdown). Crossing these numbers dramatically increases win probability. A team -7 becomes -1 in a 6-point teaser — this is the value."],
    ["When teasers are +EV","The classic strategy: 2-team 6pt teasers that cross both 3 and 7 on spreads (sides ranging from +1.5 to +2.5, or -7.5 to -8.5). Historical win rate for these legs is ~72-76%."],
    ["NBA teasers","Standard NBA teaser points are 4, 4.5, or 5. Key numbers matter less in basketball. Most NBA teasers are -EV — use with caution."],
  ]}/></div>);
};

const RoundRobinCalc = () => {
  const [picks, setPicks] = useState([{odds:"+150"},{odds:"+200"},{odds:"+175"}]);
  const [size, setSize] = useState("2");
  const [stakeEach, setStakeEach] = useState("50");
  const pickOdds = picks.map(p=>p.odds);
  const r = useMemo(()=>calcRR(pickOdds,size,stakeEach),[pickOdds,size,stakeEach]);
  const addPick = () => setPicks(p=>[...p,{odds:"+150"}]);
  const removePick = i => setPicks(p=>p.filter((_,j)=>j!==i));
  const updatePick = (i,v) => setPicks(p=>p.map((pk,j)=>j===i?{odds:v}:pk));
  return (<div><div style={S.card}><Tl t="Round Robin Calculator" badge="PARLAY" bc={K.yl} shareable/>
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <label style={S.label}>Your Picks (enter odds for each)</label>
        <button onClick={addPick} style={{padding:"3px 10px",background:K.s3,border:`1px solid ${K.bd2}`,borderRadius:4,color:K.gn,fontSize:10,cursor:"pointer",fontFamily:font}}>+ Pick</button>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {picks.map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:10,color:K.mt}}>#{i+1}</span>
            <input style={{...S.input,width:80}} value={p.odds} onChange={e=>updatePick(i,e.target.value)} placeholder="+150"/>
            {picks.length>2&&<span onClick={()=>removePick(i)} style={{cursor:"pointer",color:K.rd,fontSize:11}}>✕</span>}
          </div>
        ))}
      </div>
    </div>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Combo Size</label><select style={S.input} value={size} onChange={e=>setSize(e.target.value)}>{["2","3","4"].filter(n=>parseInt(n)<=picks.length).map(n=><option key={n}>{n}-team parlays</option>)}</select></div>
      <In l="Stake Per Combo" v={stakeEach} set={setStakeEach} pre="$" ph="50"/>
    </div>
    {r&&<div style={S.res(true)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.ac)}>{r.nCombos}</span><span style={{fontSize:12,color:K.dm}}>combinations</span></div>
      <RR l="Total Stake" v={`$${r.totalStake}`} c={K.rd} b/><RR l="Best Case Payout" v={`$${r.maxPayout}`} c={K.gn}/><RR l="Worst Single Combo Payout" v={`$${r.minPayout}`}/><RR l="Average Payout Per Combo" v={`$${r.avgPayout}`} c={K.ac}/>
      <Nt c={K.yl}>A round robin protects against one or two picks losing — you win multiple smaller parlays instead of needing all picks to hit. Total stake: ${r.totalStake} ({r.nCombos} combos × ${stakeEach}).</Nt>
    </div>}
  </div>
  <Help entries={[
    ["Round Robin","Instead of one big parlay, a round robin creates every possible smaller parlay from your pool of picks. If you have 4 picks and choose 2-team combos, you get 6 separate 2-team parlays (4 choose 2 = 6)."],
    ["Why use it","A standard 4-leg parlay requires all 4 to win. A round robin of 2-team parlays from those 4 picks means you profit even if only 2 or 3 of your picks hit."],
    ["Risk vs reward","You spend more total (6 × $50 = $300 vs $50 for one parlay) but you have multiple chances to profit. It is risk management for high-confidence multi-pick days."],
    ["Best use case","When you have 3-5 strong +EV opinions on a slate. Rather than going all-or-nothing, round robins monetize partial correctness."],
  ]}/></div>);
};

// ═══ PARLAY BUILDER ═══
const ParlayBuilder = () => {
  const [legs, setLegs] = useState([{odds:"+150"},{odds:"+200"},{odds:"+175"}]);
  const [stake, setStake] = useState("100");
  const legOdds = legs.map(l=>l.odds);
  const r = useMemo(()=>calcParlay(legOdds, stake),[legOdds,stake]);
  const addLeg = ()=>{ if(legs.length<8) setLegs(l=>[...l,{odds:"+150"}]); };
  const removeLeg = i => setLegs(l=>l.filter((_,j)=>j!==i));
  const updateLeg = (i,v) => setLegs(l=>l.map((lg,j)=>j===i?{odds:v}:lg));
  return (<div><div style={S.card}><Tl t="Parlay Builder" badge="MULTI-LEG" bc={K.yl} shareable/>
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <label style={S.label}>Legs ({legs.length}/8) — enter any odds format</label>
        <button onClick={addLeg} disabled={legs.length>=8} style={{padding:"3px 10px",background:K.s3,border:`1px solid ${K.bd2}`,borderRadius:4,color:K.gn,fontSize:10,cursor:"pointer",fontFamily:font}}>+ Leg</button>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {legs.map((lg,i)=>{
          const d=toD(lg.odds);
          const ip=d>1?f(1/d*100,1):null;
          const isFav=d>1&&d<2;
          return (<div key={i} style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:10,color:K.mt}}>Leg {i+1}</span>
              <input style={{...S.input,width:90,borderColor:isFav?`${K.rd}80`:undefined}} value={lg.odds} onChange={e=>updateLeg(i,e.target.value)} placeholder="+150"/>
              {isFav&&<span style={S.tag(K.rd)}>FAV</span>}
              {legs.length>2&&<span onClick={()=>removeLeg(i)} style={{cursor:"pointer",color:K.rd,fontSize:11,padding:"0 2px"}}>✕</span>}
            </div>
            {ip&&<div style={{fontSize:9,color:isFav?K.rd:K.mt,paddingLeft:40}}>{ip}% implied</div>}
          </div>);
        })}
      </div>
    </div>
    <div style={S.row}><In l="Stake" v={stake} set={setStake} pre="$" ph="100"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>${r.profit}</span><span style={{fontSize:12,color:K.dm}}>profit if hits</span></div>
      <RR l="Combined Odds" v={`${r.combA} (${r.combined}x)`} c={K.pp} b/>
      <RR l="Total Payout" v={`$${r.payout}`} c={K.gn}/>
      <RR l="True Win Probability" v={`${r.prob}%`} c={K.ac}/>
      <RR l="Expected Value" v={`${r.ok?"+":""}$${r.ev}`} c={r.ok?K.gn:K.rd} b/>
      <RR l="Implied Prob Sum (vig)" v={`${r.impSum}%`} c={parseFloat(r.impSum)>105?K.rd:K.yl}/>
      {!r.ok&&<Nt c={K.rd}>This parlay is -EV. The sportsbook&apos;s vig compounds across each leg — long parlays almost always favor the house.</Nt>}
      {r.ok&&<Nt c={K.gn}>This parlay has positive expected value. Verify each leg has a genuine edge using the +EV calculator first.</Nt>}
    </div>}
  </div>
  <Help entries={[
    ["How parlay odds compound","Each leg's odds multiply together. 3 legs at +150 (+150 = 2.5x decimal each) = 2.5 × 2.5 × 2.5 = 15.625x combined. Bet $100, payout $1,562.50. But the house takes vig on EVERY leg — it compounds against you."],
    ["True win probability","True probability = product of each leg's no-vig probability. This is always lower than the implied probabilities suggest because book prices include vig."],
    ["When parlays are +EV","Almost never in traditional sportsbooks. The exception: when individual legs have genuine +EV edges. If every leg is +EV, the parlay can be +EV. If any leg is -EV, it drags the whole parlay down."],
    ["Round robin alternative","Instead of one 4-leg parlay, try a round robin of 2-team parlays from your pool. Wins more often, less volatile. See the Round Robin tab."],
  ]}/></div>);
};

// ═══ SGP EV ESTIMATOR ═══
const SGPEstimator = () => {
  const [legs, setLegs] = useState([{odds:"+200"},{odds:"+150"},{odds:"-110"}]);
  const [sgpOdds, setSgpOdds] = useState("+450");
  const [stake, setStake] = useState("50");
  const r = useMemo(()=>calcSGP(legs.map(l=>l.odds),sgpOdds,stake),[legs,sgpOdds,stake]);
  const addLeg = ()=>{ if(legs.length<4) setLegs(l=>[...l,{odds:"+150"}]); };
  const removeLeg = i => setLegs(l=>l.filter((_,j)=>j!==i));
  const updateLeg = (i,v) => setLegs(l=>l.map((lg,j)=>j===i?{odds:v}:lg));
  return (<div><div style={S.card}><Tl t="SGP EV Estimator" badge="SAME-GAME PARLAY" bc={K.pp} shareable/>
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <label style={S.label}>Individual leg odds (assume independent)</label>
        <button onClick={addLeg} disabled={legs.length>=4} style={{padding:"3px 10px",background:K.s3,border:`1px solid ${K.bd2}`,borderRadius:4,color:K.gn,fontSize:10,cursor:"pointer",fontFamily:font}}>+ Leg</button>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {legs.map((lg,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:10,color:K.mt}}>Leg {i+1}</span>
            <input style={{...S.input,width:90}} value={lg.odds} onChange={e=>updateLeg(i,e.target.value)} placeholder="+150"/>
            {legs.length>2&&<span onClick={()=>removeLeg(i)} style={{cursor:"pointer",color:K.rd,fontSize:11,padding:"0 2px"}}>✕</span>}
          </div>
        ))}
      </div>
    </div>
    <div style={S.row}>
      <In l="Book's SGP Odds" v={sgpOdds} set={setSgpOdds} ph="+450"/>
      <In l="Stake" v={stake} set={setStake} pre="$" ph="50"/>
    </div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?"+":""}${r.ev}</span><span style={{fontSize:12,color:K.dm}}>expected value</span></div>
      <RR l="Independent Parlay Odds (fair)" v={`${r.indOdds} (${r.indD}x)`} c={K.ac}/>
      <RR l="Book's SGP Odds" v={`${sgpOdds} (${r.sgpD}x)`} c={K.tx}/>
      <RR l="SGP Discount vs Fair" v={`${r.discount}%`} c={parseFloat(r.discount)>20?K.rd:parseFloat(r.discount)>10?K.yl:K.gn} b/>
      <RR l="True Win Probability" v={`${r.prob}%`} c={K.dm}/>
      {parseFloat(r.discount)>25&&<Nt c={K.rd}>This SGP is priced 25%+ below fair value. The book is heavily discounting for leg correlation. Look for better-priced SGPs or use the individual legs separately.</Nt>}
      {parseFloat(r.discount)<=10&&r.ok&&<Nt c={K.gn}>Low discount — this SGP is priced close to fair value with positive EV. Rare. Consider placing it.</Nt>}
    </div>}
  </div>
  <Help entries={[
    ["Why SGPs are usually overpriced (for the book)","An SGP combines correlated legs (e.g. QB passing yards + WR receiving yards). Books know they're correlated so they reduce the payout from what a true independent parlay would pay. The average SGP discount vs. fair value is 15-30%."],
    ["Independent parlay assumption","This calculator assumes your legs are statistically independent for the 'fair' calculation. If legs are positively correlated (QB TDs + WR yards on same game), the true fair odds are actually LOWER than this shows. If negatively correlated, they'd be higher."],
    ["When SGPs are worth it","Almost never at standard books. The exception: books sometimes offer SGP boosts (e.g. '20% SGP boost') which can overcome the discount. Plug in the boosted odds to see if it creates positive EV."],
  ]}/></div>);
};

// ═══ HOLD CALCULATOR ═══
const HoldCalc = () => {
  const [mem,setMem]=useCalcMemory('hold-calc',{o1:"-110",o2:"-110"});
  const {o1,o2}=mem;
  const setO1=x=>setMem('o1',x),setO2=x=>setMem('o2',x);
  const r = useMemo(()=>calcHold(o1,o2),[o1,o2]);
  const grade = r ? (parseFloat(r.hold)<3?"SHARP":parseFloat(r.hold)<5?"FAIR":parseFloat(r.hold)<8?"HIGH":"AVOID") : null;
  const gradeColor = r ? (parseFloat(r.hold)<3?K.gn:parseFloat(r.hold)<5?K.ac:parseFloat(r.hold)<8?K.yl:K.rd) : K.mt;
  return (<div><div style={S.card}><Tl t="Book Hold Calculator" badge="VIG DETECTOR" bc={K.dm} shareable/>
    <div style={S.row}><In l="Side 1 Odds" v={o1} set={setO1} ph="-110"/><In l="Side 2 Odds" v={o2} set={setO2} ph="-110"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(gradeColor)}>{r.hold}%</span><span style={{fontSize:12,color:K.dm}}>book hold</span><span style={S.tag(gradeColor)}>{grade}</span></div>
      <RR l="Side 1 Implied Probability" v={`${r.ip1}%`} c={K.dm}/>
      <RR l="Side 2 Implied Probability" v={`${r.ip2}%`} c={K.dm}/>
      <RR l="Total (should be 100% for fair)" v={`${f(parseFloat(r.ip1)+parseFloat(r.ip2),1)}%`} c={K.yl}/>
      <RR l="Overround (hold)" v={`${r.hold}%`} c={gradeColor} b/>
      <Nt c={gradeColor}>
        {parseFloat(r.hold)<3?"Sharp book pricing — minimal vig. Great line to bet.":
         parseFloat(r.hold)<5?"Fair vig. Standard -110/-110 spread pricing.":
         parseFloat(r.hold)<8?"Above-average hold. Consider shopping other books.":
         "High hold. This book is overcharging significantly. Skip unless no other options."}
      </Nt>
    </div>}
  </div>
  <Help entries={[
    ["Book Hold","The total percentage the sportsbook profits from both sides of a bet. At -110/-110, each side has 52.4% implied probability — 104.8% total. The extra 4.8% is the hold. Whatever you bet, the book keeps 4.8 cents per dollar wagered long-term."],
    ["Sharp books (hold < 3%)","Pinnacle, Circa, and some offshore books run <3% hold. Sharp bettors love these because more of your edge translates to actual profit."],
    ["Retail books (hold 4.5-6%)","DraftKings, FanDuel, BetMGM typically run 4.5-5.5% hold on main lines. Player props and live betting are often 8-15% hold — much worse."],
    ["Use this to compare books","Enter the same game at two different books. The one with lower hold is charging you less for the same bet. Over hundreds of bets, this is meaningful."],
  ]}/></div>);
};

// ═══ BET SIZING ADVISOR ═══
const BetSizingAdvisor = () => {
  const [mem,setMem]=useCalcMemory('bet-sizer',{bankroll:"1000",numBets:"5",avgEdge:"3",style:"quarter-kelly"});
  const {bankroll,numBets,avgEdge,style}=mem;
  const setBankroll=x=>setMem('bankroll',x),setNumBets=x=>setMem('numBets',x),setAvgEdge=x=>setMem('avgEdge',x),setStyle=x=>setMem('style',x);
  const br=parseFloat(bankroll)||0, nb=parseInt(numBets)||1, edge=parseFloat(avgEdge)/100;
  const kellyPct = edge>0 ? Math.min(edge,0.25) : 0;
  const kellyAmt = br*kellyPct;
  const qkAmt = kellyAmt*0.25;
  const current = style==="flat"?br*0.01:style==="half-kelly"?kellyAmt*0.5:style==="quarter-kelly"?qkAmt:kellyAmt;
  const totalRisk = current*nb;
  const riskPct = br>0?f(totalRisk/br*100,1):0;
  return (<div><div style={S.card}><Tl t="Bet Sizing Advisor" badge="BANKROLL" bc={K.ac} shareable/>
    <div style={S.row}>
      <In l="Total Bankroll" v={bankroll} set={setBankroll} pre="$" ph="1000"/>
      <In l="Concurrent Bets" v={numBets} set={setNumBets} ph="5"/>
      <In l="Avg Edge %" v={avgEdge} set={setAvgEdge} ph="3"/>
      <div style={S.col}><label style={S.label}>Sizing Style</label><select style={S.input} value={style} onChange={e=>setStyle(e.target.value)}>
        <option value="flat">Flat 1%</option>
        <option value="quarter-kelly">Quarter Kelly</option>
        <option value="half-kelly">Half Kelly</option>
        <option value="full-kelly">Full Kelly</option>
      </select></div>
    </div>
    {br>0&&<div style={S.res(parseFloat(riskPct)<30)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.ac)}>${f(current)}</span><span style={{fontSize:12,color:K.dm}}>per bet ({style})</span></div>
      <RR l="Flat 1% of bankroll" v={`$${f(br*0.01)}`} c={K.dm}/>
      <RR l="Quarter Kelly (recommended)" v={`$${f(qkAmt)}`} c={K.gn}/>
      <RR l="Half Kelly" v={`$${f(kellyAmt*0.5)}`} c={K.yl}/>
      <RR l="Full Kelly" v={`$${f(kellyAmt)}`} c={K.rd}/>
      <RR l={`${nb} bets at ${style}`} v={`$${f(totalRisk)} (${riskPct}% of bankroll)`} c={parseFloat(riskPct)>30?K.rd:K.ac} b/>
      <Nt c={parseFloat(riskPct)>30?K.rd:K.gn}>
        {parseFloat(riskPct)>30?"You have more than 30% of bankroll at risk simultaneously. High drawdown risk. Reduce bet count or size.":
        "Risk level is healthy. Less than 30% of bankroll across all open bets."}
      </Nt>
    </div>}
  </div>
  <Help entries={[
    ["Flat betting","Bet the same dollar amount every time (1-2% of bankroll). Simple, safe, and appropriate when you're not sure of your exact edge. 1% means you can lose 100 straight bets before busting."],
    ["Kelly Criterion","Bets a percentage proportional to your edge. Maximum long-term growth but high variance. Full Kelly can cause -50% drawdowns even when profitable."],
    ["Quarter Kelly (recommended)","The industry standard. Gives 75% of Full Kelly growth with dramatically lower variance. Most professional +EV bettors use 20-33% of Kelly."],
    ["Concurrent bets","Keep total risk under 20-30% of bankroll across all open positions. If you have 10 open bets at 5% each, you're risking 50% of your bankroll simultaneously — one bad day can be devastating."],
  ]}/></div>);
};

// ═══ LINE SHOPPING ═══
const LineShop = () => {
  const bookNames = BOOKS.map(b=>b.name);
  const [odds, setOdds] = useState(() => Object.fromEntries(bookNames.map(n=>[n,''])));
  const [label, setLabel] = useState('');
  const entries = bookNames.map(n=>({name:n,odds:odds[n],color:BOOKS.find(b=>b.name===n)?.color||'#60a5fa'})).filter(e=>e.odds&&toD(e.odds)>1);
  const best = entries.length ? entries.reduce((b,e)=>toD(e.odds)>toD(b.odds)?e:b) : null;
  const nvOdds = entries.length>=2 ? (()=>{ const probs=entries.map(e=>1/toD(e.odds)); const avg=probs.reduce((s,p)=>s+p,0)/probs.length; return toA(1/avg); })() : null;
  return (<div><div style={S.card}><Tl t="Line Shopping" badge="BEST ODDS FINDER" bc={K.gn} shareable/>
    <div style={S.row}><div style={{flex:2,minWidth:200}}><label style={S.label}>Game / Event (optional)</label><input style={S.input} value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Chiefs vs Bills — Moneyline Chiefs"/></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8,marginBottom:12}}>
      {bookNames.map(n=>{
        const isBest=best?.name===n;
        return (<div key={n} style={{padding:"10px",background:isBest?`${K.gn}10`:K.s2,border:`1px solid ${isBest?K.gn:K.bd2}`,borderRadius:6}}>
          <div style={{fontSize:10,color:isBest?K.gn:K.mt,fontWeight:isBest?700:400,marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>{n}{isBest&&" ★"}</div>
          <input style={{...S.input,padding:"5px 8px",fontSize:12}} value={odds[n]} onChange={e=>setOdds(o=>({...o,[n]:e.target.value}))} placeholder="e.g. -110"/>
        </div>);
      })}
    </div>
    {entries.length>=2&&<div style={S.res(true)}>
      {best&&<div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.gn)}>{best.odds}</span><span style={{fontSize:12,color:K.dm}}>best odds at {best.name}</span></div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
        {entries.sort((a,b)=>toD(b.odds)-toD(a.odds)).map(e=>(
          <div key={e.name} style={{padding:"6px 12px",background:e.name===best?.name?`${K.gn}15`:K.s3,border:`1px solid ${e.name===best?.name?K.gn:K.bd2}`,borderRadius:6}}>
            <div style={{fontSize:11,fontWeight:600,color:e.name===best?.name?K.gn:K.tx}}>{e.odds}</div>
            <div style={{fontSize:9,color:K.mt}}>{e.name}</div>
          </div>
        ))}
      </div>
      {nvOdds&&<RR l="Market consensus (no-vig)" v={nvOdds} c={K.pp}/>}
      {best&&<RR l="Best vs. average (cents saved per $100)" v={`+${f((1/toD(entries.reduce((s,e)=>({odds:String(toD(s.odds)+toD(e.odds)),name:'avg'})).odds*entries.length)-1/toD(best.odds))*100,1)}¢`} c={K.gn}/>}
      <Nt c={K.ac}>Always bet at the book offering the best odds for your side. Even 5 cents better on a $200 bet = $10 extra profit per game.</Nt>
    </div>}
    {entries.length<2&&<Nt c={K.mt}>Enter odds from 2+ books above to compare.</Nt>}
  </div>
  <Help entries={[
    ["Line Shopping","Checking multiple sportsbooks to find the best odds for your bet before placing. At -110 vs -105, you save $5 per $100 bet. Over hundreds of bets, this compounds into hundreds of dollars."],
    ["Market Consensus","The average implied probability across all books you entered, with vig removed. This is a rough estimate of the 'true' fair odds."],
    ["How much it matters","A bettor who always shops lines and gets 5 cents better odds on average will beat a bettor who doesn't by 2-3% ROI over the long run — without needing better picks."],
    ["The golden rule","Never place a moneyline or spread bet without checking at least 3 books. Difference between books is often 5-15 cents. Set up accounts at 6+ books so you always have options."],
  ]}/></div>);
};

// ═══ BET TRACKER (PENDING BETS) ═══
const BetTracker = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const bets = data.bets || [];
  const [form, setForm] = useState({date:new Date().toISOString().split("T")[0],book:"DraftKings",type:"Moneyline",odds:"+110",stake:"",toWin:"",status:"open",notes:""});
  const [showImport, setShowImport] = useState(false);
  const calcToWin = (odds, stake) => { const d=toD(odds), s=parseFloat(stake); if(d<=1||!s) return ""; return f(s*(d-1)); };
  const save = (newBets) => syncAppData({...data, bets: newBets});
  const toast = useToast();
  const add = () => {
    if(!form.stake||!form.odds) return;
    const toWin = calcToWin(form.odds, form.stake);
    save([{...form,toWin,id:Date.now()},...bets]);
    setForm(f=>({...f,stake:"",odds:"+110",toWin:"",notes:""}));
    if(toast) toast('✓ Bet added');
  };
  const setStatus = (id, status) => save(bets.map(b=>b.id===id?{...b,status}:b));
  const del = id => { const snapshot=[...bets]; save(bets.filter(b=>b.id!==id)); if(toast) toast('Bet deleted',K.rd,{label:'UNDO',fn:()=>save(snapshot)}); };
  const exportBets = () => {
    const headers = ["Date","Book","Type","Odds","Stake","To Win","Status","Notes"];
    const rows = bets.map(e=>[e.date,e.book,e.type,e.odds,e.stake,e.toWin||"",e.status,e.notes||""]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv"})),download:`promogrind-bets-${new Date().toISOString().split("T")[0]}.csv`});
    a.click(); URL.revokeObjectURL(a.href);
  };
  const betGrade = (bet) => {
    if(bet.status==="open"||bet.status==="void") return null;
    const d=toD(bet.odds);
    if(bet.status==="won"&&d>toD("+100")) return {g:"A",c:K.gn};
    if(bet.status==="won") return {g:"B",c:K.ac};
    if(bet.status==="lost"&&d>=toD("-110")) return {g:"C",c:K.yl};
    return {g:"D",c:K.rd};
  };
  const open = bets.filter(b=>b.status==="open");
  const atRisk = open.reduce((s,b)=>s+(parseFloat(b.stake)||0),0);
  const potentialWin = open.reduce((s,b)=>s+(parseFloat(b.toWin)||0),0);
  const settled = bets.filter(b=>b.status==="won"||b.status==="lost");
  const winRate = settled.length ? (bets.filter(b=>b.status==="won").length/settled.length*100) : null;
  const statusColor = {open:K.yl,won:K.gn,lost:K.rd,void:K.mt};
  return (<div style={S.card}><Tl t="Pending Bet Tracker" badge="OPEN BETS" bc={K.yl}/>
    <div style={{display:"flex",gap:20,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><div style={{fontSize:10,color:K.mt}}>OPEN BETS</div><div style={S.big(K.yl)}>{open.length}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>AT RISK</div><div style={S.big(K.rd)}>${f(atRisk)}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>TO WIN</div><div style={S.big(K.gn)}>${f(potentialWin)}</div></div>
      {winRate!==null&&<div><div style={{fontSize:10,color:K.mt}}>WIN RATE</div><div style={S.big(winRate>=55?K.gn:winRate>=45?K.yl:K.rd,{fontSize:22})}>{f(winRate,1)}%</div><div style={{fontSize:9,color:K.mt}}>{settled.length} settled</div></div>}
      {open.length>0&&(()=>{
        const ev=open.reduce((s,b)=>{
          const d=toD(b.odds); if(d<=1) return s;
          const p=1/d;
          return s+(parseFloat(b.toWin)||0)*p-(parseFloat(b.stake)||0)*(1-p);
        },0);
        return <div><div style={{fontSize:10,color:K.mt}}>PORTFOLIO EV</div><div style={{...S.big(ev>=0?K.gn:K.rd),fontSize:22}}>{ev>=0?"+":""}${f(ev)}</div><div style={{fontSize:9,color:K.mt}}>book-implied</div></div>;
      })()}
      <button onClick={()=>setShowImport(true)} style={{marginLeft:"auto",padding:"7px 14px",background:"transparent",border:`1px solid ${K.ac}`,borderRadius:6,color:K.ac,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>↑ Import CSV</button>
      {bets.length>0&&<button onClick={exportBets} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>↓ Export CSV</button>}
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <div style={S.col}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
      <div style={{...S.col,minWidth:140}}><label style={S.label}>Book</label><select style={S.input} value={form.book} onChange={e=>setForm(f=>({...f,book:e.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></div>
      <div style={{...S.col,minWidth:140}}><label style={S.label}>Bet Type</label><select style={S.input} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{["Moneyline","Spread","Total","Parlay","Prop","Bonus Bet","Other"].map(t=><option key={t}>{t}</option>)}</select></div>
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <In l="Odds" v={form.odds} set={v=>{setForm(f=>({...f,odds:v,toWin:calcToWin(v,f.stake)}));}} ph="+110"/>
      <In l="Stake" v={form.stake} set={v=>{setForm(f=>({...f,stake:v,toWin:calcToWin(f.odds,v)}));}} pre="$" ph="100"/>
      <In l="To Win (auto)" v={form.toWin} set={v=>setForm(f=>({...f,toWin:v}))} pre="$" ph="auto"/>
      <div style={{...S.col,minWidth:80}}><label style={S.label}>&nbsp;</label><button onClick={add} style={{padding:"8px 16px",background:K.yl,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:12,width:"100%"}}>+ ADD</button></div>
    </div>
    {bets.length===0&&<div style={{textAlign:"center",padding:"32px 16px",color:K.mt}}>
      <div style={{fontSize:32,marginBottom:8}}>📋</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>No bets tracked yet</div>
      <div style={{fontSize:11,color:K.mt}}>Add your first pending bet above to track your open action.</div>
    </div>}
    {bets.length>0&&<div style={{overflowX:"auto",marginTop:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Date","Book","Type","Odds","Stake","To Win","Status","Grade",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{bets.map(e=>{const gr=betGrade(e);return(
          <tr key={e.id} style={{opacity:e.status==="void"?0.4:1}}>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.date}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{e.book}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(K.ac)}>{e.type}</span></td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.pp,fontWeight:600}}>{e.odds}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>${e.stake}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:600}}>{e.toWin?`$${e.toWin}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
              <select value={e.status} onChange={ev=>setStatus(e.id,ev.target.value)} style={{...S.input,width:80,padding:"3px 6px",fontSize:10,color:statusColor[e.status]||K.tx}}>
                {["open","won","lost","void"].map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{gr?<span style={S.tag(gr.c)}>{gr.g}</span>:<span style={{color:K.mt}}>—</span>}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span onClick={()=>del(e.id)} style={{cursor:"pointer",color:K.rd,fontSize:10}}>✕</span></td>
          </tr>
        );})}</tbody>
      </table>
    </div>}
    {showImport&&<CSVImportModal onImport={rows=>{save([...rows,...bets]); if(toast) toast(`✓ Imported ${rows.length} bets`,K.gn);}} onClose={()=>setShowImport(false)}/>}
  </div>);
};

// ═══ TRACKER ═══
const Tracker = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const done = data.done || {};
  const profits = data.profits || {};
  const expiry = data.bookExpiry || {};
  const bookStatus = data.bookStatus || {};
  const bookRatings = data.bookRatings || {};
  const setBookStatus = (n, v) => syncAppData({...data, bookStatus:{...bookStatus,[n]:v}});
  const setBookRating = (n, v) => syncAppData({...data, bookRatings:{...bookRatings,[n]:v}});
  const toast = useToast();
  const toggle = n => { const newDone=!done[n]; const d = {...data, done:{...done,[n]:newDone}}; syncAppData(d); if(toast&&newDone) toast('✓ Book marked complete'); };
  const setP = (n, v) => syncAppData({...data, profits:{...profits,[n]:v}});
  const setExpiry = (n, v) => syncAppData({...data, bookExpiry:{...expiry,[n]:v}});
  const todayStr = new Date().toISOString().split('T')[0];
  const in3Days = new Date(Date.now()+3*24*60*60*1000).toISOString().split('T')[0];
  const expiryStatus = (n) => {
    const exp = expiry[n];
    if(!exp||done[n]) return null;
    if(exp<todayStr) return 'expired';
    if(exp<=in3Days) return 'soon';
    return null;
  };
  const total = Object.values(profits).reduce((s,v)=>s+(parseFloat(v)||0),0);
  const cnt = Object.values(done).filter(Boolean).length;
  return (<div style={S.card}><Tl t="Sportsbook Promo Tracker"/>
    <div style={{display:"flex",gap:20,marginBottom:16,flexWrap:"wrap"}}>
      <div><div style={{fontSize:10,color:K.mt}}>EXTRACTED</div><div style={S.big(K.gn)}>${f(total)}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>COMPLETED</div><div style={S.big(K.ac)}>{cnt}/{BOOKS.length}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>REMAINING</div><div style={S.big(K.yl)}>~${f(BOOKS.filter(b=>!done[b.name]).reduce((s,b)=>s+b.bonus*0.7,0),0)}</div></div>
    </div>
    <Nt c={K.ac}>Your tracker syncs across all your devices. Data also saves locally as a backup.</Nt>
    {(()=>{
      try {
        const st = localStorage.getItem('pg_user_state');
        if (!st) return null;
        const availBooks = BOOKS.filter(b=>!US_BOOK_STATES[b.name]||US_BOOK_STATES[b.name].includes(st));
        const unavailCount = BOOKS.length - availBooks.length;
        if (unavailCount === 0) return null;
        return <Nt c={K.ac}>{unavailCount} book{unavailCount>1?"s are":" is"} not available in {st} and may show limited promos for your state.</Nt>;
      } catch { return null; }
    })()}
    <div style={{overflowX:"auto",marginTop:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["","Book","Promo","Value","Daily Promos","Profit","Expiry","Health","★","Ref Code",""].map(h=><th key={h} style={{textAlign:"left",padding:"8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase",letterSpacing:"1px"}}>{h}</th>)}</tr></thead>
        <tbody>{BOOKS.map(b=>{const es=expiryStatus(b.name);return(<tr key={b.name} style={{opacity:done[b.name]?0.4:1}}>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><div role="checkbox" aria-checked={!!done[b.name]} aria-label={`Mark ${b.name} as completed`} tabIndex={0} onClick={()=>toggle(b.name)} onKeyDown={e=>(e.key===" "||e.key==="Enter")&&toggle(b.name)} style={{width:16,height:16,borderRadius:3,border:`2px solid ${done[b.name]?K.gn:K.bd2}`,background:done[b.name]?K.gn:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",outline:"none"}} onFocus={e=>e.currentTarget.style.boxShadow=`0 0 0 2px ${K.gn}55`} onBlur={e=>e.currentTarget.style.boxShadow="none"}>{done[b.name]&&<span style={{color:K.bg,fontSize:10,fontWeight:700}}>✓</span>}</div></td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{b.name}{es==='soon'&&<span style={{...S.tag(K.yl),marginLeft:4}}>⚠</span>}{es==='expired'&&<span style={{...S.tag(K.rd),marginLeft:4}}>EXPIRED</span>}{bookStatus[b.name]==="limited"&&<span style={{...S.tag(K.yl),marginLeft:4,fontSize:8}}>LIMITED</span>}{bookStatus[b.name]==="gubbed"&&<span style={{...S.tag(K.rd),marginLeft:4,fontSize:8}}>GUBBED</span>}<span style={{...S.tag(K.ac),marginLeft:6}}>{b.type}</span></td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontSize:11,color:K.dm,maxWidth:200}}>{b.detail}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:600,whiteSpace:"nowrap"}}>{b.value}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontSize:11,color:K.dm,maxWidth:180}}>{b.recurring}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...S.input,width:80,padding:"5px 8px"}} placeholder="$0" value={profits[b.name]||""} onChange={e=>setP(b.name,e.target.value)}/></td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><input type="date" style={{...S.input,width:120,padding:"4px 6px",fontSize:11,borderColor:es==='soon'?K.yl:es==='expired'?K.rd:undefined}} value={expiry[b.name]||""} onChange={e=>setExpiry(b.name,e.target.value)} title="Promo expiry date"/></td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
            <select value={bookStatus[b.name]||"active"} onChange={e=>setBookStatus(b.name,e.target.value)} style={{...S.input,width:90,padding:"3px 6px",fontSize:10,color:{active:K.gn,limited:K.yl,gubbed:K.rd,pending:K.mt,closed:K.rd}[bookStatus[b.name]||"active"]||K.gn}}>
              {["active","limited","gubbed","pending","closed"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
            <div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=>(
              <span key={n} onClick={()=>setBookRating(b.name,n===bookRatings[b.name]?0:n)} style={{cursor:"pointer",color:n<=(bookRatings[b.name]||0)?K.yl:K.bd2,fontSize:14}}>★</span>
            ))}</div>
          </td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
            <input
              style={{...S.input,width:90,padding:"4px 6px",fontSize:10}}
              placeholder="code/link"
              value={(data.bookRefCodes||{})[b.name]||""}
              onChange={e=>syncAppData({...data,bookRefCodes:{...(data.bookRefCodes||{}),[b.name]:e.target.value}})}
              title={`Your personal ${b.name} referral code`}
            />
          </td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,whiteSpace:"nowrap"}}>
            <a href={b.link} target="_blank" rel="noopener noreferrer sponsored" style={{display:"inline-block",padding:"5px 12px",background:K.gn,color:K.bg,borderRadius:5,fontSize:11,fontWeight:700,textDecoration:"none",opacity:done[b.name]?0.4:1}}>Sign Up →</a>
          </td>
        </tr>);})}</tbody>
      </table>
    </div>
    {(()=>{
      const codes = data.bookRefCodes || {};
      const filledBooks = BOOKS.filter(b=>codes[b.name]?.trim());
      if (!filledBooks.length) return null;
      return (
        <div style={{...S.card,background:K.s2,marginTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:K.pp,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Your Referral Links</div>
          <div style={{fontSize:11,color:K.dm,marginBottom:10}}>Share these with friends. Each book pays ${25}–$100 per sign-up via your personal link.</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {filledBooks.map(b=>(
              <div key={b.name} style={{padding:"8px 12px",background:K.s3,borderRadius:6,border:`1px solid ${K.bd}`}}>
                <div style={{fontSize:10,fontWeight:700,color:b.color||K.ac,marginBottom:2}}>{b.name}</div>
                <div style={{fontSize:10,color:K.dm,fontFamily:font,wordBreak:"break-all"}}>{codes[b.name]}</div>
              </div>
            ))}
          </div>
        </div>
      );
    })()}
    {(()=>{
      const ledger = data.ledger||[];
      if(!ledger.length) return null;
      const byBook={};
      ledger.forEach(e=>{
        if(!byBook[e.book]) byBook[e.book]={profit:0,count:0};
        byBook[e.book].profit+=parseFloat(e.profit)||0;
        byBook[e.book].count++;
      });
      const bookStats=Object.entries(byBook).sort((a,b)=>b[1].profit-a[1].profit);
      return (<div style={{marginTop:16}}>
        <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Per-Book P/L (from Ledger)</div>
        {bookStats.map(([book,d])=>(
          <div key={book} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:K.s2,borderRadius:6,marginBottom:4,border:`1px solid ${K.bd}`}}>
            <span style={{fontSize:12,fontWeight:600,color:K.tx}}>{book}</span>
            <span style={{fontSize:11,color:K.mt}}>{d.count} entries</span>
            <span style={{fontSize:13,fontWeight:700,color:d.profit>=0?K.gn:K.rd}}>{d.profit>=0?"+":""}${f(d.profit)}</span>
          </div>
        ))}
      </div>);
    })()}
  </div>);
};

// ═══ LEDGER ═══
const Ledger = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const entries = data.ledger || [];
  const [form, setForm] = useState({date:new Date().toISOString().split("T")[0],book:"DraftKings",type:"Bonus Conversion",bonus:"",hedge:"",profit:"",myOdds:"",closingOdds:"",notes:""});
  const save = (newEntries) => syncAppData({...data, ledger: newEntries});
  const toast = useToast();
  const add = () => {
    if(!form.profit) return;
    save([{...form,id:Date.now()},...entries]);
    setForm(f=>({...f,bonus:"",hedge:"",profit:"",notes:""}));
    onLedgerEntry();
    if(toast) toast('✓ Entry logged');
    // CLV alert
    if(form.myOdds&&form.closingOdds&&toast) {
      const my=toD(form.myOdds),cl=toD(form.closingOdds);
      if(my>1&&cl>1) {
        const clv=(my/cl-1)*100;
        if(clv>0) setTimeout(()=>toast(`🎯 Beat closing line by +${f(clv,2)}% — strong CLV signal`,K.gn),300);
        else if(clv<-1) setTimeout(()=>toast(`⚠ Closing line moved against you (${f(clv,2)}%)`,K.yl),300);
      }
    }
  };
  const del = id => { const snapshot=[...entries]; save(entries.filter(e=>e.id!==id)); if(toast) toast('Entry deleted',K.rd,{label:'UNDO',fn:()=>save(snapshot)}); };
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const startEdit = (e) => { setEditId(e.id); setEditForm({...e}); };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };
  const commitEdit = () => { save(entries.map(e=>e.id===editId?{...editForm}:e)); setEditId(null); setEditForm({}); if(toast) toast('✓ Entry updated'); };
  const [filterBook, setFilterBook] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showGoal, setShowGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(() => { try { return localStorage.getItem('pg_profit_goal')||''; } catch { return ''; } });
  const saveGoal = v => { setGoalInput(v); try { localStorage.setItem('pg_profit_goal', v); } catch {} };
  const total = entries.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPL = entries.filter(e=>e.date===todayStr).reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthPL = entries.filter(e=>e.date&&e.date.startsWith(thisMonth)).reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
  const exportCSV = () => {
    const headers = ["Date","Book","Type","Bonus","Hedge","Profit","Notes"];
    const rows = entries.map(e=>[e.date,e.book,e.type,e.bonus||"",e.hedge||"",e.profit,e.notes||""]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv"})),download:`promogrind-ledger-${new Date().toISOString().split("T")[0]}.csv`});
    a.click(); URL.revokeObjectURL(a.href);
  };
  return (<div style={S.card}><Tl t="Profit & Loss Ledger" badge="CLOUD SYNC" bc={K.gn}/>
    {(()=>{
      const clvEntries=entries.filter(e=>e.myOdds&&e.closingOdds);
      const avgClv=clvEntries.length?clvEntries.reduce((s,e)=>{const my=toD(e.myOdds),cl=toD(e.closingOdds);return s+(my>1&&cl>1?(my/cl-1)*100:0);},0)/clvEntries.length:null;
      return (<div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div><div style={{fontSize:10,color:K.mt}}>TOTAL PROFIT</div><div style={S.big(total>=0?K.gn:K.rd)}>${f(total)}</div></div>
        <div><div style={{fontSize:10,color:K.mt}}>ENTRIES</div><div style={S.big(K.ac)}>{entries.length}</div></div>
        {avgClv!==null&&<div><div style={{fontSize:10,color:K.mt}}>AVG CLV</div><div style={S.big(avgClv>=0?K.gn:K.rd)}>{avgClv>=0?"+":""}{f(avgClv,2)}%</div></div>}
        {(()=>{
          const bbEntries=entries.filter(e=>e.type==="Bonus Conversion"&&e.bonus&&e.profit);
          if(bbEntries.length<3) return null;
          const avgConv=bbEntries.reduce((s,e)=>{
            const b=parseFloat(e.bonus)||0; const p=parseFloat(e.profit)||0;
            return b>0?s+(p/b*100):s;
          },0)/bbEntries.length;
          return <div><div style={{fontSize:10,color:K.mt}}>CONV RATE</div><div style={{...S.big(avgConv>=70?K.gn:avgConv>=55?K.yl:K.rd),fontSize:20}}>{f(avgConv,1)}%</div><div style={{fontSize:9,color:K.mt}}>{bbEntries.length} conv.</div></div>;
        })()}
        {entries.filter(e=>e.date===todayStr).length>0&&<div><div style={{fontSize:10,color:K.mt}}>TODAY</div><div style={{...S.big(todayPL>=0?K.gn:K.rd),fontSize:22}}>{todayPL>=0?"+":""}${f(todayPL)}</div></div>}
        {(()=>{
          const cutoff=new Date(Date.now()-7*24*60*60*1000);
          const recent=entries.filter(e=>e.date&&new Date(e.date)>=cutoff);
          const recentPL=recent.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
          if(!recent.length) return null;
          return <div><div style={{fontSize:10,color:K.mt}}>LAST 7 DAYS</div><div style={S.big(recentPL>=0?K.gn:K.rd,{fontSize:20})}>{recentPL>=0?"+":""}${f(recentPL)}</div><div style={{fontSize:9,color:K.mt}}>{recent.length} bets</div></div>;
        })()}
        {entries.length>0&&<button onClick={exportCSV} style={{marginLeft:"auto",padding:"7px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>↓ Export CSV</button>}
        <button onClick={()=>{
          const cutoff=new Date(Date.now()-7*24*60*60*1000);
          const week=entries.filter(e=>e.date&&new Date(e.date)>=cutoff);
          const wPL=week.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
          const wClv=week.filter(e=>e.myOdds&&e.closingOdds);
          const avgClv=wClv.length?wClv.reduce((s,e)=>{const my=toD(e.myOdds),cl=toD(e.closingOdds);return s+(my>1&&cl>1?(my/cl-1)*100:0);},0)/wClv.length:null;
          const card=`📊 PromoGrind Week\nPromos: ${week.length}  |  Profit: ${wPL>=0?"+":""}$${f(wPL)}${avgClv!==null?`\nCLV: ${avgClv>=0?"+":""}${f(avgClv,2)}%`:""}
\nFree tools at vaultsparkstudios.com/promogrind/`;
          try{navigator.clipboard.writeText(card);}catch(e){}
          if(toast) toast('📋 Week card copied!',K.pp);
        }} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${K.pp}`,borderRadius:6,color:K.pp,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>📊 Share Week</button>
      </div>);
    })()}
    {(()=>{
      const goal = parseFloat(goalInput);
      const goalPct = goal>0 ? Math.min(100,monthPL/goal*100) : 0;
      const barColor = goalPct>=80?K.gn:goalPct>=40?K.yl:K.rd;
      return (<div style={{marginBottom:12}}>
        <button onClick={()=>setShowGoal(g=>!g)} style={{padding:"4px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font,marginBottom:showGoal||goal>0?8:0}}>
          {showGoal?"▲ Hide Goal":"▼ Monthly Goal"}
        </button>
        {(showGoal||goal>0)&&<div style={{padding:"12px 14px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`}}>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:11,color:K.dm}}>Monthly profit goal: $</span>
            <input style={{...S.input,width:80,padding:"4px 8px"}} value={goalInput} onChange={e=>saveGoal(e.target.value)} placeholder="1000"/>
          </div>
          {goal>0&&(<>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:K.mt,marginBottom:4}}>
              <span>This month: {monthPL>=0?"+":""}${f(monthPL)}</span>
              <span style={{color:barColor,fontWeight:600}}>{f(goalPct,0)}% of ${f(goal,0)} goal</span>
            </div>
            <div style={{height:6,background:K.s3,borderRadius:3}}>
              <div style={{height:6,borderRadius:3,background:barColor,width:`${goalPct}%`,transition:"width 0.4s"}}/>
            </div>
            {goalPct>=100&&<div style={{fontSize:11,color:K.gn,marginTop:6,fontWeight:600}}>Goal reached!</div>}
          </>)}
        </div>}
      </div>);
    })()}
    <div style={{...S.row,alignItems:"flex-end"}}>
      <div style={S.col}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
      <div style={{...S.col,minWidth:140}}><label style={S.label}>Book</label><select style={S.input} value={form.book} onChange={e=>setForm(f=>({...f,book:e.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></div>
      <div style={{...S.col,minWidth:160}}><label style={S.label}>Type</label><select style={S.input} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{["Bonus Conversion","Profit Boost","First Bet Hedge","Arbitrage","Middle","+EV Bet","Other"].map(t=><option key={t}>{t}</option>)}</select></div>
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <In l="Bonus $" v={form.bonus} set={v=>setForm(f=>({...f,bonus:v}))} pre="$"/>
      <In l="Hedge $" v={form.hedge} set={v=>setForm(f=>({...f,hedge:v}))} pre="$"/>
      <In l="Net Profit" v={form.profit} set={v=>setForm(f=>({...f,profit:v}))} pre="$"/>
      <In l="Your Odds (opt)" v={form.myOdds} set={v=>setForm(f=>({...f,myOdds:v}))} ph="+110"/>
      <In l="Closing Odds (opt)" v={form.closingOdds} set={v=>setForm(f=>({...f,closingOdds:v}))} ph="+105"/>
      <div style={{...S.col,minWidth:80}}><label style={S.label}>&nbsp;</label><button onClick={add} style={{padding:"8px 16px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:12,width:"100%"}}>+ ADD</button></div>
    </div>
    {entries.length>=2&&(()=>{
      const sorted=[...entries].sort((a,b)=>new Date(a.date)-new Date(b.date));
      const cumulative=sorted.reduce((acc,e,i)=>{const prev=i>0?acc[i-1].cum:0;acc.push({date:e.date,cum:prev+(parseFloat(e.profit)||0)});return acc;},[]);
      const minV=Math.min(0,...cumulative.map(p=>p.cum));
      const maxV=Math.max(0,...cumulative.map(p=>p.cum));
      const range=maxV-minV||1;
      const W=340,H=80,PAD=8;
      const sx=i=>(i/(cumulative.length-1||1))*(W-PAD*2)+PAD;
      const sy=v=>H-PAD-(v-minV)/range*(H-PAD*2);
      const pts=cumulative.map((p,i)=>`${sx(i)},${sy(p.cum)}`).join(' ');
      const areaClose=`${sx(cumulative.length-1)},${sy(0)} ${sx(0)},${sy(0)}`;
      const isPos=cumulative[cumulative.length-1].cum>=0;
      const color=isPos?K.gn:K.rd;
      return (
        <div style={{...S.card,background:K.s2,padding:"12px 16px",marginBottom:12}}>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:8}}>Cumulative P/L</div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",overflow:"visible"}}>
            <line x1={PAD} y1={sy(0)} x2={W-PAD} y2={sy(0)} stroke={K.bd2} strokeWidth="1" strokeDasharray="3,3"/>
            <polyline fill={`${color}15`} stroke="none" points={`${pts} ${areaClose}`}/>
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts}/>
            {cumulative.map((p,i)=>i===cumulative.length-1?<circle key={i} cx={sx(i)} cy={sy(p.cum)} r="3" fill={color}/>:null)}
          </svg>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:K.mt,marginTop:4}}>
            <span>{cumulative[0]?.date}</span><span style={{color,fontWeight:700}}>{isPos?"+":""}${f(cumulative[cumulative.length-1]?.cum||0)}</span><span>{cumulative[cumulative.length-1]?.date}</span>
          </div>
        </div>
      );
    })()}
    <Nt c={K.yl}>All gambling winnings are taxable income. Keep records year-round. Export this ledger each tax season.</Nt>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
      <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>Filter:</span>
      <select style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterBook} onChange={e=>setFilterBook(e.target.value)}>
        <option value="All">All Books</option>
        {[...new Set(entries.map(e=>e.book))].sort().map(b=><option key={b}>{b}</option>)}
      </select>
      <select style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
        <option value="All">All Types</option>
        {["Bonus Conversion","Profit Boost","First Bet Hedge","Arbitrage","Middle","+EV Bet","Other"].map(t=><option key={t}>{t}</option>)}
      </select>
      <input type="date" style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} title="From date"/>
      <input type="date" style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterTo} onChange={e=>setFilterTo(e.target.value)} title="To date"/>
      {(filterBook!=='All'||filterType!=='All'||filterFrom||filterTo)&&
        <button onClick={()=>{setFilterBook('All');setFilterType('All');setFilterFrom('');setFilterTo('');}} style={{padding:"4px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>✕ Clear</button>}
    </div>
    {(()=>{
      const filteredEntries = entries.filter(e => {
        if(filterBook!=='All' && e.book!==filterBook) return false;
        if(filterType!=='All' && e.type!==filterType) return false;
        if(filterFrom && e.date && e.date < filterFrom) return false;
        if(filterTo && e.date && e.date > filterTo) return false;
        return true;
      });
      if(!filteredEntries.length) return entries.length>0
        ?<div style={{textAlign:"center",padding:24,color:K.mt,fontSize:12}}>No entries match your filters.</div>
        :<div style={{textAlign:"center",padding:"32px 16px",color:K.mt}}>
            <div style={{fontSize:32,marginBottom:8}}>📒</div>
            <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>No entries yet</div>
            <div style={{fontSize:11,color:K.mt}}>Every promo you convert goes here. Start with the Bonus Bet Converter.</div>
          </div>;
      return (<div style={{overflowX:"auto",marginTop:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Date","Book","Type","Bonus","Hedge","Profit","CLV",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{filteredEntries.map(e=>{
          const editing = editId === e.id;
          const iStyle = {...S.input, padding:"3px 6px", fontSize:11};
          if(editing) return (
            <tr key={e.id} style={{background:`${K.ac}08`}}>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...iStyle,width:110}} type="date" value={editForm.date||''} onChange={ev=>setEditForm(f=>({...f,date:ev.target.value}))}/></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><select style={{...iStyle,width:110}} value={editForm.book||''} onChange={ev=>setEditForm(f=>({...f,book:ev.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><select style={{...iStyle,width:130}} value={editForm.type||''} onChange={ev=>setEditForm(f=>({...f,type:ev.target.value}))}>{["Bonus Conversion","Profit Boost","First Bet Hedge","Arbitrage","Middle","+EV Bet","Other"].map(t=><option key={t}>{t}</option>)}</select></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...iStyle,width:70}} value={editForm.bonus||''} onChange={ev=>setEditForm(f=>({...f,bonus:ev.target.value}))} placeholder="$"/></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...iStyle,width:70}} value={editForm.hedge||''} onChange={ev=>setEditForm(f=>({...f,hedge:ev.target.value}))} placeholder="$"/></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...iStyle,width:70}} value={editForm.profit||''} onChange={ev=>setEditForm(f=>({...f,profit:ev.target.value}))} placeholder="$"/></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...iStyle,width:70}} value={editForm.myOdds||''} onChange={ev=>setEditForm(f=>({...f,myOdds:ev.target.value}))} placeholder="my"/></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,whiteSpace:"nowrap",display:"flex",gap:4,alignItems:"center"}}>
                <button onClick={commitEdit} style={{padding:"3px 8px",background:K.gn,border:"none",borderRadius:4,color:K.bg,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:font}}>✓</button>
                <button onClick={cancelEdit} style={{padding:"3px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>✕</button>
              </td>
            </tr>
          );
          return (<tr key={e.id}>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.date}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{e.book}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(K.ac)}>{e.type}</span></td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.bonus?`$${e.bonus}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.hedge?`$${e.hedge}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:parseFloat(e.profit)>=0?K.gn:K.rd,fontWeight:600}}>{parseFloat(e.profit)>=0?"+":""}${e.profit}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{(()=>{if(!e.myOdds||!e.closingOdds)return<span style={{color:K.mt}}>—</span>;const my=toD(e.myOdds),cl=toD(e.closingOdds);if(my<=1||cl<=1)return<span style={{color:K.mt}}>—</span>;const clv=(my/cl-1)*100;return<span style={{color:clv>=0?K.gn:K.rd,fontWeight:600}}>{clv>=0?"+":""}{f(clv,2)}%</span>;})()}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,whiteSpace:"nowrap"}}>
              <span onClick={()=>startEdit(e)} style={{cursor:"pointer",color:K.ac,fontSize:11,marginRight:8}} title="Edit">✎</span>
              <span onClick={()=>del(e.id)} style={{cursor:"pointer",color:K.rd,fontSize:10}} title="Delete">✕</span>
            </td>
          </tr>);
        })}</tbody>
      </table>
    </div>);
    })()}
    {entries.length>=3&&(()=>{
      const byMonth={};
      entries.forEach(e=>{
        const m=e.date?e.date.slice(0,7):"Unknown";
        if(!byMonth[m]) byMonth[m]={profit:0,count:0};
        byMonth[m].profit+=parseFloat(e.profit)||0;
        byMonth[m].count++;
      });
      const months=Object.entries(byMonth).sort((a,b)=>b[0].localeCompare(a[0]));
      return (<div style={{...S.card,background:K.s2,border:`1px solid ${K.bd}`,marginTop:12}}>
        <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Monthly Breakdown</div>
        {months.map(([month,d])=>(
          <div key={month} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`}}>
            <span style={{fontSize:12,color:K.dm}}>{month}</span>
            <span style={{fontSize:12,color:K.mt}}>{d.count} entries</span>
            <span style={{fontSize:13,fontWeight:600,color:d.profit>=0?K.gn:K.rd}}>{d.profit>=0?"+":""}${f(d.profit)}</span>
          </div>
        ))}
      </div>);
    })()}
    {total>0&&<div style={{...S.card,background:K.s2,border:`1px solid ${K.bd}`,marginTop:12}}>
      <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Federal Tax Estimate</div>
      <div style={{fontSize:10,color:K.mt,marginBottom:10}}>Gambling winnings are ordinary income. Estimate only — consult a tax professional.</div>
      {[[0.22,"22% bracket"],[0.24,"24% bracket"],[0.32,"32% bracket"]].map(([rate,label])=>(
        <RR key={rate} l={label} v={`Owe ~$${f(total*rate)} · Keep $${f(total*(1-rate))}`} c={K.yl}/>
      ))}
      <Nt c={K.yl}>Report all winnings even without a W-2G. You may deduct gambling losses up to your winnings if you itemize deductions. Keep Form W-2G records.</Nt>
    </div>}
    {entries.length>=1&&(()=>{
      const months={}; entries.forEach(e=>{const m=e.date?e.date.slice(0,7):"?"; if(!months[m])months[m]=0; months[m]+=(parseFloat(e.profit)||0);});
      const monthVals=Object.values(months); const bestMonth=monthVals.length?Math.max(...monthVals):0; const bestMonthKey=Object.entries(months).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
      const conversionEntries=entries.filter(e=>e.type==="Bonus Bet"||e.type==="Profit Boost");
      const avgConv=conversionEntries.length?conversionEntries.reduce((s,e)=>s+(parseFloat(e.profit)||0),0)/conversionEntries.length:0;
      const card=`PromoGrind Report Card 📊\n──────────────────\nTotal Profit: $${f(total)}\nBest Month: ${bestMonthKey} ($${f(bestMonth)})\nEntries: ${entries.length} logged\nAvg per Entry: $${f(avgConv)}\nEst. Tax @ 22%: -$${f(total*0.22)} | Keep: $${f(total*0.78)}\n──────────────────\nTrack yours free: vaultsparkstudios.com/promogrind/`;
      const [copiedReport,setCopiedReport]=React.useState(false);
      const copyReport=()=>{try{navigator.clipboard.writeText(card);}catch(e){} setCopiedReport(true); setTimeout(()=>setCopiedReport(false),2000);};
      return (
        <div style={{...S.card,background:K.s2,border:`1px solid ${K.bd}`,marginTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:K.pp,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>All-Time Report Card</div>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:10}}>
            <div><div style={{fontSize:9,color:K.mt}}>TOTAL PROFIT</div><div style={S.big(total>=0?K.gn:K.rd)}>${f(total)}</div></div>
            <div><div style={{fontSize:9,color:K.mt}}>BEST MONTH</div><div style={{...S.big(K.ac),fontSize:18}}>${f(bestMonth)}</div><div style={{fontSize:9,color:K.mt}}>{bestMonthKey}</div></div>
            <div><div style={{fontSize:9,color:K.mt}}>ENTRIES</div><div style={{...S.big(K.tx),fontSize:18}}>{entries.length}</div></div>
            <div><div style={{fontSize:9,color:K.mt}}>AVG PER ENTRY</div><div style={{...S.big(K.yl),fontSize:18}}>${f(avgConv)}</div></div>
          </div>
          <button onClick={copyReport} style={{padding:"7px 16px",background:copiedReport?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>
            {copiedReport?"✓ Copied!":"📋 Copy Report Card"}
          </button>
        </div>
      );
    })()}
  </div>);
};

// ═══ FAQ ACCORDION ═══
const FaqAccordion = () => {
  const [open, setOpen] = useState(null);
  const faqs = [
    ["Is this legal in my state?","Yes, if your state has legal online sports betting. As of 2026, 30+ states allow it. This tool is a math calculator — it doesn't place bets or access sportsbook systems. It's no different from a spreadsheet. The only legal question is whether online sports betting is legal in your state, not whether you can use a calculator."],
    ["Can I get banned from sportsbooks?","You can't get 'banned' outright for matched betting — but books can limit your maximum bet size or exclude you from specific promotions. This typically happens to accounts that ONLY place hedging bets with no recreational activity. To stay under the radar: place some small normal bets, don't always withdraw immediately after a bonus, vary your bet amounts, and stick to main lines rather than props."],
    ["How much can I realistically make?","Welcome promos across 8-10 books: $1,000-$2,500 one-time. Daily profit boosts ongoing: $300-$1,000/month. These numbers assume you're in a state with 6-8 books and you're consistent with daily boosts. Some power users in NJ or PA who run all books aggressively see $1,500+/month ongoing. The income estimator in the Calculate tab gives you personalized projections."],
    ["Do I need to know anything about sports?","No. This is pure math. You don't need to know the teams, the players, or anything about sports. You're just placing bets on both sides of the same event — the outcome doesn't matter. Many of the most successful promo grinders have no sports knowledge at all."],
    ["Is this gambling?","Not in the traditional sense. Traditional gambling means taking a risk for the chance of reward. Matched betting eliminates the risk by betting both sides. When done correctly, the math guarantees a profit regardless of the outcome. You're exploiting the bonus value, not the game result. The +EV betting approach (Live Scanner) does involve variance, but even that is profitable over large sample sizes."],
    ["What if I lose a bet?","With hedging (Bonus Bet, First Bet, Profit Boost), you can't 'lose' in the traditional sense — both sides are covered. Your worst case is a smaller profit than expected (if the hedge math doesn't work out perfectly). The only risk is if you forget to place the hedge, or place it at the wrong book or wrong amount. Always set up both bets before either game starts."],
  ];
  return (<div style={{marginTop:16,marginBottom:8}}>
    <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Frequently Asked Questions</div>
    {faqs.map(([q,a],i)=>(
      <div key={i} style={{borderBottom:`1px solid ${K.bd}`,marginBottom:0}}>
        <button onClick={()=>setOpen(o=>o===i?null:i)} style={{width:"100%",textAlign:"left",background:"none",border:"none",padding:"10px 0",color:K.tx,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:font,fontSize:12,fontWeight:600}}>
          <span>{q}</span>
          <span style={{color:K.mt,fontSize:10,marginLeft:12}}>{open===i?"▲":"▼"}</span>
        </button>
        {open===i&&<div style={{fontSize:12,color:K.dm,lineHeight:1.7,paddingBottom:12}}>{a}</div>}
      </div>
    ))}
  </div>);
};

// ═══ KNOWLEDGE BASE ═══
const KB = () => (<div style={S.card}>
  <Tl t="Complete Knowledge Base"/>
  <div style={{fontSize:13,lineHeight:1.8,color:K.dm}}>

    <div style={{...S.tag(K.gn),marginBottom:12,fontSize:12}}>START HERE IF YOU'RE NEW</div>

    <div style={S.helpH}>What Is This Tool?</div>
    <p>This is a math calculator for sports betting promotions. Sportsbooks (like DraftKings, FanDuel, BetMGM) give away free money through promotions to attract new customers. This tool calculates exactly how to turn those promotions into guaranteed cash — no sports knowledge needed, no gambling involved.</p>

    <div style={S.helpH}>Is This Legal?</div>
    <p>Yes. Matched betting and promo conversion are completely legal in every US state where online sports betting is legal (30+ states). This tool is a calculator — like a mortgage calculator or tax calculator. It doesn't place bets, access any sportsbook, or handle money. Companies like ProfitDuel, OddsJam, and DarkHorse Odds charge $49-$99/month for similar tools. This one is free. You can share it with anyone.</p>

    <div style={S.helpH}>How Much Can I Make?</div>
    <p>Welcome promos (one-time, across 8-10 books): $1,000-$2,500. Daily profit boosts (recurring, 15 min/day): $300-$1,000/month. These are realistic numbers based on current sportsbook promos. This is a side hustle, not a get-rich-quick scheme.</p>

    <FaqAccordion/>

    <div style={{...S.tag(K.ac),marginBottom:12,marginTop:24,fontSize:12}}>GLOSSARY — EVERY TERM EXPLAINED</div>

    <div style={S.helpH}>Odds Formats</div>
    <p><span style={S.helpTerm}>American Odds (+/-)</span> — The standard US format. <strong>Positive (+200)</strong>: how much you WIN on a $100 bet. +200 means bet $100, win $200 profit. <strong>Negative (-150)</strong>: how much you must BET to win $100. -150 means bet $150 to win $100 profit. The bigger the + number, the less likely the outcome. The bigger the - number, the more likely.</p>
    <p><span style={S.helpTerm}>Decimal Odds (2.50)</span> — Your total return per $1. Decimal 2.50 means bet $1, get $2.50 back ($1.50 profit + $1 stake). Used in Europe.</p>
    <p><span style={S.helpTerm}>Implied Probability</span> — What the odds suggest about the chance of winning. -200 odds = 66.7% chance. +200 odds = 33.3% chance. Important: because of the vig, implied probabilities from a sportsbook always add up to MORE than 100%.</p>

    <div style={S.helpH}>Key Betting Terms</div>
    <p><span style={S.helpTerm}>Vig (Vigorish) / Juice</span> — The sportsbook's built-in profit margin on every bet. Think of it as a service fee. Standard vig is about 4.5%. This is why a "fair" coin flip isn't +100/+100 — it's -110/-110. That extra $10 you have to risk on each side is the vig. The sportsbook collects it regardless of who wins.</p>
    <p><span style={S.helpTerm}>Moneyline</span> — A bet on which team wins. No point spread. Just pick the winner. Example: Chiefs -200 / Bills +170. Bet the Chiefs at -200 = bet $200 to win $100. Bet the Bills at +170 = bet $100 to win $170.</p>
    <p><span style={S.helpTerm}>Spread</span> — A bet on the margin of victory. Chiefs -3.5 means they must win by 4+ points for your bet to win. Bills +3.5 means they can lose by up to 3 points and you still win.</p>
    <p><span style={S.helpTerm}>Total (Over/Under)</span> — A bet on the combined score of both teams. Over 47.5 means both teams must score 48+ combined points. Under means 47 or fewer.</p>
    <p><span style={S.helpTerm}>Parlay</span> — Combining multiple bets into one. ALL legs must win for the parlay to pay. Higher potential payout, higher risk. A 4-leg parlay might pay +1000 but all 4 must hit.</p>
    <p><span style={S.helpTerm}>Player Props</span> — Bets on individual player stats. "Patrick Mahomes Over 275.5 passing yards" is a player prop. These are where middle bet opportunities are most common because books often disagree on player lines.</p>

    <div style={S.helpH}>Promo Types</div>
    <p><span style={S.helpTerm}>Bonus Bet / Free Bet</span> — A bet credit from the sportsbook. If it wins, you get the PROFIT only — the bonus credit disappears. A $200 bonus bet at +300 that wins pays you $600 (not $800). The stake is NOT returned. This is the most important thing to understand for conversions.</p>
    <p><span style={S.helpTerm}>Profit Boost</span> — A percentage increase on your winnings. A 50% profit boost on a bet that would normally win $100 now wins $150. You're using your OWN money — the boost just increases the payout. These are recurring (daily) and are the long-term income source.</p>
    <p><span style={S.helpTerm}>First Bet Safety Net</span> — Your first cash bet at a book is "insured." If it loses, you get the amount back as bonus bets. BetMGM offers up to $1,500, bet365 up to $1,000. This is the highest-value welcome promo type.</p>
    <p><span style={S.helpTerm}>Deposit Match</span> — The sportsbook matches a percentage of your deposit with bonus funds. A "20% match up to $1,000" means deposit $5,000, get $1,000 in bonus funds. Usually comes with rollover requirements.</p>
    <p><span style={S.helpTerm}>Rollover / Playthrough</span> — The amount you must wager before bonus funds become withdrawable cash. A 5x rollover on $500 means you must place $2,500 in total bets. Each bet costs you a tiny amount (the vig), so the true value of the bonus is less than face value.</p>

    <div style={S.helpH}>Strategy Terms</div>
    <p><span style={S.helpTerm}>Hedge</span> — Placing a second bet on the opposite outcome to guarantee profit (or limit loss) regardless of who wins. Always at a DIFFERENT sportsbook from your original bet.</p>
    <p><span style={S.helpTerm}>Arbitrage (Arb)</span> — Betting both sides of an event at different books where the combined odds guarantee profit. Requires both sides to be priced favorably at different books simultaneously.</p>
    <p><span style={S.helpTerm}>+EV (Positive Expected Value)</span> — A bet where the true probability of winning is higher than the odds suggest. Over many such bets, you profit. Unlike arbing, individual +EV bets can lose — the edge plays out over volume.</p>
    <p><span style={S.helpTerm}>Conversion Rate</span> — The percentage of a bonus bet you extract as real cash. 70%+ is excellent. A $200 bonus at 75% conversion = $150 real cash in your pocket.</p>
    <p><span style={S.helpTerm}>Middle</span> — Betting opposite sides at different lines where both bets can win if the result lands in the gap between the lines.</p>
    <p><span style={S.helpTerm}>Closing Line Value (CLV)</span> — Whether the odds you bet at were better than the final odds when the game starts. Consistently beating the closing line is the strongest indicator of long-term profitability.</p>
    <p><span style={S.helpTerm}>Getting Limited / Promo Banned</span> — Sportsbooks can reduce your maximum bet size or exclude you from promotions if they suspect you're purely converting promos. To avoid this: place some small "normal" bets, don't withdraw too often, stick to main lines, and vary your bet amounts.</p>

    <div style={{...S.tag(K.yl),marginBottom:12,marginTop:24,fontSize:12}}>STEP-BY-STEP WALKTHROUGH</div>

    <div style={S.helpH}>Phase 1: Setup (Day 1-3)</div>
    <p>1) Download 6-10 sportsbook apps (DraftKings, FanDuel, BetMGM, Caesars, bet365, ESPN BET, Fanatics, BetRivers). 2) Create an account at each — you'll need your SSN and ID for verification. 3) Deposit the minimum required at each ($5-$10). 4) Do NOT place any bets yet. Get all accounts funded first so you can move fast when hedging.</p>
    <div style={{background:"#161d2a",border:"1px dashed #1e293b",borderRadius:8,padding:16,margin:"12px 0",textAlign:"center"}}><div style={{fontSize:11,color:"#64748b"}}>📹 Video walkthrough: Setting up accounts — coming soon</div></div>

    <div style={S.helpH}>Phase 2: Welcome Promos (Day 3-14)</div>
    <p>Start with "Safety Net" books (BetMGM, bet365, BetRivers). Use the First Bet Hedge calculator. Place your qualifying bet and IMMEDIATELY hedge at another book. Win = profit from hedge. Lose = get bonus bets back, which you convert in Phase 3. Then do the "Bet & Get" books (DraftKings, FanDuel, Fanatics, ESPN BET). These give bonus bets after a small qualifying wager.</p>
    <div style={{background:"#161d2a",border:"1px dashed #1e293b",borderRadius:8,padding:16,margin:"12px 0",textAlign:"center"}}><div style={{fontSize:11,color:"#64748b"}}>📹 Video walkthrough: Welcome promos step by step — coming soon</div></div>

    <div style={S.helpH}>Phase 3: Convert Everything (Day 7-14)</div>
    <p>Use the Bonus Bet Converter for every bonus bet you've accumulated. Place each bonus on an underdog (+250 to +400 odds), hedge the other side at a different book. Target 70%+ conversion rate. Log every conversion in the P/L Ledger.</p>

    <div style={S.helpH}>Phase 4: Daily Profit Boosts (Ongoing)</div>
    <div style={{background:"#161d2a",border:"1px dashed #1e293b",borderRadius:8,padding:16,margin:"0 0 12px",textAlign:"center"}}><div style={{fontSize:11,color:"#64748b"}}>📹 Video walkthrough: Daily profit boosts — coming soon</div></div>
    <p>After welcome promos are done, check your sportsbook apps each morning for profit boosts. Use the Profit Boost Converter. DraftKings, FanDuel, and Caesars offer 2-5 boosts daily. At $5-$15 per conversion, that's $300-$1,000/month. This is 15-20 minutes of work per day.</p>

    <div style={S.helpH}>Phase 5: Advanced — +EV Betting (Optional)</div>
    <p>Use the No-Vig calculator to find true probabilities. Compare against sportsbook odds with the +EV calculator. Unlike hedging/arbing, +EV betting involves risk per bet but is profitable over hundreds of bets. Track your Closing Line Value to verify you have an edge.</p>

    <div style={{...S.tag(K.rd),marginBottom:12,marginTop:24,fontSize:12}}>IMPORTANT WARNINGS</div>
    <p><strong>This is not gambling advice.</strong> This is a math education tool. You must be 21+ in most states. Only bet where sports betting is legal in your state. All winnings are taxable — keep records. Never bet more than you can afford to lose. If you or someone you know has a gambling problem, call 1-800-GAMBLER.</p>
    <p><strong>Account longevity:</strong> 1) Never hedge at the same sportsbook. 2) Place some small "recreational" bets between conversions. 3) Don't withdraw too frequently. 4) Stick to main lines (moneyline, spread, totals) — player props get you limited faster. 5) Vary your bet amounts (don't always bet round numbers).</p>

    <div style={{...S.tag(K.gn),marginBottom:12,marginTop:24,fontSize:12}}>TAX GUIDE</div>

    <div style={S.helpH}>Reporting Your Winnings</div>
    <p>All gambling winnings are taxable ordinary income in the US, regardless of amount. You must report them even if you don't receive a W-2G form. Sportsbooks issue W-2Gs for winnings of $600+ that are 300x the wager or more, and for any winnings of $5,000+. Report everything on Schedule 1 (Form 1040), Line 8b.</p>

    <div style={S.helpH}>Deducting Losses</div>
    <p>You can deduct gambling losses — but only up to the amount of your winnings, and only if you itemize deductions (Schedule A). You cannot net losses against winnings and report only the difference. If you won $2,000 and lost $1,500, you report $2,000 in income and may deduct $1,500 separately. The P/L Ledger on this app is designed to track exactly this — export it at tax time.</p>

    <div style={S.helpH}>Quarterly Estimated Taxes</div>
    <p>If you expect to owe more than $1,000 in federal taxes from gambling, consider making quarterly estimated payments (Form 1040-ES) to avoid underpayment penalties. Quarterly deadlines are typically April 15, June 15, September 15, and January 15. The Tax Estimate section in the P/L Ledger gives you a running estimate.</p>

    <div style={S.helpH}>Professional Gambler Status</div>
    <p>If gambling is your primary source of income and you treat it like a business (records, regular activity, profit motive), you may qualify as a professional gambler. This allows you to deduct expenses (software, travel, data subscriptions) on Schedule C, but subjects your income to self-employment tax. Consult a CPA familiar with gambling income before claiming this status.</p>

    <div style={{...S.tag(K.pp),marginBottom:12,marginTop:24,fontSize:12}}>STATE AVAILABILITY GUIDE</div>

    <div style={S.helpH}>Which Sportsbooks Operate Where</div>
    <p>Online sports betting is legal in 30+ US states as of 2026. Not all sportsbooks operate in every legal state. Here are the major books and their general availability:</p>
    <p><span style={S.helpTerm}>DraftKings</span> — Available in most legal states (20+). One of the widest footprints.</p>
    <p><span style={S.helpTerm}>FanDuel</span> — Available in most legal states (20+). Typically matches DraftKings availability.</p>
    <p><span style={S.helpTerm}>BetMGM</span> — Available in 15+ states. Strong presence in NJ, PA, MI, CO, TN, VA, IN, WV, AZ, NV.</p>
    <p><span style={S.helpTerm}>Caesars</span> — Available in 15+ states. Strong in states where Caesars has casino properties.</p>
    <p><span style={S.helpTerm}>bet365</span> — Available in NJ, CO, IA, OH, VA, KY, and expanding. Smaller US footprint but excellent odds quality.</p>
    <p><span style={S.helpTerm}>ESPN BET (PENN)</span> — Available in 15+ states.</p>
    <p><span style={S.helpTerm}>Fanatics</span> — Rapidly expanding, now 15+ states after acquiring PointsBet US.</p>
    <p><span style={S.helpTerm}>BetRivers</span> — Available in 10+ states. Strongest in PA, IL, MI, IN, CO, VA, AZ, NY.</p>
    <p><span style={S.helpTerm}>States with the most books (best for promo grinding)</span>: New Jersey, Pennsylvania, Colorado, Michigan, Virginia, Ohio, Indiana, Arizona, New York.</p>
    <p><span style={S.helpTerm}>Check current availability</span>: Each sportsbook&apos;s app or website will tell you if they operate in your state during account creation. Availability changes as new states legalize.</p>

    <div style={{...S.tag(K.ac),marginBottom:12,marginTop:24,fontSize:12}}>STAKING PLAN GUIDE</div>

    <div style={S.helpH}>Flat Betting</div>
    <p>Bet the same dollar amount every time — typically 1-2% of bankroll. $1,000 bankroll = $10-$20 per bet. Simple, safe, and appropriate when you are not sure of your exact edge. You can absorb 50-100 consecutive losses without busting. Best for matched betting and promo conversions where every bet has roughly the same structure.</p>

    <div style={S.helpH}>Kelly Criterion</div>
    <p>Bets proportional to your edge: <span style={{fontFamily:font,color:K.ac}}>bet% = (p × b – q) / b</span> where p = win probability, b = net odds, q = loss probability. Full Kelly maximizes long-term bankroll growth but causes large drawdowns. Most professional +EV bettors use 20–33% (Quarter Kelly) to reduce variance while capturing most of the growth benefit.</p>

    <div style={S.helpH}>Proportional (% of bankroll)</div>
    <p>Bet a fixed percentage of your CURRENT bankroll each time. As the bankroll grows, bets grow. As it shrinks, bets shrink — protecting you from ruin. Common rule: 1% per unit, 2 units on strong plays, 0.5 units on weaker spots. Requires discipline to scale down after losses.</p>

    <table style={{width:"100%",borderCollapse:"collapse",marginTop:12,fontSize:11}}>
      <thead><tr>{["Style","Risk Level","Best For","Avg Bet ($1000 BR)"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10}}>{h}</th>)}</tr></thead>
      <tbody>{[
        ["Flat 1%","Low","All bettors, beginners","$10"],
        ["Quarter Kelly","Medium","Verified +EV bettors","$5-25 (varies)"],
        ["Half Kelly","Med-High","Experienced, high confidence","$10-50 (varies)"],
        ["Full Kelly","High","Experts only, high-volume","Variable"],
      ].map(([s,r,b,a])=><tr key={s}><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.tx,fontWeight:600}}>{s}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.dm}}>{r}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.dm}}>{b}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.ac}}>{a}</td></tr>)}</tbody>
    </table>

    <div style={{...S.tag(K.yl),marginBottom:12,marginTop:24,fontSize:12}}>PROMO CALENDAR</div>

    <div style={S.helpH}>Best Times of Year for Promo Grinding</div>
    <p>Sportsbooks spend the most on promos during high-profile events when they compete hardest for new depositors. Plan your promo calendar around these windows:</p>

    <table style={{width:"100%",borderCollapse:"collapse",marginTop:12,fontSize:11}}>
      <thead><tr>{["Period","Event","Why It's Big","Typical Promos"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10}}>{h}</th>)}</tr></thead>
      <tbody>{[
        ["Early September","NFL Kickoff","Biggest betting week of year","Profit boosts, reload bonuses, enhanced parlays"],
        ["Late January","Super Bowl","Single biggest sportsbook event","Massive first-bet offers, odds boosts, prop specials"],
        ["March","March Madness","Weeks of high-volume betting","Parlay insurance, bracket contests, daily boosts"],
        ["October","MLB Playoffs / NBA Tip-off","Dual-sport overlap = more promos","Multi-sport boosts, loyalty promos"],
        ["June","NBA Finals / NHL Playoffs","Overlap period","Series price boosts, game specials"],
        ["Late March","Opening Day MLB","New season deposits","Reload promos, first-bet offers"],
      ].map(([period,event,why,promos])=><tr key={period}><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.yl,fontWeight:600}}>{period}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.tx}}>{event}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.dm}}>{why}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.mt}}>{promos}</td></tr>)}</tbody>
    </table>
    <p>Books also run promos for: NBA All-Star Weekend, Masters golf, Kentucky Derby, World Cup (if applicable), college football bowl season. Check your apps weekly — daily boosts run year-round regardless of calendar.</p>

    <div style={{...S.tag(K.gn),marginBottom:12,marginTop:24,fontSize:12}}>BOOK-SPECIFIC GUIDES</div>

    <div style={S.helpH}>DraftKings</div>
    <p><span style={S.helpTerm}>Best promos:</span> Daily profit boost tokens (2-3/day), stepped-up parlays, SGP profit boosts. Welcome offer: Bet $5, Get $200 in bonus bets. Conversion rate on DK bonus bets: 65-72%. Promos reset daily around 8am ET — check the Promotions tab each morning. DK has the widest variety of daily boosts across all sports. Account longevity tip: place occasional small recreational bets on main lines.</p>

    <div style={S.helpH}>FanDuel</div>
    <p><span style={S.helpTerm}>Best promos:</span> "No Sweat" first SGP of the day, daily profit boost tokens, parlay insurance. Welcome offer: Up to $300/day Bet Reset for 10 days. FanDuel No Sweat bets work like First Bet Insurance — if it loses, you get the stake back as bonus bets (up to the limit). Conversion: 65-72%. FD tends to offer more SGP-specific boosts than other books.</p>

    <div style={S.helpH}>BetMGM</div>
    <p><span style={S.helpTerm}>Best promos:</span> Weekly deposit bonus (25% up to $100), daily odds boosts, one-game parlays. Welcome offer: Up to $1,500 First Bet Safety Net — the highest-value safety net on the market. Conversion on $1,500 bonus bets at 70%: ~$1,050 real cash. BetMGM tends to limit aggressive bonus converters faster than other books — vary your bet amounts and mix in recreational bets.</p>

    <div style={S.helpH}>Caesars</div>
    <p><span style={S.helpTerm}>Best promos:</span> Rotating 100% profit boost tokens ($25 max each), odds boosts, parlay insurance. Welcome offer: Bet $1, Get 10× 100% Profit Boost Tokens. Caesars Rewards points accumulate with every bet — these convert to real cash or hotel/resort value. Caesars has some of the strictest account limitation policies; be conservative with conversion amounts.</p>

    <div style={S.helpH}>bet365</div>
    <p><span style={S.helpTerm}>Best promos:</span> Early payout offers, multi-sport parlay boosts. Welcome offer: Choose between Bet $10 Get $365 Bonus Bets OR a $1K Safety Net. bet365 tends to have sharper lines than US-focused books, making it excellent for line shopping and +EV betting. Available in fewer US states (NJ, CO, IA, OH, VA, KY and expanding).</p>

    <div style={S.helpH}>ESPN BET</div>
    <p><span style={S.helpTerm}>Best promos:</span> Weekly profit boost tokens, featured parlay boosts, ESPN+ integration specials. Welcome offer: Bet $5, Get $200 + Deposit Match up to $300. ESPN BET is newer (launched late 2023) and tends to be more aggressive with promos to gain market share. Conversion: 65-70%. Check the ESPN app daily — promos are often tied to featured games.</p>

    <div style={S.helpH}>Fanatics</div>
    <p><span style={S.helpTerm}>Best promos:</span> Daily FanCash bonuses, loyalty rewards tied to Fanatics purchases, profit boosts. Welcome offer: Bet $5/day for 10 days, Get $200 FanCash. FanCash is Fanatics' bonus currency — it can be converted to cash at ~70% via the hedge method or spent on Fanatics merchandise. Uniquely, Fanatics integrates with your Fanatics shopping account for additional rewards.</p>

    <div style={S.helpH}>BetRivers</div>
    <p><span style={S.helpTerm}>Best promos:</span> iRush Rewards points (high earn rate), 2nd chance parlays, weekly profit boosts. Welcome offer: Up to $500 Second Chance Bet. BetRivers has the best loyalty program in US sports betting — iRush points earn fast and convert to bonus cash. Available in 10+ states with strong presence in PA, IL, MI. Generally less aggressive about account limitations than larger books.</p>
  </div>
</div>);

// ═══ TAB SYSTEM ═══
// ═══ LIVE SCANNER (Pro) ═══
const SPORTS_LIST = [
  { key:"americanfootball_nfl",  label:"NFL"  },
  { key:"basketball_nba",        label:"NBA"  },
  { key:"baseball_mlb",          label:"MLB"  },
  { key:"icehockey_nhl",         label:"NHL"  },
  { key:"americanfootball_ncaaf",label:"NCAAF"},
  { key:"soccer_usa_mls",        label:"MLS"  },
];

const PROP_MARKETS = {
  americanfootball_nfl: ['player_pass_yds','player_rush_yds','player_receptions','player_reception_yds','player_pass_tds'],
  basketball_nba: ['player_points','player_rebounds','player_assists','player_threes'],
  baseball_mlb: ['batter_home_runs','pitcher_strikeouts','batter_hits'],
  icehockey_nhl: ['player_points','player_shots_on_goal'],
};

const detectArbs = (games) => {
  const opps = [];
  for (const game of games) {
    const mktKeys = [...new Set((game.bookmakers||[]).flatMap(bm=>(bm.markets||[]).map(m=>m.key)))];
    for (const mktKey of mktKeys) {
      const best = {};
      for (const bm of (game.bookmakers||[])) {
        const mkt = (bm.markets||[]).find(m=>m.key===mktKey);
        if (!mkt) continue;
        for (const o of mkt.outcomes) {
          const key = mktKey==='h2h' ? o.name : `${o.name}__${o.point}`;
          if (!best[key] || o.price > best[key].price)
            best[key] = { price:o.price, book:bm.title, name:o.name, point:o.point };
        }
      }
      const entries = Object.entries(best);
      if (mktKey==='h2h' && entries.length===2) {
        const [[,l1],[,l2]] = entries;
        const d1=toD(l1.price), d2=toD(l2.price);
        if (d1<=1||d2<=1) continue;
        const margin=1/d1+1/d2;
        if (margin<1) {
          const s1=f(100*(1/d1)/margin), s2=f(100*(1/d2)/margin);
          opps.push({ game:`${game.home_team} vs ${game.away_team}`, market:'Moneyline', sport:game.sport_title, start:game.commence_time, n1:l1.name, b1:l1.book, p1:l1.price, n2:l2.name, b2:l2.book, p2:l2.price, s1, s2, roi:f((1-margin)*100,2) });
        }
      } else if (mktKey==='totals'||mktKey.startsWith('player')||mktKey.startsWith('batter')||mktKey.startsWith('pitcher')) {
        const byPt = {};
        for (const [,v] of entries) { if (!byPt[v.point]) byPt[v.point]={}; byPt[v.point][v.name]=v; }
        for (const sides of Object.values(byPt)) {
          if (!sides['Over']||!sides['Under']) continue;
          const d1=toD(sides['Over'].price), d2=toD(sides['Under'].price);
          if (d1<=1||d2<=1) continue;
          const margin=1/d1+1/d2;
          if (margin<1) {
            const s1=f(100*(1/d1)/margin), s2=f(100*(1/d2)/margin);
            const mktLabel = mktKey==='totals' ? `Total ${sides['Over'].point}` : `${mktKey.replace(/_/g,' ')} ${sides['Over'].point}`;
            opps.push({ game:`${game.home_team} vs ${game.away_team}`, market:mktLabel, sport:game.sport_title, start:game.commence_time, n1:`Over ${sides['Over'].point}`, b1:sides['Over'].book, p1:sides['Over'].price, n2:`Under ${sides['Under'].point}`, b2:sides['Under'].book, p2:sides['Under'].price, s1, s2, roi:f((1-margin)*100,2) });
          }
        }
      } else if (mktKey==='spreads') {
        for (let i=0;i<entries.length;i++) for (let j=i+1;j<entries.length;j++) {
          const [,l1]=entries[i], [,l2]=entries[j];
          if (Math.abs((l1.point||0)+(l2.point||0))>0.1) continue;
          const d1=toD(l1.price), d2=toD(l2.price);
          if (d1<=1||d2<=1) continue;
          const margin=1/d1+1/d2;
          if (margin<1) {
            const s1=f(100*(1/d1)/margin), s2=f(100*(1/d2)/margin);
            const pt1=(l1.point>0?'+':'')+l1.point, pt2=(l2.point>0?'+':'')+l2.point;
            opps.push({ game:`${game.home_team} vs ${game.away_team}`, market:`Spread`, sport:game.sport_title, start:game.commence_time, n1:`${l1.name} ${pt1}`, b1:l1.book, p1:l1.price, n2:`${l2.name} ${pt2}`, b2:l2.book, p2:l2.price, s1, s2, roi:f((1-margin)*100,2) });
          }
        }
      }
    }
  }
  return opps.sort((a,b)=>parseFloat(b.roi)-parseFloat(a.roi));
};

const detectEV = (games) => {
  const opps = [], seen = new Set();
  for (const game of games) {
    const evMktKeys = [...new Set((game.bookmakers||[]).flatMap(bm=>(bm.markets||[]).map(m=>m.key)))];
    for (const mktKey of evMktKeys) {
      for (const bm of (game.bookmakers||[])) {
        const mkt = (bm.markets||[]).find(m=>m.key===mktKey);
        if (!mkt) continue;
        for (const outcome of mkt.outcomes) {
          const ptKey = outcome.point!=null ? `_${outcome.point}` : '';
          const allPrices = (game.bookmakers||[])
            .map(b=>b.markets?.find(m=>m.key===mktKey)?.outcomes?.find(o=>o.name===outcome.name&&o.point===outcome.point)?.price)
            .filter(Boolean).map(toD).filter(d=>d>1);
          if (allPrices.length<2) continue;
          const avgProb = allPrices.reduce((s,d)=>s+1/d,0)/allPrices.length;
          const bd=toD(outcome.price); if(bd<=1) continue;
          const ev=(avgProb*(bd-1)-(1-avgProb))*100;
          const key=`${game.id}-${mktKey}-${outcome.name}${ptKey}-${bm.title}`;
          const mktLabel = mktKey==='h2h'?'ML':mktKey==='totals'?`O/U ${outcome.point}`:`${outcome.point>0?'+':''}${outcome.point}`;
          if (ev>2&&!seen.has(key)) { seen.add(key);
            opps.push({ game:`${game.home_team} vs ${game.away_team}`, sport:game.sport_title, start:game.commence_time, outcome:`${outcome.name} (${mktLabel})`, book:bm.title, price:outcome.price, fairPct:f(avgProb*100,1), bookPct:f(100/bd,1), ev:f(ev,1) });
          }
        }
      }
    }
  }
  return opps.sort((a,b)=>parseFloat(b.ev)-parseFloat(a.ev)).slice(0,50);
};

const LiveScanner = ({ proStatus, mode }) => {
  const toast = useToast();
  const [sport, setSport] = useState("americanfootball_nfl");
  const [activeTab, setActiveTab] = useState(mode==="ev-scanner"?"ev":"arb");
  const [games, setGames] = useState([]);
  const [arbs, setArbs] = useState([]);
  const [evs, setEvs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [scannerBankroll, setScannerBankroll] = useState("1000");
  const [propsMode, setPropsMode] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState("0.5");
  const intervalRef = useRef(null);
  const isActive = proStatus?.status==="active";

  const fetchOdds = async () => {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const propMkts = propsMode ? (PROP_MARKETS[sport]||[]).join(',') : '';
      const markets = ['h2h','spreads','totals',...(propMkts?[propMkts]:[])].filter(Boolean).join(',');
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/odds?sport=${sport}&markets=${markets}`;
      const resp = await fetch(url, { headers:{ Authorization:`Bearer ${session.access_token}` } });
      if (!resp.ok) { const e=await resp.json(); throw new Error(e.error||`HTTP ${resp.status}`); }
      const data = await resp.json();
      const newArbs=detectArbs(data); const newEvs=detectEV(data);
      setGames(data); setArbs(newArbs); setEvs(newEvs); setUpdated(new Date());
      if(newArbs.length||newEvs.length) {
        const ts=new Date();
        setHistory(h=>[{ts,arbCount:newArbs.length,evCount:newEvs.length,topArb:newArbs[0]||null,topEv:newEvs[0]||null,sport},...h].slice(0,20));
      }
      if(alertsEnabled && newArbs.length) {
        const best=newArbs[0];
        if(parseFloat(best.roi)>=parseFloat(alertThreshold)) {
          try{new Notification('PromoGrind Arb Found 🎯',{body:`${best.game}: +${best.roi}% ROI on ${best.b1}/${best.b2}`,icon:'/promogrind/favicon.svg'});}catch(e){}
        }
      }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(()=>{
    if(!isActive) return;
    fetchOdds();
    intervalRef.current=setInterval(fetchOdds,120_000);
    return ()=>clearInterval(intervalRef.current);
  },[sport,isActive]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    await startCheckout();
    setUpgrading(false);
  };

  if (proStatus===null) return (
    <div style={{...S.card,textAlign:"center",padding:40}}>
      <div style={{color:K.mt,fontSize:11,letterSpacing:"2px",textTransform:"uppercase"}}>Loading...</div>
    </div>
  );

  if (!isActive) return (
    <div style={S.card}>
      <div style={{textAlign:"center",padding:"32px 16px"}}>
        <div style={{...S.tag(K.yl),fontSize:12,marginBottom:16,display:"inline-block"}}>PRO MEMBERS ONLY</div>
        <div style={{fontFamily:fontD,fontSize:22,fontWeight:700,color:K.tx,marginBottom:8}}>Live Odds Scanner</div>
        <div style={{fontSize:13,color:K.dm,maxWidth:440,margin:"0 auto 24px",lineHeight:1.7}}>
          Real-time arb and +EV opportunities across every major US sportsbook, updated every 2 minutes. Finds what competitors charge $99–$199/month to show you.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,maxWidth:400,margin:"0 auto 28px",textAlign:"left"}}>
          {[["Live Arb Scanner","Auto-detects 2-way arbs across all books"],["+ EV Scanner","Finds where books are mispriced vs fair value"],["Auto-Refresh","Updates every 2 min — never miss an opportunity"],["All Major Sports","NFL, NBA, MLB, NHL, NCAAF, MLS and more"]].map(([t,d])=>(
            <div key={t} style={{padding:"10px 12px",background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
              <div style={{fontSize:11,fontWeight:700,color:K.tx,marginBottom:2}}>{t}</div>
              <div style={{fontSize:10,color:K.mt,lineHeight:1.5}}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:8}}>
          <button onClick={handleUpgrade} disabled={upgrading} style={{padding:"12px 28px",background:K.yl,border:"none",borderRadius:8,color:K.bg,fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:fontD,opacity:upgrading?0.7:1}}>
            {upgrading?"Redirecting to checkout…":"Upgrade to VaultSparked — $24.99/mo"}
          </button>
        </div>
        <div style={{fontSize:11,color:K.mt}}>Cancel anytime. Free calculators always free.</div>
      </div>
    </div>
  );

  const results = activeTab==="arb" ? arbs : evs;

  return (
    <div style={S.card}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{fontFamily:fontD,fontSize:16,fontWeight:700,color:K.tx}}>Live Scanner</div>
        <span style={S.tag(K.yl)}>PRO</span>
        <select style={{...S.input,width:100,padding:"5px 8px",fontSize:11}} value={sport} onChange={e=>setSport(e.target.value)}>
          {SPORTS_LIST.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <div style={{display:"flex",gap:0,marginLeft:"auto"}}>
          {["arb","+ev"].map(t=>(
            <button key={t} onClick={()=>setActiveTab(t==="arb"?"arb":"ev")} style={{padding:"5px 12px",fontSize:11,fontWeight:600,border:`1px solid ${K.bd2}`,background:activeTab===(t==="arb"?"arb":"ev")?K.ac:"transparent",color:activeTab===(t==="arb"?"arb":"ev")?K.bg:K.dm,cursor:"pointer",fontFamily:font,borderRadius:t==="arb"?"6px 0 0 6px":"0 6px 6px 0"}}>
              {t==="arb"?"Arb":"+ EV"}
            </button>
          ))}
        </div>
        <button onClick={fetchOdds} disabled={loading} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,cursor:"pointer",fontFamily:font}}>
          {loading?"…":"↻"}
        </button>
        <button onClick={()=>setPropsMode(p=>!p)} style={{padding:"5px 10px",background:propsMode?`${K.pp}20`:"transparent",border:`1px solid ${propsMode?K.pp:K.bd2}`,borderRadius:6,color:propsMode?K.pp:K.dm,fontSize:10,cursor:"pointer",fontFamily:font,letterSpacing:"0.5px"}}>
          {propsMode?"PROPS ON":"PROPS"}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={()=>{
            if(!alertsEnabled){
              Notification.requestPermission().then(p=>{
                if(p==='granted'){setAlertsEnabled(true);if(toast)toast('🔔 Arb alerts on',K.gn);}
                else if(toast)toast('Notifications blocked in browser settings',K.rd);
              });
            } else {setAlertsEnabled(false);if(toast)toast('🔕 Alerts off',K.mt);}
          }} style={{padding:"6px 12px",background:alertsEnabled?`${K.gn}15`:"transparent",border:`1px solid ${alertsEnabled?K.gn:K.bd2}`,borderRadius:6,color:alertsEnabled?K.gn:K.mt,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>
            {alertsEnabled?"🔔 ALERTS ON":"🔕 ALERTS"}
          </button>
          {alertsEnabled&&<input style={{...S.input,width:60,padding:"5px 8px"}} value={alertThreshold} onChange={e=>setAlertThreshold(e.target.value)} placeholder="0.5" title="Min ROI % to alert"/>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>Bankroll</span>
          <input style={{...S.input,width:80,padding:"4px 8px",fontSize:11}} value={scannerBankroll} onChange={e=>setScannerBankroll(e.target.value)} placeholder="1000"/>
        </div>
      </div>
      {updated&&<div style={{fontSize:10,color:K.mt,marginBottom:8}}>Updated {updated.toLocaleTimeString()} · Auto-refreshes every 2 min</div>}
      {error&&<div style={{...S.res(false),marginBottom:12,fontSize:12}}>{error}</div>}
      {loading&&!results.length&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>Scanning live odds…</div>}
      {!loading&&!error&&results.length===0&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>No {activeTab==="arb"?"arb opportunities":"+ EV spots"} found right now — try another sport or check back in a few minutes.</div>}
      {results.map((r,i)=>(
        activeTab==="arb"
          ? <div key={i} style={{...S.res(true),marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontWeight:700,fontSize:13,color:K.tx}}>{r.game}</div>{r.market&&r.market!=='Moneyline'&&<span style={S.tag(K.ac)}>{r.market}</span>}</div>
                <span style={{...S.tag(K.gn),fontSize:12}}>+{r.roi}% ROI</span>
              </div>
              <div style={{fontSize:11,color:K.mt,marginBottom:10}}>{r.sport} · {new Date(r.start).toLocaleDateString()}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[[r.n1,r.b1,r.p1,r.s1],[r.n2,r.b2,r.p2,r.s2]].map(([name,book,price,stake])=>(
                  <div key={name} style={{padding:"8px 10px",background:K.s3,borderRadius:6}}>
                    <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:3}}>{name}</div>
                    <div style={{fontSize:13,fontWeight:700,color:K.ac}}>{price>0?"+":""}{price}</div>
                    <div style={{fontSize:11,color:K.dm}}>{book}</div>
                    <div style={{fontSize:11,color:K.gn,fontWeight:600}}>Stake ${stake} of $100</div>
                  </div>
                ))}
              </div>
            </div>
          : <div key={i} style={{...S.res(true),marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:K.tx}}>{r.game}</div>
                <div style={{fontSize:11,color:K.dm,marginTop:2}}>{r.outcome} · {r.book} · {r.price>0?"+":""}{r.price}</div>
                <div style={{fontSize:10,color:K.mt}}>{r.sport} · {new Date(r.start).toLocaleDateString()}</div>
                {(()=>{const kb=calcKelly(parseFloat(r.fairPct),r.price,parseFloat(scannerBankroll)||1000,0.25);return kb?.ok?<div style={{fontSize:10,color:K.pp}}>Kelly 25%: ${kb.bet} of ${scannerBankroll}</div>:null;})()}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{...S.big(K.gn),fontSize:20}}>+{r.ev}% EV</div>
                <div style={{fontSize:10,color:K.mt}}>Fair: {r.fairPct}% · Book: {r.bookPct}%</div>
              </div>
            </div>
      ))}
      {history.length>0&&<div style={{marginTop:16}}>
        <button onClick={()=>setShowHistory(h=>!h)} style={{background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,padding:"5px 12px",cursor:"pointer",fontFamily:font,marginBottom:8}}>
          {showHistory?"▲ Hide":"▼ Show"} Scan History ({history.length})
        </button>
        {showHistory&&<div style={{maxHeight:280,overflowY:"auto"}}>
          {history.map((h,i)=>(
            <div key={i} style={{...S.res(true),marginBottom:6,padding:"10px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                <div style={{fontSize:11,color:K.dm}}>{h.ts.toLocaleTimeString()} · {SPORTS_LIST.find(s=>s.key===h.sport)?.label||h.sport}</div>
                <div style={{display:"flex",gap:8}}>
                  {h.arbCount>0&&<span style={S.tag(K.gn)}>{h.arbCount} arb{h.arbCount>1?"s":""}</span>}
                  {h.evCount>0&&<span style={S.tag(K.ac)}>{h.evCount} +EV</span>}
                </div>
              </div>
              {h.topArb&&<div style={{fontSize:10,color:K.mt,marginTop:4}}>Best arb: {h.topArb.game} · +{h.topArb.roi}% ROI</div>}
              {h.topEv&&<div style={{fontSize:10,color:K.mt,marginTop:2}}>Best +EV: {h.topEv.game} · +{h.topEv.ev}% EV</div>}
            </div>
          ))}
        </div>}
      </div>}
    </div>
  );
};

// ═══ LEADERBOARD ═══
const Leaderboard = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);
  useEffect(()=>{
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        // Try vault_leaderboard view first, fall back to vault_events aggregate
        let data, error;
        ({ data, error } = await supabase.from('vault_leaderboard').select('user_id,total_points,last_active').order('total_points',{ascending:false}).limit(20));
        if (error) {
          // Fallback: raw vault_events (may be slow on large tables)
          ({ data } = await supabase.from('vault_events').select('user_id,points').limit(5000));
          if (data) {
            const agg = {};
            data.forEach(r=>{ agg[r.user_id]=(agg[r.user_id]||0)+(r.points||0); });
            data = Object.entries(agg).map(([user_id,total_points])=>({user_id,total_points})).sort((a,b)=>b.total_points-a.total_points).slice(0,20);
          }
        }
        if (data) {
          setRows(data);
          if (user) {
            const idx = data.findIndex(r=>r.user_id===user.id);
            setMyRank(idx>=0?idx+1:null);
          }
        }
      } catch(e) {}
      setLoading(false);
    };
    load();
  },[]);
  const mask = (uid) => 'Grinder #'+uid.slice(-4).toUpperCase();
  const rankColor = i => i===0?K.yl:i===1?K.dm:i===2?'#cd7f32':K.mt;
  return (<div style={S.card}><Tl t="Vault Points Leaderboard" badge="LIVE" bc={K.yl}/>
    {myRank&&<Nt c={K.gn}>You are ranked #{myRank} on the leaderboard.</Nt>}
    <Nt c={K.ac}>Earn points by using calculators (1-5 pts), logging bets (2 pts), and daily logins (3 pts).</Nt>
    {loading&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>Loading leaderboard…</div>}
    {!loading&&rows.length===0&&<div style={{textAlign:"center",padding:"32px 16px",color:K.mt}}>
      <div style={{fontSize:32,marginBottom:8}}>🏆</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>Be the first on the leaderboard</div>
      <div style={{fontSize:11,color:K.mt}}>Complete promos to earn Vault Points and claim your spot.</div>
    </div>}
    {!loading&&rows.length>0&&<div style={{marginTop:12}}>
      {rows.map((r,i)=>(
        <div key={r.user_id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:i<3?`${rankColor(i)}08`:K.s2,borderRadius:6,marginBottom:4,border:`1px solid ${i<3?rankColor(i)+'30':K.bd}`}}>
          <div style={{fontSize:i<3?18:13,fontWeight:700,color:rankColor(i),width:24,textAlign:"center"}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
          <div style={{flex:1,fontSize:12,color:K.tx,fontWeight:i<3?600:400}}>{mask(r.user_id)}</div>
          <div style={{fontSize:13,fontWeight:700,color:K.yl}}>{(r.total_points||0).toLocaleString()} pts</div>
        </div>
      ))}
    </div>}
  </div>);
};

// ═══ COMMUNITY PROMO BOARD ═══
const PromoBoard = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({book:"DraftKings",promo_type:"Profit Boost",description:"",value:"",expires_at:""});
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");

  const load = async () => {
    const { data } = await supabase.from('promo_submissions')
      .select('*').eq('active',true).order('created_at',{ascending:false}).limit(50);
    if (data) setPromos(data);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const submit = async () => {
    if(!form.description||!form.book) return;
    setSubmitting(true);
    try {
      const { data:{user} } = await supabase.auth.getUser();
      await supabase.from('promo_submissions').insert({...form,user_id:user.id});
      setShowForm(false);
      setForm(f=>({...f,description:"",value:"",expires_at:""}));
      await load();
    } catch(e) {}
    setSubmitting(false);
  };

  const upvote = async (id) => {
    await supabase.from('promo_submissions').update({upvotes:supabase.rpc('increment_upvotes',{row_id:id})}).eq('id',id);
    setPromos(p=>p.map(x=>x.id===id?{...x,upvotes:(x.upvotes||0)+1}:x));
  };

  const typeColor = {
    "Profit Boost":K.yl,"Bonus Bet":K.gn,"Deposit Match":K.ac,
    "Safety Net":K.pp,"Odds Boost":K.rd,"Parlay Insurance":K.dm,"Other":K.mt
  };

  const filtered = filter==="All" ? promos : promos.filter(p=>p.book===filter||p.promo_type===filter);

  return (<div style={S.card}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <Tl t="Community Promo Board" badge="LIVE" bc={K.gn}/>
      <button onClick={()=>setShowForm(s=>!s)} style={{padding:"7px 14px",background:showForm?"transparent":K.gn,border:`1px solid ${K.gn}`,borderRadius:6,color:showForm?K.gn:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font,flexShrink:0}}>
        {showForm?"Cancel":"+ Share a Promo"}
      </button>
    </div>

    {showForm&&<div style={{...S.card,background:K.s2,marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:700,color:K.gn,marginBottom:10}}>Share what you&apos;re seeing</div>
      <div style={S.row}>
        <div style={S.col}><label style={S.label}>Book</label><select style={S.input} value={form.book} onChange={e=>setForm(f=>({...f,book:e.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></div>
        <div style={S.col}><label style={S.label}>Type</label><select style={S.input} value={form.promo_type} onChange={e=>setForm(f=>({...f,promo_type:e.target.value}))}>{["Profit Boost","Bonus Bet","Deposit Match","Safety Net","Odds Boost","Parlay Insurance","Other"].map(t=><option key={t}>{t}</option>)}</select></div>
        <In l="Value (e.g. 50%)" v={form.value} set={v=>setForm(f=>({...f,value:v}))} ph="50%"/>
        <div style={S.col}><label style={S.label}>Expires</label><input style={S.input} type="date" value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))}/></div>
      </div>
      <div style={{marginBottom:10}}><label style={S.label}>Description</label><input style={S.input} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g. 50% profit boost on NBA, max $250 extra, all game types"/></div>
      <button onClick={submit} disabled={submitting||!form.description} style={{padding:"8px 18px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font,opacity:submitting?0.7:1}}>{submitting?"Submitting…":"Submit Promo"}</button>
      <Nt c={K.yl}>Only share promos you have personally verified. Do not submit expired or inaccurate promos.</Nt>
    </div>}

    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
      {["All","DraftKings","FanDuel","BetMGM","Caesars","Profit Boost","Bonus Bet","Deposit Match"].map(f=>(
        <button key={f} onClick={()=>setFilter(f)} style={{padding:"3px 10px",background:filter===f?K.gn:"transparent",border:`1px solid ${filter===f?K.gn:K.bd2}`,borderRadius:50,color:filter===f?K.bg:K.dm,fontSize:10,cursor:"pointer",fontFamily:font}}>{f}</button>
      ))}
    </div>

    {loading&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>Loading promos…</div>}
    {!loading&&filtered.length===0&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>No promos found. Be the first to share one!</div>}
    {filtered.map(p=>(
      <div key={p.id} style={{...S.res(true),marginBottom:8,padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{fontWeight:700,fontSize:13,color:K.tx}}>{p.book}</span>
              <span style={S.tag(typeColor[p.promo_type]||K.mt)}>{p.promo_type}</span>
              {p.value&&<span style={S.tag(K.gn)}>{p.value}</span>}
            </div>
            <div style={{fontSize:12,color:K.dm,marginBottom:2}}>{p.description}</div>
            <div style={{fontSize:10,color:K.mt}}>
              {new Date(p.created_at).toLocaleDateString()}
              {p.expires_at&&` · Expires ${new Date(p.expires_at).toLocaleDateString()}`}
            </div>
          </div>
          <button onClick={()=>upvote(p.id)} style={{background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.yl,fontSize:11,padding:"4px 10px",cursor:"pointer",fontFamily:font,flexShrink:0}}>
            ▲ {p.upvotes||0}
          </button>
        </div>
      </div>
    ))}
  </div>);
};

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state={error:null}; }
  static getDerivedStateFromError(e) { return {error:e}; }
  render() {
    if(this.state.error) return (
      <div style={{fontFamily:"'JetBrains Mono','SF Mono','Fira Code',monospace",background:"#0a0e17",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:"#0f1520",border:"1px solid #1e293b",borderRadius:10,padding:32,maxWidth:440,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#f87171",marginBottom:8}}>Something went wrong</div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:16}}>{this.state.error.message}</div>
          <button onClick={()=>this.setState({error:null})} style={{padding:"8px 20px",background:"#60a5fa",border:"none",borderRadius:6,color:"#0a0e17",fontWeight:700,cursor:"pointer"}}>Try Again</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ═══ DAILY STREAK ═══
const DailyStreak = () => {
  const [streak, setStreak] = useState(null);
  useEffect(()=>{
    (async()=>{
      try {
        const {data:{user}}=await supabase.auth.getUser();
        if(!user) return;
        const {data}=await supabase.from('vault_events').select('created_at').eq('user_id',user.id).eq('event_type','daily_login').order('created_at',{ascending:false}).limit(60);
        if(!data?.length){setStreak(0);return;}
        let s=0;
        const today=new Date(); today.setHours(0,0,0,0);
        const days=[...new Set(data.map(e=>new Date(e.created_at).toISOString().split('T')[0]))];
        for(let i=0;i<days.length;i++){
          const d=new Date(days[i]); d.setHours(0,0,0,0);
          const diff=Math.round((today-d)/(1000*60*60*24));
          if(diff===i||(i===0&&diff===1)) s++;
          else break;
        }
        setStreak(s);
      } catch(e){}
    })();
  },[]);
  if(streak===null||streak===0) return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 12px",background:`${K.yl}15`,borderRadius:50,border:`1px solid ${K.yl}30`}}>
      <span style={{fontSize:14}}>🔥</span>
      <span style={{fontSize:11,fontWeight:700,color:K.yl}}>{streak} day streak</span>
    </div>
  );
};

// ═══ ACHIEVEMENTS ═══
const ACHIEVEMENTS = [
  {id:'first_calc',label:'First Steps',desc:'Used your first calculator',icon:'🧮'},
  {id:'first_ledger',label:'Record Keeper',desc:'Logged first P/L entry',icon:'📒'},
  {id:'streak_7',label:'Week Grinder',desc:'7-day login streak',icon:'🔥'},
  {id:'bets_10',label:'Active Bettor',desc:'Tracked 10+ bets',icon:'🎯'},
  {id:'profit_100',label:'First $100',desc:'$100+ total profit logged',icon:'💵'},
  {id:'profit_1000',label:'Four Figures',desc:'$1,000+ total profit logged',icon:'💰'},
  {id:'all_tabs',label:'Explorer',desc:'Visited every calculator group',icon:'🗺️'},
];

const useAchievements = (data, streak) => {
  const [earned, setEarned] = useState(()=>{
    try{return JSON.parse(localStorage.getItem('pg_achievements')||'[]');}catch{return [];}
  });
  useEffect(()=>{
    const newEarned=[...earned];
    const entries=data?.ledger||[]; const bets=data?.bets||[];
    const total=entries.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
    const visitedTabs=JSON.parse(localStorage.getItem('pg_visited_tabs')||'[]');
    const checks=[
      ['first_calc', ()=>Object.keys(data?.done||{}).length>0||entries.length>0],
      ['first_ledger', ()=>entries.length>0],
      ['streak_7', ()=>streak>=7],
      ['bets_10', ()=>bets.length>=10],
      ['profit_100', ()=>total>=100],
      ['profit_1000', ()=>total>=1000],
      ['all_tabs', ()=>visitedTabs.length>=5],
    ];
    let changed=false;
    checks.forEach(([id,check])=>{
      if(!newEarned.includes(id)&&check()){newEarned.push(id);changed=true;}
    });
    if(changed){setEarned(newEarned);try{localStorage.setItem('pg_achievements',JSON.stringify(newEarned));}catch{}}
  },[data,streak]);
  return {earned, all:ACHIEVEMENTS};
};

// ═══ GLOSSARY ═══
const GLOSSARY_TERMS = [
  ["Vig / Juice","The sportsbook's built-in profit margin on every bet. Standard vig is ~4.5% (both sides at -110)."],
  ["Moneyline","Bet on who wins outright. +200 = underdog, -200 = favorite."],
  ["Spread","Bet on margin of victory. -3.5 means team must win by 4+."],
  ["Total / Over-Under","Bet on combined score of both teams."],
  ["Parlay","Multiple bets combined — all must win. Higher payout, higher risk."],
  ["Arbitrage","Betting both sides at different books where combined odds guarantee profit."],
  ["+EV","Positive expected value — the bet profits over many repetitions."],
  ["Closing Line Value (CLV)","Whether your odds were better than the closing odds. Consistently beating the close = long-term edge."],
  ["Hedge","Placing a second bet on the opposite outcome to lock in profit."],
  ["Bonus Bet","A bet credit — only the profit is returned, not the stake."],
  ["Profit Boost","Percentage increase added to your winnings if the bet wins."],
  ["First Bet Insurance","Refund of first bet as bonus bets if it loses."],
  ["Rollover / Playthrough","Must wager X× the bonus before withdrawing."],
  ["Devig / No-Vig","Removing the sportsbook's margin to find true probabilities."],
  ["Kelly Criterion","Formula for optimal bet sizing based on your edge."],
  ["Middle","Betting opposite sides at different lines where both can win."],
  ["Round Robin","Creating all possible sub-parlays from a pool of picks."],
  ["Teaser","Parlay where you move lines in your favor for reduced payout."],
  ["Hold","The total percentage a book profits from both sides of a bet."],
  ["Sharp Book","Sportsbook with low vig and sharp (accurate) lines — e.g. Pinnacle."],
  ["Getting Limited","When a book reduces your max bet size due to consistent profiting."],
  ["SGP","Same-Game Parlay — all legs must be from the same game."],
];

const Glossary = () => {
  const [search, setSearch] = useState('');
  const filtered = GLOSSARY_TERMS.filter(([t])=>t.toLowerCase().includes(search.toLowerCase()));
  return (<div style={S.card}>
    <Tl t="Betting Glossary" badge="QUICK REF" bc={K.ac}/>
    <div style={{marginBottom:12}}><input style={S.input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search terms..."/></div>
    {filtered.map(([term,def])=>(
      <div key={term} style={{padding:"10px 0",borderBottom:`1px solid ${K.bd}`}}>
        <div style={{fontSize:13,fontWeight:600,color:K.ac,marginBottom:3}}>{term}</div>
        <div style={{fontSize:12,color:K.dm,lineHeight:1.6}}>{def}</div>
      </div>
    ))}
    {!filtered.length&&<div style={{textAlign:"center",padding:24,color:K.mt,fontSize:12}}>No terms found.</div>}
  </div>);
};

// ═══ ONBOARDING WIZARD ═══
const ONBOARDING_KEY = 'pg_onboarded_v1';

const OnboardingWizard = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [books, setBooks] = useState([]);
  const [userState, setUserState] = useState(() => { try { return localStorage.getItem('pg_user_state')||''; } catch { return ''; } });
  const BOOK_OPTIONS = ['DraftKings','FanDuel','BetMGM','Caesars','bet365','ESPN BET','Fanatics','BetRivers'];
  const toggleBook = b => setBooks(prev => prev.includes(b) ? prev.filter(x=>x!==b) : [...prev,b]);
  const steps = [
    {
      title: "Welcome to PromoGrind",
      sub: "Turn sportsbook promos into guaranteed cash. No gambling knowledge needed.",
      content: (
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:16}}>🤑</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:380,margin:"0 auto",textAlign:"left"}}>
            {[["Welcome Promos","$1,000–$2,500 one-time from 8+ books"],["Profit Boosts","$300–$1,000/month recurring, 15 min/day"],["100% Legal","Math calculator, not gambling. Free forever."],["No Sports Knowledge","Pure math. You don't need to know the teams."]].map(([t,d])=>(
              <div key={t} style={{padding:"10px 12px",background:"#161d2a",borderRadius:8,border:"1px solid #1e293b"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0",marginBottom:2}}>{t}</div>
                <div style={{fontSize:10,color:"#64748b",lineHeight:1.5}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Which books do you have?",
      sub: "Select the sportsbooks you've already signed up with (or none if you're just starting).",
      content: (
        <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
          {BOOK_OPTIONS.map(b=>(
            <button key={b} onClick={()=>toggleBook(b)} style={{padding:"8px 16px",background:books.includes(b)?"#4ade8020":"transparent",border:`1px solid ${books.includes(b)?"#4ade80":"#1e293b"}`,borderRadius:6,color:books.includes(b)?"#4ade80":"#64748b",fontSize:12,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontWeight:books.includes(b)?700:400}}>
              {b}
            </button>
          ))}
          <div style={{width:"100%",textAlign:"center",fontSize:11,color:"#64748b",marginTop:4}}>None yet? No problem — you'll start fresh.</div>
        </div>
      )
    },
    {
      title: "What state are you in?",
      sub: "We'll show only sportsbooks available in your state.",
      content: (
        <div style={{textAlign:"center"}}>
          <select style={{...S.input,maxWidth:300,padding:"10px 14px",fontSize:13,margin:"0 auto"}} value={userState} onChange={e=>{setUserState(e.target.value);try{localStorage.setItem('pg_user_state',e.target.value);}catch{}}}>
            <option value="">— Select your state —</option>
            {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{fontSize:11,color:K.mt,marginTop:12}}>
            Sports betting is legal in 35+ states. Select yours to see which books you can use.
          </div>
        </div>
      )
    },
    {
      title: "Start with your first promo",
      sub: books.length > 0 ? `You have ${books.length} book${books.length>1?"s":""} — start converting promos immediately.` : "Open one or more sportsbook apps and grab a welcome promo.",
      content: (
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:13,color:"#94a3b8",marginBottom:16,lineHeight:1.7}}>Your best first move:</div>
          <div style={{display:"grid",gap:8,maxWidth:380,margin:"0 auto",textAlign:"left"}}>
            {[
              ["1","Get a bonus bet promo","DraftKings, FanDuel, Fanatics, ESPN BET — all offer bonus bets after a small qualifying wager"],
              ["2","Open Bonus Bet Converter","Enter your bonus bet size and odds — the calculator tells you exactly what hedge to place"],
              ["3","Place both bets","Bonus bet at Book A, hedge at Book B. Profit guaranteed no matter the result"],
            ].map(([n,t,d])=>(
              <div key={n} style={{display:"flex",gap:12,padding:"10px 12px",background:"#161d2a",borderRadius:8,border:"1px solid #1e293b"}}>
                <div style={{fontSize:16,fontWeight:700,color:"#4ade80",minWidth:20}}>{n}</div>
                <div><div style={{fontSize:12,fontWeight:600,color:"#e2e8f0",marginBottom:2}}>{t}</div><div style={{fontSize:10,color:"#64748b",lineHeight:1.5}}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];
  const current = steps[step];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#0f1520",border:"1px solid #1e293b",borderRadius:12,padding:28,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>{current.title}</div>
            <div style={{fontSize:12,color:"#64748b"}}>{current.sub}</div>
          </div>
          <div style={{fontSize:10,color:"#334155",fontFamily:"'JetBrains Mono',monospace"}}>{step+1}/{steps.length}</div>
        </div>
        <div style={{marginBottom:24}}>{current.content}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button onClick={onDone} style={{padding:"6px 14px",background:"transparent",border:"1px solid #1e293b",borderRadius:6,color:"#334155",fontSize:11,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>Skip</button>
          <div style={{display:"flex",gap:6}}>{steps.map((_,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:i===step?"#4ade80":"#1e293b"}}/>)}</div>
          <button onClick={()=>{ if(step<steps.length-1) setStep(s=>s+1); else onDone(); }} style={{padding:"8px 20px",background:"#4ade80",border:"none",borderRadius:6,color:"#0a0e17",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
            {step<steps.length-1?"Next →":"Let's Go →"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══ ANNUAL INCOME ESTIMATOR ═══
const IncomeEstimator = () => {
  const [numBooks, setNumBooks] = useState("6");
  const [hoursPerWeek, setHoursPerWeek] = useState("5");
  const [hasBoosts, setHasBoosts] = useState(true);
  const [boostsPerDay, setBoostsPerDay] = useState("5");

  const nb = Math.min(parseInt(numBooks)||0, 12);
  const hpw = parseFloat(hoursPerWeek)||0;

  // Welcome promo estimates per book (conservative)
  const BOOK_VALUES = [1200, 900, 700, 600, 500, 400, 350, 300, 250, 200, 150, 100];
  const welcomePromos = BOOK_VALUES.slice(0, nb).reduce((s,v)=>s+v, 0) * 0.7; // 70% conversion

  // Daily boost income
  const dailyBoosts = parseFloat(boostsPerDay)||0;
  const boostPerConversion = hpw >= 7 ? 12 : hpw >= 4 ? 9 : 6; // more time = better lines
  const monthlyBoosts = hasBoosts ? dailyBoosts * boostPerConversion * 22 : 0; // ~22 trading days/mo
  const annualBoosts = monthlyBoosts * 12;

  const annualTotal = welcomePromos + annualBoosts;
  const hourlyRate = hpw > 0 ? annualTotal / (hpw * 52) : 0;

  return (<div><div style={S.card}><Tl t="Annual Income Estimator" badge="PROJECTION" bc={K.gn} shareable/>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Sportsbooks Available in Your State</label>
        <select style={S.input} value={numBooks} onChange={e=>setNumBooks(e.target.value)}>
          {["2","3","4","5","6","7","8","9","10","11","12"].map(n=><option key={n} value={n}>{n} books</option>)}
        </select>
      </div>
      <div style={S.col}><label style={S.label}>Hours Per Week Available</label>
        <select style={S.input} value={hoursPerWeek} onChange={e=>setHoursPerWeek(e.target.value)}>
          {[["1","~1 hr/week (minimal)"],["3","~3 hrs/week (casual)"],["5","~5 hrs/week (regular)"],["7","~7 hrs/week (dedicated)"],["10","10+ hrs/week (full grind)"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
    </div>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Daily Profit Boosts Available</label>
        <select style={S.input} value={boostsPerDay} onChange={e=>setBoostsPerDay(e.target.value)}>
          {[["2","2/day (1-2 books)"],["5","5/day (3-5 books)"],["8","8/day (6-8 books)"],["12","12/day (all books, multiple daily)"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div style={{...S.col,display:"flex",alignItems:"center",gap:10,paddingTop:20}}>
        <label style={{...S.label,margin:0}}>Has Recurring Boosts</label>
        <div role="checkbox" aria-checked={hasBoosts} onClick={()=>setHasBoosts(b=>!b)} style={{width:36,height:20,borderRadius:10,background:hasBoosts?K.gn:K.bd2,cursor:"pointer",display:"flex",alignItems:"center",padding:"0 3px",transition:"background 0.2s"}}>
          <div style={{width:14,height:14,borderRadius:"50%",background:"white",transform:hasBoosts?"translateX(16px)":"translateX(0)",transition:"transform 0.2s"}}/>
        </div>
      </div>
    </div>

    <div style={{...S.res(true),marginTop:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16,textAlign:"center"}}>
        <div>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Welcome Promos</div>
          <div style={{fontSize:22,fontWeight:700,color:K.yl,fontFamily:"'Space Grotesk',sans-serif"}}>${Math.round(welcomePromos).toLocaleString()}</div>
          <div style={{fontSize:9,color:K.mt}}>one-time, ~{nb} books</div>
        </div>
        <div>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Annual Boosts</div>
          <div style={{fontSize:22,fontWeight:700,color:K.ac,fontFamily:"'Space Grotesk',sans-serif"}}>${Math.round(annualBoosts).toLocaleString()}</div>
          <div style={{fontSize:9,color:K.mt}}>${Math.round(monthlyBoosts).toLocaleString()}/month recurring</div>
        </div>
        <div>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Year 1 Total</div>
          <div style={{fontSize:22,fontWeight:700,color:K.gn,fontFamily:"'Space Grotesk',sans-serif"}}>${Math.round(annualTotal).toLocaleString()}</div>
          <div style={{fontSize:9,color:K.mt}}>~${Math.round(hourlyRate)}/hr effective rate</div>
        </div>
      </div>
      <div style={{height:1,background:K.bd,marginBottom:16}}/>
      <RR l="Welcome promo season (first 2-4 weeks)" v={`$${Math.round(welcomePromos).toLocaleString()}`} c={K.yl}/>
      <RR l={`Daily boost income (${boostsPerDay} boosts × ~$${boostPerConversion} each × 22 days)`} v={`$${Math.round(monthlyBoosts).toLocaleString()}/month`} c={K.ac}/>
      <RR l="Year 1 estimate (conservative)" v={`$${Math.round(annualTotal * 0.8).toLocaleString()} – $${Math.round(annualTotal * 1.1).toLocaleString()}`} c={K.gn} b/>
      <RR l="Effective hourly rate" v={`~$${Math.round(hourlyRate)}/hr`} c={K.pp}/>
      <Nt c={K.yl}>These are estimates based on current sportsbook promo values (2026). Welcome promos assume 70% conversion rate. Boost income varies by available lines and sportsbook generosity. Your actual results may be higher or lower.</Nt>
      <Nt c={K.ac}>Year 2+ income is mostly recurring boosts — welcome promos are one-time. This is a long-term side hustle, not a one-off.</Nt>
    </div>
  </div>
  <Help entries={[
    ["Welcome promo estimates","Based on current sportsbook offers: DraftKings ~$200 effective, FanDuel ~$200, BetMGM ~$180, Caesars ~$150, bet365 ~$125, ESPN BET ~$100, Fanatics ~$90, BetRivers ~$80. Assumes 70% conversion rate on bonus bets."],
    ["Boost income","Profit boosts appear daily across most sportsbooks. At 5 boosts per day averaging $9 each, that's $45/day, ~$990/month. More active grinders running all 8 books can see $200+/day on peak event days."],
    ["Hourly rate","Based on your selected hours per week. Note: most of that time is during games — you're watching sports and clicking buttons, not at a desk. Many grinders consider this 'free money on top of entertainment.'"],
    ["State matters","More legal sportsbooks in your state = more promos = more income. NJ, PA, CO, MI have the most books. Some states only have 2-3."],
  ]}/></div>);
};

// ═══ PROMO FINDER WIZARD ═══
const PromoFinder = () => {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState(null);
  const navigate = useNavigate();
  const go = (slug) => navigate('/'+slug);
  const reset = () => { setStep(0); setAnswer(null); };
  const Opt = ({label,sub,onClick}) => (
    <button onClick={onClick} style={{width:"100%",padding:"12px 16px",background:K.s2,border:`1px solid ${K.bd2}`,borderRadius:8,color:K.tx,cursor:"pointer",textAlign:"left",marginBottom:8,fontFamily:font}}>
      <div style={{fontSize:13,fontWeight:600,color:K.tx,marginBottom:2}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:K.mt}}>{sub}</div>}
    </button>
  );
  const Result = ({title,desc,slug}) => (
    <div style={{padding:"16px",background:`${K.gn}08`,border:`1px solid ${K.gn}30`,borderRadius:8}}>
      <div style={{fontSize:14,fontWeight:700,color:K.gn,marginBottom:6}}>{title}</div>
      <div style={{fontSize:12,color:K.dm,marginBottom:12,lineHeight:1.6}}>{desc}</div>
      <button onClick={()=>go(slug)} style={{padding:"9px 20px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font}}>Open Calculator →</button>
      <button onClick={reset} style={{marginLeft:10,padding:"9px 16px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:11,cursor:"pointer",fontFamily:font}}>Start Over</button>
    </div>
  );
  return (<div style={S.card}>
    <Tl t="Promo Finder" badge="WHICH CALCULATOR?" bc={K.ac}/>
    {step===0&&<>
      <div style={{fontSize:12,color:K.dm,marginBottom:14}}>What kind of promo do you have?</div>
      <Opt label="Bonus Bet / Free Bet" sub="The sportsbook gave you a bet credit (e.g. '$200 bonus bet')" onClick={()=>{setAnswer('bonus');setStep(10);}}/>
      <Opt label="Profit Boost Token" sub="A token that increases your winnings by a percentage (e.g. '50% profit boost')" onClick={()=>{setAnswer('boost');setStep(10);}}/>
      <Opt label="First Bet Insurance / Safety Net" sub="Your first real-cash bet is refunded if it loses" onClick={()=>{setAnswer('firstbet');setStep(10);}}/>
      <Opt label="Deposit Match" sub="The book matches a percentage of your deposit" onClick={()=>{setAnswer('deposit');setStep(10);}}/>
      <Opt label="SGP / Parlay Insurance" sub="Get bonus bets back if your same-game parlay loses" onClick={()=>{setAnswer('insurance');setStep(10);}}/>
      <Opt label="I'm not sure" sub="Answer a few questions to find out" onClick={()=>setStep(1)}/>
    </>}
    {step===1&&<>
      <div style={{fontSize:12,color:K.dm,marginBottom:14}}>Did the sportsbook give you a credit/token, or boost your winnings on a real bet?</div>
      <Opt label="They gave me a credit or token" sub="Something in my account I can 'use' on a bet" onClick={()=>setStep(2)}/>
      <Opt label="They boost my winnings if I win" sub="I'm betting my own money but get extra if I win" onClick={()=>{setAnswer('boost');setStep(10);}}/>
    </>}
    {step===2&&<>
      <div style={{fontSize:12,color:K.dm,marginBottom:14}}>If your bet using this credit wins, do you get your stake back?</div>
      <Opt label="No — I only get the profit, not the credit back" sub="The stake is NOT returned" onClick={()=>{setAnswer('bonus');setStep(10);}}/>
      <Opt label="Yes — I get everything back if it wins" sub="Acts like a real cash bet" onClick={()=>{setAnswer('firstbet');setStep(10);}}/>
    </>}
    {step===10&&(()=>{
      const m = {
        bonus: {title:"Use: Bonus Bet Converter",desc:"Enter your bonus bet size, the odds you're placing it at, and the hedge odds. The calculator tells you exactly how much to hedge to lock in profit.",slug:"bonus-bet"},
        boost: {title:"Use: Profit Boost Converter",desc:"Enter your stake, the original odds, the boost percentage, and the max extra winnings. The calculator shows your effective odds and the hedge amount.",slug:"profit-boost"},
        firstbet: {title:"Use: First Bet Safety Net Hedge",desc:"Enter your first bet amount, the odds, and hedge odds. This locks in a small profit if your bet wins — and if it loses, you get bonus bets to convert.",slug:"first-bet"},
        deposit: {title:"Use: Deposit Match Calculator",desc:"Enter your deposit amount, match percentage, rollover, and average vig to find the true net value of the bonus.",slug:"deposit-match"},
        insurance: {title:"Use: Promo Insurance Calculator",desc:"Enter your stake, insurance percentage, and bonus conversion rate to find your effective net cost if the bet loses.",slug:"insurance"},
      };
      const res = m[answer];
      return res?<Result {...res}/>:<div style={{color:K.mt,fontSize:12}}>Not sure — try the Knowledge Base for a full overview.</div>;
    })()}
  </div>);
};

// ═══ QUICK CALC PANEL ═══
const QuickCalcPanel = ({ goTo }) => {
  const [open, setOpen] = useState(false);
  const quickItems = [
    {n:"Bonus Bet",gi:1,ti:0},
    {n:"Profit Boost",gi:1,ti:1},
    {n:"No-Vig",gi:2,ti:0},
    {n:"+EV",gi:2,ti:2},
    {n:"2-Way Arb",gi:2,ti:4},
  ];
  return (
    <div className="pg-quick-calc" style={{position:"fixed",bottom:64,left:12,zIndex:200}}>
      <style>{`@media (min-width: 769px) { .pg-quick-calc { display: none !important; } }`}</style>
      {open&&<div style={{background:K.s1,border:`1px solid ${K.bd2}`,borderRadius:10,padding:10,marginBottom:8,boxShadow:"0 4px 16px rgba(0,0,0,0.5)",minWidth:140}}>
        {quickItems.map(item=>(
          <button key={item.n} onClick={()=>{goTo(item.gi,item.ti);setOpen(false);}} style={{display:"block",width:"100%",padding:"8px 12px",background:"transparent",border:"none",color:K.tx,cursor:"pointer",textAlign:"left",fontSize:12,fontFamily:font,borderBottom:`1px solid ${K.bd}`,borderRadius:0}}>
            {item.n}
          </button>
        ))}
      </div>}
      <button onClick={()=>setOpen(o=>!o)} style={{padding:"7px 14px",background:K.s1,border:`1px solid ${K.bd2}`,borderRadius:20,color:K.ac,fontSize:11,cursor:"pointer",fontFamily:font,fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.4)"}}>
        {open?"✕ Close":"⚡ Quick"}
      </button>
    </div>
  );
};

// ═══ CALC SEARCH (keyboard ?) ═══
const CalcSearch = ({ allCalcs, onNavigate, onClose }) => {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(()=>{ inputRef.current?.focus(); },[]);
  useEffect(()=>{
    const handler = e => { if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[onClose]);
  const filtered = q.trim() ? allCalcs.filter(c=>c.n.toLowerCase().includes(q.toLowerCase())||c.group.toLowerCase().includes(q.toLowerCase())) : allCalcs;
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:2000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:80,padding:"80px 16px 16px"}}>
      <div style={{background:K.s1,border:`1px solid ${K.bd2}`,borderRadius:12,padding:20,width:"100%",maxWidth:480,maxHeight:"70vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
        <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search calculators…" style={{...S.input,fontSize:14,marginBottom:12}}/>
        <div style={{overflowY:"auto",flex:1}}>
          {filtered.map(c=>(
            <button key={c.slug} onClick={()=>{onNavigate(c.slug);onClose();}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",padding:"10px 12px",background:"transparent",border:"none",borderBottom:`1px solid ${K.bd}`,color:K.tx,cursor:"pointer",textAlign:"left",fontFamily:font}}>
              <span style={{fontSize:13,fontWeight:500}}>{c.n}</span>
              <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>{c.group}</span>
            </button>
          ))}
          {!filtered.length&&<div style={{textAlign:"center",padding:24,color:K.mt,fontSize:12}}>No matches</div>}
        </div>
        <div style={{fontSize:10,color:K.mt,marginTop:8,textAlign:"center"}}>Press Esc to close · Press ? anywhere to reopen</div>
      </div>
    </div>
  );
};

// ═══ MOBILE BOTTOM NAV ═══
const MobileBottomNav = ({ gi, goTo }) => {
  const icons = ["🏠","⚡","📊","📈","🔴","📚"];
  const labels = ["Home","Convert","Calc","Track","Live","Learn"];
  return (
    <div className="pg-mobile-nav" style={{position:"fixed",bottom:0,left:0,right:0,background:K.s1,borderTop:`1px solid ${K.bd}`,display:"flex",zIndex:100,padding:"4px 0 env(safe-area-inset-bottom,0px)"}}>
      <style>{`@media (min-width: 769px) { .pg-mobile-nav { display: none !important; } }`}</style>
      {TABS.map((t,i)=>(
        <button key={t.group} onClick={()=>goTo(i,0)} style={{flex:1,padding:"6px 4px",background:"none",border:"none",color:gi===i?K.gn:K.mt,cursor:"pointer",fontSize:9,textTransform:"uppercase",letterSpacing:"0.5px",fontFamily:font,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <span style={{fontSize:18}}>{icons[i]}</span>
          <span style={{fontWeight:gi===i?700:400}}>{labels[i]}</span>
        </button>
      ))}
    </div>
  );
};

// ═══ CSV IMPORT MODAL ═══
const CSVImportModal = ({ onImport, onClose }) => {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);
  const parse = () => {
    try {
      const lines = raw.trim().split('\n').filter(Boolean);
      if(lines.length<2) { setError('Need at least a header row and one data row'); return; }
      const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim().toLowerCase());
      const rows = lines.slice(1).map(line=>{
        const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)||[];
        const obj = {};
        headers.forEach((h,i)=>{ obj[h]=(cols[i]||'').replace(/"/g,'').trim(); });
        return obj;
      });
      const mapped = rows.map((r,i)=>({
        id: Date.now()+i,
        date: r.date||r['settled date']||r['place date']||new Date().toISOString().split('T')[0],
        book: r.book||r.sportsbook||'Imported',
        type: r.type||r['bet type']||'Moneyline',
        odds: r.odds||r.price||r['bet odds']||'+100',
        stake: (r.stake||r['risk']||r['wager']||'0').replace('$',''),
        toWin: (r['to win']||r.towin||r.profit||'0').replace('$',''),
        status: (r.status||r.result||'open').toLowerCase().replace('win','won').replace('loss','lost'),
        notes: r.description||r.notes||r.event||'',
      }));
      setPreview(mapped.slice(0,5));
      setError(null);
    } catch(e) { setError('Parse error: '+e.message); }
  };
  const confirm = () => {
    try {
      const lines = raw.trim().split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim().toLowerCase());
      const rows = lines.slice(1).map((line,i)=>{
        const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)||[];
        const obj={};
        headers.forEach((h,j)=>{ obj[h]=(cols[j]||'').replace(/"/g,'').trim(); });
        return {
          id:Date.now()+i,
          date:obj.date||obj['settled date']||obj['place date']||new Date().toISOString().split('T')[0],
          book:obj.book||obj.sportsbook||'Imported',
          type:obj.type||obj['bet type']||'Moneyline',
          odds:obj.odds||obj.price||obj['bet odds']||'+100',
          stake:(obj.stake||obj['risk']||obj['wager']||'0').replace('$',''),
          toWin:(obj['to win']||obj.towin||obj.profit||'0').replace('$',''),
          status:(obj.status||obj.result||'open').toLowerCase().replace('win','won').replace('loss','lost'),
          notes:obj.description||obj.notes||obj.event||'',
        };
      });
      onImport(rows);
      onClose();
    } catch(e) { setError('Import failed: '+e.message); }
  };
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:K.s1,border:`1px solid ${K.bd2}`,borderRadius:12,padding:24,width:"100%",maxWidth:560,maxHeight:"80vh",overflow:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
        <div style={{fontSize:16,fontWeight:700,color:K.tx,marginBottom:4,fontFamily:fontD}}>Import Bets from CSV</div>
        <div style={{fontSize:11,color:K.dm,marginBottom:16}}>Paste your DraftKings, FanDuel, or any sportsbook CSV export below. Headers are auto-detected.</div>
        <textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder={"date,book,odds,stake,status\n2026-03-01,DraftKings,+150,50,won"} style={{...S.input,height:120,resize:"vertical",marginBottom:8,fontFamily:"monospace",fontSize:11}}/>
        {error&&<div style={{fontSize:11,color:K.rd,marginBottom:8}}>{error}</div>}
        {preview.length>0&&<div style={{marginBottom:12}}>
          <div style={{fontSize:10,color:K.mt,marginBottom:6,textTransform:"uppercase",letterSpacing:"1.5px"}}>Preview ({preview.length} of {raw.trim().split('\n').length-1} rows)</div>
          {preview.map((r,i)=><div key={i} style={{fontSize:11,color:K.dm,padding:"4px 0",borderBottom:`1px solid ${K.bd}`}}>{r.date} · {r.book} · {r.odds} · ${r.stake} · <span style={{color:r.status==="won"?K.gn:r.status==="lost"?K.rd:K.yl}}>{r.status}</span></div>)}
        </div>}
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={parse} style={{flex:1,padding:"9px",background:K.ac,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font}}>Parse CSV</button>
          {preview.length>0&&<button onClick={confirm} style={{flex:1,padding:"9px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font}}>Import {raw.trim().split('\n').length-1} Bets</button>}
          <button onClick={onClose} style={{padding:"9px 16px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,cursor:"pointer",fontFamily:font}}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ═══ STATE AVAILABILITY DATA ═══
const US_BOOK_STATES = {
  "DraftKings": ["NJ","PA","CO","MI","VA","OH","IN","AZ","NY","TN","WV","IA","IL","KS","KY","LA","MD","MA","NC","VT","WY","DC","NV"],
  "FanDuel": ["NJ","PA","CO","MI","VA","OH","IN","AZ","NY","TN","WV","IA","IL","KS","KY","LA","MD","MA","NC","VT","DC","NV"],
  "BetMGM": ["NJ","PA","CO","MI","VA","OH","IN","AZ","NY","TN","WV","IA","MS","KY","LA","MD","MA","DC","NV"],
  "Caesars": ["NJ","PA","CO","MI","VA","OH","IN","AZ","NY","TN","WV","IA","IL","KS","KY","LA","MD","MA","DC","NV"],
  "bet365": ["NJ","CO","IA","OH","VA","KY","NC","LA","IL"],
  "ESPN BET": ["NJ","PA","CO","MI","VA","OH","IN","AZ","NY","TN","WV","IA","IL","KS","KY","LA","MD","MA","NC"],
  "Fanatics": ["NJ","PA","CO","MI","VA","OH","IN","AZ","NY","TN","WV","IA","IL","KY","LA","MD","MA","NC","DC"],
  "BetRivers": ["NJ","PA","CO","MI","VA","OH","IN","AZ","NY","IL","IA","LA","MD","NC","WV"],
};
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

// ═══ PROMO CALENDAR ═══
const PROMO_SCHED = [
  {book:"DraftKings",day:"Daily",promo:"Profit Boosts (2-5/day)",value:"$5-15",type:"Recurring",grade:"A"},
  {book:"DraftKings",day:"Tuesday",promo:"Stepped Up Parlay",value:"$10-25",type:"Weekly",grade:"A"},
  {book:"DraftKings",day:"Thursday",promo:"Parlay Insurance",value:"$10-20",type:"Weekly",grade:"B"},
  {book:"DraftKings",day:"Monday",promo:"Reload Bonus",value:"$25-100",type:"Weekly",grade:"B"},
  {book:"FanDuel",day:"Daily",promo:"Profit Boosts (2-4/day)",value:"$5-20",type:"Recurring",grade:"A"},
  {book:"FanDuel",day:"Tuesday",promo:"Odds Boosts",value:"$10-30",type:"Weekly",grade:"B"},
  {book:"FanDuel",day:"Weekend",promo:"SGP Insurance",value:"$10-25",type:"Weekend",grade:"A"},
  {book:"BetMGM",day:"Daily",promo:"Daily Odds Boosts",value:"$5-15",type:"Recurring",grade:"B"},
  {book:"BetMGM",day:"Monday",promo:"Monday Night Reload",value:"$25-50",type:"Weekly",grade:"B"},
  {book:"Caesars",day:"Daily",promo:"Profit Boosts",value:"$5-15",type:"Recurring",grade:"A"},
  {book:"Caesars",day:"Wednesday",promo:"Bonus Bet Wednesday",value:"$10-25",type:"Weekly",grade:"B"},
  {book:"bet365",day:"Daily",promo:"Early Payout Offers",value:"Variable",type:"Recurring",grade:"C"},
  {book:"ESPN BET",day:"Daily",promo:"ESPN+ Profit Boosts",value:"$5-15",type:"Recurring",grade:"B"},
  {book:"ESPN BET",day:"Thursday",promo:"MNF/TNF Specials",value:"$10-25",type:"Weekly",grade:"B"},
  {book:"Fanatics",day:"Daily",promo:"FanCash Promos",value:"$5-20",type:"Recurring",grade:"B"},
  {book:"BetRivers",day:"Weekly",promo:"iRush Reload",value:"$25-100",type:"Weekly",grade:"B"},
];
const DAYS_ORDER = ["Daily","Monday","Tuesday","Wednesday","Thursday","Friday","Weekend"];
const PromoCalendar = () => {
  const [filterBook, setFilterBook] = useState("All");
  const [filterDay, setFilterDay] = useState("All");
  const [filterGrade, setFilterGrade] = useState("All");
  const filtered = PROMO_SCHED.filter(p=>(filterBook==="All"||p.book===filterBook)&&(filterDay==="All"||p.day===filterDay)&&(filterGrade==="All"||p.grade===filterGrade));
  const typeColor={Recurring:K.gn,Weekly:K.ac,Weekend:K.pp};
  return (<div><div style={S.card}><Tl t="Promo Calendar" badge="RECURRING $$$" bc={K.gn} shareable/>
    <div style={{...S.note(K.ac),marginBottom:12}}>These are the predictable recurring promos across all major books. Stack them daily for $150–450/mo in passive profit on top of welcome bonuses.</div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      <select style={{...S.input,width:"auto",padding:"5px 10px",fontSize:11}} value={filterBook} onChange={e=>setFilterBook(e.target.value)}>
        <option value="All">All Books</option>
        {[...new Set(PROMO_SCHED.map(p=>p.book))].map(b=><option key={b}>{b}</option>)}
      </select>
      <select style={{...S.input,width:"auto",padding:"5px 10px",fontSize:11}} value={filterDay} onChange={e=>setFilterDay(e.target.value)}>
        <option value="All">All Days</option>
        {DAYS_ORDER.map(d=><option key={d}>{d}</option>)}
      </select>
      <select style={{...S.input,width:"auto",padding:"5px 10px",fontSize:11}} value={filterGrade||"All"} onChange={e=>setFilterGrade(e.target.value)}>
        <option value="All">All Grades</option>
        <option value="A">A — Best Value</option>
        <option value="B">B — Good Value</option>
        <option value="C">C — Situational</option>
      </select>
    </div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Book","Day","Promo","Est. Value","Type","Grade"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map((p,i)=>(
          <tr key={i}>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{p.book}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.ac}}>{p.day}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{p.promo}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:600}}>{p.value}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(typeColor[p.type]||K.mt)}>{p.type}</span></td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
              <span style={S.tag(p.grade==="A"?K.gn:p.grade==="B"?K.ac:K.mt)}>{p.grade||"B"}</span>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </div>
  <Help entries={[
    ["Why track recurring promos","Welcome bonuses are one-time. Recurring promos are the engine of long-term profit. A serious matched bettor extracts $150-450/mo just from daily boosts across 5-6 books."],
    ["How to use this","Every morning, open each sportsbook app and check for available boosts. Cross-reference this calendar so you know what to look for. Use the Profit Boost converter to calculate each one."],
    ["Profit boosts are the best","They come daily, they require no outcome risk when hedged, and they compound. At $10 profit per boost × 3 boosts/day × 30 days = $900/mo."],
  ]}/></div>);
};

// ═══ REFERRAL HUB ═══
const ReferralHub = () => {
  const [copied, setCopied] = useState(false);
  const [refCount, setRefCount] = useState(null);
  const [userId, setUserId] = useState(null);
  useEffect(()=>{
    supabase.auth.getSession().then(async ({data:{session}})=>{
      if(session) {
        setUserId(session.user.id);
        try {
          const { data } = await supabase.rpc('get_my_referral_count');
          setRefCount(typeof data === 'number' ? data : 0);
        } catch(e) { setRefCount(0); }
      }
    });
  },[]);
  const refLink = userId ? `https://vaultsparkstudios.com/promogrind/?ref=${userId}` : "Loading…";
  const copy = () => { try{navigator.clipboard.writeText(refLink);}catch(e){} setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (<div><div style={S.card}><Tl t="Refer &amp; Earn" badge="FREE VAULTSPARKED" bc={K.pp}/>
    <div style={{...S.note(K.pp),marginBottom:16}}>Share your link. When a friend signs up and subscribes to VaultSparked, you both get <strong>30 days free</strong>. No limit on referrals.</div>
    <div style={{marginBottom:16}}>
      <div style={S.label}>Your Referral Link</div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{...S.input,flex:1,color:K.dm,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"default"}}>{refLink}</div>
        <button onClick={copy} style={{padding:"8px 16px",background:copied?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11,whiteSpace:"nowrap"}}>{copied?"✓ Copied!":"Copy Link"}</button>
      </div>
    </div>
    <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
      <div><div style={{fontSize:10,color:K.mt}}>YOUR REFERRALS</div><div style={S.big(K.pp)}>{refCount===null?'…':refCount}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>FREE DAYS EARNED</div><div style={S.big(K.gn)}>{refCount===null?'…':(refCount||0)*30}</div></div>
    </div>
    <div style={{marginTop:16,padding:12,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:11,fontWeight:700,color:K.tx,marginBottom:8}}>Share on</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[
          {label:"Twitter/X",color:"#1DA1F2",msg:`I've been making extra income every month using PromoGrind — free sportsbook promo conversion tools. Way better than paying $99/mo for OddsJam. Check it out: ${refLink}`},
          {label:"Discord",color:"#5865F2",msg:`**PromoGrind** — free matched betting tools. 22 calculators, live arb scanner. Sign up free: ${refLink}`},
          {label:"Reddit",color:"#FF4500",msg:`Has anyone else been using PromoGrind? It's free and has all the calculators you need for promo conversion. Link: ${refLink}`},
        ].map(({label,color,msg})=>(
          <button key={label} onClick={()=>{try{navigator.clipboard.writeText(msg);}catch(e){} }} style={{padding:"6px 14px",background:`${color}15`,border:`1px solid ${color}40`,borderRadius:6,color,fontSize:11,cursor:"pointer",fontFamily:font}}>Copy {label} Post</button>
        ))}
      </div>
    </div>
  </div></div>);
};

// ═══ PRICING / UPGRADE ═══
const PricingPage = () => {
  const [upgrading, setUpgrading] = useState(false);
  const toast = useToast();
  const handleUpgrade = async (plan) => {
    setUpgrading(true);
    try { await startCheckout(plan.id); }
    catch(e) { if(toast) toast('Checkout failed: '+e.message, K.rd); setUpgrading(false); }
  };
  return (<div><div style={S.card}><Tl t="VaultSparked Pro" badge="UPGRADE" bc={K.pp}/>
    <div style={{...S.note(K.pp),marginBottom:20}}>Unlock the live Arb Scanner and +EV Scanner. Real-time odds from 40+ books. Unlimited scans. Cancel anytime.</div>
    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
      {[
        {id:"monthly",label:"Monthly",price:"$24.99",period:"/mo",savings:null,highlight:false},
        {id:"annual",label:"Annual",price:"$199",period:"/yr",savings:"Save $101 · 2 months free",highlight:true},
      ].map(plan=>(
        <div key={plan.id} style={{flex:1,minWidth:200,padding:20,background:plan.highlight?`${K.pp}08`:K.s2,border:`2px solid ${plan.highlight?K.pp:K.bd}`,borderRadius:10,position:"relative"}}>
          {plan.highlight&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:K.pp,color:K.bg,fontSize:9,fontWeight:700,padding:"2px 12px",borderRadius:50,letterSpacing:"1px"}}>BEST VALUE</div>}
          <div style={{fontSize:13,fontWeight:700,color:K.tx,marginBottom:4}}>{plan.label}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:plan.savings?4:16}}>
            <span style={{fontSize:28,fontWeight:700,color:plan.highlight?K.pp:K.tx,fontFamily:fontD}}>{plan.price}</span>
            <span style={{fontSize:12,color:K.mt}}>{plan.period}</span>
          </div>
          {plan.savings&&<div style={{fontSize:11,color:K.gn,fontWeight:600,marginBottom:16}}>{plan.savings}</div>}
          <button onClick={()=>handleUpgrade(plan.id)} disabled={upgrading} style={{width:"100%",padding:"10px",background:plan.highlight?K.pp:K.ac,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:12}}>
            {upgrading?"Processing…":"Upgrade Now"}
          </button>
        </div>
      ))}
    </div>
    <div style={{padding:16,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:10,textTransform:"uppercase",letterSpacing:"1.5px"}}>What you get</div>
      {[
        ["Live Arb Scanner","Real-time arbitrage across 40+ books. Alerts when ROI > your threshold."],
        ["Live +EV Scanner","Positive expected value bets. Kelly bet sizing per opportunity."],
        ["Scan History","Last 20 scans saved. Track how often arbs appear in your sport."],
        ["Player Props","Optional props market scanning. Find mispriced player lines."],
        ["Priority Support","Discord channel + email support from the PromoGrind team."],
      ].map(([title,desc])=>(
        <div key={title} style={{display:"flex",gap:10,marginBottom:8}}>
          <span style={{color:K.gn,fontWeight:700,marginTop:1}}>✓</span>
          <div><span style={{fontSize:12,fontWeight:600,color:K.tx}}>{title}</span><span style={{fontSize:11,color:K.dm}}> — {desc}</span></div>
        </div>
      ))}
    </div>
  </div></div>);
};

// ═══ COMPETITOR COMPARISON ═══
const CompetitorComparison = () => (
  <div><div style={S.card}>
    <Tl t="PromoGrind vs The Competition" badge="WHY FREE WINS" bc={K.gn}/>
    <Nt c={K.gn}>PromoGrind is permanently free for all 22 calculators, tracker, and knowledge base. Competitors charge $49–$199/month for similar tools.</Nt>
    <div style={{overflowX:"auto",marginTop:16}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead>
          <tr>
            {["Feature","PromoGrind","OddsJam","ProfitDuel","Spreadsheet"].map((h,i)=>(
              <th key={h} style={{textAlign:"left",padding:"8px 10px",borderBottom:`1px solid ${K.bd2}`,color:i===1?K.gn:K.mt,fontSize:10,textTransform:"uppercase",letterSpacing:"1px",fontWeight:i===1?700:500,background:i===1?`${K.gn}05`:"transparent"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ["Price","Free","$99–$199/mo","$49–$99/mo","Free"],
            ["Bonus Bet Converter","✓","✓","✓","Manual"],
            ["Profit Boost Converter","✓","✓","✓","Manual"],
            ["Arb Calculator","✓","✓","✓","Manual"],
            ["No-Vig / +EV Calculator","✓","✓","✓","Manual"],
            ["Live Arb Scanner","✓ (Pro $24.99/mo)","✓ Included","✓ Included","✗"],
            ["P/L Ledger & Tracker","✓","Limited","✓","Manual"],
            ["Cloud Sync","✓","✓","✓","✗"],
            ["Mobile PWA","✓","✗","✗","✗"],
            ["Knowledge Base","✓ Full guide","Limited","Limited","✗"],
            ["CSV Import/Export","✓","✗","✗","Manual"],
            ["Referral Program","✓","✗","✗","✗"],
            ["Push Notifications","✓","✗","✗","✗"],
            ["Total 22 Calculators","✓","~10","~15","DIY"],
          ].map(([feature,...vals])=>(
            <tr key={feature}>
              <td style={{padding:"8px 10px",borderBottom:`1px solid ${K.bd}`,color:K.dm,fontSize:11}}>{feature}</td>
              {vals.map((v,i)=>(
                <td key={i} style={{padding:"8px 10px",borderBottom:`1px solid ${K.bd}`,color:i===0?K.gn:v==="✗"?K.rd:K.dm,fontWeight:i===0?600:400,background:i===0?`${K.gn}03`:"transparent",fontSize:11}}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{marginTop:16,padding:14,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:12,fontWeight:700,color:K.tx,marginBottom:6}}>The Bottom Line</div>
      <div style={{fontSize:12,color:K.dm,lineHeight:1.7}}>
        OddsJam and ProfitDuel are excellent tools — but they charge $99–$199/month for a calculator suite that is fundamentally free math. PromoGrind gives you every calculator free, forever. The only paid feature is the live Arb/+EV scanner ($24.99/mo vs $99–199/mo), which pays for itself in the first hour of use.
      </div>
    </div>
  </div></div>
);

// ═══ TEAM ACCOUNTS (COMING SOON) ═══
const TeamAccounts = () => {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const toast = useToast();
  const join = async () => {
    if(!email||!email.includes('@')) return;
    try{localStorage.setItem('pg_team_waitlist',email);}catch(e){}
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.updateUser({ data:{ team_waitlist:true, team_waitlist_email:email } });
      }
    } catch(e) {}
    setJoined(true);
    if(toast) toast('✓ On the waitlist!',K.pp);
  };
  return (<div><div style={S.card}><Tl t="Team Accounts" badge="COMING SOON" bc={K.pp}/>
    <div style={{...S.note(K.pp),marginBottom:20}}>Shared vault for 2–5 person matched betting groups. One tracker, shared ledger, split profit reporting. Perfect for betting syndicates.</div>
    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
      {[["2–5 Members","Shared sportsbook tracker and P/L ledger"],["Split Reporting","Per-member profit breakdown and tax summaries"],["$49.99/mo","Per team. All members get VaultSparked Pro included"],["Shared Scanner","One scan, results visible to all team members in real-time"]].map(([title,desc])=>(
        <div key={title} style={{flex:1,minWidth:180,padding:14,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
          <div style={{fontSize:12,fontWeight:700,color:K.pp,marginBottom:4}}>{title}</div>
          <div style={{fontSize:11,color:K.dm}}>{desc}</div>
        </div>
      ))}
    </div>
    {!joined?(<div>
      <div style={S.label}>Join the waitlist — first teams get 3 months free</div>
      <div style={{display:"flex",gap:8}}>
        <input style={{...S.input,flex:1}} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"/>
        <button onClick={join} style={{padding:"8px 20px",background:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font}}>Join Waitlist</button>
      </div>
    </div>):(<div style={{...S.note(K.gn)}}>✓ You&apos;re on the waitlist. We&apos;ll email you when team accounts launch.</div>)}
  </div></div>);
};

// ═══ DAILY DASHBOARD ═══
const DailyDashboard = () => {
  const { appData: data } = React.useContext(AppDataCtx);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const todayDay = dayNames[today.getDay()];
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const todayPromos = PROMO_SCHED.filter(p => p.day === "Daily" || p.day === todayDay || p.day === "Weekend" && (today.getDay()===0||today.getDay()===6));
  const openBets = (data.bets||[]).filter(b=>b.status==="open");
  const in3Days = new Date(Date.now()+3*24*60*60*1000).toISOString().split('T')[0];
  const expiring = Object.entries(data.bookExpiry||{}).filter(([n,d])=>d&&d>=todayStr&&d<=in3Days&&!data.done?.[n]);
  const thisMonth = today.toISOString().slice(0,7);
  const monthProfit = (data.ledger||[]).filter(e=>e.date?.startsWith(thisMonth)).reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
  const totalProfit = (data.ledger||[]).reduce((s,e)=>s+(parseFloat(e.profit)||0),0);

  return (
    <div>
      <div style={S.card}>
        <div style={{fontFamily:fontD,fontSize:18,fontWeight:700,color:K.tx,marginBottom:4}}>
          Good {today.getHours()<12?"morning":today.getHours()<17?"afternoon":"evening"}
        </div>
        <div style={{fontSize:11,color:K.mt,marginBottom:16}}>
          {todayDay}, {monthNames[today.getMonth()]} {today.getDate()} · Here&apos;s your daily promo briefing
        </div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
          <div style={{padding:"12px 16px",background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`,flex:1,minWidth:120}}>
            <div style={{fontSize:9,color:K.mt,marginBottom:4}}>THIS MONTH</div>
            <div style={S.big(monthProfit>=0?K.gn:K.rd)}>${f(monthProfit)}</div>
          </div>
          <div style={{padding:"12px 16px",background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`,flex:1,minWidth:120}}>
            <div style={{fontSize:9,color:K.mt,marginBottom:4}}>ALL TIME</div>
            <div style={S.big(totalProfit>=0?K.gn:K.rd)}>${f(totalProfit)}</div>
          </div>
          <div style={{padding:"12px 16px",background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`,flex:1,minWidth:120}}>
            <div style={{fontSize:9,color:K.mt,marginBottom:4}}>OPEN BETS</div>
            <div style={S.big(K.yl)}>{openBets.length}</div>
          </div>
          <div style={{padding:"12px 16px",background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`,flex:1,minWidth:120}}>
            <div style={{fontSize:9,color:K.mt,marginBottom:4}}>TODAY&apos;S PROMOS</div>
            <div style={S.big(K.ac)}>{todayPromos.length}</div>
          </div>
        </div>
        {expiring.length>0&&(
          <div style={{...S.note(K.yl),marginBottom:14}}>
            ⚠ Expiring soon: {expiring.map(([n,d])=>`${n} (${d})`).join(", ")}
          </div>
        )}
        {todayPromos.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Today&apos;s Promos — {todayDay}</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {todayPromos.slice(0,6).map((p,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`}}>
                  <div>
                    <span style={{fontSize:12,fontWeight:600,color:K.tx}}>{p.book}</span>
                    <span style={{fontSize:11,color:K.dm,marginLeft:8}}>{p.promo}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,fontWeight:600,color:K.gn}}>{p.value}</span>
                    <span style={S.tag((p.grade==="A"?K.gn:p.grade==="B"?K.ac:K.mt)||K.ac)}>{p.grade||"B"}</span>
                  </div>
                </div>
              ))}
              {todayPromos.length>6&&<div style={{fontSize:11,color:K.mt,textAlign:"center"}}>+{todayPromos.length-6} more in Promo Calendar</div>}
            </div>
          </div>
        )}
        {openBets.length>0&&(
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:K.yl,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Open Bets</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {openBets.slice(0,3).map(b=>(
                <div key={b.id} style={{padding:"8px 12px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd2}`,flex:1,minWidth:150}}>
                  <div style={{fontSize:10,color:K.mt,marginBottom:2}}>{b.date} · {b.book}</div>
                  <div style={{fontSize:12,fontWeight:600,color:K.pp}}>{b.odds}</div>
                  <div style={{fontSize:11,color:K.dm}}>${b.stake} to win ${b.toWin||"?"}</div>
                </div>
              ))}
              {openBets.length>3&&<div style={{fontSize:11,color:K.mt,alignSelf:"center"}}>+{openBets.length-3} more</div>}
            </div>
          </div>
        )}
        <div style={{fontSize:11,fontWeight:700,color:K.dm,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Quick Actions</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[
            {label:"Convert Bonus Bet",slug:"bonus-bet",color:K.gn},
            {label:"Log a Profit Boost",slug:"profit-boost",color:K.yl},
            {label:"Check Live Scanner",slug:"arb-scanner",color:K.pp},
            {label:"Update P/L Ledger",slug:"ledger",color:K.ac},
          ].map(a=>(
            <a key={a.slug} href={"/"+a.slug} style={{padding:"7px 14px",background:`${a.color}10`,border:`1px solid ${a.color}30`,borderRadius:6,color:a.color,fontSize:11,fontWeight:600,textDecoration:"none",fontFamily:font}}>
              {a.label} →
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

const TABS = [
  { group:"Home", items:[
    {n:"Dashboard",slug:"dashboard",c:DailyDashboard},
  ]},
  { group:"Convert", items:[
    {n:"Bonus Bet",slug:"bonus-bet",c:BonusBet},
    {n:"Profit Boost",slug:"profit-boost",c:ProfitBoost},
    {n:"First Bet",slug:"first-bet",c:FirstBet},
    {n:"Deposit Match",slug:"deposit-match",c:DepositMatch},
    {n:"Insurance",slug:"insurance",c:InsurancePromo},
  ]},
  { group:"Calculate", items:[
    {n:"No-Vig",slug:"no-vig",c:NoVig},
    {n:"3-Way No-Vig",slug:"no-vig-3way",c:NoVig3Way},
    {n:"+EV",slug:"ev",c:PlusEV},
    {n:"Kelly",slug:"kelly",c:KellyCriterion},
    {n:"2-Way Arb",slug:"arb-2way",c:Arb2Way},
    {n:"3-Way Arb",slug:"arb-3way",c:Arb3Way},
    {n:"Parlay Hedge",slug:"parlay-hedge",c:ParlayHedge},
    {n:"Middle",slug:"middle",c:MiddleBet},
    {n:"Odds Convert",slug:"odds-convert",c:OddsConvert},
    {n:"Line Shop",slug:"line-shop",c:LineShop},
    {n:"Rollover",slug:"rollover",c:RolloverCalc},
    {n:"Teaser",slug:"teaser",c:TeaserCalc},
    {n:"Round Robin",slug:"round-robin",c:RoundRobinCalc},
    {n:"Parlay Builder",slug:"parlay-builder",c:ParlayBuilder},
    {n:"SGP Estimator",slug:"sgp-estimator",c:SGPEstimator},
    {n:"Hold Calc",slug:"hold-calc",c:HoldCalc},
    {n:"Bet Sizer",slug:"bet-sizer",c:BetSizingAdvisor},
    {n:"Income Est.",slug:"income-estimator",c:IncomeEstimator},
  ]},
  { group:"Track", items:[
    {n:"Sportsbooks",slug:"sportsbooks",c:Tracker},
    {n:"Bet Tracker",slug:"bet-tracker",c:BetTracker},
    {n:"P/L Ledger",slug:"ledger",c:Ledger},
    {n:"Leaderboard",slug:"leaderboard",c:Leaderboard},
  ]},
  { group:"Live", items:[
    {n:"Arb Scanner",slug:"arb-scanner",c:LiveScanner,pro:true},
    {n:"+EV Scanner",slug:"ev-scanner",c:LiveScanner,pro:true},
  ]},
  { group:"Learn", items:[
    {n:"Knowledge Base",slug:"knowledge-base",c:KB},
    {n:"Promo Finder",slug:"promo-finder",c:PromoFinder},
    {n:"Promo Calendar",slug:"promo-calendar",c:PromoCalendar},
    {n:"Promo Board",slug:"promo-board",c:PromoBoard},
    {n:"Glossary",slug:"glossary",c:Glossary},
    {n:"Refer & Earn",slug:"refer-earn",c:ReferralHub},
    {n:"Upgrade",slug:"upgrade",c:PricingPage},
    {n:"Team Accounts",slug:"team-accounts",c:TeamAccounts},
    {n:"vs Competitors",slug:"vs-competitors",c:CompetitorComparison},
  ]},
];

const DEFAULT_SLUG = "dashboard";
const slugMap = {};
TABS.forEach((g,gi)=>g.items.forEach((item,ti)=>{slugMap[item.slug]={gi,ti};}));

// ═══ EMAIL CAPTURE ═══
const EmailCapture = () => {
  const [status, setStatus] = useState(null); // null | 'loading' | 'done' | 'error'
  const [subbed, setSubbed] = useState(false);
  const [freq, setFreq] = useState('weekly');
  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>{
      if(user?.user_metadata?.newsletter) setSubbed(true);
    });
  },[]);
  const subscribe = async () => {
    setStatus('loading');
    try {
      await supabase.auth.updateUser({ data:{ newsletter:true, newsletter_freq:freq } });
      setSubbed(true); setStatus('done');
    } catch(e) { setStatus('error'); }
  };
  if(subbed) return (
    <div style={{...S.card,background:K.s2,textAlign:"center",padding:"16px 20px"}}>
      <span style={{fontSize:12,color:K.gn,fontWeight:600}}>✓ Subscribed to weekly promo tips</span>
    </div>
  );
  return (
    <div style={{...S.card,background:K.s2,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,padding:"16px 20px"}}>
      <div>
        <div style={{fontFamily:fontD,fontSize:14,fontWeight:700,color:K.tx,marginBottom:3}}>Get weekly promo tips</div>
        <div style={{fontSize:11,color:K.mt}}>Best boosts of the week, new book promos, strategy tips. No spam.</div>
      </div>
      <select style={{...S.input,width:"auto",padding:"6px 10px",fontSize:11}} value={freq} onChange={e=>setFreq(e.target.value)}>
        <option value="daily">Daily digest</option>
        <option value="3x">3× per week</option>
        <option value="weekly">Weekly digest</option>
      </select>
      <button onClick={subscribe} disabled={status==='loading'} style={{padding:"9px 20px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:fontD,whiteSpace:"nowrap",opacity:status==='loading'?0.7:1}}>
        {status==='loading'?"Subscribing…":"Subscribe — it's free"}
      </button>
      {status==='error'&&<div style={{fontSize:11,color:K.rd,width:"100%"}}>Something went wrong. Try again.</div>}
    </div>
  );
};

// ═══ FOOTER ═══
const Footer = () => (
  <div style={{borderTop:`1px solid ${K.bd}`,padding:"28px 20px",marginTop:8}}>
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <p style={{fontSize:11,color:K.mt,lineHeight:1.9,marginBottom:8}}>
        <span style={{color:K.dm,fontWeight:600}}>Affiliate Disclosure:</span> Some links on this page are affiliate links. If you sign up at a sportsbook through these links, we may earn a commission at no extra cost to you. This does not influence our calculator results or editorial content.
      </p>
      <p style={{fontSize:11,color:K.mt,lineHeight:1.9,marginBottom:8}}>
        Must be 21+ (18+ in some states). Sports betting available only where legal. Gambling winnings are taxable income. This is an educational math tool — not gambling advice. If you or someone you know has a gambling problem, call <span style={{color:K.rd,fontWeight:600}}>1-800-GAMBLER</span>.
      </p>
      <p style={{fontSize:10,color:K.bd2,marginTop:12}}>
        © {new Date().getFullYear()} VaultSpark Studios · PromoGrind is a free educational calculator tool.
      </p>
    </div>
  </div>
);

// ═══ MAIN APP ═══
export default function App() {
  const [authReady, setAuthReady] = useState(() => {
    // Optimistic: show app immediately if Supabase has a cached token
    try { return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.includes('-auth-token')); } catch { return false; }
  });
  const [proStatus, setProStatus] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('pg_dark')!=='false'; } catch { return true; }
  });
  const [compactMode, setCompactMode] = useState(() => {
    try { return localStorage.getItem('pg_compact')==='true'; } catch { return false; }
  });
  const toggleDark = () => setDarkMode(d => { const n=!d; try{localStorage.setItem('pg_dark',String(n));}catch{}; return n; });
  const toggleCompact = () => setCompactMode(c => { const n=!c; try{localStorage.setItem('pg_compact',String(n));}catch{}; return n; });
  const [appData, setAppData] = useState(() => { try { return JSON.parse(localStorage.getItem('promo_engine_v3'))||{}; } catch { return {}; } });
  const [syncStatus, setSyncStatus] = useState(null);
  const syncTimer = useRef(null);
  useEffect(() => { loadData().then(d => { if(d) setAppData(d); }); }, []);
  const syncAppData = (d) => {
    setAppData(d);
    setSyncStatus('syncing');
    saveData(d).then(() => {
      setSyncStatus('saved');
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => setSyncStatus(null), 2000);
    }).catch(() => setSyncStatus(null));
  };
  const [showCalcSearch, setShowCalcSearch] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem(ONBOARDING_KEY); } catch { return false; }
  });
  const dismissOnboarding = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    setShowOnboarding(false);
  };
  useEffect(()=>{ document.body.style.background = darkMode ? '#0a0e17' : '#f0f4f8'; },[darkMode]);
  const prevSlugRef = useRef(null);
  const tabMemory = useRef({});
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Keyboard ? shortcut for calc search
  useEffect(()=>{
    const handler = e => {
      if(e.key==='?' && e.target.tagName!=='INPUT' && e.target.tagName!=='TEXTAREA' && e.target.tagName!=='SELECT') {
        e.preventDefault();
        setShowCalcSearch(s=>!s);
      }
    };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[]);

  // Capture ?ref= referral code from URL on first load
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) localStorage.setItem('pg_ref', ref);
    } catch(e) {}
  }, []);

  // Auth + subscription load
  useEffect(() => {
    checkAuth().then(async ok => {
      if (ok) {
        setAuthReady(true);
        onDailyLogin();
        getSubscription().then(setProStatus);
        // Record referral if this user arrived via a referral link
        try {
          const refCode = localStorage.getItem('pg_ref');
          if (refCode) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && refCode !== session.user.id) {
              await supabase.from('referrals').insert({
                referrer_id: refCode,
                referred_user_id: session.user.id,
              });
              localStorage.removeItem('pg_ref');
            }
          }
        } catch(e) { /* non-critical — duplicate insert hits UNIQUE constraint silently */ }
      }
    });
  }, []);

  const slug = pathname.replace(/^\/+/, "") || DEFAULT_SLUG;
  const { gi=0, ti=0 } = slugMap[slug] || slugMap[DEFAULT_SLUG];
  const g = TABS[gi];
  const item = g.items[ti];
  const Comp = item?.c || (() => null);
  const isLiveTool = !!item?.pro;

  // Fire vault calc event on tab navigation (Convert + Calculate groups)
  useEffect(() => {
    if (!authReady || slug === prevSlugRef.current) return;
    prevSlugRef.current = slug;
    if (gi === 1 || gi === 2) onCalculation(slug);
  }, [slug, authReady, gi]);

  const goTo = (newGi, newTi) => {
    const resolvedTi = newTi !== undefined ? newTi : (tabMemory.current[newGi] ?? 0);
    tabMemory.current[newGi] = resolvedTi;
    navigate("/" + TABS[newGi].items[resolvedTi].slug);
  };

  // Record current sub-tab in memory whenever it changes
  useEffect(()=>{ tabMemory.current[gi] = ti; },[gi,ti]);

  const allCalcs = TABS.flatMap(g=>g.items.map(item=>({...item,group:g.group})));
  const handleCalcNavigate = (slug) => navigate('/'+slug);

  if (!authReady) {
    return (
      <div style={{fontFamily:font,fontSize:13,color:K.tx,background:K.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",color:K.mt}}>
          <div style={{fontSize:10,letterSpacing:"2px",textTransform:"uppercase"}}>Checking Vault access...</div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
    <AppDataCtx.Provider value={{ appData, syncAppData }}>
    <CompactCtx.Provider value={compactMode}>
    <div style={{fontFamily:font,fontSize:13,color:K.tx,background:K.bg,minHeight:"100vh",filter:darkMode?'none':'invert(0.95) hue-rotate(180deg)'}}>
      {showOnboarding && <OnboardingWizard onDone={dismissOnboarding}/>}
      {showCalcSearch && <CalcSearch allCalcs={allCalcs} onNavigate={handleCalcNavigate} onClose={()=>setShowCalcSearch(false)}/>}
      <div style={{background:`linear-gradient(135deg,${K.s1},${K.s2})`,borderBottom:`1px solid ${K.bd}`,padding:"16px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{cursor:"pointer"}} onClick={()=>navigate("/"+DEFAULT_SLUG)}>
            <div style={{fontFamily:fontD,fontSize:20,fontWeight:700,color:K.gn}}>PROMOGRIND</div>
            <div style={{fontSize:10,color:K.mt,letterSpacing:"2px",textTransform:"uppercase",marginTop:2}}>Free Sportsbook Promo Conversion Tools</div>
            <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap"}}>
              {[["22","Calculators"],["Free","Forever"],["vs $99-199/mo","Competitors charge"]].map(([val,label])=>(
                <div key={label} style={{display:"flex",alignItems:"baseline",gap:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:K.gn,fontFamily:fontD}}>{val}</span>
                  <span style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <DailyStreak/>
            {proStatus?.status === "active" && (
              <div style={{fontSize:10,fontWeight:700,color:K.pp,background:`${K.pp}15`,padding:"3px 10px",borderRadius:50,letterSpacing:"1px"}}>PRO</div>
            )}
            {syncStatus && <span style={{fontSize:9,color:syncStatus==='syncing'?K.yl:K.gn,fontFamily:font,letterSpacing:"0.5px",transition:"opacity 0.3s"}}>{syncStatus==='syncing'?'SYNCING…':'✓ SAVED'}</span>}
            <button onClick={toggleCompact} title={compactMode?"Show help sections":"Hide help sections"} style={{padding:"4px 10px",background:compactMode?`${K.ac}15`:"transparent",border:`1px solid ${compactMode?K.ac:K.bd2}`,borderRadius:6,color:compactMode?K.ac:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>
              {compactMode?"FULL":"COMPACT"}
            </button>
            <button onClick={toggleDark} title={darkMode?"Light mode":"Dark mode"} style={{padding:"4px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:12,cursor:"pointer",fontFamily:font}}>
              {darkMode?"☀":"🌙"}
            </button>
            <div style={{fontSize:10,color:K.mt,textAlign:"right",lineHeight:1.6}}>Free educational tool. Not gambling advice.<br/>21+ only. Gamble responsibly. 1-800-GAMBLER</div>
          </div>
        </div>
      </div>
      <div style={{background:K.s1,borderBottom:`1px solid ${K.bd}`,display:"flex",justifyContent:"center",overflowX:"auto"}}>
        <div style={{display:"flex",maxWidth:1100,width:"100%"}}>{TABS.map((t,i)=>(
          <button key={t.group} onClick={()=>goTo(i,0)} style={{padding:"11px 18px",fontSize:11,fontWeight:gi===i?700:400,color:gi===i?K.gn:K.mt,background:gi===i?`${K.gn}08`:"transparent",border:"none",borderBottom:gi===i?`2px solid ${K.gn}`:"2px solid transparent",cursor:"pointer",fontFamily:font,textTransform:"uppercase",letterSpacing:"1px"}}>{t.group}</button>
        ))}</div>
      </div>
      <div style={{position:"relative"}}>
        <div style={{background:K.s2,borderBottom:`1px solid ${K.bd}`,display:"flex",justifyContent:"center",overflowX:"auto"}}>
          <div style={{display:"flex",maxWidth:1100,width:"100%",gap:2}}>{g.items.map((t,i)=>(
            <button key={t.n} onClick={()=>goTo(gi,i)} style={{padding:"9px 14px",fontSize:11,fontWeight:ti===i?600:400,color:ti===i?K.ac:K.dm,background:"transparent",border:"none",borderBottom:ti===i?`2px solid ${K.ac}`:"2px solid transparent",cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>{t.n}</button>
          ))}</div>
        </div>
        <div style={{position:"absolute",right:0,top:0,bottom:0,width:48,background:`linear-gradient(to left,${K.s2},transparent)`,pointerEvents:"none",zIndex:1}}/>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"20px"}}>
        <ErrorBoundary>
          {isLiveTool ? <Comp proStatus={proStatus} mode={slug}/> : <Comp/>}
        </ErrorBoundary>
      </div>
      <EmailCapture/>
      <Footer/>
      <div style={{height:56}}/>
      <MobileBottomNav gi={gi} goTo={goTo}/>
      <QuickCalcPanel goTo={goTo}/>
    </div>
    </CompactCtx.Provider>
    </AppDataCtx.Provider>
    </ToastProvider>
  );
}
