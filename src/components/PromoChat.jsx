import React, { useState, useEffect, useRef } from "react";
import { K, font, fontD } from "../lib/shared.js";
import { FEATURE_FLAGS, FREE_VAULT_MEMBERSHIP_URL } from "../launchState.js";
import { supabase, getSubscription } from "../auth.js";
import { AppDataCtx } from "../contexts.jsx";

// Daily message limits per tier
const LIMITS = { scout: 20, runner: 50, closer: Infinity, house: Infinity };
const SCOUT_UPGRADE_URL = '#/pricing';

function getTierLimit(plan) {
  if (!plan) return 0; // no subscription = no access
  if (['closer','house','vault_sparked'].includes(plan)) return Infinity;
  if (['runner','pro','sharp'].includes(plan)) return 50;
  if (['scout','grinder','concierge'].includes(plan)) return 20;
  return 0;
}

const PromoChat = ({ navigate }) => {
  if (!FEATURE_FLAGS.promoChat) return null;
  const { appData } = React.useContext(AppDataCtx) || {};
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [subPlan, setSubPlan] = useState(null);   // raw plan string or null
  const [subLoading, setSubLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const dailyLimit = getTierLimit(subPlan);
  const todayKey = `pg_chat_uses_${new Date().toISOString().slice(0, 10)}`;
  const getUsesToday = () => { try { return parseInt(localStorage.getItem(todayKey) || '0'); } catch { return 0; } };
  const incUsesToday = () => { try { localStorage.setItem(todayKey, String(getUsesToday() + 1)); } catch {} };

  const [chatRemaining, setChatRemaining] = useState(() => {
    const used = getUsesToday();
    return Math.max(0, 50 - used); // optimistic default
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setSessionLoading(false);
      if (s) {
        const sub = await getSubscription();
        const plan = sub?.plan ?? null;
        setSubPlan(plan);
        const limit = getTierLimit(plan);
        const used = getUsesToday();
        setChatRemaining(limit === Infinity ? Infinity : Math.max(0, limit - used));
      }
      setSubLoading(false);
    });
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatLoading]);

  const isLimited = dailyLimit !== Infinity && chatRemaining <= 0;
  const hasAccess = subPlan !== null && dailyLimit > 0;

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading || !session || !hasAccess || isLimited) return;
    const userMsg = { role: 'user', content: chatInput.trim().slice(0, 1000) };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const history = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const { data, error: fnErr } = await supabase.functions.invoke('promo-chat', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          message: userMsg.content,
          history: history.slice(0, -1),
          userContext: {
            bankroll: appData?.bankroll,
            books: appData?.tracker?.map(b => b.name),
          },
        },
      });
      if (fnErr) throw fnErr;
      incUsesToday();
      const newRemaining = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - getUsesToday());
      setChatRemaining(newRemaining);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data?.message || data?.reply || 'Sorry, I could not generate a response.',
        suggestions: data?.suggestions || [],
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.', suggestions: [] }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Upgrade gate content ───────────────────────────────────────────────────
  const renderGate = (type) => {
    if (type === 'no-session') return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center', gap: 16 }}>
        <div style={{ fontSize: 36 }}>💬</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: K.tx, fontFamily: fontD }}>PromoGrind AI</div>
        <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.8, maxWidth: 280 }}>
          Ask anything about promos, calculators, or matched betting strategy.<br/>
          Requires a <strong style={{ color: K.ac }}>Scout plan</strong> or higher.
        </div>
        <a href={FREE_VAULT_MEMBERSHIP_URL} style={{ padding: '10px 24px', background: K.gn, borderRadius: 6, color: '#0a0e17', fontWeight: 700, fontSize: 13, textDecoration: 'none', fontFamily: font }}>
          Sign in →
        </a>
        <button onClick={() => { setChatOpen(false); navigate(SCOUT_UPGRADE_URL.replace('#/', '')); }}
          style={{ padding: '8px 20px', background: 'transparent', border: `1px solid ${K.ac}`, borderRadius: 6, color: K.ac, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: font }}>
          View plans →
        </button>
        <div style={{ fontSize: 10, color: K.mt }}>Scout from $9.99/mo · 7-day free trial</div>
      </div>
    );

    if (type === 'no-plan') return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center', gap: 14 }}>
        <div style={{ fontSize: 36 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: K.tx, fontFamily: fontD }}>Scout plan required</div>
        <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.8, maxWidth: 280 }}>
          PromoGrind AI Chat is available on <strong style={{ color: K.ac }}>Scout</strong> and higher plans.
          Start a free 7-day trial — no credit card needed.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 260 }}>
          <button onClick={() => { setChatOpen(false); navigate('pricing'); }}
            style={{ padding: '10px 20px', background: K.ac, border: 'none', borderRadius: 7, color: '#0a0e17', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: font }}>
            Start free trial →
          </button>
          <div style={{ fontSize: 10, color: K.mt }}>Scout $9.99/mo · Runner $19.99/mo · Closer $34.99/mo</div>
        </div>
        <div style={{ width: '100%', padding: '10px 14px', background: `${K.gn}08`, border: `1px solid ${K.gn}20`, borderRadius: 8, fontSize: 11, color: K.dm, lineHeight: 1.7, textAlign: 'left' }}>
          <strong style={{ color: K.gn }}>Scout includes:</strong><br/>
          20 AI messages/day · Cloud sync · Data export · Push alerts
        </div>
      </div>
    );

    return null;
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setChatOpen(v => !v)}
        title="PromoGrind AI — ask about any promo or calculator"
        style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 1050,
          width: 48, height: 48, borderRadius: '50%',
          background: K.gr || K.gn, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        💬
        <span style={{
          position: 'absolute', top: 6, right: 6,
          width: 8, height: 8, borderRadius: '50%',
          background: K.gn, border: '2px solid #0a0e17',
          animation: 'pulse 2s infinite',
        }}/>
      </button>

      {/* Slide-out panel */}
      {chatOpen && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0,
          width: 360, background: '#0f1520',
          borderLeft: `1px solid #1e293b`,
          zIndex: 1100, display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.6)',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${K.bd}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: K.s2 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: K.tx }}>💬 PromoGrind AI</div>
              <div style={{ fontSize: 11, color: K.mt, marginTop: 2 }}>Ask about promos, calculators, or strategy</div>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: K.mt, fontSize: 18, padding: 4 }}>×</button>
          </div>

          {/* Loading state */}
          {(sessionLoading || subLoading) ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 12, color: K.mt }}>Loading…</div>
            </div>
          ) : !session ? renderGate('no-session')
            : !hasAccess ? renderGate('no-plan')
            : (
            <>
              {/* Usage bar */}
              <div style={{ padding: '6px 16px', background: K.s1, borderBottom: `1px solid ${K.bd}`, fontSize: 11, color: K.mt, textAlign: 'right' }}>
                {chatRemaining === Infinity
                  ? <span style={{ color: K.gn }}>Unlimited messages</span>
                  : `${chatRemaining} of ${dailyLimit} messages left today`}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                  <div style={{ color: K.mt, fontSize: 12, textAlign: 'center', marginTop: 32, lineHeight: 1.7 }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>
                    Ask me anything about sportsbook promos, calculators, or betting strategy.
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    <div style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: msg.role === 'user' ? `${K.gn}20` : K.s2,
                      border: `1px solid ${msg.role === 'user' ? K.gn + '40' : K.bd}`,
                      fontSize: 12, color: K.tx, lineHeight: 1.6,
                    }}>
                      {msg.content}
                    </div>
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {msg.suggestions.map(slug => (
                          <button key={slug} onClick={() => { setChatOpen(false); navigate('/' + slug); }}
                            style={{ padding: '3px 10px', background: `${K.ac}15`, border: `1px solid ${K.ac}40`, borderRadius: 50, color: K.ac, fontSize: 10, cursor: 'pointer', fontFamily: font }}>
                            → {slug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ alignSelf: 'flex-start', padding: '10px 12px', background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, fontSize: 12, color: K.mt }}>
                    ⏳ Thinking…
                  </div>
                )}
                {isLimited && !chatLoading && (
                  <div style={{ padding: '12px 14px', background: `${K.ac}15`, border: `1px solid ${K.ac}30`, borderRadius: 8, fontSize: 12, color: K.ac, textAlign: 'center' }}>
                    Daily limit reached.{' '}
                    {['scout','grinder'].includes(subPlan ?? '') && 'Upgrade to Runner for 50/day or Closer for unlimited.'}
                    {['runner','sharp','pro'].includes(subPlan ?? '') && 'Upgrade to Closer for unlimited messages.'}
                    <br/>
                    <button onClick={() => { setChatOpen(false); navigate('pricing'); }}
                      style={{ marginTop: 8, padding: '6px 16px', background: K.ac, border: 'none', borderRadius: 6, color: '#0a0e17', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: font }}>
                      View plans →
                    </button>
                  </div>
                )}
                <div ref={messagesEndRef}/>
              </div>

              {/* Input */}
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${K.bd}`, background: K.s2, display: 'flex', gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={isLimited ? 'Daily limit reached…' : 'Ask about a promo or calculator…'}
                  disabled={isLimited || chatLoading}
                  style={{ flex: 1, padding: '8px 10px', background: K.s1, border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.tx, fontFamily: font, fontSize: 12, outline: 'none' }}
                />
                <button onClick={sendMessage} disabled={!chatInput.trim() || chatLoading || isLimited}
                  style={{ padding: '8px 14px', background: K.gn, border: 'none', borderRadius: 6, color: K.bg, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: font, opacity: (!chatInput.trim() || chatLoading || isLimited) ? 0.5 : 1 }}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default PromoChat;
