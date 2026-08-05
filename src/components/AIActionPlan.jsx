import React from "react";
import { supabase } from "../auth.js";
import { invokeProjectFunction, readJsonCache, writeJsonCache } from "../ai/gateway.js";
import { AppDataCtx, useToast } from "../contexts.jsx";
import { FeatureUnavailableCard } from "../ui.jsx";
import { K, font, fontD } from "../lib/shared.js";
import { recommendationToWorkflow } from "../promograph/recommendations.js";
import { normalizeFeatureTier, useFeatureFlag } from "../lib/featureFlags.js";
import { appendWorkflow } from "../workflows/store.js";
import { buildActionPlanContext, buildVerificationFirstPlan, canInvokeActionPlanModel, validateGroundedActionPlan } from "../ai/actionPlanContext.js";
import { createEntityId } from "../lib/entityId.js";

function readLocalValue(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function readLocalJson(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

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
  const [includeProfile, setIncludeProfile] = React.useState(false);
  const [lastGenDate, setLastGenDate] = React.useState(() => { try { return localStorage.getItem('pg_action_plan_date'); } catch { return null; } });

  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastGenDate === today) {
      const cached = readJsonCache("pg_action_plan_cache");
      if (cached?.contextVersion === 1 && ["model", "rule_engine"].includes(cached?.analysisSource)) setPlan(cached);
      else {
        setLastGenDate(null);
        try { localStorage.removeItem("pg_action_plan_date"); } catch {}
      }
    }
  }, []);

  const previewContext = React.useMemo(() => buildActionPlanContext({
    observations: readLocalJson("pg_promo_observations_v1", {}),
    appData,
    includeProfile,
    bankroll: includeProfile ? readLocalValue("pg_bankroll") : null,
  }), [appData, includeProfile]);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const context = buildActionPlanContext({
        observations: readLocalJson("pg_promo_observations_v1", {}),
        appData,
        includeProfile,
        bankroll: includeProfile ? readLocalValue("pg_bankroll") : null,
      });
      let data;
      if (!canInvokeActionPlanModel(context)) {
        data = buildVerificationFirstPlan(context);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const response = await invokeProjectFunction(supabase, "ai-action-plan", { session, body: context });
        data = validateGroundedActionPlan(response, context);
      }
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
      id: createEntityId("workflow"),
      title: action.title,
      summary: action.why,
      calculatorKey: action.calculatorSlug || "ai-action-plan",
      calculatorLabel: "AI Action Plan",
      source: "ai_action_plan",
      nextStep: action.nextStep || "",
      note: action.requiresVerification ? "Verify current terms before acting." : "",
      sourceId: action.evidenceRefs?.join(",") || null,
      evidenceGrade: action.evidenceRefs?.length ? "operator-observed" : "verification-required",
    });
    syncAppData(appendWorkflow(appData || {}, workflow));
    if (toast) toast(`Queued "${action.title}" in workflow inbox.`, K.gn);
  };

  if (!actionPlanEnabled) {
    return <FeatureUnavailableCard featureKey="aiActionPlan" title="AI Weekly Action Plan" body="AI weekly plans stay in beta until the planning backend is activated." />;
  }

  if (!isActive) return (
    <div><div style={{background:'#0f1520',border:'1px solid #1e293b',borderRadius:10,padding:20,marginBottom:16}}>
      <div style={{fontSize:16,fontWeight:700,color:'#e2e8f0',marginBottom:6,fontFamily:fontD}}>⚡ AI Weekly Action Plan</div>
      <div style={{fontSize:12,color:'#64748b',marginBottom:16,lineHeight:1.7}}>The planner ranks only recent promo observations you recorded. It does not inspect bankroll, book roster, or outcomes unless you explicitly include that profile for one request.</div>
      <div style={{padding:'12px 14px',background:'#0a0e17',borderRadius:6,border:'1px solid #1e293b',marginBottom:12}}>
        {['Verify the current terms of an observed pattern','Calculate value from the terms you just verified','Record placed, skipped, and settled outcomes'].map((item,i)=>(
          <div key={i} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:i<2?`1px solid ${K.bd}`:'none',filter:'blur(3px)',userSelect:'none'}}>
            <span style={{color:K.gn,fontWeight:700,fontSize:13,minWidth:16}}>{i+1}</span>
            <span style={{fontSize:12,color:K.tx}}>{item}</span>
          </div>
        ))}
      </div>
      <button onClick={()=>{window.location.hash='#/upgrade';}} style={{width:'100%',padding:'10px',background:K.pp,border:'none',borderRadius:6,color: K.ink,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:font}}>
        Unlock AI Action Plan — VaultSparked →
      </button>
    </div></div>
  );

  const today = new Date().toISOString().split('T')[0];
  const alreadyToday = lastGenDate === today;
  const modelGeneratedToday = alreadyToday && plan?.analysisSource === "model";

  return (
    <div data-vault-requires="vault_sparked" data-vault-gate-action="blur"><div style={{background:'#0f1520',border:'1px solid #1e293b',borderRadius:10,padding:20,marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:K.tx,fontFamily:fontD}}>⚡ AI Weekly Action Plan</div>
        {alreadyToday&&<span style={{fontSize:10,color:K.gn,padding:'2px 8px',background:'#1e3a2f',borderRadius:4}}>Generated today · {plan?.analysisSource === "model" ? "evidence-ranked" : "local rules"}</span>}
      </div>
      {!plan&&!loading&&(
        <div>
          <div style={{fontSize:12,color:K.mt,marginBottom:12,lineHeight:1.7}}>
            {previewContext.observations.length
              ? `${previewContext.observations.length} current observation${previewContext.observations.length === 1 ? " is" : "s are"} eligible for evidence-bound ranking. Every action will still require a terms recheck.`
              : "No current Seen observation exists. PromoGrind will build a local verification-first plan and will not call an AI provider."}
          </div>
          <label style={{display:'flex',alignItems:'flex-start',gap:8,padding:'10px 12px',marginBottom:12,background:K.s3,border:`1px solid ${K.bd}`,borderRadius:6,fontSize:11,color:K.dm,lineHeight:1.5}}>
            <input type="checkbox" checked={includeProfile} onChange={(event) => setIncludeProfile(event.target.checked)} />
            <span><strong style={{color:K.tx}}>Include my operator profile for this request</strong><br/>Shares bankroll if set, active-book labels, recent realized P/L, and aggregate row counts. Off by default.</span>
          </label>
          <button onClick={generate} style={{width:'100%',padding:'12px',background:K.gn,border:'none',borderRadius:6,color: K.ink,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:font}}>{previewContext.observations.length ? "Rank My Verified Workflow →" : "Build Verification-First Plan →"}</button>
        </div>
      )}
      {loading&&<div style={{textAlign:'center',padding:'24px 0',color:K.mt,fontSize:12}}><div style={{fontSize:20,marginBottom:8}}>⚡</div>{previewContext.observations.length ? "Ranking cited observations inside the verification contract…" : "Building a local verification-first workflow…"}</div>}
      {error&&<div style={{padding:'10px 12px',background:'#2a1515',border:`1px solid ${K.rd}40`,borderRadius:6,color:K.rd,fontSize:12,marginBottom:12}}>{error}</div>}
      {plan&&(
        <div>
          <div style={{fontSize:10,color:K.mt,marginBottom:10,lineHeight:1.6}}>
            Source: {plan.analysisSource === "model" ? "AI-ranked, contract-normalized" : "deterministic local rules"} · Evidence: {plan.evidenceCount || 0} current observation{plan.evidenceCount === 1 ? "" : "s"} · Profile: {plan.profileIncluded ? "explicitly included" : "not shared"}
          </div>
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
                    {action.requiresVerification&&<div style={{fontSize:10,color:K.yl,fontWeight:700,marginTop:4}}>VERIFY CURRENT TERMS BEFORE ACTING</div>}
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
                    {Array.isArray(action.evidenceRefs) && action.evidenceRefs.length > 0 && <div style={{fontSize:9,color:K.mt,marginTop:4}}>Evidence ref: {action.evidenceRefs[0]}</div>}
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
          <button onClick={generate} disabled={loading||modelGeneratedToday}
            style={{width:'100%',padding:'8px',background:'transparent',border:`1px solid ${K.bd}`,borderRadius:6,color:modelGeneratedToday?K.bd2:K.dm,cursor:modelGeneratedToday?'not-allowed':'pointer',fontSize:11,fontFamily:font}}>
            {modelGeneratedToday?'Evidence-ranked plan generated today — come back tomorrow':'Re-evaluate current evidence'}
          </button>
        </div>
      )}
    </div></div>
  );
}
