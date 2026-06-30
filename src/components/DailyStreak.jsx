import React, { useEffect, useState } from "react";
import { supabase } from "../auth.js";
import { DAILY_STREAK_COPY } from "../app/appText.js";
import { ToastCtx } from "../contexts.jsx";
import { K } from "../lib/shared.js";

function useToast() {
  return React.useContext(ToastCtx);
}

export default function DailyStreak() {
  const [streak, setStreak] = useState(null);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const todayStr = new Date().toISOString().slice(0, 10);
        const loginKey = "pg_streak_today";
        try {
          if (localStorage.getItem(loginKey) !== todayStr) {
            await supabase.from("vault_events").insert({ user_id: user.id, event_type: "daily_login" });
            localStorage.setItem(loginKey, todayStr);
          }
        } catch {}
        const { data } = await supabase
          .from("vault_events")
          .select("created_at")
          .eq("user_id", user.id)
          .eq("event_type", "daily_login")
          .order("created_at", { ascending: false })
          .limit(60);
        if (!data?.length) {
          setStreak(0);
          return;
        }
        let nextStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = [...new Set(data.map((entry) => new Date(entry.created_at).toISOString().split("T")[0]))];
        for (let index = 0; index < days.length; index += 1) {
          const date = new Date(days[index]);
          date.setHours(0, 0, 0, 0);
          const diff = Math.round((today - date) / (1000 * 60 * 60 * 24));
          if (diff === index || (index === 0 && diff === 1)) nextStreak += 1;
          else break;
        }
        setStreak(nextStreak);
        try {
          const milestonesKey = "pg_streak_milestones";
          const milestones = JSON.parse(localStorage.getItem(milestonesKey) || "[]");
          const eligible = DAILY_STREAK_COPY.messages.filter(([days]) => nextStreak >= days && !milestones.includes(String(days)));
          if (eligible.length) {
            await Promise.all(eligible.map(([days, points]) => supabase.rpc("award_vault_points", { p_user_id: user.id, p_points: points, p_event_type: `streak_milestone_${days}` })));
            for (const [days,, message] of eligible) {
              milestones.push(String(days));
              if (toast) toast(message, K.yl);
            }
            localStorage.setItem(milestonesKey, JSON.stringify(milestones));
          }
        } catch {}
      } catch {}
    })();
  }, [toast]);

  if (streak === null || streak === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: `${K.yl}15`, borderRadius: 50, border: `1px solid ${K.yl}30` }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: K.yl }}>{streak} {DAILY_STREAK_COPY.label}</span>
    </div>
  );
}
