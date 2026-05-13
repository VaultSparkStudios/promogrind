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
const launchState = read("src/launchState.js");
const appText = read("src/app/appText.js");
const landing = read("public/landing/index.html");
const readme = read("README.md");
const proofs = JSON.parse(read("context/LAUNCH_PROOFS.json"));

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
  landing,
  readme,
].forEach((text, index) => {
  const surface = ["src/app/appText.js", "public/landing/index.html", "README.md"][index];
  assertNotIncludes(text, "The same account works across all VaultSpark Studio tools", `${surface} overpromised cross-Studio account copy`, errors);
  assertNotIncludes(text, "sync across Studio tools", `${surface} Studio-tools sync promise`, errors);
  assertNotIncludes(text, "sync across Studio projects", `${surface} Studio-projects sync promise`, errors);
});

const friendEvidence = proofs?.proofs?.friendBeta?.evidenceRequired || [];
for (const required of [
  "tester completed account creation or sign-in",
  "tester completed confirmation-email or password-reset recovery check",
]) {
  if (!friendEvidence.includes(required)) {
    errors.push(`context/LAUNCH_PROOFS.json friendBeta evidence missing: ${required}`);
  }
}

if (errors.length) {
  console.error("Auth launch smoke failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Auth launch smoke passed.");
