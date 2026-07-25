import React, { useState, useMemo } from "react";
import { f, calcROI, K, font, fontD } from "../lib/shared.js";
import { CANONICAL_APP_URL } from "../launchState.js";
import { BOOKS, US_BOOK_STATES, getBookLinkMeta } from "../books.js";
import { trackEvent } from "../analytics.js";
import { AppDataCtx } from "../contexts.jsx";
import { useToast } from "../contexts.jsx";
import { Tl, Nt, S } from "../ui.jsx";
import { PROMO_SCHED } from "../data/promoSchedule.js";
import { flagVisit } from "../lib/missions.js";
import { useViewport } from "../app/responsive.js";
import { detectPromoConflicts } from "../lib/promoConflict.js";

const Tracker = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const viewport = useViewport();
  const isCompact = viewport.isPhone;
  const done = data.done || {};
  const profits = data.profits || {};
  const expiry = data.bookExpiry || {};
  const bookStatus = data.bookStatus || {};
  const bookRatings = data.bookRatings || {};
  const setBookStatus = (n, v) => syncAppData({...data, bookStatus:{...bookStatus,[n]:v}});
  const setBookRating = (n, v) => syncAppData({...data, bookRatings:{...bookRatings,[n]:v}});
  const toast = useToast();
  const toggle = n => { const newDone=!done[n]; const d = {...data, done:{...done,[n]:newDone}}; syncAppData(d); flagVisit('book'); if(toast&&newDone) toast('✓ Book marked complete'); };
  const setP = (n, v) => syncAppData({...data, profits:{...profits,[n]:v}});
  const setExpiry = (n, v) => syncAppData({...data, bookExpiry:{...expiry,[n]:v}});
  const todayStr = new Date().toISOString().split('T')[0];
  const in3Days = new Date(Date.now()+3*24*60*60*1000).toISOString().split('T')[0];
  const activePromoCandidates = useMemo(() => {
    const fromBets = (data.bets || [])
      .filter((bet) => ["", "open", "pending", "placed"].includes(String(bet.status || "").toLowerCase()))
      .map((bet, index) => ({
        id: bet.promoId || bet.id || `bet-${index}`,
        book: bet.book,
        market: bet.market || bet.selection || bet.game || "general",
        requirements: bet.requirements || [bet.requirement, bet.terms, bet.promoType].filter(Boolean),
        maxPayout: Number.parseFloat(bet.maxPayout),
      }));
    const fromWorkflows = (data.workflowInbox || [])
      .filter((workflow) => ["queued", "placed", "pending", "open"].includes(String(workflow.status || "").toLowerCase()))
      .map((workflow, index) => ({
        id: workflow.promoId || workflow.id || `workflow-${index}`,
        book: workflow.book,
        market: workflow.market || workflow.selection || workflow.title || "general",
        requirements: workflow.requirements || [workflow.requirement, workflow.terms, workflow.promoType].filter(Boolean),
        maxPayout: Number.parseFloat(workflow.maxPayout),
      }));
    return [...fromBets, ...fromWorkflows].filter((promo) => promo.book && promo.market);
  }, [data.bets, data.workflowInbox]);
  const promoConflicts = useMemo(() => detectPromoConflicts(activePromoCandidates), [activePromoCandidates]);
  const conflictBooks = useMemo(() => new Set(promoConflicts.map((conflict) => conflict.book)), [promoConflicts]);
  const booksWithActivePromos = useMemo(()=>{
    const today=new Date();
    const dayNames=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const todayDay=dayNames[today.getDay()];
    const isWeekend=today.getDay()===0||today.getDay()===6;
    const set=new Set();
    PROMO_SCHED.forEach(p=>{
      if(p.day==="Daily"||p.day===todayDay||(p.day==="Weekend"&&isWeekend)) set.add(p.book);
    });
    return set;
  },[]);
  const expiryStatus = (n) => {
    const exp = expiry[n];
    if(!exp||done[n]) return null;
    if(exp<todayStr) return 'expired';
    if(exp<=in3Days) return 'soon';
    return null;
  };
  const total = Object.values(profits).reduce((s,v)=>s+(parseFloat(v)||0),0);
  const cnt = Object.values(done).filter(Boolean).length;
  const [trackerView, setTrackerView] = useState('tracker');
  return (<div style={S.card}><Tl t="Sportsbook Promo Tracker"/>
    {(()=>{
      const completedNames = Object.entries(done).filter(([,v])=>v).map(([k])=>k.toLowerCase());
      const BOOK_LIST = [
        { name: 'DraftKings', value: 350 },
        { name: 'FanDuel', value: 300 },
        { name: 'BetMGM', value: 250 },
        { name: 'Caesars', value: 300 },
        { name: 'bet365', value: 200 },
        { name: 'ESPN BET', value: 250 },
        { name: 'Fanatics', value: 200 },
        { name: 'BetRivers', value: 150 },
      ];
      const unsigned = BOOK_LIST.filter(b => !completedNames.includes(b.name.toLowerCase()));
      if (unsigned.length === 0) return null;
      const totalLeft = unsigned.reduce((s, b) => s + b.value, 0);
      return (
        <div style={{background:'linear-gradient(135deg,#0f2a1e,#0f1724)',border:'1px solid #4ade80',borderRadius:10,padding:16,marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
            <div>
              <div style={{fontWeight:700,color:'#4ade80',fontSize:14}}>💰 Unclaimed Promo Value</div>
              <div style={{color:'#94a3b8',fontSize:12,marginTop:2}}>You're leaving <strong style={{color:'#4ade80'}}>${totalLeft.toLocaleString()}</strong> on the table from {unsigned.length} unsigned book{unsigned.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8}}>
            {unsigned.map(b => {
              const book = BOOKS.find((candidate) => candidate.name === b.name) || b;
              const linkMeta = getBookLinkMeta(book);
              return (
              <div key={b.name} style={{padding:10,background:'#0a0e17',borderRadius:8,border:'1px solid #1e293b'}}>
                <div style={{fontWeight:600,color:'#e2e8f0',fontSize:13,marginBottom:4}}>{b.name}</div>
                <div style={{color:'#4ade80',fontSize:12,marginBottom:8}}>~${b.value} signup value</div>
                <a href={linkMeta.url || `${CANONICAL_APP_URL}#/promo-finder`} target="_blank" rel="noopener noreferrer sponsored"
                   onClick={() => trackEvent("sportsbook_cta_clicked", { book: b.name, surface: "tracker_unclaimed_value", linkType: linkMeta.linkType, configuredAffiliate: linkMeta.configuredAffiliate, configuredMonetization: linkMeta.configuredMonetization, launchRequired: linkMeta.launchRequired })}
                   style={{display:'block',textAlign:'center',padding:'5px 0',background:'#1e3a2f',border:'1px solid #4ade80',color:'#4ade80',borderRadius:5,fontSize:11,fontWeight:700,textDecoration:'none'}}>
                  Claim →
                </a>
              </div>
            );})}
          </div>
        </div>
      );
    })()}
    <div style={{display:"grid",gridTemplateColumns:isCompact?"repeat(2,minmax(0,1fr))":"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:16,alignItems:"end"}}>
      <div><div style={{fontSize:10,color:K.mt}}>EXTRACTED</div><div style={S.big(K.gn)}>${f(total)}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>COMPLETED</div><div style={S.big(K.ac)}>{cnt}/{BOOKS.length}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>REMAINING</div><div style={S.big(K.yl)}>~${f(BOOKS.filter(b=>!done[b.name]).reduce((s,b)=>s+b.bonus*0.7,0),0)}</div></div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:isCompact?"stretch":"flex-end",gridColumn:isCompact?"1 / -1":"auto"}}>
        {["tracker","progress"].map(v=>(
          <button key={v} onClick={()=>setTrackerView(v)} style={{flex:isCompact?1:"0 0 auto",padding:"6px 12px",background:trackerView===v?K.ac:"transparent",border:`1px solid ${trackerView===v?K.ac:K.bd2}`,borderRadius:8,color:trackerView===v?K.bg:K.dm,fontSize:10,cursor:"pointer",fontFamily:font,fontWeight:600}}>
            {v==="tracker"?"Tracker":"Progress"}
          </button>
        ))}
      </div>
    </div>
    <Nt c={K.ac}>Your tracker syncs across all your devices. Data also saves locally as a backup.</Nt>
    {promoConflicts.length > 0 && (
      <div style={{marginBottom:12,padding:'12px 14px',background:`${K.rd}06`,border:`1px solid ${K.rd}30`,borderRadius:8}}>
        <div style={{fontSize:10,color:K.rd,fontWeight:800,textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Promo conflict guard — {promoConflicts.length} collision{promoConflicts.length === 1 ? '' : 's'}</div>
        {promoConflicts.slice(0, 3).map((conflict, index) => (
          <div key={`${conflict.class}-${index}`} style={{fontSize:11,color:K.dm,lineHeight:1.5,marginBottom:4}}>
            <strong style={{color:K.tx}}>{conflict.book}</strong>: {conflict.message}
          </div>
        ))}
      </div>
    )}
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
    {trackerView==="progress"&&(()=>{
      return (<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12,marginTop:12}}>
        {BOOKS.map(b=>{
          const step1=done[b.name]||profits[b.name];
          const step2=profits[b.name];
          const step3=done[b.name];
          const steps=[{label:"Account Created",done:!!step1},{label:"First Bet Placed",done:!!step2},{label:"Bonus Collected",done:!!step3}];
          const stepsComplete=steps.filter(s=>s.done).length;
          return (<div key={b.name} style={{padding:14,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
            <div style={{fontSize:12,fontWeight:700,color:K.tx,marginBottom:10}}>{b.name}</div>
            <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:10}}>
              {steps.map((s,i)=>(
                <React.Fragment key={i}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:s.done?K.gn:K.bd2,border:`2px solid ${s.done?K.gn:K.bd2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:s.done?K.bg:K.mt,fontWeight:700,flexShrink:0}}>{s.done?"✓":i+1}</div>
                  {i<steps.length-1&&<div style={{flex:1,height:2,background:steps[i+1].done?K.gn:K.bd2}}/>}
                </React.Fragment>
              ))}
            </div>
            <div style={{fontSize:10,color:K.mt}}>{steps.map((s,i)=><div key={i} style={{color:s.done?K.gn:K.mt}}>{s.done?"✓":"○"} {s.label}</div>)}</div>
            {done[b.name]&&profits[b.name]&&<div style={{fontSize:11,fontWeight:700,color:K.gn,marginTop:6}}>+${profits[b.name]}</div>}
            {!done[b.name]&&<div style={{fontSize:10,color:K.yl,marginTop:6}}>~${f(b.bonus*0.7,0)} remaining</div>}
          </div>);
        })}
      </div>);
    })()}
    {trackerView==="tracker"&&(()=>{
      const cutoff30=new Date(Date.now()-30*24*60*60*1000);
      const allBets=data.bets||[];
      const atRisk=BOOKS.filter(b=>{
        if(done[b.name]) return false;
        const st=bookStatus[b.name]||'active';
        if(st==='gubbed'||st==='limited') return true;
        const bets30=allBets.filter(bt=>bt.book===b.name&&bt.date&&new Date(bt.date)>cutoff30);
        if(bets30.length===0&&allBets.length>5) return true;
        return false;
      });
      if(!atRisk.length) return null;
      return (
        <div style={{marginBottom:12,padding:'12px 14px',background:`${K.yl}06`,border:`1px solid ${K.yl}20`,borderRadius:8}}>
          <div style={{fontSize:10,color:K.yl,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>⚠ Account Health Alerts — {atRisk.length} book{atRisk.length>1?'s':''} need attention</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {atRisk.map(b=>{
              const st=bookStatus[b.name]||'active';
              const reason=st==='gubbed'?'Marked GUBBED — avoid large stakes, mix in SGPs to maintain access':st==='limited'?'Account limited — stick to main markets, vary stake sizes':'Inactive 30+ days — place a small recreational bet to keep account healthy';
              return (
                <div key={b.name} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'8px 10px',background:K.s3,borderRadius:6}}>
                  <span style={{fontSize:14,minWidth:20}}>{st==='gubbed'?'🔴':st==='limited'?'🟡':'🟠'}</span>
                  <div style={{flex:1}}>
                    <span style={{fontWeight:700,fontSize:12,color:K.tx}}>{b.name}</span>
                    <span style={{...S.tag(K.yl),marginLeft:6,fontSize:8}}>{st.toUpperCase()}</span>
                    <div style={{fontSize:11,color:K.mt,marginTop:2}}>{reason}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    })()}
    {trackerView==="tracker"&&<div style={{overflowX:"auto",marginTop:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["","Book","Promo","Value","Daily Promos","Profit","ROI","Expiry","Status","Health","★","Ref Code",""].map(h=><th key={h} style={{textAlign:"left",padding:"8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase",letterSpacing:"1px"}}>{h}</th>)}</tr></thead>
        <tbody>{(()=>{ const cutoff30=new Date(Date.now()-30*24*60*60*1000); const ledger=data.ledger||[]; const bets=data.bets||[]; return BOOKS.map(b=>{const es=expiryStatus(b.name);
          const bookEntries=ledger.filter(e=>e.book===b.name);
          const bookProfit=bookEntries.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
          const bookWagered=bookEntries.reduce((s,e)=>s+(parseFloat(e.hedge)||0),0);
          const roi=calcROI(bookProfit,bookWagered);
          return(<React.Fragment key={b.name}><tr style={{opacity:done[b.name]?0.4:1}}>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><div role="checkbox" aria-checked={!!done[b.name]} aria-label={`Mark ${b.name} as completed`} tabIndex={0} onClick={()=>toggle(b.name)} onKeyDown={e=>(e.key===" "||e.key==="Enter")&&toggle(b.name)} style={{width:16,height:16,borderRadius:3,border:`2px solid ${done[b.name]?K.gn:K.bd2}`,background:done[b.name]?K.gn:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",outline:"none"}} onFocus={e=>e.currentTarget.style.boxShadow=`0 0 0 2px ${K.gn}55`} onBlur={e=>e.currentTarget.style.boxShadow="none"}>{done[b.name]&&<span style={{color: K.ink,fontSize:10,fontWeight:700}}>✓</span>}</div></td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{b.name}{es==='soon'&&<span style={{...S.tag(K.yl),marginLeft:4}}>⚠</span>}{es==='expired'&&<span style={{...S.tag(K.rd),marginLeft:4}}>EXPIRED</span>}{bookStatus[b.name]==="limited"&&<span style={{...S.tag(K.yl),marginLeft:4,fontSize:8}}>LIMITED</span>}{bookStatus[b.name]==="gubbed"&&<span style={{...S.tag(K.rd),marginLeft:4,fontSize:8}}>GUBBED</span>}{conflictBooks.has(b.name)&&<span title="Active promo conflict detected" style={{...S.tag(K.rd),marginLeft:4,fontSize:8}}>CONFLICT</span>}<span style={{...S.tag(K.ac),marginLeft:6}}>{b.type}</span>{booksWithActivePromos.has(b.name)&&<span title="Has active promos today" style={{...S.tag(K.gn),marginLeft:4,fontSize:8}}>PROMO TODAY</span>}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontSize:11,color:K.dm,maxWidth:200}}>{b.detail}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:600,whiteSpace:"nowrap"}}>{b.value}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontSize:11,color:K.dm,maxWidth:180}}>{b.recurring}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...S.input,width:80,padding:"5px 8px"}} placeholder="$0" value={profits[b.name]||""} onChange={e=>setP(b.name,e.target.value)}/></td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:roi===null?K.mt:roi>=0?K.gn:K.rd,fontWeight:roi!==null?600:400,fontSize:11}}>{roi===null?"—":`${roi>=0?"+":""}${f(roi,1)}%`}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><input type="date" style={{...S.input,width:120,padding:"4px 6px",fontSize:11,borderColor:es==='soon'?K.yl:es==='expired'?K.rd:undefined}} value={expiry[b.name]||""} onChange={e=>setExpiry(b.name,e.target.value)} title="Promo expiry date"/></td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
            <select value={bookStatus[b.name]||"active"} onChange={e=>setBookStatus(b.name,e.target.value)} style={{...S.input,width:90,padding:"3px 6px",fontSize:10,color:{active:K.gn,limited:K.yl,gubbed:K.rd,pending:K.mt,closed:K.rd}[bookStatus[b.name]||"active"]||K.gn}}>
              {["active","limited","gubbed","pending","closed"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
            {(()=>{
              let score=100;
              const st=bookStatus[b.name]||"active";
              if(st==="gubbed") score-=30;
              if(st==="limited") score-=15;
              if(st==="closed") score-=10;
              const bets30=bets.filter(bt=>bt.book===b.name&&bt.date&&new Date(bt.date)>cutoff30);
              if(bets30.length===0) score-=20;
              else {
                const stakes=bets30.map(bt=>parseFloat(bt.stake)||0).filter(s=>s>0);
                if(stakes.length>2&&new Set(stakes).size===1) score-=10;
              }
              const rating=bookRatings[b.name]||0;
              if(rating>=4) score+=10; else if(rating>=3) score+=5;
              score=Math.max(0,Math.min(100,score));
              const scoreColor=score>=80?K.gn:score>=60?K.yl:score>=40?"#f97316":K.rd;
              const scoreLabel=score>=80?"Healthy":score>=60?"Watch":score>=40?"At Risk":"Gubbed Risk";
              return (<div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:2}}>
                <span title="Health Score: factors in account status, recent activity, stake variance, and rating." style={{...S.tag(scoreColor),fontSize:9,cursor:"help"}}>{scoreLabel.toUpperCase()}: {score}</span>
              </div>);
            })()}
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
            {(() => {
              const linkMeta = getBookLinkMeta(b);
              return (
                <a
                  href={linkMeta.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  onClick={() => trackEvent("sportsbook_cta_clicked", { book: b.name, surface: "tracker_table", linkType: linkMeta.linkType, configuredAffiliate: linkMeta.configuredAffiliate, configuredMonetization: linkMeta.configuredMonetization, launchRequired: linkMeta.launchRequired })}
                  style={{display:"inline-block",padding:"5px 12px",background:K.gn,color: K.ink,borderRadius:5,fontSize:11,fontWeight:700,textDecoration:"none",opacity:done[b.name]?0.4:1}}
                >
                  Sign Up →
                </a>
              );
            })()}
          </td>
        </tr>
        {bookEntries.length>0&&<tr key={b.name+'-stats'} style={{opacity:done[b.name]?0.4:1}}><td colSpan={13} style={{padding:"4px 8px 8px 34px",borderBottom:`1px solid ${K.bd}`,background:K.s2}}><div style={{display:"flex",gap:14,fontSize:10,color:K.mt}}><span>Bets: <span style={{color:K.tx,fontWeight:600}}>{bookEntries.length}</span></span><span>P/L: <span style={{color:bookProfit>=0?K.gn:K.rd,fontWeight:600}}>{bookProfit>=0?"+":""}<span>$</span>{f(bookProfit)}</span></span>{roi!==null&&<span>ROI: <span style={{color:roi>=0?K.gn:K.rd,fontWeight:600}}>{f(roi,1)}%</span></span>}</div></td></tr>}
        </React.Fragment>);});})()}</tbody>
      </table>
    </div>}
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

export default Tracker;
