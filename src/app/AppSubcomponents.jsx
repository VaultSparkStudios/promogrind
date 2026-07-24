import React from "react";
import { supabase } from "../auth.js";
import { S, K, font, fontD } from "../lib/shared.js";

export function GiftTrialBox() {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState(null);
  const [giftLink, setGiftLink] = React.useState('');
  const send = async () => {
    if (!email.includes('@')) return;
    setStatus('loading');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');
      const { data, error } = await supabase.functions.invoke('gift-trial', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { recipientEmail: email },
      });
      if (error) throw error;
      setGiftLink(data?.giftUrl || '');
      setStatus('sent');
    } catch (e) { setStatus('error'); }
  };
  if (status === 'sent') return (
    <div style={{padding:'10px 12px',background:'#1e3a2f',borderRadius:6,border:'1px solid #4ade8040'}}>
      <div style={{fontSize:12,color:'#4ade80',fontWeight:700,marginBottom:6}}>✓ Gift sent to {email}</div>
      {giftLink && <div style={{fontSize:10,color:'#64748b',wordBreak:'break-all'}}>Gift link: <span style={{color:'#60a5fa'}}>{giftLink}</span></div>}
      <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>They'll get an email with 14-day Pro access. You earned 7 bonus days.</div>
    </div>
  );
  return (
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <input type="email" placeholder="friend@email.com" value={email} onChange={e=>setEmail(e.target.value)}
        style={{flex:1,minWidth:180,padding:'8px 10px',background:'#0a0e17',border:'1px solid #1e293b',borderRadius:6,color:'#e2e8f0',fontFamily:"'JetBrains Mono',monospace",fontSize:13,outline:'none',boxSizing:'border-box'}}
        onKeyDown={e=>e.key==='Enter'&&send()}
      />
      <button onClick={send} disabled={status==='loading'||!email.includes('@')}
        style={{padding:'8px 16px',background:email.includes('@')?'#4ade80':'#1e293b',border:'none',borderRadius:6,color:email.includes('@')?'#0a0e17':'#475569',fontWeight:700,fontSize:12,cursor:email.includes('@')?'pointer':'not-allowed',whiteSpace:'nowrap',opacity:status==='loading'?0.7:1}}>
        {status==='loading'?'Sending…':'Send Gift →'}
      </button>
      {status==='error'&&<div style={{fontSize:11,color:'#f87171',width:'100%'}}>Failed — check the email or try again.</div>}
    </div>
  );
}

