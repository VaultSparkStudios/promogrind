import React, { useState } from "react";
import { K } from "../lib/shared.js";
import { S } from "../ui.jsx";
import { US_STATES } from "../lib/stateLegal.jsx";

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
          <div style={{fontSize:32,marginBottom:16}}>ðŸ¤‘</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:380,margin:"0 auto",textAlign:"left"}}>
            {[["Welcome Promos","$1,000â€“$2,500 one-time from 8+ books"],["Profit Boosts","$300â€“$1,000/month recurring, 15 min/day"],["100% Legal","Math calculator, not gambling. Free forever."],["No Sports Knowledge","Pure math. You don't need to know the teams."]].map(([t,d])=>(
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
          <div style={{width:"100%",textAlign:"center",fontSize:11,color:"#64748b",marginTop:4}}>None yet? No problem â€” you'll start fresh.</div>
        </div>
      )
    },
    {
      title: "What state are you in?",
      sub: "We'll show only sportsbooks available in your state.",
      content: (
        <div style={{textAlign:"center"}}>
          <select style={{...S.input,maxWidth:300,padding:"10px 14px",fontSize:13,margin:"0 auto"}} value={userState} onChange={e=>{setUserState(e.target.value);try{localStorage.setItem('pg_user_state',e.target.value);}catch{}}}>
            <option value="">â€” Select your state â€”</option>
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
      sub: books.length > 0 ? `You have ${books.length} book${books.length>1?"s":""} â€” start converting promos immediately.` : "Open one or more sportsbook apps and grab a welcome promo.",
      content: (
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:13,color:"#94a3b8",marginBottom:16,lineHeight:1.7}}>Your best first move:</div>
          <div style={{display:"grid",gap:8,maxWidth:380,margin:"0 auto",textAlign:"left"}}>
            {[
              ["1","Get a bonus bet promo","DraftKings, FanDuel, Fanatics, ESPN BET â€” all offer bonus bets after a small qualifying wager"],
              ["2","Open Bonus Bet Converter","Enter your bonus bet size and odds â€” the calculator tells you exactly what hedge to place"],
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
            {step<steps.length-1?"Next â†’":"Let's Go â†’"}
          </button>
        </div>
      </div>
    </div>
  );
};

export { ONBOARDING_KEY };
export default OnboardingWizard;
