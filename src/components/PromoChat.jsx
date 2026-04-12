import React, { useState, useEffect, useRef } from "react";
import { K, font } from "../lib/shared.js";
import { FEATURE_FLAGS } from "../launchState.js";
import { supabase } from "../auth.js";
import { AppDataCtx } from "../contexts.jsx";

const PromoChat = ({ navigate }) => {
  if (!FEATURE_FLAGS.promoChat) return null;
  const { appData } = React.useContext(AppDataCtx) || {};
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatRemaining, setChatRemaining] = useState(() => DAILY_LIMIT - (() => { try { return parseInt(localStorage.getItem(`pg_chat_uses_${new Date().toISOString().slice(0, 10)}`) || '0'); } catch { return 0; } })());
  const [session, setSession] = useState(null);
  const messagesEndRef = useRef(null);
  const DAILY_LIMIT = 10;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatLoading]);

  const isPro = false; // PromoChat is available to all; rate-limited for non-Pro
  const todayKey = `pg_chat_uses_${new Date().toISOString().slice(0, 10)}`;
  const getUsesToday = () => { try { return parseInt(localStorage.getItem(todayKey) || '0'); } catch { return 0; } };
  const incUsesToday = () => { try { localStorage.setItem(todayKey, String(getUsesToday() + 1)); } catch {} };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const usesToday = getUsesToday();
    if (usesToday >= DAILY_LIMIT) {
      setChatRemaining(0);
      return;
    }
    const userMsg = { role: 'user', content: chatInput.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const history = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const { data, error: fnErr } = await supabase.functions.invoke('promo-chat', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
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
      const remaining = DAILY_LIMIT - getUsesToday();
      setChatRemaining(remaining);
      const assistantMsg = {
        role: 'assistant',
        content: data?.message || data?.reply || 'Sorry, I could not generate a response.',
        suggestions: data?.suggestions || [],
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.', suggestions: [] }]);
    } finally {
      setChatLoading(false);
    }
  };

  const usesToday = getUsesToday();
  const isLimited = usesToday >= DAILY_LIMIT;

  return (
    <>
      {/* Floating chat button */}
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

      {/* Slide-out chat panel */}
      {chatOpen && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0,
          width: 360, background: '#0f1520',
          borderLeft: `1px solid #1e293b`,
          zIndex: 1100, display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.6)',
          transform: 'translateX(0)',
          transition: 'transform 0.25s ease',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: `1px solid ${K.bd}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: K.s2,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: K.tx }}>💬 PromoGrind AI</div>
              <div style={{ fontSize: 11, color: K.mt, marginTop: 2 }}>Ask about promos, calculators, or strategy</div>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: K.mt, fontSize: 18, padding: 4 }}>×</button>
          </div>

          {/* Rate limit bar */}
          {chatRemaining !== null && (
            <div style={{ padding: '6px 16px', background: K.s1, borderBottom: `1px solid ${K.bd}`, fontSize: 11, color: K.mt, textAlign: 'right' }}>
              {chatRemaining} of {DAILY_LIMIT} messages left today
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ color: K.mt, fontSize: 12, textAlign: 'center', marginTop: 32, lineHeight: 1.7 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>
                Ask me anything about sportsbook promos, calculators, or betting strategy.
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}>
                <div style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: msg.role === 'user' ? `${K.gn}20` : K.s2,
                  border: `1px solid ${msg.role === 'user' ? K.gn + '40' : K.bd}`,
                  fontSize: 12, color: K.tx, lineHeight: 1.6,
                }}>
                  {msg.content}
                </div>
                {/* Calculator suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {msg.suggestions.map(slug => (
                      <button
                        key={slug}
                        onClick={() => { setChatOpen(false); navigate('/' + slug); }}
                        style={{
                          padding: '3px 10px', background: `${K.ac}15`,
                          border: `1px solid ${K.ac}40`, borderRadius: 50,
                          color: K.ac, fontSize: 10, cursor: 'pointer',
                          fontFamily: font,
                        }}
                      >
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
              <div style={{ padding: '12px 14px', background: `${K.pp}15`, border: `1px solid ${K.pp}30`, borderRadius: 8, fontSize: 12, color: K.pp, textAlign: 'center' }}>
                Daily limit reached. Upgrade to VaultSparked for more messages.
                <br/>
                <button
                  onClick={() => { setChatOpen(false); navigate('/upgrade'); }}
                  style={{ marginTop: 8, padding: '6px 16px', background: K.pp, border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: font }}
                >
                  Go VaultSparked →
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
              style={{
                flex: 1, padding: '8px 10px', background: K.s1,
                border: `1px solid ${K.bd2}`, borderRadius: 6,
                color: K.tx, fontFamily: font, fontSize: 12, outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!chatInput.trim() || chatLoading || isLimited}
              style={{
                padding: '8px 14px', background: K.gn, border: 'none',
                borderRadius: 6, color: K.bg, fontWeight: 700,
                fontSize: 12, cursor: 'pointer', fontFamily: font,
                opacity: (!chatInput.trim() || chatLoading || isLimited) ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PromoChat;
