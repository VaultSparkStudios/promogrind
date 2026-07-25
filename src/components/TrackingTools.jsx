import React, { useMemo, useRef, useState } from "react";
import { toD, f, downloadFile, K, font } from "../lib/shared.js";
import { BOOKS } from "../books.js";
import { AppDataCtx, useToast } from "../contexts.jsx";
import { S, In, Tl, Nt, Help } from "../ui.jsx";

const FreeBetArbTracker = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const arbs = data.freeBetArbs || [];
  const save = (a) => syncAppData({...data, freeBetArbs: a});
  const toast = useToast();
  const [form, setForm] = useState({date:new Date().toISOString().split('T')[0],bookA:'',bookB:'',promoType:'Bonus Bet',amount:'',hedgeAmt:'',profit:'',status:'open',notes:''});
  const add = () => {
    if(!form.amount) return;
    save([{...form,id:Date.now()},...arbs]);
    setForm(f=>({...f,amount:'',hedgeAmt:'',profit:'',notes:''}));
    if(toast) toast('✓ Arb logged',K.gn);
  };
  const del = id => { const snap=[...arbs]; save(arbs.filter(a=>a.id!==id)); if(toast) toast('Deleted',K.rd,{label:'UNDO',fn:()=>save(snap)}); };
  const totalProfit = arbs.reduce((s,a)=>s+(parseFloat(a.profit)||0),0);
  const avgProfit = arbs.length ? totalProfit/arbs.length : 0;
  const exportCSV = () => {
    const headers=["Date","Book A","Book B","Promo Type","Amount","Hedge Amount","Profit","Status","Notes"];
    const rows=arbs.map(a=>[a.date,a.bookA,a.bookB,a.promoType,a.amount,a.hedgeAmt,a.profit,a.status,a.notes||""]);
    const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    downloadFile(csv, `promogrind-freebetarbs-${new Date().toISOString().split('T')[0]}.csv`, "text/csv");
  };
  return (<div style={S.card}><Tl t="Free Bet Arb Tracker" badge="TRACK" bc={K.pp}/>
    <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><div style={{fontSize:10,color:K.mt}}>TOTAL ARBS</div><div style={S.big(K.ac)}>{arbs.length}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>TOTAL PROFIT</div><div style={S.big(K.gn)}>${f(totalProfit)}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>AVG PROFIT</div><div style={S.big(K.yl)}>${f(avgProfit)}</div></div>
      {arbs.length>0&&<button onClick={exportCSV} style={{marginLeft:"auto",padding:"7px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,cursor:"pointer",fontFamily:font,fontWeight:600}}>↓ Export CSV</button>}
    </div>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
      <div style={S.col}><label style={S.label}>Book A</label><input style={S.input} value={form.bookA} onChange={e=>setForm(f=>({...f,bookA:e.target.value}))} placeholder="DraftKings"/></div>
      <div style={S.col}><label style={S.label}>Book B</label><input style={S.input} value={form.bookB} onChange={e=>setForm(f=>({...f,bookB:e.target.value}))} placeholder="FanDuel"/></div>
    </div>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Promo Type</label><select style={S.input} value={form.promoType} onChange={e=>setForm(f=>({...f,promoType:e.target.value}))}>
        {["Bonus Bet","Same-Game Arb","Insurance","Boost"].map(t=><option key={t}>{t}</option>)}
      </select></div>
      <In l="Amount" v={form.amount} set={v=>setForm(f=>({...f,amount:v}))} pre="$"/>
      <In l="Hedge Amt" v={form.hedgeAmt} set={v=>setForm(f=>({...f,hedgeAmt:v}))} pre="$"/>
      <In l="Profit" v={form.profit} set={v=>setForm(f=>({...f,profit:v}))} pre="$"/>
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <div style={S.col}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
        {["open","won","lost"].map(s=><option key={s}>{s}</option>)}
      </select></div>
      <div style={{flex:2,minWidth:120}}><label style={S.label}>Notes</label><input style={S.input} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="optional notes"/></div>
      <div style={{...S.col,minWidth:80}}><label style={S.label}>&nbsp;</label><button onClick={add} style={{padding:"8px 16px",background:K.pp,border:"none",borderRadius:6,color: K.ink,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:12,width:"100%"}}>+ ADD</button></div>
    </div>
    {arbs.length>0&&<div style={{overflowX:"auto",marginTop:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Date","Book A","Book B","Type","Amount","Hedge","Profit","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{arbs.map(a=>(
          <tr key={a.id}>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{a.date}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{a.bookA}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{a.bookB}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(K.pp)}>{a.promoType}</span></td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{a.amount?`$${a.amount}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{a.hedgeAmt?`$${a.hedgeAmt}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:parseFloat(a.profit)>=0?K.gn:K.rd,fontWeight:600}}>{a.profit?`${parseFloat(a.profit)>=0?"+":""}$${a.profit}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(a.status==="won"?K.gn:a.status==="lost"?K.rd:K.yl)}>{a.status}</span></td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span onClick={()=>del(a.id)} style={{cursor:"pointer",color:K.rd,fontSize:10}}>✕</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>}
    {arbs.length===0&&<div style={{textAlign:"center",padding:"32px 16px",color:K.mt}}>
      <div style={{fontSize:32,marginBottom:8}}>🎯</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>No arb plays tracked yet</div>
      <div style={{fontSize:11,color:K.mt}}>Log your free bet arb plays above to track performance.</div>
    </div>}
    <Help entries={[
      ["Free Bet Arb","Using a free bet or bonus bet on one side of a market, and a real cash bet on the other side at a different book to model a return."],
      ["Same-Game Arb","Two bets within the same game at different books where combined implied probability is under 100%."],
    ]}/>
  </div>);
};

// ═══ v9.0 NEW COMPONENTS ═══

// ═══ PROMO STACKING CALCULATOR ═══
const PromoStacking = () => {
  const [mem, setMem] = useCalcMemory('promo-stacking', {stake:"100",odds:"+200",boost:"50",boostMax:"250",insPct:"100",insMax:"100",conv:"70"});
  const {stake,odds,boost,boostMax,insPct,insMax,conv} = mem;
  const set = k => v => setMem(k,v);
  const r = useMemo(()=>{
    const s=parseFloat(stake), d=toD(odds), bp=parseFloat(boost)/100, bm=parseFloat(boostMax)||Infinity;
    const ip=parseFloat(insPct)/100, im=parseFloat(insMax)||Infinity, cv=(parseFloat(conv)||70)/100;
    if(!s||d<=1) return null;
    const normalProfit=s*(d-1);
    const bonusAdd=Math.min(normalProfit*bp, bm);
    const boostedPayout=s+normalProfit+bonusAdd;
    const netWin=boostedPayout-s;
    const insAmt=Math.min(s*ip, im);
    const insVal=insAmt*cv;
    const netLoss=s-insVal;
    const ev=((1/d)*netWin)-((1-1/d)*netLoss);
    return {netWin:f(netWin), netLoss:f(netLoss), bonusAdd:f(bonusAdd), ev:f(ev), ok:ev>0};
  },[stake,odds,boost,boostMax,insPct,insMax,conv]);
  return (<div><div style={S.card}><Tl t="Promo Stacking Calculator" badge="BOOST + INSURANCE" bc={K.pp} shareable/>
    <div style={S.row}><In l="Stake" v={stake} set={set('stake')} pre="$" ph="100"/><In l="Bet Odds" v={odds} set={set('odds')} ph="+200"/></div>
    <div style={S.row}><In l="Boost %" v={boost} set={set('boost')} ph="50"/><In l="Boost Max $" v={boostMax} set={set('boostMax')} pre="$" ph="250"/></div>
    <div style={S.row}><In l="Insurance %" v={insPct} set={set('insPct')} ph="100"/><In l="Insurance Max $" v={insMax} set={set('insMax')} pre="$" ph="100"/><In l="Conv Rate %" v={conv} set={set('conv')} ph="70"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?"+":""}${r.ev}</span><span style={{fontSize:12,color:K.dm}}>expected value</span></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div style={{padding:"10px 12px",background:`${K.gn}10`,borderRadius:6,border:`1px solid ${K.gn}30`}}>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",marginBottom:4}}>If Win</div>
          <div style={{fontSize:18,fontWeight:700,color:K.gn}}>+${r.netWin}</div>
          <div style={{fontSize:10,color:K.mt}}>incl. +${r.bonusAdd} boost</div>
        </div>
        <div style={{padding:"10px 12px",background:`${K.rd}10`,borderRadius:6,border:`1px solid ${K.rd}30`}}>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",marginBottom:4}}>If Lose</div>
          <div style={{fontSize:18,fontWeight:700,color:K.rd}}>-${r.netLoss}</div>
          <div style={{fontSize:10,color:K.mt}}>after insurance value</div>
        </div>
      </div>
      <Nt c={r.ok?K.gn:K.yl}>{r.ok?"Positive EV after stacking boost and insurance.":"Check boost/insurance terms — may not be stackable at all books."}</Nt>
    </div>}
  </div>
  <Help entries={[
    ["Promo Stacking","Combining a profit boost with an insurance/refund on the same bet for maximum value extraction."],
    ["Boost Value","The extra profit added to your winnings above normal. Capped by Boost Max."],
    ["Insurance","If your bet loses, you get a portion back as bonus bets. Value = Insurance Amount × Conversion Rate."],
    ["EV","Expected value weighs the if-win and if-lose scenarios by their probabilities."],
  ]}/></div>);
};

// ═══ PROMO TRADE JOURNAL ═══
const PromoJournal = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const journal = data.journal || [];
  const [form, setForm] = useState({date:new Date().toISOString().split('T')[0],book:"DraftKings",type:"Bonus Bet",notes:"",profit:"",tags:""});
  const [filterBook, setFilterBook] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const toast = useToast();
  const save = (j) => syncAppData({...data, journal:j});
  const add = () => {
    if(!form.profit) return;
    const entry={...form,id:Date.now(),tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean)};
    save([entry,...journal]);
    setForm(f=>({...f,notes:"",profit:"",tags:""}));
    if(toast) toast('✓ Journal entry added',K.gn);
  };
  const del = id => { const snap=[...journal]; save(journal.filter(e=>e.id!==id)); if(toast) toast('Deleted',K.rd,{label:'UNDO',fn:()=>save(snap)}); };
  const TYPES = ["Bonus Bet","Profit Boost","First Bet","Arb","EV Bet","Other"];
  const filtered = journal.filter(e=>(filterBook==="All"||e.book===filterBook)&&(filterType==="All"||e.type===filterType));
  const sorted = [...filtered].sort((a,b)=>b.date.localeCompare(a.date));
  return (<div style={S.card}><Tl t="Promo Trade Journal" badge="TRACK" bc={K.ac}/>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
      <div style={{...S.col,minWidth:140}}><label style={S.label}>Book</label><select style={S.input} value={form.book} onChange={e=>setForm(f=>({...f,book:e.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></div>
      <div style={{...S.col,minWidth:140}}><label style={S.label}>Type</label><select style={S.input} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
    </div>
    <div style={S.row}>
      <In l="Net Profit" v={form.profit} set={v=>setForm(f=>({...f,profit:v}))} pre="$" ph="50"/>
      <In l="Tags (comma-sep)" v={form.tags} set={v=>setForm(f=>({...f,tags:v}))} ph="arb,boost"/>
    </div>
    <div style={{marginBottom:12}}><label style={S.label}>Notes</label><textarea style={{...S.input,height:64,resize:"vertical"}} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="What promo, outcome, lessons learned…"/></div>
    <button onClick={add} style={{padding:"8px 20px",background:K.gn,border:"none",borderRadius:6,color: K.ink,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:12,marginBottom:16}}>+ Add Entry</button>
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
      <span style={{fontSize:10,color:K.mt}}>Filter:</span>
      <select style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterBook} onChange={e=>setFilterBook(e.target.value)}>
        <option value="All">All Books</option>
        {[...new Set(journal.map(e=>e.book))].sort().map(b=><option key={b}>{b}</option>)}
      </select>
      <select style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
        <option value="All">All Types</option>
        {TYPES.map(t=><option key={t}>{t}</option>)}
      </select>
    </div>
    {sorted.length===0&&<div style={{textAlign:"center",padding:"24px 16px"}}>
      <div style={{fontSize:24,marginBottom:8}}>📓</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>No journal entries yet</div>
      <div style={{fontSize:11,color:K.mt}}>Fill in the form and click <strong style={{color:K.gn}}>+ Add Entry</strong> to start tracking.</div>
    </div>}
    {sorted.map(e=>(
      <div key={e.id} style={{...S.card,background:K.s2,marginBottom:8,padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
              <span style={{fontSize:12,fontWeight:700,color:K.tx}}>{e.book}</span>
              <span style={S.tag(K.ac)}>{e.type}</span>
              <span style={{fontSize:11,color:K.mt}}>{e.date}</span>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:parseFloat(e.profit)>=0?K.gn:K.rd,marginBottom:4}}>{parseFloat(e.profit)>=0?"+":""}${e.profit}</div>
            {e.notes&&<div style={{fontSize:11,color:K.dm,marginBottom:4,maxWidth:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.notes}</div>}
            {e.tags&&e.tags.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{e.tags.map((t,i)=><span key={i} style={S.tag(K.pp)}>{t}</span>)}</div>}
          </div>
          <span onClick={()=>del(e.id)} style={{cursor:"pointer",color:K.rd,fontSize:11,flexShrink:0}}>✕</span>
        </div>
      </div>
    ))}
  </div>);
};

// ═══ ODDS COMPARISON TABLE ═══
const OddsComparisonTable = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const rows = data.oddsCompare || [{event:"",odds:{}}];
  const COMPARE_BOOKS = ["DraftKings","FanDuel","BetMGM","Caesars","bet365","ESPN BET","Fanatics","BetRivers"];
  const prevRowsRef = useRef({});
  const [moveBadges, setMoveBadges] = useState({});
  const updateRow = (i, field, val) => {
    const next = rows.map((r,j)=>j===i?{...r,[field]:val}:r);
    syncAppData({...data, oddsCompare:next});
  };
  const updateOdds = (i, book, val) => {
    const prev = rows[i]?.odds?.[book] || "";
    const prevD = toD(prev), newD = toD(val);
    if(prev && val && prevD>1 && newD>1 && Math.abs(newD-prevD)>0.01) {
      const key = `${i}-${book}`;
      const dir = newD > prevD ? "up" : "down";
      prevRowsRef.current[key] = dir;
      setMoveBadges(mb=>({...mb,[key]:dir}));
      setTimeout(()=>setMoveBadges(mb=>{const n={...mb};delete n[key];return n;}), 3000);
    }
    const next = rows.map((r,j)=>j===i?{...r,odds:{...r.odds,[book]:val}}:r);
    syncAppData({...data, oddsCompare:next});
  };
  const addRow = () => syncAppData({...data, oddsCompare:[...rows,{event:"",odds:{}}]});
  const removeRow = i => syncAppData({...data, oddsCompare:rows.filter((_,j)=>j!==i)});
  return (<div style={S.card}><Tl t="Odds Comparison Table" badge="LINE SHOPPING" bc={K.gn}/>
    <div style={{overflowX:"auto",marginBottom:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:700}}>
        <thead><tr>
          <th style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,textAlign:"left",fontSize:10,textTransform:"uppercase",minWidth:140}}>Event</th>
          {COMPARE_BOOKS.map(b=><th key={b} style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase",minWidth:90}}>{b}</th>)}
          <th style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>Best</th>
          <th style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10}}></th>
        </tr></thead>
        <tbody>{rows.map((row,i)=>{
          const validEntries = COMPARE_BOOKS.map(b=>({book:b,val:row.odds[b]||""})).filter(e=>e.val&&toD(e.val)>1);
          const bestBook = validEntries.length ? validEntries.reduce((best,e)=>toD(e.val)>toD(best.val)?e:best) : null;
          const worstD = validEntries.length ? Math.min(...validEntries.map(e=>toD(e.val))) : 0;
          const spread = bestBook && worstD>1 ? f((toD(bestBook.val)-worstD)*100/(worstD),1) : null;
          return (<tr key={i}>
            <td style={{padding:"4px 8px",borderBottom:`1px solid ${K.bd}`}}>
              <input style={{...S.input,padding:"4px 6px",fontSize:11}} value={row.event} onChange={e=>updateRow(i,'event',e.target.value)} placeholder="e.g. Chiefs ML"/>
            </td>
            {COMPARE_BOOKS.map(b=>{
              const isB = bestBook?.book===b && validEntries.length>1;
              const d=toD(row.odds[b]||"");
              const ip=d>1?f(1/d*100,1):null;
              const badgeKey=`${i}-${b}`;
              const badge=moveBadges[badgeKey];
              return (<td key={b} style={{padding:"4px 8px",borderBottom:`1px solid ${K.bd}`,background:isB?`${K.gn}10`:"transparent",position:"relative"}}>
                <input style={{...S.input,padding:"3px 6px",fontSize:11,borderColor:isB?K.gn:undefined,width:76}} value={row.odds[b]||""} onChange={e=>updateOdds(i,b,e.target.value)} placeholder="-110"/>
                {ip&&<div style={{fontSize:9,color:isB?K.gn:K.mt,marginTop:2,textAlign:"center"}}>{ip}%</div>}
                {badge&&<span style={{position:"absolute",top:2,right:4,fontSize:9,fontWeight:700,color:badge==="up"?K.gn:K.rd,pointerEvents:"none",animation:"fadeIn 0.2s"}}>{badge==="up"?"▲":"▼"}</span>}
              </td>);
            })}
            <td style={{padding:"4px 8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:700,fontSize:12}}>
              {bestBook&&<div>{bestBook.val}<div style={{fontSize:9,color:K.mt}}>{bestBook.book}</div></div>}
              {spread&&<div style={{fontSize:9,color:K.yl}}>+{spread}¢ vs worst</div>}
            </td>
            <td style={{padding:"4px 8px",borderBottom:`1px solid ${K.bd}`}}>
              {rows.length>1&&<span onClick={()=>removeRow(i)} style={{cursor:"pointer",color:K.rd,fontSize:11}}>✕</span>}
            </td>
          </tr>);
        })}</tbody>
      </table>
    </div>
    <button onClick={addRow} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.gn,fontSize:11,cursor:"pointer",fontFamily:font}}>+ Add Event</button>
    <Nt c={K.ac}>Green cells = best odds in that row. ▲▼ badges show when a line moves. Always bet where the odds are highest for your side.</Nt>
  </div>);
};

// ═══ PROMO ARB FINDER ═══

export { FreeBetArbTracker, PromoJournal, PromoStacking, OddsComparisonTable };
