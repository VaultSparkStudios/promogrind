import assert from "node:assert/strict";
import fs from "node:fs";
import { buildPublicCapabilityContract } from "./lib/public-capability-contract.mjs";

const contract = buildPublicCapabilityContract();
const calculator = contract.capabilities.find((item) => item.id === "calculator-api");
assert.equal(calculator.availability, "available");
assert.equal(contract.callable_tools.length, 7, "criterion-complete live deployment must expose the seven calculator tools");
assert.equal(calculator.endpoints.length, 7);
assert.ok(calculator.endpoints.every((endpoint) => endpoint.slug && endpoint.path && endpoint.params));
assert.ok(contract.capabilities
  .filter((item) => item.id !== "calculator-api")
  .every((item) => item.availability === "unavailable"));

const agents = JSON.parse(fs.readFileSync("public/agents.json", "utf8"));
assert.equal(agents.capability_contract, "https://promogrind.bet/capabilities.json");
assert.deepEqual(agents.callable_tools, []);
assert.match(fs.readFileSync("public/.well-known/llms.txt", "utf8"), /capabilities\.json/);

console.log("Public agent capability contract passed (source parity, proven calculator tools, fail-closed feature truth).");
