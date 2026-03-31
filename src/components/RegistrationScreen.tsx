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
  const [vatNr, setVatNr] = useState("");
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
      setMsg("Please enter your name.");
      setMsgColor("var(--danger)");
      return;
    }
    if (!address.trim()) {
      setMsg("Please enter your address.");
      setMsgColor("var(--danger)");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setMsg("Please enter a valid email address.");
      setMsgColor("var(--danger)");
      return;
    }

    setLoading(true);
    setMsg("Sending verification code...");
    setMsgColor("var(--text-muted)");

    const newCode = generateCode();
    setCode(newCode);
    const sent = await sendVerificationCode(email.trim(), newCode, name.trim());

    if (!sent) {
      setMsg("Could not reach the server. Contact support@liljedahladvisory.se");
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
      setMsg("Incorrect code. Please try again.");
      setMsgColor("var(--danger)");
      setCodeInput("");
      return;
    }

    setLoading(true);
    setMsg("Registering...");
    setMsgColor("var(--text-muted)");

    try {
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
        vat_nr: vatNr.trim(),
        email: email.trim(),
        registered: today,
        license_expires: expiresDate,
        machine_id: machineId,
      });

      setMsg("Registration successful! Welcome!");
      setMsgColor("var(--success)");
      setTimeout(onRegistered, 1500);
    } catch {
      setMsg("Registration failed. Please try again.");
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
          maxHeight: "90vh",
          overflowY: "auto",
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
            color: "#ff8c00",
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
              Register to activate your license:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  style={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Company name</label>
                <input
                  style={inputStyle}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Address *</label>
                <input
                  style={inputStyle}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Org. number (Swedish companies)</label>
                  <input
                    style={inputStyle}
                    value={orgNr}
                    onChange={(e) => setOrgNr(e.target.value)}
                    placeholder="XXXXXX-XXXX"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>VAT number (non-Swedish companies)</label>
                  <input
                    style={inputStyle}
                    value={vatNr}
                    onChange={(e) => setVatNr(e.target.value)}
                    placeholder="e.g. DE123456789"
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email address *</label>
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
                  background: "#ff8c00",
                  color: "#fff",
                  padding: "10px 24px",
                }}
              >
                Register & start
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
                I have a key
              </button>
            </div>
          </>
        )}

        {step === "verify" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>
              Verify your email address
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginBottom: "20px",
              }}
            >
              We have sent a 4-digit code to
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
                background: "#ff8c00",
                color: "#fff",
                padding: "10px 24px",
                marginTop: "20px",
              }}
            >
              Verify
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
