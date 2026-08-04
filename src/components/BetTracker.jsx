import React, { useState } from "react";
import { BOOKS } from "../books.js";
import { toD, f, downloadFile, K, font } from "../lib/shared.js";
import { AppDataCtx, useToast } from "../contexts.jsx";
import { S, In, Tl } from "../ui.jsx";
import { CSVImportModal } from "../app/CSVImportModal.jsx";
import { BET_TRACKER_UI } from "../app/appText.js";
import { parseBetSlip } from "../app/parseBetSlip.js";
import { createEntityId } from "../lib/entityId.js";

const BetTracker = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const bets = data.bets || [];
  const [form, setForm] = useState({date:new Date().toISOString().split("T")[0],book:"DraftKings",event:"",type:"Moneyline",odds:"+110",stake:"",toWin:"",status:"open",notes:""});
  const [showImport, setShowImport] = useState(false);
  const [showPasteSlip, setShowPasteSlip] = useState(false);
  const [slipText, setSlipText] = useState("");
  const [slipParsed, setSlipParsed] = useState(null);
  const calcToWin = (odds, stake) => { const d=toD(odds), s=parseFloat(stake); if(d<=1||!s) return ""; return f(s*(d-1)); };
  const save = (newBets) => syncAppData({...data, bets: newBets});
  const toast = useToast();
  const add = () => {
    if(!form.stake||!form.odds) return;
    const toWin = calcToWin(form.odds, form.stake);
    save([{...form,toWin,id:createEntityId("bet")},...bets]);
    setForm(f=>({...f,event:"",stake:"",odds:"+110",toWin:"",notes:""}));
    if(toast) toast("Bet added");
  };
  const setStatus = (id, status) => save(bets.map(b=>b.id===id?{...b,status}:b));
  const del = id => { const snapshot=[...bets]; save(bets.filter(b=>b.id!==id)); if(toast) toast('Bet deleted',K.rd,{label:'UNDO',fn:()=>save(snapshot)}); };
  const exportBets = () => {
    const headers = ["Date","Book","Event / Matchup","Type","Odds","Stake","To Win","Status","Notes"];
    const rows = bets.map(e=>[e.date,e.book,e.event||e.game||"",e.type,e.odds,e.stake,e.toWin||"",e.status,e.notes||""]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    downloadFile(csv, `promogrind-bets-${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
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
  const positiveOutcomeShare = settled.length ? (bets.filter(b=>b.status==="won").length/settled.length*100) : null;
  const statusColor = {open:K.yl,won:K.gn,lost:K.rd,void:K.mt};
  return (<div style={S.card}><Tl t="Pending Bet Tracker" badge="OPEN BETS" bc={K.yl}/>
    <div style={{display:"flex",gap:20,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><div style={{fontSize:10,color:K.mt}}>OPEN BETS</div><div style={S.big(K.yl)}>{open.length}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>AT RISK</div><div style={S.big(K.rd)}>${f(atRisk)}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>TO WIN</div><div style={S.big(K.gn)}>${f(potentialWin)}</div></div>
      {positiveOutcomeShare!==null&&<div><div style={{fontSize:10,color:K.mt}}>POSITIVE OUTCOME SHARE</div><div style={S.big(K.ac,{fontSize:22})}>{f(positiveOutcomeShare,1)}%</div><div style={{fontSize:9,color:K.mt}}>{settled.length} settled · descriptive, not predictive</div></div>}
      {open.length>0&&(()=>{
        const ev=open.reduce((s,b)=>{
          const d=toD(b.odds); if(d<=1) return s;
          const p=1/d;
          return s+(parseFloat(b.toWin)||0)*p-(parseFloat(b.stake)||0)*(1-p);
        },0);
        return <div><div style={{fontSize:10,color:K.mt}}>PORTFOLIO EV</div><div style={{...S.big(ev>=0?K.gn:K.rd),fontSize:22}}>{ev>=0?"+":""}${f(ev)}</div><div style={{fontSize:9,color:K.mt}}>book-implied</div></div>;
      })()}
      <button onClick={()=>setShowPasteSlip(s=>!s)} style={{marginLeft:"auto",padding:"7px 14px",background:"transparent",border:`1px solid ${K.pp}`,borderRadius:6,color:K.pp,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>{BET_TRACKER_UI.pasteSlipButton}</button>
      <button onClick={()=>setShowImport(true)} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${K.ac}`,borderRadius:6,color:K.ac,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>{BET_TRACKER_UI.importCsvButton}</button>
      {bets.length>0&&<button onClick={exportBets} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>{BET_TRACKER_UI.exportCsvButton}</button>}
      {showPasteSlip&&<div style={{width:"100%",marginTop:8,padding:"12px 14px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`}}>
        <div style={{fontSize:12,fontWeight:700,color:K.pp,marginBottom:8}}>Paste Bet Slip Text</div>
        <textarea aria-label="Bet slip text" style={{...S.input,height:80,resize:"vertical",marginBottom:8,fontSize:11}} value={slipText} onChange={e=>setSlipText(e.target.value)} placeholder={BET_TRACKER_UI.slipPlaceholder}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{const p=parseBetSlip(slipText);setSlipParsed(p);}} style={{padding:"6px 14px",background:K.pp,border:"none",borderRadius:6,color: K.ink,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11}}>Parse</button>
          {slipParsed&&<button onClick={()=>{setForm(prev=>({...prev,...slipParsed,toWin:slipParsed.stake&&slipParsed.odds?f((parseFloat(slipParsed.stake||0))*(toD(slipParsed.odds||"+100")-1)):""}));setShowPasteSlip(false);setSlipParsed(null);setSlipText("");}} style={{padding:"6px 14px",background:K.gn,border:"none",borderRadius:6,color: K.ink,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11}}>Use Parsed Values</button>}
        </div>
        {slipParsed&&<div style={{fontSize:10,color:K.gn,marginTop:6}}>Parsed: {Object.entries(slipParsed).map(([k,v])=>`${k}=${v}`).join(", ")}</div>}
      </div>}
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <div style={S.col}><label htmlFor="bet-tracker-date" style={S.label}>Date</label><input id="bet-tracker-date" style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
      <div style={{...S.col,minWidth:140}}><label htmlFor="bet-tracker-book" style={S.label}>Book</label><select id="bet-tracker-book" style={S.input} value={form.book} onChange={e=>setForm(f=>({...f,book:e.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></div>
      <div style={{...S.col,minWidth:140}}><label htmlFor="bet-tracker-type" style={S.label}>Bet Type</label><select id="bet-tracker-type" style={S.input} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{["Moneyline","Spread","Total","Parlay","Prop","Bonus Bet","Other"].map(t=><option key={t}>{t}</option>)}</select></div>
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <div style={{...S.col,minWidth:220}}><label htmlFor="bet-tracker-event" style={S.label}>Event / Matchup <span style={{color:K.mt,fontWeight:400}}>(for concentration)</span></label><input id="bet-tracker-event" style={S.input} value={form.event} onChange={e=>setForm(f=>({...f,event:e.target.value}))} placeholder="Chiefs vs Bills"/></div>
      <In l="Odds" v={form.odds} set={v=>{setForm(f=>({...f,odds:v,toWin:calcToWin(v,f.stake)}));}} ph="+110"/>
      <In l="Stake" v={form.stake} set={v=>{setForm(f=>({...f,stake:v,toWin:calcToWin(f.odds,v)}));}} pre="$" ph="100"/>
      <In l="To Win (auto)" v={form.toWin} set={v=>setForm(f=>({...f,toWin:v}))} pre="$" ph="auto"/>
      <div style={{...S.col,minWidth:80,paddingTop:18}}><button type="button" onClick={add} style={{padding:"8px 16px",background:K.yl,border:"none",borderRadius:6,color: K.ink,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:12,width:"100%"}}>+ ADD</button></div>
    </div>
    {bets.length===0&&<div style={{textAlign:"center",padding:"32px 16px",color:K.mt}}>
      <div style={{fontSize:18,fontWeight:700,letterSpacing:"1px",marginBottom:8,color:K.mt}}>{BET_TRACKER_UI.noBetsGlyph}</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>{BET_TRACKER_UI.noBetsTitle}</div>
      <div style={{fontSize:11,color:K.mt}}>Add your first pending bet above to track your open action.</div>
    </div>}
    {bets.length>0&&<div style={{overflowX:"auto",marginTop:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Date","Book","Event","Type","Odds","Stake","To Win","Status","Grade",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{bets.map(e=>{const gr=betGrade(e);return(
          <tr key={e.id} style={{opacity:e.status==="void"?0.4:1}}>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.date}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{e.book}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.dm}}>{e.event||e.game||"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(K.ac)}>{e.type}</span></td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.pp,fontWeight:600}}>{e.odds}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>${e.stake}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:600}}>{e.toWin?`$${e.toWin}`:"-"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
              <select aria-label={`Status for ${e.book} ${e.type}`} value={e.status} onChange={ev=>setStatus(e.id,ev.target.value)} style={{...S.input,width:80,padding:"3px 6px",fontSize:10,color:statusColor[e.status]||K.tx}}>
                {["open","won","lost","void"].map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{gr?<span style={S.tag(gr.c)}>{gr.g}</span>:<span style={{color:K.mt}}>-</span>}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><button type="button" aria-label={`Delete ${e.book} ${e.type} bet`} onClick={()=>del(e.id)} style={{cursor:"pointer",color:K.rd,fontSize:10,background:"transparent",border:0,padding:4}}>x</button></td>
          </tr>
        );})}</tbody>
      </table>
    </div>}
    {showImport&&<CSVImportModal onImport={rows=>{save([...rows,...bets]); if(toast) toast(`Imported ${rows.length} bets`,K.gn);}} onClose={()=>setShowImport(false)}/>}
  </div>);
};

export default BetTracker;
