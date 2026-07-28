import React from "react";
import { K, font } from "../lib/shared.js";

export default function AccessibleToggle({
  checked,
  onChange,
  label,
  disabled = false,
  accent = K.gn,
  compact = false,
}) {
  const active = checked === true;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!active)}
      style={{
        width: compact ? 34 : 40,
        height: compact ? 20 : 22,
        padding: 2,
        borderRadius: 999,
        border: `1px solid ${active ? accent : K.bd2}`,
        background: active ? `${accent}35` : K.s2,
        cursor: disabled ? "wait" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: active ? "flex-end" : "flex-start",
        transition: "background 160ms ease, border-color 160ms ease",
        flexShrink: 0,
        fontFamily: font,
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: compact ? 14 : 16,
          height: compact ? 14 : 16,
          borderRadius: "50%",
          background: active ? accent : K.dm,
          boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
          transition: "transform 160ms ease",
        }}
      />
    </button>
  );
}
