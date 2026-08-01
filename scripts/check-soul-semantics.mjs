import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
const app = read("src/App.jsx");
const sync = read("src/sync.js");
const authSession = read("src/app/usePromoAuthSession.js");
const ledger = read("src/components/Ledger.jsx");
const missions = read("src/lib/missions.js");
const mastery = read("src/lib/mastery.js");
const weekly = read("src/app/DashboardActionWidgets.jsx");
const review = read("src/components/ProfitCertificate.jsx");
const board = read("src/components/dashboard/CommunityWinsWall.jsx");
const passport = read("src/lib/operatorPassport.js") + read("public/passport/index.html");
const failures = [];

const activityAwardSurface = [app, sync, authSession, ledger].join("\n");
if (/award_vault_points|onDailyLogin|onCalculation|onLedgerEntry|daily_login/.test(activityAwardSurface)) failures.push("login/calculation/ledger activity awards remain reachable");
if (/\bxp\b/i.test(missions)) failures.push("daily missions still assign XP/activity points");
if (!mastery.includes("feedback.filter(isReviewedDecision)") || !mastery.includes("REVIEW_DEPTH_BANDS")) failures.push("review depth is not derived from closed decision evidence");
if (/min:\s*\d+|totalProfit\s*>=|ledger.*0\.5|positive profit/i.test(mastery)) failures.push("mastery still advances from profit or ledger activity");
if (/WeeklyGrindReport|winRate|Current streak|wins\n|STREAK/.test(weekly)) failures.push("weekly report retains win-rate/streak reinforcement");
if (!weekly.includes("Weekly Decision Review") || !weekly.includes("Review coverage")) failures.push("weekly decision-review replacement missing");
if (/Verified by PromoGrind|Profit Certificate|Wins Wall|wins_wall|supabase\.from/.test(review + board)) failures.push("outcome cards retain certificate/community verification claims");
if (!review.includes("self-reported") || !review.includes("not independently verified") || !board.includes("self-reported-local")) failures.push("self-report qualification missing");
if (/\bxp\b/i.test(passport) || /globalRank/.test(passport)) failures.push("operator passport still exports XP/global-rank semantics");
if (!passport.includes("reviewDepthBand") || !passport.includes("reviews")) failures.push("passport review-depth schema missing");

if (failures.length) {
  console.error("SOUL semantic contract FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("SOUL semantic contract: evidence reviews over activity points, profit ranks, win streaks, and unverifiable certificates.");
