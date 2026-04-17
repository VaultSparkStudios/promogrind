import { useState } from "react";
import { supabase, startTrial } from "../auth.js";
import { FEATURE_FLAGS } from "../launchState.js";
import { S, In, Tl, FeatureUnavailableCard, Help } from "../ui.jsx";
import { useToast } from "../contexts.jsx";
import { K, font } from "../lib/shared.js";
import { BOOKS } from "../books.js";
import { normalizeFeatureTier, useFeatureFlag } from "../lib/featureFlags.js";

export function StackBuilder({ proStatus }) {
  const { enabled: stackBuilderEnabled } = useFeatureFlag("stackBuilder", {
    tier: normalizeFeatureTier(proStatus?.plan),
  });
  const isActive = proStatus?.status === 'active' || proStatus?.status === 'trial';
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bankroll, setBankroll] = useState(() => { try { return localStorage.getItem('pg_bankroll') || '1000'; } catch { return '1000'; } });
  const [booksAvailable, setBooksAvailable] = useState([]);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const allBooks = BOOKS.map(b => b.name);

  const toggleBook = (book) => {
    setBooksAvailable(prev =>
      prev.includes(book) ? prev.filter(b => b !== book) : [...prev, book]
    );
  };

  const generate = async () => {
    if (!isActive) { toast('Stack Builder is VaultSparked only — start your free 7-day trial', K.pp); return; }
    if (!bankroll || parseFloat(bankroll) < 100) { toast('Minimum $100 bankroll required', K.rd); return; }
    setLoading(true); setError(null); setPlan(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data, error: fnErr } = await supabase.functions.invoke('stack-builder', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { bankroll: parseFloat(bankroll), booksAvailable },
      });
      if (fnErr) throw fnErr;
      setPlan(data);
    } catch (e) {
      setError(e.message || 'Failed to generate stack');
    } finally {
      setLoading(false);
    }
  };

  const copyPlan = () => {
    if (!plan) return;
    const stepLines = Array.isArray(plan.steps)
      ? plan.steps.map((step, index) => {
          const order = step.order || index + 1;
          const value = Number.isFinite(Number(step.value)) ? ` — est. $${Number(step.value).toFixed(0)}` : "";
          const calc = step.calculatorSlug ? ` (${step.calculatorSlug})` : "";
          return `${order}. ${step.book || "Book"}${calc}: ${step.action || "Run the recommended promo step."}${value}`;
        })
      : [];
    const fallback = plan.plan ? [plan.plan] : [];
    const assumptions = Array.isArray(plan.assumptions) && plan.assumptions.length
      ? ["", "Assumptions:", ...plan.assumptions.map((a) => `- ${a}`)]
      : [];
    navigator.clipboard.writeText([
      `PromoGrind Stack Builder — $${bankroll} bankroll`,
      "",
      plan.summary || "Optimal promo stack generated.",
      ...stepLines,
      ...fallback,
      ...assumptions,
    ].join("\n")).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  if (!stackBuilderEnabled && !FEATURE_FLAGS.stackBuilder) {
    return <FeatureUnavailableCard featureKey="stackBuilder" title="Stack Builder" body="Stack Builder will unlock here once the AI planning backend is activated." />;
  }

  return (
    <div data-vault-requires="vault_sparked" data-vault-gate-action="blur">
      <div style={S.card}>
        <Tl t="Stack Builder" badge="AI · VAULTSPARKED" bc={K.pp}/>
        <p style={{fontSize:12,color:K.dm,marginBottom:16,lineHeight:1.6}}>
          Enter your bankroll and available books. Claude analyzes current promos and returns your optimal 3-book extraction sequence with guaranteed profit amounts.
        </p>

        {!isActive && (
          <div style={{padding:14,background:`${K.pp}08`,border:`1px solid ${K.pp}30`,borderRadius:8,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:K.pp}}>⚡ VaultSparked Feature</div>
              <div style={{fontSize:11,color:K.mt}}>Start your free 7-day trial — no credit card required</div>
            </div>
            <button onClick={()=>startTrial && startTrial()} style={{padding:'6px 14px',background:K.pp,border:'none',borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:'pointer',fontFamily:font}}>Try Free →</button>
          </div>
        )}

        <div style={S.row}>
          <div style={S.col}><In l="Your Bankroll" v={bankroll} set={v=>{setBankroll(v); try{localStorage.setItem('pg_bankroll',v);}catch{}}} pre="$" ph="1000"/></div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={S.label}>Books you have available (optional — leave blank for all)</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
            {allBooks.map(book => {
              const sel = booksAvailable.includes(book);
              return (
                <button key={book} onClick={() => toggleBook(book)}
                  style={{padding:'4px 10px',background:sel?`${K.gn}15`:'transparent',border:`1px solid ${sel?K.gn:K.bd2}`,borderRadius:50,color:sel?K.gn:K.dm,fontSize:10,cursor:'pointer',fontFamily:font}}>
                  {sel ? '✓ ' : ''}{book}
                </button>
              );
            })}
          </div>
          {booksAvailable.length > 0 && (
            <button onClick={() => setBooksAvailable([])} style={{marginTop:6,background:'none',border:'none',color:K.mt,fontSize:10,cursor:'pointer',textDecoration:'underline',padding:0}}>Clear all</button>
          )}
        </div>

        <button
          onClick={generate}
          disabled={loading}
          style={{width:'100%',padding:'12px 0',background:isActive?(loading?`${K.pp}40`:K.pp):`${K.pp}20`,border:`1px solid ${K.pp}${isActive?'':40}`,borderRadius:8,color:isActive?K.bg:K.pp,fontFamily:font,fontWeight:700,fontSize:13,cursor:loading?'wait':'pointer',letterSpacing:'0.5px'}}>
          {loading ? '⚡ Building your optimal stack…' : '⚡ Build My Stack'}
        </button>

        {error && <div style={{...S.note(K.rd),marginTop:12}}>{error}</div>}

        {plan && (
          <div style={{marginTop:16,padding:16,background:`${K.pp}08`,border:`1px solid ${K.pp}30`,borderRadius:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{fontSize:10,color:K.pp,textTransform:'uppercase',letterSpacing:'1.5px',fontWeight:700}}>Your Optimal Stack</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {plan.estimatedTotal && (
                  <span style={{fontSize:11,color:K.gn,fontWeight:700}}>Est. ${plan.estimatedTotal} guaranteed</span>
                )}
                <button onClick={copyPlan} style={{padding:'3px 10px',background:'transparent',border:`1px solid ${K.bd2}`,borderRadius:4,color:copied?K.gn:K.mt,fontSize:9,cursor:'pointer',fontFamily:font}}>
                  📋 {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div style={{fontSize:12,color:K.tx,lineHeight:1.8,whiteSpace:'pre-wrap'}}>
              {plan.summary}
            </div>
            {Array.isArray(plan.steps) && plan.steps.length > 0 && (
              <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
                {plan.steps.map((step, index) => (
                  <div key={`${step.book || 'book'}-${step.order || index}`} style={{padding:'10px 12px',background:K.s3,border:`1px solid ${K.bd}`,borderRadius:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start',marginBottom:4}}>
                      <div style={{fontSize:12,fontWeight:700,color:K.tx}}>
                        {step.order || index + 1}. {step.book || 'Sportsbook step'}
                      </div>
                      {step.value != null && (
                        <span style={{fontSize:10,color:K.gn,fontWeight:700}}>Est. ${Number(step.value).toFixed(0)}</span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:K.dm,lineHeight:1.6}}>{step.action}</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                      {step.promoType && <span style={{...S.tag(K.ac)}}>{step.promoType.replace(/_/g, ' ')}</span>}
                      {step.calculatorSlug && <span style={{...S.tag(K.pp)}}>{step.calculatorSlug}</span>}
                      {step.hedgeRequired && <span style={{...S.tag(K.yl)}}>hedge required</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!Array.isArray(plan.steps) && plan.plan && (
              <div style={{fontSize:12,color:K.tx,lineHeight:1.8,whiteSpace:'pre-wrap',marginTop:12}}>
                {plan.plan}
              </div>
            )}
            {Array.isArray(plan.assumptions) && plan.assumptions.length > 0 && (
              <div style={{marginTop:12,padding:'10px 12px',background:K.s3,border:`1px solid ${K.bd}`,borderRadius:8}}>
                <div style={{fontSize:10,color:K.mt,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>Assumptions</div>
                <ul style={{margin:'0 0 0 16px',padding:0,color:K.dm,fontSize:11,lineHeight:1.7}}>
                  {plan.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}
                </ul>
              </div>
            )}
            {plan.booksUsed?.length > 0 && (
              <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6}}>
                {plan.booksUsed.map(b => (
                  <span key={b} style={{...S.tag(K.ac)}}>{b}</span>
                ))}
              </div>
            )}
            <div style={{marginTop:10,fontSize:10,color:K.mt}}>
              Generated {plan.generatedAt ? new Date(plan.generatedAt).toLocaleTimeString() : 'just now'} · {plan.promoCount} promos analyzed
            </div>
          </div>
        )}
      </div>
      <Help entries={[
        ["What is a promo stack?","A sequence of sportsbook promos executed in the optimal order to maximize guaranteed profit extraction. Order matters — welcome bonuses must come before recurring promos, and bankroll must cover hedge amounts at each step."],
        ["How does Claude generate the stack?","Claude analyzes your bankroll against available promo types, calculates expected guaranteed extraction for each (after hedge), and sequences them for maximum yield without over-committing capital."],
        ["Do I need all these books?","No — the more books you have, the more opportunities. But even 2-3 books generate meaningful stacks. Select only the books where you have accounts open."],
      ]}/>
    </div>
  );
}
