import React, { useState, useRef } from "react";
import { K } from "./lib/shared.js";

// ═══ TOAST SYSTEM ═══
export const ToastCtx = React.createContext(null);
export const useToast = () => React.useContext(ToastCtx);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});
  const dismiss = (id) => {
    clearTimeout(timers.current[id]);
    setToasts(t => t.filter(x => x.id !== id));
  };
  // show(msg, color?, action?)  action = { label, fn }
  const show = (msg, color, action) => {
    const id = Date.now();
    const duration = action ? 4000 : 2200;
    setToasts(t => [...t, { id, msg, color: color || '#4ade80', action }]);
    timers.current[id] = setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
    return id;
  };
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: '10px 16px', background: K.s1, border: `1px solid ${t.color}40`, borderRadius: 8, color: t.color, fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono','SF Mono',monospace", boxShadow: '0 4px 16px rgba(0,0,0,0.4)', animation: 'fadeIn 0.15s ease', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{t.msg}</span>
            {t.action && <button onClick={() => { t.action.fn(); dismiss(t.id); }} style={{ padding: '2px 8px', background: `${t.color}25`, border: `1px solid ${t.color}60`, borderRadius: 4, color: t.color, fontSize: 10, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: '0.5px' }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </ToastCtx.Provider>
  );
};

// ═══ COMPACT MODE CONTEXT ═══
export const CompactCtx = React.createContext(false);

// ═══ APP DATA CONTEXT ═══
export const AppDataCtx = React.createContext(null);

// ═══ CURRENCY CONTEXT ═══
export const FX = { USD:{sym:'$',rate:1}, CAD:{sym:'C$',rate:1.36}, GBP:{sym:'£',rate:0.79} };
export const CurrencyCtx = React.createContext({sym:'$',rate:1,fmt:(n)=>'$'+n.toFixed(2)});
