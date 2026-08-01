import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

const SOURCES = [
  "src/lib/streaks.js",
  "src/lib/achievements.js",
  "src/components/DailyStreak.jsx",
  "src/components/dashboard/DashboardHero.jsx",
  "src/components/dashboard/DailyDashboard.jsx",
  "src/components/dashboard/DailyMissionsPanel.jsx",
];

describe("SOUL-aligned engagement contract", () => {
  it("does not ship profit-conditioned or casino-style reward copy", () => {
    const source = SOURCES.map(read).join("\n");
    const forbidden = [
      /Comeback Bonus/i,
      /2[×x] XP/i,
      /Active Bettor/i,
      /Five Figure Threat/i,
      /profit streak/i,
      /🔥/u,
      /Trial expires tomorrow/i,
      /Total profit extracted/i,
      /Log Profit/i,
    ];
    for (const pattern of forbidden) expect(source).not.toMatch(pattern);
  });

  it("never treats a visit, modeled profit, or outcome sign as cadence evidence", () => {
    const cadence = read("src/lib/streaks.js");
    const chrome = read("src/components/DailyStreak.jsx");
    const dashboard = read("src/components/dashboard/DailyDashboard.jsx");
    expect(cadence).not.toMatch(/expectedProfit/);
    expect(cadence).not.toMatch(/profit\s*>\s*0/);
    expect(chrome).not.toMatch(/supabase|daily_login|award_vault_points/);
    expect(dashboard).not.toMatch(/pg_login_dates|pg_upsell_streak/);
  });

  it("does not let clicking a review prompt fabricate completion evidence", () => {
    const panel = read("src/components/dashboard/DailyMissionsPanel.jsx");
    const handler = panel.match(/function handleComplete[\s\S]*?\n  }/)?.[0] || "";
    expect(handler).not.toMatch(/completeMission/);
    expect(panel).toMatch(/m\.eligible && !m\.completed/);
  });
});
