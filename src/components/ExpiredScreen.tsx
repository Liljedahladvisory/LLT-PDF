import React from "react";
import { T } from "../lib/i18n";

interface Props {
  message: string;
  onEnterKey: () => void;
}

export default function ExpiredScreen({ message, onEnterKey }: Props) {
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
          width: "460px",
          border: "1px solid var(--border)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>LLT PDF</h1>
        <p style={{ fontSize: "12px", color: "var(--accent)", fontStyle: "italic", marginBottom: "24px" }}>
          Powered by Liljedahl Legal Tech
        </p>
        <div style={{ height: "1px", background: "var(--border)", marginBottom: "24px" }} />

        <p style={{ fontSize: "14px", color: "var(--danger)", marginBottom: "20px", lineHeight: 1.5 }}>
          {message}
        </p>

        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
          {T("contact_renewal")}
        </p>

        <button
          onClick={onEnterKey}
          style={{ background: "var(--accent)", color: "#fff", padding: "10px 24px" }}
        >
          {T("enter_new_key")}
        </button>
      </div>
    </div>
  );
}
