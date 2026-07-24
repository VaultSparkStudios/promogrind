import { describe, expect, it } from "vitest";
import { collectStaticManifestKeys, evaluateBundleBudget } from "../../scripts/lib/bundle-budget.mjs";

const manifest = {
  "index.html": { file: "assets/index.js", isEntry: true, imports: ["src/App.jsx"] },
  "src/App.jsx": { file: "assets/app.js", imports: ["_vendor.js"] },
  "_vendor.js": { file: "assets/vendor.js" },
  "src/Lazy.jsx": { file: "assets/lazy.js", isDynamicEntry: true },
};
const assets = [
  { file: "assets/index.js", rawBytes: 10, gzipBytes: 5 },
  { file: "assets/app.js", rawBytes: 20, gzipBytes: 10 },
  { file: "assets/vendor.js", rawBytes: 30, gzipBytes: 15 },
  { file: "assets/lazy.js", rawBytes: 90, gzipBytes: 40 },
];

describe("bundle graph budget", () => {
  it("walks transitive static imports without charging lazy entries to initial load", () => {
    expect(collectStaticManifestKeys(manifest).staticKeys).toEqual(["index.html", "src/App.jsx", "_vendor.js"]);
    const result = evaluateBundleBudget({ manifest, assets, budgets: { initialRawBytes: 60, initialGzipBytes: 30, asyncRawBytes: 100, asyncGzipBytes: 50 } });
    expect(result.pass).toBe(true);
    expect(result.measurements.initialRawBytes).toBe(60);
    expect(result.measurements.largestAsync.file).toBe("assets/lazy.js");
  });

  it("fails independently on initial graph and lazy chunk regressions", () => {
    const result = evaluateBundleBudget({ manifest, assets, budgets: { initialRawBytes: 59, initialGzipBytes: 29, asyncRawBytes: 89, asyncGzipBytes: 39 } });
    expect(result.failures).toEqual(["initialRawBytes", "initialGzipBytes", "asyncRawBytes", "asyncGzipBytes"]);
  });
});
