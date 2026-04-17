import React, { useState, useEffect } from "react";
import { K, font, fontD } from "../lib/shared.js";
import { supabase } from "../auth.js";
import { FEATURE_FLAGS } from "../launchState.js";
import { invalidateFlagCache } from "../lib/featureFlags.js";

const TIER_OPTIONS = [null, "free", "scout", "runner", "closer", "house"];
const TIER_LABELS = { null: "All tiers", free: "Free+", scout: "Scout+", runner: "Runner+", closer: "Closer+", house: "House only" };

export default function FeatureFlagAdmin({ proStatus }) {
  const isHouse = proStatus?.plan === "house";
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (!isHouse) return;
    supabase.from("feature_flags").select("*").order("key").then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        // Merge with build-time flags for completeness
        const remoteKeys = new Set(data.map((r) => r.key));
        const buildOnlyFlags = Object.keys(FEATURE_FLAGS)
          .filter((k) => !remoteKeys.has(k))
          .map((k) => ({ key: k, enabled: FEATURE_FLAGS[k], min_tier: null, cohort: [], note: "(build-time only)" }));
        setFlags([...data, ...buildOnlyFlags]);
      }
      setLoading(false);
    });
  }, [isHouse]);

  const save = async (key, patch) => {
    setSaving(key);
    setSaveMsg("");
    const { error } = await supabase.from("feature_flags").upsert(
      { key, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (!error) {
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, ...patch } : f));
      invalidateFlagCache();
      setSaveMsg(`${key} saved.`);
      setTimeout(() => setSaveMsg(""), 2000);
    }
    setSaving(null);
  };

  if (!isHouse) {
    return (
      <div style={{ padding: 24, color: K.mt, fontSize: 12 }}>
        Feature flag admin requires House tier.
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 24, color: K.mt, fontSize: 12 }}>Loading flags…</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontFamily: fontD, fontSize: 16, fontWeight: 700, color: K.tx, marginBottom: 6 }}>
        Feature Flag Admin
      </div>
      <div style={{ fontSize: 11, color: K.mt, marginBottom: 16 }}>
        Server-controlled feature toggles. Changes take effect within 5 minutes (client cache TTL).
      </div>

      {saveMsg && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: `${K.gn}15`, border: `1px solid ${K.gn}30`, borderRadius: 6, fontSize: 11, color: K.gn }}>
          ✓ {saveMsg}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {flags.map((flag) => (
          <div key={flag.key} style={{
            padding: "12px 14px", background: K.s2, border: `1px solid ${flag.enabled ? K.gn + "40" : K.bd}`,
            borderRadius: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            {/* Key + note */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: K.tx, fontFamily: "monospace" }}>{flag.key}</div>
              {flag.note && <div style={{ fontSize: 10, color: K.mt, marginTop: 2 }}>{flag.note}</div>}
            </div>

            {/* Enabled toggle */}
            <button
              onClick={() => save(flag.key, { enabled: !flag.enabled })}
              disabled={saving === flag.key}
              style={{
                padding: "4px 12px", borderRadius: 20, cursor: saving === flag.key ? "not-allowed" : "pointer",
                background: flag.enabled ? `${K.gn}20` : `${K.rd}15`,
                border: `1px solid ${flag.enabled ? K.gn : K.rd}40`,
                color: flag.enabled ? K.gn : K.rd, fontSize: 11, fontWeight: 700, fontFamily: font,
                opacity: saving === flag.key ? 0.6 : 1,
              }}
            >
              {flag.enabled ? "ON" : "OFF"}
            </button>

            {/* Min tier selector */}
            <select
              value={flag.min_tier ?? ""}
              onChange={(e) => save(flag.key, { min_tier: e.target.value || null })}
              style={{
                padding: "4px 8px", background: K.s3, border: `1px solid ${K.bd2}`, borderRadius: 6,
                color: K.dm, fontSize: 11, fontFamily: font, cursor: "pointer",
              }}
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t ?? ""} value={t ?? ""}>{TIER_LABELS[t]}</option>
              ))}
            </select>

            {/* Build-time default indicator */}
            <div style={{ fontSize: 9, color: K.dm, minWidth: 60 }}>
              build: {FEATURE_FLAGS[flag.key] ? "on" : "off"}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 10, color: K.mt }}>
        Changes are written to the <code>feature_flags</code> Supabase table and override build-time env vars.
        Apply <code>scripts/migration-feature-flags.sql</code> to create the table if not yet done.
      </div>
    </div>
  );
}
