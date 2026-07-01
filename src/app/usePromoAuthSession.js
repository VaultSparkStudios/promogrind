import { useEffect, useState } from "react";
import { getSubscription, supabase, tryAuth } from "../auth.js";
import { identifyUser } from "../analytics.js";
import { trackEvent } from "../analytics.js";
import { onDailyLogin } from "../sync.js";

export function usePromoAuthSession({ appData }) {
  const authReady = true;
  const [user, setUser] = useState(null);
  const [proStatus, setProStatus] = useState(null);
  const [weeklyActive, setWeeklyActive] = useState(null);

  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) localStorage.setItem("pg_ref", ref);
    } catch {}
  }, []);

  useEffect(() => {
    if (!authReady) return;
    try {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const prefs = JSON.parse(localStorage.getItem("pg_alert_prefs") || "{}");
      Object.entries(prefs).forEach(([name, pref]) => {
        if (!pref.alert || !pref.targetDate || pref.notified) return;
        const target = new Date(pref.targetDate);
        const hoursUntil = (target - Date.now()) / 3600000;
        if (hoursUntil > 0 && hoursUntil <= 24) {
          new Notification(`PromoGrind: ${name} expires soon!`, {
            body: `This promo expires in ${Math.round(hoursUntil)} hours. Open the calculator now.`,
            icon: "/promogrind/favicon.svg",
          });
          pref.notified = true;
          localStorage.setItem("pg_alert_prefs", JSON.stringify(prefs));
        }
      });
    } catch {}
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    supabase.from("vault_events").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .then(({ count }) => { if (typeof count === "number") setWeeklyActive(count); })
      .catch(() => {});
  }, [authReady]);

  useEffect(() => {
    let alive = true;

    const writePlanKey = (sub) => {
      try {
        const planKey = sub?.status === "trial" ? "trial"
          : sub?.plan === "vault_sparked" ? "vault_sparked"
          : sub?.plan === "pro" ? "pro"
          : "free";
        localStorage.setItem("pg_pro_status", planKey);
      } catch {}
    };

    const syncAuthenticatedState = async (session, options = {}) => {
      if (!alive) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setProStatus(null);
        writePlanKey(null);
        return;
      }

      if (options.trackLogin) {
        trackEvent("vault_member_login");
        trackEvent("promogrind_account_login");
      }

      onDailyLogin();
      window.VSSupabase = supabase;
      window.VaultSDK?.init("promogrind", {
        onReady: () => window.VaultSDK?.applyGates(),
      });

      const sub = await getSubscription();
      if (!alive) return;
      setProStatus(sub);
      identifyUser(currentUser, sub);
      writePlanKey(sub);

      try {
        const refCode = localStorage.getItem("pg_ref");
        if (refCode && refCode !== currentUser.id) {
          await supabase.from("referrals").insert({
            referrer_id: refCode,
            referred_user_id: currentUser.id,
          });
          localStorage.removeItem("pg_ref");
        }
      } catch {}
    };

    tryAuth().then(async (ok) => {
      if (!ok) {
        setUser(null);
        setProStatus(null);
        writePlanKey(null);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      await syncAuthenticatedState(session, { trackLogin: true });
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProStatus(null);
        writePlanKey(null);
        return;
      }

      await syncAuthenticatedState(session, {
        trackLogin: event === "SIGNED_IN",
      });
    });

    return () => {
      alive = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return { authReady, user, proStatus, weeklyActive };
}
