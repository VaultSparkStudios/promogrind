import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPassportPayload, exportPassport, PASSPORT_CONTRACT, verifyPassport } from "../lib/operatorPassport.js";

const appData = {
  bankroll: "1000",
  workflowInbox: [{ id: "w1" }],
  resultFeedback: [
    { status: "settled", profit: 12, promoType: "bonus_bet" },
    { status: "skipped", skipReason: "timing" },
  ],
  bets: [],
};

function encode(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function mintSelfAttestedToken(payload) {
  const payloadB64 = encode(new TextEncoder().encode(JSON.stringify(payload)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`promogrind-self-attested-passport-v2:${payloadB64}`));
  return `${payloadB64}.${encode(new Uint8Array(digest))}`;
}

describe("operator passport", () => {
  it("never leaks raw bet amounts or sportsbook account info", () => {
    const payload = buildPassportPayload({
      ...appData,
      bets: [{ stake: 999, book: "BetMGM", account: "secret-acct" }],
      pg_supabase_session: "tok",
    });
    const json = JSON.stringify(payload);
    expect(json).not.toMatch(/999/);
    expect(json).not.toMatch(/secret-acct/);
    expect(json).not.toMatch(/tok/);
  });

  it("roundtrips an explicitly self-attested checksum token", async () => {
    const token = await exportPassport(appData);
    const result = await verifyPassport(token);
    expect(result.ok).toBe(true);
    expect(result.attestation).toBe("self-attested");
    expect(result.integrity).toBe("checksum-verified");
    expect(result.payload.mastery.globalRank).toBe("Novice");
    expect(PASSPORT_CONTRACT.authenticity).toBe("not-independently-verified");
  });

  it("detects copy corruption", async () => {
    const token = await exportPassport(appData);
    const [payload, checksum] = token.split(".");
    const result = await verifyPassport(`${payload}A.${checksum}`);
    expect(result.ok).toBe(false);
    expect(["decode", "integrity"]).toContain(result.reason);
  });

  it("rejects a checksum-valid payload with an injected lane key", async () => {
    const payload = buildPassportPayload(appData, { now: new Date("2026-07-24T00:00:00Z") });
    payload.mastery.perType['<img src=x onerror="alert(1)">'] = { level: "Shark", xp: 99 };
    const token = await mintSelfAttestedToken(payload);
    await expect(verifyPassport(token)).resolves.toEqual({ ok: false, reason: "payload" });
  });

  it("fails legacy public-secret HMAC tokens closed", async () => {
    const legacyPayload = encode(new TextEncoder().encode(JSON.stringify({ v: 1 })));
    await expect(verifyPassport(`${legacyPayload}.legacy-signature`)).resolves.toEqual({ ok: false, reason: "legacy-unsupported" });
  });

  it("keeps the public verifier free of payload-driven innerHTML", () => {
    const publicVerifier = fs.readFileSync(path.resolve("public/passport/index.html"), "utf8");
    expect(publicVerifier).not.toMatch(/\.innerHTML\s*=/);
    expect(publicVerifier).toMatch(/textContent/);
    expect(publicVerifier).toMatch(/self-attested/i);
    expect(publicVerifier).toMatch(/does not prove identity/i);
  });
});
