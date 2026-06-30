import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const appPath = path.join(process.cwd(), "src", "App.jsx");
const appSource = fs.readFileSync(appPath, "utf8");

describe("App.jsx composition boundary", () => {
  it("keeps extracted shell helpers out of the monolith", () => {
    expect(appSource).not.toMatch(/const QuickCalcPanel\s*=/);
    expect(appSource).not.toMatch(/const CalcSearch\s*=/);
    expect(appSource).not.toMatch(/const MobileBottomNav\s*=/);
    expect(appSource).not.toMatch(/const CSVImportModal\s*=/);
    expect(appSource).not.toMatch(/const StateLegalAlert\s*=/);
    expect(appSource).not.toMatch(/const DailyRoutinePanel\s*=/);
    expect(appSource).not.toMatch(/const ProfitGoalTracker\s*=/);
    expect(appSource).not.toMatch(/const DailyBriefingBtn\s*=/);
    expect(appSource).not.toMatch(/const OpenExposurePanel\s*=/);
    expect(appSource).not.toMatch(/const TopToolsPanel\s*=/);
    expect(appSource).not.toMatch(/const Glossary\s*=/);
    expect(appSource).not.toMatch(/const GLOSSARY_TERMS\s*=/);
    expect(appSource).not.toMatch(/const FaqAccordion\s*=/);
    expect(appSource).not.toMatch(/const KB\s*=\s*\(\)/);
    expect(appSource).not.toMatch(/const ProfitCertificate\s*=\s*\(\)\s*=>\s*\{/);
    expect(appSource).not.toMatch(/const Leaderboard\s*=\s*\(\)\s*=>\s*\{/);
    expect(appSource).not.toMatch(/const DailyStreak\s*=\s*\(\)\s*=>\s*\{/);
  });

  it("keeps the App monolith under the current decomposition ceiling", () => {
    expect(appSource.split(/\r?\n/).length).toBeLessThan(3100);
  });
});




