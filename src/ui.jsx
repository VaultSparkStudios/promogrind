import React, { useState } from "react";
import { toD, K, font, fontD, S as _S } from "./lib/shared.js";
import { CANONICAL_APP_URL, FREE_VAULT_MEMBERSHIP_URL, getFeatureState } from "./launchState.js";
import { trackFeatureGateSeen, trackFeatureGateClick } from "./launchTelemetry.js";
import { CompactCtx } from "./contexts.jsx";

// Extend S with JSX meter (shared.js stays pure JS)
_S.meter = (pct, c) => (<div style={{marginTop:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:10,color:K.mt}}>QUALITY</span><span style={{fontSize:10,color:c,fontWeight:600}}>{pct>=70?"EXCELLENT":pct>=60?"GOOD":pct>=50?"FAIR":"POOR"} ({pct}%)</span></div><div style={{height:4,borderRadius:2,background:K.s3}}><div style={{height:4,borderRadius:2,background:c,width:`${Math.min(100,pct)}%`,transition:"width 0.4s"}}/></div></div>);
export const S = _S;

// ═══ UI ATOMS ═══
export const In = ({l,v,set,ph,pre,err}) => {
  const isOdds = l && /odds/i.test(l);
  const isNumeric = l && /amount|size|stake|bet|bankroll|balance|fee|payout|odds|%|boost/i.test(l);
  const oddsErr = isOdds && v && v.trim() && toD(v) <= 1 ? 'Invalid odds' : null;
  const displayErr = err || oddsErr;
  return (<div style={S.col}><label style={S.label}>{l}</label><div style={{position:"relative"}}>{pre&&<span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:K.mt,fontSize:12}}>{pre}</span>}<input inputMode={isNumeric?"decimal":undefined} style={{...S.input,...(pre?{paddingLeft:22}:{}),...(displayErr?{borderColor:K.rd}:{})}} value={v} onChange={e=>set(e.target.value)} placeholder={ph}/>{displayErr&&<div style={{fontSize:10,color:K.rd,marginTop:2}}>{displayErr}</div>}</div></div>);
};
export const RR = ({l,v,c,b}) => (<div style={S.rr}><span style={{fontSize:12,color:K.dm}}>{l}</span><span style={{fontSize:13,fontWeight:b?700:500,color:c||K.tx}}>{v}</span></div>);
export const Tl = ({t,badge,bc,shareable,getParams}) => {
  const [copied,setCopied]=useState(false);
  const [embedCopied,setEmbedCopied]=useState(false);
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
  const copyEmbed=()=>{
    const slug = window.location.pathname.replace(/^\/+/,'');
    const iframe = `<iframe src="${CANONICAL_APP_URL}?embed=1#/${slug}" width="480" height="600" frameborder="0"></iframe>`;
    try{navigator.clipboard.writeText(iframe);}catch(e){}
    setEmbedCopied(true); setTimeout(()=>setEmbedCopied(false),1500);
  };
  return (<div style={{fontSize:16,fontWeight:600,color:K.tx,marginBottom:14,display:"flex",alignItems:"center",gap:8,fontFamily:fontD,flexWrap:"wrap"}}>
    <span>{t}</span>
    {badge&&<span style={{...S.tag(bc||K.ac)}}>{badge}</span>}
    {shareable&&<button onClick={copy} style={{marginLeft:"auto",padding:"2px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:copied?K.gn:K.mt,fontSize:9,cursor:"pointer",fontFamily:font,letterSpacing:"1px",whiteSpace:"nowrap"}}>{copied?"✓ COPIED":"⎘ SHARE"}</button>}
    {shareable&&<button onClick={copyEmbed} style={{padding:"2px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:embedCopied?K.gn:K.mt,fontSize:9,cursor:"pointer",fontFamily:font,letterSpacing:"1px",whiteSpace:"nowrap"}}>{embedCopied?"✓ Copied!":"<> Embed"}</button>}
  </div>);
};
export const Nt = ({children,c}) => (<div style={S.note(c)}>{children}</div>);

// ═══ BOOK CTA ═══
export const BookCTA = () => (
  <div style={{marginTop:14,padding:12,background:`${K.gn}06`,border:`1px solid ${K.gn}20`,borderRadius:8}}>
    <div style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:8}}>Don't have these books yet? Open accounts to use this promo:</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}></div>
  </div>
);

// ═══ FEATURE UNAVAILABLE CARD ═══
export const FeatureUnavailableCard = ({ featureKey, title, body }) => {
  const feature = getFeatureState(featureKey);
  React.useEffect(() => {
    trackFeatureGateSeen(feature.key);
  }, [feature.key]);
  return (
    <div style={{...S.card,border:`1px solid ${K.yl}40`,background:`${K.yl}08`}}>
      <Tl t={title || feature.label} badge="BETA / SETUP PENDING" bc={K.yl}/>
      <div style={{fontSize:12,color:K.dm,lineHeight:1.7,marginBottom:10}}>
        {body || feature.shortReason}
      </div>
      <div style={{fontSize:11,color:K.mt,lineHeight:1.6}}>
        {feature.setup}
      </div>
      <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap",alignItems:"center"}}>
        <a
          href={FREE_VAULT_MEMBERSHIP_URL}
          onClick={() => trackFeatureGateClick(feature.key, "free-membership")}
          style={{padding:"7px 12px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,fontWeight:700,textDecoration:"none",fontFamily:font}}
        >
          Free Vault membership
        </a>
        <span style={{fontSize:10,color:K.mt}}>Setup progress appears in the dashboard launch panel.</span>
      </div>
    </div>
  );
};

// ═══ CALC MEMORY HOOK ═══
export const useCalcMemory = (slug, defaults) => {
  const key = `pg_calc_${slug}`;
  const stored = (() => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } })();
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

// ═══ UPGRADE TRIGGER HELPERS ═══
export function shouldShowTrigger(triggerKey) {
  if (localStorage.getItem(`pg_trigger_dismissed_${triggerKey}`)) return false;
  return true;
}
export function dismissTrigger(triggerKey, setter) {
  localStorage.setItem(`pg_trigger_dismissed_${triggerKey}`, '1');
  setter(false);
}

// ═══ HELP ACCORDION ═══
export const Help = ({entries}) => {
  const compact = React.useContext(CompactCtx);
  if(compact) return null;
  return (<div style={{...S.card,background:K.s2,borderColor:K.bd,marginTop:12}}><div style={{fontSize:12,fontWeight:600,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>How This Works</div><div style={S.help}>{entries.map((e,i)=><div key={i} style={{marginBottom:10}}><span style={S.helpTerm}>{e[0]}:</span> {e[1]}</div>)}</div></div>);
};
