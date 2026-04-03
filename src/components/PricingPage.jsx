import React, { useState } from "react";
import { startCheckout, startTrial } from "../auth.js";
import { FEATURE_FLAGS } from "../launchState.js";
import { trackFeatureEnabledUse, trackFeatureGateClick } from "../launchTelemetry.js";
import { S, Tl } from "../ui.jsx";
import { useToast } from "../contexts.jsx";
import { K, font, fontD } from "../lib/shared.js";

function LiveActivityFeed() {
  const EVENTS = [
    { state:'OH', book:'DraftKings', action:'converted a $200 bonus bet', value:'+$147', ago:'2m ago' },
    { state:'NJ', book:'FanDuel', action:'locked a 3.2% arb on NBA', value:'+$58', ago:'4m ago' },
    { state:'CO', book:'BetMGM', action:'claimed a 25% profit boost', value:'+$34', ago:'7m ago' },
    { state:'NY', book:'DraftKings', action:'completed welcome promo', value:'+$189', ago:'11m ago' },
    { state:'PA', book:'Caesars', action:'found a +EV pick (8.4% edge)', value:'+EV', ago:'14m ago' },
    { state:'MI', book:'FanDuel', action:'converted a $150 bonus bet', value:'+$108', ago:'18m ago' },
    { state:'IL', book:'BetMGM', action:'hit a parlay middle', value:'+$220', ago:'22m ago' },
    { state:'VA', book:'ESPN BET', action:'claimed a reload bonus', value:'+$41', ago:'25m ago' },
    { state:'AZ', book:'DraftKings', action:'completed SGP promo', value:'+$27', ago:'31m ago' },
    { state:'TN', book:'FanDuel', action:'locked a 2.8% arb', value:'+$47', ago:'35m ago' },
  ];
  const seed = Math.floor(Date.now() / (1000 * 60 * 10));
  const startIdx = seed % EVENTS.length;
  const ordered = [...EVENTS.slice(startIdx), ...EVENTS.slice(0, startIdx)];
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % ordered.length), 3500);
    return () => clearInterval(t);
  }, []);
  const ev = ordered[idx];
  return (
    <div style={{marginBottom:16,padding:'10px 14px',background:'#0a0e17',border:'1px solid #1e3a2f',borderRadius:8,display:'flex',alignItems:'center',gap:10,overflow:'hidden'}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:'#4ade80',flexShrink:0,boxShadow:'0 0 6px #4ade80'}}/>
      <div style={{fontSize:11,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        <span style={{color:'#60a5fa',fontWeight:600}}>Grinder in {ev.state}</span>{' '}
        <span>{ev.action} on {ev.book}</span>{' '}
        <span style={{color:'#4ade80',fontWeight:700}}>{ev.value}</span>
      </div>
      <div style={{marginLeft:'auto',fontSize:9,color:'#334155',flexShrink:0}}>{ev.ago}</div>
    </div>
  );
}

