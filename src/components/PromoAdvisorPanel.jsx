import { useState } from "react";
import { supabase } from "../auth.js";
import { FEATURE_FLAGS } from "../launchState.js";
import { FeatureUnavailableCard } from "../ui.jsx";
import { useToast } from "../contexts.jsx";
import { K, font } from "../lib/shared.js";

export const PromoAdvisorPanel = ({ proStatus, onClose }) => {
  if (!FEATURE_FLAGS.promoAdvisor) {
    return (
      <div style={{position:'fixed',top:80,right:20,width:360,maxWidth:'calc(100vw - 40px)',zIndex:9998}}>
        <FeatureUnavailableCard featureKey="promoAdvisor" title="Promo Advisor" body="Promo Advisor will appear here once the AI explainer backend is activated." />
      </div>
    );
  }
  const isPro = proStatus?.status === 'active' || proStatus?.status === 'trial';
  const DAILY_LIMIT = isPro ? 9999 : 3;
  const [promoText, setPromoText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uses, setUses] = useState(() => {
    try {
      const todayKey = `pg_advisor_uses_${new Date().toISOString().slice(0,10)}`;
      return parseInt(localStorage.getItem(todayKey) || '0');
    } catch { return 0; }
  });
  const toast = useToast();

  const analyze = async () => {
    if (!promoText.trim() || uses >= DAILY_LIMIT || loading) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('promo-advisor', {
        body: { promoText: promoText.trim() }
      });
      if (fnErr) throw fnErr;
      const newUses = uses + 1;
      setUses(newUses);
      try { localStorage.setItem(`pg_advisor_uses_${new Date().toISOString().slice(0,10)}`, String(newUses)); } catch {}
      setResult(data);
    } catch(e) {
      setError('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isLimited = uses >= DAILY_LIMIT && !isPro;
  const ratingColor = result?.rating === 'excellent' ? K.gn : result?.rating === 'good' ? K.ac : result?.rating === 'poor' ? K.rd : K.yl;

  return (
    <div style={{position:'fixed',right:0,top:0,bottom:0,width:360,background:K.s1,borderLeft:`1px solid ${K.bd}`,zIndex:1100,display:'flex',flexDirection:'column',boxShadow:'-4px 0 32px rgba(0,0,0,0.6)'}}>
      <div style={{padding:'14px 16px',borderBottom:`1px solid ${K.bd}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:K.s2}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:K.tx}}>💡 Promo Advisor</div>
          <div style={{fontSize:11,color:K.mt,marginTop:2}}>Paste any promo — get an instant plain-English verdict</div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:K.mt,fontSize:18,padding:4}}>×</button>
      </div>
      <div style={{flex:1,overflow:'auto',padding:16,display:'flex',flexDirection:'column',gap:12}}>
        <textarea
          value={promoText}
          onChange={e => setPromoText(e.target.value)}
          placeholder={'Example: "Get a $200 Bonus Bet if your first $5 bet loses. Bonus bet expires in 7 days."\n\nOr paste the full promo T&C text.'}
          style={{width:'100%',minHeight:130,background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8,padding:10,color:K.tx,fontSize:12,resize:'vertical',fontFamily:font,boxSizing:'border-box',lineHeight:1.5}}
        />
        {!isPro && (
          <div style={{fontSize:11,color:K.mt,textAlign:'right'}}>{uses}/{DAILY_LIMIT} free analyses today</div>
        )}
        {isLimited && (
          <div style={{background:`${K.pp}15`,border:`1px solid ${K.pp}30`,borderRadius:8,padding:10,fontSize:12,color:K.pp,textAlign:'center'}}>
            Daily limit reached. Upgrade to VaultSparked for unlimited analyses.
          </div>
        )}
        <button
          onClick={analyze}
          disabled={loading || !promoText.trim() || isLimited}
          style={{padding:'9px',background:isLimited?K.s2:'#7c3aed',border:`1px solid ${isLimited?K.bd:'#7c3aed'}`,borderRadius:8,color:isLimited?K.mt:'#fff',fontWeight:700,fontSize:12,cursor:loading||isLimited?'default':'pointer',fontFamily:font,opacity:loading?0.7:1}}
        >
          {loading ? '⏳ Analyzing...' : '🔍 Analyze This Promo'}
        </button>
        {error && <div style={{color:K.rd,fontSize:12}}>{error}</div>}
        {result && (
          <div style={{background:`${ratingColor}10`,border:`1px solid ${ratingColor}40`,borderRadius:10,padding:14,display:'flex',flexDirection:'column',gap:8}}>
            <div style={{fontSize:15,fontWeight:800,color:ratingColor}}>{result.verdict || 'Analysis Complete'}</div>
            {result.explanation && <div style={{fontSize:12,color:K.dm,lineHeight:1.6}}>{result.explanation}</div>}
            {result.ev && <div style={{fontSize:12}}><span style={{color:K.mt}}>Expected Value: </span><span style={{color:K.gn,fontWeight:700}}>{result.ev}</span></div>}
            {result.action && <div style={{fontSize:12}}><span style={{color:K.mt}}>Best Action: </span><span style={{color:K.ac,fontWeight:700}}>{result.action}</span></div>}
            {result.hedge && <div style={{fontSize:12}}><span style={{color:K.mt}}>Hedge Strategy: </span><span style={{color:K.pp,fontWeight:700}}>{result.hedge}</span></div>}
          </div>
        )}
        {!isPro && (
          <div style={{marginTop:'auto',padding:12,background:`${K.pp}08`,border:`1px solid ${K.pp}20`,borderRadius:8,fontSize:11,color:K.mt,textAlign:'center'}}>
            VaultSparked members get unlimited Promo Advisor + Live Arb Scanner + AI Action Plan
          </div>
        )}
      </div>
    </div>
  );
};
