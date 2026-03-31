import React, { useEffect, useState } from "react";
import { checkLicense, checkRevocation, LicenseStatus } from "./lib/license";
import RegistrationScreen from "./components/RegistrationScreen";
import ActivationScreen from "./components/ActivationScreen";
import ExpiredScreen from "./components/ExpiredScreen";
import App from "./App";

type Screen = "loading" | "app" | "register" | "activate" | "expired";

export default function LicenseGate() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [expiredMsg, setExpiredMsg] = useState("");

  const doCheck = async () => {
    setScreen("loading");
    try {
      const status: LicenseStatus = await checkLicense();

      if (!status.valid) {
        // No license or invalid
        if (
          status.message.includes("Ingen licens") ||
          status.message.includes("lasa licensfil")
        ) {
          setScreen("register");
          return;
        }
        // Expired or other issue
        setExpiredMsg(status.message);

        // Check revocation if we have an email
        if (status.email) {
          const revoked = await checkRevocation(status.email);
          if (revoked) {
            setExpiredMsg(
              "Din licens har sparrats. Kontakta Liljedahl Legal Tech."
            );
          }
        }

        setScreen("expired");
        return;
      }

      // Valid license — check revocation
      if (status.email) {
        const revoked = await checkRevocation(status.email);
        if (revoked) {
          setExpiredMsg(
            "Din licens har sparrats. Kontakta Liljedahl Legal Tech."
          );
          setScreen("expired");
          return;
        }
      }

      setScreen("app");
    } catch {
      // If Tauri commands aren't available (e.g., dev in browser), show app
      setScreen("app");
    }
  };

  useEffect(() => {
    doCheck();
  }, []);

  if (screen === "loading") {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          color: "var(--text-muted)",
        }}
      >
        Laddar...
      </div>
    );
  }

  if (screen === "register") {
    return (
      <RegistrationScreen
        onRegistered={() => setScreen("app")}
        onHasKey={() => setScreen("activate")}
      />
    );
  }

  if (screen === "activate") {
    return (
      <ActivationScreen
        onActivated={() => setScreen("app")}
        onBack={() => setScreen("register")}
      />
    );
  }

  if (screen === "expired") {
    return (
      <ExpiredScreen
        message={expiredMsg}
        onEnterKey={() => setScreen("activate")}
      />
    );
  }

  return <App />;
}
