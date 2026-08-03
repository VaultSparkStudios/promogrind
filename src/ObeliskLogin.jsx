// obelisk-passport — themed login component (generated, type=saas-app).
// Drop into your app; render at your unauthenticated route. Dependency-free
// (plain DOM + the Obelisk client script). Works in any React/Vite SPA.
import { useEffect, useRef } from "react";
import { OBELISK_AUTH_ENABLED } from './data/identityArchitecture.js';
const IDP = "https://obeliskgate.com";
export function ObeliskLogin({ project = "PromoGrind", tier = "T3", returnUrl }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!OBELISK_AUTH_ENABLED) return undefined;
    const ret = returnUrl || (location.origin + "/auth/callback");
    const s = document.createElement("script");
    s.src = IDP + "/auth-client.js";
    s.dataset.obeliskIdp = IDP; s.dataset.obeliskProject = project;
    s.dataset.obeliskTier = tier; s.dataset.obeliskReturn = ret;
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [project, tier, returnUrl]);
  if (!OBELISK_AUTH_ENABLED) {
    return (
      <div role="status" style={{ maxWidth: 380, margin: '0 auto', padding: 20, borderRadius: 14, border: '1px solid #334155', background: '#0f172a', color: '#cbd5e1', textAlign: 'center' }}>
        <strong>Obelisk sign-in is not live in this FORGE build.</strong>
        <div style={{ marginTop: 7, fontSize: 13, opacity: .75 }}>Use the clearly labeled PromoGrind compatibility account path while verification and recovery delegation are completed.</div>
      </div>
    );
  }
  return (
    <div ref={ref} className="obelisk-passport" style={{ maxWidth: 380, margin: "0 auto", padding: 28, borderRadius: 16, background: "#f8fafc", color: "#0b0f17", textAlign: "center" }}>
      <div style={{ fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", opacity: .6 }}>{project}</div>
      <h1 style={{ fontSize: 22, margin: "10px 0 6px" }}>Sign in</h1>
      <p style={{ opacity: .7, fontSize: 14, margin: "0 0 22px" }}>Studio identity access delegated to Obelisk.</p>
      <button data-obelisk-signin style={{ width: "100%", padding: 13, border: 0, borderRadius: 10, background: "#2563eb", color: "#001018", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Sign in</button>
      <button data-obelisk-signup style={{ width: "100%", padding: 12, marginTop: 10, border: "1px solid #0ea5e9", borderRadius: 10, background: "transparent", color: "inherit", fontSize: 14, cursor: "pointer" }}>Create account</button>
      <button data-obelisk-recover style={{ marginTop: 14, border: 0, background: "none", color: "inherit", opacity: .6, fontSize: 13, textDecoration: "underline", cursor: "pointer" }}>Can't sign in? Recover access</button>
      <div style={{ marginTop: 14, fontSize: 11, opacity: .45 }}>Secured by Obelisk · passwordless · lost your device? recover with a backup code</div>
    </div>
  );
}
