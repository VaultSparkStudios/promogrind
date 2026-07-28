import assert from "node:assert/strict";
import { scanContent } from "./scan-secrets.mjs";

const checksum = ["ABCD", "efgh", "IJKL", "mnop", "QRST", "uvwx", "YZ01", "2345"].join("");
const lockLine = `    "integrity": "sha512-${checksum}=="`;
assert.deepEqual(scanContent("deno.lock", `{\n${lockLine}\n}\n`), []);
assert.deepEqual(scanContent("package-lock.json", `{\n${lockLine}\n}\n`), []);

const credentialLine = ["DATABASE_PASSWORD", "=", "definitely-not-a-checksum-secret"].join("");
assert.ok(scanContent("deploy.env", credentialLine).length > 0);

console.log("Secret scanner lockfile regression passed (integrity digests ignored; credential assignments still detected).");
