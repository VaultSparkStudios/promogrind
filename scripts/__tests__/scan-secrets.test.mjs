#!/usr/bin/env node

// Convention-discoverable entrypoint for the scanner's deterministic entropy,
// redaction, allowlist, and exit-code fixture suite.
await import("../test-scan-secrets.mjs");
