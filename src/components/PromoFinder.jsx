import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { K, font } from "../lib/shared.js";
import { S, Tl } from "../ui.jsx";

const PromoFinder = () => {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState(null);
  const navigate = useNavigate();
  const go = (slug) => navigate('/'+slug);
  const reset = () => { setStep(0); setAnswer(null); };
  const Opt = ({label,sub,onClick}) => (
    <button onClick={onClick} style={{width:"100%",padding:"12px 16px",background:K.s2,border:`1px solid ${K.bd2}`,borderRadius:8,color:K.tx,cursor:"pointer",textAlign:"left",marginBottom:8,fontFamily:font}}>
      <div style={{fontSize:13,fontWeight:600,color:K.tx,marginBottom:2}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:K.mt}}>{sub}</div>}
    </button>
  );
  const Result = ({title,desc,slug}) => (
    <div style={{padding:"16px",background:`${K.gn}08`,border:`1px solid ${K.gn}30`,borderRadius:8}}>
      <div style={{fontSize:14,fontWeight:700,color:K.gn,marginBottom:6}}>{title}</div>
      <div style={{fontSize:12,color:K.dm,marginBottom:12,lineHeight:1.6}}>{desc}</div>
      <button onClick={()=>go(slug)} style={{padding:"9px 20px",background:K.gn,border:"none",borderRadius:6,color: K.ink,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font}}>Open Calculator →</button>
      <button onClick={reset} style={{marginLeft:10,padding:"9px 16px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:11,cursor:"pointer",fontFamily:font}}>Start Over</button>
    </div>
  );
  return (<div style={S.card}>
    <Tl t="Promo Finder" badge="WHICH CALCULATOR?" bc={K.ac}/>
    {step===0&&<>
      <div style={{fontSize:12,color:K.dm,marginBottom:14}}>What kind of promo do you have?</div>
      <Opt label="Bonus Bet / Free Bet" sub="The sportsbook gave you a bet credit (e.g. '$200 bonus bet')" onClick={()=>{setAnswer('bonus');setStep(10);}}/>
      <Opt label="Profit Boost Token" sub="A token that increases your winnings by a percentage (e.g. '50% profit boost')" onClick={()=>{setAnswer('boost');setStep(10);}}/>
      <Opt label="First Bet Insurance / Safety Net" sub="Your first real-cash bet is refunded if it loses" onClick={()=>{setAnswer('firstbet');setStep(10);}}/>
      <Opt label="Deposit Match" sub="The book matches a percentage of your deposit" onClick={()=>{setAnswer('deposit');setStep(10);}}/>
      <Opt label="SGP / Parlay Insurance" sub="Get bonus bets back if your same-game parlay loses" onClick={()=>{setAnswer('insurance');setStep(10);}}/>
      <Opt label="I'm not sure" sub="Answer a few questions to find out" onClick={()=>setStep(1)}/>
    </>}
    {step===1&&<>
      <div style={{fontSize:12,color:K.dm,marginBottom:14}}>Did the sportsbook give you a credit/token, or boost your winnings on a real bet?</div>
      <Opt label="They gave me a credit or token" sub="Something in my account I can 'use' on a bet" onClick={()=>setStep(2)}/>
      <Opt label="They boost my winnings if I win" sub="I'm betting my own money but get extra if I win" onClick={()=>{setAnswer('boost');setStep(10);}}/>
    </>}
    {step===2&&<>
      <div style={{fontSize:12,color:K.dm,marginBottom:14}}>If your bet using this credit wins, do you get your stake back?</div>
      <Opt label="No — I only get the profit, not the credit back" sub="The stake is NOT returned" onClick={()=>{setAnswer('bonus');setStep(10);}}/>
      <Opt label="Yes — I get everything back if it wins" sub="Acts like a real cash bet" onClick={()=>{setAnswer('firstbet');setStep(10);}}/>
    </>}
    {step===10&&(()=>{
      const m = {
        bonus: {title:"Use: Bonus Bet Converter",desc:"Enter your bonus bet size, the odds you're placing it at, and the hedge odds. The calculator tells you exactly how much to hedge to lock in profit.",slug:"bonus-bet"},
        boost: {title:"Use: Profit Boost Converter",desc:"Enter your stake, the original odds, the boost percentage, and the max extra winnings. The calculator shows your effective odds and the hedge amount.",slug:"profit-boost"},
        firstbet: {title:"Use: First Bet Safety Net Hedge",desc:"Enter your first bet amount, the odds, and hedge odds. This locks in a small profit if your bet wins — and if it loses, you get bonus bets to convert.",slug:"first-bet"},
        deposit: {title:"Use: Deposit Match Calculator",desc:"Enter your deposit amount, match percentage, rollover, and average vig to find the true net value of the bonus.",slug:"deposit-match"},
        insurance: {title:"Use: Promo Insurance Calculator",desc:"Enter your stake, insurance percentage, and bonus conversion rate to find your effective net cost if the bet loses.",slug:"insurance"},
      };
      const res = m[answer];
      return res?<Result {...res}/>:<div style={{color:K.mt,fontSize:12}}>Not sure — try the Knowledge Base for a full overview.</div>;
    })()}
  </div>);
};

// PROMO_SCHED + DAYS_ORDER → ./data/promoSchedule.js

export default PromoFinder;
