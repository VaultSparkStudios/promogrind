import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const appPath = path.join(process.cwd(), "src", "App.jsx");
const appSource = fs.readFileSync(appPath, "utf8");
const appLazyPath = path.join(process.cwd(), "src", "app", "appLazyComponents.js");
const ownershipSource = appSource + "\n" + fs.readFileSync(appLazyPath, "utf8");

describe("App.jsx composition boundary", () => {
  it("keeps extracted shell helpers out of the monolith", () => {
    expect(appSource).not.toMatch(/const QuickCalcPanel\s*=/);
    expect(appSource).not.toMatch(/const CalcSearch\s*=/);
    expect(appSource).not.toMatch(/const MobileBottomNav\s*=/);
    expect(appSource).not.toMatch(/const CSVImportModal\s*=/);
    expect(appSource).not.toMatch(/const StateLegalAlert\s*=/);
    expect(appSource).not.toMatch(/const DailyDashboard\s*=\s*\(\{/);
    expect(ownershipSource).toContain("../components/dashboard/DailyDashboard.jsx");
    expect(appSource).not.toMatch(/const IncomeEstimator\s*=/);
    expect(appSource).not.toMatch(/const RolloverCalc\s*=/);
    expect(appSource).not.toMatch(/const OddsConvert\s*=/);
    expect(appSource).not.toMatch(/const MiddleBet\s*=/);
    expect(appSource).not.toMatch(/const BetTracker\s*=/);
    expect(appSource).not.toMatch(/const PromoFinder\s*=/);
    expect(appSource).not.toMatch(/const OddsComparisonTable\s*=/);
    expect(appSource).not.toMatch(/const PromoJournal\s*=/);
    expect(appSource).not.toMatch(/const FreeBetArbTracker\s*=/);
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
    expect(appSource).not.toMatch(/const PromoAlertPrefs\s*=/);
    expect(appSource).not.toMatch(/const PromoROITable\s*=/);
    expect(appSource).not.toMatch(/const PromoCalendar\s*=\s*\(\)\s*=>/);
    expect(appSource).not.toMatch(/const ReferralHub\s*=\s*\(\)\s*=>/);
    expect(appSource).not.toMatch(/const CompetitorComparison\s*=\s*\(\)\s*=>/);
    expect(appSource).not.toMatch(/const TeamAccounts\s*=\s*\(\)\s*=>/);
    expect(appSource).not.toMatch(/const QuickAddBet\s*=/);
    expect(appSource).not.toMatch(/const WeeklyGrindReport\s*=/);
    expect(appSource).not.toMatch(/const BankrollWizard\s*=/);
    expect(appSource).not.toMatch(/const CopyMySetup\s*=/);
    expect(appSource).not.toMatch(/const PushEnableBtn\s*=/);
    expect(appSource).not.toMatch(/const OnboardingWizard\s*=/);
    expect(appSource).not.toMatch(/const DepositOptimizer\s*=/);
    expect(appSource).not.toMatch(/const HedgeValidator\s*=/);
    expect(appSource).not.toMatch(/const PromoGuarantee\s*=/);
    expect(appSource).not.toMatch(/const GutCheck\s*=/);
    expect(appSource).not.toMatch(/const PromoArbFinder\s*=/);
    expect(appSource).toContain("./calculators/PromoDecisionCalculators.jsx");
  });

  it("keeps the App monolith under the current decomposition ceiling", () => {
    expect(appSource.split(/\r\n|\n|\r/).length).toBeLessThan(900);
  });
});
