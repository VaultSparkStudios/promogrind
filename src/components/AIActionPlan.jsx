import React from "react";
import { supabase } from "../auth.js";
import { invokeProjectFunction, readJsonCache, writeJsonCache } from "../ai/gateway.js";
import { AppDataCtx, useToast } from "../contexts.jsx";
import { FEATURE_FLAGS } from "../launchState.js";
import { FeatureUnavailableCard } from "../ui.jsx";
import { K, font, fontD } from "../lib/shared.js";
import { recommendationToWorkflow } from "../promograph/recommendations.js";
import { normalizeFeatureTier, useFeatureFlag } from "../lib/featureFlags.js";
import { appendWorkflow } from "../workflows/store.js";

export function AIActionPlan({ proStatus }) {
  const { appData, syncAppData } = React.useContext(AppDataCtx) || {};
  const toast = useToast();
  const { enabled: actionPlanEnabled } = useFeatureFlag("aiActionPlan", {
    tier: normalizeFeatureTier(proStatus?.plan),
  });
  const isActive = proStatus?.status === 'active' || proStatus?.status === 'trial';
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [lastGenDate, setLastGenDate] = React.useState(() => { try { return localStorage.getItem('pg_action_plan_date'); } catch { return null; } });

  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastGenDate === today) {
      const cached = readJsonCache("pg_action_plan_cache");
      if (cached) setPlan(cached);
    }
  }, []);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const appDataRaw = (() => { try { return JSON.parse(localStorage.getItem('promo_engine_v3') || '{}'); } catch { return {}; } })();
      const bankroll = localStorage.getItem('pg_bankroll') || '1000';
      const done = appDataRaw.done || {};
      const booksComplete = Object.values(done).filter(Boolean).length;
      const activeBooks = Object.entries(done).filter(([, v]) => !!v).map(([k]) => k);
      const ledger = appDataRaw.ledger || [];
      const recentProfit = ledger.slice(-10).reduce((s, e) => s + (parseFloat(e.profit) || 0), 0).toFixed(2);
      // Derive top promo type and hit rate from resultFeedback
      const feedback = Array.isArray(appDataRaw.resultFeedback) ? appDataRaw.resultFeedback : [];
      const settled = feedback.filter(e => e.status === 'settled');
      const promoTypeCounts = {};
      let hitCount = 0;
      for (const e of settled) {
        const pt = e.promoType || 'other';
        promoTypeCounts[pt] = (promoTypeCounts[pt] || 0) + 1;
        if ((parseFloat(e.actualProfit) || 0) > 0) hitCount++;
      }
      const topPromoType = Object.entries(promoTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const hitRate = settled.length >= 3 ? Math.round((hitCount / settled.length) * 100) : null;
      const data = await invokeProjectFunction(supabase, "ai-action-plan", {
        session,
        body: { bankroll, booksComplete, recentProfit, ledgerCount: ledger.length, activeBooks, topPromoType, hitRate },
      });
      setPlan(data);
      const today = new Date().toISOString().split('T')[0];
      try { localStorage.setItem('pg_action_plan_date', today); } catch {}
      writeJsonCache("pg_action_plan_cache", data);
      setLastGenDate(today);
    } catch (e) { setError(e.message || 'Failed to generate plan'); }
    finally { setLoading(false); }
  };

  const queueAction = (action, index) => {
    if (!syncAppData) return;
    const workflow = recommendationToWorkflow(action || {}, {
      id: `plan-${lastGenDate || new Date().toISOString().slice(0, 10)}-${index}`,
      title: action.title,
      summary: action.why,
      calculatorKey: action.calculatorSlug || "ai-action-plan",
      calculatorLabel: "AI Action Plan",
      source: "ai_action_plan",
      nextStep: action.nextStep || "",
      note: action.value || "",
    });
    syncAppData(appendWorkflow(appData || {}, workflow));
    if (toast) toast(`Queued "${action.title}" in workflow inbox.`, K.gn);
  };

  if (!actionPlanEnabled && !FEATURE_FLAGS.aiActionPlan) {
    return <FeatureUnavailableCard featureKey="aiActionPlan" title="AI Weekly Action Plan" body="AI weekly plans stay in beta until the planning backend is activated." />;
  }

  if (!isActive) return (
    <div><div style={{background:'#0f1520',border:'1px solid #1e293b',borderRadius:10,padding:20,marginBottom:16}}>
      <div style={{fontSize:16,fontWeight:700,color:'#e2e8f0',marginBottom:6,fontFamily:fontD}}>⚡ AI Weekly Action Plan</div>
      <div style={{fontSize:12,color:'#64748b',marginBottom:16,lineHeight:1.7}}>Claude AI analyzes your book roster, bankroll, and recent P/L each week and generates a personalized 3-item action plan. What to do, in what order, and why.</div>
      <div style={{padding:'12px 14px',background:'#0a0e17',borderRadius:6,border:'1px solid #1e293b',marginBottom:12}}>
        {['Run DraftKings 20% deposit match ($200 value) — expires Sunday','Lock FanDuel NBA arb at +2.1% ROI (~$42 on $2K)','Claim Caesars Wednesday boost before 11:59pm'].map((item,i)=>(
          <div key={i} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:i<2?`1px solid ${K.bd}`:'none',filter:'blur(3px)',userSelect:'none'}}>
            <span style={{color:K.gn,fontWeight:700,fontSize:13,minWidth:16}}>{i+1}</span>
            <span style={{fontSize:12,color:K.tx}}>{item}</span>
          </div>
        ))}
      </div>
      <button onClick={()=>{window.location.hash='#/upgrade';}} style={{width:'100%',padding:'10px',background:K.pp,border:'none',borderRadius:6,color:K.bg,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:font}}>
        Unlock AI Action Plan — VaultSparked →
      </button>
    </div></div>
  );

  const today = new Date().toISOString().split('T')[0];
  const alreadyToday = lastGenDate === today;

  return (
    <div data-vault-requires="vault_sparked" data-vault-gate-action="blur"><div style={{background:'#0f1520',border:'1px solid #1e293b',borderRadius:10,padding:20,marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:K.tx,fontFamily:fontD}}>⚡ AI Weekly Action Plan</div>
        {alreadyToday&&<span style={{fontSize:10,color:K.gn,padding:'2px 8px',background:'#1e3a2f',borderRadius:4}}>Generated today</span>}
      </div>
      {!plan&&!loading&&(
        <div>
          <div style={{fontSize:12,color:K.mt,marginBottom:16,lineHeight:1.7}}>Claude AI will analyze your book roster, bankroll, and recent P/L to create a personalized action plan for the week.</div>
          <button onClick={generate} style={{width:'100%',padding:'12px',background:K.gn,border:'none',borderRadius:6,color:K.bg,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:font}}>Generate My Plan →</button>
        </div>
      )}
      {loading&&<div style={{textAlign:'center',padding:'24px 0',color:K.mt,fontSize:12}}><div style={{fontSize:20,marginBottom:8}}>⚡</div>Analyzing your book roster and recent P/L…</div>}
      {error&&<div style={{padding:'10px 12px',background:'#2a1515',border:`1px solid ${K.rd}40`,borderRadius:6,color:K.rd,fontSize:12,marginBottom:12}}>{error}</div>}
      {plan&&(
        <div>
          {plan.summary&&<div style={{fontSize:12,color:K.dm,marginBottom:12,lineHeight:1.7,padding:'10px 12px',background:K.s3,borderRadius:6}}>{plan.summary}</div>}
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
            {(plan.actions||[]).map((action,i)=>(
              <div key={i} style={{padding:'12px 14px',background:K.s3,borderRadius:8,border:`1px solid ${K.bd}`}}>
                <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <span style={{fontSize:18,fontWeight:700,color:K.gn,minWidth:24,fontFamily:fontD}}>{i+1}</span>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap',marginBottom:3}}>
                      <div style={{fontSize:13,fontWeight:600,color:K.tx}}>{action.title}</div>
                      {action.priority && (
                        <span style={{padding:'2px 8px',borderRadius:999,background:`${action.priority === 'high' ? K.gn : K.ac}18`,color:action.priority === 'high' ? K.gn : K.ac,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px'}}>
                          {action.priority}
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:K.mt,lineHeight:1.6}}>{action.why}</div>
                    {action.value&&<div style={{fontSize:11,color:K.gn,fontWeight:600,marginTop:4}}>Est. value: {action.value}</div>}
                    {(action.confidence || action.opportunityScore != null) && (
                      <div style={{ fontSize: 10, color: K.mt, marginTop: 4 }}>
                        {action.confidence ? `Confidence: ${action.confidence}` : null}
                        {action.confidence && action.opportunityScore != null ? " · " : null}
                        {action.opportunityScore != null ? `Score: ${action.opportunityScore}` : null}
                      </div>
                    )}
                    {(action.bookTarget || action.calculatorSlug) && (
                      <div style={{fontSize:10,color:K.dm,marginTop:4}}>
                        {action.bookTarget ? `Target: ${action.bookTarget}` : null}
                        {action.bookTarget && action.calculatorSlug ? " · " : null}
                        {action.calculatorSlug ? `Calc: ${action.calculatorSlug}` : null}
                      </div>
                    )}
                    {Array.isArray(action.opsTags) && action.opsTags.length > 0 && (
                      <div style={{fontSize:10,color:K.mt,marginTop:4}}>
                        Tags: {action.opsTags.join(" · ")}
                      </div>
                    )}
                    {action.nextStep && <div style={{ fontSize: 10, color: K.ac, marginTop: 4 }}>Next: {action.nextStep}</div>}
                    <button
                      onClick={() => queueAction(action, i)}
                      style={{ marginTop: 8, padding: "6px 10px", background: "transparent", border: `1px solid ${K.ac}40`, borderRadius: 6, color: K.ac, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: font }}
                    >
                      Save to workflow inbox →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={generate} disabled={loading||alreadyToday}
            style={{width:'100%',padding:'8px',background:'transparent',border:`1px solid ${K.bd}`,borderRadius:6,color:alreadyToday?K.bd2:K.dm,cursor:alreadyToday?'not-allowed':'pointer',fontSize:11,fontFamily:font}}>
            {alreadyToday?'Plan generated for today — come back tomorrow':'Regenerate plan'}
          </button>
        </div>
      )}
    </div></div>
  );
}
