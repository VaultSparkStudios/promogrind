import React, { useEffect, useMemo, useState } from "react";
import { AppDataCtx } from "../contexts.jsx";
import { PROMO_SCHED, DAYS_ORDER } from "../data/promoSchedule.js";
import { K, f, font, downloadFile } from "../lib/shared.js";
import { S, Tl, Nt, Help } from "../ui.jsx";

const PromoAlertPrefs = () => {
  const [alertEmail,setAlertEmail]=useState("");
  const [alertPrefs,setAlertPrefs]=useState(()=>{try{return JSON.parse(localStorage.getItem('pg_alert_prefs')||'null')||{aGradeOnly:false,allPromos:true,dailyDigest:true,books:{}};}catch{return {aGradeOnly:false,allPromos:true,dailyDigest:true,books:{}};}});
  const [alertSaved,setAlertSaved]=useState(false);
  const saveAlertPrefs=()=>{
    try{localStorage.setItem('pg_alert_prefs',JSON.stringify({...alertPrefs,email:alertEmail}));}catch(e){}
    setAlertSaved(true); setTimeout(()=>setAlertSaved(false),3000);
  };
  return (<div style={{...S.card,background:K.s2,border:`1px solid ${K.bd}`,marginTop:4}}>
    <div style={{fontSize:12,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Get Promo Alerts</div>
    <div style={{marginBottom:10}}><label style={S.label}>Email (optional)</label><input style={{...S.input,maxWidth:300}} type="email" value={alertEmail} onChange={e=>setAlertEmail(e.target.value)} placeholder="your@email.com"/></div>
    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:10}}>
      {[["aGradeOnly","A-Grade promos only"],["allPromos","All promos"],["dailyDigest","Daily digest"]].map(([k,l])=>(
        <label key={k} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:K.dm,cursor:"pointer"}}>
          <input type="checkbox" checked={alertPrefs[k]||false} onChange={e=>setAlertPrefs(p=>({...p,[k]:e.target.checked}))} style={{accentColor:K.ac}}/>
          {l}
        </label>
      ))}
    </div>
    <div style={{marginBottom:10}}>
      <div style={S.label}>Books</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[...new Set(PROMO_SCHED.map(p=>p.book))].map(b=>(
          <label key={b} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:K.dm,cursor:"pointer"}}>
            <input type="checkbox" checked={alertPrefs.books?.[b]||false} onChange={e=>setAlertPrefs(p=>({...p,books:{...p.books,[b]:e.target.checked}}))} style={{accentColor:K.ac}}/>
            {b}
          </label>
        ))}
      </div>
    </div>
    <button onClick={saveAlertPrefs} style={{padding:"7px 16px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>Save Alert Preferences</button>
    {alertSaved&&<div style={{fontSize:11,color:K.gn,marginTop:8}}>✓ Alerts configured — you&apos;ll be notified when high-value promos are available</div>}
    <Nt c={K.mt}>Email alerts coming soon — your preferences are saved and will activate when the feature launches.</Nt>
  </div>);
};
const PromoROITable = ({ promoValueHistory }) => {
  const [open, setOpen] = useState(false);
  const rows = useMemo(()=>{
    const entries = Object.entries(promoValueHistory||{});
    if(!entries.length) return [];
    return entries.map(([key,hist])=>{
      const vals = hist.map(h=>h.value);
      const avg = vals.reduce((s,v)=>s+v,0)/vals.length;
      const best = Math.max(...vals);
      const last = vals[vals.length-1];
      return {name:key,avg:f(avg),best:f(best),last:f(last),count:vals.length};
    }).sort((a,b)=>parseFloat(b.avg)-parseFloat(a.avg));
  },[promoValueHistory]);
  return (
    <div style={{...S.card,marginTop:12}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:"none",border:"none",textAlign:"left",color:K.ac,fontSize:11,fontWeight:700,cursor:"pointer",padding:0,fontFamily:font,display:"flex",justifyContent:"space-between",alignItems:"center",textTransform:"uppercase",letterSpacing:"1.5px"}}>
        Promo Performance Table <span style={{color:K.mt,fontSize:10}}>{open?"▲":"▼"}</span>
      </button>
      {open&&<div style={{marginTop:12}}>
        {rows.length===0
          ?<div style={{fontSize:11,color:K.mt}}>Click <strong style={{color:K.ac}}>📈 Track Value</strong> on any promo in the calendar to start building this table.</div>
          :<table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["Rank","Promo","Avg Value","Reports","Best"].map(h=><th key={h} style={{textAlign:"left",padding:"5px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r,i)=>(
              <tr key={r.name}>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:i<3?K.yl:K.mt,fontWeight:700}}>#{i+1}</td>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600,color:K.tx,maxWidth:200}}>{r.name.replace(/-/g,' ')}</td>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:700}}>${r.avg}</td>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.ac}}>{r.count}</td>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.yl}}>${r.best}</td>
              </tr>
            ))}</tbody>
          </table>
        }
      </div>}
    </div>
  );
};

