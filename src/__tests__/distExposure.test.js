import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanDistDirectory } from "../../scripts/check-public-dist-exposure.mjs";

describe("public dist exposure gate", () => {
  it("passes clean browser assets", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-dist-clean-"));
    fs.writeFileSync(path.join(dir, "index.html"), "<div>PromoGrind</div>");
    fs.writeFileSync(path.join(dir, "app.js"), "console.log('launch proof status');");

    const result = scanDistDirectory(dir);

    expect(result.ok).toBe(true);
    expect(result.summary.total).toBe(0);
  });

  it("flags private markers and token-shaped output", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-dist-risk-"));
    fs.writeFileSync(
      path.join(dir, "app.js"),
      "const x='SUPABASE_SERVICE_ROLE_KEY'; const y='eyJaaaaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbb.cccccccccccccccccccccc';",
    );

    const result = scanDistDirectory(dir);

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.rule)).toEqual(expect.arrayContaining(["service_role_like", "jwt_like"]));
  });
});
