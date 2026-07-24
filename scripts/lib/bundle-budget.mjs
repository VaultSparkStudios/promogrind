export function collectStaticManifestKeys(manifest, entryKey = null) {
  const resolvedEntry = entryKey || Object.entries(manifest).find(([, item]) => item?.isEntry)?.[0];
  if (!resolvedEntry) throw new Error("Vite manifest has no application entry");
  const visited = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    const item = manifest[key];
    if (!item) throw new Error(`Vite manifest references missing static import: ${key}`);
    visited.add(key);
    for (const dependency of item.imports || []) visit(dependency);
  };
  visit(resolvedEntry);
  return { entryKey: resolvedEntry, staticKeys: [...visited] };
}

export function evaluateBundleBudget({ manifest, assets, budgets }) {
  const { entryKey, staticKeys } = collectStaticManifestKeys(manifest);
  const byFile = new Map(assets.map((asset) => [asset.file, asset]));
  const initial = staticKeys.map((key) => manifest[key]?.file).filter(Boolean).map((file) => {
    const asset = byFile.get(file);
    if (!asset) throw new Error(`Missing built asset declared by Vite manifest: ${file}`);
    return asset;
  });
  const initialNames = new Set(initial.map((asset) => asset.file));
  const asyncAssets = assets.filter((asset) => !initialNames.has(asset.file));
  const sum = (list, field) => list.reduce((total, item) => total + item[field], 0);
  const largestAsync = [...asyncAssets].sort((a, b) => b.rawBytes - a.rawBytes)[0] || null;
  const measurements = { entryKey, initialFiles: initial.map((asset) => asset.file), initialRawBytes: sum(initial, "rawBytes"), initialGzipBytes: sum(initial, "gzipBytes"), largestAsync };
  const failures = [];
  if (measurements.initialRawBytes > budgets.initialRawBytes) failures.push("initialRawBytes");
  if (measurements.initialGzipBytes > budgets.initialGzipBytes) failures.push("initialGzipBytes");
  if (largestAsync?.rawBytes > budgets.asyncRawBytes) failures.push("asyncRawBytes");
  if (largestAsync?.gzipBytes > budgets.asyncGzipBytes) failures.push("asyncGzipBytes");
  return { pass: failures.length === 0, failures, measurements };
}