export function StarterPackModal({ onClose, syncAppData, appData }) {
  const PACKS = [
    { id:'casual', label:'Casual Bettor', icon:'🎲', bankroll:'500', goal:200, hrs:'2 hrs/week', desc:'A few books, occasional promos. Perfect for weekends.' },
    { id:'hunter', label:'Promo Hunter', icon:'🎯', bankroll:'2000', goal:800, hrs:'5 hrs/week', desc:'Hit every welcome offer. Build a steady tracked promo value.' },
    { id:'grinder', label:'Full Grinder', icon:'⚡', bankroll:'5000', goal:2500, hrs:'Daily', desc:'All books, recurring promos, live scanner. Maximum extraction.' },
  ];
  const [selected, setSelected] = React.useState(null);
  const apply = (pack) => {
    try { localStorage.setItem('pg_bankroll', pack.bankroll); } catch {}
    syncAppData({ ...appData, profitGoal: pack.goal });
    try { localStorage.setItem('pg_starter_pack_done', '1'); } catch {}
    onClose();
  };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'#0f1520',border:'1px solid #1e293b',borderRadius:12,padding:24,maxWidth:480,width:'100%',boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
        <div style={{fontFamily:fontD,fontSize:18,fontWeight:700,color:K.tx,marginBottom:4}}>How do you want to play it?</div>
        <div style={{fontSize:12,color:K.mt,marginBottom:20}}>Choose a starter profile — sets your bankroll and profit goal. You can change these anytime.</div>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
          {PACKS.map(p=>(
            <div key={p.id} onClick={()=>setSelected(p.id)}
              style={{padding:'14px 16px',background:selected===p.id?'#1e3a2f':K.s3,border:`2px solid ${selected===p.id?K.gn:K.bd}`,borderRadius:8,cursor:'pointer',transition:'border-color 0.15s'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <span style={{fontSize:20}}>{p.icon}</span>
                <span style={{fontWeight:700,color:K.tx,fontSize:14}}>{p.label}</span>
                <span style={{marginLeft:'auto',fontSize:10,color:K.ac,fontWeight:600}}>${parseInt(p.bankroll).toLocaleString()} bankroll · ${p.goal.toLocaleString()} goal</span>
              </div>
              <div style={{fontSize:11,color:K.mt,marginLeft:30}}>{p.desc} · {p.hrs}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>{const p=PACKS.find(x=>x.id===selected);if(p)apply(p);}} disabled={!selected}
            style={{flex:1,padding:'10px',background:selected?K.gn:K.bd,border:'none',borderRadius:6,color:selected?K.bg:K.mt,fontWeight:700,fontSize:13,cursor:selected?'pointer':'not-allowed',fontFamily:font,transition:'background 0.15s'}}>
            Start with this profile →
          </button>
          <button onClick={()=>{try{localStorage.setItem('pg_starter_pack_done','1');}catch{}onClose();}}
            style={{padding:'10px 16px',background:'transparent',border:`1px solid ${K.bd}`,borderRadius:6,color:K.mt,cursor:'pointer',fontSize:12,fontFamily:font}}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingChecklist({ appData, user, isPro }) {
  const [done, setDone] = React.useState(() => !!localStorage.getItem('pg_onboarding_done'));
  const [completed, setCompleted] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('pg_onboarding_steps') || '[]'); } catch { return []; }
  });

  React.useEffect(() => {
    const steps = [];
    const usageLog = (() => { try { return JSON.parse(localStorage.getItem('pg_usage_log') || '{}'); } catch { return {}; } })();
    if (Object.keys(usageLog).length > 0) steps.push('calc');
    if ((appData?.sportsbooks || []).length > 0 || Object.values(appData?.done || {}).some(Boolean)) steps.push('book');
    if ((appData?.bets || []).length > 0 || (appData?.ledger || []).length > 0) steps.push('bet');
    if (isPro && isPro()) steps.push('trial');
    try { if (localStorage.getItem('pg_referral_shared')) steps.push('invite'); } catch {}
    const saved = (() => { try { return JSON.parse(localStorage.getItem('pg_onboarding_steps') || '[]'); } catch { return []; } })();
    const merged = [...new Set([...saved, ...steps])];
    localStorage.setItem('pg_onboarding_steps', JSON.stringify(merged));
    setCompleted(merged);
  }, [appData]);

  if (done || !user) return null;

  const STEPS = [
    { id: 'calc', label: 'Run your first calculator', icon: '🧮' },
    { id: 'book', label: 'Add a sportsbook to your vault', icon: '📚' },
    { id: 'bet', label: 'Log your first bet or promo', icon: '📝' },
    { id: 'trial', label: 'Start your 7-day free trial', icon: '⚡' },
    { id: 'invite', label: 'Invite a friend', icon: '👥' },
  ];

  const doneCount = STEPS.filter(s => completed.includes(s.id)).length;
  const pct = Math.round(doneCount / STEPS.length * 100);

  if (doneCount === STEPS.length) {
    localStorage.setItem('pg_onboarding_done', '1');
    return null;
  }

  return (
    <div style={{background:'#0f1724',border:'1px solid #1e3a2f',borderRadius:10,padding:16,marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <span style={{fontWeight:700,color:'#e2e8f0',fontSize:14}}>Getting Started</span>
          <span style={{marginLeft:8,color:'#64748b',fontSize:12}}>{doneCount}/{STEPS.length} complete</span>
        </div>
        <button onClick={() => { localStorage.setItem('pg_onboarding_done','1'); setDone(true); }} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
      </div>
      <div style={{height:4,background:'#1e293b',borderRadius:2,marginBottom:12}}>
        <div style={{height:4,background:'#4ade80',borderRadius:2,width:`${pct}%`,transition:'width .3s'}} />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
        {STEPS.map(s => {
          const isDone = completed.includes(s.id);
          return (
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'#0a0e17',borderRadius:6,opacity: isDone ? 0.5 : 1}}>
              <span style={{fontSize:16}}>{isDone ? '✅' : s.icon}</span>
              <span style={{fontSize:12,color: isDone ? '#64748b' : '#cbd5e1',textDecoration: isDone ? 'line-through' : 'none'}}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MemberWelcomeCard({ navigate, proStatus }) {
  const dismissKey = 'pg_member_welcome_v1_dismissed';
  const [dismissed, setDismissed] = React.useState(() => {
    try { return !!localStorage.getItem(dismissKey); } catch { return false; }
  });

  if (dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(dismissKey, '1'); } catch {}
    setDismissed(true);
  };

  const proLabel = proStatus?.status === 'trial'
    ? `VaultSparked Pro trial active — ${proStatus.trial_days_left} day${proStatus.trial_days_left !== 1 ? 's' : ''} left`
    : proStatus?.status === 'active'
      ? 'VaultSparked Pro active'
      : 'VaultSparked Pro is optional';

  return (
    <div style={{...S.card,border:`1px solid ${K.ac}40`,background:`linear-gradient(135deg, ${K.ac}10, ${K.s1})`,marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:10}}>
        <div>
          <div style={{fontSize:11,color:K.ac,fontWeight:700,letterSpacing:'1.4px',textTransform:'uppercase',marginBottom:6}}>Member Welcome</div>
          <div style={{fontFamily:fontD,fontSize:18,fontWeight:700,color:K.tx,marginBottom:6}}>How access works in PromoGrind</div>
          <div style={{fontSize:12,color:K.dm,lineHeight:1.7,maxWidth:760}}>
            A Free PromoGrind account powers sync, referrals, and access across devices. Studio membership is separate and is not required to create or use a PromoGrind account. Pro features unlock in stages as services come online.
          </div>
        </div>
        <button onClick={dismiss} style={{background:'none',border:'none',color:K.mt,cursor:'pointer',fontSize:18,lineHeight:1,padding:0}}>×</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:10,marginBottom:12}}>
        <div style={{padding:'10px 12px',background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:700,color:K.gn,marginBottom:4}}>Free PromoGrind Account</div>
          <div style={{fontSize:11,color:K.dm,lineHeight:1.6}}>Login, sync, calculators, tracker, ledger, and learning tools.</div>
        </div>
        <div style={{padding:'10px 12px',background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:700,color:K.pp,marginBottom:4}}>VaultSparked Pro</div>
          <div style={{fontSize:11,color:K.dm,lineHeight:1.6}}>{proLabel}. Paid checkout stays off until the Studio billing rollout is fully live.</div>
        </div>
        <div style={{padding:'10px 12px',background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:700,color:K.yl,marginBottom:4}}>Beta-Gated Features</div>
          <div style={{fontSize:11,color:K.dm,lineHeight:1.6}}>Live scanner, AI helpers, and push alerts remain beta until their backends are activated.</div>
        </div>
      </div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button onClick={() => navigate('/bonus-bet')} style={{padding:'7px 12px',background:K.gn,border:'none',borderRadius:6,color:K.bg,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font}}>Start with free tools →</button>
        <button onClick={() => navigate('/upgrade')} style={{padding:'7px 12px',background:'transparent',border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font}}>See Pro status</button>
        <button onClick={dismiss} style={{padding:'7px 12px',background:'transparent',border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:11,cursor:'pointer',fontFamily:font}}>Dismiss</button>
      </div>
    </div>
  );
}
