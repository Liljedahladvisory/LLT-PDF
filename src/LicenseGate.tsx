import React, { useEffect, useState } from "react";
import { checkLicense, checkRevocation, LicenseStatus } from "./lib/license";
import { setLanguage, T } from "./lib/i18n";
import RegistrationScreen from "./components/RegistrationScreen";
import ActivationScreen from "./components/ActivationScreen";
import ExpiredScreen from "./components/ExpiredScreen";
import LanguageDialog from "./components/LanguageDialog";
import App from "./App";

const CONFIG_KEY = "llt-pdf-config";

type Screen = "loading" | "app" | "register" | "activate" | "expired" | "language";

function loadConfig(): { lang?: string } {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveConfig(cfg: Record<string, string>) {
  const existing = loadConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...existing, ...cfg }));
}

export default function LicenseGate() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [expiredMsg, setExpiredMsg] = useState("");
  const [isFirstRun, setIsFirstRun] = useState(false);

  // Apply saved language on mount
  useEffect(() => {
    const cfg = loadConfig();
    if (cfg.lang) {
      setLanguage(cfg.lang);
    }
  }, []);

  const doCheck = async () => {
    setScreen("loading");
    try {
      const status: LicenseStatus = await checkLicense();

      if (!status.valid) {
        if (
          status.message.includes("Ingen licens") ||
          status.message.includes("lasa licensfil")
        ) {
          setIsFirstRun(true);
          setScreen("register");
          return;
        }
        setExpiredMsg(status.message);

        if (status.email) {
          const revoked = await checkRevocation(status.email);
          if (revoked) {
            setExpiredMsg(T("license_revoked"));
          }
        }

        setScreen("expired");
        return;
      }

      if (status.email) {
        const revoked = await checkRevocation(status.email);
        if (revoked) {
          setExpiredMsg(T("license_revoked"));
          setScreen("expired");
          return;
        }
      }

      // Check if language has been chosen
      const cfg = loadConfig();
      if (!cfg.lang) {
        setScreen("language");
        return;
      }

      setScreen("app");
    } catch {
      setScreen("app");
    }
  };

  useEffect(() => {
    doCheck();
  }, []);

  const handleRegistered = () => {
    // After registration, show language dialog
    setScreen("language");
  };

  const handleLanguageSelect = (lang: "sv" | "en") => {
    setLanguage(lang);
    saveConfig({ lang });
    setScreen("app");
  };

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
        {T("loading")}
      </div>
    );
  }

  if (screen === "register") {
    return (
      <RegistrationScreen
        onRegistered={handleRegistered}
        onHasKey={() => setScreen("activate")}
      />
    );
  }

  if (screen === "activate") {
    return (
      <ActivationScreen
        onActivated={() => {
          const cfg = loadConfig();
          if (!cfg.lang) {
            setScreen("language");
          } else {
            setScreen("app");
          }
        }}
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

  if (screen === "language") {
    return <LanguageDialog onSelect={handleLanguageSelect} />;
  }

  return <App />;
}
