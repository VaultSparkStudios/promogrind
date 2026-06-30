import React, { useEffect, useState } from "react";
import { supabase } from "../auth.js";
import { GiftTrialBox } from "../app/AppSubcomponents.jsx";
import { CANONICAL_APP_URL } from "../launchState.js";
import { trackEvent } from "../analytics.js";
import { K, font } from "../lib/shared.js";
import { S, Tl } from "../ui.jsx";

const ReferralHub = () => {
  const [copied, setCopied] = useState(false);
  const [refCount, setRefCount] = useState(null);
  const [userId, setUserId] = useState(null);
  const [rhUser, setRhUser] = useState(null);
  const [influencerCode, setInfluencerCode] = React.useState('');
  const [savedInfluencerCode, setSavedInfluencerCode] = React.useState('');
  const [influencerStats, setInfluencerStats] = React.useState({ clicks: 0, signups: 0 });
  const rhIsPro = () => { try { return ['vault_sparked','pro','trial'].includes(localStorage.getItem('pg_pro_status')||''); } catch { return false; } };
  useEffect(()=>{
    supabase.auth.getSession().then(async ({data:{session}})=>{
      if(session) {
        setUserId(session.user.id);
        setRhUser(session.user);
        try {
          const { data } = await supabase.rpc('get_my_referral_count');
          setRefCount(typeof data === 'number' ? data : 0);
        } catch(e) { setRefCount(0); }
        if(rhIsPro()) {
          supabase.from('influencer_codes').select('code, clicks, signups').eq('user_id', session.user.id).single()
            .then(({ data }) => {
              if (data) {
                setSavedInfluencerCode(data.code);
                setInfluencerCode(data.code);
                setInfluencerStats({ clicks: data.clicks || 0, signups: data.signups || 0 });
              }
            });
        }
      }
    });
  },[]);
  const saveInfluencerCode = async () => {
    if (!influencerCode.trim() || influencerCode.length < 3 || !rhUser) return;
    const { error } = await supabase.from('influencer_codes').upsert({ user_id: rhUser.id, code: influencerCode }, { onConflict: 'user_id' });
    if (!error) setSavedInfluencerCode(influencerCode);
  };
  const refLink = userId ? `${CANONICAL_APP_URL}?ref=${userId}` : "Loadingâ€¦";
  const copy = () => { try{navigator.clipboard.writeText(refLink); trackEvent('referral_shared'); localStorage.setItem('pg_referral_shared','1');}catch(e){} setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (<div><div style={S.card}><Tl t="Refer &amp; Earn" badge="FREE VAULTSPARKED" bc={K.pp}/>
    <div style={{...S.note(K.pp),marginBottom:16}}>Share your link. When a friend signs up and subscribes to VaultSparked, you both get <strong>30 days free</strong>. No limit on referrals.</div>
    <div style={{marginBottom:16}}>
      <div style={S.label}>Your Referral Link</div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{...S.input,flex:1,color:K.dm,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"default"}}>{refLink}</div>
        <button onClick={copy} style={{padding:"8px 16px",background:copied?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11,whiteSpace:"nowrap"}}>{copied?"âœ“ Copied!":"Copy Link"}</button>
      </div>
    </div>
    <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
      <div><div style={{fontSize:10,color:K.mt}}>YOUR REFERRALS</div><div style={S.big(K.pp)}>{refCount===null?'â€¦':refCount}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>FREE DAYS EARNED</div><div style={S.big(K.gn)}>{refCount===null?'â€¦':(refCount||0)*30}</div></div>
    </div>
    <div style={{marginTop:16,padding:12,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:11,fontWeight:700,color:K.tx,marginBottom:8}}>Share on</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[
          {label:"Twitter/X",color:"#1DA1F2",msg:`I've been making extra income every month using PromoGrind â€” free sportsbook promo conversion tools. Way better than paying $99/mo for OddsJam. Check it out: ${refLink}`},
          {label:"Discord",color:"#5865F2",msg:`**PromoGrind** â€” free matched betting tools. 22 calculators, live arb scanner. Sign up free: ${refLink}`},
          {label:"Reddit",color:"#FF4500",msg:`Has anyone else been using PromoGrind? It's free and has all the calculators you need for promo conversion. Link: ${refLink}`},
        ].map(({label,color,msg})=>(
          <button key={label} onClick={()=>{try{navigator.clipboard.writeText(msg);}catch(e){} }} style={{padding:"6px 14px",background:`${color}15`,border:`1px solid ${color}40`,borderRadius:6,color,fontSize:11,cursor:"pointer",fontFamily:font}}>Copy {label} Post</button>
        ))}
      </div>
    </div>
    {rhIsPro() && (
      <div style={{marginTop:24,padding:16,background:'#0f1724',border:'1px solid #1e293b',borderRadius:8}}>
        <div style={{fontWeight:700,color:'#4ade80',marginBottom:12}}>âš¡ Creator Mode</div>
        <p style={{color:'#94a3b8',fontSize:13,marginBottom:16}}>
          Create a custom vanity link to share with your audience. Track clicks and signups in real time.
        </p>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <input
            type="text"
            placeholder="your-brand (letters/numbers/hyphens)"
            value={influencerCode}
            onChange={e => setInfluencerCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,30))}
            style={{flex:1,padding:'8px 12px',background:'#0a0e17',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:13}}
          />
          <button
            onClick={saveInfluencerCode}
            style={{padding:'8px 16px',background:'#4ade80',color:'#0a0e17',border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',fontSize:13}}
          >Save Code</button>
        </div>
        {savedInfluencerCode && (
          <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
              <div style={{padding:12,background:'#0a0e17',borderRadius:6,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:'#4ade80'}}>{influencerStats.clicks}</div>
                <div style={{fontSize:11,color:'#64748b'}}>CLICKS</div>
              </div>
              <div style={{padding:12,background:'#0a0e17',borderRadius:6,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:'#4ade80'}}>{influencerStats.signups}</div>
                <div style={{fontSize:11,color:'#64748b'}}>SIGNUPS</div>
              </div>
              <div style={{padding:12,background:'#0a0e17',borderRadius:6,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:'#4ade80'}}>${(influencerStats.signups * 8).toFixed(0)}</div>
                <div style={{fontSize:11,color:'#64748b'}}>EST. VALUE</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input
                readOnly
                value={`${CANONICAL_APP_URL}?ref=${savedInfluencerCode}`}
                style={{flex:1,padding:'8px 12px',background:'#0a0e17',border:'1px solid #1e293b',color:'#94a3b8',borderRadius:6,fontSize:12}}
              />
              <button
                onClick={() => { navigator.clipboard.writeText(`${CANONICAL_APP_URL}?ref=${savedInfluencerCode}`); }}
                style={{padding:'8px 12px',background:'#1e293b',border:'none',color:'#e2e8f0',borderRadius:6,cursor:'pointer',fontSize:13}}
              >Copy</button>
            </div>
          </>
        )}
      </div>
    )}
    <div style={{marginTop:20,padding:16,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:11,fontWeight:700,color:K.gn,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>ðŸŽ Gift 14 Days Free</div>
      <div style={{fontSize:11,color:K.dm,marginBottom:12,lineHeight:1.6}}>Give a friend 14 days of VaultSparked Pro for free. They get the Live Scanner, +EV Scanner, and all Pro tools. You earn 7 bonus days when they sign up.</div>
      <GiftTrialBox/>
    </div>
  </div></div>);
};

export default ReferralHub;
