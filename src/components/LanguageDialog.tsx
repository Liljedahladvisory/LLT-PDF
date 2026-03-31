import React from "react";

interface Props {
  onSelect: (lang: "sv" | "en") => void;
}

export default function LanguageDialog({ onSelect }: Props) {
  const btnStyle = (hover: boolean): React.CSSProperties => ({
    display: "block",
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: 600,
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: hover ? "var(--surface-hover)" : "var(--surface)",
    color: "var(--text)",
    cursor: "pointer",
    textAlign: "center",
    transition: "background 0.15s",
  });

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "12px",
          padding: "40px",
          width: "380px",
          border: "1px solid var(--border)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>
          LLT PDF
        </h1>
        <p
          style={{
            fontSize: "12px",
            color: "#ff8c00",
            fontStyle: "italic",
            marginBottom: "24px",
          }}
        >
          Powered by Liljedahl Legal Tech
        </p>
        <div
          style={{
            height: "1px",
            background: "var(--border)",
            marginBottom: "24px",
          }}
        />

        <p
          style={{
            fontSize: "15px",
            marginBottom: "24px",
            color: "var(--text)",
          }}
        >
          Select language / Valj sprak
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button style={btnStyle(false)} onClick={() => onSelect("sv")}>
            Svenska
          </button>
          <button style={btnStyle(false)} onClick={() => onSelect("en")}>
            English
          </button>
        </div>
      </div>
    </div>
  );
}
