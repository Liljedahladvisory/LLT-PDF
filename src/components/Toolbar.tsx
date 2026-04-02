import React from "react";
import { T } from "../lib/i18n";

interface ToolbarProps {
  activeTool: "select" | "mask" | "text";
  onToolChange: (tool: "select" | "mask" | "text") => void;
  onExport: () => void;
  canExport: boolean;
  onUndo: () => void;
  canUndo: boolean;
  onClear: () => void;
  canClear: boolean;
}

export default function Toolbar({
  activeTool,
  onToolChange,
  onExport,
  canExport,
  onUndo,
  canUndo,
  onClear,
  canClear,
}: ToolbarProps) {
  const btnStyle = (tool: string): React.CSSProperties => ({
    background: activeTool === tool ? "var(--accent)" : "var(--surface)",
    color: activeTool === tool ? "#fff" : "var(--text)",
    marginRight: "6px",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 16px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        gap: "4px",
      }}
    >
      <button style={btnStyle("select")} onClick={() => onToolChange("select")}>
        {T("select")}
      </button>
      <button style={btnStyle("mask")} onClick={() => onToolChange("mask")}>
        {T("mask")}
      </button>
      <button style={btnStyle("text")} onClick={() => onToolChange("text")}>
        {T("text")}
      </button>

      <div style={{ flex: 1, textAlign: "center" }}>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
          Powered by Liljedahl Legal Tech
        </span>
      </div>

      <button
        onClick={onClear}
        disabled={!canClear}
        style={{ background: "var(--surface)", color: "#e57373", marginRight: "6px" }}
      >
        {T("clear")}
      </button>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={{ background: "var(--surface)", color: "var(--text)", marginRight: "6px" }}
      >
        {T("undo")}
      </button>
      <button
        onClick={onExport}
        disabled={!canExport}
        style={{ background: "var(--success)", color: "#fff" }}
      >
        {T("export_pdf")}
      </button>
    </div>
  );
}
