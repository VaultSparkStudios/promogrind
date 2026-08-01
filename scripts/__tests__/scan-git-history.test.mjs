#!/usr/bin/env node

// Convention-discoverable entrypoint for the adversarial temporary-repository
// suite. The implementation remains in the legacy root-level test so existing
// direct invocations keep working while innovation coverage can see it.
await import("../test-scan-git-history.mjs");
