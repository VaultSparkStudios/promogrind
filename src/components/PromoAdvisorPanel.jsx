import React, { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "../auth.js";
import { AppDataCtx } from "../contexts.jsx";
import { buildCacheKey, estimateAiSpendUsd, getBudgetState, hasStreamingGateway, invokeProjectFunction, readDailyUsage, readTimedCache, recordAiSpend, streamProjectFunction, writeDailyUsage, writeTimedCache } from "../ai/gateway.js";
import { FEATURE_FLAGS, getProjectAuthHref } from "../launchState.js";
import { FeatureUnavailableCard } from "../ui.jsx";
import { useFeatureFlag } from "../lib/featureFlags.js";
import { useToast } from "../contexts.jsx";
import { K, font, fontD, S } from "../lib/shared.js";
import { normalizeRecommendation } from "../promograph/index.js";
import { recommendationToWorkflow } from "../promograph/recommendations.js";
import { appendWorkflow } from "../workflows/store.js";
import { flagVisit } from "../lib/missions.js";
import { recordTrustReceipt } from "../lib/trustReceipts.js";
import { recordPrediction } from "../lib/aiCalibration.js";
import { noteCacheHit, noteCacheMiss } from "../ai/promptCache.js";
import { buildAdvisorPrivacyEnvelope } from "../ai/advisorPrivacy.js";

const ADVISOR_RECEIPT_CONTRACT_VERSION = 4;
export const PromoAdvisorPanel = ({ user, proStatus, onClose }) => {
  useEffect(() => { flagVisit('advisor'); }, []);
  const { appData, syncAppData } = React.useContext(AppDataCtx) || {};
  const signInHref = getProjectAuthHref('signin');
  const signUpHref = getProjectAuthHref('signup');
  // Remote-overridable feature gate (falls back to build-time FEATURE_FLAGS.promoAdvisor)
  const { enabled: advisorEnabled } = useFeatureFlag('promoAdvisor');
  const isPro = proStatus?.status === 'active' || proStatus?.status === 'trial';
  const DAILY_LIMIT = isPro ? 9999 : 3;
  const [promoText, setPromoText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uses, setUses] = useState(() => readDailyUsage("pg_advisor_uses"));
  const [streamingText, setStreamingText] = useState('');
  const [personalize, setPersonalize] = useState(false);
  const abortRef = useRef(null);
  const toast = useToast();
  const privacyPreview = useMemo(() => buildAdvisorPrivacyEnvelope({
    promoText,
    includeProfile: personalize,
    appData,
  }), [promoText, personalize, appData]);

  // Gate check after all hooks — safe per Rules of Hooks
  if (!advisorEnabled && !FEATURE_FLAGS.promoAdvisor) {
    return (
      <div style={{position:'fixed',top:80,right:20,width:360,maxWidth:'calc(100vw - 40px)',zIndex:9998}}>
        <FeatureUnavailableCard featureKey="promoAdvisor" title="Promo Advisor" body="Promo Advisor will appear here once the AI explainer backend is activated." />
      </div>
    );
  }

  const analyze = async () => {
    if (!user || !promoText.trim() || uses >= DAILY_LIMIT || loading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setError(''); setResult(null); setStreamingText('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const privacyEnvelope = buildAdvisorPrivacyEnvelope({
        promoText,
        includeProfile: personalize,
        appData,
      });
      const { body } = privacyEnvelope;
      const privacyReceipt = privacyEnvelope.receipt;
      const cacheKey = buildCacheKey(`promo-advisor:v${ADVISOR_RECEIPT_CONTRACT_VERSION}`, body);
      const cached = readTimedCache(cacheKey, 12 * 60 * 60 * 1000, null);
      if (cached) {
        noteCacheHit(cached?.usage?.input_tokens || cached?.usage?.inputTokens || 0);
        setResult({ ...cached, cacheHit: true });
        setLoading(false);
        return;
      }

      noteCacheMiss();
      if (hasStreamingGateway()) {
        await streamProjectFunction("promo-advisor", {
          session,
          body,
          signal: controller.signal,
          onDelta: (evt) => setStreamingText((prev) => prev + (evt.text || "")),
          onDone: (evt) => {
            const data = evt.result;
            const newUses = Number.isFinite(evt.remaining) ? DAILY_LIMIT - evt.remaining : uses + 1;
            setUses(newUses);
            writeDailyUsage("pg_advisor_uses", newUses);
            setResult(data);
            writeTimedCache(cacheKey, data);
            recordAiSpend(estimateAiSpendUsd(evt), { feature: "promo-advisor", source: data?.analysisSource || "ai", privacyReceipt });
            recordTrustReceipt({
              type: "ai",
              title: "Promo Advisor analyzed an offer",
              summary: data?.analysisSource === "rule_engine"
                ? "PromoGrind resolved this promo with local offer rules instead of spending a model call."
                : `PromoGrind redacted ${privacyReceipt.redactionCount} sensitive value(s) before analysis and ${privacyReceipt.profileIncluded ? "included the two consented profile fields" : "kept bankroll and active books in this browser"}.`,
              stored: ["daily usage count", "cached analysis result", "privacy receipt counts (not redacted values)"],
              notStored: ["raw password", "payment data", ...(!privacyReceipt.profileIncluded ? ["bankroll", "active books"] : [])],
              undo: "Clear browser data to remove local cached analyses.",
              dedupeKey: `ai:advisor:${cacheKey}`,
              dedupeMs: 12 * 60 * 60 * 1000,
            });
            setStreamingText("");
          },
        });
      } else {
        const data = await invokeProjectFunction(supabase, "promo-advisor", {
          session,
          body,
        });
        const newUses = Number.isFinite(data?.remaining) ? DAILY_LIMIT - data.remaining : uses + 1;
        setUses(newUses);
        writeDailyUsage("pg_advisor_uses", newUses);
        setResult(data);
        writeTimedCache(cacheKey, data);
        recordAiSpend(estimateAiSpendUsd(data), { feature: "promo-advisor", source: data?.analysisSource || "ai", privacyReceipt });
        recordTrustReceipt({
          type: "ai",
          title: "Promo Advisor analyzed an offer",
          summary: data?.analysisSource === "rule_engine"
            ? "PromoGrind resolved this promo with local offer rules instead of spending a model call."
            : `PromoGrind redacted ${privacyReceipt.redactionCount} sensitive value(s) before analysis and ${privacyReceipt.profileIncluded ? "included the two consented profile fields" : "kept bankroll and active books in this browser"}.`,
          stored: ["daily usage count", "cached analysis result", "privacy receipt counts (not redacted values)"],
          notStored: ["raw password", "payment data", ...(!privacyReceipt.profileIncluded ? ["bankroll", "active books"] : [])],
          undo: "Clear browser data to remove local cached analyses.",
          dedupeKey: `ai:advisor:${cacheKey}`,
          dedupeMs: 12 * 60 * 60 * 1000,
        });
      }
    } catch(e) {
      if (e?.name !== 'AbortError') {
        setError(e?.message === 'Unauthorized' ? 'Sign in to analyze promos.' : 'Analysis failed. Please try again.');
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const isLimited = uses >= DAILY_LIMIT && !isPro;
  const ratingColor = result?.rating === 'excellent' ? K.gn : result?.rating === 'good' ? K.ac : result?.rating === 'poor' ? K.rd : K.yl;

  // Confidence badge
  const confMap = { HIGH: K.gn, MEDIUM: K.yl, LOW: K.rd };
  const confKey = result?.confidence ? String(result.confidence).toUpperCase() : null;
  const confColor = confKey && confMap[confKey] ? confMap[confKey] : null;

  // EV color
  const evRaw = result?.ev;
  const evIsPositive = evRaw != null && (
    (typeof evRaw === 'number' && evRaw > 0) ||
    (typeof evRaw === 'string' && evRaw.trim().startsWith('+'))
  );
  const evColor = evIsPositive ? K.gn : K.rd;

  const openRecommendedCalculator = () => {
    const recommendation = normalizeRecommendation(result || {});
    if (!recommendation.calculatorSlug && !recommendation.promoType) {
      if (toast) toast("No calculator recommendation returned for this promo yet.", K.yl);
      return;
    }
    window.dispatchEvent(new CustomEvent("pg:quick-calc", {
      detail: {
        calculatorSlug: recommendation.calculatorSlug || null,
        type: recommendation.promoType || null,
      },
    }));
  };

  const saveWorkflow = () => {
    if (!syncAppData) return;
    const recommendation = normalizeRecommendation(result || {});
    const workflow = recommendationToWorkflow(result || {}, {
      title: result?.verdict || "Promo Advisor recommendation",
      summary: result?.explanation || result?.action || "",
      calculatorKey: normalizeRecommendation(result || {}).calculatorSlug || "promo-advisor",
      calculatorLabel: "Promo Advisor",
      source: "promo_advisor",
      nextStep: result?.nextStep || "",
      note: result?.hedge || "",
    });
    const predicted = recommendation.positiveOutcomeProbability;
    const predictionId = predicted === null ? null : `advisor:${workflow.id}`;
    const workflowWithCalibration = {
      ...workflow,
      calibrationPredictionId: predictionId,
    };
    syncAppData(appendWorkflow(appData || {}, workflowWithCalibration));
    if (predicted !== null) {
      recordPrediction({
        id: predictionId,
        source: "promo-advisor",
        feature: "promo-advisor",
        predicted,
        probabilityBasis: recommendation.probabilityBasis,
        payload: {
          workflowId: workflow.id,
          promoType: workflow.promoType,
          calculatorSlug: workflow.calculatorSlug,
          confidence: workflow.confidence,
          opportunityScore: workflow.opportunityScore,
          probabilityBasis: recommendation.probabilityBasis,
        },
      });
    }
    if (toast) toast("Saved to workflow inbox.", K.gn);
  };

  return (
    <div style={{position:'fixed',right:0,top:0,bottom:0,width:360,background:K.s1,borderLeft:`1px solid ${K.bd}`,zIndex:1100,display:'flex',flexDirection:'column',boxShadow:'-4px 0 32px rgba(0,0,0,0.6)'}}>
      {/* Header */}
      <div style={{padding:'14px 16px',borderBottom:`1px solid ${K.bd}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:K.s2}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:K.tx}}>💡 Promo Advisor</div>
          <div style={{fontSize:11,color:K.mt,marginTop:2}}>Paste any promo — get an instant plain-English verdict</div>
          {(() => {
            const b = getBudgetState();
            const tone = b.overBudget ? K.yl : K.mt;
            return (
              <div style={{fontSize:9,color:tone,marginTop:3,letterSpacing:'0.6px'}}>
                AI budget · {b.badge}{b.overBudget ? ' · cached/rule path' : ''}
              </div>
            );
          })()}
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:K.mt,fontSize:18,padding:4}}>×</button>
      </div>

      {/* Guest gate — sign in required to call edge function */}
      {!user && (
        <div style={{margin:16,padding:16,background:`${K.gn}08`,border:`1px solid ${K.gn}25`,borderRadius:10,textAlign:'center'}}>
          <div style={{fontSize:22,marginBottom:8}}>💡</div>
          <div style={{fontSize:13,fontWeight:700,color:K.tx,marginBottom:6}}>Sign in to use Promo Advisor</div>
          <div style={{fontSize:11,color:K.dm,lineHeight:1.6,marginBottom:14}}>
            Free account gets 3 analyses per day. No credit card required.
          </div>
          <a
            href={signUpHref}
            style={{
              display:'block',padding:'10px 0',borderRadius:8,
              background:K.gn,color: K.ink,fontSize:12,fontWeight:700,
              textDecoration:'none',fontFamily:font,
            }}
          >
            Create Free Account →
          </a>
          <a
            href={signInHref}
            style={{
              display:'block',marginTop:8,fontSize:11,color:K.dm,
              textDecoration:'none',fontFamily:font,
            }}
          >
            Already have an account? Sign in →
          </a>
        </div>
      )}

      <div style={{flex:1,overflow:'auto',padding:16,display:'flex',flexDirection:'column',gap:12}}>
        {/* Textarea */}
        <textarea
          value={promoText}
          onChange={e => setPromoText(e.target.value)}
          placeholder={'Example: "Get a $200 Bonus Bet if your first $5 bet loses. Bonus bet expires in 7 days."\n\nOr paste the full promo T&C text.'}
          style={{width:'100%',minHeight:130,background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8,padding:10,color:K.tx,fontSize:12,resize:'vertical',fontFamily:font,boxSizing:'border-box',lineHeight:1.5}}
        />

        <div style={{padding:10,border:`1px solid ${K.bd}`,borderRadius:8,background:K.s2}}>
          <div style={{fontSize:10,color:K.dm,lineHeight:1.5}}>
            Privacy preview · {privacyPreview.receipt.redactionCount} sensitive value(s) will be replaced before analysis.
          </div>
          <label style={{display:'flex',alignItems:'flex-start',gap:8,marginTop:8,fontSize:10,color:K.tx,lineHeight:1.45,cursor:'pointer'}}>
            <input
              type="checkbox"
              checked={personalize}
              onChange={(event) => setPersonalize(event.target.checked)}
              style={{marginTop:2}}
            />
            <span>Personalize with my bankroll and active books. Optional: only those named fields leave this browser.</span>
          </label>
          {!personalize && privacyPreview.receipt.estimatedTokensSaved > 0 && (
            <div style={{fontSize:9,color:K.mt,marginTop:6}}>
              Profile stays local · about {privacyPreview.receipt.estimatedTokensSaved} request token(s) avoided.
            </div>
          )}
        </div>

        {/* Near-limit char count */}
        {promoText.length > 1800 && (
          <div style={{fontSize:10,color:K.yl,textAlign:'right'}}>{promoText.length}/2000 chars</div>
        )}

        {/* Quota awareness */}
        {!isPro && DAILY_LIMIT < 9999 && (() => {
          const remaining = Math.max(0, DAILY_LIMIT - uses);
          const pct = remaining / DAILY_LIMIT;
          const quotaColor = pct <= 0 ? K.rd : pct <= 0.34 ? K.yl : K.mt;
          const resetTime = (() => {
            const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const hrs = Math.ceil((tomorrow - new Date()) / 3600000);
            return hrs <= 1 ? "< 1 hr" : `${hrs} hrs`;
          })();
          return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
              <div style={{ fontSize: 10, color: quotaColor, fontWeight: remaining === 0 ? 700 : 400 }}>
                {remaining === 0 ? `Quota reset in ${resetTime}` : `${remaining} of ${DAILY_LIMIT} analyses remaining today`}
              </div>
              {remaining <= 1 && (
                <a href="/pricing" style={{ fontSize: 10, color: K.ac, fontWeight: 700, textDecoration: "none", padding: "2px 6px", border: `1px solid ${K.ac}40`, borderRadius: 4 }}>
                  Upgrade ↑
                </a>
              )}
            </div>
          );
        })()}

        {/* Rate limit banner */}
        {isLimited && (
          <div style={{background:`${K.pp}15`,border:`1px solid ${K.pp}30`,borderRadius:8,padding:10,fontSize:12,color:K.pp,textAlign:'center'}}>
            Daily limit reached. Upgrade to <strong>Runner plan</strong> for unlimited analyses.
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={analyze}
          disabled={loading || !user || !promoText.trim() || isLimited}
          style={{padding:'9px',background:isLimited?K.s2:'#7c3aed',border:`1px solid ${isLimited?K.bd:'#7c3aed'}`,borderRadius:8,color:isLimited?K.mt:'#fff',fontWeight:700,fontSize:12,cursor:loading||isLimited?'default':'pointer',fontFamily:font,opacity:loading?0.7:1}}
        >
          {loading ? '⏳ Analyzing...' : !user ? 'Sign in to analyze promos' : '🔍 Analyze This Promo'}
        </button>

        {/* Error card with retry */}
        {error && (
          <div style={{background:`${K.rd}10`,border:`1px solid ${K.rd}40`,borderRadius:8,padding:'10px 12px',display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
            <span style={{flex:1,fontSize:12,color:K.rd,lineHeight:1.5}}>{error}</span>
            <button
              onClick={analyze}
              style={{flexShrink:0,padding:'4px 10px',background:`${K.rd}20`,border:`1px solid ${K.rd}50`,borderRadius:6,color:K.rd,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font}}
            >
              Retry
            </button>
          </div>
        )}

        {/* Streaming progress indicator */}
        {loading && streamingText && (
          <div style={{ background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: K.mt, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Analyzing…</div>
            <div style={{ fontSize: 11, color: K.dm, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'hidden', opacity: 0.7 }}>{streamingText.slice(-300)}</div>
          </div>
        )}

        {/* Empty state hint */}
        {!result && !error && !loading && (
          <div style={{background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8,padding:'12px 14px'}}>
            <div style={{fontWeight:700,color:K.dm,marginBottom:6,fontFamily:fontD,fontSize:12}}>💡 Paste any promo T&C text and get:</div>
            <div style={{fontSize:11,color:K.mt,lineHeight:1.9}}>
              <div>• Plain-English verdict (excellent / good / poor)</div>
              <div>• Expected value estimate</div>
              <div>• Best action to take</div>
              <div>• Hedge strategy if applicable</div>
            </div>
          </div>
        )}

        {/* Result card */}
        {result && (
          <div style={{background:`${ratingColor}10`,border:`1px solid ${ratingColor}40`,borderRadius:10,padding:14,display:'flex',flexDirection:'column',gap:8}}>
            {/* Verdict + confidence badge */}
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <div style={{fontSize:15,fontWeight:800,color:ratingColor,flex:1}}>{result.verdict || 'Analysis Complete'}</div>
              {result?.analysisSource === 'rule_engine' && (
                <span style={{padding:'2px 8px',borderRadius:50,fontSize:9,fontWeight:700,background:`${K.ac}18`,color:K.ac,letterSpacing:'0.8px'}}>
                  INSTANT
                </span>
              )}
              {confColor && (
                <span style={{padding:'2px 8px',borderRadius:50,fontSize:9,fontWeight:700,background:`${confColor}20`,color:confColor,letterSpacing:'0.8px'}}>
                  {confKey}
                </span>
              )}
              {result?.opportunityScore != null && (
                <span style={{padding:'2px 8px',borderRadius:50,fontSize:9,fontWeight:700,background:`${ratingColor}18`,color:ratingColor,letterSpacing:'0.8px'}}>
                  SCORE {result.opportunityScore}
                </span>
              )}
            </div>

            {result.explanation && (
              <div style={{fontSize:12,color:K.dm,lineHeight:1.6}}>{result.explanation}</div>
            )}
            {result?.analysisSource === 'rule_engine' && (
              <div style={{fontSize:10,color:K.mt}}>
                PromoGrind resolved this instantly from recognizable offer terms instead of spending an AI call.
              </div>
            )}
            {result?.cacheHit && (
              <div style={{fontSize:10,color:K.ac}}>
                Reused a cached analysis for this exact promo text to avoid another AI call.
              </div>
            )}

            {/* EV pill */}
            {evRaw != null && (
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:11,color:K.mt,flexShrink:0}}>Expected Value:</span>
                <span style={{display:'inline-block',padding:'3px 10px',borderRadius:50,background:`${evColor}18`,border:`1px solid ${evColor}40`,fontSize:12,fontWeight:700,color:evColor,letterSpacing:'0.3px'}}>
                  {String(evRaw)}
                </span>
              </div>
            )}

            {result.action && (
              <div style={{fontSize:12}}>
                <span style={{color:K.mt}}>Best Action: </span>
                <span style={{color:K.ac,fontWeight:700}}>{result.action}</span>
              </div>
            )}

            {result.nextStep && (
              <div style={{fontSize:12}}>
                <span style={{color:K.mt}}>Next Step: </span>
                <span style={{color:K.gn,fontWeight:700}}>{result.nextStep}</span>
              </div>
            )}

            {result.hedge && (
              <div style={{fontSize:12}}>
                <span style={{color:K.mt}}>Hedge Strategy: </span>
                <span style={{color:K.pp,fontWeight:700}}>{result.hedge}</span>
              </div>
            )}

            {Array.isArray(result?.riskFlags) && result.riskFlags.length > 0 && (
              <div>
                <div style={{fontSize:10,color:K.mt,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>Risk Flags</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {result.riskFlags.map((flag) => (
                    <span key={flag} style={{padding:'4px 8px',borderRadius:999,background:`${K.rd}15`,border:`1px solid ${K.rd}30`,fontSize:10,color:K.rd,fontWeight:700}}>
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(result?.opsTags) && result.opsTags.length > 0 && (
              <div style={{fontSize:10,color:K.mt}}>
                Ops tags: {result.opsTags.join(" · ")}
              </div>
            )}

            {([...(result?.assumptions || []), ...(result?.missingInputs || []), ...(result?.sensitivityTriggers || [])].length > 0) && (
              <details style={{marginTop:4}}>
                <summary aria-label="Open decision receipt" style={{fontSize:10,color:K.mt,cursor:'pointer',userSelect:'none',listStyle:'none',display:'flex',alignItems:'center',gap:4}}>
                  <span>▸</span><span style={{textDecoration:'underline',textDecorationStyle:'dotted'}}>Decision Receipt · {result.evidenceGrade || 'estimate'}</span>
                </summary>
                <div style={{marginTop:6,paddingLeft:12,borderLeft:`2px solid ${K.bd2}`}}>
                  {result.assumptions?.length > 0 && <div style={{fontSize:9,color:K.mt,textTransform:'uppercase',marginBottom:2}}>Assumptions</div>}
                  {result.assumptions?.map((item, i) => <div key={`a-${i}`} style={{fontSize:10,color:K.dm,lineHeight:1.6}}>• {item}</div>)}
                  {result.missingInputs?.length > 0 && <div style={{fontSize:9,color:K.mt,textTransform:'uppercase',marginTop:6,marginBottom:2}}>Missing inputs</div>}
                  {result.missingInputs?.map((item, i) => <div key={`m-${i}`} style={{fontSize:10,color:K.yl,lineHeight:1.6}}>• {item}</div>)}
                  {result.sensitivityTriggers?.length > 0 && <div style={{fontSize:9,color:K.mt,textTransform:'uppercase',marginTop:6,marginBottom:2}}>What would change this</div>}
                  {result.sensitivityTriggers?.map((item, i) => <div key={`s-${i}`} style={{fontSize:10,color:K.ac,lineHeight:1.6}}>• {item}</div>)}
                </div>
              </details>
            )}

            {/* Quick Calc CTA */}
            <button
              onClick={openRecommendedCalculator}
              style={{marginTop:4,padding:'7px 12px',background:`${K.ac}15`,border:`1px solid ${K.ac}40`,borderRadius:7,color:K.ac,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:font,textAlign:'left'}}
            >
              {result?.calculatorSlug ? 'Open recommended calculator →' : 'Calculate this promo →'}
            </button>
            <button
              onClick={saveWorkflow}
              style={{marginTop:4,padding:'7px 12px',background:'transparent',border:`1px solid ${K.gn}35`,borderRadius:7,color:K.gn,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:font,textAlign:'left'}}
            >
              Save to workflow inbox →
            </button>
          </div>
        )}

        {/* Upsell footer */}
        {!isPro && (
          <div style={{marginTop:'auto',padding:12,background:`${K.pp}08`,border:`1px solid ${K.pp}20`,borderRadius:8,fontSize:11,color:K.mt,textAlign:'center'}}>
            <strong style={{color:K.pp}}>Runner plan</strong> unlocks unlimited Promo Advisor + AI Action Plan · <strong style={{color:'#22c55e'}}>Closer</strong> adds Live Scanner — from $19.99/mo
          </div>
        )}
      </div>
    </div>
  );
};
