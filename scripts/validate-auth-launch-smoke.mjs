import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function assertIncludes(text, needle, label, errors) {
  if (!text.includes(needle)) errors.push(`missing ${label}`);
}

function assertNotIncludes(text, needle, label, errors) {
  if (text.includes(needle)) errors.push(`still contains ${label}`);
}

const errors = [];

const auth = read("src/auth.js");
const dialog = read("src/components/AuthDialog.jsx");
const app = read("src/App.jsx");
const appSubcomponents = read("src/app/AppSubcomponents.jsx");
const launchState = read("src/launchState.js");
const appText = read("src/app/appText.js");
const userMenu = read("src/components/UserMenu.jsx");
const profilePanel = read("src/components/ProfilePanel.jsx");
const landing = read("public/landing/index.html");
const readme = read("README.md");
const terms = read("public/terms/index.html");
const privacy = read("public/privacy/index.html");
const dataPolicy = read("public/data-policy/index.html");
const proofs = JSON.parse(read("context/LAUNCH_PROOFS.json"));
const packageJson = JSON.parse(read("package.json"));

[
  ["resendPromoGrindConfirmation", "confirmation resend helper"],
  ["resetPromoGrindPassword", "password reset helper"],
  ["updatePromoGrindPassword", "password update helper"],
  ["resetPasswordForEmail", "Supabase reset-password call"],
  ["emailRedirectTo: getAuthRedirectUrl('signin')", "signup confirmation redirect"],
  ["redirectTo: getAuthRedirectUrl('update-password')", "password reset redirect"],
  ["'recovery'", "Supabase recovery hash session type"],
].forEach(([needle, label]) => assertIncludes(auth, needle, label, errors));

[
  ["Resend confirmation email", "resend confirmation button"],
  ["Forgot your password?", "forgot-password link"],
  ["Reset your password", "reset mode heading"],
  ["Choose a new password", "update-password heading"],
  ["Password reset email sent.", "reset email success copy"],
  ["Use at least 8 characters", "minimum password guard"],
].forEach(([needle, label]) => assertIncludes(dialog, needle, label, errors));

[
  ["hasRecoveryHash", "recovery hash mode detection"],
  ['"update-password"', "update-password auth mode routing"],
].forEach(([needle, label]) => assertIncludes(app, needle, label, errors));

assertIncludes(launchState, '"reset"', "reset auth query mode", errors);
assertIncludes(launchState, '"update-password"', "update-password auth query mode", errors);

[
  appText,
  dialog,
  app,
  userMenu,
  profilePanel,
  landing,
  readme,
  terms,
  privacy,
  dataPolicy,
].forEach((text, index) => {
  const surface = [
    "src/app/appText.js",
    "src/components/AuthDialog.jsx",
    "src/App.jsx",
    "src/components/UserMenu.jsx",
    "src/components/ProfilePanel.jsx",
    "public/landing/index.html",
    "README.md",
    "public/terms/index.html",
    "public/privacy/index.html",
    "public/data-policy/index.html",
  ][index];
  assertNotIncludes(text, "The same account works across all VaultSpark Studio tools", `${surface} overpromised cross-Studio account copy`, errors);
  assertNotIncludes(text, "sync across Studio tools", `${surface} Studio-tools sync promise`, errors);
  assertNotIncludes(text, "sync across Studio projects", `${surface} Studio-projects sync promise`, errors);
  assertNotIncludes(text, "Free Vault membership", `${surface} Vault membership claim`, errors);
  assertNotIncludes(text, "free Vault membership", `${surface} Vault membership claim`, errors);
  assertNotIncludes(text, "free Vault account", `${surface} Vault account claim`, errors);
  assertNotIncludes(text, "Vault account", `${surface} Vault account label`, errors);
  assertNotIncludes(text, "VaultSpark-backed account", `${surface} VaultSpark-backed account claim`, errors);
  assertNotIncludes(text, "connected VaultSpark tools", `${surface} connected VaultSpark tools claim`, errors);
});

assertIncludes(dialog, "This creates a PromoGrind account only. Studio membership is separate and not required.", "explicit PromoGrind-only signup copy", errors);
assertIncludes(appText, "PromoGrind accounts are separate from Studio membership", "footer account separation copy", errors);
assertIncludes(appSubcomponents, "Studio membership is separate and is not required to create or use a PromoGrind account.", "member welcome separation copy", errors);

const friendEvidence = proofs?.proofs?.friendBeta?.evidenceRequired || [];
for (const required of [
  "tester completed account creation or sign-in",
  "tester completed confirmation-email or password-reset recovery check",
]) {
  if (!friendEvidence.includes(required)) {
    errors.push(`context/LAUNCH_PROOFS.json friendBeta evidence missing: ${required}`);
  }
}


const authEmailProof = proofs?.proofs?.authEmailSmoke;
if (!authEmailProof) {
  errors.push("context/LAUNCH_PROOFS.json missing authEmailSmoke proof");
} else {
  if (authEmailProof.status !== "pending" && authEmailProof.status !== "complete") {
    errors.push("context/LAUNCH_PROOFS.json authEmailSmoke status must be pending or complete");
  }
  for (const required of [
    "confirmation email delivered",
    "confirmation resend verified",
    "forgot-password email delivered",
    "recovery link opens update-password UI",
    "new password sign-in succeeds",
  ]) {
    if (!(authEmailProof.evidenceRequired || []).includes(required)) {
      errors.push(`context/LAUNCH_PROOFS.json authEmailSmoke evidence missing: ${required}`);
    }
  }
}

if (packageJson?.scripts?.["smoke:auth-email"] !== "node scripts/run-auth-email-smoke.mjs") {
  errors.push("package.json missing smoke:auth-email runner script");
}

assertIncludes(read("scripts/run-auth-email-smoke.mjs"), "assertSafeEvidence", "auth email evidence safety guard", errors);
if (errors.length) {
  console.error("Auth launch smoke failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Auth launch smoke passed.");


