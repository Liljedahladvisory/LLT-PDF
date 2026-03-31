import React from "react";

interface ToolbarProps {
  activeTool: "select" | "mask" | "text";
  onToolChange: (tool: "select" | "mask" | "text") => void;
  onExport: () => void;
  canExport: boolean;
  onUndo: () => void;
  canUndo: boolean;
}

export default function Toolbar({
  activeTool,
  onToolChange,
  onExport,
  canExport,
  onUndo,
  canUndo,
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
        Markera
      </button>
      <button style={btnStyle("mask")} onClick={() => onToolChange("mask")}>
        Maskera
      </button>
      <button style={btnStyle("text")} onClick={() => onToolChange("text")}>
        Text
      </button>

      <div style={{ flex: 1 }} />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={{ background: "var(--surface)", color: "var(--text)", marginRight: "6px" }}
      >
        Angra
      </button>
      <button
        onClick={onExport}
        disabled={!canExport}
        style={{ background: "var(--success)", color: "#fff" }}
      >
        Exportera PDF
      </button>
    </div>
  );
}
