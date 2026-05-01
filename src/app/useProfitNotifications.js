import { useEffect } from "react";
import { f } from "../lib/shared.js";

export function useProfitNotifications({ appData, authReady }) {
  useEffect(() => {
    if (!appData.ledger) return;
    const totalProfit = appData.ledger.reduce((sum, entry) => sum + (parseFloat(entry.profit) || 0), 0);
    const milestones = [100, 250, 500, 1000, 2500, 5000];
    try {
      const reached = JSON.parse(localStorage.getItem("pg_milestones_reached") || "[]");
      let updated = false;
      for (const milestone of milestones) {
        if (totalProfit >= milestone && !reached.includes(milestone)) {
          reached.push(milestone);
          updated = true;
          try {
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(`PromoGrind: $${milestone} milestone reached!`, {
                body: `You've extracted $${milestone}+ in total profit. Keep grinding!`,
                icon: "/promogrind/favicon.svg",
              });
            }
          } catch {}
        }
      }
      if (updated) localStorage.setItem("pg_milestones_reached", JSON.stringify(reached));
    } catch {}
  }, [appData.ledger]);

  useEffect(() => {
    if (!authReady || !appData.profitGoal) return;
    const goal = parseFloat(appData.profitGoal) || 0;
    if (!goal) return;
    const totalProfit = (appData.ledger || []).reduce((sum, entry) => sum + (parseFloat(entry.profit) || 0), 0);
    if (totalProfit < goal) return;

    try {
      const key = `pg_goal_notified_${goal}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("PromoGrind: Profit Goal Reached!", {
          body: `You hit your $${f(goal)} profit goal! Time to set a new one.`,
          icon: "/promogrind/favicon.svg",
        });
      }
    } catch {}
  }, [appData.ledger, appData.profitGoal, authReady]);
}
