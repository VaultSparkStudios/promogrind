import React from "react";
import { K } from "../lib/shared.js";
import { S, Tl, Nt } from "../ui.jsx";

const CompetitorComparison = () => (
  <div><div style={S.card}>
    <Tl t="PromoGrind vs The Competition" badge="WHY FREE WINS" bc={K.gn}/>
    <Nt c={K.gn}>PromoGrind is permanently free for all 27 calculators, tracker, and knowledge base. Competitors charge $49–$199/month for similar tools.</Nt>
    <div style={{overflowX:"auto",marginTop:16}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead>
          <tr>
            {["Feature","PromoGrind","OddsJam","ProfitDuel","Spreadsheet"].map((h,i)=>(
              <th key={h} style={{textAlign:"left",padding:"8px 10px",borderBottom:`1px solid ${K.bd2}`,color:i===1?K.gn:K.mt,fontSize:10,textTransform:"uppercase",letterSpacing:"1px",fontWeight:i===1?700:500,background:i===1?`${K.gn}05`:"transparent"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ["Price","Free","$99–$199/mo","$49–$99/mo","Free"],
            ["Bonus Bet Converter","✓","✓","✓","Manual"],
            ["Profit Boost Converter","✓","✓","✓","Manual"],
            ["Arb Calculator","✓","✓","✓","Manual"],
            ["No-Vig / +EV Calculator","✓","✓","✓","Manual"],
            ["Live Arb Scanner","✓ (Pro $24.99/mo)","✓ Included","✓ Included","✗"],
            ["P/L Ledger & Tracker","✓","Limited","✓","Manual"],
            ["Cloud Sync","✓","✓","✓","✗"],
            ["Mobile PWA","✓","✗","✗","✗"],
            ["Knowledge Base","✓ Full guide","Limited","Limited","✗"],
            ["CSV Import/Export","✓","✗","✗","Manual"],
            ["Referral Program","✓","✗","✗","✗"],
            ["Push Notifications","✓","✗","✗","✗"],
            ["Total 27 Calculators","✓","~10","~15","DIY"],
          ].map(([feature,...vals])=>(
            <tr key={feature}>
              <td style={{padding:"8px 10px",borderBottom:`1px solid ${K.bd}`,color:K.dm,fontSize:11}}>{feature}</td>
              {vals.map((v,i)=>(
                <td key={i} style={{padding:"8px 10px",borderBottom:`1px solid ${K.bd}`,color:i===0?K.gn:v==="✗"?K.rd:K.dm,fontWeight:i===0?600:400,background:i===0?`${K.gn}03`:"transparent",fontSize:11}}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{marginTop:16,padding:14,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:12,fontWeight:700,color:K.tx,marginBottom:6}}>The Bottom Line</div>
      <div style={{fontSize:12,color:K.dm,lineHeight:1.7}}>
        OddsJam and ProfitDuel are capable tools with higher subscription prices. PromoGrind keeps the calculator suite free; its paid scanner is lower-cost, and its value depends on how often you use verified opportunities and record real outcomes.
      </div>
    </div>
  </div></div>
);

export default CompetitorComparison;
