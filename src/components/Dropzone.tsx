import React from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { T } from "../lib/i18n";

interface DropzoneProps {
  onPathsAdded: (paths: string[]) => void;
  isDragOver?: boolean;
}

export default function Dropzone({ onPathsAdded, isDragOver = false }: DropzoneProps) {
  const handleClick = async () => {
    const result = await open({
      multiple: true,
      filters: [
        {
          name: "Dokument",
          extensions: ["pdf", "docx", "doc", "xlsx", "xls"],
        },
      ],
    });
    if (!result) return;
    const paths = Array.isArray(result) ? result : [result];
    if (paths.length > 0) onPathsAdded(paths);
  };

  return (
    <div
      onClick={handleClick}
      className={isDragOver ? "dropzone-pulse" : ""}
      style={{
        border: `2px dashed ${isDragOver ? "#ff8c00" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "24px 16px",
        textAlign: "center",
        cursor: "pointer",
        background: isDragOver ? "rgba(255, 140, 0, 0.12)" : "transparent",
        transition: "all 0.2s",
      }}
    >
      <div style={{ fontSize: "28px", marginBottom: "8px" }}>+</div>
      <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
        {T("drop_hint")}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          marginTop: "4px",
          opacity: 0.7,
        }}
      >
        {T("drop_hint_formats")}
      </div>
    </div>
  );
}