const PromoCalendar = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const [filterBook, setFilterBook] = useState("All");
  const [filterDay, setFilterDay] = useState("All");
  const [filterGrade, setFilterGrade] = useState("All");
  const [filterComplexity, setFilterComplexity] = useState("All");
  const [marketFilter, setMarketFilter] = useState("All");
  const [now, setNow] = useState(()=>Date.now());
  useEffect(()=>{
    const id=setInterval(()=>setNow(Date.now()),60000);
    return ()=>clearInterval(id);
  },[]);
  const [historyOpen, setHistoryOpen] = useState({});
  const [alertPrefs, setAlertPrefs] = useState(()=>{ try{return JSON.parse(localStorage.getItem('pg_alert_prefs')||'{}');}catch{return {};} });
  const toggleAlert = async (p) => {
    const key=`${p.book}-${p.promo}`;
    const current=alertPrefs[key]?.alert||false;
    if(!current&&typeof Notification!=='undefined'&&Notification.permission!=='granted') {
      await Notification.requestPermission().catch(()=>{});
    }
    const next={...alertPrefs,[key]:{alert:!current,targetDate:p.expires||''}};
    setAlertPrefs(next);
    try{localStorage.setItem('pg_alert_prefs',JSON.stringify(next));}catch{}
  };
  const UK_BOOKS_SET = new Set(["bet365 UK","Betway UK","William Hill","Paddy Power","Sky Bet"]);
  const filtered = useMemo(()=>PROMO_SCHED.filter(p=>{
    if(marketFilter==="US"&&UK_BOOKS_SET.has(p.book)) return false;
    if(marketFilter==="UK"&&!UK_BOOKS_SET.has(p.book)) return false;
    return (filterBook==="All"||p.book===filterBook)&&(filterDay==="All"||p.day===filterDay)&&(filterGrade==="All"||p.grade===filterGrade)&&(filterComplexity==="All"||p.complexity===filterComplexity);
  }),[marketFilter,filterBook,filterDay,filterGrade,filterComplexity]);
  const typeColor={Recurring:K.gn,Weekly:K.ac,Weekend:K.pp};
  const complexityColor={Easy:K.gn,Medium:K.yl,Hard:K.rd};
  const trackValue = (promo, value) => {
    const key = `${promo.book}-${promo.promo}`;
    const history = data.promoValueHistory||{};
    const prev = history[key]||[];
    syncAppData({...data, promoValueHistory:{...history,[key]:[...prev,{date:new Date().toISOString().split('T')[0],value}].slice(-6)}});
  };
  const exportICS = () => {
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PromoGrind//EN","CALSCALE:GREGORIAN"];
    const today2=new Date();
    const ymd=(d)=>`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const dayMap={Monday:"MO",Tuesday:"TU",Wednesday:"WE",Thursday:"TH",Friday:"FR",Saturday:"SA",Sunday:"SU"};
    filtered.forEach((p,i)=>{
      const dtstart=`${ymd(today2)}T080000`;
      const dtend=`${ymd(today2)}T090000`;
      let rrule="RRULE:FREQ=DAILY";
      if(p.day==="Weekend") rrule="RRULE:FREQ=WEEKLY;BYDAY=SA,SU";
      else if(dayMap[p.day]) rrule=`RRULE:FREQ=WEEKLY;BYDAY=${dayMap[p.day]}`;
      lines.push("BEGIN:VEVENT",`UID:promogrind-${i}-${Date.now()}@vaultsparkstudios.com`,`DTSTART;TZID=America/New_York:${dtstart}`,`DTEND;TZID=America/New_York:${dtend}`,`SUMMARY:${p.book} - ${p.promo}`,`DESCRIPTION:Est. Value: ${p.value} | Grade: ${p.grade}`,rrule,"END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    downloadFile(lines.join("\r\n"), "promogrind-calendar.ics", "text/calendar");
  };
  return (<div><div style={S.card}><Tl t="Promo Calendar" badge="RECURRING $$$" bc={K.gn} shareable/>
    <div style={{...S.note(K.ac),marginBottom:12}}>These recurring promo patterns are planning leads, not promised returns. Verify current terms and odds, then record realized value so the calendar learns what is actually repeatable.</div>
    <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",whiteSpace:"nowrap"}}>Market:</span>
      {["All","US","UK"].map(m=>(
        <button key={m} onClick={()=>{setMarketFilter(m);setFilterBook("All");}} style={{padding:"4px 12px",background:marketFilter===m?K.ac:"transparent",border:`1px solid ${marketFilter===m?K.ac:K.bd2}`,borderRadius:50,color:marketFilter===m?K.bg:K.dm,fontSize:10,cursor:"pointer",fontFamily:font,fontWeight:600,whiteSpace:"nowrap"}}>
          {m==="UK"?"🇬🇧 UK":m==="US"?"🇺🇸 US":"🌎 All"}
        </button>
      ))}
      {marketFilter==="UK"&&<span style={{fontSize:9,color:K.pp,marginLeft:4}}>bet365 · Betway · William Hill · Paddy Power · Sky Bet</span>}
      {marketFilter==="US"&&<span style={{fontSize:9,color:K.ac,marginLeft:4}}>DraftKings · FanDuel · BetMGM · Caesars · ESPN BET · Fanatics · BetRivers</span>}
    </div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
      <select style={{...S.input,width:"auto",padding:"5px 10px",fontSize:11}} value={filterBook} onChange={e=>setFilterBook(e.target.value)}>
        <option value="All">All Books</option>
        {[...new Set(PROMO_SCHED.filter(p=>marketFilter==="All"||(marketFilter==="UK"?UK_BOOKS_SET.has(p.book):!UK_BOOKS_SET.has(p.book))).map(p=>p.book))].map(b=><option key={b}>{b}</option>)}
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
      <select style={{...S.input,width:"auto",padding:"5px 10px",fontSize:11}} value={filterComplexity} onChange={e=>setFilterComplexity(e.target.value)}>
        <option value="All">All Complexity</option>
        <option value="Easy">Easy</option>
        <option value="Medium">Medium</option>
        <option value="Hard">Hard</option>
      </select>
      <button onClick={exportICS} style={{padding:"5px 12px",background:"transparent",border:`1px solid ${K.ac}`,borderRadius:6,color:K.ac,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",fontWeight:600}}>📅 Export to Calendar</button>
    </div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Book","Day","Promo","Est. Value","Type","Grade","Complexity","Time","Track","🔔",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map((p,i)=>{
          const key=`${p.book}-${p.promo}`;
          const hist=(data.promoValueHistory||{})[key]||[];
          const showHist=historyOpen[key];
          const alertOn=alertPrefs[key]?.alert||false;
          return (<React.Fragment key={i}>
            <tr>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{p.book}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.ac}}>{p.day}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{p.promo}{p.expires&&(()=>{const ms=new Date(p.expires)-now;if(ms<=0)return<span style={{...S.tag(K.rd),marginLeft:4,fontSize:8}}>EXPIRED</span>;const hrs=Math.floor(ms/3600000);const mins=Math.floor((ms%3600000)/60000);return<span title={`Expires: ${p.expires}`} style={{...S.tag(K.yl),marginLeft:4,fontSize:8}}>{hrs>0?`${hrs}h ${mins}m`:`${mins}m`} left</span>;})()}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:600}}>{p.value}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(typeColor[p.type]||K.mt)}>{p.type}</span></td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                <span style={S.tag(p.grade==="A"?K.gn:p.grade==="B"?K.ac:K.mt)}>{p.grade||"B"}</span>
              </td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                <span style={S.tag(complexityColor[p.complexity]||K.mt)}>{p.complexity||"Easy"}</span>
              </td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.mt,fontSize:11,whiteSpace:"nowrap"}}>{p.timeMin?`~${p.timeMin}m`:"—"}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                <button onClick={()=>{const val=prompt(`Enter value realized for ${p.promo} (e.g. 12.50):`);if(val&&!isNaN(parseFloat(val)))trackValue(p,parseFloat(val));}} style={{padding:"3px 8px",background:"transparent",border:`1px solid ${K.gn}`,borderRadius:4,color:K.gn,fontSize:9,cursor:"pointer",fontFamily:font}}>Track Value</button>
              </td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                {typeof Notification!=='undefined'&&<button onClick={()=>toggleAlert(p)} style={{padding:"2px 6px",background:alertOn?`${K.yl}15`:"transparent",border:`1px solid ${alertOn?K.yl:K.bd2}`,borderRadius:4,color:alertOn?K.yl:K.mt,fontSize:9,cursor:"pointer",fontFamily:font}}>{alertOn?"🔔 On":"🔔 Off"}</button>}
              </td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                {hist.length>0&&<button onClick={()=>setHistoryOpen(h=>({...h,[key]:!h[key]}))} style={{padding:"2px 6px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:9,cursor:"pointer",fontFamily:font}}>{showHist?"▲":"History"}</button>}
              </td>
            </tr>
            {showHist&&hist.length>0&&<tr><td colSpan={10} style={{padding:"8px 12px",borderBottom:`1px solid ${K.bd}`,background:K.s2}}>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",marginBottom:4}}>
                {hist.map((h,j)=>{
                  const maxV=Math.max(...hist.map(x=>x.value),1);
                  const pct=Math.round(h.value/maxV*32);
                  return (<div key={j} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{width:16,background:K.gn,height:pct,borderRadius:"2px 2px 0 0",minHeight:2}}/>
                    <div style={{fontSize:8,color:K.mt}}>${h.value}</div>
                  </div>);
                })}
              </div>
              <div style={{fontSize:9,color:K.mt}}>Last {hist.length} tracked values · Latest: ${hist[hist.length-1].value} on {hist[hist.length-1].date}</div>
            </td></tr>}
          </React.Fragment>);
        })}</tbody>
      </table>
    </div>
  </div>
  <PromoAlertPrefs/>
  <PromoROITable promoValueHistory={data.promoValueHistory||{}}/>
  <Help entries={[
    ["Why track recurring promos","Welcome bonuses are one-time. Recurring promos are the engine of long-term profit. A serious matched bettor extracts $150-450/mo just from daily boosts across 5-6 books."],
    ["How to use this","Every morning, open each sportsbook app and check for available boosts. Cross-reference this calendar so you know what to look for. Use the Profit Boost converter to calculate each one."],
    ["Profit boosts are the best","They come daily, they require no outcome risk when hedged, and they compound. At $10 profit per boost × 3 boosts/day × 30 days = $900/mo."],
  ]}/></div>);
};

export default PromoCalendar;