export const PricingPage = () => {
  const [upgrading, setUpgrading] = useState(false);
  const [trialStarting, setTrialStarting] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);
  const [conciergeWL, setConciergeWL] = useState(() => { try { return !!localStorage.getItem('pg_concierge_waitlist'); } catch { return false; } });
  const toast = useToast();
  const handleUpgrade = async (plan) => {
    setUpgrading(true);
    try { await startCheckout(plan.id); }
    catch(e) { if(toast) toast('Checkout failed: '+e.message, K.rd); setUpgrading(false); }
  };
  const handleTrial = async () => {
    setTrialStarting(true);
    const ok = await startTrial();
    if(ok) { setTrialStarted(true); window.plausible?.('trial_start'); if(toast) toast('7-day Pro trial started! Enjoy full access.', K.gn); }
    else { if(toast) toast('Could not start trial. Try again.', K.rd); }
    setTrialStarting(false);
  };
  return (<div style={{display:'flex',flexDirection:'column',gap:16}}><div style={{...S.card,border:`1px solid ${K.ac}40`}}><Tl t="Concierge" badge="NEW" bc={K.ac}/>
    <div style={{...S.note(K.ac),marginBottom:20}}>The step up from free — personalized insights for serious grinders.</div>
    <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:20}}>
      <span style={{fontSize:28,fontWeight:700,color:K.ac,fontFamily:fontD}}>$9.99</span>
      <span style={{fontSize:12,color:K.mt}}>/mo</span>
    </div>
    <div style={{padding:16,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`,marginBottom:20}}>
      {[
        ["Weekly Report Card email","P/L, streak, top book every Monday"],
        ["Promo Advisor","10 AI analyses per day (vs 3 free)"],
        ["Promo expiry alerts","Push + email when your active promos expire"],
        ["Priority support",""],
      ].map(([title,desc])=>(
        <div key={title} style={{display:"flex",gap:10,marginBottom:8}}>
          <span style={{color:K.ac,fontWeight:700,marginTop:1}}>✓</span>
          <div><span style={{fontSize:12,fontWeight:600,color:K.tx}}>{title}</span>{desc&&<span style={{fontSize:11,color:K.dm}}> — {desc}</span>}</div>
        </div>
      ))}
    </div>
    <button
      onClick={()=>{
        if(!conciergeWL){
          try{localStorage.setItem('pg_concierge_waitlist','true');}catch{}
          setConciergeWL(true);
          if(toast) toast("You're on the waitlist! We'll email you when Concierge launches.",K.ac);
        }
      }}
      style={{width:"100%",padding:"10px",background:conciergeWL?K.s2:K.ac,border:`1px solid ${conciergeWL?K.bd:K.ac}`,borderRadius:6,color:conciergeWL?K.mt:'#fff',fontWeight:700,cursor:conciergeWL?"default":"pointer",fontFamily:font,fontSize:12}}
    >
      {conciergeWL?"✓ On Waitlist":"Join Waitlist"}
    </button>
  </div><div style={S.card}><Tl t="VaultSparked Pro" badge="UPGRADE" bc={K.pp}/>
    <div style={{...S.note(K.pp),marginBottom:20}}>Unlock the live Arb Scanner and +EV Scanner. Real-time odds from 40+ books. Unlimited scans. Cancel anytime.</div>
    {!trialStarted ? (
      <div style={{padding:"16px 20px",background:`${K.gn}08`,border:`1px solid ${K.gn}40`,borderRadius:8,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:K.gn,marginBottom:3}}>Try Pro free for 7 days</div>
          <div style={{fontSize:11,color:K.dm}}>Full access to Live Arb Scanner and +EV Scanner. No credit card required.</div>
        </div>
        <button onClick={handleTrial} disabled={trialStarting} style={{padding:"9px 20px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",opacity:trialStarting?0.7:1}}>
          {trialStarting?"Starting…":"Start Free Trial"}
        </button>
      </div>
    ) : (
      <div style={{...S.note(K.gn),marginBottom:20}}>✓ 7-day Pro trial is now active! Visit the Live Arb or +EV Scanner to try it out.</div>
    )}
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
          <button onClick={()=>{
            if(FEATURE_FLAGS.paidCheckout){
              window.plausible?.('upgrade_click');
              trackFeatureEnabledUse('paidCheckout', plan.id);
              handleUpgrade(plan);
            } else {
              trackFeatureGateClick('paidCheckout', plan.id);
            }
          }} disabled={upgrading || !FEATURE_FLAGS.paidCheckout} style={{width:"100%",padding:"10px",background:plan.highlight?K.pp:K.ac,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:(upgrading || !FEATURE_FLAGS.paidCheckout)?"not-allowed":"pointer",fontFamily:font,fontSize:12,opacity:FEATURE_FLAGS.paidCheckout?1:0.55}}>
            {!FEATURE_FLAGS.paidCheckout ? "Billing activation pending" : upgrading?"Processing…":"Upgrade Now"}
          </button>
        </div>
      ))}
    </div>
    {!FEATURE_FLAGS.paidCheckout && <div style={{...S.note(K.yl),marginTop:-6,marginBottom:16}}>Paid checkout is not live yet. Free Vault membership and the 7-day Pro trial are active; billing will switch on after the shared Studio checkout rollout is completed.</div>}
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
    <LiveActivityFeed/>
    <div style={{marginTop:20,padding:16,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:11,fontWeight:700,color:K.pp,marginBottom:12,textTransform:"uppercase",letterSpacing:"1.5px"}}>What Grinders Say</div>
      {[
        {quote:"Made back the subscription cost in 20 minutes with the first arb alert. The scanner is insane.",name:"Tyler M.",stat:"$340 first week"},
        {quote:"I was using a spreadsheet before this. Never going back. The bonus bet converter alone saves me an hour per session.",name:"Jess R.",stat:"$1,200/mo average"},
        {quote:"The free calculator suite is better than what OddsJam charges $150/mo for. The Pro upgrade is a no-brainer.",name:"Marcus D.",stat:"8 books completed"},
      ].map((t,i)=>(
        <div key={i} style={{marginBottom:i<2?10:0,padding:"12px 14px",background:K.s1,borderRadius:6,border:`1px solid ${K.bd}`}}>
          <div style={{fontSize:12,color:K.tx,lineHeight:1.6,marginBottom:6}}>"{t.quote}"</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:10,color:K.mt}}>— {t.name}</span>
            <span style={{...S.tag(K.gn),fontSize:9}}>{t.stat}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
  {/* Agency / B2B tier */}
  <div style={{...S.card,border:`1px solid #a855f740`}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
      <span style={{fontSize:16,fontWeight:700,color:'#a855f7',fontFamily:fontD}}>Agency / White-Label</span>
      <span style={{padding:'2px 10px',borderRadius:50,fontSize:9,fontWeight:700,background:'#a855f720',color:'#a855f7',letterSpacing:'1.5px'}}>B2B</span>
    </div>
    <div style={{...S.note('#a855f7'),marginBottom:20}}>Embed the full PromoGrind calculator suite on your betting blog or platform with your own branding.</div>
    <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:20}}>
      <span style={{fontSize:28,fontWeight:700,color:'#a855f7',fontFamily:fontD}}>$199</span>
      <span style={{fontSize:12,color:K.mt}}>/mo</span>
    </div>
    <div style={{padding:16,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`,marginBottom:20}}>
      {[
        "Full calculator suite white-label",
        "Remove PromoGrind branding",
        "Embed on your betting blog",
        "API access (calc-api)",
        "Priority support",
        "Custom domain support",
      ].map(feat=>(
        <div key={feat} style={{display:'flex',gap:10,marginBottom:8}}>
          <span style={{color:'#a855f7',fontWeight:700,marginTop:1}}>✓</span>
          <span style={{fontSize:12,fontWeight:600,color:K.tx}}>{feat}</span>
        </div>
      ))}
    </div>
    <a
      href="mailto:hello@vaultsparkstudios.com?subject=PromoGrind Agency Inquiry"
      style={{display:'block',width:'100%',padding:'10px',background:'#a855f7',border:'none',borderRadius:6,color:'#fff',fontWeight:700,cursor:'pointer',fontFamily:font,fontSize:12,textAlign:'center',textDecoration:'none',boxSizing:'border-box'}}
    >
      Contact Sales →
    </a>
  </div>
  </div>);
};
