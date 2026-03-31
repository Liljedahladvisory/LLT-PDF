import React, { useState } from "react";
import { activateLicense } from "../lib/license";

interface Props {
  onActivated: () => void;
  onBack: () => void;
}

export default function ActivationScreen({ onActivated, onBack }: Props) {
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");
  const [msgColor, setMsgColor] = useState("var(--text-muted)");
  const [loading, setLoading] = useState(false);

  const doActivate = async () => {
    if (!key.trim()) {
      setMsg("Klistra in din licensnyckel.");
      setMsgColor("var(--danger)");
      return;
    }

    setLoading(true);
    setMsg("Aktiverar...");
    setMsgColor("var(--text-muted)");

    try {
      const result = await activateLicense(key.trim());
      if (result.valid) {
        setMsg(result.message);
        setMsgColor("var(--success)");
        setTimeout(onActivated, 1500);
      } else {
        setMsg(result.message);
        setMsgColor("var(--danger)");
      }
    } catch {
      setMsg("Aktivering misslyckades.");
      setMsgColor("var(--danger)");
    } finally {
      setLoading(false);
    }
  };

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
        }}
      >
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "4px",
          }}
        >
          LLT PDF
        </h1>
        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "var(--accent)",
            fontStyle: "italic",
            marginBottom: "20px",
          }}
        >
          Powered by Liljedahl Legal Tech
        </p>
        <div
          style={{
            height: "1px",
            background: "var(--border)",
            marginBottom: "20px",
          }}
        />

        <p
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            marginBottom: "12px",
          }}
        >
          Ange din licensnyckel for att aktivera appen:
        </p>

        <textarea
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="LLT.XXXX.XXXX.XXXX..."
          style={{
            width: "100%",
            height: "100px",
            padding: "10px",
            fontSize: "12px",
            fontFamily: "monospace",
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {msg && (
          <p style={{ fontSize: "13px", color: msgColor, marginTop: "10px" }}>
            {msg}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "20px",
          }}
        >
          <button
            onClick={doActivate}
            disabled={loading}
            style={{
              background: "var(--accent)",
              color: "#fff",
              padding: "10px 24px",
            }}
          >
            Aktivera
          </button>
          <button
            onClick={onBack}
            style={{
              background: "transparent",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              padding: "10px 20px",
            }}
          >
            Tillbaka
          </button>
        </div>
      </div>
    </div>
  );
}
