import React from "react";
import { K, font, downloadFile } from "../../lib/shared.js";
import {
  buildLocalDataExport,
  clearLocalPromoGrindData,
  describeDataControlState,
  importLocalDataExport,
} from "../../lib/dataControls.js";

export default function DataControlsSection() {
  const [state, setState] = React.useState(() => describeDataControlState());
  const [message, setMessage] = React.useState("");
  const [restoreOpen, setRestoreOpen] = React.useState(false);
  const [restoreText, setRestoreText] = React.useState("");

  const refresh = () => setState(describeDataControlState());
  const restorePreview = React.useMemo(
    () => (restoreText.trim() ? importLocalDataExport(restoreText, { dryRun: true }) : null),
    [restoreText],
  );

  function handleRestore(mode) {
    const result = importLocalDataExport(restoreText, { mode });
    refresh();
    if (result.valid) {
      setMessage(`Restored ${result.restored.length} item${result.restored.length === 1 ? "" : "s"}${mode === "replace" ? ` (replaced ${result.cleared.length})` : ""}. Reload to apply everywhere.`);
      setRestoreOpen(false);
      setRestoreText("");
    } else {
      setMessage(result.errors[0] || "Restore failed.");
    }
  }

  function handleExport() {
    const payload = buildLocalDataExport();
    try {
      const text = JSON.stringify(payload, null, 2);
      const stamp = payload.generatedAt.slice(0, 10);
      let saved = false;
      try {
        downloadFile(text, `promogrind-export-${stamp}.json`, "application/json");
        saved = true;
      } catch {}
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
        setMessage(`Export ${saved ? "downloaded + copied" : "copied"}: ${payload.summary.itemCount} item${payload.summary.itemCount === 1 ? "" : "s"}.`);
      } else {
        setMessage(`Export ${saved ? "downloaded" : "ready"}: ${payload.summary.itemCount} item${payload.summary.itemCount === 1 ? "" : "s"}.`);
      }
    } catch {
      setMessage("Export unavailable in this browser.");
    }
  }

  function handleClear() {
    const confirmed = window.confirm("Clear local PromoGrind operator data on this device? Preferences stay in place.");
    if (!confirmed) return;
    const result = clearLocalPromoGrindData(undefined, { includePreferences: false });
    refresh();
    setMessage(`Cleared ${result.cleared.length} item${result.cleared.length === 1 ? "" : "s"}; kept preferences.`);
  }

  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${K.bd}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: K.dm, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>
        Data Controls
      </div>
      <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5, marginBottom: 10 }}>
        {state.label} · {state.totalBytes} bytes on this device
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleExport}
          disabled={!state.hasData}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 6, cursor: state.hasData ? 'pointer' : 'not-allowed',
            background: state.hasData ? `${K.ac}12` : K.s2,
            border: `1px solid ${state.hasData ? K.ac + '40' : K.bd}`,
            color: state.hasData ? K.ac : K.mt, fontSize: 10, fontWeight: 700, fontFamily: font,
          }}
        >
          Export
        </button>
        <button
          onClick={() => { setRestoreOpen((open) => !open); setMessage(""); }}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 6, cursor: 'pointer',
            background: restoreOpen ? `${K.gn}12` : K.s2,
            border: `1px solid ${restoreOpen ? K.gn + '40' : K.bd}`,
            color: restoreOpen ? K.gn : K.dm, fontSize: 10, fontWeight: 700, fontFamily: font,
          }}
        >
          Restore
        </button>
        <button
          onClick={handleClear}
          disabled={!state.hasData}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 6, cursor: state.hasData ? 'pointer' : 'not-allowed',
            background: state.hasData ? `${K.rd}10` : K.s2,
            border: `1px solid ${state.hasData ? K.rd + '35' : K.bd}`,
            color: state.hasData ? K.rd : K.mt, fontSize: 10, fontWeight: 700, fontFamily: font,
          }}
        >
          Clear Local
        </button>
      </div>
      {restoreOpen && (
        <div style={{ marginTop: 10 }}>
          <textarea
            value={restoreText}
            onChange={(event) => setRestoreText(event.target.value)}
            placeholder='Paste a PromoGrind export ({"product":"PromoGrind","type":"local-data-export",...})'
            aria-label="Paste PromoGrind export JSON"
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 6, resize: 'vertical',
              background: K.s2, border: `1px solid ${K.bd}`, color: K.tx, fontSize: 10, fontFamily: font,
            }}
          />
          {restorePreview && (
            <div style={{ fontSize: 9, color: restorePreview.valid ? K.dm : K.rd, lineHeight: 1.6, marginTop: 6 }} role="status">
              {restorePreview.valid
                ? `Ready: ${restorePreview.preview.length} item${restorePreview.preview.length === 1 ? "" : "s"} (${restorePreview.preview.filter((p) => p.action === "overwrite").length} overwrite) · schema v${restorePreview.schemaVersion}`
                : restorePreview.errors[0]}
            </div>
          )}
          {restorePreview?.valid && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => handleRestore("merge")}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer',
                  background: `${K.gn}12`, border: `1px solid ${K.gn}40`,
                  color: K.gn, fontSize: 10, fontWeight: 700, fontFamily: font,
                }}
              >
                Merge Into This Device
              </button>
              <button
                onClick={() => { if (window.confirm("Replace ALL local PromoGrind data with this export?")) handleRestore("replace"); }}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer',
                  background: `${K.yl}10`, border: `1px solid ${K.yl}35`,
                  color: K.yl, fontSize: 10, fontWeight: 700, fontFamily: font,
                }}
              >
                Replace Everything
              </button>
            </div>
          )}
        </div>
      )}
      {message && <div style={{ fontSize: 9, color: K.dm, marginTop: 8, lineHeight: 1.5 }}>{message}</div>}
    </div>
  );
}
