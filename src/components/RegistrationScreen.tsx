import React, { useState, useRef } from "react";
import {
  sendVerificationCode,
  generateCode,
  generateTrialKey,
  activateLicense,
  getMachineId,
  notifyAdmin,
} from "../lib/license";

interface Props {
  onRegistered: () => void;
  onHasKey: () => void;
}

export default function RegistrationScreen({ onRegistered, onHasKey }: Props) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [orgNr, setOrgNr] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [msgColor, setMsgColor] = useState("var(--text-muted)");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [code, setCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const doRegister = async () => {
    if (!name.trim()) {
      setMsg("Fyll i ditt namn.");
      setMsgColor("var(--danger)");
      return;
    }
    if (!address.trim()) {
      setMsg("Fyll i din adress.");
      setMsgColor("var(--danger)");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setMsg("Fyll i en giltig e-postadress.");
      setMsgColor("var(--danger)");
      return;
    }

    setLoading(true);
    setMsg("Skickar verifieringskod...");
    setMsgColor("var(--text-muted)");

    const newCode = generateCode();
    setCode(newCode);
    const sent = await sendVerificationCode(email.trim(), newCode, name.trim());

    if (!sent) {
      setMsg("Kunde inte na servern. Kontakta support@liljedahladvisory.se");
      setMsgColor("var(--danger)");
      setLoading(false);
      return;
    }

    setStep("verify");
    setMsg("");
    setLoading(false);
    setTimeout(() => codeRef.current?.focus(), 100);
  };

  const doVerify = async () => {
    if (codeInput.trim() !== code) {
      setMsg("Fel kod. Forsok igen.");
      setMsgColor("var(--danger)");
      setCodeInput("");
      return;
    }

    setLoading(true);
    setMsg("Registrerar...");
    setMsgColor("var(--text-muted)");

    try {
      // Generate 12-month license
      const key = await generateTrialKey(
        name.trim(),
        email.trim(),
        company.trim(),
        365
      );
      const result = await activateLicense(key);
      if (!result.valid) {
        setMsg(result.message);
        setMsgColor("var(--danger)");
        setLoading(false);
        return;
      }

      // Notify admin in background
      const machineId = await getMachineId();
      const today = new Date().toISOString().split("T")[0];
      const expiresDate = new Date(Date.now() + 365 * 86400000)
        .toISOString()
        .split("T")[0];

      notifyAdmin({
        name: name.trim(),
        company: company.trim(),
        address: address.trim(),
        org_nr: orgNr.trim(),
        email: email.trim(),
        registered: today,
        license_expires: expiresDate,
        machine_id: machineId,
      });

      setMsg("Registrering lyckades! Valkomnen!");
      setMsgColor("var(--success)");
      setTimeout(onRegistered, 1500);
    } catch (err) {
      setMsg("Registrering misslyckades. Forsok igen.");
      setMsgColor("var(--danger)");
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-muted)",
    marginBottom: "4px",
    display: "block",
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

        {step === "form" && (
          <>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginBottom: "16px",
              }}
            >
              Registrera dig for att aktivera din licens:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={labelStyle}>Namn *</label>
                <input
                  style={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Foretagsnamn</label>
                <input
                  style={inputStyle}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Adress *</label>
                <input
                  style={inputStyle}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Organisationsnummer</label>
                <input
                  style={inputStyle}
                  value={orgNr}
                  onChange={(e) => setOrgNr(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>E-postadress *</label>
                <input
                  style={inputStyle}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doRegister()}
                />
              </div>
            </div>

            {msg && (
              <p style={{ fontSize: "13px", color: msgColor, marginTop: "12px" }}>
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
                onClick={doRegister}
                disabled={loading}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  padding: "10px 24px",
                }}
              >
                Registrera & starta
              </button>
              <button
                onClick={onHasKey}
                style={{
                  background: "transparent",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  padding: "10px 20px",
                }}
              >
                Jag har en nyckel
              </button>
            </div>
          </>
        )}

        {step === "verify" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>
              Verifiera din e-postadress
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginBottom: "20px",
              }}
            >
              Vi har skickat en 4-siffrig kod till
              <br />
              <strong>{email}</strong>
            </p>
            <input
              ref={codeRef}
              style={{
                ...inputStyle,
                width: "140px",
                textAlign: "center",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "8px",
                margin: "0 auto",
                display: "block",
              }}
              maxLength={4}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && doVerify()}
            />

            {msg && (
              <p style={{ fontSize: "13px", color: msgColor, marginTop: "12px" }}>
                {msg}
              </p>
            )}

            <button
              onClick={doVerify}
              disabled={loading || codeInput.length !== 4}
              style={{
                background: "var(--accent)",
                color: "#fff",
                padding: "10px 24px",
                marginTop: "20px",
              }}
            >
              Verifiera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
